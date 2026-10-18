"use client"

import * as React from "react"
import { useEffect, useMemo, useRef } from "react"

const VERTEX_SRC = `
attribute vec4 a_position;
void main() { gl_Position = a_position; }
`

const FRAGMENT_SRC = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;        // pointer in buffer px, y-up
uniform vec3 u_colors[8];
uniform int u_colorCount;
uniform float u_speed;
uniform float u_scale;
uniform float u_hover;      // pointer push strength; 0 = off
uniform float u_pointer;    // eased pointer presence, 0..1
uniform float u_reach;      // influence radius in UV units (half short side = 1)
uniform float u_glowEdge;   // density where the glow ramp starts

// Warp fields are low-frequency — octaves past the 4th cancel out inside the
// 4.0 * q feedback. Measured: p50 density 0.541 at 4 octaves vs 0.538 at 8,
// for 40% fewer noise samples per pixel.
const int WARP_OCTAVES = 4;
const int DETAIL_OCTAVES = 8;

// Measured 2nd/98th percentile of the density value over the frame. Raw density only
// ever covers ~0.44 of 0..1, so feeding it to the gradient as-is means the
// first and last colour in the array are NEVER reached — the Colors control
// would be lying about its own endpoints.
const float D_LO = 0.33;
const float D_HI = 0.77;

vec3 gradientColor(float t){
    if (u_colorCount <= 1) return u_colors[0];
    float segments = float(u_colorCount - 1);
    float scaled = clamp(t, 0.0, 1.0) * segments;
    float idx = floor(scaled);
    float f = fract(scaled);
    vec3 c0 = u_colors[0];
    vec3 c1 = u_colors[0];
    for (int i = 0; i < 8; i++) {
        if (float(i) == idx) c0 = u_colors[i];
        if (float(i) == idx + 1.0) c1 = u_colors[i];
    }
    return mix(c0, c1, f);
}

float hash(vec2 p){
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 34.45);
    return fract(p.x * p.y);
}

