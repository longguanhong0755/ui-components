"use client"

import * as React from "react"
import { useEffect, useMemo, useRef } from "react"

/**
 * BeyondHorizon — a sunrise-over-a-planet-edge glow. Effect only: it fills its
 * frame and carries no copy, so it can sit behind whatever a section needs.
 *
 * Modelled on the bottom "Start exploring" CTA of unicorn.studio, whose scene
 * is `beyond_horizons.json` run through Unicorn Studio's own WebGL engine. That
 * engine's compiled shader carries an explicit commercial-licence header, so
 * NONE of it is transcribed here: the GLSL below is written from scratch. What
 * was taken from the page is the *composition* — which is a description of what
 * you can see, not their code — plus numbers measured out of a reference frame.
 *
 * Layer stack:
 *
 *   L0  flat near-black ground colour
 *   L1  a point light, brightness = radius / distance   (the core)
 *   L2  volumetric noise marched toward that light      (the plumes)
 *   L3  a huge dark disc that occludes the lower half   (the horizon)
 *   L4  a thin bright arc hugging the disc edge         (the rim)
 *   L5  tanh tonemap + per-pixel dither
 *
 * Everything composites ADDITIVELY, which is why the core can clip to white
 * while the haze around it stays translucent. The occluding disc is what sells
 * it — the light sits *on* the disc's apex, so you only ever see the top sliver
 * of a much bigger glow, exactly as a sun does at dawn.
 *
 * BOTH STATES ARE MEASURED. The resting frame came off a 2860x1314 capture; the
 * hover frame off a scripted pass that parked a real pointer on the live element
 * at six positions. Hover is a PRESENCE response, not a proximity one — every
 * hovered position saturates the core and widens the rim, while the pointer's
 * own position barely moves the glow (peak x spanned only 0.491..0.502W across
 * left/centre/right). It is therefore modelled as a lerp of a whole parameter
 * set, keyed on `hv`.
 *
 * RESPONSIVE FIT (this is the part that is not the reference's).
 * Every measured constant above is in units of element WIDTH, which is exactly
 * right at the aspect it was measured at and wrong everywhere else: hold the
 * width and double the height and the glow keeps its size while the frame it
 * sits in grows, so a phone gets a dot low in an empty field. The scene is
 * therefore scaled by
 *
 *     unit = (aspect / REF_ASPECT) ^ Fit,      aspect = height / width
 *
 * and every position divided by it, so `Fit = 0` reproduces the old
 * width-locked framing exactly, `Fit = 1` locks the scene to HEIGHT instead
 * (glow keeps a constant fraction of the frame's height at any width), and the
 * shipped `Fit = 0.5` is the geometric mean of the two. The two demands really
 * do pull opposite ways and no single number satisfies both: glow size wants
 * height, and horizon curvature wants width — a planet edge crossing a narrow
 * frame IS nearly straight, so the arc flattening out on a phone is correct,
 * not a regression. Fit is the dial between them.
 */

/* ------------------------------------------------------------------ *
 * Measured constants. Each of these came out of the reference frame,
 * not off the top of my head — the derivation is in the comment.
 * ------------------------------------------------------------------ */

/** Page background. Sampled at all four corners: every one returned rgb(8,8,10). */
const BG = "#08080A"

/**
 * Horizon apex, as a fraction of element height. The brightest pixel sat at
 * y=0.7047 and the disc edge at y=0.7055 — i.e. the light is *on* the edge.
 */
const HORIZON_Y = 0.7055

/**
 * Disc radius in scene units. Fitted, not eyeballed: the measured edge at
 * dx = 0, ±120, ±250, ±400px solves to a circle of R ≈ 5341px with its centre
 * 6268px below the top of a 2860px-wide frame. 5341/2860 = 1.867. Re-checked
 * against the ±250 and ±120 samples — both land within 1px.
 */
const HORIZON_R = 1.867

/** Core white. Brightest pixel measured rgb(255,254,255). */
const CORE_COLOR = "#FFFFFF"
/** Mid lavender. Sampled 6px off the core: rgb(230,204,252) → normalised. */
const MID_COLOR = "#B79BFA"
/** Deep indigo of the outer plumes. Sampled at r≈128px: rgb(28,18,34), lifted. */
const DEEP_COLOR = "#3A2A78"

