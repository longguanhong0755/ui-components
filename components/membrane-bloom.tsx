"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

// Quality tier, not a design control (rule 10). Three field samples per pixel
// x up to 16 cells is a heavy per-pixel loop; 2x DPR quadruples it for nothing
// a blurred organic surface can show.
const MAX_DPR = 1.5

const MAX_CELLS = 16

// u_time units per second at Speed 50 — the sketch's millis() / 500.
const BASE_RATE = 2

// Exact wrap periods for the two shared clocks: sin(t * 0.2) and sin(t * 0.3).
const TWO_PI = Math.PI * 2
const WRAP_BREATH = TWO_PI / 0.2
const WRAP_ORBIT = TWO_PI / 0.3
const WRAP_DRIFT = 1e5

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
uniform float uTDrift;   // per-cell orbit angle clock
uniform float uTOrbit;   // orbit-radius clock
uniform float uTBreath;  // metaball-radius clock
uniform float uTLight;   // light-direction clock
uniform float uCount;
uniform float uSize;
uniform float uBreath;
uniform float uPole;     // squared singular radius; 0.99 shipped
uniform float uSpread;
uniform float uWrap;
uniform float uExposure;
uniform vec3  uBg;
uniform vec3  uBase;
uniform vec3  uAccent;
uniform vec4  uScatter;  // rgb tint, alpha is the strength

// The reference's wet-edge tint. Colour is DIVIDED by it, so a designer-facing
// swatch would read backwards (darker swatch = brighter frame); frozen.
const vec3 EDGE_TINT = vec3(0.1, 1.0, 0.9);

float safeDen(float d) {
    float s = d >= 0.0 ? 1.0 : -1.0;
    return s * max(abs(d), 1e-6);
}

vec3 safeDen3(vec3 d) {
    vec3 s = vec3(greaterThanEqual(d, vec3(0.0))) * 2.0 - 1.0;
    return s * max(abs(d), vec3(1e-4));
}

float hash(float n) {
    return fract(sin(n) * 43758.5453123);
}

vec2 cellPos(float id) {
    float a = hash(id) * 6.283 + uTDrift * (0.2 - hash(id + 2.1) * 0.25);
    float r = 1.0 - 0.4 * uSpread * sin(uTOrbit * 0.3 + id);
    return vec2(cos(a), sin(a)) * r;
}

float metaball(vec2 p, vec2 c, float r) {
    float d = length(p - c);
    return r * r / safeDen(d * d - uPole);
}

// getField runs three times per fragment (value + two gradient taps) and
// cellPos does not depend on p, so it looks like it wants hoisting into an
// array. Measured: 14% SLOWER that way. The compiler already commons the
// three identical calls, and a dynamically indexed local array spills.
float getField(vec2 p) {
    float field = 0.5;
    float breath = (sin(uTBreath * 0.2) * 0.25 + 0.25) * uBreath;
    float memR = (0.25 + breath * 0.25) * uSize;

    for (int i = 0; i < ${MAX_CELLS}; i++) {
        if (float(i) >= uCount) break;
        field += metaball(p, cellPos(float(i)), memR);
    }

    return clamp(field, 0.0, 4.0);
}

// The RAW gradient. It is exactly zero on a plateau where the field is
// clamped, which is where the reference's normalize() went NaN; main decides
// what that means rather than hiding it here.
vec2 getGradient(vec2 p) {
    float e = 0.005;
    float f = getField(p);
    return vec2(
        getField(p + vec2(e, 0.0)) - f,
        getField(p + vec2(0.0, e)) - f
    );
}

