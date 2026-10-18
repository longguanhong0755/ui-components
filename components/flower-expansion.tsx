"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

// Quality tier, not a design control. Three getColor calls per pixel
// with no loops is cheap enough to run at native density.
const MAX_DPR = 2

// Clock units per second at Speed 50 — the sketch's millis() / 1000.
const BASE_RATE = 1

const TWO_PI = Math.PI * 2
const WRAP_SHEAR = 8 // period of fract(t * 0.125)
const WRAP_HUE = 10 // period of fract(t * 0.1)
const WRAP_WOBBLE = TWO_PI
// 1e4 * 0.1 * Divisions = 1000 * Divisions cells, an integer, so the wrap is
// seamless for every (whole-number) Divisions rather than just distant.
const WRAP_SPIN = 1e4

const VERT_SRC = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`

const FRAG_SRC = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;
uniform float uTSpin;
uniform float uTShear;
uniform float uTWobble;
uniform float uTHue;
uniform float uDiv;
uniform float uLobes;
uniform float uWobble;
uniform float uSharp;
uniform float uEcho;
uniform float uHueSpread;
uniform float uSat;
uniform float uExposure;
uniform vec3  uBg;

const float PI = 3.14159265;
const float TAU = 6.28318531;

vec3 hsb2rgb(float h, float s, float b) {
    vec3 rgb = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    rgb = rgb * rgb * (3.0 - 2.0 * rgb);
    return b * mix(vec3(1.0), rgb, s);
}

float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

vec4 getColor(vec2 p, float x, float y, float power) {
    x -= uTSpin * 0.1;

    // The two line families, sheared apart in opposite directions. The shear
    // runs 0..1 and is multiplied by uDiv, so it slides an exact whole number
    // of cells per cycle and the fract() snap is invisible.
    float sh = fract(uTShear * 0.125);
    float v0 = (x - sh + y) * uDiv;
    float v1 = (x + sh - y) * uDiv;

    // Cell ids. The reference sampled a 256px noise PNG at (i0/N, i1/N).
    float i0 = mod(floor(v0), uDiv);
    float i1 = mod(floor(v1), uDiv);
    float phase = uHueSpread * hash21(vec2(i0, i1));

    // Only the cells positive in BOTH families survive; the power softens the
    // petal edge without a smoothstep.
    float alpha = pow(max(sin(PI * v0) * sin(PI * v1), 0.0), power);

    // Colour ramps with the RAW radius, not the compressed one, so all three
    // layers share one tint field and only the petal geometry is offset.
    float r = length(p);
    vec3 base = hsb2rgb(
        fract(uTHue * 0.1 + phase),
        r * 0.707 * uSat,
        uExposure * 2.0 * sqrt(r * 0.707)
    );
    return vec4(base, alpha);
}

void main() {
    // Vertical extent is always -1..1; only the horizontal grows with aspect.
    // That is the sketch's uAspect framing, kept as-is.
    vec2 p = (gl_FragCoord.xy * 2.0 - uRes) / uRes.y;

    float y = length(p);
    // atan(0, 0) is undefined and a NaN here writes as black even where the
    // background is not; the origin pixel is black-bodied anyway (r = 0), so a
    // deterministic 1e-7 bias costs nothing and removes the case.
    float x = (atan(p.y, p.x + 1e-7) + PI) / TAU;

    y *= 1.0 + uWobble * sin(TAU * uLobes * x + uTWobble);
    // Above 100% wobble the bracket can go negative and pow() of a negative
    // base is undefined in GLSL.
    y = pow(max(y, 0.0), 0.25);

    vec4 c1 = getColor(p, x, y, uSharp) * 0.8;
    vec4 c2 = getColor(p, x + 0.015 * uEcho, y + 0.03 * uEcho, uSharp * 1.2) * 0.6;
    vec4 c3 = getColor(p, x + 0.030 * uEcho, y + 0.06 * uEcho, uSharp * 1.4) * 0.4;

    // Source-over, back to front. Each layer's rgb is already weighted, which
    // is what keeps the trailing ghosts dimmer than the head.
    vec4 col = c3;
    col.rgb = (1.0 - c2.a) * col.rgb + c2.a * c2.rgb;
    col.a = col.a + c2.a - col.a * c2.a;
    col.rgb = (1.0 - c1.a) * col.rgb + c1.a * c1.rgb;
    col.a = col.a + c1.a - col.a * c1.a;

    float a = clamp(col.a, 0.0, 1.0);
    gl_FragColor = vec4(mix(uBg, col.rgb * a, a), 1.0);
}
`

