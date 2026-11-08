/* ReactBits Pro public preview module 6393 for contour-tide.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/6393.36d8ddb51ae6b4d9.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  6393: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => L }));
    var r = a(95155),
      o = a(12115),
      l = a(86049),
      n = a(56388),
      i = a(90761),
      s = a(81712),
      u = a(3907),
      d = a(2253),
      c = a(90650);
    let p = ["#6E6E80", "#FFFFFF"],
      f = `
#define WAVES 14
#define MAX_RIPPLES 4

uniform float uTime;
uniform float uNear;
uniform float uFar;
uniform float uSpread;
uniform float uSpreadBase;
uniform vec4 uWave[WAVES];
uniform vec4 uWaveMotion[WAVES];
uniform float uHeight;
uniform vec4 uCursor;
uniform float uCursorRadius;
uniform vec4 uRipple[MAX_RIPPLES];

float gridDepth(float v) {
  float inverse = 1.0 / uFar + (1.0 / uNear - 1.0 / uFar) * pow(clamp(1.0 - v, 0.0, 1.0), 1.8);
  return 1.0 / inverse;
}

vec3 surfacePoint(vec2 ground, out vec3 normal, out float fold, out float swell) {
  vec3 offset = vec3(0.0);
  normal = vec3(0.0, 1.0, 0.0);
  fold = 1.0;
  float calm = mix(0.3, 1.0, smoothstep(uNear * 0.9, uNear * 4.0, -ground.y));
  for (int i = 0; i < WAVES; i++) {
    vec4 wave = uWave[i];
    vec4 motion = uWaveMotion[i];
    float phase = wave.z * dot(wave.xy, ground) - motion.x * uTime + motion.y;
    float s = sin(phase);
    float c = cos(phase);
    float amplitude = wave.w * uHeight * calm;
    float steep = motion.z;
    offset.x += steep * amplitude * wave.x * c;
    offset.z += steep * amplitude * wave.y * c;
    offset.y += amplitude * s;
    float ka = wave.z * amplitude;
    normal.x -= wave.x * ka * c;
    normal.z -= wave.y * ka * c;
    normal.y -= steep * ka * s;
    fold -= steep * ka * s;
  }

  vec2 toCursor = ground - uCursor.xy;
  float radius2 = max(uCursorRadius * uCursorRadius, 1e-4);
  swell = uCursor.z * exp(-dot(toCursor, toCursor) / radius2);
  offset.y += swell;
  normal.x += swell * 2.0 * toCursor.x / radius2;
  normal.z += swell * 2.0 * toCursor.y / radius2;

  for (int k = 0; k < MAX_RIPPLES; k++) {
    vec4 ripple = uRipple[k];
    if (ripple.w <= 0.001) continue;
    vec2 away = ground - ripple.xy;
    float r = max(length(away), 1e-4);
    float band = r - ripple.z;
    float envelope = exp(-band * band * 3.0) * ripple.w * 0.26;
    offset.y += sin(band * 9.0) * envelope;
    float slope = (9.0 * cos(band * 9.0) - 6.0 * band * sin(band * 9.0)) * envelope;
    normal.x -= slope * away.x / r;
    normal.z -= slope * away.y / r;
  }

  return vec3(ground.x + offset.x, offset.y, ground.y + offset.z);
}
`,
      m = `
${f}

attribute vec2 aGrid;

void main() {
  float depth = gridDepth(aGrid.y);
  float halfWidth = uSpreadBase + depth * uSpread;
  vec2 ground = vec2(aGrid.x * halfWidth * 1.03, -depth);
  vec3 normal;
  float fold;
  float swell;
  vec3 world = surfacePoint(ground, normal, fold, swell);
  world.y -= 0.035 + depth * 0.004;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`,
      h = `
void main() {
  gl_FragColor = vec4(0.0);
}
`,
      v = `
${f}

attribute vec2 aGrid;
attribute vec2 aJitter;

uniform float uRows;
uniform float uColumns;
uniform vec3 uSun;
uniform float uFogDistance;
uniform float uFoam;
uniform float uSize;
uniform float uFocal;
uniform float uPixelRatio;
uniform float uGlow;

varying float vBright;
varying float vTone;

void main() {
  float depth = gridDepth(aGrid.y + aJitter.y / uRows);
  float halfWidth = uSpreadBase + depth * uSpread;
  vec2 ground = vec2((aGrid.x + aJitter.x / uColumns) * halfWidth, -depth);
  float side = 1.0 - smoothstep(0.9, 1.0, abs(aGrid.x));
  vec3 normal;
  float fold;
  float swell;
  vec3 world = surfacePoint(ground, normal, fold, swell);
  vec3 offset = vec3(world.x - ground.x, world.y, world.z - ground.y);
  vec4 view = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * view;

  vec3 n = normalize(normal);
  vec3 toEye = normalize(cameraPosition - world);
  float lit = max(dot(n, uSun), 0.0);
  float fresnel = 0.02 + 0.98 * pow(1.0 - max(dot(n, toEye), 0.0), 5.0);
  float glint = pow(max(dot(reflect(-uSun, n), toEye), 0.0), 40.0) * (0.04 + 3.6 * fresnel);
  float crest = smoothstep(0.25, 1.0, offset.y / max(uHeight * 0.5, 0.01));
  float froth = smoothstep(0.7, 0.2, fold) * uFoam;
  float near = smoothstep(uNear * 0.95, uNear * 1.2, depth) * side;
  float distant = smoothstep(uNear * 1.1, uNear * 5.0, depth);
  float far = exp(-depth / max(uFogDistance, 0.5)) * smoothstep(uFar, uFar * 0.9, depth);

  float edgeOn = clamp(abs(dot(n, toEye)) / 0.35, 0.06, 1.0);
  float pileUp = mix(edgeOn, 1.0, smoothstep(uNear * 3.0, uNear * 14.0, depth));
  float brightness = (0.24 + 0.05 * lit + 0.9 * fresnel * distant + (glint * 2.6 + 2.4 * crest * crest * crest + froth * 2.6) * mix(0.3, 1.0, distant)) * pileUp * near * far;
  vTone = clamp(glint * 0.9 + crest * 0.6 + froth, 0.0, 1.0);

  float pixels = uSize * uFocal / max(-view.z, 0.05) * (1.0 + crest * 0.35) * uPixelRatio;
  float coverage = min(pixels, 1.0);
  vBright = brightness * coverage;
  gl_PointSize = clamp(pixels, 1.0, 6.0 * uPixelRatio) * (1.0 + uGlow * 1.6);
}
`,
      g = `
precision highp float;

uniform vec3 uTrough;
uniform vec3 uCrest;
uniform float uGlow;
uniform float uInk;
uniform float uIntensity;

varying float vBright;
varying float vTone;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c) * 2.0;
  float edge = 1.0 / (1.0 + uGlow * 1.6);
  float core = 1.0 - smoothstep(edge * 0.45, edge, r);
  float halo = exp(-r * r * 7.0) * uGlow * 0.28;
  float amount = (core + halo) * vBright * uIntensity;
  if (amount < 0.002) discard;
  vec3 color = mix(uTrough, uCrest, vTone);
  if (uInk > 0.5) {
    float alpha = clamp(amount * 1.6, 0.0, 1.0);
    gl_FragColor = vec4(color * alpha, alpha);
  } else {
    float alpha = clamp(amount, 0.0, 1.0);
    gl_FragColor = vec4(color * amount, alpha);
  }
}
`,
      w = (e, t, a) => Math.min(a, Math.max(t, e)),
      x = (e) => (e * Math.PI) / 180,
      y = (e) => {
        let t = e.trim().toLowerCase();
        return (
          "transparent" === t ||
          (/^#[0-9a-f]{8}$/.test(t)
            ? t.endsWith("00")
            : /^#[0-9a-f]{4}$/.test(t)
              ? t.endsWith("0")
              : null !==
                t.match(/^(?:rgba?|hsla?)\(.*[,/]\s*(0|0?\.0+|0%)\s*\)$/))
        );
      },
      b = new d.Q1f(),
      C = (e, t, a) => {
        let r = t.trim();
        try {
          b.set(/^#[0-9a-f]{8}$/i.test(r) ? r.slice(0, 7) : r);
        } catch {
          b.set(a);
        }
        let o = { r: 0, g: 0, b: 0 };
        return (b.getRGB(o, d.er$), e.set(o.r, o.g, o.b));
      },
      S = (e) => {
        let t = (0x9e3779b9 ^ Math.floor(9973 * e)) >>> 0;
        return () => {
          let e = (t = (t + 0x6d2b79f5) >>> 0);
          return (
            (e = Math.imul(e ^ (e >>> 15), 1 | e)),
            (((e ^= e + Math.imul(e ^ (e >>> 7), 61 | e)) ^ (e >>> 14)) >>> 0) /
              0x100000000
          );
        };
      },
      F = (e) => {
        let t = window.matchMedia("(min-resolution: 2dppx)");
        return (
          t.addEventListener("change", e),
          window.addEventListener("resize", e),
          () => {
            (t.removeEventListener("change", e),
              window.removeEventListener("resize", e));
          }
        );
      },
      M = () => window.devicePixelRatio || 1,
      k = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      E = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      j = ({ settings: e, pointerRef: t, wakeRef: a }) => {
        let { size: l, invalidate: n } = (0, s.C)(),
          i = (0, o.useRef)(null),
          u = (0, o.useRef)({
            time: 30,
            lookX: 0,
            lookY: 0,
            cursorX: 0,
            cursorZ: -8,
            cursorLift: 0,
            seeded: !1,
            presses: 0,
            ripples: Array.from({ length: 4 }, () => ({ x: 0, z: 0, age: 99 })),
            next: 0,
          }),
          c = (0, o.useMemo)(
            () => ({
              raycaster: new d.tBo(),
              pointer: new d.I9Y(),
              plane: new d.Zcv(new d.Pq0(0, 1, 0), 0),
              hit: new d.Pq0(),
            }),
            [],
          ),
          f = (0, o.useMemo)(
            () => ({
              uTime: { value: 0 },
              uNear: { value: 1.5 },
              uFar: { value: 36 },
              uSpread: { value: 0.85 },
              uSpreadBase: { value: 0.85 },
              uRows: { value: 380 },
              uColumns: { value: 1e3 },
              uWave: { value: Array.from({ length: 14 }, () => new d.IUQ()) },
              uWaveMotion: {
                value: Array.from({ length: 14 }, () => new d.IUQ()),
              },
              uHeight: { value: 1 },
              uSun: { value: new d.Pq0(0.06, 0.07, -1).normalize() },
              uFogDistance: { value: 22 },
              uFoam: { value: 1 },
              uSize: { value: 0.006 },
              uFocal: { value: 900 },
              uPixelRatio: { value: 1 },
              uGlow: { value: 1 },
              uCursor: { value: new d.IUQ(0, -8, 0, 0) },
              uCursorRadius: { value: 1.2 },
              uRipple: { value: Array.from({ length: 4 }, () => new d.IUQ()) },
              uTrough: { value: new d.Pq0() },
              uCrest: { value: new d.Pq0() },
              uInk: { value: 0 },
              uIntensity: { value: 1 },
            }),
            [],
          ),
          F = w(e.density, 0.3, 2),
          M = Math.round(1e3 * F),
          k = Math.round(380 * F),
          E = (0, o.useMemo)(
            () =>
              ((e, t, a) => {
                let r = e * t,
                  o = new Float32Array(2 * r),
                  l = new Float32Array(2 * r),
                  n = new Float32Array(3 * r),
                  i = S(a + 0.5);
                for (let a = 0; a < t; a++)
                  for (let r = 0; r < e; r++) {
                    let n = a * e + r;
                    ((o[2 * n] = (r / (e - 1)) * 2 - 1),
                      (o[2 * n + 1] = 1 - a / (t - 1)),
                      (l[2 * n] = (i() - 0.5) * 0.7),
                      (l[2 * n + 1] = (i() - 0.5) * 0.7));
                  }
                let s = new d.LoY();
                return (
                  s.setAttribute("position", new d.THS(n, 3)),
                  s.setAttribute("aGrid", new d.THS(o, 2)),
                  s.setAttribute("aJitter", new d.THS(l, 2)),
                  (s.boundingSphere = new d.iyt(new d.Pq0(), 1e6)),
                  s
                );
              })(M, k, e.seed),
            [M, k, e.seed],
          ),
          j = (0, o.useMemo)(
            () =>
              ((e, t) => {
                let a = new Float32Array(6e4);
                for (let e = 0; e < 150; e++)
                  for (let t = 0; t < 200; t++) {
                    let r = 200 * e + t;
                    ((a[2 * r] = (t / 199) * 2 - 1), (a[2 * r + 1] = e / 149));
                  }
                let r = [];
                for (let e = 0; e < 149; e++)
                  for (let t = 0; t < 199; t++) {
                    let a = 200 * e + t,
                      o = a + 1,
                      l = a + 200,
                      n = l + 1;
                    r.push(a, l, o, o, l, n);
                  }
                let o = new d.LoY();
                return (
                  o.setAttribute(
                    "position",
                    new d.THS(new Float32Array(9e4), 3),
                  ),
                  o.setAttribute("aGrid", new d.THS(a, 2)),
                  o.setIndex(r),
                  (o.boundingSphere = new d.iyt(new d.Pq0(), 1e6)),
                  o
                );
              })(0, 0),
            [],
          ),
          [P, z] = e.colors,
          {
            backgroundColor: R,
            wavelength: A,
            windAngle: L,
            choppiness: W,
            seed: I,
          } = e;
        return (
          (0, o.useEffect)(() => () => E.dispose(), [E]),
          (0, o.useEffect)(() => () => j.dispose(), [j]),
          (0, o.useEffect)(
            () => (
              (a.current = n),
              () => {
                a.current = null;
              }
            ),
            [n, a],
          ),
          (0, o.useEffect)(() => {
            let e = i.current;
            if (!e) return;
            let t = e.uniforms;
            (C(t.uTrough.value, P ?? p[0], p[0]),
              C(t.uCrest.value, z ?? P ?? p[1], p[1]));
            let a = y(R);
            b.set(a ? "#000000" : R);
            let r = 0.2126 * b.r + 0.7152 * b.g + 0.0722 * b.b,
              o = !a && r > 0.35;
            ((t.uInk.value = +!!o),
              (e.blending = d.bCz),
              (e.blendEquation = d.gO9),
              (e.blendSrc = d.qad),
              (e.blendDst = o ? d.OuU : d.qad),
              (e.blendSrcAlpha = d.qad),
              (e.blendDstAlpha = d.OuU),
              (e.needsUpdate = !0),
              n());
          }, [P, z, R, n]),
          (0, o.useEffect)(() => {
            let e = i.current;
            if (!e) return;
            let t = e.uniforms,
              a = S(I + 1.7),
              r = x(L),
              o = w(A, 0.2, 5),
              l = 11 * o,
              s = 0.4 * o,
              u = w(W, 0, 1.5),
              d = 0,
              c = [];
            for (let e = 0; e < 14; e++) {
              let o = e / 13,
                n = l * Math.pow(s / l, o) * (0.85 + 0.3 * a()),
                i = r + (a() - 0.5) * x(150) * (0.45 + 0.55 * o),
                u = (2 * Math.PI) / n,
                p = 0.012 * Math.pow(n, 1.2) * (0.7 + 0.6 * a());
              (c.push(p),
                (d += p),
                t.uWave.value[e].set(Math.sin(i), Math.cos(i), u, p),
                t.uWaveMotion.value[e].set(
                  0.55 * Math.sqrt(9.8 * u),
                  a() * Math.PI * 2,
                  0,
                  0,
                ));
            }
            for (let e = 0; e < 14; e++) {
              let a = t.uWave.value[e];
              a.w = 0.8 * (c[e] / Math.max(d, 1e-5));
              let r = a.z;
              t.uWaveMotion.value[e].z = Math.min(
                (0.9 * u) / Math.max(r * a.w * 14, 1e-4),
                4,
              );
            }
            n();
          }, [I, L, A, W, n]),
          (0, o.useEffect)(() => {
            n();
          }, [e, l, n]),
          (0, s.D)((a, r) => {
            let o = i.current;
            if (!o) return;
            let s = o.uniforms,
              d = u.current,
              p = t.current,
              f = Math.min(Math.max(r, 0), 0.05),
              m = !e.paused && !e.reduced && e.speed > 0;
            m && (d.time += f * w(e.speed, 0, 4));
            let h = l.width / Math.max(l.height, 1),
              v = Math.tan(x(50) / 2),
              g = Math.atan((1 - 2 * w(e.horizon, 0.02, 0.45)) * v),
              y = e.interactive && !e.reduced && p.inside,
              b = y ? (p.x - 0.5) * 2 : 0,
              C = y ? (p.y - 0.5) * 2 : 0,
              S = 1 - Math.exp(-(2.2 * f));
            ((d.lookX += (b - d.lookX) * S), (d.lookY += (C - d.lookY) * S));
            let F = w(e.parallax, 0, 3),
              E = a.camera;
            ((E.fov = 50),
              (E.near = 0.05),
              (E.far = 200),
              (E.aspect = h),
              E.position.set(
                0.12 * d.lookX * F,
                1.35 + 0.04 * Math.sin(0.35 * d.time),
                0,
              ),
              E.rotation.set(
                -g + 0.025 * d.lookY * F,
                -(0.045 * d.lookX) * F,
                0.006 * Math.sin(0.27 * d.time),
                "YXZ",
              ),
              E.updateProjectionMatrix(),
              E.updateMatrixWorld());
            let j = 0;
            if (y) {
              (c.pointer.set(2 * p.x - 1, 2 * p.y - 1),
                c.raycaster.setFromCamera(c.pointer, E));
              let e = c.raycaster.ray.intersectPlane(c.plane, c.hit);
              if (e && e.z < -0.5 && e.z > -21.599999999999998) {
                d.seeded ||
                  ((d.cursorX = e.x), (d.cursorZ = e.z), (d.seeded = !0));
                let t = 1 - Math.exp(-(5 * f));
                ((d.cursorX += (e.x - d.cursorX) * t),
                  (d.cursorZ += (e.z - d.cursorZ) * t),
                  (j = 1));
              }
            }
            if (
              ((d.cursorLift +=
                (j - d.cursorLift) *
                (1 - Math.exp(-f * (j > d.cursorLift ? 3 : 1.6)))),
              d.cursorLift < 0.002 && !j && (d.seeded = !1),
              p.presses !== d.presses)
            ) {
              let t = Math.min(p.presses - d.presses, 4);
              if (((d.presses = p.presses), e.clickRipples && !e.reduced)) {
                (c.pointer.set(2 * p.pressX - 1, 2 * p.pressY - 1),
                  c.raycaster.setFromCamera(c.pointer, E));
                let e = c.raycaster.ray.intersectPlane(c.plane, c.hit);
                if (e && e.z < -0.5)
                  for (let a = 0; a < t; a++) {
                    let t = d.ripples[d.next];
                    ((t.x = e.x),
                      (t.z = e.z),
                      (t.age = 0),
                      (d.next = (d.next + 1) % 4));
                  }
              }
            }
            let P = !1;
            for (let e = 0; e < 4; e++) {
              let t = d.ripples[e];
              t.age < 6 && (t.age += f);
              let a = t.age < 6 ? Math.exp(-(0.75 * t.age)) : 0;
              (a > 0.002 && (P = !0),
                s.uRipple.value[e].set(t.x, t.z, 2.2 * t.age, a));
            }
            let z =
                (1.35 /
                  Math.tan(
                    g + x(50) / 2 + 0.025 * w(e.parallax, 0, 3) + 0.03,
                  )) *
                0.8,
              R = a.viewport.dpr;
            ((s.uTime.value = d.time),
              (s.uNear.value = z),
              (s.uFar.value = 36));
            let A = w(e.parallax, 0, 3),
              L = h * v * 1.2;
            ((s.uSpread.value = Math.cos(g) * L + Math.tan(0.06 * A)),
              (s.uSpreadBase.value = 1.35 * Math.sin(g) * L + 0.14 * A + 0.35),
              (s.uRows.value = k),
              (s.uColumns.value = M),
              (s.uHeight.value = w(e.waveHeight, 0, 3)),
              (s.uFogDistance.value = 140 / w(e.fog, 0.1, 4)),
              (s.uFoam.value = w(e.foam, 0, 3)),
              (s.uSize.value = 0.0028 * w(e.particleSize, 0.2, 4)),
              (s.uFocal.value = l.height / 2 / v),
              (s.uPixelRatio.value = R),
              (s.uGlow.value = w(e.glow, 0, 2)),
              s.uCursor.value.set(
                d.cursorX,
                d.cursorZ,
                d.cursorLift * w(e.swell, 0, 3) * 0.14,
                0,
              ),
              (s.uCursorRadius.value = w(e.swellRadius, 0.1, 5)));
            let W =
              P ||
              (d.cursorLift > 0.002 && d.cursorLift < 0.998) ||
              Math.abs(d.lookX - b) > 0.001 ||
              Math.abs(d.lookY - C) > 0.001;
            !m && (W || y) && n();
          }),
          (0, r.jsxs)(r.Fragment, {
            children: [
              (0, r.jsx)("mesh", {
                geometry: j,
                frustumCulled: !1,
                renderOrder: 0,
                children: (0, r.jsx)("shaderMaterial", {
                  vertexShader: m,
                  fragmentShader: h,
                  uniforms: f,
                  colorWrite: !1,
                  depthWrite: !0,
                  depthTest: !0,
                  side: d.$EB,
                }),
              }),
              (0, r.jsx)("points", {
                geometry: E,
                frustumCulled: !1,
                renderOrder: 1,
                children: (0, r.jsx)("shaderMaterial", {
                  ref: i,
                  vertexShader: v,
                  fragmentShader: g,
                  uniforms: f,
                  transparent: !0,
                  depthTest: !0,
                  depthWrite: !1,
                }),
              }),
            ],
          })
        );
      },
      P = ({
        colors: e = p,
        backgroundColor: t = "#0a0a0a",
        density: a = 1,
        particleSize: l = 1,
        waveHeight: n = 1,
        choppiness: i = 0.8,
        wavelength: s = 1,
        windAngle: d = 0,
        horizon: f = 0.1,
        fog: m = 1,
        glow: h = 0.35,
        foam: v = 1,
        speed: g = 1,
        interactive: w = !0,
        parallax: x = 1,
        swell: b = 1,
        swellRadius: C = 0.9,
        clickRipples: S = !0,
        seed: P = 0,
        paused: z = !1,
        dpr: R = 1.5,
        className: A,
        style: L,
        children: W,
      }) => {
        let I = (0, o.useRef)(null),
          N = (0, o.useRef)({
            x: 0.5,
            y: 0.5,
            inside: !1,
            presses: 0,
            pressX: 0.5,
            pressY: 0.5,
          }),
          H = (0, o.useRef)(null),
          [T, B] = (0, o.useState)(!0),
          G = (0, o.useSyncExternalStore)(k, E, () => !1),
          X = Math.min(
            (0, o.useSyncExternalStore)(F, M, () => 1),
            Math.max(R, 0.5),
          ),
          q = !z && !G && g > 0,
          D = y(t);
        return (
          (0, o.useEffect)(() => {
            let e = I.current;
            if (!e || "undefined" == typeof IntersectionObserver) return;
            let t = new IntersectionObserver(([e]) => B(e.isIntersecting), {
              rootMargin: "80px",
            });
            return (t.observe(e), () => t.disconnect());
          }, []),
          (0, o.useEffect)(() => {
            let e = I.current;
            if (!e) return;
            let t = (t) => {
                let a = e.getBoundingClientRect(),
                  r = N.current;
                ((r.x = (t.clientX - a.left) / Math.max(a.width, 1)),
                  (r.y = 1 - (t.clientY - a.top) / Math.max(a.height, 1)),
                  (r.inside = !0));
              },
              a = (e) => {
                (t(e), H.current?.());
              },
              r = (e) => {
                t(e);
                let a = N.current;
                ((a.pressX = a.x),
                  (a.pressY = a.y),
                  (a.presses += 1),
                  H.current?.());
              },
              o = (e) => {
                ("pointerup" !== e.type || "mouse" !== e.pointerType) &&
                  ((N.current.inside = !1), H.current?.());
              };
            return (
              e.addEventListener("pointermove", a, { passive: !0 }),
              e.addEventListener("pointerdown", r, { passive: !0 }),
              e.addEventListener("pointerleave", o, { passive: !0 }),
              e.addEventListener("pointercancel", o, { passive: !0 }),
              e.addEventListener("pointerup", o, { passive: !0 }),
              () => {
                (e.removeEventListener("pointermove", a),
                  e.removeEventListener("pointerdown", r),
                  e.removeEventListener("pointerleave", o),
                  e.removeEventListener("pointercancel", o),
                  e.removeEventListener("pointerup", o));
              }
            );
          }, []),
          (0, r.jsxs)("div", {
            ref: I,
            className: (0, c.cn)("relative isolate overflow-hidden", A),
            style: { backgroundColor: D ? void 0 : t, ...L },
            children: [
              (0, r.jsx)("div", {
                className: "absolute inset-0",
                "aria-hidden": "true",
                children: (0, r.jsx)(u.Hl, {
                  dpr: X,
                  frameloop: T && q ? "always" : "demand",
                  camera: {
                    fov: 50,
                    near: 0.05,
                    far: 200,
                    position: [0, 1.35, 0],
                  },
                  gl: {
                    antialias: !1,
                    alpha: !0,
                    premultipliedAlpha: !0,
                    powerPreference: "high-performance",
                  },
                  style: { pointerEvents: "none" },
                  children: (0, r.jsx)(j, {
                    settings: {
                      colors: e,
                      backgroundColor: t,
                      density: a,
                      particleSize: l,
                      waveHeight: n,
                      choppiness: i,
                      wavelength: s,
                      windAngle: d,
                      horizon: f,
                      fog: m,
                      glow: h,
                      foam: v,
                      speed: g,
                      interactive: w,
                      parallax: x,
                      swell: b,
                      swellRadius: C,
                      clickRipples: S,
                      seed: P,
                      paused: z,
                      reduced: G,
                    },
                    pointerRef: N,
                    wakeRef: H,
                  }),
                }),
              }),
              W
                ? (0, r.jsx)("div", {
                    className: "relative z-10 h-full w-full",
                    children: W,
                  })
                : null,
            ],
          })
        );
      },
      z = {
        silver: { colors: ["#6E6E80", "#FFFFFF"], background: "#0a0a0a" },
        violet: { colors: ["#5227FF", "#C9B8FF"], background: "#0a0a0a" },
        aqua: { colors: ["#0E6F7A", "#E0FFF6"], background: "#0a0a0a" },
        ember: { colors: ["#8A3A12", "#FFE3C2"], background: "#0a0a0a" },
        paper: { colors: ["#A9A9B8", "#1C1C28"], background: "#FAFAFA" },
        lilac: { colors: ["#C4B5F5", "#3A1DB8"], background: "#F6F3FF" },
      },
      R = [
        { label: "Silver", value: "silver" },
        { label: "Violet", value: "violet" },
        { label: "Aqua", value: "aqua" },
        { label: "Ember", value: "ember" },
        { label: "Paper", value: "paper" },
        { label: "Lilac", value: "lilac" },
      ],
      A = [
        {
          name: "colors",
          type: "[string, string]",
          default: '["#6E6E80", "#FFFFFF"]',
          description:
            "Two particle colours: the body of the water, then the lit crests and foam.",
        },
        {
          name: "backgroundColor",
          type: "string",
          default: '"#0a0a0a"',
          description:
            'Colour behind the ocean. Light backgrounds switch to ink particles. Pass "transparent" to show the page.',
        },
        {
          name: "density",
          type: "number",
          default: "1",
          description:
            "Number of particles, from 0.3 to 2. 1 draws about 340,000; lower it for weaker devices.",
        },
        {
          name: "particleSize",
          type: "number",
          default: "1",
          description: "Size of each particle.",
        },
        {
          name: "waveHeight",
          type: "number",
          default: "1",
          description: "Height of the swells.",
        },
        {
          name: "choppiness",
          type: "number",
          default: "0.8",
          description:
            "How sharply the crests peak. Higher values bunch particles into bright foam lines.",
        },
        {
          name: "wavelength",
          type: "number",
          default: "1",
          description:
            "Size of the waves. Larger values give longer, rolling swells.",
        },
        {
          name: "windAngle",
          type: "number",
          default: "0",
          description:
            "Direction the waves travel, in degrees. 0 rolls them towards the viewer.",
        },
        {
          name: "horizon",
          type: "number",
          default: "0.1",
          description:
            "Height of the horizon, as a fraction from the top of the frame.",
        },
        {
          name: "fog",
          type: "number",
          default: "1",
          description: "How quickly the ocean fades into the distance.",
        },
        {
          name: "glow",
          type: "number",
          default: "0.35",
          description: "Soft halo around each particle.",
        },
        {
          name: "foam",
          type: "number",
          default: "1",
          description: "Brightness of the foam where the crests fold.",
        },
        {
          name: "speed",
          type: "number",
          default: "1",
          description: "Animation speed. 0 holds the current frame.",
        },
        {
          name: "interactive",
          type: "boolean",
          default: "true",
          description:
            "A gentle swell lifts the water under the pointer and the view drifts towards it.",
        },
        {
          name: "parallax",
          type: "number",
          default: "1",
          description:
            "How far the view drifts towards the pointer. 0 keeps it still.",
        },
        {
          name: "swell",
          type: "number",
          default: "1",
          description: "Height of the swell under the pointer. 0 disables it.",
        },
        {
          name: "swellRadius",
          type: "number",
          default: "0.9",
          description: "Width of the swell, in world units.",
        },
        {
          name: "clickRipples",
          type: "boolean",
          default: "true",
          description:
            "Each click sends a ring rolling across the water. Rapid clicks stack.",
        },
        {
          name: "seed",
          type: "number",
          default: "0",
          description: "Changes the wave pattern.",
        },
        {
          name: "paused",
          type: "boolean",
          default: "false",
          description: "Freezes the ocean.",
        },
        {
          name: "dpr",
          type: "number",
          default: "1.5",
          description: "Upper bound for the device pixel ratio.",
        },
        {
          name: "className",
          type: "string",
          default: "—",
          description: "Classes for the root element. Give it a height.",
        },
        {
          name: "style",
          type: "CSSProperties",
          default: "—",
          description: "Inline styles for the root element.",
        },
        {
          name: "children",
          type: "ReactNode",
          default: "—",
          description: "Content layered above the ocean.",
        },
      ],
      L = () => {
        let [e, t] = (0, i.I)(),
          a = (0, l.Y)(),
          [s, u] = (0, o.useState)(null),
          d = s ?? ("dark" === a ? "silver" : "paper"),
          [c, p] = (0, o.useState)({}),
          f = { ...(z[d] ?? z.silver), ...c },
          [m, h] = (0, o.useState)(1),
          [v, g] = (0, o.useState)(1),
          [w, x] = (0, o.useState)(1),
          [y, b] = (0, o.useState)(0.8),
          [C, S] = (0, o.useState)(1),
          [F, M] = (0, o.useState)(0),
          [k, E] = (0, o.useState)(0.1),
          [j, L] = (0, o.useState)(1),
          [W, I] = (0, o.useState)(0.35),
          [N, H] = (0, o.useState)(1),
          [T, B] = (0, o.useState)(1),
          [G, X] = (0, o.useState)(1),
          [q, D] = (0, o.useState)(1),
          [Y, U] = (0, o.useState)(0.9),
          [_, O] = (0, o.useState)(0),
          [$, V] = (0, o.useState)(!0),
          [Z, Q] = (0, o.useState)(!0),
          [J, K] = (0, o.useState)(!1),
          ee = (e) => (t) =>
            p((a) => {
              let r = [...(a.colors ?? f.colors)];
              return ((r[e] = t), { ...a, colors: r });
            });
        return (0, r.jsxs)("div", {
          children: [
            (0, r.jsx)(n.Bg, {}),
            (0, r.jsxs)(n.VX, {
              children: [
                (0, r.jsxs)(n.Ec, {
                  children: [
                    (0, r.jsx)(n.Ch, {
                      onRefresh: t,
                      minHeight: 600,
                      children: (0, r.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, r.jsx)(
                          P,
                          {
                            className: "h-full w-full",
                            colors: f.colors,
                            backgroundColor: f.background,
                            density: m,
                            particleSize: v,
                            waveHeight: w,
                            choppiness: y,
                            wavelength: C,
                            windAngle: F,
                            horizon: k,
                            fog: j,
                            glow: W,
                            foam: N,
                            speed: T,
                            interactive: $,
                            parallax: G,
                            swell: q,
                            swellRadius: Y,
                            clickRipples: Z,
                            seed: _,
                            paused: J,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, r.jsxs)(n.IH, {
                      children: [
                        (0, r.jsx)(n.bg, {
                          title: "Preset",
                          value: d,
                          options: R,
                          onChange: (e) => {
                            (u(e), p({}));
                          },
                        }),
                        (0, r.jsx)(n.W7, {
                          title: "Background",
                          value: f.background,
                          onChange: (e) => p((t) => ({ ...t, background: e })),
                        }),
                        (0, r.jsx)(n.W7, {
                          title: "Water",
                          value: f.colors[0],
                          onChange: ee(0),
                        }),
                        (0, r.jsx)(n.W7, {
                          title: "Crest",
                          value: f.colors[1],
                          onChange: ee(1),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Density",
                          min: 0.3,
                          max: 2,
                          step: 0.05,
                          value: m,
                          onChange: h,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Particle Size",
                          min: 0.3,
                          max: 3,
                          step: 0.05,
                          value: v,
                          onChange: g,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Wave Height",
                          min: 0,
                          max: 2,
                          step: 0.05,
                          value: w,
                          onChange: x,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Choppiness",
                          min: 0,
                          max: 1.5,
                          step: 0.05,
                          value: y,
                          onChange: b,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Wavelength",
                          min: 0.4,
                          max: 3,
                          step: 0.05,
                          value: C,
                          onChange: S,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Wind Angle",
                          min: -180,
                          max: 180,
                          step: 1,
                          value: F,
                          valueUnit: "\xb0",
                          onChange: M,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Horizon",
                          min: 0.03,
                          max: 0.4,
                          step: 0.01,
                          value: k,
                          onChange: E,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Fog",
                          min: 0.2,
                          max: 3,
                          step: 0.05,
                          value: j,
                          onChange: L,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Glow",
                          min: 0,
                          max: 1.5,
                          step: 0.05,
                          value: W,
                          onChange: I,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Foam",
                          min: 0,
                          max: 2.5,
                          step: 0.05,
                          value: N,
                          onChange: H,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Speed",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: T,
                          onChange: B,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Parallax",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: G,
                          onChange: X,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Swell",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: q,
                          onChange: D,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Swell Radius",
                          min: 0.2,
                          max: 3,
                          step: 0.05,
                          value: Y,
                          onChange: U,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Seed",
                          min: 0,
                          max: 20,
                          step: 1,
                          value: _,
                          onChange: O,
                        }),
                        (0, r.jsx)(n.tl, {
                          title: "Interactive",
                          checked: $,
                          onChange: V,
                        }),
                        (0, r.jsx)(n.tl, {
                          title: "Click Ripples",
                          checked: Z,
                          onChange: Q,
                        }),
                        (0, r.jsx)(n.tl, {
                          title: "Paused",
                          checked: J,
                          onChange: K,
                        }),
                      ],
                    }),
                    (0, r.jsx)(n.Ub, { data: A }),
                  ],
                }),
                (0, r.jsx)(n.lT, { children: (0, r.jsx)(n.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
