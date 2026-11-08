/* ReactBits Pro public preview module 23854 for infinite-gallery.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/23854.1aaaae7919926450.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  23854: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => D }));
    var o = a(95155),
      r = a(12115),
      i = a(30701),
      s = a(56388),
      n = a(90761),
      l = a(81712),
      u = a(3907),
      c = a(90650),
      d = a(2253),
      m = a(12246);
    let f = (e, t, a) => Math.max(t, Math.min(a, e)),
      p = (e, t, a) => e + (t - e) * a,
      g = (e) => {
        let t = 1e4 * Math.sin(9999 * e);
        return t - Math.floor(t);
      },
      h = new Map(),
      x = new d.Tap(),
      v = new Map(),
      y = new d.bdM(1, 1),
      z = `
varying vec2 vUv;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`,
      w = `
precision highp float;
uniform sampler2D uMap;
uniform float uOpacity;
uniform float uRadius;
uniform vec2 uSize;
varying vec2 vUv;

#ifdef USE_FOG
  uniform vec3 fogColor;
  uniform float fogNear;
  uniform float fogFar;
  varying float vFogDepth;
#endif

float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

void main() {
  vec4 tex = texture2D(uMap, vUv);

  float shortEdge = min(uSize.x, uSize.y);
  float r = uRadius * shortEdge * 0.5;
  vec2 p = (vUv - 0.5) * uSize;
  vec2 halfSize = uSize * 0.5;
  float d = roundedBox(p, halfSize, r);
  float aa = fwidth(d);
  float mask = 1.0 - smoothstep(-aa, aa, d);

  float alpha = mask * uOpacity;

  #ifdef USE_FOG
    float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
    alpha *= 1.0 - fogFactor;
  #endif

  if (alpha < 0.001) discard;
  gl_FragColor = vec4(tex.rgb, alpha);
  #include <colorspace_fragment>
}
`,
      b = { current: null };
    function S({
      info: e,
      media: t,
      camRef: a,
      cellSize: i,
      viewRange: s,
      imageRadius: n,
      onFocus: u,
    }) {
      let c,
        f = (0, r.useRef)(null),
        g = (0, r.useRef)(null),
        v = (c = b.current) && c.px === e.px && c.py === e.py && c.pz === e.pz,
        S = (0, r.useRef)(+!!v),
        M = (0, r.useRef)(!1),
        C = (0, r.useMemo)(() => {
          let a = t.width / t.height;
          return new d.Pq0(e.size * a, e.size, 1);
        }, [t, e.size]),
        j = (0, r.useMemo)(
          () =>
            d.LlO.merge([
              m.UniformsLib.fog,
              {
                uMap: { value: null },
                uOpacity: { value: +!!v },
                uRadius: { value: n },
                uSize: { value: new d.I9Y(1, 1) },
              },
            ]),
          [],
        );
      (0, r.useEffect)(() => {
        var e, a;
        if (h.has(t.url)) {
          M.current = !0;
          return;
        }
        ((e = t.url),
          (a = () => {
            M.current = !0;
          }),
          h.get(e)
            ? a?.()
            : (x.setCrossOrigin("anonymous"),
              x.load(
                e,
                (t) => {
                  ((t.minFilter = d.$_I),
                    (t.magFilter = d.k6q),
                    (t.generateMipmaps = !0),
                    (t.colorSpace = d.er$),
                    (t.needsUpdate = !0),
                    h.set(e, t),
                    a?.());
                },
                void 0,
                () => {
                  console.warn("InfiniteGallery: failed to load", e);
                },
              )));
      }, [t.url]);
      let F = i * (s + 1);
      (0, l.D)(() => {
        let o = f.current,
          r = g.current;
        if (!o || !r) return;
        if (!r.uniforms.uMap.value && M.current) {
          let e = h.get(t.url);
          e && ((r.uniforms.uMap.value = e), (r.needsUpdate = !0));
        }
        if (!r.uniforms.uMap.value) {
          o.visible = !1;
          return;
        }
        let i = a.current;
        if (!i) return;
        let s = e.px - i.x,
          l = e.py - i.y,
          u = e.pz - i.z,
          c = Math.sqrt(s * s + l * l + u * u),
          d = b.current,
          m = d && d.px === e.px && d.py === e.py && d.pz === e.pz;
        ((S.current = m ? 1 : p(S.current, m || c < F ? 1 : 0, 0.12)),
          (r.uniforms.uOpacity.value = S.current),
          (r.uniforms.uRadius.value = n),
          r.uniforms.uSize.value.set(C.x, C.y),
          (o.visible = S.current > 0.01),
          (o.renderOrder = 999 * !!m),
          (r.depthTest = !m));
      });
      let E = (0, r.useCallback)(
        (t) => {
          u &&
            (t.stopPropagation(),
            u({ px: e.px, py: e.py, pz: e.pz, scaleX: C.x, scaleY: C.y }));
        },
        [e, C, u],
      );
      return (0, o.jsx)("mesh", {
        ref: f,
        geometry: y,
        position: [e.px, e.py, e.pz],
        scale: C,
        visible: !1,
        onClick: E,
        children: (0, o.jsx)("shaderMaterial", {
          ref: g,
          vertexShader: z,
          fragmentShader: w,
          transparent: !0,
          depthWrite: !1,
          fog: !0,
          side: d.$EB,
          uniforms: j,
        }),
      });
    }
    function M({
      cx: e,
      cy: t,
      cz: a,
      images: i,
      cellSize: s,
      density: n,
      imageSize: l,
      camRef: u,
      viewRange: c,
      imageRadius: d,
      onFocus: m,
    }) {
      let f = (0, r.useMemo)(
        () =>
          (function (e, t, a, o, r, i) {
            let s = `${e},${t},${a}|${o}|${r}|${i}`,
              n = v.get(s);
            if (n) return n;
            let l = ((e) => {
                let t = 0;
                for (let a = 0; a < e.length; a++)
                  t = ((t << 5) - t + e.charCodeAt(a)) | 0;
                return Math.abs(t);
              })(s),
              u = [];
            for (let n = 0; n < r; n++) {
              let r = l + 7919 * n,
                c = i * (0.65 + 0.7 * g(r + 4));
              u.push({
                id: `${s}-${n}`,
                px: e * o + g(r + 0) * o,
                py: t * o + g(r + 1) * o,
                pz: a * o + g(r + 2) * o,
                size: c,
                imgIdx: Math.floor(1e6 * g(r + 5)),
              });
            }
            if ((v.set(s, u), v.size > 512)) {
              let e = v.keys().next().value;
              void 0 !== e && v.delete(e);
            }
            return u;
          })(e, t, a, s, n, l),
        [e, t, a, s, n, l],
      );
      return (0, o.jsx)(o.Fragment, {
        children: f.map((e) => {
          let t = i[e.imgIdx % i.length];
          return t
            ? (0, o.jsx)(
                S,
                {
                  info: e,
                  media: t,
                  camRef: u,
                  cellSize: s,
                  viewRange: c,
                  imageRadius: d,
                  onFocus: m,
                },
                e.id,
              )
            : null;
        }),
      });
    }
    function C({
      images: e,
      cellSize: t,
      density: a,
      imageSize: i,
      viewRange: s,
      dragSpeed: n,
      driftAmount: u,
      friction: c,
      autoZoom: d,
      autoZoomSpeed: m,
      imageRadius: g,
      allowFocus: h,
    }) {
      let { camera: x, gl: v } = (0, l.C)(),
        y = (0, r.useMemo)(
          () =>
            (function (e) {
              let t = [];
              for (let a = -e; a <= e; a++)
                for (let o = -e; o <= e; o++)
                  for (let r = -e; r <= e; r++)
                    Math.max(Math.abs(a), Math.abs(o), Math.abs(r)) <= e &&
                      t.push({ dx: a, dy: o, dz: r });
              return t;
            })(s + 1),
          [s],
        ),
        z = (0, r.useRef)({
          vel: { x: 0, y: 0, z: 0 },
          tgt: { x: 0, y: 0, z: 0 },
          pos: { x: 0, y: 0, z: 50 },
          drift: { x: 0, y: 0 },
          mouse: { x: 0, y: 0 },
          lastMouse: { x: 0, y: 0 },
          dragging: !1,
          scrollAccum: 0,
          lastKey: "",
          lastTouches: [],
          lastTouchDist: 0,
          focused: !1,
          focusTarget: null,
          focusLerp: 0,
          preFocusPos: { x: 0, y: 0, z: 0 },
          dragDistSq: 0,
        }),
        w = (0, r.useRef)({ x: 0, y: 0, z: 50 }),
        [S, C] = (0, r.useState)([]),
        j = (0, r.useCallback)((e) => {
          let t = z.current;
          if (!(t.dragDistSq > 16)) {
            if (t.focused && t.focusTarget) {
              let a = t.focusTarget;
              if (a.px === e.px && a.py === e.py && a.pz === e.pz) {
                ((t.focused = !1), (t.focusTarget = null), (b.current = null));
                return;
              }
              ((t.focusTarget = e),
                (b.current = e),
                (t.vel = { x: 0, y: 0, z: 0 }),
                (t.tgt = { x: 0, y: 0, z: 0 }),
                (t.scrollAccum = 0));
              return;
            }
            ((t.focused = !0),
              (t.focusTarget = e),
              (b.current = e),
              (t.preFocusPos = { ...t.pos }),
              (t.vel = { x: 0, y: 0, z: 0 }),
              (t.tgt = { x: 0, y: 0, z: 0 }),
              (t.scrollAccum = 0));
          }
        }, []),
        F = (0, r.useCallback)(() => {
          let e = z.current;
          e.focused &&
            ((e.focused = !1), (e.focusTarget = null), (b.current = null));
        }, []);
      return (
        (0, r.useEffect)(() => {
          let e = z.current;
          e.pos = { x: x.position.x, y: x.position.y, z: x.position.z };
          let a = Math.floor(e.pos.x / t),
            o = Math.floor(e.pos.y / t),
            r = Math.floor(e.pos.z / t);
          C(
            y.map((e) => ({
              key: `${a + e.dx},${o + e.dy},${r + e.dz}`,
              cx: a + e.dx,
              cy: o + e.dy,
              cz: r + e.dz,
            })),
          );
        }, [x, t, y]),
        (0, r.useEffect)(() => {
          let e = v.domElement,
            t = z.current,
            a = (e) => {
              ((t.dragging = !0),
                (t.lastMouse = { x: e.clientX, y: e.clientY }),
                (t.dragDistSq = 0));
            },
            o = () => {
              t.dragging = !1;
            },
            r = (a) => {
              let o = e.clientWidth || 1,
                r = e.clientHeight || 1;
              if (
                ((t.mouse = {
                  x: (a.clientX / o) * 2 - 1,
                  y: -(2 * (a.clientY / r)) + 1,
                }),
                t.dragging)
              ) {
                let e = a.clientX - t.lastMouse.x,
                  o = a.clientY - t.lastMouse.y;
                ((t.dragDistSq += e * e + o * o),
                  t.focused
                    ? t.dragDistSq > 16 &&
                      ((t.focused = !1),
                      (t.focusTarget = null),
                      (b.current = null))
                    : ((t.tgt.x -= e * n * 0.025), (t.tgt.y += o * n * 0.025)),
                  (t.lastMouse = { x: a.clientX, y: a.clientY }));
              }
            },
            i = (e) => {
              (e.preventDefault(),
                t.focused &&
                  ((t.focused = !1),
                  (t.focusTarget = null),
                  (b.current = null)),
                (t.scrollAccum += 0.006 * e.deltaY));
            },
            s = (e) => {
              if (e.length < 2) return 0;
              let t = e[0].clientX - e[1].clientX,
                a = e[0].clientY - e[1].clientY;
              return Math.sqrt(t * t + a * a);
            },
            l = (e) => {
              (e.preventDefault(),
                (t.lastTouches = Array.from(e.touches)),
                (t.lastTouchDist = s(t.lastTouches)));
            },
            u = (e) => {
              e.preventDefault();
              let a = Array.from(e.touches);
              if (1 === a.length && t.lastTouches.length >= 1) {
                let e = a[0],
                  o = t.lastTouches[0];
                e &&
                  o &&
                  (t.focused &&
                    ((t.focused = !1),
                    (t.focusTarget = null),
                    (b.current = null)),
                  (t.tgt.x -= (e.clientX - o.clientX) * n * 0.02),
                  (t.tgt.y += (e.clientY - o.clientY) * n * 0.02));
              } else if (2 === a.length && t.lastTouchDist > 0) {
                let e = s(a);
                (t.focused &&
                  ((t.focused = !1),
                  (t.focusTarget = null),
                  (b.current = null)),
                  (t.scrollAccum += (t.lastTouchDist - e) * 0.006),
                  (t.lastTouchDist = e));
              }
              t.lastTouches = a;
            },
            c = (e) => {
              ((t.lastTouches = Array.from(e.touches)),
                (t.lastTouchDist = s(t.lastTouches)));
            },
            d = () => {
              ((t.mouse = { x: 0, y: 0 }), (t.dragging = !1));
            };
          return (
            e.addEventListener("mousedown", a),
            window.addEventListener("mouseup", o),
            window.addEventListener("mousemove", r),
            e.addEventListener("mouseleave", d),
            e.addEventListener("wheel", i, { passive: !1 }),
            e.addEventListener("touchstart", l, { passive: !1 }),
            e.addEventListener("touchmove", u, { passive: !1 }),
            e.addEventListener("touchend", c, { passive: !1 }),
            () => {
              (e.removeEventListener("mousedown", a),
                window.removeEventListener("mouseup", o),
                window.removeEventListener("mousemove", r),
                e.removeEventListener("mouseleave", d),
                e.removeEventListener("wheel", i),
                e.removeEventListener("touchstart", l),
                e.removeEventListener("touchmove", u),
                e.removeEventListener("touchend", c));
            }
          );
        }, [v, n]),
        (0, l.D)(() => {
          let e = z.current;
          if (e.focused && e.focusTarget) {
            let a = e.focusTarget,
              o = 1.2 * Math.max(a.scaleX, a.scaleY),
              r = a.px,
              i = a.py,
              s = a.pz + o;
            ((e.pos.x = p(e.pos.x, r, 0.08)),
              (e.pos.y = p(e.pos.y, i, 0.08)),
              (e.pos.z = p(e.pos.z, s, 0.08)),
              (e.drift.x = p(e.drift.x, 0, 0.15)),
              (e.drift.y = p(e.drift.y, 0, 0.15)),
              x.position.set(e.pos.x + e.drift.x, e.pos.y + e.drift.y, e.pos.z),
              (e.vel = { x: 0, y: 0, z: 0 }),
              (e.tgt = { x: 0, y: 0, z: 0 }),
              (e.scrollAccum = 0),
              (w.current = { x: e.pos.x, y: e.pos.y, z: e.pos.z }));
            let n = Math.floor(e.pos.x / t),
              l = Math.floor(e.pos.y / t),
              u = Math.floor(e.pos.z / t),
              c = `${n},${l},${u}`;
            c !== e.lastKey &&
              ((e.lastKey = c),
              C(
                y.map((e) => ({
                  key: `${n + e.dx},${l + e.dy},${u + e.dz}`,
                  cx: n + e.dx,
                  cy: l + e.dy,
                  cz: u + e.dz,
                })),
              ));
            return;
          }
          let a = f(e.pos.z / 50, 0.3, 2);
          (e.dragging ||
            ((e.drift.x = p(e.drift.x, e.mouse.x * u * a, 0.12)),
            (e.drift.y = p(e.drift.y, e.mouse.y * u * a, 0.12))),
            (e.tgt.z += e.scrollAccum),
            (e.scrollAccum *= 0.8),
            d && (e.pos.z -= m),
            (e.tgt.x = f(e.tgt.x, -3.2, 3.2)),
            (e.tgt.y = f(e.tgt.y, -3.2, 3.2)),
            (e.tgt.z = f(e.tgt.z, -3.2, 3.2)),
            (e.vel.x = p(e.vel.x, e.tgt.x, 0.16)),
            (e.vel.y = p(e.vel.y, e.tgt.y, 0.16)),
            (e.vel.z = p(e.vel.z, e.tgt.z, 0.16)),
            (e.pos.x += e.vel.x),
            (e.pos.y += e.vel.y),
            (e.pos.z += e.vel.z),
            x.position.set(e.pos.x + e.drift.x, e.pos.y + e.drift.y, e.pos.z),
            (e.tgt.x *= c),
            (e.tgt.y *= c),
            (e.tgt.z *= c),
            (w.current = { x: e.pos.x, y: e.pos.y, z: e.pos.z }));
          let o = Math.floor(e.pos.x / t),
            r = Math.floor(e.pos.y / t),
            i = Math.floor(e.pos.z / t),
            s = `${o},${r},${i}`;
          s !== e.lastKey &&
            ((e.lastKey = s),
            C(
              y.map((e) => ({
                key: `${o + e.dx},${r + e.dy},${i + e.dz}`,
                cx: o + e.dx,
                cy: r + e.dy,
                cz: i + e.dz,
              })),
            ));
        }),
        (0, o.jsxs)(o.Fragment, {
          children: [
            h &&
              (0, o.jsxs)("mesh", {
                position: [x.position.x, x.position.y, x.position.z - 400],
                onClick: F,
                children: [
                  (0, o.jsx)("planeGeometry", { args: [1e4, 1e4] }),
                  (0, o.jsx)("meshBasicMaterial", { visible: !1 }),
                ],
              }),
            S.map((r) =>
              (0, o.jsx)(
                M,
                {
                  cx: r.cx,
                  cy: r.cy,
                  cz: r.cz,
                  images: e,
                  cellSize: t,
                  density: a,
                  imageSize: i,
                  camRef: w,
                  viewRange: s,
                  imageRadius: g,
                  onFocus: h ? j : null,
                },
                r.key,
              ),
            ),
          ],
        })
      );
    }
    let j = [
        {
          url: "/demo-media/abstract-rose-balance.webp",
          width: 1536,
          height: 1024,
        },
        {
          url: "/demo-media/abstract-pink-eclipse.webp",
          width: 1536,
          height: 1024,
        },
        {
          url: "/demo-media/abstract-amber-loop.webp",
          width: 1536,
          height: 1024,
        },
        {
          url: "/demo-media/abstract-coral-fold.webp",
          width: 1536,
          height: 1024,
        },
        {
          url: "/demo-media/abstract-fuchsia-wave.webp",
          width: 1536,
          height: 1024,
        },
        {
          url: "/demo-media/abstract-orchid-orbit.webp",
          width: 1536,
          height: 1024,
        },
        {
          url: "/demo-media/abstract-plum-ribbon.webp",
          width: 1536,
          height: 1024,
        },
        {
          url: "/demo-media/abstract-violet-steps.webp",
          width: 1536,
          height: 1024,
        },
      ],
      F = () => Math.min(window.devicePixelRatio || 1, 1.5),
      E = (e) => {
        let t = window.matchMedia(
          `(resolution: ${window.devicePixelRatio}dppx)`,
        );
        return (
          t.addEventListener("change", e, { once: !0 }),
          () => t.removeEventListener("change", e)
        );
      },
      T = () => 1,
      k = (e) => {
        let t = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);
        return t ? `#${t[1]}${t[2]}${t[3]}` : "#ffffff";
      },
      $ = ({
        width: e = "100%",
        height: t = "100%",
        className: a,
        images: i,
        density: s = 5,
        imageSize: n = 14,
        cellSize: l = 110,
        viewRange: d = 2,
        fogNear: m = 120,
        fogFar: f = 320,
        dragSpeed: p = 1,
        driftAmount: g = 8,
        friction: h = 0.9,
        autoZoom: x = !1,
        autoZoomSpeed: v = 0.5,
        imageRadius: y = 0.06,
        allowImageFocusOnClick: z = !0,
        backgroundColor: w = "#000000",
        fogColor: b = "#000000",
      }) => {
        let S = i && i.length > 0 ? i : j,
          M = k(w),
          $ = k(b),
          D = (0, r.useSyncExternalStore)(E, F, T);
        return (0, o.jsx)("div", {
          className: (0, c.cn)("relative overflow-hidden touch-none", a),
          style: { width: e, height: t },
          children: (0, o.jsxs)(u.Hl, {
            className: "absolute inset-0 h-full w-full",
            camera: { position: [0, 0, 50], fov: 60, near: 1, far: 500 },
            dpr: D,
            flat: !0,
            gl: { antialias: !1, powerPreference: "high-performance" },
            children: [
              (0, o.jsx)("color", { attach: "background", args: [M] }),
              (0, o.jsx)("fog", { attach: "fog", args: [$, m, f] }),
              (0, o.jsx)(C, {
                images: S,
                cellSize: l,
                density: s,
                imageSize: n,
                viewRange: d,
                dragSpeed: p,
                driftAmount: g,
                friction: h,
                autoZoom: x,
                autoZoomSpeed: v,
                imageRadius: y,
                allowFocus: z,
              }),
            ],
          }),
        });
      };
    $.displayName = "InfiniteGallery";
    let D = () => {
      let [e, t] = (0, n.I)(),
        { resolvedTheme: a } = (0, i.D)(),
        [l, u] = (0, r.useState)(5),
        [c, d] = (0, r.useState)(14),
        [m, f] = (0, r.useState)(110),
        [p, g] = (0, r.useState)(2),
        [h, x] = (0, r.useState)(0.06),
        [v, y] = (0, r.useState)(120),
        [z, w] = (0, r.useState)(320),
        [b, S] = (0, r.useState)(1),
        [M, C] = (0, r.useState)(8),
        [j, F] = (0, r.useState)(0.9),
        [E, T] = (0, r.useState)(!1),
        [k, D] = (0, r.useState)(0.5),
        [R, A] = (0, r.useState)(!0),
        [L, N] = (0, r.useState)(null),
        [I, P] = (0, r.useState)(null),
        U = (0, r.useMemo)(
          () => (null !== L ? L : "dark" === a ? "#0a0a0a" : "#FFFFFF"),
          [a, L],
        ),
        _ = (0, r.useMemo)(
          () => (null !== I ? I : "dark" === a ? "#0a0a0a" : "#FFFFFF"),
          [a, I],
        );
      return (0, o.jsxs)("div", {
        children: [
          (0, o.jsx)(s.Bg, {}),
          (0, o.jsxs)(s.VX, {
            children: [
              (0, o.jsxs)(s.Ec, {
                children: [
                  (0, o.jsx)(s.Ch, {
                    onRefresh: t,
                    children: (0, o.jsx)("div", {
                      className: "relative h-full w-full",
                      children: (0, o.jsx)(
                        $,
                        {
                          width: "100%",
                          height: "100%",
                          density: l,
                          imageSize: c,
                          cellSize: m,
                          viewRange: p,
                          fogNear: v,
                          fogFar: z,
                          dragSpeed: b,
                          driftAmount: M,
                          friction: j,
                          autoZoom: E,
                          autoZoomSpeed: k,
                          imageRadius: h,
                          allowImageFocusOnClick: R,
                          backgroundColor: U,
                          fogColor: _,
                        },
                        e,
                      ),
                    }),
                  }),
                  (0, o.jsxs)(s.IH, {
                    children: [
                      (0, o.jsx)(s.yt, {
                        title: "Density",
                        value: l,
                        onChange: u,
                        min: 1,
                        max: 15,
                        step: 1,
                      }),
                      (0, o.jsx)(s.yt, {
                        title: "Image Size",
                        value: c,
                        onChange: d,
                        min: 4,
                        max: 40,
                        step: 1,
                      }),
                      (0, o.jsx)(s.yt, {
                        title: "Cell Size",
                        value: m,
                        onChange: f,
                        min: 30,
                        max: 300,
                        step: 5,
                      }),
                      (0, o.jsx)(s.yt, {
                        title: "View Range",
                        value: p,
                        onChange: g,
                        min: 1,
                        max: 4,
                        step: 1,
                      }),
                      (0, o.jsx)(s.yt, {
                        title: "Image Radius",
                        value: h,
                        onChange: x,
                        min: 0,
                        max: 1,
                        step: 0.01,
                      }),
                      (0, o.jsx)(s.yt, {
                        title: "Drag Speed",
                        value: b,
                        onChange: S,
                        min: 0.1,
                        max: 5,
                        step: 0.1,
                      }),
                      (0, o.jsx)(s.yt, {
                        title: "Drift Amount",
                        value: M,
                        onChange: C,
                        min: 0,
                        max: 20,
                        step: 0.5,
                      }),
                      (0, o.jsx)(s.yt, {
                        title: "Friction",
                        value: j,
                        onChange: F,
                        min: 0,
                        max: 1,
                        step: 0.01,
                      }),
                      (0, o.jsx)(s.tl, {
                        title: "Auto Zoom",
                        checked: E,
                        onChange: T,
                      }),
                      (0, o.jsx)(s.yt, {
                        title: "Auto Zoom Speed",
                        value: k,
                        onChange: D,
                        min: 0.1,
                        max: 3,
                        step: 0.1,
                      }),
                      (0, o.jsx)(s.tl, {
                        title: "Focus on Click",
                        checked: R,
                        onChange: A,
                      }),
                      (0, o.jsx)(s.yt, {
                        title: "Fog Near",
                        value: v,
                        onChange: y,
                        min: 10,
                        max: 500,
                        step: 5,
                      }),
                      (0, o.jsx)(s.yt, {
                        title: "Fog Far",
                        value: z,
                        onChange: w,
                        min: 50,
                        max: 800,
                        step: 10,
                      }),
                      (0, o.jsx)(s.W7, {
                        title: "Background",
                        value: U,
                        onChange: (e) => N(e),
                      }),
                      (0, o.jsx)(s.W7, {
                        title: "Fog Color",
                        value: _,
                        onChange: (e) => P(e),
                      }),
                    ],
                  }),
                  (0, o.jsx)(s.Ub, {
                    data: [
                      {
                        name: "width",
                        type: "string | number",
                        default: '"100%"',
                        description: "Container width",
                      },
                      {
                        name: "height",
                        type: "string | number",
                        default: '"100%"',
                        description: "Container height",
                      },
                      {
                        name: "className",
                        type: "string",
                        default: '""',
                        description: "Additional CSS classes for styling",
                      },
                      {
                        name: "images",
                        type: "GalleryImage[]",
                        default: "DEFAULT_IMAGES",
                        description:
                          "Array of images with url + intrinsic dimensions ({ url, width, height })",
                      },
                      {
                        name: "density",
                        type: "number",
                        default: "5",
                        description: "Number of images per grid cell (1–15)",
                      },
                      {
                        name: "imageSize",
                        type: "number",
                        default: "14",
                        description:
                          "Base size of each image plane in world units (4–40)",
                      },
                      {
                        name: "cellSize",
                        type: "number",
                        default: "110",
                        description: "Grid cell size in world units (30–300)",
                      },
                      {
                        name: "viewRange",
                        type: "number",
                        default: "2",
                        description:
                          "How far (in cells) to render around the camera (1–4)",
                      },
                      {
                        name: "fogNear",
                        type: "number",
                        default: "120",
                        description: "Fog start distance (10–500)",
                      },
                      {
                        name: "fogFar",
                        type: "number",
                        default: "320",
                        description: "Fog end distance (50–800)",
                      },
                      {
                        name: "dragSpeed",
                        type: "number",
                        default: "1",
                        description: "Drag / scroll sensitivity (0.1–5)",
                      },
                      {
                        name: "driftAmount",
                        type: "number",
                        default: "8",
                        description:
                          "Mouse-follow parallax drift amount (0–20)",
                      },
                      {
                        name: "friction",
                        type: "number",
                        default: "0.9",
                        description:
                          "Velocity decay (0 = instant stop, 1 = never stops)",
                      },
                      {
                        name: "autoZoom",
                        type: "boolean",
                        default: "false",
                        description: "Automatically zoom forward continuously",
                      },
                      {
                        name: "autoZoomSpeed",
                        type: "number",
                        default: "0.5",
                        description:
                          "Speed of auto-zoom in world units per frame (0.1–3)",
                      },
                      {
                        name: "imageRadius",
                        type: "number",
                        default: "0.06",
                        description:
                          "Border radius on images (0–1, fraction of short edge)",
                      },
                      {
                        name: "allowImageFocusOnClick",
                        type: "boolean",
                        default: "true",
                        description:
                          "Allow clicking images to focus/zoom on them",
                      },
                      {
                        name: "backgroundColor",
                        type: "string",
                        default: '"#000000"',
                        description: "Background color (hex)",
                      },
                      {
                        name: "fogColor",
                        type: "string",
                        default: '"#000000"',
                        description:
                          "Fog color, usually matches background (hex)",
                      },
                    ],
                  }),
                ],
              }),
              (0, o.jsx)(s.lT, { children: (0, o.jsx)(s.Gv, {}) }),
            ],
          }),
        ],
      });
    };
  },
};
