"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * CloudSkySunsetSunset — CloudSkySunset at golden hour. The sun sits low as a visible disc
 * over a warm horizon band, and the same discrete cumulus are now BACKLIT:
 * crowns fall into dusky silhouette against the bright sky, undersides catch
 * the low sun, and the fringes nearest the sun burn into a silver lining.
 *
 * Variation 1 of 3 on 19/CloudSkySunset.tsx. Inherited verbatim: the cell-grid puff
 * clusters with the asymmetric flat base, the fbm edge erosion, the soft-max
 * puff height, the two cumulus layers with aerial perspective as a mix toward
 * the sky, the one-step-up self-shadow sample, the cirrus veil, the per-layer
 * drift accumulators and the pointer parallax + wind. Changed:
 *
 *  - LIGHT COMES FROM BELOW. The base lights a puff from above (white crown,
 *    grey base). Here the crown darkens toward Accent-over-sky with Shadow,
 *    and the underside adds Glow, strongest near the sun — a low sun lights
 *    the bottoms of clouds, not their tops.
 *  - SILVER LINING: a * (1 - a) * 4 peaks on the half-transparent fringe and
 *    is zero in the solid body, so it lights only the thin edge, scaled by
 *    proximity to the sun.
 *  - The sun is a disc (SUN_R of the frame height) over two glow terms, plus a
 *    warm band along the horizon under its azimuth. Clouds pass in front of it
 *    for free: they are mixed over the sky.
 *  - Cirrus takes the glow's colour — high veils catch the last light pink.
 *
 * Accent Color is the cloud BODY here, a dusky tone, not white: the light on
 * the clouds is the Sun group's Glow.
 *
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */

const MAX_DPR = 2

// Found on a parameter grid; the look depends on these, so they are named.
const PUFF_UP = 0.34 // ellipse radius above the puff centre
const PUFF_DOWN = 0.19 // ...and below it. The gap IS the flat cumulus base.
const ERODE = 0.7 // how hard the fbm eats into the blob edge
const SHADOW_STEP = 0.085 // how far above a pixel the self-shadow samples
const NEAR_CELL = 1.05 // cells across the short side, near layer
const FAR_CELL = 2.15 // ...and far layer
const FAR_MIX = 0.55 // aerial perspective: far cloud mixed toward the sky
const NEAR_DRIFT = 0.055 // cells/sec at Speed 50
const FAR_DRIFT = 0.026
const CIRRUS_DRIFT = 0.014
// A puff's half-width in cells. Clamped so the 5x5 neighbourhood below is
// PROVABLY enough: a puff at cell offset o reaches this pixel whenever its
// half-width exceeds |o| - 0.85, so a cell at |o| = 3 can only matter once w
// passes 2.15. Uncapped, w hits 0.72 * 3.0 = 2.16 at Size 300 and the widest
// puffs get silently dropped -- measured against a wide-window ground truth,
// 0.025% of pixels wrong with a worst error of 0.40, which paints as one hard
// arc through the cloud.
const PUFF_WMAX = 2.15
// Sharpness of the soft-max that blends each puff's height contribution. See
// blobs(): winner-take-all is what put the creases in the cloud body. Picked on
// a sweep -- at 12 the crease count is 0 at every Size while the puff's own
// top-to-bottom gradient keeps 91% of its spread; lower blurs the gradient away,
// higher lets the jump climb back.
const SHADE_BLEND = 12.0
const SUN_R = 0.035 // sun disc radius, fraction of frame height

const VERT_SRC = `
attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
`

const FRAG_SRC = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uRes;
uniform float uNearX, uFarX, uCirrusX;
uniform float uCoverage, uSize, uSoftness, uShadow, uCirrus;
uniform vec3 uZenith, uHorizon, uCloud;
uniform vec4 uGlow;
uniform vec2 uSun;
uniform vec2 uParallax;

// No sin() in the hash: fract(sin(x) * k) quantizes hard once the argument gets
// large, and the cell ids run far off the origin as the sky drifts.
vec2 hash22(vec2 p){
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.xx + q.yz) * q.zy);
}

float hash12(vec2 p){
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float vnoise(vec2 x){
  vec2 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x),
             mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p){
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 4; i++){
    s += a * vnoise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return s;
}

