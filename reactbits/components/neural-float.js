/* ReactBits Pro public preview module 49868 for neural-float.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/49868.5bf0910d1887a219.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  49868: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => w }));
    var n = a(95155),
      r = a(12115),
      l = a(30701),
      u = a(56388),
      i = a(90761),
      o = a(81712),
      s = a(3907),
      d = a(2253),
      c = a(90650);
    let m = `
varying vec2 vScreen;

void main() {
  vScreen = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,
      f = `
precision highp float;

varying vec2 vScreen;

uniform vec2 uViewport;
uniform float uClock;
uniform vec3 uCold;
uniform vec3 uHot;
uniform float uStrands;
uniform float uStrandDrift;
uniform float uStrandWidth;
uniform float uHaloWidth;
uniform float uHaloStrength;
uniform float uZoom;
uniform float uSpin;
uniform float uTurbulence;
uniform float uTurbulenceScale;
uniform float uWarp;
uniform float uPulse;
uniform float uPulseSpeed;
uniform float uSegment;
uniform float uSegmentSpeed;
uniform float uCore;
uniform float uCoreFalloff;
uniform float uArms;
uniform float uSwirl;
uniform float uChroma;
uniform float uPosterize;
uniform float uDither;
uniform float uDitherScale;
uniform float uFadeStart;
uniform float uFadeEnd;
uniform float uGamma;
uniform float uGain;
uniform float uOpacity;
uniform vec2 uDrift;
uniform int uOctaves;
uniform sampler2D uNoise;

const float TURN = 6.28318530718;
const float HALF_TURN = 3.14159265359;
const float LATTICE = 0.0078125;

float grain(vec2 p) {
  return texture2D(uNoise, p * LATTICE).r;
}

float turbulence(vec2 p) {
  float sum = 0.0;
  float span = 0.0;
  float gain = 0.5;
  for (int i = 0; i < 5; i++) {
    if (i >= uOctaves) break;
    sum += gain * grain(p);
    span += gain;
    p += p;
    gain *= 0.5;
  }
  return sum / max(span, 0.0001);
}

vec3 tint(float t) {
  float blend = sin(t * HALF_TURN * 0.5) * 0.5 + 0.5;
  float shade = cos(t * TURN) * 0.5 + 0.5;
  return mix(uCold, uHot, blend) * (0.6 + 0.4 * shade);
}

vec2 turn(vec2 p, float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

vec3 strand(vec2 p, float s, float c, float t, float split) {
  vec2 q = vec2(p.x * c - p.y * s, p.x * s + p.y * c);

  if (abs(q.y) > 0.34 + uTurbulence * 0.5 + split) return vec3(0.0);

  float gate = smoothstep(
    0.1,
    0.6,
    sin(q.x * uSegment + t * uSegmentSpeed) * cos(t + q.y * 4.0)
  );
  if (gate <= 0.0) return vec3(0.0);

  q.y += (turbulence(q * uTurbulenceScale + t * 0.5) - 0.5) * uTurbulence;

  vec3 reach = abs(q.y + vec3(split * s, 0.0, -split * s));
  vec3 rim = max(1.0 - reach * 3.0, 0.0);
  vec3 spine = exp(-reach * uStrandWidth) * 1.2
    + exp(-reach * uHaloWidth) * uHaloStrength;

  float pulse = sin(q.x * uPulse + t * uPulseSpeed) * 0.5 + 0.5;

  return spine * rim * rim * pulse * gate;
}

vec3 weave(vec2 p, float t, float split) {
  vec3 sum = vec3(0.0);
  float count = max(uStrands + uStrandDrift * sin(t * 0.3), 1.0);

  for (int i = 0; i < 32; i++) {
    float index = float(i);
    if (index > count) break;

    float fade = clamp(count - index, 0.0, 1.0);
    float id = index / count;
    float angle = id * TURN + t * 0.12;
    float s = sin(angle);
    float c = cos(angle);

    vec3 lit = strand(p, s, c, t + index, split)
      + strand(p, c, -s, t * 1.2 + index, split);
    if (lit.r + lit.g + lit.b <= 0.0) continue;

    sum += tint(id + t * 0.05) * lit * (0.6 + 0.4 * sin(index * 3.0 + t)) * fade;
  }

  return sum;
}

void main() {
  vec2 frag = vScreen * uViewport;
  vec2 p = (frag - 0.5 * uViewport) / uViewport.y;
  p = turn(p, uSpin) / max(uZoom, 0.01);

  float t = uClock * 0.6;

  p += turbulence(p * 2.0 + t) * uWarp;
  p -= uDrift;

  float split = uChroma * (1.0 + 0.66 * sin(t * 0.4));
  vec3 col = weave(p, t, split);

  float reach = length(p);
  float swirl = sin(atan(p.y, p.x) * uArms + t * uSwirl);
  col += tint(t * 0.08) * exp(-reach * uCoreFalloff) * (0.7 + 0.3 * swirl) * uCore;

  float block = max(uDitherScale + sin(t * 0.4) * uDitherScale * 0.75, 1.0);
  float mask = grain(floor(frag / block) * block * 0.3 + t) * uDither;
  col = mix(col, floor(col * uPosterize) / uPosterize, mask);

  col *= 1.0 - smoothstep(uFadeStart, uFadeEnd, reach);
  col = pow(max(col, 0.0), vec3(uGamma)) * uGain;

  float cover = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
  gl_FragColor = vec4(col, cover) * uOpacity;
}
`,
      p = (e, t) => {
        let a = String(e ?? "").trim(),
          n = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(a);
        if (!n) return t;
        let r = n[1];
        return `#${
          3 === r.length
            ? r
                .split("")
                .map((e) => e + e)
                .join("")
            : r
        }`;
      },
      h = () => () => {},
      v = () => window.devicePixelRatio || 1,
      g = (e, t, a) => Math.min(Math.max(e, t), a),
      x = null,
      S = ({
        awake: e,
        ceiling: t,
        readDrift: a,
        colorCold: l,
        colorHot: u,
        strands: i,
        strandDrift: s,
        strandWidth: c,
        haloWidth: h,
        haloStrength: v,
        speed: S,
        zoom: y,
        rotation: b,
        turbulence: w,
        turbulenceScale: C,
        warp: j,
        pulseFrequency: F,
        pulseSpeed: M,
        segmentFrequency: k,
        segmentSpeed: D,
        coreIntensity: P,
        coreFalloff: T,
        swirlArms: H,
        swirlSpeed: W,
        chromaticAberration: E,
        posterize: N,
        dither: q,
        ditherScale: A,
        fadeStart: I,
        fadeEnd: z,
        gamma: R,
        brightness: G,
        opacity: O,
        cursorInteraction: U,
        cursorParallax: L,
        detail: B,
        adaptiveQuality: V,
        targetFps: Q,
        paused: Y,
      }) => {
        let { invalidate: _, setDpr: X, size: Z, viewport: J } = (0, o.C)(),
          $ = (0, r.useRef)(null),
          K = (0, r.useRef)(0),
          ee = (0, r.useRef)({
            scale: t,
            frames: 0,
            span: 0,
            wins: 0,
            roof: 1 / 0,
          }),
          [et, ea] = (0, r.useState)(!1);
        ((0, r.useEffect)(() => {
          let e = window.matchMedia("(prefers-reduced-motion: reduce)"),
            t = () => ea(e.matches);
          return (
            t(),
            e.addEventListener("change", t),
            () => e.removeEventListener("change", t)
          );
        }, []),
          (0, r.useEffect)(() => {
            let e = ee.current;
            ((e.scale = t), (e.roof = 1 / 0), (e.wins = 0), X(t));
          }, [t, X]));
        let en = (0, r.useMemo)(
            () => ({
              uViewport: { value: new d.I9Y(1, 1) },
              uClock: { value: 0 },
              uCold: { value: new d.Q1f("#2659d9") },
              uHot: { value: new d.Q1f("#d966d9") },
              uStrands: { value: 12 },
              uStrandDrift: { value: 6 },
              uStrandWidth: { value: 45 },
              uHaloWidth: { value: 15 },
              uHaloStrength: { value: 0.5 },
              uZoom: { value: 1 },
              uSpin: { value: 0 },
              uTurbulence: { value: 0.15 },
              uTurbulenceScale: { value: 4 },
              uWarp: { value: 0.05 },
              uPulse: { value: 18 },
              uPulseSpeed: { value: 5 },
              uSegment: { value: 6 },
              uSegmentSpeed: { value: 2 },
              uCore: { value: 1.15 },
              uCoreFalloff: { value: 5 },
              uArms: { value: 3 },
              uSwirl: { value: 3 },
              uChroma: { value: 0.006 },
              uPosterize: { value: 6 },
              uDither: { value: 0.3 },
              uDitherScale: { value: 2 },
              uFadeStart: { value: 0.3 },
              uFadeEnd: { value: 1.2 },
              uGamma: { value: 0.9 },
              uGain: { value: 1 },
              uOpacity: { value: 1 },
              uDrift: { value: new d.I9Y(0, 0) },
              uOctaves: { value: 3 },
              uNoise: {
                value: (() => {
                  if (x) return x;
                  let e = new Float32Array(16384);
                  for (let t = 0; t < e.length; t += 1) {
                    let a = Math.imul(0x27d4eb2d ^ t, 0x165667b1);
                    ((a ^= a >>> 15),
                      (a = Math.imul(a, 0x2545f491)),
                      (e[t] = ((a ^ (a >>> 13)) >>> 0) / 0x100000000));
                  }
                  let t = (t, a) =>
                      e[
                        (((a % 128) + 128) % 128) * 128 +
                          (((t % 128) + 128) % 128)
                      ],
                    a = new Uint8Array(262144);
                  for (let e = 0; e < 512; e += 1) {
                    let n = e / 4,
                      r = Math.floor(n),
                      l = n - r,
                      u = l * l * (3 - 2 * l);
                    for (let n = 0; n < 512; n += 1) {
                      let l = n / 4,
                        i = Math.floor(l),
                        o = l - i,
                        s = o * o * (3 - 2 * o),
                        d = t(i, r) + (t(i + 1, r) - t(i, r)) * s,
                        c = t(i, r + 1) + (t(i + 1, r + 1) - t(i, r + 1)) * s;
                      a[512 * e + n] = (d + (c - d) * u) * 255;
                    }
                  }
                  let n = new d.GYF(a, 512, 512, d.VT0, d.OUM);
                  return (
                    (n.wrapS = d.GJx),
                    (n.wrapT = d.GJx),
                    (n.minFilter = d.k6q),
                    (n.magFilter = d.k6q),
                    (n.generateMipmaps = !1),
                    (n.needsUpdate = !0),
                    (x = n),
                    n
                  );
                })(),
              },
            }),
            [],
          ),
          er = (0, r.useMemo)(() => new d.Q1f(p(l, "#2659d9")), [l]),
          el = (0, r.useMemo)(() => new d.Q1f(p(u, "#d966d9")), [u]);
        return (
          (0, o.D)((n, r) => {
            let l = $.current;
            if (!l || !e) return;
            Y || et || (K.current += Math.min(r, 0.05) * S);
            let u = a();
            ((u.x += (u.targetX - u.x) * 0.06),
              (u.y += (u.targetY - u.y) * 0.06));
            let o = l.uniforms;
            (o.uViewport.value.set(
              Math.max(Z.width, 1) * J.dpr,
              Math.max(Z.height, 1) * J.dpr,
            ),
              (o.uClock.value = K.current),
              o.uCold.value.copy(er),
              o.uHot.value.copy(el),
              (o.uStrands.value = g(i, 1, 30)),
              (o.uStrandDrift.value = g(s, 0, 12)),
              (o.uStrandWidth.value = Math.max(1, 45 / Math.max(c, 0.05))),
              (o.uHaloWidth.value = Math.max(1, 15 / Math.max(h, 0.05))),
              (o.uHaloStrength.value = Math.max(v, 0)),
              (o.uZoom.value = Math.max(y, 0.05)),
              (o.uSpin.value = (b * Math.PI) / 180),
              (o.uTurbulence.value = w),
              (o.uTurbulenceScale.value = Math.max(C, 0)),
              (o.uWarp.value = j),
              (o.uPulse.value = F),
              (o.uPulseSpeed.value = M),
              (o.uSegment.value = k),
              (o.uSegmentSpeed.value = D),
              (o.uCore.value = Math.max(P, 0)),
              (o.uCoreFalloff.value = Math.max(T, 0.01)),
              (o.uArms.value = H),
              (o.uSwirl.value = W),
              (o.uChroma.value = Math.max(E, 0)),
              (o.uPosterize.value = Math.max(Math.round(N), 1)),
              (o.uDither.value = g(q, 0, 1)),
              (o.uDitherScale.value = Math.max(A, 1)),
              (o.uFadeStart.value = I),
              (o.uFadeEnd.value = Math.max(z, I + 0.01)),
              (o.uGamma.value = Math.max(R, 0.05)),
              (o.uGain.value = Math.max(G, 0)),
              (o.uOpacity.value = g(O, 0, 1)),
              (o.uOctaves.value = g(Math.round(B), 1, 5)),
              U
                ? o.uDrift.value.set(u.x * L, u.y * L)
                : o.uDrift.value.set(0, 0));
            let d = ee.current;
            if (((d.frames += 1), (d.span += r), d.span >= 0.75)) {
              let e = d.frames / d.span;
              if (((d.frames = 0), (d.span = 0), V && K.current > 0.5))
                if (e < 0.85 * Q && d.scale > 0.5)
                  ((d.roof = d.scale),
                    (d.scale = Math.max(0.5, 0.75 * d.scale)),
                    (d.wins = 0),
                    X(d.scale));
                else if (e >= 0.95 * Q && d.scale < t) {
                  d.wins += 1;
                  let e = Math.min(t, 1.25 * d.scale);
                  d.wins >= 3 &&
                    e < 0.98 * d.roof &&
                    ((d.scale = e), (d.wins = 0), X(e));
                } else d.wins = 0;
            }
            _();
          }),
          (0, n.jsxs)("mesh", {
            frustumCulled: !1,
            children: [
              (0, n.jsx)("planeGeometry", { args: [2, 2] }),
              (0, n.jsx)("shaderMaterial", {
                ref: $,
                uniforms: en,
                vertexShader: m,
                fragmentShader: f,
                transparent: !0,
                premultipliedAlpha: !0,
                depthTest: !1,
                depthWrite: !1,
              }),
            ],
          })
        );
      },
      y = ({
        width: e = "100%",
        height: t = "100%",
        className: a,
        children: l,
        colorCold: u = "#2659d9",
        colorHot: i = "#d966d9",
        backgroundColor: o = "#0a0a0a",
        strands: d = 12,
        strandDrift: m = 6,
        strandWidth: f = 1,
        haloWidth: p = 1,
        haloStrength: x = 0.5,
        speed: y = 1,
        zoom: b = 1,
        rotation: w = 0,
        turbulence: C = 0.15,
        turbulenceScale: j = 4,
        warp: F = 0.05,
        pulseFrequency: M = 18,
        pulseSpeed: k = 5,
        segmentFrequency: D = 6,
        segmentSpeed: P = 2,
        coreIntensity: T = 1.15,
        coreFalloff: H = 5,
        swirlArms: W = 3,
        swirlSpeed: E = 3,
        chromaticAberration: N = 0.006,
        posterize: q = 6,
        dither: A = 0.3,
        ditherScale: I = 2,
        fadeStart: z = 0.3,
        fadeEnd: R = 1.2,
        gamma: G = 0.9,
        brightness: O = 1,
        opacity: U = 1,
        cursorInteraction: L = !0,
        cursorParallax: B = 0.12,
        detail: V = 3,
        adaptiveQuality: Q = !0,
        targetFps: Y = 60,
        dpr: _ = 2,
        paused: X = !1,
      }) => {
        let Z = (0, r.useRef)(null),
          J = (0, r.useRef)({ x: 0, y: 0, targetX: 0, targetY: 0 }),
          [$, K] = (0, r.useState)(!1),
          ee = (0, r.useSyncExternalStore)(h, v, () => 1);
        (0, r.useEffect)(() => {
          let e = Z.current;
          if (!e) return;
          let t = new IntersectionObserver(([e]) => K(e.isIntersecting), {
            rootMargin: "120px",
          });
          return (t.observe(e), () => t.disconnect());
        }, []);
        let et = (0, r.useCallback)(() => J.current, []),
          ea = (0, r.useCallback)((e) => {
            let t = Z.current;
            if (!t) return;
            let a = t.getBoundingClientRect();
            a.width &&
              a.height &&
              ((J.current.targetX = (e.clientX - a.left) / a.width - 0.5),
              (J.current.targetY = 0.5 - (e.clientY - a.top) / a.height));
          }, []),
          en = (0, r.useCallback)(() => {
            ((J.current.targetX = 0), (J.current.targetY = 0));
          }, []),
          er = (0, r.useMemo)(() => g(Math.min(ee, _), 0.5, 2), [ee, _]);
        return (0, n.jsxs)("div", {
          ref: Z,
          className: (0, c.cn)("relative overflow-hidden", a),
          style: { width: e, height: t, backgroundColor: o },
          onPointerMove: L ? ea : void 0,
          onPointerLeave: L ? en : void 0,
          children: [
            (0, n.jsx)(s.Hl, {
              className: "absolute inset-0",
              dpr: er,
              frameloop: $ ? "always" : "demand",
              gl: {
                antialias: !1,
                alpha: !0,
                powerPreference: "high-performance",
              },
              orthographic: !0,
              children: (0, n.jsx)(S, {
                awake: $,
                ceiling: er,
                readDrift: et,
                colorCold: u,
                colorHot: i,
                strands: d,
                strandDrift: m,
                strandWidth: f,
                haloWidth: p,
                haloStrength: x,
                speed: y,
                zoom: b,
                rotation: w,
                turbulence: C,
                turbulenceScale: j,
                warp: F,
                pulseFrequency: M,
                pulseSpeed: k,
                segmentFrequency: D,
                segmentSpeed: P,
                coreIntensity: T,
                coreFalloff: H,
                swirlArms: W,
                swirlSpeed: E,
                chromaticAberration: N,
                posterize: q,
                dither: A,
                ditherScale: I,
                fadeStart: z,
                fadeEnd: R,
                gamma: G,
                brightness: O,
                opacity: U,
                cursorInteraction: L,
                cursorParallax: B,
                detail: V,
                adaptiveQuality: Q,
                targetFps: Y,
                paused: X,
              }),
            }),
            l
              ? (0, n.jsx)("div", {
                  className: "relative z-10 h-full w-full",
                  children: l,
                })
              : null,
          ],
        });
      },
      b = () => () => {},
      w = () => {
        let [e, t] = (0, i.I)(),
          [a, o] = (0, r.useState)("#2659d9"),
          [s, d] = (0, r.useState)("#d966d9"),
          { resolvedTheme: c } = (0, l.D)(),
          m = (0, r.useSyncExternalStore)(
            b,
            () => !0,
            () => !1,
          ),
          [f, p] = (0, r.useState)(null),
          h = (0, r.useMemo)(
            () => (null !== f ? f : m && "dark" === c ? "#0a0a0a" : "#ffffff"),
            [m, c, f],
          ),
          [v, g] = (0, r.useState)(12),
          [x, S] = (0, r.useState)(6),
          [w, C] = (0, r.useState)(1),
          [j, F] = (0, r.useState)(1),
          [M, k] = (0, r.useState)(0.5),
          [D, P] = (0, r.useState)(1),
          [T, H] = (0, r.useState)(1),
          [W, E] = (0, r.useState)(0),
          [N, q] = (0, r.useState)(0.15),
          [A, I] = (0, r.useState)(4),
          [z, R] = (0, r.useState)(0.05),
          [G, O] = (0, r.useState)(18),
          [U, L] = (0, r.useState)(5),
          [B, V] = (0, r.useState)(6),
          [Q, Y] = (0, r.useState)(2),
          [_, X] = (0, r.useState)(1.15),
          [Z, J] = (0, r.useState)(5),
          [$, K] = (0, r.useState)(3),
          [ee, et] = (0, r.useState)(3),
          [ea, en] = (0, r.useState)(0.006),
          [er, el] = (0, r.useState)(6),
          [eu, ei] = (0, r.useState)(0.3),
          [eo, es] = (0, r.useState)(2),
          [ed, ec] = (0, r.useState)(0.3),
          [em, ef] = (0, r.useState)(1.2),
          [ep, eh] = (0, r.useState)(0.9),
          [ev, eg] = (0, r.useState)(1),
          [ex, eS] = (0, r.useState)(1),
          [ey, eb] = (0, r.useState)(0.12),
          [ew, eC] = (0, r.useState)(3),
          [ej, eF] = (0, r.useState)(!0),
          [eM, ek] = (0, r.useState)(!0),
          [eD, eP] = (0, r.useState)(!1);
        return (0, n.jsxs)("div", {
          children: [
            (0, n.jsx)(u.Bg, {}),
            (0, n.jsxs)(u.VX, {
              children: [
                (0, n.jsxs)(u.Ec, {
                  children: [
                    (0, n.jsx)(u.Ch, {
                      onRefresh: t,
                      minHeight: 500,
                      children: (0, n.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, n.jsx)(
                          y,
                          {
                            colorCold: a,
                            colorHot: s,
                            backgroundColor: h,
                            strands: v,
                            strandDrift: x,
                            strandWidth: w,
                            haloWidth: j,
                            haloStrength: M,
                            speed: D,
                            zoom: T,
                            rotation: W,
                            turbulence: N,
                            turbulenceScale: A,
                            warp: z,
                            pulseFrequency: G,
                            pulseSpeed: U,
                            segmentFrequency: B,
                            segmentSpeed: Q,
                            coreIntensity: _,
                            coreFalloff: Z,
                            swirlArms: $,
                            swirlSpeed: ee,
                            chromaticAberration: ea,
                            posterize: er,
                            dither: eu,
                            ditherScale: eo,
                            fadeStart: ed,
                            fadeEnd: em,
                            gamma: ep,
                            brightness: ev,
                            opacity: ex,
                            cursorInteraction: ej,
                            cursorParallax: ey,
                            detail: ew,
                            adaptiveQuality: eM,
                            paused: eD,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, n.jsxs)(u.IH, {
                      children: [
                        (0, n.jsx)(u.yt, {
                          title: "Strands",
                          min: 1,
                          max: 30,
                          step: 1,
                          value: v,
                          onChange: g,
                        }),
                        (0, n.jsx)(u.yt, {
                          title: "Strand Drift",
                          min: 0,
                          max: 12,
                          step: 1,
                          value: x,
                          onChange: S,
                        }),
                        (0, n.jsx)(u.yt, {
                          title: "Strand Width",
                          min: 0.2,
                          max: 4,
                          step: 0.1,
                          value: w,
                          onChange: C,
                        }),
                        (0, n.jsx)(u.yt, {
                          title: "Halo Width",
                          min: 0.2,
                          max: 4,
                          step: 0.1,
                          value: j,
                          onChange: F,
                        }),
                        (0, n.jsx)(u.yt, {
                          title: "Halo Strength",
                          min: 0,
                          max: 2,
                          step: 0.05,
                          value: M,
                          onChange: k,
                        }),
                        (0, n.jsx)(u.yt, {
                          title: "Speed",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: D,
                          onChange: P,
                        }),
                        (0, n.jsx)(u.yt, {
                          title: "Zoom",
                          min: 0.3,
                          max: 3,
                          step: 0.05,
                          value: T,
                          onChange: H,
                        }),
                        (0, n.jsx)(u.yt, {
                          title: "Rotation",
                          min: 0,
                          max: 360,
                          step: 1,
                          value: W,
                          onChange: E,
                        }),
                        (0, n.jsx)(u.yt, {
                          title: "Turbulence",
                          min: 0,
                          max: 0.6,
                          step: 0.01,
                          value: N,
                          onChange: q,
                        }),
                        (0, n.jsx)(u.yt, {
                          title: "Turbulence Scale",
                          min: 0,
                          max: 12,
                          step: 0.25,
                          value: A,
                          onChange: I,
                        }),
                        (0, n.jsx)(u.yt, {
                          title: "Warp",
                          min: 0,
                          max: 0.25,
                          step: 0.005,
                          value: z,
                          onChange: R,
                        }),
                        (0, n.jsx)(u.yt, {
                          title: "Pulse Frequency",
                          min: 0,
                          max: 60,
                          step: 1,
                          value: G,
                          onChange: O,
                        }),
                        (0, n.jsx)(u.yt, {
                          title: "Pulse Speed",
                          min: 0,
                          max: 20,
                          step: 0.5,
                          value: U,
                          onChange: L,
                        }),
                        (0, n.jsx)(u.yt, {
                          title: "Segment Frequency",
                          min: 0,
                          max: 24,
                          step: 0.5,
                          value: B,
                          onChange: V,
                        }),
                        (0, n.jsx)(u.yt, {
                          title: "Segment Speed",
                          min: 0,
                          max: 10,
                          step: 0.25,
                          value: Q,
                          onChange: Y,
                        }),
                        (0, n.jsx)(u.yt, {
                          title: "Core Intensity",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: _,
                          onChange: X,
                        }),
                        (0, n.jsx)(u.yt, {
                          title: "Core Falloff",
                          min: 1,
                          max: 20,
                          step: 0.5,
                          value: Z,
                          onChange: J,
                        }),
                        (0, n.jsx)(u.yt, {
                          title: "Swirl Arms",
                          min: 0,
                          max: 10,
                          step: 1,
                          value: $,
                          onChange: K,
                        }),
                        (0, n.jsx)(u.yt, {
                          title: "Swirl Speed",
                          min: 0,
                          max: 10,
                          step: 0.25,
                          value: ee,
                          onChange: et,
                        }),
                        (0, n.jsx)(u.yt, {
                          title: "Chromatic Aberration",
                          min: 0,
                          max: 0.05,
                          step: 0.001,
                          value: ea,
                          onChange: en,
                        }),
                        (0, n.jsx)(u.yt, {
                          title: "Posterize",
                          min: 2,
                          max: 32,
                          step: 1,
                          value: er,
                          onChange: el,
                        }),
                        (0, n.jsx)(u.yt, {
                          title: "Dither",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: eu,
                          onChange: ei,
                        }),
                        (0, n.jsx)(u.yt, {
                          title: "Dither Scale",
                          min: 1,
                          max: 16,
                          step: 1,
                          value: eo,
                          onChange: es,
                        }),
                        (0, n.jsx)(u.yt, {
                          title: "Fade Start",
                          min: 0,
                          max: 1.5,
                          step: 0.05,
                          value: ed,
                          onChange: ec,
                        }),
                        (0, n.jsx)(u.yt, {
                          title: "Fade End",
                          min: 0.2,
                          max: 2.5,
                          step: 0.05,
                          value: em,
                          onChange: ef,
                        }),
                        (0, n.jsx)(u.yt, {
                          title: "Gamma",
                          min: 0.3,
                          max: 2.2,
                          step: 0.05,
                          value: ep,
                          onChange: eh,
                        }),
                        (0, n.jsx)(u.yt, {
                          title: "Brightness",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: ev,
                          onChange: eg,
                        }),
                        (0, n.jsx)(u.yt, {
                          title: "Opacity",
                          min: 0.05,
                          max: 1,
                          step: 0.05,
                          value: ex,
                          onChange: eS,
                        }),
                        (0, n.jsx)(u.yt, {
                          title: "Cursor Parallax",
                          min: 0,
                          max: 0.6,
                          step: 0.02,
                          value: ey,
                          onChange: eb,
                        }),
                        (0, n.jsx)(u.yt, {
                          title: "Detail",
                          min: 1,
                          max: 5,
                          step: 1,
                          value: ew,
                          onChange: eC,
                        }),
                        (0, n.jsx)(u.W7, {
                          title: "Cold Color",
                          value: a,
                          onChange: o,
                        }),
                        (0, n.jsx)(u.W7, {
                          title: "Hot Color",
                          value: s,
                          onChange: d,
                        }),
                        (0, n.jsx)(u.W7, {
                          title: "Background",
                          value: h,
                          onChange: p,
                        }),
                        (0, n.jsx)(u.tl, {
                          title: "Cursor Interaction",
                          checked: ej,
                          onChange: eF,
                        }),
                        (0, n.jsx)(u.tl, {
                          title: "Adaptive Quality",
                          checked: eM,
                          onChange: ek,
                        }),
                        (0, n.jsx)(u.tl, {
                          title: "Paused",
                          checked: eD,
                          onChange: eP,
                        }),
                      ],
                    }),
                    (0, n.jsx)(u.Ub, {
                      data: [
                        {
                          name: "colorCold",
                          type: "string",
                          default: '"#2659d9"',
                          description: "Cool end of the strand gradient.",
                        },
                        {
                          name: "colorHot",
                          type: "string",
                          default: '"#d966d9"',
                          description: "Warm end of the strand gradient.",
                        },
                        {
                          name: "backgroundColor",
                          type: "string",
                          default: '"#0a0a0a"',
                          description: "Fill behind the field.",
                        },
                        {
                          name: "strands",
                          type: "number",
                          default: "12",
                          description:
                            "Number of strand pairs woven through the field.",
                        },
                        {
                          name: "strandDrift",
                          type: "number",
                          default: "6",
                          description:
                            "How far the strand count breathes above and below its base.",
                        },
                        {
                          name: "strandWidth",
                          type: "number",
                          default: "1",
                          description:
                            "Tightness of the bright center of each strand.",
                        },
                        {
                          name: "haloWidth",
                          type: "number",
                          default: "1",
                          description: "Spread of the halo around each strand.",
                        },
                        {
                          name: "haloStrength",
                          type: "number",
                          default: "0.5",
                          description: "Brightness of that halo.",
                        },
                        {
                          name: "speed",
                          type: "number",
                          default: "1",
                          description: "Global time multiplier.",
                        },
                        {
                          name: "zoom",
                          type: "number",
                          default: "1",
                          description:
                            "Field magnification, where higher values pull the weave closer.",
                        },
                        {
                          name: "rotation",
                          type: "number",
                          default: "0",
                          description:
                            "Rotation of the whole field in degrees.",
                        },
                        {
                          name: "turbulence",
                          type: "number",
                          default: "0.15",
                          description:
                            "How far turbulence bends each strand off its axis.",
                        },
                        {
                          name: "turbulenceScale",
                          type: "number",
                          default: "4",
                          description:
                            "Frequency of the turbulence that bends the strands.",
                        },
                        {
                          name: "warp",
                          type: "number",
                          default: "0.05",
                          description:
                            "Whole-field warp applied before the strands are drawn.",
                        },
                        {
                          name: "pulseFrequency",
                          type: "number",
                          default: "18",
                          description:
                            "Frequency of the light pulses running along each strand.",
                        },
                        {
                          name: "pulseSpeed",
                          type: "number",
                          default: "5",
                          description: "Travel speed of those pulses.",
                        },
                        {
                          name: "segmentFrequency",
                          type: "number",
                          default: "6",
                          description:
                            "Frequency of the mask that breaks strands into segments.",
                        },
                        {
                          name: "segmentSpeed",
                          type: "number",
                          default: "2",
                          description: "Drift speed of that mask.",
                        },
                        {
                          name: "coreIntensity",
                          type: "number",
                          default: "1.15",
                          description:
                            "Brightness of the plasma core at the center.",
                        },
                        {
                          name: "coreFalloff",
                          type: "number",
                          default: "5",
                          description:
                            "How quickly the core falls away from the center.",
                        },
                        {
                          name: "swirlArms",
                          type: "number",
                          default: "3",
                          description: "Number of arms in the core swirl.",
                        },
                        {
                          name: "swirlSpeed",
                          type: "number",
                          default: "3",
                          description: "Rotation speed of the core swirl.",
                        },
                        {
                          name: "chromaticAberration",
                          type: "number",
                          default: "0.006",
                          description: "Lens-style color separation.",
                        },
                        {
                          name: "posterize",
                          type: "number",
                          default: "6",
                          description:
                            "Posterization steps, where lower values band harder.",
                        },
                        {
                          name: "dither",
                          type: "number",
                          default: "0.3",
                          description:
                            "How much of the posterized image bleeds through.",
                        },
                        {
                          name: "ditherScale",
                          type: "number",
                          default: "2",
                          description:
                            "Block size of the posterize sampling grid.",
                        },
                        {
                          name: "fadeStart",
                          type: "number",
                          default: "0.3",
                          description:
                            "Distance at which the field starts fading out.",
                        },
                        {
                          name: "fadeEnd",
                          type: "number",
                          default: "1.2",
                          description:
                            "Distance at which the field has fully faded.",
                        },
                        {
                          name: "gamma",
                          type: "number",
                          default: "0.9",
                          description:
                            "Output gamma, where lower values lift the shadows.",
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
                          description: "Master alpha from 0 to 1.",
                        },
                        {
                          name: "cursorInteraction",
                          type: "boolean",
                          default: "true",
                          description: "Let the field drift toward the cursor.",
                        },
                        {
                          name: "cursorParallax",
                          type: "number",
                          default: "0.12",
                          description:
                            "How far the field drifts toward the cursor.",
                        },
                        {
                          name: "detail",
                          type: "number",
                          default: "3",
                          description:
                            "Turbulence octaves, the main quality and cost dial.",
                        },
                        {
                          name: "adaptiveQuality",
                          type: "boolean",
                          default: "true",
                          description:
                            "Drop resolution automatically to hold the frame rate.",
                        },
                        {
                          name: "targetFps",
                          type: "number",
                          default: "60",
                          description:
                            "Frame rate the adaptive scaler aims for.",
                        },
                        {
                          name: "dpr",
                          type: "number",
                          default: "2",
                          description:
                            "Upper bound on device pixel ratio, clamped to the real screen density.",
                        },
                        {
                          name: "paused",
                          type: "boolean",
                          default: "false",
                          description: "Freeze all motion.",
                        },
                        {
                          name: "children",
                          type: "ReactNode",
                          default: "undefined",
                          description: "Content rendered above the field.",
                        },
                        {
                          name: "width",
                          type: "number | string",
                          default: '"100%"',
                          description: "Container width.",
                        },
                        {
                          name: "height",
                          type: "number | string",
                          default: '"100%"',
                          description: "Container height.",
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
                (0, n.jsx)(u.lT, { children: (0, n.jsx)(u.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
