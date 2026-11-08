/* ReactBits Pro public preview module 41897 for vertical-reel.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/41897.79ee214a5736f5e8.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  41897: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => F }));
    var r = a(95155),
      i = a(12115),
      n = a(56388),
      l = a(86049),
      o = a(90761),
      s = a(12246),
      u = a(2253),
      c = a(90650);
    let d = 2 * Math.PI,
      p = [
        {
          src: "/demo-media/abstract-amber-loop.webp",
          alt: "Tilted golden-amber loop on a grainy raspberry-purple field",
          title: "Amber loop",
          subtitle: "Warmth around an open center",
        },
        {
          src: "/demo-media/abstract-pink-eclipse.webp",
          alt: "Coral-pink disc crossing a violet diagonal plane on a grainy purple field",
          title: "Pink eclipse",
          subtitle: "A disc across the diagonal",
        },
        {
          src: "/demo-media/abstract-plum-ribbon.webp",
          alt: "Intersecting pink and plum diagonal ribbons on a coral-magenta field",
          title: "Plum ribbon",
          subtitle: "Two ribbons, one crossing",
        },
        {
          src: "/demo-media/abstract-violet-steps.webp",
          alt: "Three interlocking violet and pink stepped planes with an amber edge",
          title: "Violet steps",
          subtitle: "Three planes in rhythm",
        },
        {
          src: "/demo-media/abstract-rose-balance.webp",
          alt: "Tilted raspberry rounded rectangle and tangerine disc on a rose-pink field",
          title: "Rose balance",
          subtitle: "A bright point of balance",
        },
        {
          src: "/demo-media/abstract-coral-fold.webp",
          alt: "Broad vermilion and orange folded plane over deep plum with fine grain",
          title: "Coral fold",
          subtitle: "A bold change of direction",
        },
        {
          src: "/demo-media/abstract-fuchsia-wave.webp",
          alt: "Broad fuchsia S-shaped band with a coral gradient across deep plum",
          title: "Fuchsia wave",
          subtitle: "One continuous curve",
        },
        {
          src: "/demo-media/abstract-orchid-orbit.webp",
          alt: "Fuchsia ring and peach crescent on a grainy orchid-purple field",
          title: "Orchid orbit",
          subtitle: "Color in orbit",
        },
      ],
      m = (e, t, a) => Math.min(a, Math.max(t, e)),
      h = (e, t, a) => {
        let r = m((a - e) / (t - e), 0, 1);
        return r * r * (3 - 2 * r);
      },
      f = (e) => (1e-4 > Math.abs(e) ? 1 - (e * e) / 6 : Math.sin(e) / e),
      g = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      v = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      b = (e) => {
        let t = e.trim().replace("#", "");
        if (!/^[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(t)) return null;
        let a = 3 === t.length ? t.replace(/./g, (e) => e + e) : t;
        return [0, 2, 4].map(
          (e) => Number.parseInt(a.slice(e, e + 2), 16) / 255,
        );
      },
      x = (e, t, a, r, i, n) => {
        let l = d / Math.max(i, 0.02),
          o = Math.max(1, Math.ceil(r / (1 / 240))),
          s = r / o,
          u = t,
          c = e;
        for (let e = 0; e < o; e++)
          ((u += (l * l * (a - c) - 2 * n * l * u) * s), (c += u * s));
        return [c, u];
      },
      y = {
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
      w = {
        position: "absolute",
        inset: 0,
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
      },
      M = {
        position: "absolute",
        left: 0,
        top: 0,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        whiteSpace: "nowrap",
        pointerEvents: "none",
        opacity: 0,
        willChange: "transform, opacity",
      },
      C = {
        fontSize: 16,
        fontWeight: 600,
        lineHeight: 1.25,
        letterSpacing: "-0.012em",
      },
      k = { fontSize: 13, lineHeight: 1.4, opacity: 0.55 },
      A = `
uniform vec4 uBand;

void main() {
  vec2 p = mix(uBand.xy, uBand.zw, position.xy * 0.5 + 0.5);
  gl_Position = vec4(p, 0.0, 1.0);
}
`,
      S = `
precision highp float;
precision highp sampler2DArray;

uniform sampler2DArray uImages;
uniform float uAspect[32];
uniform float uFade[32];
uniform int uCount;
uniform vec2 uView;
uniform float uDpr;
uniform vec2 uCenter;
uniform float uVertical;
uniform float uDist;
uniform float uTilt;
uniform float uK;
uniform float uPitch;
uniform float uAlong;
uniform float uAcross;
uniform float uCardAspect;
uniform float uRadius;
uniform float uPos;
uniform float uMotion;
uniform int uSamples;
uniform float uDim;
uniform float uEdge;
uniform float uIntro;
uniform vec3 uPlaceholder;

float sinc(float x) {
  return abs(x) < 1e-4 ? 1.0 - x * x / 6.0 : sin(x) / x;
}

float roundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 frag = gl_FragCoord.xy / uDpr;
  vec2 sp = frag - uCenter;
  vec2 rp = uVertical > 0.5 ? vec2(-sp.y, sp.x) : sp;
  float edgeDistance = uVertical > 0.5 ? min(frag.y, uView.y - frag.y) : min(frag.x, uView.x - frag.x);
  float edge = uEdge > 0.5 ? smoothstep(0.0, uEdge, edgeDistance) : 1.0;

  float ct = cos(uTilt);
  float st = sin(uTilt);
  vec3 o = vec3(0.0, uDist * st, uDist * ct);
  vec3 forward = -vec3(0.0, st, ct);
  vec3 up = vec3(0.0, ct, -st);
  vec3 d = normalize(forward * uDist + vec3(rp.x, 0.0, 0.0) + up * rp.y);

  float A = uK * (d.x * d.x + d.z * d.z);
  float B = 2.0 * (uK * (o.x * d.x + o.z * d.z) + d.z);
  float C = uK * (o.x * o.x + o.z * o.z) + 2.0 * o.z;
  float disc = B * B - 4.0 * A * C;
  float t;
  if (disc >= 0.0) {
    float q = -0.5 * (B + (B < 0.0 ? -1.0 : 1.0) * sqrt(disc));
    t = C / q;
  } else {
    t = -B / max(2.0 * A, 1e-12);
  }
  vec3 h = o + t * d;
  float s = uK > 1e-7 ? atan(uK * h.x, 1.0 + uK * h.z) / uK : h.x;

  vec2 gs = vec2(dFdx(s), dFdy(s));
  vec2 gy = vec2(dFdx(h.y), dFdy(h.y));
  float gLimit = 0.35 * min(uAlong, uAcross);
  gs = clamp(gs, -gLimit, gLimit);
  gy = clamp(gy, -gLimit, gLimit);
  float pixel = 1.0 / (uDist * uDpr);

  vec2 imgDx;
  vec2 imgDy;
  if (uVertical > 0.5) {
    imgDx = vec2(gy.x / uAcross, -gs.x / uAlong);
    imgDy = vec2(gy.y / uAcross, -gs.y / uAlong);
  } else {
    imgDx = vec2(gs.x / uAlong, gy.x / uAcross);
    imgDy = vec2(gs.y / uAlong, gy.y / uAcross);
  }

  int samples = max(uSamples, 1);
  float travel = abs(uMotion) * uPitch / float(samples);
  if (uVertical > 0.5) {
    imgDy += vec2(0.0, travel / uAlong);
  } else {
    imgDx += vec2(travel / uAlong, 0.0);
  }

  float jitter = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  vec2 halfSize = 0.5 * vec2(uAlong, uAcross);
  float radius = min(uRadius, min(halfSize.x, halfSize.y));
  vec4 total = vec4(0.0);

  for (int k = 0; k < 28; k++) {
    if (k >= samples) break;
    float tk = samples > 1 ? (float(k) + jitter) / float(samples) - 0.5 : 0.0;
    float sigma = s / uPitch + uPos + uMotion * tk;
    float j = floor(sigma + 0.5);
    float side = sigma - j > 0.0 ? 1.0 : -1.0;
    for (int m = 0; m < 2; m++) {
      float panel = m == 0 ? j : j + side;
      float sc = (panel - uPos - uMotion * tk) * uPitch;
      float a = sc * uK;
      float sa = sin(a);
      float ca = cos(a);
      vec3 n = vec3(sa, 0.0, ca);
      float denom = dot(n, d);
      if (denom > -1e-4) continue;
      float hs = sinc(0.5 * a);
      vec3 P = vec3(sc * sinc(a), 0.0, -sc * 0.5 * a * hs * hs);
      float tt = dot(n, P - o) / denom;
      vec3 hp = o + tt * d;
      float u = dot(hp - P, vec3(ca, 0.0, -sa));
      float v = hp.y;
      vec2 lp = vec2(u, v);
      vec2 qd = abs(lp) - halfSize + radius;
      float sd = length(max(qd, 0.0)) + min(max(qd.x, qd.y), 0.0) - radius;
      vec2 g = (qd.x > 0.0 || qd.y > 0.0) ? normalize(max(qd, 1e-6)) : (qd.x > qd.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0));
      float footprint = tt * pixel;
      float footprintU = footprint / max(-denom, 0.12);
      float aa = 0.75 * length(g * vec2(footprintU, footprint));
      aa = max(aa, 0.5 * travel * g.x);
      float coverage = 1.0 - smoothstep(-aa, aa, sd);
      if (coverage <= 0.0) continue;
      int layer = int(mod(panel, float(max(uCount, 1))));
      float imageAspect = uAspect[layer];
      vec2 img = uVertical > 0.5
        ? vec2(v / uAcross, -u / uAlong)
        : vec2(u / uAlong, v / uAcross);
      vec2 crop = uCardAspect > imageAspect
        ? vec2(1.0, imageAspect / uCardAspect)
        : vec2(uCardAspect / imageAspect, 1.0);
      vec2 uv = img * crop + 0.5;
      vec3 color = textureGrad(uImages, vec3(uv.x, 1.0 - uv.y, float(layer)), imgDx * crop * vec2(1.0, -1.0), imgDy * crop * vec2(1.0, -1.0)).rgb;
      color = mix(uPlaceholder, color, uFade[layer]);
      float facing = (1.0 - uDim * smoothstep(0.12, 1.5, abs(a))) * smoothstep(0.03, 0.24, -denom);
      float weight = coverage * facing;
      total += vec4(color * weight, weight);
    }
  }

  total /= float(samples);
  float alpha = clamp(total.a, 0.0, 1.0) * edge * uIntro;
  vec3 rgb = total.a > 1e-5 ? total.rgb / total.a : vec3(0.0);
  if (alpha < 0.002) discard;
  gl_FragColor = vec4(rgb * alpha, alpha);
}
`,
      j = (0, i.forwardRef)(function (
        {
          items: e = p,
          startIndex: t = 0,
          direction: a = "horizontal",
          aspect: n = 1.6,
          size: l = 0.42,
          curvature: o = 0.6,
          distance: d = 3,
          tilt: j = 6,
          gap: D = 22,
          radius: I = 14,
          dim: E = 0.45,
          edgeFade: z = 0.5,
          motionBlur: P = 0.6,
          friction: F = 0.5,
          snap: B = !0,
          autoplay: L = "step",
          speed: T = 0.25,
          interval: R = 3.5,
          pauseOnHover: N = !0,
          draggable: q = !0,
          wheel: H = !0,
          captions: U = !0,
          backgroundColor: V = "transparent",
          paused: W = !1,
          dpr: K = 2,
          ariaLabel:
            O = "Image reel. Drag or flick to spin it, scroll or use the arrow keys to move between images.",
          onIndexChange: $,
          onSelect: _,
          className: Y,
          style: X,
        },
        G,
      ) {
        let Q,
          Z = (0, i.useRef)(null),
          J = (0, i.useRef)(null),
          ee = (0, i.useRef)(null),
          et = (0, i.useRef)(null),
          ea = (0, i.useRef)(null),
          er = (0, i.useRef)(null),
          ei = (0, i.useSyncExternalStore)(g, v, () => !1),
          en = e.length ? e : p,
          el = (0, i.useRef)(en),
          [eo] = (0, i.useState)(() =>
            m(Math.round(t), 0, Math.max(en.length - 1, 0)),
          ),
          [es, eu] = (0, i.useState)(eo),
          [ec, ed] = (0, i.useState)(!1),
          [ep, em] = (0, i.useState)(!1),
          eh = {
            direction: a,
            aspect: n,
            size: l,
            curvature: o,
            distance: d,
            tilt: j,
            gap: D,
            radius: I,
            dim: E,
            edgeFade: z,
            motionBlur: P,
            friction: F,
            snap: B,
            autoplay: L,
            speed: T,
            interval: R,
            pauseOnHover: N,
            draggable: q,
            wheel: H,
            captions: U,
            backgroundColor: V,
            paused: W,
            dpr: K,
            reduced: ei,
            held: ec,
          },
          ef = (0, i.useRef)(eh),
          eg = (0, i.useRef)({ onIndexChange: $, onSelect: _ });
        ((0, i.useEffect)(() => {
          ((ef.current = eh),
            (el.current = en),
            (eg.current = { onIndexChange: $, onSelect: _ }),
            er.current?.sync());
        }),
          (0, i.useEffect)(() => {
            let e = Z.current,
              t = J.current,
              a = ee.current,
              r = et.current,
              i = ea.current;
            if (!e || !t || !a || !r || !i) return;
            let n = ((e, t, a, r, i, n, l) => {
              let o,
                c = e.ownerDocument,
                d = c.defaultView ?? window,
                p = c.createElement("canvas");
              p.style.cssText =
                "position:absolute;inset:0;width:100%;height:100%;display:block";
              try {
                o = new s.WebGLRenderer({
                  canvas: p,
                  alpha: !0,
                  antialias: !1,
                  premultipliedAlpha: !0,
                  powerPreference: "high-performance",
                });
              } catch {
                return null;
              }
              (t.appendChild(p), o.setClearColor(0, 0));
              let g = new u.Z58(),
                v = new u.qUd(-1, 1, 1, -1, -1, 1),
                y = new u.bdM(2, 2),
                w = new u.Q1f(0.5, 0.5, 0.5),
                M = Array(32).fill(1.6),
                C = Array(32).fill(0),
                k = 896,
                j = 560,
                D = new Uint8Array(2007040),
                I = new u.rFo(D, k, j, 1),
                E = c.createElement("canvas"),
                z = E.getContext("2d", { willReadFrequently: !0 }),
                P = new u.BKk({
                  uniforms: {
                    uImages: { value: I },
                    uAspect: { value: M },
                    uFade: { value: C },
                    uCount: { value: 1 },
                    uView: { value: new u.I9Y(1, 1) },
                    uDpr: { value: 1 },
                    uCenter: { value: new u.I9Y(0, 0) },
                    uVertical: { value: 0 },
                    uDist: { value: 1200 },
                    uTilt: { value: 0 },
                    uK: { value: 0.001 },
                    uPitch: { value: 480 },
                    uAlong: { value: 460 },
                    uAcross: { value: 288 },
                    uCardAspect: { value: 1.6 },
                    uRadius: { value: 12 },
                    uPos: { value: 0 },
                    uMotion: { value: 0 },
                    uSamples: { value: 1 },
                    uDim: { value: 0.4 },
                    uEdge: { value: 0 },
                    uIntro: { value: 0 },
                    uPlaceholder: { value: w },
                    uBand: { value: new u.IUQ(-1, -1, 1, 1) },
                  },
                  vertexShader: A,
                  fragmentShader: S,
                  transparent: !0,
                  premultipliedAlpha: !0,
                  depthTest: !1,
                  depthWrite: !1,
                }),
                F = new u.eaF(y, P);
              ((F.frustumCulled = !1), g.add(F));
              let B = [],
                L = "",
                T = 0,
                R = 0,
                N = 1,
                q = !1,
                H = n,
                U = 0,
                V = 0,
                W = n,
                K = null,
                O = 0.7,
                $ = 0.9,
                _ = null,
                Y = 0,
                X = !1,
                G = 0,
                Q = 0,
                Z = 1,
                J = !1,
                ee = 0,
                et = 0,
                ea = !1,
                er = !1,
                ei = 0,
                en = 0,
                el = 0,
                eo = !1,
                es = !1,
                eu = !1,
                ec = NaN,
                ed = NaN,
                ep = -1,
                em = NaN,
                eh = NaN,
                ef = -10,
                eg = null,
                ev = {
                  along: 460,
                  across: 288,
                  pitch: 484,
                  k: 0.001,
                  dist: 1200,
                  tilt: 0,
                  cx: 0,
                  cy: 0,
                  vertical: !1,
                  cardW: 460,
                  cardH: 288,
                },
                eb = () => Math.min(Math.max(i.current.length, 1), 32),
                ex = (e) => ((e % eb()) + eb()) % eb(),
                ey = 0,
                ew = (e) => {
                  let t = m(
                      64 * Math.ceil((ev.cardW * Math.min(N, 2)) / 64),
                      384,
                      1024,
                    ),
                    a = t > 1.3 * k;
                  if (ey === e && !a) return !1;
                  let r = 0 === ey || a ? t : k,
                    i = Math.round(r / 1.6);
                  return (
                    (ey = e),
                    (D = new Uint8Array((k = r) * (j = i) * 4 * e)),
                    I.dispose(),
                    ((I = new u.rFo(D, k, j, e)).format = u.GWd),
                    (I.type = u.OUM),
                    (I.colorSpace = u.jf0),
                    (I.minFilter = u.$_I),
                    (I.magFilter = u.k6q),
                    (I.generateMipmaps = !0),
                    (I.anisotropy = Math.min(
                      8,
                      o.capabilities.getMaxAnisotropy(),
                    )),
                    (I.needsUpdate = !0),
                    (P.uniforms.uImages.value = I),
                    B.forEach((e) => {
                      e.drawn = !1;
                    }),
                    !0
                  );
                },
                eM = (e) => {
                  let t = B[e];
                  if (!t || !t.ready || t.drawn || !z) return !1;
                  ((E.width = k), (E.height = j));
                  try {
                    z.drawImage(t.image, 0, 0, k, j);
                    let a = z.getImageData(0, 0, k, j).data;
                    D.set(a, e * k * j * 4);
                  } catch {
                    return !1;
                  }
                  return (
                    (t.drawn = !0),
                    I.addLayerUpdate(e),
                    (I.needsUpdate = !0),
                    !0
                  );
                },
                eC = () => {
                  let e = i.current.slice(0, 32),
                    t = e.map((e) => e.src).join("\0");
                  if (t === L) return;
                  ((L = t),
                    B.forEach((e) => {
                      e.image.onload = null;
                    }));
                  let a = Math.max(e.length, 1),
                    r = ex(Math.round(H));
                  ((B = e.map((e, t) => {
                    let i = new Image();
                    ((i.crossOrigin = "anonymous"), (i.decoding = "async"));
                    let n = Math.abs(t - r) % a;
                    i.fetchPriority = 2 >= Math.min(n, a - n) ? "high" : "low";
                    let l = {
                      image: i,
                      ready: !1,
                      drawn: !1,
                      aspect: 1.6,
                      fade: 0,
                    };
                    return (
                      (i.onload = () => {
                        if (es) return;
                        let e = () => {
                          es ||
                            l.ready ||
                            ((l.aspect =
                              i.naturalWidth / Math.max(i.naturalHeight, 1)),
                            (l.ready = !0),
                            eI());
                        };
                        i.decode().then(e, e);
                      }),
                      (i.src = e.src),
                      l
                    );
                  })),
                    ew(a),
                    C.fill(0));
                },
                ek = () => {
                  let t = r.current,
                    a = Math.round(e.clientWidth),
                    i = Math.round(e.clientHeight);
                  if (a < 2 || i < 2) return ((q = !1), !1);
                  let n = Math.min(
                    d.devicePixelRatio || 1,
                    Math.max(t.dpr, 0.5),
                  );
                  return (
                    (!q || a !== T || i !== R || n !== N) &&
                    ((q = !0),
                    (T = a),
                    (R = i),
                    (N = n),
                    o.setPixelRatio(N),
                    o.setSize(T, R, !1),
                    !0)
                  );
                },
                eA = () => {
                  let t = r.current.backgroundColor,
                    a = new u.Q1f();
                  if (b(t)) a.setStyle(t, u.jf0);
                  else {
                    let t = e,
                      r = !1;
                    for (; t && !r;) {
                      let e = d.getComputedStyle(t).backgroundColor;
                      (e &&
                        "transparent" !== e &&
                        !/rgba\([^)]*,\s*0\)$/.test(e) &&
                        (a.setStyle(e, u.jf0), (r = !0)),
                        (t = t.parentElement));
                    }
                    if (!r) {
                      let t = new u.Q1f();
                      (t.setStyle(d.getComputedStyle(e).color || "#fff", u.jf0),
                        a.setHex(
                          t.r + t.g + t.b > 1.5 ? 657930 : 0xffffff,
                          u.jf0,
                        ));
                    }
                  }
                  let i = 0.2126 * a.r + 0.7152 * a.g + 0.0722 * a.b > 0.6;
                  w.copy(a).lerp(new u.Q1f(0xffffff * !i), 0.1);
                },
                eS = () => {
                  let e,
                    t = r.current,
                    a = "vertical" === t.direction,
                    i = m(t.aspect, 0.4, 3),
                    n = t.captions && !a ? 70 : 0;
                  if (a) {
                    e = m(t.size, 0.15, 0.9) * R;
                    let a = 0.62 * T;
                    e * i > a && (e = a / i);
                  } else {
                    e = m(t.size, 0.15, 0.9) * Math.max(R - n, 0.5 * R);
                    let a = 0.58 * T;
                    e * i > a && (e = a / i);
                  }
                  let l = e * i;
                  ((ev.vertical = a),
                    (ev.cardW = l),
                    (ev.cardH = e),
                    (ev.along = a ? e : l),
                    (ev.across = a ? l : e),
                    (ev.pitch = ev.along + Math.max(t.gap, 0)),
                    (ev.k = (0.78 * m(t.curvature, 0, 1)) / ev.pitch),
                    (ev.dist = m(t.distance, 1.2, 12) * ev.along),
                    (ev.tilt = (m(t.tilt, -25, 25) * Math.PI) / 180));
                  let o =
                    t.captions && a && T >= 560 ? Math.min(0.12 * T, 150) : 0;
                  ((ev.cx = T / 2 - o), (ev.cy = R / 2 + n / 2));
                },
                ej = (e, t, a) => {
                  let r = e * ev.k,
                    i = f(0.5 * r);
                  return ((e, t, a) => {
                    let r = Math.cos(ev.tilt),
                      i = Math.sin(ev.tilt),
                      n = ev.dist * i,
                      l = ev.dist * r,
                      o = t - n,
                      s = a - l,
                      u = -(o * i + s * r);
                    if (u < 1) return null;
                    let c = ev.dist / u,
                      d = (e - 0) * c,
                      p = (o * r - s * i) * c,
                      m = ev.vertical ? p : d,
                      h = ev.vertical ? -d : p;
                    return { x: ev.cx + m, y: R - (ev.cy + h) };
                  })(
                    e * f(r) + t * Math.cos(r),
                    a,
                    -(0.5 * e) * r * i * i - t * Math.sin(r),
                  );
                },
                eD = (t, a) => {
                  let r = e.getBoundingClientRect(),
                    i = t - r.left,
                    n = R - (a - r.top),
                    l = i - ev.cx,
                    o = n - ev.cy,
                    s = ev.vertical ? -o : l,
                    u = ev.vertical ? l : o,
                    c = Math.cos(ev.tilt),
                    d = Math.sin(ev.tilt),
                    p = [0, ev.dist * d, ev.dist * c],
                    m = [s, -d * ev.dist + c * u, -c * ev.dist - d * u],
                    h = Math.hypot(m[0], m[1], m[2]),
                    g = [m[0] / h, m[1] / h, m[2] / h],
                    v = ev.k,
                    b = v * (g[0] * g[0] + g[2] * g[2]),
                    x = 2 * (v * (p[0] * g[0] + p[2] * g[2]) + g[2]),
                    y = v * (p[0] * p[0] + p[2] * p[2]) + 2 * p[2],
                    w = x * x - 4 * b * y,
                    M =
                      w >= 0
                        ? y / (-0.5 * (x + (x < 0 ? -1 : 1) * Math.sqrt(w)))
                        : -x / Math.max(2 * b, 1e-12),
                    C = p[0] + M * g[0],
                    k = p[2] + M * g[2],
                    A =
                      (v > 1e-7 ? Math.atan2(v * C, 1 + v * k) / v : C) /
                        ev.pitch +
                      H,
                    S = Math.round(A);
                  for (let e of [S, S + (A - S > 0 ? 1 : -1)]) {
                    let t = (e - H) * ev.pitch,
                      a = t * v,
                      r = [Math.sin(a), 0, Math.cos(a)],
                      i = r[0] * g[0] + r[2] * g[2];
                    if (i > -1e-4) continue;
                    let n = f(0.5 * a),
                      l = [t * f(a), 0, -(0.5 * t) * a * n * n],
                      o =
                        (r[0] * (l[0] - p[0]) +
                          r[1] * (l[1] - p[1]) +
                          r[2] * (l[2] - p[2])) /
                        i,
                      s = [p[0] + o * g[0], p[1] + o * g[1], p[2] + o * g[2]],
                      u =
                        (s[0] - l[0]) * Math.cos(a) -
                        (s[2] - l[2]) * Math.sin(a),
                      c = s[1];
                    if (
                      Math.abs(u) <= ev.along / 2 &&
                      Math.abs(c) <= ev.across / 2
                    )
                      return e;
                  }
                  return null;
                },
                eI = () => {
                  es ||
                    eu ||
                    !eo ||
                    ei ||
                    (en && (d.clearTimeout(en), (en = 0)),
                    (ei = requestAnimationFrame(eL)));
                },
                eE = (e = 2.6) => {
                  let t = performance.now() / 1e3;
                  ((G = Math.max(G, t + e)),
                    (Q = Math.max(Q, t + Math.max(r.current.interval, e))));
                },
                ez = (e, t, a) => {
                  ((K = e), (O = t), ($ = a), (_ = null), eI());
                },
                eP = (e) => {
                  (ez(Math.round(K ?? H) + e, 0.62, 0.9), eE());
                },
                eF = (e) => {
                  let t = eb(),
                    a = Math.round(K ?? H),
                    r =
                      ((((e - ex(a)) % t) + t + Math.floor(t / 2)) % t) -
                      Math.floor(t / 2);
                  (ez(a + r, 0.75 + 0.06 * Math.min(Math.abs(r), 6), 0.9),
                    eE());
                },
                eB = (e) => {
                  let t = Math.round(e);
                  t &&
                    (ez(
                      Math.round(K ?? H) + t,
                      1.1 + 0.08 * Math.min(Math.abs(t), 12),
                      0.92,
                    ),
                    eE());
                };
              function eL(e) {
                if (((ei = 0), es || eu || (!q && (ek(), !q)))) return;
                let t = r.current,
                  s =
                    el && e - el < 100
                      ? Math.min(Math.max((e - el) / 1e3, 0), 0.05)
                      : 1 / 60;
                el = e;
                let u = performance.now() / 1e3,
                  c = t.reduced,
                  p = eb(),
                  f = !1;
                (u - ef > 1.2 && ((ef = u), eA()),
                  ek(),
                  eS(),
                  ew(Math.max(B.length, 1)) && (f = !0));
                let b = !1,
                  y = ex(Math.round(H));
                for (let e of B.map((e, t) => ({
                  index: t,
                  distance: Math.min(Math.abs(t - y), p - Math.abs(t - y)),
                })).sort((e, t) => e.distance - t.distance)) {
                  let t = B[e.index];
                  if (t.ready && !t.drawn && (b = eM(e.index))) break;
                }
                b && (f = !0);
                for (let e = 0; e < B.length; e++) {
                  let t = B[e];
                  ((M[e] = t.aspect),
                    t.drawn &&
                      t.fade < 1 &&
                      ((t.fade = c || !J ? 1 : Math.min(1, t.fade + s / 0.45)),
                      (f = !0)),
                    (C[e] = t.drawn ? t.fade : 0));
                }
                if (!J) {
                  ee || (ee = u);
                  let e = !0;
                  for (let t = -2; t <= 2; t++) {
                    let a = B[ex(Math.round(H) + t)];
                    a && !a.drawn && (e = !1);
                  }
                  e || c || u - ee > 1.8
                    ? ((J = !0),
                      c || ((W = H = n - 2.6), ez(n, 1.5, 0.94)),
                      (Q = u + Math.max(t.interval, 1) + 1.2))
                    : (f = !0);
                }
                J &&
                  et < 1 &&
                  ((et = c ? 1 : Math.min(1, et + s / 0.6)), (f = !0));
                let w = t.autoplay,
                  k = t.paused || t.held || c || "off" === w,
                  A = !!eg || (t.pauseOnHover && ea),
                  S = A || u < G,
                  j = k || S || "drift" !== w ? 0 : 1;
                if (
                  ((Z += (j - Z) * (1 - Math.exp(-s / (j > Z ? 0.9 : 0.3)))),
                  Math.abs(j - Z) > 0.001 ? (f = !0) : (Z = j),
                  ("step" === w || "spin" === w) && !k && J && p > 1)
                ) {
                  if (A) Q = Math.max(Q, u + 0.6 * Math.max(t.interval, 1));
                  else if (
                    !S &&
                    u >= Q &&
                    null === K &&
                    null === _ &&
                    0.05 > Math.abs(U)
                  ) {
                    Q = u + Math.max(t.interval, 1);
                    let e = t.speed < 0 ? -1 : 1;
                    "step" === w
                      ? ez(Math.round(H) + e, 0.9, 0.96)
                      : ez(
                          Math.round(H) +
                            e * (3 + Math.floor(4 * Math.random())),
                          1.5,
                          0.94,
                        );
                  }
                }
                X &&
                  u - Y > 0.14 &&
                  ((X = !1), t.snap && null !== K && (K = Math.round(K)));
                let D = 0.35 + 1.45 * (1 - m(t.friction, 0, 1));
                if (eg && eg.moved) f = !0;
                else if (null !== K)
                  (([H, U] = x(H, U, K, s, c ? 0.08 : O, $)),
                    2e-4 > Math.abs(H - K) && 0.002 > Math.abs(U)
                      ? ((H = K), (U = 0), (K = null))
                      : (f = !0));
                else if (null !== _)
                  (([H, U] = x(H, U, _, s, c ? 0.08 : 0.46, 0.62)),
                    2e-4 > Math.abs(H - _) && 0.002 > Math.abs(U)
                      ? ((H = _), (U = 0), (_ = null))
                      : (f = !0));
                else {
                  let e = "drift" === w ? t.speed * Z : 0,
                    a = U - e,
                    r = Math.exp(-s / D),
                    i = Math.min(Math.abs(a * r), 0.6 * s) * Math.sign(a);
                  ((H += (U = e + a * r - i) * s),
                    Math.abs(U - e) > 0.001 && (f = !0),
                    t.snap &&
                    2.2 > Math.abs(U - e) &&
                    0.001 > Math.abs(e) &&
                    Math.abs(U) > 0.001
                      ? (Math.abs(
                          (_ =
                            U > 0
                              ? Math.ceil(H - 0.08)
                              : Math.floor(H + 0.08)) - H,
                        ) > 0.92 && (_ = Math.round(H)),
                        (f = !0))
                      : t.snap &&
                        0.001 > Math.abs(e) &&
                        0.001 >= Math.abs(U) &&
                        Math.abs(H - Math.round(H)) > 0.001 &&
                        ((_ = Math.round(H)), (f = !0)),
                    Math.abs(e) > 1e-4 && (f = !0));
                }
                let I = s > 0 ? (H - W) / s : 0;
                ((W = H),
                  (V += (I - V) * (1 - Math.exp(-s / 0.035))),
                  0.001 > Math.abs(V) ? (V = 0) : (f = !0));
                let E = ex(Math.round(H));
                E !== ec && ((ec = E), l.onActive(E));
                let z = P.uniforms,
                  F = c ? 0 : m(t.motionBlur, 0, 3) / 30,
                  L = m(V * F, -2.5, 2.5),
                  er = Math.abs(L) * ev.pitch * N;
                ((z.uSamples.value = m(Math.ceil(er / 4), 1, 28)),
                  (z.uMotion.value = L),
                  (z.uPos.value = H),
                  (z.uCount.value = Math.max(B.length, 1)),
                  z.uView.value.set(T, R),
                  (z.uDpr.value = N),
                  z.uCenter.value.set(ev.cx, ev.cy),
                  (z.uVertical.value = +!!ev.vertical),
                  (z.uDist.value = ev.dist),
                  (z.uTilt.value = ev.tilt),
                  (z.uK.value = ev.k),
                  (z.uPitch.value = ev.pitch),
                  (z.uAlong.value = ev.along),
                  (z.uAcross.value = ev.across),
                  (z.uCardAspect.value = ev.cardW / ev.cardH),
                  (z.uRadius.value = Math.max(t.radius, 0)),
                  (z.uDim.value = m(t.dim, 0, 1)),
                  (z.uEdge.value =
                    m(t.edgeFade, 0, 1) * (ev.vertical ? R : T) * 0.22),
                  (z.uIntro.value = h(0, 1, et)));
                let eo = 1 / 0,
                  ey = -1 / 0;
                for (let e = -4; e <= 4; e++) {
                  let t = (Math.round(H) + e - H) * ev.pitch;
                  for (let e of [-ev.along / 2, ev.along / 2])
                    for (let a of [-ev.across / 2, ev.across / 2]) {
                      let r = ej(t, e, a);
                      if (!r) continue;
                      let i = ev.vertical ? r.x : R - r.y;
                      ((eo = Math.min(eo, i)), (ey = Math.max(ey, i)));
                    }
                }
                (Number.isFinite(eo) || ((eo = 0), (ey = ev.vertical ? T : R)),
                  (eo -= 6),
                  (ey += 6),
                  ev.vertical
                    ? z.uBand.value.set(
                        (eo / T) * 2 - 1,
                        -1,
                        (ey / T) * 2 - 1,
                        1,
                      )
                    : z.uBand.value.set(
                        -1,
                        (eo / R) * 2 - 1,
                        1,
                        (ey / R) * 2 - 1,
                      ),
                  (function (e) {
                    let t, n;
                    if (!(r.current.captions && (!ev.vertical || T >= 560))) {
                      0 !== ep && ((ep = 0), (a.caption.style.opacity = "0"));
                      return;
                    }
                    let l = Math.round(H);
                    if (l !== ed) {
                      ed = l;
                      let e = i.current[ex(l)];
                      ((a.title.textContent = e ? (e.title ?? e.alt) : ""),
                        (a.subtitle.textContent = e?.subtitle ?? ""),
                        (a.subtitle.style.display = e?.subtitle ? "" : "none"));
                    }
                    let o =
                      (1 - h(0.06, 0.32, Math.abs(H - l))) *
                      (1 - h(1.2, 3.5, Math.abs(V))) *
                      (e ? 1 : h(0.4, 1, et));
                    if (ev.vertical) {
                      let e = ej(0, 0, ev.across / 2);
                      ((t = e ? e.x + 28 : ev.cx + ev.across / 2 + 28),
                        (n = R / 2 - 22),
                        (a.caption.style.alignItems = "flex-start"),
                        (a.caption.style.textAlign = "left"));
                    } else {
                      let e = ej(0, 0, -ev.across / 2);
                      ((t = ev.cx),
                        (n = (e ? e.y : R / 2 + ev.across / 2) + 26),
                        (a.caption.style.alignItems = "center"),
                        (a.caption.style.textAlign = "center"));
                    }
                    let s = ev.vertical
                      ? `translate(${t.toFixed(2)}px, ${n.toFixed(2)}px)`
                      : `translate(${t.toFixed(2)}px, ${n.toFixed(2)}px) translateX(-50%)`;
                    ((Number.isNaN(em) ||
                      Math.abs(t - em) > 0.05 ||
                      Math.abs(n - eh) > 0.05) &&
                      ((em = t), (eh = n), (a.caption.style.transform = s)),
                      Math.abs(o - ep) > 0.002 &&
                        ((ep = o), (a.caption.style.opacity = o.toFixed(3))));
                  })(c),
                  o.render(g, v),
                  f || eg || ("drift" === w && Z > 0.001)
                    ? eI()
                    : ("step" !== w && "spin" !== w) || k || A || !(p > 1) || en
                      ? "drift" !== w ||
                        k ||
                        A ||
                        !(u < G) ||
                        en ||
                        (en = d.setTimeout(
                          () => {
                            ((en = 0), (el = 0), eI());
                          },
                          (G - u) * 1e3 + 16,
                        ))
                      : (en = d.setTimeout(
                          () => {
                            ((en = 0), (el = 0), eI());
                          },
                          1e3 * Math.max(Math.max(Q, G) - u, 0.02) + 16,
                        )));
              }
              let eT = (a) => {
                  if ("touch" !== a.pointerType && ((ea = !0), !eg)) {
                    let t =
                      null !== eD(a.clientX, a.clientY)
                        ? "pointer"
                        : r.current.draggable
                          ? "grab"
                          : "";
                    e.style.cursor !== t && (e.style.cursor = t);
                  }
                  if (eg && eg.id === a.pointerId) {
                    let i = r.current,
                      n = a.clientX - eg.x,
                      l = a.clientY - eg.y;
                    if (!eg.moved && Math.hypot(n, l) > 6) {
                      ((eg.moved = !0),
                        (K = null),
                        (_ = null),
                        (U = 0),
                        (e.style.cursor = "grabbing"));
                      try {
                        t.setPointerCapture(a.pointerId);
                      } catch {}
                    }
                    if (eg.moved && i.draggable) {
                      let e = ev.vertical ? l : n;
                      H = eg.origin - e / Math.max(ev.pitch, 1);
                      let t = performance.now();
                      for (
                        eg.samples.push({ t, p: H });
                        eg.samples.length > 2 && t - eg.samples[0].t > 110;
                      )
                        eg.samples.shift();
                    }
                  }
                  eI();
                },
                eR = (e) => {
                  if (!e.isPrimary || e.button > 0) return;
                  er = !1;
                  let t = r.current;
                  if (Math.abs(U) > 2.5 && !t.reduced) {
                    (ez(
                      U > 0
                        ? Math.ceil(H + 0.06 * U)
                        : Math.floor(H + 0.06 * U),
                      0.34,
                      0.8,
                    ),
                      (er = !0),
                      eE());
                    return;
                  }
                  t.draggable &&
                    ((eg = {
                      id: e.pointerId,
                      x: e.clientX,
                      y: e.clientY,
                      origin: H,
                      moved: !1,
                      samples: [{ t: performance.now(), p: H }],
                    }),
                    eE(),
                    eI());
                },
                eN = (a) => {
                  if (!eg || eg.id !== a.pointerId) return;
                  let i = eg;
                  eg = null;
                  try {
                    t.hasPointerCapture(a.pointerId) &&
                      t.releasePointerCapture(a.pointerId);
                  } catch {}
                  if (i.moved) {
                    er = !0;
                    let t = performance.now(),
                      a = i.samples.filter((e) => t - e.t < 110),
                      n = 0;
                    if (a.length > 1 && t - a[a.length - 1].t < 60) {
                      let e = Math.max(
                        (a[a.length - 1].t - a[0].t) / 1e3,
                        1 / 120,
                      );
                      n = (a[a.length - 1].p - a[0].p) / e;
                    }
                    let l = r.current;
                    ((U = l.reduced ? 0 : m(n, -32, 32)),
                      (K = null),
                      (_ = null),
                      l.reduced && l.snap && ez(Math.round(H), 0.08, 1),
                      (e.style.cursor = l.draggable ? "grab" : ""),
                      eE());
                  }
                  eI();
                },
                eq = (e) => {
                  if (er) {
                    er = !1;
                    return;
                  }
                  let t = eD(e.clientX, e.clientY);
                  if (null === t) return;
                  let a = Math.round(K ?? H);
                  t === a && 0.2 > Math.abs(H - a)
                    ? l.onSelect(ex(t))
                    : (ez(t, 0.7 + 0.05 * Math.min(Math.abs(t - H), 5), 0.9),
                      eE());
                },
                eH = (t) => {
                  (eg && eg.id === t.pointerId) ||
                    ((ea = !1), (e.style.cursor = ""), eE(0.8), eI());
                },
                eU = (e) => {
                  if (!r.current.wheel) return;
                  e.preventDefault();
                  let t = 1 === e.deltaMode ? 16 : 2 === e.deltaMode ? R : 1,
                    a = m(
                      (Math.abs(e.deltaX) > Math.abs(e.deltaY)
                        ? e.deltaX
                        : e.deltaY) * t,
                      -240,
                      240,
                    );
                  (ez(
                    (X && null !== K ? K : Math.round(K ?? H)) + a / 100,
                    0.5,
                    0.9,
                  ),
                    (X = !0),
                    (Y = performance.now() / 1e3),
                    eE());
                },
                eV = (t) => {
                  if (t.target !== e) return;
                  let a = ev.vertical;
                  t.key === (a ? "ArrowDown" : "ArrowRight")
                    ? (t.preventDefault(), eP(1))
                    : t.key === (a ? "ArrowUp" : "ArrowLeft")
                      ? (t.preventDefault(), eP(-1))
                      : "PageDown" === t.key
                        ? (t.preventDefault(), eB(5))
                        : "PageUp" === t.key
                          ? (t.preventDefault(), eB(-5))
                          : "Home" === t.key
                            ? (t.preventDefault(), eF(0))
                            : "End" === t.key
                              ? (t.preventDefault(), eF(eb() - 1))
                              : "Enter" === t.key &&
                                (t.preventDefault(),
                                l.onSelect(ex(Math.round(K ?? H))));
                };
              (t.addEventListener("pointerdown", eR),
                t.addEventListener("pointermove", eT),
                t.addEventListener("pointerup", eN),
                t.addEventListener("pointercancel", eN),
                t.addEventListener("pointerleave", eH),
                t.addEventListener("click", eq),
                t.addEventListener("wheel", eU, { passive: !1 }),
                e.addEventListener("keydown", eV));
              let eW = new ResizeObserver(() => {
                ek() && eI();
              });
              eW.observe(e);
              let eK =
                "undefined" == typeof IntersectionObserver
                  ? null
                  : new IntersectionObserver(
                      ([e]) => {
                        (eo = e.isIntersecting)
                          ? ((el = 0), eI())
                          : (ei && cancelAnimationFrame(ei),
                            (ei = 0),
                            en && d.clearTimeout(en),
                            (en = 0));
                      },
                      { rootMargin: "80px" },
                    );
              eK ? eK.observe(e) : (eo = !0);
              let eO = (e) => {
                  (e.preventDefault(),
                    (eu = !0),
                    ei && cancelAnimationFrame(ei),
                    (ei = 0));
                },
                e$ = () => {
                  ((eu = !1), (L = ""), eC(), eI());
                };
              return (
                p.addEventListener("webglcontextlost", eO),
                p.addEventListener("webglcontextrestored", e$),
                ek(),
                q && eS(),
                eA(),
                eC(),
                o.compile(g, v),
                eI(),
                {
                  sync: () => {
                    (ek(), eA(), eC(), (ed = NaN), eI());
                  },
                  step: eP,
                  goTo: eF,
                  spin: eB,
                  destroy: () => {
                    ((es = !0),
                      ei && cancelAnimationFrame(ei),
                      en && d.clearTimeout(en),
                      eK?.disconnect(),
                      eW.disconnect(),
                      t.removeEventListener("pointerdown", eR),
                      t.removeEventListener("pointermove", eT),
                      t.removeEventListener("pointerup", eN),
                      t.removeEventListener("pointercancel", eN),
                      t.removeEventListener("pointerleave", eH),
                      t.removeEventListener("click", eq),
                      t.removeEventListener("wheel", eU),
                      e.removeEventListener("keydown", eV),
                      (e.style.cursor = ""),
                      p.removeEventListener("webglcontextlost", eO),
                      p.removeEventListener("webglcontextrestored", e$),
                      B.forEach((e) => {
                        e.image.onload = null;
                      }),
                      I.dispose(),
                      P.dispose(),
                      y.dispose(),
                      o.dispose(),
                      o.getContext().isContextLost() || o.forceContextLoss(),
                      p.remove());
                  },
                }
              );
            })(e, t, { caption: a, title: r, subtitle: i }, ef, el, eo, {
              onActive: (e) => {
                (eu(e), eg.current.onIndexChange?.(e));
              },
              onSelect: (e) => {
                let t = el.current[e];
                t &&
                  (eg.current.onSelect?.(t, e),
                  t.href && window.location.assign(t.href));
              },
            });
            if (!n) {
              let e = requestAnimationFrame(() => em(!0));
              return () => cancelAnimationFrame(e);
            }
            return (
              (er.current = n),
              () => {
                (n.destroy(), (er.current = null));
              }
            );
          }, [eo]),
          (0, i.useImperativeHandle)(
            G,
            () => ({
              next: () => er.current?.step(1),
              previous: () => er.current?.step(-1),
              goTo: (e) => er.current?.goTo(e),
              spin: (e) => er.current?.spin(e),
            }),
            [],
          ));
        let ev = V.trim().toLowerCase(),
          eb = "transparent" === ev || "" === ev,
          ex =
            !eb &&
            !!(Q = b(ev)) &&
            0.2126 * Q[0] + 0.7152 * Q[1] + 0.0722 * Q[2] > 0.6,
          ey = en[es] ?? en[0];
        return (0, r.jsxs)("div", {
          ref: Z,
          className: (0, c.cn)(
            "relative h-full min-h-[420px] w-full overflow-hidden outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color-mix(in_oklch,currentColor_35%,transparent)]",
            Y,
          ),
          style: {
            backgroundColor: eb ? void 0 : V,
            color: eb ? "currentColor" : ex ? "#0a0a0a" : "#fafafa",
            ...X,
          },
          role: "region",
          "aria-roledescription": "carousel",
          "aria-label": O,
          tabIndex: 0,
          onKeyDown: (e) => {
            " " === e.key &&
              e.target === e.currentTarget &&
              (e.preventDefault(), ed((e) => !e));
          },
          children: [
            (0, r.jsx)("div", {
              ref: J,
              style: {
                ...w,
                touchAction: "vertical" === a ? "pan-x" : "pan-y",
              },
            }),
            ep && ey
              ? (0, r.jsx)("div", {
                  style: {
                    position: "absolute",
                    inset: "18%",
                    display: "grid",
                    placeItems: "center",
                  },
                  children: (0, r.jsx)("img", {
                    src: ey.src,
                    alt: ey.alt,
                    style: {
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "cover",
                      borderRadius: I,
                    },
                  }),
                })
              : null,
            (0, r.jsx)("ul", {
              style: y,
              children: en.map((e, t) =>
                (0, r.jsx)(
                  "li",
                  {
                    "aria-current": t === es ? "true" : void 0,
                    children: e.title
                      ? `${e.title}${e.subtitle ? `, ${e.subtitle}` : ""}`
                      : e.alt,
                  },
                  `${e.src}-${t}`,
                ),
              ),
            }),
            (0, r.jsx)("div", {
              "aria-live": "polite",
              style: y,
              children: ey ? (ey.title ?? ey.alt) : "",
            }),
            (0, r.jsxs)("div", {
              ref: ee,
              "aria-hidden": "true",
              style: M,
              children: [
                (0, r.jsx)("span", { ref: et, style: C }),
                (0, r.jsx)("span", { ref: ea, style: k }),
              ],
            }),
          ],
        });
      });
    j.displayName = "VerticalReel";
    let D = {
        ring: {
          direction: "horizontal",
          aspect: 1.6,
          size: 0.42,
          curvature: 0.6,
          distance: 3,
          tilt: 6,
          gap: 22,
          radius: 14,
          dim: 0.45,
          motionBlur: 0.6,
          friction: 0.5,
          autoplay: "step",
          speed: 0.25,
        },
        drum: {
          direction: "horizontal",
          aspect: 1.45,
          size: 0.44,
          curvature: 0.8,
          distance: 2.8,
          tilt: 10,
          gap: 14,
          radius: 14,
          dim: 0.5,
          motionBlur: 0.6,
          friction: 0.5,
          autoplay: "step",
          speed: 0.25,
        },
        column: {
          direction: "vertical",
          aspect: 1.6,
          size: 0.34,
          curvature: 0.7,
          distance: 3,
          tilt: 6,
          gap: 18,
          radius: 14,
          dim: 0.45,
          motionBlur: 0.6,
          friction: 0.5,
          autoplay: "step",
          speed: 0.25,
        },
        portrait: {
          direction: "horizontal",
          aspect: 0.72,
          size: 0.6,
          curvature: 0.55,
          distance: 3.2,
          tilt: 4,
          gap: 20,
          radius: 16,
          dim: 0.45,
          motionBlur: 0.6,
          friction: 0.5,
          autoplay: "step",
          speed: 0.25,
        },
        cinema: {
          direction: "horizontal",
          aspect: 2.35,
          size: 0.32,
          curvature: 0.45,
          distance: 3.4,
          tilt: 4,
          gap: 16,
          radius: 6,
          dim: 0.55,
          motionBlur: 0.6,
          friction: 0.5,
          autoplay: "step",
          speed: 0.25,
        },
        showreel: {
          direction: "horizontal",
          aspect: 1.6,
          size: 0.42,
          curvature: 0.7,
          distance: 3,
          tilt: 8,
          gap: 18,
          radius: 14,
          dim: 0.45,
          motionBlur: 1.4,
          friction: 0.35,
          autoplay: "spin",
          speed: 0.25,
        },
        marquee: {
          direction: "horizontal",
          aspect: 1.4,
          size: 0.36,
          curvature: 0.25,
          distance: 3,
          tilt: 0,
          gap: 16,
          radius: 12,
          dim: 0.4,
          motionBlur: 0.6,
          friction: 0.5,
          autoplay: "drift",
          speed: 0.35,
        },
      },
      I = [
        { label: "Ring", value: "ring" },
        { label: "Drum", value: "drum" },
        { label: "Column", value: "column" },
        { label: "Portrait", value: "portrait" },
        { label: "Cinema", value: "cinema" },
        { label: "Showreel", value: "showreel" },
        { label: "Marquee", value: "marquee" },
      ],
      E = [
        { label: "Horizontal", value: "horizontal" },
        { label: "Vertical", value: "vertical" },
      ],
      z = [
        { label: "Step", value: "step" },
        { label: "Spin", value: "spin" },
        { label: "Drift", value: "drift" },
        { label: "Off", value: "off" },
      ],
      P = [
        {
          name: "items",
          type: "{ src: string; alt: string; title?: string; subtitle?: string; href?: string }[]",
          default: "built-in scene collection",
          description:
            "Images around the ring, in order (up to 32). Images must allow cross-origin loading. Title and subtitle caption the front image; href is followed when the front image is clicked or Enter is pressed.",
        },
        {
          name: "startIndex",
          type: "number",
          default: "0",
          description:
            "Index of the image that faces the viewer once the ring has loaded.",
        },
        {
          name: "direction",
          type: '"horizontal" | "vertical"',
          default: '"horizontal"',
          description:
            "Spin the ring sideways, or up and down like a slot reel with the caption beside it.",
        },
        {
          name: "aspect",
          type: "number",
          default: "1.6",
          description:
            "Width divided by height of every card. Images are cropped to fill it.",
        },
        {
          name: "size",
          type: "number",
          default: "0.42",
          description:
            "Card height as a fraction of the component height. Cards narrow automatically to fit the width.",
        },
        {
          name: "curvature",
          type: "number",
          default: "0.6",
          description:
            "How tightly the ring bends, from 0 (a flat strip) to 1 (a tight drum showing three cards).",
        },
        {
          name: "distance",
          type: "number",
          default: "3",
          description:
            "Camera distance in card widths. Closer exaggerates the perspective.",
        },
        {
          name: "tilt",
          type: "number",
          default: "6",
          description:
            "Camera tilt in degrees, so the ring is seen slightly from above. Negative values look from below.",
        },
        {
          name: "gap",
          type: "number",
          default: "22",
          description: "Space between cards in pixels.",
        },
        {
          name: "radius",
          type: "number",
          default: "14",
          description: "Card corner radius in pixels.",
        },
        {
          name: "dim",
          type: "number",
          default: "0.45",
          description:
            "How much cards fade into the background as they turn away from the viewer.",
        },
        {
          name: "edgeFade",
          type: "number",
          default: "0.5",
          description:
            "Width of the fade at the ends of the ring, where cards leave the component.",
        },
        {
          name: "motionBlur",
          type: "number",
          default: "0.6",
          description:
            "Shutter length for the motion blur. The ring blurs in proportion to its speed and is sharp at rest. 0 turns it off.",
        },
        {
          name: "friction",
          type: "number",
          default: "0.5",
          description:
            "How quickly a flicked ring slows down. Low values coast for several turns, high values stop within a few cards.",
        },
        {
          name: "snap",
          type: "boolean",
          default: "true",
          description:
            "Click into place on the nearest card when the ring slows down, like a detent.",
        },
        {
          name: "autoplay",
          type: '"step" | "spin" | "drift" | "off"',
          default: '"step"',
          description:
            "Step advances one card every interval; spin turns three to six cards at a time; drift rotates continuously at speed.",
        },
        {
          name: "speed",
          type: "number",
          default: "0.25",
          description:
            "Drift speed in cards per second. A negative value reverses the direction of every autoplay mode.",
        },
        {
          name: "interval",
          type: "number",
          default: "3.5",
          description: "Seconds between steps or spins.",
        },
        {
          name: "pauseOnHover",
          type: "boolean",
          default: "true",
          description: "Pause autoplay while the pointer is over the ring.",
        },
        {
          name: "draggable",
          type: "boolean",
          default: "true",
          description:
            "Drag or flick the ring to spin it. It coasts with momentum; pressing while it spins fast catches it on the next card.",
        },
        {
          name: "wheel",
          type: "boolean",
          default: "true",
          description:
            "Scroll to turn the ring, one card per notch. Set false to leave page scrolling untouched.",
        },
        {
          name: "captions",
          type: "boolean",
          default: "true",
          description:
            "Show the title and subtitle of the front image while the ring is at rest.",
        },
        {
          name: "backgroundColor",
          type: "string",
          default: '"transparent"',
          description:
            "Background of the component. Caption text and image placeholders adapt to it.",
        },
        {
          name: "paused",
          type: "boolean",
          default: "false",
          description:
            "Stops autoplay. Space toggles the same pause from the keyboard. Reduced-motion users get no autoplay and no blur.",
        },
        {
          name: "dpr",
          type: "number",
          default: "2",
          description: "Maximum device pixel ratio for the canvas.",
        },
        {
          name: "ariaLabel",
          type: "string",
          default: '"Image reel…"',
          description: "Accessible description of the ring and how to use it.",
        },
        {
          name: "onIndexChange",
          type: "(index: number) => void",
          default: "—",
          description: "Called whenever a different image comes to the front.",
        },
        {
          name: "onSelect",
          type: "(item, index) => void",
          default: "—",
          description:
            "Called when the front image is clicked or Enter is pressed.",
        },
        {
          name: "ref",
          type: "{ next, previous, goTo, spin }",
          default: "—",
          description:
            "next() and previous() step one card, goTo(index) takes the shortest way round, spin(cards) turns by a number of cards.",
        },
        {
          name: "className",
          type: "string",
          default: "—",
          description:
            "Classes for the root element. It fills its parent, with a 420px minimum height.",
        },
        {
          name: "style",
          type: "CSSProperties",
          default: "—",
          description: "Inline styles for the root element.",
        },
      ],
      F = () => {
        let [e, t] = (0, o.I)(),
          a = (0, l.Y)(),
          [s, u] = (0, i.useState)("ring"),
          [c, d] = (0, i.useState)(D.ring),
          p = (e) => (t) => d((a) => ({ ...a, [e]: t })),
          [m, h] = (0, i.useState)(null),
          f = m ?? ("dark" === a ? "#0A0A0A" : "#FFFFFF"),
          [g, v] = (0, i.useState)(0.5),
          [b, x] = (0, i.useState)(!0),
          [y, w] = (0, i.useState)(3.5),
          [M, C] = (0, i.useState)(!0),
          [k, A] = (0, i.useState)(!0),
          [S, F] = (0, i.useState)(!0),
          [B, L] = (0, i.useState)(!0),
          [T, R] = (0, i.useState)(!1);
        return (0, r.jsxs)("div", {
          children: [
            (0, r.jsx)(n.Bg, {}),
            (0, r.jsxs)(n.VX, {
              children: [
                (0, r.jsxs)(n.Ec, {
                  children: [
                    (0, r.jsx)(n.Ch, {
                      onRefresh: t,
                      minHeight: 560,
                      enableResponsive: !0,
                      children: (0, r.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, r.jsx)(
                          j,
                          {
                            direction: c.direction,
                            aspect: c.aspect,
                            size: c.size,
                            curvature: c.curvature,
                            distance: c.distance,
                            tilt: c.tilt,
                            gap: c.gap,
                            radius: c.radius,
                            dim: c.dim,
                            edgeFade: g,
                            motionBlur: c.motionBlur,
                            friction: c.friction,
                            snap: b,
                            autoplay: c.autoplay,
                            speed: c.speed,
                            interval: y,
                            pauseOnHover: M,
                            draggable: k,
                            wheel: S,
                            captions: B,
                            backgroundColor: f,
                            paused: T,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, r.jsxs)(n.IH, {
                      children: [
                        (0, r.jsx)(n.bg, {
                          title: "Preset",
                          value: s,
                          options: I,
                          onChange: (e) => {
                            (u(e), d(D[e] ?? D.ring));
                          },
                        }),
                        (0, r.jsx)(n.bg, {
                          title: "Direction",
                          value: c.direction,
                          options: E,
                          onChange: (e) => p("direction")(e),
                        }),
                        (0, r.jsx)(n.bg, {
                          title: "Autoplay",
                          value: c.autoplay,
                          options: z,
                          onChange: (e) => p("autoplay")(e),
                        }),
                        (0, r.jsx)(n.W7, {
                          title: "Background",
                          value: f,
                          onChange: h,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Aspect",
                          min: 0.5,
                          max: 2.5,
                          step: 0.05,
                          value: c.aspect,
                          onChange: p("aspect"),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Size",
                          min: 0.2,
                          max: 0.8,
                          step: 0.01,
                          value: c.size,
                          onChange: p("size"),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Curvature",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: c.curvature,
                          onChange: p("curvature"),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Distance",
                          min: 1.5,
                          max: 8,
                          step: 0.1,
                          value: c.distance,
                          onChange: p("distance"),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Tilt",
                          min: -20,
                          max: 20,
                          step: 1,
                          value: c.tilt,
                          valueUnit: "\xb0",
                          onChange: p("tilt"),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Gap",
                          min: 0,
                          max: 48,
                          step: 1,
                          value: c.gap,
                          valueUnit: "px",
                          onChange: p("gap"),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Radius",
                          min: 0,
                          max: 32,
                          step: 1,
                          value: c.radius,
                          valueUnit: "px",
                          onChange: p("radius"),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Dim",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: c.dim,
                          onChange: p("dim"),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Edge Fade",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: g,
                          onChange: v,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Motion Blur",
                          min: 0,
                          max: 2,
                          step: 0.05,
                          value: c.motionBlur,
                          onChange: p("motionBlur"),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Friction",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: c.friction,
                          onChange: p("friction"),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Speed",
                          min: -1,
                          max: 1,
                          step: 0.05,
                          value: c.speed,
                          onChange: p("speed"),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Interval",
                          min: 1.5,
                          max: 10,
                          step: 0.5,
                          value: y,
                          valueUnit: "s",
                          onChange: w,
                        }),
                        (0, r.jsx)(n.tl, {
                          title: "Snap",
                          checked: b,
                          onChange: x,
                        }),
                        (0, r.jsx)(n.tl, {
                          title: "Pause On Hover",
                          checked: M,
                          onChange: C,
                        }),
                        (0, r.jsx)(n.tl, {
                          title: "Draggable",
                          checked: k,
                          onChange: A,
                        }),
                        (0, r.jsx)(n.tl, {
                          title: "Wheel",
                          checked: S,
                          onChange: F,
                        }),
                        (0, r.jsx)(n.tl, {
                          title: "Captions",
                          checked: B,
                          onChange: L,
                        }),
                        (0, r.jsx)(n.tl, {
                          title: "Paused",
                          checked: T,
                          onChange: R,
                        }),
                      ],
                    }),
                    (0, r.jsx)(n.Ub, { data: P }),
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
