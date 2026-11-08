/* ReactBits Pro public preview module 80431 for typographic-wall.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/80431.6ec80fa0374d4c11.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  80431: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => j }));
    var l = a(95155),
      n = a(12115),
      o = a(56388),
      r = a(86049),
      i = a(90761),
      s = a(12246),
      u = a(2253),
      d = a(90650);
    let c = {
        letters:
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
        upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        lower: "abcdefghijklmnopqrstuvwxyz",
        digits: "0123456789",
        binary: "01",
        hex: "0123456789ABCDEF",
        symbols: "+-*/=<>[]{}()|:;.,~^#%&@",
      },
      h = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      m = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      f = (e, t, a) => Math.min(a, Math.max(t, e)),
      p = (e) => {
        let t = e >>> 0;
        return () => {
          let e = (t = (t + 0x6d2b79f5) >>> 0);
          return (
            (e = Math.imul(e ^ (e >>> 15), 1 | e)),
            (((e ^= e + Math.imul(e ^ (e >>> 7), 61 | e)) ^ (e >>> 14)) >>> 0) /
              0x100000000
          );
        };
      },
      v = (e) =>
        e
          ? ("string" == typeof e ? e.split(/[|\n]/) : e)
              .map((e) =>
                "string" == typeof e
                  ? { label: e.trim() }
                  : { label: e.label.trim(), href: e.href },
              )
              .filter((e) => e.label.length > 0)
          : [],
      g = null,
      b = (e, t) => {
        if ((g || (g = document.createElement("canvas").getContext("2d")), !g))
          return t;
        ((g.fillStyle = "#010203"), (g.fillStyle = e));
        let a = String(g.fillStyle);
        if ("#010203" === a && "#010203" !== e.trim().toLowerCase()) return t;
        if (a.startsWith("#")) {
          let e = a.slice(1);
          return [
            parseInt(e.slice(0, 2), 16) / 255,
            parseInt(e.slice(2, 4), 16) / 255,
            parseInt(e.slice(4, 6), 16) / 255,
          ];
        }
        let l = a.match(/[\d.]+/g);
        return !l || l.length < 3
          ? t
          : [Number(l[0]) / 255, Number(l[1]) / 255, Number(l[2]) / 255];
      },
      x = (e) =>
        e <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4),
      w = ([e, t, a]) => {
        let l = x(e),
          n = x(t),
          o = x(a),
          r = Math.cbrt(0.4122214708 * l + 0.5363325363 * n + 0.0514459929 * o),
          i = Math.cbrt(0.2119034982 * l + 0.6806995451 * n + 0.1073969566 * o),
          s = Math.cbrt(0.0883024619 * l + 0.2817188376 * n + 0.6299787005 * o);
        return [
          0.2104542553 * r + 0.793617785 * i - 0.0040720468 * s,
          1.9779984951 * r - 2.428592205 * i + 0.4505937099 * s,
          0.0259040371 * r + 0.7827717662 * i - 0.808675766 * s,
        ];
      },
      y = `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,
      S = `
precision highp float;
uniform sampler2D uAtlas;
uniform sampler2D uCells;
uniform vec2 uCanvas;
uniform vec2 uOrigin;
uniform vec2 uCell;
uniform vec2 uGrid;
uniform float uAtlasCols;
uniform float uCharsetSize;
uniform float uTime;
uniform float uReveal;
uniform float uDissolve;
uniform float uWallIn;
uniform float uBand;
uniform float uStagger;
uniform float uShimmer;
uniform float uScramble;
uniform float uDensity;
uniform float uWallAlpha;
uniform float uEdge;
uniform vec3 uRankAxis;
uniform vec4 uFocusRect;
uniform float uFocus;
uniform float uFocusWord;
uniform float uUnderline;
uniform float uLine;
uniform vec3 uWordLab;
uniform vec3 uWallLab;
uniform vec3 uBandLab;
uniform float uStill;
out vec4 fragColor;

vec3 labToLinear(vec3 lab) {
  float l = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  float m = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  float s = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
  l = l * l * l;
  m = m * m * m;
  s = s * s * s;
  return max(vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  ), 0.0);
}

vec3 encode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}

