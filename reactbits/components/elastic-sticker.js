/* ReactBits Pro public preview module 11242 for elastic-sticker.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/11242.705e159d1a6bdd67.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  11242: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => H }));
    var r = a(95155),
      i = a(12115),
      o = a(56388),
      n = a(86049),
      l = a(45949),
      s = a(90761),
      d = a(2253),
      c = a(12246),
      u = a(90650);
    let h = 2 * Math.PI,
      p = 10,
      m = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      f = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      g = (e, t, a) => Math.min(a, Math.max(t, e)),
      y = (e, t, a) => {
        let r = g((a - e) / (t - e), 0, 1);
        return r * r * (3 - 2 * r);
      },
      x = null,
      v = (e, t) => {
        if ((x || (x = document.createElement("canvas").getContext("2d")), !x))
          return t;
        ((x.fillStyle = "#010203"), (x.fillStyle = e));
        let a = String(x.fillStyle);
        if ("#010203" === a && "#010203" !== e.trim().toLowerCase()) return t;
        if (a.startsWith("#")) {
          let e = a.slice(1);
          return [
            parseInt(e.slice(0, 2), 16) / 255,
            parseInt(e.slice(2, 4), 16) / 255,
            parseInt(e.slice(4, 6), 16) / 255,
          ];
        }
        let r = a.match(/[\d.]+/g);
        return !r || r.length < 3
          ? t
          : [Number(r[0]) / 255, Number(r[1]) / 255, Number(r[2]) / 255];
      },
      b = (e) => ({
        width: e.naturalWidth || e.width || 1,
        height: e.naturalHeight || e.height || 1,
      }),
      w = (e, t, a, r, i, o) => {
        let n = Math.max(0, Math.min(o, r / 2, i / 2));
        (e.beginPath(),
          e.moveTo(t + n, a),
          e.arcTo(t + r, a, t + r, a + i, n),
          e.arcTo(t + r, a + i, t, a + i, n),
          e.arcTo(t, a + i, t, a, n),
          e.arcTo(t, a, t + r, a, n),
          e.closePath());
      },
      M = (e, t, a, r, i, o, n) => {
        let l = e.getContext("2d", { willReadFrequently: !0 });
        if (!l) return null;
        let s = e.width + 6 * n + 200;
        return (
          l.clearRect(0, 0, e.width, e.height),
          l.save(),
          (l.shadowColor = "#000"),
          (l.shadowBlur = Math.max(0.01, 2 * n)),
          (l.shadowOffsetX = s),
          l.drawImage(t, a - s, r, i, o),
          l.restore(),
          l.getImageData(0, 0, e.width, e.height).data
        );
      },
      S = (e, t, a, r, i) => {
        let o = g(Math.ceil((a - e) / i), 2, 180),
          n = g(Math.ceil((r - t) / i), 2, 180),
          l = new Float32Array((o + 1) * (n + 1) * 3),
          s = 0;
        for (let i = 0; i <= n; i++)
          for (let d = 0; d <= o; d++)
            ((l[s++] = e + ((a - e) * d) / o),
              (l[s++] = t + ((r - t) * i) / n),
              (l[s++] = 0));
        let c = [];
        for (let e = 0; e < n; e++)
          for (let t = 0; t < o; t++) {
            let a = e * (o + 1) + t,
              r = a + 1,
              i = a + o + 1,
              n = i + 1;
            c.push(a, i, r, r, i, n);
          }
        let u = new d.LoY();
        return (u.setAttribute("position", new d.THS(l, 3)), u.setIndex(c), u);
      },
      F = `
uniform vec2 uSize;
uniform vec2 uGrab;
uniform vec2 uDir;
uniform sampler2D uProfile;
uniform vec2 uProfileRange;
uniform vec4 uCorners[4];
uniform vec2 uShift;
uniform float uRoll;
uniform float uGrabHeight;

vec3 bendSheet(vec2 point, out vec3 normal) {
  vec2 q = clamp(point, vec2(0.0), uSize);
  vec2 outside = point - q;
  vec3 p = vec3(q, 0.0);
  vec3 n = vec3(0.0, 0.0, 1.0);
  for (int c = 0; c < 4; c++) {
    vec4 k = uCorners[c];
    if (k.x < 0.0005) continue;
    bool right = c == 1 || c == 2;
    bool bottom = c >= 2;
    vec2 corner = vec2(right ? uSize.x : 0.0, bottom ? uSize.y : 0.0);
    vec2 inward = vec2(right ? -0.70710678 : 0.70710678, bottom ? -0.70710678 : 0.70710678);
    float depth = k.y - dot(q - corner, inward);
    if (depth <= 0.0) continue;
    float angle = min(depth / k.z, k.x);
    float rest = max(depth - k.z * k.x, 0.0);
    float along = k.z * sin(angle) + rest * cos(k.x);
    float rise = k.z * (1.0 - cos(angle)) + rest * sin(k.x);
    p.xy += inward * (depth - along);
    p.z += rise;
    n = vec3(inward * sin(angle), cos(angle));
  }
  p.xy += outside;
  vec2 side = vec2(-uDir.y, uDir.x);
  vec2 rel = p.xy - uGrab;
  float s = dot(rel, uDir);
  float f = (s - uProfileRange.x) / uProfileRange.y;
  float fc = clamp(f, 0.0, 254.999);
  int i = int(fc);
  vec4 a = texelFetch(uProfile, ivec2(i, 0), 0);
  vec4 b = texelFetch(uProfile, ivec2(i + 1, 0), 0);
  vec3 pr = mix(a.xyz, b.xyz, fc - float(i));
  float over = (f - fc) * uProfileRange.y;
  pr.x += over * cos(pr.z);
  pr.y -= over * sin(pr.z);
  float ct = cos(pr.z);
  float st = sin(pr.z);
  float nd = dot(n.xy, uDir);
  float ns = dot(n.xy, side);
  float nz = n.z * ct - nd * st;
  float cr = cos(uRoll);
  float sr = sin(uRoll);
  normal = vec3(uDir * (nd * ct + n.z * st) + side * (ns * cr - nz * sr), ns * sr + nz * cr);
  float across = dot(rel, side);
  float up = pr.y + p.z * ct - uGrabHeight;
  return vec3(uGrab + uDir * (pr.x + p.z * st) + side * (across * cr - up * sr), across * sr + up * cr + uGrabHeight);
}
`,
      C = `
${F}
uniform float uCamera;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vView;
varying float vHeight;

void main() {
  vec3 n;
  vec3 p = bendSheet(position.xy, n);
  vec3 world = vec3(p.x - uSize.x * 0.5 + uShift.x, uSize.y * 0.5 - p.y + uShift.y, p.z);
  vUv = vec2(position.x / uSize.x, 1.0 - position.y / uSize.y);
  vNormal = vec3(n.x, -n.y, n.z);
  vView = vec3(0.0, 0.0, uCamera) - world;
  vHeight = p.z;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`,
      k = `
uniform sampler2D uArt;
uniform vec3 uBack;
uniform vec3 uSheenColor;
uniform float uSheen;
uniform float uFinish;
uniform vec3 uLight;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vView;
varying float vHeight;

void main() {
  vec4 art = texture2D(uArt, vUv);
  if (art.a < 0.004) discard;
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vView);
  vec3 base = art.rgb;
  bool front = gl_FrontFacing;
  if (!front) {
    n = -n;
    base = uBack * art.a;
  }
  float relief = dot(n, uLight) - uLight.z;
  vec3 color = base * clamp(1.0 + relief * 0.22, 0.8, 1.12);
  vec3 r = reflect(-v, n);
  vec3 still = reflect(-v, vec3(0.0, 0.0, 1.0));
  vec2 swing = r.xy - still.xy;
  float amount = length(swing);
  float toward = dot(swing / max(amount, 1e-4), normalize(uLight.xy));
  float softbox = smoothstep(0.02, 0.7, amount) * (0.25 + 0.75 * smoothstep(-0.4, 0.9, toward));
  float facing = max(dot(r, uLight), 0.0);
  float glint = pow(facing, 90.0);
  float gloss = softbox * 0.3 + glint * 0.45;
  float satin = softbox * 0.1;
  float spec = front ? (uFinish > 0.5 && uFinish < 1.5 ? satin : gloss) : satin;
  if (front && uFinish > 1.5) {
    float phase = dot(r.xy, vec2(1.3, 0.8)) * 1.6 + vUv.x * 0.8 - vUv.y * 0.5;
    vec3 spectrum = 0.55 + 0.45 * cos(6.2831853 * (phase + vec3(0.0, 0.33, 0.67)));
    float mixAmount = uSheen * clamp(0.14 + smoothstep(0.0, 0.5, amount) * 0.6 + glint, 0.0, 0.8);
    color += (spectrum * art.a - color) * mixAmount * 0.5;
  }
  color += uSheenColor * spec * uSheen * art.a;
  gl_FragColor = vec4(color, art.a);
}
`,
      E = `
${F}
uniform vec2 uShadowShift;
uniform float uMargin;
uniform float uContact;
varying vec2 vShadowUv;
varying float vHeight;

void main() {
  vec3 n;
  vec3 p = bendSheet(position.xy, n);
  vec3 world = vec3(p.x - uSize.x * 0.5 + uShift.x, uSize.y * 0.5 - p.y + uShift.y, 0.0);
  world.xy += uShadowShift * (max(p.z, 0.0) + uContact);
  vShadowUv = vec2((position.x + uMargin) / (uSize.x + uMargin * 2.0), 1.0 - (position.y + uMargin) / (uSize.y + uMargin * 2.0));
  vHeight = p.z;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`,
      P = `
uniform sampler2D uShadowMap;
uniform float uShadow;
uniform float uLiftRef;
varying vec2 vShadowUv;
varying float vHeight;

void main() {
  vec2 edge = min(vShadowUv, 1.0 - vShadowUv);
  float window = smoothstep(0.0, 0.08, min(edge.x, edge.y));
  vec3 m = texture2D(uShadowMap, vShadowUv).rgb * window;
  float h = max(vHeight, 0.0) / uLiftRef;
  float soft = mix(m.g, m.b, smoothstep(0.1, 0.9, h));
  float rest = m.r * 0.3;
  float lifted = soft * 0.36 / (1.0 + 0.8 * h);
  float a = mix(rest, lifted, smoothstep(0.0, 0.12, h)) * uShadow;
  gl_FragColor = vec4(0.0, 0.0, 0.0, a);
}
`,
      I = (0, i.forwardRef)(function (
        {
          src: e = "/demo-media/abstract-rose-petal.webp",
          alt: t = "Sticker",
          width: a = 300,
          height: o,
          radius: n = 20,
          border: l = 8,
          borderColor: s = "#FFFFFF",
          backColor: x = "#E9E7EF",
          sheenColor: F = "#FFFFFF",
          finish: I = "gloss",
          sheen: R = 0.6,
          rotation: D = 0,
          lift: j = 80,
          tilt: L = 28,
          bend: z = 0.5,
          elasticity: A = 0.5,
          shadow: H = 0.5,
          hoverPeel: T = 0.5,
          idleHint: B = !0,
          draggable: U = !0,
          bounds: W = "parent",
          snapBack: G = !1,
          raiseOnDrag: O = !0,
          autoplay: N = !1,
          autoplaySpeed: Y = 1,
          idleDelay: $ = 2.5,
          defaultPosition: q,
          onDragStart: V,
          onDragEnd: _,
          className: X,
          style: K,
        },
        Z,
      ) {
        let Q = (0, i.useRef)(null),
          J = (0, i.useRef)(null),
          ee = (0, i.useSyncExternalStore)(m, f, () => !1),
          [et, ea] = (0, i.useState)(null),
          [er, ei] = (0, i.useState)(!1),
          eo = (0, i.useRef)({
            src: e,
            radius: n,
            border: l,
            borderColor: s,
            backColor: x,
            sheenColor: F,
            finish: I,
            sheen: R,
            rotation: D,
            lift: j,
            tilt: L,
            bend: z,
            elasticity: A,
            shadow: H,
            hoverPeel: T,
            idleHint: B,
            draggable: U,
            bounds: W,
            snapBack: G,
            raiseOnDrag: O,
            autoplay: N,
            autoplaySpeed: Y,
            idleDelay: $,
            defaultPosition: q ?? { x: 0, y: 0 },
            reduced: ee,
            onDragStart: V,
            onDragEnd: _,
          });
        ((0, i.useEffect)(() => {
          ((eo.current = {
            src: e,
            radius: n,
            border: l,
            borderColor: s,
            backColor: x,
            sheenColor: F,
            finish: I,
            sheen: R,
            rotation: D,
            lift: j,
            tilt: L,
            bend: z,
            elasticity: A,
            shadow: H,
            hoverPeel: T,
            idleHint: B,
            draggable: U,
            bounds: W,
            snapBack: G,
            raiseOnDrag: O,
            autoplay: N,
            autoplaySpeed: Y,
            idleDelay: $,
            defaultPosition: q ?? { x: 0, y: 0 },
            reduced: ee,
            onDragStart: V,
            onDragEnd: _,
          }),
            J.current?.sync());
        }),
          (0, i.useEffect)(() => {
            let e = Q.current;
            if (!e) return;
            let t = ((e, t, a) => {
              let r,
                i = document.createElement("canvas");
              (i.setAttribute("aria-hidden", "true"),
                (i.style.position = "absolute"),
                (i.style.pointerEvents = "none"),
                (i.style.display = "block"),
                (i.style.opacity = "0"),
                e.appendChild(i));
              try {
                r = new c.WebGLRenderer({
                  canvas: i,
                  alpha: !0,
                  antialias: !0,
                  premultipliedAlpha: !0,
                });
              } catch {
                return (i.remove(), null);
              }
              r.setClearColor(0, 0);
              let o = new d.Z58(),
                n = new d.ubm(30, 1, 1, 4e3),
                l = new Float32Array(1024),
                s = new d.GYF(l, 256, 1, d.GWd, d.RQf);
              ((s.minFilter = d.hxR),
                (s.magFilter = d.hxR),
                (s.needsUpdate = !0));
              let u = [0, 1, 2, 3].map(() => new d.IUQ(0, 0, 1, 0)),
                m = {
                  uSize: { value: new d.I9Y(1, 1) },
                  uGrab: { value: new d.I9Y(0.5, 0.5) },
                  uDir: { value: new d.I9Y(0, 1) },
                  uProfile: { value: s },
                  uProfileRange: { value: new d.I9Y(-1, 2 / 255) },
                  uCorners: { value: u },
                  uShift: { value: new d.I9Y(0, 0) },
                  uRoll: { value: 0 },
                  uGrabHeight: { value: 0 },
                },
                f = new d.BKk({
                  uniforms: {
                    ...m,
                    uCamera: { value: 1e3 },
                    uArt: { value: null },
                    uBack: { value: new d.Pq0(0.93, 0.92, 0.95) },
                    uSheenColor: { value: new d.Pq0(1, 1, 1) },
                    uSheen: { value: 0.6 },
                    uFinish: { value: 0 },
                    uLight: { value: new d.Pq0(-0.3, 0.5, 0.8) },
                  },
                  vertexShader: C,
                  fragmentShader: k,
                  side: d.$EB,
                  transparent: !0,
                  premultipliedAlpha: !0,
                  depthTest: !0,
                  depthWrite: !0,
                }),
                x = new d.BKk({
                  uniforms: {
                    ...m,
                    uShadowMap: { value: null },
                    uShadowShift: { value: new d.I9Y(0.1, -0.4) },
                    uMargin: { value: 40 },
                    uContact: { value: 1.5 },
                    uShadow: { value: 0.5 },
                    uLiftRef: { value: 48 },
                  },
                  vertexShader: E,
                  fragmentShader: P,
                  side: d.$EB,
                  transparent: !0,
                  premultipliedAlpha: !0,
                  depthTest: !1,
                  depthWrite: !1,
                }),
                F = new d.eaF(new d.LoY(), f),
                I = new d.eaF(new d.LoY(), x);
              ((F.frustumCulled = !1),
                (I.frustumCulled = !1),
                (I.renderOrder = 0),
                (F.renderOrder = 1),
                o.add(I, F));
              let R = !1,
                D = 0,
                j = 0,
                L = !1,
                z = !0,
                A = 0,
                H = 0,
                T = 1,
                B = 0,
                U = 0,
                W = 1e3,
                G = "",
                O = "",
                N = "",
                Y = null,
                $ = !1,
                q = null,
                V = null,
                _ = !1,
                X = {
                  x: t.current.defaultPosition.x,
                  y: t.current.defaultPosition.y,
                },
                K = { x: 0, y: 0 },
                Z = null,
                Q = { x: X.x, y: X.y },
                J = { x: 0, y: 0 },
                ee = { x: 0, y: 0 },
                et = { x: 0, y: 1 },
                ea = { x: 0, y: 0 },
                er = { x: 0, y: 0 },
                ei = 0,
                eo = 0,
                en = 0,
                el = 0,
                es = 0,
                ed = 0,
                ec = 0,
                eu = [0, 1].map(() => ({
                  angle: new Float64Array(20),
                  speed: new Float64Array(20),
                  target: new Float64Array(20),
                  length: 1,
                })),
                eh = 0,
                ep = [0, 0, 0, 0],
                em = [0, 0, 0, 0],
                ef = null,
                eg = { corner: 0, until: 0, next: performance.now() + 700 },
                ey = -1e9,
                ex = null,
                ev = {
                  phase: "idle",
                  time: 0,
                  next: performance.now() + 1400,
                  route: 0,
                  origin: { x: 0, y: 0 },
                },
                eb = () => {
                  e.style.translate = `${X.x.toFixed(2)}px ${X.y.toFixed(2)}px`;
                };
              eb();
              let ew = (a, r) => {
                  let i = e.getBoundingClientRect(),
                    o = (-t.current.rotation * Math.PI) / 180,
                    n = a - (i.left + i.width / 2),
                    l = r - (i.top + i.height / 2),
                    s = Math.cos(o),
                    d = Math.sin(o);
                  return { x: n * s - l * d + A / 2, y: n * d + l * s + H / 2 };
                },
                eM = () => {
                  let a = t.current,
                    r = e.parentElement;
                  if ("none" === a.bounds || !r)
                    return {
                      min: { x: -1e6, y: -1e6 },
                      max: { x: 1e6, y: 1e6 },
                    };
                  let i = r.getBoundingClientRect(),
                    o = e.getBoundingClientRect(),
                    n = (e, t) =>
                      e <= t ? [e, t] : [(e + t) / 2, (e + t) / 2],
                    [l, s] = n(X.x + i.left - o.left, X.x + i.right - o.right),
                    [d, c] = n(X.y + i.top - o.top, X.y + i.bottom - o.bottom);
                  return { min: { x: l, y: d }, max: { x: s, y: c } };
                },
                eS = (e, t, a) =>
                  e < t
                    ? t - ((t - e) * 0.3) / (1 + (t - e) / 400)
                    : e > a
                      ? a + ((e - a) * 0.3) / (1 + (e - a) / 400)
                      : e,
                eF = () => {
                  let o, l, s, c;
                  if (R) return;
                  let u = t.current,
                    h = e.offsetWidth,
                    p = e.offsetHeight;
                  if (h < 4 || p < 4) return;
                  if (u.src !== O && u.src !== N) {
                    O = u.src;
                    let e = u.src;
                    if (
                      (new Promise((t, a) => {
                        let r = new Image();
                        ((r.crossOrigin = "anonymous"),
                          (r.decoding = "async"),
                          (r.onload = () => t(r)),
                          (r.onerror = () => a(Error("image"))),
                          (r.src = e));
                      })
                        .then((r) => {
                          if (R || t.current.src !== e) return;
                          ((Y = r),
                            ($ = ((e) => {
                              try {
                                let t = document.createElement("canvas");
                                ((t.width = 48), (t.height = 48));
                                let a = t.getContext("2d", {
                                  willReadFrequently: !0,
                                });
                                if (!a) return !1;
                                a.drawImage(e, 0, 0, 48, 48);
                                let r = a.getImageData(0, 0, 48, 48).data;
                                for (let e = 3; e < r.length; e += 4)
                                  if (r[e] < 230) return !0;
                                return !1;
                              } catch {
                                return !1;
                              }
                            })(r)));
                          let i = b(r);
                          (a.onAspect(i.width / i.height), (G = ""), eF());
                        })
                        .catch(() => {
                          R ||
                            t.current.src !== e ||
                            ((N = e), (Y = null), ($ = !1), (G = ""), eF());
                        }),
                      !Y)
                    )
                      return;
                  }
                  let C = [
                    h,
                    p,
                    u.src,
                    u.radius,
                    u.border,
                    u.borderColor,
                    u.lift,
                    +!!Y,
                  ].join("|");
                  if (C === G) return;
                  ((G = C), (A = h), (H = p));
                  let k =
                      ((o = t.current),
                      (U = Math.ceil(3.4 * (0.07 * (T = Math.max(A, H)) + 6))),
                      (B = Math.ceil(0.28 * T + 1.1 * o.lift + 0.6 * U + 24)),
                      (W = Math.max(620, 2.4 * T)),
                      (l = A + 2 * B),
                      (s = H + 2 * B),
                      (c = Math.min(
                        window.devicePixelRatio || 1,
                        2,
                        2400 / Math.max(l, s),
                      )),
                      r.setPixelRatio(c),
                      r.setSize(l, s, !1),
                      (i.style.left = `${-B}px`),
                      (i.style.top = `${-B}px`),
                      (i.style.width = `${l}px`),
                      (i.style.height = `${s}px`),
                      (n.aspect = l / s),
                      (n.fov = (2 * Math.atan(s / 2 / W) * 180) / Math.PI),
                      (n.near = 0.05 * W),
                      (n.far = 4 * W),
                      n.position.set(0, 0, W),
                      n.lookAt(0, 0, 0),
                      n.updateProjectionMatrix(),
                      (f.uniforms.uCamera.value = W),
                      F.geometry.dispose(),
                      I.geometry.dispose(),
                      (F.geometry = S(0, 0, A, H, Math.max(2.5, T / 110))),
                      (I.geometry = S(
                        -U,
                        -U,
                        A + U,
                        H + U,
                        Math.max(6, T / 40),
                      )),
                      m.uSize.value.set(A, H),
                      (x.uniforms.uMargin.value = U),
                      1.25 * Math.min(window.devicePixelRatio || 1, 2)),
                    E = ((e, t, a, r, i, o) => {
                      let n = document.createElement("canvas");
                      ((n.width = Math.max(2, Math.round(a * i))),
                        (n.height = Math.max(2, Math.round(r * i))));
                      let l = n.getContext("2d");
                      if (!l) return n;
                      let s = g(o.border, 0, Math.min(a, r) / 4);
                      if (!t || !e) {
                        (l.scale(i, i),
                          w(l, 0, 0, a, r, o.radius),
                          (l.fillStyle = o.borderColor),
                          l.fill(),
                          l.save(),
                          w(
                            l,
                            s,
                            s,
                            a - 2 * s,
                            r - 2 * s,
                            Math.max(0, o.radius - s),
                          ),
                          l.clip());
                        let t = a - 2 * s,
                          d = r - 2 * s;
                        if (e) {
                          let a = b(e),
                            r = Math.max(t / a.width, d / a.height),
                            i = a.width * r,
                            o = a.height * r;
                          l.drawImage(
                            e,
                            s + (t - i) / 2,
                            s + (d - o) / 2,
                            i,
                            o,
                          );
                        } else {
                          let e = l.createLinearGradient(s, s, a - s, r - s);
                          (e.addColorStop(0, "#5227FF"),
                            e.addColorStop(1, "#FF9FFC"),
                            (l.fillStyle = e),
                            l.fillRect(s, s, t, d));
                        }
                        return (l.restore(), n);
                      }
                      let d = b(e),
                        c = Math.min(
                          (a - 2 * s) / d.width,
                          (r - 2 * s) / d.height,
                        ),
                        u = d.width * c * i,
                        h = d.height * c * i,
                        p = (n.width - u) / 2,
                        m = (n.height - h) / 2;
                      if (s > 0) {
                        let t = document.createElement("canvas");
                        ((t.width = n.width), (t.height = n.height));
                        let a = t.getContext("2d", { willReadFrequently: !0 }),
                          r = document.createElement("canvas");
                        if (((r.width = n.width), (r.height = n.height), a)) {
                          (a.drawImage(e, p, m, u, h),
                            (a.globalCompositeOperation = "source-in"),
                            (a.fillStyle = "#000"),
                            a.fillRect(0, 0, t.width, t.height));
                          let d = a.getImageData(0, 0, t.width, t.height).data,
                            c = M(r, t, 0, 0, t.width, t.height, (s * i) / 1.5);
                          if (c) {
                            let [e, t, a] = v(o.borderColor, [1, 1, 1]),
                              r = l.createImageData(n.width, n.height),
                              i = r.data;
                            for (let r = 0; r < i.length; r += 4) {
                              let o = Math.max(
                                y(0.05, 0.085, c[r + 3] / 255),
                                d[r + 3] / 255,
                              );
                              ((i[r] = 255 * e),
                                (i[r + 1] = 255 * t),
                                (i[r + 2] = 255 * a),
                                (i[r + 3] = 255 * o));
                            }
                            let s = document.createElement("canvas");
                            ((s.width = n.width),
                              (s.height = n.height),
                              s.getContext("2d")?.putImageData(r, 0, 0),
                              l.drawImage(s, 0, 0));
                          }
                        }
                      }
                      return (l.drawImage(e, p, m, u, h), n);
                    })(Y, $, A, H, k, u);
                  try {
                    E.getContext("2d")?.getImageData(0, 0, 1, 1);
                  } catch {
                    ((L = !1), a.onFail());
                    return;
                  }
                  let P = ((e, t, a, r, i) => {
                    let o = document.createElement("canvas");
                    ((o.width = Math.max(2, Math.ceil((t + 2 * r) * 0.5))),
                      (o.height = Math.max(2, Math.ceil((a + 2 * r) * 0.5))));
                    let n = document.createElement("canvas");
                    ((n.width = o.width), (n.height = o.height));
                    let l = i.map((i) =>
                        M(n, e, 0.5 * r, 0.5 * r, 0.5 * t, 0.5 * a, 0.5 * i),
                      ),
                      s = o.getContext("2d");
                    if (!s) return o;
                    let d = s.createImageData(o.width, o.height),
                      c = d.data;
                    for (let e = 0; e < c.length; e += 4)
                      ((c[e] = l[0]?.[e + 3] ?? 0),
                        (c[e + 1] = l[1]?.[e + 3] ?? 0),
                        (c[e + 2] = l[2]?.[e + 3] ?? 0),
                        (c[e + 3] = 255));
                    return (s.putImageData(d, 0, 0), o);
                  })(E, A, H, U, [1.4, 0.03 * T + 3, 0.07 * T + 6]);
                  (q?.dispose(),
                    V?.dispose(),
                    ((q = new d.GOR(E)).colorSpace = d.jf0),
                    (q.premultiplyAlpha = !0),
                    (q.anisotropy = Math.min(
                      8,
                      r.capabilities.getMaxAnisotropy(),
                    )),
                    (q.minFilter = d.$_I),
                    (q.generateMipmaps = !0),
                    ((V = new d.GOR(P)).colorSpace = d.jf0),
                    (V.generateMipmaps = !1),
                    (V.minFilter = d.k6q),
                    (f.uniforms.uArt.value = q),
                    (x.uniforms.uShadowMap.value = V),
                    (L = !0),
                    (_ = !1),
                    eI(),
                    (i.style.opacity = "1"),
                    eH());
                },
                eC = (e) => ({
                  x: 1 === e || 2 === e ? A : 0,
                  y: e >= 2 ? H : 0,
                }),
                ek = () => {
                  let e = { x: -et.y, y: et.x },
                    t = 1,
                    a = 1,
                    r = 1;
                  for (let i = 0; i < 4; i++) {
                    let o = eC(i),
                      n = (o.x - ee.x) * et.x + (o.y - ee.y) * et.y;
                    ((t = Math.max(t, n)),
                      (a = Math.max(a, -n)),
                      (r = Math.max(
                        r,
                        Math.abs((o.x - ee.x) * e.x + (o.y - ee.y) * e.y),
                      )));
                  }
                  return ((eu[0].length = t), (eu[1].length = a), r);
                },
                eE = (e) => {
                  if (ei > 0.05) return;
                  ((ee.x = g(e.x, 0, A)), (ee.y = g(e.y, 0, H)));
                  let t = A / 2 - ee.x,
                    a = H / 2 - ee.y,
                    r = Math.hypot(t, a);
                  for (let e of (r > 0.08 * T
                    ? ((et.x = t / r), (et.y = a / r))
                    : A >= H
                      ? ((et.x = 1), (et.y = 0))
                      : ((et.x = 0), (et.y = 1)),
                  ek(),
                  eu))
                    (e.angle.fill(0), e.speed.fill(0));
                },
                eP = (e, t) => {
                  let a = 19 * g(t / e.length, 0, 1),
                    r = Math.min(18, Math.floor(a));
                  return e.angle[r] + (e.angle[r + 1] - e.angle[r]) * (a - r);
                },
                eI = () => {
                  if (!L) return;
                  let e = t.current,
                    a = Math.min(A, H),
                    i = eu.some((e) => e.angle.some((e) => Math.abs(e) > 1e-4));
                  if (ed > 0.05 || i)
                    (((e, t) => {
                      let a = [
                          { x: -U, y: -U },
                          { x: A + U, y: -U },
                          { x: A + U, y: H + U },
                          { x: -U, y: H + U },
                        ].map((e) => (e.x - ee.x) * et.x + (e.y - ee.y) * et.y),
                        r = Math.min(...a),
                        i = (Math.max(...a) - r) / 255;
                      m.uProfileRange.value.set(r, i);
                      let o = -r / i;
                      for (let a of [1, -1]) {
                        let n = eu[a > 0 ? 0 : 1],
                          s = n.angle[0],
                          d = 0,
                          c = e,
                          u = 0,
                          h = !1,
                          p = a > 0 ? Math.ceil(o) : Math.floor(o);
                        for (let e = p; a > 0 ? e < 256 : e >= 0; e += a) {
                          let o = Math.abs(r + e * i),
                            p = Math.max(0, o - u),
                            m = s;
                          if (!h) {
                            let e = g(eP(n, o), -1.45, 1.45),
                              a = c - p * Math.sin((s + e) / 2);
                            e > 0 && a <= t * (1 - Math.cos(e))
                              ? (h = !0)
                              : ((m = (s + e) / 2), (s = e));
                          }
                          if (h) {
                            let e = Math.max(0, s - p / t);
                            ((m = (s + e) / 2), (s = e));
                          }
                          ((d += p * Math.cos(m)),
                            (c -= p * Math.sin(m)),
                            h && 0 === s && (c = Math.max(0, c - 0.4 * p)),
                            c < 0 && (c = 0),
                            (u = o));
                          let f = 4 * e;
                          ((l[f] = a * d),
                            (l[f + 1] = c),
                            (l[f + 2] = a * s),
                            (l[f + 3] = 0));
                        }
                      }
                      s.needsUpdate = !0;
                    })(ed, 0.08 * a + 4),
                      (_ = !1));
                  else if (!_) {
                    let e = -(4 * T),
                      t = (8 * T) / 255;
                    l.fill(0);
                    for (let a = 0; a < 256; a++) l[4 * a] = e + a * t;
                    (m.uProfileRange.value.set(e, t),
                      (s.needsUpdate = !0),
                      (_ = !0));
                  }
                  (m.uDir.value.set(et.x, et.y),
                    m.uGrab.value.set(ee.x, ee.y),
                    (m.uRoll.value = es),
                    (m.uGrabHeight.value = ed));
                  let c = ed / W;
                  m.uShift.value.set(-(ee.x - A / 2) * c, (ee.y - H / 2) * c);
                  let h = g(e.hoverPeel, 0, 1);
                  for (let t = 0; t < 4; t++) {
                    let r = e.reduced ? 0 : ep[t];
                    u[t].set(
                      Math.max(0, r) * (0.6 + 2.2 * h),
                      (0.08 + 0.14 * Math.max(0, r)) * a,
                      0.045 * a + 3,
                      0,
                    );
                  }
                  let p = (e.rotation * Math.PI) / 180,
                    y = Math.cos(p),
                    b = Math.sin(p),
                    w = { x: -0.42 * y + -0.62 * b, y: 0.42 * b + -0.62 * y },
                    M = new d.Pq0(w.x, -w.y, 1).normalize();
                  f.uniforms.uLight.value.copy(M);
                  let S = { x: 0.1 * y + 0.42 * b, y: -0.1 * b + 0.42 * y };
                  (x.uniforms.uShadowShift.value.set(S.x, -S.y),
                    (x.uniforms.uShadow.value = 2 * g(e.shadow, 0, 1)),
                    (x.uniforms.uLiftRef.value = Math.max(8, e.lift)),
                    (f.uniforms.uSheen.value = g(e.sheen, 0, 1)),
                    (f.uniforms.uFinish.value =
                      "matte" === e.finish ? 1 : 2 * ("holo" === e.finish)));
                  let F = v(e.backColor, [0.93, 0.92, 0.95]);
                  f.uniforms.uBack.value.set(F[0], F[1], F[2]);
                  let C = v(e.sheenColor, [1, 1, 1]);
                  (f.uniforms.uSheenColor.value.set(C[0], C[1], C[2]),
                    r.render(o, n));
                },
                eR = (e, t, a, r, i, o) => {
                  let n = t + (r * r * (a - e) - 2 * i * r * t) * o;
                  return [e + n * o, n];
                },
                eD = (a) => {
                  let r,
                    i = ex;
                  if (!i) return;
                  if (
                    ((ex = null),
                    (e.style.cursor = ""),
                    e.hasPointerCapture(i.id))
                  )
                    try {
                      e.releasePointerCapture(i.id);
                    } catch {}
                  let o = t.current;
                  if (a) r = { ...i.origin };
                  else if (o.snapBack) r = { x: 0, y: 0 };
                  else {
                    let e = Math.min(
                      1,
                      60 / Math.max(1, 0.08 * Math.hypot(J.x, J.y)),
                    );
                    r = {
                      x: g(X.x + 0.08 * J.x * e, i.min.x, i.max.x),
                      y: g(X.y + 0.08 * J.y * e, i.min.y, i.max.y),
                    };
                  }
                  ((Z = r),
                    (K.x = o.reduced ? 0 : J.x),
                    (K.y = o.reduced ? 0 : J.y),
                    (ey = performance.now()),
                    o.onDragEnd?.({ x: Math.round(r.x), y: Math.round(r.y) }),
                    eH());
                },
                ej = (a, r, i, o) => {
                  let n = t.current,
                    l = eM();
                  ex = {
                    id: a,
                    startX: r,
                    startY: i,
                    origin: { ...X },
                    min: l.min,
                    max: l.max,
                  };
                  let s = ei < 0.05;
                  (eE(o),
                    (ec = s && !n.reduced ? 1 : 0),
                    (Z = null),
                    (K.x = 0),
                    (K.y = 0),
                    n.raiseOnDrag && (e.style.zIndex = String(++p)),
                    (e.style.cursor = "grabbing"),
                    n.reduced || (el += 2.2 * n.bend),
                    n.onDragStart?.(),
                    eH());
                },
                eL = () => {
                  "drag" === ev.phase &&
                    ((ev.phase = "idle"),
                    ex && -1 === ex.id && eD(!1),
                    (Z = { ...ev.origin }));
                },
                ez = 0,
                eA = (e) => {
                  var a;
                  if (((D = 0), R || !L)) return;
                  let r = Math.min(0.05, Math.max(0, (e - j) / 1e3));
                  ((j = e),
                    ((e, a) => {
                      var r, i;
                      let o,
                        n,
                        l,
                        s = t.current,
                        d = s.reduced;
                      if (
                        (((e, a) => {
                          let r,
                            i = t.current;
                          if (!(i.autoplay && !i.reduced && L && z && !ef)) {
                            ("drag" === ev.phase && eL(),
                              (ev.next = Math.max(
                                ev.next,
                                e + 1e3 * i.idleDelay,
                              )));
                            return;
                          }
                          if (ex && -1 !== ex.id) return;
                          let o = e - ey;
                          if ("idle" === ev.phase) {
                            if (e < ev.next || o < 1e3 * i.idleDelay) return;
                            ((ev.phase = "drag"),
                              (ev.time = 0),
                              (ev.origin = { ...X }));
                            let t = [
                                { x: 0.74, y: 0.3 },
                                { x: 0.28, y: 0.7 },
                                { x: 0.66, y: 0.74 },
                                { x: 0.32, y: 0.28 },
                              ],
                              a = t[ev.route % t.length];
                            (ej(-1, 0, 0, { x: a.x * A, y: a.y * H }),
                              ex &&
                                ((ex.min = { x: -1e6, y: -1e6 }),
                                (ex.max = { x: 1e6, y: 1e6 })));
                            return;
                          }
                          ev.time += a * Math.max(0.1, i.autoplaySpeed);
                          let n =
                              (r = g(ev.time / 2.8, 0, 1)) *
                              r *
                              r *
                              (r * (6 * r - 15) + 10),
                            l = Math.min(0.24 * T, 90),
                            s = ev.route % 2,
                            d = h * n,
                            c =
                              0 === s
                                ? {
                                    x: l * Math.sin(d),
                                    y: -(0.45 * l) * (1 - Math.cos(d)),
                                  }
                                : {
                                    x: -(0.9 * l) * Math.sin(d),
                                    y: 0.38 * l * Math.sin(2 * d),
                                  };
                          ((X.x = ev.origin.x + c.x),
                            (X.y = ev.origin.y + c.y),
                            eb(),
                            ev.time >= 2.8 &&
                              ((ev.phase = "idle"),
                              (ev.route += 1),
                              (ev.next =
                                e + 2200 / Math.max(0.1, i.autoplaySpeed)),
                              (X.x = ev.origin.x),
                              (X.y = ev.origin.y),
                              eD(!1),
                              (Z = { ...ev.origin }),
                              (ey = -1e9)));
                        })(e, a),
                        !ex && Z)
                      ) {
                        let e = X.x,
                          t = X.y,
                          r = K.x,
                          i = K.y,
                          o = Math.max(1, Math.ceil(a / (1 / 240))),
                          n = a / o;
                        for (let a = 0; a < o; a++)
                          (([e, r] = eR(e, r, Z.x, d ? 40 : 13, 1, n)),
                            ([t, i] = eR(t, i, Z.y, d ? 40 : 13, 1, n)));
                        ((X.x = e),
                          (X.y = t),
                          (K.x = r),
                          (K.y = i),
                          0.05 > Math.abs(Z.x - e) &&
                            0.05 > Math.abs(Z.y - t) &&
                            1 > Math.hypot(r, i) &&
                            ((X.x = Z.x),
                            (X.y = Z.y),
                            (Z = null),
                            (K.x = 0),
                            (K.y = 0)),
                          eb());
                      }
                      if (a > 0) {
                        let e = 1 - Math.exp(-a / 0.05);
                        ((J.x += ((X.x - Q.x) / a - J.x) * e),
                          (J.y += ((X.y - Q.y) / a - J.y) * e));
                      }
                      let c = Math.hypot(X.x - Q.x, X.y - Q.y);
                      ((Q.x = X.x), (Q.y = X.y));
                      let u = !!ex || e < eh,
                        p = ex ? 1 : 0.55 * (e < eh),
                        m = g(s.elasticity, 0, 1),
                        f = d ? 0 : (g(s.tilt, 0, 60) * Math.PI) / 180,
                        x =
                          ((r = J.x),
                          (i = J.y),
                          (n = Math.cos(
                            (o = (-t.current.rotation * Math.PI) / 180),
                          )),
                          {
                            x: r * n - i * (l = Math.sin(o)),
                            y: r * l + i * n,
                          }),
                        v = y(0, 0.35, ei),
                        b = (-x.x * f) / 1100,
                        w = (-x.y * f) / 1100,
                        M = Math.hypot(b, w);
                      (M > f && M > 0 && ((b *= f / M), (w *= f / M)),
                        (b *= v),
                        (w *= v));
                      let S = Math.min(1, Math.hypot(x.x, x.y) / 1400),
                        F = d ? 0 : 0.35 * s.bend * S * v,
                        C = Math.max(1, Math.ceil(a / (1 / 240))),
                        k = a / C;
                      for (let e = 0; e < C; e++) {
                        if (d) ((ei = p), (eo = 0));
                        else {
                          let e = p > ei;
                          (([ei, eo] = eR(
                            ei,
                            eo,
                            p,
                            e ? 19 : 15,
                            e ? 0.62 : 0.95,
                            k,
                          )),
                            ei < 0 && ((ei = 0), (eo = 0)));
                        }
                        (([ea.x, er.x] = eR(
                          ea.x,
                          er.x,
                          b,
                          9.5,
                          0.78 - 0.5 * m,
                          k,
                        )),
                          ([ea.y, er.y] = eR(
                            ea.y,
                            er.y,
                            w,
                            9.5,
                            0.78 - 0.5 * m,
                            k,
                          )),
                          ([en, el] = eR(en, el, F, 16, 0.55 - 0.4 * m, k)));
                      }
                      d && ((ea.x = 0), (ea.y = 0), (en = 0));
                      let E = y(0, 0.35, ei),
                        P = y(
                          0,
                          1,
                          (ec = ex ? Math.max(0, ec - a / 0.26 - c / 160) : 0),
                        ),
                        I = ek(),
                        R = Math.hypot(A / 2 - ee.x, H / 2 - ee.y) / (T / 2),
                        D = ea.x * et.x + ea.y * et.y;
                      es = -ea.x * et.y + ea.y * et.x;
                      let j = -(0.5 * f * Math.min(1, R) * E + D),
                        B = d ? 0 : g(s.bend, 0, 1);
                      eu.forEach((e, t) => {
                        let a = 0 === t ? 1 : -1,
                          r = (0.8 * B * (e.length / T) + en) * E;
                        for (let t = 0; t < 20; t++) {
                          let i = t / 19,
                            o =
                              0.95 *
                              Math.tanh(
                                (a * j - r * (0.3 * i + 0.7 * i * i)) / 0.95,
                              );
                          e.target[t] = o + (0.8 * y(0, 0.3, i) - o) * P;
                        }
                      });
                      let U = 11 - 8 * m;
                      for (let e of eu) {
                        let t = e.angle,
                          a = e.speed,
                          r = e.target;
                        if (d) {
                          (t.set(r), a.fill(0));
                          continue;
                        }
                        for (let e = 0; e < C; e++) {
                          ((t[0] = r[0]), (a[0] = 0));
                          for (let e = 1; e < 20; e++) {
                            let i = t[e] - r[e],
                              o = t[e - 1] - r[e - 1],
                              n = e + 1 < 20 ? t[e + 1] - r[e + 1] : i;
                            a[e] +=
                              (9e3 * (o - 2 * i + n) - 70 * i - U * a[e]) * k;
                          }
                          for (let e = 1; e < 20; e++) t[e] += a[e] * k;
                        }
                      }
                      let G = Math.hypot(J.x, J.y),
                        O = I * Math.sin(Math.min(1.2, Math.abs(es))) + 4;
                      ed = Math.min(
                        0.3 * W,
                        Math.max(
                          ei * s.lift * (1 + 0.25 * Math.min(1, G / 1500)),
                          O * E,
                        ),
                      );
                      let N = Math.min(A, H),
                        Y = s.idleHint && !d && !ex && !ef && e < eg.until;
                      s.idleHint &&
                        !d &&
                        !ex &&
                        !ef &&
                        e >= eg.next &&
                        ei < 0.02 &&
                        L &&
                        (eg = {
                          corner:
                            (eg.corner + 1 + Math.floor(3 * Math.random())) % 4,
                          until: e + 1250,
                          next: e + 4200 + 2600 * Math.random(),
                        });
                      for (let e = 0; e < 4; e++) {
                        let t = 0;
                        if (!u && ei < 0.2) {
                          if (ef) {
                            let a = eC(e);
                            t =
                              1 -
                              y(
                                0.12 * N,
                                0.62 * N,
                                Math.hypot(ef.x - a.x, ef.y - a.y),
                              );
                          }
                          Y && eg.corner === e && (t = Math.max(t, 0.55));
                        }
                        let a = ep[e],
                          r = em[e];
                        for (let e = 0; e < C; e++)
                          [a, r] = eR(a, r, t, 13, 0.6, k);
                        ((ep[e] = a), (em[e] = r));
                      }
                    })(e, r),
                    eI());
                  let i = t.current,
                    o = "drag" === ev.phase || !!ef;
                  if (!z) return;
                  if (
                    !(
                      !ex &&
                      !Z &&
                      ei < 5e-4 &&
                      0.001 > Math.abs(eo) &&
                      5e-4 > Math.hypot(ea.x, ea.y) &&
                      0.001 > Math.hypot(er.x, er.y) &&
                      1e-6 > Math.abs(en) &&
                      1e-5 > Math.abs(el) &&
                      eu.every(
                        (e) =>
                          e.angle.every((e) => 1e-4 > Math.abs(e)) &&
                          e.speed.every((e) => 0.001 > Math.abs(e)),
                      ) &&
                      ep.every(
                        (e, t) =>
                          0.001 > Math.abs(e) && 0.002 > Math.abs(em[t]),
                      ) &&
                      0.5 > Math.hypot(J.x, J.y)
                    ) ||
                    o
                  ) {
                    D = requestAnimationFrame(eA);
                    return;
                  }
                  ((ei = 0), (ea.x = 0), (ea.y = 0), (J.x = 0), (J.y = 0));
                  for (let e = 0; e < 4; e++) ((ep[e] = 0), (em[e] = 0));
                  for (let e of eu) (e.angle.fill(0), e.speed.fill(0));
                  let n = [];
                  (i.idleHint && !i.reduced && n.push(eg.next),
                    i.autoplay &&
                      !i.reduced &&
                      n.push(Math.max(ev.next, ey + 1e3 * i.idleDelay)),
                    n.length &&
                      ((a = Math.min(...n) - e),
                      window.clearTimeout(ez),
                      (ez = window.setTimeout(
                        () => {
                          ((ez = 0), eH());
                        },
                        Math.max(16, a),
                      ))));
                },
                eH = () => {
                  !R &&
                    !D &&
                    L &&
                    z &&
                    ((j = performance.now()), (D = requestAnimationFrame(eA)));
                },
                eT = (a) => {
                  if (
                    !t.current.draggable ||
                    0 !== a.button ||
                    !L ||
                    (ex && -1 !== ex.id)
                  )
                    return;
                  let r = ew(a.clientX, a.clientY);
                  (eL(), a.preventDefault());
                  try {
                    e.setPointerCapture(a.pointerId);
                  } catch {}
                  ((ey = performance.now()),
                    ej(a.pointerId, a.clientX, a.clientY, r));
                },
                eB = (e) => {
                  if (ex && ex.id === e.pointerId) {
                    let t = ex.origin.x + e.clientX - ex.startX,
                      a = ex.origin.y + e.clientY - ex.startY;
                    ((X.x = eS(t, ex.min.x, ex.max.x)),
                      (X.y = eS(a, ex.min.y, ex.max.y)),
                      eb(),
                      eH());
                    return;
                  }
                  "touch" !== e.pointerType &&
                    ((ef = ew(e.clientX, e.clientY)),
                    (ey = performance.now()),
                    "drag" === ev.phase && eL(),
                    eH());
                },
                eU = (e) => {
                  (ex && ex.id === e.pointerId) ||
                    ((ef = null), (ey = performance.now()), eH());
                },
                eW = (e) => {
                  ex && ex.id === e.pointerId && eD(!1);
                },
                eG = (e) => {
                  let a = t.current;
                  if (!a.draggable) return;
                  if ("Escape" === e.key && ex && -1 !== ex.id) {
                    (e.preventDefault(), eD(!0));
                    return;
                  }
                  let r = e.shiftKey ? 48 : 12,
                    i = {
                      ArrowLeft: { x: -r, y: 0 },
                      ArrowRight: { x: r, y: 0 },
                      ArrowUp: { x: 0, y: -r },
                      ArrowDown: { x: 0, y: r },
                    }[e.key];
                  if (i) {
                    (e.preventDefault(), eL());
                    let t = eM(),
                      r = Z ?? X;
                    ((Z = {
                      x: g(r.x + i.x, t.min.x, t.max.x),
                      y: g(r.y + i.y, t.min.y, t.max.y),
                    }),
                      eE({ x: A / 2, y: H / 2 }),
                      (eh = performance.now() + 140),
                      (ey = performance.now()),
                      a.onDragEnd?.({ x: Math.round(Z.x), y: Math.round(Z.y) }),
                      eH());
                    return;
                  }
                  if ("Enter" === e.key || " " === e.key) {
                    (e.preventDefault(), eN());
                    return;
                  }
                  "Home" === e.key && (e.preventDefault(), eY());
                },
                eO = () => {
                  ex && -1 !== ex.id && eD(!1);
                },
                eN = () => {
                  L &&
                    (eL(),
                    eE({ x: 0.78 * A, y: 0.22 * H }),
                    (eh = performance.now() + 620),
                    (er.x -= 0.9),
                    (er.y += 0.4),
                    (ey = performance.now()),
                    eH());
                },
                eY = () => {
                  (eL(),
                    (Z = {
                      x: t.current.defaultPosition.x,
                      y: t.current.defaultPosition.y,
                    }),
                    eE({ x: A / 2, y: H / 2 }),
                    (eh = performance.now() + 200),
                    eH());
                };
              (e.addEventListener("pointerdown", eT),
                e.addEventListener("pointermove", eB),
                e.addEventListener("pointerleave", eU),
                e.addEventListener("pointerup", eW),
                e.addEventListener("pointercancel", eW),
                e.addEventListener("lostpointercapture", eW),
                e.addEventListener("keydown", eG),
                window.addEventListener("blur", eO));
              let e$ = new ResizeObserver(() => eF());
              e$.observe(e);
              let eq = new IntersectionObserver(
                (e) => {
                  (z = e.some((e) => e.isIntersecting)) && eH();
                },
                { rootMargin: "120px" },
              );
              eq.observe(e);
              let eV = (e) => {
                (e.preventDefault(), (L = !1), a.onFail());
              };
              return (
                i.addEventListener("webglcontextlost", eV),
                eF(),
                {
                  sync: () => {
                    (eF(), L && (eI(), eH()));
                  },
                  destroy: () => {
                    ((R = !0),
                      cancelAnimationFrame(D),
                      window.clearTimeout(ez),
                      e.removeEventListener("pointerdown", eT),
                      e.removeEventListener("pointermove", eB),
                      e.removeEventListener("pointerleave", eU),
                      e.removeEventListener("pointerup", eW),
                      e.removeEventListener("pointercancel", eW),
                      e.removeEventListener("lostpointercapture", eW),
                      e.removeEventListener("keydown", eG),
                      window.removeEventListener("blur", eO),
                      i.removeEventListener("webglcontextlost", eV),
                      e$.disconnect(),
                      eq.disconnect(),
                      F.geometry.dispose(),
                      I.geometry.dispose(),
                      f.dispose(),
                      x.dispose(),
                      s.dispose(),
                      q?.dispose(),
                      V?.dispose(),
                      r.dispose(),
                      r.forceContextLoss(),
                      i.remove(),
                      (e.style.translate = ""),
                      (e.style.cursor = ""));
                  },
                  peel: eN,
                  reset: eY,
                  moveTo: (e, t) => {
                    (eL(),
                      (Z = { x: e, y: t }),
                      eE({ x: A / 2, y: H / 2 }),
                      (eh = performance.now() + 240),
                      eH());
                  },
                }
              );
            })(e, eo, { onAspect: ea, onFail: () => ei(!0) });
            return (
              (J.current = t),
              t || queueMicrotask(() => ei(!0)),
              () => {
                (t?.destroy(), (J.current = null));
              }
            );
          }, []),
          (0, i.useImperativeHandle)(
            Z,
            () => ({
              peel: () => J.current?.peel(),
              reset: () => J.current?.reset(),
              moveTo: (e, t) => J.current?.moveTo(e, t),
            }),
            [],
          ));
        let en = o ?? Math.round(a / (et ?? 4 / 3));
        return (0, r.jsx)("div", {
          ref: Q,
          role: "button",
          tabIndex: U ? 0 : -1,
          "aria-roledescription": "draggable sticker",
          "aria-label": t,
          className: (0, u.cn)(
            "relative inline-block shrink-0 touch-none select-none outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current",
            U ? "cursor-grab" : "cursor-default",
            X,
          ),
          style: {
            width: a,
            maxWidth: "100%",
            aspectRatio: `${a} / ${en}`,
            borderRadius: n,
            rotate: `${D}deg`,
            WebkitTapHighlightColor: "transparent",
            ...K,
          },
          children:
            er &&
            (0, r.jsx)("img", {
              src: e,
              alt: "",
              draggable: !1,
              style: {
                display: "block",
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: n,
                border: `${l}px solid ${s}`,
                boxSizing: "border-box",
                boxShadow: "0 1px 2px rgba(0,0,0,0.18)",
              },
            }),
        });
      });
    I.displayName = "ElasticSticker";
    let R = `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="560" height="560" viewBox="0 0 280 280"><defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C9B8FF"/><stop offset="0.45" stop-color="#7B5CFF"/><stop offset="1" stop-color="#5227FF"/></linearGradient><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFD0FB"/><stop offset="1" stop-color="#FF9FFC"/></linearGradient></defs><path d="M118 34C126 104 150 132 222 140C150 148 126 176 118 246C110 176 86 148 14 140C86 132 110 104 118 34Z" fill="url(#a)"/><path d="M214 18C218 50 228 60 260 64C228 68 218 78 214 110C210 78 200 68 168 64C200 60 210 50 214 18Z" fill="url(#b)"/></svg>')}`,
      D = {
        src: "/demo-media/abstract-rose-petal.webp",
        width: 300,
        radius: 20,
        border: 8,
        finish: "gloss",
        sheen: 0.6,
        rotation: -4,
        lift: 80,
        tilt: 28,
        bend: 0.5,
        elasticity: 0.5,
        colors: ["#FFFFFF", "#E9E7EF", "#FFFFFF"],
      },
      j = {
        photo: D,
        holo: {
          ...D,
          src: "/demo-media/abstract-iris-window.webp",
          radius: 24,
          border: 6,
          finish: "holo",
          sheen: 0.85,
          rotation: 3,
          colors: ["#F4F1FF", "#D9D4E6", "#FFFFFF"],
        },
        diecut: {
          ...D,
          src: R,
          width: 260,
          border: 12,
          finish: "gloss",
          sheen: 0.7,
          rotation: -6,
          bend: 0.35,
          colors: ["#FFFFFF", "#EDEAF4", "#FFFFFF"],
        },
        card: {
          ...D,
          src: "/demo-media/abstract-rose-balance.webp",
          radius: 12,
          border: 0,
          finish: "matte",
          sheen: 0.5,
          rotation: 0,
          lift: 60,
          tilt: 18,
          bend: 0.15,
          elasticity: 0.3,
        },
        floppy: {
          ...D,
          src: "/demo-media/abstract-citrus-signal.webp",
          rotation: 5,
          lift: 100,
          tilt: 34,
          bend: 1,
          elasticity: 0.85,
        },
      },
      L = [
        { label: "Photo", value: "photo" },
        { label: "Holo", value: "holo" },
        { label: "Die-cut", value: "diecut" },
        { label: "Card", value: "card" },
        { label: "Floppy", value: "floppy" },
      ],
      z = [
        { label: "Gloss", value: "gloss" },
        { label: "Matte", value: "matte" },
        { label: "Holo", value: "holo" },
      ],
      A = [
        {
          name: "src",
          type: "string",
          default: "Abstract color study",
          description:
            "Image printed on the sticker. Transparent PNG or SVG images become die-cut stickers whose border follows their outline.",
        },
        {
          name: "alt",
          type: "string",
          default: '"Sticker"',
          description: "Accessible name of the sticker.",
        },
        {
          name: "width",
          type: "number",
          default: "300",
          description:
            "Width of the sticker in pixels, border included. It shrinks to fit narrower containers.",
        },
        {
          name: "height",
          type: "number",
          default: "—",
          description:
            "Height in pixels. Defaults to the image's own aspect ratio.",
        },
        {
          name: "radius",
          type: "number",
          default: "20",
          description:
            "Corner radius in pixels. Die-cut stickers follow their outline instead.",
        },
        {
          name: "border",
          type: "number",
          default: "8",
          description:
            "Width of the die-cut border around the image, in pixels. 0 prints the image edge to edge.",
        },
        {
          name: "borderColor",
          type: "string",
          default: '"#FFFFFF"',
          description: "Colour of the die-cut border.",
        },
        {
          name: "backColor",
          type: "string",
          default: '"#E9E7EF"',
          description:
            "Colour of the sticker's back, seen when a corner curls over.",
        },
        {
          name: "sheenColor",
          type: "string",
          default: '"#FFFFFF"',
          description:
            "Colour of the light reflected by the surface as it bends and tilts.",
        },
        {
          name: "finish",
          type: '"gloss" | "matte" | "holo"',
          default: '"gloss"',
          description:
            "Surface of the print. holo adds a foil rainbow that shifts with the viewing angle.",
        },
        {
          name: "sheen",
          type: "number",
          default: "0.6",
          description: "Strength of the reflections, from 0 (none) to 1.",
        },
        {
          name: "rotation",
          type: "number",
          default: "0",
          description: "Resting angle in degrees, for a hand-placed look.",
        },
        {
          name: "lift",
          type: "number",
          default: "80",
          description:
            "How far the sticker rises toward you while held, in pixels.",
        },
        {
          name: "tilt",
          type: "number",
          default: "28",
          description:
            "Largest lean in degrees as the sticker swings behind fast moves.",
        },
        {
          name: "bend",
          type: "number",
          default: "0.5",
          description:
            "How much the sheet curls while held, from 0 (a stiff card) to 1 (thin paper).",
        },
        {
          name: "elasticity",
          type: "number",
          default: "0.5",
          description:
            "How long the sheet keeps wobbling after a stop, from 0 to 1.",
        },
        {
          name: "shadow",
          type: "number",
          default: "0.5",
          description:
            "Strength of the shadow, which softens and spreads as the sticker lifts.",
        },
        {
          name: "hoverPeel",
          type: "number",
          default: "0.5",
          description:
            "How far the corner nearest the pointer curls up on hover. 0 turns it off.",
        },
        {
          name: "idleHint",
          type: "boolean",
          default: "true",
          description:
            "Lift a corner now and then, so visitors see the sticker can be peeled.",
        },
        {
          name: "draggable",
          type: "boolean",
          default: "true",
          description:
            "Let the pointer, touch and arrow keys move the sticker.",
        },
        {
          name: "bounds",
          type: '"parent" | "none"',
          default: '"parent"',
          description:
            "Keep the sticker inside its parent element, with a rubbery pull at the edges.",
        },
        {
          name: "snapBack",
          type: "boolean",
          default: "false",
          description:
            "Return the sticker to where it started when it is released.",
        },
        {
          name: "raiseOnDrag",
          type: "boolean",
          default: "true",
          description:
            "Bring the sticker in front of other stickers when it is picked up.",
        },
        {
          name: "autoplay",
          type: "boolean",
          default: "false",
          description:
            "Peel the sticker up and swing it around on its own while nobody is interacting.",
        },
        {
          name: "autoplaySpeed",
          type: "number",
          default: "1",
          description: "Speed of that demonstration.",
        },
        {
          name: "idleDelay",
          type: "number",
          default: "2.5",
          description: "Seconds of inactivity before autoplay resumes.",
        },
        {
          name: "defaultPosition",
          type: "{ x: number; y: number }",
          default: "{ x: 0, y: 0 }",
          description:
            "Starting offset from where the sticker sits in the layout, in pixels.",
        },
        {
          name: "onDragStart",
          type: "() => void",
          default: "—",
          description: "Called when the sticker is picked up.",
        },
        {
          name: "onDragEnd",
          type: "(position: { x: number; y: number }) => void",
          default: "—",
          description:
            "Called with the offset where the sticker lands, after a drag or a keyboard move.",
        },
        {
          name: "ref",
          type: "{ peel, reset, moveTo }",
          default: "—",
          description:
            "peel() lifts the sticker and sets it back down. reset() returns it home. moveTo(x, y) glides it to an offset.",
        },
        {
          name: "className",
          type: "string",
          default: "—",
          description: "Classes for the sticker element.",
        },
        {
          name: "style",
          type: "CSSProperties",
          default: "—",
          description: "Inline styles for the sticker element.",
        },
      ],
      H = () => {
        let [e, t] = (0, s.I)(),
          a = (0, n.Y)(),
          [d, c] = (0, i.useState)("photo"),
          [u, h] = (0, i.useState)(D),
          p = (e) => (t) => h((a) => ({ ...a, [e]: t })),
          m = (e) => (t) =>
            h((a) => {
              let r = [...a.colors];
              return ((r[e] = t), { ...a, colors: r });
            }),
          [f, g] = (0, i.useState)(0.5),
          [y, x] = (0, i.useState)(0.5),
          [v, b] = (0, i.useState)(!0),
          [w, M] = (0, i.useState)(!1),
          [S, F] = (0, i.useState)(!0),
          [C, k] = (0, i.useState)(1),
          [E, P] = (0, i.useState)(2.5),
          [R, H] = (0, i.useState)(!0);
        return (0, r.jsxs)("div", {
          children: [
            (0, r.jsx)(o.Bg, {}),
            (0, r.jsxs)(o.VX, {
              children: [
                (0, r.jsxs)(o.Ec, {
                  children: [
                    (0, r.jsx)(o.Ch, {
                      onRefresh: t,
                      minHeight: 560,
                      enableResponsive: !0,
                      children: (0, r.jsx)("div", {
                        className: `relative flex h-full w-full items-center justify-center overflow-hidden ${"dark" === a ? "bg-[#0A0A0A]" : "bg-white"}`,
                        children: (0, r.jsx)(
                          I,
                          {
                            src: u.src,
                            alt:
                              Object.values(l.PT).find((e) => e.src === u.src)
                                ?.alt ?? "Custom sticker artwork",
                            width: u.width,
                            radius: u.radius,
                            border: u.border,
                            borderColor: u.colors[0],
                            backColor: u.colors[1],
                            sheenColor: u.colors[2],
                            finish: u.finish,
                            sheen: u.sheen,
                            rotation: u.rotation,
                            lift: u.lift,
                            tilt: u.tilt,
                            bend: u.bend,
                            elasticity: u.elasticity,
                            shadow: f,
                            hoverPeel: y,
                            idleHint: v,
                            snapBack: w,
                            autoplay: S,
                            autoplaySpeed: C,
                            idleDelay: E,
                            draggable: R,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, r.jsxs)(o.IH, {
                      children: [
                        (0, r.jsx)(o.bg, {
                          title: "Preset",
                          value: d,
                          options: L,
                          onChange: (e) => {
                            (c(e), h(j[e] ?? D), t());
                          },
                        }),
                        (0, r.jsx)(o.UD, {
                          title: "Image",
                          value: u.src.startsWith("data:") ? "" : u.src,
                          placeholder: "Image URL",
                          onChange: (e) => e && p("src")(e),
                        }),
                        (0, r.jsx)(o.bg, {
                          title: "Finish",
                          value: u.finish,
                          options: z,
                          onChange: (e) => p("finish")(e),
                        }),
                        (0, r.jsx)(o.W7, {
                          title: "Border",
                          value: u.colors[0],
                          onChange: m(0),
                        }),
                        (0, r.jsx)(o.W7, {
                          title: "Back",
                          value: u.colors[1],
                          onChange: m(1),
                        }),
                        (0, r.jsx)(o.W7, {
                          title: "Sheen",
                          value: u.colors[2],
                          onChange: m(2),
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Width",
                          min: 120,
                          max: 420,
                          step: 10,
                          value: u.width,
                          valueUnit: "px",
                          onChange: p("width"),
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Radius",
                          min: 0,
                          max: 60,
                          step: 1,
                          value: u.radius,
                          valueUnit: "px",
                          onChange: p("radius"),
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Border Width",
                          min: 0,
                          max: 24,
                          step: 1,
                          value: u.border,
                          valueUnit: "px",
                          onChange: p("border"),
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Sheen Strength",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: u.sheen,
                          onChange: p("sheen"),
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Rotation",
                          min: -20,
                          max: 20,
                          step: 1,
                          value: u.rotation,
                          valueUnit: "\xb0",
                          onChange: p("rotation"),
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Lift",
                          min: 0,
                          max: 160,
                          step: 2,
                          value: u.lift,
                          valueUnit: "px",
                          onChange: p("lift"),
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Tilt",
                          min: 0,
                          max: 45,
                          step: 1,
                          value: u.tilt,
                          valueUnit: "\xb0",
                          onChange: p("tilt"),
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Bend",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: u.bend,
                          onChange: p("bend"),
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Elasticity",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: u.elasticity,
                          onChange: p("elasticity"),
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Shadow",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: f,
                          onChange: g,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Hover Peel",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: y,
                          onChange: x,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Autoplay Speed",
                          min: 0.3,
                          max: 2.5,
                          step: 0.05,
                          value: C,
                          onChange: k,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Idle Delay",
                          min: 0,
                          max: 8,
                          step: 0.25,
                          value: E,
                          valueUnit: "s",
                          onChange: P,
                        }),
                        (0, r.jsx)(o.tl, {
                          title: "Autoplay",
                          checked: S,
                          onChange: F,
                        }),
                        (0, r.jsx)(o.tl, {
                          title: "Idle Hint",
                          checked: v,
                          onChange: b,
                        }),
                        (0, r.jsx)(o.tl, {
                          title: "Snap Back",
                          checked: w,
                          onChange: M,
                        }),
                        (0, r.jsx)(o.tl, {
                          title: "Draggable",
                          checked: R,
                          onChange: H,
                        }),
                      ],
                    }),
                    (0, r.jsx)(o.Ub, { data: A }),
                  ],
                }),
                (0, r.jsx)(o.lT, { children: (0, r.jsx)(o.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
