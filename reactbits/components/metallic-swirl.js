/* ReactBits Pro public preview module 7483 for metallic-swirl.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/7483.f85880c084132133.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  7483: (e, t, n) => {
    (n.r(t), n.d(t, { default: () => h }));
    var a = n(95155),
      r = n(12115),
      o = n(30701),
      u = n(56388),
      i = n(90761),
      s = n(81712),
      l = n(3907),
      c = n(90650),
      m = n(2253);
    let p = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,
      v = `
precision highp float;
varying vec2 vUv;

uniform float uTime;
uniform vec2  uRes;
uniform float uSpeed;
uniform float uZoom;
uniform int   uIter;
uniform float uEps;
uniform float uTangent;
uniform float uGrad;
uniform vec3  uPhase;
uniform float uRange;
uniform float uBias;
uniform float uBright;
uniform vec3  uBg;
uniform float uAlpha;
uniform vec2  uPointer;
uniform float uCursorActive;
uniform float uCursorIntensity;

float wave(vec2 p, float t) {
  return sin(p.x + sin(p.y + t * 0.1)) * sin(p.y * p.x * 0.1 + t * 0.2);
}

vec2 flow(vec2 p, float t) {
  vec2 ep = vec2(uEps, 0.0);
  vec2 out_v = vec2(0.0);
  for (int i = 0; i < 12; i++) {
    if (i >= uIter) break;
    float s0 = wave(p, t);
    float sx = wave(p + ep, t);
    float sy = wave(p + ep.yx, t);
    vec2 g = vec2(sx - s0, sy - s0) / ep.xx;
    vec2 tang = vec2(-g.y, g.x);
    p += uTangent * tang + g * uGrad;
    out_v = tang;
  }
  return out_v;
}

void main() {
  vec2 st = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0) * uZoom;
  float t = uTime * uSpeed;

  vec2 pointerUv = (uPointer - 0.5) * vec2(uRes.x / uRes.y, 1.0) * uZoom;
  float cursorDist = length(st - pointerUv);
  float cursorInfluence = smoothstep(3.0, 0.0, cursorDist) * uCursorActive * uCursorIntensity;

  vec2 ep = vec2(uEps, 0.0);
  vec2 p = st;
  vec2 out_v = vec2(0.0);
  float localTangent = uTangent + cursorInfluence * 0.5;
  float localGrad = uGrad + cursorInfluence * 0.1;
  for (int i = 0; i < 12; i++) {
    if (i >= uIter) break;
    float s0 = wave(p, t);
    float sx = wave(p + ep, t);
    float sy = wave(p + ep.yx, t);
    vec2 g = vec2(sx - s0, sy - s0) / ep.xx;
    vec2 tang = vec2(-g.y, g.x);
    p += localTangent * tang + g * localGrad;
    out_v = tang;
  }

  float val = out_v.x - out_v.y;
  vec3 col = sin(uPhase + val) * uRange + uBias;
  col *= uBright;

  col += cursorInfluence * 0.06 * uBright;

  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  vec3 result = mix(uBg, col, clamp(lum * 4.0, 0.0, 1.0));

  gl_FragColor = vec4(result, uAlpha);
}
`,
      d = ({
        speed: e,
        zoom: t,
        iterations: n,
        sampleGap: o,
        tangentForce: u,
        gradientForce: i,
        colorPhaseR: l,
        colorPhaseG: c,
        colorPhaseB: d,
        colorRange: f,
        colorBias: h,
        brightness: g,
        bgRgb: x,
        opacity: y,
        pointer: b,
        cursorInteraction: C,
        cursorIntensity: j,
      }) => {
        let w = (0, r.useRef)(null),
          { size: I, viewport: S } = (0, s.C)(),
          P = (0, r.useRef)(new m.I9Y(0.5, 0.5)),
          B = (0, r.useMemo)(
            () => ({
              uTime: { value: 0 },
              uRes: { value: new m.I9Y(1, 1) },
              uSpeed: { value: e },
              uZoom: { value: t },
              uIter: { value: n },
              uEps: { value: o },
              uTangent: { value: u },
              uGrad: { value: i },
              uPhase: { value: new m.Pq0(l, c, d) },
              uRange: { value: f },
              uBias: { value: h },
              uBright: { value: g },
              uBg: { value: new m.Pq0(...x) },
              uAlpha: { value: y },
              uPointer: { value: new m.I9Y(0.5, 0.5) },
              uCursorActive: { value: 0 },
              uCursorIntensity: { value: 1 },
            }),
            [],
          );
        return (
          (0, s.D)((a, r) => {
            if (!w.current) return;
            let s = w.current.material;
            ((s.uniforms.uTime.value = a.clock.elapsedTime),
              s.uniforms.uRes.value.set(I.width * S.dpr, I.height * S.dpr),
              (s.uniforms.uSpeed.value = e),
              (s.uniforms.uZoom.value = t),
              (s.uniforms.uIter.value = n),
              (s.uniforms.uEps.value = o),
              (s.uniforms.uTangent.value = u),
              (s.uniforms.uGrad.value = i),
              s.uniforms.uPhase.value.set(l, c, d),
              (s.uniforms.uRange.value = f),
              (s.uniforms.uBias.value = h),
              (s.uniforms.uBright.value = g),
              s.uniforms.uBg.value.set(...x),
              (s.uniforms.uAlpha.value = y),
              (s.uniforms.uCursorActive.value = +!!C),
              (s.uniforms.uCursorIntensity.value = j));
            let m = 1 - Math.exp(-r / 0.15);
            ((P.current.x += (b[0] - P.current.x) * m),
              (P.current.y += (b[1] - P.current.y) * m),
              s.uniforms.uPointer.value.set(P.current.x, P.current.y));
          }),
          (0, a.jsxs)("mesh", {
            ref: w,
            children: [
              (0, a.jsx)("planeGeometry", { args: [2, 2] }),
              (0, a.jsx)("shaderMaterial", {
                vertexShader: p,
                fragmentShader: v,
                uniforms: B,
                transparent: !0,
              }),
            ],
          })
        );
      },
      f = ({
        width: e = "100%",
        height: t = "100%",
        className: n,
        children: o,
        speed: u = 1,
        zoom: i = 6,
        iterations: s = 12,
        sampleGap: m = 0.095,
        tangentForce: p = 0.75,
        gradientForce: v = 0.15,
        colorPhaseR: f = 3.11,
        colorPhaseG: h = 3.11,
        colorPhaseB: g = 3.11,
        colorRange: x = 0.75,
        colorBias: y = 0.5,
        brightness: b = 1,
        backgroundColor: C = "#000000",
        opacity: j = 1,
        cursorInteraction: w = !1,
        cursorIntensity: I = 1,
      }) => {
        let S = (0, r.useMemo)(() => {
            let e;
            return (e = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(C))
              ? [
                  parseInt(e[1], 16) / 255,
                  parseInt(e[2], 16) / 255,
                  parseInt(e[3], 16) / 255,
                ]
              : [0, 0, 0];
          }, [C]),
          P = (0, r.useRef)(null),
          [B, R] = (0, r.useState)([0.5, 0.5]),
          G = (0, r.useCallback)(
            (e) => {
              if (!w) return;
              let t = P.current?.getBoundingClientRect();
              t &&
                R([
                  (e.clientX - t.left) / t.width,
                  1 - (e.clientY - t.top) / t.height,
                ]);
            },
            [w],
          );
        return (0, a.jsxs)("div", {
          ref: P,
          className: (0, c.cn)("relative overflow-hidden", n),
          style: { width: e, height: t, backgroundColor: C },
          onPointerMove: G,
          children: [
            (0, a.jsx)(l.Hl, {
              className: "absolute inset-0 h-full w-full",
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
              children: (0, a.jsx)(d, {
                speed: u,
                zoom: i,
                iterations: s,
                sampleGap: m,
                tangentForce: p,
                gradientForce: v,
                colorPhaseR: f,
                colorPhaseG: h,
                colorPhaseB: g,
                colorRange: x,
                colorBias: y,
                brightness: b,
                bgRgb: S,
                opacity: j,
                pointer: B,
                cursorInteraction: w,
                cursorIntensity: I,
              }),
            }),
            o &&
              (0, a.jsx)("div", {
                className: "pointer-events-none relative z-10",
                children: o,
              }),
          ],
        });
      };
    f.displayName = "MetallicSwirl";
    let h = () => {
      let [e, t] = (0, i.I)(),
        { resolvedTheme: n } = (0, o.D)(),
        [s, l] = (0, r.useState)(1),
        [c, m] = (0, r.useState)(6),
        [p, v] = (0, r.useState)(12),
        [d, h] = (0, r.useState)(1),
        [g, x] = (0, r.useState)(0.095),
        [y, b] = (0, r.useState)(0.75),
        [C, j] = (0, r.useState)(0.15),
        [w, I] = (0, r.useState)(3.11),
        [S, P] = (0, r.useState)(3.11),
        [B, R] = (0, r.useState)(3.11),
        [G, T] = (0, r.useState)(0.75),
        [k, F] = (0, r.useState)(0.5),
        [N, E] = (0, r.useState)(1),
        [_, M] = (0, r.useState)(!1),
        [A, U] = (0, r.useState)(1),
        [Z, z] = (0, r.useState)(null),
        D = (0, r.useMemo)(
          () => (null !== Z ? Z : "dark" === n ? "#0a0a0a" : "#FFFFFF"),
          [n, Z],
        );
      return (0, a.jsxs)("div", {
        children: [
          (0, a.jsx)(u.Bg, {}),
          (0, a.jsxs)(u.VX, {
            children: [
              (0, a.jsxs)(u.Ec, {
                children: [
                  (0, a.jsx)(u.Ch, {
                    onRefresh: t,
                    children: (0, a.jsx)("div", {
                      className: "relative h-full w-full",
                      children: (0, a.jsx)(
                        f,
                        {
                          width: "100%",
                          height: "100%",
                          speed: s,
                          zoom: c,
                          iterations: p,
                          sampleGap: g,
                          tangentForce: y,
                          gradientForce: C,
                          colorPhaseR: w,
                          colorPhaseG: S,
                          colorPhaseB: B,
                          colorRange: G,
                          colorBias: k,
                          brightness: N,
                          backgroundColor: D,
                          opacity: d,
                          cursorInteraction: _,
                          cursorIntensity: A,
                        },
                        e,
                      ),
                    }),
                  }),
                  (0, a.jsxs)(u.IH, {
                    children: [
                      (0, a.jsx)(u.yt, {
                        title: "Speed",
                        value: s,
                        onChange: l,
                        min: 0.01,
                        max: 3,
                        step: 0.01,
                      }),
                      (0, a.jsx)(u.yt, {
                        title: "Zoom",
                        value: c,
                        onChange: m,
                        min: 1,
                        max: 30,
                        step: 0.5,
                      }),
                      (0, a.jsx)(u.yt, {
                        title: "Iterations",
                        value: p,
                        onChange: v,
                        min: 1,
                        max: 12,
                        step: 1,
                      }),
                      (0, a.jsx)(u.yt, {
                        title: "Opacity",
                        value: d,
                        onChange: h,
                        min: 0,
                        max: 1,
                        step: 0.05,
                      }),
                      (0, a.jsx)(u.yt, {
                        title: "Sample Gap",
                        value: g,
                        onChange: x,
                        min: 0.01,
                        max: 0.5,
                        step: 0.005,
                      }),
                      (0, a.jsx)(u.yt, {
                        title: "Tangent Force",
                        value: y,
                        onChange: b,
                        min: 0,
                        max: 2,
                        step: 0.01,
                      }),
                      (0, a.jsx)(u.yt, {
                        title: "Gradient Force",
                        value: C,
                        onChange: j,
                        min: 0,
                        max: 1,
                        step: 0.01,
                      }),
                      (0, a.jsx)(u.yt, {
                        title: "Phase R",
                        value: w,
                        onChange: I,
                        min: 0,
                        max: 6.28,
                        step: 0.01,
                      }),
                      (0, a.jsx)(u.yt, {
                        title: "Phase G",
                        value: S,
                        onChange: P,
                        min: 0,
                        max: 6.28,
                        step: 0.01,
                      }),
                      (0, a.jsx)(u.yt, {
                        title: "Phase B",
                        value: B,
                        onChange: R,
                        min: 0,
                        max: 6.28,
                        step: 0.01,
                      }),
                      (0, a.jsx)(u.yt, {
                        title: "Color Range",
                        value: G,
                        onChange: T,
                        min: 0,
                        max: 1,
                        step: 0.01,
                      }),
                      (0, a.jsx)(u.yt, {
                        title: "Color Bias",
                        value: k,
                        onChange: F,
                        min: 0,
                        max: 1,
                        step: 0.01,
                      }),
                      (0, a.jsx)(u.yt, {
                        title: "Brightness",
                        value: N,
                        onChange: E,
                        min: 0,
                        max: 3,
                        step: 0.05,
                      }),
                      (0, a.jsx)(u.W7, {
                        title: "Background",
                        value: D,
                        onChange: (e) => z(e),
                      }),
                      (0, a.jsx)(u.tl, {
                        title: "Cursor Interaction",
                        checked: _,
                        onChange: M,
                      }),
                      (0, a.jsx)(u.yt, {
                        title: "Cursor Intensity",
                        value: A,
                        onChange: U,
                        min: 0,
                        max: 3,
                        step: 0.1,
                      }),
                    ],
                  }),
                  (0, a.jsx)(u.Ub, {
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
                        description: "Content rendered above the effect",
                      },
                      {
                        name: "speed",
                        type: "number",
                        default: "1",
                        description: "Animation speed multiplier (0.01–3.0)",
                      },
                      {
                        name: "zoom",
                        type: "number",
                        default: "6",
                        description: "Zoom level of the pattern (1–30)",
                      },
                      {
                        name: "iterations",
                        type: "number",
                        default: "12",
                        description:
                          "Number of flow iterations (1–12). More iterations = more complex swirls",
                      },
                      {
                        name: "sampleGap",
                        type: "number",
                        default: "0.095",
                        description:
                          "Sampling epsilon for gradient computation (0.01–0.5)",
                      },
                      {
                        name: "tangentForce",
                        type: "number",
                        default: "0.75",
                        description:
                          "Tangent flow strength per iteration (0–2)",
                      },
                      {
                        name: "gradientForce",
                        type: "number",
                        default: "0.15",
                        description:
                          "Gradient push strength per iteration (0–1)",
                      },
                      {
                        name: "colorPhaseR",
                        type: "number",
                        default: "3.11",
                        description:
                          "Color phase offset for red channel (0–6.28)",
                      },
                      {
                        name: "colorPhaseG",
                        type: "number",
                        default: "3.11",
                        description:
                          "Color phase offset for green channel (0–6.28)",
                      },
                      {
                        name: "colorPhaseB",
                        type: "number",
                        default: "3.11",
                        description:
                          "Color phase offset for blue channel (0–6.28)",
                      },
                      {
                        name: "colorRange",
                        type: "number",
                        default: "0.75",
                        description: "Color saturation range (0–1)",
                      },
                      {
                        name: "colorBias",
                        type: "number",
                        default: "0.5",
                        description: "Color midpoint brightness (0–1)",
                      },
                      {
                        name: "brightness",
                        type: "number",
                        default: "1",
                        description: "Overall brightness multiplier (0–3)",
                      },
                      {
                        name: "backgroundColor",
                        type: "string",
                        default: '"#000000"',
                        description: "Background color in hex",
                      },
                      {
                        name: "opacity",
                        type: "number",
                        default: "1",
                        description: "Master opacity (0–1)",
                      },
                      {
                        name: "cursorInteraction",
                        type: "boolean",
                        default: "false",
                        description:
                          "Enable cursor interaction to intensify flow turbulence near pointer",
                      },
                      {
                        name: "cursorIntensity",
                        type: "number",
                        default: "1",
                        description: "Cursor effect strength multiplier (0–3)",
                      },
                    ],
                  }),
                ],
              }),
              (0, a.jsx)(u.lT, { children: (0, a.jsx)(u.Gv, {}) }),
            ],
          }),
        ],
      });
    };
  },
};
