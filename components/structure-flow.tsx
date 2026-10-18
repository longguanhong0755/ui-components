"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const MAX_DPR = 2
const R_DOME = 25 // the source's sphere radius
const Y_DROP = -20 // and how far it sits below the origin
const CAM_Y = 5
const CAM_Z = 30
const FOCAL = 1.7320508 // 1 / tan(60deg / 2)
const ROLL_AMP = 0.2 // radians; the sway's half-angle, see the render loop

const VERT_SRC = `
precision highp float;

attribute vec3 a_p;

uniform vec2  uRes;
uniform float uYaw, uRoll, uPitch, uSize;

varying float v_depth;

void main(){
  // a_p is SPHERE-LOCAL — the Y_DROP is applied AFTER the rotations, so every
  // rotation turns the dome about its own centre. Baking the drop into the
  // vertex data put the axis 20 units above the dome instead, and the roll then
  // walked the whole cap around a radius-20 circle and off the side of the frame.
  // yaw about y, then roll about z — the source's rotation.y / rotation.z order
  float cy = cos(uYaw), sy = sin(uYaw);
  vec3 p = vec3(a_p.x * cy + a_p.z * sy, a_p.y, -a_p.x * sy + a_p.z * cy);
  float cz = cos(uRoll), sz = sin(uRoll);
  p = vec3(p.x * cz - p.y * sz, p.x * sz + p.y * cz, p.z);
  // The pointer TILTS the bowl: the rim swings toward the cursor and the cap opens
  // or closes. A dome is a camera framing, so re-aiming it is the gesture;
  // brightening points under the cursor would light a shape that has no per-point
  // state to light.
  float cp = cos(uPitch), sp = sin(uPitch);
  p = vec3(p.x, p.y * cp - p.z * sp, p.y * sp + p.z * cp);

  vec3 view = vec3(p.x, p.y + ${Y_DROP.toFixed(1)} - ${CAM_Y.toFixed(1)}, p.z - ${CAM_Z.toFixed(1)});
  float w = max(-view.z, 0.05);
  float ar = uRes.x / max(uRes.y, 1.0);

  // Depth attenuation, as PointsMaterial does it: size * (halfHeight / -viewZ).
  gl_PointSize = max(1.0, uSize * (uRes.y * 0.5) / w);
  v_depth = w;
  gl_Position = vec4((${FOCAL.toFixed(6)} / ar) * view.x, ${FOCAL.toFixed(6)} * view.y, 0.0, w);
}
`

