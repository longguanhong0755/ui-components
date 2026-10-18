"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * FoilDrift — tumbling foil flakes that are invisible until they catch the light.
 *
 * Every flake is dark. Brightness is pure SPECULAR — pow(dot(N, H), sharpness)
 * against a tumbling per-flake normal — with no emissive term at all, which is
 * what makes it read as mica or glitter rather than as another field of glowing
 * dots.
 *
 * TWO things together make the glints a travelling ZONE rather than random
 * twinkle, and either one alone fails:
 *
 *  - A POINT light, not a directional one. Under a directional light every flake
 *    shares one L, so H is constant across the plate and nothing can vary with
 *    position.
 *  - Normals CLUSTERED ABOUT THE PLATE NORMAL, not uniform on a sphere. This is
 *    the one that is easy to get wrong: with N uniform on the sphere,
 *    E[pow(dot(N,H),k)] is identical for every H by symmetry, so even a point
 *    light yields spatially uniform brightness and there is no zone at all.
 *    Real flakes lie IN the surface and wobble about its normal, which is what
 *    puts the bright set where H is closest to straight up — under the light,
 *    falling off with distance from it.
 *
 * Measured on the shipped defaults: mean luma falls monotonically from the light
 * outward. A uniform-normal version measures as a flat profile with a spurious
 * ring, which is what the first cut of this component did.
 *
 * Two rates on purpose, and they are not the same dial: Speed is the light's own
 * drift, Tumble is how fast each flake rolls. Fuse them and you lose the ability
 * to hold a still light over a shimmering field, which is most of the look.
 *
 * Interaction: the pointer is the light, and a wave of glints follows it across
 * the plate. At rest the light drifts on its own path.
 */

const MAX_DPR = 2

const VERT_SRC = `
precision highp float;

attribute vec2 a_seed;
attribute vec4 a_rnd;    // x phase, y spin rate, z depth, w tilt seed

uniform vec2  uRes;
uniform float uTime, uPx, uTumble, uSharp, uDrift, uSpread, uTilt;
uniform vec2  uLight;

varying float v_spec;

void main(){
  float ar = uRes.x / max(uRes.y, 1.0);

  // Parallax by depth, so the field has front and back rather than one plane.
  float par = mix(0.55, 1.35, a_rnd.z);
  vec2 q = a_seed;
  q.x = fract(q.x + uTime * uDrift * 0.010 * par);
  q.y = fract(q.y + uTime * uDrift * 0.004 * par + 0.10 * sin(uTime * 0.20 + a_rnd.x * 6.283));
  vec2 p = (q - 0.5) * 2.05 * vec2(ar, 1.0);

  // Each flake sits at its OWN FIXED TILT from the plate and spins about the
  // plate normal — it does not wander over a sphere.
  //
  // Two things depend on this and both are easy to lose. With normals uniform on
  // a sphere, E[pow(dot(N,H),k)] is identical for every H by symmetry, so even a
  // point light gives spatially uniform brightness and there is no zone at all.
  // And the tilt magnitude must be BIASED TOWARD FACE-ON (hence the square): if
  // few flakes ever lie flat, nothing can mirror the light back when H is
  // straight up, and the zone comes out as a ring with a dark hole sitting
  // exactly where the light is.
  float spin = uTime * uTumble * (0.50 + a_rnd.y) + a_rnd.x * 6.283;
  float amp = uTilt * a_rnd.w * a_rnd.w;
  vec3 N = normalize(vec3(amp * cos(spin), amp * sin(spin), 1.0));

  // POINT light. L varies per flake, which is what turns random sparkle into a
  // travelling zone. uSpread is the light's height above the plate: lower sits
  // the band tighter.
  vec3 lv = vec3(uLight, uSpread) - vec3(p, 0.0);
  vec3 L = normalize(lv);
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  // A point light also falls off with distance. Without it the flakes far from
  // the light still glint at full strength whenever their spin happens to line
  // up, and the plate reads as a starfield with a cluster in it rather than as
  // one lit surface.
  float atten = 1.0 / (1.0 + dot(lv, lv) * 0.42);
  float spec = pow(max(dot(N, H), 0.0), uSharp) * atten;

  v_spec = spec;
  float sz = uPx * (0.55 + 0.85 * fract(a_rnd.x * 7.13)) * par * (1.0 + 1.6 * spec);
  gl_PointSize = clamp(sz, 0.0, 120.0);
  gl_Position = vec4(p / vec2(ar, 1.0), 0.0, 1.0);
}
`

