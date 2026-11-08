/* ReactBits Pro public preview module 58264 for parallax-pills.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/58264.ca7057bfb89572bd.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  58264: (e, t, n) => {
    (n.r(t), n.d(t, { default: () => y }));
    var a = n(95155),
      r = n(12115),
      i = n(30701),
      l = n(56388),
      s = n(90761),
      o = n(17192),
      d = n(32923),
      p = n(39551),
      u = n(75272),
      c = n(81106),
      g = n(90650);
    let h = [
        {
          label: "Components",
          background: "#0A0A0A",
          color: "#FFFFFF",
          x: 35,
          y: 28,
          width: 32,
          rotate: -3,
        },
        {
          label: "Animations",
          background: "#FFFFFF",
          color: "#0A0A0A",
          x: 70,
          y: 30,
          width: 28,
          rotate: 2,
        },
        {
          label: "Backgrounds",
          background: "#0A0A0A",
          color: "#FFFFFF",
          x: 50,
          y: 50,
          width: 38,
          rotate: 4,
        },
        {
          label: "Text Effects",
          background: "#FFFFFF",
          color: "#0A0A0A",
          x: 35,
          y: 72,
          width: 30,
          rotate: -2,
        },
        {
          label: "Blocks + Templates",
          background: "#0A0A0A",
          color: "#FFFFFF",
          x: 70,
          y: 72,
          width: 32,
          rotate: 3,
        },
      ],
      f = [
        { background: "#E8F1ED", x: 6, y: 22, width: 24, rotate: 0 },
        { background: "#E8F1ED", x: 96, y: 26, width: 20, rotate: 0 },
        { background: "#F4EAE0", x: 12, y: 50, width: 22, rotate: 0 },
        { background: "#F4EAE0", x: 92, y: 52, width: 20, rotate: 0 },
        { background: "#E8F1ED", x: 8, y: 76, width: 24, rotate: 0 },
        { background: "#E8F1ED", x: 96, y: 74, width: 20, rotate: 0 },
      ],
      m = ({
        pill: e,
        index: t,
        total: n,
        pillHeight: i,
        pillRadius: l,
        fontSize: s,
        fontWeight: u,
        parallaxStrength: c,
        pointerX: g,
        pointerY: h,
        parallaxStiffness: f,
        parallaxDamping: m,
        hingeChance: x,
        hingeAngle: y,
        entry: b,
        play: v,
        entryStagger: S,
        entryStiffness: w,
        entryDamping: F,
        entryDistance: E,
        isBackground: C,
        hideLabel: k,
      }) => {
        let j = (0, r.useMemo)(() => {
            if ("number" == typeof e.parallax) return e.parallax;
            let n = 0.5 + ((0.6180339887 * t) % 1) * 1.1;
            return C ? 0.35 * n : n;
          }, [e.parallax, t, C]),
          A = (0, r.useMemo)(
            () =>
              C || !b || x <= 0 || Math.random() >= x
                ? { active: !1, side: 0 }
                : { active: !0, side: 0.5 > Math.random() ? -1 : 1 },
            [b, x, C],
          ),
          D = e.rotate ?? 0,
          P = A.active ? D + A.side * y : 0,
          I = A.active ? (1 === A.side ? "0% 50%" : "100% 50%") : "50% 50%",
          N =
            0.5 >
            ((e) => {
              if ("string" != typeof e) return 1;
              let t = e.trim().replace(/^#/, "");
              if (
                (3 === t.length &&
                  (t = t
                    .split("")
                    .map((e) => e + e)
                    .join("")),
                6 !== t.length)
              )
                return 1;
              let n = parseInt(t.slice(0, 2), 16),
                a = parseInt(t.slice(2, 4), 16),
                r = parseInt(t.slice(4, 6), 16);
              return [n, a, r].some((e) => Number.isNaN(e))
                ? 1
                : (0.2126 * n + 0.7152 * a + 0.0722 * r) / 255;
            })(e.background),
          H = (0, o.z)(g, { stiffness: f, damping: m, mass: 1 }),
          R = (0, o.z)(h, { stiffness: f, damping: m, mass: 1 }),
          z = (0, d.G)(H, (e) => e * c * j),
          M = (0, d.G)(R, (e) => e * c * j * 0.6);
        return (0, a.jsx)(p.P.div, {
          style: {
            position: "absolute",
            left: `${e.x}%`,
            top: `${e.y}%`,
            width: `${e.width}%`,
            height: i,
            x: z,
            y: M,
            translateX: "-50%",
            translateY: "-50%",
            zIndex: C ? 0 : 1 + t,
            pointerEvents: "none",
          },
          children: (0, a.jsx)(p.P.div, {
            initial: b
              ? { y: `-${E}%`, opacity: 0, rotate: P }
              : { y: 0, opacity: 1, rotate: D },
            animate:
              b && !v
                ? { y: `-${E}%`, opacity: 0, rotate: P }
                : { y: 0, opacity: 1, rotate: D },
            transition: {
              type: "spring",
              stiffness: w,
              damping: F,
              mass: 1,
              delay: b && v ? t * S : 0,
            },
            style: {
              width: "100%",
              height: "100%",
              borderRadius: l,
              backgroundColor: e.background,
              display: "flex",
              alignItems: "center",
              paddingLeft: 0.45 * i,
              paddingRight: 0.45 * i,
              transformOrigin: I,
              boxShadow: N
                ? "inset 0 0 0 1px rgba(255,255,255,0.10), 0 1px 2px rgba(0,0,0,0.5), 0 8px 24px rgba(255,255,255,0.06)"
                : "inset 0 0 0 1px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08)",
              willChange: "transform",
            },
            children:
              !k &&
              (0, a.jsx)("span", {
                style: {
                  color: e.color,
                  fontSize: s,
                  fontWeight: u,
                  letterSpacing: "-0.01em",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                },
                children: e.label,
              }),
          }),
        });
      },
      x = ({
        pills: e = h,
        backgroundPills: t = f,
        width: n = "100%",
        height: i = 480,
        className: l,
        pillRadius: s = 18,
        pillHeight: o = 64,
        fontSize: d = 18,
        fontWeight: p = 500,
        parallaxStrength: x = 24,
        disableParallax: y = !1,
        disableEmptyPills: b = !0,
        disableEntry: v = !1,
        entryStagger: S = 0.08,
        entryStiffness: w = 140,
        entryDamping: F = 11,
        entryDistance: E = 220,
        parallaxStiffness: C = 60,
        parallaxDamping: k = 18,
        hingeChance: j = 0.5,
        hingeAngle: A = 18,
      }) => {
        let D = (0, r.useRef)(null),
          P = (0, u.d)(0),
          I = (0, u.d)(0);
        (0, r.useEffect)(() => {
          if (y) return;
          let e = D.current;
          if (!e) return;
          let t = (t) => {
              let n = e.getBoundingClientRect(),
                a = ((t.clientX - n.left) / n.width) * 2 - 1,
                r = ((t.clientY - n.top) / n.height) * 2 - 1;
              (P.set(a), I.set(r));
            },
            n = () => {
              (P.set(0), I.set(0));
            };
          return (
            e.addEventListener("pointermove", t),
            e.addEventListener("pointerleave", n),
            () => {
              (e.removeEventListener("pointermove", t),
                e.removeEventListener("pointerleave", n));
            }
          );
        }, [y, P, I]);
        let N = (0, c.W)(D, { once: !0, margin: "0px 0px -10% 0px" }),
          H = !v;
        return (0, a.jsxs)("div", {
          ref: D,
          className: (0, g.cn)("relative overflow-hidden", l),
          style: { width: n, height: i },
          children: [
            !b &&
              t.map((e, n) =>
                (0, a.jsx)(
                  m,
                  {
                    pill: { ...e, label: "", color: "transparent" },
                    index: n,
                    total: t.length,
                    pillHeight: o,
                    pillRadius: s,
                    fontSize: d,
                    fontWeight: p,
                    parallaxStrength: x,
                    pointerX: P,
                    pointerY: I,
                    parallaxStiffness: C,
                    parallaxDamping: k,
                    hingeChance: j,
                    hingeAngle: A,
                    entry: H,
                    play: N,
                    entryStagger: S,
                    entryStiffness: w,
                    entryDamping: F,
                    entryDistance: E,
                    isBackground: !0,
                    hideLabel: !0,
                  },
                  `bg-${n}`,
                ),
              ),
            e.map((t, n) =>
              (0, a.jsx)(
                m,
                {
                  pill: t,
                  index: n,
                  total: e.length,
                  pillHeight: o,
                  pillRadius: s,
                  fontSize: d,
                  fontWeight: p,
                  parallaxStrength: x,
                  pointerX: P,
                  pointerY: I,
                  parallaxStiffness: C,
                  parallaxDamping: k,
                  hingeChance: j,
                  hingeAngle: A,
                  entry: H,
                  play: N,
                  entryStagger: S,
                  entryStiffness: w,
                  entryDamping: F,
                  entryDistance: E,
                },
                `fg-${n}-${t.label}`,
              ),
            ),
          ],
        });
      };
    x.displayName = "ParallaxPills";
    let y = () => {
      let [e, t] = (0, s.I)(),
        { resolvedTheme: n } = (0, i.D)(),
        [o, d] = (0, r.useState)(64),
        [p, u] = (0, r.useState)(18),
        [c, g] = (0, r.useState)(18),
        [h, f] = (0, r.useState)(24),
        [m, y] = (0, r.useState)(!1),
        [b, v] = (0, r.useState)(!0),
        [S, w] = (0, r.useState)(60),
        [F, E] = (0, r.useState)(18),
        [C, k] = (0, r.useState)(!1),
        [j, A] = (0, r.useState)(0.08),
        [D, P] = (0, r.useState)(140),
        [I, N] = (0, r.useState)(11),
        [H, R] = (0, r.useState)(220),
        [z, M] = (0, r.useState)(0.5),
        [G, L] = (0, r.useState)(18),
        T = (0, r.useMemo)(() => {
          let e = "dark" === n,
            t = "#0A0A0A",
            a = "#FFFFFF",
            r = e ? a : t,
            i = e ? t : a,
            l = e ? t : a,
            s = e ? a : t;
          return [
            {
              label: "Components",
              background: r,
              color: l,
              x: 35,
              y: 28,
              width: 32,
              rotate: -3,
            },
            {
              label: "Animations",
              background: i,
              color: s,
              x: 70,
              y: 30,
              width: 28,
              rotate: 2,
            },
            {
              label: "Backgrounds",
              background: r,
              color: l,
              x: 50,
              y: 50,
              width: 38,
              rotate: 4,
            },
            {
              label: "Text Effects",
              background: i,
              color: s,
              x: 35,
              y: 72,
              width: 30,
              rotate: -2,
            },
            {
              label: "Blocks + Templates",
              background: r,
              color: l,
              x: 70,
              y: 72,
              width: 32,
              rotate: 3,
            },
          ];
        }, [n]);
      return (0, a.jsxs)("div", {
        children: [
          (0, a.jsx)(l.Bg, {}),
          (0, a.jsxs)(l.VX, {
            children: [
              (0, a.jsxs)(l.Ec, {
                children: [
                  (0, a.jsx)(l.Ch, {
                    onRefresh: t,
                    minHeight: 520,
                    children: (0, a.jsx)(
                      x,
                      {
                        width: "100%",
                        height: "100%",
                        pills: T,
                        pillHeight: o,
                        pillRadius: p,
                        fontSize: c,
                        parallaxStrength: h,
                        disableParallax: m,
                        disableEmptyPills: b,
                        disableEntry: C,
                        entryStagger: j,
                        entryStiffness: D,
                        entryDamping: I,
                        entryDistance: H,
                        hingeChance: z,
                        hingeAngle: G,
                        parallaxStiffness: S,
                        parallaxDamping: F,
                      },
                      e,
                    ),
                  }),
                  (0, a.jsxs)(l.IH, {
                    children: [
                      (0, a.jsx)(l.yt, {
                        title: "Pill Height",
                        value: o,
                        onChange: d,
                        min: 32,
                        max: 120,
                        step: 1,
                      }),
                      (0, a.jsx)(l.yt, {
                        title: "Pill Radius",
                        value: p,
                        onChange: u,
                        min: 8,
                        max: 48,
                        step: 1,
                      }),
                      (0, a.jsx)(l.yt, {
                        title: "Font Size",
                        value: c,
                        onChange: g,
                        min: 10,
                        max: 32,
                        step: 1,
                      }),
                      (0, a.jsx)(l.tl, {
                        title: "Disable Entry",
                        checked: C,
                        onChange: k,
                      }),
                      (0, a.jsx)(l.yt, {
                        title: "Stagger",
                        value: j,
                        onChange: A,
                        min: 0,
                        max: 0.4,
                        step: 0.01,
                      }),
                      (0, a.jsx)(l.yt, {
                        title: "Entry Stiffness",
                        value: D,
                        onChange: P,
                        min: 40,
                        max: 400,
                        step: 5,
                      }),
                      (0, a.jsx)(l.yt, {
                        title: "Entry Damping",
                        value: I,
                        onChange: N,
                        min: 4,
                        max: 30,
                        step: 0.5,
                      }),
                      (0, a.jsx)(l.yt, {
                        title: "Entry Distance",
                        value: H,
                        onChange: R,
                        min: 50,
                        max: 800,
                        step: 10,
                      }),
                      (0, a.jsx)(l.yt, {
                        title: "Hinge Chance",
                        value: z,
                        onChange: M,
                        min: 0,
                        max: 1,
                        step: 0.05,
                      }),
                      (0, a.jsx)(l.yt, {
                        title: "Hinge Angle",
                        value: G,
                        onChange: L,
                        min: 0,
                        max: 45,
                        step: 1,
                      }),
                      (0, a.jsx)(l.tl, {
                        title: "Disable Parallax",
                        checked: m,
                        onChange: y,
                      }),
                      (0, a.jsx)(l.tl, {
                        title: "Disable Empty Pills",
                        checked: b,
                        onChange: v,
                      }),
                      (0, a.jsx)(l.yt, {
                        title: "Strength",
                        value: h,
                        onChange: f,
                        min: 0,
                        max: 80,
                        step: 1,
                      }),
                      (0, a.jsx)(l.yt, {
                        title: "Drift Stiffness",
                        value: S,
                        onChange: w,
                        min: 10,
                        max: 200,
                        step: 2,
                      }),
                      (0, a.jsx)(l.yt, {
                        title: "Drift Damping",
                        value: F,
                        onChange: E,
                        min: 4,
                        max: 40,
                        step: 0.5,
                      }),
                    ],
                  }),
                  (0, a.jsx)(l.Ub, {
                    data: [
                      {
                        name: "pills",
                        type: "ParallaxPillItem[]",
                        default: "5 default pills",
                        description:
                          "Foreground pills. Each item has label, background, color, x/y/width as percentages, optional rotate and parallax multiplier",
                      },
                      {
                        name: "backgroundPills",
                        type: "Omit<ParallaxPillItem, 'label' | 'color'>[]",
                        default: "6 decorative pills",
                        description:
                          "Decorative unlabeled pills behind the foreground for depth",
                      },
                      {
                        name: "width",
                        type: "string | number",
                        default: '"100%"',
                        description: "Container width",
                      },
                      {
                        name: "height",
                        type: "string | number",
                        default: "480",
                        description: "Container height",
                      },
                      {
                        name: "className",
                        type: "string",
                        default: '""',
                        description:
                          "Additional CSS classes for the outer container",
                      },
                      {
                        name: "pillRadius",
                        type: "number",
                        default: "18",
                        description: "Pill border-radius in px (8–48)",
                      },
                      {
                        name: "pillHeight",
                        type: "number",
                        default: "64",
                        description: "Pill vertical height in px (32–120)",
                      },
                      {
                        name: "fontSize",
                        type: "number",
                        default: "18",
                        description: "Label font size in px (10–32)",
                      },
                      {
                        name: "fontWeight",
                        type: "number | string",
                        default: "500",
                        description: "Label font weight",
                      },
                      {
                        name: "parallaxStrength",
                        type: "number",
                        default: "24",
                        description:
                          "Maximum cursor parallax displacement in px (mapped to \xb1strength) (0–80)",
                      },
                      {
                        name: "disableParallax",
                        type: "boolean",
                        default: "false",
                        description: "Disable cursor parallax entirely",
                      },
                      {
                        name: "disableEmptyPills",
                        type: "boolean",
                        default: "true",
                        description:
                          "Hide the decorative unlabeled background pills",
                      },
                      {
                        name: "disableEntry",
                        type: "boolean",
                        default: "false",
                        description:
                          "Disable the elastic entry animation; pills render in their resting state",
                      },
                      {
                        name: "entryStagger",
                        type: "number",
                        default: "0.08",
                        description:
                          "Stagger between pill entry animations in seconds (0–0.4)",
                      },
                      {
                        name: "entryStiffness",
                        type: "number",
                        default: "140",
                        description:
                          "Spring stiffness for the entry bounce (40–400)",
                      },
                      {
                        name: "entryDamping",
                        type: "number",
                        default: "11",
                        description:
                          "Spring damping for the entry bounce; lower values overshoot more (4–30)",
                      },
                      {
                        name: "entryDistance",
                        type: "number",
                        default: "220",
                        description:
                          "How far above their resting position pills start, as a percent of pill height. Larger values make pills fall from higher up (50–800)",
                      },
                      {
                        name: "hingeChance",
                        type: "number",
                        default: "0.5",
                        description:
                          "Probability (0–1) that a pill enters with a hinge tilt. One end hanging lower as if heavier, then springing back",
                      },
                      {
                        name: "hingeAngle",
                        type: "number",
                        default: "18",
                        description:
                          "Magnitude of the initial hinge tilt in degrees; the heavy end starts this far past resting (0–45)",
                      },
                      {
                        name: "parallaxStiffness",
                        type: "number",
                        default: "60",
                        description:
                          "Spring stiffness for the parallax drift (10–200)",
                      },
                      {
                        name: "parallaxDamping",
                        type: "number",
                        default: "18",
                        description:
                          "Spring damping for the parallax drift (4–40)",
                      },
                    ],
                  }),
                ],
              }),
              (0, a.jsx)(l.lT, { children: (0, a.jsx)(l.Gv, {}) }),
            ],
          }),
        ],
      });
    };
  },
};
