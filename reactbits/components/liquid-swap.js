/* ReactBits Pro public preview module 26078 for liquid-swap.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/26078.a40605af1facec11.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  26078: (e, t, r) => {
    (r.r(t), r.d(t, { default: () => x }));
    var i = r(95155),
      a = r(56388),
      n = r(48543),
      o = r(90761),
      s = r(12115),
      l = r(2253),
      u = r(12246),
      c = r(82637),
      d = r(90650);
    let f = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,
      m = `
  uniform sampler2D uTex1;
  uniform sampler2D uTex2;
  uniform float uMix;
  uniform vec2 uSize;
  uniform vec2 uTex1Dims;
  uniform vec2 uTex2Dims;
  uniform vec2 uOrigin;
  uniform float uRefract;
  uniform float uChroma;
  uniform float uClarity;
  uniform float uGlow;
  uniform float uFlow;

  varying vec2 vUv;

  vec2 fitCover(vec2 coord, vec2 texDims) {
    vec2 ratio = uSize / texDims;
    float scale = max(ratio.x, ratio.y);
    vec2 scaled = texDims * scale;
    vec2 delta = (uSize - scaled) * 0.5;
    return (coord * uSize - delta) / scaled;
  }

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float interpolatedNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  vec4 transition(vec2 coord, float t) {
    float intensity = 0.08 * uRefract;
    float chromaOffset = 0.02 * uChroma;
    float waveAmount = 0.025;
    float centerClear = 0.3 * uClarity;
    float rippleSize = 0.004;
    float flowSpeed = 0.015 * uFlow;
    float edgeWidth = 0.05;
    float borderWidth = 0.025;

    float fadePhase = smoothstep(0.8, 1.0, t);
    float edgeIntensity = 0.08 * (1.0 - fadePhase) * uGlow;
    float borderAlpha = 0.06 * (1.0 - fadePhase) * uGlow;

    vec2 pixelPos = coord * uSize;
    vec2 baseCoord1 = fitCover(coord, uTex1Dims);
    vec2 baseCoord2 = fitCover(coord, uTex2Dims);

    vec2 centerPixel = uOrigin * uSize;

    vec2 cornerA = vec2(0.0, 0.0) - centerPixel;
    vec2 cornerB = vec2(uSize.x, 0.0) - centerPixel;
    vec2 cornerC = vec2(0.0, uSize.y) - centerPixel;
    vec2 cornerD = vec2(uSize.x, uSize.y) - centerPixel;

    float maxDist = max(
      max(length(cornerA), length(cornerB)),
      max(length(cornerC), length(cornerD))
    );

    float radius = t * maxDist;
    float dist = length(pixelPos - centerPixel);
    float norm = dist / max(radius, 0.001);
    vec2 dir = (dist > 0.0) ? (pixelPos - centerPixel) / dist : vec2(0.0);
    float mask = smoothstep(radius + 3.0, radius - 3.0, dist);

    float distFactor = smoothstep(centerClear, 1.0, norm);
    float elapsed = t * 5.0;

    vec2 surface = vec2(
      interpolatedNoise(coord * 100.0 + elapsed * 0.3),
      interpolatedNoise(coord * 100.0 + elapsed * 0.2 + 50.0)
    ) - 0.5;
    surface *= rippleSize * distFactor;

    vec2 distorted = baseCoord2;
    if (mask > 0.0) {
      float bend = intensity * pow(distFactor, 1.5);
      vec2 flowDir = normalize(dir + vec2(sin(elapsed), cos(elapsed * 0.7)) * 0.3);
      distorted -= flowDir * bend;

      float w1 = sin(norm * 22.0 - elapsed * 3.5);
      float w2 = sin(norm * 35.0 + elapsed * 2.8) * 0.7;
      float w3 = sin(norm * 50.0 - elapsed * 4.2) * 0.5;
      float combined = (w1 + w2 + w3) / 3.0;

      float shift = combined * waveAmount * distFactor;
      distorted -= dir * shift + surface;

      vec2 motion = vec2(
        sin(elapsed + norm * 10.0),
        cos(elapsed * 0.8 + norm * 8.0)
      ) * flowSpeed * distFactor * mask;
      distorted += motion;
    }

    vec4 result;
    if (mask > 0.0) {
      float aberration = chromaOffset * pow(distFactor, 1.2);

      vec2 rCoord = distorted + dir * aberration * 1.2;
      vec2 gCoord = distorted + dir * aberration * 0.2;
      vec2 bCoord = distorted - dir * aberration * 0.8;

      float r = texture2D(uTex2, rCoord).r;
      float g = texture2D(uTex2, gCoord).g;
      float b = texture2D(uTex2, bCoord).b;
      result = vec4(r, g, b, 1.0);
    } else {
      result = texture2D(uTex2, baseCoord2);
    }

    if (mask > 0.0 && edgeIntensity > 0.0) {
      float rim = smoothstep(1.0 - edgeWidth, 1.0, norm) *
                  (1.0 - smoothstep(1.0, 1.01, norm));
      result.rgb += rim * edgeIntensity;

      float edge = smoothstep(1.0 - borderWidth, 1.0, norm) *
                   (1.0 - smoothstep(1.0, 1.01, norm));
      result.rgb = mix(result.rgb, vec3(1.0), edge * borderAlpha);
    }

    vec4 prevImg = texture2D(uTex1, baseCoord1);

    if (t > 0.95) {
      vec4 cleanResult = texture2D(uTex2, baseCoord2);
      float endFade = (t - 0.95) / 0.05;
      result = mix(result, cleanResult, endFade);
    }

    return mix(prevImg, result, mask);
  }

  void main() {
    if (uMix <= 0.0) {
      vec2 uv = fitCover(vUv, uTex1Dims);
      gl_FragColor = texture2D(uTex1, uv);
      return;
    }
    gl_FragColor = transition(vUv, uMix);
  }
`,
      v = ({
        images: e,
        transitionDuration: t = 2.5,
        glassRefractionStrength: r = 1,
        glassChromaticAberration: a = 0,
        glassBubbleClarity: n = 1,
        glassEdgeGlow: o = 1,
        glassLiquidFlow: v = 1,
        startAtCursor: x = !1,
        autoCycle: h = !1,
        autoCycleDelay: p = 3e3,
        className: g = "",
      }) => {
        let b = (0, s.useRef)(null),
          w = (0, s.useRef)(null),
          C = (0, s.useRef)(null),
          y = (0, s.useRef)(null),
          D = (0, s.useRef)(null),
          S = (0, s.useRef)([]),
          [T, j] = (0, s.useState)(0),
          [P, k] = (0, s.useState)(!1),
          [F, R] = (0, s.useState)(!1);
        ((0, s.useEffect)(() => {
          (async () => {
            let t = new l.Tap(),
              r = [];
            for (let i of e)
              try {
                let e = await new Promise((e, r) => {
                  t.load(
                    i,
                    (t) => {
                      ((t.minFilter = t.magFilter = l.k6q),
                        (t.userData = {
                          dims: new l.I9Y(t.image.width, t.image.height),
                        }),
                        e(t));
                    },
                    void 0,
                    r,
                  );
                });
                r.push(e);
              } catch {
                console.warn(`Failed to load: ${i}`);
              }
            ((S.current = r), r.length >= 2 && R(!0));
          })();
        }, [e]),
          (0, s.useEffect)(() => {
            if (!b.current || S.current.length < 2) return;
            let e = b.current,
              t = e.parentElement;
            if (!t) return;
            let i = new l.Z58(),
              s = new l.qUd(-1, 1, 1, -1, 0, 1),
              c = new u.WebGLRenderer({ canvas: e, antialias: !1, alpha: !1 }),
              d = () => {
                if (!t || !c || !D.current) return;
                let e = t.getBoundingClientRect(),
                  r = e.width,
                  i = e.height;
                (c.setSize(r, i),
                  c.setPixelRatio(Math.min(window.devicePixelRatio, 2)),
                  D.current.uniforms.uSize.value.set(r, i));
              },
              x = new l.BKk({
                uniforms: {
                  uTex1: { value: S.current[0] },
                  uTex2: { value: S.current[1] },
                  uMix: { value: 0 },
                  uSize: { value: new l.I9Y(1, 1) },
                  uTex1Dims: { value: S.current[0].userData.dims },
                  uTex2Dims: { value: S.current[1].userData.dims },
                  uOrigin: { value: new l.I9Y(0.5, 0.5) },
                  uRefract: { value: r },
                  uChroma: { value: a },
                  uClarity: { value: n },
                  uGlow: { value: o },
                  uFlow: { value: v },
                },
                vertexShader: f,
                fragmentShader: m,
              }),
              h = new l.bdM(2, 2),
              p = new l.eaF(h, x);
            (i.add(p),
              (w.current = i),
              (C.current = s),
              (y.current = c),
              (D.current = x),
              d());
            let g = () => {
              (y.current &&
                w.current &&
                C.current &&
                y.current.render(w.current, C.current),
                requestAnimationFrame(g));
            };
            g();
            let T = new ResizeObserver(() => {
              d();
            });
            return (
              T.observe(t),
              () => {
                (T.disconnect(), c.dispose(), h.dispose(), x.dispose());
              }
            );
          }, [F]),
          (0, s.useEffect)(() => {
            D.current &&
              ((D.current.uniforms.uRefract.value = r),
              (D.current.uniforms.uChroma.value = a),
              (D.current.uniforms.uClarity.value = n),
              (D.current.uniforms.uGlow.value = o),
              (D.current.uniforms.uFlow.value = v));
          }, [r, a, n, o, v]));
        let M = (0, s.useCallback)(
          (e) => {
            if (P || !D.current || S.current.length < 2 || !b.current) return;
            if (x && e) {
              let t = b.current.getBoundingClientRect(),
                r = (e.clientX - t.left) / t.width,
                i = (e.clientY - t.top) / t.height,
                a = Math.max(0, Math.min(1, r)),
                n = Math.max(0, Math.min(1, 1 - i));
              D.current.uniforms.uOrigin.value.set(a, n);
            } else D.current.uniforms.uOrigin.value.set(0.5, 0.5);
            let r = (T + 1) % S.current.length,
              i = S.current[T],
              a = S.current[r];
            (k(!0),
              (D.current.uniforms.uTex1.value = i),
              (D.current.uniforms.uTex2.value = a),
              (D.current.uniforms.uTex1Dims.value = i.userData.dims),
              (D.current.uniforms.uTex2Dims.value = a.userData.dims),
              c.Ay.fromTo(
                D.current.uniforms.uMix,
                { value: 0 },
                {
                  value: 1,
                  duration: t,
                  ease: "power2.inOut",
                  onComplete: () => {
                    (D.current &&
                      ((D.current.uniforms.uMix.value = 0),
                      (D.current.uniforms.uTex1.value = a),
                      (D.current.uniforms.uTex1Dims.value = a.userData.dims)),
                      j(r),
                      k(!1));
                  },
                },
              ));
          },
          [T, P, t, x],
        );
        (0, s.useEffect)(() => {
          if (!h || !F || P) return;
          let e = setTimeout(() => {
            M();
          }, p);
          return () => clearTimeout(e);
        }, [h, p, F, P, M]);
        let A = (0, s.useCallback)(
          (e) => {
            ("Enter" === e.key || " " === e.key) && M();
          },
          [M],
        );
        return (0, i.jsxs)("div", {
          className: (0, d.cn)(
            "relative w-full h-full overflow-hidden cursor-pointer",
            g,
          ),
          onClick: M,
          role: "button",
          tabIndex: 0,
          onKeyDown: A,
          children: [
            (0, i.jsx)("canvas", {
              ref: b,
              className: "block w-full h-full",
              style: { opacity: +!!F, transition: "opacity 0.3s" },
            }),
            !F &&
              (0, i.jsx)("div", {
                className:
                  "absolute inset-0 flex items-center justify-center bg-black",
                children: (0, i.jsx)("div", {
                  className: "text-white text-sm",
                  children: "Loading...",
                }),
              }),
          ],
        });
      },
      x = () => {
        let [e, t] = (0, o.I)(),
          [r, l] = (0, s.useState)(2.5),
          [u, c] = (0, s.useState)(1),
          [d, f] = (0, s.useState)(1),
          [m, x] = (0, s.useState)(1),
          [h, p] = (0, s.useState)(1),
          [g, b] = (0, s.useState)(!1),
          [w, C] = (0, s.useState)(!0),
          [y, D] = (0, s.useState)(3e3);
        return (0, i.jsxs)("div", {
          children: [
            (0, i.jsx)(a.Bg, {}),
            (0, i.jsxs)(a.VX, {
              children: [
                (0, i.jsxs)(a.Ec, {
                  children: [
                    (0, i.jsx)(a.Ch, {
                      onRefresh: t,
                      minHeight: 600,
                      children: (0, i.jsx)("div", {
                        className: "w-full h-full rounded-lg overflow-hidden",
                        children: (0, i.jsx)(
                          v,
                          {
                            images: [
                              "https://images.unsplash.com/photo-1574232346003-12a36d7e402e?q=80&w=1674&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
                              "https://images.unsplash.com/photo-1462774603919-1d8087e62cad?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
                            ],
                            transitionDuration: r,
                            glassRefractionStrength: u,
                            glassBubbleClarity: d,
                            glassEdgeGlow: m,
                            className: "grayscale",
                            glassLiquidFlow: h,
                            startAtCursor: g,
                            autoCycle: w,
                            autoCycleDelay: y,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, i.jsxs)(a.IH, {
                      children: [
                        (0, i.jsx)(n.PreviewSlider, {
                          title: "Transition Duration",
                          min: 0.5,
                          max: 5,
                          step: 0.1,
                          value: r,
                          valueUnit: "s",
                          onChange: l,
                        }),
                        (0, i.jsx)(n.PreviewSwitch, {
                          title: "Start at Cursor",
                          checked: g,
                          onChange: b,
                        }),
                        (0, i.jsx)(n.PreviewSwitch, {
                          title: "Auto Cycle",
                          checked: w,
                          onChange: C,
                        }),
                        (0, i.jsx)(n.PreviewSlider, {
                          title: "Auto Cycle Delay",
                          min: 1e3,
                          max: 1e4,
                          step: 100,
                          value: y,
                          valueUnit: "ms",
                          onChange: D,
                        }),
                        (0, i.jsx)(n.PreviewSlider, {
                          title: "Refraction Strength",
                          min: 0,
                          max: 3,
                          step: 0.1,
                          value: u,
                          onChange: c,
                        }),
                        (0, i.jsx)(n.PreviewSlider, {
                          title: "Bubble Clarity",
                          min: 0.1,
                          max: 2,
                          step: 0.1,
                          value: d,
                          onChange: f,
                        }),
                        (0, i.jsx)(n.PreviewSlider, {
                          title: "Edge Glow",
                          min: 0,
                          max: 3,
                          step: 0.1,
                          value: m,
                          onChange: x,
                        }),
                        (0, i.jsx)(n.PreviewSlider, {
                          title: "Liquid Flow",
                          min: 0,
                          max: 3,
                          step: 0.1,
                          value: h,
                          onChange: p,
                        }),
                      ],
                    }),
                    (0, i.jsx)(a.Ub, {
                      data: [
                        {
                          name: "images",
                          type: "string[]",
                          default: "[]",
                          description:
                            "Array of image URLs to display. Minimum 2 images required.",
                        },
                        {
                          name: "transitionDuration",
                          type: "number",
                          default: "2.5",
                          description:
                            "Duration of the transition animation in seconds.",
                        },
                        {
                          name: "glassRefractionStrength",
                          type: "number",
                          default: "1.0",
                          description:
                            "Intensity of the glass refraction effect.",
                        },
                        {
                          name: "glassChromaticAberration",
                          type: "number",
                          default: "0",
                          description:
                            "Intensity of the chromatic aberration (color split) effect.",
                        },
                        {
                          name: "glassBubbleClarity",
                          type: "number",
                          default: "1.0",
                          description:
                            "Clarity of the center of the glass bubble.",
                        },
                        {
                          name: "glassEdgeGlow",
                          type: "number",
                          default: "1.0",
                          description:
                            "Intensity of the glow at the edges of the glass bubble.",
                        },
                        {
                          name: "glassLiquidFlow",
                          type: "number",
                          default: "1.0",
                          description:
                            "Speed and intensity of the liquid flow effect.",
                        },
                        {
                          name: "startAtCursor",
                          type: "boolean",
                          default: "false",
                          description:
                            "When true, the glass ball transition starts at the click position instead of the center.",
                        },
                        {
                          name: "autoCycle",
                          type: "boolean",
                          default: "false",
                          description: "Automatically cycle through images.",
                        },
                        {
                          name: "autoCycleDelay",
                          type: "number",
                          default: "3000",
                          description:
                            "Delay between auto-cycling images in milliseconds.",
                        },
                        {
                          name: "className",
                          type: "string",
                          default: '""',
                          description:
                            "Additional CSS classes to apply to the container.",
                        },
                      ],
                    }),
                  ],
                }),
                (0, i.jsx)(a.lT, { children: (0, i.jsx)(a.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
