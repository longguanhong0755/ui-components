/* ReactBits Pro public preview module 10772 for frame-border.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/10772.d82c1854dfe03c72.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  10772: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => R }));
    var l = a(95155),
      n = a(12115),
      i = a(56388),
      r = a(86049),
      o = a(90761),
      s = a(2253),
      u = a(12246),
      d = a(90650);
    let c = (e, t, a) => Math.min(a, Math.max(t, e)),
      h = (e, t) => ("number" == typeof e && Number.isFinite(e) ? e : t),
      f = (e, t, a) => {
        let l = c((a - e) / (t - e), 0, 1);
        return l * l * (3 - 2 * l);
      },
      p = (e) => (e < 0.5 ? 4 * e * e * e : 1 - Math.pow(-2 * e + 2, 3) / 2),
      m = (e) => ((e % 1) + 1) % 1,
      v = new s.Q1f(),
      g = (e) => {
        let t = "string" == typeof e ? e.trim().toLowerCase() : "";
        return !t || "transparent" === t || "none" === t || "auto" === t;
      },
      x = (e) =>
        e <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4),
      w = (e) => {
        let t = c(e, 0, 1);
        return t <= 0.0031308
          ? 12.92 * t
          : 1.055 * Math.pow(t, 1 / 2.4) - 0.055;
      },
      y = ([e, t, a]) => {
        let l = Math.pow(e + 0.3963377774 * t + 0.2158037573 * a, 3),
          n = Math.pow(e - 0.1055613458 * t - 0.0638541728 * a, 3),
          i = Math.pow(e - 0.0894841775 * t - 1.291485548 * a, 3);
        return [
          w(4.0767416621 * l - 3.3077115913 * n + 0.2309699292 * i),
          w(-1.2684380046 * l + 2.6097574011 * n - 0.3413193965 * i),
          w(-0.0041960863 * l - 0.7034186147 * n + 1.707614701 * i),
        ];
      },
      b = (e) => {
        if ("string" != typeof e || g(e)) return null;
        let t = e.trim().toLowerCase(),
          a = /^([a-z]+)\(([^)]*)\)$/.exec(t);
        if (a) {
          let e = a[2].split(/[\s,/]+/).filter(Boolean),
            t = (t, a) => {
              let l = e[t] ?? "0",
                n = Number.parseFloat(l);
              return Number.isFinite(n)
                ? l.endsWith("%")
                  ? (n / 100) * a
                  : n
                : 0;
            },
            l = "color" === a[1] ? 4 : 3;
          if (e.length > l && 0.05 > t(l, 1)) return null;
          if ("rgb" === a[1] || "rgba" === a[1])
            return [
              c(t(0, 255) / 255, 0, 1),
              c(t(1, 255) / 255, 0, 1),
              c(t(2, 255) / 255, 0, 1),
            ];
          if ("oklch" === a[1]) {
            let e = (t(2, 360) * Math.PI) / 180,
              a = t(1, 0.4);
            return y([t(0, 1), a * Math.cos(e), a * Math.sin(e)]);
          }
          if ("oklab" === a[1]) return y([t(0, 1), t(1, 0.4), t(2, 0.4)]);
          if ("color" === a[1] && "srgb" === e[0])
            return [c(t(1, 1), 0, 1), c(t(2, 1), 0, 1), c(t(3, 1), 0, 1)];
        }
        try {
          (v.setRGB(-1, -1, -1, s.jf0), v.setStyle(t, s.jf0));
        } catch {
          return null;
        }
        return v.r < 0 ? null : [v.r, v.g, v.b];
      },
      C = ([e, t, a]) => {
        let l = x(e),
          n = x(t),
          i = x(a),
          r = Math.cbrt(0.4122214708 * l + 0.5363325363 * n + 0.0514459929 * i),
          o = Math.cbrt(0.2119034982 * l + 0.6806995451 * n + 0.1073969566 * i),
          s = Math.cbrt(0.0883024619 * l + 0.2817188376 * n + 0.6299787005 * i);
        return [
          0.2104542553 * r + 0.793617785 * o - 0.0040720468 * s,
          1.9779984951 * r - 2.428592205 * o + 0.4505937099 * s,
          0.0259040371 * r + 0.7827717662 * o - 0.808675766 * s,
        ];
      },
      M = ([e, t, a]) => [e, Math.hypot(t, a), Math.atan2(a, t)],
      S = ([e, t, a]) => 0.2126 * e + 0.7152 * t + 0.0722 * a,
      L = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      F = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      P = `
in vec3 position;
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,
      I = `
precision highp float;
precision highp int;

uniform vec2 uSize;
uniform float uDpr;
uniform vec2 uHalf;
uniform float uRadius;
uniform vec4 uPath;
uniform float uLine;
uniform float uOuter;
uniform float uGlow;
uniform float uReach;
uniform float uNoise;
uniform float uCells;
uniform float uGrains;
uniform float uOctaves;
uniform vec4 uDrift;
uniform float uPhase;
uniform vec3 uLchA;
uniform vec3 uLchB;
uniform vec3 uBack;
uniform float uInk;
uniform float uExposure;
uniform float uIntensity;
uniform float uOpacity;
uniform float uGrain;
uniform float uSeed;
uniform float uLift;
uniform vec4 uIntro;
uniform vec4 uPulses[8];
uniform vec2 uIdle[6];
out vec4 fragColor;

const float TAU = 6.28318530718;
const float QUARTER = 1.57079632679;

float lattice(ivec2 c) {
  uvec2 q = uvec2(c) * uvec2(1597334673u, 3812015801u);
  uint n = (q.x ^ q.y) * 1597334673u;
  return float(n) * (TAU / 4294967296.0);
}

float ribbon(vec2 p, int period) {
  vec2 i = floor(p);
  vec2 f = p - i;
  vec2 w = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  ivec2 c = ivec2(i);
  int x0 = (c.x + period * 64) % period;
  int x1 = (x0 + 1) % period;
  float a = lattice(ivec2(x0, c.y));
  float b = lattice(ivec2(x1, c.y));
  float e = lattice(ivec2(x0, c.y + 1));
  float g = lattice(ivec2(x1, c.y + 1));
  float va = dot(vec2(cos(a), sin(a)), f);
  float vb = dot(vec2(cos(b), sin(b)), f - vec2(1.0, 0.0));
  float ve = dot(vec2(cos(e), sin(e)), f - vec2(0.0, 1.0));
  float vg = dot(vec2(cos(g), sin(g)), f - vec2(1.0, 1.0));
  return mix(mix(va, vb, w.x), mix(ve, vg, w.x), w.y) * 1.414;
}

float roundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float along(vec2 p) {
  vec2 h = uPath.xy;
  float r = uPath.z;
  float arc = QUARTER * r;
  vec2 q = abs(p) - h;
  if (q.x > 0.0 && q.y > 0.0) {
    float a = atan(q.y, q.x);
    if (p.x >= 0.0 && p.y >= 0.0) return 2.0 * h.x + (QUARTER - a) * r;
    if (p.x >= 0.0) return 2.0 * h.x + arc + 2.0 * h.y + a * r;
    if (p.y < 0.0) return 4.0 * h.x + 2.0 * arc + 2.0 * h.y + (QUARTER - a) * r;
    return 4.0 * h.x + 3.0 * arc + 4.0 * h.y + a * r;
  }
  if (q.y >= q.x) return p.y >= 0.0 ? p.x + h.x : 3.0 * h.x + 2.0 * arc + 2.0 * h.y - p.x;
  return p.x >= 0.0 ? 2.0 * h.x + arc + h.y - p.y : 4.0 * h.x + 3.0 * arc + 3.0 * h.y + p.y;
}

float profile(float x, float reach) {
  float t = max(x, 0.0);
  float shape = 0.4 * exp(-t / (0.07 * reach)) + 0.6 * exp(-t / (0.28 * reach));
  return shape * (1.0 - smoothstep(0.35 * reach, reach, t));
}

vec3 fromLch(vec3 lch) {
  vec3 lab = vec3(lch.x, lch.y * cos(lch.z), lch.y * sin(lch.z));
  vec3 lms = mat3(1.0, 1.0, 1.0, 0.3963377774, -0.1055613458, -0.0894841775, 0.2158037573, -0.0638541728, -1.291485548) * lab;
  lms = lms * lms * lms;
  return max(mat3(4.0767416621, -1.2684380046, -0.0041960863, -3.3077115913, 2.6097574011, -0.7034186147, 0.2309699292, -0.3413193965, 1.707614701) * lms, 0.0);
}

vec3 encode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

void main() {
  vec2 p = gl_FragCoord.xy / uDpr - 0.5 * uSize;
  float fw = 1.0 / uDpr;
  float d = roundBox(p, uHalf, uRadius);
  float hw = 0.5 * uLine;
  if (-d - hw > uReach * 1.75 + 2.0) {
    fragColor = vec4(0.0);
    return;
  }

  float perimeter = uPath.w;
  float halfP = 0.5 * perimeter;
  float s = along(p);
  int cells = int(uCells + 0.5);
  float n = ribbon(vec2((s - uDrift.x) / perimeter * uCells, uDrift.z), cells);
  float weight = 1.0;
  if (uOctaves > 1.5) {
    float u2 = (s - uDrift.y) / perimeter * uCells * 2.0 + 3.0;
    n += 0.45 * ribbon(vec2(u2, uDrift.z * 1.7 + 11.0), cells * 2);
    weight += 0.45;
  }
  if (uOctaves > 2.5) {
    float u3 = (s - uDrift.y) / perimeter * uCells * 4.0 + 7.0;
    n += 0.2 * ribbon(vec2(u3, uDrift.z * 2.3 + 23.0), cells * 4);
    weight += 0.2;
  }
  n /= weight;
  float v = smoothstep(-0.55, 0.55, n) * 2.0 - 1.0;

  int grains = int(uGrains + 0.5);
  float depth = max(-roundBox(p, uHalf, uPath.z), 0.0);
  vec2 tp = vec2(s - uDrift.w, depth * 2.4) / perimeter * uGrains + vec2(0.0, uDrift.z * 0.8);
  float warp = ribbon(tp + vec2(0.0, 17.0), grains);
  float tex = ribbon(tp + vec2(0.6 * warp, 0.35 * warp), grains);

  float startDist = abs(mod(s - uIntro.x * perimeter + halfP, perimeter) - halfP);
  float drawn = 1.0 - smoothstep(uIntro.y - 4.0, uIntro.y + 4.0, startDist);
  float reveal = 1.0 - smoothstep(uIntro.z - 0.6 * halfP, uIntro.z, startDist);

  float swell = 0.0;
  float idleW = 0.022 * perimeter;
  for (int i = 0; i < 6; i++) {
    vec2 bump = uIdle[i];
    if (bump.y <= 0.0) continue;
    float dist = abs(mod(s - bump.x * perimeter + halfP, perimeter) - halfP);
    swell += bump.y * exp(-dist * dist / (2.0 * idleW * idleW)) * (1.0 - smoothstep(2.0 * idleW, 3.0 * idleW, dist));
  }
  swell = min(swell, 1.5) * reveal;

  float inner = max(-d - hw, 0.0);
  float lineAmp = 1.0 + uNoise * 0.4 * v;
  float glowAmp = max(1.0 + uNoise * v, 0.0);
  float texture = max(1.0 + uNoise * tex * (0.45 + 0.55 * smoothstep(0.0, 0.4 * uReach, inner)), 0.0);
  float reach = uReach * (1.0 + uNoise * 0.25 * v) * (1.0 + uNoise * 0.15 * tex) * (1.0 + 0.2 * min(swell, 1.0));

  float width = max(uLine, fw);
  float line = clamp((0.5 * width - abs(d)) / fw + 0.5, 0.0, 1.0) * (uLine / width);
  float off = max(abs(d) - hw, 0.0);
  float spread = 1.5 + 1.2 * uLine;
  float halo = exp(-off / spread) * (1.0 - smoothstep(4.0 * spread, 10.0 * spread, off)) * min(uLine, 1.0);
  if (d > 0.0) halo *= 1.0 - smoothstep(0.0, max(uOuter, 0.001), off);

  vec2 edge = uHalf - hw - abs(p);
  float fx = profile(edge.x, reach);
  float fy = profile(edge.y, reach);
  float body = fx + fy - fx * fy;
  float tx = profile(edge.x, reach * 0.32);
  float ty = profile(edge.y, reach * 0.32);
  float tight = tx + ty - tx * ty;
  float inside = clamp(-d / fw + 0.5, 0.0, 1.0);

  float headW = 14.0 + 2.0 * uLine;
  float tailL = 0.16 * halfP;
  float meetW = 0.06 * perimeter;
  float pulseLine = 0.0;
  float pulseGlow = 0.0;
  for (int i = 0; i < 8; i++) {
    vec4 pulse = uPulses[i];
    if (pulse.z <= 0.0 && pulse.w <= 0.0) continue;
    float dist = abs(mod(s - pulse.x * perimeter + halfP, perimeter) - halfP);
    float delta = dist - pulse.y * halfP;
    float head = exp(-delta * delta / (headW * headW));
    float wide = exp(-delta * delta / (25.0 * headW * headW));
    float tail = exp(min(delta, 0.0) / tailL) * (1.0 - smoothstep(-headW, headW, delta));
    pulseLine += pulse.z * (head + 0.55 * tail);
    pulseGlow += pulse.z * (0.9 * wide + 0.35 * tail);
    float meet = halfP - dist;
    pulseGlow += pulse.w * exp(-meet * meet / (meetW * meetW));
  }
  float introDelta = startDist - uIntro.y;
  pulseLine += uIntro.w * exp(-introDelta * introDelta / (headW * headW));
  pulseGlow += uIntro.w * 0.7 * exp(-introDelta * introDelta / (25.0 * headW * headW));

  float hue = 0.5 + 0.5 * cos(TAU * s / perimeter - uPhase + 0.9 * uNoise * v);
  vec3 lch = mix(uLchA, uLchB, hue);
  float lift = 1.0 + 0.12 * uLift;

  float lineLight = line * ((1.25 * lineAmp + 0.9 * swell) * drawn + 2.2 * pulseLine);
  float haloLight = halo * ((0.25 * lineAmp + 0.3 * swell) * drawn + 0.7 * pulseLine);
  float glowLight = inside * (body * uGlow * (glowAmp + 0.8 * swell) * texture * reveal + tight * pulseGlow);

  vec3 color;
  float alpha;
  if (uInk > 0.5) {
    vec3 ink = encode(fromLch(vec3(clamp(lch.x * 0.8, 0.36, 0.6), lch.y * 1.12 + 0.02, lch.z)));
    vec3 tint = encode(fromLch(vec3(clamp(lch.x * 0.92 + 0.06, 0.55, 0.78), lch.y * 1.05 + 0.01, lch.z)));
    float aLine = clamp(line * ((0.55 + 0.35 * lineAmp + 0.35 * swell) * drawn + 0.9 * pulseLine) * min(uIntensity, 1.5), 0.0, 1.0);
    float soft = (glowLight + haloLight * 0.6) * uIntensity * lift;
    float aGlow = clamp(pow(soft, 1.3) * 0.6, 0.0, 0.7);
    alpha = aLine + aGlow * (1.0 - aLine);
    color = alpha > 0.0001 ? (ink * aLine + tint * aGlow * (1.0 - aLine)) / alpha : tint;
  } else {
    vec3 tone = encode(fromLch(lch));
    tone /= max(max(tone.r, max(tone.g, tone.b)), 0.45);
    vec3 deep = encode(fromLch(vec3(lch.x * 0.86, lch.y * 1.3 + 0.02, lch.z)));
    deep /= max(max(deep.r, max(deep.g, deep.b)), 0.45);
    vec3 emission = (tone * (lineLight + haloLight) + deep * glowLight) * uIntensity * lift;
    vec3 shown = 1.0 - exp(-emission * uExposure);
    alpha = max(shown.r, max(shown.g, shown.b));
    color = alpha > 0.0001 ? shown * (1.0 - uBack) / alpha + uBack : uBack;
  }

  if (alpha > 0.002) {
    float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    color += (ign - 0.5) / 255.0;
    alpha += (fract(ign + 0.618034) - 0.5) / 255.0;
    if (uGrain > 0.0) {
      float g = lattice(ivec2(gl_FragCoord.xy) + ivec2(int(uSeed), 17)) / TAU;
      color += (g - 0.5) * uGrain * 0.12;
    }
  } else {
    alpha = 0.0;
  }
  fragColor = vec4(clamp(color, 0.0, 1.0), clamp(alpha, 0.0, 1.0) * uOpacity);
}
`,
      W = (0, n.forwardRef)(function (
        {
          colors: e,
          backgroundColor: t = "transparent",
          radius: a = 16,
          lineWidth: i = 1,
          inset: r = 0,
          glow: o = 0.5,
          glowWidth: v,
          noise: x,
          noiseScale: w = 3,
          flowSpeed: y = 1,
          pulseSpeed: W = 1,
          idlePulses: E = 3,
          idleSpeed: j = 1,
          idleStrength: D = 1,
          intensity: k = 1,
          opacity: R = 1,
          grain: A = 0,
          interactive: N = !0,
          intro: G = !0,
          paused: z = !1,
          dpr: B = 2,
          width: T = "100%",
          height: q = "100%",
          className: O,
          style: U,
          children: H,
          color: Y,
          speed: Q,
          borderWidth: X,
          falloff: _,
          noiseStrength: V,
          noiseOctaves: $,
          gamma: K,
        },
        Z,
      ) {
        let J = (0, n.useRef)(null),
          ee = (0, n.useRef)(null),
          et = (0, n.useRef)(null),
          ea = {
            colors: e,
            color: Y,
            backgroundColor: t,
            radius: a,
            lineWidth: i,
            inset: r,
            glow: o,
            glowWidth: v,
            borderWidth: X,
            falloff: _,
            noise: x,
            noiseStrength: V,
            noiseScale: w,
            noiseOctaves: $,
            flowSpeed: y,
            speed: Q,
            pulseSpeed: W,
            idlePulses: E,
            idleSpeed: j,
            idleStrength: D,
            intensity: k,
            opacity: R,
            gamma: K,
            grain: A,
            interactive: N,
            intro: G,
            paused: z,
            dpr: B,
            reduced: (0, n.useSyncExternalStore)(L, F, () => !1),
          },
          el = (0, n.useRef)(ea);
        ((0, n.useEffect)(() => {
          ((el.current = ea), et.current?.sync());
        }),
          (0, n.useEffect)(() => {
            let e = J.current,
              t = ee.current;
            if (!e || !t) return;
            let a = (function (e, t, a) {
              let l,
                n = e.ownerDocument,
                i = n.defaultView ?? window,
                r = n.createElement("canvas");
              (r.setAttribute("aria-hidden", "true"),
                (r.style.cssText =
                  "position:absolute;inset:0;width:100%;height:100%;display:block"));
              try {
                l = new u.WebGLRenderer({
                  canvas: r,
                  alpha: !0,
                  premultipliedAlpha: !1,
                  antialias: !1,
                  powerPreference: "high-performance",
                });
              } catch {
                return null;
              }
              (l.setClearColor(0, 0), t.appendChild(r));
              let o = Array.from({ length: 8 }, () => new s.IUQ(0, 0, 0, 0)),
                d = Array.from({ length: 6 }, () => new s.I9Y(0, 0)),
                v = {
                  uSize: { value: new s.I9Y(1, 1) },
                  uDpr: { value: 1 },
                  uHalf: { value: new s.I9Y(1, 1) },
                  uRadius: { value: 0 },
                  uPath: { value: new s.IUQ(0, 0, 0, 1) },
                  uLine: { value: 1 },
                  uOuter: { value: 0 },
                  uGlow: { value: 0.3 },
                  uReach: { value: 110 },
                  uNoise: { value: 0.6 },
                  uCells: { value: 6 },
                  uGrains: { value: 24 },
                  uOctaves: { value: 2 },
                  uDrift: { value: new s.IUQ() },
                  uPhase: { value: 0 },
                  uLchA: { value: new s.Pq0() },
                  uLchB: { value: new s.Pq0() },
                  uBack: { value: new s.Pq0(0.04, 0.04, 0.04) },
                  uInk: { value: 0 },
                  uExposure: { value: 1.5 },
                  uIntensity: { value: 1 },
                  uOpacity: { value: 1 },
                  uGrain: { value: 0 },
                  uSeed: { value: 0 },
                  uLift: { value: 0 },
                  uIntro: { value: new s.IUQ(0, 1e6, 1e6, 0) },
                  uPulses: { value: o },
                  uIdle: { value: d },
                },
                g = new s.D$Q({
                  glslVersion: s.Wdf,
                  vertexShader: P,
                  fragmentShader: I,
                  uniforms: v,
                  blending: s.XIg,
                  transparent: !1,
                  depthTest: !1,
                  depthWrite: !1,
                }),
                x = new s.LoY();
              x.setAttribute(
                "position",
                new s.qtW([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3),
              );
              let w = new s.eaF(x, g);
              w.frustumCulled = !1;
              let y = new s.Z58();
              y.add(w);
              let L = new s.qUd(-1, 1, 1, -1, 0, 1),
                F = 0,
                W = 0,
                E = !1,
                j = "",
                D = -10,
                k = 0,
                R = 0,
                A = 0,
                N = 0,
                G = 2.6,
                z = 0,
                B = 0,
                T = 0,
                q = 0,
                O = 0,
                U = !1,
                H = !1,
                Y = !1,
                Q = null,
                X = {
                  line: 1,
                  outer: 0,
                  halfX: 1,
                  halfY: 1,
                  radius: 0,
                  reach: 1,
                  bend: 0,
                  hx: 1,
                  hy: 1,
                  perimeter: 4,
                },
                _ = [],
                V = [],
                $ = () => {
                  let t,
                    l,
                    n = a.current,
                    r =
                      b(n.backgroundColor) ??
                      (() => {
                        let t = e.parentElement;
                        for (; t;) {
                          let e = b(i.getComputedStyle(t).backgroundColor);
                          if (e) return e;
                          t = t.parentElement;
                        }
                        let a = b(i.getComputedStyle(e).color);
                        return a
                          ? S(a) > 0.5
                            ? [0.04, 0.04, 0.04]
                            : [1, 1, 1]
                          : i.matchMedia("(prefers-color-scheme: dark)").matches
                            ? [0.04, 0.04, 0.04]
                            : [1, 1, 1];
                      })(),
                    o =
                      Array.isArray(n.colors) && n.colors.length >= 2
                        ? n.colors
                        : null,
                    s = [r.join(","), o ? o.join(",") : "", n.color ?? ""].join(
                      "|",
                    );
                  if (s === j) return;
                  ((j = s),
                    v.uBack.value.set(r[0], r[1], r[2]),
                    (v.uInk.value = +(S(r) > 0.55)),
                    o
                      ? ((t = M(C(b(o[0]) ?? b("#5227FF")))),
                        (l = M(C(b(o[1]) ?? b("#FF9FFC")))))
                      : b(n.color)
                        ? (l = [
                            Math.min((t = M(C(b(n.color))))[0] + 0.05, 0.95),
                            t[1],
                            t[2] + 0.5,
                          ])
                        : ((t = M(C(b("#5227FF")))), (l = M(C(b("#FF9FFC"))))),
                    t[1] < 0.02 && (t[2] = l[2]),
                    l[1] < 0.02 && (l[2] = t[2]));
                  let u = l[2] - t[2];
                  ((u =
                    ((((u + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) %
                      (2 * Math.PI)) -
                    Math.PI),
                    v.uLchA.value.set(t[0], t[1], t[2]),
                    v.uLchB.value.set(l[0], l[1], t[2] + u));
                },
                K = () => {
                  let e = a.current,
                    t = c(h(e.lineWidth, 1), 0, 12),
                    l = Math.min(F, W),
                    n = c(h(e.inset, 0), 0, Math.max(l / 2 - t - 4, 0)),
                    i = Math.max(F / 2 - n - t / 2, 1),
                    r = Math.max(W / 2 - n - t / 2, 1),
                    o = Math.min(i, r),
                    s = c(h(e.radius, 16) - t / 2, 0, o),
                    u =
                      void 0 !== e.glowWidth
                        ? h(e.glowWidth, 110)
                        : void 0 !== e.borderWidth
                          ? h(e.borderWidth, 0.22) * F * 0.7
                          : 110;
                  void 0 !== e.falloff &&
                    (u *= Math.sqrt(6 / c(h(e.falloff, 6), 1, 20)));
                  let d = Math.min(
                      Math.max(s, 1.75 * (u = c(u, 4, 0.5 * o))),
                      o,
                    ),
                    f = Math.max(i - d, 0),
                    p = Math.max(r - d, 0);
                  return {
                    line: t,
                    outer: n,
                    halfX: i,
                    halfY: r,
                    radius: s,
                    reach: u,
                    bend: d,
                    hx: f,
                    hy: p,
                    perimeter: Math.max(4 * (f + p) + 2 * Math.PI * d, 1),
                  };
                },
                Z = () => {
                  let t = a.current,
                    n = Math.round(e.clientWidth),
                    r = Math.round(e.clientHeight);
                  if (n < 2 || r < 2) return ((E = !1), !1);
                  let o = Math.min(
                    i.devicePixelRatio || 1,
                    c(h(t.dpr, 2), 0.5, 3),
                  );
                  return (
                    (!E || n !== F || r !== W || l.getPixelRatio() !== o) &&
                    ((E = !0),
                    (F = n),
                    (W = r),
                    l.setPixelRatio(o),
                    l.setSize(F, W, !1),
                    !0)
                  );
                },
                J = () => 1.5 / c(h(a.current.pulseSpeed, 1), 0.2, 4),
                ee = () => {
                  E &&
                    (performance.now() - D > 1e3 &&
                      ((D = performance.now()), $()),
                    (() => {
                      let e = a.current,
                        t = (X = K()).perimeter,
                        l = c(h(e.noiseScale, 3), 0.2, 12);
                      (v.uSize.value.set(F, W),
                        (v.uDpr.value = r.width / Math.max(F, 1)),
                        v.uHalf.value.set(X.halfX, X.halfY),
                        (v.uRadius.value = X.radius),
                        v.uPath.value.set(X.hx, X.hy, X.bend, t),
                        (v.uLine.value = X.line),
                        (v.uOuter.value = X.outer),
                        (v.uGlow.value = 0.6 * c(h(e.glow, 0.5), 0, 3)),
                        (v.uReach.value = X.reach),
                        (v.uNoise.value = c(
                          h(e.noise ?? e.noiseStrength, 0.6),
                          0,
                          1,
                        )),
                        (v.uCells.value = Math.max(
                          2,
                          Math.round((t * l) / 1800),
                        )),
                        (v.uGrains.value = Math.max(
                          3,
                          Math.round((t * l) / (3 * 1.3 * X.reach)),
                        )),
                        (v.uOctaves.value =
                          void 0 !== e.noiseOctaves
                            ? c(Math.round(h(e.noiseOctaves, 2)), 1, 3)
                            : 2));
                      let n = 34 * k;
                      (v.uDrift.value.set(
                        n % t,
                        (1.6 * n) % t,
                        0.09 * k,
                        (1.3 * n) % t,
                      ),
                        (v.uPhase.value =
                          ((k * Math.PI * 2) / 70) % (2 * Math.PI)),
                        (v.uExposure.value =
                          1.5 *
                          (void 0 !== e.gamma
                            ? Math.sqrt(c(h(e.gamma, 2), 0.5, 5) / 2)
                            : 1)),
                        (v.uIntensity.value = c(h(e.intensity, 1), 0, 4)),
                        (v.uOpacity.value = c(h(e.opacity, 1), 0, 1)),
                        (v.uGrain.value = c(h(e.grain, 0), 0, 1)),
                        (v.uSeed.value = Math.floor(60 * R) % 997),
                        (v.uLift.value = c(z, 0, 1.2)));
                      let i = t / 2;
                      if (G < 2.6) {
                        let e = p(c(G / 1.8, 0, 1)),
                          a = p(c((G - 0.35) / 2.1, 0, 1));
                        v.uIntro.value.set(
                          X.hx / t,
                          e * (i + 60),
                          1.6 * i * a,
                          f(0, 0.12, G) * (1 - f(1.3, 2.1, G)) * 0.9,
                        );
                      } else v.uIntro.value.set(0, 1e6, 1e6, 0);
                      let s = J();
                      for (let e = 0; e < 8; e++) {
                        let t = _[e];
                        if (!t) {
                          o[e].set(0, 0, 0, 0);
                          continue;
                        }
                        let a = R - t.born,
                          l = Math.min(a / s, 1),
                          n = 1 - Math.pow(1 - l, 1.7),
                          i =
                            f(0, 0.05, a) *
                            (1 - 0.3 * l) *
                            (1 - f(s, s + 0.8, a)),
                          r = 0.9 * f(0.7 * s, s, a) * (1 - f(s, s + 1.2, a));
                        o[e].set(t.at, n, i, r);
                      }
                      let u = c(h(e.idleStrength, 1), 0, 3);
                      for (let e = 0; e < 6; e++) {
                        let t = V[e];
                        if (!t) {
                          d[e].set(0, 0);
                          continue;
                        }
                        let a = Math.pow(
                          Math.sin(Math.PI * c((A - t.born) / t.life, 0, 1)),
                          2,
                        );
                        d[e].set(t.at, a * t.gain * t.fade * u);
                      }
                    })(),
                    l.render(y, L));
                },
                et = () => {
                  H || Y || !U || q || (q = requestAnimationFrame(ea));
                },
                ea = (e) => {
                  if (((q = 0), H || Y)) return;
                  let t = a.current,
                    l = O && e - O < 100 ? c((e - O) / 1e3, 0, 0.05) : 1 / 60;
                  O = e;
                  let i = !t.reduced && !t.paused;
                  if (
                    ((t.reduced || !t.interactive) && (T = 0),
                    (B += (-10.240000000000002 * (z - T) - 6.4 * B) * l),
                    (z += B * l),
                    i)
                  ) {
                    let e = c(h(t.speed, 0.1) / 0.1, 0, 20);
                    k += l * c(h(t.flowSpeed, 1), 0, 6) * e * (1 + 1.1 * z);
                  }
                  ((R += l), G < 2.6 && (G = t.reduced ? 2.6 : G + l));
                  let r = t.reduced
                    ? 0
                    : c(Math.round(h(t.idlePulses, 3)), 0, 6);
                  if (i) {
                    let e = l * (1 + 0.6 * z),
                      a = e * c(h(t.idleSpeed, 1), 0, 5) * 0.012;
                    A += e;
                    for (let t = 0; t < V.length; t++) {
                      let l = V[t];
                      ((l.at = m(l.at + a * l.rate)),
                        (l.fade =
                          t < V.length - r
                            ? l.fade * Math.exp(-e / 0.5)
                            : Math.min(1, l.fade + 2 * e)));
                    }
                    for (let e = V.length - 1; e >= 0; e--)
                      (A - V[e].born > V[e].life || V[e].fade < 0.002) &&
                        V.splice(e, 1);
                    G >= 2.6 &&
                      V.length < r &&
                      A >= N &&
                      ((() => {
                        let e = Math.random(),
                          t = e,
                          a = -1;
                        for (let l = 0; l < 16; l++) {
                          let n = m(e + l / 16),
                            i = 1;
                          for (let e of V) {
                            let t = Math.abs(n - e.at);
                            i = Math.min(i, t, 1 - t);
                          }
                          i > a && ((a = i), (t = n));
                        }
                        V.push({
                          at: t,
                          rate: 0.7 + 0.6 * Math.random(),
                          born: A,
                          life: 8 + 4 * Math.random(),
                          gain: 0.75 + 0.25 * Math.random(),
                          fade: 1,
                        });
                      })(),
                      (N =
                        A +
                        (10 / Math.max(r, 1)) * (0.6 + 0.4 * Math.random())));
                  }
                  let o = J();
                  for (let e = _.length - 1; e >= 0; e--)
                    R - _[e].born > o + 1.25 && _.splice(e, 1);
                  ee();
                  let s = Math.abs(z - T) > 0.001 || Math.abs(B) > 0.001;
                  (i || s || _.length > 0 || G < 2.6) && !n.hidden
                    ? (q = requestAnimationFrame(ea))
                    : (O = 0);
                },
                el = (e) => {
                  (_.length >= 8 && _.shift(), _.push({ at: m(e), born: R }));
                },
                en = (e, t) => {
                  E &&
                    ((X = K()),
                    el(
                      ((e, t, a) => {
                        let { hx: l, hy: n, bend: i } = a,
                          r = Math.PI / 2,
                          o = r * i,
                          s = Math.abs(e) - l,
                          u = Math.abs(t) - n;
                        if (s > 0 && u > 0) {
                          let a = Math.atan2(u, s);
                          return e >= 0 && t >= 0
                            ? 2 * l + (r - a) * i
                            : e >= 0
                              ? 2 * l + o + 2 * n + a * i
                              : t < 0
                                ? 4 * l + 2 * o + 2 * n + (r - a) * i
                                : 4 * l + 3 * o + 4 * n + a * i;
                        }
                        return u >= s
                          ? t >= 0
                            ? e + l
                            : 3 * l + 2 * o + 2 * n - e
                          : e >= 0
                            ? 2 * l + o + n - t
                            : 4 * l + 3 * o + 3 * n + t;
                      })(e - F / 2, W / 2 - t, X) / X.perimeter,
                    ));
                },
                ei = (t) => {
                  let l = a.current;
                  if (!l.interactive || l.reduced || l.paused) return;
                  let n = e.getBoundingClientRect();
                  n.width <= 0 ||
                    n.height <= 0 ||
                    !E ||
                    (en(
                      ((t.clientX - n.left) / n.width) * F,
                      ((t.clientY - n.top) / n.height) * W,
                    ),
                    et());
                },
                er = (e) => {
                  var t;
                  if (
                    !(
                      !e.isPrimary ||
                      ((t = e.target) &&
                        "function" == typeof t.closest &&
                        t.closest(
                          "a,button,input,textarea,select,label,summary,[role=button],[contenteditable=true]",
                        ))
                    ) &&
                    ("mouse" !== e.pointerType || 0 === e.button)
                  ) {
                    if ("touch" === e.pointerType) {
                      Q = {
                        id: e.pointerId,
                        x: e.clientX,
                        y: e.clientY,
                        time: performance.now(),
                      };
                      return;
                    }
                    ei(e);
                  }
                },
                eo = (e) => {
                  let t = Q;
                  ((Q = null),
                    !t ||
                      t.id !== e.pointerId ||
                      Math.hypot(e.clientX - t.x, e.clientY - t.y) > 10 ||
                      performance.now() - t.time > 600 ||
                      ei(e));
                },
                es = (e) => {
                  if ("touch" === e.pointerType) return;
                  let t = a.current;
                  ((T = t.interactive && !t.reduced ? 1 : 0), et());
                },
                eu = (e) => {
                  "touch" !== e.pointerType && ((T = 0), et());
                },
                ed = () => {
                  Q = null;
                },
                ec = () => {
                  ((O = 0), et());
                },
                eh = (e) => {
                  (e.preventDefault(),
                    (Y = !0),
                    cancelAnimationFrame(q),
                    (q = 0));
                },
                ef = () => {
                  ((Y = !1), (j = ""), et());
                },
                ep = new ResizeObserver(() => {
                  Z() && (ee(), et());
                }),
                em = new IntersectionObserver(
                  ([e]) => {
                    ((U = e.isIntersecting), (O = 0), et());
                  },
                  { rootMargin: "120px" },
                );
              return (
                e.addEventListener("pointerdown", er),
                e.addEventListener("pointerup", eo),
                e.addEventListener("pointermove", es),
                e.addEventListener("pointerleave", eu),
                e.addEventListener("pointercancel", ed),
                n.addEventListener("visibilitychange", ec),
                r.addEventListener("webglcontextlost", eh),
                r.addEventListener("webglcontextrestored", ef),
                ep.observe(e),
                em.observe(e),
                a.current.intro && !a.current.reduced && (G = 0),
                (k = 14 * !!a.current.reduced),
                Z(),
                $(),
                {
                  sync: () => {
                    ((D = -10), Z(), (O = 0), !q && U && (ee(), et()));
                  },
                  pulse: (e, t) => {
                    !a.current.reduced &&
                      E &&
                      (void 0 !== e &&
                      void 0 !== t &&
                      Number.isFinite(e) &&
                      Number.isFinite(t)
                        ? en(e, t)
                        : el(Math.random()),
                      et());
                  },
                  replay: () => {
                    a.current.reduced ||
                      ((G = 0), (V.length = 0), (N = A), (O = 0), et());
                  },
                  destroy: () => {
                    ((H = !0),
                      cancelAnimationFrame(q),
                      ep.disconnect(),
                      em.disconnect(),
                      e.removeEventListener("pointerdown", er),
                      e.removeEventListener("pointerup", eo),
                      e.removeEventListener("pointermove", es),
                      e.removeEventListener("pointerleave", eu),
                      e.removeEventListener("pointercancel", ed),
                      n.removeEventListener("visibilitychange", ec),
                      r.removeEventListener("webglcontextlost", eh),
                      r.removeEventListener("webglcontextrestored", ef),
                      y.remove(w),
                      x.dispose(),
                      g.dispose(),
                      l.dispose(),
                      r.remove());
                  },
                }
              );
            })(e, t, el);
            return (
              (et.current = a),
              () => {
                (a?.destroy(), (et.current = null));
              }
            );
          }, []),
          (0, n.useImperativeHandle)(
            Z,
            () => ({
              pulse: (e, t) => et.current?.pulse(e, t),
              replay: () => et.current?.replay(),
            }),
            [],
          ));
        let en = g(t) ? void 0 : t,
          ei =
            Math.max(Number.isFinite(a) ? a : 16, 0) +
            Math.max(Number.isFinite(r) ? r : 0, 0);
        return (0, l.jsxs)("div", {
          ref: J,
          className: (0, d.cn)("relative isolate overflow-hidden", O),
          style: {
            width: T,
            height: q,
            borderRadius: ei,
            backgroundColor: en,
            ...U,
          },
          children: [
            (0, l.jsx)("div", {
              ref: ee,
              "aria-hidden": "true",
              style: { position: "absolute", inset: 0, pointerEvents: "none" },
            }),
            H
              ? (0, l.jsx)("div", {
                  className: "relative z-1 h-full w-full",
                  children: H,
                })
              : null,
          ],
        });
      });
    W.displayName = "FrameBorder";
    let E = {
        colors: ["#5227FF", "#FF9FFC"],
        radius: 16,
        lineWidth: 1,
        inset: 0,
        glow: 0.5,
        glowWidth: 110,
        noise: 0.6,
        noiseScale: 3,
        flowSpeed: 1,
        pulseSpeed: 1,
        idlePulses: 3,
        intensity: 1,
      },
      j = {
        aurora: E,
        lavender: {
          ...E,
          colors: ["#B19EEF", "#FF9FFC"],
          radius: 24,
          glow: 0.8,
          glowWidth: 170,
          noise: 0.5,
          noiseScale: 2,
          flowSpeed: 0.6,
          intensity: 0.9,
        },
        neon: {
          ...E,
          colors: ["#FF2DCB", "#22D3EE"],
          radius: 12,
          lineWidth: 1.5,
          glow: 0.35,
          glowWidth: 70,
          noise: 0.8,
          noiseScale: 4,
          flowSpeed: 1.6,
          pulseSpeed: 1.4,
          idlePulses: 4,
          intensity: 1.3,
        },
        ember: {
          ...E,
          colors: ["#FF7A27", "#FF2D55"],
          radius: 12,
          glow: 0.6,
          glowWidth: 120,
          noise: 0.9,
          noiseScale: 3.5,
          flowSpeed: 1.2,
        },
        glacier: {
          ...E,
          colors: ["#7DD3FC", "#A5B4FC"],
          radius: 28,
          inset: 16,
          glow: 0.45,
          glowWidth: 140,
          noise: 0.5,
          noiseScale: 2.5,
          flowSpeed: 0.8,
          idlePulses: 2,
        },
        emerald: {
          ...E,
          colors: ["#34D399", "#22D3EE"],
          radius: 20,
          glow: 0.55,
          noise: 0.7,
        },
        sunset: {
          ...E,
          colors: ["#FF9FFC", "#FF7A27"],
          radius: 32,
          inset: 12,
          glow: 0.6,
          glowWidth: 130,
        },
        wire: {
          ...E,
          colors: ["#8B5CF6", "#5227FF"],
          glow: 0.2,
          glowWidth: 60,
          noise: 0.3,
          pulseSpeed: 1.2,
          idlePulses: 2,
          intensity: 1.1,
        },
      },
      D = [
        { label: "Aurora", value: "aurora" },
        { label: "Lavender", value: "lavender" },
        { label: "Neon", value: "neon" },
        { label: "Ember", value: "ember" },
        { label: "Glacier", value: "glacier" },
        { label: "Emerald", value: "emerald" },
        { label: "Sunset", value: "sunset" },
        { label: "Wire", value: "wire" },
      ],
      k = [
        {
          name: "colors",
          type: "[string, string]",
          default: '["#5227FF", "#FF9FFC"]',
          description:
            "Two colours blended in OKLCH along the frame. The gradient slowly travels around it.",
        },
        {
          name: "backgroundColor",
          type: "string",
          default: '"transparent"',
          description:
            "Fill behind the frame. Transparent reads the page colour. On light colours the frame switches to a fine inked line with a tinted glow.",
        },
        {
          name: "radius",
          type: "number",
          default: "16",
          description:
            "Corner radius of the line in px. The root is rounded to match.",
        },
        {
          name: "lineWidth",
          type: "number",
          default: "1",
          description:
            "Width of the border line in px. It stays crisp at any size. 0 hides it.",
        },
        {
          name: "inset",
          type: "number",
          default: "0",
          description:
            "Distance in px between the edge of the element and the line.",
        },
        {
          name: "glow",
          type: "number",
          default: "0.5",
          description: "Strength of the soft inner glow.",
        },
        {
          name: "glowWidth",
          type: "number",
          default: "110",
          description:
            "How far the glow reaches inward, in px. It always fades to zero.",
        },
        {
          name: "noise",
          type: "number",
          default: "0.6",
          description:
            "How much the flowing noise moves through the glow and along the line, from 0 to 1.",
        },
        {
          name: "noiseScale",
          type: "number",
          default: "3",
          description:
            "Density of the noise. Higher values give more, smaller patches.",
        },
        {
          name: "flowSpeed",
          type: "number",
          default: "1",
          description:
            "Speed of the light travelling around the frame. Hovering speeds it up gently.",
        },
        {
          name: "pulseSpeed",
          type: "number",
          default: "1",
          description:
            "Speed of the twin pulses a click sends from the nearest edge. They meet on the opposite side.",
        },
        {
          name: "idlePulses",
          type: "number",
          default: "3",
          description:
            "Soft swells of light that drift along the frame after the intro. 0 turns them off.",
        },
        {
          name: "idleSpeed",
          type: "number",
          default: "1",
          description: "Speed of the idle swells.",
        },
        {
          name: "idleStrength",
          type: "number",
          default: "1",
          description: "Brightness of the idle swells.",
        },
        {
          name: "intensity",
          type: "number",
          default: "1",
          description: "Overall brightness of the line and glow.",
        },
        {
          name: "opacity",
          type: "number",
          default: "1",
          description: "Opacity of the light layer.",
        },
        {
          name: "grain",
          type: "number",
          default: "0",
          description: "Film grain over the light, from 0 to 1.",
        },
        {
          name: "interactive",
          type: "boolean",
          default: "true",
          description:
            "Enables click pulses and the hover speed-up. Clicks stack.",
        },
        {
          name: "intro",
          type: "boolean",
          default: "true",
          description:
            "Draws the border in from the top, then fades the glow in.",
        },
        {
          name: "paused",
          type: "boolean",
          default: "false",
          description:
            "Stops all motion. Reduced-motion users get a still frame.",
        },
        {
          name: "dpr",
          type: "number",
          default: "2",
          description: "Maximum device pixel ratio for the canvas.",
        },
        {
          name: "width",
          type: "string | number",
          default: '"100%"',
          description: "Width of the root element.",
        },
        {
          name: "height",
          type: "string | number",
          default: '"100%"',
          description: "Height of the root element.",
        },
        {
          name: "children",
          type: "ReactNode",
          default: "undefined",
          description: "Content shown inside the frame, above the light.",
        },
        {
          name: "ref",
          type: "{ pulse, replay }",
          default: "undefined",
          description:
            "pulse(x?, y?) sends twin pulses from a point in px. replay() draws the border in again.",
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
      ],
      R = () => {
        let [e, t] = (0, o.I)(),
          a = (0, r.Y)(),
          [s, u] = (0, n.useState)("aurora"),
          [d, c] = (0, n.useState)(E),
          h = (e) => (t) => c((a) => ({ ...a, [e]: t })),
          f = (e) => (t) =>
            c((a) => {
              let l = [...a.colors];
              return ((l[e] = t), { ...a, colors: l });
            }),
          [p, m] = (0, n.useState)(null),
          [v, g] = (0, n.useState)(1),
          [x, w] = (0, n.useState)(1),
          [y, b] = (0, n.useState)(1),
          [C, M] = (0, n.useState)(0),
          [S, L] = (0, n.useState)(!0),
          [F, P] = (0, n.useState)(!0),
          [I, R] = (0, n.useState)(!1),
          A = p ?? ("dark" === a ? "#0a0a0a" : "#ffffff");
        return (0, l.jsxs)("div", {
          children: [
            (0, l.jsx)(i.Bg, {}),
            (0, l.jsxs)(i.VX, {
              children: [
                (0, l.jsxs)(i.Ec, {
                  children: [
                    (0, l.jsx)(i.Ch, {
                      onRefresh: t,
                      children: (0, l.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, l.jsx)(
                          W,
                          {
                            ...d,
                            backgroundColor: A,
                            idleSpeed: v,
                            idleStrength: x,
                            opacity: y,
                            grain: C,
                            interactive: S,
                            intro: F,
                            paused: I,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, l.jsxs)(i.IH, {
                      children: [
                        (0, l.jsx)(i.bg, {
                          title: "Preset",
                          value: s,
                          options: D,
                          onChange: (e) => {
                            (u(e), c(j[e] ?? E));
                          },
                        }),
                        (0, l.jsx)(i.W7, {
                          title: "Color A",
                          value: d.colors[0],
                          onChange: f(0),
                        }),
                        (0, l.jsx)(i.W7, {
                          title: "Color B",
                          value: d.colors[1],
                          onChange: f(1),
                        }),
                        (0, l.jsx)(i.W7, {
                          title: "Background",
                          value: A,
                          onChange: m,
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Radius",
                          min: 0,
                          max: 64,
                          step: 1,
                          value: d.radius,
                          valueUnit: "px",
                          onChange: h("radius"),
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Line Width",
                          min: 0,
                          max: 4,
                          step: 0.25,
                          value: d.lineWidth,
                          valueUnit: "px",
                          onChange: h("lineWidth"),
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Inset",
                          min: 0,
                          max: 64,
                          step: 1,
                          value: d.inset,
                          valueUnit: "px",
                          onChange: h("inset"),
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Glow",
                          min: 0,
                          max: 2,
                          step: 0.05,
                          value: d.glow,
                          onChange: h("glow"),
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Glow Width",
                          min: 20,
                          max: 260,
                          step: 5,
                          value: d.glowWidth,
                          valueUnit: "px",
                          onChange: h("glowWidth"),
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Noise",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: d.noise,
                          onChange: h("noise"),
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Noise Scale",
                          min: 0.5,
                          max: 8,
                          step: 0.1,
                          value: d.noiseScale,
                          onChange: h("noiseScale"),
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Flow Speed",
                          min: 0,
                          max: 4,
                          step: 0.05,
                          value: d.flowSpeed,
                          onChange: h("flowSpeed"),
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Pulse Speed",
                          min: 0.25,
                          max: 3,
                          step: 0.05,
                          value: d.pulseSpeed,
                          onChange: h("pulseSpeed"),
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Idle Pulses",
                          min: 0,
                          max: 6,
                          step: 1,
                          value: d.idlePulses,
                          onChange: h("idlePulses"),
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Idle Speed",
                          min: 0.2,
                          max: 3,
                          step: 0.05,
                          value: v,
                          onChange: g,
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Idle Strength",
                          min: 0,
                          max: 2,
                          step: 0.05,
                          value: x,
                          onChange: w,
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Intensity",
                          min: 0.2,
                          max: 2.5,
                          step: 0.05,
                          value: d.intensity,
                          onChange: h("intensity"),
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Opacity",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: y,
                          onChange: b,
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Grain",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: C,
                          onChange: M,
                        }),
                        (0, l.jsx)(i.tl, {
                          title: "Interactive",
                          checked: S,
                          onChange: L,
                        }),
                        (0, l.jsx)(i.tl, {
                          title: "Intro",
                          checked: F,
                          onChange: P,
                        }),
                        (0, l.jsx)(i.tl, {
                          title: "Paused",
                          checked: I,
                          onChange: R,
                        }),
                      ],
                    }),
                    (0, l.jsx)(i.Ub, { data: k }),
                  ],
                }),
                (0, l.jsx)(i.lT, { children: (0, l.jsx)(i.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
