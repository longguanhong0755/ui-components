/* ReactBits Pro public preview module 51412 for dot-shift.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/51412.9c914ad12b9b6948.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  51412: (e, t, r) => {
    (r.r(t), r.d(t, { default: () => f }));
    var a = r(95155),
      i = r(12115),
      l = r(56388),
      n = r(90761),
      u = r(81712),
      o = r(3907),
      s = r(2253),
      c = r(90650);
    let d = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,
      m = `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uSpeed;
  uniform float uScale;
  uniform vec3 uColor;
  uniform float uSize;
  uniform float uBlur;

  varying vec2 vUv;

  float hash13(vec3 p3) {
    p3  = fract(p3 * .1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
  }

  vec3 getPattern(vec3 dir, float time) {
    dir += time * vec3(0.03, 0.01, 0.0);
    vec3 v = abs(mod(dir * 50.0, 2.0) - 1.0);
    vec3 pat = 3.0 * v * cos(hash13(floor(dir * 800.0)));
    return pat;
  }

  void main() {
    vec2 uv = (vUv * uResolution - 0.5 * uResolution) / uResolution.y;
    vec3 dir = normalize(vec3(uv * uScale, 1.0));
    float time = uTime * uSpeed;

    vec3 pat = getPattern(dir, time);
    float density = max(0.0, (1.5 * uSize) - dot(pat, vec3(1.0, 1.0, 0.5)));

    vec3 col = uColor * density * 3.0;

    float alpha = smoothstep(0.0, uBlur, density);

    gl_FragColor = vec4(col, alpha);
  }
`,
      v = ({ speed: e, scale: t, color: r, size: l, blur: n }) => {
        let o = (0, i.useRef)(null),
          c = (0, i.useRef)(null),
          { size: v, viewport: p } = (0, u.C)(),
          f = (0, i.useMemo)(
            () => ({
              uTime: { value: 0 },
              uResolution: { value: new s.I9Y(v.width, v.height) },
              uSpeed: { value: e },
              uScale: { value: t },
              uColor: { value: new s.Q1f(r) },
              uSize: { value: l },
              uBlur: { value: n },
            }),
            [],
          );
        return (
          (0, u.D)((a) => {
            c.current &&
              ((c.current.uniforms.uTime.value = a.clock.elapsedTime),
              c.current.uniforms.uResolution.value.set(v.width, v.height),
              (c.current.uniforms.uSpeed.value = e),
              (c.current.uniforms.uScale.value = t),
              c.current.uniforms.uColor.value.set(r),
              (c.current.uniforms.uSize.value = l),
              (c.current.uniforms.uBlur.value = n));
          }),
          (0, a.jsxs)("mesh", {
            ref: o,
            children: [
              (0, a.jsx)("planeGeometry", { args: [p.width, p.height] }),
              (0, a.jsx)("shaderMaterial", {
                ref: c,
                vertexShader: d,
                fragmentShader: m,
                uniforms: f,
                transparent: !0,
              }),
            ],
          })
        );
      },
      p = ({
        speed: e = 0.5,
        scale: t = 0.6,
        color: r = "#FF9FFC",
        size: i = 0.6,
        blur: l = 0.5,
        className: n = "",
      }) =>
        (0, a.jsx)("div", {
          className: (0, c.cn)("relative h-full w-full overflow-hidden", n),
          children: (0, a.jsx)(o.Hl, {
            orthographic: !0,
            camera: { position: [0, 0, 1], zoom: 1 },
            dpr: [1, 2],
            gl: {
              alpha: !0,
              antialias: !0,
              powerPreference: "high-performance",
            },
            children: (0, a.jsx)(v, {
              speed: e,
              scale: t,
              color: r,
              size: i,
              blur: l,
            }),
          }),
        }),
      f = () => {
        let [e, t] = (0, n.I)(),
          [r, u] = (0, i.useState)(0.5),
          [o, s] = (0, i.useState)(0.6),
          [c, d] = (0, i.useState)("#FF9FFC"),
          [m, v] = (0, i.useState)(0.6),
          [f, h] = (0, i.useState)(0.5);
        return (0, a.jsxs)("div", {
          children: [
            (0, a.jsx)(l.Bg, {}),
            (0, a.jsxs)(l.VX, {
              children: [
                (0, a.jsxs)(l.Ec, {
                  children: [
                    (0, a.jsx)(l.Ch, {
                      onRefresh: t,
                      minHeight: 600,
                      children: (0, a.jsx)(
                        p,
                        { speed: r, scale: o, color: c, size: m, blur: f },
                        e,
                      ),
                    }),
                    (0, a.jsxs)(l.IH, {
                      children: [
                        (0, a.jsx)(l.yt, {
                          title: "Speed",
                          min: 0,
                          max: 5,
                          step: 0.1,
                          value: r,
                          onChange: u,
                        }),
                        (0, a.jsx)(l.yt, {
                          title: "Scale",
                          min: 0.1,
                          max: 3,
                          step: 0.1,
                          value: o,
                          onChange: s,
                        }),
                        (0, a.jsx)(l.yt, {
                          title: "Dot Size",
                          min: 0.1,
                          max: 3,
                          step: 0.1,
                          value: m,
                          onChange: v,
                        }),
                        (0, a.jsx)(l.yt, {
                          title: "Dot Blur",
                          min: 0.1,
                          max: 1,
                          step: 0.05,
                          value: f,
                          onChange: h,
                        }),
                        (0, a.jsx)(l.W7, {
                          title: "Base Color",
                          value: c,
                          onChange: d,
                        }),
                      ],
                    }),
                    (0, a.jsx)(l.Ub, {
                      data: [
                        {
                          name: "speed",
                          type: "number",
                          default: "0.5",
                          description: "Animation speed multiplier.",
                        },
                        {
                          name: "scale",
                          type: "number",
                          default: "0.6",
                          description: "Scale of the dot pattern.",
                        },
                        {
                          name: "size",
                          type: "number",
                          default: "0.6",
                          description: "Size multiplier for the dots.",
                        },
                        {
                          name: "blur",
                          type: "number",
                          default: "0.5",
                          description: "Softness/blur of the dots.",
                        },
                        {
                          name: "color",
                          type: "string",
                          default: '"#FF9FFC"',
                          description: "Base color hue.",
                        },
                        {
                          name: "className",
                          type: "string",
                          default: '""',
                          description: "Additional CSS classes.",
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
