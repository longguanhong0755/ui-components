"use client"

import { useEffect, useRef } from "react"

// One place every control default lives, so the panel and defaultProps agree.
const DEFAULTS = {
    core: true,
    coreColor: "#6823C3",
    midColor: "#007BFF",
    accentColor: "#9900FF",
    outerColor: "#F9F9F9",
    detail: 20,
    brightness: 32,
    speed: 30,
    rotation: 15,
}

// The top of the Brightness slider drives the shader this far past neutral —
// the panel reads 0-100%, and the gas is still legible at the top of it.
const BRIGHTNESS_MAX = 3
// The still frame the Framer canvas gets — far enough in that the gas has
// evolved into filaments rather than the smooth noise it starts as.
const STATIC_TIME = 6

function clamp(n: any, min: number, max: number, fallback: number) {
    const v = typeof n === "number" ? n : parseFloat(n)
    if (!Number.isFinite(v)) return fallback
    return Math.min(max, Math.max(min, v))
}

// Colours are hex or an rgb()/rgba() string, parsed here directly.
function rgbOf(value: any, fallback: string): [number, number, number] {
    const s = typeof value === "string" && value ? value.trim() : fallback
    const hex = s.replace("#", "")
    if (/^[0-9a-f]{3}$/i.test(hex)) {
        return [
            parseInt(hex[0] + hex[0], 16) / 255,
            parseInt(hex[1] + hex[1], 16) / 255,
            parseInt(hex[2] + hex[2], 16) / 255,
        ]
    }
    if (/^[0-9a-f]{6,8}$/i.test(hex)) {
        return [
            parseInt(hex.slice(0, 2), 16) / 255,
            parseInt(hex.slice(2, 4), 16) / 255,
            parseInt(hex.slice(4, 6), 16) / 255,
        ]
    }
    const m = s.match(/rgba?\(([^)]+)\)/i)
    if (m) {
        const parts = m[1].split(",").map((p) => parseFloat(p))
        if (parts.length >= 3) {
            return [parts[0] / 255, parts[1] / 255, parts[2] / 255]
        }
    }
    return rgbOf(null, fallback === s ? "#FFFFFF" : fallback)
}

// Panel values are whole numbers on friendly ranges; the shader wants the
// fractional ones, so the mapping lives here only.
function settingsFor(p: any) {
    return {
        core: p?.core !== false,
        coreColor: rgbOf(p?.coreColor, DEFAULTS.coreColor),
        midColor: rgbOf(p?.midColor, DEFAULTS.midColor),
        accentColor: rgbOf(p?.accentColor, DEFAULTS.accentColor),
        outerColor: rgbOf(p?.outerColor, DEFAULTS.outerColor),
        // 1-20 spread across the octave scale the fbm reads well at.
        detail: 1 + (clamp(p?.detail, 1, 20, DEFAULTS.detail) / 20) * 4,
        brightness:
            (clamp(p?.brightness, 0, 100, DEFAULTS.brightness) / 100) *
            BRIGHTNESS_MAX,
        speed: clamp(p?.speed, 0, 30, DEFAULTS.speed) / 10,
        rotation: clamp(p?.rotation, 0, 20, DEFAULTS.rotation) / 20,
    }
}

const VERT = `
attribute vec4 a_pos;
void main() {
    gl_Position = a_pos;
}
`

