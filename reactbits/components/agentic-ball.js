/* ReactBits Pro public preview module 91424 for agentic-ball.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/91424.7f45dac188eb311e.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  91424: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => h }));
    var i = a(95155),
      n = a(12115),
      o = a(30701),
      r = a(56388),
      l = a(90761),
      u = a(81712),
      s = a(3907),
      c = a(2253),
      m = a(90650);
    let d = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,
      v = `
precision highp float;

uniform float uTime;
uniform vec2  uRes;
uniform float uSpeed;
uniform float uComplexity;
uniform float uSwirl;
uniform float uZoom;
uniform vec3  uTint;
uniform float uHueRotation;
uniform float uSaturation;
uniform float uBrightness;
uniform vec3  uBg;
uniform float uAlpha;

varying vec2 vUv;

vec2 spin(vec2 v, float a) {
  return cos(a) * v + sin(a) * vec2(-v.y, v.x);
}

float sfrac(float x, float k) {
  float f = fract(x);
  return f * smoothstep(1.0, k, f);
}

vec3 hueRotate(vec3 col, float angle) {
  return mix(vec3(dot(vec3(0.333), col)), col, cos(angle))
       + cross(vec3(0.577), col) * sin(angle);
}

vec3 computeOrb(vec3 p, float t) {
  vec3 v = vec3(0);
  float x = 0.0;
  float y = 0.0;
  float it = uComplexity;
  float halo = smoothstep(0.5, 0.0, p.z);
  vec3 c = vec3(0);

  for (float i = 1.0; i < 9.0; i += 1.0) {
    if (i > it) break;

    p.xy = spin(p.xy, p.z * uSwirl + t / i * 0.4);
    v = v * 0.5 + 0.5;
    v.xz = spin(v.xz, v.y - x + t / i + p.y);
    p.xy = spin(p.xy, length(v.xy) - x);

    x += sfrac(v.z, 0.9 - sin(y * 1.5) * 0.2 + p.z * 0.1) / it / (1.0 + x + x * x);
    y += sfrac(-v.z, 0.9 + sin(x) * 0.1) / it;

    c += exp(vec3(0.7, 1.9, 4.0) * log(max(x, 1e-8)));
  }

  float xy = (x - y) * (x - y);
  c += xy * sqrt(max(c, 0.0));
  c = clamp(c, 0.0, 1.0);

  c = hueRotate(c, uHueRotation);

  c = mix(vec3(dot(c, vec3(0.2, 0.7, 0.1))), c, uSaturation * (1.0 + y));
  c = max(c, 0.0);

  float bgLum = dot(uBg, vec3(0.2, 0.7, 0.1));
  float rimLift = bgLum * 0.5;
  c = mix(c, sqrt(max(c, 0.0)) * 0.7 + rimLift * 0.6, halo);
  c = mix(c, sqrt(max(c, 0.0)) * 0.5 + rimLift, sqrt(halo));

  c *= uTint;

  return c;
}

void main() {
  vec4 bg = vec4(uBg, uAlpha);
  vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / min(uRes.x, uRes.y) * uZoom;
  float t = uTime * uSpeed;

  float l2 = dot(uv, uv);
  float l = sqrt(l2);

  if (l > 1.0) {
    gl_FragColor = bg;
    return;
  }

  vec3 sn = vec3(uv, sqrt(1.0 - l2));
  vec3 n = computeOrb(sn, t) * uBrightness;

  float f = length(vec2(dFdx(l), dFdy(l)));
  float edge = smoothstep(1.0 - f, 1.0 - f * 3.0, l);

  gl_FragColor = mix(bg, vec4(sqrt(max(n, 0.0)), uAlpha), edge);
}
`,
      p = ({
        speed: e,
        complexity: t,
        swirl: a,
        zoom: o,
        tintRgb: r,
        hueRotation: l,
        saturation: s,
        brightness: m,
        bgRgb: p,
        opacity: f,
      }) => {
        let x = (0, n.useRef)(null),
          { size: h, viewport: g } = (0, u.C)(),
          y = (0, n.useMemo)(
            () => ({
              uTime: { value: 0 },
              uRes: { value: new c.I9Y() },
              uSpeed: { value: e },
              uComplexity: { value: t },
              uSwirl: { value: a },
              uZoom: { value: o },
              uTint: { value: new c.Pq0(...r) },
              uHueRotation: { value: l },
              uSaturation: { value: s },
              uBrightness: { value: m },
              uBg: { value: new c.Pq0(...p) },
              uAlpha: { value: f },
            }),
            [],
          );
        return (
          (0, u.D)((i) => {
            let n = x.current?.material;
            n &&
              ((n.uniforms.uTime.value = i.clock.elapsedTime),
              n.uniforms.uRes.value.set(h.width * g.dpr, h.height * g.dpr),
              (n.uniforms.uSpeed.value = e),
              (n.uniforms.uComplexity.value = t),
              (n.uniforms.uSwirl.value = a),
              (n.uniforms.uZoom.value = o),
              n.uniforms.uTint.value.set(...r),
              (n.uniforms.uHueRotation.value = l),
              (n.uniforms.uSaturation.value = s),
              (n.uniforms.uBrightness.value = m),
              n.uniforms.uBg.value.set(...p),
              (n.uniforms.uAlpha.value = f));
          }),
          (0, i.jsxs)("mesh", {
            ref: x,
            children: [
              (0, i.jsx)("planeGeometry", { args: [2, 2] }),
              (0, i.jsx)("shaderMaterial", {
                vertexShader: d,
                fragmentShader: v,
                uniforms: y,
                transparent: !0,
              }),
            ],
          })
        );
      },
      f = (e) => {
        let t = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);
        return t
          ? [
              parseInt(t[1], 16) / 255,
              parseInt(t[2], 16) / 255,
              parseInt(t[3], 16) / 255,
            ]
          : [0, 0, 0];
      },
      x = ({
        width: e = "100%",
        height: t = "100%",
        className: a,
        children: o,
        speed: r = 0.5,
        complexity: l = 3,
        swirl: u = 2,
        zoom: c = 1.75,
        color: d = "#FFFFFF",
        hueRotation: v = 4.3,
        saturation: x = 0,
        brightness: h = 2,
        backgroundColor: g = "#000000",
        opacity: y = 1,
      }) => {
        let b = (0, n.useMemo)(() => f(d), [d]),
          C = (0, n.useMemo)(() => f(g), [g]);
        return (0, i.jsxs)("div", {
          className: (0, m.cn)("relative overflow-hidden", a),
          style: { width: e, height: t },
          children: [
            (0, i.jsx)(s.Hl, {
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
              children: (0, i.jsx)(p, {
                speed: r,
                complexity: l,
                swirl: u,
                zoom: c,
                tintRgb: b,
                hueRotation: v,
                saturation: x,
                brightness: h,
                bgRgb: C,
                opacity: y,
              }),
            }),
            o &&
              (0, i.jsx)("div", {
                className: "relative z-1 pointer-events-none",
                children: o,
              }),
          ],
        });
      };
    x.displayName = "AgenticBall";
    let h = () => {
      let [e, t] = (0, l.I)(),
        { resolvedTheme: a } = (0, o.D)(),
        [u, s] = (0, n.useState)(0.5),
        [c, m] = (0, n.useState)(3),
        [d, v] = (0, n.useState)(2),
        [p, f] = (0, n.useState)(1.75),
        [h, g] = (0, n.useState)("#FFFFFF"),
        [y, b] = (0, n.useState)(4.3),
        [C, j] = (0, n.useState)(0),
        [S, w] = (0, n.useState)(2),
        [F, R] = (0, n.useState)(null),
        [B, k] = (0, n.useState)(1),
        T = (0, n.useMemo)(
          () => (null !== F ? F : "dark" === a ? "#0a0a0a" : "#FFFFFF"),
          [a, F],
        );
      return (0, i.jsxs)("div", {
        children: [
          (0, i.jsx)(r.Bg, {}),
          (0, i.jsxs)(r.VX, {
            children: [
              (0, i.jsxs)(r.Ec, {
                children: [
                  (0, i.jsx)(r.Ch, {
                    onRefresh: t,
                    children: (0, i.jsx)(
                      x,
                      {
                        width: 400,
                        height: 400,
                        speed: u,
                        complexity: c,
                        swirl: d,
                        zoom: p,
                        color: h,
                        hueRotation: y,
                        saturation: C,
                        brightness: S,
                        backgroundColor: T,
                        opacity: B,
                      },
                      e,
                    ),
                  }),
                  (0, i.jsxs)(r.IH, {
                    children: [
                      (0, i.jsx)(r.yt, {
                        title: "Speed",
                        value: u,
                        onChange: s,
                        min: 0.1,
                        max: 3,
                        step: 0.1,
                      }),
                      (0, i.jsx)(r.yt, {
                        title: "Complexity",
                        value: c,
                        onChange: m,
                        min: 1,
                        max: 8,
                        step: 1,
                      }),
                      (0, i.jsx)(r.yt, {
                        title: "Swirl",
                        value: d,
                        onChange: v,
                        min: 0,
                        max: 6,
                        step: 0.1,
                      }),
                      (0, i.jsx)(r.yt, {
                        title: "Zoom",
                        value: p,
                        onChange: f,
                        min: 0.5,
                        max: 4,
                        step: 0.05,
                      }),
                      (0, i.jsx)(r.yt, {
                        title: "Hue Rotation",
                        value: y,
                        onChange: b,
                        min: 0,
                        max: 6.28,
                        step: 0.1,
                      }),
                      (0, i.jsx)(r.yt, {
                        title: "Saturation",
                        value: C,
                        onChange: j,
                        min: 0,
                        max: 2,
                        step: 0.1,
                      }),
                      (0, i.jsx)(r.yt, {
                        title: "Brightness",
                        value: S,
                        onChange: w,
                        min: 0.1,
                        max: 5,
                        step: 0.1,
                      }),
                      (0, i.jsx)(r.yt, {
                        title: "Opacity",
                        value: B,
                        onChange: k,
                        min: 0,
                        max: 1,
                        step: 0.05,
                      }),
                      (0, i.jsx)(r.W7, {
                        title: "Tint Color",
                        value: h,
                        onChange: g,
                      }),
                      (0, i.jsx)(r.W7, {
                        title: "Background",
                        value: T,
                        onChange: (e) => R(e),
                      }),
                    ],
                  }),
                  (0, i.jsx)(r.Ub, {
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
                        description: "Additional CSS classes",
                      },
                      {
                        name: "children",
                        type: "React.ReactNode",
                        default: "undefined",
                        description: "Content rendered above the effect",
                      },
                      {
                        name: "speed",
                        type: "number",
                        default: "0.5",
                        description: "Animation speed multiplier",
                      },
                      {
                        name: "complexity",
                        type: "number",
                        default: "3",
                        description:
                          "Number of warp iterations (1–8). Higher = more detail",
                      },
                      {
                        name: "swirl",
                        type: "number",
                        default: "2.0",
                        description: "Amount of swirl rotation per layer",
                      },
                      {
                        name: "zoom",
                        type: "number",
                        default: "1.75",
                        description: "Overall zoom into the sphere surface",
                      },
                      {
                        name: "color",
                        type: "string",
                        default: '"#FFFFFF"',
                        description: "Primary tint color (hex)",
                      },
                      {
                        name: "hueRotation",
                        type: "number",
                        default: "4.3",
                        description:
                          "Hue rotation angle in radians (0 = natural amber, ~1 = green, ~2 = blue, ~3 = purple)",
                      },
                      {
                        name: "saturation",
                        type: "number",
                        default: "0",
                        description:
                          "Color saturation boost (0 = grayscale, 1 = normal, 2 = vivid)",
                      },
                      {
                        name: "brightness",
                        type: "number",
                        default: "2.0",
                        description: "Brightness multiplier",
                      },
                      {
                        name: "backgroundColor",
                        type: "string",
                        default: '"#000000"',
                        description: "Background color (hex)",
                      },
                      {
                        name: "opacity",
                        type: "number",
                        default: "1",
                        description: "Master opacity (0–1)",
                      },
                    ],
                  }),
                ],
              }),
              (0, i.jsx)(r.lT, { children: (0, i.jsx)(r.Gv, {}) }),
            ],
          }),
        ],
      });
    };
  },
};
