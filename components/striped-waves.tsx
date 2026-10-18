"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const MAX_DPR = 2
const MAX_LINES = 128

type PresetKey = "1" | "2" | "3" | "4" | "5" | "6"

type Preset = {
    flowSpeed: number
    flowDirection: number
    zoom: number
    tilt: number
    posX: number
    posY: number
    layers: number
    theta: number
    twist: number
    shear: number
    shrink: number
    lineWidth: number
    waveAmount: number
    waveScale: number
    sideSpread: number
    glowSize: number
    softness: number
    falloff: number
    breathRate: number
    breathAmount: number
    phase: number
    colorTravel: number
    colorCycle: number
}

// The reference's six presets, verbatim. Their colours, background and blend
// mode are not here: those are the panel's Color rows (and Auto Contrast).
const PRESETS: Record<PresetKey, Preset> = {
    "1": {
        flowSpeed: 0.553, flowDirection: -1.43, zoom: 1.59, tilt: -2.8, posX: -0.21, posY: 0.06,
        layers: 59, theta: 1.58, twist: -0.52, shear: -0.55, shrink: 0.899, lineWidth: 3.05,
        waveAmount: 0.235, waveScale: 1.59, sideSpread: 0.05, glowSize: 0.0029, softness: 0.0071, falloff: 2.9,
        breathRate: 0.34, breathAmount: 0.15, phase: 32.41, colorTravel: -0.32, colorCycle: 2.0,
    },
    "2": {
        flowSpeed: 0.909, flowDirection: 1.24, zoom: 2.04, tilt: -1.69, posX: -0.01, posY: 0.06,
        layers: 64, theta: 1.58, twist: 0.39, shear: -0.55, shrink: 0.899, lineWidth: 0.55,
        waveAmount: 0.197, waveScale: 2.48, sideSpread: 0.15, glowSize: 0.0029, softness: 0.0071, falloff: 2.9,
        breathRate: 0.34, breathAmount: 0.15, phase: 32.41, colorTravel: -0.32, colorCycle: 2.0,
    },
    "3": {
        flowSpeed: 0.909, flowDirection: 0.99, zoom: 2.04, tilt: -0.66, posX: -0.01, posY: 0.06,
        layers: 44, theta: 1.82, twist: 0.5, shear: -0.55, shrink: 0.0, lineWidth: 13.2,
        waveAmount: 0.162, waveScale: 2.48, sideSpread: 0.4, glowSize: 0.0059, softness: 0.0084, falloff: 3.0,
        breathRate: 0.0, breathAmount: 0.0, phase: 24.79, colorTravel: 0.19, colorCycle: 2.0,
    },
    "4": {
        flowSpeed: 0.909, flowDirection: 0.99, zoom: 2.04, tilt: 0.06, posX: -0.01, posY: 0.06,
        layers: 44, theta: 1.82, twist: 0.5, shear: -0.55, shrink: 0.0, lineWidth: 8.15,
        waveAmount: 0.153, waveScale: 2.48, sideSpread: 0.13, glowSize: 0.0001, softness: 0.0344, falloff: 3.0,
        breathRate: 0.0, breathAmount: 0.0, phase: 24.79, colorTravel: 0.19, colorCycle: 2.0,
    },
    "5": {
        flowSpeed: 0.909, flowDirection: 1.24, zoom: 2.04, tilt: 0.06, posX: 0.04, posY: -0.01,
        layers: 7, theta: 0.14, twist: 0.5, shear: -1.62, shrink: 0.0, lineWidth: 36.05,
        waveAmount: 0.2, waveScale: 2.43, sideSpread: 0.13, glowSize: 0.0001, softness: 0.0344, falloff: 3.0,
        breathRate: 0.0, breathAmount: 0.0, phase: 1.92, colorTravel: -4.38, colorCycle: -0.67,
    },
    "6": {
        flowSpeed: 0.909, flowDirection: 0.6, zoom: 1.34, tilt: 2.53, posX: 0.19, posY: -0.11,
        layers: 11, theta: -0.18, twist: -0.57, shear: 0.06, shrink: 0.535, lineWidth: 46.2,
        waveAmount: 0.137, waveScale: 1.79, sideSpread: 0.33, glowSize: 0.0001, softness: 0.0344, falloff: 3.0,
        breathRate: 0.0, breathAmount: 0.0, phase: 34.95, colorTravel: -0.57, colorCycle: -0.27,
    },
}