const FRAG = `
precision highp float;
uniform float u_time;
uniform vec2 u_res;
uniform vec3 u_core;
uniform bool u_showCore;
uniform vec3 u_mid;
uniform vec3 u_accent;
uniform vec3 u_outer;
uniform float u_complexity;
uniform float u_bright;
uniform float u_rotSpeed;

mat2 rot(float a) { float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }

float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}

float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 7; i++) {
        v += a * noise(p); p *= rot(0.5); p *= 2.1; a *= 0.5;
    }
    return v;
}

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * u_res.xy) / min(u_res.y, u_res.x);
    float t = u_time * 0.1;

    p *= rot(u_time * u_rotSpeed * 0.05);

    float dist = length(p);

    float angleNoise = fbm(p * 3.0 + t * 0.5) * 0.3;
    float distortedDist = dist + angleNoise * smoothstep(0.5, 0.0, dist);

    vec2 nebP = p * u_complexity;

    vec2 q = vec2(fbm(nebP + vec2(cos(t), sin(t))), fbm(nebP + 1.2));
    vec2 r = vec2(fbm(nebP + 4.0 * q + t), fbm(nebP + 4.0 * q + 2.8));
    float f = fbm(nebP + 4.0 * r);

    float coreMask = smoothstep(0.8, 0.0, distortedDist) * (0.5 + 0.5 * smoothstep(0.1, 0.9, f));
    float coreGlow = exp(-3.0 * distortedDist);

    vec3 colCore = u_showCore ? u_core * (coreMask * 2.0 + coreGlow * 1.5) : vec3(0.0);

    float ring = smoothstep(0.05, 0.35, dist) * smoothstep(0.9, 0.3, dist);
    float filament = pow(f, 1.2);

    vec3 colMix = mix(u_mid, u_accent, smoothstep(0.2, 0.6, f));
    colMix = mix(colMix, u_outer, smoothstep(0.4, 0.9, f));
    vec3 colOuter = colMix * ring * filament * 2.0;

    float dust = smoothstep(0.3, 0.9, fbm(nebP * 1.5 + r));
    dust = mix(1.0, dust, smoothstep(0.0, 0.3, dist));

    vec3 finalCol = (colCore + colOuter) * dust * u_bright;
    finalCol += u_showCore ? u_mid * coreMask * ring * 0.8 : vec3(0.0);

    // Alpha carries the light so the frame's own fill shows through the dark
    // gaps instead of the component painting its own black sky.
    float lum = max(finalCol.r, max(finalCol.g, finalCol.b));
    gl_FragColor = vec4(finalCol, clamp(lum, 0.0, 1.0));
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string) {
    const s = gl.createShader(type)
    if (!s) return null
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn("CosmicBG shader:", gl.getShaderInfoLog(s))
        gl.deleteShader(s)
        return null
    }
    return s
}

function buildProgram(gl: WebGLRenderingContext) {
    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return null
    const prog = gl.createProgram()
    if (!prog) return null
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    // The shaders live on inside the linked program, so the objects
    // themselves are no longer needed either way.
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.warn("CosmicBG link:", gl.getProgramInfoLog(prog))
        gl.deleteProgram(prog)
        return null
    }
    return prog
}

export interface CosmicBGProps {
    /** The bright centre the gas rings sit around */
    core?: boolean
    coreColor?: string
    midColor?: string
    accentColor?: string
    outerColor?: string
    /** How fine the gas filaments break up */
    detail?: number
    brightness?: number
    /** How fast the gas churns */
    speed?: number
    rotation?: number
    style?: React.CSSProperties
}

/**
 * Cosmic Background — a rosette nebula drawn in WebGL.
 *
 * The canvas is transparent wherever the nebula has no light, so the frame's
 * own fill is the night sky behind it.
 */
export default function CosmicBG(props: CosmicBGProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    // Live props for the render loop — the loop starts once and reads the
    // newest values through this ref instead of restarting on every edit.
    const propsRef = useRef(props)
    propsRef.current = props

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", {
            antialias: true,
            alpha: true,
            depth: false,
            premultipliedAlpha: true,
        })
        if (!gl) return

        const program = buildProgram(gl)
        if (!program) return

        // Additive: a filament only ever adds light, which is what keeps the
        // overlaps glowing instead of occluding.
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.ONE, gl.ONE)

        const u = {
            time: gl.getUniformLocation(program, "u_time"),
            res: gl.getUniformLocation(program, "u_res"),
            core: gl.getUniformLocation(program, "u_core"),
            showCore: gl.getUniformLocation(program, "u_showCore"),
            mid: gl.getUniformLocation(program, "u_mid"),
            accent: gl.getUniformLocation(program, "u_accent"),
            outer: gl.getUniformLocation(program, "u_outer"),
            complexity: gl.getUniformLocation(program, "u_complexity"),
            bright: gl.getUniformLocation(program, "u_bright"),
            rotSpeed: gl.getUniformLocation(program, "u_rotSpeed"),
        }
        const aPos = gl.getAttribLocation(program, "a_pos")

        const quadBuffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, 1, 1, 1, -1, -1, 1, -1]),
            gl.STATIC_DRAW
        )

        function resize() {
            // Capped at 2 — a nebula is all soft gradients, and a phone's 3x
            // buffer costs three times the fill rate for nothing visible.
            const dpr = Math.min(2, window.devicePixelRatio || 1)
            const w = Math.round(canvas!.clientWidth * dpr)
            const h = Math.round(canvas!.clientHeight * dpr)
            if (!w || !h) return false
            if (canvas!.width !== w || canvas!.height !== h) {
                canvas!.width = w
                canvas!.height = h
            }
            return true
        }

        function draw(time: number) {
            if (!resize()) return
            const S = settingsFor(propsRef.current)

            gl!.viewport(0, 0, gl!.canvas.width, gl!.canvas.height)
            // Cleared to nothing, not to a colour — the frame behind the
            // component is the sky.
            gl!.clearColor(0, 0, 0, 0)
            gl!.clear(gl!.COLOR_BUFFER_BIT)
            gl!.useProgram(program!)

            gl!.uniform1f(u.time, time * S.speed)
            gl!.uniform2f(u.res, gl!.canvas.width, gl!.canvas.height)
            gl!.uniform3fv(u.core, S.coreColor)
            gl!.uniform1i(u.showCore, S.core ? 1 : 0)
            gl!.uniform3fv(u.mid, S.midColor)
            gl!.uniform3fv(u.accent, S.accentColor)
            gl!.uniform3fv(u.outer, S.outerColor)
            gl!.uniform1f(u.complexity, S.detail)
            gl!.uniform1f(u.bright, S.brightness)
            gl!.uniform1f(u.rotSpeed, S.rotation)

            gl!.bindBuffer(gl!.ARRAY_BUFFER, quadBuffer)
            gl!.vertexAttribPointer(aPos, 2, gl!.FLOAT, false, 0, 0)
            gl!.enableVertexAttribArray(aPos)
            gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4)
        }

        const cleanupGL = () => {
            gl.deleteBuffer(quadBuffer)
            gl.deleteProgram(program)
        }

        let raf = 0
        const start = performance.now()
        function loop(now: number) {
            draw((now - start) / 1000)
            raf = window.requestAnimationFrame(loop)
        }
        raf = window.requestAnimationFrame(loop)

        return () => {
            window.cancelAnimationFrame(raf)
            cleanupGL()
        }
        // Only the renderer restarts the context; every prop change is picked
        // up live through propsRef.
    }, [])

    return (
        <canvas
            ref={canvasRef}
            style={{
                width: "100%",
                height: "100%",
                display: "block",
                ...(props.style || {}),
            }}
        />
    )
}

CosmicBG.displayName = "Cosmic Background"
CosmicBG.defaultProps = { ...DEFAULTS }
