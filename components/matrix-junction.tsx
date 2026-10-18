"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const MAX_DPR = 2
const ACTIVE_RATE = 9.75 // 1/s; matches the source's 0.15-per-frame lerp at 60fps
const CLOCK_WRAP = 31410 // a multiple of 10, so every fract() pulse term wraps clean

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

uniform vec2  uRes, uMouse;
uniform float uTime, uActive, uHover, uDpr;
uniform float uIntensity, uPulse, uNodeGlow, uJitter, uArcWidth;
uniform int   uBeamCount;
uniform vec2  uCenter;
uniform vec3  uBg, uBase, uAccent;

float hash(float n){ return fract(sin(n) * 753.5453123); }

float noise(float x){
  float i = floor(x);
  float f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(hash(i), hash(i + 1.0), f);
}

// distance to the segment, and the parameter along it
vec2 sdLine(vec2 p, vec2 a, vec2 b){
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return vec2(length(pa - ba * h), h);
}

// A bolt from a to b: two octaves of noise on its own parameter, enveloped by
// sin(h * pi) so the wander pins to zero at both ends and the bolt still lands
// exactly on the beam and exactly on the pointer.
float lightning(vec2 uv, vec2 a, vec2 b, float t){
  vec2 ab = b - a;
  float len = length(ab);
  if (len < 0.01) return 0.0;
  vec2 dir = ab / len;

  vec2 pa = uv - a;
  float h = clamp(dot(pa, dir) / len, 0.0, 1.0);
  float dist = length(pa - dir * (h * len));

  float env = sin(h * 3.1415);

  float offset = (noise(h * 25.0 - t * 35.0) - 0.5) * 0.08 * uJitter * env;
  offset += (noise(h * 70.0 + t * 50.0) - 0.5) * 0.02 * uJitter * env;

  float d = abs(dist + offset);
  // Core width in PIXELS, not in field units: k / (d + k) is at half strength one
  // k away from the core, so this is a ~1.5px core at Width 100%, the same width
  // in CSS px on any display.
  float k = 3.0 * uArcWidth * uDpr / uRes.y;
  return (k / (d + k) + (k * 0.05) / (d * d + k * 0.05)) * env;
}