const FRAG_SRC = `
precision mediump float;

uniform vec3  uColor;
uniform float uBright;

varying float v_depth;

void main(){
  // round sprite, soft edge; the source's square PointsMaterial sprite reads as
  // grit once the points are only a pixel or two across
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = (1.0 - smoothstep(0.55, 1.0, d)) * uBright;
  if (a <= 0.002) discard;
  gl_FragColor = vec4(uColor * a, a);   // premultiplied, blended additively
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("StructureFlow shader:", gl.getShaderInfoLog(sh))
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

type DomeGroup = { fadeStart?: number; fadeEnd?: number; brightness?: number }
const DOME_DEFAULTS: Required<DomeGroup> = { fadeStart: 20, fadeEnd: 50, brightness: 300 }

interface Props {
    style?: React.CSSProperties
    width?: number
    height?: number
    background?: string
    baseColor?: string
    density?: number
    dotSize?: number
    speed?: number
    hover?: number
    dome?: DomeGroup
}

export default function StructureFlow(props: Props) {
    const {
        style,
        background = "#050505",
        baseColor = "#F5FF00",
        density = 15000,
        dotSize = 256,
        speed = 100,
        hover = 200,
        dome,
        width,
        height,
    } = props

    // A group the designer never opened arrives undefined; spread-merging over a
    // typed literal beats a hand-written ?? chain, where one missed key silently
    // pins a control forever.
    const dome_ = { ...DOME_DEFAULTS, ...(dome || {}) }

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const ptrRef = useRef({ tx: 0, ty: 0, x: 0, y: 0 })
    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    // Every live input is read from a ref inside the loop. Putting any of them in
    // the effect deps would rebuild the GL context on every colour tweak.
    const vRef = useRef<Record<string, number | string>>({})
    vRef.current = {
        base: baseColor,
        density: Math.round(clampN(num(density, 15000), 500, 40000)),
        dotSize: clampN(num(dotSize, 100), 20, 400) / 100,
        speed: clampN(num(speed, 50), 0, 100) / 50,
        hover: clampN(num(hover, 100), 0, 200) / 100,
        brightness: clampN(num(dome_.brightness, 100), 0, 300) / 100,
    }

    const fadeStart = Math.round(clampN(num(dome_.fadeStart, 20), 0, 100))
    const fadeEnd = Math.round(clampN(num(dome_.fadeEnd, 50), 0, 100))
    const mask = `linear-gradient(to bottom, transparent ${Math.min(fadeStart, fadeEnd)}%, black ${Math.max(fadeStart, fadeEnd)}%, black 100%)`

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { alpha: true, antialias: false, depth: false, premultipliedAlpha: true })
        if (!gl) {
            console.error("StructureFlow: WebGL unavailable")
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
            console.error("StructureFlow link:", gl.getProgramInfoLog(prog))
            return
        }
        gl.useProgram(prog)

        const locs: Record<string, WebGLUniformLocation | null> = {}
        const u = (name: string) => {
            if (!(name in locs)) locs[name] = gl.getUniformLocation(prog, name)
            return locs[name]
        }

        const buf = gl.createBuffer()
        const aP = gl.getAttribLocation(prog, "a_p")
        let count = 0

        // Uniform on the WHOLE SPHERE: acos of a uniform variate over [-1, 1]. A
        // uniform phi bunches the points at the poles and the globe reads as a
        // dartboard. Written in the sphere's OWN frame — the drop below the
        // camera is the shader's job, so the rotations have the sphere's centre
        // as their origin.
        const build = (n: number) => {
            const R = rng(20260825)
            const pts = new Float32Array(n * 3)
            for (let i = 0; i < n; i++) {
                const theta = R() * Math.PI * 2
                const phi = Math.acos(R() * 2 - 1)
                const s = Math.sin(phi)
                pts[i * 3] = R_DOME * s * Math.cos(theta)
                pts[i * 3 + 1] = R_DOME * Math.cos(phi) // sphere-local; Y_DROP is applied in the shader
                pts[i * 3 + 2] = R_DOME * s * Math.sin(theta)
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, buf)
            gl.bufferData(gl.ARRAY_BUFFER, pts, gl.STATIC_DRAW)
            gl.enableVertexAttribArray(aP)
            gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 0, 0)
            count = n
        }

        let raf = 0
        let last = performance.now()
        let yaw = 0
        let rollPhase = 0
        let builtFor = -1

        const render = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            const v = vRef.current
            const sp = v.speed as number
            // the source's 0.0008 and 0.0002 per frame, expressed per second
            yaw = (yaw + dt * 0.048 * sp) % 6.2831853
            // The roll SWAYS between +/-ROLL_AMP; it does not revolve. An unbounded
            // roll tilts the cap past the point where its rim leaves the viewport,
            // and one side of the frame goes black — measured over a 600s sweep, a
            // whole screen column band was empty by t = 20s. Driving the phase at
            // 0.012 / ROLL_AMP keeps the peak angular rate identical to the source's,
            // so the tilt still moves at the same speed; it just turns around.
            rollPhase = (rollPhase + dt * (0.012 / ROLL_AMP) * sp) % 6.2831853
            const roll = ROLL_AMP * Math.sin(rollPhase)

            const ptr = ptrRef.current
            const pk = 1 - Math.exp(-dt * 3.5)
            ptr.x += (ptr.tx - ptr.x) * pk
            ptr.y += (ptr.ty - ptr.y) * pk

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

            const wantN = v.density as number
            if (wantN !== builtFor) {
                build(wantN)
                builtFor = wantN
            }

            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.disable(gl.DEPTH_TEST)
            gl.enable(gl.BLEND)
            // additive, as the source's AdditiveBlending with depthWrite off
            gl.blendFunc(gl.ONE, gl.ONE)

            gl.uniform2f(u("uRes"), bw, bh)
            // The pointer's x drives ROLL, not yaw. The cap is rotationally symmetric
            // about its own axis, so a yaw offset rotates a uniform scatter into an
            // identical frame — measured at r = 0.98 between the extremes, i.e. a dial
            // wired to nothing. Roll and pitch tilt the axis itself, which shows.
            const hv = v.hover as number
            gl.uniform1f(u("uYaw"), yaw)
            gl.uniform1f(u("uRoll"), roll + ptr.x * 0.55 * hv)
            gl.uniform1f(u("uPitch"), -ptr.y * 0.55 * hv)
            gl.uniform1f(u("uSize"), 0.08 * (v.dotSize as number))
            gl.uniform1f(u("uBright"), 0.4 * (v.brightness as number))
            const cb = parseColor(v.base as string, [1, 1, 1])
            gl.uniform3f(u("uColor"), cb[0], cb[1], cb[2])

            gl.drawArrays(gl.POINTS, 0, count)
            raf = requestAnimationFrame(render)
        }

        // The rect RATIO is zoom-invariant — offset and size scale together — so
        // this is safe on a zoomed Framer canvas where absolute px are not.
        const track = (e: PointerEvent) => {
            const r = canvas.getBoundingClientRect()
            if (r.width <= 0 || r.height <= 0) return
            ptrRef.current.tx = clampN((e.clientX - r.left) / r.width, 0, 1) - 0.5
            ptrRef.current.ty = clampN((e.clientY - r.top) / r.height, 0, 1) - 0.5
        }
        const onLeave = () => {
            ptrRef.current.tx = 0
            ptrRef.current.ty = 0
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
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                    WebkitMaskImage: mask,
                    maskImage: mask,
                }}
            />
        </div>
    )
}
