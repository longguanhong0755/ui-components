/* ReactBits Pro public preview module 35949 for particle-morph.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/35949.d8b27a2e8b13906a.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  35949: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => U }));
    var r = a(95155),
      o = a(12115),
      l = a(56388),
      i = a(86049),
      n = a(90761),
      s = a(81712),
      u = a(3907),
      c = a(2253),
      m = a(90650);
    let d = `
#define PI 3.14159265
#define TAU 6.2831853

vec4 hash4(vec2 p) {
  vec4 q = vec4(
    dot(p, vec2(127.1, 311.7)),
    dot(p, vec2(269.5, 183.3)),
    dot(p, vec2(419.2, 371.9)),
    dot(p, vec2(97.3, 233.1))
  );
  return fract(sin(q) * 43758.5453);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n00 = hash4(i).x;
  float n10 = hash4(i + vec2(1.0, 0.0)).x;
  float n01 = hash4(i + vec2(0.0, 1.0)).x;
  float n11 = hash4(i + vec2(1.0, 1.0)).x;
  return mix(mix(n00, n10, f.x), mix(n01, n11, f.x), f.y);
}



vec2 curl(vec2 p) {
  const float e = 0.08;
  float dy = vnoise(p + vec2(0.0, e)) - vnoise(p - vec2(0.0, e));
  float dx = vnoise(p + vec2(e, 0.0)) - vnoise(p - vec2(e, 0.0));
  return vec2(dy, -dx) / (2.0 * e);
}

vec2 fitToFrame(vec2 uv, float imageAspect, float frameAspect) {
  vec2 extent = imageAspect > frameAspect
    ? vec2(frameAspect, frameAspect / imageAspect)
    : vec2(imageAspect, 1.0);
  return vec2(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0) * extent;
}
`,
      p = `
uniform sampler2D tFromPos;
uniform sampler2D tToPos;
uniform sampler2D tFromColor;
uniform sampler2D tToColor;
uniform float uFromAspect;
uniform float uToAspect;
uniform float uFromIsFrame;
uniform float uFrameAspect;
uniform float uProgress;
uniform float uTime;
uniform float uDispersion;
uniform float uChaos;
uniform float uMotion;
uniform float uIdle;
uniform float uIdleDrift;
uniform float uIdleSpeed;

struct MorphSample {
  vec2 pos;
  vec3 color;
  float t;
  float size;
  float alpha;
  float depth;
};

MorphSample morphAt(vec2 cell) {
  vec4 seed = hash4(cell * 1024.0 + 13.7);
  vec4 fromRaw = texture(tFromPos, cell);
  vec4 toRaw = texture(tToPos, cell);

  vec2 a = uFromIsFrame > 0.5
    ? fromRaw.xy
    : fitToFrame(fromRaw.xy, uFromAspect, uFrameAspect);
  vec2 b = fitToFrame(toRaw.xy, uToAspect, uFrameAspect);





  float family = floor(vnoise(a * 2.4 + 17.0) * 3.0);
  vec2 shift = vec2(family * 7.31 + uTime * 0.05, family * 3.17 - uTime * 0.035);



  float depth = uFromIsFrame > 0.5 ? toRaw.z : 0.5 * (fromRaw.z + toRaw.z);
  float peel = clamp(depth * 0.8 + (vnoise(a * 2.6 + shift) - 0.5) * 0.3 + seed.x * 0.04, 0.0, 1.0);
  float phase = mix(seed.x, peel, uChaos);
  float stagger = 0.35 * uMotion + 0.7 * uChaos;
  float t = smoothstep(0.0, 1.0, clamp(uProgress * (1.0 + stagger) - phase * stagger, 0.0, 1.0));
  float arc = sin(t * PI);

  vec2 pos = mix(a, b, t);

  if (uChaos > 0.0) {



    float hang = pow(max(arc, 0.0), 0.6);
    float handoff = smoothstep(0.3, 0.7, t);
    vec2 base = mix(a, b, handoff);
    float reach = 0.55 + 0.45 * vnoise(base * 3.1 + shift * 0.5) + 0.04 * seed.w;
    float travel = hang * uChaos * reach * 0.17;

    vec2 pa = a;
    vec2 pb = b;
    vec2 outFlow = vec2(0.0);
    vec2 inFlow = vec2(0.0);
    for (int i = 0; i < 5; i++) {
      vec2 va = curl((pa + shift) * 1.15) + curl((pa - shift * 0.7) * 2.8) * 0.22;
      float awayA = length(pa);
      va += (awayA > 1e-4 ? pa / awayA : vec2(0.0)) * 0.3;
      va = normalize(va + vec2(1e-5, 0.0)) * travel;
      pa += va;
      outFlow += va;

      vec2 vb = curl((pb + shift + 5.0) * 1.15) + curl((pb - shift * 0.7 - 5.0) * 2.8) * 0.22;
      float awayB = length(pb);
      vb += (awayB > 1e-4 ? pb / awayB : vec2(0.0)) * 0.3;
      vb = normalize(vb + vec2(1e-5, 0.0)) * travel;
      pb += vb;
      inFlow += vb;
    }
    pos = base + mix(outFlow, inFlow, handoff) * uMotion;
  }

  vec2 dir = b - a;
  float len = length(dir);
  vec2 perp = len > 1e-5 ? vec2(-dir.y, dir.x) / len : vec2(0.0, 1.0);
  float bow = (seed.y * 2.0 - 1.0) * (0.08 + 0.3 * len) * uDispersion;

  float turn = seed.w > 0.5 ? 1.0 : -1.0;
  float spin = seed.z * TAU + turn * (t * TAU * (0.6 + seed.x * 0.8) + uTime * 0.6);
  vec2 orbit = vec2(cos(spin), sin(spin)) * (0.02 + 0.08 * seed.w) * uDispersion;


  pos += (perp * bow + orbit) * arc * uMotion * (1.0 - 0.85 * uChaos);



  float clockIdle = uTime * uIdleSpeed;
  float loopAngle = clockIdle * (0.5 + seed.y * 0.9) + seed.z * TAU;
  vec2 loop = vec2(cos(loopAngle), sin(loopAngle) * 0.7) * (0.004 + 0.006 * seed.w);
  vec2 sway = vec2(
    sin(clockIdle * 0.55 + pos.y * 1.6 + seed.x * 0.5),
    cos(clockIdle * 0.42 + pos.x * 1.3) * 0.6
  ) * 0.008;
  pos += (loop + sway) * uIdleDrift * (1.0 - arc) * uMotion * uIdle;

  vec4 fromColor = texture(tFromColor, cell);
  vec4 toColor = texture(tToColor, cell);
  vec3 color = mix(fromColor.rgb, toColor.rgb, t);
  return MorphSample(pos, color, t, mix(fromRaw.w, toRaw.w, t), mix(fromColor.a, toColor.a, t), mix(fromRaw.z, toRaw.z, t));
}
`,
      f = `precision highp float;

in vec3 position;
in vec2 uv;

out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}`,
      h = `precision highp float;

in vec2 vUv;

layout(location = 0) out vec4 outPos;
layout(location = 1) out vec4 outColor;

${d}
${p}

void main() {
  MorphSample m = morphAt(vUv);
  outPos = vec4(m.pos, m.depth, m.size);
  outColor = vec4(m.color, m.alpha);
}`,
      v = `precision highp float;

uniform sampler2D tDisp;
uniform vec2 uPointer;
uniform float uPointerActive;
uniform float uPointerRadius;
uniform float uPointerStrength;
uniform float uPointerSpeed;
uniform float uDt;

in vec2 vUv;

out vec4 outDisp;

${d}
${p}

void main() {
  vec4 state = texture(tDisp, vUv);
  vec2 d = state.xy;
  vec2 v = state.zw;

  MorphSample m = morphAt(vUv);
  vec4 seed = hash4(vUv * 1024.0 + 13.7);

  vec2 rel = m.pos + d - uPointer;
  float dist = length(rel);
  float falloff = 1.0 - smoothstep(0.0, uPointerRadius, dist);
  falloff *= falloff;
  vec2 away = dist > 1e-5 ? rel / dist : vec2(1.0, 0.0);

  v += away * falloff * uPointerStrength * uPointerActive
    * (0.6 + 0.8 * seed.x) * (0.35 + uPointerSpeed) * uDt * 6.0;
  v -= d * 14.0 * uDt;
  v *= exp(-5.0 * uDt);
  d += v * uDt;

  outDisp = vec4(d, v);
}`,
      g = `precision highp float;

in vec3 position;

uniform sampler2D tDisp;
uniform float uPointSize;
uniform float uOpacity;
uniform vec3 uColor;
uniform float uUseColor;
uniform vec3 uGradA;
uniform vec3 uGradB;
uniform float uUseGradient;
uniform float uSizeByLum;
uniform float uHalo;
uniform vec2 uLook;
uniform float uTilt;
uniform float uFade;

out vec3 vColor;
out float vAlpha;
out float vCore;
out float vCorePx;

${d}
${p}

void main() {
  MorphSample m = morphAt(position.xy);
  vec4 seed = hash4(position.xy * 1024.0 + 13.7);
  vec2 p = m.pos + texture(tDisp, position.xy).xy;
  float arc = sin(m.t * PI);
  p += uLook * (m.depth - 0.35) * uTilt * 0.07;

  gl_Position = vec4(p.x / uFrameAspect, p.y, 0.0, 1.0);
  float tone = mix(1.0, 0.28 + 0.72 * m.size, uSizeByLum);
  float core = uPointSize * tone * (0.88 + 0.24 * seed.w) * (1.0 + 0.35 * arc * uMotion);
  float spread = 1.0 + uHalo * 1.6;
  gl_PointSize = max(core * spread, 1.0);
  vCore = 1.0 / spread;
  vCorePx = max(core, 0.5);

  vec2 screen = vec2(p.x / uFrameAspect, p.y);
  float along = clamp(0.5 + 0.35 * (screen.x - screen.y) + 0.06 * sin(uTime * 0.4 + screen.x * 2.0), 0.0, 1.0);
  vec3 gradient = mix(uGradA, uGradB, along) * mix(1.0, 0.6 + 0.4 * m.size, uSizeByLum * 0.6);
  vec3 base = mix(m.color, gradient, uUseGradient);
  vColor = mix(base, uColor, uUseColor);
  vAlpha = uOpacity * uFade * m.alpha * (1.0 - 0.25 * arc);
}`,
      x = `precision highp float;

in vec3 vColor;
in float vAlpha;
in float vCore;
in float vCorePx;

uniform float uHalo;

out vec4 fragColor;

void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0 / max(vCore, 0.0001);
  float edge = 2.0 / vCorePx;
  float disc = 1.0 - smoothstep(1.0 - edge, 1.0 + edge * 0.5, r);
  float glow = uHalo > 0.0 ? exp(-pow(max(r - 1.0, 0.0) * 1.6, 2.0)) * 0.3 * uHalo * (1.0 - disc) : 0.0;
  float alpha = (disc + glow) * vAlpha;
  if (alpha < 0.003) discard;
  fragColor = vec4(vColor, alpha);
}`,
      y = `precision highp float;

in vec2 vUv;

uniform sampler2D tInput;
uniform vec2 uStep;

out vec4 fragColor;

void main() {
  vec4 sum = texture(tInput, vUv) * 0.2270270270;
  sum += texture(tInput, vUv + uStep * 1.3846153846) * 0.3162162162;
  sum += texture(tInput, vUv - uStep * 1.3846153846) * 0.3162162162;
  sum += texture(tInput, vUv + uStep * 3.2307692308) * 0.0702702703;
  sum += texture(tInput, vUv - uStep * 3.2307692308) * 0.0702702703;
  fragColor = sum;
}`,
      w = `precision highp float;

in vec2 vUv;

uniform sampler2D tScene;
uniform sampler2D tGlow;
uniform float uGlow;
uniform vec2 uAberration;

out vec4 fragColor;

void main() {
  vec2 dir = vUv - 0.5;
  vec2 shift = dir * uAberration;
  vec4 r = texture(tScene, vUv + shift);
  vec4 g = texture(tScene, vUv);
  vec4 b = texture(tScene, vUv - shift);
  vec4 scene = vec4(r.r, g.g, b.b, max(max(r.a, g.a), b.a));

  vec4 glow = texture(tGlow, vUv) * uGlow * (1.0 - scene.a);
  fragColor = vec4(scene.rgb + glow.rgb, min(scene.a + glow.a, 1.0));
}`;
    function b() {
      return {
        from: null,
        to: null,
        toIndex: -1,
        start: 0,
        progress: 1,
        active: !1,
      };
    }
    function C(e) {
      (e.pos.dispose(), e.color.dispose());
    }
    function M() {
      return {
        tFromPos: { value: null },
        tToPos: { value: null },
        tFromColor: { value: null },
        tToColor: { value: null },
        uFromAspect: { value: 1 },
        uToAspect: { value: 1 },
        uFromIsFrame: { value: 0 },
        uFrameAspect: { value: 1 },
        uProgress: { value: 1 },
        uTime: { value: 0 },
        uDispersion: { value: 1 },
        uChaos: { value: 0 },
        uMotion: { value: 1 },
        uIdle: { value: 1 },
        uIdleDrift: { value: 1 },
        uIdleSpeed: { value: 1 },
      };
    }
    function S(e, t, a, r, o, l, i, n, s) {
      t.from &&
        t.to &&
        ((e.tFromPos.value = t.from.pos),
        (e.tToPos.value = t.to.pos),
        (e.tFromColor.value = t.from.color),
        (e.tToColor.value = t.to.color),
        (e.uFromAspect.value = t.from.aspect),
        (e.uToAspect.value = t.to.aspect),
        (e.uFromIsFrame.value = +!!t.from.isFrame),
        (e.uFrameAspect.value = a),
        (e.uProgress.value = t.progress),
        (e.uTime.value = r),
        (e.uDispersion.value = o),
        (e.uChaos.value = l),
        (e.uMotion.value = i),
        (e.uIdleDrift.value = n),
        (e.uIdleSpeed.value = s));
    }
    function F({
      slots: e,
      grid: t,
      index: a,
      activeFailed: l,
      transitionDuration: i,
      particleSize: n,
      particleOpacity: u,
      dispersion: m,
      chaos: d,
      idleDrift: p,
      idleSpeed: F,
      pointerStrength: T,
      pointerRadius: D,
      glow: A,
      aberration: I,
      color: P,
      layout: R,
      colors: z,
      sizeByLuminance: E,
      halo: j,
      tilt: U,
      reducedMotion: k,
      inView: B,
      root: L,
    }) {
      let G = "matrix" === R ? 0.35 * p : p,
        { gl: W, invalidate: H } = (0, s.C)(),
        Y = (0, o.useRef)("full"),
        O = (0, o.useRef)(0);
      ((0, o.useEffect)(() => {
        let e = 0,
          t = 0,
          a = (r) => {
            if (((e = requestAnimationFrame(a)), !B)) return;
            let o = Y.current;
            "rest" === o ||
              ("idle" === o && r - t < 33.333333333333336 - 1) ||
              ((t = r), H());
          };
        return ((e = requestAnimationFrame(a)), () => cancelAnimationFrame(e));
      }, [B, H]),
        (0, o.useEffect)(() => {
          ((Y.current = "full"), H());
        }));
      let N = (0, o.useRef)({ key: "", map: new Map() });
      (0, o.useEffect)(() => {
        let e = N.current;
        return () => {
          (e.map.forEach(C), e.map.clear(), (e.key = ""));
        };
      }, []);
      let $ = (0, o.useRef)(b()),
        q = (0, o.useRef)(a),
        Q = (0, o.useRef)(0),
        X = (0, o.useRef)(0),
        _ = (0, o.useRef)({
          x: -1e3,
          y: -1e3,
          smoothX: -1e3,
          smoothY: -1e3,
          speed: 0,
          active: 0,
          engaged: !1,
        });
      ((0, o.useEffect)(() => {
        q.current = a;
      }, [a]),
        (0, o.useEffect)(() => {
          let e = L.current ?? W.domElement,
            t = _.current,
            a = (a) => {
              let r,
                o,
                l,
                i,
                n,
                s =
                  ((o = Math.max((r = e.getBoundingClientRect()).width, 1)),
                  (l = Math.max(r.height, 1)),
                  (i = ((a.clientX - r.left) / o) * 2 - 1),
                  (n = ((a.clientY - r.top) / l) * 2 - 1),
                  { x: (o / l) * i, y: -n });
              (t.engaged ||
                ((t.smoothX = s.x), (t.smoothY = s.y), (t.engaged = !0)),
                (t.x = s.x),
                (t.y = s.y));
            },
            r = () => {
              t.engaged = !1;
            };
          return (
            e.addEventListener("pointermove", a),
            e.addEventListener("pointerdown", a),
            e.addEventListener("pointerleave", r),
            e.addEventListener("pointercancel", r),
            () => {
              (e.removeEventListener("pointermove", a),
                e.removeEventListener("pointerdown", a),
                e.removeEventListener("pointerleave", r),
                e.removeEventListener("pointercancel", r));
            }
          );
        }, [L, W]));
      let V = (0, o.useMemo)(
          () => new c.Q1f().setStyle(P ?? "#ffffff", c.Zr2),
          [P],
        ),
        Z = z?.[0],
        J = z?.[1],
        K = (0, o.useMemo)(
          () => [
            new c.Q1f().setStyle(Z ?? "#5227FF", c.Zr2),
            new c.Q1f().setStyle(J ?? Z ?? "#FF9FFC", c.Zr2),
          ],
          [Z, J],
        ),
        ee = (0, o.useRef)(new c.I9Y()),
        et = (0, o.useMemo)(() => {
          let e = t * t,
            a = new Float32Array(3 * e);
          for (let r = 0; r < e; r++)
            ((a[3 * r] = ((r % t) + 0.5) / t),
              (a[3 * r + 1] = (Math.floor(r / t) + 0.5) / t));
          let r = new c.LoY();
          return (r.setAttribute("position", new c.THS(a, 3)), r);
        }, [t]);
      (0, o.useEffect)(() => () => et.dispose(), [et]);
      let ea = (0, o.useMemo)(
        () =>
          new c.D$Q({
            glslVersion: c.Wdf,
            vertexShader: g,
            fragmentShader: x,
            uniforms: {
              ...M(),
              tDisp: { value: null },
              uPointSize: { value: 4 },
              uOpacity: { value: 1 },
              uColor: { value: new c.Q1f("#ffffff") },
              uUseColor: { value: 0 },
              uGradA: { value: new c.Q1f("#5227FF") },
              uGradB: { value: new c.Q1f("#FF9FFC") },
              uUseGradient: { value: 0 },
              uSizeByLum: { value: 0.75 },
              uHalo: { value: 0.4 },
              uLook: { value: new c.I9Y() },
              uTilt: { value: 1 },
              uFade: { value: 0 },
            },
            transparent: !0,
            depthTest: !1,
            depthWrite: !1,
            blending: c.NTi,
          }),
        [],
      );
      (0, o.useEffect)(() => () => ea.dispose(), [ea]);
      let er = (0, o.useRef)(null);
      (0, o.useEffect)(
        () => (
          (er.current = ea),
          () => {
            er.current = null;
          }
        ),
        [ea],
      );
      let eo = (0, o.useRef)(null);
      (0, o.useEffect)(() => {
        let e =
            null !== W.getContext().getExtension("EXT_color_buffer_float")
              ? c.RQf
              : c.ix0,
          a = (a) =>
            new c.nWS(t, t, {
              count: a,
              type: e,
              format: c.GWd,
              minFilter: c.hxR,
              magFilter: c.hxR,
              wrapS: c.ghU,
              wrapT: c.ghU,
              depthBuffer: !1,
              stencilBuffer: !1,
              generateMipmaps: !1,
            }),
          r = [a(2), a(2)],
          o = [a(1), a(1)],
          l = new c.D$Q({
            glslVersion: c.Wdf,
            vertexShader: f,
            fragmentShader: h,
            uniforms: M(),
            depthTest: !1,
            depthWrite: !1,
          });
        l.uniforms.uIdle.value = 0;
        let i = new c.D$Q({
            glslVersion: c.Wdf,
            vertexShader: f,
            fragmentShader: v,
            uniforms: {
              ...M(),
              tDisp: { value: null },
              uPointer: { value: new c.I9Y(-1e3, -1e3) },
              uPointerActive: { value: 0 },
              uPointerRadius: { value: 0.3 },
              uPointerStrength: { value: 1 },
              uPointerSpeed: { value: 0 },
              uDt: { value: 1 / 60 },
            },
            depthTest: !1,
            depthWrite: !1,
          }),
          n = (e, t) =>
            new c.nWS(e, t, {
              type: c.OUM,
              format: c.GWd,
              minFilter: c.k6q,
              magFilter: c.k6q,
              wrapS: c.ghU,
              wrapT: c.ghU,
              depthBuffer: !1,
              stencilBuffer: !1,
              generateMipmaps: !1,
            }),
          s = n(1, 1),
          u = [n(1, 1), n(1, 1)],
          m = new c.D$Q({
            glslVersion: c.Wdf,
            vertexShader: f,
            fragmentShader: y,
            uniforms: {
              tInput: { value: null },
              uStep: { value: new c.I9Y() },
            },
            depthTest: !1,
            depthWrite: !1,
          }),
          d = new c.D$Q({
            glslVersion: c.Wdf,
            vertexShader: f,
            fragmentShader: w,
            uniforms: {
              tScene: { value: null },
              tGlow: { value: null },
              uGlow: { value: 0 },
              uAberration: { value: new c.I9Y() },
            },
            blending: c.XIg,
            depthTest: !1,
            depthWrite: !1,
          }),
          p = new c.bdM(2, 2),
          g = new c.eaF(p, l);
        g.frustumCulled = !1;
        let x = new c.Z58();
        return (
          x.add(g),
          ($.current = b()),
          (eo.current = {
            scene: x,
            camera: new c.i7d(),
            quad: g,
            freezeMaterial: l,
            turbulenceMaterial: i,
            freezeTargets: r,
            freezeFront: 0,
            dispTargets: o,
            dispFront: 0,
            dispCleared: !1,
            dispDirty: !1,
            sceneTarget: s,
            glowTargets: u,
            blurMaterial: m,
            compositeMaterial: d,
            release: () => {
              (r.forEach((e) => e.dispose()),
                o.forEach((e) => e.dispose()),
                s.dispose(),
                u.forEach((e) => e.dispose()),
                l.dispose(),
                i.dispose(),
                m.dispose(),
                d.dispose(),
                p.dispose());
            },
          }),
          () => {
            (eo.current?.release(), (eo.current = null));
          }
        );
      }, [W, t]);
      let el = (0, o.useRef)(new c.I9Y(1, 1)),
        ei = (0, o.useRef)(new c.I9Y(1, 1)),
        en = (0, o.useRef)(new c.Q1f()),
        es = (0, o.useRef)(0);
      return (
        (0, s.D)((a, r) => {
          let o = eo.current,
            s = er.current;
          if (!o || !s) return;
          let p = a.gl,
            f = p.getSize(el.current),
            h = Math.max(f.x, 1) / Math.max(f.y, 1),
            v = Math.min(r, 1 / 30),
            g = +!k,
            x = performance.now(),
            y = k ? 0 : Math.max(i, 1);
          X.current += v;
          let w = X.current,
            M = $.current,
            B = N.current,
            L = `${t}:${R}`;
          B.key !== L && (B.map.forEach(C), B.map.clear(), (B.key = L));
          let W = new Set();
          for (let t of e) "ready" === t.status && W.add(t.sample);
          B.map.forEach((e, t) => {
            W.has(t) || (C(e), B.map.delete(t));
          });
          let H = new Set(B.map.values()),
            Z = (e) => null !== e && !e.isFrame && !H.has(e);
          (Z(M.from) || Z(M.to)) && Object.assign(M, b());
          let J = q.current,
            et = e[J],
            ea = null;
          if (
            (et?.status === "ready" &&
              ((ea = B.map.get(et.sample) ?? null) ||
                ((ea = (function (e, t, a, r) {
                  let o,
                    l = t * t,
                    i =
                      ((o = a >>> 0),
                      () => {
                        let e = (o = (o + 0x6d2b79f5) >>> 0);
                        return (
                          (e = Math.imul(e ^ (e >>> 15), 1 | e)),
                          (((e ^= e + Math.imul(e ^ (e >>> 7), 61 | e)) ^
                            (e >>> 14)) >>>
                            0) /
                            0x100000000
                        );
                      }),
                    n = new Float32Array(4 * l),
                    s = new Uint8Array(4 * l),
                    u = (t, a, r, o, l) => {
                      ((n[4 * t] = a),
                        (n[4 * t + 1] = r),
                        (n[4 * t + 2] = e.depth[o]),
                        (n[4 * t + 3] = e.luminance[o]),
                        (s[4 * t] = e.colors[3 * o]),
                        (s[4 * t + 1] = e.colors[3 * o + 1]),
                        (s[4 * t + 2] = e.colors[3 * o + 2]),
                        (s[4 * t + 3] = 255 * !!l));
                    },
                    m =
                      "matrix" === r
                        ? (function (e, t) {
                            let a = Math.max(
                                1.03 * Math.sqrt(e.count / (0.8660254 * t)),
                                0.5,
                              ),
                              r = [];
                            for (let o = 0; o < 10; o++) {
                              r = [];
                              let o = 0.8660254 * a,
                                l = 0;
                              for (let t = 0.5 * o; t < e.height; t += o, l++) {
                                let o = l % 2 ? 0.5 * a : 0;
                                for (let l = 0.5 * a + o; l < e.width; l += a) {
                                  let a =
                                    e.lookup[
                                      Math.floor(t) * e.width + Math.floor(l)
                                    ];
                                  a >= 0 &&
                                    r.push({
                                      x: l / e.width,
                                      y: t / e.height,
                                      k: a,
                                    });
                                }
                              }
                              if (r.length <= t) break;
                              a *= 1.04;
                            }
                            return r;
                          })(e, l)
                        : [];
                  if (m.length > 0) {
                    let t = m.map((t) => e.depth[t.k] + 0.12 * i()),
                      a = Array.from({ length: m.length }, (e, t) => t).sort(
                        (e, a) => t[e] - t[a],
                      );
                    for (let e = 0; e < l; e++) {
                      let t = e < m.length,
                        r = m[a[t ? e : (7919 * e) % m.length]];
                      u(e, r.x, r.y, r.k, t);
                    }
                  } else {
                    let t = new Float32Array(e.count);
                    for (let a = 0; a < e.count; a++)
                      t[a] = e.depth[a] + 0.12 * i();
                    let a = Uint32Array.from(
                        { length: e.count },
                        (e, t) => t,
                      ).sort((e, a) => t[e] - t[a]),
                      r = 0.5 / e.width,
                      o = 0.5 / e.height;
                    for (let t = 0; t < l; t++) {
                      let n =
                        a[
                          Math.min(
                            e.count - 1,
                            Math.floor(((t + 0.5) / l) * e.count),
                          )
                        ];
                      u(
                        t,
                        e.coords[2 * n] + (2 * i() - 1) * r,
                        e.coords[2 * n + 1] + (2 * i() - 1) * o,
                        n,
                        !0,
                      );
                    }
                  }
                  let d = new c.GYF(n, t, t, c.GWd, c.RQf);
                  ((d.minFilter = c.hxR),
                    (d.magFilter = c.hxR),
                    (d.generateMipmaps = !1),
                    (d.needsUpdate = !0));
                  let p = new c.GYF(s, t, t, c.GWd, c.OUM);
                  return (
                    (p.minFilter = c.hxR),
                    (p.magFilter = c.hxR),
                    (p.generateMipmaps = !1),
                    (p.needsUpdate = !0),
                    { pos: d, color: p, aspect: e.aspect, isFrame: !1 }
                  );
                })(et.sample, t, J + 1, R)),
                B.map.set(et.sample, ea))),
            ea && J !== M.toIndex)
          )
            if (M.to && 0 !== y) {
              if (M.active) {
                let e = 1 - o.freezeFront,
                  t = o.freezeTargets[e];
                (S(o.freezeMaterial.uniforms, M, h, w, m, d, g, G, F),
                  (o.quad.material = o.freezeMaterial),
                  p.setRenderTarget(t),
                  p.render(o.scene, o.camera),
                  p.setRenderTarget(null),
                  (o.freezeFront = e),
                  (M.from = {
                    pos: t.textures[0],
                    color: t.textures[1],
                    aspect: 1,
                    isFrame: !0,
                  }));
              } else M.from = M.to;
              ((M.to = ea),
                (M.toIndex = J),
                (M.start = x),
                (M.progress = 0),
                (M.active = !0));
            } else
              ((M.from = ea),
                (M.to = ea),
                (M.toIndex = J),
                (M.progress = 1),
                (M.active = !1),
                (Q.current = 0));
          M.active &&
            ((M.progress = Math.min((x - M.start) / y, 1)),
            M.progress >= 1 && (M.active = !1));
          let eu = +!!(null !== M.to && !l);
          ((Q.current += (eu - Q.current) * Math.min(1, 6 * v)),
            0.002 > Math.abs(eu - Q.current) && (Q.current = eu));
          let ec = _.current,
            em = ec.engaged && T > 0 && !k ? 1 : 0;
          if (
            ((ec.active += (em - ec.active) * Math.min(1, 8 * v)), ec.engaged)
          ) {
            let e = ec.smoothX,
              t = ec.smoothY;
            ((ec.smoothX += (ec.x - ec.smoothX) * Math.min(1, 14 * v)),
              (ec.smoothY += (ec.y - ec.smoothY) * Math.min(1, 14 * v)));
            let a =
              Math.hypot(ec.smoothX - e, ec.smoothY - t) / Math.max(v, 1e-4);
            ec.speed += (Math.min(a, 2) - ec.speed) * Math.min(1, 6 * v);
          } else ec.speed *= Math.max(0, 1 - 6 * v);
          ec.active > 0.002 && (O.current = x + 2500);
          let ed = x < O.current;
          if (
            (!ed && o.dispCleared && o.dispDirty && (o.dispCleared = !1),
            !o.dispCleared)
          ) {
            p.getClearColor(en.current);
            let e = p.getClearAlpha();
            (p.setClearColor(0, 0),
              o.dispTargets.forEach((e) => {
                (p.setRenderTarget(e), p.clear(!0, !1, !1));
              }),
              p.setRenderTarget(null),
              p.setClearColor(en.current, e),
              (o.dispCleared = !0),
              (o.dispDirty = !1));
          }
          if (M.to && ed) {
            o.dispDirty = !0;
            let e = o.dispTargets[o.dispFront],
              t = o.dispTargets[1 - o.dispFront],
              a = o.turbulenceMaterial.uniforms;
            (S(a, M, h, w, m, d, g, G, F),
              (a.tDisp.value = e.texture),
              a.uPointer.value.set(ec.smoothX, ec.smoothY),
              (a.uPointerActive.value = ec.active),
              (a.uPointerRadius.value = (2 * D) / Math.max(f.y, 1)),
              (a.uPointerStrength.value = T),
              (a.uPointerSpeed.value = ec.speed),
              (a.uDt.value = v),
              (o.quad.material = o.turbulenceMaterial),
              p.setRenderTarget(t),
              p.render(o.scene, o.camera),
              p.setRenderTarget(null),
              (o.dispFront = 1 - o.dispFront));
          }
          let ep = s.uniforms;
          (S(ep, M, h, w, m, d, g, G, F),
            (ep.tDisp.value = o.dispTargets[o.dispFront].texture),
            (ep.uPointSize.value = n * p.getPixelRatio()),
            (ep.uOpacity.value = u),
            ep.uColor.value.copy(V),
            (ep.uUseColor.value = +!!P),
            ep.uGradA.value.copy(K[0]),
            ep.uGradB.value.copy(K[1]),
            (ep.uUseGradient.value = z && !P ? 1 : 0),
            (ep.uSizeByLum.value = Math.min(Math.max(E, 0), 1)),
            (ep.uHalo.value = Math.min(Math.max(j, 0), 3)),
            (ep.uTilt.value = Math.min(Math.max(U, 0), 3)));
          let ef = ec.engaged ? ec.smoothX / Math.max(h, 0.01) : 0,
            eh = ec.engaged ? ec.smoothY : 0,
            ev = k ? 0 : G;
          ((ee.current.x +=
            (ef + 0.25 * Math.sin(0.31 * w) * ev - ee.current.x) *
            Math.min(1, 3 * v)),
            (ee.current.y +=
              (eh + 0.18 * Math.cos(0.23 * w) * ev - ee.current.y) *
              Math.min(1, 3 * v)),
            ep.uLook.value.copy(ee.current),
            (ep.uFade.value = Q.current),
            (s.visible = null !== M.to));
          let eg = null !== ea && J !== M.toIndex,
            ex = Math.max(
              M.active ? Math.sin(M.progress * Math.PI) : 0,
              ec.active,
            );
          if (
            ((es.current += (ex - es.current) * Math.min(1, 5 * v)),
            0.002 > Math.abs(ex - es.current) && (es.current = ex),
            A > 0 || I > 0)
          ) {
            let e = p.getDrawingBufferSize(ei.current),
              t = Math.max(1, Math.round(e.x)),
              r = Math.max(1, Math.round(e.y));
            if (o.sceneTarget.width !== t || o.sceneTarget.height !== r) {
              o.sceneTarget.setSize(t, r);
              let e = Math.max(1, Math.round(0.25 * t)),
                a = Math.max(1, Math.round(0.25 * r));
              o.glowTargets.forEach((t) => t.setSize(e, a));
            }
            (p.setRenderTarget(o.sceneTarget),
              p.clear(!0, !1, !1),
              p.render(a.scene, a.camera));
            let l = o.blurMaterial.uniforms;
            if (((o.quad.material = o.blurMaterial), A > 0)) {
              let [e, t] = o.glowTargets;
              ((l.tInput.value = o.sceneTarget.texture),
                l.uStep.value.set(1 / e.width, 0),
                p.setRenderTarget(e),
                p.render(o.scene, o.camera),
                (l.tInput.value = e.texture),
                l.uStep.value.set(0, 1 / e.height),
                p.setRenderTarget(t),
                p.render(o.scene, o.camera));
            }
            let i = o.compositeMaterial.uniforms;
            ((i.tScene.value = o.sceneTarget.texture),
              (i.tGlow.value = o.glowTargets[1].texture),
              (i.uGlow.value = A * Q.current));
            let n = I * (0.35 + 0.65 * es.current * g);
            (i.uAberration.value.set(
              (2 * n * p.getPixelRatio()) / t,
              (2 * n * p.getPixelRatio()) / r,
            ),
              (o.quad.material = o.compositeMaterial),
              p.setRenderTarget(null),
              p.render(o.scene, o.camera));
          } else (p.setRenderTarget(null), p.render(a.scene, a.camera));
          let ey =
            Q.current !== eu ||
            ec.active > 0.002 ||
            es.current !== ex ||
            (U > 0 && ec.engaged);
          M.active || eg || ey || ed
            ? (Y.current = "full")
            : G > 0 && !k && M.to
              ? (Y.current = "idle")
              : (Y.current = "rest");
        }, 1),
        (0, r.jsx)("points", { geometry: et, material: ea, frustumCulled: !1 })
      );
    }
    let T = ({
        images: e,
        activeIndex: t,
        defaultIndex: a = 0,
        autoplay: l = !0,
        interval: i = 3e3,
        transitionDuration: n = 1800,
        particleDensity: s,
        particleSize: c = 6,
        particleOpacity: d = 0.9,
        dispersion: p = 1,
        chaos: f = 0,
        idleDrift: h = 1,
        idleSpeed: v = 1,
        pointerStrength: g = 1,
        pointerRadius: x = 120,
        glow: y = 0.35,
        aberration: w = 0,
        color: b,
        layout: C = "matrix",
        colors: M,
        sizeByLuminance: S = 0.75,
        halo: T = 0.4,
        tilt: D = 1,
        backgroundColor: A = "#0a0a0a",
        luminanceThreshold: I = 0,
        loop: P = !0,
        onIndexChange: R,
        width: z = "100%",
        height: E = "100%",
        className: j,
        children: U,
        dpr: k = 2,
      }) => {
        let B = (0, o.useRef)(null),
          L = (function (e) {
            let [t, a] = (0, o.useState)(!0);
            return (
              (0, o.useEffect)(() => {
                let t = e.current;
                if (!t) return;
                let r = new IntersectionObserver(([e]) => a(e.isIntersecting), {
                  threshold: 0.01,
                });
                return (r.observe(t), () => r.disconnect());
              }, [e]),
              t
            );
          })(B),
          G = (function (e) {
            let [t, a] = (0, o.useState)({ width: 0, height: 0 });
            return (
              (0, o.useEffect)(() => {
                let t = e.current;
                if (!t) return;
                let r = null,
                  o = () => {
                    let e = t.getBoundingClientRect();
                    a((t) =>
                      t.width === e.width && t.height === e.height
                        ? t
                        : { width: e.width, height: e.height },
                    );
                  };
                o();
                let l = new ResizeObserver(() => {
                  (r && clearTimeout(r), (r = setTimeout(o, 200)));
                });
                return (
                  l.observe(t),
                  () => {
                    (l.disconnect(), r && clearTimeout(r));
                  }
                );
              }, [e]),
              t
            );
          })(B),
          W = (function () {
            let [e, t] = (0, o.useState)(!1);
            return (
              (0, o.useEffect)(() => {
                let e = window.matchMedia("(prefers-reduced-motion: reduce)"),
                  a = () => t(e.matches);
                return (
                  a(),
                  e.addEventListener("change", a),
                  () => e.removeEventListener("change", a)
                );
              }, []),
              e
            );
          })(),
          H = (function (e, t) {
            let a = `${t}
${e.join("\n")}`,
              [r, l] = (0, o.useState)(() => ({
                key: a,
                slots: e.map(() => ({ status: "loading" })),
              }));
            (0, o.useEffect)(() => {
              let r = !0,
                o = e.slice(),
                i = (e, t) => {
                  r &&
                    l((r) => {
                      let l =
                        r.key === a
                          ? r.slots.slice()
                          : o.map(() => ({ status: "loading" }));
                      return ((l[e] = t), { key: a, slots: l });
                    });
                };
              return (
                o.forEach((e, a) => {
                  new Promise((a, r) => {
                    let o = new Image();
                    ((o.crossOrigin = "anonymous"),
                      (o.decoding = "async"),
                      (o.onload = () => {
                        try {
                          a(
                            (function (e, t) {
                              let a = e.naturalWidth || e.width,
                                r = e.naturalHeight || e.height;
                              if (!a || !r)
                                throw Error("Image has no dimensions");
                              let o = Math.min(1, 400 / Math.max(a, r)),
                                l = Math.max(1, Math.round(a * o)),
                                i = Math.max(1, Math.round(r * o)),
                                n = document.createElement("canvas");
                              ((n.width = l), (n.height = i));
                              let s = n.getContext("2d", {
                                willReadFrequently: !0,
                              });
                              if (!s) throw Error("2D context unavailable");
                              s.drawImage(e, 0, 0, l, i);
                              let u = s.getImageData(0, 0, l, i).data,
                                c = 255 * t,
                                m = (e) =>
                                  u[e + 3] > 40 &&
                                  0.2126 * u[e] +
                                    0.7152 * u[e + 1] +
                                    0.0722 * u[e + 2] >=
                                    c,
                                d = 0;
                              for (let e = 0; e < u.length; e += 4) m(e) && d++;
                              if (0 === d)
                                throw Error("Image has no visible pixels");
                              let p = new Float32Array(l * i);
                              for (let e = 0; e < i; e++)
                                for (let t = 0; t < l; t++) {
                                  let a = e * l + t;
                                  if (!m(4 * a)) {
                                    p[a] = 0;
                                    continue;
                                  }
                                  let r =
                                    0 === t ||
                                    0 === e ||
                                    t === l - 1 ||
                                    e === i - 1
                                      ? 1
                                      : 1e9;
                                  (e > 0 &&
                                    ((r = Math.min(r, p[a - l] + 1)),
                                    t > 0 &&
                                      (r = Math.min(r, p[a - l - 1] + 1.4142)),
                                    t < l - 1 &&
                                      (r = Math.min(r, p[a - l + 1] + 1.4142))),
                                    t > 0 && (r = Math.min(r, p[a - 1] + 1)),
                                    (p[a] = r));
                                }
                              let f = 0;
                              for (let e = i - 1; e >= 0; e--)
                                for (let t = l - 1; t >= 0; t--) {
                                  let a = e * l + t;
                                  if (0 === p[a]) continue;
                                  let r = p[a];
                                  (e < i - 1 &&
                                    ((r = Math.min(r, p[a + l] + 1)),
                                    t > 0 &&
                                      (r = Math.min(r, p[a + l - 1] + 1.4142)),
                                    t < l - 1 &&
                                      (r = Math.min(r, p[a + l + 1] + 1.4142))),
                                    t < l - 1 &&
                                      (r = Math.min(r, p[a + 1] + 1)),
                                    (p[a] = r),
                                    r > f && (f = r));
                                }
                              let h = new Float32Array(2 * d),
                                v = new Float32Array(d),
                                g = new Uint8Array(3 * d),
                                x = new Float32Array(d),
                                y = new Int32Array(l * i).fill(-1),
                                w = 0;
                              for (let e = 0; e < i; e++)
                                for (let t = 0; t < l; t++) {
                                  let a = e * l + t,
                                    r = 4 * a;
                                  m(r) &&
                                    ((h[2 * w] = (t + 0.5) / l),
                                    (h[2 * w + 1] = (e + 0.5) / i),
                                    (v[w] = f > 0 ? p[a] / f : 0),
                                    (g[3 * w] = u[r]),
                                    (g[3 * w + 1] = u[r + 1]),
                                    (g[3 * w + 2] = u[r + 2]),
                                    (x[w] =
                                      (0.2126 * u[r] +
                                        0.7152 * u[r + 1] +
                                        0.0722 * u[r + 2]) /
                                      255),
                                    (y[a] = w),
                                    w++);
                                }
                              return {
                                aspect: a / r,
                                count: d,
                                coords: h,
                                depth: v,
                                colors: g,
                                luminance: x,
                                lookup: y,
                                width: l,
                                height: i,
                              };
                            })(o, t),
                          );
                        } catch (e) {
                          r(e);
                        }
                      }),
                      (o.onerror = () => r(Error(`Failed to load ${e}`))),
                      (o.src = e));
                  })
                    .then((e) => i(a, { status: "ready", sample: e }))
                    .catch(() => i(a, { status: "failed" }));
                }),
                () => {
                  r = !1;
                }
              );
            }, [a]);
            let i = (0, o.useMemo)(
              () => e.map(() => ({ status: "loading" })),
              [a],
            );
            return r.key === a ? r.slots : i;
          })(e, I),
          [Y, O] = (function (e, t, a, r) {
            let [l, i] = (0, o.useState)(t),
              n = void 0 !== e,
              s = n ? e : l,
              u = a > 0 ? Math.min(Math.max(Math.round(s), 0), a - 1) : 0,
              c = (0, o.useRef)(r);
            return (
              (0, o.useEffect)(() => {
                c.current = r;
              }, [r]),
              [
                u,
                (0, o.useCallback)(
                  (e) => {
                    (n || i(e), c.current?.(e));
                  },
                  [n],
                ),
              ]
            );
          })(t, a, e.length, R),
          N = s ?? ("matrix" === C ? 3 : 80),
          $ = (0, o.useMemo)(
            () =>
              Math.min(
                512,
                Math.max(
                  16,
                  Math.ceil(
                    Math.sqrt(
                      Math.max((Math.max(G.width * G.height, 1) / 1e3) * N, 1),
                    ),
                  ),
                ),
              ),
            [G.width, G.height, N],
          );
        (0, o.useEffect)(() => {
          if (!l || e.length < 2 || !L) return;
          let t = e.length - 1;
          if (Y >= t && !P) return;
          let a = setTimeout(() => O(Y >= t ? 0 : Y + 1), i + (W ? 0 : n));
          return () => clearTimeout(a);
        }, [l, e.length, Y, i, n, P, L, W, O]);
        let q = H[Y]?.status === "failed";
        return (0, r.jsxs)("div", {
          ref: B,
          className: (0, m.cn)("relative overflow-hidden", j),
          style: { width: z, height: E, backgroundColor: A },
          children: [
            (0, r.jsx)(u.Hl, {
              className: "absolute inset-0",
              dpr: [1, Math.min(Math.max(k, 1), 2)],
              frameloop: "demand",
              gl: {
                antialias: !1,
                alpha: !0,
                depth: !1,
                powerPreference: "high-performance",
              },
              children:
                G.width > 0 &&
                (0, r.jsx)(F, {
                  slots: H,
                  grid: $,
                  index: Y,
                  activeFailed: q,
                  transitionDuration: n,
                  particleSize: c,
                  particleOpacity: d,
                  dispersion: p,
                  chaos: f,
                  idleDrift: h,
                  idleSpeed: v,
                  pointerStrength: g,
                  pointerRadius: x,
                  glow: y,
                  aberration: w,
                  color: b,
                  layout: C,
                  colors: M,
                  sizeByLuminance: S,
                  halo: T,
                  tilt: D,
                  reducedMotion: W,
                  inView: L,
                  root: B,
                }),
            }),
            e.map((e, t) =>
              H[t]?.status === "failed"
                ? (0, r.jsx)(
                    "img",
                    {
                      src: e,
                      alt: "",
                      "aria-hidden": !0,
                      draggable: !1,
                      className: (0, m.cn)(
                        "pointer-events-none absolute inset-0 h-full w-full select-none object-contain transition-opacity duration-500",
                        t === Y ? "opacity-100" : "opacity-0",
                      ),
                    },
                    `${t}-${e}`,
                  )
                : null,
            ),
            U && (0, r.jsx)("div", { className: "relative z-10", children: U }),
          ],
        });
      },
      D = [
        "/images/morph/cube.svg",
        "/images/morph/aperture.svg",
        "/images/morph/stack.svg",
      ],
      A = [
        { label: "Cube", value: "0" },
        { label: "Aperture", value: "1" },
        { label: "Stack", value: "2" },
      ],
      I = {
        layout: "matrix",
        colorMode: "gradient",
        colors: ["#5227FF", "#FF9FFC"],
        particleDensity: 3,
        particleSize: 6,
        sizeByLuminance: 0.75,
        halo: 0.4,
        glow: 0.35,
        aberration: 0,
        chaos: 0,
        dispersion: 1,
      },
      P = {
        matrix: I,
        halftone: {
          ...I,
          colorMode: "solid",
          particleDensity: 4,
          particleSize: 6.5,
          sizeByLuminance: 1,
          halo: 0,
          glow: 0,
        },
        neon: {
          ...I,
          colors: ["#22D3EE", "#F472B6"],
          particleDensity: 2.5,
          particleSize: 5,
          halo: 0.9,
          glow: 0.7,
        },
        stardust: {
          ...I,
          layout: "scatter",
          colors: ["#B19EEF", "#FF9FFC"],
          particleDensity: 60,
          particleSize: 2,
          sizeByLuminance: 0.3,
          halo: 0.6,
          glow: 0.5,
        },
        chaos: { ...I, chaos: 1, dispersion: 1.4 },
        sunset: { ...I, colors: ["#FF5F6D", "#FFC371"], halo: 0.5 },
        mint: {
          ...I,
          colors: ["#34D399", "#22D3EE"],
          particleDensity: 4.5,
          particleSize: 5,
        },
        original: {
          ...I,
          layout: "scatter",
          colorMode: "image",
          particleDensity: 80,
          particleSize: 2,
          sizeByLuminance: 0,
          halo: 0,
          glow: 0.6,
          aberration: 1.5,
        },
      },
      R = [
        { label: "Dot Matrix", value: "matrix" },
        { label: "Halftone", value: "halftone" },
        { label: "Neon", value: "neon" },
        { label: "Stardust", value: "stardust" },
        { label: "Chaos", value: "chaos" },
        { label: "Sunset", value: "sunset" },
        { label: "Mint", value: "mint" },
        { label: "Original", value: "original" },
      ],
      z = [
        { label: "Matrix", value: "matrix" },
        { label: "Scatter", value: "scatter" },
      ],
      E = [
        { label: "Gradient", value: "gradient" },
        { label: "Solid", value: "solid" },
        { label: "Image", value: "image" },
      ],
      j = [
        {
          name: "images",
          type: "string[]",
          default: "required",
          description: "Ordered image sources the particles morph between.",
        },
        {
          name: "activeIndex",
          type: "number",
          default: "—",
          description: "Controlled index of the image to show.",
        },
        {
          name: "defaultIndex",
          type: "number",
          default: "0",
          description: "Initial image when uncontrolled.",
        },
        {
          name: "autoplay",
          type: "boolean",
          default: "true",
          description: "Cycle through the images automatically.",
        },
        {
          name: "interval",
          type: "number",
          default: "3000",
          description: "Time each image holds, in milliseconds.",
        },
        {
          name: "transitionDuration",
          type: "number",
          default: "1800",
          description: "Length of each morph, in milliseconds.",
        },
        {
          name: "layout",
          type: '"matrix" | "scatter"',
          default: '"matrix"',
          description:
            "Matrix arranges the particles on a clean hexagonal dot grid. Scatter fills the shape with randomly placed particles.",
        },
        {
          name: "colors",
          type: "[string, string]",
          default: "—",
          description:
            "Two colours blended across the shape. Overrides the image colours.",
        },
        {
          name: "color",
          type: "string",
          default: "—",
          description:
            "A single colour for every particle. Overrides colors and the image colours.",
        },
        {
          name: "particleDensity",
          type: "number",
          default: "3 (matrix) / 80 (scatter)",
          description: "How many particles fill the frame.",
        },
        {
          name: "particleSize",
          type: "number",
          default: "6",
          description: "Diameter of each dot in pixels.",
        },
        {
          name: "sizeByLuminance",
          type: "number",
          default: "0.75",
          description:
            "Sizes each dot by the brightness of the image beneath it, like a halftone print.",
        },
        {
          name: "halo",
          type: "number",
          default: "0.4",
          description: "Soft glow around each dot.",
        },
        {
          name: "particleOpacity",
          type: "number",
          default: "0.9",
          description: "Opacity of the particles.",
        },
        {
          name: "dispersion",
          type: "number",
          default: "1",
          description: "How far particles swing out while morphing.",
        },
        {
          name: "chaos",
          type: "number",
          default: "0",
          description: "Lets particles flow through turbulence between shapes.",
        },
        {
          name: "idleDrift",
          type: "number",
          default: "1",
          description: "Gentle drift while a shape is held.",
        },
        {
          name: "idleSpeed",
          type: "number",
          default: "1",
          description: "Speed of the idle drift.",
        },
        {
          name: "tilt",
          type: "number",
          default: "1",
          description: "How much the shape tilts in depth toward the pointer.",
        },
        {
          name: "pointerStrength",
          type: "number",
          default: "1",
          description: "How strongly the pointer pushes particles aside.",
        },
        {
          name: "pointerRadius",
          type: "number",
          default: "120",
          description: "Reach of the pointer, in pixels.",
        },
        {
          name: "glow",
          type: "number",
          default: "0.35",
          description: "Bloom around the shape.",
        },
        {
          name: "aberration",
          type: "number",
          default: "0",
          description: "Colour fringing that pulses during transitions.",
        },
        {
          name: "backgroundColor",
          type: "string",
          default: '"#0a0a0a"',
          description: "Background behind the particles.",
        },
        {
          name: "luminanceThreshold",
          type: "number",
          default: "0",
          description: "Pixels darker than this are left empty.",
        },
        {
          name: "loop",
          type: "boolean",
          default: "true",
          description: "Return to the first image after the last.",
        },
        {
          name: "onIndexChange",
          type: "(index: number) => void",
          default: "—",
          description: "Called when the active image changes.",
        },
        {
          name: "width",
          type: "string | number",
          default: '"100%"',
          description: "Width of the component.",
        },
        {
          name: "height",
          type: "string | number",
          default: '"100%"',
          description: "Height of the component.",
        },
        {
          name: "className",
          type: "string",
          default: "—",
          description: "Classes for the root element.",
        },
        {
          name: "children",
          type: "ReactNode",
          default: "—",
          description: "Content laid over the particles.",
        },
        {
          name: "dpr",
          type: "number",
          default: "2",
          description: "Maximum device pixel ratio.",
        },
      ],
      U = () => {
        let e = "dark" === (0, i.Y)(),
          [t, a] = (0, n.I)(),
          [s, u] = (0, o.useState)("matrix"),
          [c, m] = (0, o.useState)(P.matrix),
          d = (e) => (t) => m((a) => ({ ...a, [e]: t })),
          [p, f] = (0, o.useState)(0),
          [h, v] = (0, o.useState)(!0),
          [g, x] = (0, o.useState)(2600),
          [y, w] = (0, o.useState)(1800),
          [b, C] = (0, o.useState)(0.9),
          [M, S] = (0, o.useState)(1),
          [F, I] = (0, o.useState)(1),
          [U, k] = (0, o.useState)(1),
          [B, L] = (0, o.useState)(1),
          [G, W] = (0, o.useState)(120),
          [H, Y] = (0, o.useState)(null),
          [O, N] = (0, o.useState)(null),
          [$, q] = (0, o.useState)(!0),
          Q = H ?? (e ? "#ffffff" : "#0a0a0a"),
          X = O ?? (e ? "#0a0a0a" : "#ffffff");
        return (0, r.jsxs)("div", {
          children: [
            (0, r.jsx)(l.Bg, {}),
            (0, r.jsxs)(l.VX, {
              children: [
                (0, r.jsxs)(l.Ec, {
                  children: [
                    (0, r.jsx)(l.Ch, {
                      onRefresh: a,
                      minHeight: 560,
                      children: (0, r.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, r.jsx)(
                          T,
                          {
                            images: D,
                            activeIndex: p,
                            onIndexChange: f,
                            autoplay: h,
                            interval: g,
                            transitionDuration: y,
                            layout: c.layout,
                            colors:
                              "gradient" === c.colorMode ? c.colors : void 0,
                            color: "solid" === c.colorMode ? Q : void 0,
                            particleDensity: c.particleDensity,
                            particleSize: c.particleSize,
                            sizeByLuminance: c.sizeByLuminance,
                            halo: c.halo,
                            particleOpacity: b,
                            dispersion: c.dispersion,
                            chaos: c.chaos,
                            idleDrift: M,
                            idleSpeed: F,
                            tilt: U,
                            pointerStrength: B,
                            pointerRadius: G,
                            glow: c.glow,
                            aberration: c.aberration,
                            backgroundColor: X,
                            loop: $,
                          },
                          t,
                        ),
                      }),
                    }),
                    (0, r.jsxs)(l.IH, {
                      children: [
                        (0, r.jsx)(l.bg, {
                          title: "Preset",
                          value: s,
                          options: R,
                          onChange: (e) => {
                            (u(e), m(P[e] ?? P.matrix), a());
                          },
                        }),
                        (0, r.jsx)(l.bg, {
                          title: "Active Image",
                          value: String(p),
                          options: A,
                          onChange: (e) => f(Number(e)),
                        }),
                        (0, r.jsx)(l.bg, {
                          title: "Layout",
                          value: c.layout,
                          options: z,
                          onChange: (e) => d("layout")(e),
                        }),
                        (0, r.jsx)(l.bg, {
                          title: "Color Mode",
                          value: c.colorMode,
                          options: E,
                          onChange: (e) => d("colorMode")(e),
                        }),
                        (0, r.jsx)(l.W7, {
                          title: "First Color",
                          value: c.colors[0],
                          onChange: (e) =>
                            m((t) => ({ ...t, colors: [e, t.colors[1]] })),
                        }),
                        (0, r.jsx)(l.W7, {
                          title: "Second Color",
                          value: c.colors[1],
                          onChange: (e) =>
                            m((t) => ({ ...t, colors: [t.colors[0], e] })),
                        }),
                        (0, r.jsx)(l.W7, {
                          title: "Solid Color",
                          value: Q,
                          onChange: Y,
                        }),
                        (0, r.jsx)(l.W7, {
                          title: "Background",
                          value: X,
                          onChange: N,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Density",
                          min: 1,
                          max: 120,
                          step: 0.5,
                          value: c.particleDensity,
                          onChange: d("particleDensity"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Particle Size",
                          min: 1,
                          max: 14,
                          step: 0.1,
                          value: c.particleSize,
                          valueUnit: "px",
                          onChange: d("particleSize"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Size by Luminance",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: c.sizeByLuminance,
                          onChange: d("sizeByLuminance"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Halo",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: c.halo,
                          onChange: d("halo"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Opacity",
                          min: 0.1,
                          max: 1,
                          step: 0.01,
                          value: b,
                          onChange: C,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Transition",
                          min: 300,
                          max: 4e3,
                          step: 50,
                          value: y,
                          valueUnit: "ms",
                          onChange: w,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Interval",
                          min: 500,
                          max: 6e3,
                          step: 100,
                          value: g,
                          valueUnit: "ms",
                          onChange: x,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Dispersion",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: c.dispersion,
                          onChange: d("dispersion"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Chaos",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: c.chaos,
                          onChange: d("chaos"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Idle Drift",
                          min: 0,
                          max: 3,
                          step: 0.01,
                          value: M,
                          onChange: S,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Idle Speed",
                          min: 0,
                          max: 3,
                          step: 0.01,
                          value: F,
                          onChange: I,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Tilt",
                          min: 0,
                          max: 3,
                          step: 0.01,
                          value: U,
                          onChange: k,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Pointer Strength",
                          min: 0,
                          max: 3,
                          step: 0.01,
                          value: B,
                          onChange: L,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Pointer Radius",
                          min: 20,
                          max: 300,
                          step: 1,
                          value: G,
                          valueUnit: "px",
                          onChange: W,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Glow",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: c.glow,
                          onChange: d("glow"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Aberration",
                          min: 0,
                          max: 4,
                          step: 0.01,
                          value: c.aberration,
                          onChange: d("aberration"),
                        }),
                        (0, r.jsx)(l.tl, {
                          title: "Autoplay",
                          checked: h,
                          onChange: v,
                        }),
                        (0, r.jsx)(l.tl, {
                          title: "Loop",
                          checked: $,
                          onChange: q,
                        }),
                      ],
                    }),
                    (0, r.jsx)(l.Ub, { data: j }),
                  ],
                }),
                (0, r.jsx)(l.lT, { children: (0, r.jsx)(l.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