const VERT_SRC = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`

// No backticks anywhere in this string: one inside a GLSL comment would end
// the template literal.
const FRAG_SRC = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;
uniform float uDpr;
uniform float uClock;
uniform float uFlow;
uniform float uBreath;
uniform float uZoom;
uniform float uZoomP;
uniform float uTilt;
uniform vec2  uPos;
uniform int   uLayers;
uniform float uTheta;
uniform float uTwist;
uniform float uShear;
uniform float uSpread;
uniform float uLineWidth;
uniform float uWaveAmount;
uniform float uWaveScale;
uniform float uGlowSize;
uniform float uSoftness;
uniform float uFalloff;
uniform float uColorTravel;
uniform float uColorCycle;
uniform vec3  uC1;
uniform vec3  uC2;
uniform vec3  uC3;
uniform vec3  uBg;
uniform float uHover;
uniform vec2  uHoverPos;

const int   MAX_LINES = ${MAX_LINES};
const float VIGNETTE = 0.10;
const float NOISE_AMOUNT = 0.0033;
const float HOVER_RADIUS = 0.42;

vec3 palette(float x) {
    x = fract(x) * 3.0;
    if (x < 1.0) return mix(uC1, uC2, smoothstep(0.0, 1.0, x));
    if (x < 2.0) return mix(uC2, uC3, smoothstep(0.0, 1.0, x - 1.0));
    return mix(uC3, uC1, smoothstep(0.0, 1.0, x - 2.0));
}

float grainHash(vec2 p, float f) {
    vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.103, 0.0973));
    q += dot(q, q.yzx + 33.33 + f * 0.013);
    return fract((q.x + q.y) * q.z);
}

vec2 rot(vec2 p, float a) {
    float c = cos(a);
    float s = sin(a);
    return mat2(c, s, -s, c) * p;
}

// Wire core: a hard edge with a 1.15 CSS px antialias ramp.
float lineProfile(float d, float width, float cssPixel) {
    float halfWidth = max(width, 0.01) * 0.5 * cssPixel;
    return 1.0 - smoothstep(halfWidth, halfWidth + cssPixel * 1.15, d);
}

// Glow: an inverse-square skirt outside the core, floored by softness.
float glowProfile(float d, float width, float cssPixel) {
    float halfWidth = max(width, 0.01) * 0.5 * cssPixel;
    float outside = max(d - halfWidth, 0.0) * 2.19;
    return uGlowSize / max(outside * outside + uSoftness, 1e-6) * 0.055;
}

// One twisted wire. q is the ribbon frame (already rotated by theta), n the
// wire's 0..1 position across the ribbon.
float lineShape(vec2 q, float index, float n, float time, float cssPixel) {
    float distribution = n - 0.5;
    float offset = distribution * uSpread;
    float curve = uShear * 0.035 * q.y * q.y;
    float phase = distribution * 1.35;

    float wave = sin(q.y * (1.18 * uWaveScale) + time * 0.46 + phase) * uWaveAmount;
    wave += sin(q.y * (2.31 * uWaveScale) - time * 0.18 + phase * 0.63) * (uWaveAmount * 0.19);
    wave += cos(q.y * (0.54 * uWaveScale) + time * 0.11 + phase * 0.31) * (uWaveAmount * 0.08);

    float twistAmount = abs(uTwist) * 0.055;
    float twistDirection = uTwist < 0.0 ? -1.0 : 1.0;
    float twistFrequency = 5.0 + abs(uTwist) * 5.0;
    float twistPhase = q.y * twistFrequency + time * 0.12 * twistDirection + index * 0.17;
    float twistX = sin(twistPhase) * twistAmount;
    float twistDepth = 0.5 + 0.5 * cos(twistPhase);
    twistX += sin(twistPhase * 2.0 + 0.8) * twistAmount * 0.12;

    float breathing = distribution * uBreath * 0.025;
    float x = q.x - offset - curve - wave - breathing - twistX;

    float twistStrength = clamp(abs(uTwist), 0.0, 1.0);
    float wireWidth = uLineWidth * mix(1.0, mix(0.78, 1.16, twistDepth), twistStrength);
    float d = abs(x);
    float core = lineProfile(d, wireWidth, cssPixel);
    float glow = glowProfile(d, wireWidth, cssPixel);
    float wireLight = mix(1.0, mix(0.72, 1.18, twistDepth), twistStrength);

    return max(core, glow) * wireLight * exp2(-abs(q.y) * uFalloff);
}

// three's sRGBTransferOETF, the body of its colorspace_fragment include.
vec3 toSRGB(vec3 c) {
    return mix(pow(c, vec3(0.41666)) * 1.055 - vec3(0.055), c * 12.92, vec3(lessThanEqual(c, vec3(0.0031308))));
}

void main() {
    vec2 I = gl_FragCoord.xy;
    vec2 screenP = (I - 0.5 * uRes) / uRes.y;

    vec2 p = (screenP - uPos) * uZoomP;
    p = rot(p, -uTilt);
    vec2 q = rot(p, -uTheta);

    float cssPixel = max(uZoom, 0.001) * uDpr / max(uRes.y, 1.0);
    float count = float(uLayers);
    float along = length(p);

    vec3 z = vec3(0.0);
    for (int j = 0; j < MAX_LINES; j++) {
        if (j >= uLayers) break;
        float i = float(j);
        float n = count > 1.0 ? i / (count - 1.0) : 0.5;
        float g = lineShape(q, i, n, uFlow, cssPixel);
        float k = 0.5 + 0.5 * sin(n * 6.283 + i * uColorCycle + uFlow * 1.2 + along * uColorTravel);
        z += g * palette(k);
    }

    // A soft radial boost centered on the pointer: wires under the cursor
    // brighten before the filmic curve rolls them off, reading as a glow.
    float hoverDist = length(screenP - uHoverPos);
    float hoverGlow = uHover * exp(-(hoverDist * hoverDist) / (2.0 * HOVER_RADIUS * HOVER_RADIUS));
    z *= 1.0 + hoverGlow * 1.4;

    // Filmic curve, then a per-channel toe that warms the highlights.
    vec3 x = max(z, 0.0);
    z = x * (2.51 * x + 0.03) / max(x * (2.43 * x + 0.59) + 0.14, vec3(1e-6));
    z = pow(clamp(z, 0.0, 1.0), vec3(0.85, 0.92, 0.98));
    z *= 1.0 - VIGNETTE * smoothstep(0.5, 1.6, length(screenP));

    // Auto Contrast: screen the light onto a dark ground, ink it onto a light one.
    float v = max(z.r, max(z.g, z.b));
    vec3 foreground = z / max(v, 1e-5);
    float alpha = clamp(pow(v, 0.62) * 1.55, 0.0, 1.0);
    float bgLum = dot(uBg, vec3(0.2126, 0.7152, 0.0722));
    if (bgLum < 0.52) {
        z = 1.0 - (1.0 - uBg) * (1.0 - z);
    } else {
        z = mix(uBg, uBg * foreground, alpha);
    }

    float grain = grainHash(floor(I / max(uDpr, 1e-4)), floor(uClock * 24.0)) - 0.5;
    z += grain * NOISE_AMOUNT;

    gl_FragColor = vec4(toSRGB(clamp(z, 0.0, 1.0)), 1.0);
}
`

