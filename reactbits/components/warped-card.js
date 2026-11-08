/* ReactBits Pro public preview module 74576 for warped-card.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/74576.09f151b4c1678886.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  74576: (e, t, r) => {
    (r.r(t), r.d(t, { default: () => p }));
    var n = r(95155),
      i = r(12115),
      a = r(56388),
      u = r(90761),
      s = r(81712),
      l = r(3907),
      o = r(2253),
      c = r(90650);
    let d = `
varying vec2 vUv;

uniform vec2 uRes;
uniform vec2 uTexRes;

vec2 coverUv(vec2 uv, vec2 texSize, vec2 viewSize) {
  vec2 ratio = vec2(
    min((viewSize.x / viewSize.y) / (texSize.x / texSize.y), 1.0),
    min((viewSize.y / viewSize.x) / (texSize.y / texSize.x), 1.0)
  );
  return uv * ratio + (1.0 - ratio) * 0.5;
}

void main() {
  vUv = coverUv(uv, uTexRes, uRes);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,
      m = `
precision highp float;

uniform sampler2D uTexture;
uniform vec2 uMouse;
uniform float uBulge;
uniform float uRadius;
uniform float uStrength;
uniform float uHasTexture;

varying vec2 vUv;

vec2 bulge(vec2 uv, vec2 center) {
  uv -= center;

  float dist = length(uv) / uRadius;
  float distPow = pow(dist, 4.0);
  float scale = uStrength / (1.0 + distPow);

  uv *= (1.0 - uBulge) + uBulge * scale;

  uv += center;
  return uv;
}

void main() {
  vec2 bulgeUV = bulge(vUv, uMouse);

  if (uHasTexture > 0.5) {
    vec4 tex = texture2D(uTexture, bulgeUV);
    gl_FragColor = vec4(tex.rgb, 1.0);
  } else {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
  }
}
`,
      v = ({
        imageSrc: e,
        radius: t,
        strength: r,
        pointer: a,
        bulgeAmount: u,
        dampening: l,
      }) => {
        let c = (0, i.useRef)(null),
          { size: v, viewport: h } = (0, s.C)(),
          p = (0, i.useRef)(new o.I9Y(0.5, 0.5)),
          x = (0, i.useRef)(0),
          f = (0, i.useRef)(null),
          g = (0, i.useMemo)(
            () => ({
              uTexture: { value: null },
              uRes: { value: new o.I9Y(1, 1) },
              uTexRes: { value: new o.I9Y(1, 1) },
              uMouse: { value: new o.I9Y(0.5, 0.5) },
              uBulge: { value: 0 },
              uRadius: { value: 0.95 },
              uStrength: { value: 1.1 },
              uHasTexture: { value: 0 },
            }),
            [],
          );
        return (
          (0, i.useEffect)(() => {
            if (!e) return;
            let t = !1,
              r = new o.Tap();
            return (
              r.setCrossOrigin("anonymous"),
              r.load(
                e,
                (e) => {
                  t ? e.dispose() : (f.current = e);
                },
                void 0,
                (r) => {
                  t ||
                    (console.warn("WarpedCard: failed to load image", e, r),
                    (f.current = null));
                },
              ),
              () => {
                ((t = !0),
                  f.current && (f.current.dispose(), (f.current = null)));
              }
            );
          }, [e]),
          (0, s.D)((e, n) => {
            if (!c.current) return;
            let i = c.current.material;
            if (
              (i.uniforms.uRes.value.set(v.width * h.dpr, v.height * h.dpr),
              f.current?.image)
            ) {
              i.uniforms.uTexture.value = f.current;
              let e = f.current.image;
              (i.uniforms.uTexRes.value.set(
                e.naturalWidth || e.width,
                e.naturalHeight || e.height,
              ),
                (i.uniforms.uHasTexture.value = 1));
            } else i.uniforms.uHasTexture.value = 0;
            let s = 1 - Math.exp(-n / Math.max(l, 0.001));
            ((p.current.x += (a[0] - p.current.x) * s),
              (p.current.y += (a[1] - p.current.y) * s),
              i.uniforms.uMouse.value.set(p.current.x, p.current.y),
              (x.current += (u - x.current) * s),
              (i.uniforms.uBulge.value = x.current),
              (i.uniforms.uRadius.value = t),
              (i.uniforms.uStrength.value = r));
          }),
          (0, n.jsxs)("mesh", {
            ref: c,
            children: [
              (0, n.jsx)("planeGeometry", { args: [2, 2] }),
              (0, n.jsx)("shaderMaterial", {
                vertexShader: d,
                fragmentShader: m,
                uniforms: g,
                transparent: !0,
              }),
            ],
          })
        );
      },
      h = ({
        width: e = "100%",
        height: t = "100%",
        className: r,
        children: a,
        imageSrc: u = "/demo-media/abstract-pink-eclipse.webp",
        cardWidth: s = 360,
        aspectRatio: o = 1.3,
        radius: d = 0.95,
        strength: m = 1.1,
        dampening: h = 0.07,
        transitionDuration: p = 0.8,
        borderRadius: x = "16px",
      }) => {
        let f = (0, i.useRef)(null),
          [g, b] = (0, i.useState)([0.5, 0.5]),
          [w, S] = (0, i.useState)(0),
          y = (0, i.useRef)(0),
          C = (0, i.useRef)(null),
          j = (0, i.useCallback)(
            (e) => {
              null !== C.current && cancelAnimationFrame(C.current);
              let t = y.current,
                r = performance.now(),
                n = 1e3 * p,
                i = (a) => {
                  let u = Math.min((a - r) / n, 1),
                    s = t + (e - t) * (1 - Math.pow(1 - u, 3));
                  ((y.current = s),
                    S(s),
                    u < 1 && (C.current = requestAnimationFrame(i)));
                };
              C.current = requestAnimationFrame(i);
            },
            [p],
          ),
          R = (0, i.useCallback)((e) => {
            let t = f.current?.getBoundingClientRect();
            t &&
              b([
                Math.max(0, Math.min(1, (e.clientX - t.left) / t.width)),
                Math.max(0, Math.min(1, 1 - (e.clientY - t.top) / t.height)),
              ]);
          }, []),
          T = (0, i.useCallback)(() => {
            j(1);
          }, [j]),
          M = (0, i.useCallback)(() => {
            j(0);
          }, [j]);
        (0, i.useEffect)(
          () => () => {
            null !== C.current && cancelAnimationFrame(C.current);
          },
          [],
        );
        let N = "number" == typeof x ? `${x}px` : x,
          P = "number" == typeof s ? `${s}px` : s;
        return (0, n.jsx)("div", {
          className: (0, c.cn)("flex items-center justify-center", r),
          style: { width: e, height: t },
          children: (0, n.jsxs)("div", {
            ref: f,
            className: "relative overflow-hidden",
            style: {
              width: P,
              maxWidth: "100%",
              aspectRatio: `1 / ${o}`,
              borderRadius: N,
              boxShadow:
                "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.12)",
            },
            onPointerMove: R,
            onPointerEnter: T,
            onPointerLeave: M,
            children: [
              (0, n.jsx)(l.Hl, {
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
                className: "absolute! inset-0 w-full h-full",
                children: (0, n.jsx)(v, {
                  imageSrc: u,
                  radius: d,
                  strength: m,
                  pointer: g,
                  bulgeAmount: w,
                  dampening: h,
                }),
              }),
              a &&
                (0, n.jsx)("div", {
                  className: "relative z-10 pointer-events-none",
                  children: a,
                }),
            ],
          }),
        });
      };
    h.displayName = "WarpedCard";
    let p = () => {
      let [e, t] = (0, u.I)(),
        [r, s] = (0, i.useState)(360),
        [l, o] = (0, i.useState)(1.3),
        [c, d] = (0, i.useState)(0.95),
        [m, v] = (0, i.useState)(1.1),
        [p, x] = (0, i.useState)(0.07),
        [f, g] = (0, i.useState)(0.8),
        [b, w] = (0, i.useState)("/demo-media/abstract-pink-eclipse.webp");
      return (0, n.jsxs)("div", {
        children: [
          (0, n.jsx)(a.Bg, {}),
          (0, n.jsxs)(a.VX, {
            children: [
              (0, n.jsxs)(a.Ec, {
                children: [
                  (0, n.jsx)(a.Ch, {
                    onRefresh: t,
                    minHeight: 600,
                    children: (0, n.jsx)("div", {
                      className: "relative h-full w-full",
                      children: (0, n.jsx)(
                        h,
                        {
                          cardWidth: r,
                          aspectRatio: l,
                          radius: c,
                          strength: m,
                          dampening: p,
                          transitionDuration: f,
                          imageSrc: b,
                        },
                        e,
                      ),
                    }),
                  }),
                  (0, n.jsxs)(a.IH, {
                    children: [
                      (0, n.jsx)(a.UD, {
                        title: "Image URL",
                        value: b,
                        onChange: w,
                      }),
                      (0, n.jsx)(a.yt, {
                        title: "Card Width",
                        value: r,
                        onChange: s,
                        min: 200,
                        max: 500,
                        step: 10,
                      }),
                      (0, n.jsx)(a.yt, {
                        title: "Aspect Ratio",
                        value: l,
                        onChange: o,
                        min: 0.6,
                        max: 2,
                        step: 0.05,
                      }),
                      (0, n.jsx)(a.yt, {
                        title: "Radius",
                        value: c,
                        onChange: d,
                        min: 0.1,
                        max: 2,
                        step: 0.05,
                      }),
                      (0, n.jsx)(a.yt, {
                        title: "Strength",
                        value: m,
                        onChange: v,
                        min: 0.1,
                        max: 3,
                        step: 0.05,
                      }),
                      (0, n.jsx)(a.yt, {
                        title: "Dampening",
                        value: p,
                        onChange: x,
                        min: 0.01,
                        max: 0.3,
                        step: 0.01,
                      }),
                      (0, n.jsx)(a.yt, {
                        title: "Transition Duration",
                        value: f,
                        onChange: g,
                        min: 0.1,
                        max: 2,
                        step: 0.1,
                      }),
                    ],
                  }),
                  (0, n.jsx)(a.Ub, {
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
                        name: "cardWidth",
                        type: "string | number",
                        default: "360",
                        description: "Card width inside the container",
                      },
                      {
                        name: "aspectRatio",
                        type: "number",
                        default: "1.3",
                        description:
                          "Card aspect ratio (height / width, e.g. 1.3 for portrait)",
                      },
                      {
                        name: "imageSrc",
                        type: "string",
                        default: '"https://..."',
                        description: "Image source URL",
                      },
                      {
                        name: "radius",
                        type: "number",
                        default: "0.95",
                        description:
                          "Bulge distortion radius (0–1, fraction of the card)",
                      },
                      {
                        name: "strength",
                        type: "number",
                        default: "1.1",
                        description: "Bulge distortion strength",
                      },
                      {
                        name: "dampening",
                        type: "number",
                        default: "0.07",
                        description:
                          "Smoothing speed for mouse follow (0 = instant, higher = smoother)",
                      },
                      {
                        name: "transitionDuration",
                        type: "number",
                        default: "0.8",
                        description:
                          "Transition duration in seconds for hover in/out",
                      },
                      {
                        name: "borderRadius",
                        type: "string | number",
                        default: '"16px"',
                        description: "Border radius in CSS units",
                      },
                      {
                        name: "className",
                        type: "string",
                        default: "undefined",
                        description: "Additional CSS classes",
                      },
                      {
                        name: "children",
                        type: "ReactNode",
                        default: "undefined",
                        description: "Content rendered above the effect",
                      },
                    ],
                  }),
                ],
              }),
              (0, n.jsx)(a.lT, { children: (0, n.jsx)(a.Gv, {}) }),
            ],
          }),
        ],
      });
    };
  },
};
