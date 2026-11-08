/* ReactBits Pro public preview module 54368 for smoke-type.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/54368.e351d6a594e76f37.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  54368: (e, t, n) => {
    (n.r(t), n.d(t, { default: () => T }));
    var r = n(95155),
      i = n(12115),
      l = n(56388),
      a = n(86049),
      o = n(90761),
      u = n(2253),
      s = n(12246),
      d = n(90650);
    let c = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      m = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      f = (e, t, n) => Math.min(n, Math.max(t, e)),
      v = null,
      p = (e, t) => {
        let n = e.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
        if (n)
          return [Number(n[1]) / 255, Number(n[2]) / 255, Number(n[3]) / 255];
        if ((v || (v = document.createElement("canvas").getContext("2d")), !v))
          return t;
        ((v.fillStyle = "#010203"), (v.fillStyle = e));
        let r = String(v.fillStyle);
        if ("#010203" === r && "#010203" !== e.trim().toLowerCase()) return t;
        if (r.startsWith("#")) {
          let e = r.slice(1);
          return [
            parseInt(e.slice(0, 2), 16) / 255,
            parseInt(e.slice(2, 4), 16) / 255,
            parseInt(e.slice(4, 6), 16) / 255,
          ];
        }
        let i = r.match(/[\d.]+/g);
        return !i || i.length < 3
          ? t
          : [Number(i[0]) / 255, Number(i[1]) / 255, Number(i[2]) / 255];
      },
      h = `
out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,
      g = `
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 fragColor;

void main() {
  vec4 a = texture(uSource, vUv + uTexel * vec2(-1.0, -1.0));
  vec4 b = texture(uSource, vUv + uTexel * vec2(1.0, -1.0));
  vec4 c = texture(uSource, vUv + uTexel * vec2(-1.0, 1.0));
  vec4 d = texture(uSource, vUv + uTexel * vec2(1.0, 1.0));
  vec4 e = texture(uSource, vUv + uTexel * vec2(-2.0, 0.0));
  vec4 f = texture(uSource, vUv + uTexel * vec2(2.0, 0.0));
  vec4 g = texture(uSource, vUv + uTexel * vec2(0.0, -2.0));
  vec4 h = texture(uSource, vUv + uTexel * vec2(0.0, 2.0));
  fragColor = (a + b + c + d) * 0.15 + (e + f + g + h) * 0.05 + texture(uSource, vUv) * 0.2;
}
`,
      x = `
precision highp float;
uniform sampler2D uL0;
uniform sampler2D uL1;
uniform sampler2D uL2;
uniform sampler2D uL3;
uniform sampler2D uL4;
uniform sampler2D uL5;
uniform sampler2D uNoise;
uniform vec2 uResolution;
uniform float uEm;
uniform float uTime;
uniform float uClock;
uniform float uDuration;
uniform float uSpan;
uniform float uMode;
uniform float uExit;
uniform vec4 uLines[6];
uniform float uLineCount;
uniform float uRise;
uniform float uTurbulence;
uniform float uSoftness;
uniform float uDensity;
uniform float uLetterLayer;
uniform vec3 uText;
uniform vec3 uSmoke;
out vec4 fragColor;

float hash1(float n) {
  return fract(sin(n * 127.1) * 43758.5453);
}

vec2 flow(vec2 q, float t) {
  vec4 a = texture(uNoise, q * 0.045 + vec2(t * 0.011, -t * 0.019));
  vec4 b = texture(uNoise, q * 0.11 + vec2(-t * 0.017, -t * 0.031) + a.ba * 0.5);
  return (a.rg - 0.5) * 1.6 + (b.rg - 0.5) * 0.8;
}

float strands(vec2 q, float t, float seed) {
  vec2 w = q * vec2(0.085, 0.034) + vec2(seed, -t * 0.05) + flow(q * 0.8 + seed * 9.0, t) * 0.05;
  float n = texture(uNoise, w).b * 0.62 + texture(uNoise, w * 2.3 + vec2(0.37, 0.11)).a * 0.38;
  float ridge = 1.0 - abs(n * 2.0 - 1.0);
  return ridge * ridge * ridge;
}

vec2 level(vec2 uv, int i) {
  if (i <= 0) return texture(uL0, uv).rg;
  if (i == 1) return texture(uL1, uv).rg;
  if (i == 2) return texture(uL2, uv).rg;
  if (i == 3) return texture(uL3, uv).rg;
  if (i == 4) return texture(uL4, uv).rg;
  return texture(uL5, uv).rg;
}

float blurred(vec2 p, float amount, float parity) {
  vec2 uv = p / uResolution;
  if (uv.x < -0.02 || uv.y < -0.02 || uv.x > 1.02 || uv.y > 1.02) return 0.0;
  float l = clamp(amount, 0.0, 5.0);
  int i = int(floor(l));
  vec2 a = level(uv, i);
  vec2 b = level(uv, min(i + 1, 5));
  vec2 m = mix(a, b, fract(l));
  float boost = 1.0 + l * 0.55;
  return min((parity < 0.5 ? m.x : m.y) * boost, 1.0);
}

float orderFor(int line, vec2 p) {
  vec4 band = uLines[line];
  float u = clamp((p.x - band.x) / max(band.y - band.x, 1.0), 0.0, 1.0);
  float o = u;
  if (uMode > 0.5 && uMode < 1.5) o = 1.0 - u;
  else if (uMode > 1.5 && uMode < 2.5) o = abs(u - 0.5) * 2.0;
  else if (uMode > 2.5 && uMode < 3.5) o = 1.0 - abs(u - 0.5) * 2.0;
  else if (uMode > 3.5) o = hash1(floor((p.x - band.x) / (uEm * 0.55)) + float(line) * 17.0);
  return (float(line) + o) / max(uLineCount, 1.0);
}

float progressFor(int line, vec2 p) {
  float local = clamp((uClock - orderFor(line, p) * uSpan) / max(uDuration, 0.05), 0.0, 1.0);
  return uExit > 0.5 ? 1.0 - local : local;
}

vec2 cloudFor(int line, vec2 p, vec2 q, vec2 stream, float body, out float prog) {
  prog = progressFor(line, p);
  float k = 1.0 - prog;
  float lift = uExit > 0.5 ? -1.0 : 1.0;
  vec2 source = p + vec2(0.0, lift * uRise * uEm * k * k * 1.2) + stream * uTurbulence * uEm * 0.45 * k;
  float shape = blurred(source, k * uSoftness * 5.0, mod(float(line), 2.0));
  float texture_ = mix(1.0, body, smoothstep(0.05, 0.5, k));
  float appear = smoothstep(0.0, 0.45, prog);
  float alpha = clamp(shape * texture_ * appear * mix(1.0, 0.5 * uDensity, smoothstep(0.0, 0.7, k)), 0.0, 1.0);
  alpha *= mix(1.0, uLetterLayer, step(0.999, prog));
  return vec2(alpha, smoothstep(0.62, 0.98, prog));
}

void main() {
  vec2 p = gl_FragCoord.xy;
  float t = uTime;
  vec2 q = p / uEm;
  vec2 stream = flow(q, t);
  float billow = texture(uNoise, q * 0.07 + stream * 0.035 - vec2(0.0, t * 0.035)).g;
  vec2 fibre = q * vec2(0.62, 0.16) + stream * 0.05 - vec2(0.0, t * 0.09);
  float fine = texture(uNoise, fibre).b * 0.6 + texture(uNoise, fibre * 2.2 + vec2(0.31, 0.17)).a * 0.4;
  float streak = pow(1.0 - abs(fine * 2.0 - 1.0), 2.0);
  float body = (0.45 + 0.9 * billow) * (0.25 + 1.3 * streak);

  int first = 0;
  int second = -1;
  float best = 1e9;
  float next = 1e9;
  for (int i = 0; i < 6; i++) {
    if (float(i) >= uLineCount) break;
    vec4 band = uLines[i];
    float d = abs(p.y - (band.z + band.w) * 0.5);
    if (d < best) {
      next = best;
      second = first;
      best = d;
      first = i;
    } else if (d < next) {
      next = d;
      second = i;
    }
  }
  if (uLineCount < 1.5) second = -1;
  float prog;
  vec2 a = cloudFor(first, p, q, stream, body, prog);
  float progB = 0.0;
  vec2 b = vec2(0.0);
  if (second >= 0) b = cloudFor(second, p, q, stream, body, progB);
  float letter = 1.0 - (1.0 - a.x) * (1.0 - b.x);
  float weight = a.x + b.x;
  float settle = weight > 1e-4 ? (a.y * a.x + b.y * b.x) / weight : a.y;

  vec3 tone = mix(uSmoke, uText, settle);
  fragColor = vec4(tone * letter, letter);
}
`,
      b = (0, i.forwardRef)(function (
        {
          text: e = "Out of thin air",
          as: t = "span",
          fontSize: n = "clamp(2.75rem, 8vw, 6.5rem)",
          fontWeight: l = 600,
          letterSpacing: a = "-0.035em",
          lineHeight: o = 1.1,
          align: v = "center",
          color: b,
          smokeColor: y = "#B19EEF",
          trigger: w = "view",
          visible: S = !0,
          direction: C = "left",
          delay: k = 0.15,
          duration: L = 0.9,
          stagger: M = 0.11,
          rise: T = 1,
          turbulence: E = 1,
          softness: F = 1,
          density: j = 1,
          speed: R = 1,
          replayOnHover: N = !1,
          quality: q = 1,
          onComplete: I,
          className: D,
          style: U,
        },
        B,
      ) {
        let A = (0, i.useRef)(null),
          W = (0, i.useRef)(null),
          O = (0, i.useRef)(null),
          P = (0, i.useSyncExternalStore)(c, m, () => !1),
          H = (0, i.useMemo)(
            () =>
              "undefined" == typeof Intl || void 0 === Intl.Segmenter
                ? Array.from(e)
                : Array.from(
                    new Intl.Segmenter(void 0, {
                      granularity: "grapheme",
                    }).segment(e),
                    (e) => e.segment,
                  ),
            [e],
          ),
          z = (0, i.useRef)({
            smokeColor: y,
            trigger: w,
            visible: S,
            direction: C,
            delay: k,
            duration: L,
            stagger: M,
            rise: T,
            turbulence: E,
            softness: F,
            density: j,
            speed: R,
            replayOnHover: N,
            quality: q,
            reduced: P,
            onComplete: I,
          });
        return (
          (0, i.useEffect)(() => {
            ((z.current = {
              smokeColor: y,
              trigger: w,
              visible: S,
              direction: C,
              delay: k,
              duration: L,
              stagger: M,
              rise: T,
              turbulence: E,
              softness: F,
              density: j,
              speed: R,
              replayOnHover: N,
              quality: q,
              reduced: P,
              onComplete: I,
            }),
              O.current?.sync());
          }),
          (0, i.useEffect)(() => {
            let e = A.current,
              t = W.current;
            if (!e || !t) return;
            let n = ((e, t, n) => {
              let r,
                i = document.createElement("canvas");
              (i.setAttribute("aria-hidden", "true"),
                (i.style.position = "absolute"),
                (i.style.pointerEvents = "none"),
                (i.style.display = "block"),
                (i.style.zIndex = "0"),
                e.prepend(i));
              try {
                r = new s.WebGLRenderer({
                  canvas: i,
                  alpha: !0,
                  premultipliedAlpha: !0,
                  antialias: !1,
                });
              } catch {
                return (i.remove(), null);
              }
              if (!r.capabilities.isWebGL2)
                return (r.dispose(), i.remove(), null);
              (r.setClearColor(0, 0), (r.autoClear = !1));
              let l = new u.qUd(-1, 1, 1, -1, 0, 1),
                a = new u.bdM(2, 2),
                o = Array.from({ length: 6 }, () => new u.IUQ()),
                d = (e, t, n) =>
                  new u.BKk({
                    glslVersion: u.Wdf,
                    uniforms: t,
                    vertexShader: h,
                    fragmentShader: e,
                    depthTest: !1,
                    depthWrite: !1,
                    transparent: !0,
                    premultipliedAlpha: !0,
                    blending: n,
                  }),
                c = d(
                  g,
                  { uSource: { value: null }, uTexel: { value: new u.I9Y() } },
                  u.XIg,
                ),
                m = d(
                  x,
                  {
                    uL0: { value: null },
                    uL1: { value: null },
                    uL2: { value: null },
                    uL3: { value: null },
                    uL4: { value: null },
                    uL5: { value: null },
                    uNoise: { value: null },
                    uResolution: { value: new u.I9Y(1, 1) },
                    uEm: { value: 40 },
                    uTime: { value: 0 },
                    uClock: { value: 0 },
                    uDuration: { value: 1 },
                    uSpan: { value: 1 },
                    uMode: { value: 0 },
                    uExit: { value: 0 },
                    uLines: { value: o },
                    uLineCount: { value: 1 },
                    uRise: { value: 1 },
                    uTurbulence: { value: 1 },
                    uSoftness: { value: 1 },
                    uDensity: { value: 1 },
                    uLetterLayer: { value: 1 },
                    uText: { value: new u.Pq0(1, 1, 1) },
                    uSmoke: { value: new u.Pq0(1, 1, 1) },
                  },
                  u.XIg,
                ),
                v = (() => {
                  let e = new Uint8Array(262144),
                    t = [0, 1, 2, 3].map((e) =>
                      [4, 8, 16, 32].map((t, n) =>
                        ((e, t) => {
                          let n = new Float32Array(e * e),
                            r = 0x9e3779b1 * t;
                          for (let e = 0; e < n.length; e++)
                            ((r =
                              ((r =
                                ((r = (r ^ (r << 13)) >>> 0) ^ (r >>> 17)) >>>
                                0) ^
                                (r << 5)) >>>
                              0),
                              (n[e] = (r % 1e5) / 1e5));
                          return (t, r) => {
                            let i = t * e,
                              l = r * e,
                              a = Math.floor(i),
                              o = Math.floor(l),
                              u = i - a,
                              s = l - o,
                              d = u * u * u * (u * (6 * u - 15) + 10),
                              c = (t, r) =>
                                n[
                                  (((r % e) + e) % e) * e + (((t % e) + e) % e)
                                ],
                              m = c(a, o) + (c(a + 1, o) - c(a, o)) * d;
                            return (
                              m +
                              (c(a, o + 1) +
                                (c(a + 1, o + 1) - c(a, o + 1)) * d -
                                m) *
                                (s * s * s * (s * (6 * s - 15) + 10))
                            );
                          };
                        })(t, 13 * e + 7 * n + 3),
                      ),
                    );
                  for (let n = 0; n < 256; n++)
                    for (let r = 0; r < 256; r++) {
                      let i = r / 256,
                        l = n / 256;
                      for (let a = 0; a < 4; a++) {
                        let o = 0,
                          u = 0.5,
                          s = 0;
                        for (let e of t[a])
                          ((o += e(i, l) * u), (s += u), (u *= 0.5));
                        e[(256 * n + r) * 4 + a] = Math.round((o / s) * 255);
                      }
                    }
                  let n = new u.GYF(e, 256, 256, u.GWd);
                  return (
                    (n.wrapS = u.GJx),
                    (n.wrapT = u.GJx),
                    (n.minFilter = u.$_I),
                    (n.magFilter = u.k6q),
                    (n.generateMipmaps = !0),
                    (n.colorSpace = u.jf0),
                    (n.needsUpdate = !0),
                    n
                  );
                })();
              m.uniforms.uNoise.value = v;
              let b = new u.eaF(a, m);
              b.frustumCulled = !1;
              let y = new u.Z58();
              y.add(b);
              let w = null,
                S = [],
                C = 1,
                k = 40,
                L = 1,
                M = 1,
                T = 1,
                E = 1,
                F = [1, 1, 1],
                j = "hidden",
                R = 0,
                N = 40 * Math.random(),
                q = 1,
                I = 1,
                D = 0,
                U = 0,
                B = 0,
                A = !0,
                W = !1,
                O = !1,
                P = !1,
                H = n.current.visible,
                z = ["left", "right", "center", "edges", "random"],
                $ = () => {
                  (S.forEach((e) => e.dispose()),
                    (S = []),
                    w?.dispose(),
                    (w = null));
                },
                G = () => {
                  let a = n.current,
                    s = Array.from(t.querySelectorAll("[data-smoke-index]")),
                    d = e.getBoundingClientRect(),
                    v = getComputedStyle(t);
                  ((k = parseFloat(v.fontSize) || 16),
                    (T = Math.max(1, s.length)));
                  let h = k * (0.9 + 0.3 * f(a.turbulence, 0, 3)),
                    g = k * (0.6 + 0.4 * f(a.rise, 0, 4)),
                    x = k * (0.5 + 0.9 * f(a.rise, 0, 4)),
                    j = d.width + 2 * h,
                    R = d.height + g + x;
                  ((i.style.left = `${-h}px`),
                    (i.style.top = `${-g}px`),
                    (i.style.width = `${j}px`),
                    (i.style.height = `${R}px`),
                    (C =
                      Math.min(window.devicePixelRatio || 1, 2) *
                      f(a.quality, 0.25, 1)),
                    r.setPixelRatio(C),
                    r.setSize(j, R, !1),
                    (L = Math.max(1, Math.round(j * C))),
                    (M = Math.max(1, Math.round(R * C))));
                  let N = document.createElement("canvas");
                  ((N.width = L), (N.height = M));
                  let q = N.getContext("2d"),
                    I = [],
                    D = (e, t) =>
                      I.findIndex(
                        (n) => Math.abs((n.top + n.bottom) / 2 - e) < 0.5 * t,
                      );
                  if (q) {
                    (q.clearRect(0, 0, L, M),
                      (q.fillStyle = "#ffffff"),
                      (q.textBaseline = "alphabetic"),
                      (q.font = `${v.fontStyle} ${v.fontWeight} ${k * C}px ${v.fontFamily}`));
                    let e = q.measureText("Hg"),
                      t = e.fontBoundingBoxAscent || k * C * 0.8,
                      n = e.fontBoundingBoxDescent || k * C * 0.2;
                    for (let e of s) {
                      let r = e.textContent ?? "";
                      if (!r.trim()) continue;
                      let i = e.getBoundingClientRect(),
                        l = (i.left - d.left + h) * C,
                        a = (i.top - d.top + g) * C,
                        o = i.height * C,
                        u = a + (o * t) / (t + n),
                        s = D(M - a - o / 2, o);
                      ((q.fillStyle =
                        (s >= 0 ? s : I.length) % 2 == 0
                          ? "#ff0000"
                          : "#00ff00"),
                        q.fillText(r, l, u));
                      let c = M - a,
                        m = M - (a + o),
                        f = s >= 0 ? I[s] : void 0,
                        v = l + i.width * C;
                      f
                        ? ((f.x0 = Math.min(f.x0, l)),
                          (f.x1 = Math.max(f.x1, v)))
                        : I.push({ x0: l, x1: v, top: c, bottom: m });
                    }
                  }
                  E = Math.max(1, Math.min(6, I.length));
                  for (let e = 0; e < 6; e++) {
                    let t = I[Math.min(e, I.length - 1)] ?? {
                      x0: 0,
                      x1: L,
                      top: M,
                      bottom: 0,
                    };
                    o[e].set(t.x0, t.x1, t.top, t.bottom);
                  }
                  ($(),
                    ((w = new u.GOR(N)).minFilter = u.k6q),
                    (w.magFilter = u.k6q),
                    (w.generateMipmaps = !1),
                    (w.colorSpace = u.jf0),
                    (w.premultiplyAlpha = !0),
                    (w.needsUpdate = !0));
                  let U = Math.max(1, (k * C) / 60),
                    B = w,
                    A = L,
                    W = M;
                  for (let e = 1; e <= 5; e++) {
                    let t = 1 === e ? Math.max(1, Math.round(U)) : 2,
                      n = Math.max(2, Math.round(A / t)),
                      i = Math.max(2, Math.round(W / t)),
                      a = new u.nWS(n, i, {
                        type: u.ix0,
                        format: u.GWd,
                        minFilter: u.k6q,
                        magFilter: u.k6q,
                        depthBuffer: !1,
                        stencilBuffer: !1,
                        generateMipmaps: !1,
                      });
                    ((c.uniforms.uSource.value = B),
                      c.uniforms.uTexel.value.set(
                        (1 / A) * Math.max(1, 0.75 * t),
                        (1 / W) * Math.max(1, 0.75 * t),
                      ),
                      (b.material = c),
                      r.setRenderTarget(a),
                      r.render(y, l),
                      S.push(a),
                      (B = a.texture),
                      (A = n),
                      (W = i));
                  }
                  (r.setRenderTarget(null),
                    (b.material = m),
                    (F = p(getComputedStyle(t).color, [1, 1, 1])));
                },
                _ = () => {
                  let e = n.current,
                    t = f(e.duration, 0.1, 10);
                  return {
                    duration: t,
                    total: (I = f(e.stagger, 0, 2) * Math.max(0, T - 1)) + t,
                  };
                },
                X = (e) => {
                  t.style.opacity = String(e);
                },
                Y = () => {
                  !w ||
                    S.length < 5 ||
                    ((() => {
                      let e = n.current,
                        t = m.uniforms,
                        r = p(e.smokeColor, F),
                        { duration: i } = _();
                      t.uL0.value = w;
                      for (let e = 1; e <= 5; e++)
                        t[`uL${e}`].value = S[e - 1]?.texture ?? null;
                      (t.uResolution.value.set(L, M),
                        (t.uEm.value = k * C),
                        (t.uTime.value = N),
                        (t.uClock.value =
                          "hidden" === j ? -1e4 : "shown" === j ? 1e4 : R),
                        (t.uDuration.value = i),
                        (t.uSpan.value = I),
                        (t.uMode.value = D),
                        (t.uExit.value = +("dissolving" === j)),
                        (t.uLineCount.value = E),
                        (t.uRise.value = f(e.rise, 0, 4)),
                        (t.uTurbulence.value = f(e.turbulence, 0, 3)),
                        (t.uSoftness.value = f(e.softness, 0.1, 1.5)),
                        (t.uDensity.value = f(e.density, 0, 3)),
                        (t.uLetterLayer.value = q),
                        t.uText.value.set(F[0], F[1], F[2]),
                        t.uSmoke.value.set(r[0], r[1], r[2]));
                    })(),
                    (b.material = m),
                    r.setRenderTarget(null),
                    r.clear(),
                    "hidden" !== j && r.render(y, l));
                },
                V = (e) => {
                  if (((U = 0), W)) return;
                  let t = Math.min(0.05, Math.max(0, (e - B) / 1e3));
                  ((B = e),
                    ((e) => {
                      let t = f(n.current.speed, 0.05, 4);
                      if (((N += e * t), "condensing" === j)) {
                        R += e * t;
                        let { total: r } = _();
                        R >= r &&
                          ((j = "shown"),
                          X(1),
                          P || ((P = !0), n.current.onComplete?.()),
                          (q = 1));
                      } else if ("dissolving" === j) {
                        R += e * t;
                        let { total: n } = _();
                        R >= n && (j = "hidden");
                      }
                      "shown" === j && q > 0 && (q = Math.max(0, q - e / 0.35));
                    })(t),
                    Y(),
                    A &&
                      !document.hidden &&
                      !n.current.reduced &&
                      ("condensing" === j ||
                        "dissolving" === j ||
                        ("shown" === j && q > 0)) &&
                      (U = requestAnimationFrame(V)));
                };
              function J() {
                W ||
                  U ||
                  !A ||
                  ((B = performance.now()), (U = requestAnimationFrame(V)));
              }
              let Q = (e) => {
                  let t = n.current;
                  if (
                    ((O = !0),
                    (P = !1),
                    (D = z.indexOf(e ?? t.direction)) < 0 && (D = 0),
                    t.reduced)
                  ) {
                    ((j = "shown"), (q = 0), X(1), Y());
                    return;
                  }
                  ((j = "condensing"),
                    (R = -f(t.delay, 0, 10)),
                    (q = 1),
                    X(0),
                    J());
                },
                K = () => {
                  let e = n.current;
                  if (((O = !0), e.reduced)) {
                    ((j = "hidden"), X(0), Y());
                    return;
                  }
                  ((D = z.indexOf(e.direction)) < 0 && (D = 0),
                    (j = "dissolving"),
                    (R = 0),
                    (q = 1),
                    X(0),
                    J());
                },
                Z = () => {
                  (G(), Y(), J());
                },
                ee = (t) => {
                  let r = n.current;
                  if (
                    !r.replayOnHover ||
                    r.reduced ||
                    "touch" === t.pointerType ||
                    "condensing" === j ||
                    "dissolving" === j
                  )
                    return;
                  let i = e.getBoundingClientRect();
                  Q(t.clientX < i.left + i.width / 2 ? "left" : "right");
                };
              e.addEventListener("pointerenter", ee);
              let et = new ResizeObserver(() => Z());
              et.observe(e);
              let en = new IntersectionObserver(
                (e) => {
                  let t = e[0];
                  A = e.some((e) => e.isIntersecting);
                  let r = n.current;
                  (!O &&
                    "view" === r.trigger &&
                    r.visible &&
                    t &&
                    t.intersectionRatio >= 0.35 &&
                    Q(),
                    A && J());
                },
                { threshold: [0, 0.35, 1], rootMargin: "120px 0px" },
              );
              en.observe(e);
              let er = () => {
                document.hidden || J();
              };
              (document.addEventListener("visibilitychange", er),
                document.fonts?.ready &&
                  document.fonts.ready.then(() => !W && Z()).catch(() => {}),
                G());
              let ei = n.current;
              return (
                ei.visible
                  ? ei.reduced || "manual" === ei.trigger
                    ? ((j = "shown"), (q = 0), (O = !0), X(1))
                    : "mount" === ei.trigger
                      ? Q()
                      : X(0)
                  : X(0),
                Y(),
                {
                  measure: Z,
                  sync: () => {
                    let e = n.current;
                    if (e.visible !== H) {
                      H = e.visible;
                      let t = "shown" === j || "condensing" === j;
                      e.visible && !t ? Q() : !e.visible && t && K();
                    }
                    (e.reduced &&
                      "hidden" !== j &&
                      ((j = "shown"), (q = 0), X(1)),
                      Math.abs(
                        Math.min(window.devicePixelRatio || 1, 2) *
                          f(e.quality, 0.25, 1) -
                          C,
                      ) > 0.001 && G(),
                      Y(),
                      J());
                  },
                  destroy: () => {
                    ((W = !0),
                      cancelAnimationFrame(U),
                      e.removeEventListener("pointerenter", ee),
                      document.removeEventListener("visibilitychange", er),
                      et.disconnect(),
                      en.disconnect(),
                      $(),
                      a.dispose(),
                      c.dispose(),
                      m.dispose(),
                      v.dispose(),
                      r.dispose(),
                      r.forceContextLoss(),
                      i.remove(),
                      (t.style.opacity = ""));
                  },
                  replay: (e) => Q(e),
                  condense: () => Q(),
                  dissolve: K,
                }
              );
            })(e, t, z);
            return (
              (O.current = n),
              () => {
                (n?.destroy(), (O.current = null));
              }
            );
          }, []),
          (0, i.useEffect)(() => {
            O.current?.measure();
          }, [H, n, l, a, o, v, b]),
          (0, i.useImperativeHandle)(
            B,
            () => ({
              replay: () => O.current?.replay(),
              condense: () => O.current?.condense(),
              dissolve: () => O.current?.dissolve(),
            }),
            [],
          ),
          (0, r.jsx)(t, {
            ref: A,
            className: (0, d.cn)("relative inline-block max-w-full", D),
            style: {
              fontSize: "number" == typeof n ? `${n}px` : n,
              fontWeight: l,
              letterSpacing: a,
              lineHeight: o,
              textAlign: v,
              color: b,
              ...U,
            },
            children: (0, r.jsx)("span", {
              ref: W,
              style: {
                position: "relative",
                zIndex: 1,
                opacity: +!!P,
                whiteSpace: "pre-wrap",
              },
              children: H.map((e, t) =>
                (0, r.jsx)("span", { "data-smoke-index": t, children: e }, t),
              ),
            }),
          })
        );
      });
    b.displayName = "SmokeType";
    let y = {
        dark: "#B19EEF",
        light: "#5227FF",
        direction: "left",
        duration: 0.9,
        stagger: 0.11,
        rise: 1,
        turbulence: 1,
        softness: 1,
        density: 1,
      },
      w = {
        incense: y,
        mist: {
          ...y,
          dark: "#D6CCFF",
          light: "#8B7CF6",
          direction: "center",
          duration: 1.6,
          stagger: 0.06,
          rise: 0.6,
          turbulence: 0.6,
          softness: 1.3,
        },
        wraith: {
          ...y,
          direction: "random",
          duration: 1.2,
          stagger: 0.14,
          rise: 1.6,
          turbulence: 1.8,
        },
        quick: { ...y, duration: 0.55, stagger: 0.05, rise: 0.8 },
        embers: {
          ...y,
          dark: "#FF8A3D",
          light: "#C2410C",
          direction: "edges",
          duration: 1,
          rise: 1.2,
          turbulence: 1.3,
        },
      },
      S = [
        { label: "Incense", value: "incense" },
        { label: "Mist", value: "mist" },
        { label: "Wraith", value: "wraith" },
        { label: "Quick", value: "quick" },
        { label: "Embers", value: "embers" },
      ],
      C = [
        { label: "Left to right", value: "left" },
        { label: "Right to left", value: "right" },
        { label: "Center out", value: "center" },
        { label: "Edges in", value: "edges" },
        { label: "Random", value: "random" },
      ],
      k = [
        { label: "In view", value: "view" },
        { label: "On mount", value: "mount" },
      ],
      L = [
        { label: "Regular", value: "400" },
        { label: "Medium", value: "500" },
        { label: "Semibold", value: "600" },
        { label: "Bold", value: "700" },
      ],
      M = [
        {
          name: "text",
          type: "string",
          default: '"Out of thin air"',
          description:
            "The headline. It stays real, selectable text; the smoke is drawn behind it.",
        },
        {
          name: "as",
          type: '"span" | "div" | "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6"',
          default: '"span"',
          description: "Element to render.",
        },
        {
          name: "fontSize",
          type: "number | string",
          default: '"clamp(2.75rem, 8vw, 6.5rem)"',
          description:
            "Font size. Numbers are pixels; strings accept any CSS length.",
        },
        {
          name: "fontWeight",
          type: "number",
          default: "600",
          description:
            "Font weight. The font family is inherited from the page.",
        },
        {
          name: "letterSpacing",
          type: "string",
          default: '"-0.035em"',
          description: "Letter spacing as a CSS length.",
        },
        {
          name: "lineHeight",
          type: "number",
          default: "1.1",
          description:
            "Line height for wrapped headlines. Each line condenses in turn.",
        },
        {
          name: "align",
          type: '"left" | "center" | "right"',
          default: '"center"',
          description: "Text alignment.",
        },
        {
          name: "color",
          type: "string",
          default: "inherited",
          description:
            "Colour of the finished letters. Leave unset to inherit from the page.",
        },
        {
          name: "smokeColor",
          type: "string",
          default: '"#B19EEF"',
          description:
            "Colour of the smoke. Letters shift from this colour to their own as they settle.",
        },
        {
          name: "trigger",
          type: '"view" | "mount" | "manual"',
          default: '"view"',
          description:
            "When the first reveal plays: when the headline scrolls into view, as soon as it mounts, or only when visible becomes true.",
        },
        {
          name: "visible",
          type: "boolean",
          default: "true",
          description:
            "Set to false to dissolve the headline into rising smoke, and back to true to condense it again.",
        },
        {
          name: "direction",
          type: '"left" | "right" | "center" | "edges" | "random"',
          default: '"left"',
          description: "Order the letters condense in.",
        },
        {
          name: "delay",
          type: "number",
          default: "0.15",
          description: "Seconds before the reveal starts.",
        },
        {
          name: "duration",
          type: "number",
          default: "0.9",
          description: "Seconds each letter takes to condense.",
        },
        {
          name: "stagger",
          type: "number",
          default: "0.11",
          description: "Seconds between one letter and the next.",
        },
        {
          name: "rise",
          type: "number",
          default: "1",
          description: "How far the smoke drifts up into place, in em.",
        },
        {
          name: "turbulence",
          type: "number",
          default: "1",
          description:
            "How much the smoke swirls on its way, from 0 (straight) to 3.",
        },
        {
          name: "softness",
          type: "number",
          default: "1",
          description: "How diffuse the smoke is before it condenses.",
        },
        {
          name: "density",
          type: "number",
          default: "1",
          description: "Opacity of the smoke, from 0 to 3.",
        },
        {
          name: "speed",
          type: "number",
          default: "1",
          description: "Time scale for the whole effect.",
        },
        {
          name: "replayOnHover",
          type: "boolean",
          default: "false",
          description:
            "Replay the reveal when the pointer enters, sweeping in from the side it came from.",
        },
        {
          name: "quality",
          type: "number",
          default: "1",
          description: "Resolution scale for the smoke, from 0.25 to 1.",
        },
        {
          name: "onComplete",
          type: "() => void",
          default: "—",
          description: "Called when a reveal finishes.",
        },
        {
          name: "ref",
          type: "{ replay, condense, dissolve }",
          default: "—",
          description:
            "Play the reveal again, or condense and dissolve the headline from code.",
        },
        {
          name: "className",
          type: "string",
          default: "—",
          description: "Classes for the root element.",
        },
        {
          name: "style",
          type: "CSSProperties",
          default: "—",
          description: "Inline styles for the root element.",
        },
      ],
      T = () => {
        let [e, t] = (0, o.I)(),
          n = "dark" === (0, a.Y)(),
          [u, s] = (0, i.useState)("Out of thin air"),
          [d, c] = (0, i.useState)("incense"),
          [m, f] = (0, i.useState)(y),
          v = (e) => (t) => f((n) => ({ ...n, [e]: t })),
          [p, h] = (0, i.useState)(null),
          g = p ?? (n ? m.dark : m.light),
          [x, T] = (0, i.useState)(null),
          E = x ?? (n ? "#FFFFFF" : "#0A0A0A"),
          [F, j] = (0, i.useState)("view"),
          [R, N] = (0, i.useState)(!0),
          [q, I] = (0, i.useState)(84),
          [D, U] = (0, i.useState)("600"),
          [B, A] = (0, i.useState)(1),
          [W, O] = (0, i.useState)(!1);
        return (0, r.jsxs)("div", {
          children: [
            (0, r.jsx)(l.Bg, {}),
            (0, r.jsxs)(l.VX, {
              children: [
                (0, r.jsxs)(l.Ec, {
                  children: [
                    (0, r.jsx)(l.Ch, {
                      onRefresh: t,
                      minHeight: 500,
                      enableResponsive: !0,
                      children: (0, r.jsx)("div", {
                        className:
                          "flex h-full w-full items-center justify-center overflow-hidden px-6 pb-12 pt-24 sm:px-12",
                        children: (0, r.jsx)(
                          b,
                          {
                            as: "h2",
                            text: u,
                            fontSize: `min(${q}px, 11vw)`,
                            fontWeight: Number(D),
                            color: E,
                            smokeColor: g,
                            trigger: F,
                            visible: R,
                            direction: m.direction,
                            duration: m.duration,
                            stagger: m.stagger,
                            rise: m.rise,
                            turbulence: m.turbulence,
                            softness: m.softness,
                            density: m.density,
                            speed: B,
                            replayOnHover: W,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, r.jsxs)(l.IH, {
                      children: [
                        (0, r.jsx)(l.UD, {
                          title: "Text",
                          value: u,
                          onChange: s,
                        }),
                        (0, r.jsx)(l.bg, {
                          title: "Style",
                          value: d,
                          options: S,
                          onChange: (e) => {
                            (c(e), f(w[e] ?? y), h(null), t());
                          },
                        }),
                        (0, r.jsx)(l.bg, {
                          title: "Direction",
                          value: m.direction,
                          options: C,
                          onChange: (e) => v("direction")(e),
                        }),
                        (0, r.jsx)(l.bg, {
                          title: "Trigger",
                          value: F,
                          options: k,
                          onChange: (e) => j(e),
                        }),
                        (0, r.jsx)(l.bg, {
                          title: "Weight",
                          value: D,
                          options: L,
                          onChange: U,
                        }),
                        (0, r.jsx)(l.W7, {
                          title: "Text",
                          value: E,
                          onChange: T,
                        }),
                        (0, r.jsx)(l.W7, {
                          title: "Smoke",
                          value: g,
                          onChange: h,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Font Size",
                          min: 24,
                          max: 160,
                          step: 1,
                          value: q,
                          valueUnit: "px",
                          onChange: I,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Duration",
                          min: 0.2,
                          max: 3,
                          step: 0.05,
                          value: m.duration,
                          valueUnit: "s",
                          onChange: v("duration"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Stagger",
                          min: 0,
                          max: 0.4,
                          step: 0.01,
                          value: m.stagger,
                          valueUnit: "s",
                          onChange: v("stagger"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Rise",
                          min: 0,
                          max: 4,
                          step: 0.05,
                          value: m.rise,
                          valueUnit: "em",
                          onChange: v("rise"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Turbulence",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: m.turbulence,
                          onChange: v("turbulence"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Softness",
                          min: 0.1,
                          max: 1.5,
                          step: 0.05,
                          value: m.softness,
                          onChange: v("softness"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Density",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: m.density,
                          onChange: v("density"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Speed",
                          min: 0.1,
                          max: 3,
                          step: 0.05,
                          value: B,
                          onChange: A,
                        }),
                        (0, r.jsx)(l.tl, {
                          title: "Visible",
                          checked: R,
                          onChange: N,
                        }),
                        (0, r.jsx)(l.tl, {
                          title: "Replay On Hover",
                          checked: W,
                          onChange: O,
                        }),
                      ],
                    }),
                    (0, r.jsx)(l.Ub, { data: M }),
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