float hash(float n) {
  return fract(sin(n * 12.9898 + 78.233) * 43758.5453);
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uCanvas.y - gl_FragCoord.y) - uOrigin;
  vec2 g = p / uCell;
  if (g.x < 0.0 || g.y < 0.0 || g.x >= uGrid.x || g.y >= uGrid.y) discard;
  ivec2 cell = ivec2(floor(g));
  vec2 local = g - vec2(cell);
  vec4 data = texelFetch(uCells, cell, 0);
  float seed = data.r;
  float wordGlyph = data.g;
  float wordId = data.b;
  float len = floor(data.a / 1024.0);
  float idx = data.a - len * 1024.0;
  float isWord = step(0.0, wordGlyph);
  float letter = len > 1.0 ? idx / (len - 1.0) : 0.0;
  vec2 n = (vec2(cell) + 0.5) / uGrid;
  float rank = dot(n, uRankAxis.xy) + uRankAxis.z + (seed - 0.5) * 0.04;
  float dr = uReveal - rank;
  float dd = uDissolve - rank;
  float band = max(exp(-pow(dr / uBand, 2.0)), exp(-pow(dd / uBand, 2.0))) * (1.0 - uStill);
  float wallIn = smoothstep(-uBand * 0.5, uBand * 0.5, uWallIn - rank);
  float wobble = 0.16 * sin(uTime * 0.21 + seed * 51.0) * (1.0 - uStill);
  float present = 1.0 - smoothstep(uDensity - 0.05, uDensity + 0.05, hash(seed * 7.31) + wobble);
  float lockR = uBand * 0.3 + letter * uStagger + seed * 0.012;
  float locked = smoothstep(lockR, lockR + 0.02, dr);
  float lockD = uBand * 0.15 + letter * uStagger * 0.5 + seed * 0.012;
  float released = smoothstep(lockD, lockD + 0.015, dd);
  float shown = isWord * locked * (1.0 - released);
  float decoding = isWord * smoothstep(-uBand * 0.6, 0.0, dr) * (1.0 - locked) * (1.0 - released);
  float fading = isWord * released * exp(-max(dd - lockD, 0.0) / (uBand * 0.7));
  float busy = max(band, max(decoding, fading));
  float slow = floor(uTime * uShimmer + seed * 23.0);
  float fast = floor(uTime * uScramble + seed * 23.0);
  float tick = busy > 0.35 ? fast + 7919.0 : slow;
  float scramble = 1.0 + floor(hash(seed * 91.7 + tick * 1.618) * uCharsetSize);
  float glyph = shown > 0.5 ? wordGlyph : scramble;
  vec2 fc = (uFocusRect.xy + uFocusRect.zw + 1.0) * 0.5;
  vec2 fh = (uFocusRect.zw - uFocusRect.xy + 1.0) * 0.5 + vec2(1.4, 0.8);
  vec2 q = abs(g - fc) - fh + 0.9;
  float sdf = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.9;
  float clear = uFocus * (1.0 - smoothstep(-0.2, 1.4, sdf));
  float isFocus = isWord * (1.0 - step(0.25, abs(wordId - uFocusWord)));
  vec2 edge = min(p, uGrid * uCell - p) / max(uEdge, 1.0);
  float vignette = smoothstep(0.0, 1.0, min(edge.x, edge.y));
  float wallA = present * uWallAlpha * wallIn * vignette * (1.0 - clear * 0.94);
  float bandA = band * 0.42 * vignette * (1.0 - clear);
  float wordA = max(shown, max(decoding, fading) * 0.62) * mix(1.0 - 0.42 * uFocus, 1.0, isFocus);
  float level = max(wallA, max(bandA, wordA));
  float total = wallA + bandA + wordA * 3.0 + 1e-4;
  vec3 lab = (uWallLab * wallA + uBandLab * bandA + uWordLab * wordA * 3.0) / total;
  lab = mix(lab, uWordLab, shown * (1.0 - wallA));
  float atlasRow = floor(glyph / uAtlasCols);
  float atlasCol = glyph - atlasRow * uAtlasCols;
  ivec2 texel = ivec2(vec2(atlasCol, atlasRow) * uCell + floor(local * uCell));
  float coverage = texelFetch(uAtlas, texel, 0).a;
  float along = (idx + local.x) / max(len, 1.0);
  float line = 1.0 - smoothstep(uLine * 0.5, uLine * 0.5 + 1.0, abs(local.y - 0.88) * uCell.y);
  float underline = isFocus * line * step(along, uUnderline) * uFocus * shown;
  float a = clamp(max(coverage * level, underline), 0.0, 1.0);
  if (a < 0.002) discard;
  vec3 color = labToLinear(mix(lab, uWordLab, step(coverage * level, underline)));
  fragColor = vec4(encode(color) * a, a);
}
`,
      C = (0, n.forwardRef)(function (
        {
          words:
            e = "Work|Studio|Journal|Archive|Careers|Press|Contact|Newsletter",
          fontFamily: t = "",
          fontWeight: a = 500,
          fontSize: o = 14,
          lineHeight: r = 1.8,
          letterSpacing: i = 0.12,
          charset: g = "letters",
          colors: x = ["#F4F1FF", "#B19EEF"],
          density: C = 0.7,
          wallOpacity: F = 0.1,
          shimmer: M = 0.35,
          scrambleRate: W = 12,
          layout: k = "scatter",
          direction: E = "down",
          scanDuration: A = 2.6,
          holdDuration: R = 5,
          restDuration: j = 0.8,
          stagger: L = 0.5,
          bandWidth: D = 0.09,
          loop: B = !0,
          shuffle: T = !0,
          edgeFade: I = 0.1,
          interactive: H = !0,
          clickToShuffle: z = !0,
          onWordClick: P,
          paused: U = !1,
          quality: G = 1,
          className: N,
          style: q,
          children: O,
        },
        Y,
      ) {
        let $ = (0, n.useRef)(null),
          X = (0, n.useRef)(null),
          _ = (0, n.useSyncExternalStore)(h, m, () => !1),
          J = (0, n.useRef)(null);
        ((0, n.useEffect)(() => {
          ((J.current = {
            words: v(e),
            fontFamily: t,
            fontWeight: a,
            fontSize: o,
            lineHeight: r,
            letterSpacing: i,
            charset: g,
            colors: x,
            density: C,
            wallOpacity: F,
            shimmer: M,
            scrambleRate: W,
            layout: k,
            direction: E,
            scanDuration: A,
            holdDuration: R,
            restDuration: j,
            stagger: L,
            bandWidth: D,
            loop: B,
            shuffle: T,
            edgeFade: I,
            interactive: H,
            clickToShuffle: z,
            onWordClick: P,
            paused: U,
            quality: G,
            reduced: _,
          }),
            !X.current && $.current
              ? (X.current = ((e, t) => {
                  let a,
                    l = document.createElement("canvas");
                  (l.setAttribute("aria-hidden", "true"),
                    (l.style.position = "absolute"),
                    (l.style.inset = "0"),
                    (l.style.width = "100%"),
                    (l.style.height = "100%"),
                    (l.style.display = "block"),
                    (l.style.pointerEvents = "none"),
                    e.prepend(l));
                  let n = document.createElement("div");
                  ((n.style.position = "absolute"),
                    (n.style.inset = "0"),
                    (n.style.pointerEvents = "none"),
                    l.after(n));
                  try {
                    a = new s.WebGLRenderer({
                      canvas: l,
                      alpha: !0,
                      premultipliedAlpha: !0,
                      antialias: !1,
                    });
                  } catch {
                    return (l.remove(), n.remove(), null);
                  }
                  if (!a.capabilities.isWebGL2)
                    return (a.dispose(), l.remove(), n.remove(), null);
                  a.setClearColor(0, 0);
                  let o = new u.qUd(-1, 1, 1, -1, 0, 1),
                    r = new u.Z58(),
                    i = document.createElement("canvas"),
                    d = new u.GOR(i);
                  ((d.flipY = !1),
                    (d.minFilter = u.hxR),
                    (d.magFilter = u.hxR),
                    (d.generateMipmaps = !1),
                    (d.colorSpace = u.jf0));
                  let h = new Float32Array(4),
                    m = new u.GYF(h, 1, 1, u.GWd, u.RQf),
                    v = {
                      uAtlas: { value: d },
                      uCells: { value: m },
                      uCanvas: { value: new u.I9Y(1, 1) },
                      uOrigin: { value: new u.I9Y() },
                      uCell: { value: new u.I9Y(1, 1) },
                      uGrid: { value: new u.I9Y(1, 1) },
                      uAtlasCols: { value: 16 },
                      uCharsetSize: { value: 1 },
                      uTime: { value: 0 },
                      uReveal: { value: 1e3 },
                      uDissolve: { value: -1e3 },
                      uWallIn: { value: 1e3 },
                      uBand: { value: 0.08 },
                      uStagger: { value: 0.05 },
                      uShimmer: { value: 0.6 },
                      uScramble: { value: 12 },
                      uDensity: { value: 0.8 },
                      uWallAlpha: { value: 0.14 },
                      uEdge: { value: 60 },
                      uRankAxis: { value: new u.Pq0(0, 1, 0) },
                      uFocusRect: { value: new u.IUQ(-10, -10, -10, -10) },
                      uFocus: { value: 0 },
                      uFocusWord: { value: -1 },
                      uUnderline: { value: 0 },
                      uLine: { value: 2 },
                      uWordLab: { value: new u.Pq0() },
                      uWallLab: { value: new u.Pq0() },
                      uBandLab: { value: new u.Pq0() },
                      uStill: { value: 0 },
                    },
                    g = new u.BKk({
                      glslVersion: u.Wdf,
                      vertexShader: y,
                      fragmentShader: S,
                      uniforms: v,
                      transparent: !0,
                      depthTest: !1,
                      depthWrite: !1,
                      premultipliedAlpha: !0,
                      blending: u.bCz,
                      blendSrc: u.qad,
                      blendDst: u.OuU,
                    }),
                    x = new u.eaF(new u.bdM(2, 2), g);
                  ((x.frustumCulled = !1), r.add(x));
                  let C = {
                      cols: 1,
                      rows: 1,
                      cellW: 8,
                      cellH: 20,
                      originX: 0,
                      originY: 0,
                      ratio: 1,
                    },
                    F = [],
                    M = [],
                    W = {
                      phase: "reveal",
                      time: 0,
                      speed: 1,
                      intro: !0,
                      layoutSeed: 1,
                    },
                    k = {
                      index: -1,
                      amount: 0,
                      line: 0,
                      rect: [-10, -10, -10, -10],
                    },
                    E = "",
                    A = "",
                    R = 1,
                    j = 1,
                    L = 1,
                    D = 0,
                    B = 0,
                    T = 0,
                    I = !0,
                    H = !1,
                    z = !1,
                    P = 0,
                    U = new Set(),
                    G = (e) => {
                      let a = t.current,
                        l =
                          a.fontFamily ||
                          'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace';
                      return `${f(Math.round(a.fontWeight), 100, 900)} ${e}px ${l}`;
                    },
                    N = () => {
                      let e = t.current,
                        a = f(e.bandWidth, 0.02, 0.4);
                      return {
                        band: a,
                        from: -(2.2 * a),
                        to: 1 + 2.4 * a + 0.12 * f(e.stagger, 0, 1) + 0.05,
                      };
                    },
                    q = (e) => {
                      let { from: t, to: a } = N();
                      return (
                        t + (a - t) * ((1 - Math.cos(Math.PI * f(e, 0, 1))) / 2)
                      );
                    },
                    O = () => {
                      switch (t.current.direction) {
                        case "up":
                          return [0, -1, 1];
                        case "left":
                          return [-1, 0, 1];
                        case "right":
                          return [1, 0, 0];
                        case "diagonal":
                          return [0.5, 0.5, 0];
                        default:
                          return [0, 1, 0];
                      }
                    },
                    Y = () => {
                      let a = t.current,
                        l = [
                          a.words
                            .map((e) => `${e.label}>${e.href ?? ""}`)
                            .join("|"),
                          a.fontFamily,
                          a.fontWeight,
                          a.fontSize,
                          a.lineHeight,
                          a.letterSpacing,
                          a.charset,
                          a.layout,
                          a.interactive,
                          !!a.onWordClick,
                          W.layoutSeed,
                          Math.round(R),
                          Math.round(j),
                          L.toFixed(2),
                          a.fontFamily ? "" : getComputedStyle(e).fontFamily,
                        ].join("|");
                      l !== E &&
                        ((E = l),
                        (() => {
                          let e,
                            a,
                            l,
                            o = t.current,
                            r = i.getContext("2d");
                          if (!r) return;
                          let s = G(16);
                          document.fonts?.load &&
                            !U.has(s) &&
                            (U.add(s),
                            document.fonts
                              .load(s)
                              .then((e) => {
                                !H && e.length && ((E = ""), z && _());
                              })
                              .catch(() => {}));
                          let g = L,
                            b = f(o.fontSize, 6, 64);
                          r.font = G(b * g);
                          let x = Math.max(
                              2,
                              Math.round(
                                Math.max(
                                  r.measureText("M").width,
                                  r.measureText("0").width,
                                  0.9 * r.measureText("W").width,
                                ) +
                                  f(o.letterSpacing, -0.2, 2) * b * g,
                              ),
                            ),
                            w = Math.max(
                              2,
                              Math.round(b * f(o.lineHeight, 0.8, 4) * g),
                            ),
                            y = Math.round(R * g),
                            S = Math.round(j * g);
                          ((C.ratio = g),
                            (C.cellW = x),
                            (C.cellH = w),
                            (C.cols = Math.max(1, Math.floor(y / x))),
                            (C.rows = Math.max(1, Math.floor(S / w))),
                            (C.originX = Math.floor((y - C.cols * x) / 2)),
                            (C.originY = Math.floor((S - C.rows * w) / 2)));
                          let k = (a = Array.from(
                              c[(e = t.current.charset)] ?? e,
                            ).filter((e) => e.trim().length > 0)).length
                              ? a
                              : Array.from(c.letters),
                            D = [" ", ...k],
                            B = new Map();
                          (D.forEach((e, t) => B.set(e, t)),
                            o.words.forEach((e) => {
                              Array.from(e.label).forEach((e) => {
                                e.trim() &&
                                  !B.has(e) &&
                                  (B.set(e, D.length), D.push(e));
                              });
                            }));
                          let T = Math.ceil(D.length / 16);
                          ((i.width = 16 * x),
                            (i.height = T * w),
                            r.clearRect(0, 0, i.width, i.height),
                            (r.font = G(b * g)),
                            (r.textAlign = "center"),
                            (r.textBaseline = "alphabetic"),
                            (r.fillStyle = "#fff"));
                          let I =
                            r.measureText("H").actualBoundingBoxAscent ||
                            b * g * 0.7;
                          (D.forEach((e, t) => {
                            let a = (t % 16) * x + x / 2,
                              l =
                                Math.floor(t / 16) * w +
                                Math.round(w / 2 + I / 2);
                            r.fillText(e, a, l);
                          }),
                            d.dispose(),
                            (d.needsUpdate = !0),
                            (v.uAtlasCols.value = 16),
                            (v.uCharsetSize.value = k.length),
                            (() => {
                              let e = t.current,
                                { cols: a, rows: l } = C,
                                n = p(7919 * W.layoutSeed + 13),
                                o = Math.max(2, Math.round(0.14 * a)),
                                r = Math.max(1, Math.round(0.12 * l)),
                                i = Math.max(1, l - 2 * r),
                                s = Math.max(1, a - 2 * o),
                                u = e.words.slice(0, 48),
                                d = u.length,
                                c = [],
                                h = (e, t, a) =>
                                  c.every(
                                    (l) =>
                                      l.row !== e ||
                                      t + a + 2 <= l.col ||
                                      t >= l.col + l.length + 2,
                                  );
                              (u.forEach((t, u) => {
                                let m,
                                  p,
                                  v =
                                    t.label.length > s
                                      ? t.label.slice(0, s)
                                      : t.label,
                                  g = Math.max(1, Array.from(v).length),
                                  b = f(Math.floor(i / Math.max(d, 1)), 1, 3),
                                  x =
                                    r +
                                    Math.max(
                                      0,
                                      Math.floor((i - b * (d - 1)) / 2),
                                    );
                                if ("list" === e.layout)
                                  ((m = x + u * b),
                                    (p = o + Math.round(0.1 * s)));
                                else if ("center" === e.layout)
                                  ((m = x + u * b),
                                    (p = Math.floor((a - g) / 2)));
                                else if ("diagonal" === e.layout)
                                  ((m =
                                    r +
                                    Math.floor(
                                      ((u + 0.5) * i) / Math.max(d, 1),
                                    )),
                                    (p =
                                      o +
                                      Math.round(
                                        (s - g) * (d > 1 ? u / (d - 1) : 0.5),
                                      )));
                                else {
                                  let e = i / Math.max(d, 1);
                                  ((m =
                                    r +
                                    Math.floor(
                                      u * e + n() * Math.max(0, e - 1),
                                    )),
                                    (p =
                                      o +
                                      Math.floor(n() * Math.max(1, s - g))));
                                }
                                ((m = f(m, 0, l - 1)),
                                  (p = f(p, 0, Math.max(0, a - g))));
                                for (let e = 0; e < 60 && !h(m, p, g); e++)
                                  ((m = f(r + Math.floor(n() * i), 0, l - 1)),
                                    (p = f(
                                      o + Math.floor(n() * Math.max(1, s - g)),
                                      0,
                                      Math.max(0, a - g),
                                    )));
                                h(m, p, g) &&
                                  m < l &&
                                  c.push({
                                    label: v,
                                    href: t.href,
                                    row: m,
                                    col: p,
                                    length: g,
                                  });
                              }),
                                (F = c));
                            })(),
                            ((e) => {
                              let { cols: t, rows: a } = C,
                                l = t * a;
                              h.length !== 4 * l &&
                                ((h = new Float32Array(4 * l)),
                                m.dispose(),
                                ((m = new u.GYF(
                                  h,
                                  t,
                                  a,
                                  u.GWd,
                                  u.RQf,
                                )).minFilter = u.hxR),
                                (m.magFilter = u.hxR),
                                (m.flipY = !1),
                                (v.uCells.value = m));
                              let n = p(92821 * t + 68917 * a + 7);
                              for (let e = 0; e < l; e++)
                                ((h[4 * e] = n()),
                                  (h[4 * e + 1] = -1),
                                  (h[4 * e + 2] = -1),
                                  (h[4 * e + 3] = 0));
                              (F.forEach((a, l) => {
                                Array.from(a.label).forEach((n, o) => {
                                  let r = (a.row * t + a.col + o) * 4;
                                  ((h[r + 1] = n.trim() ? (e.get(n) ?? 0) : 0),
                                    (h[r + 2] = l),
                                    (h[r + 3] = o + 1024 * a.length));
                                });
                              }),
                                (m.needsUpdate = !0));
                            })(B),
                            (l = t.current),
                            M.forEach((e) => e.remove()),
                            (M = F.map((e, a) => {
                              let o = document.createElement(
                                e.href
                                  ? "a"
                                  : l.onWordClick
                                    ? "button"
                                    : "span",
                              );
                              ((o.textContent = e.label),
                                e.href && (o.href = e.href),
                                o instanceof HTMLButtonElement &&
                                  (o.type = "button"));
                              let r = o.style;
                              return (
                                (r.position = "absolute"),
                                (r.left = `${(C.originX + e.col * C.cellW) / C.ratio}px`),
                                (r.top = `${(C.originY + e.row * C.cellH) / C.ratio}px`),
                                (r.width = `${(e.length * C.cellW) / C.ratio}px`),
                                (r.height = `${C.cellH / C.ratio}px`),
                                (r.margin = "0"),
                                (r.padding = "0"),
                                (r.border = "0"),
                                (r.background = "transparent"),
                                (r.color = "transparent"),
                                (r.font = G(l.fontSize)),
                                (r.lineHeight = `${C.cellH / C.ratio}px`),
                                (r.whiteSpace = "pre"),
                                (r.overflow = "hidden"),
                                (r.textDecoration = "none"),
                                (r.outline = "none"),
                                (r.cursor =
                                  e.href || l.onWordClick
                                    ? "pointer"
                                    : "default"),
                                (r.pointerEvents = l.interactive
                                  ? "auto"
                                  : "none"),
                                o.addEventListener("pointerenter", () => $(a)),
                                o.addEventListener("pointerleave", () => $(-1)),
                                o.addEventListener("focus", () => $(a)),
                                o.addEventListener("blur", () => $(-1)),
                                o.addEventListener("click", (l) => {
                                  (l.stopPropagation(),
                                    t.current.onWordClick?.(e.label, a));
                                }),
                                n.appendChild(o),
                                o
                              );
                            })));
                          let P = o.words
                            .map((e) => `${e.label}>${e.href ?? ""}`)
                            .join("|");
                          if (P !== A) {
                            let e = "" === A;
                            ((A = P),
                              (W.phase = "reveal"),
                              (W.time = 0),
                              (W.speed = 1),
                              e && (W.intro = !0));
                          }
                          $(-1);
                        })());
                    };
                  function $(e) {
                    let a = t.current;
                    if (
                      !(e >= 0) ||
                      (a.interactive &&
                        !a.paused &&
                        ((e) => {
                          let a = F[e];
                          if (!a) return !1;
                          let l = O(),
                            n = (a.col + a.length / 2) / C.cols,
                            o = (a.row + 0.5) / C.rows,
                            r = n * l[0] + o * l[1] + l[2],
                            { band: i } = N(),
                            s = 0.12 * f(t.current.stagger, 0, 1);
                          return (
                            "hold" === W.phase ||
                            ("reveal" === W.phase
                              ? q(W.time / X()) - r > 0.3 * i + s + 0.03
                              : "dissolve" === W.phase &&
                                q(W.time / X()) - r < 0.15 * i)
                          );
                        })(e))
                    ) {
                      if (((k.index = e), e >= 0)) {
                        let t = F[e];
                        k.rect = [t.col, t.row, t.col + t.length - 1, t.row];
                      }
                      V();
                    }
                  }
                  let X = () => f(t.current.scanDuration, 0.3, 20),
                    _ = () => {
                      z &&
                        (Y(),
                        (() => {
                          let e = t.current,
                            a = w(b(e.colors[0], [0.96, 0.95, 1])),
                            l = w(b(e.colors[1], [0.69, 0.62, 0.94])),
                            n = [
                              l[0] + (a[0] - l[0]) * 0.55,
                              l[1] + (a[1] - l[1]) * 0.35,
                              l[2] + (a[2] - l[2]) * 0.35,
                            ];
                          (v.uWordLab.value.set(a[0], a[1], a[2]),
                            v.uWallLab.value.set(l[0], l[1], l[2]),
                            v.uBandLab.value.set(n[0], n[1], n[2]),
                            v.uCanvas.value.set(
                              Math.round(R * L),
                              Math.round(j * L),
                            ),
                            v.uOrigin.value.set(C.originX, C.originY),
                            v.uCell.value.set(C.cellW, C.cellH),
                            v.uGrid.value.set(C.cols, C.rows),
                            (v.uTime.value = D));
                          let { band: o } = N();
                          ((v.uBand.value = o),
                            (v.uStagger.value = 0.12 * f(e.stagger, 0, 1)),
                            (v.uShimmer.value = f(e.shimmer, 0, 10)),
                            (v.uScramble.value = f(e.scrambleRate, 1, 40)),
                            (v.uDensity.value = f(e.density, 0, 1)),
                            (v.uWallAlpha.value = f(e.wallOpacity, 0, 1)),
                            (v.uEdge.value =
                              f(e.edgeFade, 0, 0.5) * Math.min(R, j) * L));
                          let r = O();
                          v.uRankAxis.value.set(r[0], r[1], r[2]);
                          let i = !J();
                          if (((v.uStill.value = +!!i), i))
                            ((v.uReveal.value = 1e3),
                              (v.uDissolve.value = -1e3),
                              (v.uWallIn.value = 1e3));
                          else {
                            let e = q(W.time / X());
                            ((v.uReveal.value = "reveal" === W.phase ? e : 1e3),
                              (v.uDissolve.value =
                                "dissolve" === W.phase
                                  ? e
                                  : "rest" === W.phase
                                    ? 1e3
                                    : -1e3),
                              (v.uWallIn.value =
                                W.intro && "reveal" === W.phase ? e : 1e3));
                          }
                          (v.uFocusRect.value.set(
                            k.rect[0],
                            k.rect[1],
                            k.rect[2],
                            k.rect[3],
                          ),
                            (v.uFocus.value = k.amount),
                            (v.uFocusWord.value =
                              k.index >= 0 ? k.index : v.uFocusWord.value),
                            (v.uUnderline.value = k.line),
                            (v.uLine.value = Math.max(
                              1,
                              Math.round(1.25 * L),
                            )));
                        })(),
                        a.setRenderTarget(null),
                        a.clear(),
                        a.render(r, o));
                    },
                    J = () => {
                      let e = t.current;
                      return !e.reduced && !e.paused;
                    },
                    Q = (a) => {
                      if (((B = 0), H)) return;
                      let l = Math.min(0.1, Math.max(0, (a - T) / 1e3));
                      if (
                        ((T = a),
                        ++P % 30 == 0 &&
                          (Math.abs(e.clientWidth - R) > 1 ||
                            Math.abs(e.clientHeight - j) > 1) &&
                          K(),
                        z && Y(),
                        J())
                      ) {
                        let e, a, n;
                        ((D += l),
                          (e = t.current),
                          (a = X()),
                          (W.time += l * W.speed),
                          "reveal" === W.phase && W.time >= a
                            ? ((W.phase = "hold"),
                              (W.time = 0),
                              (W.speed = 1),
                              (W.intro = !1))
                            : "hold" === W.phase
                              ? !e.loop || k.index >= 0
                                ? (W.time = Math.min(
                                    W.time,
                                    f(e.holdDuration, 0, 120),
                                  ))
                                : W.time >= f(e.holdDuration, 0, 120) &&
                                  ((W.phase = "dissolve"), (W.time = 0))
                              : "dissolve" === W.phase && W.time >= a
                                ? ((W.phase = "rest"),
                                  (W.time = 0),
                                  (W.speed = 1),
                                  k.index >= 0 && (k.index = -1))
                                : "rest" === W.phase &&
                                  W.time >= f(e.restDuration, 0, 60) &&
                                  (e.shuffle && (W.layoutSeed++, Y()),
                                  (W.phase = "reveal"),
                                  (W.time = 0)),
                          (n = +(k.index >= 0)),
                          (k.amount +=
                            (n - k.amount) * (1 - Math.exp(-l / 0.12))),
                          (k.line +=
                            (n - k.line) *
                            (1 - Math.exp(-l / (n ? 0.2 : 0.1)))));
                      }
                      (_(),
                        I &&
                          !document.hidden &&
                          J() &&
                          (B = requestAnimationFrame(Q)));
                    };
                  function V() {
                    H ||
                      B ||
                      !I ||
                      ((T = performance.now()), (B = requestAnimationFrame(Q)));
                  }
                  function K() {
                    let l = e.getBoundingClientRect();
                    if (l.width < 2 || l.height < 2) {
                      z = !1;
                      return;
                    }
                    ((z = !0),
                      (R = l.width),
                      (j = l.height),
                      (L =
                        Math.min(window.devicePixelRatio || 1, 2) *
                        f(t.current.quality, 0.25, 1)),
                      a.setPixelRatio(L),
                      a.setSize(R, j, !1),
                      _(),
                      V());
                  }
                  let Z = () => {
                      J() &&
                        ("reveal" === W.phase || "dissolve" === W.phase
                          ? (W.speed = 3)
                          : "hold" === W.phase
                            ? ((W.phase = "dissolve"),
                              (W.time = 0),
                              (W.speed = 1.6))
                            : (W.time = f(t.current.restDuration, 0, 60)),
                        (k.index = -1),
                        V());
                    },
                    ee = () => {
                      let e = t.current;
                      e.interactive && e.clickToShuffle && Z();
                    };
                  e.addEventListener("click", ee);
                  let et = new ResizeObserver(K);
                  et.observe(e);
                  let ea = new IntersectionObserver(
                    (e) => {
                      (I = e.some((e) => e.isIntersecting)) && V();
                    },
                    { rootMargin: "80px" },
                  );
                  ea.observe(e);
                  let el = () => {
                    document.hidden || V();
                  };
                  (document.addEventListener("visibilitychange", el),
                    document.fonts?.ready &&
                      document.fonts.ready
                        .then(() => {
                          !H && ((E = ""), z && _());
                        })
                        .catch(() => {}));
                  let en = (e) => e.preventDefault();
                  return (
                    l.addEventListener("webglcontextlost", en),
                    K(),
                    {
                      sync: () => {
                        let e =
                          Math.min(window.devicePixelRatio || 1, 2) *
                          f(t.current.quality, 0.25, 1);
                        (!z || Math.abs(e - L) > 0.001 ? K() : _(), V());
                      },
                      destroy: () => {
                        ((H = !0),
                          cancelAnimationFrame(B),
                          e.removeEventListener("click", ee),
                          document.removeEventListener("visibilitychange", el),
                          l.removeEventListener("webglcontextlost", en),
                          et.disconnect(),
                          ea.disconnect(),
                          M.forEach((e) => e.remove()),
                          d.dispose(),
                          m.dispose(),
                          x.geometry.dispose(),
                          g.dispose(),
                          a.dispose(),
                          a.forceContextLoss(),
                          l.remove(),
                          n.remove());
                      },
                      shuffle: Z,
                      replay: () => {
                        J() &&
                          ((W.phase = "dissolve"),
                          (W.time = 0),
                          (W.speed = 1.6),
                          (k.index = -1),
                          V());
                      },
                      focus: (e) => $(e ?? -1),
                    }
                  );
                })($.current, J))
              : X.current?.sync());
        }),
          (0, n.useEffect)(
            () => () => {
              (X.current?.destroy(), (X.current = null));
            },
            [],
          ),
          (0, n.useImperativeHandle)(
            Y,
            () => ({
              shuffle: () => X.current?.shuffle(),
              replay: () => X.current?.replay(),
              focus: (e) => X.current?.focus(e),
            }),
            [],
          ));
        let Q = v(e)
          .map((e) => e.label)
          .join(", ");
        return (0, l.jsx)("div", {
          ref: $,
          "aria-label": Q,
          className: (0, d.cn)(
            "relative isolate h-full min-h-[240px] w-full overflow-hidden",
            N,
          ),
          style: { touchAction: "pan-y", ...q },
          children:
            O &&
            (0, l.jsx)("div", {
              className: "relative z-10 h-full w-full",
              children: O,
            }),
        });
      });
    C.displayName = "TypographicWall";
    let F = {
        dark: ["#F4F1FF", "#B19EEF"],
        light: ["#111111", "#5227FF"],
        layout: "scatter",
        direction: "down",
        charset: "letters",
        fontWeight: 500,
      },
      M = {
        index: F,
        menu: { ...F, layout: "center", direction: "up", charset: "upper" },
        signal: {
          ...F,
          dark: ["#FFE8F8", "#FF9FFC"],
          light: ["#4A044E", "#E2459F"],
          layout: "diagonal",
          direction: "diagonal",
          charset: "symbols",
        },
        ledger: {
          ...F,
          dark: ["#FFFFFF", "#8B8B99"],
          light: ["#0A0A0A", "#71717A"],
          layout: "list",
          direction: "right",
          charset: "digits",
          fontWeight: 600,
        },
      },
      W = [
        { label: "Index", value: "index" },
        { label: "Menu", value: "menu" },
        { label: "Signal", value: "signal" },
        { label: "Ledger", value: "ledger" },
      ],
      k = [
        { label: "Scatter", value: "scatter" },
        { label: "Diagonal", value: "diagonal" },
        { label: "List", value: "list" },
        { label: "Center", value: "center" },
      ],
      E = [
        { label: "Down", value: "down" },
        { label: "Up", value: "up" },
        { label: "Right", value: "right" },
        { label: "Left", value: "left" },
        { label: "Diagonal", value: "diagonal" },
      ],
      A = [
        { label: "Letters", value: "letters" },
        { label: "Upper", value: "upper" },
        { label: "Lower", value: "lower" },
        { label: "Digits", value: "digits" },
        { label: "Binary", value: "binary" },
        { label: "Hex", value: "hex" },
        { label: "Symbols", value: "symbols" },
      ],
      R = [
        {
          name: "words",
          type: "string | (string | { label, href })[]",
          default:
            '"Work|Studio|Journal|Archive|Careers|Press|Contact|Newsletter"',
          description:
            "The words the wall decodes, as an array or a string separated by |. Give a word an href to make it a real link.",
        },
        {
          name: "colors",
          type: "[string, string]",
          default: '["#F4F1FF", "#B19EEF"]',
          description:
            "The colour of the decoded words, and the colour of the glyph wall. The scan band blends between the two.",
        },
        {
          name: "charset",
          type: "string",
          default: '"letters"',
          description:
            'Glyphs the wall scrambles through: "letters", "upper", "lower", "digits", "binary", "hex", "symbols", or any string of your own characters.',
        },
        {
          name: "layout",
          type: '"scatter" | "diagonal" | "list" | "center"',
          default: '"scatter"',
          description:
            "Where the words land: scattered across the wall, stepping down a diagonal, in a left-aligned index, or stacked in the centre like a menu.",
        },
        {
          name: "direction",
          type: '"down" | "up" | "right" | "left" | "diagonal"',
          default: '"down"',
          description: "Direction the scan sweeps across the wall.",
        },
        {
          name: "fontFamily",
          type: "string",
          default: "system monospace",
          description:
            "Font for the wall and the words. A monospace font keeps the grid even.",
        },
        {
          name: "fontWeight",
          type: "number",
          default: "500",
          description: "Font weight.",
        },
        {
          name: "fontSize",
          type: "number",
          default: "14",
          description: "Size of every glyph in pixels.",
        },
        {
          name: "lineHeight",
          type: "number",
          default: "1.8",
          description: "Row height as a multiple of the font size.",
        },
        {
          name: "letterSpacing",
          type: "number",
          default: "0.12",
          description: "Extra space between columns, in em.",
        },
        {
          name: "density",
          type: "number",
          default: "0.7",
          description:
            "Share of the wall that is filled with glyphs, from 0 to 1. Cells slowly come and go around this level.",
        },
        {
          name: "wallOpacity",
          type: "number",
          default: "0.1",
          description: "Opacity of the resting wall, from 0 to 1.",
        },
        {
          name: "shimmer",
          type: "number",
          default: "0.35",
          description: "How many times per second each resting glyph changes.",
        },
        {
          name: "scrambleRate",
          type: "number",
          default: "12",
          description:
            "How many times per second glyphs change inside the scan band and while a word decodes.",
        },
        {
          name: "scanDuration",
          type: "number",
          default: "2.6",
          description: "Seconds for the scan to sweep the whole wall.",
        },
        {
          name: "holdDuration",
          type: "number",
          default: "5",
          description: "Seconds the words stay before the wall dissolves them.",
        },
        {
          name: "restDuration",
          type: "number",
          default: "0.8",
          description:
            "Seconds of plain wall between a dissolve and the next reveal.",
        },
        {
          name: "stagger",
          type: "number",
          default: "0.5",
          description:
            "How long each word takes to type itself in letter by letter after the scan reaches it, from 0 (all at once) to 1.",
        },
        {
          name: "bandWidth",
          type: "number",
          default: "0.09",
          description:
            "Width of the bright scan band, as a fraction of the wall.",
        },
        {
          name: "loop",
          type: "boolean",
          default: "true",
          description:
            "Dissolve and reveal again after every hold. Turn off to decode once and keep the words.",
        },
        {
          name: "shuffle",
          type: "boolean",
          default: "true",
          description: "Place the words somewhere new on every cycle.",
        },
        {
          name: "edgeFade",
          type: "number",
          default: "0.1",
          description:
            "Softens the wall into the page at its edges, as a fraction of the shorter side.",
        },
        {
          name: "interactive",
          type: "boolean",
          default: "true",
          description:
            "Hovering or focusing a word clears the noise around it, dims the other words and draws an underline beneath it. The wall holds while a word is focused.",
        },
        {
          name: "clickToShuffle",
          type: "boolean",
          default: "true",
          description:
            "Clicking the wall away from the words dissolves them and decodes a new arrangement.",
        },
        {
          name: "onWordClick",
          type: "(word: string, index: number) => void",
          default: "—",
          description:
            "Called when a word is clicked. Words without an href become buttons when this is set.",
        },
        {
          name: "paused",
          type: "boolean",
          default: "false",
          description:
            "Freeze the wall with every word shown. Reduced-motion users always get this still state.",
        },
        {
          name: "quality",
          type: "number",
          default: "1",
          description: "Resolution scale from 0.25 to 1.",
        },
        {
          name: "ref",
          type: "{ shuffle, replay, focus }",
          default: "—",
          description:
            "shuffle() decodes a new arrangement, replay() dissolves and decodes the same one again, focus(index) highlights a word (null clears it).",
        },
        {
          name: "children",
          type: "ReactNode",
          default: "—",
          description: "Content placed over the wall.",
        },
        {
          name: "className",
          type: "string",
          default: "—",
          description:
            "Classes for the root element. It fills its parent, with a 240px minimum height.",
        },
        {
          name: "style",
          type: "CSSProperties",
          default: "—",
          description: "Inline styles for the root element.",
        },
      ],
      j = () => {
        let [e, t] = (0, i.I)(),
          a = (0, r.Y)(),
          [s, u] = (0, n.useState)(
            "Work|Studio|Journal|Archive|Careers|Press|Contact|Newsletter",
          ),
          [d, c] = (0, n.useState)("index"),
          [h, m] = (0, n.useState)(F),
          f = (e) => (t) => m((a) => ({ ...a, [e]: t })),
          [p, v] = (0, n.useState)(null),
          g = p ?? ("dark" === a ? h.dark : h.light),
          b = (e) => (t) => {
            let a = [...g];
            ((a[e] = t), v(a));
          },
          [x, w] = (0, n.useState)(14),
          [y, S] = (0, n.useState)(1.8),
          [j, L] = (0, n.useState)(0.12),
          [D, B] = (0, n.useState)(0.7),
          [T, I] = (0, n.useState)(0.1),
          [H, z] = (0, n.useState)(0.35),
          [P, U] = (0, n.useState)(12),
          [G, N] = (0, n.useState)(2.6),
          [q, O] = (0, n.useState)(5),
          [Y, $] = (0, n.useState)(0.8),
          [X, _] = (0, n.useState)(0.5),
          [J, Q] = (0, n.useState)(0.09),
          [V, K] = (0, n.useState)(0.1),
          [Z, ee] = (0, n.useState)(!0),
          [et, ea] = (0, n.useState)(!0),
          [el, en] = (0, n.useState)(!0),
          [eo, er] = (0, n.useState)(!0),
          [ei, es] = (0, n.useState)(!1);
        return (0, l.jsxs)("div", {
          children: [
            (0, l.jsx)(o.Bg, {}),
            (0, l.jsxs)(o.VX, {
              children: [
                (0, l.jsxs)(o.Ec, {
                  children: [
                    (0, l.jsx)(o.Ch, {
                      onRefresh: t,
                      minHeight: 520,
                      enableResponsive: !0,
                      children: (0, l.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, l.jsx)(
                          C,
                          {
                            words: s,
                            colors: g,
                            layout: h.layout,
                            direction: h.direction,
                            charset: h.charset,
                            fontWeight: h.fontWeight,
                            fontSize: x,
                            lineHeight: y,
                            letterSpacing: j,
                            density: D,
                            wallOpacity: T,
                            shimmer: H,
                            scrambleRate: P,
                            scanDuration: G,
                            holdDuration: q,
                            restDuration: Y,
                            stagger: X,
                            bandWidth: J,
                            edgeFade: V,
                            loop: Z,
                            shuffle: et,
                            interactive: el,
                            clickToShuffle: eo,
                            paused: ei,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, l.jsxs)(o.IH, {
                      children: [
                        (0, l.jsx)(o.UD, {
                          title: "Words",
                          value: s,
                          onChange: u,
                        }),
                        (0, l.jsx)(o.bg, {
                          title: "Look",
                          value: d,
                          options: W,
                          onChange: (e) => {
                            (c(e), m(M[e] ?? F), v(null));
                          },
                        }),
                        (0, l.jsx)(o.bg, {
                          title: "Layout",
                          value: h.layout,
                          options: k,
                          onChange: (e) => f("layout")(e),
                        }),
                        (0, l.jsx)(o.bg, {
                          title: "Direction",
                          value: h.direction,
                          options: E,
                          onChange: (e) => f("direction")(e),
                        }),
                        (0, l.jsx)(o.bg, {
                          title: "Charset",
                          value: h.charset,
                          options: A,
                          onChange: f("charset"),
                        }),
                        (0, l.jsx)(o.W7, {
                          title: "Words",
                          value: g[0],
                          onChange: b(0),
                        }),
                        (0, l.jsx)(o.W7, {
                          title: "Wall",
                          value: g[1],
                          onChange: b(1),
                        }),
                        (0, l.jsx)(o.yt, {
                          title: "Font Size",
                          min: 9,
                          max: 28,
                          step: 1,
                          value: x,
                          valueUnit: "px",
                          onChange: w,
                        }),
                        (0, l.jsx)(o.yt, {
                          title: "Font Weight",
                          min: 300,
                          max: 800,
                          step: 100,
                          value: h.fontWeight,
                          onChange: f("fontWeight"),
                        }),
                        (0, l.jsx)(o.yt, {
                          title: "Line Height",
                          min: 1.1,
                          max: 3,
                          step: 0.05,
                          value: y,
                          onChange: S,
                        }),
                        (0, l.jsx)(o.yt, {
                          title: "Letter Spacing",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: j,
                          valueUnit: "em",
                          onChange: L,
                        }),
                        (0, l.jsx)(o.yt, {
                          title: "Density",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: D,
                          onChange: B,
                        }),
                        (0, l.jsx)(o.yt, {
                          title: "Wall Opacity",
                          min: 0,
                          max: 0.5,
                          step: 0.01,
                          value: T,
                          onChange: I,
                        }),
                        (0, l.jsx)(o.yt, {
                          title: "Shimmer",
                          min: 0,
                          max: 4,
                          step: 0.05,
                          value: H,
                          valueUnit: "Hz",
                          onChange: z,
                        }),
                        (0, l.jsx)(o.yt, {
                          title: "Scramble Rate",
                          min: 2,
                          max: 30,
                          step: 1,
                          value: P,
                          valueUnit: "Hz",
                          onChange: U,
                        }),
                        (0, l.jsx)(o.yt, {
                          title: "Scan Duration",
                          min: 0.6,
                          max: 8,
                          step: 0.1,
                          value: G,
                          valueUnit: "s",
                          onChange: N,
                        }),
                        (0, l.jsx)(o.yt, {
                          title: "Hold Duration",
                          min: 0.5,
                          max: 20,
                          step: 0.5,
                          value: q,
                          valueUnit: "s",
                          onChange: O,
                        }),
                        (0, l.jsx)(o.yt, {
                          title: "Rest Duration",
                          min: 0,
                          max: 6,
                          step: 0.1,
                          value: Y,
                          valueUnit: "s",
                          onChange: $,
                        }),
                        (0, l.jsx)(o.yt, {
                          title: "Stagger",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: X,
                          onChange: _,
                        }),
                        (0, l.jsx)(o.yt, {
                          title: "Band Width",
                          min: 0.02,
                          max: 0.3,
                          step: 0.01,
                          value: J,
                          onChange: Q,
                        }),
                        (0, l.jsx)(o.yt, {
                          title: "Edge Fade",
                          min: 0,
                          max: 0.4,
                          step: 0.01,
                          value: V,
                          onChange: K,
                        }),
                        (0, l.jsx)(o.tl, {
                          title: "Loop",
                          checked: Z,
                          onChange: ee,
                        }),
                        (0, l.jsx)(o.tl, {
                          title: "Shuffle",
                          checked: et,
                          onChange: ea,
                        }),
                        (0, l.jsx)(o.tl, {
                          title: "Interactive",
                          checked: el,
                          onChange: en,
                        }),
                        (0, l.jsx)(o.tl, {
                          title: "Click To Shuffle",
                          checked: eo,
                          onChange: er,
                        }),
                        (0, l.jsx)(o.tl, {
                          title: "Paused",
                          checked: ei,
                          onChange: es,
                        }),
                      ],
                    }),
                    (0, l.jsx)(o.Ub, { data: R }),
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
