"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const MAX_DPR = 2

// Found on a parameter grid; the look depends on these, so they are named.
const SURFACE_SCALE = 3.2 // noise cells across the sphere at Scale 100%
const WARP_RATES = [0.11, 0.14, 0.09] // per-octave drift; equal rates read as a slide
const CORONA_TIGHT = 2.2 // flame falloff, in units of the corona depth
const CORONA_BROAD = 4.5 // the wide halo that keeps the star off a hard edge
const SPIN_BASE = 0.12 // rad/sec at Speed 50
const STAR_CELLS = 9 // cells across the short side at Stars 100

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
uniform float uTime, uSpin;
uniform float uRadius, uScale, uContrast, uChurn;
uniform float uCorona, uFlicker, uStars;
uniform vec3 uBg, uBase, uAccent;
uniform vec4 uGlow;
uniform vec2 uPointer;
uniform float uFlare;

mat2 rot(float a){ float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }

// No sin() in the hash: fract(sin(x) * k) quantizes hard once the argument gets
// large, and the star cells index far off the origin.
float hash13(vec3 p){
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

vec2 hash22(vec2 p){
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.xx + q.yz) * q.zy);
}

float vnoise(vec3 x){
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash13(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
  return mix(mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
             mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z);
}

float fbm(vec3 p){
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 4; i++){
    s += a * vnoise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return s;
}

// Ridged: folding the noise about its midpoint turns smooth blobs into creases.
// Plain fbm gives a lava lamp; the ropy filament structure a photosphere has
// only appears once the field has ridges in it.
float ridged(vec3 p){
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 4; i++){
    s += a * (1.0 - abs(vnoise(p) * 2.0 - 1.0));
    p *= 2.08;
    a *= 0.5;
  }
  return s;
}

// The starfield: one hashed star per cell, walked over the 3x3 neighbourhood so
// a star near an edge is still drawn by the cell next door.
float starfield(vec2 p){
  vec2 g = p * uStars;
  vec2 id = floor(g), f = fract(g);
  float acc = 0.0;
  for (int j = -1; j <= 1; j++){
    for (int i = -1; i <= 1; i++){
      vec2 o = vec2(float(i), float(j));
      vec2 h = hash22(id + o);
      float keep = step(0.55, fract(h.x * 41.7));
      // Two populations: sharp points, and the soft bokeh discs the reference
      // has scattered through it.
      float big = step(0.86, fract(h.y * 27.3));
      float rad = mix(0.035, 0.13, big);
      float amp = mix(0.9, 0.55, big) * (0.35 + 0.65 * fract(h.x * 13.1));
      float d = length(f - o - h);
      acc += keep * amp * exp(-(d * d) / (rad * rad));
    }
  }
  return acc;
}

