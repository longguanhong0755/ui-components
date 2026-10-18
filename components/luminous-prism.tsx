"use client"

import type { CSSProperties } from "react"
import { useEffect, useRef } from "react"

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    sides: 4,
    periodMs: 2520,
    phase: 100,
    widthRatio: 37,
    offsetY: 0,
    pitch: 0,
    camDistance: 250,
    backgroundEdge: "#000000",
    bodyColor: "#000000",
    lightIntensity: 300,
    keyAzimuth: -55,
    fillAzimuth: 20,
    rimAzimuth: 105,
    lowAzimuth: -60,
    lowAzimuth2: 30,
    lightWidth: 100,
    lightSoftness: 45,
    bump: 28,
    bumpScale: 40,
    dispersion: 30,
    reflectionLines: 50,
    edgeWidth: 1,
    edgeBrightness: 70,
    bloomSize: 40,
    tipGlint: 200,
    tipLength: 200,
    exposure: 150,
    grain: 0,
    vignette: 0,
}

type RGB = [number, number, number]

function parseColor(input: unknown, fallback: RGB): RGB {
    if (typeof input !== "string") return fallback
    let s = input.trim()
    const v = s.match(/var\([^,]+,\s*(.+)\)\s*$/)
    if (v) s = v[1].trim()
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4)
            h = h
                .split("")
                .map((c) => c + c)
                .join("")
        if (h.length >= 6) {
            const n = parseInt(h.slice(0, 6), 16)
            if (!isNaN(n))
                return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
        }
        return fallback
    }
    const m = s.match(/rgba?\(([^)]+)\)/)
    if (m) {
        const p = m[1]
            .split(/[\s,\/]+/)
            .filter(Boolean)
            .map(parseFloat)
        if (p.length >= 3 && !isNaN(p[0]) && !isNaN(p[1]) && !isNaN(p[2]))
            return [p[0] / 255, p[1] / 255, p[2] / 255]
    }
    return fallback
}

const VERT = `#version 300 es
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

const FRAG = `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 uRes;
uniform float uTime, uBeta, uSides, uH, uR, uCy, uPitch, uD;
uniform vec3 uBgCenter, uBgEdge, uBody, uGlowCol;
uniform vec3 uColors[6];
uniform float uKey, uLightW, uSoft;
uniform vec4 uAz;
uniform float uAz2;
uniform float uBump, uBumpScale, uDisp, uLines, uExposure;
uniform float uEdgeW, uEdgeB, uGlow, uBloomR, uTip, uTipLen;
uniform float uGrain, uVignette;

const float PI = 3.14159265;
const float TAU = 6.28318531;

float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash13(vec3 p3){ p3 = fract(p3 * 0.1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash13(i), hash13(i + vec3(1,0,0)), f.x), mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x), mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y),
    f.z);
}
vec3 rotY(vec3 v, float a){ float c = cos(a), s = sin(a); return vec3(v.x * c - v.z * s, v.y, v.x * s + v.z * c); }
vec3 rotX(vec3 v, float a){ float c = cos(a), s = sin(a); return vec3(v.x, v.y * c - v.z * s, v.y * s + v.z * c); }

