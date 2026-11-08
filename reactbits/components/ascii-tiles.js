/* ReactBits Pro public preview module 68640 for ascii-tiles.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/68640.aeca00540f96502c.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  68640: (e, t, r) => {
    (r.r(t), r.d(t, { default: () => v }));
    var a = r(95155),
      l = r(12115),
      n = r(56388),
      i = r(90761),
      u = r(81712),
      s = r(3907),
      o = r(2253),
      c = r(90650);
    let p = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,
      f = `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec2  uRes;

uniform float uSpeed;
uniform float uGlyph;
uniform float uTileDensity;
uniform float uTileShear;
uniform float uBevelWidth;
uniform float uBevelSoftness;
uniform float uRefraction;
uniform float uChroma;
uniform float uSpecExp;
uniform float uSpecStrength;
uniform vec3  uGlyphColor;
uniform vec3  uRecessColor;
uniform vec3  uBg;
uniform float uFreqX;
uniform float uFreqY;
uniform float uFreqXY;
uniform float uAlpha;
uniform vec2  uPointer;
uniform float uPointerActive;
uniform float uPointerRadius;
uniform float uPointerStrength;

int glyphForLevel(int level) {
  if (level <= 0) return 0;
  if (level == 1) return 2;
  if (level == 2) return 34;
  if (level == 3) return 328;
  if (level == 4) return 2976;
  if (level == 5) return 28662;
  if (level == 6) return 63903;
  return 65535;
}

float readGlyphPixel(vec2 cellUv, int mask) {
  vec2 p = floor(cellUv * 4.0);
  if (p.x < 0.0 || p.x > 3.0 || p.y < 0.0 || p.y > 3.0) return 0.0;
  int bit = int(p.x) + int(p.y) * 4;
  return float((mask >> bit) & 1);
}

float samplePatternLuma(vec2 fragPx) {
  vec2 cell = floor(fragPx / uGlyph);
  vec2 cellPx = cell * uGlyph + (uGlyph * 0.5);

  vec2 ndc = (cellPx / uRes) * 2.0 - 1.0;
  ndc.x *= uRes.x / uRes.y;

  float t = uTime * uSpeed * 0.8;
  float a = sin(ndc.x * uFreqX + t);
  float b = sin(ndc.y * uFreqY - t);
  float c = sin(ndc.x * ndc.y * uFreqXY + t * 1.5);
  float field = (a + b + c) / 3.0;
  field = field * 0.5 + 0.5;

  if (uPointerActive > 0.5) {
    float d = distance(cellPx, uPointer);
    float radial = smoothstep(0.0, max(uPointerRadius, 1.0), d);
    field *= mix(1.0, radial, clamp(uPointerStrength, 0.0, 1.0));
  }

  vec2 cellUv = fract(fragPx / uGlyph);
  int level = int(clamp(field, 0.0, 1.0) * 7.0);
  int mask = glyphForLevel(level);
  return readGlyphPixel(cellUv, mask) * field;
}

float tileHeight(vec2 surfaceUv) {
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 st = vec2(surfaceUv.x * aspect, surfaceUv.y);

  mat2 shear = mat2(1.0, uTileShear, -uTileShear, 1.0);
  st = shear * st;
  st *= max(uTileDensity, 0.001);

  vec2 p = fract(st) - 0.5;
  float chebyshev = max(abs(p.x), abs(p.y));
  float bevelInner = clamp(0.5 - uBevelWidth, 0.05, 0.5);
  float bevelOuter = clamp(bevelInner - uBevelSoftness, 0.0, bevelInner - 0.001);
  return smoothstep(bevelInner, bevelOuter, chebyshev);
}

vec3 tileNormal(vec2 surfaceUv) {
  vec2 e = vec2(0.002, 0.0);
  float h  = tileHeight(surfaceUv);
  float hx = tileHeight(surfaceUv + e.xy);
  float hy = tileHeight(surfaceUv + e.yx);
  return normalize(vec3(h - hx, h - hy, 0.02));
}

void main() {
  vec2 fragPx = vUv * uRes;

  float h = tileHeight(vUv);
  vec3  n = tileNormal(vUv);

  vec2 refractOffset = n.xy * uRefraction;
  float spread = max(uChroma, 0.0);

  float lumR = samplePatternLuma(fragPx - refractOffset * 1.0);
  float lumG = samplePatternLuma(fragPx - refractOffset * (1.0 + spread * 0.5));
  float lumB = samplePatternLuma(fragPx - refractOffset * (1.0 + spread * 1.5));

  vec3 col;
  col.r = mix(uRecessColor.r, uGlyphColor.r, lumR);
  col.g = mix(uRecessColor.g, uGlyphColor.g, lumG);
  col.b = mix(uRecessColor.b, uGlyphColor.b, lumB);

  vec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));
  vec3 halfVec  = normalize(lightDir + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(n, halfVec), 0.0), max(uSpecExp, 1.0));
  col += spec * uSpecStrength * smoothstep(0.1, 0.9, h);

  col *= mix(0.1, 1.0, smoothstep(0.0, 0.1, h));

  float fieldMix = clamp(max(max(lumR, lumG), lumB), 0.0, 1.0);
  vec3 final = mix(uBg, col, fieldMix);

  gl_FragColor = vec4(final, uAlpha);
}
`;
    function m(e) {
      let t = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);
      return t
        ? [
            parseInt(t[1], 16) / 255,
            parseInt(t[2], 16) / 255,
            parseInt(t[3], 16) / 255,
          ]
        : [0, 0, 0];
    }
    let h = (e) => {
        let t = (0, l.useRef)(null),
          { size: r } = (0, u.C)(),
          n = (0, l.useRef)(new o.I9Y(-1, -1));
        (0, u.D)((a, l) => {
          if (!t.current) return;
          let i = t.current.material.uniforms;
          ((i.uTime.value = a.clock.elapsedTime),
            i.uRes.value.set(r.width, r.height),
            (i.uSpeed.value = e.speed),
            (i.uGlyph.value = e.glyphSize),
            (i.uTileDensity.value = e.tileDensity),
            (i.uTileShear.value = e.tileShear),
            (i.uBevelWidth.value = e.bevelWidth),
            (i.uBevelSoftness.value = e.bevelSoftness),
            (i.uRefraction.value = e.refractionStrength),
            (i.uChroma.value = e.chromaticSpread),
            (i.uSpecExp.value = e.specularExponent),
            (i.uSpecStrength.value = e.specularStrength),
            (i.uFreqX.value = e.patternFreqX),
            (i.uFreqY.value = e.patternFreqY),
            (i.uFreqXY.value = e.patternFreqXY),
            (i.uAlpha.value = e.opacity));
          let u = m(e.glyphColor);
          i.uGlyphColor.value.set(u[0], u[1], u[2]);
          let s = m(e.recessColor);
          i.uRecessColor.value.set(s[0], s[1], s[2]);
          let o = m(e.backgroundColor);
          if ((i.uBg.value.set(o[0], o[1], o[2]), e.cursorInteraction)) {
            let t = e.pointer[0] * r.width,
              a = (1 - e.pointer[1]) * r.height,
              u = 1 - Math.exp(-l / 0.08);
            ((n.current.x += (t - n.current.x) * u),
              (n.current.y += (a - n.current.y) * u),
              i.uPointer.value.copy(n.current),
              (i.uPointerActive.value = 1),
              (i.uPointerRadius.value = e.cursorRadius),
              (i.uPointerStrength.value = e.cursorIntensity));
          } else i.uPointerActive.value = 0;
        });
        let i = (0, l.useMemo)(
          () => ({
            uTime: { value: 0 },
            uRes: { value: new o.I9Y(1, 1) },
            uSpeed: { value: 1 },
            uGlyph: { value: 8 },
            uTileDensity: { value: 4 },
            uTileShear: { value: 0.15 },
            uBevelWidth: { value: 0.1 },
            uBevelSoftness: { value: 0.1 },
            uRefraction: { value: 40 },
            uChroma: { value: 0.15 },
            uSpecExp: { value: 64 },
            uSpecStrength: { value: 1 },
            uGlyphColor: { value: new o.Pq0(0.225, 1.275, 0.6) },
            uRecessColor: { value: new o.Pq0(0.02, 0.05, 0.02) },
            uBg: { value: new o.Pq0(0, 0, 0) },
            uFreqX: { value: 6 },
            uFreqY: { value: 4 },
            uFreqXY: { value: 5 },
            uAlpha: { value: 1 },
            uPointer: { value: new o.I9Y(-1, -1) },
            uPointerActive: { value: 0 },
            uPointerRadius: { value: 100 },
            uPointerStrength: { value: 1 },
          }),
          [],
        );
        return (0, a.jsxs)("mesh", {
          ref: t,
          children: [
            (0, a.jsx)("planeGeometry", { args: [2, 2] }),
            (0, a.jsx)("shaderMaterial", {
              vertexShader: p,
              fragmentShader: f,
              uniforms: i,
              transparent: !0,
            }),
          ],
        });
      },
      d = ({
        width: e = "100%",
        height: t = "100%",
        className: r,
        children: n,
        speed: i = 1,
        glyphSize: u = 8,
        tileDensity: o = 3.3,
        tileShear: p = -0.22,
        bevelWidth: f = 0.02,
        bevelSoftness: m = 0.1,
        refractionStrength: d = 100,
        chromaticSpread: v = 0.2,
        specularExponent: x = 150,
        specularStrength: g = 1,
        glyphColor: y = "#FFFFFF",
        recessColor: S = "#050D08",
        backgroundColor: C = "#000000",
        patternFreqX: b = 6,
        patternFreqY: P = 4,
        patternFreqXY: F = 10,
        opacity: j = 1,
        dpr: R = 1.5,
        cursorInteraction: q = !1,
        cursorRadius: w = 129,
        cursorIntensity: I = 1,
      }) => {
        let B = (0, l.useRef)(null),
          [G, k] = (0, l.useState)([-1, -1]),
          T = (0, l.useCallback)(
            (e) => {
              if (!q) return;
              let t = B.current?.getBoundingClientRect();
              t &&
                k([
                  (e.clientX - t.left) / t.width,
                  (e.clientY - t.top) / t.height,
                ]);
            },
            [q],
          ),
          Y = (0, l.useCallback)(() => {
            k([-1, -1]);
          }, []);
        return (0, a.jsxs)("div", {
          ref: B,
          className: (0, c.cn)("relative overflow-hidden", r),
          style: { width: e, height: t },
          onPointerMove: T,
          onPointerLeave: Y,
          children: [
            (0, a.jsx)(s.Hl, {
              className: "absolute inset-0",
              dpr: [1, R],
              gl: {
                antialias: !1,
                alpha: !0,
                powerPreference: "high-performance",
              },
              orthographic: !0,
              camera: {
                position: [0, 0, 1],
                zoom: 1,
                left: -1,
                right: 1,
                top: 1,
                bottom: -1,
              },
              children: (0, a.jsx)(h, {
                speed: i,
                glyphSize: u,
                tileDensity: o,
                tileShear: p,
                bevelWidth: f,
                bevelSoftness: m,
                refractionStrength: d,
                chromaticSpread: v,
                specularExponent: x,
                specularStrength: g,
                glyphColor: y,
                recessColor: S,
                backgroundColor: C,
                patternFreqX: b,
                patternFreqY: P,
                patternFreqXY: F,
                opacity: j,
                cursorInteraction: q,
                cursorRadius: w,
                cursorIntensity: I,
                pointer: G,
              }),
            }),
            n && (0, a.jsx)("div", { className: "relative z-10", children: n }),
          ],
        });
      };
    d.displayName = "AsciiTiles";
    let v = () => {
      let [e, t] = (0, i.I)(),
        [r, u] = (0, l.useState)(1),
        [s, o] = (0, l.useState)(1),
        [c, p] = (0, l.useState)(8),
        [f, m] = (0, l.useState)(3.3),
        [h, v] = (0, l.useState)(-0.22),
        [x, g] = (0, l.useState)(0.02),
        [y, S] = (0, l.useState)(0.1),
        [C, b] = (0, l.useState)(100),
        [P, F] = (0, l.useState)(0.2),
        [j, R] = (0, l.useState)(150),
        [q, w] = (0, l.useState)(1),
        [I, B] = (0, l.useState)(6),
        [G, k] = (0, l.useState)(4),
        [T, Y] = (0, l.useState)(10),
        [U, X] = (0, l.useState)("#FFFFFF"),
        [D, E] = (0, l.useState)("#050D08"),
        [N, z] = (0, l.useState)("#000000"),
        [W, A] = (0, l.useState)(!1),
        [H, M] = (0, l.useState)(129),
        [L, O] = (0, l.useState)(1);
      return (0, a.jsxs)("div", {
        children: [
          (0, a.jsx)(n.Bg, {}),
          (0, a.jsxs)(n.VX, {
            children: [
              (0, a.jsxs)(n.Ec, {
                children: [
                  (0, a.jsx)(n.Ch, {
                    onRefresh: t,
                    children: (0, a.jsx)("div", {
                      className: "relative h-full w-full",
                      children: (0, a.jsx)(
                        d,
                        {
                          width: "100%",
                          height: "100%",
                          speed: r,
                          glyphSize: c,
                          tileDensity: f,
                          tileShear: h,
                          bevelWidth: x,
                          bevelSoftness: y,
                          refractionStrength: C,
                          chromaticSpread: P,
                          specularExponent: j,
                          specularStrength: q,
                          patternFreqX: I,
                          patternFreqY: G,
                          patternFreqXY: T,
                          glyphColor: U,
                          recessColor: D,
                          backgroundColor: N,
                          opacity: s,
                          cursorInteraction: W,
                          cursorRadius: H,
                          cursorIntensity: L,
                        },
                        e,
                      ),
                    }),
                  }),
                  (0, a.jsxs)(n.IH, {
                    children: [
                      (0, a.jsx)(n.yt, {
                        title: "Speed",
                        value: r,
                        onChange: u,
                        min: 0,
                        max: 3,
                        step: 0.05,
                      }),
                      (0, a.jsx)(n.yt, {
                        title: "Opacity",
                        value: s,
                        onChange: o,
                        min: 0,
                        max: 1,
                        step: 0.05,
                      }),
                      (0, a.jsx)(n.yt, {
                        title: "Glyph Size",
                        value: c,
                        onChange: p,
                        min: 4,
                        max: 24,
                        step: 1,
                      }),
                      (0, a.jsx)(n.yt, {
                        title: "Pattern Freq X",
                        value: I,
                        onChange: B,
                        min: 0,
                        max: 20,
                        step: 0.1,
                      }),
                      (0, a.jsx)(n.yt, {
                        title: "Pattern Freq Y",
                        value: G,
                        onChange: k,
                        min: 0,
                        max: 20,
                        step: 0.1,
                      }),
                      (0, a.jsx)(n.yt, {
                        title: "Pattern Freq XY",
                        value: T,
                        onChange: Y,
                        min: 0,
                        max: 20,
                        step: 0.1,
                      }),
                      (0, a.jsx)(n.yt, {
                        title: "Tile Density",
                        value: f,
                        onChange: m,
                        min: 1,
                        max: 12,
                        step: 0.1,
                      }),
                      (0, a.jsx)(n.yt, {
                        title: "Tile Shear",
                        value: h,
                        onChange: v,
                        min: -0.5,
                        max: 0.5,
                        step: 0.01,
                      }),
                      (0, a.jsx)(n.yt, {
                        title: "Bevel Width",
                        value: x,
                        onChange: g,
                        min: 0,
                        max: 0.5,
                        step: 0.01,
                      }),
                      (0, a.jsx)(n.yt, {
                        title: "Bevel Softness",
                        value: y,
                        onChange: S,
                        min: 0.01,
                        max: 0.4,
                        step: 0.01,
                      }),
                      (0, a.jsx)(n.yt, {
                        title: "Refraction",
                        value: C,
                        onChange: b,
                        min: 0,
                        max: 120,
                        step: 1,
                      }),
                      (0, a.jsx)(n.yt, {
                        title: "Chromatic Spread",
                        value: P,
                        onChange: F,
                        min: 0,
                        max: 1,
                        step: 0.01,
                      }),
                      (0, a.jsx)(n.yt, {
                        title: "Specular Exp",
                        value: j,
                        onChange: R,
                        min: 1,
                        max: 256,
                        step: 1,
                      }),
                      (0, a.jsx)(n.yt, {
                        title: "Specular Strength",
                        value: q,
                        onChange: w,
                        min: 0,
                        max: 3,
                        step: 0.05,
                      }),
                      (0, a.jsx)(n.W7, {
                        title: "Glyph Color",
                        value: U,
                        onChange: X,
                      }),
                      (0, a.jsx)(n.W7, {
                        title: "Recess Color",
                        value: D,
                        onChange: E,
                      }),
                      (0, a.jsx)(n.W7, {
                        title: "Background",
                        value: N,
                        onChange: z,
                      }),
                      (0, a.jsx)(n.tl, {
                        title: "Cursor Interaction",
                        checked: W,
                        onChange: A,
                      }),
                      (0, a.jsx)(n.yt, {
                        title: "Cursor Radius",
                        value: H,
                        onChange: M,
                        min: 20,
                        max: 400,
                        step: 1,
                      }),
                      (0, a.jsx)(n.yt, {
                        title: "Cursor Intensity",
                        value: L,
                        onChange: O,
                        min: 0,
                        max: 1,
                        step: 0.05,
                      }),
                    ],
                  }),
                  (0, a.jsx)(n.Ub, {
                    data: [
                      {
                        name: "width",
                        type: "string | number",
                        default: '"100%"',
                        description: "Container width",
                      },
                      {
                        name: "height",
                        type: "string | number",
                        default: '"100%"',
                        description: "Container height",
                      },
                      {
                        name: "className",
                        type: "string",
                        default: '""',
                        description: "Additional CSS classes for styling",
                      },
                      {
                        name: "children",
                        type: "ReactNode",
                        default: "undefined",
                        description: "Content rendered above the effect",
                      },
                      {
                        name: "speed",
                        type: "number",
                        default: "1",
                        description: "Animation speed multiplier (0–3)",
                      },
                      {
                        name: "glyphSize",
                        type: "number",
                        default: "8",
                        description:
                          "ASCII glyph cell size in CSS pixels (4–24)",
                      },
                      {
                        name: "tileDensity",
                        type: "number",
                        default: "3.3",
                        description:
                          "Glass-tile grid density across the long edge (1–12)",
                      },
                      {
                        name: "tileShear",
                        type: "number",
                        default: "-0.22",
                        description:
                          "Diagonal shear factor for the tile lattice (-0.5–0.5)",
                      },
                      {
                        name: "bevelWidth",
                        type: "number",
                        default: "0.02",
                        description:
                          "Width of the bevelled rim between tiles (0–0.5)",
                      },
                      {
                        name: "bevelSoftness",
                        type: "number",
                        default: "0.1",
                        description: "Bevel falloff softness (0.01–0.4)",
                      },
                      {
                        name: "refractionStrength",
                        type: "number",
                        default: "100",
                        description:
                          "Refractive offset across bevels in pixels (0–120)",
                      },
                      {
                        name: "chromaticSpread",
                        type: "number",
                        default: "0.2",
                        description:
                          "Chromatic dispersion spread between R and B samples (0–1)",
                      },
                      {
                        name: "specularExponent",
                        type: "number",
                        default: "150",
                        description: "Specular highlight exponent (1–256)",
                      },
                      {
                        name: "specularStrength",
                        type: "number",
                        default: "1",
                        description: "Specular highlight intensity (0–3)",
                      },
                      {
                        name: "patternFreqX",
                        type: "number",
                        default: "6",
                        description:
                          "First sinusoid horizontal frequency (0–20)",
                      },
                      {
                        name: "patternFreqY",
                        type: "number",
                        default: "4",
                        description:
                          "Second sinusoid vertical frequency (0–20)",
                      },
                      {
                        name: "patternFreqXY",
                        type: "number",
                        default: "10",
                        description:
                          "Cross-product frequency for the third sinusoid (0–20)",
                      },
                      {
                        name: "glyphColor",
                        type: "string",
                        default: '"#FFFFFF"',
                        description:
                          "Base lit color of the glyphs in hex format",
                      },
                      {
                        name: "recessColor",
                        type: "string",
                        default: '"#050D08"',
                        description:
                          "Color tucked into the recesses between tiles in hex format",
                      },
                      {
                        name: "backgroundColor",
                        type: "string",
                        default: '"#000000"',
                        description: "Background fill color in hex format",
                      },
                      {
                        name: "opacity",
                        type: "number",
                        default: "1",
                        description: "Master alpha (0–1)",
                      },
                      {
                        name: "dpr",
                        type: "number",
                        default: "1.5",
                        description:
                          "Maximum device pixel ratio (caps GPU work) (1–3)",
                      },
                      {
                        name: "cursorInteraction",
                        type: "boolean",
                        default: "false",
                        description:
                          "Enable cursor-based pattern destruction near the mouse",
                      },
                      {
                        name: "cursorRadius",
                        type: "number",
                        default: "129",
                        description:
                          "Cursor influence radius in CSS pixels (20–400)",
                      },
                      {
                        name: "cursorIntensity",
                        type: "number",
                        default: "1",
                        description:
                          "Cursor effect strength (0–1; higher = clearer empty zone)",
                      },
                    ],
                  }),
                ],
              }),
              (0, a.jsx)(n.lT, { children: (0, a.jsx)(n.Gv, {}) }),
            ],
          }),
        ],
      });
    };
  },
};
