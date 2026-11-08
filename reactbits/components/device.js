/* ReactBits Pro public preview module 30038 for device.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/30038.d49d3fd7afda1f3f.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  30038: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => er }));
    var n = a(95155),
      i = a(12115),
      r = a(56388),
      l = a(86049),
      s = a(90761),
      o = a(37377),
      c = a(54656),
      d = a(39551),
      h = a(90650);
    let u = "max(0.2cqmin, 1px)",
      m = {
        titanium: ["#9C978F", "#EDEAE4"],
        black: ["#38383B", "#A6A6AB"],
        silver: ["#CBCAC6", "#FDFDFB"],
        gold: ["#B4937A", "#F4E2CF"],
        blue: ["#2F3B55", "#95A5C5"],
      },
      p = {
        titanium: m.titanium[0],
        black: m.black[0],
        silver: m.silver[0],
        gold: m.gold[0],
        blue: m.blue[0],
      },
      f =
        "pointer-events-none absolute left-1/2 top-1/2 -ml-[50cqmin] -mt-[104.6cqmin] h-[209.2cqmin] w-[100cqmin] rounded-[17.9cqmin] bg-[var(--device-shadow)] will-change-transform",
      b = (e, t, a) => Math.min(a, Math.max(t, e)),
      g = (e, t) => ("number" == typeof e && Number.isFinite(e) ? e : t),
      v = (e) => (5e-4 > Math.abs(e) ? "0" : e.toFixed(3)),
      y = (e) => (e * Math.PI) / 180,
      x = (e, t, a) => {
        let n = b((a - e) / (t - e), 0, 1);
        return n * n * (3 - 2 * n);
      },
      w = (e, t, a, n) => e + (t - e) * (1 - Math.exp(-a / n)),
      M = (e, t, a, n, i) => {
        let r = e - a,
          l = Math.exp(-n * i),
          s = t + n * r;
        return [a + (r + s * i) * l, (t - n * s * i) * l];
      },
      $ = (e, t, a) => {
        let n = e - t,
          i = Math.max(n >= 0 ? a - t : a + t, 1);
        return t + Math.sign(n) * i * Math.tanh(Math.abs(n) / i);
      },
      k = (e, t, a) => {
        let n = Math.abs(e);
        return n <= t
          ? e
          : Math.sign(e) * (t + (a - t) * Math.tanh((n - t) / (a - t)));
      },
      q = (e, t, a) => {
        let n = Math.hypot(e, t, a) || 1;
        return [e / n, t / n, a / n];
      },
      j = [
        {
          d: q(-0.6, -0.55, 0.58),
          w: 1.6,
          lo: Math.cos(y(42)),
          hi: Math.cos(y(10)),
        },
        {
          d: q(0.92, -0.18, -0.35),
          w: 1.7,
          lo: Math.cos(y(26)),
          hi: Math.cos(y(5)),
        },
        {
          d: q(-0.95, 0.05, -0.3),
          w: 1.1,
          lo: Math.cos(y(28)),
          hi: Math.cos(y(6)),
        },
        {
          d: q(0.15, -0.97, 0.18),
          w: 1.3,
          lo: Math.cos(y(38)),
          hi: Math.cos(y(12)),
        },
      ],
      C = j[0].d,
      S = (e) =>
        e <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4),
      E = (e) =>
        e <= 0.0031308 ? 12.92 * e : 1.055 * Math.pow(e, 1 / 2.4) - 0.055,
      N = ([e, t, a]) => {
        let n = S(e),
          i = S(t),
          r = S(a),
          l = Math.cbrt(0.4122214708 * n + 0.5363325363 * i + 0.0514459929 * r),
          s = Math.cbrt(0.2119034982 * n + 0.6806995451 * i + 0.1073969566 * r),
          o = Math.cbrt(0.0883024619 * n + 0.2817188376 * i + 0.6299787005 * r);
        return [
          0.2104542553 * l + 0.793617785 * s - 0.0040720468 * o,
          1.9779984951 * l - 2.428592205 * s + 0.4505937099 * o,
          0.0259040371 * l + 0.7827717662 * s - 0.808675766 * o,
        ];
      },
      I = ([e, t, a]) => {
        let n = (e + 0.3963377774 * t + 0.2158037573 * a) ** 3,
          i = (e - 0.1055613458 * t - 0.0638541728 * a) ** 3,
          r = (e - 0.0894841775 * t - 1.291485548 * a) ** 3;
        return [
          E(4.0767416621 * n - 3.3077115913 * i + 0.2309699292 * r),
          E(-1.2684380046 * n + 2.6097574011 * i - 0.3413193965 * r),
          E(-0.0041960863 * n - 0.7034186147 * i + 1.707614701 * r),
        ];
      },
      P = (e, t, a) => [
        e[0] + (t[0] - e[0]) * a,
        e[1] + (t[1] - e[1]) * a,
        e[2] + (t[2] - e[2]) * a,
      ],
      z = (e, t, a) => {
        let n = e.trim(),
          i = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(n);
        if (i) return [1, 2, 3].map((e) => parseInt(i[e] + i[e], 16) / 255);
        let r =
          /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i.exec(n);
        if (r) return [1, 2, 3].map((e) => parseInt(r[e], 16) / 255);
        try {
          let e = t.createElement("canvas");
          ((e.width = 1), (e.height = 1));
          let i = e.getContext("2d", { willReadFrequently: !0 });
          if (
            !i ||
            ((i.fillStyle = "#010203"),
            (i.fillStyle = n),
            "#010203" === i.fillStyle)
          )
            return a;
          i.fillRect(0, 0, 1, 1);
          let r = i.getImageData(0, 0, 1, 1).data;
          return [r[0] / 255, r[1] / 255, r[2] / 255];
        } catch {
          return a;
        }
      },
      L = (e) =>
        Array.from({ length: 64 }, (t, a) => {
          let n,
            i = a / 63,
            r = 0;
          for (; r < e.length - 2 && i > e[r + 1][0];) r++;
          let [l, s] = e[r],
            [o, c] = e[r + 1];
          return (
            (n = I(P(s, c, b((i - l) / (o - l), 0, 1)))),
            `#${n
              .map((e) =>
                Math.round(255 * b(e, 0, 1))
                  .toString(16)
                  .padStart(2, "0"),
              )
              .join("")}`
          );
        }),
      T = L(
        [
          [0, [0.012, 0.016, 0.02]],
          [0.3, [0.04, 0.047, 0.063]],
          [0.6, [0.09, 0.1, 0.133]],
          [0.85, [0.235, 0.259, 0.314]],
          [1, [0.553, 0.584, 0.651]],
        ].map(([e, t]) => [e, N(t)]),
      ),
      X = (e, t) =>
        e[
          Math.round(
            b(1 - Math.exp(-(1.4 * Math.max(t, 0))), 0, 1) * (e.length - 1),
          )
        ],
      R = [
        { side: -1, top: 36, length: 8 },
        { side: -1, top: 54, length: 15 },
        { side: -1, top: 75, length: 15 },
        { side: 1, top: 58, length: 23 },
      ],
      Y = (() => {
        let e = [],
          t = (t, a, n, i, r, l, s, o = 0) => {
            e.push({
              key: t,
              kind: a,
              x: n,
              y: i,
              angle: s,
              length: r,
              sweep: o,
              style: {
                width: `${v(r)}cqmin`,
                height: `${v(l)}cqmin`,
                marginLeft: `${v(-r / 2)}cqmin`,
                marginTop: `${v(-l / 2)}cqmin`,
                transform: `translate3d(${v(n)}cqmin, ${v(i)}cqmin, 0) rotateZ(${v(s - 90)}deg) rotateX(-90deg)`,
              },
            });
          };
        for (let e of [
          {
            name: "left",
            x: 0,
            y: 0,
            dx: 0,
            dy: 1,
            span: 209.2 - 35.8,
            count: 8,
            angle: 180,
          },
          {
            name: "right",
            x: 100,
            y: 0,
            dx: 0,
            dy: 1,
            span: 209.2 - 35.8,
            count: 8,
            angle: 0,
          },
          {
            name: "top",
            x: 0,
            y: 0,
            dx: 1,
            dy: 0,
            span: 64.2,
            count: 4,
            angle: 270,
          },
          {
            name: "bottom",
            x: 0,
            y: 209.2,
            dx: 1,
            dy: 0,
            span: 64.2,
            count: 4,
            angle: 90,
          },
        ]) {
          let a = e.span / e.count;
          for (let n = 0; n < e.count; n++) {
            let i = 17.9 + (n + 0.5) * a;
            t(
              `${e.name}-${n}`,
              "band",
              e.dx ? i : e.x,
              e.dy ? i : e.y,
              a + 0.3,
              11.5,
              e.angle,
            );
          }
        }
        let a = 35.8 * Math.tan(y(3.75)) + 0.45;
        return (
          [
            [17.9, 17.9, 180],
            [82.1, 17.9, 270],
            [82.1, 209.2 - 17.9, 0],
            [17.9, 209.2 - 17.9, 90],
          ].forEach(([e, n, i], r) => {
            for (let l = 0; l < 12; l++) {
              let s = i + (l + 0.5) * 7.5;
              t(
                `arc-${r}-${l}`,
                "band",
                e + 17.9 * Math.cos(y(s)),
                n + 17.9 * Math.sin(y(s)),
                a,
                11.5,
                s,
                7.5,
              );
            }
          }),
          R.forEach(({ side: e, top: a, length: n }, i) => {
            let r = e < 0 ? -0.45 : 100.45;
            (t(
              `key-${i}`,
              "key",
              e < 0 ? -0.9 : 100.9,
              a + n / 2,
              n,
              4.2,
              180 * (e < 0),
            ),
              t(`cap-${i}-top`, "cap", r, a + 0.02, 1, 4.2, 270),
              t(`cap-${i}-bottom`, "cap", r, a + n - 0.02, 1, 4.2, 90));
          }),
          t("control", "control", 100.16, 132, 14, 3.6, 0),
          e
        );
      })(),
      O = R.map(({ side: e, top: t, length: a }, n) => ({
        key: `front-${n}`,
        side: e,
        y: t + a / 2,
        style: {
          left: `${v(e < 0 ? -0.9 : 99.7)}cqmin`,
          top: `${v(t)}cqmin`,
          width: `${v(1.2)}cqmin`,
          height: `${v(a)}cqmin`,
          borderRadius:
            e < 0 ? "0.6cqmin 0 0 0.6cqmin" : "0 0.6cqmin 0.6cqmin 0",
          transform: `translateZ(${v(2.0500000000000003)}cqmin)`,
        },
      })),
      Z = [
        {
          alpha: 80,
          gain: 1.35,
          floor: 0.55,
          rough: 0.15,
          inset: "0",
          radius: "17.9cqmin",
        },
        {
          alpha: 52,
          gain: 1.1,
          floor: 0,
          rough: 0.22,
          inset: u,
          radius: `calc(17.9cqmin - ${u})`,
        },
        {
          alpha: 12,
          gain: 1,
          floor: 0,
          rough: 0.55,
          inset: "1cqmin",
          radius: "16.9cqmin",
        },
      ].map((e) => {
        var t;
        let a;
        return {
          ...e,
          style: {
            inset: e.inset,
            borderRadius: e.radius,
            ...((t = e.radius),
            (a = `calc(100% - 2 * ${t})`),
            {
              backgroundSize: `${t} ${t}, ${t} ${t}, ${t} ${t}, ${t} ${t}, ${a} ${t}, ${t} ${a}, ${a} ${t}, ${t} ${a}`,
              backgroundPosition: `0 0, 100% 0, 100% 100%, 0 100%, ${t} 0, 100% ${t}, ${t} 100%, 0 ${t}`,
            }),
          },
        };
      }),
      D = [
        { cx: -32.1, cy: 17.9 - 104.6, start: 180, from: 270, at: "100% 100%" },
        { cx: 32.1, cy: 17.9 - 104.6, start: 270, from: 0, at: "0% 100%" },
        { cx: 32.1, cy: 86.69999999999999, start: 0, from: 90, at: "0% 0%" },
        {
          cx: -32.1,
          cy: 86.69999999999999,
          start: 90,
          from: 180,
          at: "100% 0%",
        },
      ],
      F = [
        { phi: 270, a: 0, b: 1, mx: 0, my: 17.9 - 104.6, dir: 90 },
        { phi: 0, a: 1, b: 2, mx: 32.1, my: 0, dir: 180 },
        { phi: 90, a: 3, b: 2, mx: 0, my: 86.69999999999999, dir: 90 },
        { phi: 180, a: 0, b: 3, mx: -32.1, my: 0, dir: 180 },
      ],
      B = {
        band: [
          [72, 0],
          [42, 6],
          [12, 16],
          [0, 50],
          [-12, 84],
          [-42, 94],
          [-72, 100],
        ],
        key: [
          [48, 0],
          [20, 18],
          [0, 50],
          [-20, 82],
          [-48, 100],
        ],
        cap: [
          [40, 0],
          [0, 50],
          [-40, 100],
        ],
        control: [
          [30, 0],
          [0, 50],
          [-30, 100],
        ],
      },
      A = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      H = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      Q = (e, t) => ({
        x:
          t *
          (1.5 * Math.sin(0.69 * e + 0.6) + 0.45 * Math.sin(1.27 * e + 2.1)),
        y: t * (2.6 * Math.sin(0.53 * e) + 0.7 * Math.sin(1.13 * e + 1.3)),
        z: 0.45 * t * Math.sin(0.41 * e + 1.9),
        lift: 0.22 * t * (1 + Math.sin(0.83 * e + 0.4)),
      }),
      U = (e) => ({
        x: k(e.x + (1 - e.appear) * 16, 40, 62),
        y: k(e.y, 55, 76),
        z: e.z,
      }),
      W = (e, t, a, n) => {
        let { x: i, y: r, z: l } = U(t),
          s = (1 - t.appear) * 12,
          o = Math.max(t.height, 0),
          c = x(0, 0.55, t.appear),
          d = -(3.2 * Math.sin(y(r))),
          h = 3.2 * Math.sin(y(i)),
          u = `scale(${v(Math.max(Math.cos(y(r)), 0.25))}, ${v(Math.max(Math.cos(y(i)), 0.25))})`,
          m = b(a.shadow, 0, 2) * (n ? 0.7 : 1),
          p = Math.cos(y(i)) * Math.cos(y(r));
        (e.body.set(
          `translate3d(0, ${v(s)}cqmin, ${v(7 * o)}cqmin) rotateX(${v(i)}deg) rotateY(${v(r)}deg) rotateZ(${v(l)}deg)`,
        ),
          e.presence.set(c),
          e.soft.set(
            `translate3d(${v(1.4 * d)}cqmin, ${v(s + 5.5 + 6 * o + 1.4 * h)}cqmin, 0) ${u} rotate(${v(l)}deg) scale(${v(0.93 + 0.04 * o)})`,
          ),
          e.softOpacity.set(0.44 * m * (1 - 0.15 * Math.min(o, 1.5)) * c),
          e.tight.set(
            `translate3d(${v(0.6 * d)}cqmin, ${v(s + 1.4 + 2.4 * o + 0.6 * h)}cqmin, 0) ${u} rotate(${v(l)}deg) scale(${v(0.985 - 0.015 * o)})`,
          ),
          e.tightOpacity.set(0.58 * m * Math.max(1 - 0.85 * o, 0) * c),
          e.glare.set(
            `rotate(${v(-l)}deg) translate3d(${v(2.1 * r)}cqmin, ${v(-(2.1 * i))}cqmin, 0)`,
          ),
          e.glareOpacity.set(
            (b(a.reflection, 0, 2) / 2) *
              (1 + 4 * Math.pow(Math.max(1 - p, 0), 1.5)),
          ),
          e.content.set(`rotate(${v(-t.turn)}deg)`),
          e.wake.set(1 - x(0.3, 0.95, t.appear)));
      },
      G = (e) => {
        let t = Q(0, e.reduced ? 0 : e.float),
          a = e.landscape ? -90 : 0;
        return {
          x: e.restX + t.x,
          y: e.restY + t.y,
          z: a + e.restZ + t.z,
          turn: a,
          height: t.lift,
          appear: e.intro && !e.reduced ? 0 : 1,
        };
      },
      _ = (0, i.forwardRef)(function (
        {
          image: e = "/demo-media/abstract-rose-balance.webp",
          alt: t = "Device screen",
          children: a,
          finish: r = "black",
          frameColor: l,
          screenColor: s = "#000000",
          shadowColor: u = "#0b0c16",
          orientation: p = "portrait",
          width: k,
          scale: S = 0.5,
          rotateX: E = 0,
          rotateY: R = 0,
          rotateZ: _ = 0,
          tilt: V,
          float: K = 1,
          lift: J,
          drag: ee = !0,
          reflection: et = 1,
          shadow: ea = 1,
          bezel: en = 1,
          island: ei = !0,
          isScrollable: er = !1,
          interactive: el = !0,
          intro: es = !0,
          paused: eo = !1,
          className: ec,
          style: ed,
          enableParallax: eh = !0,
          parallaxStrength: eu,
          enableRotate: em = !0,
          rotateStrength: ep,
          autoAnimate: ef = !1,
        },
        eb,
      ) {
        let eg = (0, i.useRef)(null),
          ev = (0, i.useRef)(null),
          ey = (0, i.useRef)(null),
          ex = (0, i.useSyncExternalStore)(A, H, () => !1),
          ew = "landscape" === p,
          eM = m[r] ?? m.black,
          e$ = l?.trim() ? l.trim() : eM[0],
          ek = {
            restX: b(g(E, 0), -60, 60),
            restY: b(g(R, 0), -60, 60),
            restZ: b(g(_, 0), -180, 180),
            landscape: ew,
            tilt: em ? b(g(V ?? ep, 10), 0, 30) : 0,
            follow: !ef,
            float: ef ? Math.max(b(g(K, 1), 0, 3), 1.6) : b(g(K, 1), 0, 3),
            lift: eh
              ? b(g(J ?? (void 0 === eu ? void 0 : eu / 15), 1), 0, 3)
              : 0,
            shadow: b(g(ea, 1), 0, 2),
            reflection: b(g(et, 1), 0, 2),
            metal: e$,
            shine: l?.trim() ? "" : eM[1],
            drag: ee && em,
            interactive: el,
            scrollable: er,
            intro: es,
            paused: eo,
            reduced: ex,
          },
          eq = (0, i.useRef)(ek),
          [ej] = (0, i.useState)(() => {
            let e;
            return (
              W(
                (e = {
                  body: (0, o.OQ)(""),
                  presence: (0, o.OQ)(1),
                  soft: (0, o.OQ)(""),
                  softOpacity: (0, o.OQ)(0),
                  tight: (0, o.OQ)(""),
                  tightOpacity: (0, o.OQ)(0),
                  glare: (0, o.OQ)(""),
                  glareOpacity: (0, o.OQ)(0.5),
                  content: (0, o.OQ)(""),
                  wake: (0, o.OQ)(0),
                }),
                G(ek),
                ek,
                !1,
              ),
              e
            );
          });
        ((0, i.useEffect)(() => {
          ((eq.current = ek), ey.current?.sync());
        }),
          (0, i.useEffect)(() => {
            let e = eg.current;
            if (!e) return;
            let t = (function (e, t, a, n) {
              let i = e.ownerDocument,
                r = i.defaultView ?? window,
                l = (t) =>
                  Array.from(e.querySelectorAll(`[${t}]`)).map((e) => ({
                    el: e,
                    index: Number(e.getAttribute(t) ?? 0),
                    image: "",
                    blend: "",
                  })),
                s = l("data-device-ring"),
                o = l("data-device-facet"),
                d = l("data-device-front"),
                h = n.current,
                u = h.restX,
                m = h.restY,
                p = 0,
                f = 0,
                g = h.restZ,
                v = 0,
                k = h.landscape ? -90 : 0,
                S = 0,
                E = 0,
                R = 0,
                A = h.intro && !h.reduced ? 0 : 1,
                H = 0,
                _ = 0,
                V = h.reduced ? 0 : h.float,
                K = 0,
                J = Q(0, V),
                ee = !1,
                et = 0,
                ea = 0,
                en = null,
                ei = !1,
                er = 0,
                el = 0,
                es = !1,
                eo = 0,
                ec = !1,
                ed = !1,
                eh = !1,
                eu = !1,
                em = 0,
                ep = "",
                ef = [],
                eb = [NaN, 0, 0],
                eg = !1,
                ev = -1 / 0,
                ey = (t) => {
                  if (t - ev < 1200) return;
                  ev = t;
                  let a = (() => {
                    let t = e.parentElement;
                    for (; t;) {
                      let e = r
                        .getComputedStyle(t)
                        .backgroundColor.match(/rgba?\(([^)]+)\)/);
                      if (e) {
                        let t = e[1]
                          .split(/[\s,/]+/)
                          .filter(Boolean)
                          .map(Number);
                        if (t.length < 4 || t[3] > 0.05)
                          return (
                            0.2126 * t[0] + 0.7152 * t[1] + 0.0722 * t[2] > 140
                          );
                      }
                      t = t.parentElement;
                    }
                    return !r.matchMedia("(prefers-color-scheme: dark)")
                      .matches;
                  })();
                  (a === eg && e.dataset.devicePage) ||
                    ((eg = a), (e.dataset.devicePage = eg ? "light" : "dark"));
                },
                ex = () => {
                  let e,
                    t,
                    a = n.current,
                    r = `${a.metal}|${a.shine}`;
                  if (r === ep) return !1;
                  ep = r;
                  let l = z(a.metal, i, [0.6, 0.6, 0.6]),
                    s = a.shine
                      ? z(a.shine, i, [0.9, 0.9, 0.9])
                      : I(P(N(l), [1, 0, 0], 0.62));
                  return (
                    (e = N(l)),
                    (t = N(s)),
                    (ef = L([
                      [0, P(e, [0, 0, 0], 0.72)],
                      [0.25, P(e, [0, 0, 0], 0.4)],
                      [0.5, e],
                      [0.78, t],
                      [1, P(t, [1, 0, 0], 0.6)],
                    ])),
                    !0
                  );
                },
                ew = (e, t, a = "") => {
                  (e.image !== t &&
                    ((e.image = t), (e.el.style.backgroundImage = t)),
                    a &&
                      e.blend !== a &&
                      ((e.blend = a), e.el.style.setProperty("--device-b", a)));
                },
                eM = (e, t, a, n) => {
                  if (
                    !n &&
                    Math.abs(e - eb[0]) +
                      Math.abs(t - eb[1]) +
                      Math.abs(a - eb[2]) <
                      0.2
                  )
                    return;
                  eb = [e, t, a];
                  let i = Math.cos(y(e)),
                    r = Math.sin(y(e)),
                    l = Math.cos(y(t)),
                    c = Math.sin(y(t)),
                    h = Math.cos(y(a)),
                    u = Math.sin(y(a)),
                    m = (e, t, a) => {
                      let n = e * h - t * u,
                        s = e * u + t * h,
                        o = -n * c + a * l;
                      return [n * l + a * c, s * i - o * r, s * r + o * i];
                    },
                    p = 0,
                    f = (e, t, a, n, i, r, l) => {
                      let s = m(e, t, a),
                        o = m(n, i, r),
                        c = q(-o[0], -o[1], 520 - o[2]),
                        d = s[0] * c[0] + s[1] * c[1] + s[2] * c[2];
                      p = d;
                      let h = ((e, t, a) => {
                        let n = 0.12 - 0.12 * t;
                        for (let i of j) {
                          let r = e * i.d[0] + t * i.d[1] + a * i.d[2];
                          r > i.lo && (n += i.w * x(i.lo, i.hi, r));
                        }
                        return n;
                      })(
                        2 * d * s[0] - c[0],
                        2 * d * s[1] - c[1],
                        2 * d * s[2] - c[2],
                      );
                      return (
                        h +
                        (0.16 +
                          0.5 *
                            Math.max(
                              s[0] * C[0] + s[1] * C[1] + s[2] * C[2],
                              0,
                            ) +
                          0.18 * (0.5 - 0.5 * s[1]) -
                          h) *
                          l
                      );
                    };
                  for (let e of s) {
                    let t = Z[e.index];
                    if (!t) continue;
                    let a = Math.sin(y(t.alpha)),
                      n = Math.cos(y(t.alpha)),
                      i = (e, i, r) =>
                        X(
                          ef,
                          Math.max(
                            f(
                              a * Math.cos(y(e)),
                              a * Math.sin(y(e)),
                              n,
                              i,
                              r,
                              5.75,
                              t.rough,
                            ) * t.gain,
                            t.floor,
                          ),
                        ),
                      r = D.map((e) => {
                        let t = [0, 1, 2, 3, 4, 5, 6].map(
                          (t) =>
                            `${i(e.start + 15 * t, e.cx, e.cy)} ${15 * t}deg`,
                        );
                        return `conic-gradient(from ${e.from}deg at ${e.at}, ${t.join(", ")})`;
                      });
                    for (let e of F) {
                      let t = D[e.a],
                        a = D[e.b];
                      r.push(
                        `linear-gradient(${e.dir}deg, ${i(e.phi, t.cx, t.cy)}, ${i(e.phi, e.mx, e.my)}, ${i(e.phi, a.cx, a.cy)})`,
                      );
                    }
                    ew(e, r.join(", "));
                  }
                  for (let e of o) {
                    let t = Y[e.index];
                    if (!t) continue;
                    let a = Math.cos(y(t.angle)),
                      n = Math.sin(y(t.angle)),
                      i = t.x - 50,
                      r = t.y - 104.6;
                    if ((f(a, n, 0, i, r, 0, 0), p < -0.05)) continue;
                    let l = "control" === t.kind ? T : ef,
                      s =
                        "band" === t.kind
                          ? 0.3
                          : "control" === t.kind
                            ? 0.08
                            : 0.2,
                      o = "key" === t.kind ? 1.15 : 1,
                      c = (e) => {
                        let c = y(t.angle - (e * t.sweep) / 2),
                          d = Math.cos(c),
                          h = Math.sin(c),
                          u = (e * t.length) / 2,
                          m = B[t.kind].map(([e, t]) => {
                            let c = y(e),
                              m = f(
                                d * Math.cos(c),
                                h * Math.cos(c),
                                Math.sin(c),
                                i + u * n,
                                r - u * a,
                                0,
                                s,
                              );
                            return `${X(l, m * o)} ${t}%`;
                          });
                        return `linear-gradient(180deg, ${m.join(", ")})`;
                      };
                    "band" === t.kind ? ew(e, c(-1), c(1)) : ew(e, c(0));
                  }
                  for (let e of d) {
                    let t = O[e.index];
                    if (!t) continue;
                    let a = 50.4 * t.side,
                      n = t.y - 104.6,
                      i = X(
                        ef,
                        1.1 *
                          f(
                            t.side * Math.sin(y(70)),
                            0,
                            Math.cos(y(70)),
                            a,
                            n,
                            2.1,
                            0.25,
                          ),
                      ),
                      r = X(
                        ef,
                        f(
                          t.side * Math.sin(y(20)),
                          0,
                          Math.cos(y(20)),
                          a,
                          n,
                          2.1,
                          0.25,
                        ),
                      );
                    ew(
                      e,
                      t.side < 0
                        ? `linear-gradient(90deg, ${i}, ${r})`
                        : `linear-gradient(90deg, ${r}, ${i})`,
                    );
                  }
                },
                e$ = () => {
                  eh && ((eh = !1), (0, c.WG)(eq), (em = 0));
                },
                ek = () => {
                  eu ||
                    eh ||
                    !ed ||
                    i.hidden ||
                    ((eh = !0), (em = 0), c.Gt.update(eq, !0));
                };
              function eq() {
                if (eu) return;
                let e = performance.now(),
                  r = em && e - em < 100 ? b((e - em) / 1e3, 0, 0.05) : 1 / 60;
                em = e;
                let l = n.current,
                  s = l.reduced;
                ey(e);
                let o = ex();
                s
                  ? ((A = 1), (H = 0))
                  : A < 1 &&
                    (([A, H] = M(A, H, 1, 6.2, r)),
                    5e-4 > Math.abs(1 - A) &&
                      0.001 > Math.abs(H) &&
                      ((A = 1), (H = 0)));
                let c = !s && l.interactive && l.follow && ee,
                  d = ei || c;
                _ = s ? 0 : w(_, +!!d, r, 0.32);
                let h = s ? 0 : l.float * (1 - _);
                ((V = s ? 0 : w(V, h, r, 0.45)),
                  s || l.paused || (K += r),
                  (J = Q(K, V)));
                let y = l.restX,
                  x = l.restY;
                ei
                  ? ((y = er), (x = el))
                  : c &&
                    ((y = l.restX - ea * l.tilt), (x = l.restY + et * l.tilt));
                let $ = l.landscape ? -90 : 0,
                  q = l.lift * (ei ? 1.2 : _);
                if (s)
                  ((u = y),
                    (m = x),
                    (p = 0),
                    (f = 0),
                    (g = l.restZ),
                    (v = 0),
                    (k = $),
                    (S = 0),
                    (E = 0),
                    (R = 0));
                else {
                  let e = ei ? 24 : es ? 6.5 : 8.5;
                  (([u, p] = M(u, p, y, e, r)),
                    ([m, f] = M(m, f, x, e, r)),
                    ([g, v] = M(g, v, l.restZ, 7, r)),
                    ([k, S] = M(k, S, $, 7, r)),
                    ([E, R] = M(E, R, q, 9, r)));
                }
                es &&
                  Math.abs(u - y) + Math.abs(m - x) < 0.3 &&
                  Math.abs(p) + Math.abs(f) < 3 &&
                  (es = !1);
                let j = {
                  x: u + J.x,
                  y: m + J.y,
                  z: k + g + J.z,
                  turn: k,
                  height: E + J.lift,
                  appear: A,
                };
                W(a, j, l, eg);
                let C = U(j);
                if ((eM(C.x, C.y, C.z, o), ec && t)) {
                  let e = w(t.scrollTop, eo, r, 0.11);
                  0.5 > Math.abs(eo - e)
                    ? ((t.scrollTop = eo), (ec = !1))
                    : (t.scrollTop = e);
                }
                let N =
                    Math.abs(u - y) +
                      Math.abs(m - x) +
                      Math.abs(p) +
                      Math.abs(f) >
                      0.01 ||
                    Math.abs(g - l.restZ) +
                      Math.abs(v) +
                      Math.abs(k - $) +
                      Math.abs(S) >
                      0.01 ||
                    Math.abs(E - q) + Math.abs(R) > 0.001 ||
                    A < 1 ||
                    Math.abs(_ - !!d) > 0.001 ||
                    Math.abs(V - h) > 0.001,
                  I = !s && !l.paused && V > 0.001;
                (ed && !i.hidden && (I || N || ec || ei)) || e$();
              }
              let ej = (t) => {
                  let a = e.getBoundingClientRect();
                  return {
                    x: b(
                      ((t.clientX - a.left) / Math.max(a.width, 1)) * 2 - 1,
                      -1,
                      1,
                    ),
                    y: b(
                      ((t.clientY - a.top) / Math.max(a.height, 1)) * 2 - 1,
                      -1,
                      1,
                    ),
                    size: Math.max(Math.min(a.width, a.height), 80),
                  };
                },
                eC = (t) => {
                  let a = en;
                  if (((en = null), !a)) return;
                  if (ei) {
                    ((ei = !1), (es = !0));
                    try {
                      e.hasPointerCapture(a.id) &&
                        e.releasePointerCapture(a.id);
                    } catch {}
                    ek();
                    return;
                  }
                  let i = n.current;
                  !t ||
                    !i.interactive ||
                    i.reduced ||
                    performance.now() - a.time > 450 ||
                    ((f += 120 * a.nx), (p -= 120 * a.ny), (es = !0), ek());
                },
                eS = (e) => {
                  let t = n.current;
                  if (
                    !t.interactive ||
                    t.reduced ||
                    en ||
                    ("mouse" === e.pointerType && 0 !== e.button)
                  )
                    return;
                  let a = ej(e);
                  en = {
                    id: e.pointerId,
                    x: e.clientX,
                    y: e.clientY,
                    time: performance.now(),
                    nx: a.x,
                    ny: a.y,
                    size: a.size,
                    rx: u,
                    ry: m,
                  };
                },
                eE = (t) => {
                  let a = n.current;
                  if (en && t.pointerId === en.id) {
                    let n = t.clientX - en.x,
                      i = t.clientY - en.y;
                    if (
                      !ei &&
                      a.drag &&
                      a.interactive &&
                      !a.reduced &&
                      Math.hypot(n, i) > ("touch" === t.pointerType ? 8 : 4)
                    ) {
                      ((ei = !0),
                        (es = !1),
                        (u += J.x),
                        (m += J.y),
                        (g += J.z),
                        (E += J.lift),
                        (V = 0),
                        (_ = 1),
                        (J = Q(K, 0)),
                        (en.rx = u),
                        (en.ry = m),
                        (en.x = t.clientX),
                        (en.y = t.clientY));
                      try {
                        e.setPointerCapture(t.pointerId);
                      } catch {}
                    }
                    if (ei) {
                      let e = 100 / en.size;
                      ((el = $(en.ry + (t.clientX - en.x) * e, a.restY, 70)),
                        (er = $(
                          en.rx - (t.clientY - en.y) * e * 0.8,
                          a.restX,
                          45,
                        )),
                        ek());
                      return;
                    }
                  }
                  if ("touch" === t.pointerType) return;
                  let i = ej(t);
                  ((et = i.x), (ea = i.y), (ee = !0), ek());
                },
                eN = (e) => {
                  en && e.pointerId === en.id && eC(!0);
                },
                eI = (e) => {
                  en && e.pointerId === en.id && eC(!1);
                },
                eP = (e) => {
                  ei && en && e.pointerId === en.id && eC(!1);
                },
                ez = (e) => {
                  "touch" !== e.pointerType && ((ee = !1), ek());
                },
                eL = () => {
                  (en && eC(!1), (ee = !1), ek());
                },
                eT = (e) => {
                  let a = n.current;
                  if (!a.scrollable || !t || e.defaultPrevented || e.ctrlKey)
                    return;
                  let i = t.scrollHeight - t.clientHeight;
                  if (i <= 0) return;
                  let r =
                      1 === e.deltaMode
                        ? 16
                        : 2 === e.deltaMode
                          ? t.clientHeight
                          : 1,
                    l = b(e.deltaY * r, -240, 240),
                    s = ec ? eo : t.scrollTop,
                    o = b(s + l, 0, i);
                  if (!(0.5 > Math.abs(o - s))) {
                    if ((e.preventDefault(), (eo = o), a.reduced)) {
                      t.scrollTop = o;
                      return;
                    }
                    ((ec = !0), ek());
                  }
                },
                eX = () => {
                  ((em = 0), ek());
                },
                eR = new IntersectionObserver(
                  ([e]) => {
                    (ed = !e || e.isIntersecting) ? ek() : e$();
                  },
                  { rootMargin: "120px" },
                );
              (e.addEventListener("pointerdown", eS),
                e.addEventListener("pointermove", eE),
                e.addEventListener("pointerup", eN),
                e.addEventListener("pointercancel", eI),
                e.addEventListener("lostpointercapture", eP),
                e.addEventListener("pointerleave", ez),
                t?.addEventListener("wheel", eT, { passive: !1 }),
                r.addEventListener("blur", eL),
                i.addEventListener("visibilitychange", eX),
                eR.observe(e),
                ey(performance.now()),
                ex());
              let eY = U(G(h));
              return (
                eM(eY.x, eY.y, eY.z, !0),
                {
                  sync: () => {
                    ((ev = -1 / 0),
                      (em = 0),
                      ex() && eM(eb[0], eb[1], eb[2], !0),
                      ek());
                  },
                  destroy: () => {
                    ((eu = !0),
                      e$(),
                      eR.disconnect(),
                      e.removeEventListener("pointerdown", eS),
                      e.removeEventListener("pointermove", eE),
                      e.removeEventListener("pointerup", eN),
                      e.removeEventListener("pointercancel", eI),
                      e.removeEventListener("lostpointercapture", eP),
                      e.removeEventListener("pointerleave", ez),
                      t?.removeEventListener("wheel", eT),
                      r.removeEventListener("blur", eL),
                      i.removeEventListener("visibilitychange", eX));
                  },
                }
              );
            })(e, ev.current, ej, eq);
            return (
              (ey.current = t),
              () => {
                (t.destroy(), (ey.current = null));
              }
            );
          }, [ej]),
          (0, i.useImperativeHandle)(eb, () => eg.current, []));
        let eC =
            "number" == typeof k && Number.isFinite(k)
              ? `${Math.max(k, 1)}px`
              : "string" == typeof k && k.trim()
                ? k.trim()
                : `${v(35.6 * b(g(S, 0.5), 0.05, 4))}rem`,
          eS = 1.7 * b(g(en, 1), 0, 4),
          eE = 100 - 2 * (2.2 + eS),
          eN = 209.2 - 2 * (2.2 + eS),
          eI = {
            width: ew ? `calc(${eC} * ${v(2.092)})` : eC,
            aspectRatio: ew ? `${v(2.092)} / 1` : `1 / ${v(2.092)}`,
            touchAction: el && ee && em ? "pan-y" : void 0,
            "--device-metal": e$,
            "--device-screen": s,
            "--device-shadow": u,
            ...ed,
          },
          eP = ew
            ? {
                left: "50%",
                top: "50%",
                width: `${v(eN)}cqmin`,
                height: `${v(eE)}cqmin`,
                marginLeft: `${v(-eN / 2)}cqmin`,
                marginTop: `${v(-eE / 2)}cqmin`,
              }
            : { inset: 0 };
        return (0, n.jsxs)("div", {
          ref: eg,
          className: (0, h.cn)(
            "group/device relative inline-block shrink-0 align-middle select-none [container-type:size] [-webkit-tap-highlight-color:transparent]",
            ec,
          ),
          style: eI,
          children: [
            (0, n.jsx)(d.P.div, {
              "aria-hidden": !0,
              className: (0, h.cn)(
                f,
                "blur-[6.5cqmin] group-data-[device-page=light]/device:blur-[9cqmin]",
              ),
              style: { transform: ej.soft, opacity: ej.softOpacity },
            }),
            (0, n.jsx)(d.P.div, {
              "aria-hidden": !0,
              className: (0, h.cn)(
                f,
                "blur-[1.6cqmin] group-data-[device-page=light]/device:blur-[2.2cqmin]",
              ),
              style: { transform: ej.tight, opacity: ej.tightOpacity },
            }),
            (0, n.jsx)(d.P.div, {
              className: "absolute inset-0 [perspective:520cqmin]",
              style: { opacity: ej.presence },
              children: (0, n.jsxs)(d.P.div, {
                className:
                  "absolute left-1/2 top-1/2 -ml-[50cqmin] -mt-[104.6cqmin] h-[209.2cqmin] w-[100cqmin] [transform-style:preserve-3d] will-change-transform",
                style: { transform: ej.body },
                children: [
                  (0, n.jsx)("div", {
                    "aria-hidden": !0,
                    className:
                      "absolute inset-0 rounded-[17.9cqmin] [backface-visibility:hidden] [transform:translateZ(-5.75cqmin)_rotateY(180deg)]",
                    style: {
                      backgroundImage:
                        "linear-gradient(155deg, color-mix(in oklch, var(--device-metal) 70%, white), var(--device-metal) 45%, color-mix(in oklch, var(--device-metal) 60%, black))",
                    },
                  }),
                  Y.map((e, t) =>
                    (0, n.jsx)(
                      "div",
                      {
                        "aria-hidden": !0,
                        "data-device-facet": t,
                        className: (0, h.cn)(
                          "absolute left-0 top-0 bg-[var(--device-metal)] [backface-visibility:hidden]",
                          "band" === e.kind &&
                            "after:pointer-events-none after:absolute after:inset-0 after:content-[''] after:[background-image:var(--device-b,none)] after:[-webkit-mask-image:linear-gradient(90deg,transparent,#000)] after:[mask-image:linear-gradient(90deg,transparent,#000)]",
                          "key" === e.kind && "rounded-[1.2cqmin]",
                          "control" === e.kind && "rounded-[1.8cqmin]",
                        ),
                        style: e.style,
                      },
                      e.key,
                    ),
                  ),
                  O.map((e, t) =>
                    (0, n.jsx)(
                      "div",
                      {
                        "aria-hidden": !0,
                        "data-device-front": t,
                        className:
                          "absolute bg-[var(--device-metal)] [backface-visibility:hidden]",
                        style: e.style,
                      },
                      e.key,
                    ),
                  ),
                  (0, n.jsxs)("div", {
                    className:
                      "absolute inset-0 rounded-[17.9cqmin] [backface-visibility:hidden] [transform:translateZ(5.75cqmin)]",
                    children: [
                      (0, n.jsx)("div", {
                        "aria-hidden": !0,
                        className: "absolute inset-0 will-change-transform",
                        children: Z.map((e, t) =>
                          (0, n.jsx)(
                            "div",
                            {
                              "data-device-ring": t,
                              className:
                                "absolute bg-[var(--device-metal)] bg-no-repeat",
                              style: e.style,
                            },
                            e.alpha,
                          ),
                        ),
                      }),
                      (0, n.jsxs)("div", {
                        className:
                          "absolute inset-[2.2cqmin] overflow-hidden rounded-[15.7cqmin] bg-black [isolation:isolate]",
                        style: {
                          boxShadow:
                            "0 0 0 max(0.3cqmin, 1px) rgb(0 0 0 / 0.55), inset 0 0 0 max(0.14cqmin, 0.5px) rgb(255 255 255 / 0.22)",
                        },
                        children: [
                          (0, n.jsxs)("div", {
                            className:
                              "absolute overflow-hidden bg-[var(--device-screen)]",
                            style: {
                              inset: `${v(eS)}cqmin`,
                              borderRadius: `${v(Math.max(15.7 - eS, 2))}cqmin`,
                            },
                            children: [
                              (0, n.jsx)(d.P.div, {
                                ref: ev,
                                className: (0, h.cn)(
                                  "absolute",
                                  er &&
                                    "overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                                ),
                                style: { ...eP, transform: ej.content },
                                children:
                                  a ||
                                  (0, n.jsx)("picture", {
                                    className: (0, h.cn)(
                                      "block h-full w-full",
                                      er && "h-auto min-h-full",
                                    ),
                                    children: (0, n.jsx)("img", {
                                      src: e,
                                      alt: t,
                                      draggable: !1,
                                      className: (0, h.cn)(
                                        "block h-full w-full object-cover [-webkit-user-drag:none]",
                                        er && "h-auto min-h-full",
                                      ),
                                      style: {
                                        objectPosition: ew ? "center" : "top",
                                      },
                                    }),
                                  }),
                              }),
                              (0, n.jsx)("div", {
                                "aria-hidden": !0,
                                className:
                                  "pointer-events-none absolute inset-0 rounded-[inherit]",
                                style: {
                                  boxShadow:
                                    "inset 0 0 max(0.9cqmin, 2px) rgb(0 0 0 / 0.5), inset 0 0 max(0.25cqmin, 0.75px) rgb(0 0 0 / 0.55)",
                                },
                              }),
                              (0, n.jsx)(d.P.div, {
                                "aria-hidden": !0,
                                className:
                                  "pointer-events-none absolute inset-0 bg-black",
                                style: { opacity: ej.wake },
                              }),
                            ],
                          }),
                          ei &&
                            (0, n.jsx)("div", {
                              "aria-hidden": !0,
                              className:
                                "pointer-events-none absolute left-1/2 -ml-[16cqmin] h-[9cqmin] w-[32cqmin] rounded-full bg-black",
                              style: { top: `${v(eS + 2.8)}cqmin` },
                              children: (0, n.jsx)("span", {
                                className:
                                  "absolute right-[2.9cqmin] top-1/2 -mt-[1.6cqmin] size-[3.2cqmin] rounded-full",
                                style: {
                                  backgroundImage:
                                    "radial-gradient(circle at 34% 30%, rgb(255 255 255 / 0.85) 0, rgb(255 255 255 / 0) 10%), radial-gradient(circle at 50% 50%, #2a3a86 0%, #121c4f 30%, #070a20 56%, #010103 80%)",
                                },
                              }),
                            }),
                          (0, n.jsx)(d.P.div, {
                            "aria-hidden": !0,
                            className:
                              "pointer-events-none absolute left-1/2 top-1/2 -ml-[170cqmin] -mt-[170cqmin] size-[340cqmin] will-change-transform",
                            style: {
                              transform: ej.glare,
                              opacity: ej.glareOpacity,
                              backgroundImage:
                                "linear-gradient(125deg, rgb(255 255 255 / 0) 40.5%, rgb(255 255 255 / 0.02) 42.5%, rgb(255 255 255 / 0.055) 45%, rgb(255 255 255 / 0.095) 47.5%, rgb(255 255 255 / 0.12) 49.7%, rgb(255 255 255 / 0.095) 51.9%, rgb(255 255 255 / 0.055) 54.4%, rgb(255 255 255 / 0.02) 56.9%, rgb(255 255 255 / 0) 58.9%)",
                            },
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            }),
          ],
        });
      });
    _.displayName = "Device";
    let V = {
        spectrum: "/demo-media/abstract-spectrum.webp",
        petal: "/demo-media/abstract-rose-petal.webp",
        window: "/demo-media/abstract-iris-window.webp",
        balance: "/demo-media/abstract-rose-balance.webp",
      },
      K = {
        finish: "black",
        orientation: "portrait",
        screen: "spectrum",
        rotateX: 0,
        rotateY: 0,
        rotateZ: 0,
        tilt: 10,
        float: 1,
        lift: 1,
        reflection: 1,
        shadow: 1,
        bezel: 1,
      },
      J = {
        classic: K,
        titanium: {
          ...K,
          finish: "titanium",
          screen: "petal",
          rotateX: 4,
          rotateY: -12,
        },
        silver: { ...K, finish: "silver", screen: "window", reflection: 1.3 },
        gold: {
          ...K,
          finish: "gold",
          screen: "balance",
          rotateX: 8,
          rotateZ: -7,
        },
        blue: {
          ...K,
          finish: "blue",
          screen: "window",
          rotateX: 5,
          rotateY: -26,
          float: 0.8,
        },
        threeQuarter: { ...K, rotateX: 8, rotateY: 30, tilt: 8, float: 0.6 },
        landscape: {
          ...K,
          orientation: "landscape",
          screen: "petal",
          rotateX: 8,
        },
        recline: {
          ...K,
          finish: "silver",
          screen: "petal",
          rotateX: 22,
          rotateY: -10,
          rotateZ: 6,
          lift: 1.4,
        },
      },
      ee = [
        { label: "Classic", value: "classic" },
        { label: "Titanium", value: "titanium" },
        { label: "Silver", value: "silver" },
        { label: "Gold", value: "gold" },
        { label: "Blue", value: "blue" },
        { label: "Three Quarter", value: "threeQuarter" },
        { label: "Landscape", value: "landscape" },
        { label: "Recline", value: "recline" },
      ],
      et = [
        { label: "Titanium", value: "titanium" },
        { label: "Black", value: "black" },
        { label: "Silver", value: "silver" },
        { label: "Gold", value: "gold" },
        { label: "Blue", value: "blue" },
      ],
      ea = [
        { label: "Portrait", value: "portrait" },
        { label: "Landscape", value: "landscape" },
      ],
      en = [
        { label: "Spectrum", value: "spectrum" },
        { label: "Rose petal", value: "petal" },
        { label: "Iris window", value: "window" },
        { label: "Rose balance", value: "balance" },
      ],
      ei = [
        {
          name: "image",
          type: "string",
          default: `"${V.spectrum}"`,
          description: "Image shown on the screen.",
        },
        {
          name: "alt",
          type: "string",
          default: '"Device screen"',
          description: "Alt text for the screen image.",
        },
        {
          name: "children",
          type: "ReactNode",
          default: "undefined",
          description: "Custom screen content. Replaces the image.",
        },
        {
          name: "finish",
          type: '"titanium" | "black" | "silver" | "gold" | "blue"',
          default: '"black"',
          description: "Metal finish of the frame and buttons.",
        },
        {
          name: "frameColor",
          type: "string",
          default: "undefined",
          description:
            "Custom metal colour. Overrides the finish. Highlights and shades are derived from it.",
        },
        {
          name: "screenColor",
          type: "string",
          default: '"#000000"',
          description: "Screen colour behind the content.",
        },
        {
          name: "shadowColor",
          type: "string",
          default: '"#0b0c16"',
          description: "Colour of the contact shadow on the page.",
        },
        {
          name: "orientation",
          type: '"portrait" | "landscape"',
          default: '"portrait"',
          description:
            "Holds the phone upright or sideways. The content stays upright and the change animates.",
        },
        {
          name: "width",
          type: "number | string",
          default: "undefined",
          description:
            "Width of the phone body in px or any CSS length. Overrides scale.",
        },
        {
          name: "scale",
          type: "number",
          default: "0.5",
          description:
            "Size as a fraction of a 35.6rem wide phone. Used when width is not set.",
        },
        {
          name: "rotateX",
          type: "number",
          default: "0",
          description: "Resting tilt forward or back, in degrees.",
        },
        {
          name: "rotateY",
          type: "number",
          default: "0",
          description:
            "Resting turn to the side, in degrees. Shows the side buttons.",
        },
        {
          name: "rotateZ",
          type: "number",
          default: "0",
          description: "Resting lean on the page, in degrees.",
        },
        {
          name: "tilt",
          type: "number",
          default: "10",
          description:
            "How far the phone turns toward the pointer, in degrees.",
        },
        {
          name: "float",
          type: "number",
          default: "1",
          description:
            "Strength of the slow idle sway while the pointer is away.",
        },
        {
          name: "lift",
          type: "number",
          default: "1",
          description:
            "How far the phone rises off the page on hover. The shadow softens to match.",
        },
        {
          name: "drag",
          type: "boolean",
          default: "true",
          description:
            "Drag to spin the phone. It keeps its momentum, then springs back.",
        },
        {
          name: "reflection",
          type: "number",
          default: "1",
          description:
            "Strength of the glass reflection. It moves with the angle of the phone.",
        },
        {
          name: "shadow",
          type: "number",
          default: "1",
          description: "Strength of the contact shadow.",
        },
        {
          name: "bezel",
          type: "number",
          default: "1",
          description:
            "Thickness of the black border around the screen. The corners stay concentric.",
        },
        {
          name: "island",
          type: "boolean",
          default: "true",
          description: "Shows the Dynamic Island.",
        },
        {
          name: "isScrollable",
          type: "boolean",
          default: "false",
          description:
            "Lets tall content scroll inside the screen, with smooth wheel scrolling.",
        },
        {
          name: "interactive",
          type: "boolean",
          default: "true",
          description:
            "Turns the hover tilt, drag and tap nudges on or off. A tap nudges the side you touch.",
        },
        {
          name: "intro",
          type: "boolean",
          default: "true",
          description:
            "Rises into place and wakes the screen when it first appears.",
        },
        {
          name: "paused",
          type: "boolean",
          default: "false",
          description:
            "Freezes the idle sway. Reduced-motion users get a still phone.",
        },
        {
          name: "className",
          type: "string",
          default: "undefined",
          description: "Classes for the root element.",
        },
        {
          name: "style",
          type: "CSSProperties",
          default: "undefined",
          description: "Inline styles for the root element.",
        },
        {
          name: "ref",
          type: "HTMLDivElement",
          default: "undefined",
          description: "The root element.",
        },
      ],
      er = () => {
        let [e, t] = (0, s.I)(),
          a = (0, l.Y)(),
          [o, c] = (0, i.useState)("classic"),
          [d, h] = (0, i.useState)(K),
          u = (e) => (t) => h((a) => ({ ...a, [e]: t })),
          [m, f] = (0, i.useState)(void 0),
          [b, g] = (0, i.useState)("#000000"),
          [v, y] = (0, i.useState)(null),
          [x, w] = (0, i.useState)(228),
          [M, $] = (0, i.useState)(!0),
          [k, q] = (0, i.useState)(!0),
          [j, C] = (0, i.useState)(!0),
          [S, E] = (0, i.useState)(!0),
          [N, I] = (0, i.useState)(!1),
          P = v ?? ("dark" === a ? "#000000" : "#0b0c16");
        return (0, n.jsxs)("div", {
          children: [
            (0, n.jsx)(r.Bg, {}),
            (0, n.jsxs)(r.VX, {
              children: [
                (0, n.jsxs)(r.Ec, {
                  children: [
                    (0, n.jsx)(r.Ch, {
                      onRefresh: t,
                      minHeight: 660,
                      children: (0, n.jsx)(
                        _,
                        {
                          image: V[d.screen] ?? V.spectrum,
                          finish: d.finish,
                          frameColor: m,
                          screenColor: b,
                          shadowColor: P,
                          orientation: d.orientation,
                          width: x,
                          rotateX: d.rotateX,
                          rotateY: d.rotateY,
                          rotateZ: d.rotateZ,
                          tilt: d.tilt,
                          float: d.float,
                          lift: d.lift,
                          drag: k,
                          reflection: d.reflection,
                          shadow: d.shadow,
                          bezel: d.bezel,
                          island: M,
                          interactive: j,
                          intro: S,
                          paused: N,
                        },
                        e,
                      ),
                    }),
                    (0, n.jsxs)(r.IH, {
                      children: [
                        (0, n.jsx)(r.bg, {
                          title: "Preset",
                          value: o,
                          options: ee,
                          onChange: (e) => {
                            (c(e), h(J[e] ?? K), f(void 0));
                          },
                        }),
                        (0, n.jsx)(r.bg, {
                          title: "Finish",
                          value: d.finish,
                          options: et,
                          onChange: (e) => {
                            (u("finish")(e), f(void 0));
                          },
                        }),
                        (0, n.jsx)(r.bg, {
                          title: "Orientation",
                          value: d.orientation,
                          options: ea,
                          onChange: (e) => u("orientation")(e),
                        }),
                        (0, n.jsx)(r.bg, {
                          title: "Screen",
                          value: d.screen,
                          options: en,
                          onChange: u("screen"),
                        }),
                        (0, n.jsx)(r.W7, {
                          title: "Frame Color",
                          value: m ?? p[d.finish],
                          onChange: f,
                        }),
                        (0, n.jsx)(r.W7, {
                          title: "Screen Color",
                          value: b,
                          onChange: g,
                        }),
                        (0, n.jsx)(r.W7, {
                          title: "Shadow Color",
                          value: P,
                          onChange: y,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Width",
                          min: 160,
                          max: 360,
                          step: 1,
                          value: x,
                          valueUnit: "px",
                          onChange: w,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Rotate X",
                          min: -40,
                          max: 40,
                          step: 1,
                          value: d.rotateX,
                          valueUnit: "\xb0",
                          onChange: u("rotateX"),
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Rotate Y",
                          min: -50,
                          max: 50,
                          step: 1,
                          value: d.rotateY,
                          valueUnit: "\xb0",
                          onChange: u("rotateY"),
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Rotate Z",
                          min: -30,
                          max: 30,
                          step: 1,
                          value: d.rotateZ,
                          valueUnit: "\xb0",
                          onChange: u("rotateZ"),
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Tilt",
                          min: 0,
                          max: 25,
                          step: 1,
                          value: d.tilt,
                          valueUnit: "\xb0",
                          onChange: u("tilt"),
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Float",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: d.float,
                          onChange: u("float"),
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Lift",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: d.lift,
                          onChange: u("lift"),
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Reflection",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: d.reflection,
                          onChange: u("reflection"),
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Shadow",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: d.shadow,
                          onChange: u("shadow"),
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Bezel",
                          min: 0,
                          max: 2.5,
                          step: 0.01,
                          value: d.bezel,
                          onChange: u("bezel"),
                        }),
                        (0, n.jsx)(r.tl, {
                          title: "Island",
                          checked: M,
                          onChange: $,
                        }),
                        (0, n.jsx)(r.tl, {
                          title: "Drag",
                          checked: k,
                          onChange: q,
                        }),
                        (0, n.jsx)(r.tl, {
                          title: "Interactive",
                          checked: j,
                          onChange: C,
                        }),
                        (0, n.jsx)(r.tl, {
                          title: "Intro",
                          checked: S,
                          onChange: E,
                        }),
                        (0, n.jsx)(r.tl, {
                          title: "Paused",
                          checked: N,
                          onChange: I,
                        }),
                      ],
                    }),
                    (0, n.jsx)(r.Ub, { data: ei }),
                  ],
                }),
                (0, n.jsx)(r.lT, { children: (0, n.jsx)(r.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
