/* ReactBits Pro public preview module 13399 for ribbon-type.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/13399.c71b11fdc196e277.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  13399: (e, t, n) => {
    (n.r(t), n.d(t, { default: () => T }));
    var a = n(95155),
      i = n(12115),
      r = n(56388),
      l = n(86049),
      o = n(90761),
      s = n(12246),
      d = n(2253),
      u = n(90650);
    let p = 2 * Math.PI,
      h = `
attribute float aLane;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorld;
varying float vLane;
void main() {
  vUv = uv;
  vLane = aLane;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`,
      c = `
uniform sampler2D uText;
uniform vec3 uBand;
uniform vec3 uInk;
uniform float uBandOn;
uniform float uShading;
uniform float uSheen;
uniform float uOpacity;
uniform vec3 uLight;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorld;
varying float vLane;
void main() {
  vec3 n = normalize(vNormal);
  bool front = gl_FrontFacing;
  if (!front) n = -n;
  vec3 view = normalize(cameraPosition - vWorld);
  float facing = dot(n, uLight);
  float wrap = facing * 0.5 + 0.5;
  float light = mix(1.0, 0.3 + 0.62 * wrap * wrap + 0.2 * max(facing, 0.0), uShading);
  vec3 halfway = normalize(uLight + view);
  float spec = pow(max(dot(n, halfway), 0.0), 56.0) * uSheen * 0.55;
  float rim = pow(1.0 - abs(dot(n, view)), 4.0) * uSheen * 0.22;
  float glyph = texture2D(uText, vUv).a;
  bool swapped = mod(vLane, 2.0) > 0.5;
  vec3 band = swapped ? uInk : uBand;
  vec3 ink = swapped ? uBand : uInk;
  vec3 color;
  float alpha = 1.0;
  if (uBandOn > 0.5) {
    vec3 surface = front ? mix(band, ink, glyph) : band * 0.6;
    color = surface * light + vec3(spec + rim);
  } else {
    color = ink * light * (front ? 1.0 : 0.55) + vec3(spec * glyph);
    alpha = glyph;
    if (alpha < 0.01) discard;
  }
  gl_FragColor = vec4(color, alpha * uOpacity);
  #include <colorspace_fragment>
}
`,
      m = (e, t, n) => Math.min(n, Math.max(t, e)),
      f = (e, t) => (Number.isFinite(e) ? e : t),
      g = (e) => {
        let t = m(e, 0, 1);
        return t * t * (3 - 2 * t);
      },
      v = null,
      b = (e, t) => {
        if (
          "undefined" == typeof document ||
          !e ||
          ("undefined" != typeof CSS &&
            "function" == typeof CSS.supports &&
            !CSS.supports("color", e))
        )
          return t;
        if (!v) {
          let e = document.createElement("canvas");
          ((e.width = 1),
            (e.height = 1),
            (v = e.getContext("2d", { willReadFrequently: !0 })));
        }
        if (!v) return t;
        (v.clearRect(0, 0, 1, 1),
          (v.fillStyle = "#000"),
          (v.fillStyle = e),
          v.fillRect(0, 0, 1, 1));
        let n = v.getImageData(0, 0, 1, 1).data;
        return `rgb(${n[0]}, ${n[1]}, ${n[2]})`;
      },
      w = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      x = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      y = (0, i.forwardRef)(function (
        {
          text: e = "MAKE SPACE FOR IDEAS",
          separator: t = "  \xb7  ",
          colors: n = ["#5227FF", "#FFFFFF"],
          band: r = !0,
          path: l = "wave",
          ribbons: o = 1,
          gap: v = 120,
          ribbonWidth: y = 76,
          textScale: F = 0.5,
          fontFamily: S = "inherit",
          fontWeight: C = 700,
          letterSpacing: M = 0.06,
          amplitude: A = 70,
          frequency: j = 1.1,
          depth: E = 120,
          twist: T = 0.12,
          twistSpeed: k = 0.12,
          speed: W = 90,
          direction: I = "left",
          flow: L = 0.35,
          tilt: R = -6,
          perspective: P = 32,
          shading: U = 0.6,
          sheen: B = 0.4,
          hoverSpeed: N = 0.3,
          draggable: D = !0,
          clickTwist: H = !0,
          autoTwist: q = 0,
          intro: $ = !0,
          paused: O = !1,
          quality: X = 1,
          className: z,
          style: Y,
          children: _,
        },
        G,
      ) {
        let V = (0, i.useRef)(null),
          K = (0, i.useRef)(null),
          Q = {
            text: e,
            separator: t,
            colors: n,
            band: r,
            path: l,
            ribbons: o,
            gap: v,
            ribbonWidth: y,
            textScale: F,
            fontFamily: S,
            fontWeight: C,
            letterSpacing: M,
            amplitude: A,
            frequency: j,
            depth: E,
            twist: T,
            twistSpeed: k,
            speed: W,
            direction: I,
            flow: L,
            tilt: R,
            perspective: P,
            shading: U,
            sheen: B,
            hoverSpeed: N,
            draggable: D,
            clickTwist: H,
            autoTwist: q,
            intro: $,
            paused: O,
            quality: X,
            reduced: (0, i.useSyncExternalStore)(w, x, () => !1),
          },
          J = (0, i.useRef)(Q);
        return (
          (0, i.useEffect)(() => {
            ((J.current = Q), K.current?.sync());
          }),
          (0, i.useEffect)(() => {
            let e = V.current;
            if (!e) return;
            let t = ((e, t) => {
              let n,
                a = e.ownerDocument,
                i = a.defaultView ?? window,
                r = a.createElement("canvas");
              (r.setAttribute("aria-hidden", "true"),
                (r.style.cssText =
                  "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:pan-y"),
                e.insertBefore(r, e.firstChild));
              try {
                n = new s.WebGLRenderer({
                  canvas: r,
                  alpha: !0,
                  antialias: !0,
                  premultipliedAlpha: !0,
                });
              } catch {
                return (r.remove(), null);
              }
              n.setClearColor(0, 0);
              let l = () => t.current,
                o = new d.Z58(),
                u = new d.ubm(32, 1, 1, 2e4),
                v = new d.LoY(),
                w = a.createElement("canvas"),
                x = new d.GOR(w);
              ((x.wrapS = d.GJx),
                (x.wrapT = d.ghU),
                (x.minFilter = d.$_I),
                (x.magFilter = d.k6q),
                (x.generateMipmaps = !0),
                (x.anisotropy = n.capabilities.getMaxAnisotropy()));
              let y = new d.Q1f("#5227FF"),
                F = new d.Q1f("#FFFFFF"),
                S = new d.BKk({
                  vertexShader: h,
                  fragmentShader: c,
                  uniforms: {
                    uText: { value: x },
                    uBand: { value: y },
                    uInk: { value: F },
                    uBandOn: { value: 1 },
                    uShading: { value: 0.6 },
                    uSheen: { value: 0.4 },
                    uOpacity: { value: 0 },
                    uLight: { value: new d.Pq0(-0.35, 0.55, 0.76).normalize() },
                  },
                  side: d.$EB,
                  transparent: !0,
                }),
                C = new d.eaF(v, S);
              ((C.frustumCulled = !1), o.add(C));
              let M = 0,
                A = 0,
                j = !1,
                E = !0,
                T = !1,
                k = 1,
                W = 1,
                I = 0,
                L = 0,
                R = "",
                P = "",
                U = 1,
                B = 0,
                N = 0,
                D = 1,
                H = 0,
                q = 0,
                $ = 0,
                O = new Float32Array(0),
                X = new Float32Array(0),
                z = new Float32Array(0),
                Y = [],
                _ = [],
                G = {
                  inside: !1,
                  down: !1,
                  id: -1,
                  startX: 0,
                  startY: 0,
                  startAt: 0,
                  lastX: 0,
                  lastAt: 0,
                  moved: !1,
                },
                V = new d.Pq0(),
                K = () => {
                  let e = l(),
                    t = Math.round(520 * m(f(e.quality, 1), 0.4, 1)),
                    n = Math.round(m(f(e.ribbons, 1), 1, 3));
                  if (t === I && n === L) return;
                  let a = ((I = t) + 1) * 2 * (L = n);
                  ((O = new Float32Array(3 * a)),
                    (X = new Float32Array(3 * a)),
                    (z = new Float32Array(2 * a)));
                  let i = new Float32Array(a),
                    r = [];
                  for (let e = 0; e < L; e++) {
                    let t = e * (I + 1) * 2;
                    for (let n = 0; n <= I; n++)
                      ((i[t + 2 * n] = e), (i[t + 2 * n + 1] = e));
                    for (let e = 0; e < I; e++) {
                      let n = t + 2 * e;
                      r.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
                    }
                  }
                  Y.length = 0;
                  for (let e = 0; e < L; e++)
                    Y.push({
                      points: new Float32Array((I + 1) * 3),
                      lengths: new Float32Array(I + 1),
                      total: 1,
                    });
                  (v.dispose(),
                    v.setAttribute("position", new d.THS(O, 3).setUsage(d.Vnu)),
                    v.setAttribute("normal", new d.THS(X, 3).setUsage(d.Vnu)),
                    v.setAttribute("uv", new d.THS(z, 2).setUsage(d.Vnu)),
                    v.setAttribute("aLane", new d.THS(i, 1)),
                    v.setIndex(r));
                },
                Q = () => {
                  var t;
                  let n = l(),
                    a =
                      n.fontFamily && "inherit" !== n.fontFamily
                        ? n.fontFamily
                        : i.getComputedStyle(e).fontFamily,
                    r = Math.round(m(f(n.fontWeight, 700), 100, 900)),
                    o = m(f(n.letterSpacing, 0.06), -0.2, 1),
                    s = m(f(n.textScale, 0.5), 0.15, 0.95),
                    d = `${n.text ?? ""}${n.separator ?? ""}`,
                    u = `${d}|${a}|${r}|${o}|${s}`;
                  if (u === R) return;
                  R = u;
                  let p = w.getContext("2d");
                  if (!p) return;
                  let h =
                      ((t = d.length > 0 ? d : " "),
                      "undefined" != typeof Intl && "Segmenter" in Intl
                        ? Array.from(
                            new Intl.Segmenter(void 0, {
                              granularity: "grapheme",
                            }).segment(t),
                            (e) => e.segment,
                          )
                        : Array.from(t)),
                    c = 120,
                    g = (e) => `${r} ${e}px ${a}`;
                  p.font = g(120);
                  let v = (e) => (
                      (p.font = g(e)),
                      h.reduce((t, n) => t + p.measureText(n).width + o * e, 0)
                    ),
                    b = v(c);
                  b > 8e3 &&
                    (b = v((c = Math.max(24, Math.floor((8e3 * c) / b)))));
                  let y = Math.round(c / s);
                  ((w.width = Math.max(2, Math.ceil(b))),
                    (w.height = Math.max(2, y)),
                    p.clearRect(0, 0, w.width, w.height),
                    (p.font = g(c)),
                    (p.fillStyle = "#fff"),
                    (p.textBaseline = "alphabetic"));
                  let F =
                      y / 2 +
                      (p.measureText("H").actualBoundingBoxAscent || 0.7 * c) /
                        2,
                    S = (o * c) / 2;
                  for (let e of h)
                    (p.fillText(e, S, F),
                      (S += p.measureText(e).width + o * c));
                  ((U = w.width / w.height), x.dispose(), (x.needsUpdate = !0));
                },
                J = () => {
                  let t = l(),
                    n = Array.isArray(t.colors) ? t.colors : [],
                    a = "",
                    r = (t, n) => {
                      let r = (t ?? "").trim();
                      return r && "currentcolor" !== r.toLowerCase()
                        ? b(r, n)
                        : (a || (a = i.getComputedStyle(e).color), b(a, n));
                    },
                    o = r(n[0], "#5227FF"),
                    s = r(n[1], "#FFFFFF"),
                    d = `${o}|${s}`;
                  d !== P && ((P = d), y.setStyle(o), F.setStyle(s));
                },
                Z = () => {
                  let t = l(),
                    a = e.getBoundingClientRect();
                  ((k = Math.max(1, a.width)), (W = Math.max(1, a.height)));
                  let r =
                    Math.min(i.devicePixelRatio || 1, 2) *
                    m(f(t.quality, 1), 0.5, 1);
                  (n.setPixelRatio(r), n.setSize(k, W, !1));
                  let o = m(f(t.perspective, 32), 10, 80);
                  ((u.fov = o),
                    (u.aspect = k / W),
                    u.position.set(0, 0, W / 2 / Math.tan((o * Math.PI) / 360)),
                    (u.near = 1),
                    (u.far = 6 * u.position.z),
                    u.lookAt(0, 0, 0),
                    u.updateProjectionMatrix());
                },
                ee = (e, t, n, a) => {
                  let i = l(),
                    r = f(i.amplitude, 70),
                    o = m(f(i.frequency, 1.1), 0, 6),
                    s = f(i.depth, 120),
                    d = B * m(f(i.flow, 0.35), -4, 4) + 1.9 * e,
                    u = f(i.gap, 120),
                    h = (e - (L - 1) / 2) * u;
                  if ("loop" === i.path) {
                    let e = Math.min(0.34 * k, 0.95 * W),
                      i = -p * t;
                    ((n[a] = e * Math.cos(i)),
                      (n[a + 1] = h + 0.35 * r * Math.sin(2 * i + d)),
                      (n[a + 2] =
                        e * Math.sin(i) + 0.15 * s * Math.sin(3 * i - d)));
                    return;
                  }
                  let c = 1.3 * k,
                    g = ((t - 0.5) * c) / k;
                  if ("helix" === i.path) {
                    let e = p * o * g + d,
                      i = 0.9 * Math.abs(r) + 1;
                    ((n[a] = (t - 0.5) * c),
                      (n[a + 1] = h + i * Math.cos(e)),
                      (n[a + 2] = i * Math.sin(e)));
                    return;
                  }
                  ((n[a] = (t - 0.5) * c),
                    (n[a + 1] = h + r * Math.sin(p * o * g + d)),
                    (n[a + 2] =
                      s * Math.sin(p * o * 0.5 * g + 0.6 * d + 1.3 + e)));
                },
                et = (e, t, n, a, i) => {
                  let r = l(),
                    o = B * m(f(r.twistSpeed, 0.12), -4, 4) * p + 1.7 * e,
                    s = a ? (2 * p * t) / n : (t / Math.max(1, k)) * Math.PI,
                    d = p * m(f(r.twist, 0.12), 0, 2) * Math.sin(s + o);
                  for (let r of _) {
                    if (r.lane !== e) continue;
                    let l = (i - r.start) * 760,
                      o = Math.abs(t - r.origin);
                    (a && (o = Math.min(o, n - o)),
                      (d += p * g((l - o) / 460)));
                  }
                  return d;
                },
                en = (e, t, n) => {
                  l().reduced ||
                    (_.length > 6 && _.shift(),
                    _.push({ lane: e, origin: t, start: n }));
                },
                ea = () => {
                  j || !E || M || (M = i.requestAnimationFrame(ei));
                };
              function ei(e) {
                if (((M = 0), j)) return;
                let t = l(),
                  a = A ? m((e - A) / 1e3, 1 / 240, 0.05) : 1 / 60;
                A = e;
                let i = performance.now() / 1e3,
                  r = t.reduced || t.paused;
                if (
                  !T &&
                  ((T = !0),
                  (q = i),
                  ($ = i + Math.max(1.5, f(t.autoTwist, 0))),
                  t.intro && !t.reduced)
                )
                  for (let e = 0; e < L; e++) en(e, 0, i + 0.12 * e);
                r || (B += a);
                let s = G.inside && !G.down ? m(f(t.hoverSpeed, 0.3), 0, 1) : 1;
                D += (s - D) * (1 - Math.exp(-(4 * a)));
                let d = "right" === t.direction ? -1 : 1,
                  h = r ? 0 : m(f(t.speed, 90), -2e3, 2e3) * d * D;
                (G.down || (H *= Math.exp(-a / 0.55)), (N += (h + H) * a));
                let c = f(t.autoTwist, 0);
                if (c > 0 && !r && i >= $) {
                  $ = i + Math.max(0.5, c);
                  let e = Math.floor(Math.random() * L),
                    t = Y[e];
                  t && en(e, t.total * (0.2 + 0.6 * Math.random()), i);
                }
                for (let e = _.length - 1; e >= 0; e--) {
                  let t = Y[_[e].lane],
                    n = t
                      ? "loop" === l().path
                        ? t.total / 2
                        : Math.max(_[e].origin, t.total - _[e].origin)
                      : 0;
                  (i - _[e].start) * 760 - n > 460 && _.splice(e, 1);
                }
                let b = t.intro && !t.reduced ? g((i - q) / 0.6) : 1;
                ((S.uniforms.uOpacity.value = b),
                  (S.uniforms.uBandOn.value = +!!t.band),
                  (S.uniforms.uShading.value = m(f(t.shading, 0.6), 0, 1)),
                  (S.uniforms.uSheen.value = m(f(t.sheen, 0.4), 0, 1)),
                  (S.depthWrite = t.band),
                  (C.rotation.x = (m(f(t.tilt, -6), -80, 80) * Math.PI) / 180),
                  ((e) => {
                    let t = l(),
                      n = m(f(t.ribbonWidth, 76), 8, 400) / 2,
                      a = "loop" === t.path;
                    for (let i = 0; i < L; i++) {
                      let r = Y[i],
                        l = r.points;
                      for (let e = 0; e <= I; e++) ee(i, e / I, l, 3 * e);
                      let o = 0;
                      r.lengths[0] = 0;
                      for (let e = 1; e <= I; e++)
                        ((o += Math.hypot(
                          l[3 * e] - l[3 * e - 3],
                          l[3 * e + 1] - l[3 * e - 2],
                          l[3 * e + 2] - l[3 * e - 1],
                        )),
                          (r.lengths[e] = o));
                      r.total = Math.max(1, o);
                      let s = 2 * n * U,
                        d = a ? Math.max(1, Math.round(r.total / s)) : 0,
                        u = a ? r.total / d : s,
                        h = i * (I + 1) * 2;
                      for (let o = 0; o <= I; o++) {
                        let s = a
                            ? 0 === o
                              ? I - 1
                              : o - 1
                            : Math.max(0, o - 1),
                          d = a ? (o === I ? 1 : o + 1) : Math.min(I, o + 1),
                          c = l[3 * d] - l[3 * s],
                          m = l[3 * d + 1] - l[3 * s + 1],
                          g = l[3 * d + 2] - l[3 * s + 2],
                          v = Math.hypot(c, m, g) || 1;
                        ((c /= v), (m /= v), (g /= v));
                        let b = 0,
                          w = 0,
                          x = 1;
                        if ("loop" === t.path) {
                          let e = (-p * o) / I;
                          ((b = Math.cos(e)), (w = 0), (x = Math.sin(e)));
                        } else if ("helix" === t.path) {
                          b = 0;
                          let e =
                            Math.hypot(
                              (w =
                                l[3 * o + 1] -
                                (i - (L - 1) / 2) * f(t.gap, 120)),
                              (x = l[3 * o + 2]),
                            ) || 1;
                          ((w /= e), (x /= e));
                        }
                        let y = b * c + w * m + x * g,
                          F = b - y * c,
                          S = w - y * m,
                          C = x - y * g,
                          M = Math.hypot(F, S, C) || 1;
                        F /= M;
                        let A = (S /= M) * g - (C /= M) * m,
                          j = C * c - F * g,
                          E = F * m - S * c,
                          T = et(i, r.lengths[o], r.total, a, e),
                          k = Math.cos(T),
                          W = Math.sin(T),
                          R = k * A + W * F,
                          P = k * j + W * S,
                          U = k * E + W * C,
                          B = m * U - g * P,
                          D = g * R - c * U,
                          H = c * P - m * R,
                          q = (h + 2 * o) * 3,
                          $ = l[3 * o],
                          Y = l[3 * o + 1],
                          _ = l[3 * o + 2];
                        ((O[q] = $ - R * n),
                          (O[q + 1] = Y - P * n),
                          (O[q + 2] = _ - U * n),
                          (O[q + 3] = $ + R * n),
                          (O[q + 4] = Y + P * n),
                          (O[q + 5] = _ + U * n),
                          (X[q] = B),
                          (X[q + 1] = D),
                          (X[q + 2] = H),
                          (X[q + 3] = B),
                          (X[q + 4] = D),
                          (X[q + 5] = H));
                        let G = (r.lengths[o] - N * (i % 2 == 1 ? -1 : 1)) / u,
                          V = (h + 2 * o) * 2;
                        ((z[V] = G),
                          (z[V + 1] = 0),
                          (z[V + 2] = G),
                          (z[V + 3] = 1));
                      }
                    }
                    ((v.getAttribute("position").needsUpdate = !0),
                      (v.getAttribute("normal").needsUpdate = !0),
                      (v.getAttribute("uv").needsUpdate = !0));
                  })(i),
                  n.render(o, u),
                  (!r || Math.abs(H) > 1 || _.length > 0 || b < 1) && ea());
              }
              let er = () => {
                  ((G.inside = !0), ea());
                },
                el = () => {
                  ((G.inside = !1), ea());
                },
                eo = (t) => {
                  0 !== t.button ||
                    G.down ||
                    (t.target !== r && t.target !== e) ||
                    ((G.down = !0),
                    (G.id = t.pointerId),
                    (G.startX = t.clientX),
                    (G.startY = t.clientY),
                    (G.lastX = t.clientX),
                    (G.startAt = performance.now() / 1e3),
                    (G.lastAt = G.startAt),
                    (G.moved = !1),
                    ea());
                },
                es = (t) => {
                  if (!G.down || t.pointerId !== G.id) return;
                  let n = l(),
                    a = t.clientX - G.lastX,
                    i = performance.now() / 1e3;
                  if (
                    (Math.hypot(t.clientX - G.startX, t.clientY - G.startY) >
                      6 && (G.moved = !0),
                    n.draggable && G.moved && "touch" !== t.pointerType)
                  ) {
                    let t = "right" === n.direction ? -1 : 1;
                    N -= a * t;
                    let r = Math.max(0.008, i - G.lastAt);
                    ((H = 0.6 * H + (-a / r) * t * 0.4),
                      (e.style.cursor = "grabbing"));
                  }
                  ((G.lastX = t.clientX), (G.lastAt = i), ea());
                },
                ed = (t) => {
                  if (!G.down || t.pointerId !== G.id) return;
                  let n = l();
                  if (
                    ((G.down = !1),
                    (e.style.cursor = ""),
                    performance.now() / 1e3 - G.lastAt > 0.12 && (H = 0),
                    !G.moved &&
                      performance.now() / 1e3 - G.startAt < 0.4 &&
                      n.clickTwist)
                  ) {
                    let n = ((t, n) => {
                      let a = e.getBoundingClientRect(),
                        i = t - a.left,
                        r = n - a.top,
                        l = 1 / 0,
                        o = 0,
                        s = 0;
                      C.updateMatrixWorld();
                      for (let e = 0; e < L; e++) {
                        let t = Y[e];
                        for (let n = 0; n <= I; n += 3) {
                          V.set(
                            t.points[3 * n],
                            t.points[3 * n + 1],
                            t.points[3 * n + 2],
                          )
                            .applyMatrix4(C.matrixWorld)
                            .project(u);
                          let a =
                            Math.hypot(
                              (0.5 * V.x + 0.5) * k - i,
                              (0.5 - 0.5 * V.y) * W - r,
                            ) - (V.z < 1 ? 0 : 1e6);
                          a < l && ((l = a), (o = e), (s = t.lengths[n]));
                        }
                      }
                      return { lane: o, origin: s };
                    })(t.clientX, t.clientY);
                    en(n.lane, n.origin, performance.now() / 1e3);
                  }
                  ea();
                };
              (e.addEventListener("pointerenter", er),
                e.addEventListener("pointerleave", el),
                e.addEventListener("pointerdown", eo),
                i.addEventListener("pointermove", es, { passive: !0 }),
                i.addEventListener("pointerup", ed),
                i.addEventListener("pointercancel", ed));
              let eu = new ResizeObserver(() => {
                (Z(), ea());
              });
              eu.observe(e);
              let ep = new IntersectionObserver(([e]) => {
                (E = e.isIntersecting)
                  ? ((A = 0), ea())
                  : M && (i.cancelAnimationFrame(M), (M = 0));
              });
              return (
                ep.observe(e),
                K(),
                J(),
                Q(),
                Z(),
                a.fonts &&
                  a.fonts.ready &&
                  a.fonts.ready.then(() => {
                    j || ((R = ""), Q(), ea());
                  }),
                {
                  sync: () => {
                    (K(), J(), Q(), Z(), ea());
                  },
                  twist: (e) => {
                    let t = Y[0];
                    if (!t) return;
                    let n =
                      "number" == typeof e && Number.isFinite(e)
                        ? m(e, 0, 1)
                        : 0.5;
                    (en(0, t.total * n, performance.now() / 1e3), ea());
                  },
                  replay: () => {
                    ((T = !1), (_.length = 0), ea());
                  },
                  destroy: () => {
                    ((j = !0),
                      M && i.cancelAnimationFrame(M),
                      eu.disconnect(),
                      ep.disconnect(),
                      e.removeEventListener("pointerenter", er),
                      e.removeEventListener("pointerleave", el),
                      e.removeEventListener("pointerdown", eo),
                      i.removeEventListener("pointermove", es),
                      i.removeEventListener("pointerup", ed),
                      i.removeEventListener("pointercancel", ed),
                      v.dispose(),
                      S.dispose(),
                      x.dispose(),
                      n.dispose(),
                      n.forceContextLoss(),
                      r.remove());
                  },
                }
              );
            })(e, J);
            return (
              (K.current = t),
              () => {
                (t?.destroy(), (K.current = null));
              }
            );
          }, []),
          (0, i.useImperativeHandle)(
            G,
            () => ({
              twist: (e) => K.current?.twist(e),
              replay: () => K.current?.replay(),
            }),
            [],
          ),
          (0, a.jsx)("div", {
            ref: V,
            role: e ? "img" : void 0,
            "aria-label": e || void 0,
            className: (0, u.cn)(
              "relative isolate h-full min-h-[240px] w-full overflow-hidden",
              z,
            ),
            style: Y,
            children:
              _ &&
              (0, a.jsx)("div", {
                className: "relative z-10 h-full w-full",
                children: _,
              }),
          })
        );
      });
    y.displayName = "RibbonType";
    let F = {
        dark: ["#5227FF", "#FFFFFF"],
        light: ["#5227FF", "#FFFFFF"],
        band: !0,
        path: "wave",
        ribbons: 1,
        gap: 150,
        ribbonWidth: 76,
        textScale: 0.5,
        fontWeight: 700,
        letterSpacing: 0.06,
        amplitude: 70,
        frequency: 1.1,
        depth: 120,
        twist: 0.12,
        twistSpeed: 0.12,
        speed: 90,
        flow: 0.35,
        tilt: -6,
        perspective: 32,
        shading: 0.6,
        sheen: 0.4,
      },
      S = {
        satin: F,
        ring: {
          ...F,
          path: "loop",
          ribbons: 1,
          ribbonWidth: 84,
          amplitude: 60,
          depth: 120,
          tilt: -14,
          speed: 70,
        },
        helix: {
          ...F,
          dark: ["#FF9FFC", "#1A0B3D"],
          light: ["#B19EEF", "#1A0B3D"],
          path: "helix",
          ribbons: 1,
          ribbonWidth: 70,
          amplitude: 92,
          frequency: 0.9,
          twist: 0,
          speed: 80,
          flow: 0.5,
          tilt: -4,
        },
        kinetic: {
          ...F,
          dark: ["#5227FF", "#F5F3FF"],
          light: ["#5227FF", "#0A0A0A"],
          band: !1,
          ribbons: 1,
          ribbonWidth: 110,
          textScale: 0.72,
          fontWeight: 600,
          letterSpacing: 0.02,
          amplitude: 80,
          twist: 0.18,
          sheen: 0.25,
        },
        mono: {
          ...F,
          dark: ["#FAFAFA", "#0A0A0A"],
          light: ["#0A0A0A", "#FAFAFA"],
          ribbons: 3,
          gap: 112,
          ribbonWidth: 64,
          amplitude: 56,
          frequency: 0.9,
          depth: 100,
          sheen: 0.3,
        },
      },
      C = [
        { label: "Satin", value: "satin" },
        { label: "Ring", value: "ring" },
        { label: "Helix", value: "helix" },
        { label: "Kinetic", value: "kinetic" },
        { label: "Mono", value: "mono" },
      ],
      M = [
        { label: "Wave", value: "wave" },
        { label: "Loop", value: "loop" },
        { label: "Helix", value: "helix" },
      ],
      A = [
        { label: "Left", value: "left" },
        { label: "Right", value: "right" },
      ],
      j = [
        { label: "Inherit", value: "inherit" },
        { label: "Sans", value: "ui-sans-serif, system-ui, sans-serif" },
        { label: "Serif", value: "ui-serif, Georgia, serif" },
      ],
      E = [
        {
          name: "text",
          type: "string",
          default: '"MAKE SPACE FOR IDEAS"',
          description:
            "The words printed along the ribbon. They repeat for its whole length.",
        },
        {
          name: "separator",
          type: "string",
          default: '"  \xb7  "',
          description: "Text placed between repeats.",
        },
        {
          name: "colors",
          type: "[string, string]",
          default: '["#5227FF", "#FFFFFF"]',
          description:
            "Ribbon colour and text colour. Every second ribbon swaps them. Accepts any CSS colour, including currentColor.",
        },
        {
          name: "band",
          type: "boolean",
          default: "true",
          description:
            "Print the text on a solid satin band. Turn it off for floating type that twists on an invisible ribbon.",
        },
        {
          name: "path",
          type: '"wave" | "loop" | "helix"',
          default: '"wave"',
          description:
            "The shape the ribbon follows: a wave across the view, a ring in perspective, or a spiral around a horizontal axis.",
        },
        {
          name: "ribbons",
          type: "number",
          default: "1",
          description:
            "Number of ribbons, from 1 to 3. They interweave and alternate colours.",
        },
        {
          name: "gap",
          type: "number",
          default: "120",
          description: "Vertical distance between ribbons in pixels.",
        },
        {
          name: "ribbonWidth",
          type: "number",
          default: "76",
          description: "Width of the ribbon in pixels.",
        },
        {
          name: "textScale",
          type: "number",
          default: "0.5",
          description: "Text height relative to the ribbon width.",
        },
        {
          name: "fontFamily",
          type: "string",
          default: '"inherit"',
          description:
            "Font of the text. inherit uses the font of the surrounding page.",
        },
        {
          name: "fontWeight",
          type: "number",
          default: "700",
          description: "Weight of the text.",
        },
        {
          name: "letterSpacing",
          type: "number",
          default: "0.06",
          description: "Space between letters in em.",
        },
        {
          name: "amplitude",
          type: "number",
          default: "70",
          description:
            "Height of the wave in pixels, or the radius of the helix.",
        },
        {
          name: "frequency",
          type: "number",
          default: "1.1",
          description:
            "Waves or helix turns across the width of the component.",
        },
        {
          name: "depth",
          type: "number",
          default: "120",
          description:
            "How far the ribbon swings toward and away from you, in pixels.",
        },
        {
          name: "twist",
          type: "number",
          default: "0.12",
          description:
            "How far the ribbon rocks around its own length, in turns. Above 0.25 it shows its back.",
        },
        {
          name: "twistSpeed",
          type: "number",
          default: "0.12",
          description: "How fast the rocking travels along the ribbon.",
        },
        {
          name: "speed",
          type: "number",
          default: "90",
          description:
            "Speed of the text along the ribbon in pixels per second.",
        },
        {
          name: "direction",
          type: '"left" | "right"',
          default: '"left"',
          description:
            "Direction the text travels. Every second ribbon runs the other way.",
        },
        {
          name: "flow",
          type: "number",
          default: "0.35",
          description: "How fast the ribbon's shape undulates.",
        },
        {
          name: "tilt",
          type: "number",
          default: "-6",
          description:
            "Tilt of the whole ribbon toward or away from you, in degrees.",
        },
        {
          name: "perspective",
          type: "number",
          default: "32",
          description:
            "Camera field of view in degrees. Higher values exaggerate depth.",
        },
        {
          name: "shading",
          type: "number",
          default: "0.6",
          description:
            "How strongly the satin is lit and shaded as it turns, from 0 (flat) to 1.",
        },
        {
          name: "sheen",
          type: "number",
          default: "0.4",
          description: "Satin highlight and rim light, from 0 to 1.",
        },
        {
          name: "hoverSpeed",
          type: "number",
          default: "0.3",
          description:
            "Speed multiplier while the pointer rests over the ribbon, so it can be read.",
        },
        {
          name: "draggable",
          type: "boolean",
          default: "true",
          description:
            "Drag sideways to scrub the text. A flick carries on with momentum.",
        },
        {
          name: "clickTwist",
          type: "boolean",
          default: "true",
          description:
            "Click or tap to send a full twist rolling along the ribbon from that point.",
        },
        {
          name: "autoTwist",
          type: "number",
          default: "0",
          description: "Seconds between automatic twists. 0 turns them off.",
        },
        {
          name: "intro",
          type: "boolean",
          default: "true",
          description:
            "Fade in with a twist rolling along the ribbon when it mounts.",
        },
        {
          name: "paused",
          type: "boolean",
          default: "false",
          description: "Freeze the motion.",
        },
        {
          name: "quality",
          type: "number",
          default: "1",
          description: "Render scale and mesh detail, from 0.5 to 1.",
        },
        {
          name: "ref",
          type: "{ twist, replay }",
          default: "—",
          description:
            "twist(position?) rolls a twist from a point along the first ribbon (0 to 1). replay() plays the intro again.",
        },
        {
          name: "children",
          type: "ReactNode",
          default: "—",
          description: "Content layered over the ribbon.",
        },
        {
          name: "className",
          type: "string",
          default: "—",
          description:
            "Classes for the root element. It fills its parent and is at least 240px tall.",
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
          n = "dark" === (0, l.Y)(),
          [s, d] = (0, i.useState)("satin"),
          [u, p] = (0, i.useState)(F),
          h = (e) => (t) => p((n) => ({ ...n, [e]: t })),
          [c, m] = (0, i.useState)(null),
          f = c ?? (n ? u.dark : u.light),
          [g, v] = (0, i.useState)("MAKE SPACE FOR IDEAS"),
          [b, w] = (0, i.useState)("  \xb7  "),
          [x, T] = (0, i.useState)("inherit"),
          [k, W] = (0, i.useState)("left"),
          [I, L] = (0, i.useState)(0.3),
          [R, P] = (0, i.useState)(6),
          [U, B] = (0, i.useState)(!0),
          [N, D] = (0, i.useState)(!0),
          [H, q] = (0, i.useState)(!0),
          [$, O] = (0, i.useState)(!1),
          [X, z] = (0, i.useState)(1),
          Y = (e) => (t) => {
            let n = [f[0], f[1]];
            ((n[e] = t), m(n));
          };
        return (0, a.jsxs)("div", {
          children: [
            (0, a.jsx)(r.Bg, {}),
            (0, a.jsxs)(r.VX, {
              children: [
                (0, a.jsxs)(r.Ec, {
                  children: [
                    (0, a.jsx)(r.Ch, {
                      onRefresh: t,
                      minHeight: 520,
                      enableResponsive: !0,
                      children: (0, a.jsx)("div", {
                        className: `relative h-full w-full ${n ? "bg-[#0A0A0A]" : "bg-white"}`,
                        children: (0, a.jsx)(
                          y,
                          {
                            text: g,
                            separator: b,
                            colors: f,
                            band: u.band,
                            path: u.path,
                            ribbons: u.ribbons,
                            gap: u.gap,
                            ribbonWidth: u.ribbonWidth,
                            textScale: u.textScale,
                            fontFamily: x,
                            fontWeight: u.fontWeight,
                            letterSpacing: u.letterSpacing,
                            amplitude: u.amplitude,
                            frequency: u.frequency,
                            depth: u.depth,
                            twist: u.twist,
                            twistSpeed: u.twistSpeed,
                            speed: u.speed,
                            direction: k,
                            flow: u.flow,
                            tilt: u.tilt,
                            perspective: u.perspective,
                            shading: u.shading,
                            sheen: u.sheen,
                            hoverSpeed: I,
                            draggable: U,
                            clickTwist: N,
                            autoTwist: R,
                            intro: H,
                            paused: $,
                            quality: X,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, a.jsxs)(r.IH, {
                      children: [
                        (0, a.jsx)(r.bg, {
                          title: "Preset",
                          value: s,
                          options: C,
                          onChange: (e) => {
                            (d(e), p(S[e] ?? F), m(null), t());
                          },
                        }),
                        (0, a.jsx)(r.UD, {
                          title: "Text",
                          value: g,
                          placeholder: "MAKE SPACE FOR IDEAS",
                          onChange: v,
                        }),
                        (0, a.jsx)(r.UD, {
                          title: "Separator",
                          value: b,
                          placeholder: "  \xb7  ",
                          onChange: w,
                        }),
                        (0, a.jsx)(r.W7, {
                          title: "Ribbon",
                          value: f[0],
                          onChange: Y(0),
                        }),
                        (0, a.jsx)(r.W7, {
                          title: "Text Colour",
                          value: f[1],
                          onChange: Y(1),
                        }),
                        (0, a.jsx)(r.bg, {
                          title: "Path",
                          value: u.path,
                          options: M,
                          onChange: (e) => h("path")(e),
                        }),
                        (0, a.jsx)(r.bg, {
                          title: "Font",
                          value: x,
                          options: j,
                          onChange: T,
                        }),
                        (0, a.jsx)(r.bg, {
                          title: "Direction",
                          value: k,
                          options: A,
                          onChange: (e) => W(e),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Ribbons",
                          min: 1,
                          max: 3,
                          step: 1,
                          value: u.ribbons,
                          onChange: h("ribbons"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Gap",
                          min: 40,
                          max: 260,
                          step: 2,
                          value: u.gap,
                          valueUnit: "px",
                          onChange: h("gap"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Ribbon Width",
                          min: 24,
                          max: 200,
                          step: 1,
                          value: u.ribbonWidth,
                          valueUnit: "px",
                          onChange: h("ribbonWidth"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Text Scale",
                          min: 0.2,
                          max: 0.9,
                          step: 0.01,
                          value: u.textScale,
                          onChange: h("textScale"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Font Weight",
                          min: 300,
                          max: 900,
                          step: 100,
                          value: u.fontWeight,
                          onChange: h("fontWeight"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Letter Spacing",
                          min: -0.05,
                          max: 0.4,
                          step: 0.01,
                          value: u.letterSpacing,
                          valueUnit: "em",
                          onChange: h("letterSpacing"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Amplitude",
                          min: 0,
                          max: 200,
                          step: 1,
                          value: u.amplitude,
                          valueUnit: "px",
                          onChange: h("amplitude"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Frequency",
                          min: 0.2,
                          max: 3,
                          step: 0.05,
                          value: u.frequency,
                          onChange: h("frequency"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Depth",
                          min: 0,
                          max: 400,
                          step: 5,
                          value: u.depth,
                          valueUnit: "px",
                          onChange: h("depth"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Twist",
                          min: 0,
                          max: 0.6,
                          step: 0.01,
                          value: u.twist,
                          onChange: h("twist"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Twist Speed",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: u.twistSpeed,
                          onChange: h("twistSpeed"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Speed",
                          min: 0,
                          max: 400,
                          step: 5,
                          value: u.speed,
                          valueUnit: "px/s",
                          onChange: h("speed"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Flow",
                          min: 0,
                          max: 2,
                          step: 0.05,
                          value: u.flow,
                          onChange: h("flow"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Tilt",
                          min: -45,
                          max: 45,
                          step: 1,
                          value: u.tilt,
                          valueUnit: "\xb0",
                          onChange: h("tilt"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Perspective",
                          min: 12,
                          max: 70,
                          step: 1,
                          value: u.perspective,
                          valueUnit: "\xb0",
                          onChange: h("perspective"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Shading",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: u.shading,
                          onChange: h("shading"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Sheen",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: u.sheen,
                          onChange: h("sheen"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Hover Speed",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: I,
                          onChange: L,
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Auto Twist",
                          min: 0,
                          max: 15,
                          step: 0.5,
                          value: R,
                          valueUnit: "s",
                          onChange: P,
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Quality",
                          min: 0.5,
                          max: 1,
                          step: 0.05,
                          value: X,
                          onChange: z,
                        }),
                        (0, a.jsx)(r.tl, {
                          title: "Band",
                          checked: u.band,
                          onChange: h("band"),
                        }),
                        (0, a.jsx)(r.tl, {
                          title: "Draggable",
                          checked: U,
                          onChange: B,
                        }),
                        (0, a.jsx)(r.tl, {
                          title: "Click Twist",
                          checked: N,
                          onChange: D,
                        }),
                        (0, a.jsx)(r.tl, {
                          title: "Intro",
                          checked: H,
                          onChange: q,
                        }),
                        (0, a.jsx)(r.tl, {
                          title: "Paused",
                          checked: $,
                          onChange: O,
                        }),
                      ],
                    }),
                    (0, a.jsx)(r.Ub, { data: E }),
                  ],
                }),
                (0, a.jsx)(r.lT, { children: (0, a.jsx)(r.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
