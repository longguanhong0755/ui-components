"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/* ---------------------------------------------------------------- constants */

// Grid resolutions. NOT controls — rule 8b: a quality tier is the component's
// own job, and the sim reads identically at 128 whether the canvas is 800px or
// 3000px wide. Dye runs finer than velocity because the eye reads the colour
// boundary, not the flow field.
const SIM_RES = 128
const DYE_RES = 512
const PRESSURE_ITERATIONS = 20
// Pressure left over from last frame is a good first guess for this frame's
// solve; decaying it slightly is what stops the field ringing.
const PRESSURE_DECAY = 0.8
// Velocity fades on its own so a stirred field comes to rest. Frozen: a
// designer tunes how long the INK lasts (`Dissipation`), not how long the
// invisible field it rides on lasts.
const VELOCITY_DISSIPATION = 0.2
const CURL_AT_50 = 30 // `Swirl` 50 reproduces the shipped confinement strength
// Dye injected per SECOND, not per frame. Injecting a fixed amount each frame
// makes the ink twice as dense on a 120Hz display as on a 60Hz one, and a
// slow-moving source piles up until the core clips to flat white (rule P — a
// rate has to be a rate).
const INJECT_RATE = 4.5
// The field starts empty, and an empty frame is what a designer first sees on
// the Framer canvas. These seed splats put ink on screen before the first
// frame; positions and colours are fixed, never random, so two runs of the
// same component are comparable.
const SEEDS: [number, number, number, number][] = [
    [0.28, 0.62, 140, 60],
    [0.66, 0.38, -120, 90],
    [0.5, 0.5, 40, -140],
]
const DPR_CAP = 1.5
const MAX_COLORS = 5
const DEFAULT_COLORS: string[] = ["#4E5BF2", "#00D3B8", "#F25C9B"]

// WebGL2 / WebGL1 numeric enums, spelled out so the context can stay typed as
// one thing. Nothing below calls a WebGL2-only METHOD — only these formats
// differ between the two — so the context is typed as WebGL2RenderingContext
// and a WebGL1 context is used through exactly the subset it also implements.
const GL_RGBA16F = 0x881a
const GL_HALF_FLOAT = 0x140b // WebGL2
const GL_HALF_FLOAT_OES = 0x8d61 // OES_texture_half_float

/* ------------------------------------------------------------------ shaders */

// One vertex shader for every pass. It also hands the fragment stage the four
// neighbour coordinates, so the finite-difference passes (divergence, curl,
// pressure) never compute a texel offset themselves.
const VERT = `
precision highp float;
attribute vec2 aPos;
uniform vec2 uTexel;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
void main() {
    vUv = aPos * 0.5 + 0.5;
    vL = vUv - vec2(uTexel.x, 0.0);
    vR = vUv + vec2(uTexel.x, 0.0);
    vT = vUv + vec2(0.0, uTexel.y);
    vB = vUv - vec2(0.0, uTexel.y);
    gl_Position = vec4(aPos, 0.0, 1.0);
}
`

