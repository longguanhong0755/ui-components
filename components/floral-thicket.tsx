"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const MAX_DPR = 1.5 // quality tier, not a design control (rule 10)
const LAYERS = 3 // depth count is a twin of Density, so it is a constant (rule 11b)
const MAX_COLORS = 6 // matches uColors[6] in the shader; the Colors control caps at the same count

// Cells per unit height, per layer. Far layers are denser, so their flowers are
// smaller — literal perspective on top of the aerial kind.
const LAYER_SCALE = [2.1, 1.45, 1.0]
// Cells per second at Speed 50. Screen rate is this over the layer scale, so the
// near layer travels fastest even though its number is smallest.
const LAYER_RATE = [0.038, 0.05, 0.062]
// Fall physics per layer — not user knobs, twins of Gravity (rule 11b). Terminal
// velocity follows dv/dt = rate*Gravity - DRAG*v, so a flower speeds up then
// settles into a steady fall instead of accelerating forever. Spin is driven by
// fall speed, so tumble only appears once something is actually falling.
const GRAVITY_RATE = [0.05, 0.08, 0.12]
const GRAVITY_DRAG = 1.1
const SPIN_RATE = [1.3, 1.7, 2.2]
const TWO_PI = Math.PI * 2

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
uniform vec3  uBg;
uniform vec3  uColors[6];
uniform float uColorCount;
uniform float uDensity;
uniform float uPetals;
uniform float uLeafMix;
uniform float uLine;
uniform float uScatter;
uniform float uFalloff;
uniform float uFade;
uniform vec2  uOff0;
uniform vec2  uOff1;
uniform vec2  uOff2;
uniform vec3  uSpin;

const float TAU = 6.28318530718;
const float PERIOD = 512.0;

float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

float vn2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x),
               mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
}

vec2 rot(vec2 v, float a) {
    float c = cos(a), s = sin(a);
    return vec2(c * v.x + s * v.y, -s * v.x + c * v.y);
}

// Picks one of the palette entries per bloom. The loop index is a compile-time
// constant per iteration, which is what makes array indexing by it legal under
// GLSL ES 1.00 — a variable index straight into uColors[] is not.
vec3 pickColor(float t) {
    float idxf = floor(t * uColorCount);
    vec3 result = uColors[0];
    for (int i = 0; i < 6; i++) {
        if (float(i) == idxf) result = uColors[i];
    }
    return result;
}

// One bloom or one sprig, in cell units. x = coverage, y = ink.
// core 1.0 draws a stamen ring and a filled centre; core 0.0 draws a midrib
// instead, which is what turns the same fold into foliage.
vec2 bloom(vec2 q, float R, float petals, float elong, float core, float lw, float aa) {
    vec2 qe = vec2(q.x / elong, q.y);
    float rad = length(qe);
    if (rad > R + aa * 2.0) return vec2(0.0);

    float ang = atan(qe.y, qe.x);
    float k = TAU / petals;
    float a = abs(mod(ang + k * 0.5, k) - k * 0.5);
    float lat = rad * sin(a);

    // A petal is a lobe: zero width where it leaves the core, widest a third of
    // the way out, rounded at the tip. The exponent is what keeps the profile
    // flat across the middle instead of collapsing to a lens.
    float t = clamp(rad / R, 0.0, 1.0);
    float lobe = R * 0.50 * pow(sin(3.14159265 * t), 0.55);
    // Near the core the lobe would overrun its own wedge and petals would merge
    // into a disc, so the room the wedge actually has takes over there.
    // 0.80, not 1.0: at full room adjacent petals share an edge and the bloom
    // renders as one polygon with spokes drawn on it. The gap is the flower.
    float room = rad * sin(k * 0.5) * 0.80;
    float w = min(room, lobe);

    float d = max(lat - w, rad - R);
    float fill = smoothstep(aa, -aa, d);
    if (fill <= 0.0) return vec2(0.0);

    // Outline sits INSIDE the boundary, so the band runs from d = -2lw to 0 and
    // the fill mask clips whatever leaks past the edge.
    float ink = 1.0 - smoothstep(lw - aa, lw + aa, abs(d + lw));

    float dot1 = length(vec2(rad - R * 0.34, lat)) - lw * 1.5;
    float mid = rad - R * 0.17;
    float marks = max(1.0 - smoothstep(-aa, aa, dot1), 1.0 - smoothstep(-aa, aa, mid)) * core;
    float rib = (1.0 - smoothstep(lw * 0.6 - aa, lw * 0.6 + aa, lat)) * (1.0 - core) * step(rad, R * 0.9);
    ink = max(ink, max(marks, rib));

    return vec2(fill, min(ink, fill));
}

