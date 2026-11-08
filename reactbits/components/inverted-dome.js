/* ReactBits Pro public preview module 10851 for inverted-dome.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/10851.aa913ed7158b7302.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  10851: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => j }));
    var n = a(95155),
      i = a(12115),
      l = a(56388),
      r = a(90761),
      o = a(81712),
      u = a(3907),
      s = a(50969),
      c = a(47962),
      d = a(39551),
      h = a(2253),
      m = a(90650);
    let v = `
attribute vec2 aCell;

uniform vec2 uResolution;
uniform vec2 uOffset;
uniform vec2 uTile;
uniform vec2 uPitch;
uniform vec2 uHalfCount;
uniform vec2 uAtlasGrid;
uniform vec2 uInset;
uniform float uRotation;
uniform float uCurve;
uniform float uCurveRadius;
uniform float uZoom;
uniform float uSeed;
uniform float uImageCount;

varying vec2 vUv;
varying vec2 vLocal;
varying float vEdge;


float hashCell(vec2 cell) {
  vec2 c = mod(cell, 1024.0);
  float h = mod(c.x * 7919.0 + c.y * 7307.0 + uSeed * 613.0, 1021.0);
  return mod(h * h + c.x * 3.0 + c.y * 17.0, 1009.0);
}



vec2 lens(vec2 screen) {
  vec2 n = screen / uResolution - 0.5;
  float aspect = uResolution.x / uResolution.y;
  n.x *= aspect;
  float t = length(n) / uCurveRadius;
  float z = sqrt(max(0.5 - t * t, 0.0004));
  n *= uZoom + uCurve / z;
  n.x /= aspect;
  return (n + 0.5) * uResolution;
}

void main() {


  vec2 cell = aCell - uHalfCount + floor(uOffset / uPitch);
  vec2 origin = cell * uPitch - uOffset + uResolution * 0.5;

  vec2 local = uv * uTile;
  vec2 centre = origin + uTile * 0.5;
  vec2 rel = local - uTile * 0.5;
  float c = cos(uRotation);
  float s = sin(uRotation);
  rel = vec2(rel.x * c - rel.y * s, rel.x * s + rel.y * c);
  vec2 screen = lens(centre + rel);

  vec2 n = screen / uResolution - 0.5;
  n.x *= uResolution.x / uResolution.y;
  vEdge = length(n);

  float index = mod(hashCell(cell), uImageCount);
  vec2 slot = vec2(mod(index, uAtlasGrid.x), floor(index / uAtlasGrid.x));

  vec2 padded = mix(uInset, 1.0 - uInset, vec2(uv.x, 1.0 - uv.y));
  vUv = (slot + padded) / uAtlasGrid;
  vLocal = local;

  vec2 clip = screen / uResolution * 2.0 - 1.0;
  gl_Position = vec4(clip, 0.0, 1.0);
}
`,
      f = `
precision highp float;

uniform sampler2D uAtlas;
uniform vec2 uTile;
uniform float uRadius;
uniform float uGrayscale;
uniform float uVignette;
uniform float uVignetteReach;

varying vec2 vUv;
varying vec2 vLocal;
varying float vEdge;

float roundedBox(vec2 p, vec2 extent, float r) {
  vec2 q = abs(p) - extent + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec4 tex = texture2D(uAtlas, vUv);
  vec2 extent = uTile * 0.5;
  float r = min(uRadius, min(extent.x, extent.y));
  float d = roundedBox(vLocal - extent, extent, r);
  float aa = fwidth(d);
  float shape = 1.0 - smoothstep(-aa, aa, d);
  if (shape < 0.003) discard;

  float luma = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
  vec3 color = mix(tex.rgb, vec3(luma), uGrayscale);
  float fade = smoothstep(0.0, uVignetteReach, vEdge);
  color *= 1.0 - uVignette * fade;
  gl_FragColor = vec4(color, tex.a * shape);
}
`,
      p = (e, t, a) => Math.min(a, Math.max(t, e)),
      x = (e, t) => ((e % t) + t) % t,
      g = (e, t, a) => {
        let n = x(e, 1024),
          i = x(t, 1024),
          l = x(7919 * n + 7307 * i + 613 * a, 1021);
        return x(l * l + 3 * n + 17 * i, 1009);
      },
      y = (e) => {
        let t = window.matchMedia("(min-resolution: 2dppx)");
        return (
          t.addEventListener("change", e),
          window.addEventListener("resize", e),
          () => {
            (t.removeEventListener("change", e),
              window.removeEventListener("resize", e));
          }
        );
      },
      b = () => window.devicePixelRatio || 1,
      w = (e) =>
        new Promise((t) => {
          let a = new Image();
          ((a.crossOrigin = "anonymous"),
            (a.decoding = "async"),
            (a.onload = () => t(a)),
            (a.onerror = () => t(null)),
            (a.src = e));
        }),
      C = ({
        sources: e,
        tileWidth: t,
        tileHeight: a,
        gap: l,
        borderRadius: r,
        curve: u,
        curveRadius: s,
        zoom: c,
        tileRotation: d,
        grayscale: m,
        vignette: x,
        autoScrollX: g,
        autoScrollY: y,
        axis: b,
        friction: C,
        segments: M,
        seed: S,
        readMotion: R,
        onReady: j,
      }) => {
        let { gl: E, size: k, invalidate: I } = (0, o.C)(),
          P = (0, i.useRef)(null),
          [L, A] = (0, i.useState)(null),
          T = t / Math.max(a, 1);
        ((0, i.useEffect)(() => {
          let t = !1,
            a = E.capabilities.getMaxAnisotropy();
          return (
            Promise.all(e.map(w)).then((e) => {
              if (t) return;
              let n = ((e, t, a) => {
                let n = e.length;
                if (!n) return null;
                let i = Math.ceil(Math.sqrt(n)),
                  l = Math.ceil(n / i),
                  r = 512,
                  o = Math.round(512 / t),
                  u = Math.max(512 * i, o * l);
                if (u > 4096) {
                  let e = 4096 / u;
                  ((r = Math.floor(r * e)), (o = Math.floor(o * e)));
                }
                let s = document.createElement("canvas");
                ((s.width = r * i), (s.height = o * l));
                let c = s.getContext("2d");
                if (!c) return null;
                e.forEach((e, t) => {
                  let a = (t % i) * r,
                    n = Math.floor(t / i) * o,
                    l = Math.max(r / e.naturalWidth, o / e.naturalHeight),
                    u = e.naturalWidth * l,
                    s = e.naturalHeight * l;
                  (c.save(),
                    c.beginPath(),
                    c.rect(a, n, r, o),
                    c.clip(),
                    c.drawImage(e, a + (r - u) / 2, n + (o - s) / 2, u, s),
                    c.restore());
                });
                let d = new h.GOR(s);
                return (
                  (d.flipY = !1),
                  (d.colorSpace = h.jf0),
                  (d.wrapS = h.ghU),
                  (d.wrapT = h.ghU),
                  (d.minFilter = h.$_I),
                  (d.magFilter = h.k6q),
                  (d.generateMipmaps = !0),
                  (d.anisotropy = a),
                  (d.needsUpdate = !0),
                  {
                    texture: d,
                    columns: i,
                    rows: l,
                    count: n,
                    inset: { x: 1.5 / r, y: 1.5 / o },
                  }
                );
              })(
                e.filter((e) => null !== e),
                T,
                a,
              );
              (A(n), n && j(), I());
            }),
            () => {
              t = !0;
            }
          );
        }, [e, T, E, I, j]),
          (0, i.useEffect)(() => {
            if (L) return () => L.texture.dispose();
          }, [L]),
          (0, i.useEffect)(() => {
            let e = R();
            return (
              (e.wake = I),
              () => {
                e.wake = () => {};
              }
            );
          }, [R, I]));
        let U = t + l,
          N = a + l,
          Y = Math.min(Math.ceil((1.35 * k.width) / U) + 3, 60),
          H = Math.min(Math.ceil((1.35 * k.height) / N) + 3, 60),
          O = Math.min(Y * H, 900),
          G = Math.round(p(M, 2, 64)),
          V = (0, i.useMemo)(() => {
            let e = new h.bdM(1, 1, G, G),
              t = new h.CmU();
            ((t.index = e.index),
              t.setAttribute("position", e.getAttribute("position")),
              t.setAttribute("uv", e.getAttribute("uv")));
            let a = new Float32Array(2 * O);
            for (let e = 0; e < O; e++)
              ((a[2 * e] = e % Y), (a[2 * e + 1] = Math.floor(e / Y)));
            return (
              t.setAttribute("aCell", new h.uWO(a, 2)),
              (t.instanceCount = O),
              t
            );
          }, [G, O, Y]);
        (0, i.useEffect)(() => () => V.dispose(), [V]);
        let W = (0, i.useMemo)(
          () => ({
            uAtlas: { value: null },
            uResolution: { value: new h.I9Y(1, 1) },
            uOffset: { value: new h.I9Y(0, 0) },
            uTile: { value: new h.I9Y(1, 1) },
            uPitch: { value: new h.I9Y(1, 1) },
            uHalfCount: { value: new h.I9Y(0, 0) },
            uAtlasGrid: { value: new h.I9Y(1, 1) },
            uInset: { value: new h.I9Y(0, 0) },
            uRotation: { value: 0 },
            uCurve: { value: 0.3 },
            uCurveRadius: { value: 1 },
            uZoom: { value: 0.1 },
            uSeed: { value: 0 },
            uImageCount: { value: 1 },
            uRadius: { value: 0 },
            uGrayscale: { value: 0 },
            uVignette: { value: 0 },
            uVignetteReach: { value: 1 },
          }),
          [],
        );
        return ((0, i.useEffect)(() => {
          I();
        }, [L, t, a, l, r, u, s, c, d, m, x, S, k, I]),
        (0, o.D)((e, n) => {
          let i = P.current,
            l = R();
          if (!i || !L) return;
          let o = Math.min(n, 0.05);
          if (!l.dragging) {
            let e = Math.pow(p(C, 0, 0.99), 60 * o);
            ((l.velocity.x *= e),
              (l.velocity.y *= e),
              0.01 > Math.abs(l.velocity.x) && (l.velocity.x = 0),
              0.01 > Math.abs(l.velocity.y) && (l.velocity.y = 0),
              (l.offset.x += l.velocity.x * o * 60),
              (l.offset.y += l.velocity.y * o * 60));
          }
          ("y" !== b && (l.offset.x += g * o),
            "x" !== b && (l.offset.y -= y * o),
            (l.dragging ||
              0 !== l.velocity.x ||
              0 !== l.velocity.y ||
              ("y" !== b && 0 !== g) ||
              ("x" !== b && 0 !== y)) &&
              I());
          let h = Math.max(Math.min(k.width, k.height), 1),
            v = Math.hypot(k.width / h, k.height / h),
            f = i.uniforms;
          ((f.uAtlas.value = L.texture),
            f.uResolution.value.set(k.width, k.height),
            f.uOffset.value.set(l.offset.x, l.offset.y),
            f.uTile.value.set(t, a),
            f.uPitch.value.set(U, N),
            f.uHalfCount.value.set(Math.floor(Y / 2), Math.floor(H / 2)),
            f.uAtlasGrid.value.set(L.columns, L.rows),
            f.uInset.value.set(L.inset.x, L.inset.y),
            (f.uRotation.value = (d * Math.PI) / 180),
            (f.uCurve.value = Math.max(u, 0)),
            (f.uCurveRadius.value = 0.72 * v * Math.max(s, 1)),
            (f.uZoom.value = Math.max(c, 0.05)),
            (f.uSeed.value = Math.round(p(S, 0, 1e3))),
            (f.uImageCount.value = L.count),
            (f.uRadius.value = Math.max(r, 0)),
            (f.uGrayscale.value = p(m, 0, 1)),
            (f.uVignette.value = p(x, 0, 1)),
            (f.uVignetteReach.value = 0.5 * v));
        }),
        L)
          ? (0, n.jsx)("mesh", {
              geometry: V,
              frustumCulled: !1,
              children: (0, n.jsx)("shaderMaterial", {
                ref: P,
                vertexShader: v,
                fragmentShader: f,
                uniforms: W,
                transparent: !0,
                depthTest: !1,
                depthWrite: !1,
              }),
            })
          : null;
      },
      M = ({
        images: e,
        tileWidth: t = 200,
        tileHeight: a = 200,
        gap: l = 16,
        borderRadius: r = 16,
        curve: o = 0.3,
        curveRadius: h = 1.5,
        zoom: v = 0.1,
        tileRotation: f = 0,
        grayscale: x = 0,
        vignette: w = 0,
        autoScrollX: M = 0,
        autoScrollY: S = 0,
        enableDrag: R = !0,
        enableWheel: j = !0,
        axis: E = "both",
        dragSensitivity: k = 1,
        wheelSensitivity: I = 0.5,
        friction: P = 0.9,
        segments: L = 20,
        seed: A = 0,
        backgroundColor: T = "transparent",
        dpr: U = 2,
        openOnClick: N = !1,
        onTileClick: Y,
        onLoad: H,
        className: O,
        children: G,
      }) => {
        let V = (0, i.useRef)(null),
          W = (0, i.useRef)({
            offset: { x: 0, y: 0 },
            velocity: { x: 0, y: 0 },
            dragging: !1,
            wake: () => {},
          }),
          z = (0, i.useCallback)(() => W.current, []),
          [D, X] = (0, i.useState)(!1),
          [B, q] = (0, i.useState)(!1),
          [F, _] = (0, i.useState)(null),
          [Z, $] = (0, i.useState)(!0),
          Q = (0, s.I)(),
          J = Math.min(
            (0, i.useSyncExternalStore)(y, b, () => 1),
            Math.max(U, 0.5),
          ),
          K = (0, i.useMemo)(() => e.filter(Boolean), [e]),
          ee = (0, i.useCallback)(() => {
            (X(!0), H?.());
          }, [H]);
        (0, i.useEffect)(() => {
          let e = V.current;
          if (!e || "undefined" == typeof IntersectionObserver) return;
          let t = new IntersectionObserver(([e]) => $(e.isIntersecting), {
            threshold: 0,
          });
          return (t.observe(e), () => t.disconnect());
        }, []);
        let et = (0, i.useCallback)(
          (e, n) => {
            let i,
              r = V.current;
            if (!r || !K.length) return null;
            let u = r.getBoundingClientRect(),
              s = u.width,
              c = u.height;
            if (!s || !c) return null;
            let d = ((e, t, a, n, i, l, r) => {
              let o = a / n,
                u = (e / a - 0.5) * o,
                s = t / n - 0.5,
                c = Math.hypot(u, s);
              if (c < 1e-6) return { x: 0.5 * a, y: 0.5 * n };
              let d = (e) => {
                  let t = e / r;
                  return e * (i + l / Math.sqrt(Math.max(0.5 - t * t, 4e-4)));
                },
                h = 0,
                m = r * Math.SQRT1_2;
              if (d(m) < c) return null;
              for (let e = 0; e < 40; e++) {
                let e = (h + m) / 2;
                d(e) < c ? (h = e) : (m = e);
              }
              let v = (h + m) / 2 / c;
              return { x: ((u * v) / o + 0.5) * a, y: (s * v + 0.5) * n };
            })(
              e - u.left,
              c - (n - u.top),
              s,
              c,
              Math.max(v, 0.05),
              Math.max(o, 0),
              ((i = Math.max(Math.min(s, c), 1)),
              0.72 * Math.hypot(s / i, c / i) * Math.max(h, 1)),
            );
            if (!d) return null;
            let { offset: m } = W.current,
              x = d.x - 0.5 * s + m.x,
              y = d.y - 0.5 * c + m.y,
              b = t + l,
              w = a + l,
              C = (-f * Math.PI) / 180,
              M = Math.cos(C),
              S = Math.sin(C),
              R = Math.floor(x / b),
              j = Math.floor(y / w);
            for (let e = -1; e <= 1; e++)
              for (let n = -1; n <= 1; n++) {
                let i = R + n,
                  l = j + e,
                  r = x - (i * b + 0.5 * t),
                  o = y - (l * w + 0.5 * a),
                  u = r * M - o * S,
                  s = r * S + o * M;
                if (Math.abs(u) <= 0.5 * t && Math.abs(s) <= 0.5 * a)
                  return g(i, l, Math.round(p(A, 0, 1e3))) % K.length;
              }
            return null;
          },
          [K, v, o, h, t, a, l, f, A],
        );
        ((0, i.useEffect)(() => {
          let e = V.current;
          if (!e) return;
          let t = W.current,
            a = { x: 0, y: 0 },
            n = { x: 0, y: 0, time: 0, armed: !1 },
            i = "y" === E,
            l = "x" === E,
            r = (e) => e.target?.closest("[data-dome-lightbox]") !== null,
            o = (i) => {
              0 !== i.button ||
                r(i) ||
                ((n.x = i.clientX),
                (n.y = i.clientY),
                (n.time = performance.now()),
                (n.armed = N || !!Y),
                R &&
                  (i.preventDefault(),
                  e.setPointerCapture(i.pointerId),
                  (t.dragging = !0),
                  (t.velocity.x = 0),
                  (t.velocity.y = 0),
                  (a.x = i.clientX),
                  (a.y = i.clientY),
                  q(!0)));
            },
            u = (e) => {
              if (!t.dragging) return;
              let n = i ? 0 : (e.clientX - a.x) * k,
                r = l ? 0 : (e.clientY - a.y) * k;
              ((a.x = e.clientX),
                (a.y = e.clientY),
                (t.velocity.x = -(0.3 * n) + 0.7 * t.velocity.x),
                (t.velocity.y = 0.3 * r + 0.7 * t.velocity.y),
                (t.offset.x -= n),
                (t.offset.y += r),
                t.wake());
            },
            s = (a) => {
              let i = t.dragging;
              ((t.dragging = !1),
                e.hasPointerCapture(a.pointerId) &&
                  e.releasePointerCapture(a.pointerId),
                i && q(!1));
              let l = Math.hypot(a.clientX - n.x, a.clientY - n.y);
              if (
                n.armed &&
                "pointerup" === a.type &&
                l < 6 &&
                performance.now() - n.time < 500
              ) {
                let e = et(a.clientX, a.clientY);
                null !== e &&
                  (Y?.(e, K[e]),
                  N && ((t.velocity.x = 0), (t.velocity.y = 0), _(e)));
              }
              n.armed = !1;
            },
            c = (e) => {
              !j ||
                r(e) ||
                (e.preventDefault(),
                i || (t.velocity.x += e.deltaX * I),
                l || (t.velocity.y -= e.deltaY * I),
                t.wake());
            };
          return (
            e.addEventListener("pointerdown", o),
            e.addEventListener("pointermove", u),
            e.addEventListener("pointerup", s),
            e.addEventListener("pointercancel", s),
            e.addEventListener("wheel", c, { passive: !1 }),
            () => {
              (e.removeEventListener("pointerdown", o),
                e.removeEventListener("pointermove", u),
                e.removeEventListener("pointerup", s),
                e.removeEventListener("pointercancel", s),
                e.removeEventListener("wheel", c));
            }
          );
        }, [R, j, E, k, I, N, Y, et, K]),
          (0, i.useEffect)(() => {
            if (null === F) return;
            let e = (e) => {
              "Escape" === e.key && _(null);
            };
            return (
              window.addEventListener("keydown", e),
              () => window.removeEventListener("keydown", e)
            );
          }, [F]));
        let ea = !!Q,
          en = N && null !== F ? K[F] : null,
          ei = "transparent" === T || "none" === T || "" === T;
        return (0, n.jsxs)("div", {
          ref: V,
          className: (0, m.cn)(
            "relative overflow-hidden select-none",
            R ? (B ? "cursor-grabbing" : "cursor-grab") : N && "cursor-pointer",
            O,
          ),
          style: {
            backgroundColor: ei ? void 0 : T,
            touchAction: R ? "none" : void 0,
          },
          children: [
            (0, n.jsx)("div", {
              className: "absolute inset-0 transition-opacity duration-700",
              style: { opacity: +!!D },
              children: (0, n.jsx)(u.Hl, {
                orthographic: !0,
                dpr: J,
                frameloop: Z ? "demand" : "never",
                gl: {
                  antialias: !0,
                  alpha: !0,
                  premultipliedAlpha: !1,
                  powerPreference: "high-performance",
                },
                children: (0, n.jsx)(C, {
                  sources: K,
                  tileWidth: t,
                  tileHeight: a,
                  gap: l,
                  borderRadius: r,
                  curve: o,
                  curveRadius: h,
                  zoom: v,
                  tileRotation: f,
                  grayscale: x,
                  vignette: w,
                  autoScrollX: ea ? 0 : M,
                  autoScrollY: ea ? 0 : S,
                  axis: E,
                  friction: ea ? 0 : P,
                  segments: L,
                  seed: A,
                  readMotion: z,
                  onReady: ee,
                }),
              }),
            }),
            G
              ? (0, n.jsx)("div", {
                  className: "relative z-10 h-full w-full",
                  children: G,
                })
              : null,
            (0, n.jsx)(c.N, {
              children: en
                ? (0, n.jsxs)(
                    d.P.div,
                    {
                      "data-dome-lightbox": "",
                      role: "dialog",
                      "aria-modal": "true",
                      "aria-label": "Expanded image",
                      className:
                        "absolute inset-0 z-20 flex cursor-zoom-out items-center justify-center bg-black/50 p-6 backdrop-blur-xl sm:p-10",
                      initial: { opacity: 0 },
                      animate: { opacity: 1 },
                      exit: { opacity: 0 },
                      transition: ea
                        ? { duration: 0 }
                        : { duration: 0.28, ease: "easeOut" },
                      onClick: () => _(null),
                      children: [
                        (0, n.jsx)(d.P.img, {
                          src: en,
                          alt: "",
                          draggable: !1,
                          className:
                            "max-h-full max-w-full cursor-default object-contain shadow-2xl",
                          style: { borderRadius: Math.max(r, 0) },
                          initial: { opacity: 0, scale: 0.88 },
                          animate: { opacity: 1, scale: 1 },
                          exit: { opacity: 0, scale: 0.94 },
                          transition: ea
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 320, damping: 30 },
                          onClick: (e) => e.stopPropagation(),
                        }),
                        (0, n.jsx)("button", {
                          type: "button",
                          "aria-label": "Close",
                          className:
                            "absolute top-4 right-4 flex h-9 w-9 cursor-pointer items-center justify-center rounded-md bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white",
                          onClick: () => _(null),
                          children: (0, n.jsx)("svg", {
                            width: "14",
                            height: "14",
                            viewBox: "0 0 14 14",
                            fill: "none",
                            "aria-hidden": "true",
                            children: (0, n.jsx)("path", {
                              d: "M1 1l12 12M13 1L1 13",
                              stroke: "currentColor",
                              strokeWidth: "1.6",
                              strokeLinecap: "round",
                            }),
                          }),
                        }),
                      ],
                    },
                    en,
                  )
                : null,
            }),
          ],
        });
      },
      S = Array.from(
        { length: 16 },
        (e, t) => `/images/dome/leaf-${String(t + 1).padStart(2, "0")}.webp`,
      ),
      R = [
        { label: "Both", value: "both" },
        { label: "Horizontal", value: "x" },
        { label: "Vertical", value: "y" },
      ],
      j = () => {
        let [e, t] = (0, r.I)(),
          [a, o] = (0, i.useState)(200),
          [u, s] = (0, i.useState)(200),
          [c, d] = (0, i.useState)(16),
          [h, m] = (0, i.useState)(16),
          [v, f] = (0, i.useState)(0.3),
          [p, x] = (0, i.useState)(1.5),
          [g, y] = (0, i.useState)(0.1),
          [b, w] = (0, i.useState)(0),
          [C, j] = (0, i.useState)(1),
          [E, k] = (0, i.useState)(0),
          [I, P] = (0, i.useState)(0),
          [L, A] = (0, i.useState)(0),
          [T, U] = (0, i.useState)(!0),
          [N, Y] = (0, i.useState)(!0),
          [H, O] = (0, i.useState)("both"),
          [G, V] = (0, i.useState)(1),
          [W, z] = (0, i.useState)(0.5),
          [D, X] = (0, i.useState)(0.9),
          [B, q] = (0, i.useState)(20),
          [F, _] = (0, i.useState)(0),
          [Z, $] = (0, i.useState)(!0);
        return (0, n.jsxs)("div", {
          children: [
            (0, n.jsx)(l.Bg, {}),
            (0, n.jsxs)(l.VX, {
              children: [
                (0, n.jsxs)(l.Ec, {
                  children: [
                    (0, n.jsx)(l.Ch, {
                      onRefresh: t,
                      minHeight: 600,
                      children: (0, n.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, n.jsx)(
                          M,
                          {
                            className: "h-full w-full",
                            images: S,
                            tileWidth: a,
                            tileHeight: u,
                            gap: c,
                            borderRadius: h,
                            curve: v,
                            curveRadius: p,
                            zoom: g,
                            tileRotation: b,
                            grayscale: C,
                            vignette: E,
                            autoScrollX: I,
                            autoScrollY: L,
                            enableDrag: T,
                            enableWheel: N,
                            axis: H,
                            dragSensitivity: G,
                            wheelSensitivity: W,
                            friction: D,
                            segments: B,
                            seed: F,
                            openOnClick: Z,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, n.jsxs)(l.IH, {
                      children: [
                        (0, n.jsx)(l.yt, {
                          title: "Tile Width",
                          min: 60,
                          max: 400,
                          step: 1,
                          value: a,
                          onChange: o,
                          valueUnit: "px",
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Tile Height",
                          min: 60,
                          max: 400,
                          step: 1,
                          value: u,
                          onChange: s,
                          valueUnit: "px",
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Gap",
                          min: 0,
                          max: 80,
                          step: 1,
                          value: c,
                          onChange: d,
                          valueUnit: "px",
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Border Radius",
                          min: 0,
                          max: 120,
                          step: 1,
                          value: h,
                          onChange: m,
                          valueUnit: "px",
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Curve",
                          min: 0,
                          max: 1.5,
                          step: 0.01,
                          value: v,
                          onChange: f,
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Curve Radius",
                          min: 1,
                          max: 3,
                          step: 0.05,
                          value: p,
                          onChange: x,
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Zoom",
                          min: 0.1,
                          max: 1.5,
                          step: 0.01,
                          value: g,
                          onChange: y,
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Tile Rotation",
                          min: -45,
                          max: 45,
                          step: 1,
                          value: b,
                          onChange: w,
                          valueUnit: "\xb0",
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Grayscale",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: C,
                          onChange: j,
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Vignette",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: E,
                          onChange: k,
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Auto Scroll X",
                          min: -200,
                          max: 200,
                          step: 5,
                          value: I,
                          onChange: P,
                          valueUnit: "px/s",
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Auto Scroll Y",
                          min: -200,
                          max: 200,
                          step: 5,
                          value: L,
                          onChange: A,
                          valueUnit: "px/s",
                        }),
                        (0, n.jsx)(l.bg, {
                          title: "Axis",
                          value: H,
                          onChange: (e) => O(e),
                          options: R,
                        }),
                        (0, n.jsx)(l.tl, {
                          title: "Open On Click",
                          checked: Z,
                          onChange: $,
                        }),
                        (0, n.jsx)(l.tl, {
                          title: "Enable Drag",
                          checked: T,
                          onChange: U,
                        }),
                        (0, n.jsx)(l.tl, {
                          title: "Enable Wheel",
                          checked: N,
                          onChange: Y,
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Drag Sensitivity",
                          min: 0.2,
                          max: 3,
                          step: 0.05,
                          value: G,
                          onChange: V,
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Wheel Sensitivity",
                          min: 0,
                          max: 2,
                          step: 0.05,
                          value: W,
                          onChange: z,
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Friction",
                          min: 0,
                          max: 0.99,
                          step: 0.01,
                          value: D,
                          onChange: X,
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Segments",
                          min: 2,
                          max: 48,
                          step: 1,
                          value: B,
                          onChange: q,
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Seed",
                          min: 0,
                          max: 50,
                          step: 1,
                          value: F,
                          onChange: _,
                        }),
                      ],
                    }),
                    (0, n.jsx)(l.Ub, {
                      data: [
                        {
                          name: "images",
                          type: "string[]",
                          default: "—",
                          description:
                            "Image URLs tiled across the endless grid.",
                        },
                        {
                          name: "tileWidth",
                          type: "number",
                          default: "200",
                          description: "Tile width in CSS pixels.",
                        },
                        {
                          name: "tileHeight",
                          type: "number",
                          default: "200",
                          description: "Tile height in CSS pixels.",
                        },
                        {
                          name: "gap",
                          type: "number",
                          default: "16",
                          description: "Space between tiles in CSS pixels.",
                        },
                        {
                          name: "borderRadius",
                          type: "number",
                          default: "16",
                          description:
                            "Corner radius of each tile in CSS pixels.",
                        },
                        {
                          name: "curve",
                          type: "number",
                          default: "0.3",
                          description:
                            "How hard the lens stretches tiles towards the edges; 0 flattens the grid.",
                        },
                        {
                          name: "curveRadius",
                          type: "number",
                          default: "1.5",
                          description:
                            "Reach of the lens as a multiple of the viewport diagonal; larger softens the bend.",
                        },
                        {
                          name: "zoom",
                          type: "number",
                          default: "0.1",
                          description:
                            "Magnification at the centre of the lens.",
                        },
                        {
                          name: "tileRotation",
                          type: "number",
                          default: "0",
                          description: "Rotation of every tile in degrees.",
                        },
                        {
                          name: "grayscale",
                          type: "number",
                          default: "0",
                          description: "Desaturation of the images, 0 to 1.",
                        },
                        {
                          name: "vignette",
                          type: "number",
                          default: "0",
                          description: "Darkening towards the edges, 0 to 1.",
                        },
                        {
                          name: "autoScrollX",
                          type: "number",
                          default: "0",
                          description:
                            "Continuous horizontal drift in pixels per second.",
                        },
                        {
                          name: "autoScrollY",
                          type: "number",
                          default: "0",
                          description:
                            "Continuous vertical drift in pixels per second.",
                        },
                        {
                          name: "enableDrag",
                          type: "boolean",
                          default: "true",
                          description:
                            "Allow dragging the grid with pointer or touch.",
                        },
                        {
                          name: "enableWheel",
                          type: "boolean",
                          default: "true",
                          description:
                            "Allow scrolling the grid with the wheel or trackpad.",
                        },
                        {
                          name: "axis",
                          type: '"both" | "x" | "y"',
                          default: '"both"',
                          description: "Restrict movement to one axis.",
                        },
                        {
                          name: "dragSensitivity",
                          type: "number",
                          default: "1",
                          description: "Multiplier on drag distance.",
                        },
                        {
                          name: "wheelSensitivity",
                          type: "number",
                          default: "0.5",
                          description: "Multiplier on wheel delta.",
                        },
                        {
                          name: "friction",
                          type: "number",
                          default: "0.9",
                          description:
                            "Velocity kept per frame after release, 0 to 0.99; higher glides longer.",
                        },
                        {
                          name: "segments",
                          type: "number",
                          default: "20",
                          description:
                            "Vertices per tile edge; more bends smoother at a GPU cost.",
                        },
                        {
                          name: "seed",
                          type: "number",
                          default: "0",
                          description:
                            "Shuffles which image lands on which cell.",
                        },
                        {
                          name: "backgroundColor",
                          type: "string",
                          default: '"transparent"',
                          description: "Backdrop behind the tiles.",
                        },
                        {
                          name: "dpr",
                          type: "number",
                          default: "2",
                          description: "Upper device pixel ratio bound.",
                        },
                        {
                          name: "openOnClick",
                          type: "boolean",
                          default: "false",
                          description:
                            "Open the clicked tile in a lightbox that blurs the grid behind it.",
                        },
                        {
                          name: "onTileClick",
                          type: "(index: number, src: string) => void",
                          default: "—",
                          description:
                            "Fires with the image index and URL when a tile is clicked.",
                        },
                        {
                          name: "onLoad",
                          type: "() => void",
                          default: "—",
                          description:
                            "Fires once the atlas is ready and tiles are visible.",
                        },
                        {
                          name: "className",
                          type: "string",
                          default: "—",
                          description: "Extra classes for the root element.",
                        },
                        {
                          name: "children",
                          type: "ReactNode",
                          default: "—",
                          description: "Content layered above the grid.",
                        },
                      ],
                    }),
                  ],
                }),
                (0, n.jsx)(l.lT, { children: (0, n.jsx)(l.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