function num(v: unknown, fb: number): number {
    return typeof v === "number" && isFinite(v) ? v : fb
}

// Colors can arrive as rgb()/rgba()/hsl()/hsla() as well as hex, so this
// parses all of them; a hex-only reader makes the colour prop look dead.
function parseColor(input: string | undefined, fb: [number, number, number]): [number, number, number] {
    if (!input) return fb
    const str = String(input).trim()

    if (str.charAt(0) === "#") {
        let hex = str.slice(1)
        if (hex.length === 3 || hex.length === 4) {
            hex = hex.split("").map((c) => c + c).join("")
        }
        if (hex.length >= 6) {
            const r = parseInt(hex.slice(0, 2), 16)
            const g = parseInt(hex.slice(2, 4), 16)
            const b = parseInt(hex.slice(4, 6), 16)
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r / 255, g / 255, b / 255]
        }
        return fb
    }

    const nums = str.match(/-?[\d.]+/g)
    if (!nums || nums.length < 3) return fb

    if (/^hsla?/i.test(str)) {
        const h = ((parseFloat(nums[0]) % 360) + 360) / 360
        const s = Math.min(1, Math.max(0, parseFloat(nums[1]) / 100))
        const l = Math.min(1, Math.max(0, parseFloat(nums[2]) / 100))
        const c = (1 - Math.abs(2 * l - 1)) * s
        const xx = c * (1 - Math.abs(((h * 6) % 2) - 1))
        const m = l - c / 2
        const t = Math.floor(h * 6) % 6
        const rgb: [number, number, number] =
            t === 0 ? [c, xx, 0] : t === 1 ? [xx, c, 0] : t === 2 ? [0, c, xx] :
            t === 3 ? [0, xx, c] : t === 4 ? [xx, 0, c] : [c, 0, xx]
        return [rgb[0] + m, rgb[1] + m, rgb[2] + m]
    }

    return [
        Math.min(255, Math.max(0, parseFloat(nums[0]))) / 255,
        Math.min(255, Math.max(0, parseFloat(nums[1]))) / 255,
        Math.min(255, Math.max(0, parseFloat(nums[2]))) / 255,
    ]
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("FlowerExpansion shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

// ------------------------------------------------------------------ props

interface PetalsGroup {
    wobble?: number
    lobes?: number
    echo?: number
    spin?: number
}

interface ColorGroup {
    hueSpread?: number
    hueSpeed?: number
    saturation?: number
    exposure?: number
}

interface FlowerExpansionProps {
    style?: React.CSSProperties
    background?: string
    speed?: number
    divisions?: number
    sharpness?: number
    petals?: PetalsGroup
    color?: ColorGroup
    width?: number
    height?: number
}

// A group the designer never opened arrives undefined, so these are
// spread-merged rather than read through a hand-written ?? chain.
const D_PETALS: Required<PetalsGroup> = { wobble: 100, lobes: 6, echo: 100, spin: 100 }
const D_COLOR: Required<ColorGroup> = { hueSpread: 100, hueSpeed: 100, saturation: 100, exposure: 100 }

const C_BG: [number, number, number] = [0, 0, 0]

export default function FlowerExpansion(props: FlowerExpansionProps) {
    const {
        style,
        background = "#000000",
        speed = 35,
        divisions = 12,
        sharpness = 37,
        petals,
        color,
        width,
        height,
    } = props

    const gPetals = { ...D_PETALS, ...(petals ?? {}) }
    const gColor = { ...D_COLOR, ...(color ?? {}) }

    const canvasRef = useRef<HTMLCanvasElement>(null)

    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    // Every live input is read from this ref inside the loop, so no prop change
    // ever rebuilds the GL context.
    const vRef = useRef({
        bg: C_BG,
        div: 12,
        lobes: 6,
        wobble: 0.25,
        sharp: 0.25,
        echo: 1,
        hueSpread: 0.5,
        sat: 1,
        exposure: 1,
        speed: 1,
        spin: 1,
        hueSpeed: 1,
    })
    vRef.current = {
        bg: parseColor(background, C_BG),
        // Whole number or the atan branch cut becomes a visible radial seam.
        div: Math.max(2, Math.round(num(divisions, 12))),
        lobes: Math.max(0, Math.round(num(gPetals.lobes, 6))),
        wobble: (0.25 * num(gPetals.wobble, 100)) / 100,
        sharp: Math.max(0.01, num(sharpness, 25) / 100),
        echo: num(gPetals.echo, 100) / 100,
        hueSpread: (0.5 * num(gColor.hueSpread, 100)) / 100,
        sat: num(gColor.saturation, 100) / 100,
        exposure: num(gColor.exposure, 100) / 100,
        speed: num(speed, 50) / 50,
        spin: num(gPetals.spin, 100) / 100,
        hueSpeed: num(gColor.hueSpeed, 100) / 100,
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false })
        if (!gl) {
            console.error("FlowerExpansion: WebGL unavailable")
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
            console.error("FlowerExpansion link:", gl.getProgramInfoLog(prog))
            return
        }
        gl.useProgram(prog)

        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        const posLoc = gl.getAttribLocation(prog, "a_pos")
        gl.enableVertexAttribArray(posLoc)
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

        const u = {
            res: gl.getUniformLocation(prog, "uRes"),
            tSpin: gl.getUniformLocation(prog, "uTSpin"),
            tShear: gl.getUniformLocation(prog, "uTShear"),
            tWobble: gl.getUniformLocation(prog, "uTWobble"),
            tHue: gl.getUniformLocation(prog, "uTHue"),
            div: gl.getUniformLocation(prog, "uDiv"),
            lobes: gl.getUniformLocation(prog, "uLobes"),
            wobble: gl.getUniformLocation(prog, "uWobble"),
            sharp: gl.getUniformLocation(prog, "uSharp"),
            echo: gl.getUniformLocation(prog, "uEcho"),
            hueSpread: gl.getUniformLocation(prog, "uHueSpread"),
            sat: gl.getUniformLocation(prog, "uSat"),
            exposure: gl.getUniformLocation(prog, "uExposure"),
            bg: gl.getUniformLocation(prog, "uBg"),
        }

        let raf = 0
        let last = performance.now()
        // One accumulator per rate, so changing a rate prop never jumps a phase.
        let tSpin = 0
        let tShear = 0
        let tWobble = 0
        let tHue = 0

        const render = (now: number) => {
            const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
            last = now
            const v = vRef.current
            const step = dt * v.speed * BASE_RATE
            tSpin = (tSpin + step * v.spin + WRAP_SPIN) % WRAP_SPIN
            tShear = (tShear + step) % WRAP_SHEAR
            tWobble = (tWobble + step) % WRAP_WOBBLE
            tHue = (tHue + step * v.hueSpeed) % WRAP_HUE

            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            const cw = sizeRef.current.w || canvas.clientWidth || 1200
            const ch = sizeRef.current.h || canvas.clientHeight || 800
            const bw = Math.max(1, Math.round(cw * dpr))
            const bh = Math.max(1, Math.round(ch * dpr))
            if (canvas.width !== bw || canvas.height !== bh) {
                canvas.width = bw
                canvas.height = bh
                gl.viewport(0, 0, bw, bh)
            }

            gl.uniform2f(u.res, bw, bh)
            gl.uniform1f(u.tSpin, tSpin)
            gl.uniform1f(u.tShear, tShear)
            gl.uniform1f(u.tWobble, tWobble)
            gl.uniform1f(u.tHue, tHue)
            gl.uniform1f(u.div, v.div)
            gl.uniform1f(u.lobes, v.lobes)
            gl.uniform1f(u.wobble, v.wobble)
            gl.uniform1f(u.sharp, v.sharp)
            gl.uniform1f(u.echo, v.echo)
            gl.uniform1f(u.hueSpread, v.hueSpread)
            gl.uniform1f(u.sat, v.sat)
            gl.uniform1f(u.exposure, v.exposure)
            gl.uniform3f(u.bg, v.bg[0], v.bg[1], v.bg[2])

            gl.drawArrays(gl.TRIANGLES, 0, 3)
            raf = requestAnimationFrame(render)
        }

        raf = requestAnimationFrame(render)
        return () => cancelAnimationFrame(raf)
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