const FRAG_SRC = `
precision mediump float;

uniform vec3 uBase, uAccent, uHigh;

varying float v_spec;

void main(){
  vec2 q = gl_PointCoord - 0.5;
  float m = 1.0 - smoothstep(0.55, 1.0, length(q) * 2.0);
  float s = v_spec;
  vec3 col = uBase * 0.45 + mix(uAccent, uHigh, clamp(s * 0.85, 0.0, 1.0)) * s * 2.8;
  float a = m * clamp(0.055 + s * 2.6, 0.0, 1.0);
  // premultiplied, so the flakes composite over the CSS background
  gl_FragColor = vec4(min(col * a, vec3(1.0)), a);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("FoilDrift shader:", gl.getShaderInfoLog(sh))
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

function rng(seed: number): () => number {
    let a = seed >>> 0
    return function () {
        a += 0x6d2b79f5
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

/** Jittered grid, so the flakes cover evenly instead of clumping. Rebuilt when
 *  Density moves — buffers, not context. */
function flakes(n: number): { seed: Float32Array; rnd: Float32Array; count: number } {
    const R = rng(31337)
    const cols = Math.max(1, Math.round(Math.sqrt(n * 1.5)))
    const rows = Math.max(1, Math.ceil(n / cols))
    const count = cols * rows
    const seed = new Float32Array(count * 2)
    const rnd = new Float32Array(count * 4)
    let k = 0
    for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
            seed[k * 2] = (gx + R()) / cols
            seed[k * 2 + 1] = (gy + R()) / rows
            rnd[k * 4] = R()
            rnd[k * 4 + 1] = R()
            rnd[k * 4 + 2] = R()
            rnd[k * 4 + 3] = R()
            k++
        }
    }
    return { seed, rnd, count }
}

interface FlakeGroup {
    tumble?: number
    tilt?: number
    sharpness?: number
    drift?: number
    spread?: number
}

const FLAKE_DEFAULTS: Required<FlakeGroup> = { tumble: 100, tilt: 100, sharpness: 100, drift: 100, spread: 55 }

interface FoilDriftProps {
    style?: React.CSSProperties
    width?: number
    height?: number
    background?: string
    baseColor?: string
    accentColor?: string
    highlight?: string
    density?: number
    dotSize?: number
    speed?: number
    hover?: number
    flake?: FlakeGroup
}

export default function FoilDrift(props: FoilDriftProps) {
    const {
        style,
        background = "#06060B",
        baseColor = "#2A2C38",
        accentColor = "#B8953E",
        highlight = "#FFF4D6",
        density = 9800,
        dotSize = 50,
        speed = 50,
        hover = 100,
        flake,
        width,
        height,
    } = props

    // A group the designer never opened arrives undefined; spread-merging over a
    // typed literal beats a hand-written ?? chain, where one missed key silently
    // pins a control forever.
    const flake_ = { ...FLAKE_DEFAULTS, ...(flake || {}) }

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    // Every live input is read from a ref inside the loop. Putting any of them in
    // the effect deps would rebuild the GL context on every colour tweak.
    const vRef = useRef<Record<string, number | string>>({})
    vRef.current = {
        base: baseColor,
        accent: accentColor,
        high: highlight,
        density: Math.round(clampN(num(density, 11000), 800, 30000)),
        dotSize: clampN(num(dotSize, 100), 20, 400) / 100,
        speed: clampN(num(speed, 50), 0, 100) / 50,
        hover: clampN(num(hover, 100), 0, 200) / 100,
        tumble: clampN(num(flake_.tumble, 100), 0, 300) / 100,
        tilt: (clampN(num(flake_.tilt, 100), 10, 300) / 100) * 0.85,
        sharpness: clampN(num(flake_.sharpness, 100), 20, 400) / 100,
        drift: clampN(num(flake_.drift, 100), 0, 300) / 100,
        spread: clampN(num(flake_.spread, 55), 10, 200) / 100,
    }

    const ptrRef = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, on: 0, onTarget: 0 })

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", {
            alpha: true,
            antialias: false,
            depth: false,
            premultipliedAlpha: true,
        })
        if (!gl) {
            console.error("FoilDrift: WebGL unavailable")
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
            console.error("FoilDrift link:", gl.getProgramInfoLog(prog))
            return
        }
        gl.useProgram(prog)

        const aSeed = gl.getAttribLocation(prog, "a_seed")
        const aRnd = gl.getAttribLocation(prog, "a_rnd")
        gl.enableVertexAttribArray(aSeed)
        gl.enableVertexAttribArray(aRnd)

        const locs: Record<string, WebGLUniformLocation | null> = {}
        const u = (name: string) => {
            if (!(name in locs)) locs[name] = gl.getUniformLocation(prog, name)
            return locs[name]
        }

        const bSeed = gl.createBuffer()
        const bRnd = gl.createBuffer()
        let builtFor = 0
        let count = 0
        const build = (n: number) => {
            const f = flakes(n)
            gl.bindBuffer(gl.ARRAY_BUFFER, bSeed)
            gl.bufferData(gl.ARRAY_BUFFER, f.seed, gl.STATIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, bRnd)
            gl.bufferData(gl.ARRAY_BUFFER, f.rnd, gl.STATIC_DRAW)
            builtFor = n
            count = f.count
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
            const ar = bw / Math.max(bh, 1)
            const shortEdge = Math.min(bw, bh)

            const wantN = v.density as number
            if (wantN !== builtFor) build(wantN)

            // At rest the light walks its own path, so the component is alive even
            // when the pointer never arrives.
            const hv = Math.min(1, ptr.on) * (v.hover as number)
            const dx = 0.62 * ar * Math.cos(clock * 0.30)
            const dy = 0.40 * Math.sin(clock * 0.23)
            const mx = (ptr.x - 0.5) * 2.05 * ar
            const my = (1 - ptr.y - 0.5) * 2.05
            const lx = dx + (mx - dx) * Math.min(1, hv)
            const ly = dy + (my - dy) * Math.min(1, hv)

            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.disable(gl.DEPTH_TEST)
            gl.enable(gl.BLEND)
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

            gl.bindBuffer(gl.ARRAY_BUFFER, bSeed)
            gl.vertexAttribPointer(aSeed, 2, gl.FLOAT, false, 0, 0)
            gl.bindBuffer(gl.ARRAY_BUFFER, bRnd)
            gl.vertexAttribPointer(aRnd, 4, gl.FLOAT, false, 0, 0)

            gl.uniform2f(u("uRes"), bw, bh)
            gl.uniform1f(u("uTime"), clock)
            gl.uniform1f(u("uPx"), Math.max(1.0, (shortEdge / 1080) * 5.0 * (v.dotSize as number)))
            gl.uniform1f(u("uTumble"), v.tumble as number)
            gl.uniform1f(u("uTilt"), v.tilt as number)
            gl.uniform1f(u("uSharp"), 55.0 * (v.sharpness as number))
            gl.uniform1f(u("uDrift"), v.drift as number)
            gl.uniform1f(u("uSpread"), v.spread as number)
            gl.uniform2f(u("uLight"), lx, ly)
            const cb = parseColor(v.base as string, [0.165, 0.173, 0.22])
            const ca = parseColor(v.accent as string, [0.784, 0.698, 0.478])
            const chh = parseColor(v.high as string, [1.0, 0.957, 0.839])
            gl.uniform3f(u("uBase"), cb[0], cb[1], cb[2])
            gl.uniform3f(u("uAccent"), ca[0], ca[1], ca[2])
            gl.uniform3f(u("uHigh"), chh[0], chh[1], chh[2])

            gl.drawArrays(gl.POINTS, 0, count)
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

        build(vRef.current.density as number)
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
