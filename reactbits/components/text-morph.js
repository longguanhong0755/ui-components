/* ReactBits Pro public preview module 37832 for text-morph.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/37832.189d29c0b8c02059.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  37832: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => L }));
    var r = a(95155),
      n = a(12115),
      l = a(56388),
      o = a(86049),
      i = a(90761),
      s = a(12246),
      u = a(2253),
      h = a(90650);
    let d = {
        position: "absolute",
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: "hidden",
        clip: "rect(0, 0, 0, 0)",
        whiteSpace: "nowrap",
        border: 0,
      },
      c = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,
      m = (e, t, a) => `
  for (int i = 0; i < 64; i++) {
    if (i >= uCount${e}) break;
    vec4 r = uRect${e}[i];
    vec2 q = (p - r.xy) / r.zw;
    if (q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0) continue;
    vec4 m = texelFetch(uGlyphs, ivec2(i, ${t}), 0);
    vec4 g = texelFetch(uGlyphs, ivec2(i, ${t + 1}), 0);
    vec2 f = textureLod(uAtlas${e}, m.xy + q * m.zw, 0.0).rg;
    ${a}
  }
`,
      f = (e) => `
    float v = mix(f.r, f.g, g.y) * g.x + g.z;
    d${e} = min(d${e}, v);
    float k = exp(-max(v, 0.0) / uBand);
    w${e} += k;
    a${e} += k * g.w;
`,
      p = `
    float v = f.r * g.x;
    float e = 0.7 * uPixel + g.y;
    float c = (1.0 - smoothstep(-e, e, v)) * g.z;
    keep *= 1.0 - c;
    wsum += c;
    asum += c * g.w;
`,
      g = `
uniform sampler2D uAtlasA;
uniform sampler2D uAtlasB;
uniform sampler2D uGlyphs;
uniform vec4 uRectA[64];
uniform vec4 uRectB[64];
uniform int uCountA;
uniform int uCountB;
uniform int uMode;
uniform float uCap;
uniform float uGoo;
uniform float uSwell;
uniform float uBand;
uniform float uPixel;
uniform vec2 uSize;
uniform vec3 uInk;
uniform float uInkAlpha;
uniform vec3 uTint;
uniform float uTintAmount;
varying vec2 vUv;

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

void main() {
  vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uSize;
  float alpha = 0.0;
  float act = 0.0;
  if (uMode == 1) {
    float keep = 1.0;
    float wsum = 0.0;
    float asum = 0.0;
    ${m("A", 0, p)}
    ${m("B", 2, p)}
    alpha = 1.0 - keep;
    act = wsum > 0.0 ? asum / wsum : 0.0;
  } else {
    float dA = uCap;
    float wA = 0.0;
    float aA = 0.0;
    float dB = uCap;
    float wB = 0.0;
    float aB = 0.0;
    ${m("A", 0, f("A"))}
    ${m("B", 2, f("B"))}
    aA = wA > 0.0 ? aA / wA : 0.0;
    aB = wB > 0.0 ? aB / wB : 0.0;
    act = mix(aA, aB, smoothstep(-uBand, uBand, dA - dB));
    float d = smin(dA, dB, max(uGoo * act, 0.0001)) - uSwell * act;
    float aa = max(fwidth(d), 0.0001) * 0.7;
    alpha = clamp(0.5 - d / (2.0 * aa), 0.0, 1.0);
  }
  vec3 color = mix(uInk, uTint, clamp(uTintAmount * act * act, 0.0, 1.0));
  float coverage = alpha * uInkAlpha;
  gl_FragColor = vec4(color * coverage, coverage);
}
`,
      v = (e, t, a) => Math.min(a, Math.max(t, e)),
      x = (e, t) => (Number.isFinite(e) ? e : t),
      w = (e, t, a) => {
        let r = v((a - e) / (t - e), 0, 1);
        return r * r * (3 - 2 * r);
      },
      y = null,
      b = (e) => {
        if (
          "undefined" == typeof document ||
          !e ||
          ("undefined" != typeof CSS &&
            "function" == typeof CSS.supports &&
            !CSS.supports("color", e))
        )
          return null;
        if (!y) {
          let e = document.createElement("canvas");
          ((e.width = 1),
            (e.height = 1),
            (y = e.getContext("2d", { willReadFrequently: !0 })));
        }
        if (!y) return null;
        (y.clearRect(0, 0, 1, 1),
          (y.fillStyle = "#000"),
          (y.fillStyle = e),
          y.fillRect(0, 0, 1, 1));
        let t = y.getImageData(0, 0, 1, 1).data;
        return [t[0] / 255, t[1] / 255, t[2] / 255, t[3] / 255];
      },
      C = (e, t, a) => {
        let r = Math.max(t, a),
          n = new Float64Array(r),
          l = new Float64Array(r + 1),
          o = new Uint16Array(r),
          i = (t, a, r) => {
            for (let l = 0; l < r; l++) n[l] = e[t + l * a];
            ((o[0] = 0), (l[0] = -1e20), (l[1] = 1e20));
            let i = 0;
            for (let e = 1; e < r; e++) {
              let t =
                (n[e] + e * e - (n[o[i]] + o[i] * o[i])) / (2 * e - 2 * o[i]);
              for (; t <= l[i];)
                (i--,
                  (t =
                    (n[e] + e * e - (n[o[i]] + o[i] * o[i])) /
                    (2 * e - 2 * o[i])));
              ((o[++i] = e), (l[i] = t), (l[i + 1] = 1e20));
            }
            i = 0;
            for (let s = 0; s < r; s++) {
              for (; l[i + 1] < s;) i++;
              let r = s - o[i];
              e[t + s * a] = n[o[i]] + r * r;
            }
          };
        for (let e = 0; e < t; e++) i(e, t, a);
        for (let e = 0; e < a; e++) i(e * t, 1, t);
      },
      A = (e, t, a, r) => {
        let n = Math.max(1, Math.round(r)),
          l = new Float32Array(e.length),
          o = new Float32Array(e.length),
          i = 1 / (2 * n + 1);
        for (let r = 0; r < a; r++) {
          let a = r * t,
            o = 0;
          for (let r = -n; r <= n; r++) o += e[a + v(r, 0, t - 1)];
          for (let r = 0; r < t; r++)
            ((l[a + r] = o * i),
              (o +=
                e[a + Math.min(t - 1, r + n + 1)] - e[a + Math.max(0, r - n)]));
        }
        for (let e = 0; e < t; e++) {
          let r = 0;
          for (let o = -n; o <= n; o++) r += l[v(o, 0, a - 1) * t + e];
          for (let s = 0; s < a; s++)
            ((o[s * t + e] = r * i),
              (r +=
                l[Math.min(a - 1, s + n + 1) * t + e] -
                l[Math.max(0, s - n) * t + e]));
        }
        return o;
      },
      M = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      S = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      F = (0, n.forwardRef)(function (
        {
          words: e = ["Imagine", "Create", "Launch"],
          morph: t = "liquid",
          color: a = "currentColor",
          morphColor: l = "#8B5CF6",
          tint: o = 0.3,
          align: i = "center",
          fontFamily: m,
          fontSize: f,
          fontWeight: p,
          letterSpacing: y,
          interval: F = 2.6,
          duration: j = 1.1,
          stagger: k = 0.25,
          staggerFrom: B = "start",
          travel: I = 0.5,
          goo: R = 0.1,
          swell: T = 0.02,
          softness: q = 0.8,
          scale: E = 0.04,
          trigger: U = "auto",
          loop: L = !0,
          intro: $ = !0,
          startOnView: P = !0,
          pauseOnHover: G = !1,
          paused: H = !1,
          quality: z = 1,
          onChange: N,
          className: W,
          style: D,
        },
        O,
      ) {
        let Y = (0, n.useRef)(null),
          V = (0, n.useRef)(null),
          _ = (0, n.useSyncExternalStore)(M, S, () => !1),
          Q = (Array.isArray(e) ? e : []).filter((e) => e.trim().length > 0),
          Z = {
            words: Q,
            morph: t,
            color: a,
            morphColor: l,
            tint: o,
            interval: F,
            duration: j,
            stagger: k,
            staggerFrom: B,
            travel: I,
            goo: R,
            swell: T,
            softness: q,
            scale: E,
            trigger: U,
            loop: L,
            intro: $,
            startOnView: P,
            pauseOnHover: G,
            paused: H,
            quality: z,
            reduced: _,
            onChange: N,
          },
          X = (0, n.useRef)(Z);
        return (
          (0, n.useEffect)(() => {
            ((X.current = Z), V.current?.sync());
          }),
          (0, n.useEffect)(() => {
            let e = Y.current;
            if (!e) return;
            let t = ((e, t) => {
              let a,
                r = e.ownerDocument,
                n = r.defaultView ?? window,
                l = r.createElement("canvas");
              (l.setAttribute("aria-hidden", "true"),
                (l.style.cssText =
                  "position:absolute;pointer-events:none;display:block"));
              try {
                a = new s.WebGLRenderer({
                  canvas: l,
                  alpha: !0,
                  premultipliedAlpha: !0,
                  antialias: !1,
                });
              } catch {
                return null;
              }
              (e.appendChild(l), a.setClearColor(0, 0));
              let o = r.createElement("canvas"),
                i = o.getContext("2d", { willReadFrequently: !0 }),
                h = Math.max(
                  512,
                  Math.min(4096, a.capabilities.maxTextureSize),
                ),
                d = u.GxU.toHalfFloat(4e3),
                m = new u.GYF(new Uint16Array([d, d]), 1, 1, u.paN, u.ix0);
              m.needsUpdate = !0;
              let f = new Float32Array(1024),
                p = new u.GYF(f, 64, 4, u.GWd, u.RQf);
              ((p.magFilter = u.hxR),
                (p.minFilter = u.hxR),
                (p.generateMipmaps = !1),
                (p.needsUpdate = !0));
              let y = () =>
                  Array.from({ length: 64 }, () => new u.IUQ(0, 0, 1, 1)),
                M = {
                  uAtlasA: { value: m },
                  uAtlasB: { value: m },
                  uGlyphs: { value: p },
                  uRectA: { value: y() },
                  uRectB: { value: y() },
                  uCountA: { value: 0 },
                  uCountB: { value: 0 },
                  uMode: { value: 0 },
                  uCap: { value: 8 },
                  uGoo: { value: 8 },
                  uSwell: { value: 2 },
                  uBand: { value: 4 },
                  uPixel: { value: 0.5 },
                  uSize: { value: new u.I9Y(1, 1) },
                  uInk: { value: new u.Q1f(1, 1, 1) },
                  uInkAlpha: { value: 1 },
                  uTint: { value: new u.Q1f(0.545, 0.361, 0.965) },
                  uTintAmount: { value: 0.3 },
                },
                S = new u.BKk({
                  vertexShader: c,
                  fragmentShader: g,
                  uniforms: M,
                  transparent: !0,
                  depthTest: !1,
                  depthWrite: !1,
                });
              ((S.blending = u.bCz),
                (S.blendSrc = u.qad),
                (S.blendDst = u.OuU));
              let F = new u.eaF(new u.bdM(2, 2), S);
              F.frustumCulled = !1;
              let j = new u.Z58();
              j.add(F);
              let k = new u.qUd(-1, 1, 1, -1, 0, 1),
                B = [],
                I = "",
                R = 0,
                T = "",
                q = null,
                E = 1,
                U = 1,
                L = 0,
                $ = 0,
                P = 1,
                G = 16,
                H = 8,
                z = !1,
                N = 1,
                W = 0,
                D = 0,
                O = -1,
                Y = -1,
                V = 1,
                _ = 0,
                Q = 0,
                Z = 0,
                X = !1,
                K = !1,
                J = !1,
                ee = !1,
                et = (s) => {
                  let d = t.current,
                    c = e.getBoundingClientRect(),
                    m = n.getComputedStyle(e);
                  G = parseFloat(m.fontSize) || 16;
                  let f = v(x(d.quality, 1), 0.5, 1),
                    p = Math.min(n.devicePixelRatio || 1, 2) * f;
                  ((L = Math.ceil(0.25 * G)), ($ = Math.ceil(0.3 * G)));
                  let g = Math.max(1, c.width + 2 * L),
                    w = Math.max(1, c.height + 2 * $),
                    y = `${m.fontStyle} ${m.fontWeight} ${m.fontSize} ${m.fontFamily}`,
                    b = [
                      g.toFixed(1),
                      w.toFixed(1),
                      p,
                      y,
                      d.words.join("\x01"),
                      m.letterSpacing,
                      m.textAlign,
                      m.direction,
                    ].join("|");
                  if (!s && b === I) return;
                  for (let e of ((I = b),
                  R++,
                  (E = g),
                  (U = w),
                  (P = p),
                  (z = "rtl" === m.direction),
                  (H = 0.92 * Math.ceil(0.25 * G)),
                  (l.style.left = `${-L}px`),
                  (l.style.top = `${-$}px`),
                  (l.style.width = `${E}px`),
                  (l.style.height = `${U}px`),
                  a.setPixelRatio(1),
                  a.setSize(
                    Math.max(1, Math.round(E * P)),
                    Math.max(1, Math.round(U * P)),
                    !1,
                  ),
                  M.uSize.value.set(E, U),
                  B))
                    e.texture?.dispose();
                  if (((B = []), !i)) return;
                  i.font = y;
                  let S =
                      i.measureText("Hxg").fontBoundingBoxAscent || 0.92 * G,
                    F = r.createRange(),
                    j = Array.from(e.querySelectorAll("[data-morph-word]")).map(
                      (e) =>
                        ((e, t, a) => {
                          let r = [],
                            n = e.firstChild;
                          if (!n || 3 !== n.nodeType) return r;
                          let l = n.data,
                            o = 0;
                          for (let e of "undefined" != typeof Intl &&
                          "Segmenter" in Intl
                            ? Array.from(
                                new Intl.Segmenter(void 0, {
                                  granularity: "grapheme",
                                }).segment(l),
                                (e) => e.segment,
                              )
                            : Array.from(l)) {
                            let l = e.length;
                            if (/\S/.test(e)) {
                              (a.setStart(n, o), a.setEnd(n, o + l));
                              let i = a.getClientRects()[0];
                              i &&
                                i.width > 0 &&
                                r.push({
                                  text: e,
                                  left: i.left - t.left + L,
                                  top: i.top - t.top + $,
                                  right: i.right - t.left + L,
                                  bottom: i.bottom - t.top + $,
                                });
                            }
                            o += l;
                          }
                          return r;
                        })(e, c, F),
                    );
                  (F.detach(),
                    (B = j.map((e) =>
                      ((e, t, a) => {
                        let r = {
                          glyphs: [],
                          texture: null,
                          left: E / 2,
                          right: E / 2,
                          depth: 1,
                        };
                        if (!i || 0 === e.length) return r;
                        let n = Math.ceil(0.25 * G),
                          l = Math.ceil(e.length / 64),
                          s = [];
                        for (let t = 0; t < e.length; t += l) {
                          let a = e.slice(t, t + l);
                          s.push({
                            parts: a,
                            left: Math.min(...a.map((e) => e.left)),
                            top: Math.min(...a.map((e) => e.top)),
                            right: Math.max(...a.map((e) => e.right)),
                            bottom: Math.max(...a.map((e) => e.bottom)),
                            ax: 0,
                            ay: 0,
                          });
                        }
                        let d = h / P,
                          c = 0,
                          m = 0,
                          f = 0,
                          p = 0;
                        for (let e of s) {
                          let t = e.right - e.left + 2 * n,
                            a = e.bottom - e.top + 2 * n;
                          (c > 0 && c + t > d && ((c = 0), (m += f), (f = 0)),
                            (e.ax = c),
                            (e.ay = m),
                            (c += t),
                            (f = Math.max(f, a)),
                            (p = Math.max(p, c)));
                        }
                        let g = m + f,
                          v =
                            P *
                            Math.min(
                              1,
                              h / Math.max(1, p * P),
                              h / Math.max(1, g * P),
                            ),
                          x = Math.max(1, Math.ceil(p * v)),
                          w = Math.max(1, Math.ceil(g * v));
                        for (let e of ((o.width = x),
                        (o.height = w),
                        i.setTransform(1, 0, 0, 1, 0, 0),
                        i.clearRect(0, 0, x, w),
                        i.setTransform(v, 0, 0, v, 0, 0),
                        (i.font = t),
                        (i.fillStyle = "#fff"),
                        (i.textBaseline = "alphabetic"),
                        s))
                          for (let t of e.parts)
                            i.fillText(
                              t.text,
                              e.ax + n + t.left - e.left,
                              e.ay + n + t.top - e.top + a,
                            );
                        let y = ((e, t, a, r) => {
                            let n = t * a,
                              l = new Float64Array(n),
                              o = new Float64Array(n);
                            for (let t = 0; t < n; t++) {
                              let a = e[4 * t + 3] / 255;
                              if (a >= 1) ((l[t] = 0), (o[t] = 1e20));
                              else if (a <= 0) ((l[t] = 1e20), (o[t] = 0));
                              else {
                                let e = 0.5 - a;
                                ((l[t] = e > 0 ? e * e : 0),
                                  (o[t] = e < 0 ? e * e : 0));
                              }
                            }
                            (C(l, t, a), C(o, t, a));
                            let i = new Float32Array(n);
                            for (let e = 0; e < n; e++)
                              i[e] = (Math.sqrt(l[e]) - Math.sqrt(o[e])) / r;
                            return i;
                          })(i.getImageData(0, 0, x, w).data, x, w, v),
                          b = 0.92 * n,
                          M = 1;
                        for (let e = 0; e < y.length; e++)
                          (-y[e] > M && (M = -y[e]), y[e] > b && (y[e] = b));
                        let S = Math.max(1, G * v * 0.05),
                          F = A(A(A(y, x, w, S), x, w, S), x, w, S),
                          j = new Uint16Array(x * w * 2);
                        for (let e = 0; e < x * w; e++)
                          ((j[2 * e] = u.GxU.toHalfFloat(y[e])),
                            (j[2 * e + 1] = u.GxU.toHalfFloat(F[e])));
                        let k = new u.GYF(j, x, w, u.paN, u.ix0);
                        return (
                          (k.flipY = !1),
                          (k.magFilter = u.k6q),
                          (k.minFilter = u.k6q),
                          (k.generateMipmaps = !1),
                          (k.needsUpdate = !0),
                          (r.texture = k),
                          (r.depth = M),
                          (r.left = Math.min(...s.map((e) => e.left))),
                          (r.right = Math.max(...s.map((e) => e.right))),
                          (r.glyphs = s.map((e) => {
                            let t = e.right - e.left + 2 * n,
                              a = e.bottom - e.top + 2 * n;
                            return {
                              text: e.parts.map((e) => e.text).join(""),
                              x: e.left - n,
                              y: e.top - n,
                              w: t,
                              h: a,
                              cx: (e.left + e.right) / 2,
                              ax: z ? e.right : e.left,
                              ay: e.top,
                              u: (e.ax * v) / x,
                              v: (e.ay * v) / w,
                              du: (t * v) / x,
                              dv: (a * v) / w,
                            };
                          })),
                          r
                        );
                      })(e, y, S),
                    )));
                },
                ea = () => {
                  let a = t.current,
                    r = n.getComputedStyle(e).color,
                    l = b(
                      a.color && "currentcolor" !== a.color.toLowerCase()
                        ? a.color
                        : r,
                    ) ?? [1, 1, 1, 1];
                  (M.uInk.value.setRGB(l[0], l[1], l[2], u.Zr2),
                    (M.uInkAlpha.value = l[3]));
                  let o = b(a.morphColor || "#8B5CF6") ?? [
                    0.545, 0.361, 0.965, 1,
                  ];
                  M.uTint.value.setRGB(o[0], o[1], o[2], u.Zr2);
                },
                er = (e) =>
                  B.length ? B[((e % B.length) + B.length) % B.length] : null,
                en = (e, t, a, r, n) => {
                  let l = a - t;
                  return l > 0.001 ? r + ((e - t) / l) * (n - r) : (r + n) / 2;
                },
                el = (e) => {
                  let t = 43758.5453 * Math.sin(12.9898 * e + 78.233 * N);
                  return t - Math.floor(t);
                },
                eo = (e, t) => {
                  let a = e.right - e.left,
                    r = a > 0.001 ? v((t - e.left) / a, 0, 1) : 0.5;
                  return z ? 1 - r : r;
                },
                ei = (e, a, r) => {
                  var n;
                  let l,
                    o,
                    i,
                    s,
                    u = t.current,
                    h = v(x(u.stagger, 0.25), 0, 0.9);
                  return (
                    (s = v(
                      (a -
                        ("end" === u.staggerFrom
                          ? 1 - e
                          : "center" === u.staggerFrom
                            ? 2 * Math.abs(e - 0.5)
                            : "edges" === u.staggerFrom
                              ? 1 - 2 * Math.abs(e - 0.5)
                              : "random" === u.staggerFrom
                                ? ((l = Math.floor((n = e * r))),
                                  (i = (o = n - l) * o * (3 - 2 * o)),
                                  el(l) * (1 - i) + el(l + 1) * i)
                                : e) *
                          h) /
                        (1 - h),
                      0,
                      1,
                    )) *
                    s *
                    s *
                    (s * (6 * s - 15) + 10)
                  );
                },
                es = (e, t, a, r, n, l, o) => {
                  let i = (64 * e + t) * 4;
                  ((f[i] = a.u),
                    (f[i + 1] = a.v),
                    (f[i + 2] = a.du),
                    (f[i + 3] = a.dv));
                  let s = i + 256;
                  ((f[s] = r), (f[s + 1] = n), (f[s + 2] = l), (f[s + 3] = o));
                },
                eu = (e, t, a, r, n) => {
                  let l = E / 2,
                    o = U / 2;
                  e.set(
                    l + (t.x + a - l) * n,
                    o + (t.y + r - o) * n,
                    t.w * n,
                    t.h * n,
                  );
                },
                eh = (e) => {
                  let r = t.current,
                    n = 1;
                  Y >= 0 &&
                    (n = v((e - Y) / V, 0, 1)) >= 1 &&
                    ((Y = -1),
                    (W = D),
                    (O = -1),
                    r.onChange?.(r.words[W] ?? "", W));
                  let l = Y >= 0,
                    o = l && O >= 0 ? er(O) : null,
                    i = er(l ? D : W);
                  (((e, a, r) => {
                    let n = t.current,
                      l = "blur" === n.morph,
                      o = v(x(n.travel, 0.5), 0, 1),
                      i = v(x(n.scale, 0.04), -0.5, 0.5),
                      s = v(x(n.softness, 0.8), 0, 1),
                      u = 0.14 * s * G,
                      h = 0.12 * G,
                      d =
                        Math.max(
                          e ? e.glyphs.length : 0,
                          a ? a.glyphs.length : 0,
                          2,
                        ) - 1;
                    if (e && a) {
                      let t = `${R}:${O}:${D}`;
                      t !== T &&
                        ((T = t),
                        (q = ((e, t, a) => {
                          let r = e.length,
                            n = t.length,
                            l = n + 1,
                            o = new Int16Array((r + 1) * l),
                            i = new Float32Array((r + 1) * l),
                            s = new Uint8Array((r + 1) * l);
                          for (let u = r - 1; u >= 0; u--)
                            for (let r = n - 1; r >= 0; r--) {
                              let n = u * l + r,
                                h = o[n + l],
                                d = i[n + l],
                                c = 0;
                              if (
                                ((o[n + 1] > h ||
                                  (o[n + 1] === h && i[n + 1] < d)) &&
                                  ((h = o[n + 1]), (d = i[n + 1]), (c = 1)),
                                e[u].text === t[r].text &&
                                  Math.abs(e[u].ax - t[r].ax) <= a)
                              ) {
                                let a = o[n + l + 1] + 1,
                                  s =
                                    i[n + l + 1] + Math.abs(e[u].ax - t[r].ax);
                                (a > h || (a === h && s < d)) &&
                                  ((h = a), (d = s), (c = 2));
                              }
                              ((o[n] = h), (i[n] = d), (s[n] = c));
                            }
                          let u = new Int16Array(r).fill(-1),
                            h = new Uint8Array(n),
                            d = 0,
                            c = 0;
                          for (; d < r && c < n;) {
                            let e = s[d * l + c];
                            2 === e
                              ? ((u[d] = c), (h[c] = 1), d++, c++)
                              : 0 === e
                                ? d++
                                : c++;
                          }
                          return { pairs: u, taken: h };
                        })(e.glyphs, a.glyphs, 2.5 * G)));
                    } else q = null;
                    let c = 0;
                    if (e) {
                      let t = 1.12 * e.depth + 0.5;
                      for (let n = 0; n < e.glyphs.length && c < 64; n++) {
                        let m = e.glyphs[n],
                          f = q && a ? q.pairs[n] : -1,
                          p = f >= 0 && a ? a.glyphs[f] : null;
                        if (p && a) {
                          let t = ei((eo(e, m.cx) + eo(a, p.cx)) / 2, r, d);
                          (eu(
                            M.uRectA.value[c],
                            m,
                            (p.ax - m.ax) * t,
                            (p.ay - m.ay) * t,
                            1,
                          ),
                            es(
                              0,
                              c,
                              m,
                              1,
                              0,
                              +!!l,
                              0.35 * Math.sin(Math.PI * t),
                            ));
                        } else {
                          let n = w(0, 0.62, ei(eo(e, m.cx), r, d)),
                            f = a
                              ? (en(m.cx, e.left, e.right, a.left, a.right) -
                                  m.cx) *
                                o *
                                n
                              : 0,
                            p = 1 + i * n;
                          l
                            ? (eu(M.uRectA.value[c], m, f, -h * n, p),
                              es(
                                0,
                                c,
                                m,
                                p,
                                u * n,
                                1 - n,
                                0.8 * Math.sin(Math.PI * n),
                              ))
                            : (eu(M.uRectA.value[c], m, f, 0, p),
                              es(
                                0,
                                c,
                                m,
                                p,
                                w(0, 0.6, n) * s,
                                t * Math.pow(n, 1.25),
                                Math.sin(Math.PI * n),
                              ));
                        }
                        c++;
                      }
                    }
                    let m = 0;
                    if (a) {
                      let t = 1.12 * a.depth + 0.5;
                      for (let n = 0; n < a.glyphs.length && m < 64; n++) {
                        if (q && q.taken[n]) continue;
                        let c = a.glyphs[n],
                          f = ei(eo(a, c.cx), r, d),
                          p = e ? w(0.38, 1, f) : f,
                          g = 1 - p,
                          v = e
                            ? (en(c.cx, a.left, a.right, e.left, e.right) -
                                c.cx) *
                              o *
                              g
                            : 0,
                          x = 1 - i * g;
                        (l
                          ? (eu(M.uRectB.value[m], c, v, h * g, x),
                            es(
                              2,
                              m,
                              c,
                              x,
                              u * g,
                              p,
                              0.8 * Math.sin(Math.PI * p),
                            ))
                          : (eu(M.uRectB.value[m], c, v, 0, x),
                            es(
                              2,
                              m,
                              c,
                              x,
                              g * s,
                              t * Math.pow(g, 0.85),
                              Math.sin(Math.PI * p),
                            )),
                          m++);
                      }
                    }
                    ((M.uCountA.value = c),
                      (M.uCountB.value = m),
                      (p.needsUpdate = !0));
                  })(o, i, l ? n : 1),
                    (M.uAtlasA.value = o?.texture ?? m),
                    (M.uAtlasB.value = i?.texture ?? m),
                    (M.uMode.value = +("blur" === r.morph)),
                    (M.uGoo.value = v(x(r.goo, 0.1), 0, 1) * G),
                    (M.uSwell.value = v(x(r.swell, 0.02), 0, 0.5) * G),
                    (M.uBand.value = Math.max(0.5, 0.05 * G)),
                    (M.uPixel.value = 1 / P),
                    (M.uCap.value = H),
                    (M.uTintAmount.value = v(x(r.tint, 0.3), 0, 1)),
                    a.render(j, k));
                },
                ed = () => {
                  ee || Q || (Q = n.requestAnimationFrame(ef));
                },
                ec = (e, a) => {
                  let r = t.current;
                  if (0 !== B.length) {
                    if (r.reduced) {
                      ((W = e),
                        (D = e),
                        (Y = -1),
                        eh(performance.now() / 1e3),
                        r.onChange?.(r.words[W] ?? "", W));
                      return;
                    }
                    ((O = a),
                      (D = ((e % B.length) + B.length) % B.length),
                      (Y = performance.now() / 1e3),
                      (V = v(x(r.duration, 1.1), 0.05, 10)),
                      (_ = Y),
                      (N += 1),
                      ed());
                  }
                },
                em = () => {
                  let e = t.current;
                  if (B.length < 2) return;
                  let a = Y >= 0 ? D : W;
                  (e.loop || !(a >= B.length - 1)) &&
                    (Y >= 0 && (W = D), ec(a + 1, a));
                };
              function ef() {
                if (((Q = 0), ee)) return;
                let e = t.current,
                  a = performance.now() / 1e3;
                if (
                  "auto" === e.trigger &&
                  K &&
                  !e.reduced &&
                  Y < 0 &&
                  B.length > 1
                ) {
                  let t = e.paused || (e.pauseOnHover && J) || !X;
                  t && (_ += 1 / 60);
                  let r = v(x(e.interval, 2.6), 0.2, 60);
                  !t && a - _ >= r && (e.loop || W < B.length - 1) && em();
                }
                if ((eh(a), Y >= 0)) ed();
                else if (
                  "auto" === e.trigger &&
                  K &&
                  !e.reduced &&
                  B.length > 1 &&
                  X
                ) {
                  Z && n.clearTimeout(Z);
                  let t = v(x(e.interval, 2.6), 0.2, 60) - (a - _);
                  Z = n.setTimeout(
                    () => {
                      ((Z = 0), ed());
                    },
                    Math.max(16, 1e3 * t),
                  );
                }
              }
              let ep = () => {
                  if (K) return;
                  K = !0;
                  let e = t.current;
                  e.intro && !e.reduced
                    ? ec(0, -1)
                    : ((W = 0),
                      (_ = performance.now() / 1e3),
                      eh(performance.now() / 1e3),
                      ed());
                },
                eg = (e) => {
                  ("mouse" === e.pointerType && (J = !0),
                    "hover" === t.current.trigger && Y < 0 && em());
                },
                ev = () => {
                  ((J = !1), ed());
                },
                ex = () => {
                  "click" === t.current.trigger && em();
                };
              (e.addEventListener("pointerenter", eg),
                e.addEventListener("pointerleave", ev),
                e.addEventListener("click", ex));
              let ew = new ResizeObserver(() => {
                (et(!1), eh(performance.now() / 1e3));
              });
              ew.observe(e);
              let ey = new IntersectionObserver(([e]) => {
                ((X = e.isIntersecting) && !K && t.current.startOnView && ep(),
                  X && ed());
              });
              ey.observe(e);
              let eb = new MutationObserver(() => {
                (ea(), eh(performance.now() / 1e3));
              });
              return (
                eb.observe(r.documentElement, {
                  attributes: !0,
                  attributeFilter: ["class", "style", "data-theme"],
                }),
                ea(),
                et(!0),
                t.current.startOnView ? eh(performance.now() / 1e3) : ep(),
                r.fonts &&
                  r.fonts.ready &&
                  r.fonts.ready.then(() => {
                    ee || (et(!0), eh(performance.now() / 1e3));
                  }),
                {
                  sync: () => {
                    (ea(),
                      et(!1),
                      W >= B.length && (W = 0),
                      eh(performance.now() / 1e3),
                      ed());
                  },
                  next: () => em(),
                  goTo: (e) => {
                    if (0 === B.length) return;
                    let t = v(Math.round(e), 0, B.length - 1),
                      a = Y >= 0 ? D : W;
                    t !== a && (Y >= 0 && (W = D), ec(t, a));
                  },
                  destroy: () => {
                    for (let t of ((ee = !0),
                    Q && n.cancelAnimationFrame(Q),
                    Z && n.clearTimeout(Z),
                    ew.disconnect(),
                    ey.disconnect(),
                    eb.disconnect(),
                    e.removeEventListener("pointerenter", eg),
                    e.removeEventListener("pointerleave", ev),
                    e.removeEventListener("click", ex),
                    B))
                      t.texture?.dispose();
                    (m.dispose(),
                      p.dispose(),
                      S.dispose(),
                      F.geometry.dispose(),
                      a.dispose(),
                      a.forceContextLoss(),
                      l.remove());
                  },
                }
              );
            })(e, X);
            return (
              (V.current = t),
              () => {
                (t?.destroy(), (V.current = null));
              }
            );
          }, []),
          (0, n.useImperativeHandle)(
            O,
            () => ({
              next: () => V.current?.next(),
              goTo: (e) => V.current?.goTo(e),
            }),
            [],
          ),
          (0, r.jsxs)("span", {
            ref: Y,
            className: (0, h.cn)("relative inline-grid align-baseline", W),
            style: {
              textAlign: i,
              fontFamily: m && "inherit" !== m ? m : void 0,
              fontSize: f,
              fontWeight: p,
              letterSpacing: void 0 === y ? void 0 : `${y}em`,
              ...D,
            },
            children: [
              (0, r.jsx)("span", { style: d, children: Q.join(", ") }),
              Q.map((e, t) =>
                (0, r.jsx)(
                  "span",
                  {
                    "data-morph-word": "",
                    "aria-hidden": "true",
                    style: {
                      gridArea: "1 / 1",
                      visibility: "hidden",
                      whiteSpace: "pre",
                    },
                    children: e,
                  },
                  t,
                ),
              ),
            ],
          })
        );
      });
    F.displayName = "TextMorph";
    let j = {
        morph: "liquid",
        dark: "#8B5CF6",
        light: "#5227FF",
        tint: 0.3,
        duration: 1.1,
        interval: 2.6,
        stagger: 0.25,
        staggerFrom: "start",
        travel: 0.5,
        goo: 0.1,
        swell: 0.02,
        softness: 0.8,
        scale: 0.04,
      },
      k = {
        liquid: j,
        bloom: {
          ...j,
          dark: "#FF9FFC",
          light: "#C33AB8",
          staggerFrom: "center",
          stagger: 0.4,
          duration: 1.2,
        },
        shuffle: {
          ...j,
          dark: "#B19EEF",
          light: "#7C3AED",
          staggerFrom: "random",
          stagger: 0.55,
          duration: 1.3,
        },
        focus: {
          ...j,
          morph: "blur",
          tint: 0,
          stagger: 0.3,
          duration: 1.2,
          scale: 0.02,
        },
        plain: { ...j, tint: 0, stagger: 0, duration: 0.9, scale: 0.02 },
      },
      B = [
        { label: "Liquid", value: "liquid" },
        { label: "Bloom", value: "bloom" },
        { label: "Shuffle", value: "shuffle" },
        { label: "Focus", value: "focus" },
        { label: "Plain", value: "plain" },
      ],
      I = [
        { label: "Liquid", value: "liquid" },
        { label: "Blur", value: "blur" },
      ],
      R = [
        { label: "Start", value: "start" },
        { label: "End", value: "end" },
        { label: "Center", value: "center" },
        { label: "Edges", value: "edges" },
        { label: "Random", value: "random" },
      ],
      T = [
        { label: "Auto", value: "auto" },
        { label: "Hover", value: "hover" },
        { label: "Click", value: "click" },
      ],
      q = [
        { label: "Center", value: "center" },
        { label: "Left", value: "left" },
        { label: "Right", value: "right" },
      ],
      E = [
        { label: "Inherit", value: "inherit" },
        { label: "Sans", value: "ui-sans-serif, system-ui, sans-serif" },
        { label: "Serif", value: "ui-serif, Georgia, serif" },
        {
          label: "Mono",
          value: "ui-monospace, SFMono-Regular, Menlo, monospace",
        },
      ],
      U = [
        {
          name: "words",
          type: "string[]",
          default: '["Imagine", "Create", "Launch"]',
          description: "The words or short phrases to morph between, in order.",
        },
        {
          name: "morph",
          type: '"liquid" | "blur"',
          default: '"liquid"',
          description:
            "How letters change: liquid thins old letters away and grows new ones in, blur pulls them out of and into focus. Letters both words share glide to their new place in either mode.",
        },
        {
          name: "color",
          type: "string",
          default: '"currentColor"',
          description:
            "Colour of the text. currentColor follows the surrounding text.",
        },
        {
          name: "morphColor",
          type: "string",
          default: '"#8B5CF6"',
          description: "Colour letters pass through while they change.",
        },
        {
          name: "tint",
          type: "number",
          default: "0.3",
          description: "Strength of that colour, from 0 (none) to 1.",
        },
        {
          name: "align",
          type: '"left" | "center" | "right"',
          default: '"center"',
          description:
            "Where shorter words sit inside the space of the longest one.",
        },
        {
          name: "fontFamily",
          type: "string",
          default: "—",
          description:
            "Font of the words. Leave unset to inherit from the surrounding text.",
        },
        {
          name: "fontSize",
          type: "number",
          default: "—",
          description: "Font size in pixels. Leave unset to inherit.",
        },
        {
          name: "fontWeight",
          type: "number",
          default: "—",
          description: "Font weight. Leave unset to inherit.",
        },
        {
          name: "letterSpacing",
          type: "number",
          default: "—",
          description: "Letter spacing in em. Leave unset to inherit.",
        },
        {
          name: "interval",
          type: "number",
          default: "2.6",
          description: "Seconds from one morph to the next in auto mode.",
        },
        {
          name: "duration",
          type: "number",
          default: "1.1",
          description:
            "Seconds a morph takes, from the first letter to the last.",
        },
        {
          name: "stagger",
          type: "number",
          default: "0.25",
          description:
            "How much the change ripples across the word, from 0 (every letter at once) to 0.9.",
        },
        {
          name: "staggerFrom",
          type: '"start" | "end" | "center" | "edges" | "random"',
          default: '"start"',
          description:
            "Where the ripple begins. Start follows the reading direction, so it runs right to left in RTL text.",
        },
        {
          name: "travel",
          type: "number",
          default: "0.5",
          description:
            "How far changing letters drift toward their place in the next word, from 0 to 1.",
        },
        {
          name: "goo",
          type: "number",
          default: "0.1",
          description:
            "How far letters reach to fuse as they pass each other, in em.",
        },
        {
          name: "swell",
          type: "number",
          default: "0.02",
          description: "Extra weight letters gain mid-morph, in em.",
        },
        {
          name: "softness",
          type: "number",
          default: "0.8",
          description:
            "How rounded letters become while they change. In blur mode, how strong the blur is.",
        },
        {
          name: "scale",
          type: "number",
          default: "0.04",
          description:
            "How much leaving letters grow and arriving letters settle.",
        },
        {
          name: "trigger",
          type: '"auto" | "hover" | "click"',
          default: '"auto"',
          description:
            "Morph on a timer, each time the pointer enters, or on click.",
        },
        {
          name: "loop",
          type: "boolean",
          default: "true",
          description: "Return to the first word after the last.",
        },
        {
          name: "intro",
          type: "boolean",
          default: "true",
          description: "Grow the first word in from nothing when it appears.",
        },
        {
          name: "startOnView",
          type: "boolean",
          default: "true",
          description: "Wait until the text scrolls into view before starting.",
        },
        {
          name: "pauseOnHover",
          type: "boolean",
          default: "false",
          description:
            "Hold the current word while the mouse is over it (auto mode).",
        },
        {
          name: "paused",
          type: "boolean",
          default: "false",
          description: "Stop morphing on the timer.",
        },
        {
          name: "quality",
          type: "number",
          default: "1",
          description: "Render scale from 0.5 to 1.",
        },
        {
          name: "onChange",
          type: "(word, index) => void",
          default: "—",
          description: "Called after each morph with the new word.",
        },
        {
          name: "ref",
          type: "{ next, goTo }",
          default: "—",
          description:
            "next() morphs to the next word, goTo(index) to any word.",
        },
        {
          name: "className",
          type: "string",
          default: "—",
          description:
            "Classes for the inline wrapper. It sits inside a heading like any other word.",
        },
        {
          name: "style",
          type: "CSSProperties",
          default: "—",
          description: "Inline styles for the wrapper.",
        },
      ],
      L = () => {
        let [e, t] = (0, i.I)(),
          a = "dark" === (0, o.Y)(),
          [s, u] = (0, n.useState)("liquid"),
          [h, d] = (0, n.useState)(j),
          c = (e) => (t) => d((a) => ({ ...a, [e]: t })),
          [m, f] = (0, n.useState)(null),
          p = m ?? (a ? h.dark : h.light),
          [g, v] = (0, n.useState)(null),
          x = g ?? (a ? "#FAFAFA" : "#0A0A0A"),
          [w, y] = (0, n.useState)("Imagine, Create, Launch"),
          b = w
            .split(",")
            .map((e) => e.trim())
            .filter(Boolean),
          [C, A] = (0, n.useState)("inherit"),
          [M, S] = (0, n.useState)(132),
          [L, $] = (0, n.useState)(700),
          [P, G] = (0, n.useState)(-0.04),
          [H, z] = (0, n.useState)("center"),
          [N, W] = (0, n.useState)("auto"),
          [D, O] = (0, n.useState)(!0),
          [Y, V] = (0, n.useState)(!0),
          [_, Q] = (0, n.useState)(!1),
          [Z, X] = (0, n.useState)(!1),
          [K, J] = (0, n.useState)(1);
        return (0, r.jsxs)("div", {
          children: [
            (0, r.jsx)(l.Bg, {}),
            (0, r.jsxs)(l.VX, {
              children: [
                (0, r.jsxs)(l.Ec, {
                  children: [
                    (0, r.jsx)(l.Ch, {
                      onRefresh: t,
                      minHeight: 460,
                      enableResponsive: !0,
                      children: (0, r.jsx)("div", {
                        className: `relative flex h-full w-full items-center justify-center px-6 ${a ? "bg-[#0A0A0A]" : "bg-white"}`,
                        children: (0, r.jsx)(
                          F,
                          {
                            words: b,
                            morph: h.morph,
                            color: x,
                            morphColor: p,
                            tint: h.tint,
                            align: H,
                            fontFamily: C,
                            fontSize: M,
                            fontWeight: L,
                            letterSpacing: P,
                            interval: h.interval,
                            duration: h.duration,
                            stagger: h.stagger,
                            staggerFrom: h.staggerFrom,
                            travel: h.travel,
                            goo: h.goo,
                            swell: h.swell,
                            softness: h.softness,
                            scale: h.scale,
                            trigger: N,
                            loop: D,
                            intro: Y,
                            pauseOnHover: _,
                            paused: Z,
                            quality: K,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, r.jsxs)(l.IH, {
                      children: [
                        (0, r.jsx)(l.bg, {
                          title: "Preset",
                          value: s,
                          options: B,
                          onChange: (e) => {
                            (u(e), d(k[e] ?? j), f(null), t());
                          },
                        }),
                        (0, r.jsx)(l.UD, {
                          title: "Words",
                          value: w,
                          placeholder: "Imagine, Create, Launch",
                          onChange: y,
                        }),
                        (0, r.jsx)(l.W7, {
                          title: "Text Colour",
                          value: x,
                          onChange: v,
                        }),
                        (0, r.jsx)(l.W7, {
                          title: "Morph Colour",
                          value: p,
                          onChange: f,
                        }),
                        (0, r.jsx)(l.bg, {
                          title: "Morph",
                          value: h.morph,
                          options: I,
                          onChange: (e) => c("morph")(e),
                        }),
                        (0, r.jsx)(l.bg, {
                          title: "Stagger From",
                          value: h.staggerFrom,
                          options: R,
                          onChange: (e) => c("staggerFrom")(e),
                        }),
                        (0, r.jsx)(l.bg, {
                          title: "Trigger",
                          value: N,
                          options: T,
                          onChange: (e) => W(e),
                        }),
                        (0, r.jsx)(l.bg, {
                          title: "Font",
                          value: C,
                          options: E,
                          onChange: A,
                        }),
                        (0, r.jsx)(l.bg, {
                          title: "Align",
                          value: H,
                          options: q,
                          onChange: (e) => z(e),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Font Size",
                          min: 32,
                          max: 200,
                          step: 1,
                          value: M,
                          valueUnit: "px",
                          onChange: S,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Font Weight",
                          min: 300,
                          max: 900,
                          step: 100,
                          value: L,
                          onChange: $,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Letter Spacing",
                          min: -0.08,
                          max: 0.2,
                          step: 0.005,
                          value: P,
                          valueUnit: "em",
                          onChange: G,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Tint",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: h.tint,
                          onChange: c("tint"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Interval",
                          min: 0.6,
                          max: 8,
                          step: 0.1,
                          value: h.interval,
                          valueUnit: "s",
                          onChange: c("interval"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Duration",
                          min: 0.3,
                          max: 3,
                          step: 0.05,
                          value: h.duration,
                          valueUnit: "s",
                          onChange: c("duration"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Stagger",
                          min: 0,
                          max: 0.9,
                          step: 0.05,
                          value: h.stagger,
                          onChange: c("stagger"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Travel",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: h.travel,
                          onChange: c("travel"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Goo",
                          min: 0,
                          max: 0.4,
                          step: 0.01,
                          value: h.goo,
                          valueUnit: "em",
                          onChange: c("goo"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Swell",
                          min: 0,
                          max: 0.15,
                          step: 0.005,
                          value: h.swell,
                          valueUnit: "em",
                          onChange: c("swell"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Softness",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: h.softness,
                          onChange: c("softness"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Scale",
                          min: -0.2,
                          max: 0.3,
                          step: 0.01,
                          value: h.scale,
                          onChange: c("scale"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Quality",
                          min: 0.5,
                          max: 1,
                          step: 0.05,
                          value: K,
                          onChange: J,
                        }),
                        (0, r.jsx)(l.tl, {
                          title: "Loop",
                          checked: D,
                          onChange: O,
                        }),
                        (0, r.jsx)(l.tl, {
                          title: "Intro",
                          checked: Y,
                          onChange: V,
                        }),
                        (0, r.jsx)(l.tl, {
                          title: "Pause On Hover",
                          checked: _,
                          onChange: Q,
                        }),
                        (0, r.jsx)(l.tl, {
                          title: "Paused",
                          checked: Z,
                          onChange: X,
                        }),
                      ],
                    }),
                    (0, r.jsx)(l.Ub, { data: U }),
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
