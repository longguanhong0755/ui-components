/* ReactBits Pro public preview module 15819 for chroma-halo.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/15819.878f907b1f2d5b83.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  15819: (e, t, r) => {
    (r.r(t), r.d(t, { default: () => U }));
    var i = r(95155),
      n = r(12115),
      a = r(56388),
      l = r(86049),
      u = r(90761),
      o = r(90650);
    let s = { low: 0.15, medium: 0.25, high: 0.4 },
      c = {
        vertex: `
    precision highp float;
    varying vec2 vUv;
    attribute vec2 a_position;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform vec2 u_texel;

    void main () {
      vUv = .5 * (a_position + 1.);
      vL = vUv - vec2(u_texel.x, 0.);
      vR = vUv + vec2(u_texel.x, 0.);
      vT = vUv + vec2(0., u_texel.y);
      vB = vUv - vec2(0., u_texel.y);
      gl_Position = vec4(a_position, 0., 1.);
    }
  `,
        advection: `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D u_velocity_texture;
    uniform sampler2D u_input_texture;
    uniform vec2 u_texel;
    uniform float u_dt;
    uniform float u_dissipation;

    vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
      vec2 st = uv / tsize - 0.5;
      vec2 iuv = floor(st);
      vec2 fuv = fract(st);
      vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
      vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
      vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
      vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
      return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
    }

    void main () {
      vec2 coord = vUv - u_dt * bilerp(u_velocity_texture, vUv, u_texel).xy * u_texel;
      gl_FragColor = u_dissipation * bilerp(u_input_texture, coord, u_texel);
      gl_FragColor.a = 1.;
    }
  `,
        divergence: `
    precision highp float;
    precision highp sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D u_velocity_texture;

    void main () {
      float L = texture2D(u_velocity_texture, vL).x;
      float R = texture2D(u_velocity_texture, vR).x;
      float T = texture2D(u_velocity_texture, vT).y;
      float B = texture2D(u_velocity_texture, vB).y;
      float div = .6 * (R - L + T - B);
      gl_FragColor = vec4(div, 0., 0., 1.);
    }
  `,
        pressure: `
    precision highp float;
    precision highp sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D u_pressure_texture;
    uniform sampler2D u_divergence_texture;

    void main () {
      float L = texture2D(u_pressure_texture, vL).x;
      float R = texture2D(u_pressure_texture, vR).x;
      float T = texture2D(u_pressure_texture, vT).x;
      float B = texture2D(u_pressure_texture, vB).x;
      float divergence = texture2D(u_divergence_texture, vUv).x;
      float pressure = (L + R + B + T - divergence) * 0.25;
      gl_FragColor = vec4(pressure, 0., 0., 1.);
    }
  `,
        gradientSubtract: `
    precision highp float;
    precision highp sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D u_pressure_texture;
    uniform sampler2D u_velocity_texture;

    void main () {
      float L = texture2D(u_pressure_texture, vL).x;
      float R = texture2D(u_pressure_texture, vR).x;
      float T = texture2D(u_pressure_texture, vT).x;
      float B = texture2D(u_pressure_texture, vB).x;
      vec2 velocity = texture2D(u_velocity_texture, vUv).xy;
      velocity.xy -= vec2(R - L, T - B);
      gl_FragColor = vec4(velocity, 0., 1.);
    }
  `,
        splat: `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D u_input_texture;
    uniform float u_ratio;
    uniform vec3 u_point_value;
    uniform vec2 u_point;
    uniform float u_point_size;

    void main () {
      vec2 p = vUv - u_point.xy;
      p.x *= u_ratio;
      vec3 splat = pow(2., -dot(p, p) / u_point_size) * u_point_value;
      vec3 base = texture2D(u_input_texture, vUv).xyz;
      gl_FragColor = vec4(base + splat, 1.);
    }
  `,
        output: `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D u_output_texture;
    uniform vec2 u_texel;
    uniform float u_smoke;
    uniform vec3 u_thin;
    uniform vec3 u_dense;

    vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
      vec2 st = uv / tsize - 0.5;
      vec2 iuv = floor(st);
      vec2 fuv = fract(st);
      vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
      vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
      vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
      vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
      return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
    }

    void main () {
      vec3 C = bilerp(u_output_texture, vUv, u_texel).rgb;
      if (u_smoke > .5) {
        float d = max(C.r, 0.);
        vec3 tone = mix(u_thin, u_dense, 1. - exp(-d * .35));
        gl_FragColor = vec4(tone * (1. - exp(-d * 1.5)), 1.);
      } else {
        gl_FragColor = vec4(vec3(1.) - C, 1.);
      }
    }
  `,
      },
      d = (e, t, r) => Math.min(r, Math.max(t, e)),
      v = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      m = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      f = null,
      p = new Map(),
      h = (e) => {
        let t = e.trim(),
          r = p.get(t);
        if (r) return r;
        let i = [0.21, 0.18, 0.51],
          n = t.replace("#", "");
        if (/^[0-9a-f]{3}$/i.test(n) || /^[0-9a-f]{6}$/i.test(n)) {
          let e = 3 === n.length ? n.replace(/./g, (e) => e + e) : n;
          i = [
            Number.parseInt(e.slice(0, 2), 16) / 255,
            Number.parseInt(e.slice(2, 4), 16) / 255,
            Number.parseInt(e.slice(4, 6), 16) / 255,
          ];
        } else if ("undefined" != typeof document) {
          if (!f) {
            let e = document.createElement("canvas");
            ((e.width = 1),
              (e.height = 1),
              (f = e.getContext("2d", { willReadFrequently: !0 })));
          }
          if (f) {
            (f.clearRect(0, 0, 1, 1),
              (f.fillStyle = "#362E82"),
              (f.fillStyle = t),
              f.fillRect(0, 0, 1, 1));
            let e = f.getImageData(0, 0, 1, 1).data;
            i = [e[0] / 255, e[1] / 255, e[2] / 255];
          }
        }
        return (p.set(t, i), i);
      },
      x = (e) =>
        e <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4),
      g = (e) => {
        let t = d(e, 0, 1);
        return t <= 0.0031308
          ? 12.92 * t
          : 1.055 * Math.pow(t, 1 / 2.4) - 0.055;
      },
      _ = (e, t, r) => {
        let i = t * Math.cos(r),
          n = t * Math.sin(r),
          a = Math.pow(e + 0.3963377774 * i + 0.2158037573 * n, 3),
          l = Math.pow(e - 0.1055613458 * i - 0.0638541728 * n, 3),
          u = Math.pow(e - 0.0894841775 * i - 1.291485548 * n, 3),
          o = [
            4.0767416621 * a - 3.3077115913 * l + 0.2309699292 * u,
            -1.2684380046 * a + 2.6097574011 * l - 0.3413193965 * u,
            -0.0041960863 * a - 0.7034186147 * l + 1.707614701 * u,
          ];
        return [g(o[0]), g(o[1]), g(o[2])];
      },
      y = new Map(),
      b = new Map(),
      E = (e) => {
        let t = b.get(e);
        if (t) return t;
        let r = [0, 0, 0, 0];
        if ("undefined" != typeof document) {
          let t = document.createElement("canvas");
          ((t.width = 1), (t.height = 1));
          let i = t.getContext("2d", { willReadFrequently: !0 });
          if (i) {
            ((i.fillStyle = "rgba(0, 0, 0, 0)"),
              (i.fillStyle = e),
              i.fillRect(0, 0, 1, 1));
            let t = i.getImageData(0, 0, 1, 1).data,
              n = t[3] / 255;
            n > 0 && (r = [t[0] / 255 / n, t[1] / 255 / n, t[2] / 255 / n, n]);
          }
        }
        return (b.set(e, r), r);
      },
      T = (e) => {
        let t = {
            alpha: !0,
            depth: !1,
            stencil: !1,
            antialias: !1,
            premultipliedAlpha: !0,
            preserveDrawingBuffer: !1,
          },
          r = e.getContext("webgl2", t),
          i = r ?? e.getContext("webgl", t);
        if (!i) return null;
        let n = [];
        if (r)
          (r.getExtension("EXT_color_buffer_float"),
            r.getExtension("EXT_color_buffer_half_float"),
            n.push(
              [r.RGBA16F, r.RGBA, r.HALF_FLOAT],
              [r.RGBA32F, r.RGBA, r.FLOAT],
            ));
        else {
          let e = i.getExtension("OES_texture_half_float");
          (i.getExtension("EXT_color_buffer_half_float"),
            e && n.push([i.RGBA, i.RGBA, e.HALF_FLOAT_OES]),
            i.getExtension("OES_texture_float") &&
              (i.getExtension("WEBGL_color_buffer_float"),
              n.push([i.RGBA, i.RGBA, i.FLOAT])));
        }
        let a = n.find(([e, t, r]) => {
          let n = i.createTexture(),
            a = i.createFramebuffer();
          if (!n || !a) return !1;
          (i.bindTexture(i.TEXTURE_2D, n),
            i.texParameteri(i.TEXTURE_2D, i.TEXTURE_MIN_FILTER, i.NEAREST),
            i.texParameteri(i.TEXTURE_2D, i.TEXTURE_MAG_FILTER, i.NEAREST),
            i.texImage2D(i.TEXTURE_2D, 0, e, 4, 4, 0, t, r, null),
            i.bindFramebuffer(i.FRAMEBUFFER, a),
            i.framebufferTexture2D(
              i.FRAMEBUFFER,
              i.COLOR_ATTACHMENT0,
              i.TEXTURE_2D,
              n,
              0,
            ));
          let l =
            i.checkFramebufferStatus(i.FRAMEBUFFER) === i.FRAMEBUFFER_COMPLETE;
          return (
            i.bindFramebuffer(i.FRAMEBUFFER, null),
            i.deleteFramebuffer(a),
            i.deleteTexture(n),
            l
          );
        });
        if (!a) return null;
        let [l, u, o] = a,
          s = [],
          d = (e, t) => {
            let r = i.createShader(t);
            return r
              ? (i.shaderSource(r, e),
                i.compileShader(r),
                i.getShaderParameter(r, i.COMPILE_STATUS))
                ? (s.push(r), r)
                : (i.deleteShader(r), null)
              : null;
          },
          v = d(c.vertex, i.VERTEX_SHADER);
        if (!v) return null;
        let m = [],
          f = (e) => {
            let t = d(e, i.FRAGMENT_SHADER);
            if (!t) return null;
            let r = i.createProgram();
            if (
              !r ||
              (i.attachShader(r, v),
              i.attachShader(r, t),
              i.bindAttribLocation(r, 0, "a_position"),
              i.linkProgram(r),
              !i.getProgramParameter(r, i.LINK_STATUS))
            )
              return null;
            m.push(r);
            let n = {},
              a = i.getProgramParameter(r, i.ACTIVE_UNIFORMS);
            for (let e = 0; e < a; e++) {
              let t = i.getActiveUniform(r, e);
              t && (n[t.name] = i.getUniformLocation(r, t.name));
            }
            return { program: r, uniforms: n };
          },
          p = f(c.splat),
          h = f(c.divergence),
          x = f(c.pressure),
          g = f(c.gradientSubtract),
          _ = f(c.advection),
          y = f(c.output);
        if (!p || !h || !x || !g || !_ || !y) return null;
        let b = i.createBuffer(),
          E = i.createBuffer();
        (i.bindBuffer(i.ARRAY_BUFFER, b),
          i.bufferData(
            i.ARRAY_BUFFER,
            new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]),
            i.STATIC_DRAW,
          ),
          i.bindBuffer(i.ELEMENT_ARRAY_BUFFER, E),
          i.bufferData(
            i.ELEMENT_ARRAY_BUFFER,
            new Uint16Array([0, 1, 2, 0, 2, 3]),
            i.STATIC_DRAW,
          ),
          i.vertexAttribPointer(0, 2, i.FLOAT, !1, 0, 0),
          i.enableVertexAttribArray(0),
          i.disable(i.BLEND));
        let T = (e, t) => {
            i.activeTexture(i.TEXTURE0);
            let r = i.createTexture(),
              n = i.createFramebuffer();
            return r && n
              ? (i.bindTexture(i.TEXTURE_2D, r),
                i.texParameteri(i.TEXTURE_2D, i.TEXTURE_MIN_FILTER, i.NEAREST),
                i.texParameteri(i.TEXTURE_2D, i.TEXTURE_MAG_FILTER, i.NEAREST),
                i.texParameteri(
                  i.TEXTURE_2D,
                  i.TEXTURE_WRAP_S,
                  i.CLAMP_TO_EDGE,
                ),
                i.texParameteri(
                  i.TEXTURE_2D,
                  i.TEXTURE_WRAP_T,
                  i.CLAMP_TO_EDGE,
                ),
                i.texImage2D(i.TEXTURE_2D, 0, l, e, t, 0, u, o, null),
                i.bindFramebuffer(i.FRAMEBUFFER, n),
                i.framebufferTexture2D(
                  i.FRAMEBUFFER,
                  i.COLOR_ATTACHMENT0,
                  i.TEXTURE_2D,
                  r,
                  0,
                ),
                i.viewport(0, 0, e, t),
                i.clearColor(0, 0, 0, 0),
                i.clear(i.COLOR_BUFFER_BIT),
                {
                  texture: r,
                  fbo: n,
                  width: e,
                  height: t,
                  attach: (e) => (
                    i.activeTexture(i.TEXTURE0 + e),
                    i.bindTexture(i.TEXTURE_2D, r),
                    e
                  ),
                })
              : null;
          },
          R = (e) => {
            e && (i.deleteFramebuffer(e.fbo), i.deleteTexture(e.texture));
          };
        return {
          gl: i,
          programs: {
            splat: p,
            divergence: h,
            pressure: x,
            gradientSubtract: g,
            advection: _,
            output: y,
          },
          createFBO: T,
          createDoubleFBO: (e, t) => {
            let r = T(e, t),
              i = T(e, t);
            return r && i
              ? {
                  width: e,
                  height: t,
                  texelSizeX: 1 / e,
                  texelSizeY: 1 / t,
                  read: () => r,
                  write: () => i,
                  swap() {
                    [r, i] = [i, r];
                  },
                }
              : (R(r), R(i), null);
          },
          deleteFBO: R,
          deleteDoubleFBO: (e) => {
            e && (R(e.read()), R(e.write()));
          },
          blit: (e) => {
            (e
              ? (i.viewport(0, 0, e.width, e.height),
                i.bindFramebuffer(i.FRAMEBUFFER, e.fbo))
              : (i.viewport(0, 0, i.drawingBufferWidth, i.drawingBufferHeight),
                i.bindFramebuffer(i.FRAMEBUFFER, null)),
              i.drawElements(i.TRIANGLES, 6, i.UNSIGNED_SHORT, 0));
          },
          dispose: () => {
            (m.forEach((e) => i.deleteProgram(e)),
              s.forEach((e) => i.deleteShader(e)),
              i.deleteBuffer(b),
              i.deleteBuffer(E));
          },
        };
      },
      R = (e, t) => e.uniforms[t] ?? null,
      w = (0, n.forwardRef)(function (
        {
          color: e = "#362E82",
          mode: t = "auto",
          backgroundColor: r = "transparent",
          size: a = 56,
          force: l = 1,
          intensity: u = 1,
          trail: c = 0.6,
          drift: f = 0.6,
          blur: p = 8,
          opacity: g = 1,
          quality: b = "medium",
          autoplay: w = !0,
          autoplaySpeed: F = 1,
          idleDelay: D = 1.5,
          interactive: A = !0,
          paused: S = !1,
          className: M,
          style: C,
          children: U,
        },
        B,
      ) {
        let L = (0, n.useRef)(null),
          k = (0, n.useRef)(null),
          I = (0, n.useRef)(null),
          z = {
            color: e,
            mode: t,
            backgroundColor: r,
            size: a,
            force: l,
            intensity: u,
            trail: c,
            drift: f,
            blur: p,
            opacity: g,
            quality: b,
            autoplay: w,
            autoplaySpeed: F,
            idleDelay: D,
            interactive: A,
            paused: S,
            reduced: (0, n.useSyncExternalStore)(v, m, () => !1),
          },
          P = (0, n.useRef)(z);
        ((0, n.useEffect)(() => {
          ((P.current = z), I.current?.sync());
        }),
          (0, n.useEffect)(() => {
            let e = L.current,
              t = k.current;
            if (!e || !t) return;
            let r = ((e, t, r) => {
              let i = e.ownerDocument,
                n = i.defaultView ?? window,
                a = i.createElement("canvas");
              a.style.cssText =
                "position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;mix-blend-mode:multiply";
              let l = T(a);
              if (!l) return null;
              t.appendChild(a);
              let u = null,
                o = () => {
                  let t = r.current.mode;
                  return (
                    "smoke" === t ||
                    ("ink" !== t &&
                      (null === u &&
                        (u =
                          0.5 >
                          (() => {
                            let t = E(r.current.backgroundColor);
                            if (t[3] > 0.5)
                              return (
                                0.2126 * t[0] + 0.7152 * t[1] + 0.0722 * t[2]
                              );
                            let i = e.parentElement;
                            for (; i;) {
                              let e = E(n.getComputedStyle(i).backgroundColor);
                              if (e[3] > 0.5)
                                return (
                                  0.2126 * e[0] + 0.7152 * e[1] + 0.0722 * e[2]
                                );
                              i = i.parentElement;
                            }
                            return +!n.matchMedia(
                              "(prefers-color-scheme: dark)",
                            ).matches;
                          })()),
                      u))
                  );
                },
                c = () => {
                  let e = r.current;
                  ((a.style.mixBlendMode = o() ? "screen" : "multiply"),
                    (a.style.filter =
                      e.blur > 0 ? `blur(${d(e.blur, 0, 64)}px)` : ""),
                    (a.style.opacity = String(d(e.opacity, 0, 1))));
                },
                v = null,
                m = null,
                f = null,
                p = null,
                g = 0,
                b = 0,
                w = s.medium,
                F = 0,
                D = 0,
                A = !1,
                S = !1,
                M = !1,
                C = -1 / 0,
                U = 2e4 * Math.random(),
                B = null,
                L = 0,
                k = [],
                I = {
                  x: 0,
                  y: 0,
                  dx: 0,
                  dy: 0,
                  moved: !1,
                  inside: !1,
                  seen: !1,
                  leftAt: 0,
                },
                z = () => {
                  l &&
                    (l.deleteDoubleFBO(v),
                    l.deleteDoubleFBO(m),
                    l.deleteDoubleFBO(f),
                    l.deleteFBO(p),
                    (v = m = f = null),
                    (p = null));
                },
                P = () => {
                  if (!l) return;
                  z();
                  let e = Math.max(8, Math.floor(g * w)),
                    t = Math.max(8, Math.floor(b * w));
                  ((v = l.createDoubleFBO(e, t)),
                    (m = l.createDoubleFBO(e, t)),
                    (f = l.createDoubleFBO(e, t)),
                    (p = l.createFBO(e, t)));
                },
                O = () => {
                  let t = e.getBoundingClientRect(),
                    i = Math.max(1, Math.round(t.width)),
                    n = Math.max(1, Math.round(t.height)),
                    l = s[r.current.quality] ?? s.medium;
                  return (
                    (i !== g || n !== b || l !== w || !v) &&
                    ((g = i),
                    (b = n),
                    (w = l),
                    (a.width = g),
                    (a.height = b),
                    P(),
                    !0)
                  );
                },
                j = (e, t, i, n, a) => {
                  if (!l || !v || !m) return;
                  let u = r.current,
                    { gl: s, programs: c, blit: f } = l,
                    [p, x, _] = h(u.color),
                    y = d(u.size, 2, 600) / Math.max(b, 1),
                    E = 40 * w * d(u.force, 0, 10),
                    T = c.splat;
                  (s.useProgram(T.program),
                    s.uniform1i(R(T, "u_input_texture"), v.read().attach(1)),
                    s.uniform1f(R(T, "u_ratio"), g / Math.max(b, 1)),
                    s.uniform2f(
                      R(T, "u_point"),
                      e / Math.max(g, 1),
                      1 - t / Math.max(b, 1),
                    ),
                    s.uniform3f(R(T, "u_point_value"), i * E, -n * E, 1),
                    s.uniform1f(R(T, "u_point_size"), y * y),
                    f(v.write()),
                    v.swap(),
                    s.uniform1i(R(T, "u_input_texture"), m.read().attach(1)));
                  let F = 2 * a * d(u.intensity, 0, 10);
                  (o()
                    ? s.uniform3f(R(T, "u_point_value"), F, F, F)
                    : s.uniform3f(
                        R(T, "u_point_value"),
                        (1 - p) * F,
                        (1 - x) * F,
                        (1 - _) * F,
                      ),
                    f(m.write()),
                    m.swap());
                },
                X = () => {
                  S || M || !A || F || (F = n.requestAnimationFrame(N));
                };
              function N(e) {
                if (((F = 0), S || M || !l)) return;
                let t = r.current,
                  i = D ? d((e - D) / 1e3, 0, 1 / 30) : 1 / 60;
                D = e;
                let n = Math.min(60 * i, 2),
                  a = !1;
                if (!t.paused) {
                  let u = I.inside ? 0 : (e - I.leftAt) / 1e3;
                  if (
                    ((a =
                      t.autoplay &&
                      !t.reduced &&
                      (!I.seen || (!I.inside && u > Math.max(t.idleDelay, 0)))),
                    (L = d(L + (a ? i / 0.6 : -i / 0.2), 0, 1)),
                    a || L > 0)
                  ) {
                    let r;
                    U += 1e3 * i * d(t.autoplaySpeed, 0, 10);
                    let a = {
                        x:
                          0.5 +
                          0.25 * Math.sin(0.0017 * (r = U)) +
                          0.12 * Math.sin(0.0031 * r + 1.3) +
                          0.08 * Math.cos(0.0053 * r + 2.7) +
                          0.05 * Math.sin(0.0079 * r + 4.1),
                        y:
                          0.5 +
                          0.18 * Math.sin(0.0023 * r + 0.5) +
                          0.12 * Math.cos(0.0041 * r + 1.8) +
                          0.08 * Math.sin(0.0067 * r + 3.2) +
                          0.05 * Math.cos(0.0089 * r + 5),
                      },
                      l = a.x * g,
                      u = a.y * b;
                    (B && L > 0 && (j(l, u, l - B.x, u - B.y, n * L), (C = e)),
                      (B = L > 0 ? { x: l, y: u } : null));
                  } else B = null;
                  for (
                    I.moved &&
                    (j(I.x, I.y, I.dx, I.dy, n),
                    (I.moved = !1),
                    (I.dx = 0),
                    (I.dy = 0),
                    (C = e));
                    k.length;
                  ) {
                    let t = k.shift();
                    (t && j(t.x, t.y, t.dx, t.dy, 1), (C = e));
                  }
                  ((e) => {
                    if (!l || !v || !m || !f || !p) return;
                    let t = r.current,
                      { gl: i, programs: n, blit: a } = l,
                      {
                        divergence: u,
                        pressure: o,
                        gradientSubtract: s,
                        advection: c,
                      } = n;
                    (i.useProgram(u.program),
                      i.uniform2f(R(u, "u_texel"), v.texelSizeX, v.texelSizeY),
                      i.uniform1i(
                        R(u, "u_velocity_texture"),
                        v.read().attach(1),
                      ),
                      a(p),
                      i.useProgram(o.program),
                      i.uniform2f(R(o, "u_texel"), v.texelSizeX, v.texelSizeY),
                      i.uniform1i(R(o, "u_divergence_texture"), p.attach(1)));
                    for (let e = 0; e < 4; e++)
                      (i.uniform1i(
                        R(o, "u_pressure_texture"),
                        f.read().attach(2),
                      ),
                        a(f.write()),
                        f.swap());
                    (i.useProgram(s.program),
                      i.uniform2f(R(s, "u_texel"), v.texelSizeX, v.texelSizeY),
                      i.uniform1i(
                        R(s, "u_pressure_texture"),
                        f.read().attach(1),
                      ),
                      i.uniform1i(
                        R(s, "u_velocity_texture"),
                        v.read().attach(2),
                      ),
                      a(v.write()),
                      v.swap());
                    let h = Math.max(d(t.drift, 0.05, 30) / 3, 0.01),
                      x = Math.max(d(t.trail, 0.05, 30) / 3, 0.01);
                    (i.useProgram(c.program),
                      i.uniform2f(R(c, "u_texel"), v.texelSizeX, v.texelSizeY),
                      i.uniform1i(
                        R(c, "u_velocity_texture"),
                        v.read().attach(1),
                      ),
                      i.uniform1i(R(c, "u_input_texture"), v.read().attach(1)),
                      i.uniform1f(R(c, "u_dt"), e),
                      i.uniform1f(R(c, "u_dissipation"), Math.exp(-e / h)),
                      a(v.write()),
                      v.swap(),
                      i.uniform1i(
                        R(c, "u_velocity_texture"),
                        v.read().attach(1),
                      ),
                      i.uniform1i(R(c, "u_input_texture"), m.read().attach(2)),
                      i.uniform1f(R(c, "u_dissipation"), Math.exp(-e / x)),
                      a(m.write()),
                      m.swap());
                  })(i);
                }
                (() => {
                  if (!l || !m) return;
                  let { gl: e, programs: t, blit: i } = l,
                    { output: n } = t;
                  (e.useProgram(n.program),
                    e.uniform2f(R(n, "u_texel"), m.texelSizeX, m.texelSizeY),
                    e.uniform1i(R(n, "u_output_texture"), m.read().attach(1)));
                  let a = o();
                  if ((e.uniform1f(R(n, "u_smoke"), +!!a), a)) {
                    let [t, i] = ((e) => {
                      let t = y.get(e);
                      if (t) return t;
                      let r = (([e, t, r]) => {
                          let i = x(e),
                            n = x(t),
                            a = x(r),
                            l = Math.cbrt(
                              0.4122214708 * i +
                                0.5363325363 * n +
                                0.0514459929 * a,
                            ),
                            u = Math.cbrt(
                              0.2119034982 * i +
                                0.6806995451 * n +
                                0.1073969566 * a,
                            ),
                            o = Math.cbrt(
                              0.0883024619 * i +
                                0.2817188376 * n +
                                0.6299787005 * a,
                            ),
                            s =
                              1.9779984951 * l -
                              2.428592205 * u +
                              0.4505937099 * o,
                            c =
                              0.0259040371 * l +
                              0.7827717662 * u -
                              0.808675766 * o;
                          return {
                            l:
                              0.2104542553 * l +
                              0.793617785 * u -
                              0.0040720468 * o,
                            c: Math.hypot(s, c),
                            h: Math.atan2(c, s),
                          };
                        })(h(e)),
                        i = [
                          _(0.6, Math.min(1.3 * r.c, 0.2), r.h),
                          _(0.86, Math.min(0.45 * r.c, 0.07), r.h),
                        ];
                      return (y.set(e, i), i);
                    })(r.current.color);
                    (e.uniform3f(R(n, "u_thin"), t[0], t[1], t[2]),
                      e.uniform3f(R(n, "u_dense"), i[0], i[1], i[2]));
                  }
                  i(null);
                })();
                let u = (3 * Math.max(t.trail, t.drift) + 0.5) * 1e3,
                  s = t.autoplay && !t.reduced && !I.inside;
                !t.paused && (a || s || L > 0 || e - C < u) && X();
              }
              let G = (t, i) => {
                  let n = r.current;
                  if (!n.interactive || n.paused) return;
                  let a = e.getBoundingClientRect(),
                    l = t - a.left,
                    u = i - a.top;
                  if (!(l >= 0 && u >= 0 && l <= a.width && u <= a.height)) {
                    I.inside &&
                      ((I.inside = !1), (I.leftAt = performance.now()), X());
                    return;
                  }
                  if (!I.inside) {
                    ((I.inside = !0), (I.seen = !0), (I.x = l), (I.y = u), X());
                    return;
                  }
                  ((I.dx += l - I.x),
                    (I.dy += u - I.y),
                    (I.x = l),
                    (I.y = u),
                    (I.moved = !0),
                    X());
                },
                H = () => {
                  I.inside &&
                    ((I.inside = !1), (I.leftAt = performance.now()), X());
                },
                Y = (e) => {
                  "touch" !== e.pointerType && G(e.clientX, e.clientY);
                },
                W = (e) => {
                  I.inside = !1;
                  let t = e.targetTouches[0];
                  t && G(t.clientX, t.clientY);
                },
                q = (e) => {
                  let t = e.targetTouches[0];
                  t && G(t.clientX, t.clientY);
                };
              (n.addEventListener("pointermove", Y, { passive: !0 }),
                n.addEventListener("touchstart", W, { passive: !0 }),
                n.addEventListener("touchmove", q, { passive: !0 }),
                n.addEventListener("touchend", H, { passive: !0 }),
                n.addEventListener("blur", H),
                i.documentElement.addEventListener("mouseleave", H));
              let V = () => {
                  ((u = null), c(), X());
                },
                $ = new MutationObserver(V);
              ($.observe(i.documentElement, {
                attributes: !0,
                attributeFilter: ["class", "style", "data-theme"],
              }),
                i.body &&
                  $.observe(i.body, {
                    attributes: !0,
                    attributeFilter: ["class", "style", "data-theme"],
                  }));
              let K = n.matchMedia("(prefers-color-scheme: dark)");
              K.addEventListener("change", V);
              let Q = new ResizeObserver(() => {
                O() && ((u = null), (D = 0), X());
              });
              Q.observe(e);
              let J =
                "undefined" == typeof IntersectionObserver
                  ? null
                  : new IntersectionObserver(
                      ([e]) => {
                        (A = e.isIntersecting)
                          ? ((D = 0), X())
                          : F && (n.cancelAnimationFrame(F), (F = 0));
                      },
                      { rootMargin: "80px" },
                    );
              J ? J.observe(e) : (A = !0);
              let Z = (e) => {
                  (e.preventDefault(),
                    (M = !0),
                    F && n.cancelAnimationFrame(F),
                    (F = 0),
                    (v = m = f = null),
                    (p = null),
                    (l = null));
                },
                ee = () => {
                  (l = T(a)) && ((M = !1), (g = 0), O(), (D = 0), X());
                };
              return (
                a.addEventListener("webglcontextlost", Z),
                a.addEventListener("webglcontextrestored", ee),
                O(),
                c(),
                X(),
                {
                  sync: () => {
                    ((u = null), O() && (D = 0), c(), X());
                  },
                  splat: (e, t, r, i) => {
                    [e, t, r, i].every(Number.isFinite) &&
                      (k.push({ x: e, y: t, dx: r, dy: i }), X());
                  },
                  clear: () => {
                    (P(), X());
                  },
                  destroy: () => {
                    if (
                      ((S = !0),
                      F && n.cancelAnimationFrame(F),
                      J?.disconnect(),
                      Q.disconnect(),
                      $.disconnect(),
                      K.removeEventListener("change", V),
                      n.removeEventListener("pointermove", Y),
                      n.removeEventListener("touchstart", W),
                      n.removeEventListener("touchmove", q),
                      n.removeEventListener("touchend", H),
                      n.removeEventListener("blur", H),
                      i.documentElement.removeEventListener("mouseleave", H),
                      a.removeEventListener("webglcontextlost", Z),
                      a.removeEventListener("webglcontextrestored", ee),
                      l)
                    ) {
                      (z(), l.dispose());
                      let e = l.gl;
                      (e.isContextLost() ||
                        e.getExtension("WEBGL_lose_context")?.loseContext(),
                        (l = null));
                    }
                    a.remove();
                  },
                }
              );
            })(e, t, P);
            return (
              (I.current = r),
              () => {
                (r?.destroy(), (I.current = null));
              }
            );
          }, []),
          (0, n.useImperativeHandle)(
            B,
            () => ({
              splat: (e, t, r = 0, i = 0) => I.current?.splat(e, t, r, i),
              clear: () => I.current?.clear(),
            }),
            [],
          ));
        let O = r.trim().toLowerCase();
        return (0, i.jsxs)("div", {
          ref: L,
          className: (0, o.cn)(
            "relative h-full min-h-[320px] w-full overflow-hidden",
            M,
          ),
          style: {
            backgroundColor: "transparent" === O || "" === O ? void 0 : r,
            ...C,
          },
          children: [
            (0, i.jsx)("div", {
              ref: k,
              "aria-hidden": "true",
              style: { position: "absolute", inset: 0, pointerEvents: "none" },
            }),
            U
              ? (0, i.jsx)("div", {
                  style: { position: "relative", zIndex: 1, height: "100%" },
                  children: U,
                })
              : null,
          ],
        });
      });
    w.displayName = "ChromaHalo";
    let F = {
        color: "#362E82",
        size: 56,
        force: 1,
        intensity: 1,
        trail: 0.6,
        drift: 0.6,
        blur: 8,
      },
      D = {
        kraft: F,
        wisp: { ...F, size: 30, force: 1.4, trail: 1, drift: 0.9, blur: 5 },
        cloud: {
          ...F,
          color: "#2E2A74",
          size: 100,
          force: 0.8,
          intensity: 0.8,
          trail: 0.8,
          drift: 0.7,
          blur: 16,
        },
        plum: { ...F, color: "#5A2A6E" },
        ocean: { ...F, color: "#1E3A8A" },
        graphite: { ...F, color: "#2A2A33" },
      },
      A = [
        { label: "Kraft", value: "kraft" },
        { label: "Wisp", value: "wisp" },
        { label: "Cloud", value: "cloud" },
        { label: "Plum", value: "plum" },
        { label: "Ocean", value: "ocean" },
        { label: "Graphite", value: "graphite" },
      ],
      S = [
        { label: "Auto", value: "auto" },
        { label: "Ink", value: "ink" },
        { label: "Smoke", value: "smoke" },
      ],
      M = [
        { label: "Low", value: "low" },
        { label: "Medium", value: "medium" },
        { label: "High", value: "high" },
      ],
      C = [
        {
          name: "color",
          type: "string",
          default: '"#362E82"',
          description:
            "Ink colour. Thin ink shows this colour and dense ink deepens towards black, the way real ink does on paper. In smoke mode the same hue is used in lighter tones.",
        },
        {
          name: "mode",
          type: '"auto" | "ink" | "smoke"',
          default: '"auto"',
          description:
            "Ink stains light pages like real ink on paper. Smoke is its counterpart for dark pages: the same fluid, drawn as soft light smoke in the ink's hue. Auto picks one from the background behind the component and follows theme changes.",
        },
        {
          name: "backgroundColor",
          type: "string",
          default: '"transparent"',
          description:
            "Background of the component. Leave it transparent to lay the cursor over your own page.",
        },
        {
          name: "size",
          type: "number",
          default: "56",
          description:
            "Brush radius in pixels, measured where the ink falls to half strength.",
        },
        {
          name: "force",
          type: "number",
          default: "1",
          description:
            "How hard the pointer pushes the fluid. Higher values throw the ink further ahead of the cursor.",
        },
        {
          name: "intensity",
          type: "number",
          default: "1",
          description:
            "How much ink each movement lays down. Higher values reach the deep core sooner.",
        },
        {
          name: "trail",
          type: "number",
          default: "0.6",
          description:
            "Seconds for the ink to fade almost completely once the pointer moves on.",
        },
        {
          name: "drift",
          type: "number",
          default: "0.6",
          description: "Seconds the fluid keeps moving after it is pushed.",
        },
        {
          name: "blur",
          type: "number",
          default: "8",
          description: "Softens the ink, in pixels.",
        },
        {
          name: "opacity",
          type: "number",
          default: "1",
          description: "Overall strength of the ink.",
        },
        {
          name: "quality",
          type: '"low" | "medium" | "high"',
          default: '"medium"',
          description:
            "Resolution of the fluid simulation. The ink is soft by nature, so medium is enough for almost every page.",
        },
        {
          name: "autoplay",
          type: "boolean",
          default: "true",
          description:
            "Until the pointer arrives, and again after it leaves, an invisible cursor wanders around and paints on its own.",
        },
        {
          name: "autoplaySpeed",
          type: "number",
          default: "1",
          description: "Speed of that invisible cursor.",
        },
        {
          name: "idleDelay",
          type: "number",
          default: "1.5",
          description:
            "Seconds after the pointer leaves before the invisible cursor takes over again.",
        },
        {
          name: "interactive",
          type: "boolean",
          default: "true",
          description:
            "Let the pointer and touch paint. The component listens on the window, so content laid over it still stirs the ink.",
        },
        {
          name: "paused",
          type: "boolean",
          default: "false",
          description:
            "Freezes the fluid. Reduced-motion users never get the invisible cursor.",
        },
        {
          name: "ref",
          type: "{ splat, clear }",
          default: "—",
          description:
            "Imperative controls: drop ink at a point with an optional push (in pixels from the top-left corner), or clear the canvas.",
        },
        {
          name: "children",
          type: "ReactNode",
          default: "—",
          description: "Content rendered above the ink, such as a hero.",
        },
        {
          name: "className",
          type: "string",
          default: "—",
          description:
            "Classes for the root element. It fills its parent, with a 320px minimum height.",
        },
        {
          name: "style",
          type: "CSSProperties",
          default: "—",
          description: "Inline styles for the root element.",
        },
      ],
      U = () => {
        let [e, t] = (0, u.I)(),
          r = (0, l.Y)(),
          [o, s] = (0, n.useState)("kraft"),
          [c, d] = (0, n.useState)(F),
          v = (e) => (t) => d((r) => ({ ...r, [e]: t })),
          [m, f] = (0, n.useState)(null),
          p = m ?? ("dark" === r ? "#0A0A0A" : "#FFFFFF"),
          [h, x] = (0, n.useState)("auto"),
          [g, _] = (0, n.useState)(1),
          [y, b] = (0, n.useState)("medium"),
          [E, T] = (0, n.useState)(1),
          [R, U] = (0, n.useState)(1.5),
          [B, L] = (0, n.useState)(!0),
          [k, I] = (0, n.useState)(!0),
          [z, P] = (0, n.useState)(!1);
        return (0, i.jsxs)("div", {
          children: [
            (0, i.jsx)(a.Bg, {}),
            (0, i.jsxs)(a.VX, {
              children: [
                (0, i.jsxs)(a.Ec, {
                  children: [
                    (0, i.jsx)(a.Ch, {
                      onRefresh: t,
                      minHeight: 560,
                      enableResponsive: !0,
                      children: (0, i.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, i.jsx)(
                          w,
                          {
                            color: c.color,
                            mode: h,
                            backgroundColor: p,
                            size: c.size,
                            force: c.force,
                            intensity: c.intensity,
                            trail: c.trail,
                            drift: c.drift,
                            blur: c.blur,
                            opacity: g,
                            quality: y,
                            autoplay: B,
                            autoplaySpeed: E,
                            idleDelay: R,
                            interactive: k,
                            paused: z,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, i.jsxs)(a.IH, {
                      children: [
                        (0, i.jsx)(a.bg, {
                          title: "Preset",
                          value: o,
                          options: A,
                          onChange: (e) => {
                            (s(e), d(D[e] ?? F));
                          },
                        }),
                        (0, i.jsx)(a.W7, {
                          title: "Color",
                          value: c.color,
                          onChange: v("color"),
                        }),
                        (0, i.jsx)(a.W7, {
                          title: "Background",
                          value: p,
                          onChange: f,
                        }),
                        (0, i.jsx)(a.bg, {
                          title: "Mode",
                          value: h,
                          options: S,
                          onChange: (e) => x(e),
                        }),
                        (0, i.jsx)(a.bg, {
                          title: "Quality",
                          value: y,
                          options: M,
                          onChange: (e) => b(e),
                        }),
                        (0, i.jsx)(a.yt, {
                          title: "Size",
                          min: 10,
                          max: 200,
                          step: 1,
                          value: c.size,
                          valueUnit: "px",
                          onChange: v("size"),
                        }),
                        (0, i.jsx)(a.yt, {
                          title: "Force",
                          min: 0,
                          max: 4,
                          step: 0.05,
                          value: c.force,
                          onChange: v("force"),
                        }),
                        (0, i.jsx)(a.yt, {
                          title: "Intensity",
                          min: 0.1,
                          max: 4,
                          step: 0.05,
                          value: c.intensity,
                          onChange: v("intensity"),
                        }),
                        (0, i.jsx)(a.yt, {
                          title: "Trail",
                          min: 0.1,
                          max: 5,
                          step: 0.05,
                          value: c.trail,
                          valueUnit: "s",
                          onChange: v("trail"),
                        }),
                        (0, i.jsx)(a.yt, {
                          title: "Drift",
                          min: 0.1,
                          max: 5,
                          step: 0.05,
                          value: c.drift,
                          valueUnit: "s",
                          onChange: v("drift"),
                        }),
                        (0, i.jsx)(a.yt, {
                          title: "Blur",
                          min: 0,
                          max: 32,
                          step: 1,
                          value: c.blur,
                          valueUnit: "px",
                          onChange: v("blur"),
                        }),
                        (0, i.jsx)(a.yt, {
                          title: "Opacity",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: g,
                          onChange: _,
                        }),
                        (0, i.jsx)(a.yt, {
                          title: "Autoplay Speed",
                          min: 0.1,
                          max: 3,
                          step: 0.05,
                          value: E,
                          onChange: T,
                        }),
                        (0, i.jsx)(a.yt, {
                          title: "Idle Delay",
                          min: 0,
                          max: 6,
                          step: 0.25,
                          value: R,
                          valueUnit: "s",
                          onChange: U,
                        }),
                        (0, i.jsx)(a.tl, {
                          title: "Autoplay",
                          checked: B,
                          onChange: L,
                        }),
                        (0, i.jsx)(a.tl, {
                          title: "Interactive",
                          checked: k,
                          onChange: I,
                        }),
                        (0, i.jsx)(a.tl, {
                          title: "Paused",
                          checked: z,
                          onChange: P,
                        }),
                      ],
                    }),
                    (0, i.jsx)(a.Ub, { data: C }),
                  ],
                }),
                (0, i.jsx)(a.lT, { children: (0, i.jsx)(a.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