void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    vec2 p = uv - 1.0;
    p.x *= uRes.x / uRes.y;

    vec3 col = vec3(0.0);

    float field = getField(p);
    float surface = smoothstep(0.1, 1.0, field);

    if (surface > 0.01) {
        vec2 g = getGradient(p);
        // Inside a clamped core the gradient is exactly zero, the reference's
        // normalize() returned NaN, and a NaN colour is written to the
        // framebuffer as 0. Those black cores are load-bearing — they are the
        // holes the whole composition reads through — so they are produced
        // here on purpose instead of left to the driver.
        if (g.x == 0.0 && g.y == 0.0) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
        }
        vec3 n = normalize(vec3(normalize(g), 0.5));

        vec3 light = normalize(vec3(
            0.5 + sin(uTLight * 0.6),
            0.25,
            cos(uTLight * 0.4)
        ));

        // Wrapped diffuse.
        float diff = clamp((dot(n, light) + uWrap) / (2.0 + uWrap), 0.0, 1.0);

        // Backlight, subtracted below — this is what carves the black.
        float sss = clamp(dot(light, n), 0.0, 1.0) * smoothstep(0.1, 1.0, field);

        // Constant 0.19114 (see the header); pow() of a negative base is
        // undefined, so it is written out.
        float fe = 0.01 - max(dot(n, vec3(0.0, 0.0, 1.0)), 0.25);
        float fres = fe * fe;

        col = mix(uBase, uAccent, field * 0.95) * diff;
        col -= uScatter.rgb * sss * (1.8 * uScatter.a);
        col /= safeDen3(EDGE_TINT * fres * (0.4 / uExposure));
    }

    col = mix(uBg, col, surface);
    col *= smoothstep(3.0, 0.3, length(p));

    // Deliberately unclamped: below -0.25 the quotient flips positive, and
    // those flips are the hairline highlights along the caustics.
    col = col / safeDen3(col + vec3(0.25));
    // pow() of a negative base is undefined; measured, the driver returns
    // |x|^y, so a negative channel comes back BRIGHT, not black. Written out,
    // because the bright hairlines along the caustics are exactly those flips.
    col = pow(abs(col), vec3(0.99));

    gl_FragColor = vec4(col, 1.0);
}
`

function num(v: unknown, fb: number): number {
    return typeof v === "number" && isFinite(v) ? v : fb
}

// Parses hex, rgb()/rgba(), and hsl()/hsla() colour strings; a hex-only reader
// makes the colour dials look dead. Alpha is carried because Scatter's
// strength IS its alpha.
function parseColor(input: string | undefined, fb: [number, number, number, number]): [number, number, number, number] {
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
            const a = hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r / 255, g / 255, b / 255, a]
        }
        return fb
    }

    const nums = str.match(/-?[\d.]+/g)
    if (!nums || nums.length < 3) return fb
    const a = nums.length >= 4 ? Math.min(1, Math.max(0, parseFloat(nums[3]))) : 1

    if (/^hsla?/i.test(str)) {
        const h = ((parseFloat(nums[0]) % 360) + 360) / 360
        const s = Math.min(1, Math.max(0, parseFloat(nums[1]) / 100))
        const l = Math.min(1, Math.max(0, parseFloat(nums[2]) / 100))
        const c = (1 - Math.abs(2 * l - 1)) * s
        const x = c * (1 - Math.abs(((h * 6) % 2) - 1))
        const m = l - c / 2
        const t = Math.floor(h * 6) % 6
        const rgb: [number, number, number] =
            t === 0 ? [c, x, 0] : t === 1 ? [x, c, 0] : t === 2 ? [0, c, x] :
            t === 3 ? [0, x, c] : t === 4 ? [x, 0, c] : [c, 0, x]
        return [rgb[0] + m, rgb[1] + m, rgb[2] + m, a]
    }

    return [
        Math.min(255, Math.max(0, parseFloat(nums[0]))) / 255,
        Math.min(255, Math.max(0, parseFloat(nums[1]))) / 255,
        Math.min(255, Math.max(0, parseFloat(nums[2]))) / 255,
        a,
    ]
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("MembraneBloom shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

// ------------------------------------------------------------------ props

type FieldGroup = { size?: number; breath?: number; ring?: number; spread?: number }
type MotionGroup = { drift?: number; light?: number }
type MembraneGroup = { wrap?: number; scatter?: string; exposure?: number }

interface Props {
    style?: React.CSSProperties
    background?: string
    baseColor?: string
    accentColor?: string
    density?: number
    speed?: number
    field?: FieldGroup
    motion?: MotionGroup
    membrane?: MembraneGroup
    width?: number
    height?: number
}

// A group the designer never opened arrives undefined, so these are
// spread-merged rather than read through a hand-written ?? chain.
const D_FIELD: Required<FieldGroup> = { size: 100, breath: 100, ring: 100, spread: 100 }
const D_MOTION: Required<MotionGroup> = { drift: 100, light: 100 }
const D_MEMBRANE: Required<MembraneGroup> = { wrap: 50, scatter: "#FFE659", exposure: 100 }

const C_BG: [number, number, number, number] = [0.2, 0.1, 0.3, 1]
const C_BASE: [number, number, number, number] = [0.5, 0.28, 0.35, 1]
const C_ACCENT: [number, number, number, number] = [0.85, 0.45, 0.6, 1]
const C_SCATTER: [number, number, number, number] = [1, 0.9, 0.35, 1]

export default function MembraneBloom(props: Props) {
    const {
        style,
        background = "#331A4D",
        baseColor = "#804759",
        accentColor = "#D97399",
        density = 8,
        speed = 50,
        field,
        motion,
        membrane,
        width,
        height,
    } = props

    const gField = { ...D_FIELD, ...(field ?? {}) }
    const gMotion = { ...D_MOTION, ...(motion ?? {}) }
    const gMembrane = { ...D_MEMBRANE, ...(membrane ?? {}) }

    const canvasRef = useRef<HTMLCanvasElement>(null)

    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    // Every live input is read from this ref inside the loop, so no dial change
    // ever rebuilds the GL context (rule 6).
    const vRef = useRef({
        bg: C_BG,
        base: C_BASE,
        accent: C_ACCENT,
        scatter: C_SCATTER,
        count: 8,
        size: 1,
        breath: 1,
        pole: 0.99,
        spread: 1,
        wrap: 0.5,
        exposure: 1,
        speed: 1,
        drift: 1,
        light: 1,
    })
    // Ring is a radius, the uniform is its square: 0.99 is the shipped
    // (0.995 radius) pole, and the dial is a percent of that radius.
    const ringPct = Math.max(1, num(gField.ring, 100)) / 100
    vRef.current = {
        bg: parseColor(background, C_BG),
        base: parseColor(baseColor, C_BASE),
        accent: parseColor(accentColor, C_ACCENT),
        scatter: parseColor(gMembrane.scatter, C_SCATTER),
        count: Math.min(MAX_CELLS, Math.max(1, Math.round(num(density, 8)))),
        size: num(gField.size, 100) / 100,
        breath: num(gField.breath, 100) / 100,
        pole: 0.99 * ringPct * ringPct,
        spread: num(gField.spread, 100) / 100,
        wrap: num(gMembrane.wrap, 50) / 100,
        exposure: Math.max(0.1, num(gMembrane.exposure, 100) / 100),
        speed: num(speed, 50) / 50,
        drift: num(gMotion.drift, 100) / 100,
        light: num(gMotion.light, 100) / 100,
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false })
        if (!gl) {
            console.error("MembraneBloom: WebGL unavailable")
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
            console.error("MembraneBloom link:", gl.getProgramInfoLog(prog))
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
            tDrift: gl.getUniformLocation(prog, "uTDrift"),
            tOrbit: gl.getUniformLocation(prog, "uTOrbit"),
            tBreath: gl.getUniformLocation(prog, "uTBreath"),
            tLight: gl.getUniformLocation(prog, "uTLight"),
            count: gl.getUniformLocation(prog, "uCount"),
            size: gl.getUniformLocation(prog, "uSize"),
            breath: gl.getUniformLocation(prog, "uBreath"),
            pole: gl.getUniformLocation(prog, "uPole"),
            spread: gl.getUniformLocation(prog, "uSpread"),
            wrap: gl.getUniformLocation(prog, "uWrap"),
            exposure: gl.getUniformLocation(prog, "uExposure"),
            bg: gl.getUniformLocation(prog, "uBg"),
            base: gl.getUniformLocation(prog, "uBase"),
            accent: gl.getUniformLocation(prog, "uAccent"),
            scatter: gl.getUniformLocation(prog, "uScatter"),
        }

        let raf = 0
        let last = performance.now()
        // One accumulator per rate, so changing a rate dial never jumps a phase.
        let tDrift = 0
        let tOrbit = 0
        let tBreath = 0
        let tLight = 0

        const render = (now: number) => {
            const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
            last = now
            const v = vRef.current
            const step = dt * v.speed * BASE_RATE
            tDrift = (tDrift + step * v.drift) % WRAP_DRIFT
            tOrbit = (tOrbit + step) % WRAP_ORBIT
            tBreath = (tBreath + step) % WRAP_BREATH
            tLight = (tLight + step * v.light) % WRAP_BREATH

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
            gl.uniform1f(u.tDrift, tDrift)
            gl.uniform1f(u.tOrbit, tOrbit)
            gl.uniform1f(u.tBreath, tBreath)
            gl.uniform1f(u.tLight, tLight)
            gl.uniform1f(u.count, v.count)
            gl.uniform1f(u.size, v.size)
            gl.uniform1f(u.breath, v.breath)
            gl.uniform1f(u.pole, v.pole)
            gl.uniform1f(u.spread, v.spread)
            gl.uniform1f(u.wrap, v.wrap)
            gl.uniform1f(u.exposure, v.exposure)
            gl.uniform3f(u.bg, v.bg[0], v.bg[1], v.bg[2])
            gl.uniform3f(u.base, v.base[0], v.base[1], v.base[2])
            gl.uniform3f(u.accent, v.accent[0], v.accent[1], v.accent[2])
            gl.uniform4f(u.scatter, v.scatter[0], v.scatter[1], v.scatter[2], v.scatter[3])

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