/**
 * Rim falloff in scene units. Measured along the horizon at y=922: the rim is
 * rgb(65,53,84) at dx=0.009W, rgb(17,14,25) by 0.035W and indistinguishable
 * from background past 0.245W — an exponential with a ~0.035 constant.
 */
const RIM_SPREAD = 0.035

/**
 * Aspect (height/width) of the capture every constant above was measured on:
 * 1314 / 2860. The responsive fit is expressed relative to this, so at this
 * aspect `unit` is exactly 1 and the frame is bit-for-bit the measured one
 * whatever Fit is set to.
 */
const REF_ASPECT = 1314 / 2860

/* Quality tiers, not design controls (rule 10) — picked, not exposed. */
const MAX_DPR = 2
/** Everything here is a soft gradient, so under-rendering costs nothing visible. */
const RENDER_SCALE = 0.6
/** Ceiling on the 26-step march: a 2560-wide retina frame would else cost 5.3M px. */
const PIXEL_BUDGET = 2_200_000

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

/**
 * GLSL ES 1.00 on purpose. Headless capture backends fall back to SwiftShader
 * often enough that WebGL2-only syntax is a real risk, and nothing here needs
 * it — the integer-hash noise their build uses is replaced with a float hash.
 */
const FRAG = `
precision highp float;

varying vec2 vUv;

uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;      // -0.5..0.5, already smoothed on the CPU
uniform float uHover;      // 0..1 eased presence
uniform float uBright;
uniform float uHorizonY;
uniform float uHorizonR;
uniform float uHaze;
uniform float uCoreSize;
uniform float uCoreHover;
uniform float uRimSpread;
uniform float uParallax;
uniform float uFit;        // 0 = width-locked, 1 = height-locked
uniform vec3  uBg;
uniform vec3  uCore;
uniform vec3  uMid;
uniform vec3  uDeep;

const int STEPS = 26;
const float REF_ASPECT = ${REF_ASPECT.toFixed(6)};

float hash31(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash31(i);
  float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z);
}

float fbm(vec3 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * vnoise(p);
    p = p * 2.02;
    p.xz = mat2(0.80, 0.60, -0.60, 0.80) * p.xz;
    a *= 0.5;
  }
  return s;
}

float hash21(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

vec3 tonemapTanh(vec3 x) {
  x = clamp(x, -12.0, 12.0);
  vec3 e2 = exp(2.0 * x);
  return (e2 - 1.0) / (e2 + 1.0);
}

void main() {
  // Scene space. x spans -0.5..0.5 across the element and y uses the SAME
  // scale, so the disc stays circular whatever box Framer hands us — nothing
  // here reads a CSS ratio.
  float aspect = uRes.y / uRes.x;
  // gl_Position is y-up, so vUv.y is 0 at the BOTTOM. Every measurement that
  // fed the constants above is top-down image space, so flip once, here.
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);

  // ---- Responsive fit.
  //
  // Divides the whole scene, so the measured constants never move: a feature
  // measured at |P| = r sits at r * unit of the element's width. unit = 1 at
  // the reference aspect for every Fit, so the capture frame is reproduced
  // exactly whatever this dial says.
  //   Fit = 0 -> unit 1        : width-locked, the framing before this existed
  //   Fit = 1 -> aspect/REF    : height-locked, constant fraction of the height
  //   Fit = 0.5 (shipped)      : geometric mean of the two
  // Clamped because the two ends are 6:1 banners and 1:3 phone rails, where an
  // unclamped power either buries the glow or fills the frame with its core.
  float unit = clamp(pow(max(aspect, 0.0001) / REF_ASPECT, uFit), 0.45, 3.2);
  float inv = 1.0 / unit;

  vec2 P = vec2(uv.x - 0.5, (uv.y - uHorizonY) * aspect) * inv;
  // Scene units per BUFFER pixel. Every "is this feature still thicker than a
  // pixel" question below is asked against this, which is what keeps thin
  // geometry legible on a 390px frame instead of aliasing away.
  float pxUnit = inv / max(uRes.x, 1.0);

  // ---- Hover.
  //
  // Measured, not assumed. Driving the live page with a real pointer and
  // capturing six positions showed hover is a PRESENCE response, not a
  // proximity one: every hovered position saturates the core to white and
  // widens the rim about fourfold, while the pointer's own position barely
  // moves the glow (peak x ranged 0.491..0.502W across left/centre/right).
  // So hover lerps an entire parameter set, and the positional term is small.
  //
  // Rest -> hover targets, all read off the two captures:
  //   rim reaches      0.035 -> 0.38    (exp constant 28.6 -> 7.5)
  //   saturated core   ~0    -> 0.056 wide, 0.027 tall
  //   below the edge   (1,4,0) -> (103,71,124), decaying as exp(-75*depth)
  //   haze at y=0.58   (31,20,37) -> (138,118,187)
  float hv = clamp(uHover, 0.0, 1.0);
  // uMouse is a fraction of the ELEMENT, so scale it into scene units: the
  // parallax then travels the same fraction of the frame at every aspect.
  vec2 m = uMouse * hv * uParallax * inv;

  float coreSize  = mix(uCoreSize, uCoreHover, hv);
  float rimSpread = mix(uRimSpread, 0.220, hv);
  float rimGain   = mix(0.55, 1.9, hv);
  float hazeGain  = mix(1.15, 9.00, hv);
  float hazeK     = mix(20.0, 19.0, hv);
  float hazeCut0  = mix(0.21, 0.40, hv);
  float hazeCut1  = mix(0.13, 0.28, hv);

  vec3 col = uBg;

  // ---- L1: the core. brightness = radius / distance, per their point light.
  // The positional term is deliberately small — see the measurement above.
  vec2 corePos = vec2(m.x * 0.015, m.y * 0.007);
  float d = length(P - corePos);
  float g = coreSize / max(d, 0.0009);
  g = mix(g, g * g, 0.55);          // tightens the falloff toward the centre
  // 1/d never reaches zero. At rest the radius is small enough that this does
  // not matter; at hover it is 15x bigger and was lifting the far field to
  // 12/255 against a measured background of 8. Cut it where the reference ends.
  g *= mix(1.0, smoothstep(0.46, 0.28, d), hv);
  g *= uBright;

  vec3 glowCol = mix(uDeep, uMid, clamp(g * 2.4, 0.0, 1.0));
  glowCol = mix(glowCol, uCore, clamp((g - 0.30) * 1.7, 0.0, 1.0));
  col += glowCol * g;

  // ---- L2: volumetric plumes. March toward the light and accumulate emission.
  vec3 ro = vec3(0.0, 0.0, -1.6);
  vec3 rd = normalize(vec3(P - corePos, 1.2));
  float t = 0.28;
  float stepSize = 0.085;
  float trans = 1.0;
  vec3 haze = vec3(0.0);
  vec2 drift = m * 0.16;

  for (int i = 0; i < STEPS; i++) {
    if (trans < 0.02) break;
    vec3 pos = ro + rd * t;
    // Anisotropic sample: squashing y stretches the noise features vertically,
    // which is what turns a smooth dome into the columnar tendrils the
    // reference actually shows.
    vec3 q = pos * vec3(3.2, 1.75, 3.2);
    q.y -= uTime * 0.10;            // plumes rise
    q.z += uTime * 0.035;           // and slowly evolve
    q.xy += drift;

    float dens = fbm(q);
    dens = smoothstep(0.47, 0.83, dens);

    float dl = length(pos.xy * vec2(1.0, 0.72));
    float li = 1.0 / (1.0 + dl * dl * 110.0);

    vec3 lc = mix(uDeep, uMid, clamp(li * 1.6, 0.0, 1.0));
    lc += vec3(0.16, 0.05, -0.04) * (1.0 - dens) * li * 0.5;

    haze += dens * li * lc * trans * stepSize;
    trans *= 1.0 - dens * 0.28;
    t += stepSize;
  }
  // Envelope fitted to the rest capture (predicts 45.6/31.1/17.1/5.0 where it
  // reads 47/30/17/5) and widened to the hover capture by the lerps above.
  float hazeEnv = exp(-d * hazeK) * smoothstep(hazeCut0, hazeCut1, d);
  col += haze * uHaze * hazeEnv * hazeGain;

  // ---- L3: the occluding disc. Negative inside == below the horizon.
  float discD = length(P - vec2(corePos.x, uHorizonR)) - uHorizonR;
  float aa = 1.4 * pxUnit;
  float above = smoothstep(-aa, aa, discD);

  // Falls off to either side of the core; shared by the rim and the ground
  // bleed, because both are the same light spilling over the same edge.
  float rimDx = abs(P.x - corePos.x);
  // Shared base: how far the spilled light reaches to either side of the core.
  float rimBase = exp(-rimDx / max(rimSpread, 0.001));
  rimBase *= mix(1.0, smoothstep(0.40, 0.26, rimDx), hv);
  // The rim proper is an annulus — weaker under the core, brightest further
  // out. Softened to 0.38 rather than zeroed: zeroing punched a visible dark
  // notch straight through the middle of the arc, which the reference has not.
  float rimFall = rimBase * mix(1.0, mix(0.22, 1.0, smoothstep(0.0, 0.18, rimDx)), hv);

  // Sharpness ceiling for everything that hugs the edge. These constants are
  // reciprocal WIDTHS in scene units, so on a small frame 1/620 can land under
  // one pixel and the rim quietly aliases out of existence. Cap each so its
  // band stays ~1.4 device px wide; on a desktop frame the cap is ~2400 and
  // never binds, so nothing about the measured look changes.
  float kMax = 0.7 / max(pxUnit, 1e-7);

  // At rest the disc is background with a dark band hugging the edge. Under
  // hover the edge visibly LEAKS onto it — measured (103,71,124) just below,
  // decaying as exp(-75*depth) — so the ground gains a glow rather than only
  // losing light.
  float shade = exp(min(discD, 0.0) * min(340.0, kMax));
  float bleed = exp(min(discD, 0.0) * min(95.0, kMax)) * rimBase * hv * 0.85;
  vec3 ground = uBg * (1.0 - 0.85 * clamp(shade, 0.0, 1.0)) + uMid * bleed;
  col = mix(ground, col, above);

  // ---- L4: rim light hugging the edge.
  // Two components, because one exponential cannot be both bright at the edge
  // and wide along it: a thin ring (their L4) plus a broad soft glow.
  float rimThin  = exp(-abs(discD) * min(mix(620.0, 150.0, hv), kMax));
  float rimBroad = exp(-abs(discD) * min(mix(620.0, 22.0, hv), kMax));
  float rimBand  = rimThin + mix(0.0, 0.26, hv) * rimBroad;
  col += uMid * rimBand * rimFall * rimGain * above * uBright;

  // ---- L5: tonemap, then dither. Without the dither a gradient this shallow
  // over near-black banks visibly on an 8-bit display.
  col = tonemapTanh(col);
  col += (hash21(gl_FragCoord.xy) - 0.5) / 255.0;

  gl_FragColor = vec4(col, 1.0);
}
`

