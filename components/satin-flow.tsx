"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const VERTEX_SRC = `
attribute vec4 a_position;
void main() { gl_Position = a_position; }
`

// Fragment shader ported verbatim from the source SatinFlow.
const FRAGMENT_SRC = `
precision mediump float;

uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;
uniform float iMouseStrength;

uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uSpeed;
uniform float uScale;
uniform float uNoiseIntensity;
uniform float uInteractive;

vec3 hash(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
             dot(p, vec3(269.5, 183.3, 246.1)),
             dot(p, vec3(113.5, 271.9, 124.6)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(dot(hash(i + vec3(0.0,0.0,0.0)), f - vec3(0.0,0.0,0.0)),
                       dot(hash(i + vec3(1.0,0.0,0.0)), f - vec3(1.0,0.0,0.0)), u.x),
                   mix(dot(hash(i + vec3(0.0,1.0,0.0)), f - vec3(0.0,1.0,0.0)),
                       dot(hash(i + vec3(1.0,1.0,0.0)), f - vec3(1.0,1.0,0.0)), u.x), u.y),
               mix(mix(dot(hash(i + vec3(0.0,0.0,1.0)), f - vec3(0.0,0.0,1.0)),
                       dot(hash(i + vec3(1.0,0.0,1.0)), f - vec3(1.0,0.0,1.0)), u.x),
                   mix(dot(hash(i + vec3(0.0,1.0,1.0)), f - vec3(0.0,1.0,1.0)),
                       dot(hash(i + vec3(1.0,1.0,1.0)), f - vec3(1.0,1.0,1.0)), u.x), u.y), u.z);
}

