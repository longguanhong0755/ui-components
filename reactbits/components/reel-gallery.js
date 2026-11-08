/* ReactBits Pro public preview module 40794 for reel-gallery.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/40794.2ce1098b16eb1e94.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  40794: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => b }));
    var n = a(95155),
      r = a(12115),
      i = a(30701),
      s = a(56388),
      u = a(90761),
      l = a(81712),
      o = a(3907),
      c = a(2253),
      h = a(90650);
    let d = [
        "https://images.unsplash.com/photo-1449157291145-7efd050a4d0e?q=75&w=520&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=75&w=520&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1487958449943-2429e8be8625?q=75&w=520&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?q=75&w=520&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=75&w=520&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1523217582562-09d0def993a6?q=75&w=520&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1470075801209-17f9ec0cada6?q=75&w=520&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?q=75&w=520&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1470723710355-95304d8aece4?q=75&w=520&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=75&w=520&auto=format&fit=crop",
      ],
      m = (e) => {
        let t = 43758.5453 * Math.sin(127.1 * e + 311.7);
        return t - Math.floor(t);
      },
      p = (e, t, a) => Math.min(a, Math.max(t, e)),
      f = `
uniform vec2 uSize;
varying vec2 vPos;

void main() {
  vPos = position.xy * uSize;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,
      v = `
precision highp float;

uniform sampler2D uAtlas;
uniform vec2 uSize;
uniform float uRows;
uniform float uPitch;
uniform float uRowHeight;
uniform float uArch;
uniform float uPlaneWidth;
uniform float uLean;
uniform float uReach;
uniform float uEdge;
uniform float uAt;
uniform float uSpeed;
uniform float uVariance;
uniform float uAlternate;
uniform float uDim;
uniform float uTaper;
uniform float uGray;
uniform float uBright;
uniform float uReveal;
uniform float uFade;
uniform vec2 uPointer;
uniform float uFocusRadius;
uniform float uFocusStrength;

varying vec2 vPos;

float scatter(float seed) {
  float spun = sin(seed * 127.1 + 311.7) * 43758.5453;
  return spun - floor(spun);
}

void main() {
  float c = cos(uLean);
  float s = sin(uLean);
  vec2 q = vec2(vPos.x * c - vPos.y * s, vPos.x * s + vPos.y * c);

  float f = q.x / uPlaneWidth;
  float sy = q.y - (0.25 - f * f) * uArch;

  float middle = (uRows - 1.0) * 0.5;
  float row = floor(middle - sy / uPitch + 0.5);
  if (row < 0.0 || row > uRows - 1.0) {
    gl_FragColor = vec4(0.0);
    return;
  }

  float reach = max(middle, 1.0);
  float away = abs(row - middle) / reach;
  float shrink = max(1.0 - uTaper * away, 0.05);
  float band = uRowHeight * shrink;

  float local = sy + (row - middle) * uPitch;
  float lip = band * 0.5;
  float rim = 1.0 - smoothstep(lip - 0.75, lip + 0.25, abs(local));
  if (rim < 0.002) {
    gl_FragColor = vec4(0.0);
    return;
  }

  float swing = (scatter(row + 17.0) * 2.0 - 1.0) * uVariance;
  float flip = (uAlternate > 0.5 && mod(row, 2.0) > 0.5) ? -1.0 : 1.0;
  float pace = (1.0 + swing) * flip;

  float ux = q.x / shrink;
  float u = (ux + uAt * uSpeed * pace) / uReach + scatter(row + 3.0);
  float v = clamp(local / band + 0.5, uEdge, 1.0 - uEdge);

  vec4 texel = texture2D(uAtlas, vec2(u, v));
  float mass = texel.a;
  vec3 base = texel.rgb / max(mass, 0.0025);
  float lum = dot(base, vec3(0.2126, 0.7152, 0.0722));

  float glow = 0.0;
  if (uFocusStrength > 0.001 && uFocusRadius > 0.001) {
    float span = length(vPos - uPointer) / uFocusRadius;
    glow = uFocusStrength * (1.0 - smoothstep(0.35, 1.0, span));
  }

  float drain = clamp(uGray * (1.0 - glow), 0.0, 1.0);
  vec3 tone = mix(base, vec3(lum), drain) * uBright * (1.0 + glow * 0.28);

  float wash = 1.0;
  if (uFade > 0.001) {
    float edge = abs(vPos.x) / max(uSize.x * 0.5, 1.0);
    wash = 1.0 - smoothstep(1.0 - uFade * 2.0, 1.0, edge);
  }

  float veil = mass * rim * wash * uReveal * (1.0 - uDim * away);
  gl_FragColor = vec4(tone * veil, veil);
}
`,
      g = (e, t, a, n, r, i, s) => {
        (e.save(), e.beginPath());
        let u = Math.min(s, 0.5 * r, 0.5 * i);
        ("function" == typeof e.roundRect
          ? e.roundRect(a, n, r, i, u)
          : e.rect(a, n, r, i),
          e.clip());
        let l = t.naturalWidth / t.naturalHeight,
          o = r,
          c = r / l;
        (c < i && ((c = i), (o = i * l)),
          e.drawImage(t, a + (r - o) * 0.5, n + (i - c) * 0.5, o, c),
          e.restore());
      },
      x = ({
        strip: e,
        size: t,
        planeWidth: a,
        rowHeight: i,
        rowGap: s,
        reelCount: u,
        atlasScale: o,
        tilt: h,
        arch: d,
        gray: m,
        bright: g,
        focusRadius: x,
        focusStrength: w,
        speed: y,
        speedVariance: b,
        alternate: S,
        dim: C,
        taper: j,
        veil: M,
        maxFps: R,
        advance: E,
      }) => {
        let { invalidate: P } = (0, l.C)(),
          k = (0, r.useRef)(null),
          A = (0, r.useRef)(0),
          F = (0, r.useRef)(new c.I9Y(1e5, 1e5)),
          H = (0, r.useMemo)(
            () => [
              {
                uAtlas: { value: null },
                uSize: { value: new c.I9Y(1, 1) },
                uRows: { value: 1 },
                uPitch: { value: 1 },
                uRowHeight: { value: 1 },
                uArch: { value: 0 },
                uPlaneWidth: { value: 1 },
                uLean: { value: 0 },
                uReach: { value: 1 },
                uEdge: { value: 0 },
                uAt: { value: 0 },
                uSpeed: { value: 1 },
                uVariance: { value: 0 },
                uAlternate: { value: 0 },
                uDim: { value: 0 },
                uTaper: { value: 0 },
                uGray: { value: 0 },
                uBright: { value: 1 },
                uReveal: { value: 0 },
                uFade: { value: 0 },
                uPointer: { value: new c.I9Y(1e5, 1e5) },
                uFocusRadius: { value: 0 },
                uFocusStrength: { value: 0 },
              },
            ],
            [],
          );
        return (
          (0, l.D)((n, r) => {
            let l = Math.min(r, 0.05),
              [c, f, v] = E(l);
            ((A.current += (1 - A.current) * Math.min(3.2 * l, 1)),
              (F.current.x += (f - F.current.x) * Math.min(9 * l, 1)),
              (F.current.y += (v - F.current.y) * Math.min(9 * l, 1)));
            let R = k.current?.uniforms;
            R &&
              ((R.uAtlas.value = e.texture),
              R.uSize.value.set(t.w, t.h),
              (R.uRows.value = u),
              (R.uPitch.value = i + s),
              (R.uRowHeight.value = i),
              (R.uArch.value = d),
              (R.uPlaneWidth.value = a),
              (R.uLean.value = (h * Math.PI) / 180),
              (R.uReach.value = Math.max(e.span * o, 1)),
              (R.uEdge.value = e.edge),
              (R.uAt.value = c),
              (R.uSpeed.value = y),
              (R.uVariance.value = b),
              (R.uAlternate.value = +!!S),
              (R.uDim.value = p(C, 0, 1)),
              (R.uTaper.value = p(j, 0, 1)),
              (R.uGray.value = m),
              (R.uBright.value = g),
              (R.uReveal.value = A.current),
              (R.uFade.value = M),
              R.uPointer.value.copy(F.current),
              (R.uFocusRadius.value = x),
              (R.uFocusStrength.value = w));
          }),
          (0, r.useEffect)(() => {
            let e = 1e3 / Math.max(1, R),
              t = 0,
              a = 0,
              n = Math.min(4, 0.5 * e),
              r = (i) => {
                ((t = requestAnimationFrame(r)),
                  i - a < e - n || ((a = i), P()));
              };
            return (
              (t = requestAnimationFrame(r)),
              () => cancelAnimationFrame(t)
            );
          }, [P, R]),
          (0, n.jsxs)("mesh", {
            scale: [t.w, t.h, 1],
            children: [
              (0, n.jsx)("planeGeometry", { args: [1, 1] }),
              (0, n.jsx)("shaderMaterial", {
                ref: k,
                vertexShader: f,
                fragmentShader: v,
                uniforms: H[0],
                transparent: !0,
                premultipliedAlpha: !0,
                depthTest: !1,
                depthWrite: !1,
              }),
            ],
          })
        );
      },
      w = ({
        images: e = d,
        rows: t = 6,
        rowHeight: a = 92,
        rowGap: i = 20,
        itemGap: s = 16,
        maxAspect: u = 2,
        minAspect: l = 0.6,
        tilt: f = 7,
        arch: v = 48,
        speed: w = 1,
        speedVariance: y = 0.55,
        alternate: b = !1,
        autoScroll: S = 26,
        inertia: C = 0.92,
        damping: j = 0.1,
        dragSensitivity: M = 1.6,
        wheelSensitivity: R = 1,
        radius: E = 10,
        grayscale: P = 0.55,
        focusRadius: k = 210,
        focusStrength: A = 0.85,
        fade: F = 0.12,
        dim: H = 0.35,
        taper: L = 0.12,
        brightness: I = 1,
        backgroundColor: q = "transparent",
        interactive: D = !0,
        paused: G = !1,
        maxFps: N = 60,
        dpr: z = 1.25,
        className: T,
        children: W,
      }) => {
        let B = (0, r.useRef)(null),
          V = (0, r.useRef)({ at: 0, aim: 0, push: 0, held: !1 }),
          O = (0, r.useRef)({ x: 1e5, y: 1e5, live: !1 }),
          Y = (0, r.useRef)({ left: 0, top: 0, width: 0, height: 0 }),
          _ = (0, r.useRef)(!1),
          [X, U] = (0, r.useState)({ w: 0, h: 0 }),
          [J, $] = (0, r.useState)([]),
          [K, Q] = (0, r.useState)(!1),
          Z = (0, r.useMemo)(() => (e.length > 0 ? e : d), [e]);
        ((0, r.useEffect)(() => {
          let e = !0,
            t = [],
            a = Z.length;
          if (0 !== a)
            return (
              Z.forEach((n) => {
                let r = new Image();
                r.crossOrigin = "anonymous";
                let i = () => {
                  (r.naturalWidth > 0 && t.push(r), 0 == (a -= 1) && e && $(t));
                };
                ((r.onload = i), (r.onerror = i), (r.src = n));
              }),
              () => {
                e = !1;
              }
            );
        }, [Z]),
          (0, r.useEffect)(() => {
            let e = B.current;
            if (e) {
              if ("undefined" != typeof ResizeObserver) {
                let t = new ResizeObserver(([t]) => {
                  ((Y.current = e.getBoundingClientRect()),
                    U({
                      w: Math.round(t.contentRect.width),
                      h: Math.round(t.contentRect.height),
                    }));
                });
                return (t.observe(e), () => t.disconnect());
              }
              U({ w: e.clientWidth, h: e.clientHeight });
            }
          }, []),
          (0, r.useEffect)(() => {
            let e = B.current;
            if (!e || "undefined" == typeof IntersectionObserver) {
              let e = requestAnimationFrame(() => Q(!0));
              return () => cancelAnimationFrame(e);
            }
            let t = new IntersectionObserver(([e]) => Q(e.isIntersecting), {
              rootMargin: "180px",
            });
            return (t.observe(e), () => t.disconnect());
          }, []),
          (0, r.useEffect)(() => {
            let e = B.current;
            if (!e) return;
            let t = () => {
              Y.current = e.getBoundingClientRect();
            };
            return (
              t(),
              window.addEventListener("scroll", t, {
                passive: !0,
                capture: !0,
              }),
              window.addEventListener("resize", t, { passive: !0 }),
              () => {
                (window.removeEventListener("scroll", t, { capture: !0 }),
                  window.removeEventListener("resize", t));
              }
            );
          }, []),
          (0, r.useEffect)(() => {
            if (!window.matchMedia) return;
            let e = window.matchMedia("(prefers-reduced-motion: reduce)"),
              t = () => {
                _.current = e.matches;
              };
            return (
              t(),
              e.addEventListener("change", t),
              () => e.removeEventListener("change", t)
            );
          }, []));
        let ee = p(Math.round(t), 1, 24),
          et = Math.max(24, a),
          ea = Math.max(0.2, u),
          en = p(l, 0.2, ea),
          er = et * ea,
          ei = (Math.abs(f) * Math.PI) / 180,
          es = Math.max(
            320,
            Math.round(
              X.w / Math.max(Math.cos(ei), 0.25) + Math.tan(ei) * et * ee + er,
            ),
          ),
          eu = Math.max(32, 32 * Math.ceil(et / 32)),
          el = Math.max(512, 512 * Math.ceil(((es * eu) / et / 512) * 1)),
          [eo, ec] = (0, r.useState)({ height: eu, span: el });
        (0, r.useEffect)(() => {
          if (eo.height === eu && eo.span === el) return;
          let e = setTimeout(() => ec({ height: eu, span: el }), 160);
          return () => clearTimeout(e);
        }, [eu, el, eo]);
        let eh = et / eo.height,
          ed = (0, r.useMemo)(() => {
            if (0 === J.length) return [];
            let e = p(z, 1, 1.6),
              t = [];
            for (let a = 0; a < 1; a += 1) {
              let n = Math.round(m(a + 1) * J.length),
                r = [],
                i = 0,
                u = 0;
              for (; (i < eo.span || r.length < 3) && u < 64;) {
                let e = J[(n + u) % J.length],
                  t = e.naturalWidth / e.naturalHeight,
                  a = Math.round(eo.height * p(t, en, ea));
                (r.push({ art: e, width: a }), (i += a + s), (u += 1));
              }
              let l = document.createElement("canvas");
              ((l.width = Math.max(2, Math.round(i * e))),
                (l.height = Math.max(2, Math.round(eo.height * e))));
              let o = l.getContext("2d");
              if (!o) continue;
              o.scale(e, e);
              let h = l.height / e,
                d = 0;
              r.forEach((e) => {
                (g(o, e.art, d, 0, e.width, h, E), (d += e.width + s));
              });
              let f = new c.GOR(l);
              ((f.wrapS = c.GJx),
                (f.wrapT = c.ghU),
                (f.minFilter = c.k6q),
                (f.magFilter = c.k6q),
                (f.generateMipmaps = !1),
                (f.premultiplyAlpha = !0),
                (f.colorSpace = c.er$),
                t.push({ texture: f, span: i, edge: 0.5 / l.height }));
            }
            return t;
          }, [J, eo, ea, en, s, E, z]);
        (0, r.useEffect)(
          () => () => {
            ed.forEach((e) => e.texture.dispose());
          },
          [ed],
        );
        let em = (0, r.useCallback)(
            (e) => {
              let t = V.current,
                a = O.current,
                n = 60 * e;
              (!t.held &&
                ((t.aim += t.push * n),
                (t.push *= Math.pow(p(C, 0, 0.995), n)),
                0.4 > Math.abs(t.push) && (t.push = 0)),
                G || _.current || (t.aim += S * e));
              let r = t.held ? 0.3 : p(j, 0.01, 1);
              return (
                (t.at += (t.aim - t.at) * (1 - Math.pow(1 - r, n))),
                [t.at, a.live ? a.x : 1e5, a.live ? a.y : 1e5]
              );
            },
            [C, j, S, G],
          ),
          ep = (0, r.useCallback)((e, t) => {
            ((V.current.aim += e), (V.current.push = t));
          }, []);
        (0, r.useEffect)(() => {
          let e = B.current;
          if (!e || !D) return;
          let t = (e) => {
              let t = e.deltaY + e.deltaX;
              0 !== t && (e.preventDefault(), ep(t * R, 0.15 * t * R));
            },
            a = -1,
            n = 0,
            r = 0,
            i = (t) => {
              ((a = t.pointerId),
                (n = t.clientX),
                (r = t.clientY),
                (V.current.held = !0),
                (V.current.push = 0),
                e.setPointerCapture(t.pointerId));
            },
            s = (e) => {
              let t;
              if (
                ((t = Y.current),
                (O.current.x = e.clientX - t.left - 0.5 * t.width),
                (O.current.y = 0.5 * t.height - (e.clientY - t.top)),
                (O.current.live = !0),
                e.pointerId !== a)
              )
                return;
              let i = (e.clientY - r - (e.clientX - n)) * M;
              ((n = e.clientX),
                (r = e.clientY),
                (V.current.aim += i),
                (V.current.push = 0.25 * i));
            },
            u = (t) => {
              t.pointerId === a &&
                ((a = -1),
                (V.current.held = !1),
                e.hasPointerCapture(t.pointerId) &&
                  e.releasePointerCapture(t.pointerId));
            },
            l = () => {
              O.current.live = !1;
            },
            o = (e) => {
              "ArrowRight" === e.key
                ? (e.preventDefault(), ep(60, 9))
                : "ArrowLeft" === e.key && (e.preventDefault(), ep(-60, -9));
            };
          return (
            e.addEventListener("wheel", t, { passive: !1 }),
            e.addEventListener("pointerdown", i),
            e.addEventListener("pointermove", s),
            e.addEventListener("pointerup", u),
            e.addEventListener("pointercancel", u),
            e.addEventListener("pointerleave", l),
            e.addEventListener("keydown", o),
            () => {
              (e.removeEventListener("wheel", t),
                e.removeEventListener("pointerdown", i),
                e.removeEventListener("pointermove", s),
                e.removeEventListener("pointerup", u),
                e.removeEventListener("pointercancel", u),
                e.removeEventListener("pointerleave", l),
                e.removeEventListener("keydown", o));
            }
          );
        }, [D, R, M, ep]);
        let ef = p(F, 0, 0.5);
        return (0, n.jsxs)("div", {
          ref: B,
          tabIndex: D ? 0 : -1,
          className: (0, h.cn)(
            "relative touch-none overflow-hidden outline-none select-none",
            D && "cursor-grab active:cursor-grabbing",
            T,
          ),
          style: { background: q },
          children: [
            (0, n.jsx)("div", {
              className: "absolute inset-0",
              children:
                K && ed.length > 0 && X.w > 0
                  ? (0, n.jsx)(o.Hl, {
                      orthographic: !0,
                      camera: {
                        position: [0, 0, 100],
                        zoom: 1,
                        near: 0.1,
                        far: 500,
                      },
                      dpr: p(z, 0.75, 1.5),
                      gl: {
                        antialias: !1,
                        alpha: !0,
                        depth: !1,
                        stencil: !1,
                        powerPreference: "high-performance",
                      },
                      frameloop: "demand",
                      children: (0, n.jsx)(x, {
                        strip: ed[0],
                        size: X,
                        planeWidth: es,
                        rowHeight: et,
                        rowGap: i,
                        reelCount: ee,
                        atlasScale: eh,
                        tilt: f,
                        arch: v,
                        gray: p(P, 0, 1),
                        bright: I,
                        focusRadius: k,
                        focusStrength: p(A, 0, 1),
                        speed: w,
                        speedVariance: y,
                        alternate: b,
                        dim: H,
                        taper: L,
                        veil: ef,
                        maxFps: N,
                        advance: em,
                      }),
                    })
                  : null,
            }),
            W
              ? (0, n.jsx)("div", {
                  className: "pointer-events-none relative z-10 h-full w-full",
                  children: W,
                })
              : null,
          ],
        });
      },
      y = () => () => {},
      b = () => {
        let [e, t] = (0, u.I)(),
          { resolvedTheme: a } = (0, i.D)(),
          l =
            (0, r.useSyncExternalStore)(
              y,
              () => !0,
              () => !1,
            ) && "dark" === a,
          [o, c] = (0, r.useState)(6),
          [h, d] = (0, r.useState)(92),
          [m, p] = (0, r.useState)(20),
          [f, v] = (0, r.useState)(16),
          [g, x] = (0, r.useState)(2),
          [b, S] = (0, r.useState)(0.6),
          [C, j] = (0, r.useState)(60),
          [M, R] = (0, r.useState)(7),
          [E, P] = (0, r.useState)(48),
          [k, A] = (0, r.useState)(1),
          [F, H] = (0, r.useState)(0.55),
          [L, I] = (0, r.useState)(26),
          [q, D] = (0, r.useState)(0.92),
          [G, N] = (0, r.useState)(0.1),
          [z, T] = (0, r.useState)(1.6),
          [W, B] = (0, r.useState)(1),
          [V, O] = (0, r.useState)(10),
          [Y, _] = (0, r.useState)(0.55),
          [X, U] = (0, r.useState)(210),
          [J, $] = (0, r.useState)(0.85),
          [K, Q] = (0, r.useState)(1),
          [Z, ee] = (0, r.useState)(1.25),
          [et, ea] = (0, r.useState)(0.12),
          [en, er] = (0, r.useState)(0.35),
          [ei, es] = (0, r.useState)(0.12),
          [eu, el] = (0, r.useState)(!1),
          [eo, ec] = (0, r.useState)(!0),
          [eh, ed] = (0, r.useState)(!1),
          [em, ep] = (0, r.useState)(null),
          ef = (0, r.useMemo)(
            () => (null !== em ? em : l ? "#0a0a0a" : "#ffffff"),
            [l, em],
          );
        return (0, n.jsxs)("div", {
          children: [
            (0, n.jsx)(s.Bg, {}),
            (0, n.jsxs)(s.VX, {
              children: [
                (0, n.jsxs)(s.Ec, {
                  children: [
                    (0, n.jsx)(s.Ch, {
                      onRefresh: t,
                      minHeight: 520,
                      children: (0, n.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, n.jsx)(
                          w,
                          {
                            className: "h-full w-full",
                            rows: o,
                            rowHeight: h,
                            rowGap: m,
                            itemGap: f,
                            maxAspect: g,
                            minAspect: b,
                            maxFps: C,
                            tilt: M,
                            arch: E,
                            speed: k,
                            speedVariance: F,
                            alternate: eu,
                            autoScroll: L,
                            inertia: q,
                            damping: G,
                            dragSensitivity: z,
                            wheelSensitivity: W,
                            radius: V,
                            grayscale: Y,
                            focusRadius: X,
                            focusStrength: J,
                            brightness: K,
                            dpr: Z,
                            fade: et,
                            dim: en,
                            taper: ei,
                            backgroundColor: ef,
                            interactive: eo,
                            paused: eh,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, n.jsxs)(s.IH, {
                      children: [
                        (0, n.jsx)(s.W7, {
                          title: "Background",
                          value: ef,
                          onChange: ep,
                        }),
                        (0, n.jsx)(s.yt, {
                          title: "Rows",
                          min: 1,
                          max: 10,
                          step: 1,
                          value: o,
                          onChange: c,
                        }),
                        (0, n.jsx)(s.yt, {
                          title: "Row Height",
                          min: 48,
                          max: 180,
                          step: 2,
                          value: h,
                          onChange: d,
                        }),
                        (0, n.jsx)(s.yt, {
                          title: "Row Gap",
                          min: 0,
                          max: 60,
                          step: 1,
                          value: m,
                          onChange: p,
                        }),
                        (0, n.jsx)(s.yt, {
                          title: "Item Gap",
                          min: 0,
                          max: 60,
                          step: 1,
                          value: f,
                          onChange: v,
                        }),
                        (0, n.jsx)(s.yt, {
                          title: "Max Aspect",
                          min: 0.6,
                          max: 3,
                          step: 0.05,
                          value: g,
                          onChange: x,
                        }),
                        (0, n.jsx)(s.yt, {
                          title: "Min Aspect",
                          min: 0.3,
                          max: 1.6,
                          step: 0.05,
                          value: b,
                          onChange: S,
                        }),
                        (0, n.jsx)(s.yt, {
                          title: "Max FPS",
                          min: 15,
                          max: 120,
                          step: 5,
                          value: C,
                          onChange: j,
                        }),
                        (0, n.jsx)(s.yt, {
                          title: "Tilt",
                          min: -20,
                          max: 20,
                          step: 0.5,
                          value: M,
                          onChange: R,
                        }),
                        (0, n.jsx)(s.yt, {
                          title: "Arch",
                          min: -120,
                          max: 120,
                          step: 2,
                          value: E,
                          onChange: P,
                        }),
                        (0, n.jsx)(s.yt, {
                          title: "Speed",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: k,
                          onChange: A,
                        }),
                        (0, n.jsx)(s.yt, {
                          title: "Speed Variance",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: F,
                          onChange: H,
                        }),
                        (0, n.jsx)(s.yt, {
                          title: "Auto Scroll",
                          min: 0,
                          max: 160,
                          step: 2,
                          value: L,
                          onChange: I,
                        }),
                        (0, n.jsx)(s.yt, {
                          title: "Inertia",
                          min: 0,
                          max: 0.99,
                          step: 0.01,
                          value: q,
                          onChange: D,
                        }),
                        (0, n.jsx)(s.yt, {
                          title: "Damping",
                          min: 0.02,
                          max: 1,
                          step: 0.02,
                          value: G,
                          onChange: N,
                        }),
                        (0, n.jsx)(s.yt, {
                          title: "Drag Sensitivity",
                          min: 0,
                          max: 4,
                          step: 0.1,
                          value: z,
                          onChange: T,
                        }),
                        (0, n.jsx)(s.yt, {
                          title: "Wheel Sensitivity",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: W,
                          onChange: B,
                        }),
                        (0, n.jsx)(s.yt, {
                          title: "Radius",
                          min: 0,
                          max: 40,
                          step: 1,
                          value: V,
                          onChange: O,
                        }),
                        (0, n.jsx)(s.yt, {
                          title: "Grayscale",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: Y,
                          onChange: _,
                        }),
                        (0, n.jsx)(s.yt, {
                          title: "Focus Radius",
                          min: 0,
                          max: 600,
                          step: 10,
                          value: X,
                          onChange: U,
                        }),
                        (0, n.jsx)(s.yt, {
                          title: "Focus Strength",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: J,
                          onChange: $,
                        }),
                        (0, n.jsx)(s.yt, {
                          title: "Brightness",
                          min: 0.4,
                          max: 1.6,
                          step: 0.02,
                          value: K,
                          onChange: Q,
                        }),
                        (0, n.jsx)(s.yt, {
                          title: "DPR",
                          min: 0.75,
                          max: 1.5,
                          step: 0.05,
                          value: Z,
                          onChange: ee,
                        }),
                        (0, n.jsx)(s.yt, {
                          title: "Fade",
                          min: 0,
                          max: 0.5,
                          step: 0.01,
                          value: et,
                          onChange: ea,
                        }),
                        (0, n.jsx)(s.yt, {
                          title: "Dim",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: en,
                          onChange: er,
                        }),
                        (0, n.jsx)(s.yt, {
                          title: "Taper",
                          min: 0,
                          max: 0.6,
                          step: 0.02,
                          value: ei,
                          onChange: es,
                        }),
                        (0, n.jsx)(s.tl, {
                          title: "Alternate",
                          checked: eu,
                          onChange: el,
                        }),
                        (0, n.jsx)(s.tl, {
                          title: "Interactive",
                          checked: eo,
                          onChange: ec,
                        }),
                        (0, n.jsx)(s.tl, {
                          title: "Paused",
                          checked: eh,
                          onChange: ed,
                        }),
                      ],
                    }),
                    (0, n.jsx)(s.Ub, {
                      data: [
                        {
                          name: "images",
                          type: "string[]",
                          default: "10 stock photos",
                          description: "Image URLs spread across the reels.",
                        },
                        {
                          name: "rows",
                          type: "number",
                          default: "6",
                          description: "Number of stacked reels.",
                        },
                        {
                          name: "rowHeight",
                          type: "number",
                          default: "92",
                          description: "Height of every plate in pixels.",
                        },
                        {
                          name: "rowGap",
                          type: "number",
                          default: "20",
                          description:
                            "Vertical space between reels in pixels.",
                        },
                        {
                          name: "itemGap",
                          type: "number",
                          default: "16",
                          description:
                            "Horizontal space between plates in pixels.",
                        },
                        {
                          name: "maxAspect",
                          type: "number",
                          default: "2",
                          description:
                            "Widest a plate may get, as a multiple of its height.",
                        },
                        {
                          name: "minAspect",
                          type: "number",
                          default: "0.6",
                          description:
                            "Narrowest a plate may get, as a multiple of its height.",
                        },
                        {
                          name: "maxFps",
                          type: "number",
                          default: "60",
                          description:
                            "Highest frame rate the reels redraw at.",
                        },
                        {
                          name: "tilt",
                          type: "number",
                          default: "7",
                          description:
                            "Angle the whole stack leans by, in degrees.",
                        },
                        {
                          name: "arch",
                          type: "number",
                          default: "48",
                          description:
                            "How far each reel arches across the frame, in pixels.",
                        },
                        {
                          name: "speed",
                          type: "number",
                          default: "1",
                          description:
                            "Master multiplier on how far input travels.",
                        },
                        {
                          name: "speedVariance",
                          type: "number",
                          default: "0.55",
                          description:
                            "How much reel speeds differ from one another, 0 to 1.",
                        },
                        {
                          name: "alternate",
                          type: "boolean",
                          default: "false",
                          description:
                            "Send every other reel the opposite way.",
                        },
                        {
                          name: "autoScroll",
                          type: "number",
                          default: "26",
                          description:
                            "Pixels per second the reels drift on their own.",
                        },
                        {
                          name: "inertia",
                          type: "number",
                          default: "0.92",
                          description:
                            "How long a flick keeps gliding, 0 to 1.",
                        },
                        {
                          name: "damping",
                          type: "number",
                          default: "0.1",
                          description:
                            "How quickly the reels catch up to input, 0 to 1.",
                        },
                        {
                          name: "dragSensitivity",
                          type: "number",
                          default: "1.6",
                          description: "How far a drag pushes the reels.",
                        },
                        {
                          name: "wheelSensitivity",
                          type: "number",
                          default: "1",
                          description:
                            "How far a wheel notch pushes the reels.",
                        },
                        {
                          name: "radius",
                          type: "number",
                          default: "10",
                          description: "Corner radius of a plate in pixels.",
                        },
                        {
                          name: "grayscale",
                          type: "number",
                          default: "0.55",
                          description:
                            "How desaturated plates sit at rest, 0 to 1.",
                        },
                        {
                          name: "focusRadius",
                          type: "number",
                          default: "210",
                          description:
                            "Radius of the colour spotlight under the cursor, in pixels.",
                        },
                        {
                          name: "focusStrength",
                          type: "number",
                          default: "0.85",
                          description:
                            "How much the spotlight restores colour and light, 0 to 1.",
                        },
                        {
                          name: "brightness",
                          type: "number",
                          default: "1",
                          description: "Overall brightness of the plates.",
                        },
                        {
                          name: "dpr",
                          type: "number",
                          default: "1.25",
                          description: "Pixel ratio ceiling.",
                        },
                        {
                          name: "fade",
                          type: "number",
                          default: "0.12",
                          description:
                            "How far the left and right edges fade out, 0 to 0.5.",
                        },
                        {
                          name: "dim",
                          type: "number",
                          default: "0.35",
                          description: "How much the outer reels dim, 0 to 1.",
                        },
                        {
                          name: "taper",
                          type: "number",
                          default: "0.12",
                          description:
                            "How much the outer reels shrink, 0 to 1.",
                        },
                        {
                          name: "backgroundColor",
                          type: "string",
                          default: '"transparent"',
                          description: "Backdrop colour behind the reels.",
                        },
                        {
                          name: "interactive",
                          type: "boolean",
                          default: "true",
                          description:
                            "Let the wheel, drag and arrow keys drive the reels.",
                        },
                        {
                          name: "paused",
                          type: "boolean",
                          default: "false",
                          description: "Freeze the drift.",
                        },
                        {
                          name: "className",
                          type: "string",
                          default: "-",
                          description: "Extra classes for the wrapper.",
                        },
                        {
                          name: "children",
                          type: "ReactNode",
                          default: "-",
                          description: "Content layered above the reels.",
                        },
                      ],
                    }),
                  ],
                }),
                (0, n.jsx)(s.lT, { children: (0, n.jsx)(s.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