// Semi-Lagrangian advection. MANUAL_FILTERING is defined at compile time when
// the platform cannot LINEAR-filter a half-float texture; a NEAREST fetch here
// turns every filament into a staircase within a second.
const FRAG_ADVECT = `
precision highp float;
uniform sampler2D uVel;
uniform sampler2D uSrc;
uniform vec2 uTexel;     // velocity grid texel
uniform vec2 uTexelSrc;  // source grid texel (dye grid is finer)
uniform float uDt;
uniform float uDiss;
varying vec2 vUv;

#ifdef MANUAL_FILTERING
vec4 bilerp(sampler2D s, vec2 uv, vec2 tsize) {
    vec2 st = uv / tsize - 0.5;
    vec2 iuv = floor(st);
    vec2 fuv = fract(st);
    vec4 a = texture2D(s, (iuv + vec2(0.5, 0.5)) * tsize);
    vec4 b = texture2D(s, (iuv + vec2(1.5, 0.5)) * tsize);
    vec4 c = texture2D(s, (iuv + vec2(0.5, 1.5)) * tsize);
    vec4 d = texture2D(s, (iuv + vec2(1.5, 1.5)) * tsize);
    return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
}
#endif

void main() {
    vec2 coord = vUv - uDt * texture2D(uVel, vUv).xy * uTexel;
    // Clamp the back-trace to the source texture's interior. CLAMP_TO_EDGE
    // already stops a fetch leaving the texture, but the half-texel margin is
    // what stops a bilinear fetch straddling the border and dragging the edge
    // row inward as a smear. It also keeps uTexelSrc live in BOTH branches: a
    // uniform only referenced inside the #ifdef is optimised out on the linear
    // path, and getUniformLocation then returns null for a name that is not a
    // typo — which is exactly the signal that check exists to catch.
    vec2 halfTexel = uTexelSrc * 0.5;
    coord = clamp(coord, halfTexel, 1.0 - halfTexel);
#ifdef MANUAL_FILTERING
    vec4 src = bilerp(uSrc, coord, uTexelSrc);
#else
    vec4 src = texture2D(uSrc, coord);
#endif
    // Exponential-ish decay written as a divide: stable at any dt, and it can
    // never push a channel negative the way (1 - diss * dt) can.
    gl_FragColor = src / (1.0 + uDiss * uDt);
}
`

// Free-slip walls: a neighbour sampled outside the grid is replaced by the
// centre value with its normal component reversed, so flow slides along the
// edge instead of piling into it.
const FRAG_DIVERGENCE = `
precision highp float;
uniform sampler2D uVel;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
void main() {
    float l = texture2D(uVel, vL).x;
    float r = texture2D(uVel, vR).x;
    float t = texture2D(uVel, vT).y;
    float b = texture2D(uVel, vB).y;
    vec2 c = texture2D(uVel, vUv).xy;
    if (vL.x < 0.0) l = -c.x;
    if (vR.x > 1.0) r = -c.x;
    if (vT.y > 1.0) t = -c.y;
    if (vB.y < 0.0) b = -c.y;
    gl_FragColor = vec4(0.5 * (r - l + t - b), 0.0, 0.0, 1.0);
}
`

const FRAG_CURL = `
precision highp float;
uniform sampler2D uVel;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
void main() {
    float l = texture2D(uVel, vL).y;
    float r = texture2D(uVel, vR).y;
    float t = texture2D(uVel, vT).x;
    float b = texture2D(uVel, vB).x;
    gl_FragColor = vec4(0.5 * (r - l - t + b), 0.0, 0.0, 1.0);
}
`

// Vorticity confinement: push each texel along the gradient of |curl|, scaled
// by the signed curl, so an eddy the advection was flattening gets its spin
// paid back. The 1e-4 floor is rule 6's guarded denominator — a still field has
// zero gradient everywhere and this normalize would be 0/0.
const FRAG_VORTICITY = `
precision highp float;
uniform sampler2D uVel;
uniform sampler2D uCurl;
uniform float uCurlAmt;
uniform float uDt;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
void main() {
    float l = texture2D(uCurl, vL).x;
    float r = texture2D(uCurl, vR).x;
    float t = texture2D(uCurl, vT).x;
    float b = texture2D(uCurl, vB).x;
    float c = texture2D(uCurl, vUv).x;

    vec2 force = 0.5 * vec2(abs(t) - abs(b), abs(r) - abs(l));
    force /= max(length(force), 1e-4);
    force *= uCurlAmt * c;
    force.y *= -1.0;

    vec2 vel = texture2D(uVel, vUv).xy + force * uDt;
    // Half-float tops out around 65504; clamping well under it keeps a runaway
    // splat from writing an Inf that then poisons every downstream pass.
    gl_FragColor = vec4(clamp(vel, -1000.0, 1000.0), 0.0, 1.0);
}
`