type RGB = [number, number, number]

const colorCache = new Map<string, RGB | null>()

// Framer's Color control emits hex, rgb()/rgba() (comma or space syntax),
// hsl()/hsla(), and var(--token, <literal>) for shared styles.
function parseColor(input: string | undefined): RGB | null {
    if (!input) return null
    const key = String(input)
    if (colorCache.has(key)) return colorCache.get(key) ?? null
    let s = key.trim()
    const v = s.match(/^var\(\s*--[^,]+,\s*(.+)\)$/)
    if (v) s = v[1].trim()
    let out: RGB | null = null
    if (s.charAt(0) === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
        if (h.length >= 6) {
            const r = parseInt(h.slice(0, 2), 16)
            const g = parseInt(h.slice(2, 4), 16)
            const b = parseInt(h.slice(4, 6), 16)
            if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) out = [r / 255, g / 255, b / 255]
        }
    } else {
        const m = s.match(/^(rgba?|hsla?)\(([^)]*)\)/i)
        if (m) {
            const parts = m[2].split(/[\s,/]+/).filter(Boolean)
            const f = (i: number) => parseFloat(parts[i])
            if (parts.length >= 3 && [0, 1, 2].every((i) => Number.isFinite(f(i)))) {
                if (m[1].toLowerCase().startsWith("rgb")) {
                    const ch = (i: number) => (parts[i].endsWith("%") ? f(i) / 100 : f(i) / 255)
                    out = [ch(0), ch(1), ch(2)]
                } else {
                    const hh = (((f(0) % 360) + 360) % 360) / 360
                    const ss = f(1) / 100
                    const ll = f(2) / 100
                    const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss
                    const p = 2 * ll - q
                    const hue = (t: number) => {
                        t = t < 0 ? t + 1 : t > 1 ? t - 1 : t
                        if (t < 1 / 6) return p + (q - p) * 6 * t
                        if (t < 1 / 2) return q
                        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
                        return p
                    }
                    out = [hue(hh + 1 / 3), hue(hh), hue(hh - 1 / 3)]
                }
                out = out.map((c) => Math.min(1, Math.max(0, c))) as RGB
            }
        }
    }
    colorCache.set(key, out)
    return out
}

