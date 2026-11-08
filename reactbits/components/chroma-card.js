/* ReactBits Pro public preview module 87058 for chroma-card.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/87058.4993c3434bb8d0e3.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  87058: (e, t, i) => {
    (i.r(t), i.d(t, { default: () => x }));
    var r = i(95155),
      n = i(12115),
      a = i(56388),
      o = i(48543),
      u = i(90761),
      s = i(81712),
      l = i(3907),
      m = i(2253),
      c = i(82637),
      d = i(90650);
    let v = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,
      p = `
precision highp float;

uniform sampler2D u_texture;
uniform float u_imageAspectRatio;
uniform float u_aspectRatio;
uniform float u_opacity;
uniform float u_hover;
uniform float u_zoomLevel;
uniform float u_rgbShift;
uniform float u_pixelDisplace;
uniform float u_borderRadius;
uniform vec2 u_resolution;
varying vec2 vUv;

float exponentialInOut(float t) {
  return t == 0.0 || t == 1.0
    ? t
    : t < 0.5
      ? +0.5 * pow(2.0, (20.0 * t) - 10.0)
      : -0.5 * pow(2.0, 10.0 - (t * 20.0)) + 1.0;
}

float roundedBoxSDF(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

void main() {
  vec2 uv = vUv;

  vec2 pixelCoord = vUv * u_resolution;
  vec2 center = u_resolution * 0.5;
  vec2 halfSize = u_resolution * 0.5;
  float dist = roundedBoxSDF(pixelCoord - center, halfSize, u_borderRadius);

  if (dist > 0.0) {
    discard;
  }

  float alpha = 1.0 - smoothstep(-1.0, 1.0, dist);

  float u = u_imageAspectRatio / u_aspectRatio;
  if(u_imageAspectRatio > u_aspectRatio) {
    u = 1. / u;
  }

  uv.y *= u;
  uv.y -= (u) / 2. - .5;

  float hoverLevel = exponentialInOut(min(1., (distance(vec2(.5), uv) * u_hover) + u_hover));
  uv *= 1. - u_zoomLevel * hoverLevel;
  uv += u_zoomLevel / 2. * hoverLevel;
  uv = clamp(uv, 0., 1.);
  vec4 color = texture2D(u_texture, uv);

  if(hoverLevel > 0.) {
    hoverLevel = 1. - abs(hoverLevel - .5) * 2.;
    uv.y += color.r * hoverLevel * u_pixelDisplace;
    color = texture2D(u_texture, uv);
    color.r = texture2D(u_texture, uv + (hoverLevel) * u_rgbShift).r;
    color.g = texture2D(u_texture, uv - (hoverLevel) * u_rgbShift).g;
  }

  gl_FragColor = vec4(color.rgb, color.a * u_opacity * alpha);
}
`,
      h = ({
        imageSrc: e,
        imageAspectRatio: t,
        cardWidth: i,
        cardHeight: a,
        zoomLevel: o,
        rgbShiftAmount: u,
        pixelDisplaceAmount: l,
        hoverDuration: d,
        rotationIntensity: h,
        scaleIntensity: f,
        positionIntensity: x,
        interactionDuration: g,
        opacity: y,
        borderRadius: b,
      }) => {
        let S = (0, n.useRef)(null),
          _ = (0, n.useRef)(null),
          { camera: C, gl: j } = (0, s.C)(),
          w = (0, n.useMemo)(() => new m.tBo(), []),
          R = (0, n.useRef)(new m.I9Y()),
          P = (0, n.useMemo)(() => new m.Tap().load(e), [e]),
          D = (0, n.useMemo)(
            () => ({
              u_texture: { value: P },
              u_imageAspectRatio: { value: t },
              u_aspectRatio: { value: i / a },
              u_opacity: { value: y },
              u_hover: { value: 0 },
              u_zoomLevel: { value: o },
              u_rgbShift: { value: u },
              u_pixelDisplace: { value: l },
              u_borderRadius: { value: b },
              u_resolution: { value: new m.I9Y(500, 700) },
            }),
            [],
          );
        return (
          (0, s.D)(() => {
            _.current &&
              ((_.current.uniforms.u_texture.value = P),
              (_.current.uniforms.u_imageAspectRatio.value = t),
              (_.current.uniforms.u_aspectRatio.value = i / a),
              (_.current.uniforms.u_opacity.value = y),
              (_.current.uniforms.u_zoomLevel.value = o),
              (_.current.uniforms.u_rgbShift.value = u),
              (_.current.uniforms.u_pixelDisplace.value = l),
              (_.current.uniforms.u_borderRadius.value = b));
          }),
          (0, n.useEffect)(() => {
            let e = j.domElement,
              t = (t) => {
                let i = e.getBoundingClientRect();
                if (
                  ((R.current.x = ((t.clientX - i.left) / i.width) * 2 - 1),
                  (R.current.y = -(2 * ((t.clientY - i.top) / i.height)) + 1),
                  !S.current || !_.current)
                )
                  return;
                let r = S.current;
                w.setFromCamera(R.current, C);
                let n = w.intersectObject(r);
                (c.Ay.to(_.current.uniforms.u_hover, {
                  value: +(n.length > 0),
                  duration: d,
                }),
                  c.Ay.to(r.scale, {
                    x: 1 - R.current.y * f,
                    y: 1 - R.current.y * f,
                    duration: g,
                  }),
                  c.Ay.to(r.position, { x: R.current.x * x, duration: g }),
                  c.Ay.to(r.rotation, {
                    x: -R.current.y * (Math.PI / 3) * h,
                    y: R.current.x * (Math.PI / 3) * h,
                    duration: g,
                  }));
              },
              i = () => {
                _.current &&
                  c.Ay.to(_.current.uniforms.u_hover, {
                    value: 0,
                    duration: d,
                  });
              };
            return (
              e.addEventListener("mousemove", t),
              e.addEventListener("mouseleave", i),
              () => {
                (e.removeEventListener("mousemove", t),
                  e.removeEventListener("mouseleave", i));
              }
            );
          }, [j, C, w, d, h, f, x, g]),
          (0, r.jsxs)("mesh", {
            ref: S,
            children: [
              (0, r.jsx)("planeGeometry", { args: [i, a] }),
              (0, r.jsx)("shaderMaterial", {
                ref: _,
                vertexShader: v,
                fragmentShader: p,
                uniforms: D,
                transparent: !0,
              }),
            ],
          })
        );
      },
      f = ({
        width: e = "100%",
        height: t = "100%",
        className: i = "",
        children: n,
        imageSrc: a = "/demo-media/portrait-indigo.webp",
        imageAspectRatio: o = 0.67,
        cardWidth: u = 5,
        cardHeight: s = 6,
        zoomLevel: c = 0.3,
        rgbShiftAmount: v = 0.02,
        pixelDisplaceAmount: p = 0.095,
        hoverDuration: f = 3,
        rotationIntensity: x = 0.2,
        scaleIntensity: g = 0.1,
        positionIntensity: y = 0.5,
        interactionDuration: b = 0.4,
        opacity: S = 1,
        cameraFov: _ = 50,
        cameraZ: C = 7,
        borderRadius: j = 30,
      }) => {
        let w = "number" == typeof e ? `${e}px` : e,
          R = "number" == typeof t ? `${t}px` : t;
        return (0, r.jsxs)("div", {
          className: (0, d.cn)("relative overflow-hidden", i),
          style: { width: w, height: R },
          children: [
            (0, r.jsx)(
              l.Hl,
              {
                className: "absolute inset-0 h-full w-full",
                gl: { antialias: !0, alpha: !0, toneMapping: m.y_p },
                camera: { fov: _, near: 0.1, far: 100, position: [0, 0, C] },
                children: (0, r.jsx)(h, {
                  imageSrc: a,
                  imageAspectRatio: o,
                  cardWidth: u,
                  cardHeight: s,
                  zoomLevel: c,
                  rgbShiftAmount: v,
                  pixelDisplaceAmount: p,
                  hoverDuration: f,
                  rotationIntensity: x,
                  scaleIntensity: g,
                  positionIntensity: y,
                  interactionDuration: b,
                  opacity: S,
                  borderRadius: j,
                }),
              },
              `camera-${_}-${C}`,
            ),
            n &&
              (0, r.jsx)("div", {
                className:
                  "pointer-events-none absolute inset-0 flex items-center justify-center",
                children: n,
              }),
          ],
        });
      };
    f.displayName = "ChromaCard";
    let x = () => {
      let [e, t] = (0, u.I)(),
        [i, s] = (0, n.useState)("/demo-media/portrait-indigo.webp"),
        [l, m] = (0, n.useState)(0.67),
        [c, d] = (0, n.useState)(5),
        [v, p] = (0, n.useState)(6),
        [h, x] = (0, n.useState)(30),
        [g, y] = (0, n.useState)(0.3),
        [b, S] = (0, n.useState)(0.02),
        [_, C] = (0, n.useState)(0.095),
        [j, w] = (0, n.useState)(3),
        [R, P] = (0, n.useState)(0.2),
        [D, I] = (0, n.useState)(0.1),
        [L, A] = (0, n.useState)(0.5),
        [N, E] = (0, n.useState)(0.4),
        [H, z] = (0, n.useState)(1),
        [B, M] = (0, n.useState)(60),
        [U, F] = (0, n.useState)(7);
      return (0, r.jsxs)("div", {
        children: [
          (0, r.jsx)(a.Bg, {}),
          (0, r.jsxs)(a.VX, {
            children: [
              (0, r.jsxs)(a.Ec, {
                children: [
                  (0, r.jsx)(a.Ch, {
                    onRefresh: t,
                    minHeight: 600,
                    children: (0, r.jsx)(
                      f,
                      {
                        imageSrc: i,
                        imageAspectRatio: l,
                        cardWidth: c,
                        cardHeight: v,
                        borderRadius: h,
                        zoomLevel: g,
                        rgbShiftAmount: b,
                        pixelDisplaceAmount: _,
                        hoverDuration: j,
                        rotationIntensity: R,
                        scaleIntensity: D,
                        positionIntensity: L,
                        interactionDuration: N,
                        opacity: H,
                        cameraFov: B,
                        cameraZ: U,
                      },
                      e,
                    ),
                  }),
                  (0, r.jsxs)(a.IH, {
                    children: [
                      (0, r.jsx)(o.PreviewInput, {
                        title: "Image URL",
                        value: i,
                        onChange: s,
                      }),
                      (0, r.jsx)(o.PreviewSlider, {
                        title: "Image Aspect Ratio",
                        value: l,
                        onChange: m,
                        min: 0.3,
                        max: 2,
                        step: 0.01,
                      }),
                      (0, r.jsx)(o.PreviewSlider, {
                        title: "Card Width",
                        value: c,
                        onChange: d,
                        min: 1,
                        max: 10,
                        step: 0.5,
                      }),
                      (0, r.jsx)(o.PreviewSlider, {
                        title: "Card Height",
                        value: v,
                        onChange: p,
                        min: 1,
                        max: 12,
                        step: 0.5,
                      }),
                      (0, r.jsx)(o.PreviewSlider, {
                        title: "Border Radius",
                        value: h,
                        onChange: x,
                        min: 0,
                        max: 100,
                        step: 1,
                      }),
                      (0, r.jsx)(o.PreviewSlider, {
                        title: "Opacity",
                        value: H,
                        onChange: z,
                        min: 0,
                        max: 1,
                        step: 0.05,
                      }),
                      (0, r.jsx)(o.PreviewSlider, {
                        title: "FOV",
                        value: B,
                        onChange: M,
                        min: 20,
                        max: 100,
                        step: 1,
                      }),
                      (0, r.jsx)(o.PreviewSlider, {
                        title: "Camera Z",
                        value: U,
                        onChange: F,
                        min: 3,
                        max: 20,
                        step: 0.5,
                      }),
                      (0, r.jsx)(o.PreviewSlider, {
                        title: "Zoom Level",
                        value: g,
                        onChange: y,
                        min: 0,
                        max: 1,
                        step: 0.05,
                      }),
                      (0, r.jsx)(o.PreviewSlider, {
                        title: "RGB Shift",
                        value: b,
                        onChange: S,
                        min: 0,
                        max: 0.1,
                        step: 0.005,
                      }),
                      (0, r.jsx)(o.PreviewSlider, {
                        title: "Pixel Displace",
                        value: _,
                        onChange: C,
                        min: 0,
                        max: 0.5,
                        step: 0.005,
                      }),
                      (0, r.jsx)(o.PreviewSlider, {
                        title: "Hover Duration",
                        value: j,
                        onChange: w,
                        min: 0.1,
                        max: 5,
                        step: 0.1,
                      }),
                      (0, r.jsx)(o.PreviewSlider, {
                        title: "Rotation Intensity",
                        value: R,
                        onChange: P,
                        min: 0,
                        max: 1,
                        step: 0.05,
                      }),
                      (0, r.jsx)(o.PreviewSlider, {
                        title: "Scale Intensity",
                        value: D,
                        onChange: I,
                        min: 0,
                        max: 0.5,
                        step: 0.01,
                      }),
                      (0, r.jsx)(o.PreviewSlider, {
                        title: "Position Intensity",
                        value: L,
                        onChange: A,
                        min: 0,
                        max: 2,
                        step: 0.1,
                      }),
                      (0, r.jsx)(o.PreviewSlider, {
                        title: "Interaction Duration",
                        value: N,
                        onChange: E,
                        min: 0.1,
                        max: 2,
                        step: 0.1,
                      }),
                    ],
                  }),
                  (0, r.jsx)(a.Ub, {
                    data: [
                      {
                        name: "width",
                        type: "number | string",
                        default: '"100%"',
                        description:
                          "Width of the component in pixels or CSS value",
                      },
                      {
                        name: "height",
                        type: "number | string",
                        default: '"100%"',
                        description:
                          "Height of the component in pixels or CSS value",
                      },
                      {
                        name: "imageSrc",
                        type: "string",
                        default: '"https://..."',
                        description: "Image source URL",
                      },
                      {
                        name: "imageAspectRatio",
                        type: "number",
                        default: "0.67",
                        description: "Aspect ratio of the source image",
                      },
                      {
                        name: "cardWidth",
                        type: "number",
                        default: "5",
                        description: "Width of the 3D card",
                      },
                      {
                        name: "cardHeight",
                        type: "number",
                        default: "6",
                        description: "Height of the 3D card",
                      },
                      {
                        name: "zoomLevel",
                        type: "number",
                        default: "0.3",
                        description: "Zoom level on hover (0-1)",
                      },
                      {
                        name: "rgbShiftAmount",
                        type: "number",
                        default: "0.02",
                        description:
                          "RGB chromatic aberration shift amount (0-0.1)",
                      },
                      {
                        name: "pixelDisplaceAmount",
                        type: "number",
                        default: "0.095",
                        description:
                          "Pixel displacement amount on hover (0-0.5)",
                      },
                      {
                        name: "hoverDuration",
                        type: "number",
                        default: "3",
                        description: "Duration of hover animation in seconds",
                      },
                      {
                        name: "rotationIntensity",
                        type: "number",
                        default: "0.2",
                        description: "Rotation intensity on mouse move (0-1)",
                      },
                      {
                        name: "scaleIntensity",
                        type: "number",
                        default: "0.1",
                        description: "Scale intensity on mouse move (0-0.5)",
                      },
                      {
                        name: "positionIntensity",
                        type: "number",
                        default: "0.5",
                        description:
                          "Position movement intensity on mouse move (0-2)",
                      },
                      {
                        name: "interactionDuration",
                        type: "number",
                        default: "0.4",
                        description:
                          "Duration of interaction animations in seconds",
                      },
                      {
                        name: "opacity",
                        type: "number",
                        default: "1",
                        description: "Master opacity (0-1)",
                      },
                      {
                        name: "cameraFov",
                        type: "number",
                        default: "50",
                        description: "Camera field of view",
                      },
                      {
                        name: "cameraZ",
                        type: "number",
                        default: "7",
                        description: "Camera Z position",
                      },
                      {
                        name: "borderRadius",
                        type: "number",
                        default: "30",
                        description: "Border radius in pixels",
                      },
                      {
                        name: "className",
                        type: "string",
                        default: '""',
                        description: "Additional CSS classes",
                      },
                      {
                        name: "children",
                        type: "React.ReactNode",
                        default: "undefined",
                        description: "Content to render on top of the effect",
                      },
                    ],
                  }),
                ],
              }),
              (0, r.jsx)(a.lT, { children: (0, r.jsx)(a.Gv, {}) }),
            ],
          }),
        ],
      });
    };
  },
};