vec3 layer(vec3 col, vec2 uv, float scl, vec2 off, float seed, float gray, vec3 inkCol, float spin) {
    float aa = scl / uRes.y * 0.75;
    vec2 p = uv * scl - off;
    vec2 ip = floor(p);

    for (int dy = 1; dy >= -1; dy--) {
        for (int dx = -1; dx <= 1; dx++) {
            vec2 id = ip + vec2(float(dx), float(dy));
            vec2 hid = mod(id, PERIOD) + seed;

            float h1 = h21(hid);
            float h2 = h21(hid + 19.7);
            float h3 = h21(hid + 41.3);
            float h4 = h21(hid + 73.1);
            float h5 = h21(hid + 91.9);
            float h6 = h21(hid + 53.7);

            vec2 c = id + 0.5 + (vec2(h1, h2) - 0.5) * 0.5;
            vec2 q = p - c;

            float isLeaf = step(h3, uLeafMix);
            float R = 0.60 * (1.0 + (h4 - 0.5) * uScatter);
            float elong = mix(1.0, 1.7, isLeaf);
            R *= mix(1.0, 0.82, isLeaf);

            float reach = R * elong + aa;
            if (dot(q, q) > reach * reach) continue;

            // Two lobes through the centre plus the elongation is a leaf; three
            // would be a trefoil.
            float petals = mix(max(4.0, uPetals + floor(h5 * 3.0) - 1.0), 2.0, isLeaf);
            // Line weight is a fraction of the PETAL, not of the flower. At 0.10 of
            // R the band was wider than a petal is at its waist and every bloom
            // filled solid with ink.
            float lw = max(aa * 0.8, R * 0.022 * uLine);
            // Tumble: gravity's fall speed feeds back in as extra spin, so a
            // flower only tumbles once it is actually falling.
            vec2 s = bloom(rot(q, h2 * TAU + spin), R, petals, elong, 1.0 - isLeaf, lw, aa);
            if (s.x <= 0.0) continue;

            // Per-shape brightness variance is what reads as ink density: some
            // blooms come out white, their neighbours mid grey.
            float g = mix(0.32, 1.0, h1 * 0.6 + h5 * 0.4) * gray;
            vec3 pc = pickColor(h6);
            vec3 sc = mix(pc * g, inkCol, s.y);
            col = mix(col, sc, s.x);
        }
    }
    return col;
}

