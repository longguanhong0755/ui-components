/* ReactBits Pro public preview module 82794 for expanding-grid.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/82794.ff988124a7911c64.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  82794: (e, t, i) => {
    (i.r(t), i.d(t, { default: () => I }));
    var a = i(95155),
      n = i(12115),
      r = i(56388),
      l = i(86049),
      o = i(90761),
      s = i(12246),
      u = i(2253),
      d = i(90650);
    let c = 2 * Math.PI,
      p = [
        {
          src: "/demo-media/portrait-indigo.webp",
          alt: "Studio portrait with short dark hair and a cobalt jacket",
          title: "Indigo",
          subtitle: "Studio portrait",
        },
        {
          src: "/demo-media/portrait-sienna.webp",
          alt: "Studio portrait with short natural hair and a burnt-orange top",
          title: "Sienna",
          subtitle: "Studio portrait",
        },
        {
          src: "/demo-media/portrait-pearl.webp",
          alt: "Studio portrait with long black hair and an ivory shirt",
          title: "Pearl",
          subtitle: "Studio portrait",
        },
        {
          src: "/demo-media/portrait-ochre.webp",
          alt: "Studio portrait with curly dark hair and an ochre knit",
          title: "Ochre",
          subtitle: "Studio portrait",
        },
        {
          src: "/demo-media/portrait-teal.webp",
          alt: "Studio portrait with a shaved head and a teal jacket",
          title: "Teal",
          subtitle: "Studio portrait",
        },
        {
          src: "/demo-media/portrait-olive.webp",
          alt: "Studio portrait with a dark bob and an olive top",
          title: "Olive",
          subtitle: "Studio portrait",
        },
        {
          src: "/demo-media/portrait-rose.webp",
          alt: "Studio portrait with curly red hair and burgundy clothing",
          title: "Rose",
          subtitle: "Studio portrait",
        },
        {
          src: "/demo-media/portrait-silver.webp",
          alt: "Studio portrait with cropped grey hair and a black shirt",
          title: "Silver",
          subtitle: "Studio portrait",
        },
      ],
      m = (e, t, i) => Math.min(i, Math.max(t, e)),
      h = (e) => {
        let t = m(e, 0, 1);
        return t * t * (3 - 2 * t);
      },
      v = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      f = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      g = (e, t, i, a, n, r = 1) => {
        let l = c / Math.max(n, 0.02),
          o = Math.max(1, Math.ceil(a / (1 / 120))),
          s = a / o,
          u = t,
          d = e;
        for (let e = 0; e < o; e++)
          ((u += (l * l * (i - d) - 2 * r * l * u) * s), (d += u * s));
        return [d, u];
      },
      x = {
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
      y = {
        position: "absolute",
        inset: 0,
        touchAction: "pan-y",
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
      },
      b = {
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      },
      w = `
attribute vec4 aTile;
attribute vec4 aLook;
varying vec2 vLocal;
varying float vSize;
varying vec4 vLook;

void main() {
  vLocal = position.xy;
  vSize = aTile.z;
  vLook = aLook;
  vec3 world = vec3(aTile.x + position.x * aTile.z, -aTile.y + position.y * aTile.z, aTile.w);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
}
`,
      S = `
precision highp float;

uniform sampler2D uAtlas;
uniform vec2 uGrid;
uniform float uInset;
uniform float uLoaded[48];
uniform float uRadius;
uniform float uDim;
varying vec2 vLocal;
varying float vSize;
varying vec4 vLook;

float roundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 p = vLocal * vSize;
  float d = roundBox(p, vec2(vSize * 0.5), uRadius * vSize);
  float aa = max(fwidth(d), 1e-3) * 0.75;
  float cover = 1.0 - smoothstep(-aa, aa, d);
  if (cover < 0.004) discard;
  float which = floor(vLook.x + 0.5);
  vec2 slot = vec2(mod(which, uGrid.x), floor(which / uGrid.x));
  vec2 uv = clamp(vLocal + 0.5, 0.0, 1.0);
  float inner = 1.0 - 2.0 * uInset;
  vec2 atlasUv = vec2(
    (slot.x + uInset + uv.x * inner) / uGrid.x,
    1.0 - (slot.y + uInset + (1.0 - uv.y) * inner) / uGrid.y
  );
  vec3 image = texture2D(uAtlas, atlasUv).rgb;
  float luma = dot(image, vec3(0.2126, 0.7152, 0.0722));
  vec3 color = mix(vec3(luma), image, clamp(vLook.y, 0.0, 1.0));
  float loaded = uLoaded[int(which)];
  color = mix(vec3(0.5), color, loaded);
  float alpha = cover * vLook.z * mix(0.35, 1.0, loaded) * (1.0 - uDim);
  gl_FragColor = vec4(color * alpha, alpha);
}
`,
      M = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,
      C = `
precision highp float;

uniform sampler2D uImage;
uniform float uImageAspect;
uniform vec2 uSize;
uniform float uRadius;
uniform float uSaturation;
varying vec2 vUv;

float roundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 p = (vUv - 0.5) * uSize;
  float d = roundBox(p, uSize * 0.5, uRadius);
  float aa = max(fwidth(d), 1e-3) * 0.75;
  float cover = 1.0 - smoothstep(-aa, aa, d);
  if (cover < 0.004) discard;
  float planeAspect = uSize.x / max(uSize.y, 1.0);
  vec2 uv = vUv - 0.5;
  if (planeAspect < uImageAspect) {
    uv.x *= planeAspect / uImageAspect;
  } else {
    uv.y *= uImageAspect / planeAspect;
  }
  vec3 image = texture2D(uImage, uv + 0.5).rgb;
  float luma = dot(image, vec3(0.2126, 0.7152, 0.0722));
  vec3 color = mix(vec3(luma), image, uSaturation);
  gl_FragColor = vec4(color * cover, cover);
}
`,
      k = (0, n.forwardRef)(function (
        {
          items: e = p,
          columns: t = 12,
          tileSize: i = 0.36,
          magnify: r = 1.5,
          lensSize: l = 1.3,
          fill: o = 0.92,
          radius: c = 0.14,
          saturation: k = 0,
          dim: z = 0.25,
          follow: j = 0.45,
          autoplay: A = !0,
          autoplaySpeed: I = 1,
          openOnClick: L = !0,
          captions: E = !0,
          interactive: R = !0,
          backgroundColor: F = "transparent",
          seed: T = 0,
          paused: P = !1,
          dpr: U = 2,
          ariaLabel:
            D = "Portrait grid. Move the pointer or use the arrow keys to magnify, click or press Enter to open a photo.",
          onOpen: O,
          className: q,
          style: N,
          children: W,
        },
        H,
      ) {
        let B = (0, n.useRef)(null),
          V = (0, n.useRef)(null),
          G = (0, n.useRef)(null),
          _ = (0, n.useSyncExternalStore)(v, f, () => !1),
          [Y, $] = (0, n.useState)(-1),
          [X, K] = (0, n.useState)(!1),
          Z = e.length ? e : p,
          J = (0, n.useRef)(Z),
          Q = {
            items: Z,
            columns: t,
            tileSize: i,
            magnify: r,
            lensSize: l,
            fill: o,
            radius: c,
            saturation: k,
            dim: z,
            follow: j,
            autoplay: A,
            autoplaySpeed: I,
            openOnClick: L,
            captions: E,
            interactive: R,
            backgroundColor: F,
            seed: T,
            paused: P,
            dpr: U,
            reduced: _,
          },
          ee = (0, n.useRef)(Q),
          et = (0, n.useRef)(O);
        ((0, n.useEffect)(() => {
          ((ee.current = Q),
            (J.current = Z),
            (et.current = O),
            G.current?.sync());
        }),
          (0, n.useEffect)(() => {
            let e = B.current,
              t = V.current;
            if (!e || !t) return;
            let i = ((e, t, i, a, n) => {
              let r,
                l = e.ownerDocument,
                o = l.createElement("canvas");
              o.style.cssText =
                "position:absolute;inset:0;width:100%;height:100%;display:block";
              try {
                r = new s.WebGLRenderer({
                  canvas: o,
                  alpha: !0,
                  antialias: !1,
                  premultipliedAlpha: !0,
                  powerPreference: "high-performance",
                });
              } catch {
                return null;
              }
              (t.appendChild(o), r.setClearColor(0, 0));
              let d = Array(48).fill(0),
                c = Array(48).fill(!1),
                p = {
                  uAtlas: { value: null },
                  uGrid: { value: new u.I9Y(1, 1) },
                  uInset: { value: 0.004 },
                  uLoaded: { value: d },
                  uRadius: { value: 0.16 },
                  uDim: { value: 0 },
                },
                v = new u.BKk({
                  uniforms: p,
                  vertexShader: w,
                  fragmentShader: S,
                  transparent: !0,
                  premultipliedAlpha: !0,
                  depthTest: !1,
                  depthWrite: !1,
                }),
                f = new u.bdM(1, 1),
                x = new u.CmU();
              ((x.index = f.index),
                x.setAttribute("position", f.getAttribute("position")),
                x.setAttribute("uv", f.getAttribute("uv")));
              let y = new Float32Array(2560),
                b = new Float32Array(2560),
                k = new u.uWO(y, 4),
                z = new u.uWO(b, 4);
              (k.setUsage(u.Vnu),
                z.setUsage(u.Vnu),
                x.setAttribute("aTile", k),
                x.setAttribute("aLook", z),
                (x.instanceCount = 0));
              let j = new u.eaF(x, v);
              j.frustumCulled = !1;
              let A = {
                  uImage: { value: null },
                  uImageAspect: { value: 0.8 },
                  uSize: { value: new u.I9Y(1, 1) },
                  uRadius: { value: 8 },
                  uSaturation: { value: 1 },
                },
                I = new u.BKk({
                  uniforms: A,
                  vertexShader: M,
                  fragmentShader: C,
                  transparent: !0,
                  premultipliedAlpha: !0,
                  depthTest: !1,
                  depthWrite: !1,
                }),
                L = new u.bdM(1, 1),
                E = new u.eaF(L, I);
              ((E.frustumCulled = !1), (E.renderOrder = 2), (E.visible = !1));
              let R = new u.Z58();
              R.add(j, E);
              let F = new u.qUd(0, 1, 0, -1, 0.1, 20);
              F.position.set(0, 0, 5);
              let T = null,
                P = null,
                U = [],
                D = new Map(),
                O = "",
                q = "",
                N = 1,
                W = 1,
                H = 1,
                B = 80,
                V = 1,
                G = 1,
                _ = [],
                Y = [],
                $ = { x: 0, y: 0, vx: 0, vy: 0, strength: 0, strengthV: 0 },
                X = !1,
                K = 0,
                Z = null,
                J = -1,
                Q = null,
                ee = 0,
                et = 0,
                ei = !1,
                ea = !1,
                en = !1,
                er = { x: 0, y: 0, inside: !1 },
                el = null,
                eo = () => {
                  let e = a.current.slice(0, 48),
                    t = e.map((e) => e.src).join("\0");
                  if (t === O) return;
                  ((O = t),
                    U.forEach((e) => {
                      e.onload = null;
                    }),
                    D.forEach((e) => e.dispose()),
                    D.clear(),
                    P?.dispose(),
                    d.fill(0),
                    c.fill(!1));
                  let i = Math.max(e.length, 1),
                    n = i <= 36 ? 320 : 256,
                    o = Math.ceil(Math.sqrt(i)),
                    s = Math.ceil(i / o),
                    m = l.createElement("canvas");
                  ((m.width = o * n), (m.height = s * n), (T = m));
                  let h = m.getContext("2d");
                  (((P = new u.GOR(m)).colorSpace = u.jf0),
                    (P.minFilter = u.$_I),
                    (P.magFilter = u.k6q),
                    (P.generateMipmaps = !0),
                    (P.anisotropy = r.capabilities.getMaxAnisotropy()),
                    (p.uAtlas.value = P),
                    p.uGrid.value.set(o, s),
                    (p.uInset.value = 1.5 / n),
                    (U = e.map((e, t) => {
                      let i = new Image();
                      return (
                        (i.crossOrigin = "anonymous"),
                        (i.decoding = "async"),
                        (i.onload = () => {
                          if (ea || T !== m || !h) return;
                          let e = Math.min(i.naturalWidth, i.naturalHeight);
                          (h.drawImage(
                            i,
                            (i.naturalWidth - e) / 2,
                            (i.naturalHeight - e) * 0.3,
                            e,
                            e,
                            (t % o) * n,
                            Math.floor(t / o) * n,
                            n,
                            n,
                          ),
                            P && (P.needsUpdate = !0),
                            (c[t] = !0),
                            ec());
                        }),
                        (i.src = e.src),
                        i
                      );
                    })),
                    (q = ""));
                },
                es = () => {
                  let t = i.current,
                    n = e.getBoundingClientRect(),
                    l = Math.min(
                      window.devicePixelRatio || 1,
                      Math.max(t.dpr, 0.5),
                    ),
                    o = Math.max(1, Math.round(n.width)),
                    s = Math.max(1, Math.round(n.height)),
                    u = Math.max(1, Math.min(a.current.length, 48)),
                    d = [o, s, l, t.columns, t.seed, u].join("|");
                  if (d === q) return !1;
                  for (
                    q = d,
                      N = o,
                      W = s,
                      H = l,
                      r.setPixelRatio(H),
                      r.setSize(N, W, !1),
                      F.left = 0,
                      F.right = N,
                      F.top = 0,
                      F.bottom = -W,
                      F.updateProjectionMatrix(),
                      B = Math.max(N / m(Math.round(t.columns), 3, 40), 44),
                      V = Math.max(1, Math.floor(N / B)),
                      G = Math.max(1, Math.floor(W / B));
                    V * G > 640;
                  )
                    ((B *= 1.08),
                      (V = Math.max(1, Math.floor(N / B))),
                      (G = Math.max(1, Math.floor(W / B))));
                  let c = (N - V * B) / 2 + B / 2,
                    p = (W - G * B) / 2 + B / 2,
                    h = Array.from({ length: u }, (e, t) => t),
                    v =
                      Math.imul(Math.floor(t.seed) + 5, 0x9e3779b1) >>> 0 || 1;
                  for (let e = h.length - 1; e > 0; e--) {
                    ((v ^= v << 13), (v ^= v >>> 17), (v ^= v << 5));
                    let t = (v >>>= 0) % (e + 1);
                    [h[e], h[t]] = [h[t], h[e]];
                  }
                  let f =
                    u > 6
                      ? ([5, 7, 3, 11, 13].find((e) => u % e != 0 && e < u) ??
                        1)
                      : 1;
                  _ = [];
                  for (let e = 0; e < G; e++)
                    for (let t = 0; t < V; t++)
                      _.push({
                        gx: c + t * B,
                        gy: p + e * B,
                        x: 0,
                        y: 0,
                        size: 0,
                        z: 0,
                        image: h[(t + e * f) % u],
                      });
                  return (
                    (Y = _.map((e, t) => t)),
                    X || (($.x = N / 2), ($.y = W / 2), (X = !0)),
                    Z &&
                      ((Z.col = m(Z.col, 0, V - 1)),
                      (Z.row = m(Z.row, 0, G - 1))),
                    Q && Q.tile >= _.length && ((Q = null), (E.visible = !1)),
                    !0
                  );
                },
                eu = (e) => ({
                  x: N / 2 + 0.32 * N * Math.sin(0.23 * e + 0.7),
                  y: W / 2 + 0.28 * W * Math.sin(0.31 * e + 0.2),
                }),
                ed = (e, t) => {
                  let i = 0.18 * B,
                    a = -1,
                    n = 1 / 0;
                  for (let r = 0; r < _.length; r++) {
                    let l = _[r],
                      o = l.size / 2,
                      s = Math.hypot(
                        Math.max(Math.abs(e - l.x) - o, 0),
                        Math.max(Math.abs(t - l.y) - o, 0),
                      );
                    if (s > i) continue;
                    let u = s - 0.01 * l.z;
                    u < n && ((n = u), (a = r));
                  }
                  return a;
                },
                ec = () => {
                  ea || en || !ei || ee || (ee = requestAnimationFrame(ev));
                },
                ep = (e) => {
                  let t = U[e];
                  if (!t || !t.complete || !t.naturalWidth) return null;
                  let i = D.get(e);
                  return (
                    i ||
                      (((i = new u.gPd(t)).colorSpace = u.jf0),
                      (i.minFilter = u.$_I),
                      (i.magFilter = u.k6q),
                      (i.generateMipmaps = !0),
                      (i.anisotropy = r.capabilities.getMaxAnisotropy()),
                      (i.needsUpdate = !0),
                      D.set(e, i),
                      r.initTexture(i)),
                    i
                  );
                },
                em = (t) => {
                  let i = _[t];
                  if (!i) return;
                  let a = U[i.image],
                    r = ep(i.image);
                  a &&
                    r &&
                    ((A.uImage.value = r),
                    (A.uImageAspect.value =
                      a.naturalWidth / Math.max(a.naturalHeight, 1)),
                    (Q = {
                      tile: t,
                      image: i.image,
                      e: 0,
                      v: 0,
                      target: 1,
                      x: i.x,
                      y: i.y,
                      size: i.size,
                      aspect: 1,
                      aspectV: 0,
                    }),
                    (J = -1),
                    (e.style.cursor = ""),
                    n(i.image),
                    ec());
                },
                eh = () => {
                  Q && 0 !== Q.target && ((Q.target = 0), n(-1), ec());
                };
              function ev(t) {
                if (((ee = 0), ea || en)) return;
                let a = i.current,
                  n = et ? Math.min(Math.max((t - et) / 1e3, 0), 0.05) : 1 / 60;
                et = t;
                let l = a.reduced,
                  o = !a.paused && !l,
                  s = !1,
                  u = $.x,
                  v = $.y,
                  f = 0,
                  w = !!Q && 1 === Q.target;
                if (!w && a.interactive && er.inside)
                  ((u = er.x), (v = er.y), (f = 1));
                else if (!w && Z) {
                  let e = _[Z.row * V + Z.col];
                  e && ((u = e.gx), (v = e.gy), (f = 1));
                } else if (!w && a.autoplay && o) {
                  let e = eu((K += n * Math.max(a.autoplaySpeed, 0)));
                  ((u = e.x), (v = e.y), (f = 1), (s = !0));
                }
                let S = l ? 0.05 : m(a.follow, 0.05, 2);
                (([$.x, $.vx] = g($.x, $.vx, u, n, S)),
                  ([$.y, $.vy] = g($.y, $.vy, v, n, S)),
                  ([$.strength, $.strengthV] = g(
                    $.strength,
                    $.strengthV,
                    f,
                    n,
                    l ? 0.05 : f > $.strength ? 0.5 : 0.8,
                  )),
                  (Math.abs($.x - u) + Math.abs($.y - v) > 0.05 ||
                    Math.abs($.vx) + Math.abs($.vy) > 0.05 ||
                    Math.abs($.strength - f) > 0.001 ||
                    Math.abs($.strengthV) > 0.001) &&
                    (s = !0));
                let M = m(a.tileSize, 0.05, 0.98),
                  C = Math.max(m(a.fill, 0.2, 1), M),
                  j = Math.max(m(a.magnify, 1, 3) - 1, 0),
                  I = Math.max(a.lensSize, 0.2) * B,
                  L = 1 / (2 * I * I),
                  T = m(a.saturation, 0, 1),
                  P = m(a.dim, 0, 0.9),
                  U = m($.strength, 0, 1.2);
                for (let e = 0; e < _.length; e++) {
                  let t = _[e],
                    i = t.gx - $.x,
                    a = t.gy - $.y,
                    n = U * Math.exp(-(i * i + a * a) * L),
                    r = 1 + j * n;
                  ((t.x = $.x + i * r),
                    (t.y = $.y + a * r),
                    (t.size = B * r * (M + (C - M) * n)),
                    (t.z = n));
                }
                Y.sort((e, t) => _[e].z - _[t].z || e - t);
                let D = 0;
                for (let e of Y) {
                  let t = _[e];
                  if (Q && Q.tile === e) continue;
                  let i = h((t.z - 0.12) / 0.7),
                    a = 4 * D;
                  ((y[a] = t.x),
                    (y[a + 1] = t.y),
                    (y[a + 2] = t.size),
                    (y[a + 3] = 0),
                    (b[a] = t.image),
                    (b[a + 1] = T + (1 - T) * i),
                    (b[a + 2] = 1 - P + P * i),
                    (b[a + 3] = 1),
                    D++);
                }
                if (
                  ((x.instanceCount = D),
                  (k.needsUpdate = !0),
                  (z.needsUpdate = !0),
                  (p.uRadius.value = m(a.radius, 0, 0.5)),
                  er.inside && !el && a.openOnClick && !w)
                ) {
                  let t = ed(er.x, er.y);
                  t !== J &&
                    ((J = t),
                    (e.style.cursor = t >= 0 ? "pointer" : ""),
                    t >= 0 && ep(_[t].image));
                }
                if (Q) {
                  [Q.e, Q.v] = g(Q.e, Q.v, Q.target, n, l ? 0.08 : 0.7, 0.9);
                  let t = m(Q.e, 0, 1),
                    r = A.uImageAspect.value;
                  [Q.aspect, Q.aspectV] = g(
                    Q.aspect,
                    Q.aspectV,
                    Q.target ? r : 1,
                    n,
                    l ? 0.08 : 0.8,
                  );
                  let o = _[Q.tile];
                  0 === Q.target &&
                    o &&
                    ((Q.x = o.x), (Q.y = o.y), (Q.size = o.size));
                  let u = 0.84 * N,
                    d = 0.72 * W;
                  d * r > u && (d = u / r);
                  let c = m(Q.aspect, Math.min(1, r), Math.max(1, r)),
                    h = Math.max(Q.size, 1),
                    v = Math.sqrt(d * d * r),
                    f = (h + (v - h) * t) / Math.sqrt(c),
                    x = f * c,
                    y = W / 2 - 22 * !!i.current.captions,
                    b = Q.x + (N / 2 - Q.x) * t,
                    w = Q.y + (y - Q.y) * t;
                  (E.position.set(b, -w, 1.5),
                    E.scale.set(x, f, 1),
                    A.uSize.value.set(x, f));
                  let S = m(a.radius, 0, 0.5) * h;
                  ((A.uRadius.value = S + (Math.min(18, 0.04 * v) - S) * t),
                    (A.uSaturation.value = 1),
                    (E.visible = !0),
                    (p.uDim.value = 0.8 * t),
                    e.style.setProperty(
                      "--grid-caption-y",
                      `${y + d / 2 + 18}px`,
                    ),
                    (s = !0),
                    0 === Q.target &&
                      Q.e < 0.002 &&
                      0.02 > Math.abs(Q.v) &&
                      ((Q = null), (E.visible = !1), (p.uDim.value = 0)));
                }
                for (let e = 0; e < 48; e++)
                  c[e] &&
                    d[e] < 1 &&
                    ((d[e] = l ? 1 : Math.min(1, d[e] + n / 0.5)), (s = !0));
                (r.render(R, F), (s || er.inside) && ec());
              }
              let ef = (t) => {
                  let i = e.getBoundingClientRect();
                  ((er.x = t.clientX - i.left), (er.y = t.clientY - i.top));
                },
                eg = (e) => {
                  "touch" !== e.pointerType &&
                    (ef(e), (er.inside = !0), (Z = null), ec());
                },
                ex = () => {
                  ((er.inside = !1), (J = -1), (e.style.cursor = ""), ec());
                },
                ey = (e) => {
                  e.isPrimary &&
                    !(e.button > 0) &&
                    (el = { id: e.pointerId, x: e.clientX, y: e.clientY });
                },
                eb = (e) => {
                  if (!el || el.id !== e.pointerId) return;
                  let t = Math.hypot(e.clientX - el.x, e.clientY - el.y) > 8;
                  if (((el = null), t)) return;
                  let a = i.current;
                  if (Q && 1 === Q.target) return void eh();
                  if (!a.openOnClick || !a.interactive) return;
                  ef(e);
                  let n = ed(er.x, er.y);
                  n >= 0 && em(n);
                },
                ew = (t) => {
                  let a = i.current;
                  if (!a.interactive) return;
                  if ("Escape" === t.key) {
                    (eh(), (Z = null), ec());
                    return;
                  }
                  let n = {
                    ArrowLeft: [-1, 0],
                    ArrowRight: [1, 0],
                    ArrowUp: [0, -1],
                    ArrowDown: [0, 1],
                  }[t.key];
                  n
                    ? (t.preventDefault(),
                      Z
                        ? ((Z.col = m(Z.col + n[0], 0, V - 1)),
                          (Z.row = m(Z.row + n[1], 0, G - 1)))
                        : (Z = {
                            col: m(
                              Math.round(($.x - (N - V * B) / 2 - B / 2) / B),
                              0,
                              V - 1,
                            ),
                            row: m(
                              Math.round(($.y - (W - G * B) / 2 - B / 2) / B),
                              0,
                              G - 1,
                            ),
                          }),
                      ec())
                    : "Enter" === t.key &&
                      t.target === e &&
                      (t.preventDefault(),
                      Q && 1 === Q.target
                        ? eh()
                        : Z && a.openOnClick && em(Z.row * V + Z.col));
                };
              (t.addEventListener("pointermove", eg),
                t.addEventListener("pointerleave", ex),
                t.addEventListener("pointerdown", ey),
                t.addEventListener("pointerup", eb),
                e.addEventListener("keydown", ew));
              let eS = new ResizeObserver(() => {
                es() && ec();
              });
              eS.observe(e);
              let eM =
                "undefined" == typeof IntersectionObserver
                  ? null
                  : new IntersectionObserver(
                      ([e]) => {
                        (ei = e.isIntersecting)
                          ? ((et = 0), ec())
                          : ee && (cancelAnimationFrame(ee), (ee = 0));
                      },
                      { rootMargin: "80px" },
                    );
              eM ? eM.observe(e) : (ei = !0);
              let eC = (e) => {
                  (e.preventDefault(),
                    (en = !0),
                    ee && cancelAnimationFrame(ee),
                    (ee = 0));
                },
                ek = () => {
                  ((en = !1), (O = ""), eo(), es(), ec());
                };
              if (
                (o.addEventListener("webglcontextlost", eC),
                o.addEventListener("webglcontextrestored", ek),
                eo(),
                es(),
                (E.visible = !0),
                r.compile(R, F),
                (E.visible = !1),
                i.current.autoplay && !i.current.reduced)
              ) {
                let e = eu(0);
                (($.x = e.x), ($.y = e.y));
              }
              return (
                ec(),
                {
                  sync: () => {
                    (eo(), es(), (et = 0), ec());
                  },
                  open: (e) => {
                    let t = _.findIndex((t) => t.image === e);
                    t >= 0 && em(t);
                  },
                  close: eh,
                  focusAt: (e, t) => {
                    ((Z = {
                      col: m(Math.round(e), 0, V - 1),
                      row: m(Math.round(t), 0, G - 1),
                    }),
                      ec());
                  },
                  destroy: () => {
                    ((ea = !0),
                      ee && cancelAnimationFrame(ee),
                      eM?.disconnect(),
                      eS.disconnect(),
                      t.removeEventListener("pointermove", eg),
                      t.removeEventListener("pointerleave", ex),
                      t.removeEventListener("pointerdown", ey),
                      t.removeEventListener("pointerup", eb),
                      e.removeEventListener("keydown", ew),
                      (e.style.cursor = ""),
                      o.removeEventListener("webglcontextlost", eC),
                      o.removeEventListener("webglcontextrestored", ek),
                      U.forEach((e) => {
                        e.onload = null;
                      }),
                      D.forEach((e) => e.dispose()),
                      P?.dispose(),
                      f.dispose(),
                      x.dispose(),
                      L.dispose(),
                      v.dispose(),
                      I.dispose(),
                      r.dispose(),
                      r.getContext().isContextLost() || r.forceContextLoss(),
                      o.remove());
                  },
                }
              );
            })(e, t, ee, J, (e) => {
              $(e);
              let t = e >= 0 ? (J.current[e] ?? null) : null;
              (et.current?.(t, e),
                t?.href && e >= 0 && window.location.assign(t.href));
            });
            if (!i) {
              let e = requestAnimationFrame(() => K(!0));
              return () => cancelAnimationFrame(e);
            }
            return (
              (G.current = i),
              () => {
                (i.destroy(), (G.current = null));
              }
            );
          }, []),
          (0, n.useImperativeHandle)(
            H,
            () => ({
              open: (e) => G.current?.open(e),
              close: () => G.current?.close(),
              focusAt: (e, t) => G.current?.focusAt(e, t),
            }),
            [],
          ));
        let ei = F.trim().toLowerCase(),
          ea = "transparent" === ei || "" === ei,
          en =
            !ea &&
            ((e) => {
              let t = e.replace("#", "");
              if (!/^[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(t)) return !1;
              let i = 3 === t.length ? t.replace(/./g, (e) => e + e) : t;
              return (
                (0.2126 * Number.parseInt(i.slice(0, 2), 16) +
                  0.7152 * Number.parseInt(i.slice(2, 4), 16) +
                  0.0722 * Number.parseInt(i.slice(4, 6), 16)) /
                  255 >
                0.6
              );
            })(ei),
          er = Y >= 0 ? Z[Y] : null;
        return (0, a.jsxs)("div", {
          ref: B,
          className: (0, d.cn)(
            "relative h-full min-h-[420px] w-full overflow-hidden",
            q,
          ),
          style: { backgroundColor: ea ? void 0 : F, ...N },
          role: "region",
          "aria-roledescription": "gallery",
          "aria-label": D,
          tabIndex: 0,
          children: [
            (0, a.jsx)("div", { ref: V, style: y }),
            X
              ? (0, a.jsx)("div", {
                  style: {
                    ...b,
                    gap: 8,
                    flexWrap: "wrap",
                    padding: 24,
                    alignContent: "center",
                  },
                  children: Z.slice(0, 24).map((e) =>
                    (0, a.jsx)(
                      "img",
                      {
                        src: e.src,
                        alt: e.alt,
                        style: {
                          width: 56,
                          height: 56,
                          objectFit: "cover",
                          borderRadius: 8,
                        },
                      },
                      e.src,
                    ),
                  ),
                })
              : null,
            (0, a.jsx)("ul", {
              style: x,
              children: Z.map((e) =>
                (0, a.jsx)(
                  "li",
                  { children: e.title ? `${e.title}: ${e.alt}` : e.alt },
                  e.src,
                ),
              ),
            }),
            W
              ? (0, a.jsx)("div", {
                  style: {
                    ...b,
                    opacity: +!er,
                    transition: "opacity 300ms ease",
                  },
                  children: (0, a.jsx)("div", {
                    style: { pointerEvents: er ? "none" : "auto" },
                    children: W,
                  }),
                })
              : null,
            E
              ? (0, a.jsx)("div", {
                  "aria-live": "polite",
                  style: {
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: "min(var(--grid-caption-y, 88%), calc(100% - 52px))",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                    pointerEvents: "none",
                    opacity: +!!er,
                    transform: er ? "translateY(0)" : "translateY(6px)",
                    transition: er
                      ? "opacity 420ms ease 360ms, transform 520ms cubic-bezier(0.22, 1, 0.36, 1) 360ms"
                      : "opacity 160ms ease, transform 160ms ease",
                    color: en
                      ? "rgba(10, 10, 10, 0.92)"
                      : ea
                        ? "inherit"
                        : "rgba(255, 255, 255, 0.94)",
                    textAlign: "center",
                  },
                  children: er
                    ? (0, a.jsxs)(a.Fragment, {
                        children: [
                          (0, a.jsx)("span", {
                            style: {
                              fontSize: 15,
                              fontWeight: 600,
                              lineHeight: 1.35,
                            },
                            children: er.title ?? er.alt,
                          }),
                          er.subtitle
                            ? (0, a.jsx)("span", {
                                style: {
                                  fontSize: 13,
                                  opacity: 0.6,
                                  lineHeight: 1.35,
                                },
                                children: er.subtitle,
                              })
                            : null,
                        ],
                      })
                    : null,
                })
              : null,
          ],
        });
      });
    k.displayName = "ExpandingGrid";
    let z = {
        studio: {
          columns: 12,
          tileSize: 0.36,
          magnify: 1.5,
          lensSize: 1.3,
          fill: 0.92,
          radius: 0.14,
          saturation: 0,
          dim: 0.25,
        },
        mosaic: {
          columns: 14,
          tileSize: 0.84,
          magnify: 1.35,
          lensSize: 1.6,
          fill: 0.94,
          radius: 0.08,
          saturation: 0,
          dim: 0.35,
        },
        loupe: {
          columns: 16,
          tileSize: 0.3,
          magnify: 2.2,
          lensSize: 0.9,
          fill: 0.9,
          radius: 0.2,
          saturation: 0,
          dim: 0.3,
        },
        wide: {
          columns: 10,
          tileSize: 0.4,
          magnify: 1.3,
          lensSize: 2.2,
          fill: 0.9,
          radius: 0.14,
          saturation: 0.15,
          dim: 0.2,
        },
        colour: {
          columns: 12,
          tileSize: 0.36,
          magnify: 1.5,
          lensSize: 1.3,
          fill: 0.92,
          radius: 0.14,
          saturation: 1,
          dim: 0,
        },
        dots: {
          columns: 20,
          tileSize: 0.22,
          magnify: 1.8,
          lensSize: 1.5,
          fill: 0.9,
          radius: 0.5,
          saturation: 0,
          dim: 0.3,
        },
      },
      j = [
        { label: "Studio", value: "studio" },
        { label: "Mosaic", value: "mosaic" },
        { label: "Loupe", value: "loupe" },
        { label: "Wide", value: "wide" },
        { label: "Colour", value: "colour" },
        { label: "Dots", value: "dots" },
      ],
      A = [
        {
          name: "items",
          type: "{ src: string; alt: string; title?: string; subtitle?: string; href?: string }[]",
          default: "studio portrait collection",
          description:
            "Images for the tiles, repeated across the grid so neighbours never match. Images must allow cross-origin loading. Title and subtitle caption an opened photo; href makes opening it navigate.",
        },
        {
          name: "columns",
          type: "number",
          default: "12",
          description:
            "Number of columns across the container. Rows fill the height with square cells; narrow screens get fewer columns.",
        },
        {
          name: "tileSize",
          type: "number",
          default: "0.36",
          description:
            "Size of a resting tile as a fraction of its cell. Small values leave the grid airy; values near 1 make a tight mosaic.",
        },
        {
          name: "magnify",
          type: "number",
          default: "1.5",
          description:
            "How much the lens spreads the grid apart at its centre. Tiles there also grow to fill their enlarged cells.",
        },
        {
          name: "lensSize",
          type: "number",
          default: "1.3",
          description: "Radius of the lens, in cells.",
        },
        {
          name: "fill",
          type: "number",
          default: "0.92",
          description:
            "How much of its cell a tile at the centre of the lens fills. The rest is the gap between enlarged photos.",
        },
        {
          name: "radius",
          type: "number",
          default: "0.14",
          description:
            "Corner rounding as a fraction of the tile size. 0.5 makes circles.",
        },
        {
          name: "saturation",
          type: "number",
          default: "0",
          description:
            "Colour of the tiles outside the lens, from 0 (monochrome) to 1 (full colour). Tiles in the lens are always in full colour.",
        },
        {
          name: "dim",
          type: "number",
          default: "0.25",
          description:
            "How much the tiles outside the lens fade into the background.",
        },
        {
          name: "follow",
          type: "number",
          default: "0.45",
          description:
            "Seconds the lens takes to catch up with the pointer. Higher values feel heavier and smoother.",
        },
        {
          name: "autoplay",
          type: "boolean",
          default: "true",
          description:
            "When the pointer is away, the lens drifts on its own across the grid.",
        },
        {
          name: "autoplaySpeed",
          type: "number",
          default: "1",
          description: "Speed of that drift.",
        },
        {
          name: "openOnClick",
          type: "boolean",
          default: "true",
          description:
            "Clicking a tile opens its photo large in the centre. Click again or press Escape to put it back.",
        },
        {
          name: "captions",
          type: "boolean",
          default: "true",
          description: "Show the title and subtitle of an opened photo.",
        },
        {
          name: "interactive",
          type: "boolean",
          default: "true",
          description:
            "Let the pointer and keyboard steer the lens. The arrow keys move it tile by tile and Enter opens the tile under it.",
        },
        {
          name: "backgroundColor",
          type: "string",
          default: '"transparent"',
          description: "Background of the component. Captions adapt to it.",
        },
        {
          name: "seed",
          type: "number",
          default: "0",
          description: "Changes how the images are arranged across the grid.",
        },
        {
          name: "paused",
          type: "boolean",
          default: "false",
          description:
            "Stops the autoplay drift. Reduced-motion users never get the drift.",
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
          default: '"Portrait grid…"',
          description: "Accessible description of the grid and how to use it.",
        },
        {
          name: "onOpen",
          type: "(item, index) => void",
          default: "—",
          description:
            "Called when a photo is opened, with null and -1 when it is put back.",
        },
        {
          name: "ref",
          type: "{ open, close, focusAt }",
          default: "—",
          description:
            "Imperative controls: open an item, close it, or move the lens to a column and row.",
        },
        {
          name: "children",
          type: "ReactNode",
          default: "—",
          description:
            "Content centred over the grid, such as a headline. It fades out while a photo is open.",
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
      I = () => {
        let [e, t] = (0, o.I)(),
          i = (0, l.Y)(),
          [s, u] = (0, n.useState)("studio"),
          [d, c] = (0, n.useState)(z.studio),
          p = (e) => (t) => c((i) => ({ ...i, [e]: t })),
          [m, h] = (0, n.useState)(null),
          v = m ?? ("dark" === i ? "#0A0A0A" : "#FFFFFF"),
          [f, g] = (0, n.useState)(0.45),
          [x, y] = (0, n.useState)(1),
          [b, w] = (0, n.useState)(0),
          [S, M] = (0, n.useState)(!0),
          [C, I] = (0, n.useState)(!0),
          [L, E] = (0, n.useState)(!0),
          [R, F] = (0, n.useState)(!0),
          [T, P] = (0, n.useState)(!1);
        return (0, a.jsxs)("div", {
          children: [
            (0, a.jsx)(r.Bg, {}),
            (0, a.jsxs)(r.VX, {
              children: [
                (0, a.jsxs)(r.Ec, {
                  children: [
                    (0, a.jsx)(r.Ch, {
                      onRefresh: t,
                      minHeight: 560,
                      enableResponsive: !0,
                      children: (0, a.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, a.jsx)(
                          k,
                          {
                            columns: d.columns,
                            tileSize: d.tileSize,
                            magnify: d.magnify,
                            lensSize: d.lensSize,
                            fill: d.fill,
                            radius: d.radius,
                            saturation: d.saturation,
                            dim: d.dim,
                            follow: f,
                            autoplay: S,
                            autoplaySpeed: x,
                            openOnClick: C,
                            captions: L,
                            interactive: R,
                            backgroundColor: v,
                            seed: b,
                            paused: T,
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
                          options: j,
                          onChange: (e) => {
                            (u(e), c(z[e] ?? z.studio));
                          },
                        }),
                        (0, a.jsx)(r.W7, {
                          title: "Background",
                          value: v,
                          onChange: h,
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Columns",
                          min: 4,
                          max: 30,
                          step: 1,
                          value: d.columns,
                          onChange: p("columns"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Tile Size",
                          min: 0.1,
                          max: 0.95,
                          step: 0.01,
                          value: d.tileSize,
                          onChange: p("tileSize"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Magnify",
                          min: 1,
                          max: 3,
                          step: 0.05,
                          value: d.magnify,
                          valueUnit: "\xd7",
                          onChange: p("magnify"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Lens Size",
                          min: 0.5,
                          max: 4,
                          step: 0.05,
                          value: d.lensSize,
                          onChange: p("lensSize"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Fill",
                          min: 0.5,
                          max: 1,
                          step: 0.01,
                          value: d.fill,
                          onChange: p("fill"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Radius",
                          min: 0,
                          max: 0.5,
                          step: 0.01,
                          value: d.radius,
                          onChange: p("radius"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Saturation",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: d.saturation,
                          onChange: p("saturation"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Dim",
                          min: 0,
                          max: 0.8,
                          step: 0.01,
                          value: d.dim,
                          onChange: p("dim"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Follow",
                          min: 0.1,
                          max: 1.5,
                          step: 0.05,
                          value: f,
                          valueUnit: "s",
                          onChange: g,
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Autoplay Speed",
                          min: 0.2,
                          max: 3,
                          step: 0.05,
                          value: x,
                          onChange: y,
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Seed",
                          min: 0,
                          max: 20,
                          step: 1,
                          value: b,
                          onChange: w,
                        }),
                        (0, a.jsx)(r.tl, {
                          title: "Autoplay",
                          checked: S,
                          onChange: M,
                        }),
                        (0, a.jsx)(r.tl, {
                          title: "Open On Click",
                          checked: C,
                          onChange: I,
                        }),
                        (0, a.jsx)(r.tl, {
                          title: "Captions",
                          checked: L,
                          onChange: E,
                        }),
                        (0, a.jsx)(r.tl, {
                          title: "Interactive",
                          checked: R,
                          onChange: F,
                        }),
                        (0, a.jsx)(r.tl, {
                          title: "Paused",
                          checked: T,
                          onChange: P,
                        }),
                      ],
                    }),
                    (0, a.jsx)(r.Ub, { data: A }),
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
