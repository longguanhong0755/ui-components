/* ReactBits Pro public preview module 81130 for pond-image.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/81130.d687b341eb72b74c.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  81130: (e, t, r) => {
    (r.r(t), r.d(t, { default: () => P }));
    var a = r(95155),
      i = r(12115),
      o = r(56388),
      l = r(86049),
      s = r(45949),
      n = r(90761),
      u = r(12246),
      c = r(2253),
      v = r(90650);
    let d = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      m = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      p = (e, t, r) => Math.min(r, Math.max(t, e)),
      f = null,
      h = `
uniform vec2 uTexel;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
void main() {
  vUv = uv;
  vL = uv - vec2(uTexel.x, 0.0);
  vR = uv + vec2(uTexel.x, 0.0);
  vT = uv + vec2(0.0, uTexel.y);
  vB = uv - vec2(0.0, uTexel.y);
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,
      g = `
uniform sampler2D uTarget;
uniform vec2 uAspect;
uniform vec2 uFrom;
uniform vec2 uTo;
uniform vec2 uForce;
uniform float uRadius;
uniform float uBurst;
varying vec2 vUv;

void main() {
  vec2 p = vUv * uAspect;
  vec2 a = uFrom * uAspect;
  vec2 b = uTo * uAspect;
  vec2 ab = b - a;
  float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-8), 0.0, 1.0);
  vec2 offset = p - (a + ab * t);
  float weight = exp(-dot(offset, offset) / (uRadius * uRadius));
  vec2 push = uForce;
  if (uBurst > 0.0) {
    float d = max(length(offset), 1e-4);
    push = offset / d * uBurst * smoothstep(0.0, uRadius * 0.6, d);
  }
  vec4 base = texture2D(uTarget, vUv);
  gl_FragColor = vec4(base.xy + push * weight, 0.0, 1.0);
}
`,
      y = `
uniform sampler2D uVelocity;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;

void main() {
  float left = texture2D(uVelocity, vL).y;
  float right = texture2D(uVelocity, vR).y;
  float top = texture2D(uVelocity, vT).x;
  float bottom = texture2D(uVelocity, vB).x;
  gl_FragColor = vec4(0.5 * (right - left - top + bottom), 0.0, 0.0, 1.0);
}
`,
      x = `
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float uStrength;
uniform float uDt;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;

void main() {
  float left = texture2D(uCurl, vL).x;
  float right = texture2D(uCurl, vR).x;
  float top = texture2D(uCurl, vT).x;
  float bottom = texture2D(uCurl, vB).x;
  float centre = texture2D(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(top) - abs(bottom), abs(right) - abs(left));
  force /= length(force) + 1e-4;
  force *= uStrength * centre;
  force.y *= -1.0;
  vec2 velocity = texture2D(uVelocity, vUv).xy + force * uDt;
  gl_FragColor = vec4(clamp(velocity, -1000.0, 1000.0), 0.0, 1.0);
}
`,
      b = `
uniform sampler2D uVelocity;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;

void main() {
  vec2 centre = texture2D(uVelocity, vUv).xy;
  float left = texture2D(uVelocity, vL).x;
  float right = texture2D(uVelocity, vR).x;
  float top = texture2D(uVelocity, vT).y;
  float bottom = texture2D(uVelocity, vB).y;
  if (vL.x < 0.0) left = -centre.x;
  if (vR.x > 1.0) right = -centre.x;
  if (vT.y > 1.0) top = -centre.y;
  if (vB.y < 0.0) bottom = -centre.y;
  gl_FragColor = vec4(0.5 * (right - left + top - bottom), 0.0, 0.0, 1.0);
}
`,
      w = `
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;

void main() {
  float left = texture2D(uPressure, vL).x;
  float right = texture2D(uPressure, vR).x;
  float top = texture2D(uPressure, vT).x;
  float bottom = texture2D(uPressure, vB).x;
  float divergence = texture2D(uDivergence, vUv).x;
  gl_FragColor = vec4((left + right + bottom + top - divergence) * 0.25, 0.0, 0.0, 1.0);
}
`,
      S = `
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;

void main() {
  float left = texture2D(uPressure, vL).x;
  float right = texture2D(uPressure, vR).x;
  float top = texture2D(uPressure, vT).x;
  float bottom = texture2D(uPressure, vB).x;
  vec2 velocity = texture2D(uVelocity, vUv).xy - vec2(right - left, top - bottom);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}
`,
      C = `
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uSimTexel;
uniform float uDt;
uniform float uDecay;
uniform float uCarry;
varying vec2 vUv;

void main() {
  vec2 step = texture2D(uVelocity, vUv).xy * uSimTexel * uDt;
  vec4 moved = texture2D(uSource, vUv - step);
  vec2 next = (moved.xy - step * uCarry) * uDecay;
  float reach = length(next);
  if (uCarry > 0.5 && reach > 0.12) next *= 0.12 / reach;
  gl_FragColor = vec4(next, 0.0, 1.0);
}
`,
      D = `
uniform sampler2D uOffset;
uniform vec2 uOffsetSize;
uniform sampler2D uVelocity;
uniform sampler2D uImage;
uniform vec2 uImageSize;
uniform vec2 uSize;
uniform float uGloss;
uniform float uShade;
uniform float uChroma;
uniform vec3 uHighlight;
varying vec2 vUv;

vec4 bicubic(sampler2D map, vec2 uv, vec2 size) {
  vec2 st = uv * size - 0.5;
  vec2 i = floor(st);
  vec2 f = st - i;
  vec2 f2 = f * f;
  vec2 f3 = f2 * f;
  vec2 w0 = (1.0 - 3.0 * f + 3.0 * f2 - f3) / 6.0;
  vec2 w1 = (4.0 - 6.0 * f2 + 3.0 * f3) / 6.0;
  vec2 w2 = (1.0 + 3.0 * f + 3.0 * f2 - 3.0 * f3) / 6.0;
  vec2 w3 = f3 / 6.0;
  vec2 g0 = w0 + w1;
  vec2 g1 = w2 + w3;
  vec2 h0 = (w1 / g0 - 1.0 + i + 0.5) / size;
  vec2 h1 = (w3 / g1 + 1.0 + i + 0.5) / size;
  return g0.y * (g0.x * texture2D(map, vec2(h0.x, h0.y)) + g1.x * texture2D(map, vec2(h1.x, h0.y))) +
    g1.y * (g0.x * texture2D(map, vec2(h0.x, h1.y)) + g1.x * texture2D(map, vec2(h1.x, h1.y)));
}

vec2 cover(vec2 uv) {
  float view = uSize.x / uSize.y;
  float image = uImageSize.x / max(uImageSize.y, 1.0);
  vec2 scale = view > image ? vec2(1.0, image / view) : vec2(view / image, 1.0);
  return (uv - 0.5) * scale + 0.5;
}

void main() {
  vec2 texel = 1.0 / uOffsetSize;
  vec2 offset = bicubic(uOffset, vUv, uOffsetSize).xy;
  vec2 wide = texel * 7.0;
  vec2 ex = bicubic(uOffset, vUv + vec2(wide.x, 0.0), uOffsetSize).xy - bicubic(uOffset, vUv - vec2(wide.x, 0.0), uOffsetSize).xy;
  vec2 ey = bicubic(uOffset, vUv + vec2(0.0, wide.y), uOffsetSize).xy - bicubic(uOffset, vUv - vec2(0.0, wide.y), uOffsetSize).xy;
  float squeeze = (ex.x / (2.0 * wide.x) + ey.y / (2.0 * wide.y));
  vec2 source = clamp(vUv + offset, vec2(0.0005), vec2(0.9995));
  vec2 fringe = offset * uChroma * 0.05;
  vec3 color;
  color.r = texture2D(uImage, cover(clamp(source + fringe, 0.0005, 0.9995))).r;
  color.g = texture2D(uImage, cover(source)).g;
  color.b = texture2D(uImage, cover(clamp(source - fringe, 0.0005, 0.9995))).b;
  float bunch = max(-squeeze, 0.0);
  float thin = max(squeeze, 0.0);
  float ridge = smoothstep(0.35, 2.2, bunch);
  color *= 1.0 - uShade * (smoothstep(0.25, 2.5, bunch) * 0.16 - smoothstep(0.25, 2.5, thin) * 0.05);
  vec3 shine = clamp(uHighlight * ridge * ridge * uGloss * 0.35, 0.0, 1.0);
  color = 1.0 - (1.0 - color) * (1.0 - shine);
  gl_FragColor = vec4(color, 1.0);
}
`,
      T = (0, i.forwardRef)(function (
        {
          src: e = "/demo-media/effect-pond-koi.webp",
          alt: t = "Orange-and-black koi beneath green lily pads on a reflective pond",
          aspectRatio: r = 4 / 3,
          radius: o = 16,
          brushSize: l = 60,
          force: s = 1,
          swirl: n = 0.35,
          flow: T = 0.45,
          settleTime: k = 1.1,
          gloss: F = 0.4,
          shade: R = 0.4,
          chromatic: I = 0.3,
          highlightColor: P = "#FFFFFF",
          quality: z = 1,
          hover: E = !0,
          clickBurst: j = !0,
          autoplay: B = !1,
          autoplaySpeed: L = 1,
          idleDelay: M = 2,
          className: O,
          style: U,
        },
        V,
      ) {
        let q = (0, i.useRef)(null),
          W = (0, i.useRef)(null),
          A = (0, i.useSyncExternalStore)(d, m, () => !1),
          N = (0, i.useRef)({
            src: e,
            brushSize: l,
            force: s,
            swirl: n,
            flow: T,
            settleTime: k,
            gloss: F,
            shade: R,
            chromatic: I,
            highlightColor: P,
            quality: z,
            hover: E,
            clickBurst: j,
            autoplay: B,
            autoplaySpeed: L,
            idleDelay: M,
            reduced: A,
          });
        return (
          (0, i.useEffect)(() => {
            ((N.current = {
              src: e,
              brushSize: l,
              force: s,
              swirl: n,
              flow: T,
              settleTime: k,
              gloss: F,
              shade: R,
              chromatic: I,
              highlightColor: P,
              quality: z,
              hover: E,
              clickBurst: j,
              autoplay: B,
              autoplaySpeed: L,
              idleDelay: M,
              reduced: A,
            }),
              W.current?.sync());
          }),
          (0, i.useEffect)(() => {
            let e = q.current;
            if (!e) return;
            let t = ((e, t) => {
              let r,
                a = document.createElement("canvas");
              (a.setAttribute("aria-hidden", "true"),
                (a.style.position = "absolute"),
                (a.style.inset = "0"),
                (a.style.width = "100%"),
                (a.style.height = "100%"),
                (a.style.display = "block"),
                (a.style.pointerEvents = "none"),
                (a.style.opacity = "0"),
                (a.style.transition = "opacity 240ms ease"),
                e.appendChild(a));
              try {
                r = new u.WebGLRenderer({
                  canvas: a,
                  alpha: !1,
                  antialias: !1,
                  powerPreference: "high-performance",
                });
              } catch {
                return (a.remove(), null);
              }
              let i = new c.qUd(-1, 1, 1, -1, 0, 1),
                o = new c.bdM(2, 2),
                l = {
                  type: c.ix0,
                  format: c.GWd,
                  minFilter: c.k6q,
                  magFilter: c.k6q,
                  wrapS: c.ghU,
                  wrapT: c.ghU,
                  depthBuffer: !1,
                  stencilBuffer: !1,
                },
                s = (e, t) => new c.nWS(e, t, l),
                n = (e, t) =>
                  new c.BKk({
                    uniforms: {
                      uTexel: { value: new c.I9Y(0.01, 0.01) },
                      ...t,
                    },
                    vertexShader: h,
                    fragmentShader: e,
                    depthTest: !1,
                    depthWrite: !1,
                  }),
                v = n(g, {
                  uTarget: { value: null },
                  uAspect: { value: new c.I9Y(1, 1) },
                  uFrom: { value: new c.I9Y() },
                  uTo: { value: new c.I9Y() },
                  uForce: { value: new c.I9Y() },
                  uRadius: { value: 0.05 },
                  uBurst: { value: 0 },
                }),
                d = n(y, { uVelocity: { value: null } }),
                m = n(x, {
                  uVelocity: { value: null },
                  uCurl: { value: null },
                  uStrength: { value: 10 },
                  uDt: { value: 0.016 },
                }),
                T = n(b, { uVelocity: { value: null } }),
                k = n(w, {
                  uPressure: { value: null },
                  uDivergence: { value: null },
                }),
                F = n(S, {
                  uPressure: { value: null },
                  uVelocity: { value: null },
                }),
                R = n(C, {
                  uVelocity: { value: null },
                  uSource: { value: null },
                  uSimTexel: { value: new c.I9Y(0.01, 0.01) },
                  uDt: { value: 0.016 },
                  uDecay: { value: 1 },
                  uCarry: { value: 0 },
                }),
                I = n(D, {
                  uOffset: { value: null },
                  uOffsetSize: { value: new c.I9Y(1, 1) },
                  uVelocity: { value: null },
                  uImage: { value: null },
                  uImageSize: { value: new c.I9Y(1, 1) },
                  uSize: { value: new c.I9Y(1, 1) },
                  uGloss: { value: 0.5 },
                  uShade: { value: 0.4 },
                  uChroma: { value: 0.4 },
                  uHighlight: { value: new c.Pq0(1, 1, 1) },
                }),
                P = new c.eaF(o, v);
              P.frustumCulled = !1;
              let z = new c.Z58();
              z.add(P);
              let E = (e, t, a) => {
                  (a && e.uniforms.uTexel.value.copy(a),
                    (P.material = e),
                    r.setRenderTarget(t),
                    r.render(z, i));
                },
                j = [s(4, 4), s(4, 4)],
                B = [s(4, 4), s(4, 4)],
                L = [s(4, 4), s(4, 4)],
                M = s(4, 4),
                O = s(4, 4),
                U = new c.I9Y(0.1, 0.1),
                V = new c.I9Y(0.1, 0.1),
                q = { x: 4, y: 4 },
                W = !1,
                A = 0,
                N = 0,
                H = !0,
                Y = 1,
                _ = 1,
                G = null,
                K = "",
                X = !1,
                $ = 0,
                Z = !1,
                J = { x: 0.5, y: 0.5 },
                Q = 0,
                ee = !1,
                et = !1,
                er = -1e9,
                ea = [],
                ei = [],
                eo = {
                  time: 30 * Math.random(),
                  prev: null,
                  burstClock: 2.5,
                  active: !1,
                },
                el = new c.Tap();
              el.setCrossOrigin("anonymous");
              let es = () => {
                  let e = t.current.src;
                  e !== K &&
                    ((K = e),
                    el.load(
                      e,
                      (a) => {
                        W || t.current.src !== e
                          ? a.dispose()
                          : ((a.colorSpace = c.jf0),
                            (a.minFilter = c.$_I),
                            (a.generateMipmaps = !0),
                            (a.anisotropy = Math.min(
                              4,
                              r.capabilities.getMaxAnisotropy(),
                            )),
                            G?.dispose(),
                            (G = a),
                            em());
                      },
                      void 0,
                      () => {
                        W || t.current.src !== e || (a.style.opacity = "0");
                      },
                    ));
                },
                en = () => {
                  let a = e.getBoundingClientRect();
                  ((Y = Math.max(1, a.width)), (_ = Math.max(1, a.height)));
                  let i = Math.min(window.devicePixelRatio || 1, 2);
                  (r.setPixelRatio(i), r.setSize(Y, _, !1));
                  let o = p(t.current.quality, 0.25, 2),
                    l = Math.min(Y, _),
                    n = Math.round(p(l / 3, 64, 200) * o),
                    u = Math.round(p(l / 1.6, 120, 420) * o),
                    c = (e, t) => Math.max(8, Math.round((e / l) * t));
                  q = { x: c(Y, n), y: c(_, n) };
                  let d = { x: c(Y, u), y: c(_, u) };
                  ([...j, ...B, ...L, M, O].forEach((e) => e.dispose()),
                    (j = [s(q.x, q.y), s(q.x, q.y)]),
                    (B = [s(q.x, q.y), s(q.x, q.y)]),
                    (M = s(q.x, q.y)),
                    (O = s(q.x, q.y)),
                    (L = [s(d.x, d.y), s(d.x, d.y)]),
                    [...j, ...B, ...L, M, O].forEach((e) => {
                      (r.setRenderTarget(e), r.clear());
                    }),
                    r.setRenderTarget(null),
                    U.set(1 / q.x, 1 / q.y),
                    V.set(1 / d.x, 1 / d.y),
                    v.uniforms.uAspect.value.set(Y / l, _ / l),
                    R.uniforms.uSimTexel.value.copy(U),
                    I.uniforms.uOffsetSize.value.set(d.x, d.y),
                    I.uniforms.uSize.value.set(Y, _),
                    em());
                },
                eu = (e, r, a, i) => {
                  let o = t.current,
                    l = Math.min(Y, _),
                    s = v.uniforms;
                  ((s.uTarget.value = j[0].texture),
                    s.uFrom.value.set(e.x, 1 - e.y),
                    s.uTo.value.set(r.x, 1 - r.y));
                  let n = (q.x / Y) * p(o.force, 0, 4) * 0.12;
                  (s.uForce.value.set(a * n, -i * n),
                    (s.uRadius.value = p(o.brushSize, 4, 400) / l),
                    (s.uBurst.value = 0),
                    E(v, j[1], U),
                    (j = [j[1], j[0]]));
                },
                ec = (e) => {
                  let r = t.current,
                    a = Math.min(Y, _),
                    i = v.uniforms;
                  ((i.uTarget.value = j[0].texture),
                    i.uFrom.value.set(e.x, 1 - e.y),
                    i.uTo.value.set(e.x, 1 - e.y),
                    i.uForce.value.set(0, 0),
                    (i.uRadius.value = (1.6 * p(r.brushSize, 4, 400)) / a),
                    (i.uBurst.value = 150 * (q.x / Y) * p(r.force, 0, 4)),
                    E(v, j[1], U),
                    (j = [j[1], j[0]]));
                },
                ev = 0,
                ed = (e) => {
                  if (((A = 0), W)) return;
                  let i = Math.min(1 / 30, Math.max(0, (e - N) / 1e3));
                  ((N = e),
                    es(),
                    ((e, a) => {
                      let i = t.current,
                        o = a - er > 1e3 * i.idleDelay;
                      if (
                        ((eo.active =
                          i.autoplay && !i.reduced && o && !et && H && !!G),
                        eo.active)
                      ) {
                        eo.time += e * p(i.autoplaySpeed, 0.1, 3);
                        let t = 0.5 * eo.time,
                          r = {
                            x:
                              0.5 +
                              0.32 * Math.sin(1.1 * t) * Math.cos(0.43 * t),
                            y: 0.5 + 0.28 * Math.sin(0.77 * t + 0.6),
                          };
                        (eo.prev &&
                          e > 0 &&
                          ei.push({
                            from: eo.prev,
                            to: r,
                            dx: (((r.x - eo.prev.x) * Y) / e) * 3,
                            dy: (((r.y - eo.prev.y) * _) / e) * 3,
                          }),
                          (eo.prev = r),
                          (eo.burstClock -= e * p(i.autoplaySpeed, 0.1, 3)),
                          eo.burstClock <= 0 &&
                            ((eo.burstClock = 3.2 + 2.4 * Math.random()),
                            ea.push({ x: r.x, y: r.y })),
                          ($ = a + 4e3));
                      } else eo.prev = null;
                      if (
                        (Z &&
                          ([...j, ...B, ...L].forEach((e) => {
                            (r.setRenderTarget(e), r.clear());
                          }),
                          (Z = !1)),
                        !e)
                      )
                        return;
                      for (let e of ei.splice(0)) eu(e.from, e.to, e.dx, e.dy);
                      for (let e of ea.splice(0)) ec(e);
                      let l = 24 * p(i.swirl, 0, 1);
                      if (l > 0) {
                        ((d.uniforms.uVelocity.value = j[0].texture),
                          E(d, O, U));
                        let t = m.uniforms;
                        ((t.uVelocity.value = j[0].texture),
                          (t.uCurl.value = O.texture),
                          (t.uStrength.value = l),
                          (t.uDt.value = e),
                          E(m, j[1], U),
                          (j = [j[1], j[0]]));
                      }
                      ((T.uniforms.uVelocity.value = j[0].texture), E(T, M, U));
                      for (let e = 0; e < 22; e++)
                        ((k.uniforms.uPressure.value = B[0].texture),
                          (k.uniforms.uDivergence.value = M.texture),
                          E(k, B[1], U),
                          (B = [B[1], B[0]]));
                      ((F.uniforms.uPressure.value = B[0].texture),
                        (F.uniforms.uVelocity.value = j[0].texture),
                        E(F, j[1], U),
                        (j = [j[1], j[0]]));
                      let s = R.uniforms;
                      ((s.uDt.value = e),
                        (s.uVelocity.value = j[0].texture),
                        (s.uSource.value = j[0].texture),
                        (s.uDecay.value = Math.pow(
                          0.5,
                          e / p(i.flow, 0.05, 10),
                        )),
                        (s.uCarry.value = 0),
                        E(R, j[1], U),
                        (j = [j[1], j[0]]),
                        (s.uSource.value = L[0].texture),
                        (s.uDecay.value = Math.exp(
                          -e / p(i.settleTime, 0.1, 20),
                        )),
                        (s.uCarry.value = 1),
                        E(R, L[1], V),
                        (L = [L[1], L[0]]),
                        r.setRenderTarget(null));
                    })(i, e),
                    (() => {
                      if (!G) return;
                      let e = t.current,
                        r = I.uniforms;
                      ((r.uOffset.value = L[0].texture),
                        (r.uVelocity.value = j[0].texture),
                        (r.uImage.value = G));
                      let i = G.image;
                      (r.uImageSize.value.set(i?.width || 1, i?.height || 1),
                        (r.uGloss.value = p(e.gloss, 0, 2)),
                        (r.uShade.value = p(e.shade, 0, 1)),
                        (r.uChroma.value = p(e.chromatic, 0, 1)));
                      let [o, l, s] = ((e, t) => {
                        if (
                          (f ||
                            (f = document
                              .createElement("canvas")
                              .getContext("2d")),
                          !f)
                        )
                          return t;
                        ((f.fillStyle = "#010203"), (f.fillStyle = e));
                        let r = String(f.fillStyle);
                        if (
                          "#010203" === r &&
                          "#010203" !== e.trim().toLowerCase()
                        )
                          return t;
                        if (r.startsWith("#")) {
                          let e = r.slice(1);
                          return [
                            parseInt(e.slice(0, 2), 16) / 255,
                            parseInt(e.slice(2, 4), 16) / 255,
                            parseInt(e.slice(4, 6), 16) / 255,
                          ];
                        }
                        let a = r.match(/[\d.]+/g);
                        return !a || a.length < 3
                          ? t
                          : [
                              Number(a[0]) / 255,
                              Number(a[1]) / 255,
                              Number(a[2]) / 255,
                            ];
                      })(e.highlightColor, [1, 1, 1]);
                      (r.uHighlight.value.set(o, l, s),
                        E(I, null, V),
                        X || ((X = !0), (a.style.opacity = "1")));
                    })());
                  let o = t.current,
                    l = e < $ || eo.active || !G;
                  if (H && l) {
                    A = requestAnimationFrame(ed);
                    return;
                  }
                  if (H && o.autoplay && !o.reduced) {
                    window.clearTimeout(ev);
                    let t = er + 1e3 * o.idleDelay - e;
                    ev = window.setTimeout(em, Math.max(40, Math.min(t, 2e3)));
                  }
                },
                em = () => {
                  W ||
                    A ||
                    !H ||
                    ((N = performance.now()), (A = requestAnimationFrame(ed)));
                },
                ep = () => {
                  let e = t.current;
                  (($ =
                    performance.now() +
                    (3.5 * e.settleTime + 4 * e.flow) * 1e3),
                    em());
                },
                ef = (t) => {
                  let r = e.getBoundingClientRect();
                  return {
                    x: p((t.clientX - r.left) / Math.max(1, r.width), 0, 1),
                    y: p((t.clientY - r.top) / Math.max(1, r.height), 0, 1),
                  };
                },
                eh = (e) => {
                  let r = t.current,
                    a = ef(e);
                  if (
                    ((er = performance.now()),
                    (et = "touch" !== e.pointerType || ee),
                    r.hover && !r.reduced && ee)
                  ) {
                    let t = Math.max(1 / 240, (e.timeStamp - Q) / 1e3),
                      r = ((a.x - J.x) * Y) / t,
                      i = ((a.y - J.y) * _) / t,
                      o = Math.hypot(r, i),
                      l = o > 4200 ? 4200 / o : 1;
                    (ei.push({ from: { ...J }, to: a, dx: r * l, dy: i * l }),
                      ep());
                  }
                  ((J.x = a.x), (J.y = a.y), (Q = e.timeStamp), (ee = !0));
                },
                eg = () => {
                  ((ee = !1), (et = !1), (er = performance.now()), em());
                },
                ey = (e) => {
                  if (0 !== e.button) return;
                  let r = t.current;
                  er = performance.now();
                  let a = ef(e);
                  ((J.x = a.x),
                    (J.y = a.y),
                    (Q = e.timeStamp),
                    (ee = !0),
                    r.clickBurst && !r.reduced && (ea.push(a), ep()));
                },
                ex = (e) => {
                  if ("Enter" !== e.key && " " !== e.key) return;
                  e.preventDefault();
                  let r = t.current;
                  ((er = performance.now()),
                    r.clickBurst &&
                      !r.reduced &&
                      (ea.push({ x: 0.5, y: 0.5 }), ep()));
                };
              (e.addEventListener("pointermove", eh),
                e.addEventListener("pointerleave", eg),
                e.addEventListener("pointercancel", eg),
                e.addEventListener("pointerdown", ey),
                e.addEventListener("keydown", ex));
              let eb = new ResizeObserver(en);
              eb.observe(e);
              let ew = new IntersectionObserver(
                (e) => {
                  (H = e.some((e) => e.isIntersecting)) && em();
                },
                { rootMargin: "100px" },
              );
              ew.observe(e);
              let eS = (e) => {
                (e.preventDefault(), (a.style.opacity = "0"));
              };
              return (
                a.addEventListener("webglcontextlost", eS),
                en(),
                es(),
                {
                  sync: () => {
                    (es(), em());
                  },
                  destroy: () => {
                    ((W = !0),
                      cancelAnimationFrame(A),
                      window.clearTimeout(ev),
                      e.removeEventListener("pointermove", eh),
                      e.removeEventListener("pointerleave", eg),
                      e.removeEventListener("pointercancel", eg),
                      e.removeEventListener("pointerdown", ey),
                      e.removeEventListener("keydown", ex),
                      a.removeEventListener("webglcontextlost", eS),
                      eb.disconnect(),
                      ew.disconnect(),
                      [...j, ...B, ...L, M, O].forEach((e) => e.dispose()),
                      G?.dispose(),
                      o.dispose(),
                      [v, d, m, T, k, F, R, I].forEach((e) => e.dispose()),
                      r.dispose(),
                      r.forceContextLoss(),
                      a.remove());
                  },
                  stir: (e, t, r, a) => {
                    er = performance.now();
                    let i = { x: p(e, 0, 1), y: p(t, 0, 1) },
                      o = {
                        x: p(e + r / Y / 30, 0, 1),
                        y: p(t + a / _ / 30, 0, 1),
                      };
                    (ei.push({ from: i, to: o, dx: r, dy: a }), ep());
                  },
                  burst: (e, t) => {
                    ((er = performance.now()),
                      ea.push({ x: p(e, 0, 1), y: p(t, 0, 1) }),
                      ep());
                  },
                  settle: () => {
                    ((Z = !0), em());
                  },
                }
              );
            })(e, N);
            return (
              (W.current = t),
              () => {
                (t?.destroy(), (W.current = null));
              }
            );
          }, [z]),
          (0, i.useImperativeHandle)(
            V,
            () => ({
              stir: (e, t, r, a) => W.current?.stir(e, t, r, a),
              burst: (e = 0.5, t = 0.5) => W.current?.burst(e, t),
              settle: () => W.current?.settle(),
            }),
            [],
          ),
          (0, a.jsx)("div", {
            ref: q,
            role: "img",
            tabIndex: 0,
            "aria-label": t,
            className: (0, v.cn)(
              "relative isolate w-full cursor-crosshair select-none overflow-hidden outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current",
              O,
            ),
            style: {
              aspectRatio: r > 0 ? String(r) : void 0,
              height: r > 0 ? void 0 : "100%",
              borderRadius: o,
              touchAction: "pan-y pinch-zoom",
              background: "#0a0a0a",
              ...U,
            },
            children: (0, a.jsx)("img", {
              src: e,
              alt: "",
              "aria-hidden": "true",
              draggable: !1,
              style: {
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                pointerEvents: "none",
              },
            }),
          })
        );
      });
    T.displayName = "PondImage";
    let k = {
        src: s.PT.pondKoi.src,
        highlight: "#FFFFFF",
        brushSize: 60,
        force: 1,
        swirl: 0.35,
        flow: 0.45,
        settleTime: 1.1,
        gloss: 0.4,
        shade: 0.4,
        chromatic: 0.3,
      },
      F = {
        liquid: k,
        swirl: {
          ...k,
          src: s.PT.pondKoi.src,
          brushSize: 80,
          force: 1.4,
          swirl: 0.85,
          flow: 0.9,
          settleTime: 3.5,
          gloss: 0.5,
          chromatic: 0.5,
        },
        soft: {
          ...k,
          src: s.PT.pondKoi.src,
          highlight: "#FFE9D6",
          brushSize: 100,
          force: 0.8,
          swirl: 0,
          flow: 0.35,
          settleTime: 0.8,
          gloss: 0.6,
          chromatic: 0.15,
        },
        chromatic: {
          ...k,
          src: s.PT.pondKoi.src,
          highlight: "#E9DFFF",
          brushSize: 50,
          force: 1.2,
          swirl: 0.6,
          flow: 0.7,
          settleTime: 2,
          gloss: 0.3,
          shade: 0.6,
          chromatic: 0.8,
        },
        gentle: {
          ...k,
          src: s.PT.pondKoi.src,
          brushSize: 70,
          force: 0.5,
          swirl: 0.2,
          flow: 0.3,
          settleTime: 0.6,
          gloss: 0.3,
          chromatic: 0.2,
        },
      },
      R = [
        { label: "Liquid", value: "liquid" },
        { label: "Swirl", value: "swirl" },
        { label: "Soft", value: "soft" },
        { label: "Chromatic", value: "chromatic" },
        { label: "Gentle", value: "gentle" },
      ],
      I = [
        {
          name: "src",
          type: "string",
          default: "Koi pond",
          description: "Image to stir. It is cropped to cover the component.",
        },
        {
          name: "alt",
          type: "string",
          default:
            '"Orange-and-black koi beneath green lily pads on a reflective pond"',
          description: "Accessible description of the image.",
        },
        {
          name: "aspectRatio",
          type: "number",
          default: "4 / 3",
          description:
            "Width divided by height. 0 fills the parent's height instead.",
        },
        {
          name: "radius",
          type: "number",
          default: "16",
          description: "Corner radius in pixels.",
        },
        {
          name: "brushSize",
          type: "number",
          default: "60",
          description:
            "Radius in pixels of the liquid the pointer drags along.",
        },
        {
          name: "force",
          type: "number",
          default: "1",
          description:
            "How hard the pointer pushes the liquid. Faster moves push harder.",
        },
        {
          name: "swirl",
          type: "number",
          default: "0.35",
          description:
            "How much the flow curls into eddies, from 0 (smooth smears) to 1 (marbled whirls).",
        },
        {
          name: "flow",
          type: "number",
          default: "0.45",
          description:
            "Seconds for the liquid to lose half its speed once the pointer stops.",
        },
        {
          name: "settleTime",
          type: "number",
          default: "1.1",
          description:
            "How quickly the image flows back into place, in seconds. Longer values leave the swirls on show.",
        },
        {
          name: "gloss",
          type: "number",
          default: "0.4",
          description: "Wet highlight on the moving liquid, from 0 to 2.",
        },
        {
          name: "shade",
          type: "number",
          default: "0.4",
          description:
            "Darkening where the liquid bunches up and lightening where it thins out, from 0 to 1.",
        },
        {
          name: "chromatic",
          type: "number",
          default: "0.3",
          description:
            "Colour fringing where the image is pulled furthest, from 0 to 1.",
        },
        {
          name: "highlightColor",
          type: "string",
          default: '"#FFFFFF"',
          description: "Colour of the wet highlight.",
        },
        {
          name: "quality",
          type: "number",
          default: "1",
          description:
            "Detail of the fluid simulation, from 0.25 to 2. Lower values are cheaper and give broader swirls.",
        },
        {
          name: "hover",
          type: "boolean",
          default: "true",
          description:
            "Stir the liquid as the pointer moves over it. On touch screens, horizontal swipes stir and vertical swipes scroll.",
        },
        {
          name: "clickBurst",
          type: "boolean",
          default: "true",
          description:
            "Clicking, tapping or pressing Enter pushes the liquid outward from that point.",
        },
        {
          name: "autoplay",
          type: "boolean",
          default: "false",
          description:
            "While nobody is interacting, a slow stir wanders across the image.",
        },
        {
          name: "autoplaySpeed",
          type: "number",
          default: "1",
          description: "Speed of that stir.",
        },
        {
          name: "idleDelay",
          type: "number",
          default: "2",
          description:
            "Seconds after the pointer leaves before autoplay resumes.",
        },
        {
          name: "ref",
          type: "{ stir, burst, settle }",
          default: "—",
          description:
            "stir(x, y, dx, dy) pushes the liquid at a point with a velocity in pixels per second. burst(x, y) pushes outward. settle() snaps the image back at once.",
        },
        {
          name: "className",
          type: "string",
          default: "—",
          description:
            "Classes for the root element, which fills its parent's width.",
        },
        {
          name: "style",
          type: "CSSProperties",
          default: "—",
          description: "Inline styles for the root element.",
        },
      ],
      P = () => {
        let [e, t] = (0, n.I)(),
          r = (0, l.Y)(),
          [u, c] = (0, i.useState)("liquid"),
          [v, d] = (0, i.useState)(k),
          m = (e) => (t) => d((r) => ({ ...r, [e]: t })),
          [p, f] = (0, i.useState)(!0),
          [h, g] = (0, i.useState)(!0),
          [y, x] = (0, i.useState)(!0),
          [b, w] = (0, i.useState)(1),
          [S, C] = (0, i.useState)(2);
        return (0, a.jsxs)("div", {
          children: [
            (0, a.jsx)(o.Bg, {}),
            (0, a.jsxs)(o.VX, {
              children: [
                (0, a.jsxs)(o.Ec, {
                  children: [
                    (0, a.jsx)(o.Ch, {
                      onRefresh: t,
                      minHeight: 560,
                      enableResponsive: !0,
                      children: (0, a.jsx)("div", {
                        className: `flex h-full w-full items-center justify-center p-6 ${"dark" === r ? "bg-[#0A0A0A]" : "bg-white"}`,
                        children: (0, a.jsx)("div", {
                          className: "w-full max-w-[720px]",
                          children: (0, a.jsx)(
                            T,
                            {
                              src: v.src,
                              alt: s.PT.pondKoi.alt,
                              aspectRatio: 1.5,
                              brushSize: v.brushSize,
                              force: v.force,
                              swirl: v.swirl,
                              flow: v.flow,
                              settleTime: v.settleTime,
                              gloss: v.gloss,
                              shade: v.shade,
                              chromatic: v.chromatic,
                              highlightColor: v.highlight,
                              hover: p,
                              clickBurst: h,
                              autoplay: y,
                              autoplaySpeed: b,
                              idleDelay: S,
                            },
                            e,
                          ),
                        }),
                      }),
                    }),
                    (0, a.jsxs)(o.IH, {
                      children: [
                        (0, a.jsx)(o.bg, {
                          title: "Preset",
                          value: u,
                          options: R,
                          onChange: (e) => {
                            (c(e), d(F[e] ?? k));
                          },
                        }),
                        (0, a.jsx)(o.W7, {
                          title: "Highlight",
                          value: v.highlight,
                          onChange: m("highlight"),
                        }),
                        (0, a.jsx)(o.yt, {
                          title: "Brush Size",
                          min: 10,
                          max: 200,
                          step: 2,
                          value: v.brushSize,
                          valueUnit: "px",
                          onChange: m("brushSize"),
                        }),
                        (0, a.jsx)(o.yt, {
                          title: "Force",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: v.force,
                          onChange: m("force"),
                        }),
                        (0, a.jsx)(o.yt, {
                          title: "Swirl",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: v.swirl,
                          onChange: m("swirl"),
                        }),
                        (0, a.jsx)(o.yt, {
                          title: "Flow",
                          min: 0.1,
                          max: 3,
                          step: 0.05,
                          value: v.flow,
                          valueUnit: "s",
                          onChange: m("flow"),
                        }),
                        (0, a.jsx)(o.yt, {
                          title: "Settle Time",
                          min: 0.2,
                          max: 8,
                          step: 0.1,
                          value: v.settleTime,
                          valueUnit: "s",
                          onChange: m("settleTime"),
                        }),
                        (0, a.jsx)(o.yt, {
                          title: "Gloss",
                          min: 0,
                          max: 2,
                          step: 0.05,
                          value: v.gloss,
                          onChange: m("gloss"),
                        }),
                        (0, a.jsx)(o.yt, {
                          title: "Shade",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: v.shade,
                          onChange: m("shade"),
                        }),
                        (0, a.jsx)(o.yt, {
                          title: "Chromatic",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: v.chromatic,
                          onChange: m("chromatic"),
                        }),
                        (0, a.jsx)(o.yt, {
                          title: "Autoplay Speed",
                          min: 0.2,
                          max: 3,
                          step: 0.05,
                          value: b,
                          onChange: w,
                        }),
                        (0, a.jsx)(o.yt, {
                          title: "Idle Delay",
                          min: 0,
                          max: 8,
                          step: 0.25,
                          value: S,
                          valueUnit: "s",
                          onChange: C,
                        }),
                        (0, a.jsx)(o.tl, {
                          title: "Hover",
                          checked: p,
                          onChange: f,
                        }),
                        (0, a.jsx)(o.tl, {
                          title: "Click Burst",
                          checked: h,
                          onChange: g,
                        }),
                        (0, a.jsx)(o.tl, {
                          title: "Autoplay",
                          checked: y,
                          onChange: x,
                        }),
                      ],
                    }),
                    (0, a.jsx)(o.Ub, { data: I }),
                  ],
                }),
                (0, a.jsx)(o.lT, { children: (0, a.jsx)(o.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