// Beam directions/weights: the first 8 are hand-placed so extra beams read
// as more junction traffic rather than a symmetric star. Past index 7 the
// count reaches up to 100, so hand-placing gives way to a hash-seeded
// golden-angle fan — deterministic per index, no two beams coincide, and
// still no local-array indexing by a uniform-bounded loop variable, which is
// not something every WebGL1 driver honours.
vec2 beamDir(int i){
  if (i == 0) return normalize(vec2(0.15, 1.0));
  if (i == 1) return normalize(vec2(1.0, -0.25));
  if (i == 2) return normalize(vec2(-0.8, -0.6));
  if (i == 3) return normalize(vec2(-1.0, 0.35));
  if (i == 4) return normalize(vec2(0.55, 0.85));
  if (i == 5) return normalize(vec2(0.1, -1.0));
  if (i == 6) return normalize(vec2(-0.5, 0.9));
  if (i == 7) return normalize(vec2(0.75, -0.7));
  // Beyond the 8 hand-placed rays, direction is procedural: golden-angle
  // spacing (2.39996 rad) keeps 100 beams from clumping, plus a per-index
  // hash so the fan doesn't read as a perfect pinwheel.
  float fi = float(i);
  float a = fi * 2.399963229728653 + hash(fi * 0.7192) * 6.2831853;
  return vec2(cos(a), sin(a));
}
float beamWeight(int i){
  if (i == 0) return 1.0;
  if (i == 1) return 1.0;
  if (i == 2) return 0.4;
  if (i == 3) return 0.7;
  if (i == 4) return 0.55;
  if (i == 5) return 0.45;
  if (i == 6) return 0.4;
  if (i == 7) return 0.35;
  return 0.25 + 0.35 * hash(float(i) * 3.417 + 1.0);
}
float beamPulseSpeed(int i){
  if (i == 0) return 0.4;
  if (i == 1) return 0.5;
  if (i == 2) return 0.3;
  if (i == 3) return 0.45;
  if (i == 4) return 0.55;
  if (i == 5) return 0.35;
  if (i == 6) return 0.6;
  if (i == 7) return 0.25;
  return 0.25 + 0.35 * hash(float(i) * 5.113 + 2.0);
}
float beamPulseOffset(int i){
  if (i == 0) return 0.0;
  if (i == 1) return 0.3;
  if (i == 2) return 0.7;
  if (i == 3) return 0.15;
  if (i == 4) return 0.55;
  if (i == 5) return 0.85;
  if (i == 6) return 0.4;
  if (i == 7) return 0.1;
  return hash(float(i) * 6.917 + 3.0);
}
float beamPulseWeight(int i){
  if (i == 0) return 1.0;
  if (i == 1) return 1.0;
  if (i == 2) return 0.5;
  if (i == 3) return 0.8;
  if (i == 4) return 0.65;
  if (i == 5) return 0.6;
  if (i == 6) return 0.55;
  if (i == 7) return 0.5;
  return 0.4 + 0.35 * hash(float(i) * 8.311 + 4.0);
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  uv = uv * 2.0 - 1.0;
  float aspect = uRes.x / max(uRes.y, 1.0);
  uv.x *= aspect;

  vec2 mouseUV = uMouse * 2.0 - 1.0;
  mouseUV.x *= aspect;

  vec2 center = uCenter;
  center.x += sin(uTime * 0.4) * 0.03;
  center.y += cos(uTime * 0.3) * 0.03;

  float k = 0.006 * uIntensity;
  float pw = 0.03 * uPulse;
  float act = uActive * uHover;
  float glow = 0.0;
  float arc = 0.0;

  // Beam count is a uniform, not a template constant, so the loop always
  // walks all 100 slots and skips the disabled tail — every WebGL1 driver
  // unrolls a constant-bound for loop, but not a uniform-bound one. 100
  // lightweight iterations is the tradeoff for letting Count go that high
  // without switching to a texture-packed beam table.
  for (int i = 0; i < 100; i++){
    if (i >= uBeamCount) continue;
    vec2 dir = beamDir(i);
    vec2 l = sdLine(uv, center, center + dir * 5.0);

    glow += (k * beamWeight(i)) / (l.x + 0.001);
    // The source wrote every one of these as smoothstep(hi, lo, x) — edge0 > edge1
    // is UNDEFINED in GLSL. Desktop drivers ramp it backwards, which is what was
    // intended; inverted here into the defined form, same shape.
    glow += (1.0 - smoothstep(0.0, 0.1, abs(l.y - fract(uTime * beamPulseSpeed(i) + beamPulseOffset(i)))))
          * (pw * beamPulseWeight(i)) / (l.x + 0.001);

    // --- arcs: the clamped projection is what makes a bolt spring from the
    // nearest point on each beam instead of always from the node ---
    if (act > 0.001) {
      vec2 p = center + dir * clamp(dot(mouseUV - center, dir), 0.0, 5.0);
      arc += lightning(uv, p, mouseUV, uTime + float(i) * 10.0) * (1.0 - smoothstep(0.0, 2.0, length(mouseUV - p)));
    }
  }

  glow += (0.04 * uNodeGlow) / (length(uv - center) + 0.01);

  vec3 col = uBase * glow;

  if (act > 0.001) {
    float flicker = step(0.1, noise(uTime * 60.0)) * (noise(uTime * 150.0) * 0.8 + 0.2);
    col += uAccent * arc * act * flicker;
  }

  col *= 0.85 + 0.15 * sin(uTime * 2.0 - length(uv - center) * 8.0);
  col *= 1.0 - smoothstep(0.4, 2.0, length(uv));
  col += fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) * 0.02;

  gl_FragColor = vec4(uBg + col, 1.0);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("MatrixJunction shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

function parseColor(input: string | undefined, fb: [number, number, number]): [number, number, number] {
    if (!input) return fb
    const str = String(input).trim()
    if (str.charAt(0) === "#") {
        let hex = str.slice(1)
        if (hex.length === 3 || hex.length === 4) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
        }
        if (hex.length >= 6) {
            const r = parseInt(hex.slice(0, 2), 16)
            const g = parseInt(hex.slice(2, 4), 16)
            const b = parseInt(hex.slice(4, 6), 16)
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r / 255, g / 255, b / 255]
        }
        return fb
    }
    const m = str.match(/[\d.]+/g)
    if (m && m.length >= 3) {
        return [
            Math.min(255, parseFloat(m[0])) / 255,
            Math.min(255, parseFloat(m[1])) / 255,
            Math.min(255, parseFloat(m[2])) / 255,
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

interface BeamGroup {
    intensity?: number
    pulse?: number
    count?: number
}
const BEAM_DEFAULTS: Required<BeamGroup> = { intensity: 100, pulse: 100, count: 5 }

interface JunctionGroup {
    positionX?: number
    positionY?: number
    glow?: number
}
const JUNCTION_DEFAULTS: Required<JunctionGroup> = { positionX: 23, positionY: 60, glow: 100 }

interface ArcGroup {
    jitter?: number
    arcWidth?: number
}
const ARC_DEFAULTS: Required<ArcGroup> = { jitter: 100, arcWidth: 250 }

interface MatrixJunctionProps {
    style?: React.CSSProperties
    width?: number
    height?: number
    background?: string
    baseColor?: string
    accentColor?: string
    speed?: number
    hover?: number
    beams?: BeamGroup
    junction?: JunctionGroup
    arc?: ArcGroup
}

export default function MatrixJunction(props: MatrixJunctionProps) {
    const {
        style,
        background = "#000000",
        baseColor = "#0048FF",
        accentColor = "#005FFF",
        speed = 50,
        hover = 100,
        beams,
        junction,
        arc,
        width,
        height,
    } = props

    // A group the designer never opened arrives undefined; spread-merging over a
    // typed literal beats a hand-written ?? chain, where one missed key silently
    // pins a control forever.
    const beams_ = { ...BEAM_DEFAULTS, ...(beams || {}) }
    const junction_ = { ...JUNCTION_DEFAULTS, ...(junction || {}) }
    const arc_ = { ...ARC_DEFAULTS, ...(arc || {}) }

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    const ptrRef = useRef({ x: 0.5, y: 0.5, on: 0 })

    // Every live input is read from a ref inside the loop. Putting any of them in
    // the effect deps would rebuild the GL context on every colour tweak.
    const vRef = useRef<Record<string, number | string>>({})
    vRef.current = {
        bg: background,
        base: baseColor,
        accent: accentColor,
        speed: clampN(num(speed, 50), 0, 100) / 50,
        hover: clampN(num(hover, 100), 0, 200) / 100,
        intensity: clampN(num(beams_.intensity, 100), 10, 400) / 100,
        pulse: clampN(num(beams_.pulse, 100), 0, 400) / 100,
        count: Math.round(clampN(num(beams_.count, 5), 3, 100)),
        // widened from 0–100 so the junction can be pushed off-canvas, not
        // just anywhere within it
        centerX: clampN(num(junction_.positionX, 23), -50, 150) / 100,
        centerY: clampN(num(junction_.positionY, 60), -50, 150) / 100,
        nodeGlow: clampN(num(junction_.glow, 100), 0, 400) / 100,
        jitter: clampN(num(arc_.jitter, 100), 0, 400) / 100,
        arcWidth: clampN(num(arc_.arcWidth, 250), 20, 400) / 100,
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false })
        if (!gl) {
            console.error("MatrixJunction: WebGL unavailable")
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
            console.error("MatrixJunction link:", gl.getProgramInfoLog(prog))
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
        let active = 0

        const render = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            const v = vRef.current
            clock = (clock + dt * (v.speed as number)) % CLOCK_WRAP

            const ptr = ptrRef.current
            active += (ptr.on - active) * (1 - Math.exp(-dt * ACTIVE_RATE))

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

            gl.uniform2f(u("uRes"), bw, bh)
            gl.uniform2f(u("uMouse"), ptr.x, ptr.y)
            gl.uniform1f(u("uTime"), clock)
            gl.uniform1f(u("uActive"), active)
            gl.uniform1f(u("uHover"), v.hover as number)
            gl.uniform1f(u("uDpr"), dpr)
            gl.uniform1f(u("uIntensity"), v.intensity as number)
            gl.uniform1f(u("uPulse"), v.pulse as number)
            gl.uniform1f(u("uNodeGlow"), v.nodeGlow as number)
            gl.uniform1f(u("uJitter"), v.jitter as number)
            gl.uniform1f(u("uArcWidth"), v.arcWidth as number)
            gl.uniform1i(u("uBeamCount"), v.count as number)
            // panel percent -> the shader's [-1, 1] field, x scaled by aspect there
            gl.uniform2f(
                u("uCenter"),
                ((v.centerX as number) * 2 - 1) * (bw / Math.max(bh, 1)),
                1 - (v.centerY as number) * 2
            )
            const cg = parseColor(v.bg as string, [0, 0, 0])
            const cb = parseColor(v.base as string, [0.6, 0.75, 1.0])
            const ca = parseColor(v.accent as string, [0.81, 0.886, 1.0])
            gl.uniform3f(u("uBg"), cg[0], cg[1], cg[2])
            gl.uniform3f(u("uBase"), cb[0], cb[1], cb[2])
            gl.uniform3f(u("uAccent"), ca[0], ca[1], ca[2])

            gl.drawArrays(gl.TRIANGLES, 0, 3)
            raf = requestAnimationFrame(render)
        }

        // The rect RATIO is zoom-invariant — offset and size scale together — so
        // this is safe on a zoomed Framer canvas where absolute px are not. The
        // source mixed a viewport clientY with the element's clientHeight, which
        // only lands correctly on a full-window canvas.
        const track = (e: PointerEvent) => {
            const r = canvas.getBoundingClientRect()
            if (r.width <= 0 || r.height <= 0) return
            ptrRef.current.x = clampN((e.clientX - r.left) / r.width, 0, 1)
            ptrRef.current.y = clampN(1 - (e.clientY - r.top) / r.height, 0, 1)
            ptrRef.current.on = 1
        }
        const onLeave = () => {
            ptrRef.current.on = 0
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
