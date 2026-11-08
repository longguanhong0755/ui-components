/* ReactBits Pro public preview module 88358 for grain-wave.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/88358.359ee4f24a8ffa5f.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  88358: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => g }));
    var n = a(95155),
      r = a(12115),
      o = a(56388),
      i = a(48543),
      l = a(90761),
      u = a(81712),
      s = a(3907),
      d = a(2253),
      c = a(30701),
      v = a(90650);
    let f = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,
      m = `
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_speed;
uniform float u_waveCount;
uniform float u_waveAmplitude;
uniform float u_waveFrequency;
uniform float u_lineThickness;
uniform float u_grainIntensity;
uniform vec3 u_startColor;
uniform vec3 u_endColor;
uniform vec3 u_backgroundColor;
uniform float u_brightness;
uniform float u_speedVariation;
uniform float u_waveWidth;
uniform float u_scale;

varying vec2 vUv;

float generateNoise(vec2 position) {
  vec2 seed = vec2(12.9898, 78.233);
  float dotProduct = dot(position, seed);
  return fract(sin(dotProduct) * 43758.5453);
}

float applyGrain(vec2 position) {
  return (generateNoise(position) * 2.0 - 1.0) / 256.0;
}

vec4 calculateWaveLine(vec2 coord, float animSpeed, float horizontalScale, vec3 color) {
  float waveOffset = sin(u_time * animSpeed + coord.x * horizontalScale * u_waveFrequency) * u_waveAmplitude;
  float edgeFalloff = smoothstep(1.0, 0.0, abs(coord.x));
  coord.y += waveOffset * edgeFalloff;

  float lineIntensity = smoothstep(u_lineThickness, 0.0, abs(coord.y));

  float yFade = smoothstep(1.0, 0.2, abs(coord.y));
  float xFade = smoothstep(1.0, 0.3, abs(coord.x));
  float combinedFade = yFade * xFade;

  return vec4(color * lineIntensity * combinedFade, 1.0);
}

void main() {
  vec2 coord = vUv * 2.0 - 1.0;
  coord.x *= u_resolution.x / u_resolution.y;

  coord /= u_scale;

  coord.x /= u_waveWidth;

  vec4 colorAccumulator = vec4(0.0);

  for (float i = 0.0; i <= 50.0; i += 1.0) {
    if (i >= u_waveCount) break;

    float progress = i / u_waveCount * 2.0;

    float lineSpeed = u_speed + progress * u_speedVariation;

    float colorMix = i / u_waveCount;
    vec3 waveColor = mix(u_startColor, u_endColor, colorMix);

    colorAccumulator += calculateWaveLine(coord, lineSpeed, progress, waveColor);
  }

  vec3 waveColor = colorAccumulator.rgb * u_brightness;

  float waveIntensity = clamp(length(waveColor), 0.0, 1.0);
  float grain = applyGrain(coord) * u_grainIntensity * waveIntensity;
  waveColor += vec3(grain);

  float bgLuminance = dot(u_backgroundColor, vec3(0.299, 0.587, 0.114));
  vec3 finalColor;
  if (bgLuminance > 0.5) {
    float waveAlpha = clamp(length(waveColor), 0.0, 1.0);
    finalColor = mix(u_backgroundColor, waveColor, waveAlpha);
  } else {
    finalColor = u_backgroundColor + waveColor;
  }

  gl_FragColor = vec4(finalColor, 1.0);
}
`,
      p = ({
        speed: e,
        waveCount: t,
        waveAmplitude: a,
        waveFrequency: o,
        lineThickness: i,
        grainIntensity: l,
        startColor: s,
        endColor: c,
        backgroundColor: v,
        brightness: p,
        speedVariation: h,
        waveWidth: g,
        scale: w,
      }) => {
        let C = (0, r.useRef)(null),
          x = (0, r.useRef)(null),
          { viewport: _ } = (0, u.C)(),
          b = (0, r.useMemo)(
            () => ({
              u_time: { value: 0 },
              u_resolution: { value: new d.I9Y(100 * _.width, 100 * _.height) },
              u_speed: { value: e },
              u_waveCount: { value: t },
              u_waveAmplitude: { value: a },
              u_waveFrequency: { value: o },
              u_lineThickness: { value: i },
              u_grainIntensity: { value: l },
              u_startColor: { value: new d.Q1f(s) },
              u_endColor: { value: new d.Q1f(c) },
              u_backgroundColor: { value: new d.Q1f(v) },
              u_brightness: { value: p },
              u_speedVariation: { value: h },
              u_waveWidth: { value: g },
              u_scale: { value: w },
            }),
            [],
          );
        return (
          (0, u.D)((n) => {
            x.current &&
              ((x.current.uniforms.u_time.value = n.clock.elapsedTime),
              x.current.uniforms.u_resolution.value.set(
                100 * _.width,
                100 * _.height,
              ),
              (x.current.uniforms.u_speed.value = e),
              (x.current.uniforms.u_waveCount.value = t),
              (x.current.uniforms.u_waveAmplitude.value = a),
              (x.current.uniforms.u_waveFrequency.value = o),
              (x.current.uniforms.u_lineThickness.value = i),
              (x.current.uniforms.u_grainIntensity.value = l),
              x.current.uniforms.u_startColor.value.set(s),
              x.current.uniforms.u_endColor.value.set(c),
              x.current.uniforms.u_backgroundColor.value.set(v),
              (x.current.uniforms.u_brightness.value = p),
              (x.current.uniforms.u_speedVariation.value = h),
              (x.current.uniforms.u_waveWidth.value = g),
              (x.current.uniforms.u_scale.value = w));
          }),
          (0, n.jsxs)("mesh", {
            ref: C,
            scale: [_.width, _.height, 1],
            children: [
              (0, n.jsx)("planeGeometry", { args: [1, 1] }),
              (0, n.jsx)("shaderMaterial", {
                ref: x,
                vertexShader: f,
                fragmentShader: m,
                uniforms: b,
              }),
            ],
          })
        );
      },
      h = ({
        width: e = "100%",
        height: t = "100%",
        className: a = "",
        speed: r = 0.5,
        waveCount: o = 25,
        waveAmplitude: i = 0.85,
        waveFrequency: l = 4,
        lineThickness: u = 0.2,
        grainIntensity: d = 50,
        startColor: f = "#ff6666",
        endColor: m = "#6666ff",
        lightBackground: h = "#ffffff",
        darkBackground: g = "#000000",
        brightness: w = 1,
        speedVariation: C = 0.006,
        waveWidth: x = 3.5,
        scale: _ = 0.6,
      }) => {
        let { resolvedTheme: b } = (0, c.D)(),
          y = "number" == typeof e ? `${e}px` : e,
          S = "number" == typeof t ? `${t}px` : t;
        return (0, n.jsx)("div", {
          className: (0, v.cn)("relative overflow-hidden", a),
          style: { width: y, height: S },
          children: (0, n.jsx)(s.Hl, {
            className: "absolute inset-0 h-full w-full",
            gl: { antialias: !0, alpha: !1 },
            camera: { position: [0, 0, 1], fov: 75 },
            children: (0, n.jsx)(p, {
              speed: r,
              waveCount: o,
              waveAmplitude: i,
              waveFrequency: l,
              lineThickness: u,
              grainIntensity: d,
              startColor: f,
              endColor: m,
              backgroundColor: "dark" === b ? g : h,
              brightness: w,
              speedVariation: C,
              waveWidth: x,
              scale: _,
            }),
          }),
        });
      };
    h.displayName = "GrainWave";
    let g = () => {
      let [e, t] = (0, l.I)(),
        [a, u] = (0, r.useState)(0.5),
        [s, d] = (0, r.useState)(25),
        [c, v] = (0, r.useState)(0.85),
        [f, m] = (0, r.useState)(4),
        [p, g] = (0, r.useState)(3.5),
        [w, C] = (0, r.useState)(0.006),
        [x, _] = (0, r.useState)(0.2),
        [b, y] = (0, r.useState)(50),
        [S, j] = (0, r.useState)(0.6),
        [k, P] = (0, r.useState)(1),
        [I, F] = (0, r.useState)("#ff6666"),
        [W, A] = (0, r.useState)("#6666ff"),
        [N, T] = (0, r.useState)("#ffffff"),
        [V, B] = (0, r.useState)("#333333");
      return (0, n.jsxs)("div", {
        children: [
          (0, n.jsx)(o.Bg, {}),
          (0, n.jsxs)(o.VX, {
            children: [
              (0, n.jsxs)(o.Ec, {
                children: [
                  (0, n.jsx)(o.Ch, {
                    onRefresh: t,
                    minHeight: 500,
                    children: (0, n.jsx)(
                      h,
                      {
                        speed: a,
                        waveCount: s,
                        waveAmplitude: c,
                        waveFrequency: f,
                        lineThickness: x,
                        grainIntensity: b,
                        startColor: I,
                        endColor: W,
                        lightBackground: N,
                        darkBackground: V,
                        brightness: k,
                        speedVariation: w,
                        waveWidth: p,
                        scale: S,
                      },
                      e,
                    ),
                  }),
                  (0, n.jsxs)(o.IH, {
                    children: [
                      (0, n.jsx)(i.PreviewSlider, {
                        title: "Speed",
                        value: a,
                        onChange: u,
                        min: 0.1,
                        max: 2,
                        step: 0.1,
                      }),
                      (0, n.jsx)(i.PreviewSlider, {
                        title: "Wave Count",
                        value: s,
                        onChange: d,
                        min: 5,
                        max: 50,
                        step: 1,
                      }),
                      (0, n.jsx)(i.PreviewSlider, {
                        title: "Amplitude",
                        value: c,
                        onChange: v,
                        min: 0.1,
                        max: 2,
                        step: 0.05,
                      }),
                      (0, n.jsx)(i.PreviewSlider, {
                        title: "Frequency",
                        value: f,
                        onChange: m,
                        min: 1,
                        max: 10,
                        step: 0.5,
                      }),
                      (0, n.jsx)(i.PreviewSlider, {
                        title: "Wave Width",
                        value: p,
                        onChange: g,
                        min: 1,
                        max: 10,
                        step: 0.5,
                      }),
                      (0, n.jsx)(i.PreviewSlider, {
                        title: "Speed Variation",
                        value: w,
                        onChange: C,
                        min: 0,
                        max: 0.05,
                        step: 0.002,
                      }),
                      (0, n.jsx)(i.PreviewSlider, {
                        title: "Line Thickness",
                        value: x,
                        onChange: _,
                        min: 0.05,
                        max: 0.5,
                        step: 0.05,
                      }),
                      (0, n.jsx)(i.PreviewSlider, {
                        title: "Grain Intensity",
                        value: b,
                        onChange: y,
                        min: 0,
                        max: 100,
                        step: 5,
                      }),
                      (0, n.jsx)(i.PreviewSlider, {
                        title: "Scale",
                        value: S,
                        onChange: j,
                        min: 0.2,
                        max: 2,
                        step: 0.1,
                      }),
                      (0, n.jsx)(i.PreviewSlider, {
                        title: "Brightness",
                        value: k,
                        onChange: P,
                        min: 0.1,
                        max: 3,
                        step: 0.1,
                      }),
                      (0, n.jsx)(i.PreviewColor, {
                        title: "Start Color",
                        value: I,
                        onChange: F,
                      }),
                      (0, n.jsx)(i.PreviewColor, {
                        title: "End Color",
                        value: W,
                        onChange: A,
                      }),
                      (0, n.jsx)(i.PreviewColor, {
                        title: "Light Mode",
                        value: N,
                        onChange: T,
                      }),
                      (0, n.jsx)(i.PreviewColor, {
                        title: "Dark Mode",
                        value: V,
                        onChange: B,
                      }),
                    ],
                  }),
                  (0, n.jsx)(o.Ub, {
                    data: [
                      {
                        name: "width",
                        type: "number | string",
                        default: '"100%"',
                        description:
                          "Width of the component in pixels or CSS value",
                      },
                      {
                        name: "height",
                        type: "number | string",
                        default: '"100%"',
                        description:
                          "Height of the component in pixels or CSS value",
                      },
                      {
                        name: "speed",
                        type: "number",
                        default: "0.5",
                        description: "Animation speed multiplier",
                      },
                      {
                        name: "waveCount",
                        type: "number",
                        default: "25",
                        description: "Number of wave lines",
                      },
                      {
                        name: "waveAmplitude",
                        type: "number",
                        default: "0.85",
                        description: "Wave amplitude/height",
                      },
                      {
                        name: "waveFrequency",
                        type: "number",
                        default: "4",
                        description: "Horizontal wave frequency",
                      },
                      {
                        name: "lineThickness",
                        type: "number",
                        default: "0.2",
                        description: "Line thickness",
                      },
                      {
                        name: "grainIntensity",
                        type: "number",
                        default: "50",
                        description: "Grain/dither intensity",
                      },
                      {
                        name: "startColor",
                        type: "string",
                        default: '"#ff6666"',
                        description: "Start color (top waves)",
                      },
                      {
                        name: "endColor",
                        type: "string",
                        default: '"#6666ff"',
                        description: "End color (bottom waves)",
                      },
                      {
                        name: "lightBackground",
                        type: "string",
                        default: '"#ffffff"',
                        description: "Background color for light mode",
                      },
                      {
                        name: "darkBackground",
                        type: "string",
                        default: '"#000000"',
                        description: "Background color for dark mode",
                      },
                      {
                        name: "brightness",
                        type: "number",
                        default: "1",
                        description: "Overall brightness",
                      },
                      {
                        name: "speedVariation",
                        type: "number",
                        default: "0.006",
                        description: "Wave speed variation between lines",
                      },
                      {
                        name: "waveWidth",
                        type: "number",
                        default: "3.5",
                        description:
                          "Width of the wave effect (horizontal spread)",
                      },
                      {
                        name: "scale",
                        type: "number",
                        default: "0.6",
                        description: "Scale of the entire effect",
                      },
                      {
                        name: "className",
                        type: "string",
                        default: '""',
                        description: "Additional CSS classes",
                      },
                    ],
                  }),
                ],
              }),
              (0, n.jsx)(o.lT, { children: (0, n.jsx)(o.Gv, {}) }),
            ],
          }),
        ],
      });
    };
  },
};
