/* ReactBits Pro public preview module 43860 for chroma-blinds.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/43860.7dfbd488155cd9ce.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  43860: (e, t, n) => {
    (n.r(t), n.d(t, { default: () => f }));
    var a = n(95155),
      r = n(12115),
      l = n(30701),
      i = n(56388),
      o = n(90761),
      s = n(81712),
      u = n(3907),
      c = n(2253),
      d = n(90650);
    let m = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,
      p = `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec2  uRes;

uniform float uLineCount;
uniform float uLineThickness;
uniform float uLineSharpness;
uniform float uAngleRad;
uniform float uZoom;
uniform float uRadialStrength;
uniform float uRadialSpeed;
uniform float uContrast;

uniform vec3  uColorA;
uniform vec3  uColorB;
uniform vec3  uColorC;

uniform vec3  uBg;
uniform float uAlpha;
uniform float uClickBoost;

vec3 cosinePalette(in float t) {
  vec3 a = (uColorA + uColorB + uColorC) / 3.0;
  vec3 x = uColorA - a;
  vec3 y = uColorB - a;
  vec3 bSin = -(x + 2.0 * y) / 1.73205080757;
  vec3 phase = vec3(
    atan(bSin.x, x.x),
    atan(bSin.y, x.y),
    atan(bSin.z, x.z)
  );
  vec3 amp = sqrt(x * x + bSin * bSin);
  return a + amp * cos(6.28318530718 * t + phase);
}

void main() {
  vec2 uv = (vUv * 2.0 - 1.0) * vec2(uRes.x / max(uRes.y, 1.0), 1.0);
  uv *= max(uZoom, 0.0001);

  float ca = cos(uAngleRad);
  float sa = sin(uAngleRad);
  vec2 rotated = vec2(ca * uv.x - sa * uv.y, sa * uv.x + ca * uv.y);

  float stripe = rotated.x * uLineCount * 1.41421356 + uTime * 0.8;
  float wave = sin(stripe);

  float dist = abs(wave);
  float glow = uLineThickness / pow(max(dist, 0.0001), max(uLineSharpness, 0.05));

  float radial = length(uv) * uRadialStrength + uTime * uRadialSpeed;
  vec3 paletteCol = cosinePalette(radial);
  vec3 col = paletteCol * glow * uClickBoost;

  col = smoothstep(vec3(0.0), vec3(max(uContrast, 0.001)), col);

  float bgLuma = dot(uBg, vec3(0.2126, 0.7152, 0.0722));
  float lightMix = smoothstep(0.35, 0.75, bgLuma);

  float coverage = clamp(
    dot(col, vec3(0.2126, 0.7152, 0.0722)),
    0.0,
    1.0
  );

  vec3 painted = mix(uBg, paletteCol, coverage);
  vec3 finalCol = mix(col, painted, lightMix);

  gl_FragColor = vec4(finalCol, uAlpha);
}
`;
    function h(e) {
      let t = e.replace("#", ""),
        n = parseInt(
          (3 === t.length
            ? t
                .split("")
                .map((e) => e + e)
                .join("")
            : t.padEnd(6, "0")
          ).slice(0, 6),
          16,
        );
      return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (255 & n) / 255];
    }
    let v = (e) => {
        let { gl: t, size: n } = (0, s.C)(),
          a = (0, r.useRef)(null);
        if (null === a.current) {
          let e = new c.bdM(2, 2),
            t = new c.BKk({
              vertexShader: m,
              fragmentShader: p,
              transparent: !0,
              uniforms: {
                uTime: { value: 0 },
                uRes: { value: new c.I9Y(1, 1) },
                uLineCount: { value: 8 },
                uLineThickness: { value: 0.3 },
                uLineSharpness: { value: 0.7 },
                uAngleRad: { value: Math.PI / 4 },
                uZoom: { value: 0.75 },
                uRadialStrength: { value: 0.5 },
                uRadialSpeed: { value: 0.2 },
                uContrast: { value: 1.2 },
                uColorA: { value: new c.Pq0(0.318, 0.024, 0.475) },
                uColorB: { value: new c.Pq0(0.878, 0.082, 0.706) },
                uColorC: { value: new c.Pq0(0.612, 0.631, 0.949) },
                uBg: { value: new c.Pq0(0, 0, 0) },
                uAlpha: { value: 1 },
                uClickBoost: { value: 1 },
              },
            }),
            n = new c.eaF(e, t),
            r = new c.Z58();
          r.add(n);
          let l = new c.qUd(-1, 1, 1, -1, 0, 1);
          ((l.position.z = 1),
            (a.current = {
              mat: t,
              geom: e,
              mesh: n,
              scene: r,
              cam: l,
              pointer: {
                active: !1,
                nx: 0.5,
                ny: 0.5,
                smoothedAngle: 0,
                initialized: !1,
                click: 0,
              },
            }));
        }
        let l = e.onPointerReady;
        ((0, r.useEffect)(() => {
          let e = a.current;
          e && l(e.pointer);
        }, [l]),
          (0, r.useEffect)(
            () => () => {
              let e = a.current;
              e && (e.mat.dispose(), e.geom.dispose());
            },
            [],
          ));
        let i = (0, r.useRef)(0);
        return (
          (0, s.D)((r, l) => {
            let o = a.current;
            if (!o) return;
            let s = o.mat.uniforms;
            (e.paused || (i.current += l * Math.max(e.speed, 0)),
              (s.uTime.value = i.current),
              s.uRes.value.set(n.width, n.height),
              (s.uLineCount.value = e.lineCount),
              (s.uLineThickness.value = e.lineThickness),
              (s.uLineSharpness.value = e.lineSharpness),
              (s.uZoom.value = e.zoom),
              (s.uRadialStrength.value = e.radialPulseStrength),
              (s.uRadialSpeed.value = e.radialPulseSpeed),
              (s.uContrast.value = e.contrast),
              (s.uAlpha.value = e.opacity));
            let u = h(e.colorA);
            s.uColorA.value.set(u[0], u[1], u[2]);
            let c = h(e.colorB);
            s.uColorB.value.set(c[0], c[1], c[2]);
            let d = h(e.colorC);
            s.uColorC.value.set(d[0], d[1], d[2]);
            let m = h(e.backgroundColor);
            s.uBg.value.set(m[0], m[1], m[2]);
            let p = (e.angle * Math.PI) / 180,
              v = o.pointer,
              g = p;
            if (e.cursorInteraction && v.active) {
              let t = v.nx - 0.5,
                n = 0.5 - v.ny,
                a = Math.min(1, 2 * Math.sqrt(t * t + n * n)),
                r = -Math.sin(p) * t + Math.cos(p) * n;
              g =
                p +
                ((r >= 0 ? 1 : -1) * a * (e.cursorAngleStrength * Math.PI)) /
                  180;
            }
            let f = Math.min(Math.max(e.cursorLerp, 0), 1);
            (v.initialized
              ? (v.smoothedAngle += (g - v.smoothedAngle) * f)
              : ((v.smoothedAngle = g), (v.initialized = !0)),
              (s.uAngleRad.value = v.smoothedAngle),
              (v.click = Math.max(0, v.click - l * e.clickBurstDecay)),
              (s.uClickBoost.value = 1 + v.click * (e.clickBurstStrength - 1)),
              t.setRenderTarget(null),
              t.render(o.scene, o.cam));
          }, 1),
          null
        );
      },
      g = ({
        width: e = "100%",
        height: t = "100%",
        className: n,
        children: l,
        lineCount: i = 10,
        lineThickness: o = 0.3,
        lineSharpness: s = 0.5,
        speed: c = 1,
        angle: m = 45,
        zoom: p = 0.75,
        radialPulseStrength: h = 0.5,
        radialPulseSpeed: g = 0.2,
        contrast: f = 1.2,
        colorA: x = "#510679",
        colorB: C = "#E015B4",
        colorC: S = "#9CA1F2",
        backgroundColor: y = "#000000",
        opacity: b = 1,
        dpr: k = 1.5,
        paused: w = !1,
        cursorInteraction: j = !0,
        cursorAngleStrength: P = 5,
        cursorLerp: B = 0.05,
        clickBurstStrength: A = 1.6,
        clickBurstDecay: R = 2.5,
      }) => {
        let L = (0, r.useRef)(null),
          M = (0, r.useRef)(null),
          T = (e) => {
            let t = L.current,
              n = M.current;
            if (!t || !n) return;
            let a = t.getBoundingClientRect();
            ((n.nx = (e.clientX - a.left) / Math.max(a.width, 1)),
              (n.ny = (e.clientY - a.top) / Math.max(a.height, 1)),
              (n.active = !0));
          };
        return (0, a.jsxs)("div", {
          ref: L,
          className: (0, d.cn)("relative overflow-hidden", n),
          style: { width: e, height: t },
          onPointerMove: j ? T : void 0,
          onPointerEnter: j ? T : void 0,
          onPointerLeave: j
            ? () => {
                let e = M.current;
                e && (e.active = !1);
              }
            : void 0,
          onPointerDown: j
            ? (e) => {
                T(e);
                let t = M.current;
                t && (t.click = 1);
              }
            : void 0,
          children: [
            (0, a.jsx)(u.Hl, {
              className: "absolute inset-0",
              dpr: [1, k],
              gl: {
                antialias: !1,
                alpha: !0,
                powerPreference: "high-performance",
              },
              orthographic: !0,
              camera: {
                position: [0, 0, 1],
                zoom: 1,
                left: -1,
                right: 1,
                top: 1,
                bottom: -1,
              },
              children: (0, a.jsx)(v, {
                lineCount: i,
                lineThickness: o,
                lineSharpness: s,
                speed: c,
                angle: m,
                zoom: p,
                radialPulseStrength: h,
                radialPulseSpeed: g,
                contrast: f,
                colorA: x,
                colorB: C,
                colorC: S,
                backgroundColor: y,
                opacity: b,
                paused: w,
                cursorInteraction: j,
                cursorAngleStrength: P,
                cursorLerp: B,
                clickBurstStrength: A,
                clickBurstDecay: R,
                onPointerReady: (e) => {
                  M.current = e;
                },
              }),
            }),
            l && (0, a.jsx)("div", { className: "relative z-10", children: l }),
          ],
        });
      },
      f = () => {
        let [e, t] = (0, o.I)(),
          [n, s] = (0, r.useState)(10),
          [u, c] = (0, r.useState)(0.3),
          [d, m] = (0, r.useState)(0.5),
          [p, h] = (0, r.useState)(45),
          [v, f] = (0, r.useState)(0.75),
          [x, C] = (0, r.useState)(1),
          [S, y] = (0, r.useState)(!1),
          [b, k] = (0, r.useState)("#510679"),
          [w, j] = (0, r.useState)("#E015B4"),
          [P, B] = (0, r.useState)("#9CA1F2"),
          [A, R] = (0, r.useState)(0.5),
          [L, M] = (0, r.useState)(0.2),
          [T, I] = (0, r.useState)(1.2),
          [N, z] = (0, r.useState)(!0),
          [E, F] = (0, r.useState)(5),
          [D, U] = (0, r.useState)(0.05),
          [q, Z] = (0, r.useState)(1.6),
          { resolvedTheme: _ } = (0, l.D)(),
          [G, W] = (0, r.useState)(null),
          H = (0, r.useMemo)(
            () => (null !== G ? G : "dark" === _ ? "#000000" : "#FFFFFF"),
            [_, G],
          ),
          [X, O] = (0, r.useState)(1);
        return (0, a.jsxs)("div", {
          children: [
            (0, a.jsx)(i.Bg, {}),
            (0, a.jsxs)(i.VX, {
              children: [
                (0, a.jsxs)(i.Ec, {
                  children: [
                    (0, a.jsx)(i.Ch, {
                      onRefresh: t,
                      children: (0, a.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, a.jsx)(
                          g,
                          {
                            width: "100%",
                            height: "100%",
                            lineCount: n,
                            lineThickness: u,
                            lineSharpness: d,
                            speed: x,
                            angle: p,
                            zoom: v,
                            radialPulseStrength: A,
                            radialPulseSpeed: L,
                            contrast: T,
                            colorA: b,
                            colorB: w,
                            colorC: P,
                            backgroundColor: H,
                            opacity: X,
                            paused: S,
                            cursorInteraction: N,
                            cursorAngleStrength: E,
                            cursorLerp: D,
                            clickBurstStrength: q,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, a.jsxs)(i.IH, {
                      children: [
                        (0, a.jsx)(i.yt, {
                          title: "Line Count",
                          value: n,
                          onChange: s,
                          min: 1,
                          max: 32,
                          step: 1,
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Line Thickness",
                          value: u,
                          onChange: c,
                          min: 0.05,
                          max: 1,
                          step: 0.01,
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Line Sharpness",
                          value: d,
                          onChange: m,
                          min: 0.2,
                          max: 1.5,
                          step: 0.05,
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Angle",
                          value: p,
                          onChange: h,
                          min: 0,
                          max: 180,
                          step: 1,
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Zoom",
                          value: v,
                          onChange: f,
                          min: 0.2,
                          max: 3,
                          step: 0.05,
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Speed",
                          value: x,
                          onChange: C,
                          min: 0,
                          max: 4,
                          step: 0.05,
                        }),
                        (0, a.jsx)(i.tl, {
                          title: "Paused",
                          checked: S,
                          onChange: y,
                        }),
                        (0, a.jsx)(i.W7, {
                          title: "Color A",
                          value: b,
                          onChange: k,
                        }),
                        (0, a.jsx)(i.W7, {
                          title: "Color B",
                          value: w,
                          onChange: j,
                        }),
                        (0, a.jsx)(i.W7, {
                          title: "Color C",
                          value: P,
                          onChange: B,
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Radial Pulse Strength",
                          value: A,
                          onChange: R,
                          min: 0,
                          max: 2,
                          step: 0.05,
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Radial Pulse Speed",
                          value: L,
                          onChange: M,
                          min: 0,
                          max: 2,
                          step: 0.05,
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Contrast",
                          value: T,
                          onChange: I,
                          min: 0.4,
                          max: 3,
                          step: 0.05,
                        }),
                        (0, a.jsx)(i.tl, {
                          title: "Cursor Interaction",
                          checked: N,
                          onChange: z,
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Cursor Angle Strength",
                          value: E,
                          onChange: F,
                          min: 0,
                          max: 90,
                          step: 1,
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Cursor Lerp",
                          value: D,
                          onChange: U,
                          min: 0.02,
                          max: 0.5,
                          step: 0.01,
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Click Burst Strength",
                          value: q,
                          onChange: Z,
                          min: 1,
                          max: 5,
                          step: 0.05,
                        }),
                        (0, a.jsx)(i.W7, {
                          title: "Background",
                          value: H,
                          onChange: W,
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Opacity",
                          value: X,
                          onChange: O,
                          min: 0,
                          max: 1,
                          step: 0.05,
                        }),
                      ],
                    }),
                    (0, a.jsx)(i.Ub, {
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
                          description:
                            "Additional CSS classes for the container",
                        },
                        {
                          name: "children",
                          type: "ReactNode",
                          default: "undefined",
                          description: "Content rendered above the canvas",
                        },
                        {
                          name: "lineCount",
                          type: "number",
                          default: "10",
                          description:
                            "Number of diagonal stripes spanning the canvas (1–32)",
                        },
                        {
                          name: "lineThickness",
                          type: "number",
                          default: "0.3",
                          description:
                            "Glow falloff numerator: fatter or thinner strokes (0.05–1)",
                        },
                        {
                          name: "lineSharpness",
                          type: "number",
                          default: "0.5",
                          description:
                            "Glow falloff exponent: lower is sharper, higher is softer (0.2–1.5)",
                        },
                        {
                          name: "speed",
                          type: "number",
                          default: "1",
                          description:
                            "Drift speed multiplier of the diagonal pattern (0–4)",
                        },
                        {
                          name: "angle",
                          type: "number",
                          default: "45",
                          description: "Stripe rotation in degrees (0–180)",
                        },
                        {
                          name: "zoom",
                          type: "number",
                          default: "0.75",
                          description:
                            "Magnification: larger numbers crop the field tighter (0.2–3)",
                        },
                        {
                          name: "radialPulseStrength",
                          type: "number",
                          default: "0.5",
                          description:
                            "Strength of the radial color drift across the canvas (0–2)",
                        },
                        {
                          name: "radialPulseSpeed",
                          type: "number",
                          default: "0.2",
                          description:
                            "Time-driven rate of the radial color drift (0–2)",
                        },
                        {
                          name: "contrast",
                          type: "number",
                          default: "1.2",
                          description:
                            "Smoothstep upper-bound: lower is punchier, higher is softer (0.4–3)",
                        },
                        {
                          name: "colorA",
                          type: "string",
                          default: '"#510679"',
                          description:
                            "First hex color in the cycle (lands at t=0).",
                        },
                        {
                          name: "colorB",
                          type: "string",
                          default: '"#E015B4"',
                          description:
                            "Second hex color in the cycle (lands at t=1/3).",
                        },
                        {
                          name: "colorC",
                          type: "string",
                          default: '"#9CA1F2"',
                          description:
                            "Third hex color in the cycle (lands at t=2/3).",
                        },
                        {
                          name: "backgroundColor",
                          type: "string",
                          default: '"#000000"',
                          description: "Background fill color in hex format",
                        },
                        {
                          name: "opacity",
                          type: "number",
                          default: "1",
                          description: "Master alpha (0–1)",
                        },
                        {
                          name: "dpr",
                          type: "number",
                          default: "1.5",
                          description:
                            "Maximum device pixel ratio (caps GPU work)",
                        },
                        {
                          name: "paused",
                          type: "boolean",
                          default: "false",
                          description: "Freeze the animation in place",
                        },
                        {
                          name: "cursorInteraction",
                          type: "boolean",
                          default: "true",
                          description:
                            "Allow the cursor to bend the stripe direction toward it",
                        },
                        {
                          name: "cursorAngleStrength",
                          type: "number",
                          default: "5",
                          description:
                            "Maximum angle deviation in degrees applied at the cursor",
                        },
                        {
                          name: "cursorLerp",
                          type: "number",
                          default: "0.05",
                          description:
                            "Per-frame lerp toward the cursor-driven angle (0–1)",
                        },
                        {
                          name: "clickBurstStrength",
                          type: "number",
                          default: "1.6",
                          description: "Click contrast multiplier (>= 1)",
                        },
                        {
                          name: "clickBurstDecay",
                          type: "number",
                          default: "2.5",
                          description:
                            "Per-second decay rate for the click burst",
                        },
                      ],
                    }),
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
