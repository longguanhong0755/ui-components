/* ReactBits Pro public preview module 84462 for halftone-wave.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/84462.bb071a3c66409760.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  84462: (e, t, o) => {
    (o.r(t), o.d(t, { default: () => x }));
    var a = o(95155),
      n = o(12115),
      r = o(30701),
      s = o(56388),
      i = o(90761),
      u = o(81712),
      l = o(3907),
      c = o(90650),
      d = o(2253);
    let m = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,
      f = `
precision highp float;

uniform float uTime;
uniform vec2  uRes;
uniform float uSpeed;
uniform float uNoiseScale;
uniform int   uOctaves;
uniform float uGridDensity;
uniform float uDotSize;
uniform float uSoftness;
uniform float uContrastMin;
uniform float uContrastMax;
uniform float uScrollX;
uniform float uScrollY;
uniform float uRotation;
uniform vec3  uColorA;
uniform vec3  uColorB;
uniform vec3  uBg;
uniform float uAlpha;
uniform vec2  uPointer;
uniform float uCursorActive;

varying vec2 vUv;

float hash(vec2 st) {
  return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453123);
}

float valueNoise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 st) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 6; i++) {
    if (i >= uOctaves) break;
    value += amplitude * valueNoise(st);
    st *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  float t = uTime * uSpeed;

  vec2 uv = gl_FragCoord.xy / uRes;
  uv.x *= uRes.x / uRes.y;

  vec2 center = vec2((uRes.x / uRes.y) * 0.5, 0.5);
  vec2 rotUv = uv - center;
  float cr = cos(uRotation);
  float sr = sin(uRotation);
  rotUv = mat2(cr, -sr, sr, cr) * rotUv;
  uv = rotUv + center;

  vec2 noiseUV = uv * uNoiseScale + vec2(t * uScrollX, t * uScrollY);
  float n = fbm(noiseUV);

  n = smoothstep(uContrastMin, uContrastMax, n);

  vec2 gridUV = uv * uGridDensity;
  vec2 cellUV = fract(gridUV) - 0.5;
  float dist = length(cellUV);

  vec2 pointerUv = vec2(uPointer.x * (uRes.x / uRes.y), uPointer.y);
  float cursorDist = length(uv - pointerUv);
  float cursorBoost = smoothstep(0.35, 0.0, cursorDist) * 0.3 * uCursorActive;

  float targetRadius = n * uDotSize + cursorBoost;
  float dotMask = smoothstep(targetRadius + uSoftness, targetRadius - uSoftness, dist);

  vec3 dotColor = mix(uColorA, uColorB, n);
  vec3 finalColor = mix(uBg, dotColor, dotMask);

  gl_FragColor = vec4(finalColor, uAlpha);
}
`;
    function v(e) {
      let t = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);
      return t
        ? [
            parseInt(t[1], 16) / 255,
            parseInt(t[2], 16) / 255,
            parseInt(t[3], 16) / 255,
          ]
        : [0, 0, 0];
    }
    let p = ({
        speed: e,
        noiseScale: t,
        octaves: o,
        gridDensity: r,
        dotSize: s,
        softness: i,
        contrastMin: l,
        contrastMax: c,
        scrollX: v,
        scrollY: p,
        rotation: h,
        colorARgb: x,
        colorBRgb: g,
        bgRgb: C,
        opacity: y,
        pointer: S,
        cursorInteraction: b,
      }) => {
        let F = (0, n.useRef)(null),
          { size: j, viewport: M } = (0, u.C)(),
          w = (0, n.useRef)(new d.I9Y(0.5, 0.5)),
          R = (0, n.useMemo)(
            () => ({
              uTime: { value: 0 },
              uRes: { value: new d.I9Y() },
              uSpeed: { value: e },
              uNoiseScale: { value: t },
              uOctaves: { value: o },
              uGridDensity: { value: r },
              uDotSize: { value: s },
              uSoftness: { value: i },
              uContrastMin: { value: l },
              uContrastMax: { value: c },
              uScrollX: { value: v },
              uScrollY: { value: p },
              uRotation: { value: (h * Math.PI) / 180 },
              uColorA: { value: new d.Pq0(...x) },
              uColorB: { value: new d.Pq0(...g) },
              uBg: { value: new d.Pq0(...C) },
              uAlpha: { value: y },
              uPointer: { value: new d.I9Y(0.5, 0.5) },
              uCursorActive: { value: 0 },
            }),
            [],
          );
        return (
          (0, u.D)((a, n) => {
            if (!F.current) return;
            let u = F.current.material;
            ((u.uniforms.uTime.value = a.clock.elapsedTime),
              u.uniforms.uRes.value.set(j.width * M.dpr, j.height * M.dpr),
              (u.uniforms.uSpeed.value = e),
              (u.uniforms.uNoiseScale.value = t),
              (u.uniforms.uOctaves.value = o),
              (u.uniforms.uGridDensity.value = r),
              (u.uniforms.uDotSize.value = s),
              (u.uniforms.uSoftness.value = i),
              (u.uniforms.uContrastMin.value = l),
              (u.uniforms.uContrastMax.value = c),
              (u.uniforms.uScrollX.value = v),
              (u.uniforms.uScrollY.value = p),
              (u.uniforms.uRotation.value = (h * Math.PI) / 180),
              u.uniforms.uColorA.value.set(...x),
              u.uniforms.uColorB.value.set(...g),
              u.uniforms.uBg.value.set(...C),
              (u.uniforms.uAlpha.value = y),
              (u.uniforms.uCursorActive.value = +!!b));
            let d = 1 - Math.exp(-n / 0.15);
            ((w.current.x += (S[0] - w.current.x) * d),
              (w.current.y += (S[1] - w.current.y) * d),
              u.uniforms.uPointer.value.set(w.current.x, w.current.y));
          }),
          (0, a.jsxs)("mesh", {
            ref: F,
            children: [
              (0, a.jsx)("planeGeometry", { args: [2, 2] }),
              (0, a.jsx)("shaderMaterial", {
                vertexShader: m,
                fragmentShader: f,
                uniforms: R,
                transparent: !0,
              }),
            ],
          })
        );
      },
      h = ({
        width: e = "100%",
        height: t = "100%",
        className: o,
        children: r,
        speed: s = 1,
        noiseScale: i = 3,
        octaves: u = 3,
        gridDensity: d = 40,
        dotSize: m = 0.75,
        softness: f = 0.35,
        contrastMin: h = 0.2,
        contrastMax: x = 0.8,
        scrollX: g = 0.1,
        scrollY: C = 0.1,
        rotation: y = 0,
        colorA: S = "#FFFFFF",
        colorB: b = "#000000",
        backgroundColor: F = "#FFFFFF",
        opacity: j = 1,
        cursorInteraction: M = !1,
      }) => {
        let w = (0, n.useMemo)(() => v(S), [S]),
          R = (0, n.useMemo)(() => v(b), [b]),
          N = (0, n.useMemo)(() => v(F), [F]),
          B = (0, n.useRef)(null),
          [P, k] = (0, n.useState)([0.5, 0.5]),
          D = (0, n.useCallback)(
            (e) => {
              if (!M) return;
              let t = B.current?.getBoundingClientRect();
              t &&
                k([
                  (e.clientX - t.left) / t.width,
                  1 - (e.clientY - t.top) / t.height,
                ]);
            },
            [M],
          );
        return (0, a.jsxs)("div", {
          ref: B,
          className: (0, c.cn)("relative overflow-hidden", o),
          style: { width: e, height: t, backgroundColor: F },
          onPointerMove: D,
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
              children: (0, a.jsx)(p, {
                speed: s,
                noiseScale: i,
                octaves: u,
                gridDensity: d,
                dotSize: m,
                softness: f,
                contrastMin: h,
                contrastMax: x,
                scrollX: g,
                scrollY: C,
                rotation: y,
                colorARgb: w,
                colorBRgb: R,
                bgRgb: N,
                opacity: j,
                pointer: P,
                cursorInteraction: M,
              }),
            }),
            r &&
              (0, a.jsx)("div", {
                className: "pointer-events-none relative z-10",
                children: r,
              }),
          ],
        });
      };
    h.displayName = "HalftoneWave";
    let x = () => {
      let [e, t] = (0, i.I)(),
        { resolvedTheme: o } = (0, r.D)(),
        [u, l] = (0, n.useState)(1),
        [c, d] = (0, n.useState)(0),
        [m, f] = (0, n.useState)(1),
        [v, p] = (0, n.useState)(!1),
        [x, g] = (0, n.useState)(3),
        [C, y] = (0, n.useState)(3),
        [S, b] = (0, n.useState)(0.2),
        [F, j] = (0, n.useState)(0.8),
        [M, w] = (0, n.useState)(0.1),
        [R, N] = (0, n.useState)(0.1),
        [B, P] = (0, n.useState)(40),
        [k, D] = (0, n.useState)(0.75),
        [U, A] = (0, n.useState)(0.35),
        [I, z] = (0, n.useState)(null),
        [Y, T] = (0, n.useState)(null),
        [X, V] = (0, n.useState)(null),
        E = (0, n.useMemo)(
          () => (null !== I ? I : "dark" === o ? "#FFFFFF" : "#000000"),
          [o, I],
        ),
        G = (0, n.useMemo)(
          () => (null !== Y ? Y : "dark" === o ? "#FFFFFF" : "#000000"),
          [o, Y],
        ),
        O = (0, n.useMemo)(
          () => (null !== X ? X : "dark" === o ? "#0a0a0a" : "#FFFFFF"),
          [o, X],
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
                      className: "relative h-full w-full",
                      children: (0, a.jsx)(
                        h,
                        {
                          width: "100%",
                          height: "100%",
                          speed: u,
                          noiseScale: x,
                          octaves: C,
                          gridDensity: B,
                          dotSize: k,
                          softness: U,
                          contrastMin: S,
                          contrastMax: F,
                          scrollX: M,
                          scrollY: R,
                          rotation: c,
                          colorA: E,
                          colorB: G,
                          backgroundColor: O,
                          opacity: m,
                          cursorInteraction: v,
                        },
                        e,
                      ),
                    }),
                  }),
                  (0, a.jsxs)(s.IH, {
                    children: [
                      (0, a.jsx)(s.yt, {
                        title: "Grid Density",
                        value: B,
                        onChange: P,
                        min: 5,
                        max: 100,
                        step: 1,
                      }),
                      (0, a.jsx)(s.yt, {
                        title: "Dot Size",
                        value: k,
                        onChange: D,
                        min: 0,
                        max: 1,
                        step: 0.01,
                      }),
                      (0, a.jsx)(s.yt, {
                        title: "Softness",
                        value: U,
                        onChange: A,
                        min: 0,
                        max: 1,
                        step: 0.01,
                      }),
                      (0, a.jsx)(s.yt, {
                        title: "Speed",
                        value: u,
                        onChange: l,
                        min: 0.01,
                        max: 3,
                        step: 0.01,
                      }),
                      (0, a.jsx)(s.yt, {
                        title: "Rotation",
                        value: c,
                        onChange: d,
                        min: 0,
                        max: 360,
                        step: 1,
                      }),
                      (0, a.jsx)(s.yt, {
                        title: "Opacity",
                        value: m,
                        onChange: f,
                        min: 0,
                        max: 1,
                        step: 0.05,
                      }),
                      (0, a.jsx)(s.yt, {
                        title: "Noise Scale",
                        value: x,
                        onChange: g,
                        min: 0.5,
                        max: 10,
                        step: 0.1,
                      }),
                      (0, a.jsx)(s.yt, {
                        title: "Octaves",
                        value: C,
                        onChange: y,
                        min: 1,
                        max: 6,
                        step: 1,
                      }),
                      (0, a.jsx)(s.yt, {
                        title: "Contrast Min",
                        value: S,
                        onChange: b,
                        min: 0,
                        max: 1,
                        step: 0.01,
                      }),
                      (0, a.jsx)(s.yt, {
                        title: "Contrast Max",
                        value: F,
                        onChange: j,
                        min: 0,
                        max: 1,
                        step: 0.01,
                      }),
                      (0, a.jsx)(s.yt, {
                        title: "Scroll X",
                        value: M,
                        onChange: w,
                        min: -1,
                        max: 1,
                        step: 0.01,
                      }),
                      (0, a.jsx)(s.yt, {
                        title: "Scroll Y",
                        value: R,
                        onChange: N,
                        min: -1,
                        max: 1,
                        step: 0.01,
                      }),
                      (0, a.jsx)(s.W7, {
                        title: "Color A",
                        value: E,
                        onChange: (e) => z(e),
                      }),
                      (0, a.jsx)(s.W7, {
                        title: "Color B",
                        value: G,
                        onChange: (e) => T(e),
                      }),
                      (0, a.jsx)(s.W7, {
                        title: "Background",
                        value: O,
                        onChange: (e) => V(e),
                      }),
                      (0, a.jsx)(s.tl, {
                        title: "Cursor Interaction",
                        checked: v,
                        onChange: p,
                      }),
                    ],
                  }),
                  (0, a.jsx)(s.Ub, {
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
                        default: "1.0",
                        description: "Animation speed multiplier (0.01–3.0)",
                      },
                      {
                        name: "noiseScale",
                        type: "number",
                        default: "3.0",
                        description:
                          "Noise field scale: higher values create smaller, denser noise features (0.5–10)",
                      },
                      {
                        name: "octaves",
                        type: "number",
                        default: "3",
                        description:
                          "Number of FBM octaves (1–6). More octaves = finer detail",
                      },
                      {
                        name: "gridDensity",
                        type: "number",
                        default: "40.0",
                        description: "Number of dots per screen-width (5–100)",
                      },
                      {
                        name: "dotSize",
                        type: "number",
                        default: "0.75",
                        description:
                          "Maximum dot radius as fraction of cell (0–1)",
                      },
                      {
                        name: "softness",
                        type: "number",
                        default: "0.35",
                        description:
                          "Dot edge softness, higher = blurrier edges (0–1)",
                      },
                      {
                        name: "contrastMin",
                        type: "number",
                        default: "0.2",
                        description:
                          "Lower bound of noise contrast remap (0–1)",
                      },
                      {
                        name: "contrastMax",
                        type: "number",
                        default: "0.8",
                        description:
                          "Upper bound of noise contrast remap (0–1)",
                      },
                      {
                        name: "scrollX",
                        type: "number",
                        default: "0.1",
                        description:
                          "Horizontal scroll speed of the noise field (-1–1)",
                      },
                      {
                        name: "scrollY",
                        type: "number",
                        default: "0.1",
                        description:
                          "Vertical scroll speed of the noise field (-1–1)",
                      },
                      {
                        name: "rotation",
                        type: "number",
                        default: "0",
                        description: "Rotation angle in degrees (0–360)",
                      },
                      {
                        name: "colorA",
                        type: "string",
                        default: '"#FFFFFF"',
                        description:
                          "Primary dot color at low noise values (hex)",
                      },
                      {
                        name: "colorB",
                        type: "string",
                        default: '"#000000"',
                        description:
                          "Secondary dot color at high noise values (hex)",
                      },
                      {
                        name: "backgroundColor",
                        type: "string",
                        default: '"#FFFFFF"',
                        description: "Background color (hex)",
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
                          "Enable cursor interaction to boost dot size near pointer",
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