// three's SRGBToLinear, applied where the reference's THREE.Color did it.
function toLinear(c: RGB): RGB {
    return c.map((x) => (x < 0.04045 ? x * 0.0773993808 : Math.pow(x * 0.9478672986 + 0.0521327014, 2.4))) as RGB
}

function linearColor(input: string | undefined, fallback: string): RGB {
    return toLinear(parseColor(input) ?? (parseColor(fallback) as RGB))
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
        console.error("StripedWaves shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

const DEFAULTS = {
    background: "#0A0A0A",
    color1: "#002680",
    color2: "#6300DB",
    color3: "#0058CC",
}

type Props = {
    style?: React.CSSProperties
    preset?: PresetKey
    background?: string
    color1?: string
    color2?: string
    color3?: string
    speed?: number
    density?: number
    lineWidth?: number
    distance?: number
    angle?: number
    glowOnHover?: boolean
    hoverGlowIntensity?: number
    width?: number
    height?: number
}

export default function StripedWaves(props: Props) {
    const {
        style,
        preset = "2",
        background = DEFAULTS.background,
        color1 = DEFAULTS.color1,
        color2 = DEFAULTS.color2,
        color3 = DEFAULTS.color3,
        speed = 50,
        density = 200,
        lineWidth = 10,
        distance = 100,
        angle = 38,
        glowOnHover = true,
        hoverGlowIntensity = 100,
        width,
        height,
    } = props

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }
    const vRef = useRef({ preset, background, color1, color2, color3, speed: 1, density: 1, lineWidth: 1, distance: 1, angle: 0, glowOnHover: true, hoverGlowIntensity: 0.6 })
    vRef.current = {
        preset: PRESETS[preset] ? preset : "1",
        background,
        color1,
        color2,
        color3,
        // 50 is the preset's own rate and direction; negative reverses it.
        speed: clampN(num(speed, 50), -100, 100) / 50,
        density: clampN(num(density, 100), 10, 200) / 100,
        lineWidth: clampN(num(lineWidth, 100), 10, 400) / 100,
        distance: clampN(num(distance, 100), 25, 400) / 100,
        // Positive turns clockwise, as CSS rotate does. The shader's tilt is
        // counter-clockwise (GL y-up), hence the minus where it is applied.
        angle: (clampN(num(angle, 0), -180, 180) * Math.PI) / 180,
        glowOnHover: !!glowOnHover,
        hoverGlowIntensity: clampN(num(hoverGlowIntensity, 60), 0, 100) / 100,
    }

    // Pointer position (0..1 across the canvas) and an eased 0..1 hover
    // amount: 1 while the pointer is over the canvas, easing to 0 once it
    // leaves, so the glow fades in and out rather than cutting.
    const hoverRef = useRef({ nx: 0.5, ny: 0.5, amount: 0, target: 0 })
    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect()
        hoverRef.current.nx = (e.clientX - rect.left) / rect.width
        hoverRef.current.ny = (e.clientY - rect.top) / rect.height
        hoverRef.current.target = 1
    }
    const handlePointerLeave = () => {
        hoverRef.current.target = 0
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false, stencil: false })
        if (!gl) {
            console.error("StripedWaves: WebGL unavailable")
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
            console.error("StripedWaves link:", gl.getProgramInfoLog(prog))
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
            const dt = clampN((now - last) / 1000, 0, 0.05)
            last = now
            const v = vRef.current
            const P = PRESETS[v.preset as PresetKey]
            clock = (clock + dt * v.speed) % 3600

            const hoverFollow = 1 - Math.exp(-dt * 8.0)
            hoverRef.current.amount += (hoverRef.current.target - hoverRef.current.amount) * hoverFollow

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

            const breath = 0.5 + 0.25 * (Math.sin(clock * P.breathRate + 1) - Math.sin(clock * P.breathRate * 1.5))
            const spreadScale = 0.75 + 0.5 * clampN((P.shrink - 0.85) / 0.2, 0, 1)
            const layers = clampN(Math.round(P.layers * v.density), 1, MAX_LINES)

            const bg = linearColor(v.background, DEFAULTS.background)
            const c1 = linearColor(v.color1, DEFAULTS.color1)
            const c2 = linearColor(v.color2, DEFAULTS.color2)
            const c3 = linearColor(v.color3, DEFAULTS.color3)

            gl.uniform2f(u("uRes"), bw, bh)
            gl.uniform1f(u("uDpr"), dpr)
            gl.uniform1f(u("uClock"), clock)
            gl.uniform1f(u("uFlow"), clock * P.flowSpeed * P.flowDirection + P.phase)
            gl.uniform1f(u("uBreath"), breath)
            gl.uniform1f(u("uZoom"), P.zoom * v.distance)
            gl.uniform1f(u("uZoomP"), Math.max(0.001, (P.zoom - breath * P.breathAmount) * v.distance))
            gl.uniform1f(u("uTilt"), P.tilt - v.angle)
            gl.uniform2f(u("uPos"), P.posX, P.posY)
            gl.uniform1i(u("uLayers"), layers)
            gl.uniform1f(u("uTheta"), P.theta)
            gl.uniform1f(u("uTwist"), P.twist)
            gl.uniform1f(u("uShear"), P.shear)
            gl.uniform1f(u("uSpread"), P.sideSpread * spreadScale)
            gl.uniform1f(u("uLineWidth"), P.lineWidth * v.lineWidth)
            gl.uniform1f(u("uWaveAmount"), P.waveAmount)
            gl.uniform1f(u("uWaveScale"), P.waveScale)
            gl.uniform1f(u("uGlowSize"), P.glowSize)
            gl.uniform1f(u("uSoftness"), P.softness)
            gl.uniform1f(u("uFalloff"), P.falloff)
            gl.uniform1f(u("uColorTravel"), P.colorTravel)
            gl.uniform1f(u("uColorCycle"), P.colorCycle)
            gl.uniform3f(u("uC1"), c1[0], c1[1], c1[2])
            gl.uniform3f(u("uC2"), c2[0], c2[1], c2[2])
            gl.uniform3f(u("uC3"), c3[0], c3[1], c3[2])
            gl.uniform3f(u("uBg"), bg[0], bg[1], bg[2])
            const hoverAspect = bw / Math.max(bh, 1)
            const hoverX = (hoverRef.current.nx - 0.5) * hoverAspect
            const hoverY = 0.5 - hoverRef.current.ny
            gl.uniform1f(u("uHover"), (v.glowOnHover ? hoverRef.current.amount : 0) * v.hoverGlowIntensity)
            gl.uniform2f(u("uHoverPos"), hoverX, hoverY)

            gl.drawArrays(gl.TRIANGLES, 0, 3)
            raf = requestAnimationFrame(render)
        }

        raf = requestAnimationFrame(render)
        return () => cancelAnimationFrame(raf)
    }, [])

    return (
        <div
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
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
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
        </div>
    )
}
