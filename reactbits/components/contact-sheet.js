/* ReactBits Pro public preview module 83917 for contact-sheet.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/6298.9e832fad58ee809c.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  83917: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => E }));
    var r = a(95155),
      o = a(12115),
      i = a(56388),
      n = a(86049),
      l = a(90761),
      s = a(12246),
      u = a(2253),
      d = a(90650);
    let p = 2 * Math.PI,
      h = [
        {
          src: "/demo-media/portrait-sienna.webp",
          alt: "Studio portrait with short natural hair and a burnt-orange top",
          title: "Sienna",
          subtitle: "Studio portrait",
        },
        {
          src: "/demo-media/portrait-silver.webp",
          alt: "Studio portrait with cropped grey hair and a black shirt",
          title: "Silver",
          subtitle: "Studio portrait",
        },
        {
          src: "/demo-media/portrait-indigo.webp",
          alt: "Studio portrait with short dark hair and a cobalt jacket",
          title: "Indigo",
          subtitle: "Studio portrait",
        },
        {
          src: "/demo-media/portrait-rose.webp",
          alt: "Studio portrait with curly red hair and burgundy clothing",
          title: "Rose",
          subtitle: "Studio portrait",
        },
        {
          src: "/demo-media/portrait-olive.webp",
          alt: "Studio portrait with a dark bob and an olive top",
          title: "Olive",
          subtitle: "Studio portrait",
        },
        {
          src: "/demo-media/portrait-pearl.webp",
          alt: "Studio portrait with long black hair and an ivory shirt",
          title: "Pearl",
          subtitle: "Studio portrait",
        },
        {
          src: "/demo-media/portrait-teal.webp",
          alt: "Studio portrait with a shaved head and a teal jacket",
          title: "Teal",
          subtitle: "Studio portrait",
        },
        {
          src: "/demo-media/portrait-ochre.webp",
          alt: "Studio portrait with curly dark hair and an ochre knit",
          title: "Ochre",
          subtitle: "Studio portrait",
        },
      ],
      c = (e, t, a) => Math.min(a, Math.max(t, e)),
      m = (e, t, a) => {
        let r = c((a - e) / (t - e), 0, 1);
        return r * r * (3 - 2 * r);
      },
      f = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      v = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      g = (e) => {
        let t = e.trim().replace("#", "");
        if (!/^[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(t)) return null;
        let a = 3 === t.length ? t.replace(/./g, (e) => e + e) : t;
        return [0, 2, 4].map(
          (e) => Number.parseInt(a.slice(e, e + 2), 16) / 255,
        );
      },
      x = (e, t, a) => {
        if (a < 0.001) return e * Math.exp(-t);
        let r = Math.pow(e, a) - a * t;
        return r <= 1e-6 ? 1e-4 : Math.pow(r, 1 / a);
      },
      b = {
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
        touchAction: "pan-y",
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
      },
      y = {
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        padding: "0 16px",
        textAlign: "center",
        pointerEvents: "none",
        opacity: 0,
        willChange: "transform, opacity",
      },
      M = {
        maxWidth: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        fontSize: 16,
        fontWeight: 600,
        lineHeight: 1.25,
        letterSpacing: "-0.012em",
      },
      S = {
        maxWidth: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        fontSize: 13,
        lineHeight: 1.4,
        opacity: 0.55,
      },
      C = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,
      k = `
precision highp float;

uniform sampler2D uImage;
uniform float uImageAspect;
uniform vec2 uSize;
uniform float uMargin;
uniform float uRadius;
uniform float uBorder;
uniform vec3 uBorderColor;
uniform float uRim;
uniform float uReveal;
uniform float uDevelop;
uniform float uAlpha;
uniform float uShadow;
uniform float uLift;
uniform vec3 uBackground;
uniform vec2 uResolution;
uniform float uEdge;
varying vec2 vUv;

float roundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 full = uSize + 2.0 * uMargin;
  vec2 p = (vUv - 0.5) * full;
  float radius = min(uRadius, 0.5 * min(uSize.x, uSize.y));
  float d = roundBox(p, 0.5 * uSize, radius);
  float px = max(fwidth(d), 1e-4);
  float card = 1.0 - smoothstep(-0.7 * px, 0.7 * px, d);

  vec2 frag = gl_FragCoord.xy;
  float edgeDistance = min(min(frag.x, uResolution.x - frag.x), min(frag.y, uResolution.y - frag.y));
  float edge = uEdge > 0.5 ? smoothstep(0.0, uEdge, edgeDistance) : 1.0;

  float height = uSize.y;
  float sd = roundBox(p - vec2(0.0, -height * (0.03 + 0.03 * uLift)), 0.5 * uSize * 0.96, radius);
  float blur = height * (0.08 + 0.06 * uLift);
  float shade = (1.0 - smoothstep(-blur * 0.6, blur, sd)) * uShadow * (0.42 + 0.22 * uLift);

  float inner = min(uBorder, 0.45 * min(uSize.x, uSize.y));
  vec2 box = max(uSize - 2.0 * inner, vec2(1.0));
  float di = roundBox(p, 0.5 * box, max(radius - inner * 0.6, 0.0));
  float photo = 1.0 - smoothstep(-0.7 * px, 0.7 * px, di);
  float boxAspect = box.x / box.y;
  vec2 uv = p / box;
  if (boxAspect > uImageAspect) {
    uv.y *= uImageAspect / boxAspect;
  } else {
    uv.x *= boxAspect / uImageAspect;
  }
  uv += 0.5;
  vec3 image = texture2D(uImage, uv).rgb;

  float luma = dot(image, vec3(0.2126, 0.7152, 0.0722));
  float print = step(0.5, uBorder);
  vec3 ground = mix(uBackground, uBorderColor, print);
  float base = dot(ground, vec3(0.2126, 0.7152, 0.0722));
  float dark = step(base, 0.5);
  float contrast = abs(luma - base) / max(max(base, 1.0 - base), 0.25);
  float window = 0.3;
  float threshold = 1.0 - uReveal * (1.0 + window);
  float tonal = smoothstep(threshold, threshold + window, contrast);
  vec3 mono = vec3(luma);
  vec3 tinted = mix(mono, image, smoothstep(0.5, 0.95, uReveal));
  vec3 developedImage = mix(image, tinted, uDevelop);
  vec3 paper = mix(mix(uBackground, vec3(dark), 0.07), uBorderColor, print);
  float develop = mix(smoothstep(0.0, 1.0, uReveal), tonal, uDevelop);
  float paperShown = uDevelop * max(1.0 - dark, print);
  vec3 photoColor = mix(paper, developedImage, develop);
  float paperIn = mix(develop, smoothstep(0.0, 0.18, uReveal), paperShown);
  photoColor = mix(developedImage, photoColor, paperShown);

  vec3 color3 = mix(uBorderColor, photoColor, photo);
  float rimMask = card * (1.0 - smoothstep(0.0, 1.6 * px, -d));
  color3 = mix(color3, mix(vec3(1.0), vec3(0.0), 1.0 - dark), rimMask * uRim * smoothstep(0.3, 1.0, uReveal));
  float amount = mix(mix(smoothstep(0.0, 1.0, uReveal), paperIn, photo), smoothstep(0.0, 0.18, uReveal), print * uDevelop);
  float alpha = card * uAlpha * edge * amount;
  float shadowAlpha = (1.0 - card) * shade * uAlpha * edge * uReveal;
  float total = alpha + shadowAlpha * (1.0 - alpha);
  if (total < 0.002) discard;
  gl_FragColor = vec4(color3 * alpha, total);
}
`,
      j = (0, o.forwardRef)(function (
        {
          items: e = h,
          count: t = 18,
          speed: a = 0.1,
          rush: i = 0.35,
          spiral: n = 0,
          blankArea: l = 0.2,
          size: j = 0.17,
          sizeVariance: A = 0.25,
          aspect: z = 0.8,
          radius: R = 12,
          border: E = 0,
          borderColor: I = "#FFFFFF",
          rim: F = 0.12,
          roll: L = 0,
          develop: P = 0.85,
          edgeFade: B = 0.35,
          shadow: D = 0.5,
          hoverSlow: H = 0.6,
          catchOnHover: O = !0,
          draggable: N = !0,
          wheel: V = !0,
          captions: U = !0,
          backgroundColor: W = "transparent",
          paused: T = !1,
          dpr: $ = 2,
          ariaLabel:
            Y = "Contact sheet. Photos stream outward from the center. Scroll or drag to move through them, click a photo to open it.",
          onOpen: _,
          onClose: q,
          className: X,
          style: G,
        },
        Q,
      ) {
        let K,
          Z = (0, o.useRef)(null),
          J = (0, o.useRef)(null),
          ee = (0, o.useRef)(null),
          et = (0, o.useRef)(null),
          ea = (0, o.useRef)(null),
          er = (0, o.useRef)(null),
          eo = (0, o.useSyncExternalStore)(f, v, () => !1),
          ei = e.length ? e : h,
          en = (0, o.useRef)(ei),
          [el, es] = (0, o.useState)(!1),
          [eu, ed] = (0, o.useState)(-1),
          [ep, eh] = (0, o.useState)(!1),
          ec = {
            count: t,
            speed: a,
            rush: i,
            spiral: n,
            blankArea: l,
            size: j,
            sizeVariance: A,
            aspect: z,
            radius: R,
            border: E,
            borderColor: I,
            rim: F,
            roll: L,
            develop: P,
            edgeFade: B,
            shadow: D,
            hoverSlow: H,
            catchOnHover: O,
            draggable: N,
            wheel: V,
            captions: U,
            backgroundColor: W,
            paused: T,
            dpr: $,
            reduced: eo,
            held: el,
          },
          em = (0, o.useRef)(ec),
          ef = (0, o.useRef)({ onOpen: _, onClose: q });
        ((0, o.useEffect)(() => {
          ((em.current = ec),
            (en.current = ei),
            (ef.current = { onOpen: _, onClose: q }),
            er.current?.sync());
        }),
          (0, o.useEffect)(() => {
            let e = Z.current,
              t = J.current,
              a = ee.current,
              r = et.current,
              o = ea.current;
            if (!e || !t || !a || !r || !o) return;
            let i = ((e, t, a, r, o, i) => {
              let n,
                l = e.ownerDocument,
                d = l.defaultView ?? window,
                h = l.createElement("canvas");
              h.style.cssText =
                "position:absolute;inset:0;width:100%;height:100%;display:block";
              try {
                n = new s.WebGLRenderer({
                  canvas: h,
                  alpha: !0,
                  antialias: !1,
                  premultipliedAlpha: !0,
                  powerPreference: "high-performance",
                });
              } catch {
                return null;
              }
              (t.appendChild(h), n.setClearColor(0, 0));
              let f = new u.Z58(),
                v = new u.qUd(-1, 1, 1, -1, -10, 10),
                b = new u.bdM(1, 1),
                w = new u.GYF(new Uint8Array([128, 128, 128, 255]), 1, 1);
              w.needsUpdate = !0;
              let y = new u.I9Y(1, 1),
                M = new u.Q1f(657930),
                S = new u.Q1f(0xffffff),
                j = Math.min(8, n.capabilities.getMaxAnisotropy()),
                A = Array.from({ length: 96 }, () => {
                  let e = new u.BKk({
                      uniforms: {
                        uImage: { value: w },
                        uImageAspect: { value: 0.8 },
                        uSize: { value: new u.I9Y(100, 125) },
                        uMargin: { value: 20 },
                        uRadius: { value: 12 },
                        uBorder: { value: 0 },
                        uBorderColor: { value: S },
                        uRim: { value: 0.12 },
                        uReveal: { value: 0 },
                        uDevelop: { value: 0.85 },
                        uAlpha: { value: 0 },
                        uShadow: { value: 0.5 },
                        uLift: { value: 0 },
                        uBackground: { value: M },
                        uResolution: { value: y },
                        uEdge: { value: 0 },
                      },
                      vertexShader: C,
                      fragmentShader: k,
                      transparent: !0,
                      premultipliedAlpha: !0,
                      depthTest: !1,
                      depthWrite: !1,
                    }),
                    t = new u.eaF(b, e);
                  return (
                    (t.frustumCulled = !1),
                    (t.visible = !1),
                    f.add(t),
                    {
                      mesh: t,
                      w: 1,
                      rho0: 0.2,
                      theta: 0,
                      scale: 1,
                      roll: 0,
                      image: 0,
                      grip: 0,
                      x: 0,
                      y: 0,
                      sw: 0,
                      sh: 0,
                      rot: 0,
                      alpha: 0,
                      reveal: 0,
                      shown: !1,
                    }
                  );
                }),
                z = [],
                R = "",
                E = 0,
                I = 0,
                F = 1,
                L = !1,
                P = !1,
                B = 0,
                D = 0,
                H = 0,
                O = 0,
                N = 0,
                V = !1,
                U = 0,
                W = 0,
                T = -1,
                $ = -1,
                Y = 0,
                _ = 0,
                q = 0,
                X = -1,
                G = -1,
                Q = NaN,
                K = 0,
                Z = 0,
                J = !1,
                ee = !1,
                et = !1,
                ea = !1,
                er = 0,
                eo = [],
                ei = null,
                en = (0x100000000 * Math.random()) | 0,
                el = () => {
                  let e = Math.imul(
                    (en = (en + 0x6d2b79f5) | 0) ^ (en >>> 15),
                    1 | en,
                  );
                  return (
                    (((e = (e + Math.imul(e ^ (e >>> 7), 61 | e)) ^ e) ^
                      (e >>> 14)) >>>
                      0) /
                    0x100000000
                  );
                },
                es = () => c(Math.round(r.current.count), 1, 96),
                eu = () => Math.hypot(E, I) / 2,
                ed = () => {
                  let e = o.current,
                    t = e.map((e) => e.src).join("\0");
                  if (t !== R) {
                    for (let a of ((R = t),
                    z.forEach((e) => {
                      ((e.image.onload = null), e.texture.dispose());
                    }),
                    (z = e.map((e) => {
                      let t = new Image();
                      ((t.crossOrigin = "anonymous"), (t.decoding = "async"));
                      let a = new u.gPd(t);
                      ((a.colorSpace = u.jf0),
                        (a.minFilter = u.$_I),
                        (a.magFilter = u.k6q),
                        (a.generateMipmaps = !0),
                        (a.anisotropy = j));
                      let r = {
                        image: t,
                        texture: a,
                        aspect: 0.8,
                        ready: !1,
                        uploaded: !1,
                        fade: 0,
                        used: -1,
                      };
                      return (
                        (t.onload = () => {
                          if (ee) return;
                          let e = () => {
                            ee ||
                              r.ready ||
                              ((r.aspect =
                                t.naturalWidth / Math.max(t.naturalHeight, 1)),
                              (r.ready = !0),
                              (a.needsUpdate = !0),
                              ev());
                          };
                          t.decode().then(e, e);
                        }),
                        (t.src = e.src),
                        r
                      );
                    })),
                    A))
                      a.image = Math.floor(el() * Math.max(z.length, 1));
                    (($ = -1), (Y = 0), (_ = 0));
                  }
                },
                ep = () => {
                  let t = r.current,
                    a = Math.round(e.clientWidth),
                    o = Math.round(e.clientHeight);
                  if (a < 2 || o < 2) return ((L = !1), !1);
                  let i = Math.min(
                    d.devicePixelRatio || 1,
                    Math.max(t.dpr, 0.5),
                  );
                  return (
                    (!L || a !== E || o !== I || i !== F) &&
                    ((L = !0),
                    (E = a),
                    (I = o),
                    (F = i),
                    n.setPixelRatio(F),
                    n.setSize(E, I, !1),
                    y.set(E * F, I * F),
                    (v.left = -E / 2),
                    (v.right = E / 2),
                    (v.top = I / 2),
                    (v.bottom = -I / 2),
                    v.updateProjectionMatrix(),
                    !0)
                  );
                },
                eh = () => {
                  (() => {
                    let t = r.current.backgroundColor;
                    if (g(t)) return M.setStyle(t, u.jf0);
                    let a = e;
                    for (; a;) {
                      let e = d.getComputedStyle(a).backgroundColor;
                      if (
                        e &&
                        "transparent" !== e &&
                        !/rgba\([^)]*,\s*0\)$/.test(e)
                      )
                        return void M.setStyle(e, u.jf0);
                      a = a.parentElement;
                    }
                    let o = new u.Q1f();
                    (o.setStyle(d.getComputedStyle(e).color || "#fff", u.jf0),
                      M.setHex(
                        o.r + o.g + o.b > 1.5 ? 657930 : 0xffffff,
                        u.jf0,
                      ));
                  })();
                  let t = r.current.borderColor;
                  g(t) && S.setStyle(t, u.jf0);
                },
                ec = (e, t) => {
                  let a = r.current,
                    o = eu(),
                    i = Math.abs(Math.cos(t)),
                    n = Math.abs(Math.sin(t)),
                    l = Math.min(
                      i > 1e-4 ? E / 2 / i : 1 / 0,
                      n > 1e-4 ? I / 2 / n : 1 / 0,
                    ),
                    s = c(a.aspect, 0.4, 2.5),
                    u =
                      o -
                      2 *
                        c(a.size, 0.03, 0.8) *
                        Math.min(E, I) *
                        e.scale *
                        0.5 *
                        Math.hypot(s, 1) *
                        1.05;
                  return u > 0.08 * o ? l / u : 1.6;
                },
                em = (e, t, a = 1) => {
                  let o = r.current;
                  if (
                    ((e.theta =
                      ((e = 1) => {
                        let t = es(),
                          a = el() * p,
                          r = -1;
                        for (let o = 0; o < 12; o++) {
                          let o = el() * p,
                            i = p;
                          for (let a = 0; a < t; a++) {
                            let t = A[a];
                            if (!t.shown) continue;
                            let r = Math.abs(
                              Math.log(Math.max(t.w, 1e-4) / Math.max(e, 1e-4)),
                            );
                            r > 0.9 ||
                              (i = Math.min(
                                i,
                                Math.abs(
                                  Math.atan2(
                                    Math.sin(o - t.theta - B),
                                    Math.cos(o - t.theta - B),
                                  ),
                                ) +
                                  0.9 * r,
                              ));
                          }
                          i > r && ((r = i), (a = o));
                        }
                        return a;
                      })(a) - B),
                    (e.rho0 = c(o.blankArea, 0.02, 0.7) * (1 + 0.45 * el())),
                    (e.scale = 1 + c(o.sizeVariance, 0, 0.9) * (2 * el() - 1)),
                    (e.roll = 2 * el() - 1),
                    (e.image = (() => {
                      let e = z.length;
                      if (!e) return 0;
                      let t = new Uint8Array(e),
                        a = es();
                      for (let r = 0; r < a; r++) {
                        let a = A[r];
                        a.shown && a.image < e && (t[a.image] += 1);
                      }
                      let r = 0,
                        o = 1 / 0;
                      for (let a = 0; a < e; a++) {
                        let e = z[a],
                          i = 1e3 * t[a] + e.used + 0.5 * el() + 500 * !e.ready;
                        i < o && ((o = i), (r = a));
                      }
                      return ((z[r].used = er), r);
                    })()),
                    (e.grip = 0),
                    t)
                  ) {
                    let t = ec(e, e.theta + B);
                    e.w = c(e.rho0 / t, 0.001, 0.999);
                  } else e.w = 1;
                },
                ef = (e, t) => {
                  let a = c(r.current.rush, 0, 1),
                    o = eu(),
                    i = (E + I) / 4 / Math.max(0.9 * o, 1),
                    n = c(
                      (1.22 * c(r.current.blankArea, 0.02, 0.7)) /
                        Math.max(i, 0.05),
                      0.05,
                      0.95,
                    ),
                    l = a < 0.001 ? Math.log(1 / n) : (1 - Math.pow(n, a)) / a;
                  ((e.shown = !1), em(e, !1, x(1, l * t, a)));
                  let s = ec(e, e.theta + B),
                    u = c(e.rho0 / s, 0.001, 1);
                  ((e.w = x(
                    1,
                    (a < 0.001 ? Math.log(1 / u) : (1 - Math.pow(u, a)) / a) *
                      t,
                    a,
                  )),
                    (e.shown = !0));
                },
                ev = () => {
                  ee || et || !J || K || (K = requestAnimationFrame(ew));
                },
                eg = (e) => {
                  let t = -1;
                  if ("number" == typeof e && z.length) {
                    let a = ((Math.round(e) % z.length) + z.length) % z.length,
                      r = -1;
                    for (let e of eo)
                      e.image === a && e.alpha > 0.2 && (r = A.indexOf(e));
                    if (r < 0) {
                      let e = -1,
                        t = -1;
                      for (let a = 0; a < es(); a++)
                        A[a].shown && A[a].sh > t && ((t = A[a].sh), (e = a));
                      (e >= 0 && (A[e].image = a), (r = e));
                    }
                    t = r;
                  } else {
                    let e = -1 / 0;
                    for (let a = 0; a < es(); a++) {
                      let r = A[a];
                      if (!r.shown || r.alpha < 0.3) continue;
                      let o = r.sh - 0.2 * Math.hypot(r.x - E / 2, r.y - I / 2);
                      o > e && ((e = o), (t = a));
                    }
                  }
                  t < 0 ||
                    (($ = t),
                    (Y = 1),
                    (A[t].grip = 1),
                    i.onOpen(A[t].image),
                    ev());
                },
                ex = () => {
                  $ < 0 || 0 === Y || ((Y = 0), i.onClose(), ev());
                },
                eb = (e) => {
                  ((O += c(e, -4, 4)), ev());
                };
              function ew(t) {
                let i, l, s, u, d;
                if (((K = 0), ee || et || (!L && (ep(), !L)))) return;
                let h = r.current,
                  g =
                    Z && t - Z < 100
                      ? Math.min(Math.max((t - Z) / 1e3, 0), 0.05)
                      : 1 / 60;
                ((Z = t), (er += g));
                let b = h.reduced,
                  y = !1;
                for (let e of (Math.floor(er / 1.2) !==
                  Math.floor((er - g) / 1.2) && eh(),
                ep(),
                P ||
                  (() => {
                    let e = es();
                    for (let e = 0; e < 96; e++) A[e].shown = !1;
                    for (let t = 0; t < e; t++) ef(A[t], (t + 0.85 * el()) / e);
                    P = !0;
                  })(),
                (() => {
                  let e = null,
                    t = 1 / 0;
                  for (let a of A) {
                    if (!a.shown) continue;
                    let r = z[a.image];
                    r &&
                      r.ready &&
                      !r.uploaded &&
                      a.w < t &&
                      ((t = a.w), (e = r));
                  }
                  if (!e) {
                    for (let t of z)
                      if (t.ready && !t.uploaded) {
                        e = t;
                        break;
                      }
                  }
                  return (
                    !!e && (n.initTexture(e.texture), (e.uploaded = !0), !0)
                  );
                })() && (y = !0),
                z))
                  e.uploaded &&
                    e.fade < 1 &&
                    ((e.fade = b ? 1 : Math.min(1, e.fade + g / 0.6)),
                    (y = !0));
                let M = es();
                for (let e = M; e < 96; e++)
                  A[e].shown && ((A[e].shown = !1), (A[e].mesh.visible = !1));
                for (let e = 0; e < M; e++) A[e].shown || ef(A[e], 0.92 * el());
                let S = c(h.rush, 0, 1),
                  C = V && !ei ? 1 : 0;
                N += (C - N) * (1 - Math.exp(-g / (C > N ? 0.35 : 0.6)));
                let k = h.paused || h.held || b,
                  j = k ? 0 : h.speed,
                  R = 1 - c(h.hoverSlow, 0, 1) * N * (h.catchOnHover ? 1 : 0.6);
                (([_, q] = ((e, t, a, r, o, i) => {
                  let n = p / Math.max(o, 0.02),
                    l = Math.max(1, Math.ceil(r / (1 / 240))),
                    s = r / l,
                    u = t,
                    d = e;
                  for (let e = 0; e < l; e++)
                    ((u += (n * n * (a - d) - 1.76 * n * u) * s), (d += u * s));
                  return [d, u];
                })(_, q, Y, g, b ? 0.06 : 0.62, 0)),
                  Math.abs(_ - Y) > 1e-4 || Math.abs(q) > 1e-4
                    ? (y = !0)
                    : ((_ = Y), (q = 0), 0 === Y && $ >= 0 && ($ = -1)));
                let J = 1 - 0.9 * _,
                  ea = O * (1 - Math.exp(-g / (b ? 0.04 : 0.18)));
                (1e-5 > Math.abs((O -= ea)) ? (O = 0) : (y = !0),
                  (ei && ei.moved) ||
                    ((H *= Math.exp(-g / (b ? 0.05 : 0.7))),
                    (D *= Math.exp(-g / (b ? 0.05 : 1.1)))),
                  1e-4 > Math.abs(H) && (H = 0),
                  1e-4 > Math.abs(D) && (D = 0),
                  (H || D) && (y = !0),
                  (ei && ei.moved) || (B += D * g));
                let en = j * R * J,
                  ed = ea + (ei && ei.moved ? 0 : H * g);
                0 !== en && (y = !0);
                let eg = eu(),
                  ex = Math.min(E, I),
                  eb = c(h.aspect, 0.4, 2.5),
                  ew = 2 * c(h.size, 0.03, 0.8) * ex,
                  eM = h.spiral,
                  eS = (c(h.roll, 0, 30) * Math.PI) / 180,
                  eC = Math.max(E, I);
                for (let e = 0; e < M; e++) {
                  let t = A[e],
                    a = e === $,
                    r = a || (h.catchOnHover && e === T) ? 1 : 0;
                  if (
                    ((t.grip +=
                      (r - t.grip) *
                      (1 - Math.exp(-g / (r > t.grip ? 0.16 : 0.5)))),
                    0.001 > Math.abs(t.grip - r) ? (t.grip = r) : (y = !0),
                    !a)
                  ) {
                    let e = en * (1 - t.grip) * g + ed * (1 - 0.85 * t.grip);
                    0 !== e && (t.w = x(t.w, e, S));
                  }
                  let o = t.rho0 / t.w,
                    i = t.theta + B + eM * Math.log(Math.max(o / t.rho0, 1e-4)),
                    n = ew * o * t.scale;
                  ((t.sh = n),
                    (t.sw = n * eb),
                    (t.x = E / 2 + Math.cos(i) * o * eg),
                    (t.y = I / 2 + Math.sin(i) * o * eg),
                    (t.rot = eS * t.roll));
                  let l = ec(t, i);
                  if (!a && o > l && t.grip < 0.5) {
                    em(t, !1);
                    continue;
                  }
                  if (!a && t.w > 1.0001) {
                    em(t, !0);
                    continue;
                  }
                  let s = z[t.image],
                    u = m(t.rho0, 1.5 * t.rho0, o);
                  t.reveal = Math.max(u, t.grip);
                  let d = 1 - m(0.7 * eC, 1.05 * eC, t.sh);
                  t.alpha = (s ? s.fade : 0) * d;
                }
                ((eo = A.slice(0, M).sort((e, t) => t.w - e.w)),
                  V &&
                    !ei &&
                    (function () {
                      if (Y > 0) {
                        ((T = -1),
                          "pointer" !== e.style.cursor &&
                            (e.style.cursor = "pointer"));
                        return;
                      }
                      let t = ey(U, W);
                      T = t;
                      let a =
                        t >= 0 ? "pointer" : r.current.draggable ? "grab" : "";
                      e.style.cursor !== a && (e.style.cursor = a);
                    })());
                let ek = $ >= 0 ? A[$] : null,
                  ej = ek
                    ? ((i = r.current),
                      (s = (l = z[ek.image])
                        ? l.aspect
                        : c(i.aspect, 0.4, 2.5)),
                      (u = 64 * !!i.captions),
                      (d = 0.74 * Math.max(I - u, 0.6 * I)) * s > 0.86 * E &&
                        (d = (0.86 * E) / s),
                      {
                        x: E / 2,
                        y: (I - u) / 2 + 6,
                        w: d * s,
                        h: d,
                        aspect: s,
                      })
                    : null,
                  eA = _,
                  ez = c(h.rim, 0, 1),
                  eR = c(h.border, 0, 0.3),
                  eE = Math.max(0, h.radius),
                  eI = c(h.develop, 0, 1),
                  eF = c(h.shadow, 0, 1),
                  eL = c(h.edgeFade, 0, 1) * ex * 0.22 * F;
                for (let e = 0; e < eo.length; e++) {
                  let t = eo[e],
                    a = t.mesh,
                    r = t === ek,
                    o = t.x,
                    i = t.y,
                    n = t.sw,
                    l = t.sh,
                    s = t.rot,
                    u = t.alpha * (r ? 1 : 1 - 0.72 * eA),
                    d = t.reveal,
                    p = t.grip,
                    h = eE * Math.min(1, t.sh / Math.max(0.5 * ew, 1)),
                    c = z[t.image]?.aspect ?? eb;
                  r &&
                    ej &&
                    ((o += (ej.x - o) * eA),
                    (i += (ej.y - i) * eA),
                    (n += (ej.w - n) * eA),
                    (l += (ej.h - l) * eA),
                    (s *= 1 - eA),
                    (u = Math.max(u, eA)),
                    (d = 1),
                    (p = 1),
                    (h += (Math.max(eE, 10) - h) * eA),
                    (c = ej.aspect));
                  let m = u > 0.003 && n > 0.5;
                  if (((a.visible = m), !m)) continue;
                  let f = 1 + 0.05 * t.grip * (1 - (r ? eA : 0));
                  n *= f;
                  let v = Math.max(8, 0.22 * (l *= f));
                  (a.position.set(o - E / 2, I / 2 - i, 0),
                    a.rotation.set(0, 0, -s),
                    a.scale.set(n + 2 * v, l + 2 * v, 1),
                    (a.renderOrder = r ? 1e4 : e));
                  let g = a.material.uniforms,
                    x = z[t.image];
                  ((g.uImage.value = x?.uploaded ? x.texture : w),
                    (g.uImageAspect.value = c),
                    g.uSize.value.set(n, l),
                    (g.uMargin.value = v),
                    (g.uRadius.value = h),
                    (g.uBorder.value = eR * Math.min(n, l)),
                    (g.uRim.value = ez * (0.6 + 0.4 * p)),
                    (g.uReveal.value = d),
                    (g.uDevelop.value = eI),
                    (g.uAlpha.value = u),
                    (g.uShadow.value = eF),
                    (g.uLift.value = p),
                    (g.uEdge.value = r ? eL * (1 - eA) : eL));
                }
                ((function (e, t, i) {
                  if (!r.current.captions || !e || !t) {
                    0 !== G && ((G = 0), (a.caption.style.opacity = "0"));
                    return;
                  }
                  if (e.image !== X) {
                    X = e.image;
                    let t = o.current[e.image];
                    ((a.title.textContent = t ? (t.title ?? t.alt) : ""),
                      (a.subtitle.textContent = t?.subtitle ?? ""),
                      (a.subtitle.style.display = t?.subtitle ? "" : "none"));
                  }
                  let n = t.y + t.h / 2 + 22;
                  (Number.isNaN(Q) || Math.abs(n - Q) > 0.25) &&
                    ((Q = n), (a.caption.style.top = `${n.toFixed(2)}px`));
                  let l = m(0.55, 1, i);
                  Math.abs(l - G) > 0.002 &&
                    ((G = l),
                    (a.caption.style.opacity = l.toFixed(3)),
                    (a.caption.style.transform = `translate3d(0, ${((1 - l) * 8).toFixed(2)}px, 0)`));
                })(ek, ej, eA),
                  n.render(f, v),
                  (y || ei || V || 0 !== en) && ev());
              }
              let ey = (e, t) => {
                  for (let a = eo.length - 1; a >= 0; a--) {
                    let r = eo[a];
                    if (!r.mesh.visible || r.alpha < 0.3 || r.reveal < 0.45)
                      continue;
                    let o = e - r.x,
                      i = t - r.y,
                      n = Math.cos(-r.rot),
                      l = Math.sin(-r.rot),
                      s = o * n - i * l,
                      u = o * l + i * n,
                      d = 6 * r.grip;
                    if (
                      Math.abs(s) <= r.sw / 2 + d &&
                      Math.abs(u) <= r.sh / 2 + d
                    )
                      return A.indexOf(r);
                  }
                  return -1;
                },
                eM = (t) => {
                  let a = e.getBoundingClientRect();
                  return { x: t.clientX - a.left, y: t.clientY - a.top };
                },
                eS = (a) => {
                  let o = eM(a);
                  if (
                    ("touch" !== a.pointerType &&
                      ((V = !0), (U = o.x), (W = o.y)),
                    ei && ei.id === a.pointerId)
                  ) {
                    let i = o.x - E / 2,
                      n = o.y - I / 2,
                      l = Math.max(Math.hypot(i, n), 0.08 * Math.min(E, I)),
                      s = Math.atan2(n, i);
                    if (
                      !ei.moved &&
                      Math.hypot(a.clientX - ei.x, a.clientY - ei.y) > 6
                    ) {
                      ((ei.moved = !0),
                        (T = -1),
                        (e.style.cursor = "grabbing"),
                        (H = 0),
                        (D = 0));
                      try {
                        t.setPointerCapture(a.pointerId);
                      } catch {}
                    }
                    if (ei.moved) {
                      let e = c(Math.log(l / ei.radius), -0.3, 0.3),
                        t = Math.atan2(
                          Math.sin(s - ei.angle),
                          Math.cos(s - ei.angle),
                        ),
                        a = c(r.current.rush, 0, 1);
                      for (let t = 0; t < es(); t++)
                        t !== $ && (A[t].w = x(A[t].w, e, a));
                      ((B += t), (ei.radius = l), (ei.angle = s));
                      let o = performance.now();
                      for (
                        ei.samples.push({ t: o, zoom: e, angle: t });
                        ei.samples.length > 2 && o - ei.samples[0].t > 110;
                      )
                        ei.samples.shift();
                    }
                  }
                  ev();
                },
                eC = (e) => {
                  if (
                    !e.isPrimary ||
                    e.button > 0 ||
                    ((ea = !1), !r.current.draggable)
                  )
                    return;
                  let t = eM(e),
                    a = t.x - E / 2,
                    o = t.y - I / 2;
                  ((ei = {
                    id: e.pointerId,
                    x: e.clientX,
                    y: e.clientY,
                    moved: !1,
                    radius: Math.max(Math.hypot(a, o), 0.08 * Math.min(E, I)),
                    angle: Math.atan2(o, a),
                    samples: [],
                  }),
                    ev());
                },
                ek = (a) => {
                  if (!ei || ei.id !== a.pointerId) return;
                  let o = ei;
                  ei = null;
                  try {
                    t.hasPointerCapture(a.pointerId) &&
                      t.releasePointerCapture(a.pointerId);
                  } catch {}
                  if (o.moved) {
                    ea = !0;
                    let t = performance.now(),
                      a = o.samples.filter((e) => t - e.t < 110);
                    if (
                      a.length &&
                      t - a[a.length - 1].t < 60 &&
                      !r.current.reduced
                    ) {
                      let e = Math.max((t - a[0].t) / 1e3, 1 / 60),
                        r = a.reduce((e, t) => e + t.zoom, 0),
                        o = a.reduce((e, t) => e + t.angle, 0);
                      ((H = c(r / e, -3, 3)), (D = c(o / e, -4, 4)));
                    }
                    e.style.cursor = r.current.draggable ? "grab" : "";
                  }
                  ev();
                },
                ej = (e) => {
                  if (ea) {
                    ea = !1;
                    return;
                  }
                  if (Y > 0) return void ex();
                  let t = eM(e),
                    a = ey(t.x, t.y);
                  a >= 0 &&
                    (($ = a),
                    (Y = 1),
                    (A[a].grip = 1),
                    i.onOpen(A[a].image),
                    ev());
                },
                eA = (t) => {
                  (ei && ei.id === t.pointerId) ||
                    ((V = !1), (T = -1), (e.style.cursor = ""), ev());
                },
                ez = (e) => {
                  if (!r.current.wheel) return;
                  if ((e.preventDefault(), Y > 0)) return void ex();
                  let t = 1 === e.deltaMode ? 16 : 2 === e.deltaMode ? I : 1,
                    a = c(
                      (Math.abs(e.deltaX) > Math.abs(e.deltaY)
                        ? e.deltaX
                        : e.deltaY) * t,
                      -240,
                      240,
                    );
                  ((O += 0.0024 * a), ev());
                },
                eR = (t) => {
                  t.target === e &&
                    ("ArrowUp" === t.key || "ArrowRight" === t.key
                      ? (t.preventDefault(), eb(0.32))
                      : "ArrowDown" === t.key || "ArrowLeft" === t.key
                        ? (t.preventDefault(), eb(-0.32))
                        : "Enter" === t.key
                          ? (t.preventDefault(), Y > 0 ? ex() : eg())
                          : "Escape" === t.key &&
                            Y > 0 &&
                            (t.preventDefault(), ex()));
                };
              (t.addEventListener("pointerdown", eC),
                t.addEventListener("pointermove", eS),
                t.addEventListener("pointerup", ek),
                t.addEventListener("pointercancel", ek),
                t.addEventListener("pointerleave", eA),
                t.addEventListener("click", ej),
                t.addEventListener("wheel", ez, { passive: !1 }),
                e.addEventListener("keydown", eR));
              let eE = new ResizeObserver(() => {
                ep() && ev();
              });
              eE.observe(e);
              let eI =
                "undefined" == typeof IntersectionObserver
                  ? null
                  : new IntersectionObserver(
                      ([e]) => {
                        (J = e.isIntersecting)
                          ? ((Z = 0), ev())
                          : (K && cancelAnimationFrame(K), (K = 0));
                      },
                      { rootMargin: "80px" },
                    );
              eI ? eI.observe(e) : (J = !0);
              let eF = (e) => {
                  (e.preventDefault(),
                    (et = !0),
                    K && cancelAnimationFrame(K),
                    (K = 0));
                },
                eL = () => {
                  ((et = !1), (R = ""), ed(), ev());
                };
              return (
                h.addEventListener("webglcontextlost", eF),
                h.addEventListener("webglcontextrestored", eL),
                ep(),
                eh(),
                (A[0].mesh.visible = !0),
                n.compile(f, v),
                (A[0].mesh.visible = !1),
                ed(),
                ev(),
                {
                  sync: () => {
                    (ep(), eh(), ed(), (X = -1), ev());
                  },
                  boost: eb,
                  open: eg,
                  close: ex,
                  destroy: () => {
                    ((ee = !0),
                      K && cancelAnimationFrame(K),
                      eI?.disconnect(),
                      eE.disconnect(),
                      t.removeEventListener("pointerdown", eC),
                      t.removeEventListener("pointermove", eS),
                      t.removeEventListener("pointerup", ek),
                      t.removeEventListener("pointercancel", ek),
                      t.removeEventListener("pointerleave", eA),
                      t.removeEventListener("click", ej),
                      t.removeEventListener("wheel", ez),
                      e.removeEventListener("keydown", eR),
                      (e.style.cursor = ""),
                      h.removeEventListener("webglcontextlost", eF),
                      h.removeEventListener("webglcontextrestored", eL),
                      z.forEach((e) => {
                        ((e.image.onload = null), e.texture.dispose());
                      }),
                      A.forEach((e) => e.mesh.material.dispose()),
                      w.dispose(),
                      b.dispose(),
                      n.dispose(),
                      n.getContext().isContextLost() || n.forceContextLoss(),
                      h.remove());
                  },
                }
              );
            })(e, t, { caption: a, title: r, subtitle: o }, em, en, {
              onOpen: (e) => {
                ed(e);
                let t = en.current[e];
                t && ef.current.onOpen?.(t, e);
              },
              onClose: () => {
                (ed(-1), ef.current.onClose?.());
              },
            });
            if (!i) {
              let e = requestAnimationFrame(() => eh(!0));
              return () => cancelAnimationFrame(e);
            }
            return (
              (er.current = i),
              () => {
                (i.destroy(), (er.current = null));
              }
            );
          }, []),
          (0, o.useImperativeHandle)(
            Q,
            () => ({
              boost: (e) => er.current?.boost(e),
              open: (e) => er.current?.open(e),
              close: () => er.current?.close(),
            }),
            [],
          ));
        let ev = W.trim().toLowerCase(),
          eg = "transparent" === ev || "" === ev,
          ex =
            !eg &&
            !!(K = g(ev)) &&
            0.2126 * K[0] + 0.7152 * K[1] + 0.0722 * K[2] > 0.6,
          eb = eu >= 0 ? ei[eu] : null;
        return (0, r.jsxs)("div", {
          ref: Z,
          className: (0, d.cn)(
            "relative h-full min-h-[420px] w-full overflow-hidden outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color-mix(in_oklch,currentColor_35%,transparent)]",
            X,
          ),
          style: {
            backgroundColor: eg ? void 0 : W,
            color: eg ? "currentColor" : ex ? "#0a0a0a" : "#fafafa",
            ...G,
          },
          role: "region",
          "aria-roledescription": "gallery",
          "aria-label": Y,
          tabIndex: 0,
          onKeyDown: (e) => {
            " " === e.key &&
              e.target === e.currentTarget &&
              (e.preventDefault(), es((e) => !e));
          },
          children: [
            (0, r.jsx)("div", { ref: J, style: w }),
            ep
              ? (0, r.jsx)("div", {
                  style: {
                    position: "absolute",
                    inset: 0,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
                    gap: 12,
                    padding: 24,
                    alignContent: "center",
                  },
                  children: ei
                    .slice(0, 12)
                    .map((e, t) =>
                      (0, r.jsx)(
                        "img",
                        {
                          src: e.src,
                          alt: e.alt,
                          style: {
                            width: "100%",
                            aspectRatio: String(z),
                            objectFit: "cover",
                            borderRadius: R,
                          },
                        },
                        `${e.src}-${t}`,
                      ),
                    ),
                })
              : null,
            (0, r.jsx)("ul", {
              style: b,
              children: ei.map((e, t) =>
                (0, r.jsx)(
                  "li",
                  {
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
              style: b,
              children: eb ? `Opened ${eb.title ?? eb.alt}` : "",
            }),
            (0, r.jsxs)("div", {
              ref: ee,
              "aria-hidden": "true",
              style: y,
              children: [
                (0, r.jsx)("span", { ref: et, style: M }),
                (0, r.jsx)("span", { ref: ea, style: S }),
              ],
            }),
          ],
        });
      });
    j.displayName = "ContactSheet";
    let A = {
        stream: {
          count: 18,
          speed: 0.1,
          rush: 0.35,
          spiral: 0,
          blankArea: 0.2,
          size: 0.17,
          sizeVariance: 0.25,
          aspect: 0.8,
          radius: 12,
          border: 0,
          rim: 0.12,
          roll: 0,
          develop: 0.85,
          shadow: 0.5,
        },
        spiral: {
          count: 22,
          speed: 0.12,
          rush: 0.35,
          spiral: 0.9,
          blankArea: 0.18,
          size: 0.15,
          sizeVariance: 0.25,
          aspect: 0.8,
          radius: 12,
          border: 0,
          rim: 0.12,
          roll: 0,
          develop: 0.85,
          shadow: 0.5,
        },
        prints: {
          count: 16,
          speed: 0.08,
          rush: 0.35,
          spiral: 0,
          blankArea: 0.2,
          size: 0.19,
          sizeVariance: 0.2,
          aspect: 0.82,
          radius: 3,
          border: 0.06,
          rim: 0,
          roll: 7,
          develop: 0.9,
          shadow: 0.8,
        },
        warp: {
          count: 56,
          speed: 0.22,
          rush: 0.85,
          spiral: 0,
          blankArea: 0.1,
          size: 0.085,
          sizeVariance: 0.35,
          aspect: 0.8,
          radius: 6,
          border: 0,
          rim: 0.12,
          roll: 0,
          develop: 0.5,
          shadow: 0.4,
        },
        vortex: {
          count: 36,
          speed: 0.16,
          rush: 0.5,
          spiral: 2.2,
          blankArea: 0.14,
          size: 0.11,
          sizeVariance: 0.3,
          aspect: 0.8,
          radius: 8,
          border: 0,
          rim: 0.12,
          roll: 0,
          develop: 0.7,
          shadow: 0.4,
        },
        drift: {
          count: 10,
          speed: 0.05,
          rush: 0,
          spiral: 0,
          blankArea: 0.28,
          size: 0.26,
          sizeVariance: 0.15,
          aspect: 0.8,
          radius: 14,
          border: 0,
          rim: 0.12,
          roll: 0,
          develop: 0.85,
          shadow: 0.6,
        },
        recede: {
          count: 18,
          speed: -0.1,
          rush: 0.35,
          spiral: 0,
          blankArea: 0.2,
          size: 0.17,
          sizeVariance: 0.25,
          aspect: 0.8,
          radius: 12,
          border: 0,
          rim: 0.12,
          roll: 0,
          develop: 0.85,
          shadow: 0.5,
        },
      },
      z = [
        { label: "Stream", value: "stream" },
        { label: "Spiral", value: "spiral" },
        { label: "Prints", value: "prints" },
        { label: "Warp", value: "warp" },
        { label: "Vortex", value: "vortex" },
        { label: "Drift", value: "drift" },
        { label: "Recede", value: "recede" },
      ],
      R = [
        {
          name: "items",
          type: "{ src: string; alt: string; title?: string; subtitle?: string; href?: string }[]",
          default: "studio portrait collection",
          description:
            "Photos streamed from the center, cycling through the collection in order. Images must allow cross-origin loading. Title and subtitle caption an opened photo.",
        },
        {
          name: "count",
          type: "number",
          default: "18",
          description: "How many photos are in flight at once, up to 96.",
        },
        {
          name: "speed",
          type: "number",
          default: "0.1",
          description:
            "How fast the photos travel outward. Negative values reverse the stream so photos sink into the center.",
        },
        {
          name: "rush",
          type: "number",
          default: "0.35",
          description:
            "How the photos accelerate as they near the edges. 0 is an even, calm zoom; 1 is true perspective, where photos rush past at the end.",
        },
        {
          name: "spiral",
          type: "number",
          default: "0",
          description:
            "How much the paths curl as photos travel outward. 0 flies them straight; negative values curl the other way.",
        },
        {
          name: "blankArea",
          type: "number",
          default: "0.2",
          description:
            "Size of the empty center the photos emerge from, as a fraction of the half-diagonal. Room for a headline.",
        },
        {
          name: "size",
          type: "number",
          default: "0.17",
          description:
            "Photo height, as a fraction of the shorter side, when a photo is halfway out. Photos grow as they travel.",
        },
        {
          name: "sizeVariance",
          type: "number",
          default: "0.25",
          description: "How much photo sizes vary, for a sense of depth.",
        },
        {
          name: "aspect",
          type: "number",
          default: "0.8",
          description:
            "Width divided by height of the photos in the stream. Images are cropped to fill.",
        },
        {
          name: "radius",
          type: "number",
          default: "12",
          description:
            "Corner radius in pixels at the reference size. Smaller photos scale it down.",
        },
        {
          name: "border",
          type: "number",
          default: "0",
          description:
            "Print border, as a fraction of the photo size. With a border, each photo develops on blank paper of the border color, like a darkroom print.",
        },
        {
          name: "borderColor",
          type: "string",
          default: '"#FFFFFF"',
          description: "Color of the print border and paper.",
        },
        {
          name: "rim",
          type: "number",
          default: "0.12",
          description:
            "Strength of the hairline edge highlight around each photo.",
        },
        {
          name: "roll",
          type: "number",
          default: "0",
          description:
            "Maximum random tilt of each photo in degrees, like scattered prints.",
        },
        {
          name: "develop",
          type: "number",
          default: "0.85",
          description:
            "How photos appear as they emerge. 0 fades them in; 1 develops them tone by tone, monochrome first, then in color.",
        },
        {
          name: "edgeFade",
          type: "number",
          default: "0.35",
          description:
            "How softly photos dissolve into the background at the edges of the frame.",
        },
        {
          name: "shadow",
          type: "number",
          default: "0.5",
          description: "Strength of the soft shadow under each photo.",
        },
        {
          name: "hoverSlow",
          type: "number",
          default: "0.6",
          description:
            "How much the stream slows while the pointer is over it, so photos are easy to catch.",
        },
        {
          name: "catchOnHover",
          type: "boolean",
          default: "true",
          description:
            "Hovering a photo catches it: it stops in place and lifts while the rest of the stream flows past.",
        },
        {
          name: "draggable",
          type: "boolean",
          default: "true",
          description:
            "Drag to steer the stream. Pulling away from the center flies forward and pushing toward it flies back, while dragging around the center turns it. Both keep momentum.",
        },
        {
          name: "wheel",
          type: "boolean",
          default: "true",
          description:
            "Scroll to fly through the stream. Set false to leave page scrolling untouched.",
        },
        {
          name: "captions",
          type: "boolean",
          default: "true",
          description: "Show the title and subtitle under an opened photo.",
        },
        {
          name: "backgroundColor",
          type: "string",
          default: '"transparent"',
          description:
            "Background of the component. Photos develop out of it, and captions adapt to it.",
        },
        {
          name: "paused",
          type: "boolean",
          default: "false",
          description:
            "Stops the stream. Space toggles it too, and reduced-motion users get a still field that only moves on input.",
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
          default: '"Contact sheet…"',
          description:
            "Accessible description of the gallery and how to use it.",
        },
        {
          name: "onOpen",
          type: "(item, index) => void",
          default: "—",
          description:
            "Called when a photo is opened by a click, Enter or the ref.",
        },
        {
          name: "onClose",
          type: "() => void",
          default: "—",
          description: "Called when the opened photo returns to the stream.",
        },
        {
          name: "ref",
          type: "{ boost, open, close }",
          default: "—",
          description:
            "boost(amount) flies forward or back, open(index?) opens a photo, close() returns it.",
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
      E = () => {
        let [e, t] = (0, l.I)(),
          a = (0, n.Y)(),
          [s, u] = (0, o.useState)("stream"),
          [d, p] = (0, o.useState)(A.stream),
          h = (e) => (t) => p((a) => ({ ...a, [e]: t })),
          [c, m] = (0, o.useState)(null),
          f = c ?? ("dark" === a ? "#0A0A0A" : "#FFFFFF"),
          [v, g] = (0, o.useState)("#FFFFFF"),
          [x, b] = (0, o.useState)(0.35),
          [w, y] = (0, o.useState)(0.6),
          [M, S] = (0, o.useState)(!0),
          [C, k] = (0, o.useState)(!0),
          [E, I] = (0, o.useState)(!0),
          [F, L] = (0, o.useState)(!0),
          [P, B] = (0, o.useState)(!1);
        return (0, r.jsxs)("div", {
          children: [
            (0, r.jsx)(i.Bg, {}),
            (0, r.jsxs)(i.VX, {
              children: [
                (0, r.jsxs)(i.Ec, {
                  children: [
                    (0, r.jsx)(i.Ch, {
                      onRefresh: t,
                      minHeight: 560,
                      enableResponsive: !0,
                      children: (0, r.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, r.jsx)(
                          j,
                          {
                            count: d.count,
                            speed: d.speed,
                            rush: d.rush,
                            spiral: d.spiral,
                            blankArea: d.blankArea,
                            size: d.size,
                            sizeVariance: d.sizeVariance,
                            aspect: d.aspect,
                            radius: d.radius,
                            border: d.border,
                            borderColor: v,
                            rim: d.rim,
                            roll: d.roll,
                            develop: d.develop,
                            edgeFade: x,
                            shadow: d.shadow,
                            hoverSlow: w,
                            catchOnHover: M,
                            draggable: C,
                            wheel: E,
                            captions: F,
                            backgroundColor: f,
                            paused: P,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, r.jsxs)(i.IH, {
                      children: [
                        (0, r.jsx)(i.bg, {
                          title: "Preset",
                          value: s,
                          options: z,
                          onChange: (e) => {
                            (u(e), p(A[e] ?? A.stream));
                          },
                        }),
                        (0, r.jsx)(i.W7, {
                          title: "Background",
                          value: f,
                          onChange: m,
                        }),
                        (0, r.jsx)(i.W7, {
                          title: "Border Color",
                          value: v,
                          onChange: g,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Count",
                          min: 4,
                          max: 96,
                          step: 1,
                          value: d.count,
                          onChange: h("count"),
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Speed",
                          min: -0.4,
                          max: 0.4,
                          step: 0.01,
                          value: d.speed,
                          onChange: h("speed"),
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Rush",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: d.rush,
                          onChange: h("rush"),
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Spiral",
                          min: -3,
                          max: 3,
                          step: 0.05,
                          value: d.spiral,
                          onChange: h("spiral"),
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Blank Area",
                          min: 0.04,
                          max: 0.45,
                          step: 0.01,
                          value: d.blankArea,
                          onChange: h("blankArea"),
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Size",
                          min: 0.05,
                          max: 0.4,
                          step: 0.005,
                          value: d.size,
                          onChange: h("size"),
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Size Variance",
                          min: 0,
                          max: 0.8,
                          step: 0.01,
                          value: d.sizeVariance,
                          onChange: h("sizeVariance"),
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Aspect",
                          min: 0.5,
                          max: 1.8,
                          step: 0.01,
                          value: d.aspect,
                          onChange: h("aspect"),
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Radius",
                          min: 0,
                          max: 32,
                          step: 1,
                          value: d.radius,
                          valueUnit: "px",
                          onChange: h("radius"),
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Border",
                          min: 0,
                          max: 0.15,
                          step: 0.005,
                          value: d.border,
                          onChange: h("border"),
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Rim",
                          min: 0,
                          max: 0.6,
                          step: 0.01,
                          value: d.rim,
                          onChange: h("rim"),
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Roll",
                          min: 0,
                          max: 20,
                          step: 0.5,
                          value: d.roll,
                          valueUnit: "\xb0",
                          onChange: h("roll"),
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Develop",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: d.develop,
                          onChange: h("develop"),
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Shadow",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: d.shadow,
                          onChange: h("shadow"),
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Edge Fade",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: x,
                          onChange: b,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Hover Slow",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: w,
                          onChange: y,
                        }),
                        (0, r.jsx)(i.tl, {
                          title: "Catch On Hover",
                          checked: M,
                          onChange: S,
                        }),
                        (0, r.jsx)(i.tl, {
                          title: "Draggable",
                          checked: C,
                          onChange: k,
                        }),
                        (0, r.jsx)(i.tl, {
                          title: "Wheel",
                          checked: E,
                          onChange: I,
                        }),
                        (0, r.jsx)(i.tl, {
                          title: "Captions",
                          checked: F,
                          onChange: L,
                        }),
                        (0, r.jsx)(i.tl, {
                          title: "Paused",
                          checked: P,
                          onChange: B,
                        }),
                      ],
                    }),
                    (0, r.jsx)(i.Ub, { data: R }),
                  ],
                }),
                (0, r.jsx)(i.lT, { children: (0, r.jsx)(i.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
