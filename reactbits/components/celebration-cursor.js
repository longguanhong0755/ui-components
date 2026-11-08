/* ReactBits Pro public preview module 84134 for celebration-cursor.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/84134.bb16afc7f44b75e1.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  84134: (e, t, n) => {
    (n.r(t), n.d(t, { default: () => M }));
    var a = n(95155),
      r = n(12115),
      i = n(56388),
      s = n(86049),
      l = n(90761),
      o = n(90650);
    let u = ["rect", "square", "strip", "circle", "triangle"],
      d = 2 * Math.PI,
      c = (e, t, n) => Math.min(n, Math.max(t, e)),
      h = (e, t) => (Number.isFinite(e) ? e : t),
      p = null,
      f = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      m = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      y = (0, r.forwardRef)(function (
        {
          colors: e = ["#5227FF", "#FF9FFC", "#B19EEF"],
          shapes: t = ["rect", "strip", "circle"],
          size: n = 14,
          sizeVariance: i = 0.4,
          aspect: s = 0.55,
          density: l = 1,
          spread: y = 1,
          inherit: v = 0.25,
          gravity: b = 1,
          drag: x = 1,
          flutter: g = 1,
          spin: w = 1,
          wind: C = 0,
          turbulence: M = 0.5,
          life: F = 6,
          fade: S = 0.25,
          shading: j = 0.5,
          sheen: E = 0.35,
          opacity: P = 1,
          settle: A = !1,
          burst: k = !0,
          burstCount: z = 120,
          burstPower: T = 1,
          burstSpread: I = 70,
          maxPieces: B = 1800,
          autoplay: L = !1,
          autoplaySpeed: D = 1,
          idleDelay: N = 1.5,
          intro: R = !0,
          interactive: q = !0,
          disabled: V = !1,
          className: H,
          style: U,
          children: W,
        },
        X,
      ) {
        let Y = (0, r.useRef)(null),
          O = (0, r.useRef)(null),
          G = {
            colors: e,
            shapes: t,
            size: n,
            sizeVariance: i,
            aspect: s,
            density: l,
            spread: y,
            inherit: v,
            gravity: b,
            drag: x,
            flutter: g,
            spin: w,
            wind: C,
            turbulence: M,
            life: F,
            fade: S,
            shading: j,
            sheen: E,
            opacity: P,
            settle: A,
            burst: k,
            burstCount: z,
            burstPower: T,
            burstSpread: I,
            maxPieces: B,
            autoplay: L,
            autoplaySpeed: D,
            idleDelay: N,
            intro: R,
            interactive: q,
            disabled: V,
            reduced: (0, r.useSyncExternalStore)(f, m, () => !1),
          },
          $ = (0, r.useRef)(G);
        return (
          (0, r.useEffect)(() => {
            (($.current = G), O.current?.sync());
          }),
          (0, r.useEffect)(() => {
            let e = Y.current;
            if (!e) return;
            let t = ((e, t) => {
              let n,
                a = e.ownerDocument,
                r = a.defaultView ?? window,
                i = a.createElement("canvas");
              (i.setAttribute("aria-hidden", "true"),
                (i.style.cssText =
                  "position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;z-index:20"),
                e.appendChild(i));
              let s = i.getContext("2d");
              if (!s) return (i.remove(), null);
              let l = r.matchMedia("(pointer: fine)"),
                o =
                  ((n = 2904551),
                  () => {
                    let e = (n = (n + 0x6d2b79f5) >>> 0);
                    return (
                      (e = Math.imul(e ^ (e >>> 15), 1 | e)),
                      (((e ^= e + Math.imul(e ^ (e >>> 7), 61 | e)) ^
                        (e >>> 14)) >>>
                        0) /
                        0x100000000
                    );
                  }),
                f = [],
                m = [],
                y = [],
                v = "",
                b = 0,
                x = 0,
                g = 0,
                w = !1,
                C = !0,
                M = !1,
                F = 1,
                S = 1,
                j = 1,
                E = "none",
                P = !1,
                A = 0,
                k = { x: 0, y: 0, inside: !1, seen: !1, leftAt: -1e9 },
                z = { x: 0, y: 0, vx: 0, vy: 0, on: !1 },
                T = { x: 0, y: 0, at: 0, live: !1 },
                I = { clock: 0, phase: 40 * o(), ox: 0, oy: 0, nextBurst: 0 },
                B = () => {
                  let e = t.current;
                  return (
                    e.interactive && !e.disabled && !e.reduced && l.matches
                  );
                },
                L = () => {
                  let t = e.getBoundingClientRect(),
                    n = Math.max(1, t.width),
                    a = Math.max(1, t.height),
                    s = Math.min(r.devicePixelRatio || 1, 2);
                  (0.5 > Math.abs(n - F) &&
                    0.5 > Math.abs(a - S) &&
                    s === j &&
                    i.width > 1) ||
                    ((F = n),
                    (S = a),
                    (i.width = Math.max(1, Math.round(F * (j = s)))),
                    (i.height = Math.max(1, Math.round(S * j))),
                    (P = !0));
                },
                D = () => {
                  let n = t.current,
                    a =
                      Array.isArray(n.colors) && n.colors.length > 0
                        ? n.colors
                        : ["#5227FF", "#FF9FFC", "#B19EEF"],
                    i = "",
                    s = a.map((t) => {
                      let n = (t ?? "").trim();
                      return n && "currentcolor" !== n.toLowerCase()
                        ? n
                        : (i || (i = r.getComputedStyle(e).color), i);
                    }),
                    l = s.join("|");
                  l !== v &&
                    ((v = l),
                    (y = s.map((e) =>
                      ((e, t) => {
                        if (
                          "undefined" == typeof document ||
                          !e ||
                          ("undefined" != typeof CSS &&
                            "function" == typeof CSS.supports &&
                            !CSS.supports("color", e))
                        )
                          return t;
                        if (!p) {
                          let e = document.createElement("canvas");
                          ((e.width = 1),
                            (e.height = 1),
                            (p = e.getContext("2d", {
                              willReadFrequently: !0,
                            })));
                        }
                        if (!p) return t;
                        (p.clearRect(0, 0, 1, 1),
                          (p.fillStyle = "#000"),
                          (p.fillStyle = e),
                          p.fillRect(0, 0, 1, 1));
                        let n = p.getImageData(0, 0, 1, 1).data;
                        return { r: n[0], g: n[1], b: n[2] };
                      })(e, { r: 82, g: 39, b: 255 }),
                    )));
                },
                N = () => {
                  let e = (
                    Array.isArray(t.current.shapes) ? t.current.shapes : []
                  )
                    .map((e) => u.indexOf(e))
                    .filter((e) => e >= 0);
                  return e.length > 0 ? e : [0, 2, 3];
                },
                R = (e, n, a, r, i, s, l, u) => {
                  let p = t.current,
                    m = u[Math.floor(o() * u.length)] ?? 0,
                    v =
                      c(h(p.size, 14), 2, 60) *
                      (1 +
                        c(h(p.sizeVariance, 0.4), 0, 1) * (2 * o() - 1) * 0.6),
                    b = v * c(h(p.aspect, 0.55), 0.1, 1),
                    x = v;
                  1 === m
                    ? ((b = 0.72 * v), (x = 0.72 * v))
                    : 2 === m
                      ? ((b = 0.24 * v), (x = 1.9 * v))
                      : 3 === m
                        ? ((b = 0.8 * v), (x = 0.8 * v))
                        : 4 === m && ((b = 0.92 * v), (x = 0.86 * v));
                  let g = o(),
                    w = o() * d,
                    C = o() * d,
                    M = Math.sqrt(1 - g),
                    F = Math.sqrt(g),
                    S = o() * d,
                    j = Math.acos(2 * o() - 1),
                    E = c(h(p.spin, 1), 0, 4) * i * (3 + 6 * o());
                  f.push({
                    x: e,
                    y: n,
                    vx: a,
                    vy: r,
                    qw: F * Math.cos(C),
                    qx: M * Math.sin(w),
                    qy: M * Math.cos(w),
                    qz: F * Math.sin(C),
                    wx: Math.sin(j) * Math.cos(S) * E,
                    wy: Math.sin(j) * Math.sin(S) * E,
                    wz: Math.cos(j) * E,
                    w: b,
                    h: x,
                    shape: m,
                    tint: Math.floor(o() * Math.max(1, y.length)),
                    born: l,
                    life: c(h(p.life, 6), 0.5, 20) * (0.75 + 0.5 * o()),
                    free: s * (0.75 + 0.5 * o()),
                    landed: -1,
                  });
                },
                q = (e, n) => {
                  let a = t.current;
                  if (a.disabled || a.reduced) return;
                  let r = N(),
                    i = Math.round(c(e.count, 0, 600));
                  for (let t = 0; t < i; t++) {
                    let t = e.angle + (o() - 0.5) * e.spread,
                      a = e.power * (520 + 820 * Math.pow(o(), 0.8));
                    R(
                      e.x + (o() - 0.5) * 10,
                      e.y + (o() - 0.5) * 10,
                      Math.cos(t) * a,
                      Math.sin(t) * a,
                      1.7,
                      0.5,
                      n,
                      r,
                    );
                  }
                },
                V = (e, n, a, r) => {
                  let i = t.current;
                  !i.burst ||
                    i.disabled ||
                    i.reduced ||
                    m.push({
                      at: r,
                      x: e,
                      y: n,
                      angle: a,
                      count: c(h(i.burstCount, 120), 0, 600),
                      power: c(h(i.burstPower, 1), 0, 4),
                      spread: (c(h(i.burstSpread, 70), 0, 360) * Math.PI) / 180,
                    });
                },
                H = (e) => {
                  let n = t.current;
                  if (n.disabled || n.reduced) return;
                  let a = 0.9 * c(h(n.burstCount, 120), 0, 600),
                    r = c(h(n.burstPower, 1), 0, 4) * Math.sqrt(S / 520) * 1.38,
                    i = (50 * Math.PI) / 180;
                  (m.push({
                    at: e,
                    x: 0.02 * F,
                    y: S + 6,
                    angle: (-67 * Math.PI) / 180,
                    count: a,
                    power: r,
                    spread: i,
                  }),
                    m.push({
                      at: e + 0.09,
                      x: 0.98 * F,
                      y: S + 6,
                      angle: (-113 * Math.PI) / 180,
                      count: a,
                      power: r,
                      spread: i,
                    }));
                },
                U = (e) => {
                  let n = t.current,
                    a = 0.34 * F,
                    r = 0.26 * S,
                    i =
                      1.1 *
                        e *
                        c(
                          640 / Math.max(1, Math.hypot(1.24 * a, 0.88 * r)),
                          0.6,
                          4,
                        ) *
                        c(h(n.autoplaySpeed, 1), 0.1, 4) +
                      I.phase,
                    s = Math.exp(-e / 0.8);
                  return {
                    x:
                      F / 2 +
                      a *
                        (0.62 * Math.sin(0.83 * i + 0.3) +
                          0.38 * Math.sin(1.97 * i + 1.7)) +
                      I.ox * s,
                    y:
                      0.42 * S +
                      r *
                        (0.58 * Math.sin(1.13 * i + 2.1) +
                          0.42 * Math.sin(0.51 * i + 0.4)) +
                      I.oy * s,
                  };
                },
                W = () => {
                  w || !C || b || (b = r.requestAnimationFrame(X));
                };
              function X(e) {
                let n;
                if (((b = 0), w)) return;
                let a = t.current,
                  l = g ? c((e - g) / 1e3, 1 / 240, 1 / 24) : 1 / 60;
                g = e;
                let u = performance.now() / 1e3,
                  p =
                    (n = t.current).disabled || n.reduced
                      ? "none"
                      : B() && k.inside
                        ? "pointer"
                        : !n.autoplay ||
                            !M ||
                            (B() &&
                              k.seen &&
                              u - k.leftAt < Math.max(0, h(n.idleDelay, 1.5)))
                          ? "none"
                          : "ghost";
                (p !== E &&
                  ((e) => {
                    let t = E;
                    if (((E = e), (A = 0), "none" === e)) {
                      z.on = !1;
                      return;
                    }
                    if ("pointer" === e) {
                      (("none" !== t && z.on) ||
                        ((z.x = k.x), (z.y = k.y), (z.vx = 0), (z.vy = 0)),
                        (z.on = !0));
                      return;
                    }
                    ((I.clock = 0), (I.ox = 0), (I.oy = 0));
                    let n = U(0),
                      a = z.on ? z.x : -40,
                      r = z.on ? z.y : n.y;
                    ((I.ox = a - n.x),
                      (I.oy = r - n.y),
                      (I.nextBurst = 2.6 + 1.2 * o()),
                      z.on || ((z.x = a), (z.y = r), (z.vx = 0), (z.vy = 0)),
                      (z.on = !0));
                  })(p),
                  "ghost" === E &&
                    ((I.clock += l),
                    a.burst &&
                      I.clock >= I.nextBurst &&
                      ((I.nextBurst = I.clock + 4.2 + 1.8 * o()),
                      V(z.x, z.y, -Math.PI / 2 + (o() - 0.5) * 0.5, u))));
                let v =
                  "pointer" === E
                    ? { x: k.x, y: k.y }
                    : "ghost" === E
                      ? U(I.clock)
                      : null;
                if (v && z.on) {
                  let e = z.x,
                    n = z.y,
                    a = "pointer" === E ? 1 : 1 - Math.exp(-(26 * l));
                  ((z.x += (v.x - z.x) * a), (z.y += (v.y - z.y) * a));
                  let r = 1 - Math.exp(-l / 0.05);
                  ((z.vx += ((z.x - e) / l - z.vx) * r),
                    (z.vy += ((z.y - n) / l - z.vy) * r),
                    ((e, n, a, r, i) => {
                      let s = t.current,
                        l = Math.hypot(a - e, r - n);
                      if (l <= 0) return;
                      let u = Math.min(
                        Math.floor((A += (l * c(h(s.density, 1), 0, 6)) / 7)),
                        60,
                      );
                      if (((A -= Math.floor(A)), u <= 0)) return;
                      let p = N(),
                        f = c(h(s.spread, 1), 0, 4),
                        m = c(h(s.inherit, 0.25), 0, 1.5);
                      for (let t = 0; t < u; t++) {
                        let s = (t + o()) / u,
                          l = o() * d,
                          c = f * (40 + 120 * o());
                        R(
                          e + (a - e) * s,
                          n + (r - n) * s,
                          z.vx * m + Math.cos(l) * c,
                          z.vy * m + Math.sin(l) * c - 90 * f,
                          1,
                          0.08,
                          i,
                          p,
                        );
                      }
                    })(e, n, z.x, z.y, u));
                }
                for (let e = m.length - 1; e >= 0; e--)
                  m[e].at <= u && (q(m[e], u), m.splice(e, 1));
                if (
                  (((e, n) => {
                    let a = t.current,
                      r = 260 * c(h(a.gravity, 1), -2, 4),
                      i = 0.01 * c(h(a.drag, 1), 0.05, 5),
                      s = 0.0034 * c(h(a.flutter, 1), 0, 4),
                      l = 60 * h(a.wind, 0),
                      o = 70 * c(h(a.turbulence, 0.5), 0, 4),
                      u = a.settle,
                      d = S - 1,
                      p = 0;
                    for (let t = 0; t < f.length; t++) {
                      let a = f[t],
                        h = n - a.born;
                      if (
                        h >= a.life ||
                        (a.landed >= 0 && n - a.landed > 2) ||
                        a.x < -200 ||
                        a.x > F + 200 ||
                        a.y > S + 80 ||
                        a.y < -(2 * S)
                      )
                        continue;
                      if (((f[p++] = a), a.landed >= 0)) {
                        ((a.vx *= Math.exp(-(7 * e))), (a.x += a.vx * e));
                        continue;
                      }
                      let m = 0.5 * e,
                        { qw: y, qx: v, qy: b, qz: x, wx: g, wy: w, wz: C } = a,
                        M = y + m * (-g * v - w * b - C * x),
                        j = v + m * (g * y + w * x - C * b),
                        E = b + m * (w * y + C * v - g * x),
                        P = x + m * (C * y + g * b - w * v),
                        A = 1 / Math.hypot(M, j, E, P);
                      ((M *= A),
                        (j *= A),
                        (E *= A),
                        (P *= A),
                        (a.qw = M),
                        (a.qx = j),
                        (a.qy = E),
                        (a.qz = P));
                      let k = 2 * (j * P + M * E),
                        z = 2 * (E * P - M * j);
                      a.vy += r * e;
                      let T =
                          o *
                          Math.sin(0.0113 * a.y + 0.83 * n) *
                          Math.cos(0.0071 * a.x - 0.57 * n),
                        I = 0.35 * o * Math.cos(0.0097 * a.x + 0.71 * n),
                        B = l + T,
                        L = a.vx - B,
                        D = a.vy - I,
                        N = Math.hypot(L, D);
                      if (N > 0.001) {
                        let t = L / N,
                          n = D / N,
                          r = k * t + z * n,
                          l = Math.abs(r),
                          o = a.free > 0 ? c(h / a.free, 0, 1) : 1,
                          u =
                            1 /
                            (1 +
                              i *
                                (0.45 + 0.55 * l) *
                                (0.12 + 0.88 * o * o * (3 - 2 * o)) *
                                N *
                                e),
                          d = 0,
                          p = 0,
                          f = k - r * t,
                          m = z - r * n,
                          y = c(s * N * N * r, -2600, 2600);
                        ((d = -f * y),
                          (p = -m * y),
                          (a.vx = B + L * u + d * e),
                          (a.vy = I + D * u + p * e));
                      }
                      let R = Math.exp(-(0.35 * e));
                      ((a.wx *= R),
                        (a.wy *= R),
                        (a.wz *= R),
                        (a.x += a.vx * e),
                        (a.y += a.vy * e),
                        u &&
                          a.y >= d &&
                          a.vy > 0 &&
                          ((a.y = d),
                          (a.vy = 0),
                          (a.vx *= 0.45),
                          (a.landed = n)));
                    }
                    f.length = p;
                    let m = Math.round(c(h(a.maxPieces, 1800), 50, 8e3));
                    f.length > m && (f = f.slice(f.length - m));
                  })(l, u),
                  (f.length > 0 || P) &&
                    ((e) => {
                      let n = t.current;
                      if (
                        (s.setTransform(1, 0, 0, 1, 0, 0),
                        s.clearRect(0, 0, i.width, i.height),
                        0 === f.length)
                      ) {
                        P = !1;
                        return;
                      }
                      P = !0;
                      let a = c(h(n.shading, 0.5), 0, 1),
                        r = c(h(n.sheen, 0.35), 0, 1),
                        l = c(h(n.opacity, 1), 0, 1),
                        o = c(h(n.fade, 0.25), 0.02, 1),
                        u = 0.8 / j;
                      for (let t of f) {
                        let n = e - t.born,
                          i = c((t.life - n) / (t.life * o), 0, 1);
                        if (
                          (t.landed >= 0 &&
                            (i = Math.min(
                              i,
                              c(1 - (e - t.landed - 0.9) / 1.1, 0, 1),
                            )),
                          (i *= l * c(n / 0.06, 0, 1)) <= 0.01)
                        )
                          continue;
                        let { qw: h, qx: p, qy: f, qz: m } = t,
                          v = (1 - 2 * (f * f + m * m)) * t.w,
                          b = 2 * (p * f + h * m) * t.w,
                          x = 2 * (p * f - h * m) * t.h,
                          g = (1 - 2 * (p * p + m * m)) * t.h,
                          w = 2 * (p * m + h * f),
                          C = 2 * (f * m - h * p),
                          M = 1 - 2 * (p * p + f * f),
                          F = v * g - b * x,
                          S = Math.hypot(v, b),
                          E = Math.hypot(x, g);
                        if (S >= E && S > 1e-4) {
                          let e = Math.abs(F) / S;
                          if (e < u) {
                            let t = (u - e) * (F >= 0 ? 1 : -1);
                            ((x += (-b / S) * t), (g += (v / S) * t));
                          }
                        } else if (E > 1e-4) {
                          let e = Math.abs(F) / E;
                          if (e < u) {
                            let t = (u - e) * (F >= 0 ? 1 : -1);
                            ((v += (g / E) * t), (b += (-x / E) * t));
                          }
                        }
                        let P =
                            (1 - a * (1 - Math.abs(M))) * (M < 0 ? 0.88 : 1),
                          A =
                            r *
                            Math.pow(
                              Math.max(
                                0,
                                (M < 0 ? -1 : 1) *
                                  (-0.42 * w + -0.58 * C + 0.7 * M),
                              ),
                              14,
                            ) *
                            0.65,
                          k = y[t.tint] ?? y[0] ?? { r: 82, g: 39, b: 255 },
                          z = k.r * P,
                          T = k.g * P,
                          I = k.b * P;
                        ((s.globalAlpha = i),
                          (s.fillStyle = `rgb(${Math.round(z + (255 - z) * A)},${Math.round(T + (255 - T) * A)},${Math.round(I + (255 - I) * A)})`),
                          s.setTransform(
                            j * v,
                            j * b,
                            j * x,
                            j * g,
                            j * t.x,
                            j * t.y,
                          ),
                          3 === t.shape
                            ? (s.beginPath(), s.arc(0, 0, 0.5, 0, d), s.fill())
                            : 4 === t.shape
                              ? (s.beginPath(),
                                s.moveTo(0, -0.5),
                                s.lineTo(0.5, 0.42),
                                s.lineTo(-0.5, 0.42),
                                s.closePath(),
                                s.fill())
                              : s.fillRect(-0.5, -0.5, 1, 1));
                      }
                      s.globalAlpha = 1;
                    })(u),
                  "none" !== E || f.length > 0 || m.length > 0)
                )
                  return void W();
                g = 0;
                let C = k.leftAt + Math.max(0, h(a.idleDelay, 1.5));
                a.autoplay &&
                  !a.reduced &&
                  !a.disabled &&
                  M &&
                  k.seen &&
                  !k.inside &&
                  C > u &&
                  (x && r.clearTimeout(x),
                  (x = r.setTimeout(
                    () => {
                      ((x = 0), W());
                    },
                    (C - u) * 1e3 + 20,
                  )));
              }
              let Y = (t, n) => {
                  let a = e.getBoundingClientRect();
                  ((k.x = t - a.left), (k.y = n - a.top));
                },
                O = (e) => {
                  "touch" !== e.pointerType &&
                    B() &&
                    (Y(e.clientX, e.clientY),
                    (k.inside = !0),
                    (k.seen = !0),
                    W());
                },
                G = (e) => {
                  "touch" !== e.pointerType &&
                    k.inside &&
                    ((k.inside = !1),
                    (k.leftAt = performance.now() / 1e3),
                    W());
                },
                $ = (e) => {
                  let n = t.current;
                  if (!n.burst || n.disabled || n.reduced || !n.interactive)
                    return;
                  if ("touch" === e.pointerType) {
                    ((T.x = e.clientX),
                      (T.y = e.clientY),
                      (T.at = performance.now() / 1e3),
                      (T.live = !0));
                    return;
                  }
                  if (!B() || 0 !== e.button) return;
                  Y(e.clientX, e.clientY);
                  let a = c(z.vx / 2400, -0.45, 0.45);
                  (V(k.x, k.y, -Math.PI / 2 + a, performance.now() / 1e3), W());
                },
                _ = (t) => {
                  if (
                    "touch" !== t.pointerType ||
                    !T.live ||
                    ((T.live = !1),
                    Math.hypot(t.clientX - T.x, t.clientY - T.y) > 10 ||
                      performance.now() / 1e3 - T.at > 0.35)
                  )
                    return;
                  let n = e.getBoundingClientRect();
                  (V(
                    t.clientX - n.left,
                    t.clientY - n.top,
                    -Math.PI / 2,
                    performance.now() / 1e3,
                  ),
                    W());
                },
                J = () => {
                  (k.inside &&
                    ((k.inside = !1), (k.leftAt = performance.now() / 1e3)),
                    (T.live = !1),
                    W());
                };
              (e.addEventListener("pointermove", O, { passive: !0 }),
                e.addEventListener("pointerover", O, { passive: !0 }),
                e.addEventListener("pointerleave", G),
                e.addEventListener("pointercancel", G),
                e.addEventListener("pointerdown", $, { passive: !0 }),
                r.addEventListener("pointerup", _, { passive: !0 }),
                r.addEventListener("blur", J),
                l.addEventListener("change", J));
              let K = new ResizeObserver(() => {
                (L(), W());
              });
              K.observe(e);
              let Q = new IntersectionObserver(([e]) => {
                if ((C = e.isIntersecting)) {
                  if (((g = 0), L(), !M)) {
                    M = !0;
                    let e = t.current;
                    !e.intro ||
                      e.reduced ||
                      e.disabled ||
                      H(performance.now() / 1e3 + 0.15);
                  }
                  W();
                } else b && (r.cancelAnimationFrame(b), (b = 0));
              });
              return (
                Q.observe(e),
                L(),
                D(),
                {
                  sync: () => {
                    (D(), L(), W());
                  },
                  burst: (e, t, n) => {
                    (V(
                      "number" == typeof e && Number.isFinite(e)
                        ? e
                        : z.on
                          ? z.x
                          : F / 2,
                      "number" == typeof t && Number.isFinite(t)
                        ? t
                        : z.on
                          ? z.y
                          : S / 2,
                      "number" == typeof n && Number.isFinite(n)
                        ? (n * Math.PI) / 180
                        : -Math.PI / 2,
                      performance.now() / 1e3,
                    ),
                      W());
                  },
                  cannons: () => {
                    (H(performance.now() / 1e3), W());
                  },
                  clear: () => {
                    ((f = []),
                      (m.length = 0),
                      s.setTransform(1, 0, 0, 1, 0, 0),
                      s.clearRect(0, 0, i.width, i.height),
                      (P = !1),
                      W());
                  },
                  destroy: () => {
                    ((w = !0),
                      b && r.cancelAnimationFrame(b),
                      x && r.clearTimeout(x),
                      K.disconnect(),
                      Q.disconnect(),
                      e.removeEventListener("pointermove", O),
                      e.removeEventListener("pointerover", O),
                      e.removeEventListener("pointerleave", G),
                      e.removeEventListener("pointercancel", G),
                      e.removeEventListener("pointerdown", $),
                      r.removeEventListener("pointerup", _),
                      r.removeEventListener("blur", J),
                      l.removeEventListener("change", J),
                      i.remove());
                  },
                }
              );
            })(e, $);
            return (
              (O.current = t),
              () => {
                (t?.destroy(), (O.current = null));
              }
            );
          }, []),
          (0, r.useImperativeHandle)(
            X,
            () => ({
              burst: (e, t, n) => O.current?.burst(e, t, n),
              cannons: () => O.current?.cannons(),
              clear: () => O.current?.clear(),
            }),
            [],
          ),
          (0, a.jsx)("div", {
            ref: Y,
            className: (0, o.cn)(
              "relative isolate h-full min-h-[240px] w-full overflow-hidden",
              H,
            ),
            style: U,
            children:
              W &&
              (0, a.jsx)("div", {
                className: "relative z-10 h-full w-full",
                children: W,
              }),
          })
        );
      });
    y.displayName = "CelebrationCursor";
    let v = {
        mixed: ["rect", "strip", "circle"],
        paper: ["rect", "square"],
        strips: ["strip"],
        circles: ["circle"],
        triangles: ["triangle"],
        all: ["rect", "square", "strip", "circle", "triangle"],
      },
      b = [
        { label: "Mixed", value: "mixed" },
        { label: "Paper", value: "paper" },
        { label: "Strips", value: "strips" },
        { label: "Circles", value: "circles" },
        { label: "Triangles", value: "triangles" },
        { label: "All", value: "all" },
      ],
      x = {
        dark: ["#5227FF", "#FF9FFC", "#B19EEF"],
        light: ["#5227FF", "#E9408A", "#8B5CF6"],
        shapes: "mixed",
        size: 14,
        sizeVariance: 0.4,
        aspect: 0.55,
        density: 1,
        spread: 1,
        inherit: 0.25,
        gravity: 1,
        drag: 1,
        flutter: 1,
        spin: 1,
        wind: 0,
        turbulence: 0.5,
        life: 6,
        fade: 0.25,
        shading: 0.5,
        sheen: 0.35,
        burstCount: 120,
        burstPower: 1,
        burstSpread: 70,
        settle: !1,
      },
      g = {
        party: x,
        mono: {
          ...x,
          dark: ["#FAFAFA", "#A3A3A3", "#525252"],
          light: ["#0A0A0A", "#737373", "#D4D4D4"],
          shapes: "paper",
          size: 13,
          shading: 0.6,
          sheen: 0.2,
        },
        citrus: {
          ...x,
          dark: ["#FF7A27", "#FFC53D", "#FF4D8D"],
          light: ["#F2620F", "#E8A400", "#E23A78"],
          shapes: "all",
          size: 13,
          burstCount: 150,
          burstPower: 1.1,
          settle: !0,
        },
        ribbons: {
          ...x,
          dark: ["#B19EEF", "#FF9FFC", "#FFFFFF"],
          light: ["#5227FF", "#C33AB8", "#8B5CF6"],
          shapes: "strips",
          size: 20,
          sizeVariance: 0.3,
          gravity: 0.8,
          drag: 1.2,
          flutter: 1.6,
          spin: 0.6,
          burstCount: 90,
        },
        flurry: {
          ...x,
          dark: ["#FFFFFF", "#E0E7FF", "#C7D2FE"],
          light: ["#334155", "#64748B", "#94A3B8"],
          shapes: "circles",
          size: 10,
          sizeVariance: 0.6,
          density: 0.7,
          gravity: 0.55,
          flutter: 0.6,
          spin: 0.35,
          wind: 0.3,
          turbulence: 1.2,
          life: 7,
          sheen: 0.15,
          burstCount: 80,
          burstPower: 0.85,
        },
      },
      w = [
        { label: "Party", value: "party" },
        { label: "Mono", value: "mono" },
        { label: "Citrus", value: "citrus" },
        { label: "Ribbons", value: "ribbons" },
        { label: "Flurry", value: "flurry" },
      ],
      C = [
        {
          name: "colors",
          type: "string[]",
          default: '["#5227FF", "#FF9FFC", "#B19EEF"]',
          description:
            "Paper colours. Each piece picks one at random. Accepts any CSS colour, including currentColor.",
        },
        {
          name: "shapes",
          type: '("rect" | "square" | "strip" | "circle" | "triangle")[]',
          default: '["rect", "strip", "circle"]',
          description:
            "Shapes to cut the confetti in. Each piece picks one at random.",
        },
        {
          name: "size",
          type: "number",
          default: "14",
          description:
            "Length of a piece in pixels. Squares, strips and circles are proportioned from it.",
        },
        {
          name: "sizeVariance",
          type: "number",
          default: "0.4",
          description:
            "Random variation in piece size, from 0 (all the same) to 1.",
        },
        {
          name: "aspect",
          type: "number",
          default: "0.55",
          description: "Width of a rectangle relative to its length.",
        },
        {
          name: "density",
          type: "number",
          default: "1",
          description:
            "Pieces spilled per distance the pointer travels. 0 turns the trail off and keeps only bursts.",
        },
        {
          name: "spread",
          type: "number",
          default: "1",
          description:
            "How hard trail pieces are tossed when they leave the pointer.",
        },
        {
          name: "inherit",
          type: "number",
          default: "0.25",
          description:
            "How much of the pointer's speed trail pieces carry with them.",
        },
        {
          name: "gravity",
          type: "number",
          default: "1",
          description:
            "Strength of gravity. Negative values make the confetti rise.",
        },
        {
          name: "drag",
          type: "number",
          default: "1",
          description:
            "Air resistance. Each piece feels more of it when it falls flat than when it falls edge first.",
        },
        {
          name: "flutter",
          type: "number",
          default: "1",
          description:
            "How strongly tilted pieces glide sideways as they fall, which makes them swing and flutter.",
        },
        {
          name: "spin",
          type: "number",
          default: "1",
          description: "How fast the pieces tumble.",
        },
        {
          name: "wind",
          type: "number",
          default: "0",
          description:
            "A steady sideways breeze, in steps of 60px per second. Negative values blow to the left.",
        },
        {
          name: "turbulence",
          type: "number",
          default: "0.5",
          description:
            "Gentle gusts that drift the confetti around as it falls.",
        },
        {
          name: "life",
          type: "number",
          default: "6",
          description: "Seconds a piece lasts before it has faded away.",
        },
        {
          name: "fade",
          type: "number",
          default: "0.25",
          description: "Share of a piece's life spent fading out at the end.",
        },
        {
          name: "shading",
          type: "number",
          default: "0.5",
          description:
            "How much darker a piece looks as it turns edge-on, from 0 (flat colour) to 1.",
        },
        {
          name: "sheen",
          type: "number",
          default: "0.35",
          description:
            "Soft light that catches a piece as it turns toward the light, from 0 to 1.",
        },
        {
          name: "opacity",
          type: "number",
          default: "1",
          description: "Overall opacity of the confetti, from 0 to 1.",
        },
        {
          name: "settle",
          type: "boolean",
          default: "false",
          description:
            "Let pieces land on the bottom edge and rest for a moment before they fade, instead of falling out of view.",
        },
        {
          name: "burst",
          type: "boolean",
          default: "true",
          description:
            "Click or tap to fire a burst of confetti that shoots up and flutters down.",
        },
        {
          name: "burstCount",
          type: "number",
          default: "120",
          description:
            "Pieces in one burst. The intro cannons fire a little less than this each.",
        },
        {
          name: "burstPower",
          type: "number",
          default: "1",
          description: "How high and far a burst throws the confetti.",
        },
        {
          name: "burstSpread",
          type: "number",
          default: "70",
          description: "Width of a burst's cone in degrees.",
        },
        {
          name: "maxPieces",
          type: "number",
          default: "1800",
          description:
            "Upper limit on pieces in flight. The oldest give way first.",
        },
        {
          name: "autoplay",
          type: "boolean",
          default: "false",
          description:
            "Spill confetti along flowing curves on its own while the pointer is away, with the odd burst. The pointer takes over the moment it enters.",
        },
        {
          name: "autoplaySpeed",
          type: "number",
          default: "1",
          description: "Speed multiplier for autoplay.",
        },
        {
          name: "idleDelay",
          type: "number",
          default: "1.5",
          description:
            "Seconds after the pointer leaves before autoplay resumes.",
        },
        {
          name: "intro",
          type: "boolean",
          default: "true",
          description:
            "Fire two cannons from the bottom corners the first time the component scrolls into view.",
        },
        {
          name: "interactive",
          type: "boolean",
          default: "true",
          description:
            "Follow the visitor's pointer. Turn it off to show only autoplay, the intro and scripted bursts.",
        },
        {
          name: "disabled",
          type: "boolean",
          default: "false",
          description:
            "Stop spilling confetti and ignore input. Pieces already in the air fall and fade.",
        },
        {
          name: "ref",
          type: "{ burst, cannons, clear }",
          default: "—",
          description:
            "burst(x?, y?, angle?) fires a burst at a point in pixels, aimed at an angle in degrees (-90 is straight up). cannons() fires the intro cannons again. clear() removes every piece.",
        },
        {
          name: "children",
          type: "ReactNode",
          default: "—",
          description: "Content the confetti falls over.",
        },
        {
          name: "className",
          type: "string",
          default: "—",
          description:
            "Classes for the root element. It fills its parent and is at least 240px tall.",
        },
        {
          name: "style",
          type: "CSSProperties",
          default: "—",
          description: "Inline styles for the root element.",
        },
      ],
      M = () => {
        let [e, t] = (0, l.I)(),
          n = "dark" === (0, s.Y)(),
          [o, u] = (0, r.useState)("party"),
          [d, c] = (0, r.useState)(x),
          h = (e) => (t) => c((n) => ({ ...n, [e]: t })),
          [p, f] = (0, r.useState)(null),
          m = p ?? (n ? d.dark : d.light),
          [M, F] = (0, r.useState)(1),
          [S, j] = (0, r.useState)(!0),
          [E, P] = (0, r.useState)(!0),
          [A, k] = (0, r.useState)(1),
          [z, T] = (0, r.useState)(1.5),
          [I, B] = (0, r.useState)(!0),
          [L, D] = (0, r.useState)(!0),
          [N, R] = (0, r.useState)(!1),
          q = (e) => (t) => {
            let n = [m[0], m[1], m[2]];
            ((n[e] = t), f(n));
          };
        return (0, a.jsxs)("div", {
          children: [
            (0, a.jsx)(i.Bg, {}),
            (0, a.jsxs)(i.VX, {
              children: [
                (0, a.jsxs)(i.Ec, {
                  children: [
                    (0, a.jsx)(i.Ch, {
                      onRefresh: t,
                      minHeight: 560,
                      enableResponsive: !0,
                      children: (0, a.jsx)("div", {
                        className: `relative h-full w-full ${n ? "bg-[#0A0A0A]" : "bg-white"}`,
                        children: (0, a.jsx)(
                          y,
                          {
                            colors: m,
                            shapes: v[d.shapes] ?? v.mixed,
                            size: d.size,
                            sizeVariance: d.sizeVariance,
                            aspect: d.aspect,
                            density: d.density,
                            spread: d.spread,
                            inherit: d.inherit,
                            gravity: d.gravity,
                            drag: d.drag,
                            flutter: d.flutter,
                            spin: d.spin,
                            wind: d.wind,
                            turbulence: d.turbulence,
                            life: d.life,
                            fade: d.fade,
                            shading: d.shading,
                            sheen: d.sheen,
                            opacity: M,
                            settle: d.settle,
                            burst: S,
                            burstCount: d.burstCount,
                            burstPower: d.burstPower,
                            burstSpread: d.burstSpread,
                            autoplay: E,
                            autoplaySpeed: A,
                            idleDelay: z,
                            intro: I,
                            interactive: L,
                            disabled: N,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, a.jsxs)(i.IH, {
                      children: [
                        (0, a.jsx)(i.bg, {
                          title: "Preset",
                          value: o,
                          options: w,
                          onChange: (e) => {
                            (u(e), c(g[e] ?? x), f(null), t());
                          },
                        }),
                        (0, a.jsx)(i.W7, {
                          title: "First Colour",
                          value: m[0],
                          onChange: q(0),
                        }),
                        (0, a.jsx)(i.W7, {
                          title: "Second Colour",
                          value: m[1],
                          onChange: q(1),
                        }),
                        (0, a.jsx)(i.W7, {
                          title: "Third Colour",
                          value: m[2],
                          onChange: q(2),
                        }),
                        (0, a.jsx)(i.bg, {
                          title: "Shapes",
                          value: d.shapes,
                          options: b,
                          onChange: h("shapes"),
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Size",
                          min: 4,
                          max: 32,
                          step: 0.5,
                          value: d.size,
                          valueUnit: "px",
                          onChange: h("size"),
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Size Variance",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: d.sizeVariance,
                          onChange: h("sizeVariance"),
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Aspect",
                          min: 0.15,
                          max: 1,
                          step: 0.05,
                          value: d.aspect,
                          onChange: h("aspect"),
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Density",
                          min: 0,
                          max: 4,
                          step: 0.1,
                          value: d.density,
                          onChange: h("density"),
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Spread",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: d.spread,
                          onChange: h("spread"),
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Inherit",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: d.inherit,
                          onChange: h("inherit"),
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Gravity",
                          min: -1,
                          max: 3,
                          step: 0.05,
                          value: d.gravity,
                          onChange: h("gravity"),
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Drag",
                          min: 0.2,
                          max: 3,
                          step: 0.05,
                          value: d.drag,
                          onChange: h("drag"),
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Flutter",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: d.flutter,
                          onChange: h("flutter"),
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Spin",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: d.spin,
                          onChange: h("spin"),
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Wind",
                          min: -3,
                          max: 3,
                          step: 0.1,
                          value: d.wind,
                          onChange: h("wind"),
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Turbulence",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: d.turbulence,
                          onChange: h("turbulence"),
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Life",
                          min: 1,
                          max: 12,
                          step: 0.25,
                          value: d.life,
                          valueUnit: "s",
                          onChange: h("life"),
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Fade",
                          min: 0.05,
                          max: 1,
                          step: 0.05,
                          value: d.fade,
                          onChange: h("fade"),
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Shading",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: d.shading,
                          onChange: h("shading"),
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Sheen",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: d.sheen,
                          onChange: h("sheen"),
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Opacity",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: M,
                          onChange: F,
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Burst Count",
                          min: 10,
                          max: 400,
                          step: 10,
                          value: d.burstCount,
                          onChange: h("burstCount"),
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Burst Power",
                          min: 0.2,
                          max: 2.5,
                          step: 0.05,
                          value: d.burstPower,
                          onChange: h("burstPower"),
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Burst Spread",
                          min: 10,
                          max: 180,
                          step: 5,
                          value: d.burstSpread,
                          valueUnit: "\xb0",
                          onChange: h("burstSpread"),
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Autoplay Speed",
                          min: 0.2,
                          max: 3,
                          step: 0.05,
                          value: A,
                          onChange: k,
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Idle Delay",
                          min: 0,
                          max: 6,
                          step: 0.25,
                          value: z,
                          valueUnit: "s",
                          onChange: T,
                        }),
                        (0, a.jsx)(i.tl, {
                          title: "Settle",
                          checked: d.settle,
                          onChange: h("settle"),
                        }),
                        (0, a.jsx)(i.tl, {
                          title: "Burst",
                          checked: S,
                          onChange: j,
                        }),
                        (0, a.jsx)(i.tl, {
                          title: "Autoplay",
                          checked: E,
                          onChange: P,
                        }),
                        (0, a.jsx)(i.tl, {
                          title: "Intro",
                          checked: I,
                          onChange: B,
                        }),
                        (0, a.jsx)(i.tl, {
                          title: "Interactive",
                          checked: L,
                          onChange: D,
                        }),
                        (0, a.jsx)(i.tl, {
                          title: "Disabled",
                          checked: N,
                          onChange: R,
                        }),
                      ],
                    }),
                    (0, a.jsx)(i.Ub, { data: C }),
                  ],
                }),
                (0, a.jsx)(i.lT, { children: (0, a.jsx)(i.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