// One hashed puff cluster per cell, walked over the neighbourhood so a puff near
// an edge is still drawn by the cell next door. Most cells are empty -- that is
// what leaves real sky between the clouds.
// Returns (coverage, height within the puff). The second component is what shades
// the cloud: -1 at its base, +1 at its crown. Without it the only shading signal
// is "is there cloud above me", which is true almost everywhere inside a puff, so
// the whole body goes grey and only a one-pixel rim stays white.
//
// THE WINDOW is 5x5, not 3x3, with an exact reach test that skips a cell before
// it costs a hash. A 3x3 window only serves puffs up to 1.85 cells wide; past
// that the widest puffs are dropped and their ellipses end on a hard arc. The
// test is |o| <= w + 0.85, so small sizes cost LESS than the old 3x3 (at Size 20
// only the centre cell can reach at all) and only Size 200+ pays for the ring.
//
// THE HEIGHT is a soft-max blend over every puff, not the nearest puff's. Taking
// it from the winner makes it jump the instant two overlapping puffs swap which
// one is nearest -- measured up to 1.43 across a single pixel -- and shadeCloud
// turns that discontinuity into a hard crease straight across the cloud body.
// That is what appears as Size grows: at Size 100 the puffs barely overlap and
// there are none, at 200 there are 458 and at 300 there are 1585.
//
// The soft-max is the ONLINE form, rescaling the running sums whenever a new
// best arrives, so the dominant weight is always exactly 1.0 and the sums stay
// in [1, 25]. The plain exp(K * val) form overflows outright on a mediump
// fragment path, and its smallest weights flush to zero exactly at the cloud
// edge where the height still has to be right.
vec2 blobs(vec2 uv, float seed){
  vec2 id = floor(uv), f = fract(uv);
  // Sentinel stays small: -1e9 is outside mediump's guaranteed range, and val
  // never falls below about -50 here.
  float best = -1e4;
  float wsum = 0.0, ysum = 0.0;
  float wMax = min(${PUFF_WMAX.toFixed(3)}, 0.72 * uSize);
  float reach = min(2.0, ceil(wMax + 0.85) - 1.0);
  for (int j = -2; j <= 2; j++){
    for (int i = -2; i <= 2; i++){
      vec2 o = vec2(float(i), float(j));
      if (max(abs(o.x), abs(o.y)) > reach) continue;
      vec2 h = hash22(id + o + seed);
      // Coverage decides how many cells hold a cloud at all.
      if (fract(h.x * 37.1) > uCoverage) continue;
      vec2 c = o + 0.15 + h * 0.7;
      float w = min(${PUFF_WMAX.toFixed(3)}, (0.30 + 0.42 * fract(h.y * 19.7)) * uSize);
      vec2 d = f - c;
      // Asymmetric about the centre: tall above, short below. That gap is the
      // flat base a cumulus has and a noise field never produces.
      float ry = (d.y > 0.0 ? ${PUFF_UP.toFixed(3)} : ${PUFF_DOWN.toFixed(3)}) * uSize * (0.8 + 0.5 * fract(h.y * 7.3));
      float e = length(vec2(d.x / max(w, 1e-3), d.y / max(ry, 1e-3)));
      float val = 1.0 - e;
      float yN = d.y / max(ry, 1e-3);
      if (val > best){
        float k = exp(${SHADE_BLEND.toFixed(1)} * (best - val));
        wsum = wsum * k + 1.0;
        ysum = ysum * k + yN;
        best = val;
      } else {
        float g = exp(${SHADE_BLEND.toFixed(1)} * (val - best));
        wsum += g;
        ysum += g * yN;
      }
    }
  }
  return vec2(best, ysum / max(wsum, 1e-4));
}

// Blobs decide WHERE, noise decides the OUTLINE.
vec2 cloudField(vec2 uv, float seed, float detailScale){
  vec2 b = blobs(uv, seed);
  // Two bands: the coarse one dents the silhouette into lobes, the fine one
  // frays it. One band alone gives either a wobbly outline or fuzz, never the
  // feathered edge a cumulus has.
  float n = fbm(uv * detailScale + seed * 3.1) * 0.72
          + fbm(uv * detailScale * 3.3 + seed * 7.7) * 0.28;
  return vec2(b.x - (1.0 - n) * ${ERODE.toFixed(3)}, b.y);
}

