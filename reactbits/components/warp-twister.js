/* ReactBits Pro public preview module 89705 for warp-twister.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/89705.77f2ad6dd9729cf6.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  89705: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => g }));
    var r = a(95155),
      l = a(12115),
      i = a(56388),
      o = a(48543),
      u = a(90761),
      s = a(81712),
      n = a(3907),
      d = a(30701),
      c = a(2253);
    let p = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,
      f = `
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_radius;
uniform float u_narrow;
uniform float u_length;
uniform float u_hazeSpeed;
uniform float u_dustSpeed;
uniform float u_hazeStrength;
uniform float u_hazeFrequency;
uniform float u_dustDensity;
uniform float u_dustSize;
uniform float u_dustOpacity;
uniform float u_edgeFade;
uniform float u_spiralTight;
uniform float u_rotSpeed;
uniform vec3 u_baseColor;
uniform float u_cameraDistance;
uniform bool u_lightMode;

varying vec2 vUv;

bool clipped(in vec3 pos, float clipY, float clipZ) {
  return abs(pos.y) < clipY && abs(pos.z) < clipZ;
}

float iQuadricTypeA(in vec3 ro, in vec3 rd, in vec4 abcd, in float clipY, in float clipZ, out vec3 oNor) {
  vec3 r2 = abcd.xyz * abs(abcd.xyz);
  float k2 = dot(rd, rd * r2);
  float k1 = dot(rd, ro * r2);
  float k0 = dot(ro, ro * r2) - abcd.w;

  float h = k1 * k1 - k2 * k0;
  float nh = step(0.0, h);
  h = sqrt(max(h, 0.0)) * sign(k2);

  float t1 = (-k1 - h) / k2;
  float t2 = (-k1 + h) / k2;

  vec3 pos1 = ro + t1 * rd;
  vec3 pos2 = ro + t2 * rd;

  float v1 = float(clipped(pos1, clipY, clipZ)) * step(0.0, t1);
  float v2 = float(clipped(pos2, clipY, clipZ)) * step(0.0, t2);
  float s = step(0.0, v1);

  float t = mix(t2, t1, s) * nh;

  vec3 nor1 = normalize(pos1 * r2);
  vec3 nor2 = normalize(pos2 * r2);
  oNor = mix(nor2, nor1, s);

  return mix(-1.0, t, step(0.0, v1 + v2));
}

float hash21(vec2 p) {
  p = fract(p * vec2(345.42, 137.25));
  p += dot(p, p + 34.19);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float a = hash21(i);
  float b = hash21(i + vec2(1, 0));
  float c = hash21(i + vec2(0, 1));
  float d = hash21(i + vec2(1, 1));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.4;
  for (int i = 0; i < 3; i++) {
    s += noise(p) * a;
    p *= 1.28;
    a *= 0.512;
  }
  return s;
}

void main() {
  vec4 kShape = vec4(1.0 / u_radius, -1.0 / u_narrow, 1.0 / u_radius, 1.0);

  vec2 ndc = (vUv - 0.5) * 2.0;
  ndc.x *= u_resolution.x / u_resolution.y;

  vec3 ro = vec3(0.0, 0.0, u_cameraDistance);
  vec3 ta = vec3(0.0, 0.0, 0.0);

  vec3 ww = normalize(ta - ro);
  vec3 uu = normalize(cross(ww, vec3(0, 1, 0)));
  vec3 vv = cross(uu, ww);

  vec3 rd = normalize(ndc.x * uu + ndc.y * vv + 3.0 * ww);

  float ang = 1.5707963;
  float c = cos(ang), s = sin(ang);
  ro = vec3(c * ro.x - s * ro.y, s * ro.x + c * ro.y, ro.z);
  rd = vec3(c * rd.x - s * rd.y, s * rd.x + c * rd.y, rd.z);

  vec3 nor;
  float t = iQuadricTypeA(ro, rd, kShape, u_length, u_length, nor);
  float valid = step(0.0, t);

  vec3 pos = ro + t * rd;

  float angle = atan(pos.z, pos.x);
  float cy = pos.y;
  float angle01 = angle * 0.15915494 + 0.5;
  float flow = cy - u_time * u_hazeSpeed;

  float swirl = angle + cy * u_spiralTight + u_time * u_rotSpeed;
  vec2 cyc = vec2(cos(swirl), sin(swirl));

  vec2 h1 = vec2(cyc.x * u_hazeFrequency, flow * 2.0 + cyc.y * 0.75);
  vec2 h2 = vec2(cyc.y * (u_hazeFrequency * 0.7), flow * 1.37 - cyc.x * 0.5);
  float haze = pow(mix(fbm(h1), fbm(h2), 0.5), 2.0) * u_hazeStrength;

  float u = cyc.x * 0.5 + 0.5;
  float v = cyc.y * 0.5 + 0.5;

  vec2 uid = vec2(
    floor(u * u_dustDensity),
    floor(v * u_dustDensity + flow * 0.1)
  );

  float r1 = hash21(uid * 1.373 + 1.7);
  float r2 = hash21(uid * 2.911 + 3.1);
  float r3 = hash21(uid * 4.277 + 5.9);

  float local = cy + (r1 - 0.5) - u_time * u_dustSpeed * 0.5;
  float d = abs(fract(local) - 0.5);

  float size = mix(u_dustSize * 0.6, u_dustSize * 1.4, r2);
  float opacity = mix(u_dustOpacity * 0.4, u_dustOpacity * 0.8, r3);

  float core = exp(-d * size);
  float halo = exp(-d * size * 0.35);
  float dust = (core * 0.1 + halo * 0.8) * opacity;

  float seamFade = smoothstep(0.0, 0.2, min(angle01, 1.0 - angle01));
  dust *= seamFade;

  float fres = pow(1.0 - abs(dot(nor, -rd)), 1.35);
  float edgeFadeVal = smoothstep(0.0, 0.9, fres);
  float fadeLen = smoothstep(u_length * 0.55, 0.25, length(pos));

  vec3 col = (vec3(haze) + vec3(dust)) * fadeLen * valid;
  col *= 1.0 - edgeFadeVal * u_edgeFade;
  col *= u_baseColor;
  col = sqrt(col);

  float alpha = max(max(col.r, col.g), col.b);
  alpha = clamp(alpha * 2.0, 0.0, 1.0);

  if (u_lightMode) {
    float luminance = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(luminance), col, 2.5);
    col = pow(col, vec3(0.7));
    col = clamp(col * 2.0, 0.0, 1.0);
    alpha = clamp(luminance * 6.0, 0.0, 1.0);
  }

  gl_FragColor = vec4(col, alpha);
}
`,
      v = ({
        radius: e,
        narrow: t,
        length: a,
        hazeSpeed: i,
        dustSpeed: o,
        hazeStrength: u,
        hazeFrequency: n,
        dustDensity: d,
        dustSize: v,
        dustOpacity: m,
        edgeFade: h,
        spiralTight: g,
        rotSpeed: x,
        baseColor: _,
        cameraDistance: y,
        lightMode: S,
      }) => {
        let b = (0, l.useRef)(null),
          w = (0, l.useRef)(null),
          { viewport: z, size: C } = (0, s.C)(),
          j = (0, l.useMemo)(
            () => ({
              u_time: { value: 0 },
              u_resolution: { value: new c.I9Y() },
              u_radius: { value: 0.5 },
              u_narrow: { value: 2 },
              u_length: { value: 8 },
              u_hazeSpeed: { value: 3 },
              u_dustSpeed: { value: 2 },
              u_hazeStrength: { value: 0.1 },
              u_hazeFrequency: { value: 32 },
              u_dustDensity: { value: 128 },
              u_dustSize: { value: 64 },
              u_dustOpacity: { value: 0.1 },
              u_edgeFade: { value: 1.28 },
              u_spiralTight: { value: 0.32 },
              u_rotSpeed: { value: 0.32 },
              u_baseColor: { value: new c.Pq0() },
              u_cameraDistance: { value: 8 },
              u_lightMode: { value: !1 },
            }),
            [],
          );
        return (
          (0, s.D)((r) => {
            if (!w.current) return;
            let l = w.current.uniforms;
            ((l.u_time.value = r.clock.elapsedTime),
              l.u_resolution.value.set(C.width, C.height),
              (l.u_radius.value = e),
              (l.u_narrow.value = t),
              (l.u_length.value = a),
              (l.u_hazeSpeed.value = i),
              (l.u_dustSpeed.value = o),
              (l.u_hazeStrength.value = u),
              (l.u_hazeFrequency.value = n),
              (l.u_dustDensity.value = d),
              (l.u_dustSize.value = v),
              (l.u_dustOpacity.value = m),
              (l.u_edgeFade.value = h),
              (l.u_spiralTight.value = g),
              (l.u_rotSpeed.value = x),
              l.u_baseColor.value.set(..._),
              (l.u_cameraDistance.value = y),
              (l.u_lightMode.value = S));
          }),
          (0, r.jsxs)("mesh", {
            ref: b,
            children: [
              (0, r.jsx)("planeGeometry", { args: [z.width, z.height] }),
              (0, r.jsx)("shaderMaterial", {
                ref: w,
                vertexShader: p,
                fragmentShader: f,
                uniforms: j,
                transparent: !0,
              }),
            ],
          })
        );
      },
      m = ({
        radius: e = 1.5,
        narrow: t = 1.8,
        length: a = 10,
        hazeSpeed: l = 0.5,
        dustSpeed: i = 1,
        hazeStrength: o = 0.25,
        hazeFrequency: u = 100,
        dustDensity: s = 300,
        dustSize: c = 100,
        dustOpacity: p = 0.1,
        edgeFade: f = 2,
        spiralTight: m = 0.5,
        rotSpeed: h = 0,
        baseColor: g = [0.753, 0.518, 0.988],
        baseColorLight: x = [0.267, 0, 0.667],
        cameraDistance: _ = 8.5,
        className: y,
      }) => {
        let { resolvedTheme: S } = (0, d.D)(),
          b = "light" === S;
        return (0, r.jsx)("div", {
          className: y,
          style: {
            width: "100%",
            height: "100%",
            background: b ? "#fff" : "#0b0b0b",
          },
          children: (0, r.jsx)(n.Hl, {
            className: "w-full h-full",
            gl: { antialias: !0, alpha: !0 },
            children: (0, r.jsx)(v, {
              radius: e,
              narrow: t,
              length: a,
              hazeSpeed: l,
              dustSpeed: i,
              hazeStrength: o,
              hazeFrequency: u,
              dustDensity: s,
              dustSize: c,
              dustOpacity: p,
              edgeFade: f,
              spiralTight: m,
              rotSpeed: h,
              baseColor: b ? x : g,
              cameraDistance: _,
              lightMode: b,
            }),
          }),
        });
      };
    m.displayName = "WarpTwister";
    let h = (e) => {
        let t = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);
        return t
          ? [
              parseInt(t[1], 16) / 255,
              parseInt(t[2], 16) / 255,
              parseInt(t[3], 16) / 255,
            ]
          : [1, 1, 1];
      },
      g = () => {
        let [e, t] = (0, u.I)(),
          [a, s] = (0, l.useState)(1.5),
          [n, d] = (0, l.useState)(1.8),
          [c, p] = (0, l.useState)(10),
          [f, v] = (0, l.useState)(8.5),
          [g, x] = (0, l.useState)(0.5),
          [_, y] = (0, l.useState)(0.25),
          [S, b] = (0, l.useState)(100),
          [w, z] = (0, l.useState)(1),
          [C, j] = (0, l.useState)(300),
          [D, P] = (0, l.useState)(100),
          [k, F] = (0, l.useState)(0.1),
          [T, N] = (0, l.useState)(2),
          [q, I] = (0, l.useState)(0.5),
          [O, M] = (0, l.useState)(0),
          [E, H] = (0, l.useState)("#c084fc"),
          [L, U] = (0, l.useState)("#4400aa");
        return (0, r.jsxs)("div", {
          children: [
            (0, r.jsx)(i.Bg, {}),
            (0, r.jsxs)(i.VX, {
              children: [
                (0, r.jsxs)(i.Ec, {
                  children: [
                    (0, r.jsx)(i.Ch, {
                      onRefresh: t,
                      minHeight: 500,
                      children: (0, r.jsx)(
                        m,
                        {
                          radius: a,
                          narrow: n,
                          length: c,
                          hazeSpeed: g,
                          dustSpeed: w,
                          hazeStrength: _,
                          hazeFrequency: S,
                          dustDensity: C,
                          dustSize: D,
                          dustOpacity: k,
                          edgeFade: T,
                          spiralTight: q,
                          rotSpeed: O,
                          baseColor: h(E),
                          baseColorLight: h(L),
                          cameraDistance: f,
                        },
                        e,
                      ),
                    }),
                    (0, r.jsxs)(i.IH, {
                      children: [
                        (0, r.jsx)(o.PreviewSlider, {
                          title: "Radius",
                          value: a,
                          onChange: s,
                          min: 0.5,
                          max: 3,
                          step: 0.1,
                        }),
                        (0, r.jsx)(o.PreviewSlider, {
                          title: "Narrow",
                          value: n,
                          onChange: d,
                          min: 0.5,
                          max: 5,
                          step: 0.1,
                        }),
                        (0, r.jsx)(o.PreviewSlider, {
                          title: "Length",
                          value: c,
                          onChange: p,
                          min: 2,
                          max: 20,
                          step: 0.5,
                        }),
                        (0, r.jsx)(o.PreviewSlider, {
                          title: "Camera Distance",
                          value: f,
                          onChange: v,
                          min: 3,
                          max: 15,
                          step: 0.5,
                        }),
                        (0, r.jsx)(o.PreviewSlider, {
                          title: "Edge Fade",
                          value: T,
                          onChange: N,
                          min: 0,
                          max: 5,
                          step: 0.1,
                        }),
                        (0, r.jsx)(o.PreviewSlider, {
                          title: "Spiral Tightness",
                          value: q,
                          onChange: I,
                          min: 0,
                          max: 2,
                          step: 0.05,
                        }),
                        (0, r.jsx)(o.PreviewSlider, {
                          title: "Rotation Speed",
                          value: O,
                          onChange: M,
                          min: 0,
                          max: 2,
                          step: 0.05,
                        }),
                        (0, r.jsx)(o.PreviewSlider, {
                          title: "Haze Speed",
                          value: g,
                          onChange: x,
                          min: 0,
                          max: 5,
                          step: 0.1,
                        }),
                        (0, r.jsx)(o.PreviewSlider, {
                          title: "Haze Strength",
                          value: _,
                          onChange: y,
                          min: 0,
                          max: 1,
                          step: 0.05,
                        }),
                        (0, r.jsx)(o.PreviewSlider, {
                          title: "Haze Frequency",
                          value: S,
                          onChange: b,
                          min: 10,
                          max: 200,
                          step: 5,
                        }),
                        (0, r.jsx)(o.PreviewSlider, {
                          title: "Dust Speed",
                          value: w,
                          onChange: z,
                          min: 0,
                          max: 10,
                          step: 0.5,
                        }),
                        (0, r.jsx)(o.PreviewSlider, {
                          title: "Dust Density",
                          value: C,
                          onChange: j,
                          min: 50,
                          max: 500,
                          step: 25,
                        }),
                        (0, r.jsx)(o.PreviewSlider, {
                          title: "Dust Size",
                          value: D,
                          onChange: P,
                          min: 20,
                          max: 200,
                          step: 10,
                        }),
                        (0, r.jsx)(o.PreviewSlider, {
                          title: "Dust Opacity",
                          value: k,
                          onChange: F,
                          min: 0,
                          max: 0.5,
                          step: 0.01,
                        }),
                        (0, r.jsx)(o.PreviewColor, {
                          title: "Base Color (Dark)",
                          value: E,
                          onChange: H,
                        }),
                        (0, r.jsx)(o.PreviewColor, {
                          title: "Base Color (Light)",
                          value: L,
                          onChange: U,
                        }),
                      ],
                    }),
                    (0, r.jsx)(i.Ub, {
                      data: [
                        {
                          name: "radius",
                          type: "number",
                          default: "1.5",
                          description: "Tube radius",
                        },
                        {
                          name: "narrow",
                          type: "number",
                          default: "1.8",
                          description: "Tube narrowing factor",
                        },
                        {
                          name: "length",
                          type: "number",
                          default: "10",
                          description: "Tube length",
                        },
                        {
                          name: "hazeSpeed",
                          type: "number",
                          default: "0.5",
                          description: "Speed of haze flow",
                        },
                        {
                          name: "dustSpeed",
                          type: "number",
                          default: "1",
                          description: "Speed of dust particles",
                        },
                        {
                          name: "hazeStrength",
                          type: "number",
                          default: "0.25",
                          description: "Intensity of haze effect",
                        },
                        {
                          name: "hazeFrequency",
                          type: "number",
                          default: "100",
                          description: "Frequency of haze pattern",
                        },
                        {
                          name: "dustDensity",
                          type: "number",
                          default: "300",
                          description: "Density of dust particles",
                        },
                        {
                          name: "dustSize",
                          type: "number",
                          default: "100",
                          description: "Size of dust particles",
                        },
                        {
                          name: "dustOpacity",
                          type: "number",
                          default: "0.1",
                          description: "Opacity of dust particles",
                        },
                        {
                          name: "edgeFade",
                          type: "number",
                          default: "2",
                          description: "Edge fade intensity",
                        },
                        {
                          name: "spiralTight",
                          type: "number",
                          default: "0.5",
                          description: "Tightness of spiral pattern",
                        },
                        {
                          name: "rotSpeed",
                          type: "number",
                          default: "0",
                          description: "Rotation speed",
                        },
                        {
                          name: "baseColor",
                          type: "[number, number, number]",
                          default: "[0.753, 0.518, 0.988]",
                          description: "Base color [r, g, b] values 0-1",
                        },
                        {
                          name: "baseColorLight",
                          type: "[number, number, number]",
                          default: "[0.267, 0, 0.667]",
                          description:
                            "Light mode base color [r, g, b] values 0-1",
                        },
                        {
                          name: "cameraDistance",
                          type: "number",
                          default: "8.5",
                          description: "Camera distance",
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
                (0, r.jsx)(i.lT, { children: (0, r.jsx)(i.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