void main() {
    vec2 frag = gl_FragCoord.xy / uRes;
    float aspect = uRes.x / max(1.0, uRes.y);
    vec2 uv = vec2(frag.x * aspect, frag.y);

    vec3 inkCol = uBg * 0.55;
    vec3 col = uBg;

    float fade = 1.0 - uFade;
    col = layer(col, uv, uDensity * ${LAYER_SCALE[0].toFixed(3)}, uOff0, 3.70, fade, inkCol, uSpin.x);
    col = layer(col, uv, uDensity * ${LAYER_SCALE[1].toFixed(3)}, uOff1, 137.10, mix(fade, 1.0, 0.5), inkCol, uSpin.y);
    col = layer(col, uv, uDensity * ${LAYER_SCALE[2].toFixed(3)}, uOff2, 271.90, 1.0, inkCol, uSpin.z);

    // The dark middle is a vignette turned inside out: light lives at the edges
    // and falls off inward. A low-frequency wobble on the radius keeps the blob
    // from reading as a perfect circle.
    vec2 n = frag * 2.0 - 1.0;
    float wob = 0.82 + 0.36 * vn2(n * 1.3 + 11.0);
    float lt = smoothstep(0.0, max(0.02, uFalloff * wob), length(n));
    float light = mix(0.045, 1.0, pow(lt, 1.35));

    gl_FragColor = vec4(clamp(col * light, 0.0, 1.0), 1.0);
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

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("FloralThicket shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

type FlowersGroup = { petals?: number; leafMix?: number; lineWeight?: number; scatter?: number }

interface FloralThicketProps {
    style?: React.CSSProperties
    background?: string
    colors?: string[]
    density?: number
    speed?: number
    direction?: number
    gravity?: number
    falloff?: number
    depthFade?: number
    flowers?: FlowersGroup
    width?: number
    height?: number
}

const D_FLOWERS: Required<FlowersGroup> = { petals: 7, leafMix: 45, lineWeight: 40, scatter: 55 }

export default function FloralThicket(props: FloralThicketProps) {
    const {
        style,
        background = "#000000",
        colors = ["#FF0000", "#FFF300", "#B7FF00", "#9800FF"],
        density = 15,
        speed = 500,
        direction = 254,
        gravity = 55,
        falloff = 49,
        depthFade = 81,
        flowers,
        width,
        height,
    } = props

    const F = { ...D_FLOWERS, ...(flowers ?? {}) }

    const canvasRef = useRef<HTMLCanvasElement>(null)

    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    const vRef = useRef({
        bg: [0, 0, 0] as [number, number, number],
        colors: [[1, 1, 1]] as [number, number, number][],
        density: 18,
        speed: 1,
        dir: [0, 1] as [number, number],
        falloff: 1.05,
        fade: 0.7,
        petals: 7,
        leafMix: 0.45,
        line: 1,
        scatter: 0.55,
    })
    vRef.current = {
        bg: parseColor(background, [0, 0, 0]),
        colors: (Array.isArray(colors) && colors.length > 0 ? colors : ["#EFEFEF"])
            .slice(0, MAX_COLORS)
            .map((c) => parseColor(c, [0.937, 0.937, 0.937])),
        density: Math.max(1, num(density, 18)),
        speed: num(speed, 50) / 50,
        dir: [
            Math.cos((num(direction, 90) * Math.PI) / 180),
            Math.sin((num(direction, 90) * Math.PI) / 180),
        ],
        gravity: num(gravity, 55) / 100,
        // Falloff is how far out the darkness reaches. The frame's half-diagonal
        // is sqrt(2), so 100% still leaves the corners lit.
        falloff: (num(falloff, 62) / 100) * 1.7,
        fade: num(depthFade, 60) / 100,
        petals: Math.max(3, Math.round(num(F.petals, 7))),
        leafMix: num(F.leafMix, 45) / 100,
        // 40 is the shipped weight, so the dial reads 1.0 there.
        line: num(F.lineWeight, 40) / 40,
        scatter: num(F.scatter, 55) / 100,
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false })
        if (!gl) {
            console.error("FloralThicket: WebGL unavailable")
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
            console.error("FloralThicket link:", gl.getProgramInfoLog(prog))
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
            bg: gl.getUniformLocation(prog, "uBg"),
            colors: gl.getUniformLocation(prog, "uColors[0]"),
            colorCount: gl.getUniformLocation(prog, "uColorCount"),
            density: gl.getUniformLocation(prog, "uDensity"),
            petals: gl.getUniformLocation(prog, "uPetals"),
            leafMix: gl.getUniformLocation(prog, "uLeafMix"),
            line: gl.getUniformLocation(prog, "uLine"),
            scatter: gl.getUniformLocation(prog, "uScatter"),
            falloff: gl.getUniformLocation(prog, "uFalloff"),
            fade: gl.getUniformLocation(prog, "uFade"),
            off0: gl.getUniformLocation(prog, "uOff0"),
            off1: gl.getUniformLocation(prog, "uOff1"),
            off2: gl.getUniformLocation(prog, "uOff2"),
            spin: gl.getUniformLocation(prog, "uSpin"),
        }

        // Cell-space travel per layer. Wrapped at PERIOD, which the shader also
        // takes the cell id modulo, so the wrap is a no-op on the field.
        const dist = [0, 0, 0]
        // Gravity's own accumulators: fallVel is the terminal-velocity ODE state,
        // fallPos is straight-down travel (independent of wind direction), spin
        // is the tumble angle it feeds. All three wrap for the same float-
        // precision reason dist does.
        const fallVel = [0, 0, 0]
        const fallPos = [0, 0, 0]
        const spin = [0, 0, 0]
        const offs = [u.off0, u.off1, u.off2]
        let raf = 0
        let last = performance.now()

        const render = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            const v = vRef.current

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
            gl.uniform3fv(u.bg, v.bg)
            const palette = new Float32Array(MAX_COLORS * 3)
            for (let i = 0; i < MAX_COLORS; i++) {
                const c = v.colors[i % v.colors.length]
                palette[i * 3] = c[0]
                palette[i * 3 + 1] = c[1]
                palette[i * 3 + 2] = c[2]
            }
            gl.uniform3fv(u.colors, palette)
            gl.uniform1f(u.colorCount, v.colors.length)
            gl.uniform1f(u.density, v.density)
            gl.uniform1f(u.petals, v.petals)
            gl.uniform1f(u.leafMix, v.leafMix)
            gl.uniform1f(u.line, v.line)
            gl.uniform1f(u.scatter, v.scatter)
            gl.uniform1f(u.falloff, v.falloff)
            gl.uniform1f(u.fade, v.fade)

            for (let i = 0; i < LAYERS; i++) {
                dist[i] = (dist[i] + dt * v.speed * LAYER_RATE[i]) % 512
                fallVel[i] += (GRAVITY_RATE[i] * v.gravity - GRAVITY_DRAG * fallVel[i]) * dt
                fallPos[i] = (fallPos[i] + fallVel[i] * dt) % 512
                spin[i] = (spin[i] + SPIN_RATE[i] * fallVel[i] * dt) % TWO_PI
                gl.uniform2f(offs[i], v.dir[0] * dist[i], v.dir[1] * dist[i] + fallPos[i])
            }
            gl.uniform3f(u.spin, spin[0], spin[1], spin[2])

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