vec2 proj(vec3 w){
  vec3 c = rotX(w, -uPitch);
  c.z += uD;
  return c.xy * uD / max(c.z, 1e-3);
}
float edgeSd(vec2 p, vec2 a, vec2 b){
  vec2 e = b - a;
  vec2 n = normalize(vec2(-e.y, e.x));
  return dot(p - a, n);
}
vec4 plane(int k, int N, float ap, float H){
  int j = k < N ? k : k - N;
  float s = k < N ? 1.0 : -1.0;
  float th = (float(j) + 0.5) * TAU / float(N);
  vec3 n = vec3(cos(th) / ap, s / H, sin(th) / ap);
  float l = length(n);
  return vec4(n / l, 1.0 / l);
}
float blob(float az, float el, float az0, float el0, float wa, float we){
  float da = mod(az - az0 + PI, TAU) - PI;
  float r = length(vec2(da / wa, (el - el0) / we));
  return 1.0 - smoothstep(1.0 - uSoft, 1.0, r);
}
vec3 env(vec3 d){
  d = normalize(d);
  float az = atan(d.x, -d.z);
  float el = asin(clamp(d.y, -1.0, 1.0));
  float W = uLightW;
  vec3 white = vec3(1.0);
  vec3 c = vec3(0.0);
  float b;
  b = blob(az, el, uAz.x, 0.45, 0.52 * W, 0.32 * W); c += mix(uColors[0], white, b) * b * uKey;
  b = blob(az, el, uAz.y, 0.42, 0.79 * W, 0.30 * W); c += mix(uColors[1], white, b * b) * b * uKey * 0.9;
  b = blob(az, el, uAz.z, 0.45, 0.31 * W, 0.30 * W); c += mix(uColors[2], white, b) * b * uKey;
  b = blob(az, el, uAz.w, -0.28, 0.61 * W, 0.26 * W); c += mix(uColors[3], white, b * b) * b * uKey * 0.8;
  b = blob(az, el, uAz2, -0.28, 0.52 * W, 0.26 * W); c += mix(uColors[4], uColors[0], b) * b * uKey * 0.7;
  b = blob(az, el, uAz2 + 0.49, -0.30, 0.26 * W, 0.24 * W); c += mix(uColors[5], white, b) * b * uKey;
  return c;
}

