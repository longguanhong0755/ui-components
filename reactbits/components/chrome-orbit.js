/* ReactBits Pro public preview module 4132 for chrome-orbit.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/4132.b5a9ae4de37872f8.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  4132: (e, t, n) => {
    (n.r(t), n.d(t, { default: () => k }));
    var i = n(95155),
      a = n(12115),
      r = n(56388),
      s = n(86049),
      o = n(90761),
      l = n(2253),
      d = n(12246),
      c = n(90650);
    let u = 2 * Math.PI,
      h = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      p = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      g = (e, t, n) => Math.min(n, Math.max(t, e)),
      m = (e, t) => {
        let n = new l.Q1f();
        try {
          return (n.setStyle(e), n);
        } catch {
          return n.setStyle(t);
        }
      },
      f = (e, t, n, i) => {
        let a = 0.42 * Math.min(t, n),
          r = n / 2,
          s = t / 2,
          o = [];
        [
          [r - a, s - a, 0],
          [-r + a, s - a, Math.PI / 2],
          [-r + a, -s + a, Math.PI],
          [r - a, -s + a, (3 * Math.PI) / 2],
        ].forEach(([e, t, n]) => {
          for (let i = 0; i <= 5; i++) {
            let r = n + (i / 5) * (Math.PI / 2);
            o.push({
              u: e + Math.cos(r) * a,
              v: t + Math.sin(r) * a,
              nu: Math.cos(r),
              nv: Math.sin(r),
            });
          }
        });
        let d = o.length,
          c = new Float32Array((i + 1) * d * 3),
          h = new Float32Array((i + 1) * d * 3);
        for (let t = 0; t <= i; t++) {
          let n = (t / i) * u,
            a = Math.cos(n),
            r = Math.sin(n);
          o.forEach((n, i) => {
            let s = (t * d + i) * 3,
              o = e + n.u;
            ((c[s] = a * o),
              (c[s + 1] = r * o),
              (c[s + 2] = n.v),
              (h[s] = a * n.nu),
              (h[s + 1] = r * n.nu),
              (h[s + 2] = n.nv));
          });
        }
        let p = [];
        for (let e = 0; e < i; e++)
          for (let t = 0; t < d; t++) {
            let n = e * d + t,
              i = e * d + ((t + 1) % d),
              a = (e + 1) * d + t,
              r = (e + 1) * d + ((t + 1) % d);
            p.push(n, a, i, i, a, r);
          }
        let g = new l.LoY();
        return (
          g.setAttribute("position", new l.THS(c, 3)),
          g.setAttribute("normal", new l.THS(h, 3)),
          g.setIndex(p),
          g
        );
      },
      v = (0, a.forwardRef)(function (
        {
          colors: e = ["#7B5CFF", "#FF7AD9"],
          studio: t = "dark",
          rings: n = 4,
          size: r = 0.8,
          spacing: s = 0.09,
          bandWidth: o = 0.085,
          bandThickness: v = 0.018,
          roughness: y = 0.16,
          iridescence: b = 0.25,
          speed: x = 1,
          tilt: w = 18,
          lightDrift: C = 1,
          offsetX: k = 0,
          offsetY: M = 0,
          interactive: S = !0,
          parallax: j = 1,
          clickAlign: A = !0,
          alignHold: E = 2.5,
          haloTilt: T = 62,
          intro: F = !0,
          paused: P = !1,
          quality: I = 1,
          className: L,
          style: R,
          children: B,
        },
        H,
      ) {
        let W = (0, a.useRef)(null),
          Y = (0, a.useRef)(null),
          D = (0, a.useSyncExternalStore)(h, p, () => !1),
          N = (0, a.useRef)({
            colors: e,
            studio: t,
            rings: n,
            size: r,
            spacing: s,
            bandWidth: o,
            bandThickness: v,
            roughness: y,
            iridescence: b,
            speed: x,
            tilt: w,
            lightDrift: C,
            offsetX: k,
            offsetY: M,
            interactive: S,
            parallax: j,
            clickAlign: A,
            alignHold: E,
            haloTilt: T,
            intro: F,
            paused: P,
            quality: I,
            reduced: D,
          });
        return (
          (0, a.useEffect)(() => {
            ((N.current = {
              colors: e,
              studio: t,
              rings: n,
              size: r,
              spacing: s,
              bandWidth: o,
              bandThickness: v,
              roughness: y,
              iridescence: b,
              speed: x,
              tilt: w,
              lightDrift: C,
              offsetX: k,
              offsetY: M,
              interactive: S,
              parallax: j,
              clickAlign: A,
              alignHold: E,
              haloTilt: T,
              intro: F,
              paused: P,
              quality: I,
              reduced: D,
            }),
              Y.current?.sync());
          }),
          (0, a.useEffect)(() => {
            let e = W.current;
            if (!e) return;
            let t = ((e, t) => {
              let n,
                i = document.createElement("canvas");
              (i.setAttribute("aria-hidden", "true"),
                (i.style.position = "absolute"),
                (i.style.inset = "0"),
                (i.style.width = "100%"),
                (i.style.height = "100%"),
                (i.style.display = "block"),
                (i.style.pointerEvents = "none"),
                e.prepend(i));
              try {
                n = new d.WebGLRenderer({
                  canvas: i,
                  alpha: !0,
                  premultipliedAlpha: !0,
                  antialias: !0,
                });
              } catch {
                return (i.remove(), null);
              }
              (n.setClearColor(0, 0),
                (n.outputColorSpace = l.er$),
                (n.toneMapping = l.FV),
                (n.toneMappingExposure = 1));
              let a = new l.Z58(),
                r = new l.ubm(30, 1, 0.1, 100),
                s = new l.YJl();
              a.add(s);
              let o = null,
                c = "",
                h = [],
                p = "",
                v = new l.uSd({
                  color: 0xffffff,
                  metalness: 1,
                  roughness: 0.1,
                  iridescence: 0.25,
                  iridescenceIOR: 1.35,
                  iridescenceThicknessRange: [180, 520],
                  envMapIntensity: 1,
                  side: l.$EB,
                }),
                y = { value: 1, velocity: 0, target: 1, releaseAt: -1 },
                b = { x: 0, y: 0, vx: 0, vy: 0 },
                x = {
                  x: 0,
                  y: 0,
                  inside: !1,
                  id: -1,
                  downX: 0,
                  downY: 0,
                  downT: 0,
                },
                w = 0,
                C = 0,
                k = -1,
                M = 1,
                S = !1,
                j = 1,
                A = 1,
                E = 0,
                T = 0,
                F = !0,
                P = !1,
                I = !1,
                L = 0,
                R = () => {
                  let e = t.current;
                  return !e.reduced && !e.paused;
                },
                B = () => {
                  if (I) {
                    let e, x, S, E, T, F, P, I, L, R, B, H, W, Y, D, N, X;
                    ((x = [
                      (e = t.current).studio,
                      e.colors[0],
                      e.colors[1],
                    ].join("|")) !== c &&
                      ((c = x),
                      o?.dispose(),
                      (a.environment = (o = ((e, t) => {
                        let n = "light" === t.studio,
                          i = new l.Z58(),
                          a = [],
                          r = new l.Gu$(14, 48, 24),
                          s = new Float32Array(3 * r.attributes.position.count),
                          o = n
                            ? new l.Q1f(0.9, 0.89, 0.94)
                            : new l.Q1f(0.075, 0.07, 0.095),
                          c = n
                            ? new l.Q1f(0.3, 0.29, 0.36)
                            : new l.Q1f(0.018, 0.016, 0.024),
                          u = n
                            ? new l.Q1f(0.06, 0.055, 0.08)
                            : new l.Q1f(0.004, 0.004, 0.006),
                          h = new l.Q1f();
                        for (let e = 0; e < r.attributes.position.count; e++) {
                          let t = r.attributes.position.getY(e) / 14;
                          (t > 0
                            ? h.copy(c).lerp(o, Math.pow(t, 0.7))
                            : h.copy(c).lerp(u, Math.pow(-t, 0.6)),
                            (s[3 * e] = h.r),
                            (s[3 * e + 1] = h.g),
                            (s[3 * e + 2] = h.b));
                        }
                        r.setAttribute("color", new l.THS(s, 3));
                        let p = new l.V9B({ vertexColors: !0, side: l.hsX });
                        (a.push(r, p), i.add(new l.eaF(r, p)));
                        let g = new l.Pq0(),
                          f = (e, t, n, r, s, o, d) => {
                            let c = new l.bdM(n, r),
                              u = new l.V9B({
                                color: e.clone().multiplyScalar(t),
                                side: l.$EB,
                              });
                            a.push(c, u);
                            let h = new l.eaF(c, u);
                            (h.position.set(s, o, d), h.lookAt(g), i.add(h));
                          },
                          v = new l.Q1f(1, 1, 1),
                          y = m(t.colors[0], "#7B5CFF"),
                          b = m(t.colors[1], "#FF7AD9");
                        (f(v, n ? 2.6 : 6, 13, 5, -3, 8.5, 2),
                          f(v, n ? 2.2 : 4.5, 2.6, 18, 9.5, 0.5, -1),
                          f(v, n ? 1.6 : 3.2, 20, 1.6, 0, 3, 10.5),
                          f(v, n ? 1.2 : 2.2, 1.4, 14, -11, -1, 4),
                          f(v, n ? 0.8 : 1.2, 14, 2.4, 1, -10, -2),
                          f(y, n ? 1.4 : 2.4, 6, 8, -10, -2, -4),
                          f(b, n ? 1.4 : 2.2, 7, 4, 5, -8.5, 5));
                        let x = new d.PMREMGenerator(e),
                          w = x.fromScene(i, 0.03);
                        return (x.dispose(), a.forEach((e) => e.dispose()), w);
                      })(n, e)).texture)),
                      (() => {
                        let e = t.current,
                          n = Math.round(g(e.rings, 1, 9)),
                          i = g(e.spacing, 0.01, 0.3),
                          a = g(e.bandWidth, 0.004, 0.25),
                          r = g(e.bandThickness, 0.002, 0.12),
                          o = [n, i, a, r].join("|");
                        if (o === p) return;
                        p = o;
                        let d = h;
                        (d.forEach((e) => e.mesh.geometry.dispose()),
                          s.clear(),
                          (h = []));
                        let c = s;
                        for (let e = 0; e < n; e++) {
                          let t = Math.max(0.12, 1 - e * i),
                            n = new l.YJl(),
                            s = new l.eaF(f(t, a, r, 320), v);
                          (n.add(s), c.add(n), (c = n));
                          let o =
                            e % 2 == 0
                              ? new l.Pq0(0, 1, 0)
                              : new l.Pq0(1, 0, 0);
                          o.applyAxisAngle(
                            new l.Pq0(0, 0, 1),
                            (e % 3) * 0.35,
                          ).normalize();
                          let p = d[e],
                            g = p ? p.angle : 0.6 + 1.37 * e;
                          h.push({
                            pivot: n,
                            mesh: s,
                            axis: o,
                            angle: g,
                            rate: (e % 2 == 0 ? 1 : -1) * (0.16 + 0.05 * e),
                            base: p ? p.base : Math.round(g / u) * u,
                          });
                        }
                      })(),
                      (S = t.current),
                      (E = j / A),
                      (T = g(S.size, 0.1, 2)),
                      (P =
                        1 /
                        (T *
                          (F = Math.tan((30 * Math.PI) / 360)) *
                          (E < 1 ? E : 1))),
                      (r.aspect = E),
                      r.position.set(0, 0, P),
                      (r.near = 0.05 * P),
                      (r.far = 4 * P),
                      r.lookAt(0, 0, 0),
                      r.updateProjectionMatrix(),
                      (I = P * F),
                      s.position.set(
                        g(S.offsetX, -1, 1) * I * E,
                        g(S.offsetY, -1, 1) * I,
                        0,
                      ),
                      (L = t.current),
                      (B = 1 - (R = y.value)),
                      (H = (g(L.tilt, -90, 90) * Math.PI) / 180),
                      (Y = Math.atan2(
                        Math.sin((W = 0.05 * w * g(L.speed, 0, 4))),
                        Math.cos(W),
                      )),
                      (D = (g(L.haloTilt, 0, 85) * Math.PI) / 180),
                      s.rotation.set(
                        H * B + D * R + b.y,
                        Y * B - 0.18 * R + b.x,
                        0.12 * R,
                      ),
                      (N = k >= 0 ? 0.92 + 0.08 * M : 1),
                      s.scale.setScalar(N),
                      h.forEach((e) => {
                        let t = e.angle - e.base;
                        e.pivot.quaternion.setFromAxisAngle(e.axis, t * B);
                      }),
                      (v.roughness = g((X = t.current).roughness, 0, 0.6)),
                      (v.iridescence = g(X.iridescence, 0, 1)),
                      a.environmentRotation.set(0, C, 0),
                      (i.style.opacity = String(M)),
                      n.render(a, r));
                  }
                },
                H = (e) => {
                  (e > 0.5 &&
                    y.target < 0.5 &&
                    h.forEach((e) => {
                      e.base = Math.round(e.angle / u) * u;
                    }),
                    (y.target = e));
                },
                W = (n) => {
                  let i, a, r, s, o, l, d;
                  if (((E = 0), P)) return;
                  let c = Math.min(0.1, Math.max(0, (n - T) / 1e3));
                  ((T = n),
                    ++L % 30 == 0 &&
                      (Math.abs(e.clientWidth - j) > 1 ||
                        Math.abs(e.clientHeight - A) > 1) &&
                      D(),
                    R() &&
                      ((i = t.current),
                      (w += c),
                      (C += 0.06 * c * g(i.lightDrift, 0, 4)),
                      k >= 0
                        ? ((k += c),
                          (M = g(k / 0.7, 0, 1)),
                          k > 0.55 && y.target > 0.5 && y.releaseAt < 0 && H(0),
                          k > 3 && (k = -1))
                        : (M = 1),
                      y.releaseAt >= 0 &&
                        w >= y.releaseAt &&
                        ((y.releaseAt = -1), H(0)),
                      (a = 1.44 * Math.sqrt(9)),
                      (y.velocity +=
                        (9 * (y.target - y.value) - a * y.velocity) * c),
                      (y.value += y.velocity * c),
                      (r = g(1 - y.value, 0, 1)),
                      (s = g(i.speed, 0, 4)),
                      h.forEach((e) => {
                        e.angle += e.rate * s * c * r;
                      }),
                      (o = g(i.parallax, 0, 2)),
                      (l = i.interactive && x.inside ? 0.32 * x.x * o : 0),
                      (d = i.interactive && x.inside ? -(0.22 * x.y) * o : 0),
                      (b.vx += (9 * (l - b.x) - 6 * b.vx) * c),
                      (b.vy += (9 * (d - b.y) - 6 * b.vy) * c),
                      (b.x += b.vx * c),
                      (b.y += b.vy * c)),
                    B(),
                    F &&
                      !document.hidden &&
                      R() &&
                      (E = requestAnimationFrame(W)));
                };
              function Y() {
                P ||
                  E ||
                  !F ||
                  ((T = performance.now()), (E = requestAnimationFrame(W)));
              }
              function D() {
                let i = e.getBoundingClientRect();
                if (i.width < 2 || i.height < 2) {
                  I = !1;
                  return;
                }
                ((I = !0),
                  (j = i.width),
                  (A = i.height),
                  n.setPixelRatio(
                    Math.min(window.devicePixelRatio || 1, 2) *
                      g(t.current.quality, 0.25, 1),
                  ),
                  n.setSize(j, A, !1),
                  S ||
                    ((S = !0),
                    t.current.intro && R()
                      ? ((k = 0), (M = 0), (y.value = 1), (y.target = 1))
                      : ((y.value = 0), (y.target = 0))),
                  B(),
                  Y());
              }
              let N = (t) => {
                  let n = e.getBoundingClientRect();
                  ((x.x = g(((t.clientX - n.left) / n.width) * 2 - 1, -1, 1)),
                    (x.y = g(((t.clientY - n.top) / n.height) * 2 - 1, -1, 1)),
                    (x.inside = "touch" !== t.pointerType),
                    Y());
                },
                X = () => {
                  ((x.inside = !1), Y());
                },
                q = () => {
                  let e = t.current;
                  if (y.target > 0.5) ((y.releaseAt = -1), H(0));
                  else {
                    H(1);
                    let t = g(e.alignHold, 0, 60);
                    y.releaseAt = t > 0 ? w + t : -1;
                  }
                  Y();
                },
                z = (e) => {
                  let n = t.current;
                  if (n.interactive && n.clickAlign && R()) {
                    if ("mouse" === e.pointerType) {
                      0 === e.button && q();
                      return;
                    }
                    ((x.id = e.pointerId),
                      (x.downX = e.clientX),
                      (x.downY = e.clientY),
                      (x.downT = performance.now()));
                  }
                },
                G = (e) => {
                  if (x.id !== e.pointerId) return;
                  x.id = -1;
                  let n = t.current;
                  !n.interactive ||
                    !n.clickAlign ||
                    !R() ||
                    Math.hypot(e.clientX - x.downX, e.clientY - x.downY) > 10 ||
                    performance.now() - x.downT > 450 ||
                    q();
                },
                Q = () => {
                  x.id = -1;
                };
              (e.addEventListener("pointermove", N),
                e.addEventListener("pointerleave", X),
                e.addEventListener("pointerdown", z),
                e.addEventListener("pointerup", G),
                e.addEventListener("pointercancel", Q));
              let O = new ResizeObserver(D);
              O.observe(e);
              let U = new IntersectionObserver(
                (e) => {
                  (F = e.some((e) => e.isIntersecting)) && Y();
                },
                { rootMargin: "80px" },
              );
              U.observe(e);
              let V = () => {
                document.hidden || Y();
              };
              document.addEventListener("visibilitychange", V);
              let $ = (e) => e.preventDefault();
              return (
                i.addEventListener("webglcontextlost", $),
                D(),
                {
                  sync: () => {
                    R() ||
                      ((k = -1),
                      (M = 1),
                      (y.value = +(y.target > 0.5)),
                      (y.velocity = 0));
                    let e =
                      Math.min(window.devicePixelRatio || 1, 2) *
                      g(t.current.quality, 0.25, 1);
                    (!I || Math.abs(e - n.getPixelRatio()) > 0.001 ? D() : B(),
                      Y());
                  },
                  destroy: () => {
                    ((P = !0),
                      cancelAnimationFrame(E),
                      e.removeEventListener("pointermove", N),
                      e.removeEventListener("pointerleave", X),
                      e.removeEventListener("pointerdown", z),
                      e.removeEventListener("pointerup", G),
                      e.removeEventListener("pointercancel", Q),
                      document.removeEventListener("visibilitychange", V),
                      i.removeEventListener("webglcontextlost", $),
                      O.disconnect(),
                      U.disconnect(),
                      h.forEach((e) => e.mesh.geometry.dispose()),
                      v.dispose(),
                      o?.dispose(),
                      n.dispose(),
                      n.forceContextLoss(),
                      i.remove());
                  },
                  align: () => {
                    (y.target < 0.5 ? q() : (y.releaseAt = -1),
                      R() || ((y.value = 1), B()));
                  },
                  release: () => {
                    ((y.releaseAt = -1),
                      H(0),
                      R() || ((y.value = 0), B()),
                      Y());
                  },
                  replay: () => {
                    R() &&
                      ((k = 0),
                      (M = 0),
                      (y.value = 1),
                      (y.velocity = 0),
                      H(1),
                      (y.releaseAt = -1),
                      Y());
                  },
                }
              );
            })(e, N);
            return (
              (Y.current = t),
              () => {
                (t?.destroy(), (Y.current = null));
              }
            );
          }, []),
          (0, a.useImperativeHandle)(
            H,
            () => ({
              align: () => Y.current?.align(),
              release: () => Y.current?.release(),
              replay: () => Y.current?.replay(),
            }),
            [],
          ),
          (0, i.jsx)("div", {
            ref: W,
            className: (0, c.cn)(
              "relative isolate h-full min-h-[240px] w-full overflow-hidden",
              L,
            ),
            style: { touchAction: "pan-y", ...R },
            children:
              B &&
              (0, i.jsx)("div", {
                className: "relative z-10 h-full w-full",
                children: B,
              }),
          })
        );
      });
    v.displayName = "ChromeOrbit";
    let y = {
        colors: ["#7B5CFF", "#FF7AD9"],
        rings: 4,
        spacing: 0.09,
        bandWidth: 0.085,
        bandThickness: 0.018,
        roughness: 0.16,
        iridescence: 0.25,
      },
      b = {
        gyroscope: y,
        armillary: {
          ...y,
          rings: 7,
          spacing: 0.06,
          bandWidth: 0.05,
          bandThickness: 0.014,
        },
        bands: {
          ...y,
          rings: 3,
          spacing: 0.12,
          bandWidth: 0.14,
          bandThickness: 0.025,
        },
        gold: {
          ...y,
          colors: ["#FF7A27", "#FFD27A"],
          roughness: 0.12,
          iridescence: 0.4,
        },
      },
      x = [
        { label: "Gyroscope", value: "gyroscope" },
        { label: "Armillary", value: "armillary" },
        { label: "Bands", value: "bands" },
        { label: "Gold Light", value: "gold" },
      ],
      w = [
        { label: "Dark", value: "dark" },
        { label: "Light", value: "light" },
      ],
      C = [
        {
          name: "colors",
          type: "[string, string]",
          default: '["#7B5CFF", "#FF7AD9"]',
          description:
            "The two coloured gel lights the chrome reflects, next to the white studio softboxes.",
        },
        {
          name: "studio",
          type: '"dark" | "light"',
          default: '"dark"',
          description:
            "The room the chrome reflects: a dark studio for dark pages, a pale one for light pages.",
        },
        {
          name: "rings",
          type: "number",
          default: "4",
          description:
            "Number of nested rings, from 1 to 9. Each ring turns inside the one around it, like the gimbals of a gyroscope.",
        },
        {
          name: "size",
          type: "number",
          default: "0.8",
          description:
            "Diameter of the outer ring as a fraction of the frame's shorter side. Values above 1 crop the rings at the edges.",
        },
        {
          name: "spacing",
          type: "number",
          default: "0.09",
          description:
            "Gap between nested rings as a fraction of the outer radius.",
        },
        {
          name: "bandWidth",
          type: "number",
          default: "0.085",
          description: "Width of each band as a fraction of the outer radius.",
        },
        {
          name: "bandThickness",
          type: "number",
          default: "0.018",
          description:
            "Thickness of each band as a fraction of the outer radius.",
        },
        {
          name: "roughness",
          type: "number",
          default: "0.16",
          description: "Surface roughness, from 0 (mirror) to 0.6 (satin).",
        },
        {
          name: "iridescence",
          type: "number",
          default: "0.25",
          description:
            "Thin-film rainbow sheen along the band edges, from 0 to 1.",
        },
        {
          name: "speed",
          type: "number",
          default: "1",
          description:
            "Speed of the rings turning and of the whole assembly drifting.",
        },
        {
          name: "tilt",
          type: "number",
          default: "18",
          description: "Forward tilt of the assembly in degrees.",
        },
        {
          name: "lightDrift",
          type: "number",
          default: "1",
          description:
            "Speed of the studio slowly turning around the rings, which keeps the reflections gliding even when the rings are still.",
        },
        {
          name: "offsetX",
          type: "number",
          default: "0",
          description:
            "Horizontal position of the rings, from -1 (left edge) to 1 (right edge). Useful to sit them beside a headline.",
        },
        {
          name: "offsetY",
          type: "number",
          default: "0",
          description:
            "Vertical position of the rings, from -1 (bottom) to 1 (top).",
        },
        {
          name: "interactive",
          type: "boolean",
          default: "true",
          description: "Respond to the pointer.",
        },
        {
          name: "parallax",
          type: "number",
          default: "1",
          description:
            "How far the assembly turns toward the pointer, from 0 to 2.",
        },
        {
          name: "clickAlign",
          type: "boolean",
          default: "true",
          description:
            "Clicking or tapping swings every ring into one plane, a tilted halo of concentric bands. Clicking again, or waiting alignHold seconds, lets them unfold.",
        },
        {
          name: "alignHold",
          type: "number",
          default: "2.5",
          description:
            "Seconds the halo holds before unfolding on its own. 0 keeps it until the next click.",
        },
        {
          name: "haloTilt",
          type: "number",
          default: "62",
          description:
            "Tilt of the aligned halo in degrees, from 0 (facing you) to 85 (nearly edge-on).",
        },
        {
          name: "intro",
          type: "boolean",
          default: "true",
          description:
            "The rings arrive as a halo and unfold into the gyroscope.",
        },
        {
          name: "paused",
          type: "boolean",
          default: "false",
          description:
            "Freeze the rings. Reduced-motion users always get a still gyroscope, without the intro.",
        },
        {
          name: "quality",
          type: "number",
          default: "1",
          description: "Resolution scale from 0.25 to 1.",
        },
        {
          name: "ref",
          type: "{ align, release, replay }",
          default: "—",
          description:
            "align() swings the rings into the halo, release() unfolds them, replay() plays the intro again.",
        },
        {
          name: "children",
          type: "ReactNode",
          default: "—",
          description: "Content placed over the rings.",
        },
        {
          name: "className",
          type: "string",
          default: "—",
          description:
            "Classes for the root element. It fills its parent, with a 240px minimum height.",
        },
        {
          name: "style",
          type: "CSSProperties",
          default: "—",
          description: "Inline styles for the root element.",
        },
      ],
      k = () => {
        let [e, t] = (0, o.I)(),
          n = (0, s.Y)(),
          [l, d] = (0, a.useState)("gyroscope"),
          [c, u] = (0, a.useState)(y),
          h = (e) => (t) => u((n) => ({ ...n, [e]: t })),
          p = (e) => (t) => {
            let n = [...c.colors];
            ((n[e] = t), h("colors")(n));
          },
          [g, m] = (0, a.useState)(null),
          f = g ?? ("dark" === n ? "dark" : "light"),
          [k, M] = (0, a.useState)(0.8),
          [S, j] = (0, a.useState)(1),
          [A, E] = (0, a.useState)(18),
          [T, F] = (0, a.useState)(1),
          [P, I] = (0, a.useState)(0),
          [L, R] = (0, a.useState)(0),
          [B, H] = (0, a.useState)(1),
          [W, Y] = (0, a.useState)(2.5),
          [D, N] = (0, a.useState)(62),
          [X, q] = (0, a.useState)(!0),
          [z, G] = (0, a.useState)(!0),
          [Q, O] = (0, a.useState)(!0),
          [U, V] = (0, a.useState)(!1);
        return (0, i.jsxs)("div", {
          children: [
            (0, i.jsx)(r.Bg, {}),
            (0, i.jsxs)(r.VX, {
              children: [
                (0, i.jsxs)(r.Ec, {
                  children: [
                    (0, i.jsx)(r.Ch, {
                      onRefresh: t,
                      minHeight: 560,
                      enableResponsive: !0,
                      children: (0, i.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, i.jsx)(
                          v,
                          {
                            colors: c.colors,
                            studio: f,
                            rings: c.rings,
                            size: k,
                            spacing: c.spacing,
                            bandWidth: c.bandWidth,
                            bandThickness: c.bandThickness,
                            roughness: c.roughness,
                            iridescence: c.iridescence,
                            speed: S,
                            tilt: A,
                            lightDrift: T,
                            offsetX: P,
                            offsetY: L,
                            interactive: Q,
                            parallax: B,
                            clickAlign: X,
                            alignHold: W,
                            haloTilt: D,
                            intro: z,
                            paused: U,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, i.jsxs)(r.IH, {
                      children: [
                        (0, i.jsx)(r.bg, {
                          title: "Look",
                          value: l,
                          options: x,
                          onChange: (e) => {
                            (d(e), u(b[e] ?? y));
                          },
                        }),
                        (0, i.jsx)(r.bg, {
                          title: "Studio",
                          value: f,
                          options: w,
                          onChange: (e) => m(e),
                        }),
                        (0, i.jsx)(r.W7, {
                          title: "Gel A",
                          value: c.colors[0],
                          onChange: p(0),
                        }),
                        (0, i.jsx)(r.W7, {
                          title: "Gel B",
                          value: c.colors[1],
                          onChange: p(1),
                        }),
                        (0, i.jsx)(r.yt, {
                          title: "Rings",
                          min: 1,
                          max: 9,
                          step: 1,
                          value: c.rings,
                          onChange: h("rings"),
                        }),
                        (0, i.jsx)(r.yt, {
                          title: "Size",
                          min: 0.3,
                          max: 1.6,
                          step: 0.01,
                          value: k,
                          onChange: M,
                        }),
                        (0, i.jsx)(r.yt, {
                          title: "Spacing",
                          min: 0.02,
                          max: 0.25,
                          step: 0.005,
                          value: c.spacing,
                          onChange: h("spacing"),
                        }),
                        (0, i.jsx)(r.yt, {
                          title: "Band Width",
                          min: 0.01,
                          max: 0.25,
                          step: 0.005,
                          value: c.bandWidth,
                          onChange: h("bandWidth"),
                        }),
                        (0, i.jsx)(r.yt, {
                          title: "Band Thickness",
                          min: 0.004,
                          max: 0.08,
                          step: 0.001,
                          value: c.bandThickness,
                          onChange: h("bandThickness"),
                        }),
                        (0, i.jsx)(r.yt, {
                          title: "Roughness",
                          min: 0,
                          max: 0.6,
                          step: 0.01,
                          value: c.roughness,
                          onChange: h("roughness"),
                        }),
                        (0, i.jsx)(r.yt, {
                          title: "Iridescence",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: c.iridescence,
                          onChange: h("iridescence"),
                        }),
                        (0, i.jsx)(r.yt, {
                          title: "Speed",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: S,
                          onChange: j,
                        }),
                        (0, i.jsx)(r.yt, {
                          title: "Tilt",
                          min: -60,
                          max: 60,
                          step: 1,
                          value: A,
                          valueUnit: "\xb0",
                          onChange: E,
                        }),
                        (0, i.jsx)(r.yt, {
                          title: "Light Drift",
                          min: 0,
                          max: 4,
                          step: 0.05,
                          value: T,
                          onChange: F,
                        }),
                        (0, i.jsx)(r.yt, {
                          title: "Offset X",
                          min: -1,
                          max: 1,
                          step: 0.01,
                          value: P,
                          onChange: I,
                        }),
                        (0, i.jsx)(r.yt, {
                          title: "Offset Y",
                          min: -1,
                          max: 1,
                          step: 0.01,
                          value: L,
                          onChange: R,
                        }),
                        (0, i.jsx)(r.yt, {
                          title: "Parallax",
                          min: 0,
                          max: 2,
                          step: 0.05,
                          value: B,
                          onChange: H,
                        }),
                        (0, i.jsx)(r.yt, {
                          title: "Align Hold",
                          min: 0,
                          max: 10,
                          step: 0.5,
                          value: W,
                          valueUnit: "s",
                          onChange: Y,
                        }),
                        (0, i.jsx)(r.yt, {
                          title: "Halo Tilt",
                          min: 0,
                          max: 85,
                          step: 1,
                          value: D,
                          valueUnit: "\xb0",
                          onChange: N,
                        }),
                        (0, i.jsx)(r.tl, {
                          title: "Click Align",
                          checked: X,
                          onChange: q,
                        }),
                        (0, i.jsx)(r.tl, {
                          title: "Intro",
                          checked: z,
                          onChange: G,
                        }),
                        (0, i.jsx)(r.tl, {
                          title: "Interactive",
                          checked: Q,
                          onChange: O,
                        }),
                        (0, i.jsx)(r.tl, {
                          title: "Paused",
                          checked: U,
                          onChange: V,
                        }),
                      ],
                    }),
                    (0, i.jsx)(r.Ub, { data: C }),
                  ],
                }),
                (0, i.jsx)(r.lT, { children: (0, i.jsx)(r.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
