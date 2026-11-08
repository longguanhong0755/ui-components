/* ReactBits Pro public preview module 91024 for cloud-atlas.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/23881.afbcf9d1ef8ff97f.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  91024: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => P }));
    var r = a(95155),
      l = a(12115),
      u = a(86049),
      n = a(56388),
      o = a(90761),
      i = a(81712),
      s = a(3907),
      d = a(2253),
      c = a(90650);
    let v = ["#6D5BC0", "#3A2E7A"],
      f = `
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;

uniform vec2 uTexel;

void main() {
  vUv = uv;
  vL = uv - vec2(uTexel.x, 0.0);
  vR = uv + vec2(uTexel.x, 0.0);
  vT = uv + vec2(0.0, uTexel.y);
  vB = uv - vec2(0.0, uTexel.y);
  gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
}
`,
      h = `
precision highp float;

varying vec2 vUv;

uniform sampler2D uField;
uniform vec2 uFrom;
uniform vec2 uTo;
uniform vec2 uPush;
uniform float uRadius;
uniform float uAspect;

void main() {
  vec2 a = uFrom * vec2(uAspect, 1.0);
  vec2 b = uTo * vec2(uAspect, 1.0);
  vec2 p = vUv * vec2(uAspect, 1.0);
  vec2 ab = b - a;
  float h = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
  vec2 d = p - (a + ab * h);
  float g = exp(-dot(d, d) / max(uRadius * uRadius, 1e-6));
  vec2 field = texture2D(uField, vUv).xy + uPush * g;
  float size = length(field);
  field *= min(1.0, 0.24 / max(size, 1e-5));
  gl_FragColor = vec4(field, 0.0, 1.0);
}
`,
      p = `
precision highp float;

varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;

uniform sampler2D uField;
uniform float uKeep;

void main() {
  vec2 center = texture2D(uField, vUv).xy;
  vec2 around = (
    texture2D(uField, vL).xy +
    texture2D(uField, vR).xy +
    texture2D(uField, vT).xy +
    texture2D(uField, vB).xy
  ) * 0.25;
  gl_FragColor = vec4(mix(center, around, 0.4) * uKeep, 0.0, 1.0);
}
`,
      m = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
}
`,
      g = `
precision highp float;

#define PI 3.14159265359
#define TAU 6.28318530718

varying vec2 vUv;

uniform vec2 uResolution;
uniform float uTime;
uniform float uFlow;
uniform float uWind;
uniform vec3 uSky;
uniform vec3 uLight;
uniform vec3 uShade;
uniform float uTransparent;
uniform float uTop;
uniform float uCeiling;
uniform float uFadeStart;
uniform float uCoverage;
uniform float uDensity;
uniform float uScale;
uniform float uRise;
uniform float uDip;
uniform float uOpacity;
uniform float uSeed;
uniform sampler2D uWake;
uniform float uWakeStrength;

const mat2 SPIN_A = mat2(0.80, 0.60, -0.60, 0.80);
const mat2 SPIN_B = mat2(1.60, 1.20, -1.20, 1.60);

vec2 hash22(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.xx + q.yz) * q.zy) * 2.0 - 1.0;
}

mat2 rotation(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, s, -s, c);
}

float cellular(vec2 x, float phase) {
  vec2 cell = floor(x);
  vec2 f = fract(x);
  float inverse = 0.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 site = 0.5 + 0.5 * sin(phase + TAU * hash22(cell + g));
      vec2 r = g + site - f;
      float d2 = dot(r, r);
      float d4 = d2 * d2;
      float d8 = d4 * d4;
      inverse += 1.0 / (d8 * d8);
    }
  }
  return 1.0 - pow(inverse, -0.125);
}

float lobe(vec2 cell, vec2 offset, vec2 f, mat2 turn) {
  float sgn = 1.0 - 2.0 * mod(offset.x + offset.y, 2.0);
  return sgn * dot(hash22(cell + offset), turn * (f - offset));
}

float curl(vec2 p, float angle) {
  vec2 cell = floor(p);
  vec2 f = fract(p);
  vec2 w = f * f * (3.0 - 2.0 * f);
  mat2 turn = rotation(angle + PI * (1.0 - mod(cell.x + cell.y, 2.0)));
  float n = mix(
    mix(lobe(cell, vec2(0.0, 0.0), f, turn), lobe(cell, vec2(1.0, 0.0), f, turn), w.x),
    mix(lobe(cell, vec2(0.0, 1.0), f, turn), lobe(cell, vec2(1.0, 1.0), f, turn), w.x),
    w.y
  );
  return 0.5 + n;
}

float puffs(vec2 p, float t) {
  float sum = 0.5 * cellular(p, t * 0.1);
  p = SPIN_A * p * 2.02;
  sum += 0.25 * cellular(p, t * 0.2);
  p = SPIN_A * p * 2.03;
  sum += 0.125 * cellular(p, t * 0.5);
  return (sum + 0.0625) / 0.9375;
}

float billows(vec2 p, float t) {
  float sum = 0.5 * curl(p, t * 0.1);
  p = SPIN_B * p;
  sum += 0.25 * curl(p, t * 0.4);
  p = SPIN_B * p;
  sum += 0.125 * curl(p, t * 0.7);
  p = SPIN_B * p;
  sum += 0.0625 * curl(p, t * 0.3);
  p = SPIN_B * p;
  sum += 0.0325 * curl(p, t * 0.3);
  return sum * 1.2;
}

float swirl(vec2 p, float t) {
  float sum = 0.5 * curl(p, t * 0.1);
  p = SPIN_B * p;
  sum += 0.25 * curl(p, t * 0.4);
  return sum * 1.2;
}

void main() {
  vec2 px = vUv * uResolution;
  vec2 wake = texture2D(uWake, vUv).xy * uWakeStrength;
  px -= wake * uResolution.y;
  if (uTop > 0.5) px.y = uResolution.y - px.y;
  float h = px.y / uResolution.y;
  float t = uTime;
  float unit = max(uResolution.x, uResolution.y);

  float sx = (px.x + uWind * unit / uScale) / uResolution.y + uSeed * 3.1;
  float ridge = curl(vec2(sx * 0.6 + t * 0.01, 4.7), 0.0);
  ridge = 0.7 * ridge + 0.3 * curl(vec2(sx * 1.5 - t * 0.006, 8.3), 0.0);
  ridge = 0.5 + (ridge - 0.5) * 2.0;
  float tower = smoothstep(0.4, 0.85, ridge);
  float lift = mix(-uDip, uRise, tower);

  vec3 cloud = uLight;
  float amount = 0.0;
  if (h <= uCeiling + lift) {
    float churn = uFlow * 0.5;
    float drift = t * 0.15;
    vec2 uv = vec2(px.x, -px.y) / unit;
    uv += swirl(uv * uScale + vec2(0.0, churn * 0.5), churn) * 0.025;
    vec2 q = uv * uScale + vec2(uWind + uSeed * 17.3, drift + uSeed * 9.1);
    float shape = puffs(q, churn * 10.0);
    float detail = billows(q, churn * 10.0);

    float band = uCoverage * clamp(1.0 - h + lift * 0.9, 0.0, 1.0);
    shape = smoothstep(0.0, 1.0, shape) * band + uDensity;
    detail = smoothstep(0.0, 1.0, detail) * band + uDensity;
    float density = shape * detail;
    density *= smoothstep(0.0, 1.0, density);

    cloud = mix(uLight, uShade, smoothstep(0.5, 0.99, density));
    float cover = smoothstep(0.2, 0.5, density);
    float fade = 1.0 - smoothstep(uFadeStart + lift, uCeiling + lift, h);
    float part = clamp(length(wake) * 2.6, 0.0, 0.5);
    amount = cover * fade * uOpacity * (1.0 - part);
  }

  if (uTransparent > 0.5) {
    gl_FragColor = vec4(cloud * amount, amount);
  } else {
    gl_FragColor = vec4(mix(uSky, cloud, amount), 1.0);
  }
}
`,
      y = (e, t, a) => Math.min(a, Math.max(t, e)),
      x = (e) => {
        let t = e.trim().toLowerCase();
        return (
          "transparent" === t ||
          (/^#[0-9a-f]{8}$/.test(t)
            ? t.endsWith("00")
            : /^#[0-9a-f]{4}$/.test(t)
              ? t.endsWith("0")
              : null !==
                t.match(/^(?:rgba?|hsla?)\(.*[,/]\s*(0|0?\.0+|0%)\s*\)$/))
        );
      },
      w = new d.Q1f(),
      b = (e, t, a) => {
        let r = t.trim();
        try {
          w.set(/^#[0-9a-f]{8}$/i.test(r) ? r.slice(0, 7) : r);
        } catch {
          w.set(a);
        }
        let l = { r: 0, g: 0, b: 0 };
        return (w.getRGB(l, d.er$), e.set(l.r, l.g, l.b));
      },
      S = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      F = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      C = (e, t) =>
        new d.nWS(e, t, {
          type: d.ix0,
          format: d.GWd,
          minFilter: d.k6q,
          magFilter: d.k6q,
          depthBuffer: !1,
          stencilBuffer: !1,
          wrapS: d.ghU,
          wrapT: d.ghU,
        }),
      k = ({ settings: e, pointerRef: t, wakeRef: a }) => {
        let { gl: u, size: n, invalidate: o } = (0, i.C)(),
          s = (0, l.useRef)(null),
          c = (0, l.useRef)(null),
          w = (0, l.useRef)({
            time: 12,
            flow: 12,
            drift: 0,
            lastX: 0.5,
            lastY: 0.5,
            hasLast: !1,
            lastMoved: 0,
            energy: 0,
          }),
          S = (0, l.useMemo)(
            () => ({
              uResolution: { value: new d.I9Y(1, 1) },
              uTime: { value: 12 },
              uFlow: { value: 12 },
              uWind: { value: 0 },
              uSky: { value: new d.Pq0() },
              uLight: { value: new d.Pq0() },
              uShade: { value: new d.Pq0() },
              uTransparent: { value: 0 },
              uTop: { value: 0 },
              uCeiling: { value: 0.9 },
              uFadeStart: { value: 0.5 },
              uCoverage: { value: 0.45 },
              uDensity: { value: 0.55 },
              uScale: { value: 8 },
              uRise: { value: 0.5 },
              uDip: { value: 0.1 },
              uOpacity: { value: 0.9 },
              uSeed: { value: 0 },
              uWake: { value: null },
              uWakeStrength: { value: 1 },
            }),
            [],
          ),
          [F, k] = e.colors,
          { backgroundColor: j } = e,
          T = n.width / Math.max(n.height, 1),
          R = Math.max(16, Math.round(72 * T));
        return (
          (0, l.useEffect)(() => {
            let e,
              t,
              a,
              r,
              l,
              u,
              n =
                ((e = new d.Z58()),
                (t = new d.qUd(-1, 1, 1, -1, 0, 1)),
                (a = new d.I9Y(1 / R, 1 / 72)),
                (r = new d.BKk({
                  vertexShader: f,
                  fragmentShader: h,
                  uniforms: {
                    uTexel: { value: a },
                    uField: { value: null },
                    uFrom: { value: new d.I9Y() },
                    uTo: { value: new d.I9Y() },
                    uPush: { value: new d.I9Y() },
                    uRadius: { value: 0.1 },
                    uAspect: { value: 1 },
                  },
                  depthTest: !1,
                  depthWrite: !1,
                })),
                (l = new d.BKk({
                  vertexShader: f,
                  fragmentShader: p,
                  uniforms: {
                    uTexel: { value: a },
                    uField: { value: null },
                    uKeep: { value: 0.98 },
                  },
                  depthTest: !1,
                  depthWrite: !1,
                })),
                ((u = new d.eaF(new d.bdM(1, 1), r)).frustumCulled = !1),
                e.add(u),
                {
                  scene: e,
                  camera: t,
                  quad: u,
                  push: r,
                  settle: l,
                  field: { read: C(R, 72), write: C(R, 72) },
                  texel: a,
                });
            return (
              (c.current = n),
              () => {
                ((c.current = null),
                  n.field.read.dispose(),
                  n.field.write.dispose(),
                  n.push.dispose(),
                  n.settle.dispose(),
                  n.quad.geometry.dispose());
              }
            );
          }, [R, 72]),
          (0, l.useEffect)(
            () => (
              (a.current = o),
              () => {
                a.current = null;
              }
            ),
            [o, a],
          ),
          (0, l.useEffect)(() => {
            let e = s.current;
            if (!e) return;
            let t = e.uniforms;
            (b(t.uLight.value, F ?? v[0], v[0]),
              b(t.uShade.value, k ?? F ?? v[1], v[1]));
            let a = x(j);
            (b(t.uSky.value, a ? "#000000" : j, "#000000"),
              (t.uTransparent.value = +!!a),
              o());
          }, [F, k, j, o]),
          (0, l.useEffect)(() => {
            o();
          }, [e, n, o]),
          (0, i.D)((a, r) => {
            let l = s.current,
              i = c.current;
            if (!l || !i) return;
            let d = l.uniforms,
              v = w.current,
              f = t.current,
              h = Math.min(Math.max(r, 0), 0.05),
              p = !e.paused && !e.reduced && e.speed > 0,
              m = p ? h * y(e.speed, 0, 4) : 0;
            ((v.time += m),
              (v.flow += m * y(e.billow, 0, 4)),
              (v.drift += m * y(e.wind, -4, 4) * 0.12));
            let g = u.getRenderTarget(),
              x = (e) => {
                ((i.quad.material = e),
                  u.setRenderTarget(i.field.write),
                  u.render(i.scene, i.camera));
                let t = i.field.read;
                ((i.field.read = i.field.write), (i.field.write = t));
              },
              b = !1;
            if (
              e.interactive &&
              !e.reduced &&
              f.inside &&
              f.moved !== v.lastMoved
            ) {
              ((v.lastMoved = f.moved),
                v.hasLast ||
                  ((v.lastX = f.x), (v.lastY = f.y), (v.hasLast = !0)));
              let t = f.x - v.lastX,
                a = f.y - v.lastY;
              if (Math.hypot(t * T, a) > 5e-4) {
                let r = i.push.uniforms,
                  l = 1.3 * y(e.cursorStrength, 0, 3);
                ((r.uField.value = i.field.read.texture),
                  (r.uAspect.value = T),
                  (r.uRadius.value = y(e.cursorRadius, 0.02, 1)),
                  r.uFrom.value.set(v.lastX, v.lastY),
                  r.uTo.value.set(f.x, f.y),
                  r.uPush.value.set(
                    y(t * T, -0.2, 0.2) * l,
                    y(a, -0.2, 0.2) * l,
                  ),
                  x(i.push),
                  (v.energy = 1),
                  (b = !0));
              }
              ((v.lastX = f.x), (v.lastY = f.y));
            }
            (f.inside || (v.hasLast = !1),
              v.energy > 0.002 &&
                ((i.settle.uniforms.uField.value = i.field.read.texture),
                (i.settle.uniforms.uKeep.value = Math.exp(-h / 0.9)),
                x(i.settle),
                (v.energy *= Math.exp(-h / 0.9))),
              u.setRenderTarget(g),
              (d.uWake.value = i.field.read.texture),
              d.uResolution.value.set(
                n.width * a.viewport.dpr,
                n.height * a.viewport.dpr,
              ),
              (d.uTime.value = v.time),
              (d.uFlow.value = v.flow),
              (d.uWind.value = v.drift),
              (d.uTop.value = +("top" === e.anchor)));
            let S = y(e.height, 0.05, 1.5);
            ((d.uCeiling.value = S),
              (d.uFadeStart.value = 0.555 * S),
              (d.uCoverage.value = y(e.coverage, 0, 2)),
              (d.uDensity.value = y(e.density, 0, 1.5)),
              (d.uScale.value = 8 / y(e.scale, 0.2, 5)),
              (d.uRise.value = 0.5 * y(e.towers, 0, 3)),
              (d.uDip.value = 0.1 * y(e.towers, 0, 3)),
              (d.uOpacity.value = y(e.opacity, 0, 1)),
              (d.uSeed.value = e.seed),
              (d.uWakeStrength.value = +!!e.interactive),
              !p && (b || v.energy > 0.002) && o());
          }),
          (0, r.jsxs)("mesh", {
            frustumCulled: !1,
            children: [
              (0, r.jsx)("planeGeometry", { args: [1, 1] }),
              (0, r.jsx)("shaderMaterial", {
                ref: s,
                vertexShader: m,
                fragmentShader: g,
                uniforms: S,
                depthTest: !1,
                depthWrite: !1,
                transparent: !0,
                premultipliedAlpha: !0,
              }),
            ],
          })
        );
      },
      j = ({
        colors: e = v,
        backgroundColor: t = "#0a0a0a",
        anchor: a = "bottom",
        height: u = 0.9,
        coverage: n = 0.45,
        density: o = 0.55,
        scale: i = 1,
        towers: d = 1,
        opacity: f = 0.7,
        wind: h = 0,
        billow: p = 1,
        speed: m = 1,
        resolution: g = 0.36,
        interactive: w = !0,
        cursorStrength: b = 1,
        cursorRadius: C = 0.16,
        seed: j = 0,
        paused: T = !1,
        className: R,
        style: E,
        children: P,
      }) => {
        let B = (0, l.useRef)(null),
          D = (0, l.useRef)({ x: 0.5, y: 0.5, inside: !1, moved: 0 }),
          L = (0, l.useRef)(null),
          [I, N] = (0, l.useState)(!0),
          W = (0, l.useSyncExternalStore)(S, F, () => !1),
          A = !T && !W && m > 0,
          M = x(t);
        return (
          (0, l.useEffect)(() => {
            let e = B.current;
            if (!e || "undefined" == typeof IntersectionObserver) return;
            let t = new IntersectionObserver(([e]) => N(e.isIntersecting), {
              rootMargin: "80px",
            });
            return (t.observe(e), () => t.disconnect());
          }, []),
          (0, l.useEffect)(() => {
            let e = B.current;
            if (!e) return;
            let t = (t) => {
                let a = e.getBoundingClientRect(),
                  r = D.current;
                ((r.x = (t.clientX - a.left) / Math.max(a.width, 1)),
                  (r.y = 1 - (t.clientY - a.top) / Math.max(a.height, 1)),
                  (r.inside = !0),
                  (r.moved += 1),
                  L.current?.());
              },
              a = (e) => {
                ("pointerup" !== e.type || "mouse" !== e.pointerType) &&
                  ((D.current.inside = !1), L.current?.());
              };
            return (
              e.addEventListener("pointermove", t, { passive: !0 }),
              e.addEventListener("pointerdown", t, { passive: !0 }),
              e.addEventListener("pointerleave", a, { passive: !0 }),
              e.addEventListener("pointercancel", a, { passive: !0 }),
              e.addEventListener("pointerup", a, { passive: !0 }),
              () => {
                (e.removeEventListener("pointermove", t),
                  e.removeEventListener("pointerdown", t),
                  e.removeEventListener("pointerleave", a),
                  e.removeEventListener("pointercancel", a),
                  e.removeEventListener("pointerup", a));
              }
            );
          }, []),
          (0, r.jsxs)("div", {
            ref: B,
            className: (0, c.cn)("relative isolate overflow-hidden", R),
            style: { backgroundColor: M ? void 0 : t, ...E },
            children: [
              (0, r.jsx)("div", {
                className: "absolute inset-0",
                "aria-hidden": "true",
                children: (0, r.jsx)(s.Hl, {
                  orthographic: !0,
                  dpr: y(g, 0.1, 2),
                  frameloop: I && A ? "always" : "demand",
                  gl: {
                    antialias: !1,
                    alpha: !0,
                    premultipliedAlpha: !0,
                    powerPreference: "high-performance",
                  },
                  style: { pointerEvents: "none" },
                  children: (0, r.jsx)(k, {
                    settings: {
                      colors: e,
                      backgroundColor: t,
                      anchor: a,
                      height: u,
                      coverage: n,
                      density: o,
                      scale: i,
                      towers: d,
                      opacity: f,
                      wind: h,
                      billow: p,
                      speed: m,
                      interactive: w,
                      cursorStrength: b,
                      cursorRadius: C,
                      seed: j,
                      paused: T,
                      reduced: W,
                    },
                    pointerRef: D,
                    wakeRef: L,
                  }),
                }),
              }),
              P
                ? (0, r.jsx)("div", {
                    className: "relative z-10 h-full w-full",
                    children: P,
                  })
                : null,
            ],
          })
        );
      },
      T = {
        dusk: {
          colors: ["#6D5BC0", "#3A2E7A"],
          background: "#0a0a0a",
          opacity: 0.7,
          height: 0.9,
          coverage: 0.45,
          towers: 1,
        },
        daylight: {
          colors: ["#FFFFFF", "#E7F1FB"],
          background: "#A7EFFE",
          opacity: 0.9,
          height: 0.9,
          coverage: 0.45,
          towers: 1,
        },
        night: {
          colors: ["#262B36", "#181C24"],
          background: "#0E1219",
          opacity: 0.6,
          height: 0.9,
          coverage: 0.45,
          towers: 1,
        },
        lavender: {
          colors: ["#FFFFFF", "#EDE6FF"],
          background: "#CDBFFF",
          opacity: 0.9,
          height: 0.9,
          coverage: 0.45,
          towers: 1,
        },
        blush: {
          colors: ["#FFFFFF", "#FBE3F3"],
          background: "#FFC9EE",
          opacity: 0.9,
          height: 0.75,
          coverage: 0.45,
          towers: 1,
        },
        sunset: {
          colors: ["#FFF3E8", "#F4C7B8"],
          background: "#FF9E7A",
          opacity: 0.9,
          height: 0.85,
          coverage: 0.45,
          towers: 1,
        },
        storm: {
          colors: ["#8A93A1", "#5F6876"],
          background: "#2B313C",
          opacity: 0.75,
          height: 1.1,
          coverage: 0.6,
          towers: 1.4,
        },
      },
      R = [
        { label: "Dusk", value: "dusk" },
        { label: "Daylight", value: "daylight" },
        { label: "Night", value: "night" },
        { label: "Lavender", value: "lavender" },
        { label: "Blush", value: "blush" },
        { label: "Sunset", value: "sunset" },
        { label: "Storm", value: "storm" },
      ],
      E = [
        {
          name: "colors",
          type: "[string, string]",
          default: '["#6D5BC0", "#3A2E7A"]',
          description:
            "Two cloud colours: the lit edges, then the shaded, denser cores.",
        },
        {
          name: "backgroundColor",
          type: "string",
          default: '"#0a0a0a"',
          description:
            'Sky colour behind the clouds. Pass "transparent" to float the clouds over the page.',
        },
        {
          name: "anchor",
          type: '"bottom" | "top"',
          default: '"bottom"',
          description:
            "Edge the cloud bank rises from. Top hangs the clouds from above.",
        },
        {
          name: "height",
          type: "number",
          default: "0.9",
          description:
            "How far the bank reaches into the frame, as a fraction of its height.",
        },
        {
          name: "coverage",
          type: "number",
          default: "0.45",
          description: "How much of the bank is filled with cloud.",
        },
        {
          name: "density",
          type: "number",
          default: "0.55",
          description:
            "Base thickness of the clouds. Lower values leave more sky between puffs.",
        },
        {
          name: "scale",
          type: "number",
          default: "1",
          description:
            "Size of the puffs. Larger values give bigger, calmer clouds.",
        },
        {
          name: "towers",
          type: "number",
          default: "1",
          description:
            "How much the skyline rises into towering clouds and dips between them.",
        },
        {
          name: "opacity",
          type: "number",
          default: "0.7",
          description: "Opacity of the clouds over the sky.",
        },
        {
          name: "wind",
          type: "number",
          default: "0",
          description:
            "Sideways drift. Negative values blow the clouds to the right.",
        },
        {
          name: "billow",
          type: "number",
          default: "1",
          description: "How quickly the puffs churn and change shape.",
        },
        {
          name: "speed",
          type: "number",
          default: "1",
          description: "Overall animation speed. 0 holds the current frame.",
        },
        {
          name: "resolution",
          type: "number",
          default: "0.36",
          description:
            "Render scale relative to the element. The low default keeps the clouds soft and cheap to draw.",
        },
        {
          name: "interactive",
          type: "boolean",
          default: "true",
          description:
            "Moving the pointer through the clouds drags them along like wind, and they settle back.",
        },
        {
          name: "cursorStrength",
          type: "number",
          default: "1",
          description: "How far the pointer drags the clouds. 0 disables it.",
        },
        {
          name: "cursorRadius",
          type: "number",
          default: "0.16",
          description:
            "Size of the area the pointer disturbs, relative to the height.",
        },
        {
          name: "seed",
          type: "number",
          default: "0",
          description: "Changes the cloud formation and skyline.",
        },
        {
          name: "paused",
          type: "boolean",
          default: "false",
          description: "Freezes the drifting clouds.",
        },
        {
          name: "className",
          type: "string",
          default: "—",
          description: "Classes for the root element. Give it a height.",
        },
        {
          name: "style",
          type: "CSSProperties",
          default: "—",
          description: "Inline styles for the root element.",
        },
        {
          name: "children",
          type: "ReactNode",
          default: "—",
          description: "Content layered above the sky.",
        },
      ],
      P = () => {
        let [e, t] = (0, o.I)(),
          a = (0, u.Y)(),
          [i, s] = (0, l.useState)(null),
          d = i ?? ("dark" === a ? "dusk" : "daylight"),
          [c, v] = (0, l.useState)({}),
          f = { ...(T[d] ?? T.dusk), ...c },
          [h, p] = (0, l.useState)("bottom"),
          [m, g] = (0, l.useState)(0.55),
          [y, x] = (0, l.useState)(1),
          [w, b] = (0, l.useState)(0),
          [S, F] = (0, l.useState)(1),
          [C, k] = (0, l.useState)(1),
          [P, B] = (0, l.useState)(0.36),
          [D, L] = (0, l.useState)(1),
          [I, N] = (0, l.useState)(0.16),
          [W, A] = (0, l.useState)(0),
          [M, U] = (0, l.useState)(!0),
          [q, _] = (0, l.useState)(!1),
          Y = (e) => (t) => v((a) => ({ ...a, [e]: t })),
          H = (e) => (t) =>
            v((a) => {
              let r = [...(a.colors ?? f.colors)];
              return ((r[e] = t), { ...a, colors: r });
            });
        return (0, r.jsxs)("div", {
          children: [
            (0, r.jsx)(n.Bg, {}),
            (0, r.jsxs)(n.VX, {
              children: [
                (0, r.jsxs)(n.Ec, {
                  children: [
                    (0, r.jsx)(n.Ch, {
                      onRefresh: t,
                      minHeight: 600,
                      children: (0, r.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, r.jsx)(
                          j,
                          {
                            className: "h-full w-full",
                            colors: f.colors,
                            backgroundColor: f.background,
                            anchor: h,
                            height: f.height,
                            coverage: f.coverage,
                            density: m,
                            scale: y,
                            towers: f.towers,
                            opacity: f.opacity,
                            wind: w,
                            billow: S,
                            speed: C,
                            resolution: P,
                            interactive: M,
                            cursorStrength: D,
                            cursorRadius: I,
                            seed: W,
                            paused: q,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, r.jsxs)(n.IH, {
                      children: [
                        (0, r.jsx)(n.bg, {
                          title: "Preset",
                          value: d,
                          options: R,
                          onChange: (e) => {
                            (s(e), v({}));
                          },
                        }),
                        (0, r.jsx)(n.W7, {
                          title: "Sky",
                          value: f.background,
                          onChange: Y("background"),
                        }),
                        (0, r.jsx)(n.W7, {
                          title: "Light",
                          value: f.colors[0],
                          onChange: H(0),
                        }),
                        (0, r.jsx)(n.W7, {
                          title: "Shade",
                          value: f.colors[1],
                          onChange: H(1),
                        }),
                        (0, r.jsx)(n.bg, {
                          title: "Anchor",
                          value: h,
                          options: [
                            { label: "Bottom", value: "bottom" },
                            { label: "Top", value: "top" },
                          ],
                          onChange: (e) => p(e),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Height",
                          min: 0.2,
                          max: 1.4,
                          step: 0.01,
                          value: f.height,
                          onChange: Y("height"),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Coverage",
                          min: 0,
                          max: 1.2,
                          step: 0.01,
                          value: f.coverage,
                          onChange: Y("coverage"),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Density",
                          min: 0.3,
                          max: 0.9,
                          step: 0.01,
                          value: m,
                          onChange: g,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Scale",
                          min: 0.4,
                          max: 2.5,
                          step: 0.05,
                          value: y,
                          onChange: x,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Towers",
                          min: 0,
                          max: 2.5,
                          step: 0.05,
                          value: f.towers,
                          onChange: Y("towers"),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Opacity",
                          min: 0.1,
                          max: 1,
                          step: 0.01,
                          value: f.opacity,
                          onChange: Y("opacity"),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Wind",
                          min: -2,
                          max: 2,
                          step: 0.05,
                          value: w,
                          onChange: b,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Billow",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: S,
                          onChange: F,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Speed",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: C,
                          onChange: k,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Resolution",
                          min: 0.15,
                          max: 1,
                          step: 0.01,
                          value: P,
                          onChange: B,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Cursor Strength",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: D,
                          onChange: L,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Cursor Radius",
                          min: 0.04,
                          max: 0.4,
                          step: 0.01,
                          value: I,
                          onChange: N,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Seed",
                          min: 0,
                          max: 20,
                          step: 1,
                          value: W,
                          onChange: A,
                        }),
                        (0, r.jsx)(n.tl, {
                          title: "Interactive",
                          checked: M,
                          onChange: U,
                        }),
                        (0, r.jsx)(n.tl, {
                          title: "Paused",
                          checked: q,
                          onChange: _,
                        }),
                      ],
                    }),
                    (0, r.jsx)(n.Ub, { data: E }),
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