void main(){
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / (0.5 * max(uRes.y, 1.0));
  float px = 2.0 / max(uRes.y, 1.0); // one device pixel, in p units

  vec3 col = uBg;
  col += vec3(0.85, 0.9, 1.0) * starfield(p) * 0.9;

  float R = max(uRadius, 1e-3);
  float r = length(p);
  float cr = r / R;
  float edge = max(cr - 1.0, 0.0);

  // ---- corona -------------------------------------------------------------
  vec2 dir = length(uPointer) > 1e-4 ? normalize(uPointer) : vec2(0.0);
  vec2 pn = r > 1e-5 ? p / r : vec2(0.0);
  float lean = max(dot(pn, dir), 0.0);

  // pn IS (cos a, sin a): the angle as a seamless pair, with no atan and so no
  // discontinuity at pi for the flames to tear along.
  // High angular frequency, LOW radial frequency: that ratio is what makes the
  // corona read as filaments streaming off the limb. Swap it and the same noise
  // gives concentric shells instead.
  float flame = fbm(vec3(pn * 9.0, cr * 1.1 - uTime * 0.55));
  flame = pow(max(flame, 0.0), 1.7);
  float flick = 1.0 + uFlicker * (fbm(vec3(pn * 5.0, uTime * 1.3)) - 0.5);

  float depth = max(uCorona, 1e-3);
  float bulge = 1.0 + uFlare * pow(lean, 3.0);
  // The flame REACHES: it divides the radial distance rather than just scaling
  // the brightness, so a strong filament physically extends further off the limb
  // instead of being a brighter patch of the same smooth halo.
  float eff = edge / (1.0 + 0.9 * flame);
  float tight = exp(-eff / (depth * bulge) * ${CORONA_TIGHT.toFixed(2)});
  float broad = exp(-edge / (depth * bulge) * ${CORONA_BROAD.toFixed(2)});
  float corona = flick * (tight * (0.30 + 1.05 * flame) + broad * 0.20);
  // The hot rim sits just OUTSIDE the disc, so it flickers with the corona
  // rather than being a hard ring painted onto the sphere.
  corona += flick * 0.9 * exp(-edge * 55.0);

  col += uGlow.rgb * uGlow.a * corona;

  // ---- disc ---------------------------------------------------------------
  float z = sqrt(max(R * R - r * r, 0.0));
  vec3 n = vec3(p, z) / R;
  n.xz = rot(uSpin) * n.xz;

  vec3 q = n * (${SURFACE_SCALE.toFixed(2)} * uScale);
  // The WARP is what is animated, not the coordinate: adding time to q slides
  // the whole field bodily and reads as a moving texture rather than convection.
  vec3 w = vec3(
    fbm(q + vec3(11.3, 0.0, uTime * ${WARP_RATES[0].toFixed(3)})),
    fbm(q + vec3(0.0, 31.7, uTime * ${WARP_RATES[1].toFixed(3)})),
    fbm(q + vec3(57.1, 0.0, uTime * ${WARP_RATES[2].toFixed(3)}))
  );
  float g = ridged(q + (w - 0.5) * (2.6 * uChurn));

  float v = pow(clamp(g * 1.15, 0.0, 1.0), uContrast);
  // The accent is the HOT MINORITY. Ramping from the base at the midpoint makes
  // the whole disc yellow; a photosphere is mostly its base colour with bright
  // granule cores.
  vec3 surf = mix(uBase, uAccent, smoothstep(0.52, 0.96, v));
  surf *= mix(0.46, 1.15, v);           // the dark convection lanes
  surf *= mix(0.70, 1.0, z / R);        // limb darkening; the rim comes from the corona

  float disc = 1.0 - smoothstep(R - px, R + px, r);
  col = mix(col, surf, disc);

  gl_FragColor = vec4(col, 1.0);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("SolarFlare shader:", gl.getShaderInfoLog(sh))
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

interface Surface {
    scale?: number
    contrast?: number
    churn?: number
}
interface Corona {
    size?: number
    flicker?: number
    glow?: string
}
interface Pointer {
    spin?: number
    flare?: number
    damping?: number
}

const SURFACE_DEFAULTS: Required<Surface> = { scale: 100, contrast: 100, churn: 100 }
const CORONA_DEFAULTS: Required<Corona> = { size: 22, flicker: 40, glow: "rgba(255, 138, 40, 1)" }
const POINTER_DEFAULTS: Required<Pointer> = { spin: 100, flare: 100, damping: 25 }

interface Props {
    style?: React.CSSProperties
    width?: number
    height?: number
    background?: string
    baseColor?: string
    accentColor?: string
    size?: number
    speed?: number
    stars?: number
    surface?: Surface
    corona?: Corona
    pointer?: Pointer
}

function __BaseImpl_SolarFlare(props: Props) {
    const {
        style,
        background = "#050307",
        baseColor = "#C10A0A",
        accentColor = "#FFD152",
        size = 55,
        speed = 100,
        stars = 0,
        surface,
        corona,
        pointer,
        width,
        height,
    } = props

    // A group the designer never opened arrives undefined; spread-merging over a
    // typed literal beats a hand-written ?? chain, where one missed key silently
    // pins a control forever.
    const surface_ = { ...SURFACE_DEFAULTS, ...(surface || {}) }
    const corona_ = { ...CORONA_DEFAULTS, ...(corona || {}) }
    const pointer_ = { ...POINTER_DEFAULTS, ...(pointer || {}) }

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    // Every live input is read from a ref inside the loop. Putting any of them in
    // the effect deps would rebuild the GL context on every colour tweak.
    const vRef = useRef<Record<string, number | string>>({})
    vRef.current = {
        bg: background,
        base: baseColor,
        accent: accentColor,
        glow: corona_.glow,
        radius: clampN(num(size, 46), 5, 100) / 100,
        speed: clampN(num(speed, 50), 0, 100) / 50,
        stars: (clampN(num(stars, 100), 0, 300) / 100) * STAR_CELLS,
        scale: clampN(num(surface_.scale, 100), 20, 300) / 100,
        contrast: clampN(num(surface_.contrast, 100), 20, 300) / 100,
        churn: clampN(num(surface_.churn, 100), 0, 300) / 100,
        corona: clampN(num(corona_.size, 22), 0, 200) / 100,
        flicker: clampN(num(corona_.flicker, 40), 0, 100) / 100,
        spin: clampN(num(pointer_.spin, 100), 0, 300) / 100,
        flare: clampN(num(pointer_.flare, 100), 0, 300) / 100,
        damping: clampN(num(pointer_.damping, 25), 1, 100),
    }

    const ptrRef = useRef({ x: 0, y: 0, inside: false })

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false })
        if (!gl) {
            console.error("SolarFlare: WebGL unavailable")
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
            console.error("SolarFlare link:", gl.getProgramInfoLog(prog))
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
        let clock = 0
        let spinAngle = 0
        let leanX = 0
        let leanY = 0

        const render = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            const v = vRef.current
            const p = ptrRef.current

            // Eased toward target; higher Damping settles faster.
            const k = 1 - Math.exp(-(v.damping as number) * 0.12 * dt)
            const tx = p.inside ? p.x : 0
            const ty = p.inside ? p.y : 0
            leanX += (tx - leanX) * k
            leanY += (ty - leanY) * k

            clock = (clock + dt * (v.speed as number)) % 100000
            // The pointer's horizontal offset ADDS to the star's own spin, so a
            // drag across the disc flicks it round and letting go leaves it
            // turning at its base rate.
            spinAngle = (spinAngle + (SPIN_BASE * (v.speed as number) + leanX * (v.spin as number) * 0.9) * dt) % (Math.PI * 2)

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

            const bg = parseColor(v.bg as string, [0.02, 0.012, 0.027, 1])
            const base = parseColor(v.base as string, [0.757, 0.188, 0.039, 1])
            const acc = parseColor(v.accent as string, [1, 0.82, 0.32, 1])
            const glow = parseColor(v.glow as string, [1, 0.541, 0.157, 1])

            gl.uniform2f(u("uRes"), bw, bh)
            gl.uniform1f(u("uTime"), clock)
            gl.uniform1f(u("uSpin"), spinAngle)
            gl.uniform1f(u("uRadius"), v.radius as number)
            gl.uniform1f(u("uScale"), v.scale as number)
            gl.uniform1f(u("uContrast"), v.contrast as number)
            gl.uniform1f(u("uChurn"), v.churn as number)
            gl.uniform1f(u("uCorona"), v.corona as number)
            gl.uniform1f(u("uFlicker"), v.flicker as number)
            gl.uniform1f(u("uStars"), v.stars as number)
            gl.uniform1f(u("uFlare"), v.flare as number)
            gl.uniform2f(u("uPointer"), leanX, leanY)
            gl.uniform3f(u("uBg"), bg[0], bg[1], bg[2])
            gl.uniform3f(u("uBase"), base[0], base[1], base[2])
            gl.uniform3f(u("uAccent"), acc[0], acc[1], acc[2])
            gl.uniform4f(u("uGlow"), glow[0], glow[1], glow[2], glow[3])

            gl.drawArrays(gl.TRIANGLES, 0, 3)
            raf = requestAnimationFrame(render)
        }

        // The rect RATIO is zoom-invariant -- offset and size scale together --
        // so this is safe on a zoomed Framer canvas where absolute px are not.
        const track = (e: PointerEvent) => {
            const r = canvas.getBoundingClientRect()
            if (r.width <= 0 || r.height <= 0) return
            const aspect = r.width / Math.max(1, r.height)
            ptrRef.current.x = (((e.clientX - r.left) / r.width) * 2 - 1) * aspect
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

const __presetProps = {
  "background": "#050307",
  "baseColor": "#C10A0A",
  "accentColor": "#FFD152",
  "size": 55,
  "speed": 100,
  "stars": 0,
  "surface": {
    "churn": 300,
    "scale": 52,
    "contrast": 164
  },
  "corona": {
    "glow": "rgba(255, 138, 40, 1)",
    "size": 30,
    "flicker": 63
  },
  "pointer": {
    "spin": 300,
    "flare": 300,
    "damping": 100
  }
};

export default function SolarFlare(props: Record<string, unknown>) {
  return <__BaseImpl_SolarFlare {...(__presetProps as Record<string, unknown>)} {...props} />;
}