const FRAG_PRESSURE = `
precision highp float;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
void main() {
    float l = texture2D(uPressure, vL).x;
    float r = texture2D(uPressure, vR).x;
    float t = texture2D(uPressure, vT).x;
    float b = texture2D(uPressure, vB).x;
    float div = texture2D(uDivergence, vUv).x;
    gl_FragColor = vec4((l + r + t + b - div) * 0.25, 0.0, 0.0, 1.0);
}
`

const FRAG_GRADIENT = `
precision highp float;
uniform sampler2D uPressure;
uniform sampler2D uVel;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
void main() {
    float l = texture2D(uPressure, vL).x;
    float r = texture2D(uPressure, vR).x;
    float t = texture2D(uPressure, vT).x;
    float b = texture2D(uPressure, vB).x;
    vec2 vel = texture2D(uVel, vUv).xy - vec2(r - l, t - b);
    gl_FragColor = vec4(vel, 0.0, 1.0);
}
`

// Multiply the whole target by a scalar. Used for the pressure decay.
const FRAG_CLEAR = `
precision highp float;
uniform sampler2D uTex;
uniform float uValue;
varying vec2 vUv;
void main() {
    gl_FragColor = uValue * texture2D(uTex, vUv);
}
`

// A gaussian blob added to whatever is already in the target. The same shader
// injects colour into the dye and force into the velocity — the only difference
// is which texture is bound and what uColor holds.
const FRAG_SPLAT = `
precision highp float;
uniform sampler2D uTarget;
uniform float uAspect;
uniform vec3 uColor;
uniform vec2 uPoint;
uniform float uRadius;
varying vec2 vUv;
void main() {
    vec2 p = vUv - uPoint;
    p.x *= uAspect;
    vec3 splat = exp(-dot(p, p) / uRadius) * uColor;
    gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + splat, 1.0);
}
`

// Dye -> screen. Output is premultiplied and the alpha is the ink's own
// brightness, so the CSS background shows through everywhere the ink is thin
// and the canvas never paints its own black over the designer's colour.
const FRAG_DISPLAY = `
precision highp float;
uniform sampler2D uTex;
uniform float uGain;
varying vec2 vUv;
void main() {
    vec3 c = texture2D(uTex, vUv).rgb * uGain;
    // Soft-knee rolloff instead of a clamp: two overlapping filaments still
    // read as brighter than one, but neither clips to a flat white slab.
    c = c / (1.0 + c * 0.8);
    float a = clamp(max(c.r, max(c.g, c.b)), 0.0, 1.0);
    gl_FragColor = vec4(c, a);
}
`

/* ------------------------------------------------------------------ helpers */

// ControlType.Color-style values emit "#rgb", "#rrggbb", "#rrggbbaa" or "rgb()/rgba()".
function parseColor(input: string): [number, number, number] {
    if (!input) return [0, 0, 0]
    const s = input.trim()
    const fn = s.match(/rgba?\(([^)]+)\)/i)
    if (fn) {
        const p = fn[1].split(",").map((v) => parseFloat(v.trim()))
        return [(p[0] || 0) / 255, (p[1] || 0) / 255, (p[2] || 0) / 255]
    }
    let h = s.replace("#", "")
    if (h.length === 3 || h.length === 4) {
        h = h
            .split("")
            .map((c) => c + c)
            .join("")
    }
    h = h.padEnd(6, "0")
    return [
        parseInt(h.slice(0, 2), 16) / 255,
        parseInt(h.slice(2, 4), 16) / 255,
        parseInt(h.slice(4, 6), 16) / 255,
    ]
}

function compile(
    gl: WebGL2RenderingContext,
    type: number,
    src: string
): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn("InkFlowField shader:", gl.getShaderInfoLog(sh))
    }
    return sh
}

interface Pass {
    prog: WebGLProgram
    u: Record<string, WebGLUniformLocation | null>
}

function makePass(
    gl: WebGL2RenderingContext,
    frag: string,
    names: string[],
    defines: string
): Pass | null {
    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, defines + frag)
    const prog = gl.createProgram()
    if (!vs || !fs || !prog) return null
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.bindAttribLocation(prog, 0, "aPos")
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.warn("InkFlowField link:", gl.getProgramInfoLog(prog))
        return null
    }
    const u: Record<string, WebGLUniformLocation | null> = {}
    for (let i = 0; i < names.length; i++) {
        u[names[i]] = gl.getUniformLocation(prog, names[i])
    }
    return { prog, u }
}

