/* ReactBits Pro public preview module 72465 for glass-reveal.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/72465.a3184d8256b21a14.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  72465: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => S }));
    var n = a(95155),
      i = a(12115),
      r = a(56388),
      u = a(90761),
      l = a(81712),
      o = a(3907),
      s = a(50969),
      d = a(2253),
      c = a(90650);
    let v = { square: 0, circle: 1, blob: 2, portal: 3 },
      f = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
}
`,
      m = `
precision highp float;

varying vec2 vUv;

uniform sampler2D uInside;
uniform sampler2D uOutside;
uniform vec2 uInsideSize;
uniform vec2 uOutsideSize;
uniform float uInsideReady;
uniform float uOutsideReady;
uniform vec3 uFallback;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform int uShape;
uniform float uSize;
uniform float uSoftness;
uniform float uDistortion;
uniform float uAberration;
uniform float uWobble;
uniform float uWobbleTime;
uniform float uWaveFrequency;
uniform float uWaveStrength;
uniform float uWaveTime;
uniform float uGrain;
uniform float uGrainTime;
uniform float uGray;
uniform float uDim;


vec2 coverUv(vec2 uv, vec2 box, vec2 tex) {
  float boxRatio = box.x / box.y;
  float texRatio = tex.x / tex.y;
  vec2 scale = boxRatio > texRatio
    ? vec2(1.0, texRatio / boxRatio)
    : vec2(boxRatio / texRatio, 1.0);
  return (uv - 0.5) * scale + 0.5;
}


float grain(vec2 uv, float t) {
  vec3 p = fract(vec3(uv * 613.7, t) * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.x + p.y) * p.z);
}


float blobRadius(float a, float t) {
  float bulge = 0.5 * sin(3.0 * a + t)
    + 0.3 * sin(5.0 * a - 1.7 * t + 1.3)
    + 0.2 * sin(7.0 * a + 0.6 * t + 2.1);
  return 1.0 + bulge * uWobble * 0.35;
}


float outline(vec2 q) {
  if (uShape == 0) return max(abs(q.x), abs(q.y)) - 1.0;
  if (uShape == 1) return length(q) - 1.0;
  return length(q) - blobRadius(atan(q.y, q.x), uWobbleTime);
}

vec3 sampleOutside(vec2 uv) {
  if (uOutsideReady < 0.5) return uFallback;
  vec3 c = texture2D(uOutside, uv).rgb;
  float luma = dot(c, vec3(0.299, 0.587, 0.114));
  return mix(c, vec3(luma), uGray) * (1.0 - uDim);
}

void main() {
  vec2 aspect = vec2(
    min(uResolution.y / uResolution.x, 1.0),
    min(uResolution.x / uResolution.y, 1.0)
  );


  vec2 p = ((vUv * 2.0 - 1.0) - uPointer) / aspect;
  vec2 q = p / max(uSize, 0.001);
  float d = outline(q);

  float aa = fwidth(d) * 1.5;

  float soft = uShape == 3 ? uSoftness + 0.8 : max(uSoftness, aa);
  float mask = 1.0 - smoothstep(-soft * 0.5, soft * 0.5, d);
  if (uShape == 3) mask = mask * mask * (3.0 - 2.0 * mask);


  vec2 outUv = coverUv(vUv, uResolution, uOutsideSize);
  outUv.y += sin(outUv.y * uWaveFrequency + uWaveTime) * uWaveStrength;
  outUv += (grain(vUv, uGrainTime) - 0.5) * uGrain;
  vec3 outside = sampleOutside(outUv);


  float r2 = dot(q, q) * 0.25;
  float scale = uDistortion >= 0.0
    ? 1.0 + uDistortion * r2
    : 1.0 / (1.0 - uDistortion * r2);
  float reach = uShape == 3 ? mask : 1.0;
  vec2 lensOffset = q * (scale - 1.0) * uSize * aspect * 0.5 * reach;
  vec2 inUv = coverUv(vUv - lensOffset, uResolution, uInsideSize);
  vec2 fringe = q * uAberration * 0.5 * reach;

  vec3 inside = uFallback;
  if (uInsideReady > 0.5) {
    inside = vec3(
      texture2D(uInside, inUv + fringe).r,
      texture2D(uInside, inUv).g,
      texture2D(uInside, inUv - fringe).b
    );
  }

  gl_FragColor = vec4(mix(outside, inside, mask), 1.0);
}
`,
      p = (e, t, a) => Math.min(a, Math.max(t, e)),
      h = (e) => {
        let t = window.matchMedia("(min-resolution: 2dppx)");
        return (
          t.addEventListener("change", e),
          window.addEventListener("resize", e),
          () => {
            (t.removeEventListener("change", e),
              window.removeEventListener("resize", e));
          }
        );
      },
      b = () => window.devicePixelRatio || 1,
      g = (e, t, a) => {
        let n = new Image();
        ((n.crossOrigin = "anonymous"), (n.decoding = "async"));
        let i = !1;
        return (
          (n.onload = () => {
            if (i) return;
            let e = new d.gPd(n);
            ((e.colorSpace = d.jf0),
              (e.wrapS = d.ghU),
              (e.wrapT = d.ghU),
              (e.minFilter = d.$_I),
              (e.magFilter = d.k6q),
              (e.anisotropy = t),
              (e.needsUpdate = !0),
              a({
                texture: e,
                width: n.naturalWidth,
                height: n.naturalHeight,
              }));
          }),
          (n.onerror = () => {
            i || a(null);
          }),
          (n.src = e),
          () => {
            i = !0;
          }
        );
      },
      x = ({
        image: e,
        backgroundImage: t,
        shape: a,
        size: r,
        softness: u,
        distortion: o,
        aberration: s,
        wobble: c,
        wobbleSpeed: h,
        waveFrequency: b,
        waveStrength: x,
        waveSpeed: y,
        grain: w,
        grainSpeed: S,
        grayscale: C,
        dim: j,
        follow: R,
        returnToCenter: I,
        fallbackColor: k,
        paused: U,
        pointer: q,
      }) => {
        let W = (0, i.useRef)(null),
          D = (0, i.useRef)(new d.I9Y(0, 0)),
          P = (0, i.useRef)({ wobble: 0, wave: 0, grain: 0 }),
          { gl: z, size: T, invalidate: O } = (0, l.C)(),
          F = (0, i.useMemo)(
            () => ({
              uInside: { value: null },
              uOutside: { value: null },
              uInsideSize: { value: new d.I9Y(1, 1) },
              uOutsideSize: { value: new d.I9Y(1, 1) },
              uInsideReady: { value: 0 },
              uOutsideReady: { value: 0 },
              uFallback: {
                value: ((e, t) => {
                  let a = new d.Q1f();
                  try {
                    a.setStyle(e, d.Zr2);
                  } catch {
                    a.setStyle(t, d.Zr2);
                  }
                  return a;
                })("#171717", "#171717"),
              },
              uResolution: { value: new d.I9Y(1, 1) },
              uPointer: { value: new d.I9Y(0, 0) },
              uShape: { value: 0 },
              uSize: { value: 0.4 },
              uSoftness: { value: 0 },
              uDistortion: { value: 1.5 },
              uAberration: { value: 0.02 },
              uWobble: { value: 0.5 },
              uWobbleTime: { value: 0 },
              uWaveFrequency: { value: 10 },
              uWaveStrength: { value: 0.01 },
              uWaveTime: { value: 0 },
              uGrain: { value: 0.02 },
              uGrainTime: { value: 0 },
              uGray: { value: 1 },
              uDim: { value: 0 },
            }),
            [],
          );
        return (
          (0, i.useEffect)(() => {
            let t = W.current;
            if (!t) return;
            let a = z.capabilities.getMaxAnisotropy(),
              n = null,
              i = g(e, a, (e) => {
                let a = t.uniforms;
                if (!e) {
                  ((a.uInsideReady.value = 0), O());
                  return;
                }
                ((n = e.texture),
                  (a.uInside.value = e.texture),
                  a.uInsideSize.value.set(e.width, e.height),
                  (a.uInsideReady.value = 1),
                  O());
              });
            return () => {
              (i(), n?.dispose());
            };
          }, [e, z, O]),
          (0, i.useEffect)(() => {
            let e = W.current;
            if (!e) return;
            let a = z.capabilities.getMaxAnisotropy(),
              n = null,
              i = g(t, a, (t) => {
                let a = e.uniforms;
                if (!t) {
                  ((a.uOutsideReady.value = 0), O());
                  return;
                }
                ((n = t.texture),
                  (a.uOutside.value = t.texture),
                  a.uOutsideSize.value.set(t.width, t.height),
                  (a.uOutsideReady.value = 1),
                  O());
              });
            return () => {
              (i(), n?.dispose());
            };
          }, [t, z, O]),
          (0, i.useEffect)(() => {
            let e = W.current;
            if (e) {
              var t = e.uniforms.uFallback.value;
              try {
                t.setStyle(k, d.Zr2);
              } catch {}
              O();
            }
          }, [k, O]),
          (0, i.useEffect)(() => {
            O();
          }, [a, r, u, o, s, c, b, x, w, C, j, O]),
          (0, l.D)((e, t) => {
            let n = W.current;
            if (!n) return;
            let i = Math.min(t, 0.05);
            if (!U) {
              let e = P.current;
              ((e.wobble += i * h), (e.wave += i * y), (e.grain += i * S));
            }
            let l = q.current,
              d = l.inside || !I ? l.x : 0,
              f = l.inside || !I ? l.y : 0,
              m = 1 - Math.exp(-i * (2 + (1 - p(R, 0, 1)) * 40));
            ((D.current.x += (d - D.current.x) * m),
              (D.current.y += (f - D.current.y) * m));
            let g = z.getPixelRatio(),
              k = n.uniforms;
            (k.uResolution.value.set(T.width * g, T.height * g),
              k.uPointer.value.copy(D.current),
              (k.uShape.value = v[a] ?? 0),
              (k.uSize.value = p(r, 0.02, 2)),
              (k.uSoftness.value = Math.max(u, 0)),
              (k.uDistortion.value = o),
              (k.uAberration.value = s),
              (k.uWobble.value = p(c, 0, 1)),
              (k.uWobbleTime.value = P.current.wobble),
              (k.uWaveFrequency.value = b),
              (k.uWaveStrength.value = x),
              (k.uWaveTime.value = P.current.wave),
              (k.uGrain.value = w),
              (k.uGrainTime.value = P.current.grain),
              (k.uGray.value = p(C, 0, 1)),
              (k.uDim.value = p(j, 0, 1)));
          }),
          (0, n.jsxs)("mesh", {
            frustumCulled: !1,
            children: [
              (0, n.jsx)("planeGeometry", { args: [1, 1] }),
              (0, n.jsx)("shaderMaterial", {
                ref: W,
                vertexShader: f,
                fragmentShader: m,
                uniforms: F,
                depthTest: !1,
                depthWrite: !1,
              }),
            ],
          })
        );
      },
      y = ({
        image:
          e = "https://images.unsplash.com/photo-1552160793-cbaf3ebcba72?q=80&w=1470&auto=format&fit=crop",
        backgroundImage: t,
        shape: a = "circle",
        size: r = 0.6,
        softness: u = 0,
        distortion: l = 1,
        aberration: d = 0.01,
        wobble: v = 0.5,
        wobbleSpeed: f = 2,
        waveFrequency: m = 6,
        waveStrength: g = 0.01,
        waveSpeed: y = 1,
        grain: w = 0.02,
        grainSpeed: S = 10,
        grayscale: C = 1,
        dim: j = 0,
        follow: R = 0.85,
        returnToCenter: I = !0,
        fallbackColor: k = "#171717",
        paused: U = !1,
        dpr: q = 1.5,
        className: W,
        children: D,
      }) => {
        let P = (0, i.useRef)(null),
          z = (0, i.useRef)({ x: 0, y: 0, inside: !1 }),
          [T, O] = (0, i.useState)(!0),
          F = (0, s.I)(),
          E = Math.min(
            (0, i.useSyncExternalStore)(h, b, () => 1),
            Math.max(q, 0.5),
          );
        (0, i.useEffect)(() => {
          let e = P.current;
          if (!e || "undefined" == typeof IntersectionObserver) return;
          let t = new IntersectionObserver(([e]) => O(e.isIntersecting), {
            threshold: 0,
          });
          return (t.observe(e), () => t.disconnect());
        }, []);
        let G = (e) => {
            let t = e.currentTarget.getBoundingClientRect();
            ((z.current.x = p(((e.clientX - t.left) / t.width) * 2 - 1, -1, 1)),
              (z.current.y = p(
                1 - ((e.clientY - t.top) / t.height) * 2,
                -1,
                1,
              )),
              (z.current.inside = !0));
          },
          N = U || !!F;
        return (0, n.jsxs)("div", {
          ref: P,
          className: (0, c.cn)("relative touch-none overflow-hidden", W),
          onPointerMove: G,
          onPointerDown: G,
          onPointerLeave: () => {
            z.current.inside = !1;
          },
          children: [
            (0, n.jsx)("div", {
              className: "absolute inset-0",
              children: (0, n.jsx)(o.Hl, {
                orthographic: !0,
                dpr: E,
                frameloop: T ? "always" : "demand",
                gl: {
                  antialias: !1,
                  alpha: !1,
                  powerPreference: "high-performance",
                },
                children: (0, n.jsx)(x, {
                  image: e,
                  backgroundImage: t ?? e,
                  shape: a,
                  size: r,
                  softness: u,
                  distortion: l,
                  aberration: d,
                  wobble: v,
                  wobbleSpeed: N ? 0 : f,
                  waveFrequency: m,
                  waveStrength: N ? 0 : g,
                  waveSpeed: y,
                  grain: N ? 0 : w,
                  grainSpeed: S,
                  grayscale: C,
                  dim: j,
                  follow: F ? 0 : R,
                  returnToCenter: I,
                  fallbackColor: k,
                  paused: N,
                  pointer: z,
                }),
              }),
            }),
            D
              ? (0, n.jsx)("div", {
                  className: "pointer-events-none relative z-10 h-full w-full",
                  children: D,
                })
              : null,
          ],
        });
      },
      w =
        "https://images.unsplash.com/photo-1552160793-cbaf3ebcba72?q=80&w=1470&auto=format&fit=crop",
      S = () => {
        let [e, t] = (0, u.I)(),
          [a, l] = (0, i.useState)(w),
          [o, s] = (0, i.useState)("circle"),
          [d, c] = (0, i.useState)(0.6),
          [v, f] = (0, i.useState)(0),
          [m, p] = (0, i.useState)(1),
          [h, b] = (0, i.useState)(0.01),
          [g, x] = (0, i.useState)(0.5),
          [S, C] = (0, i.useState)(2),
          [j, R] = (0, i.useState)(6),
          [I, k] = (0, i.useState)(0.01),
          [U, q] = (0, i.useState)(1),
          [W, D] = (0, i.useState)(0.02),
          [P, z] = (0, i.useState)(10),
          [T, O] = (0, i.useState)(1),
          [F, E] = (0, i.useState)(0),
          [G, N] = (0, i.useState)(0.85),
          [M, H] = (0, i.useState)(!0),
          [L, A] = (0, i.useState)("#171717"),
          [_, Y] = (0, i.useState)(!1);
        return (0, n.jsxs)("div", {
          children: [
            (0, n.jsx)(r.Bg, {}),
            (0, n.jsxs)(r.VX, {
              children: [
                (0, n.jsxs)(r.Ec, {
                  children: [
                    (0, n.jsx)(r.Ch, {
                      onRefresh: t,
                      minHeight: 560,
                      children: (0, n.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, n.jsx)(
                          y,
                          {
                            className: "h-full w-full",
                            image: a.trim() || w,
                            shape: o,
                            size: d,
                            softness: v,
                            distortion: m,
                            aberration: h,
                            wobble: g,
                            wobbleSpeed: S,
                            waveFrequency: j,
                            waveStrength: I,
                            waveSpeed: U,
                            grain: W,
                            grainSpeed: P,
                            grayscale: T,
                            dim: F,
                            follow: G,
                            returnToCenter: M,
                            fallbackColor: L,
                            paused: _,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, n.jsxs)(r.IH, {
                      children: [
                        (0, n.jsx)(r.UD, {
                          title: "Image URL",
                          value: a,
                          placeholder: "https://",
                          onChange: l,
                        }),
                        (0, n.jsx)(r.bg, {
                          title: "Shape",
                          value: o,
                          onChange: (e) => s(e),
                          options: [
                            { label: "Square", value: "square" },
                            { label: "Circle", value: "circle" },
                            { label: "Blob", value: "blob" },
                            { label: "Portal", value: "portal" },
                          ],
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Size",
                          min: 0.05,
                          max: 1,
                          step: 0.01,
                          value: d,
                          onChange: c,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Softness",
                          min: 0,
                          max: 0.6,
                          step: 0.01,
                          value: v,
                          onChange: f,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Distortion",
                          min: -3,
                          max: 4,
                          step: 0.05,
                          value: m,
                          onChange: p,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Aberration",
                          min: 0,
                          max: 0.1,
                          step: 0.002,
                          value: h,
                          onChange: b,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Wobble",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: g,
                          onChange: x,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Wobble Speed",
                          min: 0,
                          max: 4,
                          step: 0.1,
                          value: S,
                          onChange: C,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Wave Frequency",
                          min: 0,
                          max: 40,
                          step: 1,
                          value: j,
                          onChange: R,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Wave Strength",
                          min: 0,
                          max: 0.05,
                          step: 0.001,
                          value: I,
                          onChange: k,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Wave Speed",
                          min: 0,
                          max: 4,
                          step: 0.1,
                          value: U,
                          onChange: q,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Grain",
                          min: 0,
                          max: 0.08,
                          step: 0.001,
                          value: W,
                          onChange: D,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Grain Speed",
                          min: 0,
                          max: 30,
                          step: 1,
                          value: P,
                          onChange: z,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Grayscale",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: T,
                          onChange: O,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Dim",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: F,
                          onChange: E,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Follow",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: G,
                          onChange: N,
                        }),
                        (0, n.jsx)(r.tl, {
                          title: "Return To Center",
                          checked: M,
                          onChange: H,
                        }),
                        (0, n.jsx)(r.W7, {
                          title: "Fallback",
                          value: L,
                          onChange: A,
                        }),
                        (0, n.jsx)(r.tl, {
                          title: "Paused",
                          checked: _,
                          onChange: Y,
                        }),
                      ],
                    }),
                    (0, n.jsx)(r.Ub, {
                      data: [
                        {
                          name: "image",
                          type: "string",
                          default: "Unsplash URL",
                          description:
                            "Photo shown in full colour inside the lens.",
                        },
                        {
                          name: "backgroundImage",
                          type: "string",
                          default: "image",
                          description:
                            "Optional different photo for the outside. Defaults to the same image.",
                        },
                        {
                          name: "shape",
                          type: '"square" | "circle" | "blob" | "portal"',
                          default: '"circle"',
                          description:
                            "Outline of the lens. Portal is an organic blob whose edge dissolves into the outside.",
                        },
                        {
                          name: "size",
                          type: "number",
                          default: "0.6",
                          description:
                            "Lens size as a fraction of the shorter container edge.",
                        },
                        {
                          name: "softness",
                          type: "number",
                          default: "0",
                          description:
                            "Edge feather in lens units. 0 keeps a crisp cut. Portal adds its own wide falloff.",
                        },
                        {
                          name: "distortion",
                          type: "number",
                          default: "1",
                          description:
                            "Radial lens warp inside the outline. Positive magnifies like glass, negative pinches.",
                        },
                        {
                          name: "aberration",
                          type: "number",
                          default: "0.01",
                          description:
                            "Colour fringing that grows towards the lens edge.",
                        },
                        {
                          name: "wobble",
                          type: "number",
                          default: "0.5",
                          description:
                            "How far the blob and portal outlines wobble, 0 to 1.",
                        },
                        {
                          name: "wobbleSpeed",
                          type: "number",
                          default: "2",
                          description: "Speed of the outline wobble.",
                        },
                        {
                          name: "waveFrequency",
                          type: "number",
                          default: "6",
                          description:
                            "Frequency of the sine wave rolling through the outside image.",
                        },
                        {
                          name: "waveStrength",
                          type: "number",
                          default: "0.01",
                          description: "Displacement of the outside wave.",
                        },
                        {
                          name: "waveSpeed",
                          type: "number",
                          default: "1",
                          description: "Speed of the outside wave.",
                        },
                        {
                          name: "grain",
                          type: "number",
                          default: "0.02",
                          description:
                            "Displacement of the animated grain outside the lens.",
                        },
                        {
                          name: "grainSpeed",
                          type: "number",
                          default: "10",
                          description: "How fast the grain flickers.",
                        },
                        {
                          name: "grayscale",
                          type: "number",
                          default: "1",
                          description:
                            "How far the outside is drained of colour, 0 to 1.",
                        },
                        {
                          name: "dim",
                          type: "number",
                          default: "0",
                          description:
                            "How far the outside is darkened, 0 to 1.",
                        },
                        {
                          name: "follow",
                          type: "number",
                          default: "0.85",
                          description:
                            "Pointer damping. 0 snaps to the pointer, 1 trails far behind.",
                        },
                        {
                          name: "returnToCenter",
                          type: "boolean",
                          default: "true",
                          description:
                            "Drift the lens back to the centre when the pointer leaves.",
                        },
                        {
                          name: "fallbackColor",
                          type: "string",
                          default: '"#171717"',
                          description:
                            "Colour shown while the image loads or if it fails to load.",
                        },
                        {
                          name: "paused",
                          type: "boolean",
                          default: "false",
                          description:
                            "Freeze the wave, grain and outline animation.",
                        },
                        {
                          name: "dpr",
                          type: "number",
                          default: "1.5",
                          description:
                            "Upper device pixel ratio bound for the canvas.",
                        },
                        {
                          name: "className",
                          type: "string",
                          default: "—",
                          description: "Classes applied to the root element.",
                        },
                        {
                          name: "children",
                          type: "ReactNode",
                          default: "—",
                          description: "Content layered above the effect.",
                        },
                      ],
                    }),
                  ],
                }),
                (0, n.jsx)(r.lT, { children: (0, n.jsx)(r.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
