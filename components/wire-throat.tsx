"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const MAX_DPR = 2
const NEAR_DEPTH = 0.42
/* CSS px at Thickness 100%. 0.5 css px is exactly the 1 device px GL_LINES drew
   on a retina canvas, so the default is pixel parity with the shipped look. */
const REF_THICK = 0.5
const FAR_DEPTH = 78.0

const VERT_SRC = `
precision highp float;
attribute vec4 a_seg;   // theta0, depth0, theta1, depth1
attribute vec2 a_side;  // x: -1 / +1 across the ribbon, y: 0 = endpoint A, 1 = B

uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;
uniform float uHover;
uniform float uCam;
uniform float uThroat;
uniform float uFlare;
uniform float uThick;   // line width in DEVICE px

varying float vA;

vec3 tubePoint(float th, float d) {
    float z = uCam - d;
    float R = uThroat * sqrt(1.0 + (z / uFlare) * (z / uFlare));
    vec3 P = vec3(R * cos(th), R * sin(th), z);

    vec2 off = (uMouse - 0.5) * 2.0 * uHover;
    float bendW = 1.0 - exp(-abs(z) * 0.30);
    P.xy += off * vec2(0.85, 0.55) * bendW;
    P.z += 0.35 * sin(uTime * 0.20);
    return P;
}

void main() {
    vec3 PA = tubePoint(a_seg.x, a_seg.y);
    vec3 PB = tubePoint(a_seg.z, a_seg.w);

    float f = 1.42;
    float ar = uRes.x / max(uRes.y, 1.0);

    float dA = max(uCam - PA.z, 0.05);
    float dB = max(uCam - PB.z, 0.05);
    vec2 nA = vec2(f * PA.x / dA / ar, f * PA.y / dA);
    vec2 nB = vec2(f * PB.x / dB / ar, f * PB.y / dB);

    float e = a_side.y;
    vec2  base  = mix(nA, nB, e);
    float depth = mix(dA, dB, e);

    // Expand AFTER projection so the width is in pixels, not world units, and a
    // near ring is no fatter than a far one.
    vec2 scr = (nB - nA) * uRes * 0.5;
    float L = length(scr);
    vec2 dir = mix(vec2(1.0, 0.0), scr / max(L, 1e-5), step(1e-5, L));
    vec2 nrm = vec2(-dir.y, dir.x);

    // Sub-pixel widths gap wherever MSAA is off. Hold at 1 px, fade instead.
    float w  = max(uThick, 1.0);
    float aw = uThick / w;

    // half-width in px -> NDC is (w * 0.5) * 2.0 / uRes = w / uRes
    gl_Position = vec4(base + nrm * a_side.x * w / uRes, 0.0, 1.0);

    float near  = smoothstep(0.04, 0.42, depth);
    float far   = 1.0 / (1.0 + depth * depth * 0.0011);
    vA = 0.62 * near * far * aw;
}
`

const FRAG_SRC = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec3 uLine;
varying float vA;

void main() { gl_FragColor = vec4(uLine * vA, 1.0); }
`

const HAZE_VS = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`

const HAZE_FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;
uniform vec3  uLine;
uniform float uHaze;