interface Target {
    tex: WebGLTexture
    fbo: WebGLFramebuffer
    w: number
    h: number
    texelX: number
    texelY: number
}

interface Fmt {
    internal: number
    format: number
    type: number
    filter: number
}

function makeTarget(
    gl: WebGL2RenderingContext,
    w: number,
    h: number,
    fmt: Fmt
): Target | null {
    const tex = gl.createTexture()
    const fbo = gl.createFramebuffer()
    if (!tex || !fbo) return null
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, fmt.filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, fmt.filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        fmt.internal,
        w,
        h,
        0,
        fmt.format,
        fmt.type,
        null
    )
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        tex,
        0
    )
    gl.viewport(0, 0, w, h)
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    return { tex, fbo, w, h, texelX: 1 / w, texelY: 1 / h }
}

interface DoubleTarget {
    read: Target
    write: Target
    swap: () => void
}

function makeDouble(
    gl: WebGL2RenderingContext,
    w: number,
    h: number,
    fmt: Fmt
): DoubleTarget | null {
    const a = makeTarget(gl, w, h, fmt)
    const b = makeTarget(gl, w, h, fmt)
    if (!a || !b) return null
    const d: DoubleTarget = {
        read: a,
        write: b,
        swap: () => {
            const t = d.read
            d.read = d.write
            d.write = t
        },
    }
    return d
}

/* --------------------------------------------------------------------- props */

interface CursorGroup {
    reach: number
    force: number
}

interface InkFlowFieldProps {
    background?: string
    colors?: string[]
    speed?: number
    dissipation?: number
    swirl?: number
    drift?: number
    glow?: string
    cursor?: Partial<CursorGroup>
    width?: number
    height?: number
    style?: React.CSSProperties
}

/* ----------------------------------------------------------------- component */