function hexToRgb(hex: string): [number, number, number] {
  const fallback: [number, number, number] = [0, 0, 0]
  if (typeof hex !== "string") return fallback
  let body = hex.trim().replace(/^#/, "")
  if (body.length === 3) body = body.split("").map((c) => c + c).join("")
  if (body.length < 6) return fallback
  const n = parseInt(body.slice(0, 6), 16)
  if (Number.isNaN(n)) return fallback
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)
  if (!sh) return null
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    // Surfaced rather than swallowed: a silent shader failure and a working
    // component look identical from the outside (both draw nothing).
    console.error("BeyondHorizon shader:", gl.getShaderInfoLog(sh))
    gl.deleteShader(sh)
    return null
  }
  return sh
}

export interface BeyondHorizonProps {
  background?: string
  coreColor?: string
  midColor?: string
  deepColor?: string
  brightness?: number
  coreSize?: number
  coreHover?: number
  haze?: number
  speed?: number
  parallax?: number
  /** Whole-number percent: 0 = width-locked, 100 = height-locked. */
  fit?: number
  horizonY?: number
  horizonRadius?: number
  rimSpread?: number
  style?: React.CSSProperties
}

export function BeyondHorizon(props: BeyondHorizonProps) {
  const {
    background = "#08080A",
    coreColor = "#FFFFFF",
    midColor = "#B79BFA",
    deepColor = "#3A2A78",
    brightness = 2,
    coreSize = 0.02,
    coreHover = 0.04,
    haze = 3,
    speed = 1,
    parallax = 3,
    fit = 50,
    horizonY = 0.7055,
    horizonRadius = 1.867,
    rimSpread = 0.035,
    style,
  } = props

  const hostRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Pointer state lives in a ref, not state: a moving pointer must not re-render
  // React 60x a second just to move a uniform.
  const pointer = useRef({ tx: 0, ty: 0, x: 0, y: 0, thover: 0, hover: 0 })

  const colors = useMemo(
    () => ({
      bg: hexToRgb(background),
      core: hexToRgb(coreColor),
      mid: hexToRgb(midColor),
      deep: hexToRgb(deepColor),
    }),
    [background, coreColor, midColor, deepColor]
  )

  // Live prop mirror, so prop edits take effect without tearing down the GL
  // context (which would flash the canvas black on every slider drag).
  const live = useRef({
    colors, brightness, coreSize, coreHover, haze, speed, parallax, fit,
    horizonY, horizonRadius, rimSpread,
  })
  live.current = {
    colors, brightness, coreSize, coreHover, haze, speed, parallax, fit,
    horizonY, horizonRadius, rimSpread,
  }

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas) return

    const gl =
      (canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "high-performance" }) as WebGLRenderingContext | null) ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null)
    if (!gl) {
      console.error("BeyondHorizon: no WebGL context")
      return
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return
    const prog = gl.createProgram()
    if (!prog) return
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("BeyondHorizon link:", gl.getProgramInfoLog(prog))
      return
    }
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(prog, "aPos")
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const U = (n: string) => gl.getUniformLocation(prog, n)
    const u = {
      res: U("uRes"), time: U("uTime"), mouse: U("uMouse"), hover: U("uHover"),
      bright: U("uBright"), horizonY: U("uHorizonY"), horizonR: U("uHorizonR"),
      haze: U("uHaze"), coreSize: U("uCoreSize"), coreHover: U("uCoreHover"),
      rimSpread: U("uRimSpread"), parallax: U("uParallax"), fit: U("uFit"),
      bg: U("uBg"), core: U("uCore"), mid: U("uMid"), deep: U("uDeep"),
    }

    let w = 0
    let h = 0

    /**
     * The zero-height trap: a canvas at height:100% inside a parent that never
     * resolved a height measures 0, WebGL draws into a 0x0 buffer, and the frame
     * comes back blank with no error anywhere. Measuring the host and flooring
     * the result is what stops that being silent.
     *
     * offsetWidth/offsetHeight, never getBoundingClientRect: the builder stage
     * renders under a CSS transform, and the rect carries that zoom — sizing the
     * backing store from it makes the buffer track the canvas zoom level.
     */
    const resize = () => {
      const cssW = Math.max(1, Math.round(host.offsetWidth || 1))
      const cssH = Math.max(1, Math.round(host.offsetHeight || 1))
      const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, MAX_DPR)
      // Never below 1 device px per CSS px — the rim is a thin feature and a
      // 0.6x buffer on a non-retina phone aliases it away.
      const scale = Math.min(Math.max(RENDER_SCALE * dpr, 1), MAX_DPR)
      let nw = Math.max(2, Math.round(cssW * scale))
      let nh = Math.max(2, Math.round(cssH * scale))
      // Area budget rather than a per-axis cap: a 26-step march over a 2560px
      // retina frame is 5.3M fragments, and a per-axis clamp would squash the
      // aspect the whole composition is fitted to.
      const over = (nw * nh) / PIXEL_BUDGET
      if (over > 1) {
        const s = Math.sqrt(1 / over)
        nw = Math.max(2, Math.round(nw * s))
        nh = Math.max(2, Math.round(nh * s))
      }
      if (nw === w && nh === h) return false
      w = nw
      h = nh
      canvas.width = w
      canvas.height = h
      gl.viewport(0, 0, w, h)
      return true
    }

    const draw = (tSec: number) => {
      const L = live.current
      const p = pointer.current
      gl.uniform2f(u.res, w, h)
      gl.uniform1f(u.time, tSec * L.speed)
      gl.uniform2f(u.mouse, p.x, p.y)
      gl.uniform1f(u.hover, p.hover)
      gl.uniform1f(u.bright, L.brightness)
      gl.uniform1f(u.horizonY, L.horizonY)
      gl.uniform1f(u.horizonR, L.horizonRadius)
      gl.uniform1f(u.haze, L.haze)
      gl.uniform1f(u.coreSize, L.coreSize)
      gl.uniform1f(u.coreHover, L.coreHover)
      gl.uniform1f(u.rimSpread, L.rimSpread)
      gl.uniform1f(u.parallax, L.parallax)
      gl.uniform1f(u.fit, Math.min(Math.max(L.fit, 0), 100) / 100)
      gl.uniform3fv(u.bg, L.colors.bg)
      gl.uniform3fv(u.core, L.colors.core)
      gl.uniform3fv(u.mid, L.colors.mid)
      gl.uniform3fv(u.deep, L.colors.deep)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    let raf = 0
    let lastT = 0
    let start = 0

    resize()
    // Paint before the first animation frame lands, so the element never
    // shows a blank canvas while the RAF loop spins up.
    draw(0)

    // Resize is observer-driven, not per-frame: offsetWidth in the rAF loop is
    // a forced layout every frame, and the size only ever changes on a real
    // reflow (breakpoint, orientation flip, panel drag).
    const onResize = () => {
      if (resize()) draw(lastT)
    }
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null
    ro?.observe(host)
    // Fallback for the observer-less case, and for a DPR change (moving the
    // window to a different-density display) that no element resize reports.
    window.addEventListener("resize", onResize)

    const loop = (now: number) => {
      if (!start) start = now
      lastT = (now - start) / 1000
      const p = pointer.current
      // Critically damped-ish easing; without it the parallax snaps and reads
      // as a glitch rather than as the scene leaning toward you.
      p.x += (p.tx - p.x) * 0.06
      p.y += (p.ty - p.y) * 0.06
      p.hover += (p.thover - p.hover) * 0.05
      draw(lastT)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      ro?.disconnect()
      window.removeEventListener("resize", onResize)
      gl.deleteProgram(prog)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.deleteBuffer(buf)
    }
  }, [])

  /**
   * A touch has no hover: a finger that taps and lifts would otherwise leave the
   * presence state latched on, because pointerleave is not guaranteed after a
   * touch sequence. So touch drives the state only while the finger is DOWN, and
   * the release is bound on window — a finger that slides off the component
   * still ends the gesture (rule K).
   */
  const touching = useRef(false)

  useEffect(() => {
    const end = () => {
      if (!touching.current) return
      touching.current = false
      const p = pointer.current
      p.tx = 0
      p.ty = 0
      p.thover = 0
    }
    window.addEventListener("pointerup", end)
    window.addEventListener("pointercancel", end)
    return () => {
      window.removeEventListener("pointerup", end)
      window.removeEventListener("pointercancel", end)
    }
  }, [])

  /**
   * Pointer mapping is done in RATIOS of the live bounding rect, never in raw
   * pixels. The builder stage renders the component under a CSS transform, so
   * getBoundingClientRect is post-scale while the canvas backing store is not —
   * dividing by the same rect the event was measured against cancels the scale
   * out entirely and the parallax lands where the cursor actually is.
   */
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const host = hostRef.current
    if (!host) return
    const coarse = e.pointerType === "touch" || e.pointerType === "pen"
    if (coarse) {
      if (e.type === "pointerdown") touching.current = true
      else if (!touching.current) return
    }
    const r = host.getBoundingClientRect()
    if (!r.width || !r.height) return
    const p = pointer.current
    p.tx = (e.clientX - r.left) / r.width - 0.5
    p.ty = (e.clientY - r.top) / r.height - 0.5
    p.thover = 1
  }

  const onLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    if (touching.current && e.pointerType !== "mouse") return
    const p = pointer.current
    p.tx = 0
    p.ty = 0
    p.thover = 0
  }

  return (
    <div
      ref={hostRef}
      onPointerMove={onMove}
      onPointerEnter={onMove}
      onPointerDown={onMove}
      onPointerLeave={onLeave}
      style={{
        position: "relative",
        // Floor BEFORE the spread, so an explicit size on the instance still
        // wins: a 100% root collapses to 0x0 under Framer's Fit Content sizing.
        minWidth: 1200,
        minHeight: 800,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background,
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
      />
    </div>
  )
}

export default BeyondHorizon
