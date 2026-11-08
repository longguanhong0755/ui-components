/* ReactBits Pro public preview module 11085 for credit-card.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/11085.422e3742623efb54.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  11085: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => x }));
    var s = a(95155),
      n = a(12115),
      l = a(56388),
      i = a(90761),
      r = a(25054),
      o = a(99018),
      d = a(48203),
      c = a(91064),
      u = a(39551),
      p = a(90650);
    let h = ({
        cardNumber: e = "1234 5678 9012 3456",
        cardholderName: t = "JOHN DOE",
        expirationDate: a = "12/25",
        cvv: l = "123",
        cardLogo: i,
        chipImage: h,
        background: x = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        scale: m = 1.2,
        rotationIntensity: f = 1,
        parallaxIntensity: g = 1,
        scaleOnHover: b = 1.05,
        showShine: y = !0,
        showShadow: w = !0,
        borderRadius: j = 16,
        textColor: v = "#ffffff",
        hasTextShadow: N = !0,
        showActionButtons: S = !1,
        className: C,
        cardClassName: $,
        buttonsClassName: k,
      }) => {
        let R,
          E = (0, n.useRef)(null),
          T = (0, n.useRef)(null),
          D = (0, n.useRef)(null),
          H = (0, n.useRef)(null),
          I = (0, n.useRef)(null),
          [M, O] = (0, n.useState)(!1),
          [P, Y] = (0, n.useState)(!0),
          [A, B] = (0, n.useState)(!1),
          [_, z] = (0, n.useState)(!1),
          [U, X] = (0, n.useState)(!1),
          V = (e.replace(/\s/g, "").match(/.{1,4}/g) || []).join(" "),
          L = P
            ? V
            : 0 === (R = e.replace(/\s/g, "").match(/.{1,4}/g) || []).length
              ? e
              : R.map((e, t) => (0 === t ? e : "****")).join(" "),
          W = P ? a : "**/**",
          J = 320 * m,
          G = (0, n.useCallback)((e, t) => {
            if (!E.current) return null;
            let a = E.current.getBoundingClientRect(),
              s = E.current.clientWidth,
              n = E.current.clientHeight,
              l = 0.5 - (e - a.left) / s,
              i = 0.5 - (t - a.top) / n;
            return {
              normalizedX: l,
              normalizedY: i,
              deltaX: e - a.left - s / 2,
              deltaY: t - a.top - n / 2,
              relativeY: t - a.top,
              width: s,
              height: n,
            };
          }, []),
          F = (0, n.useCallback)(
            (e) => {
              if (!E.current || !T.current) return;
              let t = "touches" in e,
                a = G(
                  t ? e.touches[0].pageX : e.pageX,
                  t ? e.touches[0].pageY : e.pageY,
                );
              if (!a) return;
              let {
                  normalizedX: s,
                  normalizedY: n,
                  deltaX: l,
                  deltaY: i,
                  relativeY: r,
                  width: o,
                  height: d,
                } = a,
                c = 320 / o,
                u = 0.08 * c * f,
                p = 0.06 * c * f * (s - l),
                h = (i - n) * u,
                x = _
                  ? `rotateY(${180 + p}deg) rotateX(${h}deg)`
                  : `rotateX(${h}deg) rotateY(${p}deg)`;
              (M && (x += ` scale3d(${b}, ${b}, ${b})`),
                (T.current.style.transform = x));
              let m = (180 * Math.atan2(i, l)) / Math.PI - 90;
              if ((m < 0 && (m += 360), D.current)) {
                D.current.style.background = `linear-gradient(${m}deg, rgba(255,255,255,${(r / d) * 0.35 + 0.05}) 0%, rgba(255,255,255,0) 75%)`;
                let e = _ ? " rotateY(180deg)" : "";
                D.current.style.transform = `translateX(${2 * s - 0.15}px) translateY(${2 * n - 0.15}px)${e}`;
              }
              if (!_) {
                let e = 2.8 * g;
                (H.current &&
                  (H.current.style.transform = `translate3d(${(2 * s * (0 * e)) / c}px, ${(2 * n * (0 * e)) / c}px, 0)`),
                  I.current &&
                    (I.current.style.transform = `translate3d(${(2 * s * e) / c}px, ${(2 * n * e) / c}px, 0)`));
              }
            },
            [_, M, G, f, g, b, 320],
          ),
          q = (0, n.useCallback)(() => {
            O(!0);
          }, []),
          K = (0, n.useCallback)(() => {
            (O(!1),
              T.current &&
                (T.current.style.transform = _ ? "rotateY(180deg)" : ""),
              D.current && (D.current.style.cssText = ""),
              H.current && (H.current.style.transform = ""),
              I.current && (I.current.style.transform = ""));
          }, [_]),
          Q = (0, n.useCallback)(() => {
            O(!0);
          }, []),
          Z = (0, n.useCallback)(() => {
            K();
          }, [K]),
          ee = (0, n.useCallback)(() => {
            P &&
              (navigator.clipboard.writeText(e),
              B(!0),
              setTimeout(() => B(!1), 2e3));
          }, [e, P]),
          et = (0, n.useCallback)(() => {
            (X(!0), z((e) => !e), setTimeout(() => X(!1), 600));
          }, []),
          ea = {
            cardNumber: `${20 * m}px`,
            label: `${10 * m}px`,
            text: `${12 * m}px`,
          },
          es = {
            padding: `${24 * m}px`,
            gap: `${12 * m}px`,
            chipWidth: `${40 * m}px`,
            chipHeight: `${32 * m}px`,
            logoHeight: `${32 * m}px`,
          };
        return (0, s.jsxs)(u.P.div, {
          className: (0, p.cn)("inline-flex flex-col items-center gap-4", C),
          initial: { opacity: 0, scale: 0.8, y: 20 },
          animate: { opacity: 1, scale: 1, y: 0 },
          transition: { duration: 0.6, ease: [0.34, 1.56, 0.64, 1] },
          children: [
            (0, s.jsx)("div", {
              ref: E,
              className:
                "relative inline-block touch-none cursor-pointer transform-3d",
              style: {
                width: `${J}px`,
                height: `${200 * m}px`,
                borderRadius: `${j}px`,
                transform: `perspective(${3 * J}px)`,
              },
              onMouseMove: F,
              onMouseEnter: q,
              onMouseLeave: K,
              onTouchStart: Q,
              onTouchMove: F,
              onTouchEnd: Z,
              onClick: et,
              children: (0, s.jsxs)(u.P.div, {
                ref: T,
                className: (0, p.cn)(
                  "relative w-full h-full will-change-transform transition-transform duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform-3d",
                  M && "active-state",
                  $,
                ),
                style: { borderRadius: `${j}px` },
                animate: { rotateY: 180 * !!_ },
                transition: { duration: 0.6, ease: "easeInOut" },
                children: [
                  w &&
                    (0, s.jsx)(u.P.div, {
                      className: (0, p.cn)(
                        "absolute top-[5%] left-[5%] w-[90%] h-[90%] bg-transparent transition-all duration-200 ease-out",
                        M
                          ? "shadow-[0_45px_100px_rgba(14,21,47,0.4),0_16px_40px_rgba(14,21,47,0.4)]"
                          : "shadow-[0_8px_30px_rgba(14,21,47,0.6)]",
                      ),
                      style: { borderRadius: `${j}px` },
                      animate: { opacity: +!U },
                      transition: { duration: 0.3, ease: "easeInOut" },
                    }),
                  (0, s.jsxs)("div", {
                    className:
                      "absolute inset-0 w-full h-full overflow-hidden transform-3d backface-hidden",
                    style: { borderRadius: `${j}px` },
                    children: [
                      (0, s.jsx)("div", {
                        ref: H,
                        className: "absolute inset-0 w-full h-full",
                        style: { background: x, borderRadius: `${j}px` },
                      }),
                      (0, s.jsxs)("div", {
                        ref: I,
                        className:
                          "absolute inset-0 w-full h-full flex flex-col justify-between",
                        style: {
                          borderRadius: `${j}px`,
                          color: v,
                          padding: es.padding,
                        },
                        children: [
                          (0, s.jsxs)("div", {
                            className: "flex justify-between items-start",
                            children: [
                              (0, s.jsx)("div", {
                                className: "flex items-center",
                                style: { gap: es.gap },
                                children:
                                  h &&
                                  (0, s.jsx)("img", {
                                    src: h,
                                    alt: "Card chip",
                                    className: "object-contain",
                                    style: {
                                      width: es.chipWidth,
                                      height: es.chipHeight,
                                    },
                                  }),
                              }),
                              i &&
                                (0, s.jsx)("img", {
                                  src: i,
                                  alt: "Card logo",
                                  className: "object-contain",
                                  style: { height: es.logoHeight },
                                }),
                            ],
                          }),
                          (0, s.jsx)("div", {
                            className:
                              "w-full flex justify-between font-mono font-medium",
                            style: {
                              fontSize: ea.cardNumber,
                              textShadow: N
                                ? "0 2px 4px rgba(0, 0, 0, 0.3)"
                                : "none",
                            },
                            children: L.split(" ").map((e, t) =>
                              (0, s.jsx)(
                                "span",
                                {
                                  className: "inline-flex tracking-wider",
                                  children: e
                                    .split("")
                                    .map((e, a) =>
                                      (0, s.jsx)(
                                        u.P.span,
                                        {
                                          initial: { scale: 0, opacity: 0 },
                                          animate: { scale: 1, opacity: 1 },
                                          exit: { scale: 0, opacity: 0 },
                                          transition: {
                                            duration: 0.2,
                                            delay: (4 * t + a) * 0.02,
                                            ease: "easeOut",
                                          },
                                          className: "inline-block",
                                          children: e,
                                        },
                                        `${t}-${a}-${e}-${P}`,
                                      ),
                                    ),
                                },
                                t,
                              ),
                            ),
                          }),
                          (0, s.jsxs)("div", {
                            className: "flex justify-between items-end",
                            style: { fontSize: ea.text },
                            children: [
                              (0, s.jsxs)("div", {
                                className: "flex flex-col",
                                children: [
                                  (0, s.jsx)("span", {
                                    className: "opacity-70",
                                    style: {
                                      fontSize: ea.label,
                                      marginBottom: `${4 * m}px`,
                                    },
                                    children: "CARDHOLDER",
                                  }),
                                  (0, s.jsx)("span", {
                                    className:
                                      "uppercase font-medium tracking-wide",
                                    style: {
                                      textShadow: N
                                        ? "0 2px 4px rgba(0, 0, 0, 0.3)"
                                        : "none",
                                    },
                                    children: t,
                                  }),
                                ],
                              }),
                              (0, s.jsxs)("div", {
                                className: "flex flex-col items-end",
                                children: [
                                  (0, s.jsx)("span", {
                                    className: "opacity-70",
                                    style: {
                                      fontSize: ea.label,
                                      marginBottom: `${4 * m}px`,
                                    },
                                    children: "EXPIRES",
                                  }),
                                  (0, s.jsx)("span", {
                                    className: "inline-flex",
                                    style: {
                                      textShadow: N
                                        ? "0 2px 4px rgba(0, 0, 0, 0.3)"
                                        : "none",
                                    },
                                    children: W.split("").map((e, t) =>
                                      (0, s.jsx)(
                                        u.P.span,
                                        {
                                          initial: { scale: 0, opacity: 0 },
                                          animate: { scale: 1, opacity: 1 },
                                          exit: { scale: 0, opacity: 0 },
                                          transition: {
                                            duration: 0.2,
                                            delay: 0.03 * t,
                                            ease: "easeOut",
                                          },
                                          className: "inline-block",
                                          children: e,
                                        },
                                        `exp-${t}-${e}-${P}`,
                                      ),
                                    ),
                                  }),
                                ],
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                  (0, s.jsxs)("div", {
                    className:
                      "absolute inset-0 w-full h-full overflow-hidden transform-3d backface-hidden",
                    style: {
                      borderRadius: `${j}px`,
                      transform: "rotateY(180deg)",
                    },
                    children: [
                      (0, s.jsx)("div", {
                        className: "absolute inset-0 w-full h-full",
                        style: { background: x, borderRadius: `${j}px` },
                      }),
                      (0, s.jsxs)("div", {
                        className:
                          "absolute inset-0 w-full h-full flex flex-col",
                        style: { borderRadius: `${j}px`, color: v },
                        children: [
                          (0, s.jsx)("div", {
                            className: "w-full bg-black",
                            style: {
                              height: `${40 * m}px`,
                              marginTop: `${20 * m}px`,
                            },
                          }),
                          (0, s.jsx)("div", {
                            className: "flex-1 flex items-center justify-start",
                            style: { paddingLeft: es.padding },
                            children: (0, s.jsxs)("div", {
                              className:
                                "bg-white flex flex-col items-start justify-center",
                              style: {
                                width: `${120 * m}px`,
                                height: `${40 * m}px`,
                                paddingLeft: `${12 * m}px`,
                                borderRadius: `${4 * m}px`,
                              },
                              children: [
                                (0, s.jsx)("span", {
                                  className: "text-gray-500",
                                  style: {
                                    fontSize: ea.label,
                                    marginBottom: `${2 * m}px`,
                                  },
                                  children: "CVV",
                                }),
                                (0, s.jsx)("span", {
                                  className:
                                    "text-gray-900 font-mono font-semibold tracking-wider",
                                  style: { fontSize: ea.text },
                                  children: P ? l : "***",
                                }),
                              ],
                            }),
                          }),
                        ],
                      }),
                    ],
                  }),
                  y &&
                    (0, s.jsx)("div", {
                      className:
                        "absolute inset-0 w-full h-full pointer-events-none overflow-hidden",
                      style: { borderRadius: `${j}px` },
                      children: (0, s.jsx)("div", {
                        ref: D,
                        className: "absolute inset-0 w-full h-full",
                        style: {
                          background:
                            "linear-gradient(135deg, rgba(255,255,255,.25) 0%, rgba(255,255,255,0) 60%)",
                        },
                      }),
                    }),
                ],
              }),
            }),
            S &&
              (0, s.jsxs)("div", {
                className: (0, p.cn)("flex gap-2", k),
                children: [
                  (0, s.jsx)("button", {
                    onClick: () => Y(!P),
                    className:
                      "w-10 h-10 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow duration-200 flex items-center justify-center",
                    title: P ? "Hide details" : "Show details",
                    children: P
                      ? (0, s.jsx)(r.A, { className: "w-5 h-5 text-gray-700" })
                      : (0, s.jsx)(o.A, { className: "w-5 h-5 text-gray-700" }),
                  }),
                  (0, s.jsx)("button", {
                    onClick: ee,
                    disabled: !P,
                    className: (0, p.cn)(
                      "w-10 h-10 rounded-full bg-white shadow-md transition-all duration-200 flex items-center justify-center",
                      P
                        ? "hover:shadow-lg cursor-pointer"
                        : "opacity-50 cursor-not-allowed",
                    ),
                    title: P
                      ? A
                        ? "Copied!"
                        : "Copy card number"
                      : "Show details to copy",
                    children: A
                      ? (0, s.jsx)(d.A, { className: "w-5 h-5 text-green-600" })
                      : (0, s.jsx)(c.A, { className: "w-5 h-5 text-gray-700" }),
                  }),
                ],
              }),
          ],
        });
      },
      x = () => {
        let [e, t] = (0, i.I)(),
          [a, r] = (0, n.useState)("1234 5678 9012 3456"),
          [o, d] = (0, n.useState)("JOHN DOE"),
          [c, u] = (0, n.useState)("12/25"),
          [p, x] = (0, n.useState)("123"),
          [m, f] = (0, n.useState)(
            "linear-gradient(45deg, #fff 0%, #c4c4c4 100%)",
          ),
          [g, b] = (0, n.useState)("#000000"),
          [y, w] = (0, n.useState)(!0),
          [j, v] = (0, n.useState)(1.2),
          [N, S] = (0, n.useState)(16),
          [C, $] = (0, n.useState)(1),
          [k, R] = (0, n.useState)(1),
          [E, T] = (0, n.useState)(1.05),
          [D, H] = (0, n.useState)(!0),
          [I, M] = (0, n.useState)(!0),
          [O, P] = (0, n.useState)(!1);
        return (0, s.jsxs)("div", {
          children: [
            (0, s.jsx)(l.Bg, {}),
            (0, s.jsxs)(l.VX, {
              children: [
                (0, s.jsxs)(l.Ec, {
                  children: [
                    (0, s.jsx)(l.Ch, {
                      onRefresh: t,
                      children: (0, s.jsx)(
                        h,
                        {
                          cardNumber: a,
                          cardholderName: o,
                          expirationDate: c,
                          cvv: p,
                          background: m || void 0,
                          textColor: g,
                          hasTextShadow: y,
                          scale: j,
                          borderRadius: N,
                          rotationIntensity: C,
                          parallaxIntensity: k,
                          scaleOnHover: E,
                          showShine: D,
                          showShadow: I,
                          showActionButtons: O,
                        },
                        e,
                      ),
                    }),
                    (0, s.jsxs)(l.IH, {
                      children: [
                        (0, s.jsx)(l.UD, {
                          title: "Card Number",
                          value: a,
                          onChange: (e) => r(e),
                          placeholder: "1234 5678 9012 3456",
                        }),
                        (0, s.jsx)(l.UD, {
                          title: "Cardholder Name",
                          value: o,
                          onChange: (e) => d(e),
                          placeholder: "JOHN DOE",
                        }),
                        (0, s.jsx)(l.UD, {
                          title: "Expiration Date",
                          value: c,
                          onChange: (e) => u(e),
                          placeholder: "12/25",
                        }),
                        (0, s.jsx)(l.UD, {
                          title: "CVV",
                          value: p,
                          onChange: (e) => x(e),
                          placeholder: "123",
                        }),
                        (0, s.jsx)(l.W7, {
                          title: "Text Color",
                          value: g,
                          onChange: (e) => b(e),
                        }),
                        (0, s.jsx)(l.UD, {
                          title: "Background",
                          value: m,
                          onChange: (e) => f(e),
                          placeholder:
                            "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        }),
                        (0, s.jsx)(l.yt, {
                          title: "Scale",
                          value: j,
                          onChange: v,
                          min: 0.5,
                          max: 2,
                          step: 0.1,
                        }),
                        (0, s.jsx)(l.yt, {
                          title: "Border Radius",
                          value: N,
                          onChange: S,
                          min: 0,
                          max: 32,
                          step: 1,
                          valueUnit: "px",
                        }),
                        (0, s.jsx)(l.tl, {
                          title: "Text Shadow",
                          checked: y,
                          onChange: w,
                        }),
                        (0, s.jsx)(l.yt, {
                          title: "Rotation Intensity",
                          value: C,
                          onChange: $,
                          min: 0,
                          max: 2,
                          step: 0.1,
                        }),
                        (0, s.jsx)(l.yt, {
                          title: "Parallax Intensity",
                          value: k,
                          onChange: R,
                          min: 0,
                          max: 2,
                          step: 0.1,
                        }),
                        (0, s.jsx)(l.yt, {
                          title: "Scale on Hover",
                          value: E,
                          onChange: T,
                          min: 1,
                          max: 1.2,
                          step: 0.01,
                        }),
                        (0, s.jsx)(l.tl, {
                          title: "Show Shine",
                          checked: D,
                          onChange: H,
                        }),
                        (0, s.jsx)(l.tl, {
                          title: "Show Shadow",
                          checked: I,
                          onChange: M,
                        }),
                        (0, s.jsx)(l.tl, {
                          title: "Show Action Buttons",
                          checked: O,
                          onChange: P,
                        }),
                      ],
                    }),
                    (0, s.jsx)(l.Ub, {
                      data: [
                        {
                          name: "cardNumber",
                          type: "string",
                          default: '"1234 5678 9012 3456"',
                          description:
                            "Card number (will be automatically formatted with spaces)",
                        },
                        {
                          name: "cardholderName",
                          type: "string",
                          default: '"JOHN DOE"',
                          description:
                            "Name of the cardholder displayed on the card",
                        },
                        {
                          name: "expirationDate",
                          type: "string",
                          default: '"12/25"',
                          description: "Card expiration date in MM/YY format",
                        },
                        {
                          name: "cvv",
                          type: "string",
                          default: '"123"',
                          description:
                            "CVV code (3 digits) shown on the back when card is flipped",
                        },
                        {
                          name: "cardLogo",
                          type: "string",
                          default: "undefined",
                          description:
                            "URL for card company logo (Visa, Mastercard, etc.)",
                        },
                        {
                          name: "chipImage",
                          type: "string",
                          default: "undefined",
                          description: "URL for card chip image (optional)",
                        },
                        {
                          name: "background",
                          type: "string",
                          default: "random gradient",
                          description:
                            "CSS gradient or color for card background",
                        },
                        {
                          name: "textColor",
                          type: "string",
                          default: '"#ffffff"',
                          description: "Color for all text on the card",
                        },
                        {
                          name: "hasTextShadow",
                          type: "boolean",
                          default: "true",
                          description:
                            "Enable text shadow on card number, name, and expiration date",
                        },
                        {
                          name: "scale",
                          type: "number",
                          default: "1.2",
                          description:
                            "Scale factor for card size (maintains aspect ratio)",
                        },
                        {
                          name: "rotationIntensity",
                          type: "number",
                          default: "1",
                          description:
                            "Multiplier for the 3D rotation effect intensity (0-2)",
                        },
                        {
                          name: "parallaxIntensity",
                          type: "number",
                          default: "1",
                          description:
                            "Multiplier for the parallax layer movement intensity (0-2)",
                        },
                        {
                          name: "scaleOnHover",
                          type: "number",
                          default: "1.05",
                          description:
                            "Scale factor applied when hovering over the card",
                        },
                        {
                          name: "showShine",
                          type: "boolean",
                          default: "true",
                          description:
                            "Enable or disable the dynamic shine gradient effect",
                        },
                        {
                          name: "showShadow",
                          type: "boolean",
                          default: "true",
                          description: "Enable or disable the shadow effect",
                        },
                        {
                          name: "borderRadius",
                          type: "number",
                          default: "16",
                          description: "Border radius of the card in pixels",
                        },
                        {
                          name: "showActionButtons",
                          type: "boolean",
                          default: "false",
                          description:
                            "Show action buttons below card (eye to toggle visibility, copy to clipboard)",
                        },
                        {
                          name: "className",
                          type: "string",
                          default: '""',
                          description:
                            "Additional CSS classes to apply to the wrapper",
                        },
                        {
                          name: "cardClassName",
                          type: "string",
                          default: '""',
                          description:
                            "Additional CSS classes to apply to the card element",
                        },
                        {
                          name: "buttonsClassName",
                          type: "string",
                          default: '""',
                          description:
                            "Additional CSS classes to apply to the action buttons container",
                        },
                      ],
                    }),
                  ],
                }),
                (0, s.jsx)(l.lT, { children: (0, s.jsx)(l.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
