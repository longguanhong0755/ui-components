/* ReactBits Pro public preview module 94671 for constellation-gallery.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/94671.5e39f3e0a737c755.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  94671: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => P }));
    var r = a(95155),
      i = a(12115),
      n = a(56388),
      o = a(86049),
      l = a(90761),
      s = a(12246),
      u = a(2253),
      c = a(90650);
    let d = Math.PI * (3 - Math.sqrt(5)),
      h = [
        {
          src: "/demo-media/portrait-sienna.webp",
          alt: "Studio portrait with short natural hair and a burnt-orange top",
          title: "Sienna",
          subtitle: "Studio portrait",
        },
        {
          src: "/demo-media/portrait-indigo.webp",
          alt: "Studio portrait with short dark hair and a cobalt jacket",
          title: "Indigo",
          subtitle: "Studio portrait",
        },
        {
          src: "/demo-media/portrait-olive.webp",
          alt: "Studio portrait with a dark bob and an olive top",
          title: "Olive",
          subtitle: "Studio portrait",
        },
        {
          src: "/demo-media/portrait-silver.webp",
          alt: "Studio portrait with cropped grey hair and a black shirt",
          title: "Silver",
          subtitle: "Studio portrait",
        },
        {
          src: "/demo-media/portrait-ochre.webp",
          alt: "Studio portrait with curly dark hair and an ochre knit",
          title: "Ochre",
          subtitle: "Studio portrait",
        },
        {
          src: "/demo-media/portrait-rose.webp",
          alt: "Studio portrait with curly red hair and burgundy clothing",
          title: "Rose",
          subtitle: "Studio portrait",
        },
        {
          src: "/demo-media/portrait-teal.webp",
          alt: "Studio portrait with a shaved head and a teal jacket",
          title: "Teal",
          subtitle: "Studio portrait",
        },
        {
          src: "/demo-media/portrait-pearl.webp",
          alt: "Studio portrait with long black hair and an ivory shirt",
          title: "Pearl",
          subtitle: "Studio portrait",
        },
      ],
      p = (e, t, a) => Math.min(a, Math.max(t, e)),
      m = (e) => {
        let t = 2 * Math.PI;
        return ((((e + Math.PI) % t) + t) % t) - Math.PI;
      },
      v = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      f = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      g = {
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
      x = {
        position: "absolute",
        inset: 0,
        touchAction: "pan-y",
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
      },
      y = {
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      },
      b = `
attribute vec3 aCenter;
attribute vec4 aCard;
attribute vec4 aLook;
uniform mat4 uGroup;
uniform float uMargin;
varying vec2 vLocal;
varying vec4 vCard;
varying vec4 vLook;

void main() {
  vec3 center = (uGroup * vec4(aCenter, 1.0)).xyz;
  vec2 corner = position.xy * uMargin;
  float c = cos(aCard.y);
  float s = sin(aCard.y);
  vec2 turned = vec2(c * corner.x - s * corner.y, s * corner.x + c * corner.y) * aCard.x;
  vec4 view = modelViewMatrix * vec4(center, 1.0);
  view.xy += turned;
  gl_Position = projectionMatrix * view;
  vLocal = corner;
  vCard = aCard;
  vLook = aLook;
}
`,
      w = `
precision highp float;

uniform sampler2D uAtlas;
uniform vec2 uGrid;
uniform float uInset;
uniform float uShadow;
uniform vec3 uAccent;
uniform float uLoaded[64];
uniform float uMargin;
varying vec2 vLocal;
varying vec4 vCard;
varying vec4 vLook;

float roundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  float radius = clamp(vCard.z, 0.0, 1.0) * 0.5;
  float d = roundBox(vLocal, vec2(0.5), radius);
  float aa = fwidth(d) * 0.8;
  float card = 1.0 - smoothstep(-aa, aa, d);
  float lift = vLook.z;
  float c = cos(-vCard.y);
  float s = sin(-vCard.y);
  vec2 drop = vec2(c * 0.0 - s * (-1.0), s * 0.0 + c * (-1.0)) * (0.04 + 0.08 * lift);
  float softness = 0.1 + 0.18 * lift;
  float sd = roundBox(vLocal - drop, vec2(0.5 - softness * 0.3), radius);
  float shade = (1.0 - smoothstep(-softness, softness, sd)) * uShadow * (0.35 + 0.35 * lift) * vLook.y;
  float which = floor(vCard.w + 0.5);
  vec2 slot = vec2(mod(which, uGrid.x), floor(which / uGrid.x));
  vec2 uv = clamp(vLocal + 0.5, 0.0, 1.0);
  float inner = 1.0 - 2.0 * uInset;
  vec2 atlasUv = vec2(
    (slot.x + uInset + uv.x * inner) / uGrid.x,
    1.0 - (slot.y + uInset + (1.0 - uv.y) * inner) / uGrid.y
  );
  vec3 image = texture2D(uAtlas, atlasUv).rgb;
  vec3 placeholder = vec3(0.16, 0.15, 0.2);
  vec3 color = mix(placeholder, image, uLoaded[int(which)]) * vLook.x;
  float ring = (1.0 - smoothstep(0.0, aa * 2.0 + 0.012, abs(d + 0.012))) * vLook.w;
  color = mix(color, uAccent, ring * 0.9);
  float alpha = card * vLook.y;
  vec4 result = vec4(color * alpha, alpha);
  result += vec4(0.0, 0.0, 0.0, shade) * (1.0 - alpha);
  if (result.a < 0.002) discard;
  gl_FragColor = result;
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
uniform float uPlaneAspect;
uniform float uRadius;
uniform float uOpacity;
varying vec2 vUv;

float roundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uPlaneAspect, 1.0);
  float d = roundBox(p, vec2(uPlaneAspect, 1.0) * 0.5, uRadius);
  float aa = fwidth(d);
  float cover = 1.0 - smoothstep(-aa, aa, d);
  vec2 uv = vUv - 0.5;
  if (uPlaneAspect < uImageAspect) {
    uv.x *= uPlaneAspect / uImageAspect;
  } else {
    uv.y *= uImageAspect / uPlaneAspect;
  }
  vec3 color = texture2D(uImage, uv + 0.5).rgb;
  float alpha = cover * uOpacity;
  gl_FragColor = vec4(color * alpha, alpha);
}
`,
      S = (e, t, a, r, i, n) => {
        let o = (2 * Math.PI) / Math.max(i, 0.02),
          l = Math.max(1, Math.ceil(r / (1 / 120))),
          s = r / l,
          u = t,
          c = e;
        for (let e = 0; e < l; e++) {
          let e = o * o * (a - c) - 2 * n * o * u;
          ((u += e * s), (c += u * s));
        }
        return [c, u];
      },
      k = (0, i.forwardRef)(function (
        {
          items: e = h,
          count: t = 56,
          formations: a = ["orbits", "spiral", "sphere", "field"],
          interval: n = 6,
          autoplay: o = !0,
          transition: l = "gather",
          rings: k = 3,
          cardSize: z = 0,
          clearance: j = 0.36,
          spin: A = 1,
          shape: I = "auto",
          radius: E = 0.24,
          depth: P = 0,
          hoverScale: L = 1.2,
          shadow: F = 0.6,
          accentColor: O = "#B19EEF",
          backgroundColor: R = "transparent",
          openOnClick: q = !0,
          captions: U = !0,
          interactive: Y = !0,
          draggable: V = !0,
          pauseOnHover: X = !0,
          seed: B = 0,
          paused: G = !1,
          dpr: T = 2,
          ariaLabel:
            N = "Photo constellation. Drag to spin, click a photo to open it, use the arrow keys to change formation.",
          onFormationChange: W,
          onOpen: D,
          className: H,
          style: _,
          children: $,
        },
        K,
      ) {
        let Z = (0, i.useRef)(null),
          Q = (0, i.useRef)(null),
          J = (0, i.useRef)(null),
          ee = (0, i.useSyncExternalStore)(v, f, () => !1),
          [et, ea] = (0, i.useState)(-1),
          [er, ei] = (0, i.useState)(!1),
          en = e.length ? e : h,
          eo = (0, i.useRef)(en),
          el = {
            items: en,
            count: t,
            formations: a,
            interval: n,
            autoplay: o,
            transition: l,
            rings: k,
            cardSize: z,
            clearance: j,
            spin: A,
            shape: I,
            radius: E,
            depth: P,
            hoverScale: L,
            shadow: F,
            accentColor: O,
            backgroundColor: R,
            openOnClick: q,
            captions: U,
            interactive: Y,
            draggable: V,
            pauseOnHover: X,
            seed: B,
            paused: G,
            dpr: T,
            onFormationChange: W,
            onOpen: D,
            reduced: ee,
          },
          es = (0, i.useRef)(el);
        ((0, i.useEffect)(() => {
          ((es.current = el), (eo.current = en), J.current?.sync());
        }),
          (0, i.useEffect)(() => {
            let e = Z.current,
              t = Q.current;
            if (!e || !t) return;
            let a = ((e, t, a, r, i, n) => {
              let o,
                l = e.ownerDocument,
                c = l.createElement("canvas");
              c.style.cssText =
                "position:absolute;inset:0;width:100%;height:100%;display:block";
              try {
                o = new s.WebGLRenderer({
                  canvas: c,
                  alpha: !0,
                  antialias: !1,
                  premultipliedAlpha: !0,
                  powerPreference: "high-performance",
                });
              } catch {
                return null;
              }
              (t.appendChild(c), o.setClearColor(0, 0));
              let h = Array(64).fill(0),
                v = Array(64).fill(!1),
                f = {
                  uAtlas: { value: null },
                  uGrid: { value: new u.I9Y(1, 1) },
                  uInset: { value: 0.004 },
                  uShadow: { value: 0.6 },
                  uAccent: { value: new u.Q1f(0xb19eef) },
                  uLoaded: { value: h },
                  uMargin: { value: 1.6 },
                  uGroup: { value: new u.kn4() },
                },
                g = new u.BKk({
                  uniforms: f,
                  vertexShader: b,
                  fragmentShader: w,
                  transparent: !0,
                  premultipliedAlpha: !0,
                  depthTest: !1,
                  depthWrite: !1,
                }),
                x = new u.bdM(1, 1),
                y = new u.CmU();
              ((y.index = x.index),
                y.setAttribute("position", x.getAttribute("position")),
                y.setAttribute("uv", x.getAttribute("uv")));
              let k = new Float32Array(480),
                z = new Float32Array(640),
                j = new Float32Array(640),
                A = new u.uWO(k, 3),
                I = new u.uWO(z, 4),
                E = new u.uWO(j, 4);
              (A.setUsage(u.Vnu),
                I.setUsage(u.Vnu),
                E.setUsage(u.Vnu),
                y.setAttribute("aCenter", A),
                y.setAttribute("aCard", I),
                y.setAttribute("aLook", E),
                (y.instanceCount = 0));
              let P = new u.eaF(y, g);
              P.frustumCulled = !1;
              let L = {
                  uImage: { value: null },
                  uImageAspect: { value: 1 },
                  uPlaneAspect: { value: 1 },
                  uRadius: { value: 0.1 },
                  uOpacity: { value: 1 },
                },
                F = new u.BKk({
                  uniforms: L,
                  vertexShader: M,
                  fragmentShader: C,
                  transparent: !0,
                  premultipliedAlpha: !0,
                  depthTest: !1,
                  depthWrite: !1,
                }),
                O = new u.bdM(1, 1),
                R = new u.eaF(O, F);
              ((R.frustumCulled = !1), (R.renderOrder = 2), (R.visible = !1));
              let q = new u.Z58();
              q.add(P, R);
              let U = new u.ubm(30, 1, 1, 1e4),
                Y = null,
                V = null,
                X = [],
                B = new Map(),
                G = "",
                T = "",
                N = 1,
                W = 1,
                D = 1,
                H = 1e3,
                _ = 60,
                $ = [],
                K = [],
                Z = [],
                Q = [],
                J = [],
                ee = 0,
                et = "orbits",
                ea = null,
                er = "",
                ei = 0,
                en = 0,
                eo = 0,
                el = 0,
                es = 0,
                eu = 0,
                ec = 0,
                ed = 0,
                eh = 0,
                ep = 0,
                em = !1,
                ev = !1,
                ef = !1,
                eg = 0,
                ex = 0,
                ey = 0,
                eb = "",
                ew = { value: 1, velocity: 0 },
                eM = { value: 0, velocity: 0 },
                eC = { value: 0, velocity: 0 },
                eS = { value: 0, velocity: 0 },
                ek = { x: 0, y: 0, clientX: 0, clientY: 0, inside: !1 },
                ez = -1,
                ej = -1,
                eA = null,
                eI = null,
                eE = [],
                eP = () => {
                  let e = a.current.formations.filter((e) =>
                    ["orbits", "spiral", "sphere", "field"].includes(e),
                  );
                  return e.length ? e : ["orbits"];
                },
                eL = () => {
                  let e = r.current.slice(0, 64),
                    t = e.map((e) => e.src).join("\0");
                  if (t === G) return;
                  ((G = t),
                    B.forEach((e) => e.dispose()),
                    B.clear(),
                    V?.dispose(),
                    h.fill(0),
                    v.fill(!1));
                  let a = Math.max(e.length, 1),
                    i = a <= 16 ? 320 : a <= 36 ? 256 : 192,
                    n = Math.ceil(Math.sqrt(a)),
                    s = Math.ceil(a / n),
                    c = l.createElement("canvas");
                  ((c.width = n * i), (c.height = s * i), (Y = c));
                  let d = c.getContext("2d");
                  (((V = new u.GOR(c)).colorSpace = u.jf0),
                    (V.minFilter = u.$_I),
                    (V.magFilter = u.k6q),
                    (V.generateMipmaps = !0),
                    (V.anisotropy = o.capabilities.getMaxAnisotropy()),
                    (f.uAtlas.value = V),
                    f.uGrid.value.set(n, s),
                    (f.uInset.value = 1.5 / i),
                    (X = e.map((e, t) => {
                      let a = new Image();
                      return (
                        (a.crossOrigin = "anonymous"),
                        (a.decoding = "async"),
                        (a.onload = () => {
                          if (ev || Y !== c || !d) return;
                          let e = Math.min(a.naturalWidth, a.naturalHeight),
                            r = (a.naturalWidth - e) / 2,
                            o = (a.naturalHeight - e) * 0.35;
                          (d.drawImage(
                            a,
                            r,
                            o,
                            e,
                            e,
                            (t % n) * i,
                            Math.floor(t / n) * i,
                            i,
                            i,
                          ),
                            V && (V.needsUpdate = !0),
                            (v[t] = !0),
                            eB());
                        }),
                        (a.src = e.src),
                        a
                      );
                    })));
                },
                eF = () => {
                  let t,
                    i = a.current,
                    n = e.getBoundingClientRect(),
                    l = Math.min(
                      window.devicePixelRatio || 1,
                      Math.max(i.dpr, 0.5),
                    ),
                    s = Math.max(1, Math.round(n.width)),
                    c = Math.max(1, Math.round(n.height)),
                    h = p(Math.round(i.count), 4, 160),
                    m = [
                      s,
                      c,
                      l,
                      h,
                      i.rings,
                      i.cardSize,
                      i.clearance,
                      i.seed,
                      r.current.length,
                    ].join("|");
                  if (m === T) return !1;
                  ((T = m),
                    (N = s),
                    (W = c),
                    (D = l),
                    o.setPixelRatio(D),
                    o.setSize(N, W, !1),
                    (U.aspect = N / W),
                    (U.fov = 30),
                    (U.near =
                      0.05 * (H = W / 2 / Math.tan(u.cj9.degToRad(15)))),
                    (U.far = 4 * H),
                    U.position.set(0, 0, H),
                    U.lookAt(0, 0, 0),
                    U.updateProjectionMatrix(),
                    U.updateMatrixWorld());
                  let v = Math.min(N, W);
                  _ = i.cardSize > 0 ? i.cardSize : p(0.085 * v, 30, 96);
                  let f = p(i.clearance, 0, 0.9),
                    g =
                      ((t =
                        Math.imul(
                          Math.floor(97 * i.seed + 3) + 11,
                          0x9e3779b1,
                        ) >>> 0 || 1),
                      () => (
                        (t ^= t << 13),
                        (t ^= t >>> 17),
                        (t ^= t << 5),
                        (t >>>= 0) / 0x100000000
                      )),
                    x = Math.max(1, Math.min(r.current.length, 64)),
                    y = p(Math.round(i.rings), 1, 6),
                    b = Math.max(0.5 * v * f + 0.55 * _, 1.2 * _),
                    w = Math.max(0.5 * v - 0.62 * _, b + 0.8 * _),
                    M = Array.from({ length: y }, (e, t) =>
                      1 === y ? (b + w) / 2 : b + ((w - b) * t) / (y - 1),
                    ),
                    C = M.reduce((e, t) => e + t, 0),
                    S = M.map((e) => Math.max(3, Math.round((h * e) / C))),
                    k = h - S.reduce((e, t) => e + t, 0);
                  for (let e = y - 1; 0 !== k; e = (e + y - 1) % y)
                    k > 0
                      ? ((S[e] += 1), (k -= 1))
                      : S[e] > 3 && ((S[e] -= 1), (k += 1));
                  ((K = []),
                    M.forEach((e, t) => {
                      let a = S[t],
                        r = Math.min(_, ((2 * Math.PI * e) / a) * 1.02);
                      for (let i = 0; i < a; i++)
                        K.push({
                          ring: t,
                          angle:
                            (2 * Math.PI * i) / a + (t % 2 ? Math.PI / a : 0),
                          radius: e,
                          size: r,
                          direction: t % 2 ? -1 : 1,
                        });
                    }));
                  let z = Math.max(0.5 * v * f, 0.6 * _),
                    j = Math.max(0.48 * v - 0.45 * _, z + _),
                    A = Math.sqrt((Math.PI * (j * j - z * z)) / h);
                  ((Z = Array.from({ length: h }, (e, t) => {
                    let a = (t + 0.5) / h;
                    return {
                      angle: t * d,
                      radius: z + (j - z) * Math.sqrt(a),
                      size: Math.min(1.1 * _, A * (0.54 + 0.3 * Math.sqrt(a))),
                      spin: 1,
                    };
                  })),
                    (Q = Array.from({ length: h }, (e, t) => {
                      let a = 1 - (2 * (t + 0.5)) / h,
                        r = Math.sqrt(Math.max(0, 1 - a * a)),
                        i = t * d;
                      return { x: Math.cos(i) * r, y: a, z: Math.sin(i) * r };
                    })));
                  let I = N / W,
                    E = Math.max(3, Math.round(Math.sqrt(1.35 * h * I))),
                    P = [];
                  for (let e = 0; e < 8; e++) {
                    let e = Math.max(3, Math.round(E / I)),
                      t = (1.08 * N) / E,
                      a = (1.08 * W) / e;
                    P = [];
                    for (let r = 0; r < e; r++)
                      for (let e = 0; e < E; e++) {
                        let i =
                            (e + 0.5) * t -
                            0.54 * N +
                            (r % 2 ? 0.25 * t : -(0.25 * t)),
                          n = (r + 0.5) * a - 0.54 * W,
                          o = i / (0.5 * N * f + 0.6 * _),
                          l = n / (0.5 * W * f + 0.6 * _);
                        (f > 0 && o * o + l * l < 1) || P.push({ x: i, y: n });
                      }
                    if (P.length >= h) break;
                    E += 1;
                  }
                  for (let e = P.length - 1; e > 0; e--) {
                    let t = Math.floor(g() * (e + 1));
                    [P[e], P[t]] = [P[t], P[e]];
                  }
                  let L = P.slice(0, h),
                    F = Math.sqrt((N * W) / Math.max(1.35 * L.length, 1));
                  J = L.map((e) => ({
                    x: e.x + (g() - 0.5) * F * 0.35,
                    y: e.y + (g() - 0.5) * F * 0.35,
                    size: p(0.6 * F, 28, 1.3 * _),
                    phase: g() * Math.PI * 2,
                  }));
                  let O = $;
                  if (
                    ((eE = ($ = Array.from({ length: h }, (e, t) => {
                      let a = O[t];
                      return {
                        x: a?.x ?? 0,
                        y: a?.y ?? 0,
                        z: a?.z ?? 0,
                        vx: a?.vx ?? 0,
                        vy: a?.vy ?? 0,
                        vz: a?.vz ?? 0,
                        size: a?.size ?? 0,
                        sizeV: 0,
                        rotation: a?.rotation ?? (g() - 0.5) * 2,
                        rotationV: 0,
                        round: a?.round ?? 0.3,
                        roundV: 0,
                        shade: 1,
                        lift: 0,
                        liftV: 0,
                        image: (7 * t + Math.floor(t / x)) % x,
                        jitter: g() - 0.5,
                        stiffness: 0.85 + 0.3 * g(),
                        switchAt: 0,
                        gatherUntil: 0,
                        gx: (g() - 0.5) * _ * 0.9,
                        gy: (g() - 0.5) * _ * 0.9,
                        kicked: !0,
                        depth: 0,
                        holdX: 0,
                        holdY: 0,
                      };
                    })).map((e, t) => t)),
                    !O.length)
                  ) {
                    let e = eR(et);
                    $.forEach((t, a) => {
                      let r = e(a);
                      if (i.reduced) {
                        ((t.x = r.x),
                          (t.y = r.y),
                          (t.z = r.z),
                          (t.size = r.size),
                          (t.rotation = r.rotation),
                          (t.round = r.round),
                          (t.switchAt = 0));
                        return;
                      }
                      let n = Math.atan2(r.y, r.x);
                      ((t.x = Math.cos(n) * _ * 0.4),
                        (t.y = Math.sin(n) * _ * 0.4),
                        (t.z = 0),
                        (t.size = 0),
                        (t.rotation = r.rotation + t.jitter),
                        (t.round = r.round),
                        (t.switchAt = ey + (a / h) * 0.6));
                    });
                  }
                  return !0;
                },
                eO = (e) => {
                  let t = a.current,
                    r = p(t.radius, 0, 1);
                  return "square" === t.shape
                    ? Math.min(r, 0.08)
                    : "rounded" === t.shape
                      ? r
                      : "circle" === t.shape || "sphere" === e || "field" === e
                        ? 1
                        : "spiral" === e
                          ? Math.max(r, 0.5)
                          : r;
                };
              function eR(e) {
                let t = a.current,
                  r = eO(e),
                  i = t.reduced ? 0 : p(t.spin, -4, 4),
                  n = Math.min(N, W);
                if ("orbits" === e)
                  return (e) => {
                    let t = K[e] ?? K[0],
                      a =
                        t.angle +
                        t.direction *
                          (en * i * (90 / Math.max(t.radius, 1)) + eo);
                    return {
                      x: Math.cos(a) * t.radius,
                      y: Math.sin(a) * t.radius,
                      z: 0,
                      size: t.size,
                      rotation: a + Math.PI / 2 + 0.35 * $[e].jitter,
                      round: r,
                      shade: 1,
                    };
                  };
                if ("spiral" === e)
                  return (e) => {
                    let t = Z[e] ?? Z[0],
                      a = t.angle + en * i * 0.22 * t.spin + eo;
                    return {
                      x: Math.cos(a) * t.radius,
                      y: Math.sin(a) * t.radius,
                      z: 0,
                      size: t.size,
                      rotation: a + Math.PI / 2 + 0.2 * $[e].jitter,
                      round: r,
                      shade: 1,
                    };
                  };
                if ("sphere" === e) {
                  let e = 0.34 * n,
                    t = en * i * 0.28 + el,
                    a = 0.32 + es,
                    o = Math.cos(t),
                    l = Math.sin(t),
                    s = Math.cos(a),
                    u = Math.sin(a);
                  return (t) => {
                    let a = Q[t] ?? Q[0],
                      i = a.x * o + a.z * l,
                      n = -a.x * l + a.z * o,
                      c = a.y * s - n * u,
                      d = a.y * u + n * s,
                      h = 0.5 * d + 0.5;
                    return {
                      x: i * e,
                      y: c * e,
                      z: d * e * 1.5,
                      size: 0.8 * _ * (0.72 + 0.4 * h),
                      rotation: 0.3 * $[t].jitter,
                      round: r,
                      shade: 0.34 + 0.66 * h,
                    };
                  };
                }
                return (e) => {
                  let a = J[e] ?? J[0],
                    i = +!t.reduced,
                    n = 0.35 * en + a.phase,
                    o = a.x + eu + Math.sin(n) * a.size * 0.18 * i,
                    l = a.y + Math.cos(0.8 * n) * a.size * 0.18 * i,
                    s = 1.08 * N;
                  return {
                    x: (o = ((((o + s / 2) % s) + s) % s) - s / 2),
                    y: l,
                    z: 0,
                    size: a.size,
                    rotation: 0.25 * $[e].jitter + 0.06 * Math.sin(0.6 * n) * i,
                    round: r,
                    shade: 1,
                  };
                };
              }
              let eq = (e) => {
                  let t = eP(),
                    r = ((e % t.length) + t.length) % t.length;
                  if (t[r] === et && ei > 0) {
                    ee = r;
                    return;
                  }
                  ((ea = et), (et = t[r]), (ee = r), (ei = 0));
                  let i = a.current,
                    o = $.length,
                    l = i.reduced ? "direct" : i.transition;
                  ($.map((e, t) => ({ i: t, a: Math.atan2(e.y, e.x) }))
                    .sort((e, t) => e.a - t.a)
                    .forEach(({ i: e }, t) => {
                      let a = $[e],
                        r = i.reduced ? 0 : (t / o) * 0.55;
                      ((a.switchAt = ey + r),
                        (a.gatherUntil =
                          "gather" === l ? a.switchAt + 0.34 : 0),
                        (a.kicked = "swirl" !== l));
                    }),
                    n(r),
                    eB());
                },
                eU = (e, t, a) => {
                  let r = new u.Pq0(e, t, a).applyMatrix4(f.uGroup.value),
                    i = H / Math.max(H - r.z, 1);
                  return {
                    sx: N / 2 + r.x * i,
                    sy: W / 2 - r.y * i,
                    scale: i,
                    z: r.z,
                  };
                },
                eY = (t, a) => {
                  let r = e.getBoundingClientRect(),
                    i = t - r.left,
                    n = a - r.top;
                  for (let e = eE.length - 1; e >= 0; e--) {
                    let t = eE[e],
                      a = $[t];
                    if (a.size < 4) continue;
                    let r = eU(a.x, a.y, a.z),
                      o = (a.size * r.scale) / 2,
                      l = i - r.sx,
                      s = -(n - r.sy),
                      u = Math.cos(-a.rotation),
                      c = Math.sin(-a.rotation),
                      d = u * l - c * s,
                      h = c * l + u * s;
                    if (Math.abs(d) <= o && Math.abs(h) <= o) {
                      let e = p(a.round, 0, 1) * o,
                        r = Math.max(Math.abs(d) - o + e, 0),
                        i = Math.max(Math.abs(h) - o + e, 0);
                      if (r * r + i * i <= e * e || 0 === e) return t;
                    }
                  }
                  return -1;
                },
                eV = (e) => {
                  let t = X[e];
                  if (!t || !t.complete || !t.naturalWidth || B.has(e)) return;
                  let a = new u.gPd(t);
                  ((a.colorSpace = u.jf0),
                    (a.minFilter = u.$_I),
                    (a.magFilter = u.k6q),
                    (a.generateMipmaps = !0),
                    (a.anisotropy = o.capabilities.getMaxAnisotropy()),
                    (a.needsUpdate = !0),
                    B.set(e, a),
                    o.initTexture(a));
                },
                eX = () => {
                  eA && 0 !== eA.target && ((eA.target = 0), i(-1), eB());
                },
                eB = () => {
                  ev || ef || !em || eg || (eg = requestAnimationFrame(eG));
                };
              function eG(t) {
                if (((eg = 0), ev || ef)) return;
                let r = a.current,
                  i = ex ? Math.min(Math.max((t - ex) / 1e3, 0), 0.05) : 1 / 60;
                ex = t;
                let n = r.reduced;
                (() => {
                  let e = a.current.accentColor;
                  if (e === eb) return;
                  eb = e;
                  try {
                    f.uAccent.value.set(e);
                  } catch {
                    f.uAccent.value.set(0xb19eef);
                  }
                  let t = { r: 0, g: 0, b: 0 };
                  (f.uAccent.value.getRGB(t, u.er$),
                    f.uAccent.value.setRGB(t.r, t.g, t.b));
                })();
                let l = eP();
                ee >= l.length && (ee = 0);
                let s = et;
                if (((ey += i), ek.inside && !eI && !eA && r.interactive)) {
                  let t = eY(ek.clientX, ek.clientY);
                  (t !== ez &&
                    ((ez = t),
                    (e.style.cursor =
                      t >= 0 && r.openOnClick
                        ? "pointer"
                        : r.draggable
                          ? "grab"
                          : ""),
                    t >= 0 && eV($[t].image)),
                    t !== ej &&
                      (ej = t) >= 0 &&
                      (($[ej].holdX = $[ej].x), ($[ej].holdY = $[ej].y)));
                } else eA || (ej = -1);
                let c = r.pauseOnHover && ej >= 0,
                  d = !r.paused && !n,
                  g = S(
                    ew.value,
                    ew.velocity,
                    c || eA ? 0 : 1,
                    i,
                    c || eA ? 0.25 : 0.9,
                    1,
                  );
                ((ew.value = g[0]),
                  (ew.velocity = g[1]),
                  d && (en += i * Math.max(ew.value, 0)),
                  d &&
                    r.autoplay &&
                    l.length > 1 &&
                    !eA &&
                    !c &&
                    !eI &&
                    (ei += i) >= Math.max(r.interval, 1.5) &&
                    eq(ee + 1));
                let x = Math.exp(-(2.2 * i));
                (eI && eI.moved) ||
                  ((eo += ec * i),
                  (el += ed * i),
                  (es = p(es + eh * i, -0.9, 0.9)),
                  (eu += ep * i),
                  (ec *= x),
                  (ed *= x),
                  (eh *= x),
                  (ep *= x),
                  (es *= Math.exp(-(0.8 * i))));
                let b = n ? 0 : p(r.depth, 0, 3),
                  w = ek.inside ? ek.x : 0,
                  M = ek.inside ? ek.y : 0,
                  C = S(eM.value, eM.velocity, 0.16 * w * b, i, 1.2, 1);
                ((eM.value = C[0]), (eM.velocity = C[1]));
                let P = S(eC.value, eC.velocity, -(0.12 * M) * b, i, 1.2, 1);
                ((eC.value = P[0]), (eC.velocity = P[1]));
                let F = f.uGroup.value;
                (F.makeRotationFromEuler(
                  new u.O9p(eC.value, eM.value, 0, "XYZ"),
                ),
                  ([eS.value, eS.velocity] = S(
                    eS.value,
                    eS.velocity,
                    eA ? eA.target : 0,
                    i,
                    n ? 0.15 : 0.75,
                    1,
                  )));
                let O = eR(s),
                  Y = ea ? eR(ea) : null,
                  V = eO(s),
                  X = 1.08 * N,
                  B = d || Math.abs(eS.velocity) > 0.001;
                for (let e = 0; e < $.length; e++) {
                  let t,
                    a = $[e];
                  if (ey < a.switchAt) {
                    if (!Y) continue;
                    t = Y(e);
                  } else if (ey < a.gatherUntil)
                    t = {
                      x: a.gx,
                      y: a.gy,
                      z: 0,
                      size: 0.72 * _,
                      rotation: a.rotation,
                      round: V,
                      shade: 1,
                    };
                  else if (
                    ((t = O(e)),
                    "field" === s &&
                      Math.abs(t.x - a.x) > X / 2 &&
                      (a.x += Math.sign(t.x - a.x) * X),
                    !a.kicked)
                  ) {
                    let e = t.x - a.x,
                      r = t.y - a.y,
                      i = Math.hypot(e, r) || 1;
                    ((a.vx += (-r / i) * i * 1.4),
                      (a.vy += (e / i) * i * 1.4),
                      (a.kicked = !0));
                  }
                  let n = t.x,
                    o = t.y;
                  if (
                    (e === ej &&
                      ey >= a.switchAt &&
                      ((n = a.holdX), (o = a.holdY)),
                    eS.value > 0.001 && eA && e !== eA.card)
                  ) {
                    let e = 1 + 0.12 * eS.value;
                    ((n *= e), (o *= e));
                  }
                  let l = 0.78 / a.stiffness;
                  (([a.x, a.vx] = S(a.x, a.vx, n, i, l, 0.82)),
                    ([a.y, a.vy] = S(a.y, a.vy, o, i, l, 0.82)),
                    ([a.z, a.vz] = S(a.z, a.vz, t.z, i, l, 0.9)));
                  let u = +(e === ej);
                  [a.lift, a.liftV] = S(a.lift, a.liftV, u, i, 0.55, 0.8);
                  let c =
                    t.size *
                    (1 + (p(r.hoverScale, 1, 3) - 1) * Math.max(a.lift, 0));
                  [a.size, a.sizeV] = S(a.size, a.sizeV, c, i, 0.6, 0.85);
                  let d = m(t.rotation - a.rotation);
                  (([a.rotation, a.rotationV] = S(
                    a.rotation,
                    a.rotationV,
                    a.rotation + d,
                    i,
                    0.7,
                    0.9,
                  )),
                    ([a.round, a.roundV] = S(
                      a.round,
                      a.roundV,
                      t.round,
                      i,
                      0.8,
                      1,
                    )),
                    (a.shade =
                      t.shade *
                      (1 - 0.62 * eS.value * (eA && e === eA.card ? 0 : 1))),
                    (Math.abs(a.vx) + Math.abs(a.vy) + Math.abs(a.vz) > 0.05 ||
                      Math.abs(a.sizeV) > 0.05 ||
                      Math.abs(a.rotationV) > 0.002) &&
                      (B = !0));
                }
                for (let e = 0; e < 64; e++)
                  v[e] &&
                    h[e] < 1 &&
                    ((h[e] = n ? 1 : Math.min(1, h[e] + i / 0.5)), (B = !0));
                eE = $.map((e, t) => t);
                let G = Math.max(0.2 * _, 1),
                  T = $.map(
                    (e, t) =>
                      Math.round(e.z / G) + 1e4 * (e.lift > 0.02) + 1e-4 * t,
                  );
                eE.sort((e, t) => T[e] - T[t]);
                let D = eA ? eA.card : -1;
                if (
                  (eE.forEach((e, t) => {
                    let a = $[e];
                    ((k[3 * t] = a.x),
                      (k[3 * t + 1] = a.y),
                      (k[3 * t + 2] = a.z),
                      (z[4 * t] = Math.max(a.size, 0)),
                      (z[4 * t + 1] = a.rotation),
                      (z[4 * t + 2] = a.round),
                      (z[4 * t + 3] = a.image),
                      (j[4 * t] = a.shade),
                      (j[4 * t + 1] = +(e !== D)),
                      (j[4 * t + 2] = Math.max(a.lift, 0)),
                      (j[4 * t + 3] =
                        Math.max(a.lift, 0) * (r.openOnClick ? 1 : 0.6)));
                  }),
                  (y.instanceCount = $.length),
                  (A.needsUpdate = !0),
                  (I.needsUpdate = !0),
                  (E.needsUpdate = !0),
                  (f.uShadow.value = p(r.shadow, 0, 1)),
                  eA)
                ) {
                  let e = $[eA.card],
                    t = p(eS.value, 0, 1),
                    a = new u.Pq0(e.x, e.y, e.z).applyMatrix4(F),
                    r = L.uImageAspect.value;
                  [eA.aspect, eA.aspectV] = S(
                    eA.aspect,
                    eA.aspectV,
                    eA.target ? r : 1,
                    i,
                    0.8,
                    1,
                  );
                  let n = Math.min(0.62 * W, (0.7 * N) / r),
                    o = p(eA.aspect, Math.min(1, r), Math.max(1, r)),
                    l = Math.max(e.size, 1),
                    s = (l + (Math.sqrt(n * n * r) - l) * t) / Math.sqrt(o);
                  (R.position.set(
                    a.x * (1 - t),
                    a.y * (1 - t) + 0.035 * W * t,
                    a.z * (1 - t) + 40 * t,
                  ),
                    R.rotation.set(0, 0, e.rotation * (1 - t)),
                    R.scale.set(s * o, s, 1),
                    (R.visible = !0),
                    (L.uPlaneAspect.value = o));
                  let c = 0.5 * p(e.round, 0, 1);
                  ((L.uRadius.value = c + (0.035 - c) * t),
                    0 === eA.target &&
                      t < 0.002 &&
                      0.02 > Math.abs(eS.velocity) &&
                      ((eA = null),
                      (R.visible = !1),
                      (eS.value = 0),
                      (eS.velocity = 0)),
                    (B = !0));
                }
                (o.render(q, U), (B || ek.inside) && eB());
              }
              let eT = (t) => {
                  let r = a.current;
                  if (!r.interactive || eA || eI) {
                    ((ez = -1), (e.style.cursor = eI?.moved ? "grabbing" : ""));
                    return;
                  }
                  ((ez = eY(t.clientX, t.clientY)),
                    (e.style.cursor =
                      ez >= 0 && r.openOnClick
                        ? "pointer"
                        : r.draggable
                          ? "grab"
                          : ""));
                },
                eN = (t) => {
                  if ("touch" !== t.pointerType) {
                    let a;
                    ((ek.inside = !0),
                      (ek.clientX = t.clientX),
                      (ek.clientY = t.clientY),
                      (a = e.getBoundingClientRect()),
                      (ek.x = p(
                        ((t.clientX - a.left) / a.width) * 2 - 1,
                        -1.2,
                        1.2,
                      )),
                      (ek.y = p(
                        -(((t.clientY - a.top) / a.height) * 2 - 1),
                        -1.2,
                        1.2,
                      )));
                  }
                  if (eI && eI.id === t.pointerId) {
                    let r = t.clientX - eI.lastX,
                      i = t.clientY - eI.lastY;
                    if (
                      (!eI.moved &&
                        Math.hypot(t.clientX - eI.x, t.clientY - eI.y) > 6 &&
                        ((eI.moved = !0),
                        (ez = -1),
                        (ej = -1),
                        (e.style.cursor = "grabbing")),
                      eI.moved && a.current.draggable && !eA)
                    ) {
                      eW(et, r, i, t.clientX, t.clientY, 1);
                      let e = performance.now();
                      for (
                        eI.samples.push({ t: e, dx: r, dy: i });
                        eI.samples.length && e - eI.samples[0].t > 100;
                      )
                        eI.samples.shift();
                    }
                    ((eI.lastX = t.clientX), (eI.lastY = t.clientY));
                  } else "touch" !== t.pointerType && eT(t);
                  eB();
                },
                eW = (t, a, r, i, n, o) => {
                  let l = e.getBoundingClientRect();
                  if ("sphere" === t)
                    ((el += (a / Math.max(N, 1)) * 3.2 * o),
                      (es = p(es + (r / Math.max(W, 1)) * 2.2 * o, -0.9, 0.9)));
                  else if ("field" === t) eu += a * o;
                  else {
                    let e = i - l.left - N / 2,
                      t = -(n - l.top - W / 2),
                      s = Math.max(Math.hypot(e, t), _);
                    eo += ((-t * a + -(e * r)) / s / s) * o;
                  }
                },
                eD = (e) => {
                  if (a.current.interactive && e.isPrimary && !(e.button > 0)) {
                    if (
                      ((eI = {
                        id: e.pointerId,
                        x: e.clientX,
                        y: e.clientY,
                        lastX: e.clientX,
                        lastY: e.clientY,
                        moved: !1,
                        samples: [],
                      }),
                      (ec = 0),
                      (ed = 0),
                      (eh = 0),
                      (ep = 0),
                      "touch" !== e.pointerType)
                    )
                      try {
                        t.setPointerCapture(e.pointerId);
                      } catch {}
                    eB();
                  }
                },
                eH = (e, r) => {
                  if (!eI || eI.id !== e.pointerId) return;
                  let n = a.current,
                    o = eI;
                  eI = null;
                  try {
                    t.hasPointerCapture(e.pointerId) &&
                      t.releasePointerCapture(e.pointerId);
                  } catch {}
                  if (o.moved) {
                    let t = performance.now(),
                      a = o.samples.filter((e) => t - e.t < 100);
                    if (a.length > 1 && n.draggable && !eA) {
                      let t = Math.max(
                          (a[a.length - 1].t - a[0].t) / 1e3,
                          1 / 60,
                        ),
                        r = a.reduce((e, t) => e + t.dx, 0) / t,
                        i = a.reduce((e, t) => e + t.dy, 0) / t,
                        n = eo,
                        o = el,
                        l = es,
                        s = eu;
                      (eW(et, r, i, e.clientX, e.clientY, 1),
                        (ec = p(eo - n, -8, 8)),
                        (ed = p(el - o, -8, 8)),
                        (eh = p(es - l, -4, 4)),
                        (ep = p(eu - s, -4e3, 4e3)),
                        (eo = n),
                        (el = o),
                        (es = l),
                        (eu = s));
                    }
                  } else if (!r) {
                    if (eA) eX();
                    else if (n.openOnClick) {
                      let t = eY(e.clientX, e.clientY);
                      t >= 0 &&
                        ((e) => {
                          let t = $[e],
                            a = X[t.image];
                          if (!a || !a.complete || !a.naturalWidth) return;
                          eV(t.image);
                          let r = B.get(t.image);
                          r &&
                            ((L.uImage.value = r),
                            (L.uImageAspect.value =
                              a.naturalWidth / a.naturalHeight),
                            (eA = {
                              card: e,
                              target: 1,
                              aspect: 1,
                              aspectV: 0,
                            }),
                            (ez = -1),
                            (ej = -1),
                            i(t.image),
                            eB());
                        })(t);
                    }
                  }
                  ("touch" !== e.pointerType && eT(e), eB());
                },
                e_ = (e) => eH(e, !1),
                e$ = (e) => eH(e, !0),
                eK = (t) => {
                  (eI && eI.id === t.pointerId) ||
                    ((ek.inside = !1),
                    (ez = -1),
                    (ej = -1),
                    (e.style.cursor = ""),
                    eB());
                },
                eZ = (e) => {
                  "Escape" === e.key
                    ? eX()
                    : "ArrowRight" === e.key
                      ? (e.preventDefault(), eq(ee + 1))
                      : "ArrowLeft" === e.key &&
                        (e.preventDefault(), eq(ee - 1));
                };
              (t.addEventListener("pointerdown", eD),
                t.addEventListener("pointermove", eN),
                t.addEventListener("pointerup", e_),
                t.addEventListener("pointercancel", e$),
                t.addEventListener("pointerleave", eK),
                e.addEventListener("keydown", eZ));
              let eQ = new ResizeObserver(() => {
                eF() && eB();
              });
              eQ.observe(e);
              let eJ =
                "undefined" == typeof IntersectionObserver
                  ? null
                  : new IntersectionObserver(
                      ([e]) => {
                        (em = e.isIntersecting)
                          ? ((ex = 0), eB())
                          : eg && (cancelAnimationFrame(eg), (eg = 0));
                      },
                      { rootMargin: "80px" },
                    );
              eJ ? eJ.observe(e) : (em = !0);
              let e0 = (e) => {
                  (e.preventDefault(),
                    (ef = !0),
                    eg && cancelAnimationFrame(eg),
                    (eg = 0));
                },
                e1 = () => {
                  ((ef = !1), (G = ""), eL(), eB());
                };
              return (
                c.addEventListener("webglcontextlost", e0),
                c.addEventListener("webglcontextrestored", e1),
                (et = eP()[0]),
                (er = eP().join("|")),
                eL(),
                eF(),
                n(ee),
                (R.visible = !0),
                o.compile(q, U),
                (R.visible = !1),
                eB(),
                {
                  sync: () => {
                    (eL(), eF());
                    let e = eP(),
                      t = e.join("|");
                    (t !== er &&
                      ((er = t), e[0] === et ? ((ee = 0), (ei = 0)) : eq(0)),
                      eA && eA.card >= $.length && eX(),
                      eB());
                  },
                  next: (e) => eq(ee + e),
                  setFormation: (e) => {
                    let t = eP().indexOf(e);
                    t >= 0 && eq(t);
                  },
                  close: eX,
                  destroy: () => {
                    ((ev = !0),
                      eg && cancelAnimationFrame(eg),
                      eJ?.disconnect(),
                      eQ.disconnect(),
                      t.removeEventListener("pointerdown", eD),
                      t.removeEventListener("pointermove", eN),
                      t.removeEventListener("pointerup", e_),
                      t.removeEventListener("pointercancel", e$),
                      t.removeEventListener("pointerleave", eK),
                      e.removeEventListener("keydown", eZ),
                      (e.style.cursor = ""),
                      c.removeEventListener("webglcontextlost", e0),
                      c.removeEventListener("webglcontextrestored", e1),
                      X.forEach((e) => {
                        e.onload = null;
                      }),
                      B.forEach((e) => e.dispose()),
                      V?.dispose(),
                      x.dispose(),
                      y.dispose(),
                      O.dispose(),
                      g.dispose(),
                      F.dispose(),
                      o.dispose(),
                      o.getContext().isContextLost() || o.forceContextLoss(),
                      c.remove());
                  },
                }
              );
            })(
              e,
              t,
              es,
              eo,
              (e) => {
                ea(e);
                let t = e >= 0 ? (eo.current[e] ?? null) : null;
                es.current.onOpen?.(t, e);
              },
              (e) => {
                let t = es.current.formations[e];
                t && es.current.onFormationChange?.(t, e);
              },
            );
            if (!a) {
              let e = requestAnimationFrame(() => ei(!0));
              return () => cancelAnimationFrame(e);
            }
            return (
              (J.current = a),
              () => {
                (a.destroy(), (J.current = null));
              }
            );
          }, []),
          (0, i.useImperativeHandle)(
            K,
            () => ({
              next: () => J.current?.next(1),
              previous: () => J.current?.next(-1),
              setFormation: (e) => J.current?.setFormation(e),
              close: () => J.current?.close(),
            }),
            [],
          ));
        let eu = R.trim().toLowerCase(),
          ec = "transparent" === eu || "" === eu,
          ed = et >= 0 ? en[et] : null,
          eh =
            !ec &&
            ((e) => {
              let t = e.replace("#", "");
              if (!/^[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(t)) return !1;
              let a = 3 === t.length ? t.replace(/./g, (e) => e + e) : t;
              return (
                (0.2126 * Number.parseInt(a.slice(0, 2), 16) +
                  0.7152 * Number.parseInt(a.slice(2, 4), 16) +
                  0.0722 * Number.parseInt(a.slice(4, 6), 16)) /
                  255 >
                0.6
              );
            })(eu);
        return (0, r.jsxs)("div", {
          ref: Z,
          className: (0, c.cn)(
            "relative h-full min-h-[420px] w-full overflow-hidden",
            H,
          ),
          style: { backgroundColor: ec ? void 0 : R, ..._ },
          role: "region",
          "aria-roledescription": "gallery",
          "aria-label": N,
          tabIndex: 0,
          children: [
            (0, r.jsx)("div", { ref: Q, style: x }),
            er
              ? (0, r.jsx)("div", {
                  style: {
                    ...y,
                    gap: 10,
                    flexWrap: "wrap",
                    padding: 24,
                    alignContent: "center",
                  },
                  children: en
                    .slice(0, 12)
                    .map((e) =>
                      (0, r.jsx)(
                        "img",
                        {
                          src: e.src,
                          alt: e.alt,
                          style: {
                            width: 72,
                            height: 72,
                            objectFit: "cover",
                            borderRadius: 16,
                          },
                        },
                        e.src,
                      ),
                    ),
                })
              : null,
            (0, r.jsx)("ul", {
              style: g,
              children: en.map((e) =>
                (0, r.jsx)(
                  "li",
                  { children: e.title ? `${e.title}: ${e.alt}` : e.alt },
                  e.src,
                ),
              ),
            }),
            $
              ? (0, r.jsx)("div", {
                  style: {
                    ...y,
                    opacity: +!ed,
                    transition: "opacity 300ms ease",
                  },
                  children: (0, r.jsx)("div", {
                    style: { pointerEvents: ed ? "none" : "auto" },
                    children: $,
                  }),
                })
              : null,
            U
              ? (0, r.jsx)("div", {
                  "aria-live": "polite",
                  style: {
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: "7%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                    pointerEvents: "none",
                    opacity: +!!ed,
                    transform: ed ? "translateY(0)" : "translateY(6px)",
                    transition: ed
                      ? "opacity 420ms ease 320ms, transform 520ms cubic-bezier(0.22, 1, 0.36, 1) 320ms"
                      : "opacity 160ms ease, transform 160ms ease",
                    color: eh
                      ? "rgba(10, 10, 10, 0.92)"
                      : "rgba(255, 255, 255, 0.94)",
                    textAlign: "center",
                  },
                  children: ed
                    ? (0, r.jsxs)(r.Fragment, {
                        children: [
                          (0, r.jsx)("span", {
                            style: {
                              fontSize: 15,
                              fontWeight: 600,
                              lineHeight: 1.35,
                            },
                            children: ed.title ?? ed.alt,
                          }),
                          ed.subtitle
                            ? (0, r.jsx)("span", {
                                style: {
                                  fontSize: 13,
                                  opacity: 0.6,
                                  lineHeight: 1.35,
                                },
                                children: ed.subtitle,
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
    k.displayName = "ConstellationGallery";
    let z = {
        community: {
          formations: ["orbits", "spiral", "sphere", "field"],
          transition: "gather",
          count: 56,
          rings: 3,
          interval: 6,
          spin: 1,
          shape: "auto",
        },
        orbits: {
          formations: ["orbits"],
          transition: "gather",
          count: 60,
          rings: 2,
          interval: 6,
          spin: 1.2,
          shape: "rounded",
        },
        globe: {
          formations: ["sphere"],
          transition: "gather",
          count: 72,
          rings: 3,
          interval: 6,
          spin: 1,
          shape: "circle",
        },
        galaxy: {
          formations: ["spiral"],
          transition: "swirl",
          count: 84,
          rings: 3,
          interval: 6,
          spin: 1.2,
          shape: "auto",
        },
        drift: {
          formations: ["field"],
          transition: "direct",
          count: 30,
          rings: 3,
          interval: 6,
          spin: 0.5,
          shape: "circle",
        },
        showreel: {
          formations: ["sphere", "field", "spiral", "orbits"],
          transition: "swirl",
          count: 72,
          rings: 4,
          interval: 3.5,
          spin: 1.5,
          shape: "auto",
        },
      },
      j = [
        { label: "Community", value: "community" },
        { label: "Orbits", value: "orbits" },
        { label: "Globe", value: "globe" },
        { label: "Galaxy", value: "galaxy" },
        { label: "Drift", value: "drift" },
        { label: "Showreel", value: "showreel" },
      ],
      A = [
        { label: "Gather", value: "gather" },
        { label: "Swirl", value: "swirl" },
        { label: "Direct", value: "direct" },
      ],
      I = [
        { label: "Auto", value: "auto" },
        { label: "Square", value: "square" },
        { label: "Rounded", value: "rounded" },
        { label: "Circle", value: "circle" },
      ],
      E = [
        {
          name: "items",
          type: "{ src: string; alt: string; title?: string; subtitle?: string }[]",
          default: "studio portrait collection",
          description:
            "Images to place on the cards. They repeat when there are more cards than items. Images must allow cross-origin loading. Title and subtitle are shown as a caption when a card is opened.",
        },
        {
          name: "count",
          type: "number",
          default: "56",
          description: "Number of cards, up to 160.",
        },
        {
          name: "formations",
          type: '("orbits" | "spiral" | "sphere" | "field")[]',
          default: '["orbits", "spiral", "sphere", "field"]',
          description:
            "Formations to move through, in order: counter-rotating rings, a golden-angle spiral, a turning globe and a drifting field. Pass one to stay on it.",
        },
        {
          name: "interval",
          type: "number",
          default: "6",
          description:
            "Seconds spent in each formation before moving to the next.",
        },
        {
          name: "autoplay",
          type: "boolean",
          default: "true",
          description:
            "Move through the formations on a timer. The arrow keys and the ref still work when it is off.",
        },
        {
          name: "transition",
          type: '"gather" | "swirl" | "direct"',
          default: '"gather"',
          description:
            "How cards travel between formations: gathering into a cluster and bursting out, curving around the centre, or flying straight.",
        },
        {
          name: "rings",
          type: "number",
          default: "3",
          description: "Number of rings in the orbits formation.",
        },
        {
          name: "cardSize",
          type: "number",
          default: "0",
          description:
            "Base card size in pixels. 0 sizes the cards from the container.",
        },
        {
          name: "clearance",
          type: "number",
          default: "0.36",
          description:
            "Share of the container kept empty in the middle of the orbits, spiral and field formations, for a headline or call to action.",
        },
        {
          name: "spin",
          type: "number",
          default: "1",
          description: "Rotation and drift speed. Negative values reverse it.",
        },
        {
          name: "shape",
          type: '"auto" | "square" | "rounded" | "circle"',
          default: '"auto"',
          description:
            "Card shape. Auto uses rounded cards in the orbits and spiral and circles in the globe and field, morphing between them.",
        },
        {
          name: "radius",
          type: "number",
          default: "0.24",
          description: "Corner rounding of rounded cards, from 0 to 1.",
        },
        {
          name: "depth",
          type: "number",
          default: "0",
          description:
            "How far the whole group tilts toward the pointer. 0 keeps it flat.",
        },
        {
          name: "hoverScale",
          type: "number",
          default: "1.2",
          description:
            "Scale of the card under the pointer. It keeps its angle and holds still so it can be clicked.",
        },
        {
          name: "shadow",
          type: "number",
          default: "0.6",
          description: "Opacity of the soft shadow beneath each card.",
        },
        {
          name: "accentColor",
          type: "string",
          default: '"#B19EEF"',
          description:
            "Colour of the thin ring around the card under the pointer.",
        },
        {
          name: "backgroundColor",
          type: "string",
          default: '"transparent"',
          description:
            "Background of the component. Transparent shows the page behind.",
        },
        {
          name: "openOnClick",
          type: "boolean",
          default: "true",
          description:
            "Clicking a card enlarges it in the centre. Click again or press Escape to put it back.",
        },
        {
          name: "captions",
          type: "boolean",
          default: "true",
          description: "Show the title and subtitle of an opened card.",
        },
        {
          name: "interactive",
          type: "boolean",
          default: "true",
          description: "Enable the pointer lens, tilt, hover and clicking.",
        },
        {
          name: "draggable",
          type: "boolean",
          default: "true",
          description:
            "Dragging spins the rings, spiral and globe or pans the field, with inertia.",
        },
        {
          name: "pauseOnHover",
          type: "boolean",
          default: "true",
          description:
            "Stop the rotation and hold the current formation while the pointer is on a card.",
        },
        {
          name: "seed",
          type: "number",
          default: "0",
          description:
            "Changes the field layout and the small tilts of the cards.",
        },
        {
          name: "paused",
          type: "boolean",
          default: "false",
          description:
            "Stops rotation and the formation timer. Reduced-motion users always get this.",
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
          default: '"Photo constellation…"',
          description:
            "Accessible description of the gallery and how to use it.",
        },
        {
          name: "onFormationChange",
          type: "(formation, index) => void",
          default: "—",
          description:
            "Called when the group starts moving to a new formation.",
        },
        {
          name: "onOpen",
          type: "(item, index) => void",
          default: "—",
          description:
            "Called when a card is opened, with null and -1 when it is put back.",
        },
        {
          name: "ref",
          type: "{ next, previous, setFormation, close }",
          default: "—",
          description:
            "Imperative controls for stepping through formations and closing an opened card.",
        },
        {
          name: "children",
          type: "ReactNode",
          default: "—",
          description:
            "Content centred over the group, such as a headline. It fades out while a card is open.",
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
      P = () => {
        let [e, t] = (0, l.I)(),
          a = (0, o.Y)(),
          [s, u] = (0, i.useState)("community"),
          [c, d] = (0, i.useState)(z.community),
          h = (e) => (t) => d((a) => ({ ...a, [e]: t })),
          [p, m] = (0, i.useState)(null),
          v = p ?? ("dark" === a ? "#0A0A0A" : "#FFFFFF"),
          [f, g] = (0, i.useState)("#B19EEF"),
          [x, y] = (0, i.useState)(0),
          [b, w] = (0, i.useState)(0.36),
          [M, C] = (0, i.useState)(0.24),
          [S, P] = (0, i.useState)(0),
          [L, F] = (0, i.useState)(1.2),
          [O, R] = (0, i.useState)(0.6),
          [q, U] = (0, i.useState)(0),
          [Y, V] = (0, i.useState)(!0),
          [X, B] = (0, i.useState)(!0),
          [G, T] = (0, i.useState)(!0),
          [N, W] = (0, i.useState)(!0),
          [D, H] = (0, i.useState)(!0),
          [_, $] = (0, i.useState)(!0),
          [K, Z] = (0, i.useState)(!1),
          Q = c.formations.length > 1 ? "cycle" : c.formations[0];
        return (0, r.jsxs)("div", {
          children: [
            (0, r.jsx)(n.Bg, {}),
            (0, r.jsxs)(n.VX, {
              children: [
                (0, r.jsxs)(n.Ec, {
                  children: [
                    (0, r.jsx)(n.Ch, {
                      onRefresh: t,
                      minHeight: 600,
                      enableResponsive: !0,
                      children: (0, r.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, r.jsx)(
                          k,
                          {
                            count: c.count,
                            formations: c.formations,
                            interval: c.interval,
                            autoplay: Y,
                            transition: c.transition,
                            rings: c.rings,
                            cardSize: x,
                            clearance: b,
                            spin: c.spin,
                            shape: c.shape,
                            radius: M,
                            depth: S,
                            hoverScale: L,
                            shadow: O,
                            accentColor: f,
                            backgroundColor: v,
                            openOnClick: X,
                            captions: G,
                            interactive: N,
                            draggable: D,
                            pauseOnHover: _,
                            seed: q,
                            paused: K,
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
                          options: j,
                          onChange: (e) => {
                            (u(e), d(z[e] ?? z.community));
                          },
                        }),
                        (0, r.jsx)(n.bg, {
                          title: "Formation",
                          value: Q,
                          options: [
                            { label: "Cycle", value: "cycle" },
                            { label: "Orbits", value: "orbits" },
                            { label: "Spiral", value: "spiral" },
                            { label: "Sphere", value: "sphere" },
                            { label: "Field", value: "field" },
                          ],
                          onChange: (e) =>
                            h("formations")(
                              "cycle" === e
                                ? ["orbits", "spiral", "sphere", "field"]
                                : [e],
                            ),
                        }),
                        (0, r.jsx)(n.bg, {
                          title: "Transition",
                          value: c.transition,
                          options: A,
                          onChange: (e) => h("transition")(e),
                        }),
                        (0, r.jsx)(n.bg, {
                          title: "Shape",
                          value: c.shape,
                          options: I,
                          onChange: (e) => h("shape")(e),
                        }),
                        (0, r.jsx)(n.W7, {
                          title: "Accent",
                          value: f,
                          onChange: g,
                        }),
                        (0, r.jsx)(n.W7, {
                          title: "Background",
                          value: v,
                          onChange: m,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Count",
                          min: 12,
                          max: 140,
                          step: 1,
                          value: c.count,
                          onChange: h("count"),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Rings",
                          min: 1,
                          max: 6,
                          step: 1,
                          value: c.rings,
                          onChange: h("rings"),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Interval",
                          min: 2,
                          max: 15,
                          step: 0.5,
                          value: c.interval,
                          valueUnit: "s",
                          onChange: h("interval"),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Spin",
                          min: -3,
                          max: 3,
                          step: 0.05,
                          value: c.spin,
                          onChange: h("spin"),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Card Size",
                          min: 0,
                          max: 140,
                          step: 1,
                          value: x,
                          valueUnit: "px",
                          onChange: y,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Clearance",
                          min: 0,
                          max: 0.7,
                          step: 0.01,
                          value: b,
                          onChange: w,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Radius",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: M,
                          onChange: C,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Depth",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: S,
                          onChange: P,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Hover Scale",
                          min: 1,
                          max: 2.5,
                          step: 0.05,
                          value: L,
                          valueUnit: "\xd7",
                          onChange: F,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Shadow",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: O,
                          onChange: R,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Seed",
                          min: 0,
                          max: 20,
                          step: 1,
                          value: q,
                          onChange: U,
                        }),
                        (0, r.jsx)(n.tl, {
                          title: "Autoplay",
                          checked: Y,
                          onChange: V,
                        }),
                        (0, r.jsx)(n.tl, {
                          title: "Open On Click",
                          checked: X,
                          onChange: B,
                        }),
                        (0, r.jsx)(n.tl, {
                          title: "Captions",
                          checked: G,
                          onChange: T,
                        }),
                        (0, r.jsx)(n.tl, {
                          title: "Interactive",
                          checked: N,
                          onChange: W,
                        }),
                        (0, r.jsx)(n.tl, {
                          title: "Draggable",
                          checked: D,
                          onChange: H,
                        }),
                        (0, r.jsx)(n.tl, {
                          title: "Pause On Hover",
                          checked: _,
                          onChange: $,
                        }),
                        (0, r.jsx)(n.tl, {
                          title: "Paused",
                          checked: K,
                          onChange: Z,
                        }),
                      ],
                    }),
                    (0, r.jsx)(n.Ub, { data: E }),
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