float noise(vec2 p){
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Each octave is rotated by a fixed irrational angle before doubling frequency,
// so the layered noise never lines back up into a repeating lattice — without
// this a noise fbm is self-similar, and zooming (u_scale) just reveals the
// same tile stamped over itself over and over.
const mat2 OCTAVE_ROTATE = mat2(0.6603, -0.7509, 0.7509, 0.6603);

float fbm(vec2 p, int octaves){
    float sum = 0.0;
    float amp = 0.5;
    vec2 pp = p;
    for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        sum += amp * noise(pp);
        pp = OCTAVE_ROTATE * pp * 2.0 + vec2(3.1, 1.7);
        amp *= 0.5;
    }
    return sum;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    // UV and the pointer both live in UNSCALED screen space, so Reach is a
    // fixed on-screen radius: scaling the field must not shrink the ripple.
    float shortSide = min(iResolution.x, iResolution.y);
    vec2 uv = (2.0 * fragCoord - iResolution.xy) / shortSide;
    vec2 mouseUV = (2.0 * iMouse - iResolution.xy) / shortSide;

    vec2 toMouse = uv - mouseUV;
    float mouseDist = length(toMouse);
    float reach = max(u_reach, 0.01);
    // Reversed-edge smoothstep(hi, lo, x) is undefined in GLSL — spell the
    // falloff out as 1 - smoothstep(lo, hi, x).
    float falloff = 1.0 - smoothstep(0.0, reach, mouseDist);
    // The normalized direction flips sign across the exact pointer pixel. At
    // full strength right there it welds a hard knot to the cursor that reads
    // as jitter while the pointer moves, so fade the displacement out through
    // the core and let the swirl start just outside it.
    float core = smoothstep(0.0, 0.35 * reach, mouseDist);
    vec2 radial = toMouse / max(mouseDist, 0.0001);
    // Smoke curls around a disturbance instead of fleeing it in a straight
    // line — blend the outward push with a tangential (perpendicular) swirl
    // so the field spins around the cursor like real smoke stirred by an object.
    vec2 tangent = vec2(-radial.y, radial.x);
    vec2 swirl = mix(radial, tangent, 0.7);
    vec2 push = swirl * falloff * core * u_hover * u_pointer * 0.6;

    vec2 p = (uv + push) * u_scale;
    float time = iTime * u_speed;

    // Domain-warp the noise through itself (fbm feeding fbm) so it billows
    // into wisps and drifting tendrils instead of a flat, evenly-lit field.
    vec2 q = vec2(
        fbm(p + time * 0.15, WARP_OCTAVES),
        fbm(p + vec2(5.2, 1.3) - time * 0.1, WARP_OCTAVES)
    );
    vec2 r = vec2(
        fbm(p + 4.0 * q + vec2(1.7, 9.2) + time * 0.12, WARP_OCTAVES),
        fbm(p + 4.0 * q + vec2(8.3, 2.8) - time * 0.09, WARP_OCTAVES)
    );
    float density = fbm(p + 4.0 * r, DETAIL_OCTAVES);
    float normalized = clamp((density - D_LO) / (D_HI - D_LO), 0.0, 1.0);

    float glow = smoothstep(u_glowEdge, 1.0, normalized);
    // Premultiplied alpha, so the Background control is a real backdrop the
    // smoke thins out over instead of a colour the opaque quad paints away.
    fragColor = vec4(gradientColor(normalized) * glow, glow);
}
void main() { mainImage(gl_FragColor, gl_FragCoord.xy); }
`

const MAX_COLORS = 8
const MAX_DPR = 1.5 // 24 fbm octaves/px: past this the fill rate, not the pointer, is the jank
const POINTER_LAG_MS = 70 // position ease
const PRESENCE_LAG_MS = 180 // fade in/out of the ripple
const MAX_FRAME_MS = 50 // a returning tab must not deliver one 4-second step

// ControlType.Color emitted "#rgb", "#rrggbb", "#rrggbbaa", or "rgb()/rgba()".
function parseColor(input: string): [number, number, number] {
    const fallback: [number, number, number] = [1, 1, 1]
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

function parseColors(input: string[]): Float32Array {
    const out = new Float32Array(MAX_COLORS * 3)
    const count = Math.min(input.length, MAX_COLORS)
    for (let i = 0; i < MAX_COLORS; i++) {
        const src = i < count ? input[i] : input[count - 1]
        const [r, g, b] = parseColor(src)
        out[i * 3] = r
        out[i * 3 + 1] = g
        out[i * 3 + 2] = b
    }
    return out
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

type Props = {
    colors?: string[]
    background?: string
    speed?: number // 0–100, 50 = the rate this shipped at
    scale?: number // percent
    glow?: number // percent
    hover?: number // percent, 0 = off
    reach?: number // percent of the half short side
    blur?: number // px
    style?: React.CSSProperties
    // Read for backwards compatibility only — see the header block.
    backgroundColor?: string
    rippleStrength?: number
    interactive?: boolean
}

export default function SmokeyShader({
    colors = ["#471CE2", "#8B5CF6", "#F472B6"],
    background = "#000000",
    speed = 11,
    scale = 166,
    glow = 75,
    hover = 45,
    reach = 100,
    blur = 0,
    style,
    backgroundColor,
    rippleStrength,
    interactive,
}: Props) {
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const safeColors =
        Array.isArray(colors) && colors.length > 0 ? colors : ["#471CE2"]
    const colorKey = safeColors.join("|")
    // Only re-parse when the strings actually change: Framer hands back a new
    // array identity on every render.
    const parsedColors = useMemo(() => parseColors(safeColors), [colorKey])

    const num = (v: unknown, fallback: number) =>
        Number.isFinite(v as number) ? (v as number) : fallback
    // A live instance that predates the rename still sends the old key.
    const hoverPct =
        interactive === false ? 0 : num(hover, num(rippleStrength, 100))

    const uniformsRef = useRef({
        colors: parsedColors,
        colorCount: 1,
        speed: 0.5,
        scale: 1,
        hover: 1,
        reach: 0.9,
        glowEdge: 0,
    })
    uniformsRef.current = {
        colors: parsedColors,
        colorCount: Math.min(safeColors.length, MAX_COLORS),
        // 50 is the shipped rate; 0 freezes the field, which is what the old
        // Animate toggle did.
        speed: num(speed, 50) / 100,
        scale: num(scale, 100) / 100,
        hover: hoverPct / 100,
        reach: num(reach, 90) / 100,
        // 75 reproduces the shipped smoothstep(0.2, 0.9, density) ramp; the
        // range runs past it in both directions so Glow can go up as well.
        glowEdge: 0.9 - (num(glow, 75) / 100) * 1.2,
    }

    const pointerRef = useRef({ x: 0.5, y: 0.5, active: false, seeded: false })
    const safeBackground =
        (typeof background === "string" && background) ||
        (typeof backgroundColor === "string" && backgroundColor) ||
        "#000000"
    const safeBlur = num(blur, 0)

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return

        const gl = canvas.getContext("webgl", {
            alpha: true,
            premultipliedAlpha: true,
            antialias: false,
        })
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

        const uResolution = gl.getUniformLocation(program, "iResolution")
        const uTime = gl.getUniformLocation(program, "iTime")
        const uMouse = gl.getUniformLocation(program, "iMouse")
        // Some drivers only expose an array uniform under its [0] name.
        const uColors =
            gl.getUniformLocation(program, "u_colors[0]") ??
            gl.getUniformLocation(program, "u_colors")
        const uColorCount = gl.getUniformLocation(program, "u_colorCount")
        const uSpeed = gl.getUniformLocation(program, "u_speed")
        const uScale = gl.getUniformLocation(program, "u_scale")
        const uHover = gl.getUniformLocation(program, "u_hover")
        const uPointer = gl.getUniformLocation(program, "u_pointer")
        const uReach = gl.getUniformLocation(program, "u_reach")
        const uGlowEdge = gl.getUniformLocation(program, "u_glowEdge")

        // Layout size, kept off the render loop: reading clientWidth every
        // frame forces a synchronous layout flush and is exactly the kind of
        // per-frame stall that shows up as pointer jank. ResizeObserver's
        // contentRect is also immune to the canvas zoom, unlike a client rect.
        let cssWidth = root.offsetWidth || 1
        let cssHeight = root.offsetHeight || 1
        const ro = new ResizeObserver((entries) => {
            const box = entries[0]?.contentRect
            if (!box) return
            cssWidth = Math.max(1, box.width)
            cssHeight = Math.max(1, box.height)
            rect = null
        })
        ro.observe(root)

        // The pointer is normalized against the element's own client rect, so
        // it stays under the cursor on a zoomed Framer canvas — a raw
        // clientX - rect.left is in screen px and drifts with the zoom.
        let rect: DOMRect | null = null
        const readRect = () => {
            if (!rect) rect = root.getBoundingClientRect()
            return rect
        }
        const invalidateRect = () => {
            rect = null
        }

        let rafId = 0
        let lastFrame = performance.now()
        let elapsed = 0
        let smoothX = 0.5
        let smoothY = 0.5
        let presence = 0

        const render = (now: number) => {
            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            const bw = Math.max(1, Math.round(cssWidth * dpr))
            const bh = Math.max(1, Math.round(cssHeight * dpr))
            if (canvas.width !== bw || canvas.height !== bh) {
                canvas.width = bw
                canvas.height = bh
                gl.viewport(0, 0, bw, bh)
            }

            const dt = Math.min(now - lastFrame, MAX_FRAME_MS)
            lastFrame = now
            elapsed += dt

            const p = pointerRef.current
            if (p.seeded) {
                // Frame-rate independent ease: a fixed per-frame lerp factor
                // would trail further on a 120Hz display than on a 60Hz one.
                const posEase = 1 - Math.exp(-dt / POINTER_LAG_MS)
                smoothX += (p.x - smoothX) * posEase
                smoothY += (p.y - smoothY) * posEase
            } else {
                smoothX = p.x
                smoothY = p.y
            }
            const presenceEase = 1 - Math.exp(-dt / PRESENCE_LAG_MS)
            const u = uniformsRef.current
            const target = p.active && u.hover > 0 ? 1 : 0
            presence += (target - presence) * presenceEase

            gl.uniform2f(uResolution, bw, bh)
            gl.uniform1f(uTime, elapsed / 1000)
            gl.uniform1f(uSpeed, u.speed)
            gl.uniform1f(uScale, u.scale)
            gl.uniform1f(uHover, u.hover)
            gl.uniform1f(uPointer, presence)
            gl.uniform1f(uReach, u.reach)
            gl.uniform1f(uGlowEdge, u.glowEdge)
            gl.uniform3fv(uColors, u.colors)
            gl.uniform1i(uColorCount, u.colorCount)
            gl.uniform2f(uMouse, smoothX * bw, (1 - smoothY) * bh)

            gl.drawArrays(gl.TRIANGLES, 0, 6)
            rafId = requestAnimationFrame(render)
        }

        const onMove = (e: PointerEvent) => {
            const r = readRect()
            if (!r.width || !r.height) return
            const p = pointerRef.current
            p.x = (e.clientX - r.left) / r.width
            p.y = (e.clientY - r.top) / r.height
            p.active = true
            // Snap on the first contact, or the ripple sweeps in from the
            // corner the smoothed position was initialised at.
            p.seeded = true
        }
        const onEnter = () => {
            invalidateRect()
            pointerRef.current.active = true
        }
        const onLeave = () => {
            pointerRef.current.active = false
        }

        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerenter", onEnter)
        root.addEventListener("pointerleave", onLeave)
        window.addEventListener("scroll", invalidateRect, true)
        window.addEventListener("resize", invalidateRect)

        rafId = requestAnimationFrame(render)

        return () => {
            // No loseContext(): would leave a force-lost context for the next mount.
            cancelAnimationFrame(rafId)
            ro.disconnect()
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerenter", onEnter)
            root.removeEventListener("pointerleave", onLeave)
            window.removeEventListener("scroll", invalidateRect, true)
            window.removeEventListener("resize", invalidateRect)
        }
    }, [])

    return (
        <div
            ref={rootRef}
            style={{
                position: "relative",
                minWidth: 1200,
                minHeight: 800,
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background: safeBackground,
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
                        // Without this the overlay is the topmost hit target
                        // over the whole component and swallows every pointer
                        // event before the ripple ever sees one.
                        pointerEvents: "none",
                    }}
                />
            )}
        </div>
    )
}