// Backlit by a low sun: the crown goes to silhouette, the base catches the
// light, and the half-transparent fringe near the sun burns bright.
vec3 shadeDusk(float dyNorm, vec3 sky, vec2 p, vec2 sunP, float a){
  float crown = smoothstep(-0.2, 0.9, dyNorm);
  float under = 1.0 - smoothstep(-0.9, 0.4, dyNorm);
  vec3 body = mix(uCloud, mix(uCloud * 0.55, sky, 0.25), uShadow * crown);
  float near = exp(-length(p - sunP) * 1.4);
  vec3 g = uGlow.rgb * uGlow.a;
  body += g * under * (0.25 + 0.55 * near);
  // The lining falls off far faster than the underside light: only clouds
  // actually crossing the sun get the burning edge, not a halo on all of them.
  float rimNear = exp(-length(p - sunP) * 3.2);
  body += g * a * (1.0 - a) * 4.0 * rimNear * 1.2;
  return body;
}

void main(){
  vec2 frag = gl_FragCoord.xy / max(uRes.y, 1.0);
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 p = vec2(frag.x, frag.y);

  // ---- sky ---------------------------------------------------------------
  vec3 sky = mix(uHorizon, uZenith, smoothstep(-0.05, 0.95, p.y));
  vec2 sunP = vec2(uSun.x * aspect, uSun.y);
  float sd = length(p - sunP);
  vec3 g = uGlow.rgb * uGlow.a;
  // Warm band along the horizon, strongest under the sun.
  float band = exp(-max(p.y, 0.0) * 3.0) * exp(-abs(p.x - sunP.x) * 0.9);
  sky = mix(sky, uGlow.rgb, band * 0.35 * uGlow.a);
  sky += g * (exp(-sd * 2.2) * 0.45 + exp(-sd * 9.0) * 0.5);
  float disc = 1.0 - smoothstep(${SUN_R.toFixed(4)} - 0.003, ${SUN_R.toFixed(4)} + 0.003, sd);
  sky = mix(sky, vec3(1.0, 0.97, 0.9), disc * uGlow.a);

  vec3 col = sky;

  // ---- cirrus, catching the last light ------------------------------------
  if (uCirrus > 0.0) {
    vec2 cuv = vec2(p.x * 1.4 + uCirrusX, p.y * 5.5);
    float veil = fbm(cuv) * fbm(cuv * 2.3 + 9.0);
    veil = smoothstep(0.24, 0.55, veil) * smoothstep(0.15, 0.7, p.y);
    col = mix(col, mix(uCloud, uGlow.rgb, 0.6), veil * uCirrus * 0.5);
  }

  // ---- far cumulus -------------------------------------------------------
  vec2 fuv = vec2(p.x + uFarX, p.y) * ${FAR_CELL.toFixed(3)} + uParallax * 0.4;
  vec2 fd = cloudField(fuv, 17.0, 11.0);
  float fa = clamp(fd.x * uSoftness, 0.0, 1.0);
  if (fa > 0.0) {
    vec3 lit = shadeDusk(fd.y, sky, p, sunP, fa);
    col = mix(col, mix(lit, sky, ${FAR_MIX.toFixed(3)}), fa);
  }

  // ---- near cumulus ------------------------------------------------------
  vec2 nuv = vec2(p.x + uNearX, p.y) * ${NEAR_CELL.toFixed(3)} + uParallax;
  vec2 nd = cloudField(nuv, 3.0, 8.5);
  float na = clamp(nd.x * uSoftness, 0.0, 1.0);
  if (na > 0.0) {
    vec3 lit = shadeDusk(nd.y, sky, p, sunP, na);
    float above = clamp(cloudField(nuv + vec2(0.0, ${SHADOW_STEP.toFixed(3)}), 3.0, 8.5).x * uSoftness, 0.0, 1.0);
    lit *= 1.0 - 0.18 * uShadow * above;
    col = mix(col, lit, na);
  }

  gl_FragColor = vec4(col, 1.0);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("CloudSkySunset shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

type RGBA = [number, number, number, number]

function parseColor(input: string | undefined, fb: RGBA): RGBA {
    if (!input) return fb
    const str = String(input).trim()
    if (str.charAt(0) === "#") {
        let hex = str.slice(1)
        if (hex.length === 3 || hex.length === 4) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2] + (hex.length === 4 ? hex[3] + hex[3] : "")
        }
        if (hex.length >= 6) {
            const r = parseInt(hex.slice(0, 2), 16)
            const g = parseInt(hex.slice(2, 4), 16)
            const b = parseInt(hex.slice(4, 6), 16)
            const a = hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r / 255, g / 255, b / 255, a]
        }
        return fb
    }
    const m = str.match(/[\d.]+/g)
    if (m && m.length >= 3) {
        return [
            Math.min(255, parseFloat(m[0])) / 255,
            Math.min(255, parseFloat(m[1])) / 255,
            Math.min(255, parseFloat(m[2])) / 255,
            m.length >= 4 ? Math.min(1, parseFloat(m[3])) : 1,
        ]
    }
    return fb
}