float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    vec3 shift = vec3(100.0);
    for (int i = 0; i < 4; ++i) {
        v += a * noise(p);
        p = p * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 p = (2.0 * fragCoord.xy - iResolution.xy) / min(iResolution.x, iResolution.y);

    vec2 mouseUV = (2.0 * iMouse - iResolution.xy) / min(iResolution.x, iResolution.y);
    float mouseDist = length(p - mouseUV);
    float interact = exp(-mouseDist * mouseDist * 3.5) * iMouseStrength * uInteractive;

    p += (p - mouseUV) / (mouseDist + 0.001) * interact * 0.18;

    float t = iTime * uSpeed * 0.05;

    float scale = uScale * 2.2;
    vec3 p3 = vec3(p * scale, t);

    float n1 = fbm(p3);
    float n2 = fbm(p3 + vec3(n1 * 1.5, n1 * 1.2, 0.5));
    float n3 = fbm(p3 + vec3(n2 * 2.0, n2 * 1.0, 0.8));

    float pattern = 0.5 + 0.5 * sin(p.y * scale + n3 * 6.28);

    float shadow = clamp(n3 * 1.1, -0.5, 0.5);
    float highlight = pow(max(0.0, 1.0 - abs(n2)), 3.5) * 0.42;

    vec3 baseCol = mix(uColor1, uColor2, clamp(pattern + shadow, 0.0, 1.0));
    baseCol = mix(baseCol, uColor3, clamp(n1 * 1.4 + 0.5, 0.0, 1.0));

    vec3 col = baseCol + vec3(highlight) + vec3(interact * 0.08);

    float rnd = fract(sin(dot(fragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    col -= (rnd - 0.5) * 0.04 * uNoiseIntensity;

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}

void main() { mainImage(gl_FragColor, gl_FragCoord.xy); }
`

// Framer ControlType.Color emits "#rgb", "#rrggbb", "#rrggbbaa", or "rgb()/rgba()".
// The source's parseInt(hex,16) breaks on all but "#rrggbb" — this handles them all.
function parseColor(input: string): [number, number, number] {
    const fallback: [number, number, number] = [0, 0, 0]
    if (!input) return fallback
    const str = input.trim()
    if (str[0] === "#") {
        let hex = str.slice(1)
        if (hex.length === 3 || hex.length === 4) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
        }
        if (hex.length >= 6) {
            const r = parseInt(hex.slice(0, 2), 16)
            const g = parseInt(hex.slice(2, 4), 16)
            const b = parseInt(hex.slice(4, 6), 16)
            if (!isNaN(r) && !isNaN(g) && !isNaN(b))
                return [r / 255, g / 255, b / 255]
        }
        return fallback
    }
    const m = str.match(/[\d.]+/g)
    if (m && m.length >= 3) {
        return [
            Math.min(255, parseFloat(m[0])) / 255,
            Math.min(255, parseFloat(m[1])) / 255,
            Math.min(255, parseFloat(m[2])) / 255,
        ]
    }
    return fallback
}

function compileShader(
    gl: WebGLRenderingContext,
    type: number,
    src: string
): WebGLShader | null {
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, src)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
    }
    return shader
}

function num(v: number, fallback: number): number {
    return Number.isFinite(v) ? v : fallback
}

type Props = {
    color1?: string
    color2?: string
    color3?: string
    speed?: number // whole-number percent (100 = 1.0x)
    scale?: number // percent (100 = 1.0)
    noiseIntensity?: number // percent (100 = 1.0)
    interactive?: boolean
    blur?: number // px
    width?: number // injected by Framer — reliable even when clientWidth is 0
    height?: number
    style?: React.CSSProperties
}

type Values = {
    colors: [number, number, number][]
    speed: number
    scale: number
    noise: number
    interactive: boolean
}

export default function SatinFlow(props: Props) {
    const {
        color1 = "#2538FF",
        color2 = "#6700FF",
        color3 = "#0AD5FF",
        speed = 400,
        scale = 20,
        noiseIntensity = 0,
        interactive = true,
        blur = 0,
        width,
        height,
        style,
    } = props

    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Framer's canvas can read clientWidth as 0 at draw time; the injected
    // width/height props are reliable. Mirror them into a ref for the loop.
    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = {
        w: num(width as number, 0),
        h: num(height as number, 0),
    }

    // Live uniform values, recomputed each render into a ref so the GL loop
    // (built once) always reads current props without rebuilding the context.
    const valuesRef = useRef<Values>({
        colors: [
            parseColor("#150921"),
            parseColor("#371569"),
            parseColor("#7822D6"),
        ],
        speed: 1,
        scale: 1,
        noise: 0.5,
        interactive: true,
    })
    valuesRef.current = {
        colors: [parseColor(color1), parseColor(color2), parseColor(color3)],
        speed: num(speed, 100) / 100,
        scale: num(scale, 100) / 100,
        noise: num(noiseIntensity, 50) / 100,
        interactive: interactive !== false,
    }

    // Mouse target/current in CSS px (x from left, y bottom-origin); lerped for
    // momentum, converted to buffer px at uniform-set time.
    const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 })
    const strengthRef = useRef({ value: 0, target: 0 })

    const safeBlur = num(blur, 0)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const gl = canvas.getContext("webgl")
        if (!gl) {
            console.error("WebGL not supported")
            return
        }

        const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SRC)
        const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC)
        if (!vs || !fs) return

        const program = gl.createProgram()
        if (!program) return
        gl.attachShader(program, vs)
        gl.attachShader(program, fs)
        gl.linkProgram(program)
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("Program link error:", gl.getProgramInfoLog(program))
            return
        }
        gl.useProgram(program)

        const buffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
            gl.STATIC_DRAW
        )
        const posLoc = gl.getAttribLocation(program, "a_position")
        gl.enableVertexAttribArray(posLoc)
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

        const u = {
            resolution: gl.getUniformLocation(program, "iResolution"),
            time: gl.getUniformLocation(program, "iTime"),
            mouse: gl.getUniformLocation(program, "iMouse"),
            mouseStrength: gl.getUniformLocation(program, "iMouseStrength"),
            color1: gl.getUniformLocation(program, "uColor1"),
            color2: gl.getUniformLocation(program, "uColor2"),
            color3: gl.getUniformLocation(program, "uColor3"),
            speed: gl.getUniformLocation(program, "uSpeed"),
            scale: gl.getUniformLocation(program, "uScale"),
            noise: gl.getUniformLocation(program, "uNoiseIntensity"),
            interactive: gl.getUniformLocation(program, "uInteractive"),
        }

        const start = performance.now()
        let rafId = 0

        const render = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            const cw = sizeRef.current.w || canvas.clientWidth || 300
            const ch = sizeRef.current.h || canvas.clientHeight || 300
            const bw = Math.max(1, Math.round(cw * dpr))
            const bh = Math.max(1, Math.round(ch * dpr))
            if (canvas.width !== bw || canvas.height !== bh) {
                canvas.width = bw
                canvas.height = bh
                gl.viewport(0, 0, bw, bh)
            }

            const t = (performance.now() - start) / 1000
            const v = valuesRef.current

            // Lerp mouse + strength (source momentum), then to buffer px.
            const m = mouseRef.current
            const s = strengthRef.current
            m.x += (m.targetX - m.x) * 0.08
            m.y += (m.targetY - m.y) * 0.08
            s.value += (s.target - s.value) * 0.08

            gl.uniform2f(u.resolution, bw, bh)
            gl.uniform1f(u.time, t)
            gl.uniform2f(u.mouse, m.x * dpr, m.y * dpr)
            gl.uniform1f(u.mouseStrength, s.value)

            gl.uniform3f(
                u.color1,
                v.colors[0][0],
                v.colors[0][1],
                v.colors[0][2]
            )
            gl.uniform3f(
                u.color2,
                v.colors[1][0],
                v.colors[1][1],
                v.colors[1][2]
            )
            gl.uniform3f(
                u.color3,
                v.colors[2][0],
                v.colors[2][1],
                v.colors[2][2]
            )
            gl.uniform1f(u.speed, v.speed)
            gl.uniform1f(u.scale, v.scale)
            gl.uniform1f(u.noise, v.noise)
            gl.uniform1f(u.interactive, v.interactive ? 1.0 : 0.0)

            gl.drawArrays(gl.TRIANGLES, 0, 6)
            rafId = requestAnimationFrame(render)
        }

        const onMove = (e: PointerEvent) => {
            if (!valuesRef.current.interactive) return
            const rect = canvas.getBoundingClientRect()
            mouseRef.current.targetX = e.clientX - rect.left
            mouseRef.current.targetY = rect.height - (e.clientY - rect.top)
        }
        const onEnter = () => {
            if (valuesRef.current.interactive) strengthRef.current.target = 1.0
        }
        const onLeave = () => {
            strengthRef.current.target = 0.0
        }

        canvas.addEventListener("pointermove", onMove)
        canvas.addEventListener("pointerenter", onEnter)
        canvas.addEventListener("pointerleave", onLeave)

        render()

        return () => {
            // No loseContext(): would leave a force-lost context for the next mount.
            cancelAnimationFrame(rafId)
            canvas.removeEventListener("pointermove", onMove)
            canvas.removeEventListener("pointerenter", onEnter)
            canvas.removeEventListener("pointerleave", onLeave)
        }
    }, [])

    return (
        <div
            style={{
                position: "relative",
                // Canvas + blur are both absolute → root has zero in-flow content
                // and collapses to a dot under Fit-Content. Drive size from Framer's
                // numeric props, with a real floor as backstop.
                width: typeof width === "number" && width > 0 ? width : "100%",
                height:
                    typeof height === "number" && height > 0 ? height : "100%",
                minWidth: 1200,
                minHeight: 800,
                overflow: "hidden",
                background: "#000",
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
                }}
            />
            {safeBlur > 0 && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        backdropFilter: `blur(${safeBlur}px)`,
                        WebkitBackdropFilter: `blur(${safeBlur}px)`,
                    }}
                />
            )}
        </div>
    )
}