void main() {
    float y = gl_FragCoord.y / uRes.y - 0.5;
    float band = exp(-y * y / 0.00030);
    float wide = exp(-y * y / 0.0090);
    gl_FragColor = vec4(uLine * (band * 0.070 + wide * 0.030) * uHaze, 1.0);
}
`

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

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("WireThroat shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

function linkProgram(gl: WebGLRenderingContext, vsSrc: string, fsSrc: string): WebGLProgram | null {
    const vs = compile(gl, gl.VERTEX_SHADER, vsSrc)
    const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc)
    if (!vs || !fs) return null
    const p = gl.createProgram()
    if (!p) return null
    gl.attachShader(p, vs)
    gl.attachShader(p, fs)
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        console.error("WireThroat link:", gl.getProgramInfoLog(p))
        return null
    }
    return p
}

/* Uniform locations are PER PROGRAM. */
function uniformer(gl: WebGLRenderingContext, prog: WebGLProgram) {
    const cache: Record<string, WebGLUniformLocation | null> = {}
    return (name: string) => {
        if (!(name in cache)) cache[name] = gl.getUniformLocation(prog, name)
        return cache[name]
    }
}

/**
 * Rings geometric in depth, plus meridians running between them — emitted as
 * two triangles per segment. Every vertex carries BOTH endpoints so the vertex
 * shader can build the screen-space normal itself.
 * Layout, stride 24 B: a_seg (vec4) @0, a_side (vec2) @16.
 */
const QUAD_CORNERS = [-1, 0, 1, 0, -1, 1, -1, 1, 1, 0, 1, 1]

function buildTube(rings: number, meridians: number): Float32Array {
    const depths: number[] = []
    for (let i = 0; i <= rings; i++) {
        depths.push(NEAR_DEPTH * Math.pow(FAR_DEPTH / NEAR_DEPTH, i / rings))
    }

    const segs: number[] = []
    for (let i = 0; i < depths.length; i++) {
        for (let j = 0; j < meridians; j++) {
            const a0 = (j / meridians) * Math.PI * 2
            const a1 = ((j + 1) / meridians) * Math.PI * 2
            segs.push(a0, depths[i], a1, depths[i])
        }
    }
    for (let j = 0; j < meridians; j++) {
        const a = (j / meridians) * Math.PI * 2
        for (let i = 0; i < depths.length - 1; i++) {
            segs.push(a, depths[i], a, depths[i + 1])
        }
    }

    const count = segs.length / 4
    const out = new Float32Array(count * 6 * 6)
    let o = 0
    for (let s = 0; s < count; s++) {
        const b = s * 4
        for (let c = 0; c < 6; c++) {
            out[o++] = segs[b]
            out[o++] = segs[b + 1]
            out[o++] = segs[b + 2]
            out[o++] = segs[b + 3]
            out[o++] = QUAD_CORNERS[c * 2]
            out[o++] = QUAD_CORNERS[c * 2 + 1]
        }
    }
    return out
}

type TubeGroup = { throat?: number; flare?: number; meridians?: number }

interface WireThroatProps {
    style?: React.CSSProperties
    background?: string
    baseColor?: string
    density?: number
    thickness?: number
    speed?: number
    distance?: number
    tube?: TubeGroup
    haze?: number
    hover?: number
    width?: number
    height?: number
}

const TUBE_DEFAULTS: Required<TubeGroup> = { throat: 100, flare: 100, meridians: 64 }

export default function WireThroat(props: WireThroatProps) {
    const {
        style,
        background = "#020203",
        baseColor = "#FF9600",
        density = 33,
        thickness = 205,
        speed = 50,
        distance = 7,
        tube,
        haze = 0,
        hover = 100,
        width,
        height,
    } = props

    const tb = { ...TUBE_DEFAULTS, ...(tube || {}) }

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    const vRef = useRef({
        line: "#DBE6F5",
        rings: 52,
        meridians: 64,
        thick: 0.5,
        speed: 1,
        cam: 6.55,
        throat: 0.20,
        flare: 5.2,
        haze: 1,
        hover: 1,
    })
    vRef.current = {
        line: baseColor,
        rings: Math.round(clampN(num(density, 52), 12, 120)),
        meridians: Math.round(clampN(num(tb.meridians, 64), 8, 128)),
        // CSS px. 100% is REF_THICK, the hairline the component shipped at.
        thick: (clampN(num(thickness, 100), 25, 400) / 100) * REF_THICK,
        speed: clampN(num(speed, 50), 0, 100) / 50,
        cam: clampN(num(distance, 7), 3, 20) * 0.936,
        throat: (clampN(num(tb.throat, 100), 20, 400) / 100) * 0.20,
        flare: (clampN(num(tb.flare, 100), 30, 300) / 100) * 5.2,
        haze: clampN(num(haze, 100), 0, 300) / 100,
        hover: clampN(num(hover, 100), 0, 200) / 100,
    }

    const ptrRef = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, on: 0, onTarget: 0 })

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { antialias: true, alpha: false, depth: false })
        if (!gl) {
            console.error("WireThroat: WebGL unavailable")
            return
        }

        const lineProg = linkProgram(gl, VERT_SRC, FRAG_SRC)
        const hazeProg = linkProgram(gl, HAZE_VS, HAZE_FS)
        if (!lineProg || !hazeProg) return

        const lu = uniformer(gl, lineProg)
        const hu = uniformer(gl, hazeProg)

        const quadBuf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        const hPos = gl.getAttribLocation(hazeProg, "a_pos")

        const tubeBuf = gl.createBuffer()
        const aSeg = gl.getAttribLocation(lineProg, "a_seg")
        const aSide = gl.getAttribLocation(lineProg, "a_side")
        let builtRings = -1
        let builtMeridians = -1
        let vertCount = 0

        // Rebuilds the BUFFER when Rings / Meridians change. Never the context.
        const ensureGeometry = (rings: number, meridians: number) => {
            if (rings === builtRings && meridians === builtMeridians) return
            const arr = buildTube(rings, meridians)
            gl.bindBuffer(gl.ARRAY_BUFFER, tubeBuf)
            gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW)
            vertCount = arr.length / 6
            builtRings = rings
            builtMeridians = meridians
        }

        let raf = 0
        let last = performance.now()
        let clock = 0

        const render = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            const v = vRef.current

            clock = (clock + dt * v.speed) % 3600
            ensureGeometry(v.rings, v.meridians)

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
            gl.clearColor(0, 0, 0, 1)
            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.enable(gl.BLEND)
            gl.blendFunc(gl.ONE, gl.ONE)
            gl.disable(gl.DEPTH_TEST)

            const line = parseColor(v.line, [0.859, 0.902, 0.961])

            if (v.haze > 0) {
                gl.useProgram(hazeProg)
                gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf)
                gl.enableVertexAttribArray(hPos)
                gl.vertexAttribPointer(hPos, 2, gl.FLOAT, false, 0, 0)
                gl.uniform2f(hu("uRes"), bw, bh)
                gl.uniform3f(hu("uLine"), line[0], line[1], line[2])
                gl.uniform1f(hu("uHaze"), v.haze)
                if (aSide >= 0) gl.disableVertexAttribArray(aSide)
                gl.drawArrays(gl.TRIANGLES, 0, 3)
            }

            gl.useProgram(lineProg)
            gl.bindBuffer(gl.ARRAY_BUFFER, tubeBuf)
            gl.enableVertexAttribArray(aSeg)
            gl.vertexAttribPointer(aSeg, 4, gl.FLOAT, false, 24, 0)
            gl.enableVertexAttribArray(aSide)
            gl.vertexAttribPointer(aSide, 2, gl.FLOAT, false, 24, 16)
            gl.uniform2f(lu("uRes"), bw, bh)
            gl.uniform1f(lu("uTime"), clock)
            gl.uniform2f(lu("uMouse"), ptr.x, 1 - ptr.y)
            gl.uniform1f(lu("uHover"), Math.min(1, ptr.on) * v.hover)
            gl.uniform1f(lu("uCam"), v.cam)
            gl.uniform1f(lu("uThroat"), v.throat)
            gl.uniform1f(lu("uFlare"), v.flare)
            gl.uniform1f(lu("uThick"), v.thick * dpr)
            gl.uniform3f(lu("uLine"), line[0], line[1], line[2])
            gl.drawArrays(gl.TRIANGLES, 0, vertCount)

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
