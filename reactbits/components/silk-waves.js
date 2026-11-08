/* ReactBits Pro public preview module 55821 for silk-waves.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/55821.824f97ec0690dfbf.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  55821: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => d }));
    var n = a(95155),
      u = a(12115),
      i = a(2253),
      r = a(12246),
      l = a(90650);
    let o = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,
      s = `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uSpeed;
  uniform float uScale;
  uniform float uDistortion;
  uniform float uCurve;
  uniform float uContrast;
  uniform float uRotation;
  uniform float uOffsetX;
  uniform float uOffsetY;
  uniform float uBrightness;
  uniform float uOpacity;
  uniform float uComplexity;
  uniform float uFrequency;
  uniform vec3 uC1;
  uniform vec3 uC2;
  uniform vec3 uC3;
  uniform vec3 uC4;
  uniform vec3 uC5;
  uniform vec3 uC6;
  uniform vec3 uC7;
  uniform vec3 uC8;

  varying vec2 vUv;

  vec2 rotate2D(vec2 p, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
  }

  void main() {
    vec2 pos = vUv * uScale;
    float aspect = uResolution.x / uResolution.y;
    pos.x *= aspect;

    pos.x += uOffsetX;
    pos.y += uOffsetY;

    vec2 center = vec2(aspect * 0.5 * uScale, 0.5 * uScale);
    pos = rotate2D(pos - center, uRotation) + center;

    float iterations = 10.0 + uComplexity * 10.0;

    for (float i = 1.0; i < 30.0; i++) {
        if (i > iterations) break;
        float timeOffset = uTime * uSpeed * 0.1 * i;
        float amp = 0.8 * uDistortion;
        float shift = 0.3 * uCurve;

        pos.x += amp / i * sin(i * pos.y + timeOffset + shift * i) + 1.6;
        pos.y += (amp * 2.0) / i * sin(pos.x + timeOffset + shift * i + 1.6) - 0.8;
    }

    float wave = cos((pos.x + pos.y) * uFrequency) * 0.5 + 0.5;

    vec3 finalColor = vec3(0.0);

    if (wave < 0.15) {
        finalColor = mix(uC1, uC2, wave * 6.667);
    } else if (wave < 0.35) {
        finalColor = mix(uC2, uC3, (wave - 0.15) * 5.0);
    } else if (wave < 0.55) {
        finalColor = mix(uC3, uC4, (wave - 0.35) * 5.0);
    } else if (wave < 0.7) {
        finalColor = mix(uC4, uC5, (wave - 0.55) * 6.667);
    } else if (wave < 0.82) {
        finalColor = mix(uC5, uC6, (wave - 0.7) * 8.333);
    } else if (wave < 0.92) {
        finalColor = mix(uC6, uC7, (wave - 0.82) * 10.0);
    } else {
        finalColor = mix(uC7, uC8, (wave - 0.92) * 12.5);
    }

    finalColor *= uBrightness;

    float alpha = smoothstep(0.01, 1.0, pow(wave, 2.5 * uContrast)) * uOpacity;
    gl_FragColor = vec4(finalColor, alpha);
  }
`,
      f = ({
        speed: e = 1,
        scale: t = 2,
        distortion: a = 1,
        curve: f = 1,
        contrast: c = 1,
        colors: m = [
          "#0d1326",
          "#162a52",
          "#1e407e",
          "#2657aa",
          "#2e6ed5",
          "#3785ff",
          "#5092ff",
          "#69a0ff",
        ],
        rotation: v = 0,
        offsetX: d = 0,
        offsetY: p = 0,
        brightness: C = 1,
        opacity: h = 1,
        complexity: x = 1,
        frequency: b = 1,
        className: y,
        style: g,
      }) => {
        let w = (0, u.useRef)(null),
          S = (0, u.useRef)(null),
          j = (0, u.useRef)(null),
          O = (0, u.useRef)(null);
        return (
          (0, u.useEffect)(() => {
            if (!w.current) return;
            let n = w.current,
              u = n.clientWidth,
              l = n.clientHeight,
              y = new i.Z58(),
              g = new i.qUd(-1, 1, 1, -1, 0, 1),
              R = new r.WebGLRenderer({
                antialias: !0,
                alpha: !0,
                powerPreference: "high-performance",
              });
            (R.setClearColor(0, 0),
              R.setSize(u, l),
              R.setPixelRatio(Math.min(window.devicePixelRatio, 2)),
              n.appendChild(R.domElement),
              (S.current = R));
            let P = new i.BKk({
              uniforms: {
                uTime: { value: 0 },
                uResolution: { value: new i.I9Y(u, l) },
                uSpeed: { value: e },
                uScale: { value: t },
                uDistortion: { value: a },
                uCurve: { value: f },
                uContrast: { value: c },
                uRotation: { value: (v * Math.PI) / 180 },
                uOffsetX: { value: d },
                uOffsetY: { value: p },
                uBrightness: { value: C },
                uOpacity: { value: h },
                uComplexity: { value: x },
                uFrequency: { value: b },
                uC1: { value: new i.Q1f(m[0]) },
                uC2: { value: new i.Q1f(m[1]) },
                uC3: { value: new i.Q1f(m[2]) },
                uC4: { value: new i.Q1f(m[3]) },
                uC5: { value: new i.Q1f(m[4]) },
                uC6: { value: new i.Q1f(m[5]) },
                uC7: { value: new i.Q1f(m[6]) },
                uC8: { value: new i.Q1f(m[7]) },
              },
              vertexShader: o,
              fragmentShader: s,
              transparent: !0,
            });
            j.current = P;
            let E = new i.bdM(2, 2),
              T = new i.eaF(E, P);
            y.add(T);
            let q = new i.zD7(),
              D = () => {
                let e = q.getElapsedTime();
                ((P.uniforms.uTime.value = e),
                  R.render(y, g),
                  (O.current = requestAnimationFrame(D)));
              };
            D();
            let F = new ResizeObserver(() => {
              let e = n.clientWidth,
                t = n.clientHeight;
              (R.setSize(e, t), P.uniforms.uResolution.value.set(e, t));
            });
            return (
              F.observe(n),
              () => {
                (O.current && cancelAnimationFrame(O.current),
                  F.disconnect(),
                  R.dispose(),
                  R.forceContextLoss(),
                  E.dispose(),
                  P.dispose(),
                  n.contains(R.domElement) && n.removeChild(R.domElement));
              }
            );
          }, []),
          (0, u.useEffect)(() => {
            j.current &&
              ((j.current.uniforms.uSpeed.value = e),
              (j.current.uniforms.uScale.value = t),
              (j.current.uniforms.uDistortion.value = a),
              (j.current.uniforms.uCurve.value = f),
              (j.current.uniforms.uContrast.value = c),
              (j.current.uniforms.uRotation.value = (v * Math.PI) / 180),
              (j.current.uniforms.uOffsetX.value = d),
              (j.current.uniforms.uOffsetY.value = p),
              (j.current.uniforms.uBrightness.value = C),
              (j.current.uniforms.uOpacity.value = h),
              (j.current.uniforms.uComplexity.value = x),
              (j.current.uniforms.uFrequency.value = b),
              j.current.uniforms.uC1.value.set(m[0]),
              j.current.uniforms.uC2.value.set(m[1]),
              j.current.uniforms.uC3.value.set(m[2]),
              j.current.uniforms.uC4.value.set(m[3]),
              j.current.uniforms.uC5.value.set(m[4]),
              j.current.uniforms.uC6.value.set(m[5]),
              j.current.uniforms.uC7.value.set(m[6]),
              j.current.uniforms.uC8.value.set(m[7]));
          }, [e, t, a, f, c, v, d, p, C, h, x, b, m]),
          (0, n.jsx)("div", {
            ref: w,
            className: (0, l.cn)(
              "relative w-full h-full overflow-hidden bg-transparent",
              y,
            ),
            style: { minHeight: "inherit", ...g },
          })
        );
      };
    var c = a(56388),
      m = a(90761);
    let v = {
        original: [
          "#0d1326",
          "#162a52",
          "#401e7e",
          "#7c26aa",
          "#632ed5",
          "#5237ff",
          "#8250ff",
          "#69a0ff",
        ],
        monochrome: [
          "#000000",
          "#1a1a1a",
          "#333333",
          "#4d4d4d",
          "#666666",
          "#808080",
          "#999999",
          "#b3b3b3",
        ],
        lava: [
          "#2c003e",
          "#51004a",
          "#78004c",
          "#9f0048",
          "#c5003c",
          "#e82626",
          "#ff6b00",
          "#ffaa00",
        ],
        spectre: [
          "#120018",
          "#210046",
          "#230074",
          "#0328a1",
          "#0053ce",
          "#0080fb",
          "#28adff",
          "#95dbff",
        ],
        ember: [
          "#1a0a00",
          "#3d1c0a",
          "#5c2a0e",
          "#7a3b1a",
          "#9e4a1e",
          "#c45e2a",
          "#e07840",
          "#ff9560",
        ],
        mint: [
          "#0a1a14",
          "#0d2818",
          "#1a4d3a",
          "#2d7359",
          "#40997a",
          "#5cbf9c",
          "#85d4b7",
          "#b0e9d4",
        ],
        candy: [
          "#1a0a1a",
          "#3d1a3d",
          "#6b2d6b",
          "#994099",
          "#cc66cc",
          "#e699e6",
          "#f2b8f2",
          "#ffd6ff",
        ],
        twilight: [
          "#0d1b2a",
          "#1b263b",
          "#2d3a5c",
          "#415a77",
          "#778da9",
          "#a0b4c8",
          "#c8d4e3",
          "#e0e8f0",
        ],
        golden: [
          "#1a1200",
          "#332600",
          "#4d3a00",
          "#7a5c00",
          "#a67c00",
          "#d4a000",
          "#ffc61a",
          "#ffe066",
        ],
        coral: [
          "#1a0d0a",
          "#3d1a14",
          "#662920",
          "#8c3d30",
          "#b35545",
          "#d97165",
          "#f09088",
          "#ffb4ad",
        ],
      },
      d = () => {
        let [e, t] = (0, m.I)(),
          [a, i] = (0, u.useState)(1),
          [r, l] = (0, u.useState)(2),
          [o, s] = (0, u.useState)("original"),
          [d, p] = (0, u.useState)(0),
          [C, h] = (0, u.useState)(0),
          [x, b] = (0, u.useState)(0),
          [y, g] = (0, u.useState)(1),
          [w, S] = (0, u.useState)(1),
          [j, O] = (0, u.useState)(1),
          [R, P] = (0, u.useState)(1),
          [E, T] = (0, u.useState)(1),
          [q, D] = (0, u.useState)(1),
          [F, N] = (0, u.useState)(1);
        return (0, n.jsxs)("div", {
          children: [
            (0, n.jsx)(c.Bg, {}),
            (0, n.jsxs)(c.VX, {
              children: [
                (0, n.jsxs)(c.Ec, {
                  children: [
                    (0, n.jsx)(c.Ch, {
                      onRefresh: t,
                      minHeight: 600,
                      children: (0, n.jsx)(
                        f,
                        {
                          speed: a,
                          scale: r,
                          distortion: y,
                          curve: w,
                          contrast: j,
                          colors: v[o],
                          rotation: d,
                          offsetX: C,
                          offsetY: x,
                          brightness: R,
                          opacity: E,
                          complexity: q,
                          frequency: F,
                        },
                        e,
                      ),
                    }),
                    (0, n.jsxs)(c.IH, {
                      children: [
                        (0, n.jsx)(c.yt, {
                          title: "Speed",
                          min: 0.1,
                          max: 2,
                          step: 0.1,
                          value: a,
                          onChange: i,
                        }),
                        (0, n.jsx)(c.yt, {
                          title: "Scale",
                          min: 1,
                          max: 10,
                          step: 0.1,
                          value: r,
                          onChange: l,
                        }),
                        (0, n.jsx)(c.yt, {
                          title: "Distortion",
                          min: 0,
                          max: 2,
                          step: 0.1,
                          value: y,
                          onChange: g,
                        }),
                        (0, n.jsx)(c.yt, {
                          title: "Curve",
                          min: 0,
                          max: 2,
                          step: 0.1,
                          value: w,
                          onChange: S,
                        }),
                        (0, n.jsx)(c.bg, {
                          title: "Color Preset",
                          value: o,
                          options: [
                            { label: "Original", value: "original" },
                            { label: "Monochrome", value: "monochrome" },
                            { label: "Lava", value: "lava" },
                            { label: "Spectre", value: "spectre" },
                            { label: "Ember", value: "ember" },
                            { label: "Mint", value: "mint" },
                            { label: "Candy", value: "candy" },
                            { label: "Twilight", value: "twilight" },
                            { label: "Golden", value: "golden" },
                            { label: "Coral", value: "coral" },
                          ],
                          onChange: s,
                        }),
                        (0, n.jsx)(c.yt, {
                          title: "Rotation",
                          min: -180,
                          max: 180,
                          step: 5,
                          value: d,
                          onChange: p,
                        }),
                        (0, n.jsx)(c.yt, {
                          title: "Offset X",
                          min: -5,
                          max: 5,
                          step: 0.1,
                          value: C,
                          onChange: h,
                        }),
                        (0, n.jsx)(c.yt, {
                          title: "Offset Y",
                          min: -5,
                          max: 5,
                          step: 0.1,
                          value: x,
                          onChange: b,
                        }),
                        (0, n.jsx)(c.yt, {
                          title: "Frequency",
                          min: 0.1,
                          max: 3,
                          step: 0.1,
                          value: F,
                          onChange: N,
                        }),
                        (0, n.jsx)(c.yt, {
                          title: "Complexity",
                          min: 0.5,
                          max: 2,
                          step: 0.1,
                          value: q,
                          onChange: D,
                        }),
                        (0, n.jsx)(c.yt, {
                          title: "Contrast",
                          min: 0.5,
                          max: 2,
                          step: 0.1,
                          value: j,
                          onChange: O,
                        }),
                        (0, n.jsx)(c.yt, {
                          title: "Brightness",
                          min: 0.1,
                          max: 2,
                          step: 0.1,
                          value: R,
                          onChange: P,
                        }),
                        (0, n.jsx)(c.yt, {
                          title: "Opacity",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: E,
                          onChange: T,
                        }),
                      ],
                    }),
                    (0, n.jsx)(c.Ub, {
                      data: [
                        {
                          name: "speed",
                          type: "number",
                          default: "1",
                          description: "Animation speed multiplier.",
                        },
                        {
                          name: "scale",
                          type: "number",
                          default: "2",
                          description: "Zoom level of the wave pattern.",
                        },
                        {
                          name: "distortion",
                          type: "number",
                          default: "1",
                          description: "Controls wave amplitude/swirl.",
                        },
                        {
                          name: "curve",
                          type: "number",
                          default: "1",
                          description: "Controls phase shift/rotation.",
                        },
                        {
                          name: "contrast",
                          type: "number",
                          default: "1",
                          description: "Controls alpha contrast/sharpness.",
                        },
                        {
                          name: "colors",
                          type: "string[]",
                          default: "[...]",
                          description:
                            "Array of 8 hex colors for the gradient.",
                        },
                        {
                          name: "rotation",
                          type: "number",
                          default: "0",
                          description: "Rotation of the pattern in degrees.",
                        },
                        {
                          name: "offsetX",
                          type: "number",
                          default: "0",
                          description: "Horizontal offset/pan of the pattern.",
                        },
                        {
                          name: "offsetY",
                          type: "number",
                          default: "0",
                          description: "Vertical offset/pan of the pattern.",
                        },
                        {
                          name: "brightness",
                          type: "number",
                          default: "1",
                          description: "Overall brightness multiplier.",
                        },
                        {
                          name: "opacity",
                          type: "number",
                          default: "1",
                          description: "Overall opacity (0-1).",
                        },
                        {
                          name: "complexity",
                          type: "number",
                          default: "1",
                          description:
                            "Wave complexity (affects iteration count, 0.5-2).",
                        },
                        {
                          name: "frequency",
                          type: "number",
                          default: "1",
                          description: "Wave stripe frequency.",
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
                (0, n.jsx)(c.lT, { children: (0, n.jsx)(c.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
