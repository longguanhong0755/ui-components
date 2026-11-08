/* ReactBits Pro public preview module 4938 for snapshot-trail.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/4938.998d6d757971c7ce.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  4938: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => A }));
    var n = a(95155),
      r = a(12115),
      o = a(56388),
      i = a(86049),
      l = a(90761),
      s = a(2253),
      u = a(12246),
      d = a(90650);
    let c = 2 * Math.PI,
      m = Math.PI / 180,
      p = [
        {
          src: "/demo-media/portrait-sienna.webp",
          alt: "Studio portrait with short natural hair and a burnt-orange top",
        },
        {
          src: "/demo-media/portrait-indigo.webp",
          alt: "Studio portrait with short dark hair and a cobalt jacket",
        },
        {
          src: "/demo-media/portrait-ochre.webp",
          alt: "Studio portrait with curly dark hair and an ochre knit",
        },
        {
          src: "/demo-media/portrait-teal.webp",
          alt: "Studio portrait with a shaved head and a teal jacket",
        },
        {
          src: "/demo-media/portrait-rose.webp",
          alt: "Studio portrait with curly red hair and burgundy clothing",
        },
        {
          src: "/demo-media/portrait-olive.webp",
          alt: "Studio portrait with a dark bob and an olive top",
        },
        {
          src: "/demo-media/portrait-pearl.webp",
          alt: "Studio portrait with long black hair and an ivory shirt",
        },
        {
          src: "/demo-media/portrait-silver.webp",
          alt: "Studio portrait with cropped grey hair and a black shirt",
        },
      ],
      h = (e, t, a) => Math.min(a, Math.max(t, e)),
      v = (e, t, a) => {
        let n = h((a - e) / (t - e), 0, 1);
        return n * n * (3 - 2 * n);
      },
      f = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      x = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      y = new s.Q1f(),
      g = (e) => {
        let t = e.trim().toLowerCase();
        if (!t || "transparent" === t || "none" === t) return null;
        try {
          y.setStyle(t, s.jf0);
        } catch {
          return null;
        }
        return [y.r, y.g, y.b];
      },
      b = `
attribute vec4 aPose;
attribute vec4 aTurn;
attribute vec4 aBox;
attribute vec4 aMotion;
uniform vec2 uView;
uniform float uFocal;
uniform vec2 uVanish;
uniform float uShadowOffset;
uniform float uShadowBlur;
varying vec2 vLocal;
varying vec2 vHalf;
varying float vLayer;
varying float vBlur;
varying float vOpacity;
varying vec2 vMotion;
varying float vDesat;
varying vec2 vShadow;
varying float vScale;

void main() {
  vec2 halfSize = aBox.xy * 0.5;
  float scale = max(aPose.w, 1e-3);
  float motion = length(aMotion.xy) / scale;
  float pad = (uShadowOffset + uShadowBlur * 2.5) / scale + aBox.w * 2.5 + motion * 0.6 + 3.0;
  vec2 local = position.xy * (halfSize + pad);
  float c = cos(aTurn.x);
  float s = sin(aTurn.x);
  vec2 turned = vec2(c * local.x - s * local.y, s * local.x + c * local.y);
  float cx = cos(aTurn.y);
  float sx = sin(aTurn.y);
  float cy = cos(aTurn.z);
  float sy = sin(aTurn.z);
  vec3 p = vec3(turned.x, turned.y * cx, turned.y * sx);
  p = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
  float depthScale = uFocal / (uFocal + max(aPose.z, -uFocal * 0.8));
  vec2 center = uVanish + (aPose.xy - uVanish) * depthScale;
  float w = max(1.0 + p.z * scale * depthScale / uFocal, 0.2);
  vec2 screen = center + p.xy * scale * depthScale / w;
  vec2 ndc = vec2(screen.x / uView.x * 2.0 - 1.0, 1.0 - screen.y / uView.y * 2.0);
  gl_Position = vec4(ndc * w, 0.0, w);
  vLocal = local;
  vHalf = halfSize;
  vLayer = aBox.z;
  vBlur = aBox.w;
  vOpacity = aTurn.w;
  vDesat = aMotion.z;
  vScale = scale * depthScale;
  vec2 m = aMotion.xy / max(scale * depthScale, 1e-3);
  vMotion = vec2(c * m.x + s * m.y, -s * m.x + c * m.y);
  vec2 so = vec2(0.0, uShadowOffset) / max(scale * depthScale, 1e-3);
  vShadow = vec2(c * so.x + s * so.y, -s * so.x + c * so.y);
}
`,
      w = `
precision highp float;
precision highp sampler2DArray;

uniform sampler2DArray uImages;
uniform vec2 uLayerScale;
uniform float uRadius;
uniform int uFrame;
uniform float uFrameWidth;
uniform vec3 uFrameColor;
uniform float uShadowAlpha;
uniform float uShadowBlur;
uniform vec3 uShadowColor;
uniform float uRim;
uniform vec3 uRimColor;
uniform float uDpr;
varying vec2 vLocal;
varying vec2 vHalf;
varying float vLayer;
varying float vBlur;
varying float vOpacity;
varying vec2 vMotion;
varying float vDesat;
varying vec2 vShadow;
varying float vScale;

float sdBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

vec4 cardAt(vec2 q, float aa, float lod) {
  float radius = min(uRadius, min(vHalf.x, vHalf.y));
  float sd = sdBox(q, vHalf, radius);
  float cover = 1.0 - smoothstep(-aa, aa, sd);
  if (cover <= 0.0) return vec4(0.0);
  vec2 innerCenter = vec2(0.0);
  vec2 innerHalf = vHalf;
  float innerRadius = radius;
  if (uFrame > 0) {
    float fw = min(uFrameWidth, min(vHalf.x, vHalf.y) * 0.45);
    float bottom = uFrame == 2 ? fw * 3.2 : fw;
    innerHalf = vec2(vHalf.x - fw, vHalf.y - (fw + bottom) * 0.5);
    innerCenter = vec2(0.0, (fw - bottom) * 0.5);
    innerRadius = max(radius - fw, 0.0) * (uFrame == 2 ? 0.25 : 1.0);
  }
  vec2 rel = q - innerCenter;
  float inner = 1.0 - smoothstep(-aa, aa, sdBox(rel, innerHalf, innerRadius));
  vec2 uv = rel / (innerHalf * 2.0) + 0.5;
  vec3 picture = textureLod(uImages, vec3(clamp(uv, 0.0, 1.0), vLayer), lod).rgb;
  float luma = dot(picture, vec3(0.2126, 0.7152, 0.0722));
  picture = mix(picture, vec3(luma), vDesat);
  vec3 color = uFrame > 0 ? mix(uFrameColor, picture, inner) : picture;
  if (uRim > 0.0) {
    float edge = exp(-pow((sd + 0.6) / 0.8, 2.0));
    color = mix(color, uRimColor, edge * uRim);
  }
  return vec4(color * cover, cover);
}

void main() {
  float px = 1.0 / max(vScale * uDpr, 1e-3);
  float aa = max(fwidth(vLocal.x) + fwidth(vLocal.y), px) * 0.6 + vBlur;
  float texels = max(vBlur * 2.0 / vHalf.y * 0.5 * uLayerScale.y, 1.0);
  float lod = log2(texels) + log2(max(fwidth(vLocal.y) / (vHalf.y * 2.0) * uLayerScale.y, 1.0));
  float travel = length(vMotion);
  int taps = int(clamp(ceil(travel / 3.0), 1.0, 14.0));
  vec4 sum = vec4(0.0);
  for (int i = 0; i < 14; i++) {
    if (i >= taps) break;
    float t = taps > 1 ? (float(i) + 0.5) / float(taps) - 0.5 : 0.0;
    sum += cardAt(vLocal - vMotion * t, aa, lod);
  }
  vec4 card = sum / float(taps);
  float radius = min(uRadius, min(vHalf.x, vHalf.y));
  float shadowSoft = uShadowBlur / max(vScale, 1e-3) + vBlur;
  float shadowDistance = sdBox(vLocal - vShadow, vHalf * vec2(0.94, 0.96), radius);
  float shade = (1.0 - smoothstep(-shadowSoft, shadowSoft * 1.4, shadowDistance)) * uShadowAlpha;
  vec4 shadow = vec4(uShadowColor * shade, shade);
  vec4 color = card + shadow * (1.0 - card.a);
  color *= vOpacity;
  if (color.a < 0.002) discard;
  gl_FragColor = color;
}
`,
      S = (0, r.forwardRef)(function (
        {
          images: e = p,
          imageWidth: t = 168,
          imageHeight: a = 236,
          borderRadius: o = 10,
          fit: i = "cover",
          position: l = "center",
          frame: y = "none",
          frameWidth: S = 8,
          frameColor: C = "#FAF8F4",
          shadow: M = 0.5,
          spacing: F = 64,
          lifetime: j = 1.4,
          maxCount: k = 18,
          rotation: L = 0,
          lean: R = 0.4,
          tilt: B = 14,
          toss: H = 0.12,
          friction: E = 0.4,
          gravity: A = 0,
          depth: W = 0,
          spin: I = 0,
          enterScale: P = 0.6,
          exitScale: T = 0.82,
          bounce: D = 0.45,
          blur: z = 0.6,
          motionBlur: q = 0.6,
          desaturate: U = 0,
          stacking: O = "newest",
          order: N = "sequence",
          autoplay: V = !0,
          autoplaySpeed: _ = 1,
          burst: Y = 6,
          layer: G = "front",
          backgroundColor: X = "transparent",
          paused: $ = !1,
          dpr: K = 2,
          children: Q,
          className: Z,
          style: J,
        },
        ee,
      ) {
        let et = (0, r.useRef)(null),
          ea = (0, r.useRef)(null),
          en = (0, r.useRef)(null),
          er = (0, r.useSyncExternalStore)(f, x, () => !1),
          eo = e.length ? e : p,
          ei = (0, r.useRef)(eo),
          el = {
            imageWidth: t,
            imageHeight: a,
            borderRadius: o,
            fit: i,
            position: l,
            frame: y,
            frameWidth: S,
            frameColor: C,
            shadow: M,
            spacing: F,
            lifetime: j,
            maxCount: k,
            rotation: L,
            lean: R,
            tilt: B,
            toss: H,
            friction: E,
            gravity: A,
            depth: W,
            spin: I,
            enterScale: P,
            exitScale: T,
            bounce: D,
            blur: z,
            motionBlur: q,
            desaturate: U,
            stacking: O,
            order: N,
            autoplay: V,
            autoplaySpeed: _,
            burst: Y,
            layer: G,
            backgroundColor: X,
            paused: $,
            dpr: K,
            reduced: er,
          },
          es = (0, r.useRef)(el);
        ((0, r.useEffect)(() => {
          ((es.current = el), (ei.current = eo), en.current?.sync());
        }),
          (0, r.useEffect)(() => {
            let e = et.current,
              t = ea.current;
            if (!e || !t) return;
            let a = ((e, t, a, n) => {
              let r,
                o = e.ownerDocument,
                i = o.defaultView ?? window,
                l = o.createElement("canvas");
              (l.setAttribute("aria-hidden", "true"),
                (l.style.cssText =
                  "position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none"));
              try {
                r = new u.WebGLRenderer({
                  canvas: l,
                  alpha: !0,
                  antialias: !1,
                  premultipliedAlpha: !0,
                  powerPreference: "high-performance",
                });
              } catch {
                return null;
              }
              (t.appendChild(l), r.setClearColor(0, 0));
              let d = new s.Z58(),
                p = new s.qUd(-1, 1, 1, -1, -1, 1),
                f = new s.bdM(2, 2),
                x = new s.CmU();
              ((x.index = f.index),
                x.setAttribute("position", f.getAttribute("position")));
              let y = new Float32Array(256),
                S = new Float32Array(256),
                C = new Float32Array(256),
                M = new Float32Array(256),
                F = [y, S, C, M].map((e) => {
                  let t = new s.uWO(e, 4);
                  return (t.setUsage(s.Vnu), t);
                });
              (x.setAttribute("aPose", F[0]),
                x.setAttribute("aTurn", F[1]),
                x.setAttribute("aBox", F[2]),
                x.setAttribute("aMotion", F[3]),
                (x.instanceCount = 0));
              let j = 256,
                k = 384,
                L = 0,
                R = new Uint8Array(393216),
                B = new s.rFo(R, j, k, 1),
                H = o.createElement("canvas"),
                E = H.getContext("2d", { willReadFrequently: !0 }),
                A = new s.BKk({
                  uniforms: {
                    uImages: { value: B },
                    uLayerScale: { value: new s.I9Y(j, k) },
                    uView: { value: new s.I9Y(1, 1) },
                    uFocal: { value: 900 },
                    uVanish: { value: new s.I9Y(0, 0) },
                    uShadowOffset: { value: 10 },
                    uShadowBlur: { value: 14 },
                    uShadowAlpha: { value: 0.3 },
                    uShadowColor: { value: new s.Pq0(0, 0, 0) },
                    uRadius: { value: 8 },
                    uFrame: { value: 0 },
                    uFrameWidth: { value: 8 },
                    uFrameColor: { value: new s.Pq0(1, 1, 1) },
                    uRim: { value: 0 },
                    uRimColor: { value: new s.Pq0(1, 1, 1) },
                    uDpr: { value: 1 },
                  },
                  vertexShader: b,
                  fragmentShader: w,
                  transparent: !0,
                  premultipliedAlpha: !0,
                  side: s.$EB,
                  depthTest: !1,
                  depthWrite: !1,
                }),
                W = new s.eaF(x, A);
              ((W.frustumCulled = !1), d.add(W));
              let I = [],
                P = "",
                T = "",
                D = [],
                z = 0,
                q = 0,
                U = -1,
                O = 0,
                N = 0,
                V = 1,
                _ = !1,
                Y = [1, 1, 1],
                G = -10,
                X = 0,
                $ = 0,
                K = !1,
                Q = !1,
                Z = !1,
                J = !1,
                ee = 0,
                et = 0,
                ea = null,
                en = { x: 0, y: 0 },
                er = null,
                eo = 0,
                ei = 0,
                el = null,
                es = 0,
                eu = null,
                ed = null,
                ec = () => h(O / 900, 0.55, 1),
                em = () => {
                  let t = a.current,
                    n = Math.round(e.clientWidth),
                    o = Math.round(e.clientHeight);
                  if (n < 2 || o < 2) return ((_ = !1), !1);
                  let l = Math.min(
                    i.devicePixelRatio || 1,
                    Math.max(t.dpr, 0.5),
                  );
                  return (
                    (!_ || n !== O || o !== N || l !== V) &&
                    ((_ = !0),
                    (O = n),
                    (N = o),
                    (V = l),
                    r.setPixelRatio(V),
                    r.setSize(O, N, !1),
                    !0)
                  );
                },
                ep = () => {
                  Y =
                    g(a.current.backgroundColor) ??
                    (() => {
                      let t = e;
                      for (; t;) {
                        let e = i
                          .getComputedStyle(t)
                          .backgroundColor.match(/rgba?\(([^)]+)\)/);
                        if (e) {
                          let t = e[1]
                            .split(",")
                            .map((e) => Number.parseFloat(e));
                          if (t.length < 4 || t[3] > 0.05)
                            return [t[0] / 255, t[1] / 255, t[2] / 255];
                        }
                        t = t.parentElement;
                      }
                      let a = i
                        .getComputedStyle(e)
                        .color.match(/rgba?\(([^)]+)\)/);
                      if (a) {
                        let e = a[1]
                          .split(",")
                          .map((e) => Number.parseFloat(e));
                        return e[0] + e[1] + e[2] > 382
                          ? [0.04, 0.04, 0.04]
                          : [1, 1, 1];
                      }
                      return [1, 1, 1];
                    })();
                },
                eh = (e) => ("string" == typeof e ? e : e.src),
                ev = (e) => {
                  let t = a.current,
                    n = I[e];
                  if (!n || !n.ready || n.drawn || !E) return !1;
                  let r = n.image,
                    o = r.naturalWidth,
                    i = r.naturalHeight;
                  if (!o || !i) return !1;
                  ((H.width = j), (H.height = k));
                  try {
                    if ("contain" === t.fit) E.drawImage(r, 0, 0, j, k);
                    else {
                      let e = j / k,
                        a = o,
                        n = i;
                      o / i > e ? (a = i * e) : (n = o / e);
                      let l = t.position,
                        s =
                          "left" === l
                            ? 0
                            : "right" === l
                              ? o - a
                              : (o - a) / 2,
                        u =
                          "top" === l
                            ? 0
                            : "bottom" === l
                              ? i - n
                              : (i - n) / 2;
                      E.drawImage(r, s, u, a, n, 0, 0, j, k);
                    }
                    let a = E.getImageData(0, 0, j, k).data;
                    R.set(a, e * j * k * 4);
                  } catch {
                    return !1;
                  }
                  return (
                    (n.drawn = !0),
                    B.addLayerUpdate(e),
                    (B.needsUpdate = !0),
                    !0
                  );
                },
                ef = () => {
                  let e = n.current.slice(0, 32),
                    t = e.map(eh).join("\0");
                  t !== P &&
                    ((P = t),
                    I.forEach((e) => {
                      e.image.onload = null;
                    }),
                    (D = []),
                    (I = e.map((e) => {
                      let t = new Image();
                      ((t.crossOrigin = "anonymous"), (t.decoding = "async"));
                      let a = { image: t, ready: !1, drawn: !1, aspect: 1 };
                      return (
                        (t.onload = () => {
                          if (Q) return;
                          let e = () => {
                            Q ||
                              a.ready ||
                              ((a.aspect =
                                t.naturalWidth / Math.max(t.naturalHeight, 1)),
                              (a.ready = !0),
                              ex());
                          };
                          t.decode().then(e, e);
                        }),
                        (t.src = eh(e)),
                        a
                      );
                    })),
                    (T = ""),
                    (q = 0));
                },
                ex = () => {
                  Q || Z || !K || X || (X = requestAnimationFrame(eS));
                },
                ey = (e, t, n, r, o = 0, i = !1) => {
                  let l = a.current,
                    s = (() => {
                      let e = a.current,
                        t = I.length;
                      if (!t) return -1;
                      if ("random" === e.order)
                        for (let e = 0; e < 12; e++) {
                          let e = Math.floor(Math.random() * t);
                          if (I[e].drawn && (e !== U || 1 === t))
                            return ((U = e), e);
                        }
                      for (let e = 0; e < t; e++) {
                        let a = (q + e) % t;
                        if (I[a].drawn) return ((q = a + 1), (U = a), a);
                      }
                      return -1;
                    })();
                  if (s < 0) return;
                  let u = l.reduced,
                    d = performance.now() / 1e3,
                    c = ec(),
                    p = h(l.imageWidth, 24, 800) * c,
                    v = h(l.imageHeight, 24, 1e3) * c,
                    f = p,
                    x = v;
                  if ("contain" === l.fit) {
                    let e = I[s].aspect;
                    e > p / v ? (x = p / e) : (f = v * e);
                  }
                  let y = u ? 0 : i ? 1 : h(l.toss, 0, 1.5),
                    g = u ? 0 : h(n / 1400, -1, 1) * h(l.lean, 0, 1) * 18 * m,
                    b = (2 * Math.random() - 1) * h(l.rotation, 0, 180) * m,
                    w = u ? 0 : h(l.tilt, 0, 60) * m,
                    S = {
                      id: z++,
                      layer: s,
                      born: d,
                      life:
                        Math.max(l.lifetime, 0.1) * (0.9 + 0.2 * Math.random()),
                      leaving: -1,
                      x: e,
                      y: t,
                      z: 0,
                      vx: n * y,
                      vy: r * y,
                      rz: b + g,
                      spin: u
                        ? 0
                        : h(n / 1e3, -1.6, 1.6) * y * h(l.spin, 0, 3) +
                          o * (Math.random() - 0.5) * 1.6,
                      rx: h(-r / 1600, -1, 1) * w,
                      ry: h(n / 1600, -1, 1) * w,
                      rxv: 0,
                      ryv: 0,
                      scale: u ? 1 : h(l.enterScale, 0, 2),
                      scaleV: 0,
                      w: f,
                      h: x,
                      mx: 0,
                      my: 0,
                    };
                  D.push(S);
                  let C = h(Math.round(l.maxCount), 1, 64),
                    M = D.filter((e) => e.leaving < 0);
                  if (M.length > C) {
                    let e = M.length - C;
                    for (let t = 0; t < e; t++) M[t].leaving = d;
                  }
                  (D.length > 64 && D.splice(0, D.length - 64), ex());
                },
                eg = (e, t, n) => {
                  let r = a.current,
                    o = h(Math.round(n ?? r.burst), 0, 24);
                  if (!o || !_) return;
                  let i = void 0 === e ? O / 2 : h(e, 0, 1) * O,
                    l = void 0 === t ? N / 2 : h(t, 0, 1) * N,
                    s = r.reduced,
                    u = Math.random() * c;
                  for (let e = 0; e < o; e++) {
                    let t =
                        u + (e / o) * c + (c / o) * (Math.random() - 0.5) * 0.5,
                      a = s
                        ? 0
                        : (300 + 140 * Math.random()) *
                          Math.sqrt((Math.max(r.imageWidth, 40) * ec()) / 168);
                    ey(i, l, Math.cos(t) * a, Math.sin(t) * a, 1, !0);
                  }
                },
                eb = (e, t, n, r, o) => {
                  let i = h(a.current.spacing, 4, 600) * ec(),
                    l = t.x - e.x,
                    s = t.y - e.y,
                    u = Math.hypot(l, s),
                    d = n + u,
                    c = i - n,
                    m = 0;
                  for (; d >= i && m < 24;) {
                    let t = u > 0 ? h(c / u, 0, 1) : 1;
                    (ey(e.x + l * t, e.y + s * t, r, o),
                      (d -= i),
                      (c += i),
                      m++);
                  }
                  return d % i;
                },
                ew = (e, t) => [
                  e + Math.random() * Math.max(O - 2 * e, 1),
                  t + Math.random() * Math.max(N - 2 * t, 1),
                ];
              function eS(e) {
                if (((X = 0), Q || Z || (!_ && (em(), !_)))) return;
                let t = a.current,
                  n =
                    $ && e - $ < 100
                      ? Math.min(Math.max((e - $) / 1e3, 0), 0.05)
                      : 1 / 60;
                $ = e;
                let o = performance.now() / 1e3,
                  i = t.reduced,
                  l = !1;
                (em(),
                  o - G > 1.2 && ((G = o), ep()),
                  (() => {
                    let e = a.current,
                      t = h(e.imageWidth, 24, 800),
                      n = h(e.imageHeight, 24, 1e3),
                      o = [t, n, e.fit, e.position, V, I.length].join("|");
                    if (o === T) return !1;
                    T = o;
                    let i = h(
                      64 * Math.ceil((Math.max(t, n) * Math.min(V, 2)) / 64),
                      192,
                      1024,
                    );
                    return (
                      "contain" === e.fit
                        ? ((j = i), (k = i))
                        : t >= n
                          ? ((j = i),
                            (k = Math.max(Math.round((i * n) / t), 16)))
                          : ((k = i),
                            (j = Math.max(Math.round((i * t) / n), 16))),
                      (L = Math.max(I.length, 1)),
                      (R = new Uint8Array(j * k * 4 * L)),
                      B.dispose(),
                      ((B = new s.rFo(R, j, k, L)).format = s.GWd),
                      (B.type = s.OUM),
                      (B.colorSpace = s.jf0),
                      (B.minFilter = s.$_I),
                      (B.magFilter = s.k6q),
                      (B.wrapS = s.ghU),
                      (B.wrapT = s.ghU),
                      (B.generateMipmaps = !0),
                      (B.anisotropy = Math.min(
                        4,
                        r.capabilities.getMaxAnisotropy(),
                      )),
                      (B.needsUpdate = !0),
                      (A.uniforms.uImages.value = B),
                      A.uniforms.uLayerScale.value.set(j, k),
                      I.forEach((e) => {
                        e.drawn = !1;
                      }),
                      !0
                    );
                  })() && (l = !0));
                let u = !1;
                for (let e = 0; e < I.length; e++) {
                  if (I[e].ready && !I[e].drawn && ev(e)) {
                    l = !0;
                    break;
                  }
                  I[e].ready || (u = !0);
                }
                u && (l = !0);
                let m =
                  t.autoplay && !i && !t.paused && (!J || o - ee > 3) && !ed;
                if (
                  ((ei += (!!m - ei) * (1 - Math.exp(-n / 0.6))),
                  m && I.some((e) => e.drawn))
                ) {
                  let e = h(t.autoplaySpeed, 0.05, 4);
                  if (
                    (!el &&
                      o >= es &&
                      ((e, t) => {
                        let a = Math.min(0.16 * O, 160),
                          n = Math.min(0.18 * N, 140),
                          r = eu ? [eu.x, eu.y] : ew(a, n),
                          o = ew(a, n);
                        for (let e = 0; e < 6; e++) {
                          let e = ew(a, n);
                          if (
                            Math.hypot(e[0] - r[0], e[1] - r[1]) >
                            0.5 * Math.min(O, N)
                          ) {
                            o = e;
                            break;
                          }
                        }
                        let i = o[0] - r[0],
                          l = o[1] - r[1],
                          s = Math.hypot(i, l),
                          u = (Math.random() - 0.5) * 0.9,
                          d = -l / Math.max(s, 1),
                          c = i / Math.max(s, 1),
                          m = [
                            r[0] + 0.3 * i + d * s * u,
                            r[1] + 0.3 * l + c * s * u,
                          ],
                          p = [
                            r[0] + 0.7 * i + d * s * u * 0.6,
                            r[1] + 0.7 * l + c * s * u * 0.6,
                          ];
                        el = {
                          points: [r, m, p, o],
                          start: e,
                          duration: Math.max(
                            (1.15 * s) / (620 * Math.max(t, 0.05)),
                            0.35,
                          ),
                        };
                      })(o, e),
                    el)
                  ) {
                    var f, b;
                    let a,
                      r,
                      i,
                      l,
                      s,
                      u = h((o - el.start) / el.duration, 0, 1),
                      d =
                        ((f = el.points),
                        (r =
                          (a = 1 - (b = u * u * u * (u * (6 * u - 15) + 10))) *
                          a *
                          a),
                        (i = 3 * a * a * b),
                        (l = 3 * a * b * b),
                        (s = b * b * b),
                        {
                          x:
                            r * f[0][0] +
                            i * f[1][0] +
                            l * f[2][0] +
                            s * f[3][0],
                          y:
                            r * f[0][1] +
                            i * f[1][1] +
                            l * f[2][1] +
                            s * f[3][1],
                        });
                    if (er) {
                      let e = (d.x - er.x) / Math.max(n, 0.001),
                        t = (d.y - er.y) / Math.max(n, 0.001);
                      ((eo = eb(er, d, eo, e * ei, t * ei)), (er = d));
                    } else ((er = d), (eo = 0.999 * h(t.spacing, 4, 600)));
                    u >= 1 &&
                      ((eu = d),
                      (el = null),
                      (er = null),
                      (es = o + (0.25 + 0.45 * Math.random()) / Math.sqrt(e)));
                  }
                  l = !0;
                } else ((er = null), (el = null));
                let w = 1.4 * Math.max(O, N),
                  H = 0.12 + 1.4 * h(t.friction, 0, 1),
                  E = i ? 0 : h(t.gravity, -4e3, 6e3),
                  W = i ? 0 : h(t.depth, -2, 4) * w * 0.6,
                  P = h(t.bounce, 0, 1),
                  z = c / (0.42 - 0.12 * P),
                  q = 0.95 - 0.6 * P,
                  U = c / 0.9,
                  K = h(t.exitScale, 0, 2),
                  et = i ? 0 : h(t.blur, 0, 1),
                  ea = i ? 0 : h(t.motionBlur, 0, 2),
                  en = h(t.desaturate, 0, 1),
                  eh = Math.max(1, Math.ceil(n / (1 / 120))),
                  ef = n / eh,
                  ey = [];
                for (let e of D) {
                  let t = o - e.born,
                    a = Math.min(0.5, 0.45 * e.life),
                    r = e.leaving >= 0 ? e.leaving : e.born + e.life - a,
                    s = e.leaving >= 0 ? 0.28 : a,
                    u = v(0, 1, (o - r) / s);
                  if (u >= 1 || (e.leaving >= 0 && o - e.leaving > s + 0.05))
                    continue;
                  let d = e.x,
                    c = e.y;
                  if (i) e.scale = 1;
                  else {
                    let a = Math.exp(-n / H);
                    ((e.vx *= a),
                      (e.vy = e.vy * a + E * n),
                      (e.x += e.vx * n),
                      (e.y += e.vy * n),
                      (e.z += W * n * v(0, 0.35, t)),
                      (e.rz += e.spin * n),
                      (e.spin *= 0 !== E ? 1 : Math.exp(-n / 1.1)));
                    let r = 1 + (K - 1) * u;
                    for (let t = 0; t < eh; t++)
                      ((e.scaleV +=
                        (z * z * (r - e.scale) - 2 * q * z * e.scaleV) * ef),
                        (e.scale += e.scaleV * ef),
                        (e.rxv += (-(U * U * e.rx) - 1.1 * U * e.rxv) * ef),
                        (e.ryv += (-(U * U * e.ry) - 1.1 * U * e.ryv) * ef),
                        (e.rx += e.rxv * ef),
                        (e.ry += e.ryv * ef));
                  }
                  let m = 0.02 * ea;
                  ((e.mx = n > 0 ? ((e.x - d) / n) * m : 0),
                    (e.my = n > 0 ? ((e.y - c) / n) * m : 0));
                  let p = 2 * Math.max(e.w, e.h);
                  (e.y - p > N + 200 && E > 0) || (ey.push(e), (l = !0));
                }
                let eg = (D = ey).slice();
                ("oldest" === t.stacking && eg.reverse(),
                  Math.abs(W) > 0 &&
                    eg.sort(
                      (e, a) =>
                        a.z - e.z ||
                        ("oldest" === t.stacking ? a.id - e.id : e.id - a.id),
                    ));
                let eS = Math.min(eg.length, 64);
                for (let e = 0; e < eS; e++) {
                  let t = eg[e],
                    a = o - t.born,
                    n = Math.min(0.5, 0.45 * t.life),
                    r = v(
                      0,
                      1,
                      (o - (t.leaving >= 0 ? t.leaving : t.born + t.life - n)) /
                        (t.leaving >= 0 ? 0.28 : n),
                    ),
                    l = (i ? v(0, 0.18, a) : v(0, 0.16, a)) * (1 - r),
                    s = et * (12 * (1 - v(0, 0.16, a)) + 16 * r),
                    u = en * v(0.1, 1, a / Math.max(t.life, 0.1)),
                    d = 4 * e;
                  ((y[d] = t.x),
                    (y[d + 1] = t.y),
                    (y[d + 2] = t.z),
                    (y[d + 3] = Math.max(t.scale, 0.01)),
                    (S[d] = t.rz),
                    (S[d + 1] = t.rx),
                    (S[d + 2] = t.ry),
                    (S[d + 3] = l),
                    (C[d] = t.w),
                    (C[d + 1] = t.h),
                    (C[d + 2] = t.layer),
                    (C[d + 3] = s),
                    (M[d] = t.mx),
                    (M[d + 1] = t.my),
                    (M[d + 2] = u),
                    (M[d + 3] = 0));
                }
                ((x.instanceCount = eS),
                  F.forEach((e) => {
                    e.needsUpdate = !0;
                  }));
                let eC = 0.2126 * Y[0] + 0.7152 * Y[1] + 0.0722 * Y[2] > 0.5,
                  eM = A.uniforms;
                (eM.uView.value.set(O, N),
                  (eM.uFocal.value = w),
                  eM.uVanish.value.set(O / 2, N / 2),
                  (eM.uDpr.value = V));
                let eF = h(t.shadow, 0, 1);
                ((eM.uShadowAlpha.value = eF * (eC ? 0.28 : 0.55)),
                  (eM.uShadowOffset.value = 6 + 12 * eF),
                  (eM.uShadowBlur.value = 8 + 18 * eF),
                  eM.uShadowColor.value.set(
                    0.06 * !!eC,
                    0.05 * !!eC,
                    0.12 * !!eC,
                  ),
                  (eM.uRadius.value = Math.max(t.borderRadius, 0) * ec()),
                  (eM.uFrame.value =
                    "polaroid" === t.frame ? 2 : +("border" === t.frame)),
                  (eM.uFrameWidth.value = Math.max(t.frameWidth, 0) * ec()));
                let ej = g(t.frameColor) ?? [0.98, 0.97, 0.95];
                (eM.uFrameColor.value.set(ej[0], ej[1], ej[2]),
                  (eM.uRim.value = 0.12 * !eC),
                  eM.uRimColor.value.set(1, 1, 1),
                  r.render(d, p),
                  (l || (t.autoplay && !i && !t.paused)) && ex());
              }
              let eC = (t) => {
                  let a = e.getBoundingClientRect();
                  return { x: t.clientX - a.left, y: t.clientY - a.top };
                },
                eM = (e) =>
                  e instanceof Element &&
                  !!e.closest(
                    "a,button,input,textarea,select,label,summary,[role=button],[contenteditable=true]",
                  ),
                eF = 0,
                ej = (e) => {
                  if (a.current.paused) return;
                  let t = eC(e),
                    n = performance.now();
                  if (
                    ((J = !0),
                    (ee = performance.now() / 1e3),
                    ed &&
                      ed.id === e.pointerId &&
                      Math.hypot(t.x - ed.x, t.y - ed.y) > 8 &&
                      (ed.moved = !0),
                    ea)
                  ) {
                    let e = Math.max((n - eF) / 1e3, 1 / 240),
                      a = (t.x - ea.x) / e,
                      r = (t.y - ea.y) / e,
                      o = h(e / 0.06, 0, 1);
                    ((en.x += (a - en.x) * o),
                      (en.y += (r - en.y) * o),
                      Math.hypot(t.x - ea.x, t.y - ea.y) > 0.6 * Math.max(O, N)
                        ? ((ea = t), (et = 0))
                        : ((et = eb(
                            ea,
                            t,
                            et,
                            h(en.x, -4e3, 4e3),
                            h(en.y, -4e3, 4e3),
                          )),
                          (ea = t)));
                  } else
                    ((ea = t),
                      (et = 0.999 * h(a.current.spacing, 4, 600)),
                      (en.x = 0),
                      (en.y = 0));
                  ((eF = n), ex());
                },
                ek = (e) => {
                  "touch" !== e.pointerType &&
                    ((J = !1), (ea = null), (et = 0), ex());
                },
                eL = (e) => {
                  if (!e.isPrimary || e.button > 0 || eM(e.target)) return;
                  let t = eC(e);
                  ((ed = { id: e.pointerId, x: t.x, y: t.y, moved: !1 }),
                    "touch" === e.pointerType && ((ea = t), (et = 0)));
                },
                eR = (e) => {
                  if (!ed || ed.id !== e.pointerId) return;
                  let t = ed;
                  if (
                    ((ed = null),
                    "touch" === e.pointerType && ((ea = null), (J = !1)),
                    t.moved || eM(e.target))
                  )
                    return;
                  let n = a.current;
                  n.burst > 0 &&
                    !n.paused &&
                    eg(t.x / Math.max(O, 1), t.y / Math.max(N, 1));
                };
              (e.addEventListener("pointermove", ej),
                e.addEventListener("pointerleave", ek),
                e.addEventListener("pointerdown", eL),
                e.addEventListener("pointerup", eR),
                e.addEventListener("pointercancel", eR));
              let eB = new ResizeObserver(() => {
                em() && ex();
              });
              eB.observe(e);
              let eH =
                "undefined" == typeof IntersectionObserver
                  ? null
                  : new IntersectionObserver(
                      ([e]) => {
                        (K = e.isIntersecting)
                          ? (($ = 0), ex())
                          : (X && cancelAnimationFrame(X), (X = 0));
                      },
                      { rootMargin: "80px" },
                    );
              eH ? eH.observe(e) : (K = !0);
              let eE = (e) => {
                  (e.preventDefault(),
                    (Z = !0),
                    X && cancelAnimationFrame(X),
                    (X = 0));
                },
                eA = () => {
                  ((Z = !1), (P = ""), ef(), ex());
                };
              return (
                l.addEventListener("webglcontextlost", eE),
                l.addEventListener("webglcontextrestored", eA),
                em(),
                ep(),
                ef(),
                ex(),
                {
                  sync: () => {
                    (em(), ep(), ef(), ex());
                  },
                  burst: eg,
                  clear: () => {
                    let e = performance.now() / 1e3;
                    (D.forEach((t) => {
                      t.leaving < 0 && (t.leaving = e);
                    }),
                      ex());
                  },
                  destroy: () => {
                    ((Q = !0),
                      X && cancelAnimationFrame(X),
                      eH?.disconnect(),
                      eB.disconnect(),
                      e.removeEventListener("pointermove", ej),
                      e.removeEventListener("pointerleave", ek),
                      e.removeEventListener("pointerdown", eL),
                      e.removeEventListener("pointerup", eR),
                      e.removeEventListener("pointercancel", eR),
                      l.removeEventListener("webglcontextlost", eE),
                      l.removeEventListener("webglcontextrestored", eA),
                      I.forEach((e) => {
                        e.image.onload = null;
                      }),
                      B.dispose(),
                      A.dispose(),
                      x.dispose(),
                      f.dispose(),
                      r.dispose(),
                      r.getContext().isContextLost() || r.forceContextLoss(),
                      l.remove());
                  },
                }
              );
            })(e, t, es, ei);
            return (
              (en.current = a),
              () => {
                (a?.destroy(), (en.current = null));
              }
            );
          }, []),
          (0, r.useImperativeHandle)(
            ee,
            () => ({
              burst: (e, t, a) => en.current?.burst(e, t, a),
              clear: () => en.current?.clear(),
            }),
            [],
          ));
        let eu = X.trim().toLowerCase();
        return (0, n.jsxs)("div", {
          ref: et,
          className: (0, d.cn)(
            "relative isolate h-full min-h-[320px] w-full overflow-hidden",
            Z,
          ),
          style: {
            backgroundColor: "transparent" === eu || "" === eu ? void 0 : X,
            touchAction: "pan-y",
            ...J,
          },
          children: [
            (0, n.jsx)("div", {
              ref: ea,
              "aria-hidden": "true",
              style: {
                position: "absolute",
                inset: 0,
                zIndex: 2 * ("back" !== G),
                pointerEvents: "none",
              },
            }),
            Q
              ? (0, n.jsx)("div", {
                  style: { position: "relative", zIndex: 1, height: "100%" },
                  children: Q,
                })
              : null,
          ],
        });
      });
    S.displayName = "SnapshotTrail";
    let C = {
        imageWidth: 168,
        imageHeight: 236,
        borderRadius: 10,
        frame: "none",
        frameWidth: 8,
        shadow: 0.5,
        spacing: 64,
        lifetime: 1.4,
        maxCount: 18,
        rotation: 0,
        lean: 0.4,
        tilt: 14,
        toss: 0.12,
        friction: 0.4,
        gravity: 0,
        depth: 0,
        spin: 0,
        enterScale: 0.6,
        exitScale: 0.82,
        bounce: 0.45,
        blur: 0.6,
        motionBlur: 0.6,
        desaturate: 0,
      },
      M = {
        trail: C,
        toss: {
          ...C,
          toss: 0.42,
          friction: 0.3,
          rotation: 8,
          spin: 1,
          tilt: 22,
          lean: 0.6,
          lifetime: 1.4,
          spacing: 80,
        },
        prints: {
          ...C,
          frame: "polaroid",
          frameWidth: 9,
          rotation: 12,
          lifetime: 2.4,
          spacing: 90,
          tilt: 6,
          shadow: 0.8,
          borderRadius: 2,
          enterScale: 0.85,
          exitScale: 0.95,
          blur: 0.3,
          imageWidth: 180,
          imageHeight: 216,
        },
        depth: {
          ...C,
          depth: 1.2,
          lifetime: 1.6,
          blur: 0.8,
          tilt: 10,
          toss: 0,
          spacing: 56,
          maxCount: 24,
          exitScale: 0.9,
        },
        drop: {
          ...C,
          gravity: 1300,
          toss: 0.3,
          spin: 1.2,
          rotation: 6,
          lifetime: 1.5,
          friction: 0.9,
          exitScale: 1,
        },
        film: {
          ...C,
          imageWidth: 112,
          imageHeight: 150,
          spacing: 18,
          lifetime: 0.85,
          rotation: 0,
          tilt: 0,
          lean: 0,
          motionBlur: 1.4,
          blur: 0.2,
          enterScale: 0.9,
          exitScale: 0.9,
          borderRadius: 4,
          maxCount: 48,
        },
        memory: {
          ...C,
          desaturate: 1,
          lifetime: 2.2,
          toss: 0.2,
          rotation: 4,
          exitScale: 0.92,
        },
      },
      F = [
        { label: "Trail", value: "trail" },
        { label: "Toss", value: "toss" },
        { label: "Prints", value: "prints" },
        { label: "Depth", value: "depth" },
        { label: "Drop", value: "drop" },
        { label: "Film", value: "film" },
        { label: "Memory", value: "memory" },
      ],
      j = [
        { label: "None", value: "none" },
        { label: "Border", value: "border" },
        { label: "Polaroid", value: "polaroid" },
      ],
      k = [
        { label: "Cover", value: "cover" },
        { label: "Contain", value: "contain" },
      ],
      L = [
        { label: "Center", value: "center" },
        { label: "Top", value: "top" },
        { label: "Bottom", value: "bottom" },
        { label: "Left", value: "left" },
        { label: "Right", value: "right" },
      ],
      R = [
        { label: "Newest On Top", value: "newest" },
        { label: "Oldest On Top", value: "oldest" },
      ],
      B = [
        { label: "Sequence", value: "sequence" },
        { label: "Random", value: "random" },
      ],
      H = [
        { label: "Front", value: "front" },
        { label: "Back", value: "back" },
      ],
      E = [
        {
          name: "images",
          type: "(string | { src: string; alt?: string })[]",
          default: "studio portrait collection",
          description:
            "Photos for the trail, used in turn (up to 32). Images must allow cross-origin loading.",
        },
        {
          name: "imageWidth",
          type: "number",
          default: "168",
          description: "Width of a snapshot in pixels.",
        },
        {
          name: "imageHeight",
          type: "number",
          default: "236",
          description: "Height of a snapshot in pixels.",
        },
        {
          name: "borderRadius",
          type: "number",
          default: "10",
          description: "Corner radius in pixels.",
        },
        {
          name: "fit",
          type: '"cover" | "contain"',
          default: '"cover"',
          description:
            "Cover crops every photo to the snapshot size; contain keeps each photo's own proportions inside it.",
        },
        {
          name: "position",
          type: '"center" | "top" | "bottom" | "left" | "right"',
          default: '"center"',
          description:
            "Which part of a photo stays in view when it is cropped.",
        },
        {
          name: "frame",
          type: '"none" | "border" | "polaroid"',
          default: '"none"',
          description:
            "Print each photo with an even border or an instant-film frame with a deeper bottom edge.",
        },
        {
          name: "frameWidth",
          type: "number",
          default: "8",
          description: "Width of the print border in pixels.",
        },
        {
          name: "frameColor",
          type: "string",
          default: '"#FAF8F4"',
          description: "Colour of the print border.",
        },
        {
          name: "shadow",
          type: "number",
          default: "0.5",
          description:
            "Strength and softness of the shadow under each snapshot.",
        },
        {
          name: "spacing",
          type: "number",
          default: "64",
          description:
            "Distance in pixels the pointer travels between snapshots. Lower values make a denser trail.",
        },
        {
          name: "lifetime",
          type: "number",
          default: "1.4",
          description: "Seconds a snapshot stays before it leaves.",
        },
        {
          name: "maxCount",
          type: "number",
          default: "18",
          description:
            "Most snapshots on screen at once. The oldest leave early when the limit is reached.",
        },
        {
          name: "rotation",
          type: "number",
          default: "0",
          description:
            "Random rotation of each snapshot, up to this many degrees either way.",
        },
        {
          name: "lean",
          type: "number",
          default: "0.4",
          description:
            "How much snapshots lean into the direction the pointer is moving.",
        },
        {
          name: "tilt",
          type: "number",
          default: "14",
          description:
            "3D tilt in degrees as a snapshot is swept along, easing back flat as it settles.",
        },
        {
          name: "toss",
          type: "number",
          default: "0.12",
          description:
            "How much of the pointer's speed a snapshot keeps, so it slides on after it is dropped.",
        },
        {
          name: "friction",
          type: "number",
          default: "0.4",
          description:
            "How long a tossed snapshot keeps sliding, from 0 (stops quickly) to 1 (glides).",
        },
        {
          name: "gravity",
          type: "number",
          default: "0",
          description:
            "Downward pull in pixels per second squared. Snapshots fall and tumble away.",
        },
        {
          name: "depth",
          type: "number",
          default: "0",
          description:
            "Speed at which snapshots recede into the distance. Negative values bring them toward you.",
        },
        {
          name: "spin",
          type: "number",
          default: "0",
          description: "How much tossed or falling snapshots spin.",
        },
        {
          name: "enterScale",
          type: "number",
          default: "0.6",
          description: "Scale a snapshot grows from when it appears.",
        },
        {
          name: "exitScale",
          type: "number",
          default: "0.82",
          description: "Scale a snapshot shrinks to as it leaves.",
        },
        {
          name: "bounce",
          type: "number",
          default: "0.45",
          description:
            "Springiness of the entrance, from 0 (smooth) to 1 (bouncy).",
        },
        {
          name: "blur",
          type: "number",
          default: "0.6",
          description:
            "How soft a snapshot is as it comes into focus and as it leaves.",
        },
        {
          name: "motionBlur",
          type: "number",
          default: "0.6",
          description:
            "Blur along the direction of travel for moving snapshots.",
        },
        {
          name: "desaturate",
          type: "number",
          default: "0",
          description: "How much snapshots lose their colour as they age.",
        },
        {
          name: "stacking",
          type: '"newest" | "oldest"',
          default: '"newest"',
          description:
            "Whether new snapshots land on top of the trail or slide in underneath it.",
        },
        {
          name: "order",
          type: '"sequence" | "random"',
          default: '"sequence"',
          description: "Use the photos in order, or pick them at random.",
        },
        {
          name: "autoplay",
          type: "boolean",
          default: "true",
          description:
            "Draw trails on its own with natural strokes while the pointer is away, and three seconds after it stops moving.",
        },
        {
          name: "autoplaySpeed",
          type: "number",
          default: "1",
          description: "Speed of the autoplay strokes.",
        },
        {
          name: "burst",
          type: "number",
          default: "6",
          description:
            "Snapshots that pop out in a ring when you click or tap. 0 turns it off.",
        },
        {
          name: "layer",
          type: '"front" | "back"',
          default: '"front"',
          description:
            "Draw the trail over the component's children, or behind them.",
        },
        {
          name: "backgroundColor",
          type: "string",
          default: '"transparent"',
          description:
            "Background of the component. Shadows and edges adapt to light and dark backgrounds.",
        },
        {
          name: "paused",
          type: "boolean",
          default: "false",
          description:
            "Stops new snapshots. Reduced-motion users get snapshots that fade in and out without moving.",
        },
        {
          name: "dpr",
          type: "number",
          default: "2",
          description: "Maximum device pixel ratio for the canvas.",
        },
        {
          name: "children",
          type: "ReactNode",
          default: "—",
          description:
            "Content inside the trail area. Clicks on its links and buttons never trigger a burst.",
        },
        {
          name: "ref",
          type: "{ burst, clear }",
          default: "—",
          description:
            "burst(x?, y?, count?) pops snapshots from a position given in fractions of the size; clear() lets every snapshot leave.",
        },
        {
          name: "className",
          type: "string",
          default: "—",
          description:
            "Classes for the root element. It fills its parent, with a 320px minimum height.",
        },
        {
          name: "style",
          type: "CSSProperties",
          default: "—",
          description: "Inline styles for the root element.",
        },
      ],
      A = () => {
        let [e, t] = (0, l.I)(),
          a = (0, i.Y)(),
          [s, u] = (0, r.useState)("trail"),
          [d, c] = (0, r.useState)(M.trail),
          m = (e) => (t) => c((a) => ({ ...a, [e]: t })),
          [p, h] = (0, r.useState)(null),
          v = p ?? ("dark" === a ? "#0A0A0A" : "#FFFFFF"),
          [f, x] = (0, r.useState)("#FAF8F4"),
          [y, g] = (0, r.useState)("cover"),
          [b, w] = (0, r.useState)("center"),
          [C, A] = (0, r.useState)("newest"),
          [W, I] = (0, r.useState)("sequence"),
          [P, T] = (0, r.useState)("front"),
          [D, z] = (0, r.useState)(!0),
          [q, U] = (0, r.useState)(1),
          [O, N] = (0, r.useState)(6),
          [V, _] = (0, r.useState)(!1);
        return (0, n.jsxs)("div", {
          children: [
            (0, n.jsx)(o.Bg, {}),
            (0, n.jsxs)(o.VX, {
              children: [
                (0, n.jsxs)(o.Ec, {
                  children: [
                    (0, n.jsx)(o.Ch, {
                      onRefresh: t,
                      minHeight: 560,
                      enableResponsive: !0,
                      children: (0, n.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, n.jsx)(
                          S,
                          {
                            ...d,
                            fit: y,
                            position: b,
                            frameColor: f,
                            stacking: C,
                            order: W,
                            autoplay: D,
                            autoplaySpeed: q,
                            burst: O,
                            layer: P,
                            backgroundColor: v,
                            paused: V,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, n.jsxs)(o.IH, {
                      children: [
                        (0, n.jsx)(o.bg, {
                          title: "Preset",
                          value: s,
                          options: F,
                          onChange: (e) => {
                            (u(e), c(M[e] ?? M.trail));
                          },
                        }),
                        (0, n.jsx)(o.bg, {
                          title: "Frame",
                          value: d.frame,
                          options: j,
                          onChange: (e) => m("frame")(e),
                        }),
                        (0, n.jsx)(o.bg, {
                          title: "Fit",
                          value: y,
                          options: k,
                          onChange: (e) => g(e),
                        }),
                        (0, n.jsx)(o.bg, {
                          title: "Position",
                          value: b,
                          options: L,
                          onChange: (e) => w(e),
                        }),
                        (0, n.jsx)(o.bg, {
                          title: "Stacking",
                          value: C,
                          options: R,
                          onChange: (e) => A(e),
                        }),
                        (0, n.jsx)(o.bg, {
                          title: "Order",
                          value: W,
                          options: B,
                          onChange: (e) => I(e),
                        }),
                        (0, n.jsx)(o.bg, {
                          title: "Layer",
                          value: P,
                          options: H,
                          onChange: (e) => T(e),
                        }),
                        (0, n.jsx)(o.W7, {
                          title: "Frame Color",
                          value: f,
                          onChange: x,
                        }),
                        (0, n.jsx)(o.W7, {
                          title: "Background",
                          value: v,
                          onChange: h,
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Image Width",
                          min: 60,
                          max: 360,
                          step: 1,
                          value: d.imageWidth,
                          valueUnit: "px",
                          onChange: m("imageWidth"),
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Image Height",
                          min: 60,
                          max: 420,
                          step: 1,
                          value: d.imageHeight,
                          valueUnit: "px",
                          onChange: m("imageHeight"),
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Radius",
                          min: 0,
                          max: 40,
                          step: 1,
                          value: d.borderRadius,
                          valueUnit: "px",
                          onChange: m("borderRadius"),
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Frame Width",
                          min: 0,
                          max: 24,
                          step: 1,
                          value: d.frameWidth,
                          valueUnit: "px",
                          onChange: m("frameWidth"),
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Shadow",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: d.shadow,
                          onChange: m("shadow"),
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Spacing",
                          min: 8,
                          max: 240,
                          step: 1,
                          value: d.spacing,
                          valueUnit: "px",
                          onChange: m("spacing"),
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Lifetime",
                          min: 0.2,
                          max: 5,
                          step: 0.05,
                          value: d.lifetime,
                          valueUnit: "s",
                          onChange: m("lifetime"),
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Max Count",
                          min: 1,
                          max: 64,
                          step: 1,
                          value: d.maxCount,
                          onChange: m("maxCount"),
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Rotation",
                          min: 0,
                          max: 45,
                          step: 1,
                          value: d.rotation,
                          valueUnit: "\xb0",
                          onChange: m("rotation"),
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Lean",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: d.lean,
                          onChange: m("lean"),
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Tilt",
                          min: 0,
                          max: 45,
                          step: 1,
                          value: d.tilt,
                          valueUnit: "\xb0",
                          onChange: m("tilt"),
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Toss",
                          min: 0,
                          max: 1.2,
                          step: 0.01,
                          value: d.toss,
                          onChange: m("toss"),
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Friction",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: d.friction,
                          onChange: m("friction"),
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Gravity",
                          min: -1500,
                          max: 3e3,
                          step: 10,
                          value: d.gravity,
                          onChange: m("gravity"),
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Depth",
                          min: -1,
                          max: 3,
                          step: 0.05,
                          value: d.depth,
                          onChange: m("depth"),
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Spin",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: d.spin,
                          onChange: m("spin"),
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Enter Scale",
                          min: 0,
                          max: 1.5,
                          step: 0.01,
                          value: d.enterScale,
                          onChange: m("enterScale"),
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Exit Scale",
                          min: 0,
                          max: 1.5,
                          step: 0.01,
                          value: d.exitScale,
                          onChange: m("exitScale"),
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Bounce",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: d.bounce,
                          onChange: m("bounce"),
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Blur",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: d.blur,
                          onChange: m("blur"),
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Motion Blur",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: d.motionBlur,
                          onChange: m("motionBlur"),
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Desaturate",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: d.desaturate,
                          onChange: m("desaturate"),
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Autoplay Speed",
                          min: 0.2,
                          max: 3,
                          step: 0.05,
                          value: q,
                          onChange: U,
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Burst",
                          min: 0,
                          max: 16,
                          step: 1,
                          value: O,
                          onChange: N,
                        }),
                        (0, n.jsx)(o.tl, {
                          title: "Autoplay",
                          checked: D,
                          onChange: z,
                        }),
                        (0, n.jsx)(o.tl, {
                          title: "Paused",
                          checked: V,
                          onChange: _,
                        }),
                      ],
                    }),
                    (0, n.jsx)(o.Ub, { data: E }),
                  ],
                }),
                (0, n.jsx)(o.lT, { children: (0, n.jsx)(o.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
