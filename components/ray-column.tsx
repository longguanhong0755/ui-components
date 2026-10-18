"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * RayColumn — soft shafts rising from a source below the frame.
 *
 * Zero blur taps. The noise coordinate is the ANGLE from the source, not
 * screen x — so a ray is a constant ANGULAR width and therefore widens as it
 * climbs, the way a real shaft does. Noise in x smeared vertically gives parallel
 * columns instead, which is a different component.
 *
 * Interaction: the source is anchored; the pointer is an APERTURE at that source.
 * The shafts on its bearing OPEN — they brighten and sharpen, a higher contrast
 * exponent pushing the floor down so the gain lands on fewer, cleaner blades —
 * while the ones either side CLOSE. It is an iris, not a shadow: nothing is
 * occluded, so there is no penumbra to diverge and no blot over the pointer.
 * Because the aperture sits at the source, the slit runs the full length of the
 * column rather than starting where the pointer is; a soft swell around the
 * pointer's own radius is what keeps moving it up the axis from being dead, since
 * on x = 0 the bearing alone never changes.
 * Framer's editor swallows pointer events, so hover is a PREVIEW-only
 * behaviour; the rest state is what the canvas shows.
 *
 * Reference 29, batch three.
 */

const MAX_DPR = 2

const VERT_SRC = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`

const FRAG_SRC = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;
uniform float uHover;

const float PI  = 3.14159265;
const float TAU = 6.28318531;

float sat(float x){ return clamp(x, 0.0, 1.0); }
float pw(float x, float e){ return pow(max(x, 1e-5), e); }
float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 34.56); return fract(p.x * p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i), b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0)), d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm3(vec2 p){ float s = 0.0, a = 0.5; for(int i = 0; i < 3; i++){ s += a * vnoise(p); p = p * 2.07 + vec2(4.1, 2.3); a *= 0.5; } return s; }

uniform vec3 uBg, uBase, uAccent, uHigh;
uniform float uRays, uContrast, uSweep, uFall, uAper, uDirection;

void main(){
  float ar = uRes.x / max(uRes.y, 1.0);
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (uv - 0.5) * vec2(ar, 1.0);
  float t = uTime * 0.07;
  // Direction rotates the whole source+ray system around frame center rather
  // than moving the source point, so the shaft geometry (angular width vs.
  // radius) stays identical at every setting.
  float dcs = cos(uDirection), dsn = sin(uDirection);
  mat2 drot = mat2(dcs, -dsn, dsn, dcs);
  p = drot * p;
  vec2 src = vec2(0.0, -0.78);
  vec2 d = p - src;
  float r = max(length(d), 1e-3);
  float th = atan(d.x, d.y);

  // The pointer is an APERTURE at the source. Wrap the bearing difference into
  // [-PI, PI] before taking it as an angle: the sweep is narrow enough today that
  // the raw subtraction never crosses the atan seam, but a wider Sweep would.
  vec2 mp = drot * ((uMouse - 0.5) * vec2(ar, 1.0));
  vec2 md = mp - src;
  float mr = max(length(md), 1e-3);
  float mth = atan(md.x, md.y);
  float ang = abs(mod(th - mth + PI, TAU) - PI);
  float aw = max(uAper, 0.02);
  float h = sat(uHover);
  float swell = 1.0 + 0.55 * exp(-pw(abs(r - mr) / 0.40, 2.0));
  float open  = h * exp(-pw(ang / aw, 2.0)) * swell;
  // Fixed angular shoulder, NOT a multiple of the slit: tied to aw, a narrow
  // aperture put its shoulder inside the fan and stopped the whole frame down.
  float close = h * smoothstep(aw, aw + 0.30, ang);

  float v = fbm3(vec2(th * uRays, r * 0.9 - t * 2.4));
  v += 0.50 * vnoise(vec2(th * uRays * 2.4 + 3.0, r * 1.8 - t * 3.6));
  v = pw(sat(v * 1.10 - 0.31), uContrast);
  // Sharpen by remapping the contrasted value, not by raising the exponent: a
  // bigger exponent crushes every blade toward zero, so the slit came out DIMMER
  // than the rest state and the gain below had nothing left to lift.
  v = mix(v, smoothstep(0.08, 0.50, v), 0.60 * sat(open));
  float env = exp(-pw(max(r - 0.30, 0.0) * uFall, 1.5));
  float aen = exp(-pw(abs(th) / max(uSweep, 0.05), 2.0));

  float body = v * env * aen * (1.0 + 0.90 * open) * (1.0 - 0.55 * close);
  float bloom = exp(-pw(max(r - 0.18, 0.0) * uFall * 1.30, 1.7)) * aen * (1.0 + 0.25 * open);
  vec3 col = uBg;
  col += uBase * bloom * 0.90;
  col += mix(uBase, uAccent, sat(body * 1.6)) * body * 2.4;
  col += uHigh * pw(sat(body - 0.38), 2.0) * 1.10;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("RayColumn shader:", gl.getShaderInfoLog(sh))
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

// `occluder` is the OLD key — the pointer used to cast a shadow, and its width
// dial is now the aperture's. Kept readable so a live instance is not stranded.
type ShaftGroup = { contrast?: number; sweep?: number; falloff?: number; aperture?: number; occluder?: number }
const SHAFT_DEFAULTS: Required<Omit<ShaftGroup, "occluder">> = { contrast: 150, sweep: 85, falloff: 150, aperture: 22 }

// Named presets place the SOURCE at that edge of the frame: "top" anchors the
// source above the frame with rays falling down into it, "bottom" (default,
// the shipped look) anchors it below with rays rising, "left"/"right" anchor
// it at the corresponding side.
const DIRECTION_ANGLES: Record<string, number> = { top: 180, right: 90, bottom: 0, left: -90 }

interface Props {
    style?: React.CSSProperties
    width?: number
    height?: number
    background?: string
    baseColor?: string
    accentColor?: string
    highlight?: string
    density?: number
    speed?: number
    hover?: number
    direction?: "top" | "right" | "bottom" | "left"
    shaft?: ShaftGroup
}

export default function RayColumn(props: Props) {
    const {
        style,
        background = "#000206",
        baseColor = "#3D00FF",
        accentColor = "#6EABF5",
        highlight = "#CFE4FF",
        density = 42,
        speed = 50,
        hover = 63,
        direction = "bottom",
        shaft,
        width,
        height,
    } = props

    // A group the designer never opened arrives undefined; spread-merging over a
    // typed literal beats a hand-written ?? chain, where one missed key silently
    // pins a control forever.
    const shaft_ = { ...SHAFT_DEFAULTS, ...(shaft || {}) }
    const apertureRaw = num(shaft?.aperture, num(shaft?.occluder, SHAFT_DEFAULTS.aperture))

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    // Every live input is read from a ref inside the loop. Putting any of them in
    // the effect deps would rebuild the GL context on every colour tweak.
    const vRef = useRef<Record<string, number | string>>({})
    vRef.current = {
        background: background,
        baseColor: baseColor,
        accentColor: accentColor,
        highlight: highlight,
        density: clampN(num(density, 42), 10, 150) / 10,
        speed: clampN(num(speed, 50), 0, 100) / 50,
        hover: clampN(num(hover, 100), 0, 200) / 100,
        direction: ((DIRECTION_ANGLES[direction] ?? 0) * Math.PI) / 180,
        contrast: clampN(num(shaft_.contrast, 150), 50, 400) / 100,
        sweep: clampN(num(shaft_.sweep, 85), 20, 200) / 100,
        falloff: clampN(num(shaft_.falloff, 150), 30, 400) / 100,
        aperture: clampN(apertureRaw, 5, 90) / 100,
    }

    const ptrRef = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, on: 0, onTarget: 0 })

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false })
        if (!gl) {
            console.error("RayColumn: WebGL unavailable")
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
            console.error("RayColumn link:", gl.getProgramInfoLog(prog))
            return
        }
        gl.useProgram(prog)

        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        const posLoc = gl.getAttribLocation(prog, "a_pos")
        gl.enableVertexAttribArray(posLoc)
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

        const locs: Record<string, WebGLUniformLocation | null> = {}
        const u = (name: string) => {
            if (!(name in locs)) locs[name] = gl.getUniformLocation(prog, name)
            return locs[name]
        }

        let raf = 0
        let last = performance.now()
        let clock = 0

        const render = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            const v = vRef.current

            clock = (clock + dt * (v.speed as number)) % 3600

            const ptr = ptrRef.current
            const k = 1 - Math.exp(-6 * dt)
            ptr.on += (ptr.onTarget - ptr.on) * k
            ptr.x += ((ptr.onTarget > 0 ? ptr.tx : 0.5) - ptr.x) * k
            ptr.y += ((ptr.onTarget > 0 ? ptr.ty : 0.5) - ptr.y) * k

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
            gl.uniform1f(u("uTime"), clock)
            gl.uniform2f(u("uMouse"), ptr.x, 1 - ptr.y)
            gl.uniform1f(u("uHover"), Math.min(1, ptr.on) * (v.hover as number))
            const c_uBg = parseColor(v.background as string, [0.0, 0.008, 0.024])
            gl.uniform3f(u("uBg"), c_uBg[0], c_uBg[1], c_uBg[2])
            const c_uBase = parseColor(v.baseColor as string, [0.063, 0.188, 0.431])
            gl.uniform3f(u("uBase"), c_uBase[0], c_uBase[1], c_uBase[2])
            const c_uAccent = parseColor(v.accentColor as string, [0.431, 0.671, 0.961])
            gl.uniform3f(u("uAccent"), c_uAccent[0], c_uAccent[1], c_uAccent[2])
            const c_uHigh = parseColor(v.highlight as string, [0.812, 0.894, 1.0])
            gl.uniform3f(u("uHigh"), c_uHigh[0], c_uHigh[1], c_uHigh[2])
            gl.uniform1f(u("uRays"), v.density as number)
            gl.uniform1f(u("uContrast"), v.contrast as number)
            gl.uniform1f(u("uSweep"), v.sweep as number)
            gl.uniform1f(u("uFall"), v.falloff as number)
            gl.uniform1f(u("uAper"), v.aperture as number)
            gl.uniform1f(u("uDirection"), v.direction as number)

            gl.drawArrays(gl.TRIANGLES, 0, 3)
            raf = requestAnimationFrame(render)
        }

        const track = (e: PointerEvent) => {
            const r = canvas.getBoundingClientRect()
            if (r.width <= 0 || r.height <= 0) return
            ptrRef.current.tx = clampN((e.clientX - r.left) / r.width, 0, 1)
            ptrRef.current.ty = clampN((e.clientY - r.top) / r.height, 0, 1)
            ptrRef.current.onTarget = 1
        }
        const onLeave = () => {
            ptrRef.current.onTarget = 0
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