void main(){
  vec2 fc = gl_FragCoord.xy;
  float px = 1.0 / uRes.y;
  vec2 uv = (fc - 0.5 * uRes) * px;
  float aspect = uRes.x / uRes.y;
  float rr = length(uv / vec2(0.5 * aspect, 0.5));
  vec3 col = mix(uBgCenter, uBgEdge, smoothstep(0.0, 1.4, rr));

  vec2 uc = uv - vec2(0.0, uCy);
  int N = int(uSides + 0.5);
  float fN = float(N);
  float H = uH, R = uR;
  float ap = R * cos(PI / fN);
  vec3 ro = rotX(vec3(0.0, 0.0, -uD), uPitch);
  vec3 rd = rotX(normalize(vec3(uc, uD)), uPitch);

  // projected silhouette
  vec2 T2 = proj(vec3(0.0, H, 0.0));
  vec2 B2 = proj(vec3(0.0, -H, 0.0));
  vec2 L2 = vec2(1e5, 0.0), R2 = vec2(-1e5, 0.0);
  for (int k = 0; k < 8; k++) {
    if (k >= N) break;
    float ph = float(k) * TAU / fN;
    vec2 v = proj(rotY(vec3(R * cos(ph), 0.0, R * sin(ph)), uBeta));
    if (v.x < L2.x) L2 = v;
    if (v.x > R2.x) R2 = v;
  }
  float sd = max(max(edgeSd(uc, T2, R2), edgeSd(uc, R2, B2)), max(edgeSd(uc, B2, L2), edgeSd(uc, L2, T2)));
  float cov = clamp(0.5 - sd / px, 0.0, 1.0);

  // per-face light, drives bloom, outline and tip glints
  vec3 bloom = vec3(0.0);
  float lf = 0.0, upB = 0.0, loB = 0.0;
  for (int k = 0; k < 16; k++) {
    if (k >= 2 * N) break;
    int j = k < N ? k : k - N;
    float s = k < N ? 1.0 : -1.0;
    vec3 n = plane(k, N, ap, H).xyz;
    float p0 = float(j) * TAU / fN, p1 = float(j + 1) * TAU / fN;
    vec3 c = (vec3(0.0, s * H, 0.0) + vec3(R * cos(p0), 0.0, R * sin(p0)) + vec3(R * cos(p1), 0.0, R * sin(p1))) / 3.0;
    vec3 cw = rotY(c, uBeta), nw = rotY(n, uBeta);
    vec3 dir = normalize(cw - ro);
    float facing = -dot(dir, nw);
    if (facing <= 0.0) continue;
    vec3 e = env(reflect(dir, nw));
    float b = dot(e, vec3(0.3333)) * facing;
    float dd = length(uc - proj(cw));
    bloom += (uGlowCol + 0.35 * e) * b * exp(-dd / uBloomR);
    lf += b * exp(-dd / 0.12);
    if (k < N) upB += b; else loB += b;
  }

  vec3 crystal = uBody;
  if (cov > 0.0) {
    vec3 roO = rotY(ro, -uBeta), rdO = rotY(rd, -uBeta);
    float tN = -1e9, tF = 1e9;
    int hk = -1;
    bool miss = false;
    for (int k = 0; k < 16; k++) {
      if (k >= 2 * N) break;
      vec4 pl = plane(k, N, ap, H);
      float den = dot(pl.xyz, rdO);
      float num = pl.w - dot(pl.xyz, roO);
      if (abs(den) < 1e-6) { if (num < 0.0) miss = true; }
      else {
        float t = num / den;
        if (den < 0.0) { if (t > tN) { tN = t; hk = k; } }
        else tF = min(tF, t);
      }
    }
    if (!miss && hk >= 0 && tN < tF) {
      vec3 P = roO + rdO * tN;
      vec3 nO = plane(hk, N, ap, H).xyz;
      float ed = 1e9;
      for (int k = 0; k < 16; k++) {
        if (k >= 2 * N) break;
        if (k == hk) continue;
        vec4 pl = plane(k, N, ap, H);
        ed = min(ed, pl.w - dot(pl.xyz, P));
      }
      vec3 q = P * uBumpScale;
      vec3 bn = vec3(vnoise(q), vnoise(q + vec3(5.2, 1.3, 7.1)), vnoise(q + vec3(2.7, 8.4, 3.3))) - 0.5;
      bn -= nO * dot(bn, nO);
      vec3 Nw = rotY(normalize(nO + bn * uBump * 2.0), uBeta);
      vec3 rf = reflect(rd, Nw);
      vec3 side = cross(Nw, vec3(0.0, 1.0, 0.0));
      side = side / max(length(side), 1e-4);
      vec3 off = side * uDisp;
      vec3 e = vec3(env(rf + off).r, env(rf - off).g, env(rf).b);
      float cosT = clamp(-dot(rd, Nw), 0.0, 1.0);
      float F = 0.06 + 0.94 * pow(1.0 - cosT, 5.0);
      vec3 refl = 1.0 - exp(-e * uExposure * mix(0.8, 1.0, F));
      float lum = dot(refl, vec3(0.3333));
      crystal = uBody + refl;

      float lq = vnoise(rf * 3.0 + P * 5.0);
      float mask = smoothstep(0.55, 0.75, vnoise(P * 2.0 + 11.0));
      float thread = exp(-abs(lq - 0.5) / 0.012) * mask;
      crystal += mix(uGlowCol, uColors[0], 0.4) * thread * uLines * (0.35 + lum);

      float lit = clamp(lum + lf * 0.6, 0.0, 1.0);
      float edgeL = exp(-pow(ed / (uEdgeW * px), 2.0));
      float edgeS = exp(-ed / (uEdgeW * px * 5.0)) * 0.25;
      vec3 ecol = mix(uGlowCol, mix(uColors[0], vec3(1.0), lit), lit);
      crystal += ecol * (edgeL + edgeS) * uEdgeB * (0.35 + 1.6 * lit);
    }
  }
  col = mix(col, crystal, cov);

  // silhouette rim
  float ol = exp(-pow(sd / (uEdgeW * px), 2.0));
  float olit = clamp(lf * 0.8, 0.0, 1.0);
  col += mix(uGlowCol, mix(uColors[0], vec3(1.0), olit), olit) * (0.3 + 1.5 * olit) * uEdgeB * ol;

  // bloom — tight hot core + wide soft halo, soft-clipped like a camera sensor instead of linear-added
  float outside = smoothstep(-0.01, 0.02, sd);
  float distOut = max(sd, 0.0);
  float total = upB + loB;
  vec3 core = bloom * exp(-distOut / (uBloomR * 0.35)) * 0.6;
  vec3 halo = bloom * exp(-distOut / (uBloomR * 2.4)) * 0.3;
  vec3 glowSum = (core + halo) * uGlow * mix(0.35, 1.0, outside);
  glowSum += uGlowCol * exp(-distOut / (uBloomR * 1.8)) * (0.02 + 0.4 * total) * uGlow * 0.5 * outside;
  col += 1.0 - exp(-glowSum * 1.4);

  // tip glints
  vec2 dT = uc - T2;
  vec2 dB = uc - B2;
  float tipT = exp(-abs(dT.x) / (1.2 * px)) * exp(-abs(dT.y) / uTipLen) * smoothstep(-0.005, 0.01, dT.y)
             + 0.3 * exp(-length(dT) / 0.015);
  float tipB = exp(-abs(dB.x) / (1.2 * px)) * exp(-abs(dB.y) / uTipLen) * smoothstep(-0.005, 0.01, -dB.y)
             + 0.3 * exp(-length(dB) / 0.015);
  col += mix(vec3(0.75, 0.82, 1.0), uGlowCol, 0.3) * (tipT * upB + tipB * loB) * uTip;

  // overlays
  col *= 1.0 - uVignette * smoothstep(0.35, 1.25, rr);
  col += (hash12(fc + fract(uTime * 7.31) * 113.0) - 0.5) * uGrain;
  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

export interface LightingProps {
    speed?: number
    scale?: number
    background?: string
    baseColor?: string
    colors?: string[]
    glow?: number
    advanced?: {
        sides?: number
        periodMs?: number
        phase?: number
        widthRatio?: number
        offsetY?: number
        pitch?: number
        camDistance?: number
        backgroundEdge?: string
        bodyColor?: string
        lightIntensity?: number
        keyAzimuth?: number
        fillAzimuth?: number
        rimAzimuth?: number
        lowAzimuth?: number
        lowAzimuth2?: number
        lightWidth?: number
        lightSoftness?: number
        bump?: number
        bumpScale?: number
        dispersion?: number
        reflectionLines?: number
        edgeWidth?: number
        edgeBrightness?: number
        bloomSize?: number
        tipGlint?: number
        tipLength?: number
        exposure?: number
        grain?: number
        vignette?: number
    }
    style?: CSSProperties
}

/**
 * Lighting — a dark mirror crystal turning in fixed studio light.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function Lighting(props: LightingProps) {
    const {
        speed = 50,
        scale = 49,
        background = "#000000",
        baseColor = "#3D3BF5",
        colors = ["#B18DF3","#E03CC8","#FF0000","#F0FF00"],
        glow = 60,
        style,
    } = props

    const wrapRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef<any>(null)
    propsRef.current = { speed, scale, background, baseColor, colors, glow, advanced: props.advanced }

    useEffect(() => {
        const canvas = canvasRef.current
        const wrap = wrapRef.current
        if (!canvas || !wrap) return
        const gl = canvas.getContext("webgl2", {
            antialias: false,
            premultipliedAlpha: false,
            preserveDrawingBuffer: true,
        })
        if (!gl) return

        const compile = (type: number, src: string) => {
            const sh = gl.createShader(type)!
            gl.shaderSource(sh, src)
            gl.compileShader(sh)
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
                console.error(gl.getShaderInfoLog(sh))
                gl.deleteShader(sh)
                return null
            }
            return sh
        }
        const vs = compile(gl.VERTEX_SHADER, VERT)
        const fs = compile(gl.FRAGMENT_SHADER, FRAG)
        if (!vs || !fs) return
        const prog = gl.createProgram()!
        gl.attachShader(prog, vs)
        gl.attachShader(prog, fs)
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error(gl.getProgramInfoLog(prog))
            return
        }
        const vao = gl.createVertexArray()
        gl.bindVertexArray(vao)
        gl.useProgram(prog)

        const locs = new Map<string, WebGLUniformLocation | null>()
        const loc = (n: string) => {
            if (!locs.has(n)) locs.set(n, gl.getUniformLocation(prog, n))
            return locs.get(n)!
        }
        const f1 = (n: string, v: number) => {
            const l = loc(n)
            if (l) gl.uniform1f(l, v)
        }
        const f3 = (n: string, v: RGB) => {
            const l = loc(n)
            if (l) gl.uniform3f(l, v[0], v[1], v[2])
        }

        let dpr = 1
        const resize = () => {
            dpr = Math.min(window.devicePixelRatio || 1, 2)
            const w = Math.max(1, Math.round(wrap.offsetWidth * dpr))
            const h = Math.max(1, Math.round(wrap.offsetHeight * dpr))
            if (canvas.width !== w) canvas.width = w
            if (canvas.height !== h) canvas.height = h
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(wrap)

        const reduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null
        const rad = Math.PI / 180
        let raf = 0
        let last = -1
        let phase = 0
        let elapsed = 0

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            elapsed += dt
            const p = propsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }

            const rate = Math.max(0, p.speed) / 50 / (Math.max(100, adv.periodMs) / 1000)
            phase += dt * rate
            const reduced = !!(reduce && reduce.matches)
            const N = Math.min(8, Math.max(3, Math.round(adv.sides)))
            const ph = reduced ? 0.55 : phase + adv.phase / 100
            const beta = -Math.PI / 2 - (2 * Math.PI) / N + (ph * 2 * Math.PI) / N

            const hh = (Math.max(1, p.scale) / 100) * 0.5
            const glowAmt = Math.max(0, p.glow)

            gl.viewport(0, 0, canvas.width, canvas.height)
            gl.uniform2f(loc("uRes"), canvas.width, canvas.height)
            f1("uTime", elapsed)
            f1("uBeta", beta)
            f1("uSides", N)
            f1("uH", hh)
            f1("uR", hh * (adv.widthRatio / 100))
            f1("uCy", adv.offsetY / 100)
            f1("uPitch", adv.pitch * rad)
            f1("uD", Math.max(0.5, adv.camDistance / 100))
            f3("uBgCenter", parseColor(p.background, [0.016, 0.067, 0.169]))
            f3("uBgEdge", parseColor(adv.backgroundEdge, [0, 0.024, 0.086]))
            f3("uBody", parseColor(adv.bodyColor, [0.012, 0.024, 0.1]))
            f3("uGlowCol", parseColor(p.baseColor, [0.24, 0.23, 0.96]))
            const colorList = Array.isArray(p.colors) && p.colors.length ? p.colors : ["#B18DF3", "#E03CC8"]
            const colorFlat = new Float32Array(18)
            for (let i = 0; i < 6; i++) {
                const c = parseColor(colorList[i % colorList.length], [0.69, 0.55, 0.95])
                colorFlat[i * 3] = c[0]
                colorFlat[i * 3 + 1] = c[1]
                colorFlat[i * 3 + 2] = c[2]
            }
            const colorsLoc = loc("uColors[0]")
            if (colorsLoc) gl.uniform3fv(colorsLoc, colorFlat)
            f1("uKey", adv.lightIntensity / 100)
            f1("uLightW", Math.max(0.05, adv.lightWidth / 100))
            f1("uSoft", Math.min(0.99, Math.max(0.01, adv.lightSoftness / 100)))
            const az = loc("uAz")
            if (az)
                gl.uniform4f(
                    az,
                    adv.keyAzimuth * rad,
                    adv.fillAzimuth * rad,
                    adv.rimAzimuth * rad,
                    adv.lowAzimuth * rad
                )
            f1("uAz2", adv.lowAzimuth2 * rad)
            f1("uBump", adv.bump / 100)
            f1("uBumpScale", Math.max(0.1, adv.bumpScale / 10))
            f1("uDisp", (adv.dispersion / 100) * 0.12)
            f1("uLines", adv.reflectionLines / 100)
            f1("uExposure", adv.exposure / 100)
            f1("uEdgeW", Math.max(0.5, adv.edgeWidth * dpr * 0.6))
            f1("uEdgeB", adv.edgeBrightness / 100)
            f1("uGlow", glowAmt / 60)
            f1("uBloomR", Math.max(0.002, (adv.bloomSize / 1000) * (0.4 + glowAmt / 100)))
            f1("uTip", adv.tipGlint / 100)
            f1("uTipLen", Math.max(0.002, adv.tipLength / 1000))
            f1("uGrain", (adv.grain / 100) * 0.6)
            f1("uVignette", adv.vignette / 100)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            gl.deleteVertexArray(vao)
            gl.deleteProgram(prog)
            gl.deleteShader(vs)
            gl.deleteShader(fs)
        }
    }, [])

    return (
        <div
            ref={wrapRef}
            style={{
                minWidth: 1200,
                minHeight: 800,
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
            />
        </div>
    )
}
