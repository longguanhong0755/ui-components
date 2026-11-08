/* ReactBits Pro public preview module 13430 for circles.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/13430.6606e9a5a352af4e.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  13430: (e, t, r) => {
    "use strict";
    (r.r(t), r.d(t, { default: () => d }));
    var n = r(95155),
      a = r(12115),
      i = r(56388),
      l = r(45949),
      o = r(90761),
      s = r(21211),
      c = r.n(s),
      u = r(90650);
    let p = ({
      rows: e = [
        [
          "/demo-media/portrait-sienna.webp",
          "/demo-media/portrait-indigo.webp",
        ],
        [
          "/demo-media/portrait-olive.webp",
          "/demo-media/portrait-silver.webp",
          "/demo-media/portrait-ochre.webp",
        ],
        [
          "/demo-media/portrait-rose.webp",
          "/demo-media/portrait-teal.webp",
          "/demo-media/portrait-pearl.webp",
          "/demo-media/portrait-sienna.webp",
        ],
      ],
      circleSize: t = 64,
      baseRadius: r = 120,
      orbitGap: i = 100,
      rotationDuration: l = 20,
      rowDelay: o = 0.5,
      direction: s = "clockwise",
      alternateDirection: p = !1,
      fadeMode: h = "none",
      fadeBlur: d = !1,
      showPaths: g = !0,
      animate: m = !0,
      animationDuration: f = 0.6,
      animationStagger: b = 0.15,
      staggerScaleFactor: y = 0,
      className: $,
    }) => {
      let x = (0, a.useMemo)(() => e.map((e) => [...e]), [e]),
        v = (r + (x.length - 1) * i + t) * 2;
      return (0, n.jsxs)("div", {
        style: {
          width: `${v}px`,
          height: `${v}px`,
          animation: m ? "circles-container-fade-in 0.8s ease-out" : void 0,
        },
        className:
          c().dynamic([
            [
              "32176ae4e8456b31",
              [
                x
                  .map(
                    (e, t) => `
          @keyframes circles-orbit-${t} {
            from {
              transform: translate(-50%, -50%) rotate(0deg);
            }
            to {
              transform: translate(-50%, -50%) rotate(360deg);
            }
          }

          @keyframes circles-counter-orbit-${t} {
            0% {
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              opacity: ${"in" === h ? 0.2 + (t / (x.length - 1)) * 0.8 : "out" === h ? 0.2 + ((x.length - t - 1) / (x.length - 1)) * 0.8 : 1};
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "none"};
            }
            100% {
              transform: rotate(calc(-1 * var(--item-angle) - 360deg)) scale(1);
              opacity: ${"in" === h ? 0.2 + (t / (x.length - 1)) * 0.8 : "out" === h ? 0.2 + ((x.length - t - 1) / (x.length - 1)) * 0.8 : 1};
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "none"};
            }
          }

          @keyframes circles-entrance-${t} {
            0% {
              opacity: 0;
              transform: rotate(calc(-1 * var(--item-angle))) scale(0.6);
              filter: blur(10px) ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : ""};
            }
            60% {
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "blur(0px)"};
            }
            100% {
              opacity: ${"in" === h ? 0.2 + (t / (x.length - 1)) * 0.8 : "out" === h ? 0.2 + ((x.length - t - 1) / (x.length - 1)) * 0.8 : 1};
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "blur(0px)"};
            }
          }
        `,
                  )
                  .join("\n"),
              ],
            ],
          ]) +
          " " +
          ((0, u.cn)("relative", $) || ""),
        children: [
          (0, n.jsxs)("div", {
            className:
              c().dynamic([
                [
                  "32176ae4e8456b31",
                  [
                    x
                      .map(
                        (e, t) => `
          @keyframes circles-orbit-${t} {
            from {
              transform: translate(-50%, -50%) rotate(0deg);
            }
            to {
              transform: translate(-50%, -50%) rotate(360deg);
            }
          }

          @keyframes circles-counter-orbit-${t} {
            0% {
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              opacity: ${"in" === h ? 0.2 + (t / (x.length - 1)) * 0.8 : "out" === h ? 0.2 + ((x.length - t - 1) / (x.length - 1)) * 0.8 : 1};
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "none"};
            }
            100% {
              transform: rotate(calc(-1 * var(--item-angle) - 360deg)) scale(1);
              opacity: ${"in" === h ? 0.2 + (t / (x.length - 1)) * 0.8 : "out" === h ? 0.2 + ((x.length - t - 1) / (x.length - 1)) * 0.8 : 1};
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "none"};
            }
          }

          @keyframes circles-entrance-${t} {
            0% {
              opacity: 0;
              transform: rotate(calc(-1 * var(--item-angle))) scale(0.6);
              filter: blur(10px) ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : ""};
            }
            60% {
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "blur(0px)"};
            }
            100% {
              opacity: ${"in" === h ? 0.2 + (t / (x.length - 1)) * 0.8 : "out" === h ? 0.2 + ((x.length - t - 1) / (x.length - 1)) * 0.8 : 1};
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "blur(0px)"};
            }
          }
        `,
                      )
                      .join("\n"),
                  ],
                ],
              ]) +
              " absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            children: [
              g &&
                (0, n.jsx)("svg", {
                  style: {
                    width: `${v}px`,
                    height: `${v}px`,
                    transform: "translate(-50%, -50%)",
                  },
                  className:
                    c().dynamic([
                      [
                        "32176ae4e8456b31",
                        [
                          x
                            .map(
                              (e, t) => `
          @keyframes circles-orbit-${t} {
            from {
              transform: translate(-50%, -50%) rotate(0deg);
            }
            to {
              transform: translate(-50%, -50%) rotate(360deg);
            }
          }

          @keyframes circles-counter-orbit-${t} {
            0% {
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              opacity: ${"in" === h ? 0.2 + (t / (x.length - 1)) * 0.8 : "out" === h ? 0.2 + ((x.length - t - 1) / (x.length - 1)) * 0.8 : 1};
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "none"};
            }
            100% {
              transform: rotate(calc(-1 * var(--item-angle) - 360deg)) scale(1);
              opacity: ${"in" === h ? 0.2 + (t / (x.length - 1)) * 0.8 : "out" === h ? 0.2 + ((x.length - t - 1) / (x.length - 1)) * 0.8 : 1};
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "none"};
            }
          }

          @keyframes circles-entrance-${t} {
            0% {
              opacity: 0;
              transform: rotate(calc(-1 * var(--item-angle))) scale(0.6);
              filter: blur(10px) ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : ""};
            }
            60% {
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "blur(0px)"};
            }
            100% {
              opacity: ${"in" === h ? 0.2 + (t / (x.length - 1)) * 0.8 : "out" === h ? 0.2 + ((x.length - t - 1) / (x.length - 1)) * 0.8 : 1};
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "blur(0px)"};
            }
          }
        `,
                            )
                            .join("\n"),
                        ],
                      ],
                    ]) + " absolute left-1/2 top-1/2 pointer-events-none",
                  children: x.map((e, t) =>
                    (0, n.jsx)(
                      "circle",
                      {
                        cx: "50%",
                        cy: "50%",
                        r: r + t * i,
                        fill: "none",
                        stroke: "currentColor",
                        strokeWidth: "2",
                        strokeDasharray: "8 8",
                        style: {
                          opacity: 0.5,
                          animation: m
                            ? `circles-path-entrance ${f}s ease-out ${t * b}s backwards`
                            : void 0,
                        },
                        className:
                          c().dynamic([
                            [
                              "32176ae4e8456b31",
                              [
                                x
                                  .map(
                                    (e, t) => `
          @keyframes circles-orbit-${t} {
            from {
              transform: translate(-50%, -50%) rotate(0deg);
            }
            to {
              transform: translate(-50%, -50%) rotate(360deg);
            }
          }

          @keyframes circles-counter-orbit-${t} {
            0% {
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              opacity: ${"in" === h ? 0.2 + (t / (x.length - 1)) * 0.8 : "out" === h ? 0.2 + ((x.length - t - 1) / (x.length - 1)) * 0.8 : 1};
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "none"};
            }
            100% {
              transform: rotate(calc(-1 * var(--item-angle) - 360deg)) scale(1);
              opacity: ${"in" === h ? 0.2 + (t / (x.length - 1)) * 0.8 : "out" === h ? 0.2 + ((x.length - t - 1) / (x.length - 1)) * 0.8 : 1};
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "none"};
            }
          }

          @keyframes circles-entrance-${t} {
            0% {
              opacity: 0;
              transform: rotate(calc(-1 * var(--item-angle))) scale(0.6);
              filter: blur(10px) ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : ""};
            }
            60% {
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "blur(0px)"};
            }
            100% {
              opacity: ${"in" === h ? 0.2 + (t / (x.length - 1)) * 0.8 : "out" === h ? 0.2 + ((x.length - t - 1) / (x.length - 1)) * 0.8 : 1};
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "blur(0px)"};
            }
          }
        `,
                                  )
                                  .join("\n"),
                              ],
                            ],
                          ]) + " stroke-gray-300 dark:stroke-gray-700",
                      },
                      t,
                    ),
                  ),
                }),
              x.map((e, a) => {
                let u = r + a * i,
                  g = l + a * o,
                  $ = s;
                p &&
                  a % 2 == 1 &&
                  ($ = "clockwise" === s ? "counterclockwise" : "clockwise");
                let v = "clockwise" === $ ? "normal" : "reverse";
                return (0, n.jsx)(
                  "ul",
                  {
                    style: {
                      width: `${2 * u}px`,
                      height: `${2 * u}px`,
                      transform: "translate(-50%, -50%)",
                      animation: `circles-orbit-${a} ${g}s linear infinite ${v}`,
                    },
                    className:
                      c().dynamic([
                        [
                          "32176ae4e8456b31",
                          [
                            x
                              .map(
                                (e, t) => `
          @keyframes circles-orbit-${t} {
            from {
              transform: translate(-50%, -50%) rotate(0deg);
            }
            to {
              transform: translate(-50%, -50%) rotate(360deg);
            }
          }

          @keyframes circles-counter-orbit-${t} {
            0% {
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              opacity: ${"in" === h ? 0.2 + (t / (x.length - 1)) * 0.8 : "out" === h ? 0.2 + ((x.length - t - 1) / (x.length - 1)) * 0.8 : 1};
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "none"};
            }
            100% {
              transform: rotate(calc(-1 * var(--item-angle) - 360deg)) scale(1);
              opacity: ${"in" === h ? 0.2 + (t / (x.length - 1)) * 0.8 : "out" === h ? 0.2 + ((x.length - t - 1) / (x.length - 1)) * 0.8 : 1};
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "none"};
            }
          }

          @keyframes circles-entrance-${t} {
            0% {
              opacity: 0;
              transform: rotate(calc(-1 * var(--item-angle))) scale(0.6);
              filter: blur(10px) ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : ""};
            }
            60% {
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "blur(0px)"};
            }
            100% {
              opacity: ${"in" === h ? 0.2 + (t / (x.length - 1)) * 0.8 : "out" === h ? 0.2 + ((x.length - t - 1) / (x.length - 1)) * 0.8 : 1};
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "blur(0px)"};
            }
          }
        `,
                              )
                              .join("\n"),
                          ],
                        ],
                      ]) +
                      " absolute left-1/2 top-1/2 list-none p-0 m-0 rounded-full",
                    children: e.map((r, i) => {
                      let l = ((360 / e.length) * i - 90) % 360,
                        o = t * (1 + a * y);
                      return (0, n.jsx)(
                        "li",
                        {
                          style: {
                            width: `${o}px`,
                            height: `${o}px`,
                            margin: `-${o / 2}px`,
                            transform: `rotate(${l}deg) translateX(${u}px)`,
                            "--item-angle": `${l}deg`,
                            "--entrance-delay": `${a * b}s`,
                            "--target-opacity":
                              "in" === h
                                ? 0.2 + (a / (x.length - 1)) * 0.8
                                : "out" === h
                                  ? 0.2 +
                                    ((x.length - a - 1) / (x.length - 1)) * 0.8
                                  : 1,
                            "--target-blur":
                              d && "none" !== h
                                ? "in" === h
                                  ? `${((x.length - a - 1) / (x.length - 1)) * 8}px`
                                  : `${(a / (x.length - 1)) * 8}px`
                                : "0px",
                          },
                          className:
                            c().dynamic([
                              [
                                "32176ae4e8456b31",
                                [
                                  x
                                    .map(
                                      (e, t) => `
          @keyframes circles-orbit-${t} {
            from {
              transform: translate(-50%, -50%) rotate(0deg);
            }
            to {
              transform: translate(-50%, -50%) rotate(360deg);
            }
          }

          @keyframes circles-counter-orbit-${t} {
            0% {
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              opacity: ${"in" === h ? 0.2 + (t / (x.length - 1)) * 0.8 : "out" === h ? 0.2 + ((x.length - t - 1) / (x.length - 1)) * 0.8 : 1};
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "none"};
            }
            100% {
              transform: rotate(calc(-1 * var(--item-angle) - 360deg)) scale(1);
              opacity: ${"in" === h ? 0.2 + (t / (x.length - 1)) * 0.8 : "out" === h ? 0.2 + ((x.length - t - 1) / (x.length - 1)) * 0.8 : 1};
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "none"};
            }
          }

          @keyframes circles-entrance-${t} {
            0% {
              opacity: 0;
              transform: rotate(calc(-1 * var(--item-angle))) scale(0.6);
              filter: blur(10px) ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : ""};
            }
            60% {
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "blur(0px)"};
            }
            100% {
              opacity: ${"in" === h ? 0.2 + (t / (x.length - 1)) * 0.8 : "out" === h ? 0.2 + ((x.length - t - 1) / (x.length - 1)) * 0.8 : 1};
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "blur(0px)"};
            }
          }
        `,
                                    )
                                    .join("\n"),
                                ],
                              ],
                            ]) + " absolute block left-1/2 top-1/2",
                          children: (0, n.jsx)("div", {
                            style: {
                              animation: m
                                ? `circles-entrance-${a} ${f}s cubic-bezier(0.34, 1.56, 0.64, 1) ${a * b}s both, circles-counter-orbit-${a} ${g}s linear infinite ${a * b}s ${v}`
                                : `circles-counter-orbit-${a} ${g}s linear infinite ${v}`,
                            },
                            className:
                              c().dynamic([
                                [
                                  "32176ae4e8456b31",
                                  [
                                    x
                                      .map(
                                        (e, t) => `
          @keyframes circles-orbit-${t} {
            from {
              transform: translate(-50%, -50%) rotate(0deg);
            }
            to {
              transform: translate(-50%, -50%) rotate(360deg);
            }
          }

          @keyframes circles-counter-orbit-${t} {
            0% {
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              opacity: ${"in" === h ? 0.2 + (t / (x.length - 1)) * 0.8 : "out" === h ? 0.2 + ((x.length - t - 1) / (x.length - 1)) * 0.8 : 1};
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "none"};
            }
            100% {
              transform: rotate(calc(-1 * var(--item-angle) - 360deg)) scale(1);
              opacity: ${"in" === h ? 0.2 + (t / (x.length - 1)) * 0.8 : "out" === h ? 0.2 + ((x.length - t - 1) / (x.length - 1)) * 0.8 : 1};
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "none"};
            }
          }

          @keyframes circles-entrance-${t} {
            0% {
              opacity: 0;
              transform: rotate(calc(-1 * var(--item-angle))) scale(0.6);
              filter: blur(10px) ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : ""};
            }
            60% {
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "blur(0px)"};
            }
            100% {
              opacity: ${"in" === h ? 0.2 + (t / (x.length - 1)) * 0.8 : "out" === h ? 0.2 + ((x.length - t - 1) / (x.length - 1)) * 0.8 : 1};
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "blur(0px)"};
            }
          }
        `,
                                      )
                                      .join("\n"),
                                  ],
                                ],
                              ]) +
                              " w-full h-full rounded-full overflow-hidden shadow-lg border-2 border-white dark:border-gray-800",
                            children: (0, n.jsx)("img", {
                              src: r,
                              alt: `Circle ${a}-${i}`,
                              loading: "lazy",
                              className:
                                c().dynamic([
                                  [
                                    "32176ae4e8456b31",
                                    [
                                      x
                                        .map(
                                          (e, t) => `
          @keyframes circles-orbit-${t} {
            from {
              transform: translate(-50%, -50%) rotate(0deg);
            }
            to {
              transform: translate(-50%, -50%) rotate(360deg);
            }
          }

          @keyframes circles-counter-orbit-${t} {
            0% {
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              opacity: ${"in" === h ? 0.2 + (t / (x.length - 1)) * 0.8 : "out" === h ? 0.2 + ((x.length - t - 1) / (x.length - 1)) * 0.8 : 1};
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "none"};
            }
            100% {
              transform: rotate(calc(-1 * var(--item-angle) - 360deg)) scale(1);
              opacity: ${"in" === h ? 0.2 + (t / (x.length - 1)) * 0.8 : "out" === h ? 0.2 + ((x.length - t - 1) / (x.length - 1)) * 0.8 : 1};
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "none"};
            }
          }

          @keyframes circles-entrance-${t} {
            0% {
              opacity: 0;
              transform: rotate(calc(-1 * var(--item-angle))) scale(0.6);
              filter: blur(10px) ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : ""};
            }
            60% {
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "blur(0px)"};
            }
            100% {
              opacity: ${"in" === h ? 0.2 + (t / (x.length - 1)) * 0.8 : "out" === h ? 0.2 + ((x.length - t - 1) / (x.length - 1)) * 0.8 : 1};
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "blur(0px)"};
            }
          }
        `,
                                        )
                                        .join("\n"),
                                    ],
                                  ],
                                ]) + " w-full h-full object-cover",
                            }),
                          }),
                        },
                        i,
                      );
                    }),
                  },
                  a,
                );
              }),
            ],
          }),
          (0, n.jsx)(c(), {
            id: "32176ae4e8456b31",
            dynamic: [
              x
                .map(
                  (e, t) => `
          @keyframes circles-orbit-${t} {
            from {
              transform: translate(-50%, -50%) rotate(0deg);
            }
            to {
              transform: translate(-50%, -50%) rotate(360deg);
            }
          }

          @keyframes circles-counter-orbit-${t} {
            0% {
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              opacity: ${"in" === h ? 0.2 + (t / (x.length - 1)) * 0.8 : "out" === h ? 0.2 + ((x.length - t - 1) / (x.length - 1)) * 0.8 : 1};
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "none"};
            }
            100% {
              transform: rotate(calc(-1 * var(--item-angle) - 360deg)) scale(1);
              opacity: ${"in" === h ? 0.2 + (t / (x.length - 1)) * 0.8 : "out" === h ? 0.2 + ((x.length - t - 1) / (x.length - 1)) * 0.8 : 1};
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "none"};
            }
          }

          @keyframes circles-entrance-${t} {
            0% {
              opacity: 0;
              transform: rotate(calc(-1 * var(--item-angle))) scale(0.6);
              filter: blur(10px) ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : ""};
            }
            60% {
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "blur(0px)"};
            }
            100% {
              opacity: ${"in" === h ? 0.2 + (t / (x.length - 1)) * 0.8 : "out" === h ? 0.2 + ((x.length - t - 1) / (x.length - 1)) * 0.8 : 1};
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "blur(0px)"};
            }
          }
        `,
                )
                .join("\n"),
            ],
            children: `@keyframes circles-container-fade-in{0%{opacity:0}100%{opacity:1}}@keyframes circles-path-entrance{0%{opacity:0;stroke-dashoffset:100}100%{opacity:.5;stroke-dashoffset:0}}${x
              .map(
                (e, t) => `
          @keyframes circles-orbit-${t} {
            from {
              transform: translate(-50%, -50%) rotate(0deg);
            }
            to {
              transform: translate(-50%, -50%) rotate(360deg);
            }
          }

          @keyframes circles-counter-orbit-${t} {
            0% {
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              opacity: ${"in" === h ? 0.2 + (t / (x.length - 1)) * 0.8 : "out" === h ? 0.2 + ((x.length - t - 1) / (x.length - 1)) * 0.8 : 1};
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "none"};
            }
            100% {
              transform: rotate(calc(-1 * var(--item-angle) - 360deg)) scale(1);
              opacity: ${"in" === h ? 0.2 + (t / (x.length - 1)) * 0.8 : "out" === h ? 0.2 + ((x.length - t - 1) / (x.length - 1)) * 0.8 : 1};
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "none"};
            }
          }

          @keyframes circles-entrance-${t} {
            0% {
              opacity: 0;
              transform: rotate(calc(-1 * var(--item-angle))) scale(0.6);
              filter: blur(10px) ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : ""};
            }
            60% {
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "blur(0px)"};
            }
            100% {
              opacity: ${"in" === h ? 0.2 + (t / (x.length - 1)) * 0.8 : "out" === h ? 0.2 + ((x.length - t - 1) / (x.length - 1)) * 0.8 : 1};
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              filter: ${d && "none" !== h ? ("in" === h ? `blur(${((x.length - t - 1) / (x.length - 1)) * 8}px)` : `blur(${(t / (x.length - 1)) * 8}px)`) : "blur(0px)"};
            }
          }
        `,
              )
              .join("\n")}
      `,
          }),
        ],
      });
    };
    p.displayName = "Circles";
    let h = [6, 9, 15, 15, 15].map((e, t) =>
        Array.from({ length: e }, (e, r) => l.xb[(r + t) % l.xb.length]),
      ),
      d = () => {
        let [e, t] = (0, o.I)(),
          [r, l] = (0, a.useState)(64),
          [s, c] = (0, a.useState)(120),
          [u, d] = (0, a.useState)(100),
          [g, m] = (0, a.useState)(20),
          [f, b] = (0, a.useState)(0.5),
          [y, $] = (0, a.useState)("clockwise"),
          [x, v] = (0, a.useState)(!0),
          [w, S] = (0, a.useState)("out"),
          [_, k] = (0, a.useState)(!0),
          [j, C] = (0, a.useState)(!0),
          [R, F] = (0, a.useState)(!0),
          [z, T] = (0, a.useState)(0.6),
          [N, O] = (0, a.useState)(0.15),
          [A, P] = (0, a.useState)(0);
        return (0, n.jsxs)("div", {
          children: [
            (0, n.jsx)(i.Bg, {}),
            (0, n.jsxs)(i.VX, {
              children: [
                (0, n.jsxs)(i.Ec, {
                  children: [
                    (0, n.jsx)(i.Ch, {
                      onRefresh: t,
                      minHeight: 600,
                      children: (0, n.jsx)(
                        p,
                        {
                          rows: h,
                          circleSize: r,
                          baseRadius: s,
                          orbitGap: u,
                          rotationDuration: g,
                          rowDelay: f,
                          direction: y,
                          alternateDirection: x,
                          fadeMode: w,
                          fadeBlur: _,
                          showPaths: j,
                          animate: R,
                          animationDuration: z,
                          animationStagger: N,
                          staggerScaleFactor: A,
                        },
                        e,
                      ),
                    }),
                    (0, n.jsxs)(i.IH, {
                      children: [
                        (0, n.jsx)(i.yt, {
                          title: "Circle Size",
                          value: r,
                          onChange: (e) => {
                            (l(e), t());
                          },
                          min: 32,
                          max: 128,
                          step: 8,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Base Radius",
                          value: s,
                          onChange: (e) => {
                            (c(e), t());
                          },
                          min: 60,
                          max: 300,
                          step: 10,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Orbit Gap",
                          value: u,
                          onChange: (e) => {
                            (d(e), t());
                          },
                          min: 50,
                          max: 200,
                          step: 10,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Stagger Scale Factor",
                          value: A,
                          onChange: (e) => {
                            (P(e), t());
                          },
                          min: -0.3,
                          max: 0.3,
                          step: 0.05,
                        }),
                        (0, n.jsx)(i.tl, {
                          title: "Show Paths",
                          checked: j,
                          onChange: (e) => {
                            (C(e), t());
                          },
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Rotation Duration (s)",
                          value: g,
                          onChange: (e) => {
                            (m(e), t());
                          },
                          min: 5,
                          max: 60,
                          step: 5,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Row Delay (s)",
                          value: f,
                          onChange: (e) => {
                            (b(e), t());
                          },
                          min: 0,
                          max: 2,
                          step: 0.1,
                        }),
                        (0, n.jsx)(i.bg, {
                          title: "Direction",
                          value: y,
                          onChange: (e) => {
                            ($(e), t());
                          },
                          options: [
                            { label: "Clockwise", value: "clockwise" },
                            {
                              label: "Counterclockwise",
                              value: "counterclockwise",
                            },
                          ],
                        }),
                        (0, n.jsx)(i.tl, {
                          title: "Alternate Direction",
                          checked: x,
                          onChange: (e) => {
                            (v(e), t());
                          },
                        }),
                        (0, n.jsx)(i.bg, {
                          title: "Fade Mode",
                          value: w,
                          onChange: (e) => {
                            (S(e), t());
                          },
                          options: [
                            { label: "None", value: "none" },
                            { label: "Fade In", value: "in" },
                            { label: "Fade Out", value: "out" },
                          ],
                        }),
                        (0, n.jsx)(i.tl, {
                          title: "Fade Blur",
                          checked: _,
                          onChange: (e) => {
                            (k(e), t());
                          },
                        }),
                        (0, n.jsx)(i.tl, {
                          title: "Entrance Animation",
                          checked: R,
                          onChange: (e) => {
                            (F(e), t());
                          },
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Animation Duration (s)",
                          value: z,
                          onChange: (e) => {
                            (T(e), t());
                          },
                          min: 0.2,
                          max: 2,
                          step: 0.1,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Animation Stagger (s)",
                          value: N,
                          onChange: (e) => {
                            (O(e), t());
                          },
                          min: 0,
                          max: 0.5,
                          step: 0.05,
                        }),
                      ],
                    }),
                    (0, n.jsx)(i.Ub, {
                      data: [
                        {
                          name: "rows",
                          type: "string[][]",
                          default: "[[...], [...], [...]]",
                          description:
                            "Array of rows, where each row is an array of image URLs. Each row creates a concentric orbit ring with evenly distributed circles.",
                        },
                        {
                          name: "circleSize",
                          type: "number",
                          default: "64",
                          description: "Size of each circle/image in pixels",
                        },
                        {
                          name: "baseRadius",
                          type: "number",
                          default: "120",
                          description:
                            "Base radius for the innermost orbit ring in pixels",
                        },
                        {
                          name: "orbitGap",
                          type: "number",
                          default: "100",
                          description:
                            "Gap between each concentric orbit ring in pixels",
                        },
                        {
                          name: "rotationDuration",
                          type: "number",
                          default: "20",
                          description:
                            "Duration of one complete rotation in seconds for the first ring",
                        },
                        {
                          name: "rowDelay",
                          type: "number",
                          default: "0.5",
                          description:
                            "Additional duration added to each subsequent ring's rotation (creates staggered speed)",
                        },
                        {
                          name: "direction",
                          type: '"clockwise" | "counterclockwise"',
                          default: '"clockwise"',
                          description:
                            "Direction of rotation for the orbiting circles",
                        },
                        {
                          name: "alternateDirection",
                          type: "boolean",
                          default: "false",
                          description:
                            "If true, alternates direction for each row (odd rows go opposite direction)",
                        },
                        {
                          name: "fadeMode",
                          type: '"in" | "out" | "none"',
                          default: '"none"',
                          description:
                            "Fade mode for rows. 'in' fades from outside to inside, 'out' fades from inside to outside, 'none' disables fading",
                        },
                        {
                          name: "fadeBlur",
                          type: "boolean",
                          default: "false",
                          description:
                            "Apply incremental blur along with fade effect for more depth",
                        },
                        {
                          name: "showPaths",
                          type: "boolean",
                          default: "true",
                          description:
                            "Whether to show dashed orbital path rings",
                        },
                        {
                          name: "animate",
                          type: "boolean",
                          default: "true",
                          description:
                            "Enable entrance animation on mount with scale and fade",
                        },
                        {
                          name: "animationDuration",
                          type: "number",
                          default: "0.6",
                          description:
                            "Duration of entrance animation in seconds",
                        },
                        {
                          name: "animationStagger",
                          type: "number",
                          default: "0.15",
                          description:
                            "Stagger delay between each row's entrance animation in seconds",
                        },
                        {
                          name: "staggerScaleFactor",
                          type: "number",
                          default: "0",
                          description:
                            "Scale factor for each additional row. Negative values shrink outer rows, positive values grow them. Example: 0.1 = 10% larger per row",
                        },
                        {
                          name: "className",
                          type: "string",
                          default: '""',
                          description:
                            "Additional CSS classes for the container",
                        },
                      ],
                    }),
                  ],
                }),
                (0, n.jsx)(i.lT, { children: (0, n.jsx)(i.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