function num(v: unknown, fb: number): number {
    return typeof v === "number" && isFinite(v) ? v : fb
}

function clampN(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v
}

type Clouds = { softness?: number; shadow?: number; cirrus?: number }
type Sun = { x?: number; y?: number; glow?: string }
type Pointer = { parallax?: number; wind?: number; damping?: number }

const CLOUD_DEFAULTS: Required<Clouds> = { softness: 100, shadow: 100, cirrus: 45 }
const SUN_DEFAULTS: Required<Sun> = { x: 62, y: 14, glow: "rgba(255, 186, 112, 0.95)" }
const POINTER_DEFAULTS: Required<Pointer> = { parallax: 100, wind: 100, damping: 20 }

interface Props {
    style?: React.CSSProperties
    width?: number
    height?: number
    background?: string
    baseColor?: string
    accentColor?: string
    density?: number
    speed?: number
    size?: number
    clouds?: Clouds
    sun?: Sun
    pointer?: Pointer
}

export default function CloudSkySunset(props: Props) {
    const {
        style,
        background = "#23254F",
        baseColor = "#FF8A4C",
        accentColor = "#5B3F63",
        density = 50,
        speed = 50,
        size = 100,
        clouds = {"cirrus":45,"shadow":100,"softness":100},
        sun = {"x":62,"y":14,"glow":"rgba(255, 186, 112, 0.95)"},
        pointer = {"wind":100,"damping":20,"parallax":100},
        width,
        height,
    } = props

    // A group the designer never opened arrives undefined; spread-merging over a
    // typed literal beats a hand-written ?? chain, where one missed key silently
    // pins a control forever.
    const clouds_ = { ...CLOUD_DEFAULTS, ...(clouds || {}) }
    const sun_ = { ...SUN_DEFAULTS, ...(sun || {}) }
    const pointer_ = { ...POINTER_DEFAULTS, ...(pointer || {}) }

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    // Every live input is read from a ref inside the loop. Putting any of them in
    // the effect deps would rebuild the GL context on every colour tweak.
    const vRef = useRef<Record<string, number | string>>({})
    vRef.current = {
        zenith: background,
        horizon: baseColor,
        cloud: accentColor,
        glow: sun_.glow,
        coverage: clampN(num(density, 55), 0, 100) / 100,
        speed: clampN(num(speed, 50), 0, 100) / 50,
        size: clampN(num(size, 100), 20, 300) / 100,
        softness: 4.5 / Math.max(0.15, clampN(num(clouds_.softness, 100), 20, 300) / 100),
        shadow: clampN(num(clouds_.shadow, 100), 0, 200) / 100,
        cirrus: clampN(num(clouds_.cirrus, 45), 0, 100) / 100,
        sunX: clampN(num(sun_.x, 78), 0, 100) / 100,
        sunY: clampN(num(sun_.y, 92), 0, 100) / 100,
        parallax: clampN(num(pointer_.parallax, 100), 0, 300) / 100,
        wind: clampN(num(pointer_.wind, 100), 0, 300) / 100,
        damping: clampN(num(pointer_.damping, 20), 1, 100),
    }

    const ptrRef = useRef({ x: 0, y: 0, inside: false })

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false })
        if (!gl) {
            console.error("CloudSkySunset: WebGL unavailable")
            return
        }

        const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC)
        const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC)
        if (!vs || !fs) return
        const prog = gl.createProgram()
        if (!prog) return
        gl.attachShader(prog, vs)
        gl.attachShader(prog, fs)
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("CloudSkySunset link:", gl.getProgramInfoLog(prog))
            return
        }
        gl.useProgram(prog)

        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        const aPos = gl.getAttribLocation(prog, "a_pos")
        gl.enableVertexAttribArray(aPos)
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

        const locs: Record<string, WebGLUniformLocation | null> = {}
        const u = (name: string) => {
            if (!(name in locs)) locs[name] = gl.getUniformLocation(prog, name)
            return locs[name]
        }

        let raf = 0
        let last = performance.now()
        // Each layer keeps its OWN accumulator, wrapped on the CPU. One shared
        // clock scaled per layer would jump every time Speed changed, because the
        // scale multiplies the whole elapsed time, not just what comes next.
        let nearX = 0
        let farX = 0
        let cirrusX = 0
        let leanX = 0
        let leanY = 0

        const render = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            const v = vRef.current
            const p = ptrRef.current

            // Eased toward target; higher Damping settles faster.
            const k = 1 - Math.exp(-(v.damping as number) * 0.12 * dt)
            leanX += ((p.inside ? p.x : 0) - leanX) * k
            leanY += ((p.inside ? p.y : 0) - leanY) * k

            // The pointer's horizontal offset ADDS to the wind, so dragging one
            // way speeds the drift and the other way reverses it.
            const gust = 1 + leanX * (v.wind as number)
            const rate = (v.speed as number) * gust
            nearX = (nearX - NEAR_DRIFT * rate * dt) % 1000
            farX = (farX - FAR_DRIFT * rate * dt) % 1000
            cirrusX = (cirrusX - CIRRUS_DRIFT * rate * dt) % 1000

            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            const cw = sizeRef.current.w || canvas.clientWidth || 1200
            const ch = sizeRef.current.h || canvas.clientHeight || 800
            const bw = Math.max(1, Math.round(cw * dpr))
            const bh = Math.max(1, Math.round(ch * dpr))
            if (canvas.width !== bw || canvas.height !== bh) {
                canvas.width = bw
                canvas.height = bh
            }
            gl.viewport(0, 0, bw, bh)

            const zen = parseColor(v.zenith as string, [0.369, 0.576, 0.824, 1])
            const hor = parseColor(v.horizon as string, [0.706, 0.824, 0.941, 1])
            const cld = parseColor(v.cloud as string, [1, 1, 1, 1])
            const glow = parseColor(v.glow as string, [0.91, 0.953, 1, 0.9])

            gl.uniform2f(u("uRes"), bw, bh)
            gl.uniform1f(u("uNearX"), nearX)
            gl.uniform1f(u("uFarX"), farX)
            gl.uniform1f(u("uCirrusX"), cirrusX)
            gl.uniform1f(u("uCoverage"), v.coverage as number)
            gl.uniform1f(u("uSize"), v.size as number)
            gl.uniform1f(u("uSoftness"), v.softness as number)
            gl.uniform1f(u("uShadow"), v.shadow as number)
            gl.uniform1f(u("uCirrus"), v.cirrus as number)
            gl.uniform2f(u("uSun"), v.sunX as number, v.sunY as number)
            gl.uniform2f(u("uParallax"), -leanX * (v.parallax as number) * 0.07, -leanY * (v.parallax as number) * 0.05)
            gl.uniform3f(u("uZenith"), zen[0], zen[1], zen[2])
            gl.uniform3f(u("uHorizon"), hor[0], hor[1], hor[2])
            gl.uniform3f(u("uCloud"), cld[0], cld[1], cld[2])
            gl.uniform4f(u("uGlow"), glow[0], glow[1], glow[2], glow[3])

            gl.drawArrays(gl.TRIANGLES, 0, 3)
            raf = requestAnimationFrame(render)
        }

        // The rect RATIO is zoom-invariant -- offset and size scale together --
        // so this is safe on a zoomed Framer canvas where absolute px are not.
        const track = (e: PointerEvent) => {
            const r = canvas.getBoundingClientRect()
            if (r.width <= 0 || r.height <= 0) return
            ptrRef.current.x = ((e.clientX - r.left) / r.width) * 2 - 1
            ptrRef.current.y = 1 - ((e.clientY - r.top) / r.height) * 2
            ptrRef.current.inside = true
        }
        const onLeave = () => {
            ptrRef.current.inside = false
        }

        canvas.addEventListener("pointermove", track)
        canvas.addEventListener("pointerenter", track)
        canvas.addEventListener("pointerleave", onLeave)

        raf = requestAnimationFrame(render)

        // Never loseContext(): getContext returns the same context per canvas, so
        // StrictMode's mount -> cleanup -> mount would reuse a force-lost one.
        return () => {
            cancelAnimationFrame(raf)
            canvas.removeEventListener("pointermove", track)
            canvas.removeEventListener("pointerenter", track)
            canvas.removeEventListener("pointerleave", onLeave)
        }
    }, [])

    return (
        <div
            style={{
                position: "relative",
                overflow: "hidden",
                background,
                isolation: "isolate",
                minWidth: 1200,
                minHeight: 800,
                width: typeof width === "number" && width > 0 ? width : "100%",
                height: typeof height === "number" && height > 0 ? height : "100%",
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
