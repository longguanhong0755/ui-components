/* ReactBits Pro public preview module 88437 for synaptic-shift.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/88437.533118e97288380c.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  88437: (e, t, n) => {
    (n.r(t), n.d(t, { default: () => p }));
    var i = n(95155),
      r = n(12115),
      l = n(56388),
      a = n(90761),
      o = n(81712),
      u = n(3907),
      s = n(2253),
      c = n(90650);
    let m = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,
      f = `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uPointer;
  uniform vec3 uColor;
  uniform float uSpeed;
  uniform float uScale;
  uniform float uIntensity;
  uniform float uFalloff;
  uniform float uComplexity;

  varying vec2 vUv;

  mat2 rotate2D(float r) {
    return mat2(cos(r), sin(r), -sin(r), cos(r));
  }

  void main() {
    vec2 uv = (vUv * uResolution - 0.5 * uResolution) / uResolution.y;
    vec3 col = vec3(0.0);
    float t = uTime * uSpeed;

    vec2 n = vec2(0.0);
    vec2 q = vec2(0.0);
    vec2 N = vec2(0.0);
    vec2 p = uv + sin(t * 0.1) / 10.0;
    float S = 10.0 * uScale;

    mat2 m = rotate2D(1.0 - uPointer.x * 0.0001);

    for (float i = 0.0; i < 50.0; i++) {
      if (i >= uComplexity) break;
      float j = i + 1.0;
      p *= m;
      n *= m;
      q = p * S + j + n + t;
      n += sin(q);
      N += cos(q) / S;
      S *= uFalloff;
    }

    float brightness = pow((N.x + N.y + 0.2) + 0.005 / length(N), uIntensity);
    col = uColor * vec3(1.0, 2.0, 4.0) * brightness;

    float alpha = clamp(brightness, 0.0, 1.0);
    gl_FragColor = vec4(col, alpha);
  }
`,
      d = ({
        color: e,
        speed: t,
        scale: n,
        intensity: l,
        falloff: a,
        complexity: u,
        breathing: c,
      }) => {
        let d = (0, r.useRef)(null),
          v = (0, r.useRef)(null),
          { size: p, viewport: h, pointer: x } = (0, o.C)(),
          g = (0, r.useMemo)(
            () => ({
              uTime: { value: 0 },
              uResolution: { value: new s.I9Y(p.width, p.height) },
              uPointer: { value: new s.I9Y(0, 0) },
              uColor: { value: new s.Q1f(e) },
              uSpeed: { value: t },
              uScale: { value: n },
              uIntensity: { value: l },
              uFalloff: { value: a },
              uComplexity: { value: u },
            }),
            [],
          );
        return (
          (0, o.D)((i) => {
            if (v.current) {
              if (
                ((v.current.uniforms.uTime.value = i.clock.elapsedTime),
                v.current.uniforms.uResolution.value.set(p.width, p.height),
                v.current.uniforms.uColor.value.set(e),
                (v.current.uniforms.uSpeed.value = t),
                (v.current.uniforms.uScale.value = n),
                (v.current.uniforms.uFalloff.value = a),
                (v.current.uniforms.uComplexity.value = u),
                c)
              ) {
                let e = 0.2 * Math.sin(2 * i.clock.elapsedTime) + 1;
                v.current.uniforms.uIntensity.value = l * e;
              } else v.current.uniforms.uIntensity.value = l;
              let r = x.x * p.width,
                o = x.y * p.height;
              ((v.current.uniforms.uPointer.value.x +=
                (r - v.current.uniforms.uPointer.value.x) * 0.1),
                (v.current.uniforms.uPointer.value.y +=
                  (o - v.current.uniforms.uPointer.value.y) * 0.1));
            }
          }),
          (0, i.jsxs)("mesh", {
            ref: d,
            children: [
              (0, i.jsx)("planeGeometry", { args: [h.width, h.height] }),
              (0, i.jsx)("shaderMaterial", {
                ref: v,
                vertexShader: m,
                fragmentShader: f,
                uniforms: g,
                transparent: !0,
              }),
            ],
          })
        );
      },
      v = ({
        speed: e = 0.5,
        scale: t = 0.5,
        intensity: n = 2,
        color: r = "#FF9FFC",
        falloff: l = 1.15,
        complexity: a = 10,
        breathing: o = !1,
        className: s = "",
      }) =>
        (0, i.jsx)("div", {
          className: (0, c.cn)("relative h-full w-full overflow-hidden", s),
          children: (0, i.jsx)(u.Hl, {
            orthographic: !0,
            camera: { position: [0, 0, 1], zoom: 1 },
            dpr: [1, 2],
            gl: {
              alpha: !0,
              antialias: !0,
              powerPreference: "high-performance",
            },
            children: (0, i.jsx)(d, {
              color: r,
              speed: e,
              scale: t,
              intensity: n,
              falloff: l,
              complexity: a,
              breathing: o,
            }),
          }),
        }),
      p = () => {
        let [e, t] = (0, a.I)(),
          [n, o] = (0, r.useState)(0.5),
          [u, s] = (0, r.useState)(0.5),
          [c, m] = (0, r.useState)(2),
          [f, d] = (0, r.useState)("#FF9FFC"),
          [p, h] = (0, r.useState)(1.15),
          [x, g] = (0, r.useState)(10),
          [y, b] = (0, r.useState)(!1);
        return (0, i.jsxs)("div", {
          children: [
            (0, i.jsx)(l.Bg, {}),
            (0, i.jsxs)(l.VX, {
              children: [
                (0, i.jsxs)(l.Ec, {
                  children: [
                    (0, i.jsx)(l.Ch, {
                      onRefresh: t,
                      minHeight: 600,
                      children: (0, i.jsx)(
                        v,
                        {
                          speed: n,
                          scale: u,
                          intensity: c,
                          color: f,
                          falloff: p,
                          complexity: x,
                          breathing: y,
                        },
                        e,
                      ),
                    }),
                    (0, i.jsxs)(l.IH, {
                      children: [
                        (0, i.jsx)(l.yt, {
                          title: "Speed",
                          min: 0,
                          max: 5,
                          step: 0.1,
                          value: n,
                          onChange: o,
                        }),
                        (0, i.jsx)(l.yt, {
                          title: "Scale",
                          min: 0.1,
                          max: 2,
                          step: 0.1,
                          value: u,
                          onChange: s,
                        }),
                        (0, i.jsx)(l.tl, {
                          title: "Breathing",
                          checked: y,
                          onChange: b,
                        }),
                        (0, i.jsx)(l.yt, {
                          title: "Intensity",
                          min: 0.1,
                          max: 5,
                          step: 0.1,
                          value: c,
                          onChange: m,
                        }),
                        (0, i.jsx)(l.yt, {
                          title: "Falloff",
                          min: 0.5,
                          max: 2,
                          step: 0.01,
                          value: p,
                          onChange: h,
                        }),
                        (0, i.jsx)(l.yt, {
                          title: "Complexity (Iterations)",
                          min: 5,
                          max: 50,
                          step: 1,
                          value: x,
                          onChange: g,
                        }),
                        (0, i.jsx)(l.W7, {
                          title: "Color Tint",
                          value: f,
                          onChange: d,
                        }),
                      ],
                    }),
                    (0, i.jsx)(l.Ub, {
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
                          default: "0.5",
                          description: "Scale of the fractal pattern.",
                        },
                        {
                          name: "intensity",
                          type: "number",
                          default: "2",
                          description:
                            "Exponent controlling brightness/contrast.",
                        },
                        {
                          name: "color",
                          type: "string",
                          default: '"#FF9FFC"',
                          description: "Base color tint.",
                        },
                        {
                          name: "falloff",
                          type: "number",
                          default: "1.15",
                          description:
                            "Internal scaling factor (structural falloff).",
                        },
                        {
                          name: "complexity",
                          type: "number",
                          default: "10",
                          description:
                            "Number of loop iterations (detail level).",
                        },
                        {
                          name: "breathing",
                          type: "boolean",
                          default: "false",
                          description:
                            "Whether to animate intensity automatically.",
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
                (0, i.jsx)(l.lT, { children: (0, i.jsx)(l.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
