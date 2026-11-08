/* ReactBits Pro public preview module 84065 for rising-lines.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/84065.1d7605cf64710fee.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  84065: (e, t, o) => {
    (o.r(t), o.d(t, { default: () => L }));
    var a = o(95155),
      l = o(12115),
      n = o(56388),
      r = o(90761),
      i = o(86049),
      s = o(2253),
      u = o(12246),
      c = o(90650);
    let d = (e, t, o) => Math.min(o, Math.max(t, e)),
      f = (e, t) => (Number.isFinite(e) ? e : t),
      h = new s.Q1f(),
      p = (e) => {
        if ("string" != typeof e) return null;
        let t = e.trim().toLowerCase();
        if (!t || "transparent" === t || "none" === t || "auto" === t)
          return null;
        let o = /^rgba?\(([^)]+)\)$/.exec(t);
        if (o) {
          let e = o[1]
            .split(/[\s,/]+/)
            .filter(Boolean)
            .map((e) => Number.parseFloat(e));
          return e.length < 3 ||
            e.slice(0, 3).some((e) => !Number.isFinite(e)) ||
            (e.length > 3 && Number.isFinite(e[3]) && e[3] < 0.05)
            ? null
            : [e[0] / 255, e[1] / 255, e[2] / 255];
        }
        h.setRGB(-1, -1, -1);
        try {
          h.setStyle(t, s.jf0);
        } catch {
          return null;
        }
        return h.r < 0 ? null : [h.r, h.g, h.b];
      },
      m = (e) =>
        e <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4),
      v = ([e, t, o]) => {
        let a = m(e),
          l = m(t),
          n = m(o),
          r = Math.cbrt(0.4122214708 * a + 0.5363325363 * l + 0.0514459929 * n),
          i = Math.cbrt(0.2119034982 * a + 0.6806995451 * l + 0.1073969566 * n),
          s = Math.cbrt(0.0883024619 * a + 0.2817188376 * l + 0.6299787005 * n),
          u = 1.9779984951 * r - 2.428592205 * i + 0.4505937099 * s,
          c = 0.0259040371 * r + 0.7827717662 * i - 0.808675766 * s;
        return [
          0.2104542553 * r + 0.793617785 * i - 0.0040720468 * s,
          Math.hypot(u, c),
          Math.atan2(c, u),
        ];
      },
      g = ([e, t, o]) => {
        let a = t * Math.cos(o),
          l = t * Math.sin(o),
          n = Math.pow(e + 0.3963377774 * a + 0.2158037573 * l, 3),
          r = Math.pow(e - 0.1055613458 * a - 0.0638541728 * l, 3),
          i = Math.pow(e - 0.0894841775 * a - 1.291485548 * l, 3);
        return [
          4.0767416621 * n - 3.3077115913 * r + 0.2309699292 * i,
          -1.2684380046 * n + 2.6097574011 * r - 0.3413193965 * i,
          -0.0041960863 * n - 0.7034186147 * r + 1.707614701 * i,
        ];
      },
      x = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      y = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      w = `
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,
      b = `
precision highp float;

uniform vec2 uRes;
uniform float uDpr;
uniform float uTime;
uniform vec3 uHead;
uniform vec3 uBody;
uniform vec3 uTail;
uniform vec3 uHaze;
uniform float uRiseSpeed;
uniform float uRiseScale;
uniform float uRiseIntensity;
uniform float uFlowSpeed;
uniform float uFlowDensity;
uniform float uFlowIntensity;
uniform float uHorizonIntensity;
uniform float uHaloIntensity;
uniform float uHorizonHeight;
uniform float uCircleScale;
uniform float uScale;
uniform float uBrightness;
uniform float uColumn;
uniform float uWidth;
uniform float uLength;
uniform float uDepth;
uniform float uSpread;
uniform float uFade;
uniform float uHorizonIn;
uniform float uOpen;
uniform float uReveal;
uniform float uEncode;
uniform vec3 uDraft;
uniform float uLift[64];
uniform vec4 uVolleys[8];

in vec2 vUv;
out vec4 fragColor;

float hash2D(vec2 coord) {
  vec2 k = fract(coord * vec2(127.82, 311.45));
  k += dot(k, k + 71.83);
  return fract(k.x * k.y);
}

vec2 hash2D_vec2(vec2 coord) {
  float h1 = hash2D(coord);
  float h2 = hash2D(coord + h1);
  return vec2(h1, h2);
}

vec2 computeParticleOffset(vec2 cellIndex, float timeScale) {
  vec2 randVec = hash2D_vec2(cellIndex);
  return sin(randVec * uTime * timeScale) * 0.4;
}

float liftAt(float u) {
  float f = clamp(u * 64.0 - 0.5, 0.0, 63.0);
  int i = int(f);
  int j = min(i + 1, 63);
  return mix(uLift[i], uLift[j], f - float(i));
}

float draftAt(float u, float aspect) {
  float g = ((u - 0.5) * aspect - uDraft.x) / uDraft.z;
  return min(uDraft.y * exp(-g * g), 1.5);
}

vec3 lineTint(float along, float near) {
  vec3 tint = mix(uHead, uBody, smoothstep(0.0, 0.2, along));
  tint = mix(tint, uTail, smoothstep(0.22, 1.0, along));
  return mix(tint, uTail, (1.0 - near) * 0.55);
}

float generateAscendingGlow(vec2 coordinates, float gridDensity, float aspect) {
  vec2 scaledCoords = coordinates * gridDensity;
  float column = floor(scaledCoords.x);
  float total = 0.0;
  for (int i = -1; i <= 1; i++) {
    float cellX = column + float(i);
    float u = (cellX + 0.5) / gridDensity * uScale / aspect * 0.5 + 0.5;
    float lifted = scaledCoords.y - (uTime + liftAt(u)) * uRiseSpeed * gridDensity;
    float row = floor(lifted);
    float boost = 1.0 + 0.6 * draftAt(u, aspect);
    for (int j = -1; j <= 1; j++) {
      vec2 cellIndex = vec2(cellX, row + float(j));
      vec2 pick = hash2D_vec2(cellIndex + 17.3);
      if (pick.x > 0.38) continue;
      vec2 localPos = vec2(scaledCoords.x, lifted) - cellIndex - 0.5;
      vec2 particlePos = computeParticleOffset(cellIndex, 0.7);
      vec2 delta = particlePos - localPos;
      float spot = 1.0 / (1.0 + dot(delta, delta) * 22500.0);
      float window = 1.0 - smoothstep(0.25, 0.55, length(delta));
      float phase = particlePos.x * 10.0;
      float oscillation = sin(uTime * 1.6 + phase) * 0.22 + 0.85;
      total += spot * window * oscillation * boost * (0.3 + 1.2 * pick.y * pick.y);
    }
  }
  return total;
}

void main() {
  vec2 cssRes = uRes / uDpr;
  float aspectRatio = uRes.x / uRes.y;
  vec2 screenUV = gl_FragCoord.xy / uRes;
  vec2 centeredUV = (screenUV - 0.5) * 2.0;
  centeredUV.x *= aspectRatio;

  vec2 transformedUV = centeredUV / uScale;
  transformedUV.y -= uHorizonHeight / uScale;
  float rise = transformedUV.y + 0.1;

  float reveal = 1.0 - smoothstep(uReveal - 0.14, uReveal, rise);
  float ceiling = 1.0 - smoothstep(0.6, 0.98, screenUV.y);
  vec2 vignetteCoords = (screenUV - 0.5) * 2.0;
  float vignetteMask = smoothstep(-0.6 + uCircleScale, 0.2 + uCircleScale, 1.0 - length(vignetteCoords));

  vec2 haloOffset = transformedUV * vec2(1.0, 10.0) - vec2(0.0, -1.0);
  float halo = uHaloIntensity * 2.0 / pow(dot(haloOffset, haloOffset) + 0.0004, 1.2) / 15.0;
  float lineAmp = halo / (1.0 + halo / 3.0);
  float combAmp = halo / (1.0 + halo / 10.0);
  float shown = smoothstep(0.0, 0.01, rise + 0.01) * reveal * ceiling;

  vec2 scaledScreenUV = (screenUV - 0.5) / uScale + 0.5;
  vec2 pixelCoords = scaledScreenUV * cssRes;
  float workX = abs((scaledScreenUV.x - 0.5) * 2.0) * uFlowDensity;
  float workY = 1.0 - scaledScreenUV.y + workX;
  float weight = workY * workY * 2.4;
  float horizonScreen = 0.5 + 0.5 * (uHorizonHeight - 0.1 * uScale);
  float horizonPixel = ((horizonScreen - 0.5) / uScale + 0.5) * cssRes.y;
  float unit = 1.0 / (uDpr * uScale);
  float cssUnit = 1.0 / uScale;

  float sx = vignetteCoords.x / max(uOpen * uSpread, 0.05);
  float bell = exp(-2.4 * sx * sx) * (1.0 - smoothstep(0.4, 0.97, abs(sx)));
  float wide = exp(-1.2 * sx * sx) * (1.0 - smoothstep(0.35, 1.0, abs(sx)));
  float lateral = 1.0 - smoothstep(0.5, 1.05, abs(sx));
  vec3 light = vec3(0.0);
  float total = 0.0;

  float cssX = gl_FragCoord.x / uDpr;
  float column = floor(cssX / uColumn);
  float columnX = (column + 0.5) * uColumn;
  float columnU = columnX / cssRes.x;
  float seed = fract(tan(((columnU - 0.5) / uScale + 0.5) * cssRes.x) * 7.0);
  vec2 pick = hash2D_vec2(vec2(column, 5.31));
  vec2 pick2 = hash2D_vec2(vec2(column, 9.77));
  float near = mix(1.0, pick.x, uDepth);
  float draft = draftAt(columnU, aspectRatio);
  float animOffset = cssRes.y * (uTime + 60.0 + liftAt(columnU)) * uFlowSpeed;
  float head = mod(seed * animOffset, cssRes.x);
  float wrapFade = 1.0 - smoothstep(cssRes.x * 0.72, cssRes.x, head);
  float base = horizonPixel + (1.0 - near) * 0.05 * cssRes.y * cssUnit;
  float above = pixelCoords.y - base;
  float gap = head - pixelCoords.y;
  float widthDev = uWidth * mix(0.5, 1.0, near) * uDpr;
  float cover = clamp(0.5 + 0.5 * widthDev - abs(cssX - columnX) * uDpr, 0.0, min(widthDev, 1.0));
  float hero = pow(pick2.x, 5.0);
  float strength = (0.1 + 2.2 * hero) * (0.45 + 0.55 * seed) * mix(0.3, 1.0, near) * (1.0 + 0.8 * draft);
  float tailLen = (40.0 + 150.0 * pick2.y + 220.0 * hero) * uLength * mix(0.45, 1.0, near) * cssUnit;
  float along = gap / tailLen;
  float taper = pow(clamp(1.0 - along, 0.0, 1.0), 2.2);
  float headGlow = exp(-max(gap, 0.0) / (3.5 * cssUnit));
  float body = strength * weight * cover * wrapFade * smoothstep(-unit, unit, gap) * smoothstep(0.0, 2.0 * unit, above);
  float needle = body * taper * (0.75 * lineAmp + headGlow * (2.2 + 0.8 * min(lineAmp, 2.0))) * lateral;
  light += lineTint(clamp(along, 0.0, 1.0), near) * needle;
  total += needle;

  float lead = head - base;
  float combHeight = (4.0 + 12.0 * pick.y * pick.y) * cssUnit * (1.0 + 0.6 * draft);
  float comb = seed * weight * cover * wrapFade * smoothstep(0.0, 4.0 * unit, lead) / (1.0 + max(lead, 0.0) / (60.0 * cssUnit))
    * exp(-max(above, 0.0) / combHeight) * smoothstep(-unit, unit, above) * mix(0.4, 1.0, near) * combAmp * 0.55 * pow(wide, 1.5);
  light += mix(uBody, uHead, min(combAmp / 10.0, 1.0) * 0.6) * comb;
  total += comb;

  for (int n = 0; n < 8; n++) {
    vec4 volley = uVolleys[n];
    if (volley.z <= 0.0 || abs(cssX - volley.x) > 66.0 + uWidth) continue;
    for (int j = 0; j < 9; j++) {
      float lane = float(j);
      vec2 a = hash2D_vec2(vec2(volley.w, lane * 1.37 + 0.5));
      vec2 b = hash2D_vec2(vec2(lane * 2.11 + 0.25, volley.w));
      float t = volley.y - a.y * 0.2;
      if (t <= 0.0) continue;
      float x = volley.x + (a.x + b.x - 1.0) * 64.0;
      float widthV = uWidth * 1.1 * uDpr;
      float coverV = clamp(0.5 + 0.5 * widthV - abs(cssX - x) * uDpr, 0.0, min(widthV, 1.0));
      if (coverV <= 0.0) continue;
      float apex = (0.3 + 0.45 * b.y) * min(volley.z, 2.0) * cssRes.y * cssUnit;
      float gapV = horizonPixel + apex * (1.0 - exp(-t / (0.5 + 0.3 * a.x))) - pixelCoords.y;
      float tailV = (70.0 + 110.0 * b.x) * uLength * cssUnit;
      float alongV = gapV / tailV;
      float taperV = pow(clamp(1.0 - alongV, 0.0, 1.0), 2.2);
      float life = smoothstep(0.0, 0.06, t) * pow(1.0 - clamp(t / 3.0, 0.0, 1.0), 2.0);
      float valueV = min(volley.z, 2.0) * 1.3 * weight * coverV * life * smoothstep(-unit, unit, gapV)
        * smoothstep(0.0, 2.0 * unit, pixelCoords.y - horizonPixel) * taperV * (0.75 * lineAmp + exp(-max(gapV, 0.0) / (3.5 * cssUnit)) * (2.2 + 0.8 * min(lineAmp, 2.0)));
      light += lineTint(clamp(alongV, 0.0, 1.0), 1.0) * valueV;
      total += valueV;
    }
  }

  float sparks = uRiseIntensity > 0.0 ? generateAscendingGlow(transformedUV, uRiseScale, aspectRatio) * uRiseIntensity : 0.0;
  sparks *= (0.6 + min(lineAmp, 2.0)) * 1.6 * lateral;
  light += mix(uBody, uHead, 0.35) * sparks;
  total += sparks;

  light *= shown;
  total *= shown;

  float dyCss = (pixelCoords.y - horizonPixel) * uScale;
  float dyDev = dyCss * uDpr;
  float sigma = (0.4 + 0.55 * bell) * uDpr;
  float sigmaE = sqrt(sigma * sigma + 0.083);
  float coreLine = exp(-0.5 * dyDev * dyDev / (sigmaE * sigmaE)) * (sigma / sigmaE) * pow(bell, 1.3);
  float upward = max(dyCss, 0.0);
  float downward = max(-dyCss, 0.0);
  float reach = 1.0 - smoothstep(0.0, 0.55 * cssRes.y, abs(dyCss));
  float glowBand = exp(-(upward / (4.0 + 20.0 * bell) + downward / (2.5 + 9.0 * bell))) * pow(bell, 0.9) * reach;
  float hazeBand = exp(-(upward / (0.14 * cssRes.y) + downward / (0.035 * cssRes.y))) * wide * reach;
  float horizonLight = uHorizonIntensity * uHorizonIn * uFade;
  vec3 horizon = uHead * coreLine * 2.6 + mix(uTail, uBody, bell) * glowBand * 0.6 + uHaze * hazeBand * 0.12 * (0.4 + uDepth);
  light += horizon * horizonLight;
  total += (coreLine * 2.6 + glowBand * 0.6 + hazeBand * 0.12 * (0.4 + uDepth)) * horizonLight;

  float gain = vignetteMask * uBrightness * uFade;
  light *= gain;
  total *= gain;
  vec4 result = vec4(light, total);
  fragColor = uEncode > 0.5 ? result / (1.0 + result) : result;
}
`,
      C = `
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uThreshold;
uniform float uEncode;
in vec2 vUv;
out vec4 fragColor;
vec4 tap(vec2 d) {
  vec4 c = texture(uSource, vUv + d * uTexel);
  return uEncode > 0.5 ? c / max(1.0 - c, 0.002) : c;
}
void main() {
  vec4 color = tap(vec2(0.0)) * 0.125
    + (tap(vec2(-2.0, 2.0)) + tap(vec2(2.0, 2.0)) + tap(vec2(-2.0, -2.0)) + tap(vec2(2.0, -2.0))) * 0.03125
    + (tap(vec2(0.0, 2.0)) + tap(vec2(-2.0, 0.0)) + tap(vec2(2.0, 0.0)) + tap(vec2(0.0, -2.0))) * 0.0625
    + (tap(vec2(-1.0, 1.0)) + tap(vec2(1.0, 1.0)) + tap(vec2(-1.0, -1.0)) + tap(vec2(1.0, -1.0))) * 0.125;
  if (uThreshold > 0.0) {
    float peak = max(color.r, max(color.g, color.b));
    float knee = uThreshold * 0.8;
    float soft = clamp(peak - uThreshold + knee, 0.0, 2.0 * knee);
    soft = soft * soft / (4.0 * knee + 0.00001);
    color *= max(soft, peak - uThreshold) / max(peak, 0.00001);
  }
  fragColor = uEncode > 0.5 ? color / (1.0 + color) : color;
}
`,
      S = `
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uEncode;
in vec2 vUv;
out vec4 fragColor;
vec4 tap(vec2 d) {
  vec4 c = texture(uSource, vUv + d * uTexel);
  return uEncode > 0.5 ? c / max(1.0 - c, 0.002) : c;
}
void main() {
  vec4 color = tap(vec2(0.0)) * 4.0
    + (tap(vec2(-1.0, 0.0)) + tap(vec2(1.0, 0.0)) + tap(vec2(0.0, -1.0)) + tap(vec2(0.0, 1.0))) * 2.0
    + tap(vec2(-1.0, -1.0)) + tap(vec2(1.0, -1.0)) + tap(vec2(-1.0, 1.0)) + tap(vec2(1.0, 1.0));
  color /= 16.0;
  fragColor = uEncode > 0.5 ? color / (1.0 + color) : color;
}
`,
      k = `
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uBloomStrength;
uniform float uExposure;
uniform float uInk;
uniform float uEncode;
in vec2 vUv;
out vec4 fragColor;

vec4 decode(vec4 c) {
  return uEncode > 0.5 ? c / max(1.0 - c, 0.002) : c;
}

vec3 encode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

void main() {
  vec4 scene = decode(texture(uScene, vUv));
  vec4 bloom = decode(texture(uBloom, vUv));
  float dither = (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;
  if (uInk > 0.5) {
    vec4 field = scene + bloom * uBloomStrength * 0.45;
    float amount = field.a * field.a / (field.a + 0.06);
    vec3 ink = field.rgb / max(field.a, 0.00001);
    float cover = 1.0 - exp(-amount * 1.5 * uExposure);
    fragColor = vec4(encode(ink), clamp(cover + dither, 0.0, 1.0));
    return;
  }
  vec3 emission = scene.rgb + bloom.rgb * uBloomStrength;
  float peak = max(emission.r, max(emission.g, emission.b));
  emission *= peak / (peak + 0.05);
  vec3 color = encode(1.0 - exp(-emission * uExposure)) + dither;
  float alpha = clamp(max(color.r, max(color.g, color.b)), 0.0, 1.0);
  fragColor = vec4(clamp(color / max(alpha, 0.0001), 0.0, 1.0), alpha);
}
`,
      F = (0, l.forwardRef)(function (
        {
          colors: e,
          backgroundColor: t = "transparent",
          density: o = 1,
          speed: n = 0.6,
          lineWidth: r = 1,
          lineLength: i = 1,
          horizonHeight: h = -0.45,
          horizonGlow: m = 1,
          depth: F = 0.5,
          spread: z = 1,
          updraft: D = 1,
          particles: E = 1,
          interactive: R = !0,
          intro: L = !0,
          paused: I = !1,
          dpr: M = 2,
          className: T,
          style: H,
          color: U,
          horizonColor: V,
          haloColor: j,
          riseSpeed: B = 0.1,
          riseScale: P = 11.5,
          riseIntensity: A = 1,
          flowSpeed: W = 0.2,
          flowDensity: X = 4,
          flowIntensity: _ = 0.6,
          horizonIntensity: G = 0.85,
          haloIntensity: N = 7.5,
          circleScale: O,
          scale: q = 3.5,
          brightness: Y = 1,
        },
        $,
      ) {
        let Q = (0, l.useRef)(null),
          Z = (0, l.useRef)(null),
          K = (0, l.useSyncExternalStore)(x, y, () => !1),
          J = U ?? e?.[1] ?? "#FF9FFC",
          ee = {
            glowColor: V ?? e?.[0] ?? "#8B5CF6",
            lineColor: J,
            haloColor: j ?? e?.[1] ?? J,
            backgroundColor: t,
            column: Math.max(r, 1) / d(f(o, 1), 0.1, 10),
            speed: n,
            lineWidth: r,
            lineLength: i,
            horizonHeight: h,
            depth: F,
            spread: z,
            updraft: D,
            riseSpeed: B,
            riseScale: P,
            riseIntensity: A * E,
            flowSpeed: W,
            flowDensity: X,
            flowIntensity: _,
            horizonIntensity: G * m,
            haloIntensity: N,
            circleScale: O ?? 0.2 + (z - 1) * 0.6,
            scale: q,
            brightness: Y,
            interactive: R,
            intro: L,
            paused: I,
            dpr: M,
            reduced: K,
          },
          et = (0, l.useRef)(ee);
        ((0, l.useEffect)(() => {
          ((et.current = ee), Z.current?.sync());
        }),
          (0, l.useEffect)(() => {
            let e = Q.current;
            if (!e) return;
            let t = (function (e, t) {
              let o,
                a = e.ownerDocument,
                l = a.defaultView ?? window;
              try {
                o = new u.WebGLRenderer({
                  antialias: !1,
                  alpha: !0,
                  premultipliedAlpha: !1,
                  powerPreference: "high-performance",
                });
              } catch {
                return null;
              }
              (o.setClearColor(0, 0), (o.autoClear = !1));
              let n = o.domElement;
              (n.setAttribute("aria-hidden", "true"),
                (n.style.cssText =
                  "position:absolute;inset:0;width:100%;height:100%;display:block"),
                e.appendChild(n));
              let r =
                  o.extensions.has("EXT_color_buffer_float") ||
                  o.extensions.has("EXT_color_buffer_half_float"),
                i = +!r,
                c = new s.qUd(-1, 1, 1, -1, -1, 1),
                h = new s.LoY();
              h.setAttribute(
                "position",
                new s.qtW([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3),
              );
              let m = new s.Z58(),
                x = new s.eaF(h);
              ((x.frustumCulled = !1), m.add(x));
              let y = (e, t, o = !1) =>
                  new s.D$Q({
                    glslVersion: s.Wdf,
                    vertexShader: w,
                    fragmentShader: e,
                    uniforms: t,
                    blending: o ? s.EZo : s.XIg,
                    transparent: o,
                    depthTest: !1,
                    depthWrite: !1,
                  }),
                F = new Float32Array(64),
                z = Array.from({ length: 8 }, () => new s.IUQ()),
                D = {
                  uRes: { value: new s.I9Y(1, 1) },
                  uDpr: { value: 1 },
                  uTime: { value: 0 },
                  uHead: { value: new s.Pq0() },
                  uBody: { value: new s.Pq0() },
                  uTail: { value: new s.Pq0() },
                  uHaze: { value: new s.Pq0() },
                  uRiseSpeed: { value: 0.1 },
                  uRiseScale: { value: 11.5 },
                  uRiseIntensity: { value: 1 },
                  uFlowSpeed: { value: 0.2 },
                  uFlowDensity: { value: 4 },
                  uFlowIntensity: { value: 0.6 },
                  uHorizonIntensity: { value: 0.85 },
                  uHaloIntensity: { value: 7.5 },
                  uHorizonHeight: { value: -0.45 },
                  uCircleScale: { value: 0.2 },
                  uScale: { value: 3.5 },
                  uBrightness: { value: 1 },
                  uColumn: { value: 1 },
                  uWidth: { value: 1 },
                  uLength: { value: 1 },
                  uDepth: { value: 0.5 },
                  uSpread: { value: 1 },
                  uFade: { value: 1 },
                  uHorizonIn: { value: 1 },
                  uOpen: { value: 1 },
                  uReveal: { value: 9 },
                  uEncode: { value: i },
                  uDraft: { value: new s.Pq0(0, 0, 0.13) },
                  uLift: { value: F },
                  uVolleys: { value: z },
                },
                E = y(b, D),
                R = () =>
                  new s.nWS(1, 1, {
                    type: r ? s.ix0 : s.OUM,
                    format: s.GWd,
                    depthBuffer: !1,
                    stencilBuffer: !1,
                    minFilter: s.k6q,
                    magFilter: s.k6q,
                    generateMipmaps: !1,
                  }),
                L = R(),
                I = Array.from({ length: 5 }, R),
                M = y(C, {
                  uSource: { value: null },
                  uTexel: { value: new s.I9Y() },
                  uThreshold: { value: 0 },
                  uEncode: { value: i },
                }),
                T = y(
                  S,
                  {
                    uSource: { value: null },
                    uTexel: { value: new s.I9Y() },
                    uEncode: { value: i },
                  },
                  !i,
                ),
                H = y(k, {
                  uScene: { value: L.texture },
                  uBloom: { value: I[0].texture },
                  uBloomStrength: { value: 0.1 },
                  uExposure: { value: 1 },
                  uInk: { value: 0 },
                  uEncode: { value: i },
                }),
                U = 0,
                V = 0,
                j = 1,
                B = !1,
                P = !1,
                A = "",
                W = -1 / 0,
                X = 0,
                _ = 1,
                G = !1,
                N = 1,
                O = 9,
                q = -1,
                Y = 0,
                $ = 0,
                Q = 0,
                Z = 0,
                K = 0,
                J = 0,
                ee = 0,
                et = !1,
                eo = !1,
                ea = !1,
                el = null,
                en = [],
                er = () => {
                  let o,
                    a,
                    n = t.current,
                    r =
                      p(n.backgroundColor) ??
                      (() => {
                        let t = e.parentElement;
                        for (; t;) {
                          let e = l
                            .getComputedStyle(t)
                            .backgroundColor.match(/rgba?\(([^)]+)\)/);
                          if (e) {
                            let t = e[1]
                              .split(/[\s,/]+/)
                              .filter(Boolean)
                              .map((e) => Number.parseFloat(e));
                            if (t.length < 4 || t[3] > 0.05)
                              return [t[0] / 255, t[1] / 255, t[2] / 255];
                          }
                          t = t.parentElement;
                        }
                        return l.matchMedia("(prefers-color-scheme: dark)")
                          .matches
                          ? [0.04, 0.04, 0.04]
                          : [1, 1, 1];
                      })();
                  P = 0.2126 * r[0] + 0.7152 * r[1] + 0.0722 * r[2] > 0.55;
                  let i = [n.glowColor, n.lineColor, n.haloColor, P].join("|");
                  if (i === A) return;
                  A = i;
                  let s = p(n.glowColor) ?? [0.55, 0.36, 0.96],
                    u = p(n.lineColor) ?? [1, 0.62, 0.99],
                    c = p(n.haloColor) ?? u,
                    f = v([u[0] * c[0], u[1] * c[1], u[2] * c[2]]),
                    h = v(s);
                  (f[1] < 0.02 && (f[2] = h[2]), h[1] < 0.02 && (h[2] = f[2]));
                  let m = h[2] - f[2];
                  h[2] = f[2] + Math.atan2(Math.sin(m), Math.cos(m));
                  let x = f[1] > 0.02 || h[1] > 0.02,
                    y = [Math.min(f[0] + 0.16, 0.97), 0.45 * f[1], f[2]],
                    w = [f[0], 1.15 * f[1], f[2]],
                    b = [0.92 * h[0], 1.1 * h[1], h[2]],
                    C =
                      ((o = b),
                      (a = w),
                      [
                        o[0] + (a[0] - o[0]) * 0.3,
                        o[1] + (a[1] - o[1]) * 0.3,
                        o[2] + (a[2] - o[2]) * 0.3,
                      ]);
                  P &&
                    ((y = [
                      d(0.62 * f[0], 0.4, 0.52),
                      Math.max(1.3 * f[1], 0.16 * !!x),
                      f[2],
                    ]),
                    (w = [
                      d(0.7 * f[0], 0.44, 0.58),
                      Math.max(1.15 * f[1], 0.14 * !!x),
                      f[2],
                    ]),
                    (b = [
                      d(0.8 * h[0], 0.38, 0.52),
                      Math.max(1.15 * h[1], 0.13 * !!x),
                      h[2],
                    ]),
                    (C = [0.62, Math.max(0.9 * h[1], 0.1 * !!x), h[2]]));
                  let S = (e, t) => {
                    let o,
                      a = [
                        d(
                          (o = g(
                            ((e) => {
                              let t = [e[0], e[1], e[2]];
                              for (
                                let e = 0;
                                e < 24 &&
                                !g(t).every((e) => e >= -5e-4 && e <= 1.0005);
                                e++
                              )
                                t[1] *= 0.93;
                              return t;
                            })(t),
                          ))[0],
                          0,
                          1,
                        ),
                        d(o[1], 0, 1),
                        d(o[2], 0, 1),
                      ];
                    e.set(a[0], a[1], a[2]);
                  };
                  (S(D.uHead.value, y),
                    S(D.uBody.value, w),
                    S(D.uTail.value, b),
                    S(D.uHaze.value, C),
                    (H.uniforms.uInk.value = +!!P));
                },
                ei = () => {
                  let a = t.current,
                    n = Math.round(e.clientWidth),
                    r = Math.round(e.clientHeight);
                  if (n < 2 || r < 2) return ((B = !1), !1);
                  let i = Math.min(
                    l.devicePixelRatio || 1,
                    d(f(a.dpr, 2), 0.5, 3),
                  );
                  if (B && n === U && r === V && i === j) return !1;
                  ((B = !0),
                    (U = n),
                    (V = r),
                    (j = i),
                    o.setPixelRatio(j),
                    o.setSize(U, V, !1));
                  let s = Math.max(1, Math.round(U * j)),
                    u = Math.max(1, Math.round(V * j));
                  (L.setSize(s, u),
                    D.uRes.value.set(s, u),
                    (D.uDpr.value = u / V));
                  let c = s,
                    h = u;
                  for (let e of I)
                    ((c = Math.max(1, Math.round(c / 2))),
                      (h = Math.max(1, Math.round(h / 2))),
                      e.setSize(c, h));
                  return !0;
                },
                es = () => {
                  if (!B) return;
                  let e = t.current;
                  performance.now() - W > 1e3 &&
                    ((W = performance.now()), er());
                  let a = d(f(e.lineWidth, 1), 0.25, 6);
                  ((D.uTime.value = X),
                    (D.uRiseSpeed.value = d(f(e.riseSpeed, 0.1), 0, 2)),
                    (D.uRiseScale.value = d(f(e.riseScale, 11.5), 1, 60)),
                    (D.uRiseIntensity.value = d(f(e.riseIntensity, 1), 0, 4)),
                    (D.uFlowSpeed.value = d(f(e.flowSpeed, 0.2), 0, 4)),
                    (D.uFlowDensity.value = d(f(e.flowDensity, 4), 0, 20)),
                    (D.uFlowIntensity.value = d(f(e.flowIntensity, 0.6), 0, 4)),
                    (D.uHorizonIntensity.value = d(
                      f(e.horizonIntensity, 0.85),
                      0,
                      8,
                    )),
                    (D.uHaloIntensity.value = d(
                      f(e.haloIntensity, 7.5),
                      0,
                      40,
                    )),
                    (D.uHorizonHeight.value = d(
                      f(e.horizonHeight, -0.45),
                      -3,
                      3,
                    )),
                    (D.uCircleScale.value = d(
                      f(e.circleScale, 0.2),
                      -0.5,
                      1.5,
                    )),
                    (D.uScale.value = d(f(e.scale, 3.5), 0.3, 40)),
                    (D.uBrightness.value =
                      (d(f(e.brightness, 1), 0, 4) *
                        d(f(e.flowIntensity, 0.6), 0, 4)) /
                      0.6),
                    (D.uColumn.value = Math.max(
                      d(f(e.column, 1), 0.25, 40),
                      a,
                      1 / j,
                    )),
                    (D.uWidth.value = a),
                    (D.uLength.value = d(f(e.lineLength, 1), 0.1, 6)),
                    (D.uDepth.value = d(f(e.depth, 0.5), 0, 1)),
                    (D.uSpread.value = d(f(e.spread, 1), 0.1, 2)),
                    (D.uFade.value = _),
                    (D.uHorizonIn.value = N),
                    (D.uOpen.value = 0.1 + 0.9 * N),
                    (D.uReveal.value = O),
                    D.uDraft.value.set(Y, Z * d(f(e.updraft, 1), 0, 3), 0.13));
                  for (let e = 0; e < 8; e++) {
                    let t = en[e];
                    t
                      ? z[e].set(t.x, t.age, t.strength, t.seed)
                      : z[e].set(0, 0, 0, 0);
                  }
                  ((x.material = E),
                    o.setRenderTarget(L),
                    o.clear(),
                    o.render(m, c));
                  let l = L;
                  for (let e of ((x.material = M), I))
                    ((M.uniforms.uThreshold.value =
                      l === L ? (P ? 0.5 : 0.35) : 0),
                      (M.uniforms.uSource.value = l.texture),
                      M.uniforms.uTexel.value.set(1 / l.width, 1 / l.height),
                      o.setRenderTarget(e),
                      o.render(m, c),
                      (l = e));
                  x.material = T;
                  for (let e = I.length - 1; e > 0; e--)
                    ((T.uniforms.uSource.value = I[e].texture),
                      T.uniforms.uTexel.value.set(
                        1 / I[e].width,
                        1 / I[e].height,
                      ),
                      o.setRenderTarget(I[e - 1]),
                      i && o.clear(),
                      o.render(m, c));
                  ((H.uniforms.uBloomStrength.value =
                    ((P ? 0.35 : 0.85) / I.length) * 2),
                    (x.material = H),
                    o.setRenderTarget(null),
                    o.clear(),
                    o.render(m, c));
                },
                eu = () => {
                  (F.fill(0),
                    (en.length = 0),
                    (N = 0),
                    (O = 0),
                    (q = -2),
                    (_ = 1),
                    (G = !1));
                },
                ec = () => {
                  ((X = 9),
                    (N = 1),
                    (O = 9),
                    (q = -1),
                    (_ = 1),
                    (G = !1),
                    (en.length = 0),
                    (Z = 0),
                    (K = 0));
                },
                ed = () => {
                  eo || ea || !et || J || (J = requestAnimationFrame(ef));
                },
                ef = (e) => {
                  if (((J = 0), eo || ea)) return;
                  let o = t.current,
                    l =
                      ee && e - ee < 100
                        ? Math.min(Math.max((e - ee) / 1e3, 0), 0.05)
                        : 1 / 60;
                  ((ee = e), (o.reduced || (o.paused && -2 === q)) && ec());
                  let n = !o.reduced && !o.paused;
                  (n &&
                    ((e, t, o) => {
                      let a = d(f(o.speed, 1), 0, 4);
                      if (
                        (G && (_ = Math.max(0, _ - e / 0.4)) <= 0 && eu(),
                        -2 === q && (q = t),
                        q >= 0)
                      ) {
                        let e = (t - q) / 1e3;
                        ((N = 1 - Math.pow(1 - d(e / 1.6, 0, 1), 3)),
                          (O =
                            (1 - Math.pow(1 - d((e - 0.25) / 1.6, 0, 1), 3)) *
                            1.2),
                          e > 2.1 && ((q = -1), (N = 1), (O = 9)));
                      }
                      X += e * a;
                      let l = o.interactive ? K : 0;
                      ((Z += (l - Z) * (1 - Math.exp(-e / 0.45))),
                        ($ += (-56.25 * (Y - Q) - 15 * $) * e),
                        (Y += $ * e));
                      let n = d(f(o.updraft, 1), 0, 3) * Z;
                      if (n > 5e-4) {
                        let t = U / Math.max(V, 1),
                          o = e * a * n * 1.2;
                        for (let e = 0; e < 64; e++) {
                          let a = (((e + 0.5) / 64 - 0.5) * t - Y) / 0.13;
                          F[e] += o * Math.exp(-a * a);
                        }
                      }
                      for (let t = en.length - 1; t >= 0; t--)
                        ((en[t].age += e * a),
                          en[t].age > 3.4 && en.splice(t, 1));
                    })(l, e, o),
                    es(),
                    n && !a.hidden
                      ? (J = requestAnimationFrame(ef))
                      : (ee = 0));
                },
                eh = (t) => {
                  let o = e.getBoundingClientRect();
                  return o.width <= 0 || o.height <= 0
                    ? null
                    : {
                        fraction: (t - o.left) / o.width,
                        aspect: o.width / o.height,
                      };
                },
                ep = (e, t) => {
                  if (en.length >= 8) {
                    let e = 0;
                    for (let t = 1; t < en.length; t++)
                      en[t].age > en[e].age && (e = t);
                    if (en[e].age < 2.38) return;
                    en.splice(e, 1);
                  }
                  (en.push({
                    x: d(e, 0, 1) * U,
                    age: 0,
                    strength: t,
                    seed: 1 + Math.floor(900 * Math.random()),
                  }),
                    ed());
                },
                em = () => {
                  let e = t.current;
                  return e.interactive && !e.reduced && !e.paused;
                },
                ev = (e, t) => {
                  let o = (e - 0.5) * t;
                  (Z < 0.03 && ((Y = o), ($ = 0)), (Q = o), (K = 1), ed());
                },
                eg = (e) => {
                  if (
                    !e.isPrimary ||
                    !em() ||
                    ("mouse" === e.pointerType && 0 !== e.button)
                  )
                    return;
                  let t = eh(e.clientX);
                  if (t) {
                    if ("mouse" === e.pointerType)
                      return void ep(t.fraction, 1);
                    ((el = {
                      id: e.pointerId,
                      x: e.clientX,
                      y: e.clientY,
                      time: performance.now(),
                    }),
                      ev(t.fraction, t.aspect));
                  }
                },
                ex = (e) => {
                  if ("mouse" === e.pointerType) return;
                  K = 0;
                  let t = el;
                  if (
                    ((el = null),
                    !t ||
                      t.id !== e.pointerId ||
                      !em() ||
                      Math.hypot(e.clientX - t.x, e.clientY - t.y) > 12 ||
                      performance.now() - t.time > 500)
                  )
                    return;
                  let o = eh(e.clientX);
                  o && ep(o.fraction, 1);
                },
                ey = (e) => {
                  if (
                    !em() ||
                    ("mouse" !== e.pointerType &&
                      (!el || el.id !== e.pointerId))
                  )
                    return;
                  let t = eh(e.clientX);
                  t && ev(t.fraction, t.aspect);
                },
                ew = (e) => {
                  "mouse" === e.pointerType && ((K = 0), ed());
                },
                eb = () => {
                  ((el = null), (K = 0));
                },
                eC = () => {
                  ((ee = 0), ed());
                },
                eS = (e) => {
                  (e.preventDefault(),
                    (ea = !0),
                    cancelAnimationFrame(J),
                    (J = 0));
                },
                ek = () => {
                  ((ea = !1), (A = ""), ed());
                },
                eF = new ResizeObserver(() => {
                  ei() && (es(), ed());
                }),
                ez = new IntersectionObserver(
                  ([e]) => {
                    ((et = e.isIntersecting), (ee = 0), ed());
                  },
                  { rootMargin: "120px" },
                );
              return (
                e.addEventListener("pointerdown", eg),
                e.addEventListener("pointerup", ex),
                e.addEventListener("pointermove", ey),
                e.addEventListener("pointerleave", ew),
                e.addEventListener("pointercancel", eb),
                a.addEventListener("visibilitychange", eC),
                n.addEventListener("webglcontextlost", eS),
                n.addEventListener("webglcontextrestored", ek),
                eF.observe(e),
                ez.observe(e),
                t.current.reduced ? ec() : t.current.intro && eu(),
                ei(),
                er(),
                {
                  sync: () => {
                    ((W = -1 / 0), ei(), (ee = 0), !J && et && (es(), ed()));
                  },
                  launch: (e, o) => {
                    let a = t.current;
                    a.reduced ||
                      a.paused ||
                      ep(
                        void 0 === e
                          ? 0.2 + 0.6 * Math.random()
                          : d(f(e, 0.5), 0, 1),
                        d(f(o ?? 1, 1), 0.1, 2),
                      );
                  },
                  replay: () => {
                    t.current.reduced || ((G = !0), (ee = 0), ed());
                  },
                  destroy: () => {
                    for (let t of ((eo = !0),
                    cancelAnimationFrame(J),
                    eF.disconnect(),
                    ez.disconnect(),
                    e.removeEventListener("pointerdown", eg),
                    e.removeEventListener("pointerup", ex),
                    e.removeEventListener("pointermove", ey),
                    e.removeEventListener("pointerleave", ew),
                    e.removeEventListener("pointercancel", eb),
                    a.removeEventListener("visibilitychange", eC),
                    n.removeEventListener("webglcontextlost", eS),
                    n.removeEventListener("webglcontextrestored", ek),
                    h.dispose(),
                    E.dispose(),
                    M.dispose(),
                    T.dispose(),
                    H.dispose(),
                    L.dispose(),
                    I))
                      t.dispose();
                    (o.dispose(), n.remove());
                  },
                }
              );
            })(e, et);
            return (
              (Z.current = t),
              () => {
                (t?.destroy(), (Z.current = null));
              }
            );
          }, []),
          (0, l.useImperativeHandle)(
            $,
            () => ({
              launch: (e, t) => Z.current?.launch(e, t),
              replay: () => Z.current?.replay(),
            }),
            [],
          ));
        let eo = t.trim().toLowerCase();
        return (0, a.jsx)("div", {
          ref: Q,
          className: (0, c.cn)("absolute inset-0 overflow-hidden", T),
          style: {
            backgroundColor:
              "" === eo || "transparent" === eo || "none" === eo ? void 0 : t,
            ...H,
          },
        });
      });
    F.displayName = "RisingLines";
    let z = {
        colors: ["#8B5CF6", "#FF9FFC"],
        density: 1,
        speed: 0.6,
        lineWidth: 1,
        lineLength: 1,
        horizonHeight: -0.45,
        horizonGlow: 1,
        depth: 0.5,
        spread: 1,
        updraft: 1,
        particles: 1,
      },
      D = {
        classic: z,
        magenta: {
          ...z,
          colors: ["#6B288A", "#FF9FFC"],
          lineLength: 0.8,
          horizonGlow: 1.15,
        },
        lavender: {
          ...z,
          colors: ["#5227FF", "#B19EEF"],
          speed: 0.45,
          lineLength: 1.35,
          particles: 0.8,
        },
        ember: {
          ...z,
          colors: ["#B91C1C", "#FF7A27"],
          speed: 0.7,
          horizonGlow: 1.25,
          depth: 0.6,
        },
        ice: {
          ...z,
          colors: ["#2563EB", "#A5F3FC"],
          speed: 0.45,
          lineLength: 1.5,
          particles: 0.6,
        },
        rain: {
          ...z,
          colors: ["#4F46E5", "#C7D2FE"],
          density: 1.5,
          speed: 1.1,
          lineWidth: 0.75,
          lineLength: 0.7,
          depth: 0.7,
          particles: 0.4,
        },
        dusk: {
          ...z,
          horizonHeight: -0.05,
          horizonGlow: 1.3,
          depth: 0.8,
          spread: 1.2,
        },
        sparks: {
          ...z,
          colors: ["#5227FF", "#FF9FFC"],
          density: 0.6,
          lineLength: 0.7,
          particles: 2,
        },
      },
      E = [
        { label: "Classic", value: "classic" },
        { label: "Magenta", value: "magenta" },
        { label: "Lavender", value: "lavender" },
        { label: "Ember", value: "ember" },
        { label: "Ice", value: "ice" },
        { label: "Rain", value: "rain" },
        { label: "Dusk", value: "dusk" },
        { label: "Sparks", value: "sparks" },
      ],
      R = [
        {
          name: "colors",
          type: "[string, string]",
          default: '["#8B5CF6", "#FF9FFC"]',
          description:
            "Tail and haze colour, then line colour. Each line runs from a white-hot head through the line colour to the tail colour in OKLCh.",
        },
        {
          name: "backgroundColor",
          type: "string",
          default: '"transparent"',
          description:
            "Fill behind the effect. Transparent shows the page. On a light background the lines are drawn as ink.",
        },
        {
          name: "density",
          type: "number",
          default: "1",
          description: "How many lines rise from the horizon.",
        },
        {
          name: "speed",
          type: "number",
          default: "0.6",
          description: "Speed of the lines and sparks.",
        },
        {
          name: "lineWidth",
          type: "number",
          default: "1",
          description: "Line width in CSS pixels.",
        },
        {
          name: "lineLength",
          type: "number",
          default: "1",
          description: "Length of the tapering tail behind each head.",
        },
        {
          name: "horizonHeight",
          type: "number",
          default: "-0.45",
          description:
            "Vertical position of the horizon. -0.65 sits on the bottom edge, higher values move it up.",
        },
        {
          name: "horizonGlow",
          type: "number",
          default: "1",
          description: "Brightness of the horizon line and its glow.",
        },
        {
          name: "depth",
          type: "number",
          default: "0.5",
          description:
            "Perspective. Distant lines start slightly above the horizon, thinner and dimmer, inside a soft haze.",
        },
        {
          name: "spread",
          type: "number",
          default: "1",
          description: "Width of the visible field and of the horizon glow.",
        },
        {
          name: "updraft",
          type: "number",
          default: "1",
          description:
            "Strength of the hover updraft. Lines and sparks under the pointer rise faster and denser.",
        },
        {
          name: "particles",
          type: "number",
          default: "1",
          description: "Brightness of the fine rising sparks. 0 hides them.",
        },
        {
          name: "interactive",
          type: "boolean",
          default: "true",
          description:
            "Hover to lift a column of lines. Click to launch a volley from the horizon. Volleys stack.",
        },
        {
          name: "intro",
          type: "boolean",
          default: "true",
          description:
            "The horizon opens from the centre and the lines rise into view on mount.",
        },
        {
          name: "paused",
          type: "boolean",
          default: "false",
          description:
            "Stops the motion. Reduced-motion users get a still frame.",
        },
        {
          name: "dpr",
          type: "number",
          default: "2",
          description: "Maximum device pixel ratio for the canvas.",
        },
        {
          name: "ref",
          type: "{ launch, replay }",
          default: "-",
          description:
            "launch(x?, strength?) fires a volley at a 0 to 1 position. replay() restarts the intro.",
        },
        {
          name: "className",
          type: "string",
          default: "-",
          description:
            "Classes for the root, which fills its positioned parent.",
        },
        {
          name: "style",
          type: "CSSProperties",
          default: "-",
          description: "Inline styles for the root element.",
        },
      ],
      L = () => {
        let [e, t] = (0, r.I)(),
          o = (0, i.Y)(),
          [s, u] = (0, l.useState)("classic"),
          [c, d] = (0, l.useState)(D.classic),
          [f, h] = (0, l.useState)(null),
          [p, m] = (0, l.useState)(!0),
          [v, g] = (0, l.useState)(!0),
          [x, y] = (0, l.useState)(!1),
          w = f ?? ("dark" === o ? "#0a0a0a" : "#ffffff"),
          b = (e) => (t) => d((o) => ({ ...o, [e]: t })),
          C = (e) => (t) =>
            d((o) => {
              let a = [o.colors[0], o.colors[1]];
              return ((a[e] = t), { ...o, colors: a });
            });
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
                        className:
                          "relative w-full h-full rounded-lg overflow-hidden",
                        children: (0, a.jsx)(
                          F,
                          {
                            ...c,
                            backgroundColor: w,
                            interactive: p,
                            intro: v,
                            paused: x,
                          },
                          `${e}-${v}`,
                        ),
                      }),
                    }),
                    (0, a.jsxs)(n.IH, {
                      children: [
                        (0, a.jsx)(n.bg, {
                          title: "Preset",
                          value: s,
                          options: E,
                          onChange: (e) => {
                            (u(e), d(D[e] ?? D.classic));
                          },
                        }),
                        (0, a.jsx)(n.W7, {
                          title: "Tail Color",
                          value: c.colors[0],
                          onChange: C(0),
                        }),
                        (0, a.jsx)(n.W7, {
                          title: "Line Color",
                          value: c.colors[1],
                          onChange: C(1),
                        }),
                        (0, a.jsx)(n.W7, {
                          title: "Background",
                          value: w,
                          onChange: h,
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Density",
                          min: 0.3,
                          max: 2,
                          step: 0.01,
                          value: c.density,
                          onChange: b("density"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Speed",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: c.speed,
                          onChange: b("speed"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Line Width",
                          min: 0.5,
                          max: 3,
                          step: 0.05,
                          value: c.lineWidth,
                          valueUnit: "px",
                          onChange: b("lineWidth"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Line Length",
                          min: 0.3,
                          max: 3,
                          step: 0.01,
                          value: c.lineLength,
                          onChange: b("lineLength"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Horizon Height",
                          min: -1,
                          max: 1,
                          step: 0.01,
                          value: c.horizonHeight,
                          onChange: b("horizonHeight"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Horizon Glow",
                          min: 0,
                          max: 3,
                          step: 0.01,
                          value: c.horizonGlow,
                          onChange: b("horizonGlow"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Depth",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: c.depth,
                          onChange: b("depth"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Spread",
                          min: 0.4,
                          max: 1.6,
                          step: 0.01,
                          value: c.spread,
                          onChange: b("spread"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Updraft",
                          min: 0,
                          max: 3,
                          step: 0.01,
                          value: c.updraft,
                          onChange: b("updraft"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Particles",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: c.particles,
                          onChange: b("particles"),
                        }),
                        (0, a.jsx)(n.tl, {
                          title: "Interactive",
                          checked: p,
                          onChange: m,
                        }),
                        (0, a.jsx)(n.tl, {
                          title: "Intro",
                          checked: v,
                          onChange: g,
                        }),
                        (0, a.jsx)(n.tl, {
                          title: "Paused",
                          checked: x,
                          onChange: y,
                        }),
                      ],
                    }),
                    (0, a.jsx)(n.Ub, { data: R }),
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
