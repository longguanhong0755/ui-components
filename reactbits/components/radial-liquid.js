/* ReactBits Pro public preview module 54866 for radial-liquid.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/54866.e955b032aa58583b.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  54866: (e, t, o) => {
    (o.r(t), o.d(t, { default: () => v }));
    var r = o(95155),
      a = o(12115),
      i = o(30701),
      n = o(56388),
      l = o(48543),
      s = o(90761),
      u = o(12246),
      f = o(2253),
      c = o(90650);
    let d = ({
        width: e = "100%",
        height: t = "100%",
        speed: o = 0.7,
        color1: i = "#ffffff",
        color2: n = "#000000",
        color3: l = "#000000",
        backgroundColor: s = "#ffffff",
        iterations: d = 4,
        position: v = "bottom",
        overallOpacity: m = 1,
        waveSize: g = 5,
        edgeSoftness: h = 0,
        scale: p = 1.1,
        quality: x = "high",
        distortionType: C = "plasma",
        distortionScale: w = 0.2,
        chromaShift: S = 0,
        enableCursorInteraction: y = !0,
        refractionStrength: b = 25,
        refractionEdgeWidth: P = 0.5,
        refractionWaveSpeed: R = 1.5,
        refractionWaveFrequency: I = 10,
        fresnelIntensity: O = 0.5,
        edgeHighlight: j = 0.5,
        className: E,
        children: W,
      }) => {
        let k = (0, a.useRef)(null),
          F = (0, a.useRef)(null),
          M = (0, a.useRef)({ x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 }),
          z = (0, a.useRef)({
            speed: o,
            color1: i,
            color2: n,
            color3: l,
            backgroundColor: s,
            iterations: d,
            position: v,
            overallOpacity: m,
            waveSize: g,
            edgeSoftness: h,
            scale: p,
            quality: x,
            distortionType: C,
            distortionScale: w,
            chromaShift: S,
            enableCursorInteraction: y,
            refractionStrength: b,
            refractionEdgeWidth: P,
            refractionWaveSpeed: R,
            refractionWaveFrequency: I,
            fresnelIntensity: O,
            edgeHighlight: j,
          });
        return (
          (0, a.useEffect)(() => {
            z.current = {
              speed: o,
              color1: i,
              color2: n,
              color3: l,
              backgroundColor: s,
              iterations: d,
              position: v,
              overallOpacity: m,
              waveSize: g,
              edgeSoftness: h,
              scale: p,
              quality: x,
              distortionType: C,
              distortionScale: w,
              chromaShift: S,
              enableCursorInteraction: y,
              refractionStrength: b,
              refractionEdgeWidth: P,
              refractionWaveSpeed: R,
              refractionWaveFrequency: I,
              fresnelIntensity: O,
              edgeHighlight: j,
            };
          }, [
            o,
            i,
            n,
            l,
            s,
            d,
            v,
            m,
            g,
            h,
            p,
            x,
            C,
            w,
            S,
            y,
            b,
            P,
            R,
            I,
            O,
            j,
          ]),
          (0, a.useEffect)(() => {
            let e;
            if (!k.current || !F.current) return;
            let t = k.current,
              o = F.current,
              r = (e) => {
                if (!z.current.enableCursorInteraction) return;
                let o = t.getBoundingClientRect();
                ((M.current.targetX = (e.clientX - o.left) / o.width),
                  (M.current.targetY = 1 - (e.clientY - o.top) / o.height));
              },
              a = () => {
                ((M.current.targetX = 0.5), (M.current.targetY = 0.5));
              };
            (t.addEventListener("mousemove", r),
              t.addEventListener("mouseleave", a));
            let c = new u.WebGLRenderer({
              canvas: o,
              antialias: !1,
              alpha: !0,
              powerPreference: "high-performance",
            });
            c.setClearColor(0, 0);
            let v = new f.Z58(),
              x = new f.qUd(-1, 1, 1, -1, 0, 1),
              E = {
                iTime: { value: 0 },
                iResolution: { value: new f.Pq0(1, 1, 1) },
                uColor1: { value: new f.Q1f(i) },
                uColor2: { value: new f.Q1f(n) },
                uColor3: { value: new f.Q1f(l) },
                uBackgroundColor: { value: new f.Q1f(s) },
                uIterations: { value: d },
                uOffset: { value: new f.I9Y(0, 0) },
                uOverallOpacity: { value: m },
                uWaveSize: { value: g },
                uEdgeSoftness: { value: h },
                uScale: { value: p },
                uDistortionType: { value: +("plasma" === C) },
                uDistortionScale: { value: w },
                uChromaShift: { value: S },
                uMouse: { value: new f.I9Y(0.5, 0.5) },
                uEnableCursor: { value: +!!y },
                uRefractionStrength: { value: b },
                uRefractionEdgeWidth: { value: P },
                uRefractionWaveSpeed: { value: R },
                uRefractionWaveFrequency: { value: I },
                uFresnelIntensity: { value: O },
                uEdgeHighlight: { value: j },
              },
              W = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `,
              D = `
      precision highp float;

      uniform float iTime;
      uniform vec3 iResolution;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform vec3 uColor3;
      uniform vec3 uBackgroundColor;
      uniform int uIterations;
      uniform vec2 uOffset;
      uniform float uOverallOpacity;
      uniform float uWaveSize;
      uniform float uEdgeSoftness;
      uniform float uScale;
      uniform int uDistortionType;
      uniform float uDistortionScale;
      uniform float uChromaShift;
      uniform vec2 uMouse;
      uniform float uEnableCursor;
      uniform float uRefractionStrength;
      uniform float uRefractionEdgeWidth;
      uniform float uRefractionWaveSpeed;
      uniform float uRefractionWaveFrequency;
      uniform float uFresnelIntensity;
      uniform float uEdgeHighlight;

      #define PI 3.14159265359

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(23.43, 54.12))) * 43758.5453);
      }

      vec3 hash3D(vec3 value) {
        vec3 scaled = value * 34.0 + 1.0;
        return mod(scaled * value, 289.0);
      }

      float simplexNoise(vec2 coord) {
        const vec4 skewConstants = vec4(
          0.211324865405187,
          0.366025403784439,
          -0.577350269189626,
          0.024390243902439
        );

        vec2 skewedCoord = coord + dot(coord, skewConstants.yy);
        vec2 cellOrigin = floor(skewedCoord);
        vec2 offset0 = coord - cellOrigin + dot(cellOrigin, skewConstants.xx);

        vec2 cornerOffset = (offset0.x > offset0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);

        vec4 offsets = offset0.xyxy + skewConstants.xxzz;
        offsets.xy -= cornerOffset;

        cellOrigin = mod(cellOrigin, 289.0);

        vec3 gradientIdx = hash3D(
          hash3D(cellOrigin.y + vec3(0.0, cornerOffset.y, 1.0)) +
          cellOrigin.x + vec3(0.0, cornerOffset.x, 1.0)
        );

        vec3 weights = max(
          0.5 - vec3(
            dot(offset0, offset0),
            dot(offsets.xy, offsets.xy),
            dot(offsets.zw, offsets.zw)
          ),
          0.0
        );
        weights = weights * weights;
        weights = weights * weights;

        vec3 gradX = 2.0 * fract(gradientIdx * skewConstants.www) - 1.0;
        vec3 gradY = abs(gradX) - 0.5;
        vec3 roundedX = floor(gradX + 0.5);
        vec3 finalGradX = gradX - roundedX;

        weights *= 1.79284291400159 - 0.85373472095314 * (finalGradX * finalGradX + gradY * gradY);

        vec3 gradients;
        gradients.x = finalGradX.x * offset0.x + gradY.x * offset0.y;
        gradients.yz = finalGradX.yz * offsets.xz + gradY.yz * offsets.yw;

        return 130.0 * dot(weights, gradients);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }

      float satinLiquid(vec2 coord, float direction, float ringIdx) {
        float n = 0.0;
        vec2 p = coord;
        float ringAngle = hash(vec2(ringIdx, 42.0)) * PI * 2.0;
        float t = iTime * 0.3 * direction;

        float cs = cos(ringAngle);
        float sn = sin(ringAngle);
        p = mat2(cs, -sn, sn, cs) * p;

        float n1 = noise(p * 1.5 + t * 0.2);
        p = p * 0.65 + vec2(n1 * 0.5);
        n += noise(p + t * 0.15) * 2.0;

        float n2 = noise(p * 1.2 + t * 0.15);
        p = p * 0.65 + vec2(n2 * 0.3, -n2 * 0.3);
        n += noise(p + t * 0.1) * 1.5;

        return n;
      }

      float plasma(vec2 coord, float direction, float ringIdx) {
        float ringAngle = hash(vec2(ringIdx, 123.0)) * PI * 2.0;
        float cs = cos(ringAngle);
        float sn = sin(ringAngle);
        coord = mat2(cs, -sn, sn, cs) * coord;

        float t = iTime * 0.3 * direction;
        vec2 scaledUV = coord * 0.5;

        float s1 = simplexNoise(scaledUV + t * 0.2);
        float s2 = simplexNoise(scaledUV * 1.5 + t * 0.15 + s1 * 0.15);

        float result = s1 + s2 * 0.7;
        return result * 1.4;
      }

      void mainImage(out vec4 fragColor, in vec2 fragCoord) {
        vec2 coord = 12.0 * (fragCoord.xy - iResolution.xy * 0.5) / min(iResolution.x, iResolution.y);
        coord = coord / uScale - uOffset * 6.0;

        float coordLen = length(coord);
        vec2 radialDir = coord / max(coordLen, 0.001);

        float adjustedFreq = 1.5 / max(0.1, uScale);
        float ringPhase = coordLen * adjustedFreq + PI;
        float circle = sin(ringPhase);

        float ringIdx = floor((ringPhase - PI) / PI);

        vec2 refractionOffset = vec2(0.0);
        float edgeGlow = 0.0;

        if (uRefractionStrength > 0.001) {
          float phaseInRing = mod(ringPhase, PI);

          float innerEdgeDist = phaseInRing / PI;
          float outerEdgeDist = 1.0 - innerEdgeDist;

          float edgeWidth = uRefractionEdgeWidth;

          if (innerEdgeDist < edgeWidth) {
            float t = 1.0 - innerEdgeDist / edgeWidth;
            float curve = t * t * t;
            float waveOffset = sin(coordLen * uRefractionWaveFrequency + iTime * uRefractionWaveSpeed) * 0.3;
            refractionOffset = -radialDir * curve * uRefractionStrength * 0.15 * (1.0 + waveOffset);
            edgeGlow = max(edgeGlow, curve);
          }

          if (outerEdgeDist < edgeWidth) {
            float t = 1.0 - outerEdgeDist / edgeWidth;
            float curve = t * t * t;
            float waveOffset = sin(coordLen * uRefractionWaveFrequency + iTime * uRefractionWaveSpeed + PI) * 0.3;
            refractionOffset = radialDir * curve * uRefractionStrength * 0.15 * (1.0 + waveOffset);
            edgeGlow = max(edgeGlow, curve);
          }
        }

        vec2 refractedCoord = coord + refractionOffset;
        float refractedLen = length(refractedCoord);

        float aaWidth = fwidth(ringPhase) * 0.5;
        float edgeRange = 0.1 + uEdgeSoftness * 0.3 + aaWidth;
        float edgeMin = 0.1 - aaWidth;
        float edgeMax = 0.1 + edgeRange;
        float circleMask = 1.0 - smoothstep(edgeMin, edgeMax, circle);
        float circleMask2 = smoothstep(edgeMin, edgeMax, circle);

        float maxPhase = (float(uIterations) + 1.0) * PI;
        float maxRadius = (maxPhase - PI) / adjustedFreq;
        float radiusAA = fwidth(coordLen) * 0.5;
        float distanceMask = 1.0 - smoothstep(maxRadius - 0.2 - radiusAA, maxRadius + radiusAA, coordLen);

        vec2 scaledCoord = refractedCoord * uDistortionScale;
        vec2 cursorOffset = vec2(0.0);
        if (uEnableCursor > 0.5) {
          cursorOffset = (uMouse - 0.5) * 2.0;
        }

        float dist1, dist2;

        if (uDistortionType == 0) {
          dist1 = satinLiquid(scaledCoord + cursorOffset, -1.0, ringIdx);
          dist2 = satinLiquid(scaledCoord + cursorOffset, 1.0, ringIdx);
        } else {
          dist1 = plasma(scaledCoord + cursorOffset, -1.0, ringIdx);
          dist2 = plasma(scaledCoord + cursorOffset, 1.0, ringIdx);
        }

        float fx = (dist1 * circleMask + dist2 * circleMask2) * uWaveSize;

        float fxX = dFdx(fx);
        float fxY = dFdy(fx);
        vec3 N = normalize(vec3(-fxX * 8.0, -fxY * 8.0, 0.3));
        vec3 L = normalize(vec3(0.4, 0.7, 1.0));
        vec3 V = normalize(vec3(0.6, 0.4, 1.0));
        vec3 H = normalize(L + V);

        float hn = max(dot(H, N), 0.0);
        float sheen = pow(hn, 12.0) * 0.6;
        float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.5) * 0.3;
        float lighting = sheen + fresnel;

        float colorMix1 = sin(fx * 0.5 + refractedLen * 0.3) * 0.5 + 0.5;
        float colorMix2 = cos(fx * 0.3 - refractedLen * 0.2 + iTime * 0.2) * 0.5 + 0.5;

        vec3 color = mix(uColor1, uColor2, colorMix1);
        color = mix(color, uColor3, colorMix2 * 0.6);

        color = mix(color, vec3(1.0), lighting * 0.4);

        if (uChromaShift > 0.01) {
          float chromaOffset = uChromaShift * 0.3;
          float mixR = sin((fx + chromaOffset) * 0.5 + refractedLen * 0.3) * 0.5 + 0.5;
          float mixB = cos((fx - chromaOffset) * 0.3 - refractedLen * 0.2) * 0.5 + 0.5;

          color.r = mix(color.r, mix(uColor1.r, uColor2.r, mixR), uChromaShift * 0.5);
          color.b = mix(color.b, mix(uColor2.b, uColor3.b, mixB), uChromaShift * 0.5);
        }

        if (uFresnelIntensity > 0.001) {
          float fresnelGlow = edgeGlow * uFresnelIntensity;
          vec3 glowColor = mix(uColor1, uColor2, 0.5);
          color += glowColor * fresnelGlow * 0.5;
        }

        if (uEdgeHighlight > 0.001) {
          color += vec3(1.0) * edgeGlow * uEdgeHighlight;
        }

        float alpha = uOverallOpacity * distanceMask;

        fragColor = vec4(color, alpha);
      }

      void main() {
        vec4 color = vec4(0.0);
        mainImage(color, gl_FragCoord.xy);
        gl_FragColor = color;
      }
    `,
              L = new f.BKk({
                uniforms: E,
                vertexShader: W,
                fragmentShader: D,
                transparent: !0,
                blending: f.NTi,
                depthWrite: !1,
              }),
              T = new f.bdM(2, 2),
              q = new f.eaF(T, L);
            v.add(q);
            let N = () => {
                if (!t || !o) return;
                let { width: e, height: r } = t.getBoundingClientRect(),
                  { quality: a, position: i } = z.current,
                  n = 1;
                "low" === a ? (n = 0.5) : "medium" === a && (n = 0.75);
                let l = Math.min(window.devicePixelRatio * n, 2);
                (c.setSize(e, r, !1),
                  c.setPixelRatio(l),
                  E.iResolution.value.set(e * l, r * l, 1));
                let s = 0,
                  u = 0;
                ("top" === i
                  ? (u = Math.max(1, r / e))
                  : "bottom" === i
                    ? (u = -Math.max(1, r / e))
                    : "left" === i
                      ? (s = -Math.max(1, e / r))
                      : "right" === i && (s = Math.max(1, e / r)),
                  E.uOffset.value.set(s, u));
              },
              X = new ResizeObserver(N);
            (X.observe(t), N());
            let G = performance.now(),
              A = G,
              B = (t) => {
                if (t - A < 16) {
                  e = requestAnimationFrame(B);
                  return;
                }
                A = t;
                let {
                  speed: o,
                  color1: r,
                  color2: a,
                  color3: i,
                  backgroundColor: n,
                  iterations: l,
                  overallOpacity: s,
                  waveSize: u,
                  edgeSoftness: f,
                  scale: d,
                  distortionType: m,
                  distortionScale: g,
                  chromaShift: h,
                  enableCursorInteraction: p,
                  refractionStrength: C,
                  refractionEdgeWidth: w,
                  refractionWaveSpeed: S,
                  refractionWaveFrequency: y,
                  fresnelIntensity: b,
                  edgeHighlight: P,
                } = z.current;
                ((M.current.x += (M.current.targetX - M.current.x) * 0.05),
                  (M.current.y += (M.current.targetY - M.current.y) * 0.05),
                  (E.iTime.value = (t - G) * 0.001 * o),
                  E.uColor1.value.set(r),
                  E.uColor2.value.set(a),
                  E.uColor3.value.set(i),
                  E.uBackgroundColor.value.set(n),
                  (E.uIterations.value = l),
                  (E.uOverallOpacity.value = s),
                  (E.uWaveSize.value = u),
                  (E.uEdgeSoftness.value = f),
                  (E.uScale.value = d),
                  (E.uDistortionType.value = +("lava" !== m)),
                  (E.uDistortionScale.value = g),
                  (E.uChromaShift.value = h),
                  E.uMouse.value.set(M.current.x, M.current.y),
                  (E.uEnableCursor.value = +!!p),
                  (E.uRefractionStrength.value = C),
                  (E.uRefractionEdgeWidth.value = w),
                  (E.uRefractionWaveSpeed.value = S),
                  (E.uRefractionWaveFrequency.value = y),
                  (E.uFresnelIntensity.value = b),
                  (E.uEdgeHighlight.value = P),
                  c.render(v, x),
                  (e = requestAnimationFrame(B)));
              };
            return (
              (e = requestAnimationFrame(B)),
              () => {
                (cancelAnimationFrame(e),
                  X.disconnect(),
                  t.removeEventListener("mousemove", r),
                  t.removeEventListener("mouseleave", a),
                  v.remove(q),
                  T.dispose(),
                  L.dispose(),
                  c.dispose());
              }
            );
          }, [x]),
          (0, r.jsxs)("div", {
            ref: k,
            className: (0, c.cn)("relative overflow-hidden", E),
            style: {
              width: "number" == typeof e ? `${e}px` : e,
              height: "number" == typeof t ? `${t}px` : t,
              backgroundColor: s,
            },
            children: [
              (0, r.jsx)("canvas", {
                ref: F,
                className: "absolute inset-0 block w-full h-full",
              }),
              W &&
                (0, r.jsx)("div", {
                  className: "relative z-10 w-full h-full pointer-events-none",
                  children: W,
                }),
            ],
          })
        );
      },
      v = () => {
        let { resolvedTheme: e } = (0, i.D)(),
          [t, o] = (0, s.I)(),
          [u, f] = (0, a.useState)(0.7),
          [c, v] = (0, a.useState)("#ffffff"),
          [m, g] = (0, a.useState)("#000000"),
          [h, p] = (0, a.useState)("#000000"),
          [x, C] = (0, a.useState)(null),
          [w, S] = (0, a.useState)(4),
          [y, b] = (0, a.useState)("bottom"),
          [P, R] = (0, a.useState)(1),
          [I, O] = (0, a.useState)(5),
          [j, E] = (0, a.useState)(0),
          [W, k] = (0, a.useState)(1.1),
          [F, M] = (0, a.useState)("plasma"),
          [z, D] = (0, a.useState)(0.2),
          [L, T] = (0, a.useState)(0),
          [q, N] = (0, a.useState)(!1),
          [X, G] = (0, a.useState)(25),
          [A, B] = (0, a.useState)(0.5),
          [H, Y] = (0, a.useState)(1.5),
          [U, V] = (0, a.useState)(10),
          [_, Q] = (0, a.useState)(0.5),
          [$, K] = (0, a.useState)(0.5),
          Z = (0, a.useMemo)(
            () => (null !== x ? x : "light" === e ? "#ffffff" : "#0a0a0a"),
            [e, x],
          );
        return (0, r.jsxs)("div", {
          children: [
            (0, r.jsx)(n.Bg, {}),
            (0, r.jsxs)(n.VX, {
              children: [
                (0, r.jsxs)(n.Ec, {
                  children: [
                    (0, r.jsx)(n.Ch, {
                      onRefresh: o,
                      minHeight: 600,
                      children: (0, r.jsx)("div", {
                        className: "w-full h-full",
                        children: (0, r.jsx)(
                          d,
                          {
                            width: "100%",
                            height: "100%",
                            speed: u,
                            color1: c,
                            color2: m,
                            color3: h,
                            backgroundColor: Z,
                            iterations: w,
                            position: y,
                            overallOpacity: P,
                            waveSize: I,
                            edgeSoftness: j,
                            scale: W,
                            quality: "medium",
                            distortionType: F,
                            distortionScale: z,
                            chromaShift: L,
                            enableCursorInteraction: q,
                            refractionStrength: X,
                            refractionEdgeWidth: A,
                            refractionWaveSpeed: H,
                            refractionWaveFrequency: U,
                            fresnelIntensity: _,
                            edgeHighlight: $,
                          },
                          t,
                        ),
                      }),
                    }),
                    (0, r.jsxs)(n.IH, {
                      children: [
                        (0, r.jsx)(l.PreviewColor, {
                          title: "Color 1",
                          value: c,
                          onChange: v,
                        }),
                        (0, r.jsx)(l.PreviewColor, {
                          title: "Color 2",
                          value: m,
                          onChange: g,
                        }),
                        (0, r.jsx)(l.PreviewColor, {
                          title: "Color 3",
                          value: h,
                          onChange: p,
                        }),
                        (0, r.jsx)(l.PreviewColor, {
                          title: "BG",
                          value: Z,
                          onChange: C,
                        }),
                        (0, r.jsx)(l.PreviewSwitch, {
                          title: "Cursor Interaction",
                          checked: q,
                          onChange: N,
                        }),
                        (0, r.jsx)(l.PreviewSlider, {
                          title: "Speed",
                          value: u,
                          onChange: f,
                          min: 0,
                          max: 3,
                          step: 0.1,
                          valueUnit: "x",
                        }),
                        (0, r.jsx)(l.PreviewSlider, {
                          title: "Iterations",
                          value: w,
                          onChange: S,
                          min: 1,
                          max: 5,
                          step: 1,
                        }),
                        (0, r.jsx)(l.PreviewSlider, {
                          title: "Overall Opacity",
                          value: P,
                          onChange: R,
                          min: 0,
                          max: 1,
                          step: 0.1,
                        }),
                        (0, r.jsx)(l.PreviewSelect, {
                          title: "Position",
                          value: y,
                          onChange: (e) => b(e),
                          options: [
                            { label: "Bottom", value: "bottom" },
                            { label: "Center", value: "center" },
                            { label: "Top", value: "top" },
                            { label: "Left", value: "left" },
                            { label: "Right", value: "right" },
                          ],
                        }),
                        (0, r.jsx)(l.PreviewSelect, {
                          title: "Distortion Type",
                          value: F,
                          onChange: (e) => M(e),
                          options: [
                            { label: "Plasma", value: "plasma" },
                            { label: "Lava", value: "lava" },
                          ],
                        }),
                        (0, r.jsx)(l.PreviewSlider, {
                          title: "Wave Size",
                          value: I,
                          onChange: O,
                          min: 0.1,
                          max: 5,
                          step: 0.1,
                        }),
                        (0, r.jsx)(l.PreviewSlider, {
                          title: "Edge Softness",
                          value: j,
                          onChange: E,
                          min: 0,
                          max: 1,
                          step: 0.1,
                        }),
                        (0, r.jsx)(l.PreviewSlider, {
                          title: "Scale",
                          value: W,
                          onChange: k,
                          min: 0.1,
                          max: 5,
                          step: 0.1,
                        }),
                        (0, r.jsx)(l.PreviewSlider, {
                          title: "Distortion Scale",
                          value: z,
                          onChange: D,
                          min: 0.1,
                          max: 10,
                          step: 0.1,
                        }),
                        (0, r.jsx)(l.PreviewSlider, {
                          title: "Chroma Shift",
                          value: L,
                          onChange: T,
                          min: 0,
                          max: 5,
                          step: 0.05,
                        }),
                        (0, r.jsx)(l.PreviewSlider, {
                          title: "Strength",
                          value: X,
                          onChange: G,
                          min: 0,
                          max: 25,
                          step: 0.1,
                        }),
                        (0, r.jsx)(l.PreviewSlider, {
                          title: "Edge Width",
                          value: A,
                          onChange: B,
                          min: 0.01,
                          max: 0.5,
                          step: 0.01,
                        }),
                        (0, r.jsx)(l.PreviewSlider, {
                          title: "Wave Speed",
                          value: H,
                          onChange: Y,
                          min: 0,
                          max: 5,
                          step: 0.1,
                        }),
                        (0, r.jsx)(l.PreviewSlider, {
                          title: "Wave Frequency",
                          value: U,
                          onChange: V,
                          min: 1,
                          max: 30,
                          step: 1,
                        }),
                        (0, r.jsx)(l.PreviewSlider, {
                          title: "Fresnel Intensity",
                          value: _,
                          onChange: Q,
                          min: 0,
                          max: 1,
                          step: 0.05,
                        }),
                        (0, r.jsx)(l.PreviewSlider, {
                          title: "Edge Highlight",
                          value: $,
                          onChange: K,
                          min: 0,
                          max: 1,
                          step: 0.05,
                        }),
                      ],
                    }),
                    (0, r.jsx)(n.Ub, {
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
                          default: "0.7",
                          description: "Animation speed multiplier",
                        },
                        {
                          name: "color1",
                          type: "string",
                          default: '"#ffffff"',
                          description: "First color in hex format",
                        },
                        {
                          name: "color2",
                          type: "string",
                          default: '"#000000"',
                          description: "Second color in hex format",
                        },
                        {
                          name: "color3",
                          type: "string",
                          default: '"#000000"',
                          description: "Third color in hex format",
                        },
                        {
                          name: "backgroundColor",
                          type: "string",
                          default: '"#ffffff"',
                          description: "Background color in hex format",
                        },
                        {
                          name: "iterations",
                          type: "number",
                          default: "4",
                          description:
                            "Number of circle layers to render (1-5)",
                        },
                        {
                          name: "position",
                          type: '"center" | "top" | "bottom" | "left" | "right"',
                          default: '"bottom"',
                          description: "Position of the effect",
                        },
                        {
                          name: "overallOpacity",
                          type: "number",
                          default: "1.0",
                          description: "Master opacity control (0-1)",
                        },
                        {
                          name: "waveSize",
                          type: "number",
                          default: "5.0",
                          description: "Size of the wave distortion (0.1-5)",
                        },
                        {
                          name: "edgeSoftness",
                          type: "number",
                          default: "0.0",
                          description: "Blur/soften ring edges (0-1)",
                        },
                        {
                          name: "scale",
                          type: "number",
                          default: "1.1",
                          description: "Overall scale/zoom (0.1-5)",
                        },
                        {
                          name: "quality",
                          type: '"low" | "medium" | "high"',
                          default: '"high"',
                          description: "Rendering quality",
                        },
                        {
                          name: "distortionType",
                          type: '"lava" | "plasma"',
                          default: '"plasma"',
                          description: "Type of distortion",
                        },
                        {
                          name: "distortionScale",
                          type: "number",
                          default: "0.2",
                          description: "Scale of distortion pattern (0.1-10)",
                        },
                        {
                          name: "chromaShift",
                          type: "number",
                          default: "0.0",
                          description: "RGB color separation effect (0-1)",
                        },
                        {
                          name: "enableCursorInteraction",
                          type: "boolean",
                          default: "true",
                          description:
                            "Enable cursor interaction for liquid movement",
                        },
                        {
                          name: "refractionStrength",
                          type: "number",
                          default: "25.0",
                          description:
                            "Refraction strength at ring edges (0-25)",
                        },
                        {
                          name: "refractionEdgeWidth",
                          type: "number",
                          default: "0.5",
                          description:
                            "Width of the refraction zone at ring edges (0.01-0.5)",
                        },
                        {
                          name: "refractionWaveSpeed",
                          type: "number",
                          default: "1.5",
                          description:
                            "Speed of wavy refraction animation (0-5)",
                        },
                        {
                          name: "refractionWaveFrequency",
                          type: "number",
                          default: "10.0",
                          description: "Frequency of refraction waves (1-30)",
                        },
                        {
                          name: "fresnelIntensity",
                          type: "number",
                          default: "0.5",
                          description:
                            "Fresnel intensity - edge glow effect (0-1)",
                        },
                        {
                          name: "edgeHighlight",
                          type: "number",
                          default: "0.5",
                          description: "Edge highlight brightness (0-1)",
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
                          description: "Content to render on top of the effect",
                        },
                      ],
                    }),
                  ],
                }),
                (0, r.jsx)(n.lT, { children: (0, r.jsx)(n.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
