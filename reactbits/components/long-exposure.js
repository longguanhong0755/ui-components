/* ReactBits Pro public preview module 12408 for long-exposure.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/12408.0a6bbed828ef42e0.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  12408: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => S }));
    var l = a(95155),
      n = a(12115),
      u = a(30701),
      o = a(56388),
      r = a(90761),
      i = a(81712),
      s = a(3907),
      d = a(50969),
      f = a(2253),
      c = a(90650);
    let m = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
}
`,
      h = `
precision highp float;

#define MAX_TRAILS 16

varying vec2 vUv;

uniform vec2 uResolution;
uniform float uTime;
uniform int uTrails;
uniform float uSpacing;
uniform float uOffset;
uniform float uCurve;
uniform float uCurveFrequency;
uniform float uWobble;
uniform float uFan;
uniform float uCoreWidth;
uniform float uGlowWidth;
uniform float uGlow;
uniform float uPulse;
uniform float uPulseFrequency;
uniform float uPulsePhase;
uniform float uTail;
uniform float uHorizon;
uniform float uFocal;
uniform float uFog;
uniform float uIntensity;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uBackground;
uniform float uInk;


float falloff(float d, float w) {
  return w / (abs(d) + w);
}


float meander(float x) {
  return atan(sin(x) * 1.8) / atan(1.8);
}


float route(float z) {
  return meander(z * uCurveFrequency) + 0.5 * meander(z * uCurveFrequency * 0.6 + 2.0);
}

void main() {
  vec2 uv = (vUv * 2.0 - 1.0) * vec2(uResolution.x / uResolution.y, 1.0);
  float below = uHorizon - uv.y;

  vec3 light = vec3(0.0);
  vec3 dye = vec3(0.0);
  if (below > 0.0005) {

    float depth = uFocal / below;
    float fade = exp(-depth * uFog);
    float last = max(float(uTrails - 1), 1.0);

    for (int i = 0; i < MAX_TRAILS; i++) {
      if (i >= uTrails) break;
      float index = float(i);
      float t = uTrails > 1 ? index / last : 0.5;


      float layer = 1.0 + uFan * t;
      float groundX = uv.x * depth * layer;
      float z = depth * layer + uTime;


      float turn = cos(index * 1.9);
      float lane = (index - last * 0.5) * uSpacing + uOffset;

      float bend = uCurve * route(z) * (1.0 + 0.3 * turn) * depth * layer;
      float drift = uWobble * sin(z * 0.7 + index * 2.1);
      float dx = groundX - (lane + bend + drift);


      float phase = z * uPulseFrequency - uPulsePhase * sign(turn) + index * 0.37;
      float head = exp(-fract(phase) * uTail);


      float pxPerUnit = (uFocal / (depth * depth * layer)) * (0.5 * uResolution.y);
      float pulseVis = smoothstep(40.0, 220.0, pxPerUnit / max(uPulseFrequency, 0.0001));
      float packet = mix(1.0, head, uPulse * pulseVis);



      float bendPx = pxPerUnit * 6.2831853 / max(uCurveFrequency, 0.0001);
      float resolvable = smoothstep(6.0, 40.0, bendPx);





      float slope = max(length(vec2(dFdx(dx), dFdy(dx))), 1e-6);
      float pixelGround = (2.0 / uResolution.y) * depth * layer;
      float dxPx = dx / slope;
      float corePx = max(uCoreWidth / pixelGround, 1.5);
      float haloPx = max(uGlowWidth / pixelGround, 3.0);
      float line = falloff(dxPx, corePx);
      float soft = falloff(dxPx, haloPx);

      vec3 tint = mix(uColorA, uColorB, 0.5 + 0.5 * turn);

      float density = line * line * 2.0 + soft * soft * uGlow;
      vec3 beam = tint * density + vec3(pow(line, 4.0));
      light += beam * packet * fade * resolvable;
      dye += tint * (density + pow(line, 4.0)) * packet * fade * resolvable;
    }
  }

  light *= uIntensity;

  light = 1.0 - exp(-light);

  vec3 lit = uBackground + light;


  dye *= uIntensity;
  float amount = max(dye.r, max(dye.g, dye.b));
  float coverage = 1.0 - exp(-amount);
  vec3 pigment = amount > 0.0001 ? dye / amount : vec3(1.0);
  vec3 inked = uBackground * mix(vec3(1.0), pigment * 0.85, coverage);

  gl_FragColor = vec4(clamp(mix(lit, inked, uInk), 0.0, 1.0), 1.0);
}
`,
      v = (e, t, a) => Math.min(a, Math.max(t, e)),
      p = (e, t) => {
        let a = new f.Q1f();
        try {
          a.setStyle(e, f.Zr2);
        } catch {
          a.setStyle(t, f.Zr2);
        }
        return a;
      },
      x = (e, t) => {
        try {
          e.setStyle(t, f.Zr2);
        } catch {}
      },
      g = (e) => {
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
      y = () => window.devicePixelRatio || 1,
      b = ({
        trails: e,
        spacing: t,
        offset: a,
        curve: u,
        curveFrequency: o,
        wobble: r,
        fan: s,
        coreWidth: d,
        glowWidth: c,
        glow: g,
        speed: y,
        pulse: b,
        pulseFrequency: C,
        pulseSpeed: w,
        tail: S,
        horizon: j,
        focal: P,
        fog: F,
        intensity: k,
        colorA: T,
        colorB: W,
        backgroundColor: I,
        blend: z,
        paused: M,
      }) => {
        let q = (0, n.useRef)(null),
          G = (0, n.useRef)(0),
          B = (0, n.useRef)(0),
          { gl: E, size: N, invalidate: R } = (0, i.C)(),
          A = (0, n.useMemo)(
            () => ({
              uResolution: { value: new f.I9Y(1, 1) },
              uTime: { value: 0 },
              uTrails: { value: 9 },
              uSpacing: { value: 0.3 },
              uOffset: { value: 0 },
              uCurve: { value: 0.5 },
              uCurveFrequency: { value: 0.45 },
              uWobble: { value: 0.05 },
              uFan: { value: 1.2 },
              uCoreWidth: { value: 0.02 },
              uGlowWidth: { value: 0.06 },
              uGlow: { value: 0.6 },
              uPulse: { value: 0.7 },
              uPulseFrequency: { value: 0.12 },
              uPulsePhase: { value: 0 },
              uTail: { value: 4 },
              uHorizon: { value: 1.2 },
              uFocal: { value: 1.2 },
              uFog: { value: 0.06 },
              uIntensity: { value: 1 },
              uColorA: { value: p("#1a4dff", "#1a4dff") },
              uColorB: { value: p("#66b3ff", "#66b3ff") },
              uBackground: { value: p("#000000", "#000000") },
              uInk: { value: 0 },
            }),
            [],
          );
        return (
          (0, n.useEffect)(() => {
            let e = q.current;
            e &&
              (x(e.uniforms.uColorA.value, T),
              x(e.uniforms.uColorB.value, W),
              x(e.uniforms.uBackground.value, I),
              R());
          }, [T, W, I, R]),
          (0, n.useEffect)(() => {
            R();
          }, [e, t, a, u, o, r, s, d, c, g, b, C, S, j, P, F, k, z, R]),
          (0, i.D)((l, n) => {
            let i = q.current;
            if (!i) return;
            if (!M) {
              let e = Math.min(n, 0.05);
              ((G.current += e * y), (B.current += e * w));
            }
            let f = E.getPixelRatio(),
              m = i.uniforms;
            (m.uResolution.value.set(N.width * f, N.height * f),
              (m.uTime.value = G.current),
              (m.uPulsePhase.value = B.current),
              (m.uTrails.value = Math.round(v(e, 1, 16))),
              (m.uSpacing.value = t),
              (m.uOffset.value = a),
              (m.uCurve.value = u),
              (m.uCurveFrequency.value = o),
              (m.uWobble.value = r),
              (m.uFan.value = Math.max(s, 0)),
              (m.uCoreWidth.value = Math.max(d, 5e-4)),
              (m.uGlowWidth.value = Math.max(c, 5e-4)),
              (m.uGlow.value = Math.max(g, 0)),
              (m.uPulse.value = v(b, 0, 1)),
              (m.uPulseFrequency.value = Math.max(C, 0)),
              (m.uTail.value = Math.max(S, 0.1)),
              (m.uHorizon.value = v(j, -0.99, 2)),
              (m.uFocal.value = Math.max(P, 0.05)),
              (m.uFog.value = Math.max(F, 0)),
              (m.uIntensity.value = Math.max(k, 0)),
              (m.uInk.value = +("ink" === z)));
          }),
          (0, l.jsxs)("mesh", {
            frustumCulled: !1,
            children: [
              (0, l.jsx)("planeGeometry", { args: [1, 1] }),
              (0, l.jsx)("shaderMaterial", {
                ref: q,
                vertexShader: m,
                fragmentShader: h,
                uniforms: A,
                depthTest: !1,
                depthWrite: !1,
              }),
            ],
          })
        );
      },
      C = ({
        trails: e = 9,
        spacing: t = 0.3,
        offset: a = 0,
        curve: u = 0.5,
        curveFrequency: o = 0.45,
        wobble: r = 0.05,
        fan: i = 1.2,
        coreWidth: f = 0.02,
        glowWidth: m = 0.06,
        glow: h = 0.6,
        speed: v = 1,
        pulse: p = 0.7,
        pulseFrequency: x = 0.12,
        pulseSpeed: C = 1,
        tail: w = 4,
        horizon: S = 1.2,
        focal: j = 1.2,
        fog: P = 0.06,
        intensity: F = 1,
        colorA: k = "#1a4dff",
        colorB: T = "#66b3ff",
        backgroundColor: W = "#000000",
        blend: I = "add",
        paused: z = !1,
        dpr: M = 1.5,
        className: q,
        children: G,
      }) => {
        let B = (0, n.useRef)(null),
          [E, N] = (0, n.useState)(!0),
          R = (0, d.I)(),
          A = Math.min(
            (0, n.useSyncExternalStore)(g, y, () => 1),
            Math.max(M, 0.5),
          );
        (0, n.useEffect)(() => {
          let e = B.current;
          if (!e || "undefined" == typeof IntersectionObserver) return;
          let t = new IntersectionObserver(([e]) => N(e.isIntersecting), {
            threshold: 0,
          });
          return (t.observe(e), () => t.disconnect());
        }, []);
        let H = z || !!R;
        return (0, l.jsxs)("div", {
          ref: B,
          className: (0, c.cn)("relative overflow-hidden", q),
          children: [
            (0, l.jsx)("div", {
              className: "absolute inset-0",
              children: (0, l.jsx)(s.Hl, {
                orthographic: !0,
                dpr: A,
                frameloop: E && !H ? "always" : "demand",
                gl: {
                  antialias: !1,
                  alpha: !1,
                  powerPreference: "high-performance",
                },
                children: (0, l.jsx)(b, {
                  trails: e,
                  spacing: t,
                  offset: a,
                  curve: u,
                  curveFrequency: o,
                  wobble: r,
                  fan: i,
                  coreWidth: f,
                  glowWidth: m,
                  glow: h,
                  speed: v,
                  pulse: p,
                  pulseFrequency: x,
                  pulseSpeed: C,
                  tail: w,
                  horizon: S,
                  focal: j,
                  fog: P,
                  intensity: F,
                  colorA: k,
                  colorB: T,
                  backgroundColor: W,
                  blend: I,
                  paused: H,
                }),
              }),
            }),
            G
              ? (0, l.jsx)("div", {
                  className: "relative z-10 h-full w-full",
                  children: G,
                })
              : null,
          ],
        });
      },
      w = () => () => {},
      S = () => {
        let [e, t] = (0, r.I)(),
          { resolvedTheme: a } = (0, u.D)(),
          i =
            (0, n.useSyncExternalStore)(
              w,
              () => !0,
              () => !1,
            ) && "dark" === a,
          [s, d] = (0, n.useState)(9),
          [f, c] = (0, n.useState)(0.3),
          [m, h] = (0, n.useState)(0),
          [v, p] = (0, n.useState)(0.5),
          [x, g] = (0, n.useState)(0.45),
          [y, b] = (0, n.useState)(0.05),
          [S, j] = (0, n.useState)(1.2),
          [P, F] = (0, n.useState)(0.02),
          [k, T] = (0, n.useState)(0.06),
          [W, I] = (0, n.useState)(0.6),
          [z, M] = (0, n.useState)(1),
          [q, G] = (0, n.useState)(0.7),
          [B, E] = (0, n.useState)(0.12),
          [N, R] = (0, n.useState)(1),
          [A, H] = (0, n.useState)(4),
          [U, O] = (0, n.useState)(1.2),
          [L, _] = (0, n.useState)(1.2),
          [X, D] = (0, n.useState)(0.06),
          [V, Z] = (0, n.useState)(1),
          [Q, Y] = (0, n.useState)("#1a4dff"),
          [J, K] = (0, n.useState)("#66b3ff"),
          [$, ee] = (0, n.useState)(null),
          [et, ea] = (0, n.useState)(null),
          [el, en] = (0, n.useState)(!1),
          eu = $ ?? (i ? "#000000" : "#ffffff"),
          eo = et ?? (i ? "add" : "ink");
        return (0, l.jsxs)("div", {
          children: [
            (0, l.jsx)(o.Bg, {}),
            (0, l.jsxs)(o.VX, {
              children: [
                (0, l.jsxs)(o.Ec, {
                  children: [
                    (0, l.jsx)(o.Ch, {
                      onRefresh: t,
                      minHeight: 560,
                      children: (0, l.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, l.jsx)(
                          C,
                          {
                            className: "h-full w-full",
                            trails: s,
                            spacing: f,
                            offset: m,
                            curve: v,
                            curveFrequency: x,
                            wobble: y,
                            fan: S,
                            coreWidth: P,
                            glowWidth: k,
                            glow: W,
                            speed: z,
                            pulse: q,
                            pulseFrequency: B,
                            pulseSpeed: N,
                            tail: A,
                            horizon: U,
                            focal: L,
                            fog: X,
                            intensity: V,
                            colorA: Q,
                            colorB: J,
                            backgroundColor: eu,
                            blend: eo,
                            paused: el,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, l.jsxs)(o.IH, {
                      children: [
                        (0, l.jsx)(o.yt, {
                          title: "Trails",
                          min: 1,
                          max: 16,
                          step: 1,
                          value: s,
                          onChange: d,
                        }),
                        (0, l.jsx)(o.yt, {
                          title: "Spacing",
                          min: 0.05,
                          max: 1,
                          step: 0.01,
                          value: f,
                          onChange: c,
                        }),
                        (0, l.jsx)(o.yt, {
                          title: "Offset",
                          min: -3,
                          max: 3,
                          step: 0.05,
                          value: m,
                          onChange: h,
                        }),
                        (0, l.jsx)(o.yt, {
                          title: "Curve",
                          min: 0,
                          max: 2,
                          step: 0.05,
                          value: v,
                          onChange: p,
                        }),
                        (0, l.jsx)(o.yt, {
                          title: "Curve Frequency",
                          min: 0.05,
                          max: 1.5,
                          step: 0.01,
                          value: x,
                          onChange: g,
                        }),
                        (0, l.jsx)(o.yt, {
                          title: "Wobble",
                          min: 0,
                          max: 0.5,
                          step: 0.01,
                          value: y,
                          onChange: b,
                        }),
                        (0, l.jsx)(o.yt, {
                          title: "Fan",
                          min: 0,
                          max: 2,
                          step: 0.05,
                          value: S,
                          onChange: j,
                        }),
                        (0, l.jsx)(o.yt, {
                          title: "Core Width",
                          min: 0.001,
                          max: 0.08,
                          step: 0.001,
                          value: P,
                          onChange: F,
                        }),
                        (0, l.jsx)(o.yt, {
                          title: "Glow Width",
                          min: 0.01,
                          max: 0.6,
                          step: 0.01,
                          value: k,
                          onChange: T,
                        }),
                        (0, l.jsx)(o.yt, {
                          title: "Glow",
                          min: 0,
                          max: 2,
                          step: 0.05,
                          value: W,
                          onChange: I,
                        }),
                        (0, l.jsx)(o.yt, {
                          title: "Speed",
                          min: 0,
                          max: 6,
                          step: 0.1,
                          value: z,
                          onChange: M,
                        }),
                        (0, l.jsx)(o.yt, {
                          title: "Pulse",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: q,
                          onChange: G,
                        }),
                        (0, l.jsx)(o.yt, {
                          title: "Pulse Frequency",
                          min: 0,
                          max: 1.5,
                          step: 0.01,
                          value: B,
                          onChange: E,
                        }),
                        (0, l.jsx)(o.yt, {
                          title: "Pulse Speed",
                          min: -4,
                          max: 4,
                          step: 0.1,
                          value: N,
                          onChange: R,
                        }),
                        (0, l.jsx)(o.yt, {
                          title: "Tail",
                          min: 0.5,
                          max: 12,
                          step: 0.1,
                          value: A,
                          onChange: H,
                        }),
                        (0, l.jsx)(o.yt, {
                          title: "Horizon",
                          min: -0.5,
                          max: 2,
                          step: 0.01,
                          value: U,
                          onChange: O,
                        }),
                        (0, l.jsx)(o.yt, {
                          title: "Focal",
                          min: 0.3,
                          max: 4,
                          step: 0.05,
                          value: L,
                          onChange: _,
                        }),
                        (0, l.jsx)(o.yt, {
                          title: "Fog",
                          min: 0,
                          max: 0.6,
                          step: 0.005,
                          value: X,
                          onChange: D,
                        }),
                        (0, l.jsx)(o.yt, {
                          title: "Intensity",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: V,
                          onChange: Z,
                        }),
                        (0, l.jsx)(o.W7, {
                          title: "Color A",
                          value: Q,
                          onChange: Y,
                        }),
                        (0, l.jsx)(o.W7, {
                          title: "Color B",
                          value: J,
                          onChange: K,
                        }),
                        (0, l.jsx)(o.W7, {
                          title: "Background",
                          value: eu,
                          onChange: ee,
                        }),
                        (0, l.jsx)(o.bg, {
                          title: "Blend",
                          value: eo,
                          onChange: (e) => ea(e),
                          options: [
                            { label: "Add", value: "add" },
                            { label: "Ink", value: "ink" },
                          ],
                        }),
                        (0, l.jsx)(o.tl, {
                          title: "Paused",
                          checked: el,
                          onChange: en,
                        }),
                      ],
                    }),
                    (0, l.jsx)(o.Ub, {
                      data: [
                        {
                          name: "trails",
                          type: "number",
                          default: "9",
                          description: "Number of light trails, 1 to 16.",
                        },
                        {
                          name: "spacing",
                          type: "number",
                          default: "0.3",
                          description:
                            "Ground distance between neighbouring trails.",
                        },
                        {
                          name: "offset",
                          type: "number",
                          default: "0",
                          description:
                            "Horizontal shift of the whole bundle in ground units.",
                        },
                        {
                          name: "curve",
                          type: "number",
                          default: "0.5",
                          description:
                            "Amplitude of the shared bend the trails follow.",
                        },
                        {
                          name: "curveFrequency",
                          type: "number",
                          default: "0.45",
                          description:
                            "Frequency of the bend along the depth axis.",
                        },
                        {
                          name: "wobble",
                          type: "number",
                          default: "0.05",
                          description:
                            "Per-trail deviation from the shared bend.",
                        },
                        {
                          name: "fan",
                          type: "number",
                          default: "1.2",
                          description:
                            "How far apart in depth the trails sit. 0 keeps them on one plane.",
                        },
                        {
                          name: "coreWidth",
                          type: "number",
                          default: "0.02",
                          description: "Ground width of the bright core.",
                        },
                        {
                          name: "glowWidth",
                          type: "number",
                          default: "0.06",
                          description: "Ground width of the soft halo.",
                        },
                        {
                          name: "glow",
                          type: "number",
                          default: "0.6",
                          description:
                            "Strength of the halo relative to the core. 0 disables.",
                        },
                        {
                          name: "speed",
                          type: "number",
                          default: "1",
                          description:
                            "Travel speed of the ground towards the camera.",
                        },
                        {
                          name: "pulse",
                          type: "number",
                          default: "0.7",
                          description:
                            "Strength of the brightness pulses running along the trails, 0 to 1.",
                        },
                        {
                          name: "pulseFrequency",
                          type: "number",
                          default: "0.12",
                          description: "Number of pulses per ground unit.",
                        },
                        {
                          name: "pulseSpeed",
                          type: "number",
                          default: "1",
                          description:
                            "Speed at which pulses run along the trails.",
                        },
                        {
                          name: "tail",
                          type: "number",
                          default: "4",
                          description:
                            "Length of the tail each pulse drags behind it; lower is longer.",
                        },
                        {
                          name: "horizon",
                          type: "number",
                          default: "1.2",
                          description:
                            "Vertical position of the horizon, -1 bottom to 1 top. Above 1 vanishes off-frame.",
                        },
                        {
                          name: "focal",
                          type: "number",
                          default: "1.2",
                          description:
                            "Camera focal length; larger flattens the perspective.",
                        },
                        {
                          name: "fog",
                          type: "number",
                          default: "0.06",
                          description: "Distance fade towards the horizon.",
                        },
                        {
                          name: "intensity",
                          type: "number",
                          default: "1",
                          description: "Overall light intensity.",
                        },
                        {
                          name: "colorA",
                          type: "string",
                          default: '"#1a4dff"',
                          description: "Colour at the first trail.",
                        },
                        {
                          name: "colorB",
                          type: "string",
                          default: '"#66b3ff"',
                          description: "Colour at the last trail.",
                        },
                        {
                          name: "backgroundColor",
                          type: "string",
                          default: '"#000000"',
                          description: "Colour behind the trails.",
                        },
                        {
                          name: "blend",
                          type: '"add" | "ink"',
                          default: '"add"',
                          description:
                            '"add" lights the background, "ink" darkens it for light themes.',
                        },
                        {
                          name: "paused",
                          type: "boolean",
                          default: "false",
                          description: "Freeze the animation.",
                        },
                        {
                          name: "dpr",
                          type: "number",
                          default: "1.5",
                          description: "Upper device pixel ratio bound.",
                        },
                        {
                          name: "className",
                          type: "string",
                          default: "—",
                          description: "Extra classes for the root element.",
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
                (0, l.jsx)(o.lT, { children: (0, l.jsx)(o.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
