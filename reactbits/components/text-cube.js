/* ReactBits Pro public preview module 34832 for text-cube.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/34832.f3bc56fa41d1ad3c.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  34832: (e, t, n) => {
    (n.r(t), n.d(t, { default: () => U }));
    var r = n(95155),
      a = n(12115),
      l = n(56388),
      i = n(86049),
      o = n(90761),
      s = n(90650);
    let u = [
        [0, 0, -1],
        [0, 0, 1],
        [-1, 0, 0],
        [1, 0, 0],
        [0, -1, 0],
        [0, 1, 0],
      ],
      d = [
        [0, -1, 0],
        [0, -1, 0],
        [0, -1, 0],
        [0, -1, 0],
        [0, 0, 1],
        [0, 0, -1],
      ],
      h = [
        [1, 0, 0],
        [-1, 0, 0],
        [0, 0, 1],
        [0, 0, -1],
        [1, 0, 0],
        [1, 0, 0],
      ],
      c = ["word", "letters", "random"],
      f = "abcdefghijklmnopqrstuvwxyz0123456789",
      m = Math.sqrt(3),
      p = 1e3 / 30 - 4,
      g = (e, t, n) => Math.min(n, Math.max(t, e)),
      y = (e, t) => (Number.isFinite(e) ? e : t),
      b = (e, t, n) => {
        let r = g((n - e) / (t - e), 0, 1);
        return r * r * (3 - 2 * r);
      },
      x = (e, t) => {
        let n =
          Math.imul(0x9e3779b9 ^ e, 0x85ebca6b) ^
          Math.imul(0x27d4eb2f ^ t, 0xc2b2ae35);
        return (
          (n ^= n >>> 15),
          (n = Math.imul(n, 0x2c1b3c6d)),
          (n ^= n >>> 12),
          (n = Math.imul(n, 0x297a2d39)),
          ((n ^= n >>> 15) >>> 0) / 0x100000000
        );
      },
      v = (e) =>
        e
          ? "undefined" != typeof Intl && void 0 !== Intl.Segmenter
            ? Array.from(
                new Intl.Segmenter(void 0, { granularity: "grapheme" }).segment(
                  e,
                ),
                (e) => e.segment,
              )
            : Array.from(e)
          : [],
      w = (e) => (e <= 0.04045 ? e / 12.92 : ((e + 0.055) / 1.055) ** 2.4),
      M = (e) => (e <= 0.0031308 ? 12.92 * e : 1.055 * e ** (1 / 2.4) - 0.055),
      F = (e) => {
        let t = w(e[0]),
          n = w(e[1]),
          r = w(e[2]),
          a = Math.cbrt(0.4122214708 * t + 0.5363325363 * n + 0.0514459929 * r),
          l = Math.cbrt(0.2119034982 * t + 0.6806995451 * n + 0.1073969566 * r),
          i = Math.cbrt(0.0883024619 * t + 0.2817188376 * n + 0.6299787005 * r),
          o = 1.9779984951 * a - 2.428592205 * l + 0.4505937099 * i,
          s = 0.0259040371 * a + 0.7827717662 * l - 0.808675766 * i;
        return [
          0.2104542553 * a + 0.793617785 * l - 0.0040720468 * i,
          Math.hypot(o, s),
          Math.atan2(s, o),
        ];
      },
      C = (e, t, n) => {
        let r = Math.cos(n) * t,
          a = Math.sin(n) * t,
          l = (e + 0.3963377774 * r + 0.2158037573 * a) ** 3,
          i = (e - 0.1055613458 * r - 0.0638541728 * a) ** 3,
          o = (e - 0.0894841775 * r - 1.291485548 * a) ** 3;
        return [
          4.0767416621 * l - 3.3077115913 * i + 0.2309699292 * o,
          -1.2684380046 * l + 2.6097574011 * i - 0.3413193965 * o,
          -0.0041960863 * l - 0.7034186147 * i + 1.707614701 * o,
        ];
      },
      S = (e, t, n) => {
        let r = t,
          a = C(e, r, n);
        for (let t = 0; t < 28 && a.some((e) => e < -5e-4 || e > 1.0005); t++)
          ((r *= 0.92), (a = C(e, r, n)));
        return [M(g(a[0], 0, 1)), M(g(a[1], 0, 1)), M(g(a[2], 0, 1))];
      },
      A = (e) => {
        let [t, n, r] = F(e),
          a = 0.22 + 0.28 * b(0.03, 0.12, n);
        return t <= a ? e : S(a, Math.max(1.15 * n, Math.min(2.2 * n, 0.2)), r);
      },
      j = (e) => 0.2126 * e[0] + 0.7152 * e[1] + 0.0722 * e[2],
      E = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      k = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      T = (0, a.forwardRef)(function (
        {
          width: e = "100%",
          height: t = "100%",
          className: n,
          style: l,
          children: i,
          word: o = "x",
          fill: w = "word",
          charset: M = f,
          upright: C = !1,
          cubeSize: T = 280,
          density: R = 49,
          fontSize: z = 18,
          fontWeight: I = 300,
          fontFamily: B = "inherit",
          color: L = "currentColor",
          accentColor: N = "#B19EEF",
          backgroundColor: D = "transparent",
          shading: U = 0.6,
          depthFade: W = 0.3,
          depthTint: P = 0.5,
          glow: q = 0.35,
          perspective: $ = 700,
          rotationSpeed: H = 1,
          autoRotateX: X = 0.3,
          autoRotateY: O = 0.3,
          breathe: Y = 0.1,
          breatheSpeed: G = 2,
          followSpeed: V = 0.08,
          roll: Q = 0.35,
          offsetX: _ = 0,
          offsetY: K = 0,
          draggable: J = !0,
          inertia: Z = 1,
          scrambleDuration: ee = 1.1,
          shuffle: et = 0,
          opacity: en = 1,
          interactive: er = !0,
          intro: ea = !0,
          paused: el = !1,
          dpr: ei = 2,
        },
        eo,
      ) {
        let es = (0, a.useRef)(null),
          eu = (0, a.useRef)(null),
          ed = (0, a.useRef)(null),
          eh = (0, a.useSyncExternalStore)(E, k, () => !1),
          ec = {
            word: o,
            fill: w,
            charset: M,
            upright: C,
            cubeSize: T,
            density: R,
            fontSize: z,
            fontWeight: I,
            fontFamily: B,
            color: L,
            accentColor: N,
            backgroundColor: D,
            shading: U,
            depthFade: W,
            depthTint: P,
            glow: q,
            perspective: $,
            rotationSpeed: H,
            autoRotateX: X,
            autoRotateY: O,
            breathe: Y,
            breatheSpeed: G,
            followSpeed: V,
            roll: Q,
            offsetX: _,
            offsetY: K,
            draggable: J,
            inertia: Z,
            scrambleDuration: ee,
            shuffle: et,
            opacity: en,
            interactive: er,
            intro: ea,
            paused: el,
            dpr: ei,
            reduced: eh,
          },
          ef = (0, a.useRef)(ec);
        return (
          (0, a.useEffect)(() => {
            ((ef.current = ec), ed.current?.sync());
          }),
          (0, a.useEffect)(() => {
            let e = es.current,
              t = eu.current;
            if (!e || !t) return;
            let n = (function (e, t, n) {
              let r = e.ownerDocument,
                a = r.defaultView ?? window,
                l = r.createElement("canvas"),
                i = t.getContext("2d"),
                o = l.getContext("2d");
              if (!i || !o) return null;
              let s = r.createElement("canvas");
              ((s.width = 1), (s.height = 1));
              let w = s.getContext("2d", { willReadFrequently: !0 }),
                M = new Map(),
                C = (e) => {
                  let t = e.trim().toLowerCase();
                  if (!t || "transparent" === t || "none" === t) return null;
                  let n = M.get(t);
                  if (void 0 !== n) return n;
                  if (!w) return null;
                  (M.size > 64 && M.clear(), (w.fillStyle = "#010203"));
                  let r = w.fillStyle;
                  w.fillStyle = t;
                  let a = null;
                  if (w.fillStyle !== r || "#010203" === t) {
                    (w.clearRect(0, 0, 1, 1), w.fillRect(0, 0, 1, 1));
                    let e = w.getImageData(0, 0, 1, 1).data;
                    a =
                      e[3] < 13
                        ? null
                        : [e[0] / 255, e[1] / 255, e[2] / 255, e[3] / 255];
                  }
                  return (M.set(t, a), a);
                },
                E = (t, n) => {
                  let r = t.trim().toLowerCase(),
                    l =
                      C(
                        "currentcolor" !== r &&
                          "auto" !== r &&
                          "inherit" !== r &&
                          r
                          ? t
                          : a.getComputedStyle(e).color,
                      ) ?? C(n);
                  return l ? [l[0], l[1], l[2]] : [1, 1, 1];
                },
                k = 0,
                T = 0,
                R = 1,
                z = !1,
                I = 0,
                B = 0,
                L = 0,
                N = !1,
                D = !1,
                U = !1,
                W = 0,
                P = 0,
                q = new Float32Array(0),
                $ = new Float32Array(0),
                H = new Float32Array(0),
                X = new Uint8Array(0),
                O = new Float32Array(0),
                Y = new Uint32Array(0),
                G = new Int32Array(0),
                V = new Float32Array(0),
                Q = new Float32Array(0),
                _ = new Float32Array(0),
                K = new Float32Array(0),
                J = new Float32Array(0),
                Z = new Float32Array(0),
                ee = new Float32Array(0),
                et = new Float32Array(0),
                en = new Uint8Array(0),
                er = new Uint8Array(0),
                ea = new Float32Array(0),
                el = new Uint16Array(0),
                ei = "",
                eo = "word",
                es = new Map(),
                eu = [],
                ed = [],
                eh = [],
                ec = [],
                ef = [],
                em = [],
                ep = "",
                eg = 0,
                ey = !1,
                eb = [],
                ex = new Map(),
                ev = new Float32Array(2048),
                ew = 0,
                eM = 0,
                eF = 0,
                eC = 0,
                eS = 0,
                eA = -1,
                ej = -1,
                eE = "",
                ek = -1,
                eT = 1,
                eR = 1,
                ez = 0,
                eI = "16px sans-serif",
                eB = "4px sans-serif",
                eL = "",
                eN = !1,
                eD = new Set(),
                eU = new Float64Array(9),
                eW = [1, 0, 0, 0],
                eP = new Float64Array(18),
                eq = new Float64Array(18),
                e$ = new Float64Array(18),
                eH = 0.78,
                eX = 0.78,
                eO = 0.39,
                eY = 0,
                eG = 1,
                eV = 0,
                eQ = 0,
                e_ = 0,
                eK = 0,
                eJ = 0,
                eZ = 0,
                e0 = 0,
                e1 = 0,
                e2 = 0,
                e5 = !0,
                e3 = 120,
                e4 = 0,
                e8 = 1,
                e6 = 0,
                e9 = null,
                e7 = [],
                te = 0,
                tt = 0,
                tn = -1 / 0,
                tr = !1,
                ta = 0,
                tl = 0,
                ti = null,
                to = !1,
                ts = 0,
                tu = 0,
                td = 0,
                th = 0,
                tc = 0,
                tf = 0,
                tm = 0,
                tp = "",
                tg = () => {
                  let e = g(
                    Math.ceil(
                      Math.sqrt(
                        Math.max(1, Math.round(y(n.current.density, 49))),
                      ),
                    ),
                    1,
                    14,
                  );
                  if (e === W) return;
                  ((q = new Float32Array((P = 6 * (W = e) * W))),
                    ($ = new Float32Array(P)),
                    (H = new Float32Array(P)),
                    (X = new Uint8Array(P)),
                    (O = new Float32Array(P)),
                    (Y = new Uint32Array(P)),
                    (G = new Int32Array(P)),
                    (V = new Float32Array(P).fill(-1e6)),
                    (Q = new Float32Array(P)),
                    (_ = new Float32Array(P)),
                    (K = new Float32Array(P)),
                    (J = new Float32Array(P)),
                    (Z = new Float32Array(4 * P)),
                    (ee = new Float32Array(P)),
                    (et = new Float32Array(P)),
                    (en = new Uint8Array(P)),
                    (er = new Uint8Array(P)),
                    (ea = new Float32Array(P)),
                    (el = new Uint16Array(P)));
                  let t = 2 / (W - 1 + Math.SQRT2),
                    r = t / Math.SQRT2,
                    a = 0;
                  for (let e = 0; e < 6; e++) {
                    let n = u[e],
                      l = d[e],
                      i = h[e];
                    for (let o = 0; o < W; o++) {
                      let s = 1 - r - o * t;
                      for (let o = 0; o < W; o++) {
                        let u = -1 + r + o * t;
                        ((q[a] = n[0] + i[0] * u + l[0] * s),
                          ($[a] = n[1] + i[1] * u + l[1] * s),
                          (H[a] = n[2] + i[2] * u + l[2] * s),
                          (X[a] = e),
                          (O[a] = x(a, 7)),
                          (el[a] = a),
                          a++);
                      }
                    }
                  }
                },
                ty = (e) => {
                  let t = es.get(e);
                  if (void 0 !== t) return t;
                  let n = eu.length;
                  return (
                    es.set(e, n),
                    eu.push(e),
                    ed.push("" === e.trim()),
                    eh.push(NaN),
                    n
                  );
                },
                tb = () => {
                  let e = n.current,
                    t = `${e.word}\u0000${e.charset}`;
                  if (t === ei) return;
                  ((ei = t), (ec = v(e.word).map(ty)));
                  let r = v(e.charset).filter((e) => "" !== e.trim());
                  ef = (r.length ? r : v(f)).map(ty);
                },
                tx = () => {
                  let t = n.current,
                    r = (() => {
                      let t = C(n.current.backgroundColor);
                      if (t && t[3] > 0.5) return j(t) > 0.55;
                      let r = e.parentElement;
                      for (; r;) {
                        let e = C(a.getComputedStyle(r).backgroundColor);
                        if (e && e[3] > 0.05) return j(e) > 0.55;
                        r = r.parentElement;
                      }
                      let l = C(a.getComputedStyle(e).color);
                      return l
                        ? 0.45 > j(l)
                        : !a.matchMedia("(prefers-color-scheme: dark)").matches;
                    })(),
                    l = E(t.color, "#ffffff"),
                    i = E(t.accentColor, "#B19EEF"),
                    o = `${r}|${l.join(",")}|${i.join(",")}`;
                  if (o === ep) return !1;
                  ((ep = o), (ey = r));
                  let s = r ? A(l) : l,
                    u = r ? A(i) : i;
                  return (
                    (eb = Array.from({ length: 12 }, (e, t) => {
                      var n;
                      let r, a, l, i, o, d;
                      return (
                        (n = t / 11),
                        (r = F(s)),
                        (a = F(u)),
                        (l = r[1] < 0.02 ? a[2] : r[2]),
                        (o = Math.atan2(
                          Math.sin((i = a[1] < 0.02 ? l : a[2]) - l),
                          Math.cos(i - l),
                        )),
                        (d =
                          n <= 0
                            ? s
                            : n >= 1
                              ? u
                              : S(
                                  r[0] + (a[0] - r[0]) * n,
                                  r[1] + (a[1] - r[1]) * n,
                                  l + o * n,
                                )),
                        `rgb(${Math.round(255 * d[0])}, ${Math.round(255 * d[1])}, ${Math.round(255 * d[2])})`
                      );
                    })),
                    (eg += 1),
                    !0
                  );
                },
                tv = () => {
                  (ex.clear(),
                    (ew = 0),
                    (eM = 0),
                    (eF = 0),
                    (eC = 0),
                    o.setTransform(1, 0, 0, 1, 0, 0),
                    o.clearRect(0, 0, l.width, l.height),
                    (o.textAlign = "left"),
                    (o.textBaseline = "middle"),
                    (eL = ""));
                },
                tw = (e) => {
                  let t = eh[e];
                  return (
                    Number.isNaN(t) &&
                      (eL !== eI && ((o.font = eI), (eL = eI)),
                      (t = o.measureText(eu[e]).width / eT),
                      (eh[e] = t)),
                    t
                  );
                },
                tM = (e, t, n, r) => {
                  if (ed[e]) return;
                  let a = (12 * e + t) * 2 + +!!n,
                    s = ex.get(a);
                  if (
                    (void 0 === s &&
                      (s = ((e, t, n, r) => {
                        if (eS > 1) return -1;
                        let a = eu[t],
                          i = r ? eR : eT,
                          s = r ? eB : eI;
                        eL !== s && ((o.font = s), (eL = s));
                        let u = o.measureText(a),
                          d = r ? ej * eR : ej * eT,
                          h = r ? Math.ceil(1.5 * ez) + 2 : 2,
                          c = Number.isFinite(u.actualBoundingBoxLeft)
                            ? u.actualBoundingBoxLeft
                            : 0,
                          f = Number.isFinite(u.actualBoundingBoxRight)
                            ? u.actualBoundingBoxRight
                            : u.width,
                          m = Number.isFinite(u.actualBoundingBoxAscent)
                            ? u.actualBoundingBoxAscent
                            : 0.6 * d,
                          p = Number.isFinite(u.actualBoundingBoxDescent)
                            ? u.actualBoundingBoxDescent
                            : 0.6 * d,
                          g = Math.floor(-c) - h,
                          y = Math.floor(-m) - h,
                          b = Math.ceil(f) + h - g,
                          x = Math.ceil(p) + h - y;
                        if (!(b > 0 && x > 0) || b > l.width || x > l.height)
                          return -1;
                        if (
                          (eM + b > l.width &&
                            ((eF += eC + 1), (eM = 0), (eC = 0)),
                          eF + x > l.height)
                        ) {
                          if (((eS += 1), tv(), eS > 1)) return -1;
                          ((o.font = s), (eL = s));
                        }
                        let v = eM,
                          w = eF;
                        ((eM += b + 1), (eC = Math.max(eC, x)));
                        let M = eb[n] ?? "#ffffff";
                        if (
                          ((o.fillStyle = M),
                          r
                            ? (o.save(),
                              o.beginPath(),
                              o.rect(v, w, b, x),
                              o.clip(),
                              (o.shadowColor = M),
                              (o.shadowBlur = ez),
                              (o.shadowOffsetX = 8192),
                              o.fillText(a, v - g - 8192, w - y),
                              o.restore())
                            : o.fillText(a, v - g, w - y),
                          (ew + 1) * 8 > ev.length)
                        ) {
                          let e = new Float32Array(2 * ev.length);
                          (e.set(ev), (ev = e));
                        }
                        let F = ew;
                        ew += 1;
                        let C = 8 * F;
                        return (
                          (ev[C] = v),
                          (ev[C + 1] = w),
                          (ev[C + 2] = b),
                          (ev[C + 3] = x),
                          (ev[C + 4] = g / i),
                          (ev[C + 5] = y / i),
                          (ev[C + 6] = b / i),
                          (ev[C + 7] = x / i),
                          ex.set(e, F),
                          F
                        );
                      })(a, e, t, n)),
                    s < 0)
                  )
                    return;
                  let u = 8 * s;
                  i.drawImage(
                    l,
                    ev[u],
                    ev[u + 1],
                    ev[u + 2],
                    ev[u + 3],
                    r + ev[u + 4],
                    ev[u + 5],
                    ev[u + 6],
                    ev[u + 7],
                  );
                },
                tF = (e, t) => {
                  let n = Math.floor((L + 0.7 * O[e]) / 0.065);
                  return ef[Math.floor(x(17 * e + t, n) * ef.length)];
                },
                tC = (e, t, n) => {
                  if ("word" === eo && ec.length > 1) {
                    let r = ec.length,
                      a = er[e] ? Math.floor(ea[e] * r) : r,
                      l = 0;
                    for (let t = 0; t < r; t++) {
                      let n = ec[t],
                        r = t < a || ed[n] ? n : tF(e, t);
                      ((em[t] = r), (l += tw(r)));
                    }
                    let i = -l / 2;
                    for (let e = 0; e < r; e++) {
                      let r = em[e];
                      (tM(r, t, n, i), (i += tw(r)));
                    }
                    return;
                  }
                  let r = er[e]
                    ? tF(e, 0)
                    : "random" === eo
                      ? ef[Math.floor(x(e, 31 * Y[e] + 5) * ef.length)]
                      : "letters" === eo
                        ? ec.length
                          ? ec[e % ec.length]
                          : -1
                        : ec.length
                          ? ec[0]
                          : -1;
                  void 0 === r || r < 0 || tM(r, t, n, -tw(r) / 2);
                },
                tS = () => {
                  let r = n.current,
                    l = e.clientWidth,
                    i = e.clientHeight;
                  if (l < 2 || i < 2) return ((z = !1), !1);
                  let o = Math.min(
                    a.devicePixelRatio || 1,
                    g(y(r.dpr, 2), 0.5, 3),
                  );
                  return (
                    (!z || l !== k || i !== T || o !== R) &&
                    (z
                      ? ((eK += (l - k) / 2), (eJ += (i - T) / 2))
                      : ((eK = l / 2 + y(r.offsetX, 0)),
                        (eJ = i / 2 + y(r.offsetY, 0))),
                    (z = !0),
                    (k = l),
                    (T = i),
                    (t.width = Math.max(1, Math.round(k * (R = o)))),
                    (t.height = Math.max(1, Math.round(T * R))),
                    !0)
                  );
                },
                tA = (e, t, n, r) => {
                  let a = Math.sqrt(e * e + t * t + n * n);
                  if (a < 1e-9 || 1e-9 > Math.abs(r)) return;
                  let l = Math.sin(r / 2) / a,
                    i = Math.cos(r / 2),
                    o = e * l,
                    s = t * l,
                    u = n * l,
                    d = eW[0],
                    h = eW[1],
                    c = eW[2],
                    f = eW[3],
                    m = i * d - o * h - s * c - u * f,
                    p = i * h + o * d + s * f - u * c,
                    g = i * c - o * f + s * d + u * h,
                    y = i * f + o * c - s * h + u * d,
                    b = Math.sqrt(m * m + p * p + g * g + y * y) || 1;
                  ((eW[0] = m / b),
                    (eW[1] = p / b),
                    (eW[2] = g / b),
                    (eW[3] = y / b));
                },
                tj = () => {
                  let [e, t, n, r] = eW,
                    a = 1 - 2 * (n * n + r * r),
                    l = 2 * (t * n - e * r),
                    i = 2 * (t * r + e * n),
                    o = 2 * (t * n + e * r),
                    s = 1 - 2 * (t * t + r * r),
                    c = 2 * (n * r - e * t),
                    f = 2 * (t * r - e * n),
                    m = 2 * (n * r + e * t),
                    p = 1 - 2 * (t * t + n * n),
                    g = Math.cos(eH),
                    y = Math.sin(eH),
                    b = Math.cos(eX),
                    x = Math.sin(eX),
                    v = Math.cos(eO),
                    w = Math.sin(eO),
                    M = v * b,
                    F = v * x * y - w * g,
                    C = v * x * g + w * y,
                    S = w * b,
                    A = w * x * y + v * g,
                    j = w * x * g - v * y,
                    E = -x,
                    k = b * y,
                    T = b * g;
                  ((eU[0] = a * M + l * S + i * E),
                    (eU[1] = a * F + l * A + i * k),
                    (eU[2] = a * C + l * j + i * T),
                    (eU[3] = o * M + s * S + c * E),
                    (eU[4] = o * F + s * A + c * k),
                    (eU[5] = o * C + s * j + c * T),
                    (eU[6] = f * M + m * S + p * E),
                    (eU[7] = f * F + m * A + p * k),
                    (eU[8] = f * C + m * j + p * T));
                  let R = (e, t, n) => {
                    ((t[n] = eU[0] * e[0] + eU[1] * e[1] + eU[2] * e[2]),
                      (t[n + 1] = eU[3] * e[0] + eU[4] * e[1] + eU[5] * e[2]),
                      (t[n + 2] = eU[6] * e[0] + eU[7] * e[1] + eU[8] * e[2]));
                  };
                  for (let e = 0; e < 6; e++)
                    (R(u[e], eP, 3 * e),
                      R(h[e], eq, 3 * e),
                      R(d[e], e$, 3 * e));
                },
                tE = () => {
                  tj();
                  let e = -eU[6],
                    t = -eU[7],
                    n = -eU[8],
                    r = Math.max(Math.abs(e), Math.abs(t), Math.abs(n)) || 1;
                  return { x: e / r, y: t / r, z: n / r };
                },
                tk = (e, t) => {
                  let n = q[e] - t.x,
                    r = $[e] - t.y,
                    a = H[e] - t.z;
                  return Math.sqrt(n * n + r * r + a * a);
                },
                tT = () => {
                  let e = n.current.fill;
                  return c.includes(e) ? e : "word";
                },
                tR = (e, t) => {
                  if (t) {
                    let t = J[e] * R;
                    i.setTransform(t, 0, 0, t, Q[e] * R, _[e] * R);
                    return;
                  }
                  let n = 4 * e;
                  i.setTransform(
                    Z[n] * R,
                    Z[n + 1] * R,
                    Z[n + 2] * R,
                    Z[n + 3] * R,
                    Q[e] * R,
                    _[e] * R,
                  );
                },
                tz = () => {
                  if (!z) return;
                  let e = n.current;
                  (tb(), tg(), (eo = tT()));
                  let s = Math.max(y(e.cubeSize, 280), 4),
                    u = Math.min(1, (0.48 * Math.min(k, T)) / s),
                    d =
                      0.5 *
                      s *
                      u *
                      (e.reduced
                        ? 1
                        : 1 + Math.sin(eY) * g(y(e.breathe, 0.1), 0, 1)) *
                      e8,
                    h = Math.max(y(e.perspective, 700), 40) * u,
                    c = Math.max(y(e.fontSize, 18), 1) * u,
                    f = g(y(e.shading, 0.6), 0, 1),
                    p = g(y(e.depthFade, 0.3), 0, 1),
                    x = g(y(e.depthTint, 0.5), 0, 1),
                    v = g(y(e.opacity, 1), 0, 1),
                    w = Math.max(y(e.scrambleDuration, 1.1), 0.05),
                    M = e.upright;
                  ((e3 = d), tj());
                  let F = 0;
                  for (let e = 0; e < P; e++) {
                    let t = q[e],
                      n = $[e],
                      r = H[e],
                      a = (eU[0] * t + eU[1] * n + eU[2] * r) * d,
                      l = (eU[3] * t + eU[4] * n + eU[5] * r) * d,
                      i = (eU[6] * t + eU[7] * n + eU[8] * r) * d,
                      o = h + i;
                    if (((K[e] = i), o < 0.08 * h)) {
                      ee[e] = 0;
                      continue;
                    }
                    let s = h / o,
                      u = a * s,
                      y = l * s;
                    ((Q[e] = eK + u), (_[e] = eJ + y), (J[e] = s));
                    let C = 3 * X[e],
                      S = eq[C + 2] / o,
                      A = e$[C + 2] / o;
                    ((Z[4 * e] = s * (eq[C] - a * S)),
                      (Z[4 * e + 1] = s * (eq[C + 1] - l * S)),
                      (Z[4 * e + 2] = -s * (e$[C] - a * A)),
                      (Z[4 * e + 3] = -s * (e$[C + 1] - l * A)),
                      (F = Math.max(
                        F,
                        Math.sqrt(u * u + y * y) + c * s * 0.6,
                      )));
                    let j = -a,
                      E = -l,
                      k = -h - i,
                      T =
                        (eP[C] * j + eP[C + 1] * E + eP[C + 2] * k) /
                        (Math.sqrt(j * j + E * E + k * k) || 1);
                    et[e] = T;
                    let R = 0.5 + 0.5 * T,
                      z = R * R * (3 - 2 * R),
                      I = 1 - f * (1 - z),
                      B =
                        1 - g((i / Math.max(d, 0.001) + m) / (2 * m), 0, 1) * p,
                      N = 1,
                      D = 0,
                      U = 1,
                      W = !1;
                    if (e9) {
                      let t = L - e9.start - 0.2 * tk(e, e9);
                      if (t < 0) N = 0;
                      else {
                        N = b(0, 0.2, t);
                        let n = 0.8 * (0.5 + 0.5 * O[e]);
                        t < n &&
                          ((W = !0),
                          (U = Math.min(U, t / n)),
                          (D = Math.max(D, 0.8 * (1 - b(0.45 * n, n, t)))));
                      }
                    }
                    for (let t = 0; t < e7.length; t++) {
                      let n = e7[t],
                        r = L - n.start - 0.2 * tk(e, n);
                      if (r < 0) continue;
                      G[e] < n.id &&
                        ((G[e] = n.id), "random" === eo && (Y[e] += 1));
                      let a = w * (0.55 + 0.45 * O[e]);
                      r < a &&
                        ((W = !0),
                        (U = Math.min(U, r / a)),
                        (D = Math.max(
                          D,
                          b(0, 0.12, r) * (1 - b(0.55 * a, a, r)),
                        )));
                    }
                    let P = L - V[e];
                    (P >= 0 &&
                      P < 0.36 &&
                      ((W = !0),
                      (U = Math.min(U, P / 0.36)),
                      (D = Math.max(D, 0.55 * Math.sin((Math.PI * P) / 0.36)))),
                      (er[e] = +!!W),
                      (ea[e] = U));
                    let el =
                      g(
                        B *
                          I *
                          (M ? 0.3 + 0.7 * b(0.02, 0.42, Math.abs(T)) : 1),
                        0,
                        1,
                      ) * N;
                    (ey && (el = el ** 1.35), (ee[e] = el * v));
                    let ei = g(x * (1 - z) + 0.85 * D, 0, 1);
                    en[e] = Math.round(11 * ei);
                  }
                  e4 = F;
                  for (let e = 1; e < P; e++) {
                    let t = el[e],
                      n = K[t],
                      r = e - 1;
                    for (; r >= 0 && K[el[r]] < n;)
                      ((el[r + 1] = el[r]), (r -= 1));
                    el[r + 1] = t;
                  }
                  (((e) => {
                    let i = n.current,
                      s = g(Math.round(y(i.fontWeight, 300)), 1, 1e3),
                      u = (i.fontFamily || "inherit").trim() || "inherit",
                      d = Math.min(1.5 * R, 110 / e),
                      h = eN || s !== eA || e !== ej || u !== eE || d !== eT;
                    if (h || ek !== eg) {
                      if (((ek = eg), h)) {
                        ((eN = !1),
                          (eA = s),
                          (ej = e),
                          (eE = u),
                          (eT = d),
                          (ez = e * (eR = 0.25 * d) * 0.8),
                          (t.style.fontFamily = u));
                        let n =
                            a.getComputedStyle(t).fontFamily || "sans-serif",
                          i = e * d;
                        ((o.font = "10px sans-serif"),
                          (o.font = `${s} ${i.toFixed(2)}px ${n}`));
                        let h = "10px sans-serif" !== o.font ? n : "sans-serif";
                        ((eI = `${s} ${i.toFixed(2)}px ${h}`),
                          (eB = `${s} ${(e * eR).toFixed(2)}px ${h}`),
                          (eh = eh.map(() => NaN)));
                        let c = i > 40 ? 1024 : 512;
                        (2048 !== l.width || l.height !== c) &&
                          ((l.width = 2048), (l.height = c));
                        let f = r.fonts,
                          m = eI;
                        f &&
                          "function" == typeof f.load &&
                          !eD.has(m) &&
                          (eD.add(m),
                          f
                            .load(m)
                            .then(() => {
                              D || m !== eI || ((eN = !0), tN());
                            })
                            .catch(() => void 0));
                      }
                      tv();
                    }
                  })(c),
                    (eS = 0),
                    i.setTransform(1, 0, 0, 1, 0, 0),
                    (i.globalAlpha = 1),
                    (i.globalCompositeOperation = "source-over"),
                    i.clearRect(0, 0, t.width, t.height),
                    (i.imageSmoothingEnabled = !0),
                    (i.imageSmoothingQuality = "high"));
                  for (let e = 0; e < P; e++) {
                    let t = el[e],
                      n = ee[t];
                    n <= 0.004 ||
                      (tR(t, M),
                      (i.globalAlpha = Math.min(n, 1)),
                      tC(t, en[t], !1));
                  }
                  let C = ey ? 0 : g(y(e.glow, 0.35), 0, 2);
                  if (C > 0.001) {
                    i.globalCompositeOperation = "lighter";
                    for (let e = 0; e < P; e++) {
                      let t = el[e],
                        n = ee[t];
                      if (n < 0.3) continue;
                      (tR(t, M), (i.globalAlpha = Math.min(C * n * 1.15, 1)));
                      let r = Math.round((3 * en[t]) / 11);
                      tC(t, Math.round((11 * r) / 3), !0);
                    }
                    i.globalCompositeOperation = "source-over";
                  }
                  (i.setTransform(1, 0, 0, 1, 0, 0), (i.globalAlpha = 1));
                },
                tI = () =>
                  U ||
                  to ||
                  null !== ti ||
                  e7.length > 0 ||
                  null !== e9 ||
                  1 !== e8 ||
                  0 !== eV ||
                  0 !== eQ ||
                  0 !== e_ ||
                  (0 !== eG && 1 !== eG) ||
                  (e5 && Math.abs(eK - e1) + Math.abs(eJ - e2) > 0.05) ||
                  Math.abs(eZ) + Math.abs(e0) > 0.5,
                tB = (e) => {
                  if (((I = 0), D)) return;
                  let t = n.current,
                    a = N && !r.hidden;
                  if (B && e - B < p && !tI()) {
                    a && (I = requestAnimationFrame(tB));
                    return;
                  }
                  U = !1;
                  let l = B && e - B < 100 ? g((e - B) / 1e3, 0, 0.05) : 1 / 60;
                  ((B = e),
                    (L += l),
                    ((e) => {
                      var t;
                      let r = n.current,
                        a = k / 2 + y(r.offsetX, 0),
                        l = T / 2 + y(r.offsetY, 0);
                      if (r.reduced) {
                        ((eK = a),
                          (eJ = l),
                          (e1 = a),
                          (e2 = l),
                          (eZ = 0),
                          (e0 = 0),
                          (eV = 0),
                          (eQ = 0),
                          (e_ = 0),
                          (e8 = 1),
                          (e6 = 0),
                          (e9 = null),
                          (e7 = []));
                        return;
                      }
                      let i = !r.paused;
                      if (
                        (0.001 >
                          Math.abs(
                            (eG += (!to - eG) * (1 - Math.exp(-e / 0.45))) -
                              !to,
                          ) && (eG = +!to),
                        i)
                      ) {
                        let t = y(r.rotationSpeed, 1) * eG;
                        ((eH += e * t * y(r.autoRotateX, 0.3)),
                          (eX += e * t * y(r.autoRotateY, 0.3)),
                          (eO += e * t * 0.15),
                          (eY += e * y(r.breatheSpeed, 2)));
                        let n = g(y(r.shuffle, 0), 0, 400);
                        if (n > 0 && P) {
                          tt += e * n;
                          let t = tT();
                          for (; tt >= 1;) {
                            tt -= 1;
                            let e = Math.floor(Math.random() * P);
                            ((V[e] = L),
                              (tn = L),
                              "random" === t && (Y[e] += 1));
                          }
                        } else tt = 0;
                      }
                      ((e1 = a),
                        (e2 = l),
                        r.interactive && to
                          ? ((e1 = ts), (e2 = tu))
                          : r.interactive &&
                            tr &&
                            ((e1 = ta + y(r.offsetX, 0)),
                            (e2 = tl + y(r.offsetY, 0))));
                      let o =
                          (t = y(r.followSpeed, 0.08)) <= 0
                            ? 0
                            : t >= 0.999
                              ? 1 / 0
                              : 1.678 /
                                ((-1 / (60 * Math.log(1 - t))) * Math.LN2),
                        s = r.interactive ? o : Math.max(o, 6);
                      if (((e5 = s > 0), s === 1 / 0))
                        ((eK = e1), (eJ = e2), (eZ = 0), (e0 = 0));
                      else if (s > 0) {
                        let t = Math.exp(-s * e),
                          n = eK - e1,
                          r = eJ - e2,
                          a = eZ + s * n,
                          l = e0 + s * r;
                        ((eK = e1 + (n + a * e) * t),
                          (eJ = e2 + (r + l * e) * t),
                          (eZ = (eZ - s * a * e) * t),
                          (e0 = (e0 - s * l * e) * t));
                      } else ((eZ = 0), (e0 = 0));
                      if (!to) {
                        let t = Math.sqrt(eZ * eZ + e0 * e0),
                          n = g(y(r.roll, 0.35), 0, 3);
                        t > 0.01 &&
                          n > 0 &&
                          tA(e0, -eZ, 0, ((n * t) / Math.max(e3, 12)) * e);
                        let a = Math.sqrt(eV * eV + eQ * eQ + e_ * e_);
                        if (a > 5e-4) {
                          tA(eV, eQ, e_, a * e);
                          let t = Math.exp(
                            -e / Math.max(y(r.inertia, 1), 0.05),
                          );
                          ((eV *= t), (eQ *= t), (e_ *= t));
                        } else ((eV = 0), (eQ = 0), (e_ = 0));
                      }
                      if (1 !== e8 || 0 !== e6) {
                        let t = Math.exp(-7 * e),
                          n = e8 - 1,
                          r = e6 + 7 * n;
                        ((e8 = 1 + (n + r * e) * t),
                          (e6 = (e6 - 7 * r * e) * t),
                          1e-4 > Math.abs(e8 - 1) &&
                            1e-4 > Math.abs(e6) &&
                            ((e8 = 1), (e6 = 0)));
                      }
                      let u = Math.max(y(r.scrambleDuration, 1.1), 0.05);
                      (e9 &&
                        L - e9.start > 0.2 * 3.5 + 0.8 + 0.1 &&
                        (e9 = null),
                        e7.length &&
                          (e7 = e7.filter(
                            (e) => L - e.start < 0.2 * 3.5 + u + 0.1,
                          )));
                    })(l),
                    tz(),
                    ((!t.reduced && !t.paused) || tI() || L - tn < 0.41) && a
                      ? (I = requestAnimationFrame(tB))
                      : (B = 0));
                },
                tL = () => {
                  D || !N || I || (I = requestAnimationFrame(tB));
                },
                tN = () => {
                  ((U = !0), I || (N && !r.hidden ? tL() : tz()));
                },
                tD = (e) => {
                  ((te += 1),
                    e7.push({ id: te, x: e.x, y: e.y, z: e.z, start: L }),
                    e7.length > 6 && e7.shift());
                },
                tU = (t) => {
                  let n = e.getBoundingClientRect();
                  return { x: t.clientX - n.left, y: t.clientY - n.top };
                },
                tW = () => {
                  let e = n.current;
                  return e.interactive && !e.reduced;
                },
                tP = () => {
                  let t = n.current,
                    r = "";
                  (tW() &&
                    t.draggable &&
                    (to
                      ? (r = "grabbing")
                      : tr &&
                        Math.hypot(ta - eK, tl - eJ) < e4 + 8 &&
                        (r = "grab")),
                    r !== tp && ((tp = r), (e.style.cursor = r)));
                },
                tq = (e) => {
                  if (to) {
                    if (((to = !1), e && performance.now() - tc < 90)) {
                      let e = Math.hypot(tf, tm),
                        t = e > 24 ? 24 / e : 1;
                      ((eV = tf * t), (eQ = tm * t), (e_ = 0));
                    }
                    ((tf = 0), (tm = 0), tP(), (U = !0), tL());
                  }
                },
                t$ = (e) => {
                  if (
                    !tW() ||
                    !e.isPrimary ||
                    ("mouse" === e.pointerType && 0 !== e.button)
                  )
                    return;
                  let t = tU(e);
                  ((ti = {
                    id: e.pointerId,
                    x: t.x,
                    y: t.y,
                    time: performance.now(),
                  }),
                    (eV = 0),
                    (eQ = 0),
                    (e_ = 0),
                    (tf = 0),
                    (tm = 0),
                    (U = !0),
                    tL());
                },
                tH = (t) => {
                  if (!tW()) return;
                  let r = n.current,
                    a = tU(t);
                  if (((U = !0), ti && ti.id === t.pointerId)) {
                    if (
                      !to &&
                      r.draggable &&
                      Math.hypot(a.x - ti.x, a.y - ti.y) > 5
                    ) {
                      ((to = !0),
                        (ts = eK),
                        (tu = eJ),
                        (td = a.x),
                        (th = a.y),
                        (tc = performance.now()));
                      try {
                        e.setPointerCapture(t.pointerId);
                      } catch {}
                    }
                    if (to) {
                      let e = performance.now(),
                        n = a.x - td,
                        r = a.y - th,
                        l = Math.max((e - tc) / 1e3, 1 / 240);
                      ((td = a.x), (th = a.y), (tc = e));
                      let i = Math.hypot(n, r);
                      if (i > 0.01) {
                        let e = i / Math.max(e3, 24),
                          t = r / i,
                          a = -n / i;
                        (tA(t, a, 0, e),
                          (tf = 0.55 * tf + ((t * e) / l) * 0.45),
                          (tm = 0.55 * tm + ((a * e) / l) * 0.45));
                      }
                      ("touch" !== t.pointerType &&
                        ((tr = !0), (ta = a.x), (tl = a.y)),
                        tP(),
                        tL());
                      return;
                    }
                  }
                  "touch" !== t.pointerType &&
                    ((tr = !0), (ta = a.x), (tl = a.y), tP(), tL());
                },
                tX = (t) => {
                  let r = ti;
                  if (!r || r.id !== t.pointerId) return;
                  if (((ti = null), to)) {
                    try {
                      e.releasePointerCapture(t.pointerId);
                    } catch {}
                    let n = tU(t);
                    ((n.x < 0 || n.y < 0 || n.x > k || n.y > T) && (tr = !1),
                      tq(!0));
                    return;
                  }
                  if (!tW()) return;
                  let a = tU(t);
                  Math.hypot(a.x - r.x, a.y - r.y) > 8 ||
                    performance.now() - r.time > 600 ||
                    0 >= y(n.current.scrambleDuration, 1.1) ||
                    (((e, t) => {
                      let n = -1,
                        r = 1 / 0;
                      for (let a = 0; a < P; a++) {
                        if (ee[a] <= 0.004) continue;
                        let l =
                          Math.hypot(Q[a] - e, _[a] - t) - et[a] * e3 * 0.35;
                        l < r && ((r = l), (n = a));
                      }
                      tD(n >= 0 ? { x: q[n], y: $[n], z: H[n] } : tE());
                    })(a.x, a.y),
                    (U = !0),
                    tL());
                },
                tO = (e) => {
                  (ti && ti.id === e.pointerId && (ti = null), tq(!1));
                },
                tY = (e) => {
                  "touch" === e.pointerType ||
                    to ||
                    ((tr = !1), tP(), (U = !0), tL());
                },
                tG = () => {
                  ((ti = null), tq(!1));
                },
                tV = () => {
                  ((B = 0), tL());
                },
                tQ = () => {
                  D || ((eN = !0), tN());
                },
                t_ = () => {
                  !D && tx() && tN();
                },
                tK = new ResizeObserver(() => {
                  tS() && (tx(), tN());
                }),
                tJ = new IntersectionObserver(
                  ([e]) => {
                    ((N = e.isIntersecting), (B = 0), tL());
                  },
                  { rootMargin: "120px" },
                ),
                tZ = new MutationObserver(t_),
                t0 = a.matchMedia("(prefers-color-scheme: dark)");
              (e.addEventListener("pointerdown", t$),
                e.addEventListener("pointermove", tH),
                e.addEventListener("pointerup", tX),
                e.addEventListener("pointercancel", tO),
                e.addEventListener("pointerleave", tY),
                a.addEventListener("blur", tG),
                r.addEventListener("visibilitychange", tV),
                r.fonts?.addEventListener?.("loadingdone", tQ),
                t0.addEventListener("change", t_),
                tZ.observe(r.documentElement, {
                  attributes: !0,
                  attributeFilter: ["class", "data-theme"],
                }),
                r.body &&
                  tZ.observe(r.body, {
                    attributes: !0,
                    attributeFilter: ["class", "data-theme"],
                  }),
                tK.observe(e),
                tJ.observe(e));
              let t1 = n.current;
              return (
                tS(),
                tb(),
                tg(),
                tx(),
                t1.intro &&
                  !t1.reduced &&
                  ((e8 = 0.92), (e9 = { id: 0, ...tE(), start: 0.1 })),
                tz(),
                {
                  sync: () => {
                    (tS(),
                      tx(),
                      tW() || ((tr = !1), (ti = null), tq(!1)),
                      tP(),
                      (B = 0),
                      tN());
                  },
                  scramble: () => {
                    n.current.reduced || (tD(tE()), (U = !0), tL());
                  },
                  spin: (e, t) => {
                    if (n.current.reduced) return;
                    ((eV += y(t, 0)), (eQ -= y(e, 0)));
                    let r = Math.sqrt(eV * eV + eQ * eQ + e_ * e_);
                    (r > 24 && ((eV *= 24 / r), (eQ *= 24 / r), (e_ *= 24 / r)),
                      (U = !0),
                      tL());
                  },
                  destroy: () => {
                    ((D = !0),
                      cancelAnimationFrame(I),
                      (I = 0),
                      tK.disconnect(),
                      tJ.disconnect(),
                      tZ.disconnect(),
                      e.removeEventListener("pointerdown", t$),
                      e.removeEventListener("pointermove", tH),
                      e.removeEventListener("pointerup", tX),
                      e.removeEventListener("pointercancel", tO),
                      e.removeEventListener("pointerleave", tY),
                      a.removeEventListener("blur", tG),
                      r.removeEventListener("visibilitychange", tV),
                      r.fonts?.removeEventListener?.("loadingdone", tQ),
                      t0.removeEventListener("change", t_),
                      (e.style.cursor = ""),
                      ex.clear(),
                      (l.width = 1),
                      (l.height = 1),
                      i.setTransform(1, 0, 0, 1, 0, 0),
                      i.clearRect(0, 0, t.width, t.height));
                  },
                }
              );
            })(e, t, ef);
            return (
              (ed.current = n),
              () => {
                (n?.destroy(), (ed.current = null));
              }
            );
          }, []),
          (0, a.useImperativeHandle)(
            eo,
            () => ({
              scramble: () => ed.current?.scramble(),
              spin: (e = 6, t = 0) => ed.current?.spin(e, t),
            }),
            [],
          ),
          (0, r.jsxs)("div", {
            ref: es,
            className: (0, s.cn)("relative overflow-hidden", n),
            style: {
              width: e,
              height: t,
              backgroundColor: D,
              touchAction: er && J && !eh ? "pan-y" : void 0,
              ...l,
            },
            children: [
              (0, r.jsx)("canvas", {
                ref: eu,
                "aria-hidden": "true",
                className:
                  "pointer-events-none absolute inset-0 block h-full w-full",
              }),
              i &&
                (0, r.jsx)("div", {
                  className: "pointer-events-none relative z-10",
                  children: i,
                }),
            ],
          })
        );
      });
    T.displayName = "TextCube";
    let R = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      z = {
        word: "x",
        fill: "word",
        charset: "abcdefghijklmnopqrstuvwxyz0123456789",
        upright: !1,
        fontFamily: "inherit",
        fontWeight: 300,
        fontSize: 18,
        cubeSize: 280,
        density: 49,
        perspective: 700,
        color: null,
        accentColor: null,
        shading: 0.6,
        depthFade: 0.3,
        depthTint: 0.5,
        glow: 0.35,
        rotationSpeed: 1,
        breathe: 0.1,
        roll: 0.35,
        shuffle: 0,
      },
      I = {
        classic: z,
        upright: {
          ...z,
          upright: !0,
          fontWeight: 200,
          fontSize: 16,
          cubeSize: 240,
          density: 20,
          perspective: 600,
          depthTint: 0.3,
          glow: 0.25,
        },
        letters: {
          ...z,
          word: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
          fill: "letters",
          charset: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
          fontWeight: 500,
          density: 36,
          glow: 0.3,
        },
        binary: {
          ...z,
          fill: "random",
          charset: "01",
          fontFamily: R,
          fontWeight: 500,
          fontSize: 15,
          density: 64,
          color: "#B19EEF",
          accentColor: "#FF9FFC",
          depthTint: 0.35,
          glow: 0.45,
          shuffle: 8,
        },
        matrix: {
          ...z,
          fill: "random",
          charset: "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789",
          fontFamily: R,
          fontWeight: 400,
          fontSize: 16,
          density: 64,
          color: "#4ADE80",
          accentColor: "#DCFCE7",
          depthTint: 0,
          glow: 0.6,
          rotationSpeed: 0.8,
          shuffle: 14,
        },
        mono: {
          ...z,
          word: "+",
          charset: "+-*/=<>#%",
          fontFamily: R,
          fontWeight: 300,
          fontSize: 22,
          depthTint: 0.4,
          glow: 0.2,
        },
        neon: {
          ...z,
          fontWeight: 400,
          color: "#FF9FFC",
          accentColor: "#5227FF",
          depthTint: 0.85,
          glow: 0.8,
        },
        dots: {
          ...z,
          word: "•",
          charset: "•\xb7∙◦",
          fontWeight: 400,
          fontSize: 16,
          density: 100,
          depthTint: 0.6,
          glow: 0.45,
        },
      },
      B = [
        { label: "Classic", value: "classic" },
        { label: "Upright", value: "upright" },
        { label: "Letters", value: "letters" },
        { label: "Binary", value: "binary" },
        { label: "Matrix", value: "matrix" },
        { label: "Mono", value: "mono" },
        { label: "Neon", value: "neon" },
        { label: "Dots", value: "dots" },
      ],
      L = [
        { label: "Word", value: "word" },
        { label: "Letters", value: "letters" },
        { label: "Random", value: "random" },
      ],
      N = [
        { label: "Page", value: "inherit" },
        { label: "Mono", value: R },
        {
          label: "Serif",
          value: "ui-serif, Georgia, 'Times New Roman', serif",
        },
      ],
      D = [
        {
          name: "word",
          type: "string",
          default: '"x"',
          description: "Text drawn at every point of the lattice.",
        },
        {
          name: "fill",
          type: '"word" | "letters" | "random"',
          default: '"word"',
          description:
            "How text covers the faces: the whole word at each point, its letters spelled across the faces, or random glyphs from the charset.",
        },
        {
          name: "charset",
          type: "string",
          default: '"abcdefghijklmnopqrstuvwxyz0123456789"',
          description:
            "Glyphs used by the scramble, the shuffle and the random fill.",
        },
        {
          name: "upright",
          type: "boolean",
          default: "false",
          description:
            "Keeps every glyph upright and facing you instead of printing it on its face.",
        },
        {
          name: "cubeSize",
          type: "number",
          default: "280",
          description:
            "Edge length of the cube in pixels. It shrinks to fit small containers.",
        },
        {
          name: "density",
          type: "number",
          default: "49",
          description: "Glyphs per face, rounded up to a square grid.",
        },
        {
          name: "fontSize",
          type: "number",
          default: "18",
          description: "Glyph size in pixels at the centre of the cube.",
        },
        {
          name: "fontWeight",
          type: "number",
          default: "300",
          description: "Font weight from 100 to 900.",
        },
        {
          name: "fontFamily",
          type: "string",
          default: '"inherit"',
          description: "Font family. Inherit uses the font of the page.",
        },
        {
          name: "color",
          type: "string",
          default: '"currentColor"',
          description: "Glyph colour. Defaults to the surrounding text colour.",
        },
        {
          name: "accentColor",
          type: "string",
          default: '"#B19EEF"',
          description: "Colour of scrambling glyphs and of the far faces.",
        },
        {
          name: "backgroundColor",
          type: "string",
          default: '"transparent"',
          description:
            "Fill behind the cube. On light fills or light pages the colours turn into deep ink tones.",
        },
        {
          name: "shading",
          type: "number",
          default: "0.6",
          description: "How much faces dim as they turn away from you.",
        },
        {
          name: "depthFade",
          type: "number",
          default: "0.3",
          description: "Extra fade toward the back of the cube.",
        },
        {
          name: "depthTint",
          type: "number",
          default: "0.5",
          description: "How far the back faces shift toward the accent colour.",
        },
        {
          name: "glow",
          type: "number",
          default: "0.35",
          description:
            "Soft bloom around bright glyphs. Dark backgrounds only.",
        },
        {
          name: "perspective",
          type: "number",
          default: "700",
          description:
            "Camera distance in pixels. Lower values look more dramatic.",
        },
        {
          name: "rotationSpeed",
          type: "number",
          default: "1",
          description: "Speed of the idle tumble.",
        },
        {
          name: "autoRotateX",
          type: "number",
          default: "0.3",
          description: "Idle tumble around the horizontal axis.",
        },
        {
          name: "autoRotateY",
          type: "number",
          default: "0.3",
          description: "Idle tumble around the vertical axis.",
        },
        {
          name: "breathe",
          type: "number",
          default: "0.1",
          description: "Size of the slow breathing pulse.",
        },
        {
          name: "breatheSpeed",
          type: "number",
          default: "2",
          description: "Speed of the breathing pulse.",
        },
        {
          name: "followSpeed",
          type: "number",
          default: "0.08",
          description:
            "How quickly the cube springs after the cursor. 0 keeps it in place.",
        },
        {
          name: "roll",
          type: "number",
          default: "0.35",
          description: "How much the cube rolls as it travels.",
        },
        {
          name: "offsetX",
          type: "number",
          default: "0",
          description: "Horizontal offset from the cursor in pixels.",
        },
        {
          name: "offsetY",
          type: "number",
          default: "0",
          description: "Vertical offset from the cursor in pixels.",
        },
        {
          name: "draggable",
          type: "boolean",
          default: "true",
          description: "Drag to spin the cube. A flick keeps it turning.",
        },
        {
          name: "inertia",
          type: "number",
          default: "1",
          description: "Seconds a flicked spin takes to slow down.",
        },
        {
          name: "scrambleDuration",
          type: "number",
          default: "1.1",
          description:
            "Length of the click scramble in seconds. 0 turns it off.",
        },
        {
          name: "shuffle",
          type: "number",
          default: "0",
          description: "Glyphs per second that quietly change on their own.",
        },
        {
          name: "opacity",
          type: "number",
          default: "1",
          description: "Overall opacity.",
        },
        {
          name: "interactive",
          type: "boolean",
          default: "true",
          description: "Follow, drag and click. Off keeps the cube centred.",
        },
        {
          name: "intro",
          type: "boolean",
          default: "true",
          description: "Types the cube in from the front when it appears.",
        },
        {
          name: "paused",
          type: "boolean",
          default: "false",
          description:
            "Stops the tumble, breathing and shuffle. Reduced-motion users get a still cube.",
        },
        {
          name: "dpr",
          type: "number",
          default: "2",
          description: "Maximum device pixel ratio for the canvas.",
        },
        {
          name: "width",
          type: "string | number",
          default: '"100%"',
          description: "Width of the root.",
        },
        {
          name: "height",
          type: "string | number",
          default: '"100%"',
          description: "Height of the root.",
        },
        {
          name: "children",
          type: "ReactNode",
          default: "undefined",
          description: "Content drawn above the cube.",
        },
        {
          name: "className",
          type: "string",
          default: "undefined",
          description: "Classes for the root element.",
        },
        {
          name: "style",
          type: "CSSProperties",
          default: "undefined",
          description: "Inline styles for the root element.",
        },
        {
          name: "ref",
          type: "{ scramble, spin }",
          default: "undefined",
          description:
            "scramble() runs the scramble from code. spin(x?, y?) flicks the cube, in radians per second.",
        },
      ],
      U = () => {
        let [e, t] = (0, o.I)(),
          n = (0, i.Y)(),
          [s, u] = (0, a.useState)("classic"),
          [d, h] = (0, a.useState)(I.classic),
          c = (e) => (t) => h((n) => ({ ...n, [e]: t })),
          [f, m] = (0, a.useState)(null),
          [p, g] = (0, a.useState)(0.3),
          [y, b] = (0, a.useState)(0.3),
          [x, v] = (0, a.useState)(0.08),
          [w, M] = (0, a.useState)(1),
          [F, C] = (0, a.useState)(1.1),
          [S, A] = (0, a.useState)(!0),
          [j, E] = (0, a.useState)(!0),
          [k, R] = (0, a.useState)(!1),
          z = "dark" === n,
          U = f ?? (z ? "#0a0a0a" : "#ffffff"),
          W = d.color ?? (z ? "#ffffff" : "#141414"),
          P = d.accentColor ?? (z ? "#B19EEF" : "#5227FF");
        return (0, r.jsxs)("div", {
          children: [
            (0, r.jsx)(l.Bg, {}),
            (0, r.jsxs)(l.VX, {
              children: [
                (0, r.jsxs)(l.Ec, {
                  children: [
                    (0, r.jsx)(l.Ch, {
                      onRefresh: t,
                      minHeight: 600,
                      children: (0, r.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, r.jsx)(
                          T,
                          {
                            ...d,
                            color: W,
                            accentColor: P,
                            backgroundColor: U,
                            autoRotateX: p,
                            autoRotateY: y,
                            followSpeed: x,
                            inertia: w,
                            scrambleDuration: F,
                            interactive: S,
                            intro: j,
                            paused: k,
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
                            (u(e), h(I[e] ?? I.classic));
                          },
                        }),
                        (0, r.jsx)(l.UD, {
                          title: "Word",
                          value: d.word,
                          onChange: c("word"),
                        }),
                        (0, r.jsx)(l.bg, {
                          title: "Fill",
                          value: d.fill,
                          options: L,
                          onChange: (e) => c("fill")(e),
                        }),
                        (0, r.jsx)(l.UD, {
                          title: "Charset",
                          value: d.charset,
                          onChange: c("charset"),
                        }),
                        (0, r.jsx)(l.bg, {
                          title: "Font",
                          value: d.fontFamily,
                          options: N,
                          onChange: c("fontFamily"),
                        }),
                        (0, r.jsx)(l.W7, {
                          title: "Color",
                          value: W,
                          onChange: c("color"),
                        }),
                        (0, r.jsx)(l.W7, {
                          title: "Accent",
                          value: P,
                          onChange: c("accentColor"),
                        }),
                        (0, r.jsx)(l.W7, {
                          title: "Background",
                          value: U,
                          onChange: m,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Font Weight",
                          min: 100,
                          max: 900,
                          step: 100,
                          value: d.fontWeight,
                          onChange: c("fontWeight"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Font Size",
                          min: 8,
                          max: 48,
                          step: 1,
                          value: d.fontSize,
                          valueUnit: "px",
                          onChange: c("fontSize"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Cube Size",
                          min: 100,
                          max: 480,
                          step: 10,
                          value: d.cubeSize,
                          valueUnit: "px",
                          onChange: c("cubeSize"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Density",
                          min: 1,
                          max: 144,
                          step: 1,
                          value: d.density,
                          onChange: c("density"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Perspective",
                          min: 250,
                          max: 2e3,
                          step: 10,
                          value: d.perspective,
                          valueUnit: "px",
                          onChange: c("perspective"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Shading",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: d.shading,
                          onChange: c("shading"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Depth Fade",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: d.depthFade,
                          onChange: c("depthFade"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Depth Tint",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: d.depthTint,
                          onChange: c("depthTint"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Glow",
                          min: 0,
                          max: 1.5,
                          step: 0.01,
                          value: d.glow,
                          onChange: c("glow"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Rotation Speed",
                          min: 0,
                          max: 3,
                          step: 0.01,
                          value: d.rotationSpeed,
                          onChange: c("rotationSpeed"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Auto Rotate X",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: p,
                          onChange: g,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Auto Rotate Y",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: y,
                          onChange: b,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Breathe",
                          min: 0,
                          max: 0.4,
                          step: 0.01,
                          value: d.breathe,
                          onChange: c("breathe"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Follow Speed",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: x,
                          onChange: v,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Roll",
                          min: 0,
                          max: 1.5,
                          step: 0.01,
                          value: d.roll,
                          onChange: c("roll"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Inertia",
                          min: 0.1,
                          max: 4,
                          step: 0.05,
                          value: w,
                          valueUnit: "s",
                          onChange: M,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Scramble",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: F,
                          valueUnit: "s",
                          onChange: C,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Shuffle",
                          min: 0,
                          max: 40,
                          step: 1,
                          value: d.shuffle,
                          valueUnit: "/s",
                          onChange: c("shuffle"),
                        }),
                        (0, r.jsx)(l.tl, {
                          title: "Upright",
                          checked: d.upright,
                          onChange: c("upright"),
                        }),
                        (0, r.jsx)(l.tl, {
                          title: "Interactive",
                          checked: S,
                          onChange: A,
                        }),
                        (0, r.jsx)(l.tl, {
                          title: "Intro",
                          checked: j,
                          onChange: E,
                        }),
                        (0, r.jsx)(l.tl, {
                          title: "Paused",
                          checked: k,
                          onChange: R,
                        }),
                      ],
                    }),
                    (0, r.jsx)(l.Ub, { data: D }),
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
