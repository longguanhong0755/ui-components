/* ReactBits Pro public preview module 96289 for lenticular-carousel.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/96289.92fa12ddf3e6cfb4.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  96289: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => j }));
    var r = a(95155),
      n = a(12115),
      i = a(56388),
      l = a(90761),
      s = a(81712),
      o = a(3907),
      u = a(30329),
      c = a(31823),
      d = a(2253),
      f = a(90650);
    let m = [
        {
          src: "https://images.unsplash.com/photo-1449157291145-7efd050a4d0e?q=80&w=800&auto=format&fit=crop",
          title: "Vanishing Point",
          meta: "Structure",
        },
        {
          src: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=800&auto=format&fit=crop",
          title: "Glass and Gravity",
          meta: "Facade",
        },
        {
          src: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?q=80&w=800&auto=format&fit=crop",
          title: "Cut From the Sky",
          meta: "Concrete",
        },
        {
          src: "https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?q=80&w=800&auto=format&fit=crop",
          title: "Stacked in White",
          meta: "Volume",
        },
        {
          src: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=800&auto=format&fit=crop",
          title: "The Long Curve",
          meta: "Motion",
        },
        {
          src: "https://images.unsplash.com/photo-1523217582562-09d0def993a6?q=80&w=800&auto=format&fit=crop",
          title: "Quiet Lines",
          meta: "Grid",
        },
        {
          src: "https://images.unsplash.com/photo-1470075801209-17f9ec0cada6?q=80&w=800&auto=format&fit=crop",
          title: "Cobalt Facade",
          meta: "Surface",
        },
        {
          src: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?q=80&w=800&auto=format&fit=crop",
          title: "Concrete Chorus",
          meta: "Repetition",
        },
      ],
      p = (e, t, a) => Math.min(a, Math.max(t, e)),
      h = (e, t, a) => (t < 1 ? 0 : a ? ((e % t) + t) % t : p(e, 0, t - 1)),
      v = (e, t) => {
        if (t < 2) return e;
        let a = t / 2;
        return ((((e + a) % t) + t) % t) - a;
      },
      g = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,
      x = `
precision highp float;

uniform sampler2D uRest;
uniform sampler2D uTurn;
uniform sampler2D uTag;
uniform vec2 uFitRest;
uniform vec2 uFitTurn;
uniform vec2 uSpan;
uniform float uFlip;
uniform float uRibs;
uniform float uRake;
uniform float uBend;
uniform float uRidge;
uniform float uFoil;
uniform float uFoilScale;
uniform float uVeil;
uniform float uTag0;
uniform float uTime;
uniform float uTurnAngle;
uniform float uEngage;
uniform float uDim;
uniform float uRadius;
uniform float uAlpha;

varying vec2 vUv;

vec3 spectrum(float t) {
  return 0.5 + 0.5 * cos(6.28318530718 * (t + vec3(0.0, 0.33, 0.67)));
}

vec2 frame(vec2 uv, vec2 fit, float slide) {
  return (uv - 0.5) * fit + 0.5 + vec2(slide, 0.0);
}

void main() {
  float lane = vUv.x * uRibs;
  float local = fract(lane);
  float span = fwidth(vUv.x) * uRibs;

  float front = uFlip * (1.0 + uRake) - uRake * (1.0 - vUv.x);
  float edge = clamp(front, 0.0, 1.0);
  float reach = max(span, 1e-4);
  float ramp = edge * (1.0 + reach) - reach * 0.5;
  float sel = clamp((ramp - local) / reach + 0.5, 0.0, 1.0);

  float rib = local * 2.0 - 1.0;
  float lensShift = rib * uBend * 0.006 * uEngage;
  float faceShift = (uFlip - 0.5) * uBend * 0.016 * uEngage;

  vec3 rest = texture2D(uRest, frame(vUv, uFitRest, lensShift + faceShift)).rgb;
  vec3 turn = texture2D(uTurn, frame(vUv, uFitTurn, -lensShift - faceShift)).rgb;

  float veil = (1.0 - smoothstep(0.0, 0.5, vUv.y)) * uVeil;
  turn = mix(turn, turn * 0.06, veil);

  float axis = vUv.x + vUv.y * 0.35;
  float travel = axis * 1.15 - uTurnAngle * 3.4;
  float band = pow(clamp(1.0 - abs(travel - 0.5) * 2.3, 0.0, 1.0), 1.7);
  float fine = axis * uFoilScale + uTime * 0.16;
  float shimmer = 0.5 + 0.5 * sin(fine * 6.28318530718);
  turn += spectrum(fine * 0.5 + travel * 0.5) * band * (0.4 + 0.6 * shimmer) * uFoil * 0.8;

  vec4 tag = texture2D(uTag, vUv);
  turn = mix(turn, tag.rgb, tag.a * uTag0);

  vec3 col = mix(rest, turn, sel);

  float crisp = clamp(1.0 - span * 2.5, 0.0, 1.0);
  float relief = uRidge * crisp * uEngage;
  vec3 nrm = normalize(vec3(rib * 0.85, 0.0, 1.0));
  vec3 lamp = normalize(vec3(0.32 + uTurnAngle * 1.6, 0.42, 1.0));
  float glint = pow(max(dot(nrm, lamp), 0.0), 18.0);
  col *= mix(1.0, 1.0 - 0.17 * rib * rib, relief);
  col += glint * relief * 0.11;

  col *= uDim;

  vec2 pos = (vUv - 0.5) * uSpan;
  vec2 ext = uSpan * 0.5;
  float rad = min(uRadius, min(ext.x, ext.y));
  vec2 corner = abs(pos) - (ext - rad);
  float dist =
    length(max(corner, 0.0)) + min(max(corner.x, corner.y), 0.0) - rad;
  float mask = clamp(0.5 - dist / max(fwidth(dist), 1e-4), 0.0, 1.0);

  vec3 lit = max(col, 0.0);
  vec3 curve = mix(
    lit * 12.92,
    1.055 * pow(lit, vec3(0.4166667)) - 0.055,
    step(vec3(0.0031308), lit)
  );

  gl_FragColor = vec4(clamp(curve, 0.0, 1.0), mask * uAlpha);
}
`,
      b = ({ distance: e }) => {
        let t = (0, s.C)((e) => e.get),
          a = (0, s.C)((e) => e.size.height),
          r = (0, s.C)((e) => e.invalidate);
        return (
          (0, n.useEffect)(() => {
            let n = t().camera,
              i = Math.max(120, e);
            ((n.fov = (2 * Math.atan(Math.max(1, a) / 2 / i) * 180) / Math.PI),
              n.position.set(0, 0, i),
              (n.near = 0.02 * i),
              (n.far = 6 * i),
              n.updateProjectionMatrix(),
              r());
          }, [t, a, e, r]),
          null
        );
      },
      y = ({
        items: e,
        sheets: t,
        labels: a,
        fallback: i,
        focused: l,
        pitch: o,
        cardW: u,
        cardH: c,
        ratio: f,
        radius: m,
        ribs: h,
        rake: b,
        bend: y,
        ridge: w,
        foil: S,
        foilScale: C,
        veil: j,
        tagOn: M,
        turnAngle: R,
        travel: k,
        lift: T,
        minScale: F,
        minDim: P,
        grip: E,
        hoverable: D,
        trigger: A,
        loop: I,
        dragging: N,
        drag: U,
        still: $,
      }) => {
        let L = (0, s.C)((e) => e.invalidate),
          B = (0, s.C)((e) => e.size.width),
          W = (0, n.useRef)([]),
          q = (0, n.useRef)([]),
          H = (0, n.useRef)(-1),
          O = (0, n.useRef)(0.5),
          G = (0, n.useRef)(l),
          V = (0, n.useRef)(0),
          X = (0, n.useRef)(l),
          _ = (0, n.useRef)(!1),
          z = (0, n.useRef)(0),
          Y = (0, n.useRef)(16),
          K = (0, n.useMemo)(() => new d.bdM(1, 1), []),
          J = (0, n.useMemo)(
            () =>
              e.map(
                () =>
                  new d.BKk({
                    vertexShader: g,
                    fragmentShader: x,
                    transparent: !0,
                    depthTest: !1,
                    depthWrite: !1,
                    side: d.$EB,
                    uniforms: {
                      uRest: { value: null },
                      uTurn: { value: null },
                      uTag: { value: null },
                      uFitRest: { value: new d.I9Y(1, 1) },
                      uFitTurn: { value: new d.I9Y(1, 1) },
                      uSpan: { value: new d.I9Y(1, 1) },
                      uFlip: { value: 0 },
                      uRibs: { value: 56 },
                      uRake: { value: 0.6 },
                      uBend: { value: 0.32 },
                      uRidge: { value: 0.5 },
                      uFoil: { value: 0.5 },
                      uFoilScale: { value: 8 },
                      uVeil: { value: 0.85 },
                      uTag0: { value: 1 },
                      uTime: { value: 0 },
                      uTurnAngle: { value: 0 },
                      uEngage: { value: 0 },
                      uDim: { value: 1 },
                      uRadius: { value: 14 },
                      uAlpha: { value: 0 },
                    },
                  }),
              ),
            [e],
          );
        ((0, n.useEffect)(
          () => () => {
            for (let e of J) e.dispose();
          },
          [J],
        ),
          (0, n.useEffect)(() => () => K.dispose(), [K]),
          (0, n.useEffect)(() => {
            ((Y.current = 16), L());
          }, [
            L,
            l,
            t,
            a,
            o,
            u,
            c,
            m,
            h,
            b,
            y,
            w,
            S,
            C,
            j,
            M,
            R,
            k,
            T,
            F,
            P,
            I,
            N,
            $,
          ]));
        let Q = (0, n.useCallback)(
          (e, t) => {
            ((H.current = e), e >= 0 && (O.current = t), (Y.current = 16), L());
          },
          [L],
        );
        return (
          (0, s.D)((r, n) => {
            let s = Math.min(n, 0.05);
            $ || (z.current += s);
            let d = e.length;
            q.current.length !== d &&
              (q.current = e.map(() => ({ flip: 0, turn: 0, hot: 0 })));
            let g = 1 - Math.pow(1 - E, 60 * s),
              x = Math.max(1, o);
            if (N) {
              ((Y.current = 4),
                _.current || ((_.current = !0), (X.current = G.current)));
              let e = X.current - U.current.dx / x;
              if (!I) {
                let t = d - 1;
                e < 0 ? (e *= 0.32) : e > t && (e = t + (e - t) * 0.32);
              }
              ((V.current = s > 0 ? p((e - G.current) / s, -40, 40) : 0),
                (G.current = e));
            } else {
              _.current = !1;
              let e = I ? G.current + v(l - G.current, d) : l,
                t = p(-60 * Math.log(1 - E) * 1.35, 3, 40),
                a = Math.exp(-t * s),
                r = G.current - e,
                n = V.current + t * r;
              ((G.current = e + (r + n * s) * a),
                (V.current = (n - t * (r + n * s)) * a),
                2e-4 > Math.abs(G.current - e) && 0.002 > Math.abs(V.current)
                  ? ((G.current = e), (V.current = 0))
                  : (Y.current = 16));
            }
            let K = Math.ceil(B / (2 * x)) + 1,
              J = N || !D ? -1 : H.current,
              Q = p(k, 0.05, 1),
              Z = p((O.current - (1 - Q) / 2) / Q, 0, 1),
              ee = "focus" === A || !D;
            for (let r = 0; r < d; r += 1) {
              let n = W.current[r];
              if (!n) continue;
              let l = r - G.current,
                s = I ? v(l, d) : l;
              if (Math.abs(s) > K) {
                n.visible = !1;
                continue;
              }
              n.visible = !0;
              let p = q.current[r],
                x = +(J === r),
                k = ee ? +(0.5 > Math.abs(s)) : J === r ? Z : 0,
                E = ee ? k * R : x * (2 * k - 1) * R;
              ((p.hot += (x - p.hot) * g),
                (p.flip += (k - p.flip) * g),
                (p.turn += (E - p.turn) * g),
                (Math.abs(x - p.hot) > 0.002 ||
                  Math.abs(k - p.flip) > 0.002 ||
                  Math.abs(E - p.turn) > 4e-4) &&
                  (Y.current = 16),
                p.hot > 0.02 && S > 0 && !$ && (Y.current = 16));
              let D = Math.min(1, Math.abs(s)),
                A = 1 - D * D * (3 - 2 * D),
                N = F + (1 - F) * A;
              (n.position.set(s * o, 0, p.hot * T),
                (n.rotation.y = p.turn),
                n.scale.set(u * N, c * N, 1),
                (n.renderOrder = p.hot > 0.01 ? 2 : 1));
              let U = e[r],
                L = t[U.src],
                B = t[U.flipSrc ?? U.src] ?? L,
                H = n.material.uniforms;
              if (
                ((H.uRest.value = L ? L.map : i),
                (H.uTurn.value = B ? B.map : i),
                (H.uTag.value = a[r] ?? i),
                L)
              ) {
                let e = L.ratio > f;
                H.uFitRest.value.set(e ? f / L.ratio : 1, e ? 1 : L.ratio / f);
              }
              if (B) {
                let e = B.ratio > f;
                H.uFitTurn.value.set(e ? f / B.ratio : 1, e ? 1 : B.ratio / f);
              }
              (H.uSpan.value.set(u, c),
                (H.uFlip.value = p.flip),
                (H.uRibs.value = h),
                (H.uRake.value = b),
                (H.uBend.value = y),
                (H.uRidge.value = w),
                (H.uFoil.value = S),
                (H.uFoilScale.value = C),
                (H.uVeil.value = j),
                (H.uTag0.value = M),
                (H.uTime.value = z.current),
                (H.uTurnAngle.value = p.turn),
                (H.uEngage.value = p.hot),
                (H.uDim.value = P + (1 - P) * A),
                (H.uRadius.value = m),
                (H.uAlpha.value = +!!L));
            }
            Y.current > 0 && ((Y.current -= 1), L());
          }),
          (0, r.jsx)("group", {
            children: e.map((e, t) =>
              (0, r.jsx)(
                "mesh",
                {
                  ref: (e) => {
                    W.current[t] = e;
                  },
                  geometry: K,
                  material: J[t],
                  frustumCulled: !1,
                  onPointerOver: (e) => {
                    (e.stopPropagation(), Q(t, e.uv ? e.uv.x : 0.5));
                  },
                  onPointerMove: (e) => {
                    (e.stopPropagation(), Q(t, e.uv ? e.uv.x : 0.5));
                  },
                  onPointerOut: () => Q(-1, 0.5),
                },
                `${e.src}-${t}`,
              ),
            ),
          })
        );
      },
      w = ({ items: e, current: t, token: a, onPick: n }) =>
        (0, r.jsx)("div", {
          className: "flex w-44 items-center gap-1.5 sm:w-56",
          children: e.map((e, i) =>
            (0, r.jsx)(
              "button",
              {
                type: "button",
                onClick: () => n(i),
                "aria-label": `Show ${e.title ?? `slide ${i + 1}`}`,
                "aria-current": i === t,
                className:
                  "relative h-0.5 flex-1 cursor-pointer overflow-hidden rounded-full bg-current/20 transition-colors duration-200 before:absolute before:inset-x-0 before:-inset-y-2.5 before:content-[''] hover:bg-current/45",
                children: (0, r.jsx)("span", {
                  "aria-hidden": !0,
                  className:
                    "absolute inset-0 origin-left rounded-full bg-current transition-transform duration-500 ease-out",
                  style: { transform: `scaleX(${+(i === t)})` },
                }),
              },
              `${a}-${i}`,
            ),
          ),
        }),
      S = ({ side: e, disabled: t, onPress: a }) => {
        let n = "prev" === e ? u.A : c.A;
        return (0, r.jsx)("button", {
          type: "button",
          onClick: a,
          disabled: t,
          "aria-label": "prev" === e ? "Previous slide" : "Next slide",
          className:
            "cursor-pointer p-1 opacity-40 transition-opacity duration-200 hover:opacity-100 disabled:pointer-events-none disabled:opacity-15",
          children: (0, r.jsx)(n, { size: 16, strokeWidth: 2.25 }),
        });
      },
      C = ({
        items: e = m,
        initialIndex: t = 2,
        cardWidth: a = 260,
        aspectRatio: i = "3 / 4",
        gap: l = 26,
        borderRadius: s = 14,
        strips: u = 56,
        sweep: c = 0.6,
        refraction: v = 0.32,
        ridge: g = 0.5,
        foil: x = 0.5,
        foilScale: C = 8,
        scrim: j = 0.85,
        tilt: M = 14,
        travel: R = 0.64,
        lift: k = 40,
        perspective: T = 1200,
        inactiveScale: F = 0.9,
        inactiveDim: P = 0.55,
        speed: E = 1,
        trigger: D = "hover",
        showLabels: A = !0,
        labelColor: I = "#ffffff",
        showControls: N = !0,
        showDots: U = !0,
        loop: $ = !1,
        autoplay: L = !1,
        autoplayDelay: B = 3200,
        enableDrag: W = !0,
        enableKeyboard: q = !0,
        dpr: H = 2,
        paused: O = !1,
        className: G,
        onIndexChange: V,
      }) => {
        let X,
          _ = e.length,
          z = (0, n.useId)(),
          Y = (0, n.useRef)(null),
          K = (0, n.useRef)({
            id: -1,
            from: 0,
            dx: 0,
            last: 0,
            vel: 0,
            at: 0,
            live: !1,
          }),
          J = (0, n.useRef)(V),
          [Q, Z] = (0, n.useState)(() => h(t, _, !1)),
          [ee, et] = (0, n.useState)(!1),
          [ea, er] = (0, n.useState)(!0),
          [en, ei] = (0, n.useState)(!1),
          el = (0, n.useMemo)(
            () =>
              ((e) => {
                let t = e.split("/");
                if (2 === t.length) {
                  let e = Number(t[0]),
                    a = Number(t[1]);
                  if (e > 0 && a > 0) return e / a;
                }
                let a = Number(e);
                return a > 0 ? a : 0.75;
              })(i),
            [i],
          ),
          es = Math.max(60, a),
          eo = es / el,
          eu = es + Math.max(0, l),
          ec = ((e) => {
            let [t, a] = (0, n.useState)({}),
              r = (0, n.useRef)({}),
              i = e.join("|");
            return (
              (0, n.useEffect)(() => {
                let e = i ? i.split("|") : [],
                  t = new d.Tap();
                t.setCrossOrigin("anonymous");
                let n = !0;
                for (let i of e)
                  r.current[i] ||
                    t.load(i, (e) => {
                      ((e.colorSpace = d.er$),
                        (e.anisotropy = 8),
                        (e.generateMipmaps = !0),
                        (e.minFilter = d.$_I),
                        (e.magFilter = d.k6q),
                        (e.needsUpdate = !0));
                      let t = e.image;
                      n
                        ? ((r.current[i] = {
                            map: e,
                            ratio: t.width / Math.max(1, t.height),
                          }),
                          a({ ...r.current }))
                        : e.dispose();
                    });
                return () => {
                  n = !1;
                };
              }, [i]),
              (0, n.useEffect)(() => {
                let e = r.current;
                return () => {
                  for (let t of Object.keys(e)) e[t].map.dispose();
                };
              }, []),
              t
            );
          })(
            (0, n.useMemo)(() => {
              let t = new Set();
              for (let a of e) (t.add(a.src), a.flipSrc && t.add(a.flipSrc));
              return Array.from(t);
            }, [e]),
          ),
          ed =
            ((X = JSON.stringify(e.map((e) => [e.title ?? "", e.meta ?? ""]))),
            (0, n.useMemo)(
              () =>
                "undefined" == typeof document
                  ? []
                  : JSON.parse(X).map(([e, t]) => {
                      let a = new d.GOR(
                        ((e, t, a, r) => {
                          let n = Math.max(96, Math.round(512 / a)),
                            i = document.createElement("canvas");
                          ((i.width = 512), (i.height = n));
                          let l = i.getContext("2d");
                          if (!l || !e) return i;
                          let s = Math.round(45.056),
                            o = Math.round(40.448),
                            u =
                              "ui-sans-serif, system-ui, -apple-system, Helvetica, Arial";
                          ((l.textBaseline = "alphabetic"),
                            (l.fillStyle = r),
                            (l.font = `500 ${o}px ${u}`));
                          let c = ((e, t, a, r) => {
                              let n = t.split(/\s+/).filter(Boolean),
                                i = [],
                                l = "";
                              for (let t of n) {
                                let r = l ? `${l} ${t}` : t;
                                if (e.measureText(r).width <= a || !l) {
                                  l = r;
                                  continue;
                                }
                                if ((i.push(l), (l = t), 2 === i.length)) break;
                              }
                              if (
                                (i.length < 2 && l && i.push(l),
                                2 === i.length && l && i[1] !== l)
                              ) {
                                let t = i[1];
                                for (
                                  ;
                                  t.length > 1 &&
                                  e.measureText(`${t}…`).width > a;
                                )
                                  t = t.slice(0, -1);
                                i[1] = `${t}…`;
                              }
                              return i;
                            })(l, e, 512 - 2 * s, 0),
                            d = n - s;
                          for (let e = c.length - 1; e >= 0; e -= 1)
                            (l.fillText(c[e], s, d), (d -= 1.2 * o));
                          return (
                            t &&
                              ("string" == typeof l.letterSpacing &&
                                (l.letterSpacing = "0.18em"),
                              (l.globalAlpha = 0.66),
                              (l.font = `500 ${Math.round(0.52 * o)}px ${u}`),
                              l.fillText(t.toUpperCase(), s, d - 0.24 * o)),
                            i
                          );
                        })(e, t, el, I),
                      );
                      return (
                        (a.colorSpace = d.er$),
                        (a.anisotropy = 4),
                        (a.minFilter = d.$_I),
                        (a.magFilter = d.k6q),
                        (a.needsUpdate = !0),
                        a
                      );
                    }),
              [X, el, I],
            )),
          ef = (0, n.useMemo)(() => {
            let e;
            return (
              ((e = new d.GYF(
                new Uint8Array([0, 0, 0, 0]),
                1,
                1,
                d.GWd,
              )).needsUpdate = !0),
              e
            );
          }, []);
        ((0, n.useEffect)(() => () => ef.dispose(), [ef]),
          (0, n.useEffect)(
            () => () => {
              for (let e of ed) e.dispose();
            },
            [ed],
          ),
          (0, n.useEffect)(() => {
            J.current = V;
          }, [V]),
          (0, n.useEffect)(() => {
            J.current?.(Q);
          }, [Q]),
          (0, n.useEffect)(() => {
            if (!window.matchMedia) return;
            let e = window.matchMedia("(hover: hover) and (pointer: fine)"),
              t = window.matchMedia("(prefers-reduced-motion: reduce)"),
              a = () => {
                (er(e.matches), ei(t.matches));
              };
            return (
              a(),
              e.addEventListener("change", a),
              t.addEventListener("change", a),
              () => {
                (e.removeEventListener("change", a),
                  t.removeEventListener("change", a));
              }
            );
          }, []));
        let em = (0, n.useCallback)((e) => Z(h(e, _, $)), [_, $]),
          ep = (0, n.useCallback)((e) => Z((t) => h(t + e, _, $)), [_, $]);
        (0, n.useEffect)(() => {
          if (!L || _ <= 1 || ee) return;
          let e = window.setInterval(
            () => Z((e) => (e + 1 >= _ && !$ ? e : h(e + 1, _, $))),
            Math.max(B, 600),
          );
          return () => window.clearInterval(e);
        }, [L, B, _, $, ee]);
        let eh = (e) => {
            let t = K.current;
            if (
              t.id !== e.pointerId ||
              (Y.current?.releasePointerCapture(e.pointerId),
              (t.id = -1),
              !t.live)
            )
              return;
            let a = e.timeStamp - t.at,
              r = a > 90 ? 0 : t.vel * (1 - a / 90),
              n = Math.max(1, eu),
              i = -t.dx / n + p(-(140 * r) / n, -2.5, 2.5),
              l = Math.round(i);
            (0 === l && Math.abs(i) > 0.18 && (l = i < 0 ? -1 : 1),
              et(!1),
              l && ep(l));
          },
          ev = !$ && Q <= 0,
          eg = !$ && Q >= _ - 1;
        return (0, r.jsxs)("div", {
          tabIndex: 0,
          role: "group",
          "aria-roledescription": "carousel",
          "aria-label": "Lenticular carousel",
          onKeyDown: (e) => {
            if (!q) return;
            let t = "ArrowLeft" === e.key ? -1 : +("ArrowRight" === e.key);
            t && (e.preventDefault(), ep(t));
          },
          className: (0, f.cn)(
            "relative flex w-full select-none flex-col items-center text-neutral-900 outline-none dark:text-neutral-100",
            G,
          ),
          children: [
            (0, r.jsx)("div", {
              ref: Y,
              onPointerDown: (e) => {
                if (!W || _ < 2 || 0 !== e.button) return;
                let t = Y.current;
                t &&
                  (t.setPointerCapture(e.pointerId),
                  (K.current = {
                    id: e.pointerId,
                    from: e.clientX,
                    dx: 0,
                    last: e.clientX,
                    vel: 0,
                    at: e.timeStamp,
                    live: !1,
                  }));
              },
              onPointerMove: (e) => {
                let t = K.current;
                if (t.id !== e.pointerId) return;
                let a = Math.max(4, e.timeStamp - t.at);
                ((t.vel = 0.6 * t.vel + ((e.clientX - t.last) / a) * 0.4),
                  (t.last = e.clientX),
                  (t.at = e.timeStamp),
                  (t.dx = e.clientX - t.from),
                  !t.live && Math.abs(t.dx) > 4 && ((t.live = !0), et(!0)));
              },
              onPointerUp: eh,
              onPointerCancel: eh,
              onLostPointerCapture: eh,
              className: (0, f.cn)(
                "relative min-h-0 w-full flex-1 touch-pan-y",
                W && _ > 1 && "cursor-grab active:cursor-grabbing",
              ),
              children: (0, r.jsxs)(o.Hl, {
                camera: { position: [0, 0, T], fov: 30 },
                dpr: [1, p(H, 1, 3)],
                gl: {
                  antialias: !1,
                  alpha: !0,
                  depth: !1,
                  stencil: !1,
                  powerPreference: "high-performance",
                },
                frameloop: "demand",
                children: [
                  (0, r.jsx)(b, { distance: T }),
                  (0, r.jsx)(y, {
                    items: e,
                    sheets: ec,
                    labels: ed,
                    fallback: ef,
                    focused: Q,
                    pitch: eu,
                    cardW: es,
                    cardH: eo,
                    ratio: el,
                    radius: Math.max(0, s),
                    ribs: Math.max(1, Math.round(u)),
                    rake: p(c, 0, 3),
                    bend: Math.max(0, v),
                    ridge: p(g, 0, 2),
                    foil: Math.max(0, x),
                    foilScale: Math.max(0.2, C),
                    veil: p(j, 0, 1),
                    tagOn: +!!A,
                    turnAngle: (p(M, -80, 80) * Math.PI) / 180,
                    travel: R,
                    lift: k,
                    minScale: p(F, 0.2, 1),
                    minDim: p(P, 0, 1),
                    grip: p(0.12 * p(E, 0.1, 4), 0.01, 0.6),
                    hoverable: ea,
                    trigger: D,
                    loop: $,
                    dragging: ee,
                    drag: K,
                    still: O || en,
                  }),
                ],
              }),
            }),
            (N || U) &&
              _ > 1 &&
              (0, r.jsxs)("div", {
                className: "mt-6 flex shrink-0 items-center gap-4",
                children: [
                  N &&
                    (0, r.jsx)(S, {
                      side: "prev",
                      disabled: ev,
                      onPress: () => ep(-1),
                    }),
                  U &&
                    (0, r.jsx)(w, {
                      items: e,
                      current: Q,
                      token: z,
                      onPick: em,
                    }),
                  N &&
                    (0, r.jsx)(S, {
                      side: "next",
                      disabled: eg,
                      onPress: () => ep(1),
                    }),
                ],
              }),
          ],
        });
      },
      j = () => {
        let [e, t] = (0, l.I)(),
          [a, s] = (0, n.useState)(260),
          [o, u] = (0, n.useState)(26),
          [c, d] = (0, n.useState)(14),
          [f, m] = (0, n.useState)(56),
          [p, h] = (0, n.useState)(0.6),
          [v, g] = (0, n.useState)(0.32),
          [x, b] = (0, n.useState)(0.5),
          [y, w] = (0, n.useState)(0.5),
          [S, j] = (0, n.useState)(8),
          [M, R] = (0, n.useState)(0.85),
          [k, T] = (0, n.useState)(14),
          [F, P] = (0, n.useState)(0.64),
          [E, D] = (0, n.useState)(40),
          [A, I] = (0, n.useState)(1200),
          [N, U] = (0, n.useState)(0.9),
          [$, L] = (0, n.useState)(0.55),
          [B, W] = (0, n.useState)(1),
          [q, H] = (0, n.useState)("hover"),
          [O, G] = (0, n.useState)("#ffffff"),
          [V, X] = (0, n.useState)(!0),
          [_, z] = (0, n.useState)(!0),
          [Y, K] = (0, n.useState)(!0),
          [J, Q] = (0, n.useState)(!1),
          [Z, ee] = (0, n.useState)(!1),
          [et, ea] = (0, n.useState)(!0),
          [er, en] = (0, n.useState)(!1);
        return (0, r.jsxs)("div", {
          children: [
            (0, r.jsx)(i.Bg, {}),
            (0, r.jsxs)(i.VX, {
              children: [
                (0, r.jsxs)(i.Ec, {
                  children: [
                    (0, r.jsx)(i.Ch, {
                      onRefresh: t,
                      minHeight: 600,
                      children: (0, r.jsx)("div", {
                        className:
                          "relative flex h-full w-full items-center justify-center p-6",
                        children: (0, r.jsx)(
                          C,
                          {
                            cardWidth: a,
                            gap: o,
                            borderRadius: c,
                            strips: f,
                            sweep: p,
                            refraction: v,
                            ridge: x,
                            foil: y,
                            foilScale: S,
                            scrim: M,
                            tilt: k,
                            travel: F,
                            lift: E,
                            perspective: A,
                            inactiveScale: N,
                            inactiveDim: $,
                            speed: B,
                            trigger: "focus" === q ? "focus" : "hover",
                            labelColor: O,
                            showLabels: V,
                            showControls: _,
                            showDots: Y,
                            loop: J,
                            autoplay: Z,
                            enableDrag: et,
                            paused: er,
                            className: "h-full max-h-[520px] w-full",
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, r.jsxs)(i.IH, {
                      children: [
                        (0, r.jsx)(i.yt, {
                          title: "Card Width",
                          min: 140,
                          max: 360,
                          step: 10,
                          value: a,
                          onChange: s,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Gap",
                          min: 0,
                          max: 90,
                          step: 2,
                          value: o,
                          onChange: u,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Border Radius",
                          min: 0,
                          max: 48,
                          step: 1,
                          value: c,
                          onChange: d,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Strips",
                          min: 6,
                          max: 120,
                          step: 1,
                          value: f,
                          onChange: m,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Sweep",
                          min: 0,
                          max: 2,
                          step: 0.05,
                          value: p,
                          onChange: h,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Refraction",
                          min: 0,
                          max: 1.5,
                          step: 0.02,
                          value: v,
                          onChange: g,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Ridge",
                          min: 0,
                          max: 1.5,
                          step: 0.05,
                          value: x,
                          onChange: b,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Foil",
                          min: 0,
                          max: 1.5,
                          step: 0.05,
                          value: y,
                          onChange: w,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Foil Scale",
                          min: 1,
                          max: 30,
                          step: 0.5,
                          value: S,
                          onChange: j,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Scrim",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: M,
                          onChange: R,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Tilt",
                          min: 0,
                          max: 45,
                          step: 1,
                          value: k,
                          onChange: T,
                          valueUnit: "\xb0",
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Travel",
                          min: 0.1,
                          max: 1,
                          step: 0.02,
                          value: F,
                          onChange: P,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Lift",
                          min: 0,
                          max: 160,
                          step: 5,
                          value: E,
                          onChange: D,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Perspective",
                          min: 500,
                          max: 3e3,
                          step: 50,
                          value: A,
                          onChange: I,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Inactive Scale",
                          min: 0.5,
                          max: 1,
                          step: 0.01,
                          value: N,
                          onChange: U,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Inactive Dim",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: $,
                          onChange: L,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Speed",
                          min: 0.2,
                          max: 3,
                          step: 0.1,
                          value: B,
                          onChange: W,
                        }),
                        (0, r.jsx)(i.bg, {
                          title: "Trigger",
                          value: q,
                          onChange: H,
                          options: [
                            { value: "hover", label: "Hover" },
                            { value: "focus", label: "Focus" },
                          ],
                        }),
                        (0, r.jsx)(i.W7, {
                          title: "Label Color",
                          value: O,
                          onChange: G,
                        }),
                        (0, r.jsx)(i.tl, {
                          title: "Show Labels",
                          checked: V,
                          onChange: X,
                        }),
                        (0, r.jsx)(i.tl, {
                          title: "Show Controls",
                          checked: _,
                          onChange: z,
                        }),
                        (0, r.jsx)(i.tl, {
                          title: "Show Dots",
                          checked: Y,
                          onChange: K,
                        }),
                        (0, r.jsx)(i.tl, {
                          title: "Loop",
                          checked: J,
                          onChange: Q,
                        }),
                        (0, r.jsx)(i.tl, {
                          title: "Autoplay",
                          checked: Z,
                          onChange: ee,
                        }),
                        (0, r.jsx)(i.tl, {
                          title: "Enable Drag",
                          checked: et,
                          onChange: ea,
                        }),
                        (0, r.jsx)(i.tl, {
                          title: "Paused",
                          checked: er,
                          onChange: en,
                        }),
                      ],
                    }),
                    (0, r.jsx)(i.Ub, {
                      data: [
                        {
                          name: "items",
                          type: "LenticularCarouselItem[]",
                          default: "8 sample slides",
                          description: "Slides rendered by the carousel",
                        },
                        {
                          name: "initialIndex",
                          type: "number",
                          default: "2",
                          description: "Slide focused on mount",
                        },
                        {
                          name: "cardWidth",
                          type: "number",
                          default: "260",
                          description: "Slide width in pixels",
                        },
                        {
                          name: "aspectRatio",
                          type: "string",
                          default: '"3 / 4"',
                          description: "Aspect ratio of each slide",
                        },
                        {
                          name: "gap",
                          type: "number",
                          default: "26",
                          description: "Space between slides in pixels",
                        },
                        {
                          name: "borderRadius",
                          type: "number",
                          default: "14",
                          description: "Corner radius of the slides in pixels",
                        },
                        {
                          name: "strips",
                          type: "number",
                          default: "56",
                          description:
                            "Number of lens ribs printed across a slide",
                        },
                        {
                          name: "sweep",
                          type: "number",
                          default: "0.6",
                          description:
                            "How far the turn lags across the slide, raking the wipe",
                        },
                        {
                          name: "refraction",
                          type: "number",
                          default: "0.32",
                          description:
                            "Parallax the two faces pick up as the lens turns",
                        },
                        {
                          name: "ridge",
                          type: "number",
                          default: "0.5",
                          description:
                            "Shading and glint strength of the lens ribs",
                        },
                        {
                          name: "foil",
                          type: "number",
                          default: "0.5",
                          description:
                            "Strength of the holographic foil on the revealed face",
                        },
                        {
                          name: "foilScale",
                          type: "number",
                          default: "8",
                          description:
                            "Number of foil shimmer bands across a slide",
                        },
                        {
                          name: "scrim",
                          type: "number",
                          default: "0.85",
                          description: "Darkening under the label from 0 to 1",
                        },
                        {
                          name: "tilt",
                          type: "number",
                          default: "14",
                          description: "Degrees the slide turns while flipped",
                        },
                        {
                          name: "travel",
                          type: "number",
                          default: "0.64",
                          description:
                            "Fraction of the slide width the cursor sweeps to turn the lens fully",
                        },
                        {
                          name: "lift",
                          type: "number",
                          default: "40",
                          description:
                            "Distance in pixels the slide travels toward the viewer while flipped",
                        },
                        {
                          name: "perspective",
                          type: "number",
                          default: "1200",
                          description: "Camera distance in pixels",
                        },
                        {
                          name: "inactiveScale",
                          type: "number",
                          default: "0.9",
                          description:
                            "Scale applied to slides away from the focus",
                        },
                        {
                          name: "inactiveDim",
                          type: "number",
                          default: "0.55",
                          description:
                            "Brightness of slides away from the focus from 0 to 1",
                        },
                        {
                          name: "speed",
                          type: "number",
                          default: "1",
                          description: "Multiplier for every transition",
                        },
                        {
                          name: "trigger",
                          type: '"hover" | "focus"',
                          default: '"hover"',
                          description:
                            "What turns a slide over. Falls back to focus on touch devices",
                        },
                        {
                          name: "showLabels",
                          type: "boolean",
                          default: "true",
                          description: "Print the label on the revealed face",
                        },
                        {
                          name: "labelColor",
                          type: "string",
                          default: '"#ffffff"',
                          description: "Label colour in hex",
                        },
                        {
                          name: "showControls",
                          type: "boolean",
                          default: "true",
                          description: "Show the previous and next buttons",
                        },
                        {
                          name: "showDots",
                          type: "boolean",
                          default: "true",
                          description: "Show the segmented progress rail",
                        },
                        {
                          name: "loop",
                          type: "boolean",
                          default: "false",
                          description: "Wrap around at either end",
                        },
                        {
                          name: "autoplay",
                          type: "boolean",
                          default: "false",
                          description: "Advance on a timer",
                        },
                        {
                          name: "autoplayDelay",
                          type: "number",
                          default: "3200",
                          description:
                            "Delay between automatic advances in milliseconds",
                        },
                        {
                          name: "enableDrag",
                          type: "boolean",
                          default: "true",
                          description:
                            "Allow dragging across the strip to navigate",
                        },
                        {
                          name: "enableKeyboard",
                          type: "boolean",
                          default: "true",
                          description:
                            "Allow arrow keys to navigate when focused",
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
                          description: "Hold the foil still",
                        },
                        {
                          name: "className",
                          type: "string",
                          default: "-",
                          description: "Additional CSS classes",
                        },
                        {
                          name: "onIndexChange",
                          type: "(index: number) => void",
                          default: "-",
                          description:
                            "Fired whenever the focused slide changes",
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
