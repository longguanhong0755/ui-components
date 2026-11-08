/* ReactBits Pro public preview module 30869 for falling-rays.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/30869.9aff547e8372f157.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  30869: (t, e, o) => {
    (o.r(e), o.d(e, { default: () => p }));
    var l = o(95155),
      a = o(12115),
      i = o(81712),
      r = o(3907),
      n = o(2253),
      s = o(90650);
    let u = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,
      f = `
  uniform float uTime;
  uniform vec2 uResolution;

  uniform float uRayCount;
  uniform float uRayWidth;
  uniform float uPulseSpeed;
  uniform float uPulseWidth;
  uniform float uTrailLength;
  uniform float uMotionBlur;
  uniform float uBgGlow;
  uniform vec3 uColor1;
  uniform vec3 uColor2;

  const float topWidth = 0.15;
  const float bottomWidth = 1.0;
  const float verticalLength = 0.45;
  const float controlPoint1Y = 0.35;
  const float controlPoint1X = 0.25;
  const float controlPoint2Y = 0.55;
  const float controlPoint2X = 0.0;
  const float glowSpread = 1.0;
  const float glowCurve = 0.2;
  const float pulseBrightness = 1.0;

  varying vec2 vUv;

  float hash(float n) {
      return fract(sin(n * 127.1) * 43758.5453123);
  }

  vec3 solveCubic(float a, float b, float c, float d) {
      if (abs(a) < 1e-6) {
          if (abs(b) < 1e-6) {
              if (abs(c) < 1e-6) return vec3(-1.0);
              return vec3(-d/c, -1.0, -1.0);
          }
          float delta = c*c - 4.0*b*d;
          if (delta < 0.0) return vec3(-1.0);
          float sqrtDelta = sqrt(delta);
          return vec3((-c - sqrtDelta)/(2.0*b), (-c + sqrtDelta)/(2.0*b), -1.0);
      }

      float p = (3.0*a*c - b*b) / (3.0*a*a);
      float q = (2.0*b*b*b - 9.0*a*b*c + 27.0*a*a*d) / (27.0*a*a*a);

      float offset = b / (3.0*a);
      float discriminant = q*q/4.0 + p*p*p/27.0;

      if (discriminant > 0.0) {
          float r = sqrt(discriminant);
          float u = pow(abs(-q/2.0 + r), 1.0/3.0);
          u = (-q/2.0 + r) < 0.0 ? -u : u;
          float v = pow(abs(-q/2.0 - r), 1.0/3.0);
          v = (-q/2.0 - r) < 0.0 ? -v : v;
          return vec3(u + v - offset, -1.0, -1.0);
      } else if (discriminant == 0.0) {
          float u = pow(abs(q/2.0), 1.0/3.0);
          u = q < 0.0 ? u : -u;
          return vec3(2.0*u - offset, -u - offset, -1.0);
      } else {
          float r = sqrt(-p*p*p/27.0);
          float phi = acos(clamp(-q/(2.0*r), -1.0, 1.0));
          float t1 = 2.0 * pow(r, 1.0/3.0);
          float rho = 2.0 * sqrt(-p/3.0);
          float t0 = rho * cos(phi/3.0) - offset;
          float t1_val = rho * cos((phi + 2.0*3.14159)/3.0) - offset;
          float t2_val = rho * cos((phi + 4.0*3.14159)/3.0) - offset;
          return vec3(t0, t1_val, t2_val);
      }
  }

  void main() {
    float targetY = 1.0 - vUv.y;

    float P0 = 0.0;
    float P1 = verticalLength + controlPoint1Y;
    float P2 = controlPoint2Y;
    float P3 = 1.0;

    float a = -P0 + 3.0*P1 - 3.0*P2 + P3;
    float b = 3.0*P0 - 6.0*P1 + 3.0*P2;
    float c = -3.0*P0 + 3.0*P1;
    float d = P0 - targetY;

    vec3 roots = solveCubic(a, b, c, d);

    vec3 finalColorAccum = vec3(0.0);
    vec3 bgGlowAccum = vec3(0.0);

    float px = 1.0 / uResolution.x;

    for (int r = 0; r < 3; r++) {
        float t = roots[r];
        if (t < 0.0 || t > 1.0) continue;

        float s = 1.0 - t;
        float flowWidthAtT = s*s*s*topWidth +
                             3.0*s*s*t*(bottomWidth * controlPoint1X) +
                             3.0*s*t*t*(bottomWidth * controlPoint2X) +
                             t*t*t*bottomWidth;

        float idealH = (vUv.x - 0.5) / flowWidthAtT;
        float idealRayIndex = idealH + 0.5;
        float idealBin = idealRayIndex * (uRayCount - 1.0);

        for (int offset = 0; offset <= 1; offset++) {
             float bin = floor(idealBin) + float(offset);
             if (bin < 0.0 || bin >= uRayCount) continue;

             float i = bin;
             float rayIndex = i / (uRayCount - 1.0);
             float H = rayIndex - 0.5;
             float centerX = 0.5 + H * flowWidthAtT;
             float dist = abs(vUv.x - centerX);

             float widthAtT = mix(topWidth, bottomWidth, t);
             float widthScale = widthAtT / max(topWidth, bottomWidth);
             float scaledRayWidth = uRayWidth * widthScale;

             float dy_dt = 3.0*a*t*t + 2.0*b*t + c;
             float Wa = -topWidth + 3.0*(bottomWidth*controlPoint1X) - 3.0*(bottomWidth*controlPoint2X) + bottomWidth;
             float Wb = 3.0*topWidth - 6.0*(bottomWidth*controlPoint1X) + 3.0*(bottomWidth*controlPoint2X);
             float Wc = -3.0*topWidth + 3.0*(bottomWidth*controlPoint1X);
             float dFlowWidth_dt = 3.0*Wa*t*t + 2.0*Wb*t + Wc;
             float dx_dt = H * dFlowWidth_dt;

             float geomFactor = abs(dy_dt) / sqrt(dx_dt*dx_dt + dy_dt*dy_dt);
             float trueDist = dist * geomFactor;

             float minWidth = px * 1.5;
             float aaScale = 1.0;
             if (scaledRayWidth < minWidth) {
                 aaScale = scaledRayWidth / minWidth;
                 scaledRayWidth = minWidth;
             }

             float rayGlow = exp(-trueDist / scaledRayWidth);

             rayGlow = pow(rayGlow, 0.8);
             rayGlow *= aaScale;

             float colorHash = hash(i * 3.7);
             vec3 rayColor = mix(uColor1, uColor2, targetY);
             rayColor += (colorHash - 0.5) * 0.1;

             vec3 pulseColor = vec3(0.0);
             for (float p = 0.0; p < 3.0; p += 1.0) {
                 float pulseTime = uTime * uPulseSpeed + i * 0.2 + p * 0.7;
                 float pulsePos = fract(pulseTime);

                 float pulseDist = abs(t - pulsePos);

                 float pulseWidthAtT = mix(topWidth, bottomWidth, pulsePos);
                 float pulseWidthScale = pulseWidthAtT / max(topWidth, bottomWidth);
                 float scaledPulseWidth = uPulseWidth * pulseWidthScale;

                 float pulse = exp(-pulseDist / scaledPulseWidth) * rayGlow;

                 float trailDist = pulsePos - t;
                 if (trailDist > 0.0 && trailDist < uTrailLength) {
                     float trailFade = (1.0 - trailDist / uTrailLength) * 0.3;
                     pulse += trailFade * rayGlow;

                     float blurFactor = exp(-trailDist * 2.0) * uMotionBlur;
                     pulse += blurFactor * rayGlow * 0.5;
                 }

                 pulse *= smoothstep(1.0, 0.8, pulsePos);
                 pulseColor += rayColor * pulse;
             }

             finalColorAccum += pulseColor * pulseBrightness;

             float bgGlowDist = trueDist / (uRayWidth * 10.0);
             float baseGlowIntensity = exp(-bgGlowDist) * uBgGlow * 0.15;
             float spreadWeight = smoothstep(0.3, 1.0, t) * glowSpread;
             float curveWeight = exp(-pow((t - 0.5) * 3.0, 2.0)) * glowCurve;
             float glowWeight = spreadWeight + curveWeight;
             bgGlowAccum += rayColor * baseGlowIntensity * glowWeight;
        }
    }

    float yFade = smoothstep(0.0, 0.15, targetY);
    vec3 finalColor = finalColorAccum * yFade;
    finalColor += bgGlowAccum;

    vec2 centerUV = vUv - vec2(0.5);
    float vignette = 1.0 - smoothstep(0.7, 1.2, length(centerUV));
    finalColor *= vignette * 0.3 + 0.7;

    float alpha = max(max(finalColor.r, finalColor.g), finalColor.b);

    vec3 normalizedColor = finalColor / max(alpha, 0.001);

    alpha = smoothstep(0.0, 1.0, alpha);

    gl_FragColor = vec4(normalizedColor, alpha);
  }
`,
      d = ({
        rayCount: t,
        rayWidth: e,
        pulseSpeed: o,
        pulseWidth: r,
        trailLength: s,
        motionBlur: d,
        bgGlow: c,
        color1: h,
        color2: m,
      }) => {
        let p = (0, a.useRef)(null),
          v = (0, a.useRef)(null),
          { size: g, viewport: b } = (0, i.C)(),
          y = (0, a.useMemo)(
            () => ({
              uTime: { value: 0 },
              uResolution: { value: new n.I9Y(g.width, g.height) },
              uRayCount: { value: t },
              uRayWidth: { value: e },
              uPulseSpeed: { value: o },
              uPulseWidth: { value: r },
              uTrailLength: { value: s },
              uMotionBlur: { value: d },
              uBgGlow: { value: c },
              uColor1: { value: new n.Q1f(h) },
              uColor2: { value: new n.Q1f(m) },
            }),
            [],
          );
        return (
          (0, i.D)((l) => {
            v.current &&
              ((v.current.uniforms.uTime.value = l.clock.elapsedTime),
              v.current.uniforms.uResolution.value.set(g.width, g.height),
              (v.current.uniforms.uRayCount.value = t),
              (v.current.uniforms.uRayWidth.value = e),
              (v.current.uniforms.uPulseSpeed.value = o),
              (v.current.uniforms.uPulseWidth.value = r),
              (v.current.uniforms.uTrailLength.value = s),
              (v.current.uniforms.uMotionBlur.value = d),
              (v.current.uniforms.uBgGlow.value = c),
              v.current.uniforms.uColor1.value.set(h),
              v.current.uniforms.uColor2.value.set(m));
          }),
          (0, l.jsxs)("mesh", {
            ref: p,
            children: [
              (0, l.jsx)("planeGeometry", { args: [b.width, b.height] }),
              (0, l.jsx)("shaderMaterial", {
                ref: v,
                vertexShader: u,
                fragmentShader: f,
                uniforms: y,
                transparent: !0,
              }),
            ],
          })
        );
      },
      c = ({
        color1: t = "#1a00ff",
        color2: e = "#ff0080",
        rayCount: o = 37,
        rayWidth: a = 0.005,
        pulseSpeed: i = 0.4,
        pulseWidth: n = 0.03,
        trailLength: u = 0.5,
        motionBlur: f = 0.3,
        bgGlow: c = 1.2,
        className: h = "",
        style: m,
      }) =>
        (0, l.jsx)("div", {
          className: (0, s.cn)("relative h-full w-full overflow-hidden", h),
          style: { ...m },
          children: (0, l.jsx)(r.Hl, {
            orthographic: !0,
            camera: { position: [0, 0, 1], zoom: 1 },
            dpr: [1, 2],
            gl: {
              alpha: !0,
              antialias: !0,
              powerPreference: "high-performance",
            },
            resize: { scroll: !1, debounce: 0 },
            children: (0, l.jsx)(d, {
              rayCount: o,
              rayWidth: a,
              pulseSpeed: i,
              pulseWidth: n,
              trailLength: u,
              motionBlur: f,
              bgGlow: c,
              color1: t,
              color2: e,
            }),
          }),
        });
    var h = o(56388),
      m = o(90761);
    let p = () => {
      let [t, e] = (0, m.I)(),
        [o, i] = (0, a.useState)("#5227FF"),
        [r, n] = (0, a.useState)("#FF9FFC"),
        [s, u] = (0, a.useState)(15),
        [f, d] = (0, a.useState)(0.004),
        [p, v] = (0, a.useState)(0.1),
        [g, b] = (0, a.useState)(0.01),
        [y, x] = (0, a.useState)(0.3),
        [W, C] = (0, a.useState)(0.5),
        [w, P] = (0, a.useState)(0.1);
      return (0, l.jsxs)("div", {
        children: [
          (0, l.jsx)(h.Bg, {}),
          (0, l.jsxs)(h.VX, {
            children: [
              (0, l.jsxs)(h.Ec, {
                children: [
                  (0, l.jsx)(h.Ch, {
                    onRefresh: e,
                    minHeight: 600,
                    children: (0, l.jsx)(
                      c,
                      {
                        color1: o,
                        color2: r,
                        rayCount: s,
                        rayWidth: f,
                        pulseSpeed: p,
                        pulseWidth: g,
                        trailLength: y,
                        motionBlur: W,
                        bgGlow: w,
                      },
                      t,
                    ),
                  }),
                  (0, l.jsxs)(h.IH, {
                    children: [
                      (0, l.jsx)(h.W7, {
                        title: "Color 1",
                        value: o,
                        onChange: i,
                      }),
                      (0, l.jsx)(h.W7, {
                        title: "Color 2",
                        value: r,
                        onChange: n,
                      }),
                      (0, l.jsx)(h.yt, {
                        title: "Ray Count",
                        value: s,
                        onChange: u,
                        min: 10,
                        max: 30,
                        step: 1,
                      }),
                      (0, l.jsx)(h.yt, {
                        title: "Ray Width",
                        value: f,
                        onChange: d,
                        min: 0.001,
                        max: 0.01,
                        step: 0.001,
                      }),
                      (0, l.jsx)(h.yt, {
                        title: "Pulse Speed",
                        value: p,
                        onChange: v,
                        min: 0.1,
                        max: 0.5,
                        step: 0.05,
                      }),
                      (0, l.jsx)(h.yt, {
                        title: "Pulse Width",
                        value: g,
                        onChange: b,
                        min: 0.01,
                        max: 0.1,
                        step: 0.005,
                      }),
                      (0, l.jsx)(h.yt, {
                        title: "Trail Length",
                        value: y,
                        onChange: x,
                        min: 0.1,
                        max: 1,
                        step: 0.05,
                      }),
                      (0, l.jsx)(h.yt, {
                        title: "Motion Blur",
                        value: W,
                        onChange: C,
                        min: 0,
                        max: 1,
                        step: 0.05,
                      }),
                      (0, l.jsx)(h.yt, {
                        title: "BG Glow",
                        value: w,
                        onChange: P,
                        min: 0,
                        max: 1,
                        step: 0.1,
                      }),
                    ],
                  }),
                  (0, l.jsx)(h.Ub, {
                    data: [
                      {
                        name: "color1",
                        type: "string",
                        default: '"#1a00ff"',
                        description: "Primary ray color (hex).",
                      },
                      {
                        name: "color2",
                        type: "string",
                        default: '"#ff0080"',
                        description: "Secondary/Edge ray color (hex).",
                      },
                      {
                        name: "rayCount",
                        type: "number",
                        default: "37",
                        description: "Number of falling rays.",
                      },
                      {
                        name: "rayWidth",
                        type: "number",
                        default: "0.005",
                        description: "Base width of the rays.",
                      },
                      {
                        name: "pulseSpeed",
                        type: "number",
                        default: "0.4",
                        description: "Speed of the falling light pulses.",
                      },
                      {
                        name: "pulseWidth",
                        type: "number",
                        default: "0.03",
                        description: "Length of the light pulses.",
                      },
                      {
                        name: "trailLength",
                        type: "number",
                        default: "0.5",
                        description: "Length of the trailing fade effect.",
                      },
                      {
                        name: "motionBlur",
                        type: "number",
                        default: "0.3",
                        description: "Intensity of the motion blur smearing.",
                      },
                      {
                        name: "bgGlow",
                        type: "number",
                        default: "1.2",
                        description:
                          "Intensity of the background ambient glow.",
                      },
                      {
                        name: "className",
                        type: "string",
                        default: '""',
                        description:
                          "Additional CSS classes for the container.",
                      },
                      {
                        name: "style",
                        type: "React.CSSProperties",
                        default: "{}",
                        description: "Inline styles for the container.",
                      },
                    ],
                  }),
                ],
              }),
              (0, l.jsx)(h.lT, { children: (0, l.jsx)(h.Gv, {}) }),
            ],
          }),
        ],
      });
    };
  },
};
