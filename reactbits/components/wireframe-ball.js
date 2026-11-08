/* ReactBits Pro public preview module 75303 for wireframe-ball.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/75303.25f512fc8924ee6c.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  75303: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => I }));
    var r = a(95155),
      n = a(12115),
      l = a(30701),
      i = a(56388),
      o = a(90761),
      u = a(81712),
      s = a(3907),
      d = a(2253),
      c = a(90650);
    let h = `
attribute vec2 corner;
attribute vec3 aHead;
attribute vec3 aTail;

uniform mat3 uFrame;
uniform vec2 uProject;
uniform float uReach;

varying vec2 vPoint;
varying vec2 vHead;
varying vec2 vTail;
varying float vSlab;

void main() {
  vec3 head = uFrame * aHead;
  vec3 tail = uFrame * aTail;

  vec2 a = head.xy;
  vec2 b = tail.xy;
  vec2 run = b - a;
  float span = length(run);
  vec2 along = span > 1e-6 ? run / span : vec2(1.0, 0.0);
  vec2 side = vec2(-along.y, along.x);

  float u = corner.x;
  float v = corner.y * 2.0 - 1.0;
  vec2 seat = a + along * (u * span + (u * 2.0 - 1.0) * uReach) + side * v * uReach;

  vPoint = seat;
  vHead = a;
  vTail = b;
  vSlab = (head.z + tail.z) * 0.5;

  gl_Position = vec4(seat * uProject, 0.0, 1.0);
}
`,
      f = `
precision highp float;

uniform vec3 uInk;
uniform vec3 uDepthInk;
uniform float uYield;
uniform float uCore;
uniform float uTint;
uniform float uRecede;
uniform float uShell;

varying vec2 vPoint;
varying vec2 vHead;
varying vec2 vTail;
varying float vSlab;

void main() {
  vec2 rel = vPoint - vHead;
  vec2 run = vTail - vHead;
  float t = clamp(dot(rel, run) / max(dot(run, run), 1e-8), 0.0, 1.0);
  float gap = length(rel - run * t);

  float lift = uYield / (uCore + gap);

  float depth = clamp(vSlab / uShell * 0.5 + 0.5, 0.0, 1.0);
  lift *= mix(1.0, depth, uRecede);

  vec3 hue = mix(uInk, uDepthInk, uTint * (1.0 - depth));

  gl_FragColor = vec4(hue * lift, lift);
}
`,
      p = `
attribute vec2 corner;
attribute vec3 aSeat;
attribute float aWeight;

uniform mat3 uFrame;
uniform vec2 uProject;
uniform float uReach;

varying vec2 vOffset;
varying float vWeight;
varying float vSlab;

void main() {
  vec3 seat = uFrame * aSeat;
  vec2 pull = (corner * 2.0 - 1.0) * uReach;

  vOffset = pull;
  vWeight = aWeight;
  vSlab = seat.z;

  gl_Position = vec4((seat.xy + pull) * uProject, 0.0, 1.0);
}
`,
      m = `
precision highp float;

uniform vec3 uInk;
uniform vec3 uDepthInk;
uniform float uGrain;
uniform float uYield;
uniform float uTint;
uniform float uRecede;
uniform float uShell;

varying vec2 vOffset;
varying float vWeight;
varying float vSlab;

void main() {
  float bead = smoothstep(uGrain, 0.0, length(vOffset));
  if (bead <= 0.0) discard;

  float depth = clamp(vSlab / uShell * 0.5 + 0.5, 0.0, 1.0);
  float lift = bead * vWeight * uYield * mix(1.0, depth, uRecede);

  vec3 hue = mix(uInk, uDepthInk, uTint * (1.0 - depth));

  gl_FragColor = vec4(hue * lift, lift);
}
`,
      v = (e, t, a) => Math.min(a, Math.max(t, e)),
      g = (e, t) => {
        let a = new d.Q1f();
        try {
          a.set(e);
        } catch {
          a.set(t);
        }
        return a;
      },
      b = (1 + Math.sqrt(5)) / 2,
      x = Math.hypot(1.28, 1),
      y = (e, t) => [e[0] - t[0], e[1] - t[1], e[2] - t[2]],
      w = (e, t) => [
        e[1] * t[2] - e[2] * t[1],
        e[2] * t[0] - e[0] * t[2],
        e[0] * t[1] - e[1] * t[0],
      ],
      C = (e, t) => e[0] * t[0] + e[1] * t[1] + e[2] * t[2],
      S = (e) => Math.hypot(e[0], e[1], e[2]),
      j = () => {
        let e = new d.CmU();
        return (
          e.setAttribute(
            "corner",
            new d.THS(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2),
          ),
          e.setIndex([0, 1, 2, 0, 2, 3]),
          (e.boundingSphere = new d.iyt(new d.Pq0(), 1 / 0)),
          e
        );
      },
      M = ({
        shape: e,
        detail: t,
        stretch: a,
        zoom: l,
        speed: i,
        wobble: o,
        showEdges: s,
        edgeColor: c,
        edgeGlow: M,
        edgeThickness: k,
        showVertices: R,
        vertexColor: T,
        vertexSize: I,
        vertexGlow: P,
        depthColor: E,
        depthTint: F,
        depthFade: D,
        brightness: Y,
        opacity: A,
        adaptiveQuality: z,
        targetFps: W,
        paused: H,
        readDrift: O,
      }) => {
        let G = (0, u.C)((e) => e.invalidate),
          N = (0, u.C)((e) => e.setDpr),
          X = (0, u.C)((e) => e.size),
          q = (0, u.C)((e) => e.viewport.dpr),
          B = (0, n.useMemo)(
            () =>
              ((e, t, a) => {
                let r = ((e, t) => {
                    if ("tetrahedron" === e)
                      return [
                        [1, 1, 1],
                        [-1, -1, 1],
                        [-1, 1, -1],
                        [1, -1, -1],
                      ];
                    if ("cube" === e) {
                      let e = [];
                      for (let t = -1; t <= 1; t += 2)
                        for (let a = -1; a <= 1; a += 2)
                          for (let r = -1; r <= 1; r += 2) e.push([t, a, r]);
                      return e;
                    }
                    if ("octahedron" === e)
                      return [
                        [1, 0, 0],
                        [-1, 0, 0],
                        [0, 1, 0],
                        [0, -1, 0],
                        [0, 0, 1],
                        [0, 0, -1],
                      ];
                    if ("dodecahedron" === e) {
                      let e = [];
                      for (let t = -1; t <= 1; t += 2)
                        for (let a = -1; a <= 1; a += 2)
                          for (let r = -1; r <= 1; r += 2) e.push([t, a, r]);
                      let t = 1 / b;
                      for (let a = -1; a <= 1; a += 2)
                        for (let r = -1; r <= 1; r += 2)
                          (e.push([0, a * t, r * b]),
                            e.push([a * t, r * b, 0]),
                            e.push([a * b, 0, r * t]));
                      return e;
                    }
                    let a = [];
                    for (let e = -1; e <= 1; e += 2)
                      for (let r = -1; r <= 1; r += 2)
                        (a.push([e * t, r, 0]),
                          a.push([0, e * t, r]),
                          a.push([r, 0, e * t]));
                    return a;
                  })(e, a),
                  n = ((e) => {
                    let t = e.length,
                      a = new Set(),
                      r = [];
                    for (let n = 0; n < t; n++)
                      for (let l = n + 1; l < t; l++)
                        for (let i = l + 1; i < t; i++) {
                          let o = w(y(e[l], e[n]), y(e[i], e[n])),
                            u = S(o);
                          if (u < 1e-6) continue;
                          let s = [o[0] / u, o[1] / u, o[2] / u],
                            d = C(s, e[n]);
                          if (
                            (d < 0 && ((s = [-s[0], -s[1], -s[2]]), (d = -d)),
                            d < 1e-6)
                          )
                            continue;
                          let c = [],
                            h = !1;
                          for (let a = 0; a < t && !h; a++) {
                            let t = C(s, e[a]) - d;
                            t > 1e-6 ? (h = !0) : t > -1e-6 && c.push(a);
                          }
                          if (h || c.length < 3) continue;
                          let f = c.join("_");
                          if (a.has(f)) continue;
                          a.add(f);
                          let p = [0, 0, 0];
                          c.forEach((t) => {
                            ((p[0] += e[t][0] / c.length),
                              (p[1] += e[t][1] / c.length),
                              (p[2] += e[t][2] / c.length));
                          });
                          let m = y(e[c[0]], p),
                            v = S(m),
                            g = [m[0] / v, m[1] / v, m[2] / v],
                            b = w(s, g);
                          r.push(
                            c
                              .map((t) => {
                                let a = y(e[t], p);
                                return {
                                  m: t,
                                  a: Math.atan2(C(a, b), C(a, g)),
                                };
                              })
                              .sort((e, t) => e.a - t.a)
                              .map((e) => e.m),
                          );
                        }
                    return r;
                  })(r),
                  l = S(r[0]) || 1,
                  i = r.map((e) => e.slice()),
                  o = new Set(),
                  u = (e, t) => o.add(e < t ? `${e}:${t}` : `${t}:${e}`);
                if (t <= 0)
                  n.forEach((e) => {
                    for (let t = 0; t < e.length; t++)
                      u(e[t], e[(t + 1) % e.length]);
                  });
                else {
                  let e = (e) => {
                      let t = S(e) || 1;
                      return [(e[0] / t) * l, (e[1] / t) * l, (e[2] / t) * l];
                    },
                    a = [];
                  n.forEach((t) => {
                    if (3 === t.length) return void a.push([t[0], t[1], t[2]]);
                    let r = [0, 0, 0];
                    t.forEach((e) => {
                      ((r[0] += i[e][0] / t.length),
                        (r[1] += i[e][1] / t.length),
                        (r[2] += i[e][2] / t.length));
                    });
                    let n = i.push(e(r)) - 1;
                    for (let e = 0; e < t.length; e++)
                      a.push([n, t[e], t[(e + 1) % t.length]]);
                  });
                  for (let r = 0; r < t; r++) {
                    let t = new Map(),
                      r = (a, r) => {
                        let n = a < r ? `${a}:${r}` : `${r}:${a}`,
                          l = t.get(n);
                        if (void 0 !== l) return l;
                        let o = e([
                            (i[a][0] + i[r][0]) / 2,
                            (i[a][1] + i[r][1]) / 2,
                            (i[a][2] + i[r][2]) / 2,
                          ]),
                          u = i.push(o) - 1;
                        return (t.set(n, u), u);
                      },
                      n = [];
                    (a.forEach(([e, t, a]) => {
                      let l = r(e, t),
                        i = r(t, a),
                        o = r(a, e);
                      n.push([e, l, o], [l, t, i], [o, i, a], [l, i, o]);
                    }),
                      (a = n));
                  }
                  a.forEach(([e, t, a]) => {
                    (u(e, t), u(t, a), u(a, e));
                  });
                }
                let s = new Map(),
                  d = [],
                  c = [],
                  h = new Map();
                o.forEach((e) => {
                  let [t, a] = e.split(":").map(Number);
                  ([t, a].forEach((e) => {
                    (s.has(e) || s.set(e, s.size),
                      h.set(e, (h.get(e) ?? 0) + 1));
                  }),
                    d.push(t),
                    c.push(a));
                });
                let f = x / l,
                  p = new Float32Array(3 * s.size),
                  m = new Float32Array(s.size);
                s.forEach((e, t) => {
                  ((p[3 * e] = i[t][0] * f),
                    (p[3 * e + 1] = i[t][1] * f),
                    (p[3 * e + 2] = i[t][2] * f),
                    (m[e] = h.get(t) ?? 0));
                });
                let v = new Float32Array(3 * d.length),
                  g = new Float32Array(3 * d.length);
                return (
                  d.forEach((e, t) => {
                    let a = 3 * s.get(e);
                    ((v[3 * t] = p[a]),
                      (v[3 * t + 1] = p[a + 1]),
                      (v[3 * t + 2] = p[a + 2]));
                  }),
                  c.forEach((e, t) => {
                    let a = 3 * s.get(e);
                    ((g[3 * t] = p[a]),
                      (g[3 * t + 1] = p[a + 1]),
                      (g[3 * t + 2] = p[a + 2]));
                  }),
                  {
                    seats: p,
                    weights: m,
                    head: v,
                    tail: g,
                    nodeCount: s.size,
                    edgeCount: d.length,
                  }
                );
              })(e, v(Math.round(t), 0, 3), a),
            [e, t, a],
          ),
          Q = (0, n.useMemo)(() => {
            let e = j();
            return (
              e.setAttribute("aHead", new d.uWO(B.head, 3)),
              e.setAttribute("aTail", new d.uWO(B.tail, 3)),
              (e.instanceCount = B.edgeCount),
              e
            );
          }, [B]),
          V = (0, n.useMemo)(() => {
            let e = j();
            return (
              e.setAttribute("aSeat", new d.uWO(B.seats, 3)),
              e.setAttribute("aWeight", new d.uWO(B.weights, 1)),
              (e.instanceCount = B.nodeCount),
              e
            );
          }, [B]),
          _ = (0, n.useMemo)(
            () => ({
              uFrame: { value: new d.dwI() },
              uProject: { value: new d.I9Y(1, 1) },
              uReach: { value: 0.2 },
              uInk: { value: new d.Q1f("#ffffff") },
              uDepthInk: { value: new d.Q1f("#ffffff") },
              uYield: { value: 8e-4 },
              uCore: { value: 0.02 },
              uTint: { value: 0 },
              uRecede: { value: 0 },
              uShell: { value: x },
            }),
            [],
          ),
          $ = (0, n.useMemo)(
            () => ({
              uFrame: { value: new d.dwI() },
              uProject: { value: new d.I9Y(1, 1) },
              uReach: { value: 0.032 },
              uInk: { value: new d.Q1f("#ffffff") },
              uDepthInk: { value: new d.Q1f("#ffffff") },
              uGrain: { value: 0.032 },
              uYield: { value: 0.148 },
              uTint: { value: 0 },
              uRecede: { value: 0 },
              uShell: { value: x },
            }),
            [],
          ),
          L = (0, n.useRef)(null),
          U = (0, n.useRef)(null),
          Z = (0, n.useMemo)(() => g(c, "#ffffff"), [c]),
          J = (0, n.useMemo)(() => g(T, "#ffffff"), [T]),
          K = (0, n.useMemo)(() => g(E, "#7aa2ff"), [E]);
        (0, n.useEffect)(
          () => () => {
            (Q.dispose(), V.dispose());
          },
          [Q, V],
        );
        let ee = (0, n.useRef)(!1);
        (0, n.useEffect)(() => {
          if (!window.matchMedia) return;
          let e = window.matchMedia("(prefers-reduced-motion: reduce)");
          ee.current = e.matches;
          let t = () => {
            ee.current = e.matches;
          };
          return (
            e.addEventListener("change", t),
            () => e.removeEventListener("change", t)
          );
        }, []);
        let et = (0, n.useRef)(0.8),
          ea = (0, n.useRef)({
            since: 0,
            frames: 0,
            scale: 1,
            good: 0,
            roof: 1 / 0,
            warm: 0,
          });
        return (
          (0, u.D)((e, t) => {
            let a = Math.min(t, 0.05);
            H || ee.current || (et.current += a * i);
            let r = et.current,
              n = Math.sin(r / 3.14),
              u = Math.sin(r / 1.28),
              s = Math.sin(r / 5.12),
              d = Math.hypot(n, u, s),
              c = d < 1e-5 ? [0.577, 0.577, 0.577] : [n / d, u / d, s / d],
              h = w(c, [1, 1, 1]),
              f = S(h);
            f < 1e-5 && (f = S((h = w(c, [0, 1, 0]))) || 1);
            let p = w((h = [h[0] / f, h[1] / f, h[2] / f]), c),
              m = O();
            if (m) {
              if (!m.dragging) {
                ((m.yaw += m.yawRate * a * 60),
                  (m.pitch += m.pitchRate * a * 60));
                let e = Math.pow(v(m.friction, 0.5, 0.999), 60 * a);
                ((m.yawRate *= e), (m.pitchRate *= e));
              }
              let e = 1 - Math.pow(0.001, a);
              ((m.tiltX += (m.aimX - m.tiltX) * e),
                (m.tiltY += (m.aimY - m.tiltY) * e));
            }
            let g = (m?.yaw ?? 0) + (m?.tiltX ?? 0),
              b = (m?.pitch ?? 0) + (m?.tiltY ?? 0),
              y = Math.sin(g),
              C = Math.cos(g),
              j = Math.sin(b),
              R = Math.cos(b),
              T = (e) => {
                let t = e[0] * C + e[2] * y,
                  a = -e[0] * y + e[2] * C;
                return [t, e[1] * R - a * j, e[1] * j + a * R];
              },
              E = T(c),
              B = T(h),
              Q = T(p),
              V = 1 + Math.sin(0.37 * r) * o,
              _ = x * V,
              $ = 6 / Math.max(l, 0.05),
              er = Math.min(X.width, X.height) || 1,
              en = (2 * er) / (Math.max(X.width, 1) * $),
              el = (2 * er) / (Math.max(X.height, 1) * $),
              ei = Y * A * V,
              eo = 8e-4 * M * ei,
              eu = v(eo / 0.0035 - k, 0.03, 2.5),
              es = L.current?.uniforms,
              ed = U.current?.uniforms;
            if (!es || !ed) return;
            let ec = es.uFrame.value;
            if (
              (ec.set(
                E[0] * V,
                B[0] * V,
                Q[0] * V,
                E[1] * V,
                B[1] * V,
                Q[1] * V,
                E[2] * V,
                B[2] * V,
                Q[2] * V,
              ),
              ed.uFrame.value.copy(ec),
              es.uProject.value.set(en, el),
              ed.uProject.value.set(en, el),
              (es.uReach.value = eu),
              (es.uYield.value = eo),
              (es.uCore.value = Math.max(k, 1e-4)),
              (es.uTint.value = F),
              (es.uRecede.value = D),
              (es.uShell.value = _),
              es.uInk.value.copy(Z),
              es.uDepthInk.value.copy(K),
              (ed.uReach.value = Math.max(I, 1e-4)),
              (ed.uGrain.value = Math.max(I, 1e-4)),
              (ed.uYield.value = P * ei),
              (ed.uTint.value = F),
              (ed.uRecede.value = D),
              (ed.uShell.value = _),
              ed.uInk.value.copy(J),
              ed.uDepthInk.value.copy(K),
              z)
            ) {
              let e = ea.current;
              if (
                ((e.warm += a),
                e.warm > 0.5 &&
                  ((e.frames += 1), (e.since += a), e.since >= 0.75))
              ) {
                let t = e.frames / e.since;
                if (t < 0.85 * W && e.scale > 0.5)
                  ((e.roof = Math.min(e.roof, e.scale)),
                    (e.scale = Math.max(0.5, 0.75 * e.scale)),
                    (e.good = 0),
                    N(q * e.scale));
                else if (t > 0.95 * W) {
                  e.good += 1;
                  let t = Math.min(1, 1.25 * e.scale);
                  e.good >= 3 &&
                    t < e.roof &&
                    e.scale < 1 &&
                    ((e.scale = t), (e.good = 0), N(q * e.scale));
                }
                ((e.frames = 0), (e.since = 0));
              }
            }
            G();
          }),
          (0, r.jsxs)(r.Fragment, {
            children: [
              (0, r.jsx)("mesh", {
                frustumCulled: !1,
                geometry: Q,
                renderOrder: 0,
                visible: s,
                children: (0, r.jsx)("shaderMaterial", {
                  ref: L,
                  vertexShader: h,
                  fragmentShader: f,
                  uniforms: _,
                  transparent: !0,
                  depthTest: !1,
                  depthWrite: !1,
                  blending: d.bCz,
                  blendSrc: d.qad,
                  blendDst: d.qad,
                  blendSrcAlpha: d.qad,
                  blendDstAlpha: d.qad,
                }),
              }),
              (0, r.jsx)("mesh", {
                frustumCulled: !1,
                geometry: V,
                renderOrder: 1,
                visible: R,
                children: (0, r.jsx)("shaderMaterial", {
                  ref: U,
                  vertexShader: p,
                  fragmentShader: m,
                  uniforms: $,
                  transparent: !0,
                  depthTest: !1,
                  depthWrite: !1,
                  blending: d.bCz,
                  blendSrc: d.qad,
                  blendDst: d.qad,
                  blendSrcAlpha: d.qad,
                  blendDstAlpha: d.qad,
                }),
              }),
            ],
          })
        );
      },
      k = () => () => {},
      R = () => window.devicePixelRatio || 1,
      T = ({
        shape: e = "icosahedron",
        detail: t = 0,
        stretch: a = 1.28,
        zoom: l = 1,
        speed: i = 1,
        wobble: o = 0,
        showEdges: u = !0,
        edgeColor: d = "currentColor",
        edgeGlow: h = 1,
        edgeThickness: f = 0.02,
        showVertices: p = !0,
        vertexColor: m = "currentColor",
        vertexSize: g = 0.032,
        vertexGlow: b = 0.148,
        depthColor: x = "#7aa2ff",
        depthTint: y = 0,
        depthFade: w = 0,
        backgroundColor: C = "transparent",
        brightness: S = 1,
        opacity: j = 1,
        cursorInteraction: T = !0,
        cursorTilt: I = 0.35,
        dragToSpin: P = !0,
        spinFriction: E = 0.94,
        adaptiveQuality: F = !0,
        targetFps: D = 60,
        dpr: Y = 2,
        paused: A = !1,
        className: z,
        style: W,
        children: H,
      }) => {
        let O = (0, n.useRef)(null),
          G = (0, n.useRef)({ active: !1, x: 0, y: 0, id: -1 }),
          N = (0, n.useRef)({
            yaw: 0,
            pitch: 0,
            yawRate: 0,
            pitchRate: 0,
            tiltX: 0,
            tiltY: 0,
            aimX: 0,
            aimY: 0,
            dragging: !1,
            friction: 0.94,
          }),
          [X, q] = (0, n.useState)(!1),
          [B, Q] = (0, n.useState)("#ffffff"),
          V = (0, n.useSyncExternalStore)(k, R, () => 1);
        ((0, n.useEffect)(() => {
          let e = O.current;
          if (!e) return;
          let t = new IntersectionObserver(([e]) => q(e.isIntersecting), {
            rootMargin: "200px",
          });
          return (t.observe(e), () => t.disconnect());
        }, []),
          (0, n.useEffect)(() => {
            let e = O.current;
            if (!e) return;
            let t = 0,
              a = () => {
                let t = window.getComputedStyle(e).color;
                t && Q(t);
              },
              r = () => {
                (cancelAnimationFrame(t), (t = requestAnimationFrame(a)));
              };
            r();
            let n = new MutationObserver(r);
            return (
              n.observe(document.documentElement, {
                attributes: !0,
                attributeFilter: ["class", "style", "data-theme"],
              }),
              () => {
                (cancelAnimationFrame(t), n.disconnect());
              }
            );
          }, []));
        let _ = (0, n.useCallback)(
            (e) => ("currentColor" === e || "auto" === e ? B : e),
            [B],
          ),
          $ = (0, n.useCallback)(() => N.current, []),
          L = (0, n.useCallback)(
            (e) => {
              let t = O.current;
              if (!t) return;
              let a = t.getBoundingClientRect(),
                r = (e.clientX - a.left) / Math.max(a.width, 1) - 0.5,
                n = (e.clientY - a.top) / Math.max(a.height, 1) - 0.5,
                l = N.current;
              if (G.current.active) {
                let t = e.clientX - G.current.x,
                  r = e.clientY - G.current.y;
                ((G.current.x = e.clientX), (G.current.y = e.clientY));
                let n = (t / Math.max(a.width, 1)) * Math.PI * 2,
                  i = (r / Math.max(a.height, 1)) * Math.PI * 2;
                ((l.yaw += n),
                  (l.pitch += i),
                  (l.yawRate = 0.5 * n),
                  (l.pitchRate = 0.5 * i));
                return;
              }
              T && ((l.aimX = r * I), (l.aimY = n * I));
            },
            [T, I],
          ),
          U = (0, n.useCallback)(() => {
            let e = N.current;
            ((e.aimX = 0), (e.aimY = 0));
          }, []),
          Z = (0, n.useCallback)(
            (e) => {
              P &&
                ((G.current = {
                  active: !0,
                  x: e.clientX,
                  y: e.clientY,
                  id: e.pointerId,
                }),
                (N.current.dragging = !0),
                (N.current.yawRate = 0),
                (N.current.pitchRate = 0),
                e.currentTarget.setPointerCapture?.(e.pointerId));
            },
            [P],
          ),
          J = (0, n.useCallback)((e) => {
            G.current.active &&
              ((G.current.active = !1),
              (N.current.dragging = !1),
              e.currentTarget.releasePointerCapture?.(G.current.id));
          }, []);
        (0, n.useEffect)(() => {
          N.current.friction = E;
        }, [E]);
        let K = (0, n.useMemo)(() => v(Math.min(V, Y), 0.5, 2), [V, Y]);
        return (0, r.jsxs)("div", {
          ref: O,
          className: (0, c.cn)("relative overflow-hidden", z),
          style: { backgroundColor: C, touchAction: P ? "none" : void 0, ...W },
          onPointerMove: L,
          onPointerLeave: U,
          onPointerDown: Z,
          onPointerUp: J,
          onPointerCancel: J,
          children: [
            (0, r.jsx)("div", {
              className: "absolute inset-0",
              children: X
                ? (0, r.jsx)(s.Hl, {
                    dpr: K,
                    frameloop: "always",
                    gl: {
                      alpha: !0,
                      antialias: !1,
                      premultipliedAlpha: !0,
                      powerPreference: "high-performance",
                    },
                    children: (0, r.jsx)(M, {
                      shape: e,
                      detail: t,
                      stretch: a,
                      zoom: l,
                      speed: i,
                      wobble: o,
                      showEdges: u,
                      edgeColor: _(d),
                      edgeGlow: h,
                      edgeThickness: f,
                      showVertices: p,
                      vertexColor: _(m),
                      vertexSize: g,
                      vertexGlow: b,
                      depthColor: x,
                      depthTint: y,
                      depthFade: w,
                      brightness: S,
                      opacity: j,
                      adaptiveQuality: F,
                      targetFps: D,
                      paused: A,
                      readDrift: $,
                    }),
                  })
                : null,
            }),
            H
              ? (0, r.jsx)("div", {
                  className: "relative z-10 h-full w-full",
                  children: H,
                })
              : null,
          ],
        });
      },
      I = () => {
        let [e, t] = (0, o.I)(),
          { resolvedTheme: a } = (0, l.D)(),
          [u, s] = (0, n.useState)("icosahedron"),
          [d, c] = (0, n.useState)(0),
          [h, f] = (0, n.useState)(1.28),
          [p, m] = (0, n.useState)(1),
          [v, g] = (0, n.useState)(1),
          [b, x] = (0, n.useState)(0),
          [y, w] = (0, n.useState)(!0),
          [C, S] = (0, n.useState)(null),
          [j, M] = (0, n.useState)(1),
          [k, R] = (0, n.useState)(0.02),
          [I, P] = (0, n.useState)(!0),
          [E, F] = (0, n.useState)(null),
          [D, Y] = (0, n.useState)(0.032),
          [A, z] = (0, n.useState)(0.148),
          [W, H] = (0, n.useState)("#7aa2ff"),
          [O, G] = (0, n.useState)(0),
          [N, X] = (0, n.useState)(0),
          [q, B] = (0, n.useState)(1),
          [Q, V] = (0, n.useState)(1),
          [_, $] = (0, n.useState)(!0),
          [L, U] = (0, n.useState)(0.35),
          [Z, J] = (0, n.useState)(!0),
          [K, ee] = (0, n.useState)(0.94),
          [et, ea] = (0, n.useState)(!0),
          [er, en] = (0, n.useState)(60),
          [el, ei] = (0, n.useState)(2),
          [eo, eu] = (0, n.useState)(!1),
          es = (0, n.useMemo)(
            () => (null !== C ? C : "dark" === a ? "#ffffff" : "#0a0a0a"),
            [a, C],
          ),
          ed = (0, n.useMemo)(
            () => (null !== E ? E : "dark" === a ? "#ffffff" : "#0a0a0a"),
            [a, E],
          );
        return (0, r.jsxs)("div", {
          children: [
            (0, r.jsx)(i.Bg, {}),
            (0, r.jsxs)(i.VX, {
              children: [
                (0, r.jsxs)(i.Ec, {
                  children: [
                    (0, r.jsx)(i.Ch, {
                      onRefresh: t,
                      minHeight: 500,
                      children: (0, r.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, r.jsx)(
                          T,
                          {
                            shape: u,
                            detail: d,
                            stretch: h,
                            zoom: p,
                            speed: v,
                            wobble: b,
                            showEdges: y,
                            edgeColor: es,
                            edgeGlow: j,
                            edgeThickness: k,
                            showVertices: I,
                            vertexColor: ed,
                            vertexSize: D,
                            vertexGlow: A,
                            depthColor: W,
                            depthTint: O,
                            depthFade: N,
                            brightness: q,
                            opacity: Q,
                            cursorInteraction: _,
                            cursorTilt: L,
                            dragToSpin: Z,
                            spinFriction: K,
                            adaptiveQuality: et,
                            targetFps: er,
                            dpr: el,
                            paused: eo,
                            className: "h-full w-full",
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, r.jsxs)(i.IH, {
                      children: [
                        (0, r.jsx)(i.bg, {
                          title: "Shape",
                          value: u,
                          onChange: (e) => s(e),
                          options: [
                            { label: "Icosahedron", value: "icosahedron" },
                            { label: "Dodecahedron", value: "dodecahedron" },
                            { label: "Octahedron", value: "octahedron" },
                            { label: "Cube", value: "cube" },
                            { label: "Tetrahedron", value: "tetrahedron" },
                          ],
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Detail",
                          min: 0,
                          max: 3,
                          step: 1,
                          value: d,
                          onChange: c,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Stretch",
                          min: 0.4,
                          max: 2.4,
                          step: 0.01,
                          value: h,
                          onChange: f,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Zoom",
                          min: 0.3,
                          max: 2.5,
                          step: 0.01,
                          value: p,
                          onChange: m,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Speed",
                          min: 0,
                          max: 4,
                          step: 0.05,
                          value: v,
                          onChange: g,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Wobble",
                          min: 0,
                          max: 0.4,
                          step: 0.005,
                          value: b,
                          onChange: x,
                        }),
                        (0, r.jsx)(i.tl, {
                          title: "Show Edges",
                          checked: y,
                          onChange: w,
                        }),
                        (0, r.jsx)(i.W7, {
                          title: "Edge Color",
                          value: es,
                          onChange: S,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Edge Glow",
                          min: 0,
                          max: 6,
                          step: 0.05,
                          value: j,
                          onChange: M,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Edge Thickness",
                          min: 0.004,
                          max: 0.12,
                          step: 0.001,
                          value: k,
                          onChange: R,
                        }),
                        (0, r.jsx)(i.tl, {
                          title: "Show Vertices",
                          checked: I,
                          onChange: P,
                        }),
                        (0, r.jsx)(i.W7, {
                          title: "Vertex Color",
                          value: ed,
                          onChange: F,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Vertex Size",
                          min: 0,
                          max: 0.12,
                          step: 0.001,
                          value: D,
                          onChange: Y,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Vertex Glow",
                          min: 0,
                          max: 0.6,
                          step: 0.002,
                          value: A,
                          onChange: z,
                        }),
                        (0, r.jsx)(i.W7, {
                          title: "Depth Color",
                          value: W,
                          onChange: H,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Depth Tint",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: O,
                          onChange: G,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Depth Fade",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: N,
                          onChange: X,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Brightness",
                          min: 0.1,
                          max: 4,
                          step: 0.05,
                          value: q,
                          onChange: B,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Opacity",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: Q,
                          onChange: V,
                        }),
                        (0, r.jsx)(i.tl, {
                          title: "Cursor Interaction",
                          checked: _,
                          onChange: $,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Cursor Tilt",
                          min: 0,
                          max: 1.2,
                          step: 0.01,
                          value: L,
                          onChange: U,
                        }),
                        (0, r.jsx)(i.tl, {
                          title: "Drag To Spin",
                          checked: Z,
                          onChange: J,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Spin Friction",
                          min: 0.8,
                          max: 0.995,
                          step: 0.001,
                          value: K,
                          onChange: ee,
                        }),
                        (0, r.jsx)(i.tl, {
                          title: "Adaptive Quality",
                          checked: et,
                          onChange: ea,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Target FPS",
                          min: 30,
                          max: 120,
                          step: 1,
                          value: er,
                          onChange: en,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "DPR",
                          min: 0.5,
                          max: 2,
                          step: 0.1,
                          value: el,
                          onChange: ei,
                        }),
                        (0, r.jsx)(i.tl, {
                          title: "Paused",
                          checked: eo,
                          onChange: eu,
                        }),
                      ],
                    }),
                    (0, r.jsx)(i.Ub, {
                      data: [
                        {
                          name: "shape",
                          type: '"tetrahedron" | "cube" | "octahedron" | "dodecahedron" | "icosahedron"',
                          default: '"icosahedron"',
                          description:
                            "Base polyhedron the wireframe is built from",
                        },
                        {
                          name: "detail",
                          type: "number",
                          default: "0",
                          description:
                            "Geodesic subdivision level (0-3). Each step splits every face into four, multiplying vertices and edges",
                        },
                        {
                          name: "stretch",
                          type: "number",
                          default: "1.28",
                          description:
                            "Elongation of the icosahedral vertex rings. 1.618 gives a perfectly regular icosahedron",
                        },
                        {
                          name: "zoom",
                          type: "number",
                          default: "1",
                          description: "Scale of the solid within the frame",
                        },
                        {
                          name: "speed",
                          type: "number",
                          default: "1",
                          description: "Rate of the tumbling motion",
                        },
                        {
                          name: "wobble",
                          type: "number",
                          default: "0",
                          description:
                            "Amount the solid breathes in and out as it turns",
                        },
                        {
                          name: "showEdges",
                          type: "boolean",
                          default: "true",
                          description:
                            "Render the glowing struts between vertices",
                        },
                        {
                          name: "edgeColor",
                          type: "string",
                          default: '"currentColor"',
                          description:
                            "Colour of the struts. Defaults to the inherited text colour, so it tracks the page theme automatically",
                        },
                        {
                          name: "edgeGlow",
                          type: "number",
                          default: "1",
                          description: "Brightness of the strut glow",
                        },
                        {
                          name: "edgeThickness",
                          type: "number",
                          default: "0.02",
                          description:
                            "Core radius of a strut. Larger values give a wider, softer line",
                        },
                        {
                          name: "showVertices",
                          type: "boolean",
                          default: "true",
                          description: "Render the bright dot at each vertex",
                        },
                        {
                          name: "vertexColor",
                          type: "string",
                          default: '"currentColor"',
                          description:
                            "Colour of the vertex dots. Defaults to the inherited text colour, so it tracks the page theme automatically",
                        },
                        {
                          name: "vertexSize",
                          type: "number",
                          default: "0.032",
                          description: "Radius of each vertex dot",
                        },
                        {
                          name: "vertexGlow",
                          type: "number",
                          default: "0.148",
                          description:
                            "Brightness of each vertex dot, scaled by how many struts meet there",
                        },
                        {
                          name: "depthColor",
                          type: "string",
                          default: '"#7aa2ff"',
                          description:
                            "Colour blended into the far side of the solid",
                        },
                        {
                          name: "depthTint",
                          type: "number",
                          default: "0",
                          description:
                            "How strongly depthColor is mixed into the receding side",
                        },
                        {
                          name: "depthFade",
                          type: "number",
                          default: "0",
                          description:
                            "How much the far side dims, adding a sense of volume",
                        },
                        {
                          name: "backgroundColor",
                          type: "string",
                          default: '"transparent"',
                          description:
                            "Backdrop behind the wireframe. Transparent by default so it layers over whatever sits underneath; the glow is additive, so dark backdrops read best",
                        },
                        {
                          name: "brightness",
                          type: "number",
                          default: "1",
                          description: "Overall output gain",
                        },
                        {
                          name: "opacity",
                          type: "number",
                          default: "1",
                          description: "Opacity of the whole wireframe",
                        },
                        {
                          name: "cursorInteraction",
                          type: "boolean",
                          default: "true",
                          description:
                            "Let the pointer tilt the solid as it hovers",
                        },
                        {
                          name: "cursorTilt",
                          type: "number",
                          default: "0.35",
                          description:
                            "Maximum tilt in radians applied by the pointer",
                        },
                        {
                          name: "dragToSpin",
                          type: "boolean",
                          default: "true",
                          description:
                            "Grab the solid and throw it, with momentum on release",
                        },
                        {
                          name: "spinFriction",
                          type: "number",
                          default: "0.94",
                          description:
                            "How quickly a thrown spin slows down. Lower stops sooner",
                        },
                        {
                          name: "adaptiveQuality",
                          type: "boolean",
                          default: "true",
                          description:
                            "Drop render resolution automatically if the frame rate falls short",
                        },
                        {
                          name: "targetFps",
                          type: "number",
                          default: "60",
                          description:
                            "Frame rate adaptive quality aims to hold",
                        },
                        {
                          name: "dpr",
                          type: "number",
                          default: "2",
                          description: "Upper bound on device pixel ratio",
                        },
                        {
                          name: "paused",
                          type: "boolean",
                          default: "false",
                          description: "Freeze the tumble",
                        },
                        {
                          name: "className",
                          type: "string",
                          default: '""',
                          description: "Classes applied to the container",
                        },
                        {
                          name: "style",
                          type: "React.CSSProperties",
                          default: "undefined",
                          description: "Inline styles applied to the container",
                        },
                        {
                          name: "children",
                          type: "React.ReactNode",
                          default: "undefined",
                          description: "Content layered above the wireframe",
                        },
                      ],
                    }),
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