function __BaseImpl_InkFlowField(props: InkFlowFieldProps) {
    const {
        background = "#07060D",
        colors = ["#000753","#A000FF","#71FF6C","#FF0000","#FFFA00"],
        speed = 99,
        dissipation = 50,
        swirl = 0,
        drift = 21,
        glow = "rgba(0, 0, 0, 0.55)",
        cursor = {"force":60,"reach":50},
        style,
    } = props

    const { reach = 35, force = 60 } = cursor

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Every live input goes through this ref: the GL context is built once and
    // must never be torn down by a control change (rule 6).
    const live = useRef({ colors, speed, dissipation, swirl, drift, reach, force })
    live.current = { colors, speed, dissipation, swirl, drift, reach, force }

    // Pointer in normalised texture space plus the frame delta that becomes the
    // injected force. `moved` gates the first splat so a load with the cursor
    // parked over the component does not fire one at (0, 0).
    const pointer = useRef({ x: 0.5, y: 0.5, dx: 0, dy: 0, down: 0, moved: 0 })

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return

        const opts: WebGLContextAttributes = {
            alpha: true,
            antialias: false,
            premultipliedAlpha: true,
            depth: false,
            stencil: false,
            powerPreference: "high-performance",
        }
        // WebGL2 first: one extension call buys renderable half-float AND
        // linear filtering of it. WebGL1 needs three separate extensions and
        // may still refuse to filter, which is what MANUAL_FILTERING is for.
        let isGL2 = true
        let ctx = canvas.getContext("webgl2", opts) as WebGL2RenderingContext | null
        if (!ctx) {
            isGL2 = false
            ctx = canvas.getContext("webgl", opts) as unknown as WebGL2RenderingContext | null
        }
        if (!ctx) return
        const gl = ctx

        let linear = false
        let renderable = false
        if (isGL2) {
            renderable = !!gl.getExtension("EXT_color_buffer_float")
            if (!renderable) renderable = !!gl.getExtension("EXT_color_buffer_half_float")
            linear = !!gl.getExtension("OES_texture_float_linear") || renderable
        } else {
            renderable =
                !!gl.getExtension("OES_texture_half_float") &&
                !!gl.getExtension("EXT_color_buffer_half_float")
            linear = !!gl.getExtension("OES_texture_half_float_linear")
        }
        if (!renderable) {
            // No renderable float target anywhere: the sim cannot run. The root
            // still paints Background and Glow, so the component degrades to a
            // flat plate instead of a black hole.
            console.warn("InkFlowField: no renderable half-float target")
            return
        }

        const fmt: Fmt = {
            internal: isGL2 ? GL_RGBA16F : gl.RGBA,
            format: gl.RGBA,
            type: isGL2 ? GL_HALF_FLOAT : GL_HALF_FLOAT_OES,
            filter: linear ? gl.LINEAR : gl.NEAREST,
        }
        const defines = linear ? "" : "#define MANUAL_FILTERING\n"

        /* ---- passes ---- */
        const advect = makePass(
            gl,
            FRAG_ADVECT,
            ["uVel", "uSrc", "uTexel", "uTexelSrc", "uDt", "uDiss"],
            defines
        )
        const divergence = makePass(gl, FRAG_DIVERGENCE, ["uVel", "uTexel"], "")
        const curl = makePass(gl, FRAG_CURL, ["uVel", "uTexel"], "")
        const vorticity = makePass(
            gl,
            FRAG_VORTICITY,
            ["uVel", "uCurl", "uCurlAmt", "uDt", "uTexel"],
            ""
        )
        const pressure = makePass(
            gl,
            FRAG_PRESSURE,
            ["uPressure", "uDivergence", "uTexel"],
            ""
        )
        const gradient = makePass(
            gl,
            FRAG_GRADIENT,
            ["uPressure", "uVel", "uTexel"],
            ""
        )
        const clearPass = makePass(gl, FRAG_CLEAR, ["uTex", "uValue", "uTexel"], "")
        const splat = makePass(
            gl,
            FRAG_SPLAT,
            ["uTarget", "uAspect", "uColor", "uPoint", "uRadius", "uTexel"],
            ""
        )
        const display = makePass(gl, FRAG_DISPLAY, ["uTex", "uGain", "uTexel"], "")
        if (
            !advect ||
            !divergence ||
            !curl ||
            !vorticity ||
            !pressure ||
            !gradient ||
            !clearPass ||
            !splat ||
            !display
        )
            return

        /* ---- fullscreen quad ---- */
        const quad = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, quad)
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
            gl.STATIC_DRAW
        )
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

        const blit = (target: Target | null) => {
            if (target) {
                gl.viewport(0, 0, target.w, target.h)
                gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo)
            } else {
                gl.viewport(0, 0, canvas.width, canvas.height)
                gl.bindFramebuffer(gl.FRAMEBUFFER, null)
            }
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        }
        const bind = (tex: WebGLTexture, unit: number) => {
            gl.activeTexture(gl.TEXTURE0 + unit)
            gl.bindTexture(gl.TEXTURE_2D, tex)
            return unit
        }

        gl.disable(gl.BLEND)
        gl.disable(gl.DEPTH_TEST)

        /* ---- framebuffers, rebuilt on resize (never the context) ---- */
        let vel: DoubleTarget | null = null
        let dye: DoubleTarget | null = null
        let prs: DoubleTarget | null = null
        let div: Target | null = null
        let crl: Target | null = null
        let aspect = 1
        let built = ""

        const dispose = () => {
            const all: (Target | null)[] = [
                vel?.read ?? null,
                vel?.write ?? null,
                dye?.read ?? null,
                dye?.write ?? null,
                prs?.read ?? null,
                prs?.write ?? null,
                div,
                crl,
            ]
            for (const t of all) {
                if (!t) continue
                gl.deleteTexture(t.tex)
                gl.deleteFramebuffer(t.fbo)
            }
            vel = dye = prs = null
            div = crl = null
        }

        const buildTargets = (w: number, h: number) => {
            const key = w + "x" + h
            if (key === built) return
            dispose()
            aspect = w / Math.max(1, h)
            const simW = aspect >= 1 ? Math.round(SIM_RES * aspect) : SIM_RES
            const simH = aspect >= 1 ? SIM_RES : Math.round(SIM_RES / aspect)
            const dyeW = aspect >= 1 ? Math.round(DYE_RES * aspect) : DYE_RES
            const dyeH = aspect >= 1 ? DYE_RES : Math.round(DYE_RES / aspect)
            vel = makeDouble(gl, simW, simH, fmt)
            dye = makeDouble(gl, dyeW, dyeH, fmt)
            prs = makeDouble(gl, simW, simH, fmt)
            div = makeTarget(gl, simW, simH, fmt)
            crl = makeTarget(gl, simW, simH, fmt)
            built = key
        }

        /* ---- sizing: measure the ELEMENT, not the width/height props. Those
               are not numeric in the Framer preview (only on the canvas). ---- */
        let cssW = 0
        let cssH = 0
        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
            cssW = canvas.clientWidth || host.clientWidth || 0
            cssH = canvas.clientHeight || host.clientHeight || 0
            const w = Math.max(1, Math.round(cssW * dpr))
            const h = Math.max(1, Math.round(cssH * dpr))
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w
                canvas.height = h
            }
            buildTargets(w, h)
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(canvas)

        /* ---- pointer ---- */
        const onMove = (e: PointerEvent) => {
            // offsetWidth, not getBoundingClientRect: the rect carries the
            // Framer canvas zoom and the splat would land off the cursor.
            const r = host.getBoundingClientRect()
            const w = host.offsetWidth || 1
            const h = host.offsetHeight || 1
            const nx = (e.clientX - r.left) / Math.max(1, r.width)
            const ny = 1 - (e.clientY - r.top) / Math.max(1, r.height)
            const p = pointer.current
            if (p.moved) {
                p.dx += (nx - p.x) * w
                p.dy += (ny - p.y) * h
            }
            p.x = nx
            p.y = ny
            p.moved = 1
        }
        const onLeave = () => {
            pointer.current.moved = 0
            pointer.current.down = 0
        }
        const onDown = () => {
            pointer.current.down = 1
        }
        const onUp = () => {
            pointer.current.down = 0
        }
        host.addEventListener("pointermove", onMove)
        host.addEventListener("pointerleave", onLeave)
        host.addEventListener("pointerdown", onDown)
        host.addEventListener("pointercancel", onUp)
        // On window, not host: a drag that releases outside must still let go.
        window.addEventListener("pointerup", onUp)

        /* ---- loop ---- */
        let raf = 0
        let last = performance.now()
        let clock = 0 // scaled sim time, drives the autonomous splat path
        let colorPhase = 0
        let seeded = false
        // Autonomous path state, so its force is a real frame-to-frame delta and
        // not a guess — the drift stirs the field exactly the way a pointer does.
        let ax = 0.5
        let ay = 0.5

        const doSplat = (
            px: number,
            py: number,
            fx: number,
            fy: number,
            col: [number, number, number],
            radius: number,
            ink: number
        ) => {
            if (!vel || !dye || !splat) return
            gl.useProgram(splat.prog)
            gl.uniform1f(splat.u.uAspect, aspect)
            gl.uniform2f(splat.u.uPoint, px, py)
            gl.uniform1f(splat.u.uRadius, radius)

            gl.uniform1i(splat.u.uTarget, bind(vel.read.tex, 0))
            gl.uniform3f(splat.u.uColor, fx, fy, 0)
            blit(vel.write)
            vel.swap()

            gl.uniform1i(splat.u.uTarget, bind(dye.read.tex, 0))
            gl.uniform3f(splat.u.uColor, col[0] * ink, col[1] * ink, col[2] * ink)
            blit(dye.write)
            dye.swap()
        }

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dtReal = Math.min((now - last) / 1000, 1 / 30)
            last = now

            if (cssW <= 0 || cssH <= 0) {
                resize()
                if (cssW <= 0 || cssH <= 0) return
            }
            if (!vel || !dye || !prs || !div || !crl) return

            const L = live.current
            // 50 is the rate the scene shipped at (rule 8b).
            const scale = Math.max(0, L.speed) / 50
            const dt = dtReal * scale
            clock += dt

            const pal =
                Array.isArray(L.colors) && L.colors.length > 0
                    ? L.colors.slice(0, MAX_COLORS)
                    : DEFAULT_COLORS
            colorPhase += dt * 0.25
            const pick = (t: number): [number, number, number] => {
                const i = Math.floor(Math.abs(t) * pal.length) % pal.length
                const c = parseColor(pal[i])
                return [c[0], c[1], c[2]]
            }

            // Reach is a percent of the frame (rule 8b): 0 is a pinprick, 100
            // a splat about a third of the short side across. Squared because
            // the shader divides dot(p, p) by it.
            const r = 0.008 + (Math.max(0, L.reach) / 100) * 0.16
            const radius = r * r

            /* ---- inputs ---- */
            if (!seeded) {
                seeded = true
                for (let i = 0; i < SEEDS.length; i++) {
                    const s = SEEDS[i]
                    doSplat(s[0], s[1], s[2], s[3], pick(i / SEEDS.length), radius, 1.1)
                }
            }

            const p = pointer.current
            if (p.moved && (Math.abs(p.dx) > 0.01 || Math.abs(p.dy) > 0.01)) {
                const gain = (L.force / 100) * 0.9 * (1 + p.down)
                doSplat(
                    p.x,
                    p.y,
                    p.dx * gain,
                    p.dy * gain,
                    pick(colorPhase + p.x),
                    radius,
                    dtReal * INJECT_RATE
                )
            }
            p.dx = 0
            p.dy = 0

            // The autonomous stirrer. Two incommensurate frequencies, so the
            // path never repeats inside a visit and the field never settles
            // into a standing pattern. Its FORCE is the measured delta of the
            // same path, which is why the ink trails behind it correctly.
            if (L.drift > 0) {
                const nx = 0.5 + 0.32 * Math.sin(clock * 0.55) * Math.cos(clock * 0.17)
                const ny = 0.5 + 0.28 * Math.sin(clock * 0.43 + 1.7)
                const w = cssW || 1
                const h = cssH || 1
                const fx = (nx - ax) * w * (L.drift / 100) * 1.6
                const fy = (ny - ay) * h * (L.drift / 100) * 1.6
                ax = nx
                ay = ny
                if (Math.abs(fx) > 0.01 || Math.abs(fy) > 0.01) {
                    doSplat(
                        nx,
                        ny,
                        fx,
                        fy,
                        pick(colorPhase),
                        radius * 0.8,
                        dtReal * INJECT_RATE * (L.drift / 100)
                    )
                }
            }

            /* ---- solve ---- */
            const setTexel = (pass: Pass, t: Target) =>
                gl.uniform2f(pass.u.uTexel, t.texelX, t.texelY)

            gl.useProgram(curl.prog)
            setTexel(curl, vel.read)
            gl.uniform1i(curl.u.uVel, bind(vel.read.tex, 0))
            blit(crl)

            gl.useProgram(vorticity.prog)
            setTexel(vorticity, vel.read)
            gl.uniform1i(vorticity.u.uVel, bind(vel.read.tex, 0))
            gl.uniform1i(vorticity.u.uCurl, bind(crl.tex, 1))
            gl.uniform1f(vorticity.u.uCurlAmt, (L.swirl / 50) * CURL_AT_50)
            gl.uniform1f(vorticity.u.uDt, dt)
            blit(vel.write)
            vel.swap()

            gl.useProgram(divergence.prog)
            setTexel(divergence, vel.read)
            gl.uniform1i(divergence.u.uVel, bind(vel.read.tex, 0))
            blit(div)

            gl.useProgram(clearPass.prog)
            setTexel(clearPass, prs.read)
            gl.uniform1i(clearPass.u.uTex, bind(prs.read.tex, 0))
            gl.uniform1f(clearPass.u.uValue, PRESSURE_DECAY)
            blit(prs.write)
            prs.swap()

            gl.useProgram(pressure.prog)
            setTexel(pressure, prs.read)
            gl.uniform1i(pressure.u.uDivergence, bind(div.tex, 0))
            for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
                gl.uniform1i(pressure.u.uPressure, bind(prs.read.tex, 1))
                blit(prs.write)
                prs.swap()
            }

            gl.useProgram(gradient.prog)
            setTexel(gradient, vel.read)
            gl.uniform1i(gradient.u.uPressure, bind(prs.read.tex, 0))
            gl.uniform1i(gradient.u.uVel, bind(vel.read.tex, 1))
            blit(vel.write)
            vel.swap()

            gl.useProgram(advect.prog)
            setTexel(advect, vel.read)
            gl.uniform2f(advect.u.uTexelSrc, vel.read.texelX, vel.read.texelY)
            gl.uniform1f(advect.u.uDt, dt)
            gl.uniform1f(advect.u.uDiss, VELOCITY_DISSIPATION)
            gl.uniform1i(advect.u.uVel, bind(vel.read.tex, 0))
            gl.uniform1i(advect.u.uSrc, bind(vel.read.tex, 0))
            blit(vel.write)
            vel.swap()

            // Dye advects on the VELOCITY texel (that is the grid the back-trace
            // walks) but fetches on its own, finer texel.
            gl.uniform2f(advect.u.uTexel, vel.read.texelX, vel.read.texelY)
            gl.uniform2f(advect.u.uTexelSrc, dye.read.texelX, dye.read.texelY)
            // Dissipation is "how fast the ink fades", so higher = shorter.
            gl.uniform1f(advect.u.uDiss, (Math.max(1, L.dissipation) / 100) * 2.2)
            gl.uniform1i(advect.u.uVel, bind(vel.read.tex, 0))
            gl.uniform1i(advect.u.uSrc, bind(dye.read.tex, 1))
            blit(dye.write)
            dye.swap()

            /* ---- present ---- */
            gl.useProgram(display.prog)
            gl.uniform2f(display.u.uTexel, dye.read.texelX, dye.read.texelY)
            gl.uniform1i(display.u.uTex, bind(dye.read.tex, 0))
            gl.uniform1f(display.u.uGain, 1.0)
            gl.bindFramebuffer(gl.FRAMEBUFFER, null)
            gl.viewport(0, 0, canvas.width, canvas.height)
            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            host.removeEventListener("pointermove", onMove)
            host.removeEventListener("pointerleave", onLeave)
            host.removeEventListener("pointerdown", onDown)
            host.removeEventListener("pointercancel", onUp)
            window.removeEventListener("pointerup", onUp)
            dispose()
            // No loseContext(): see the header note.
        }
    }, [])

    return (
        <div
            ref={hostRef}
            style={{
                // Floor BEFORE the style spread: the canvas is absolutely
                // positioned, so the root has no in-flow content and collapses
                // to a dot under Framer's Fit Content sizing.
                minWidth: 1200,
                minHeight: 800,
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                background,
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
            {/* Vignette is CSS, not a GL pass (rule 8b). Its own alpha is the
                intensity, so there is no second Glow Intensity dial. */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    background: `radial-gradient(120% 90% at 50% 50%, transparent 35%, ${glow} 100%)`,
                }}
            />
        </div>
    )
}

const __presetProps = {
  "background": "#07060D",
  "colors": [
    "#000753",
    "#A000FF",
    "#71FF6C",
    "#FF0000",
    "#FFFA00"
  ],
  "speed": 99,
  "dissipation": 50,
  "swirl": 0,
  "drift": 21,
  "glow": "#0000008C",
  "cursor": {
    "force": 60,
    "reach": 50
  }
};

export default function InkFlowField(props: Record<string, unknown>) {
  return <__BaseImpl_InkFlowField {...(__presetProps as Record<string, unknown>)} {...props} />;
}
