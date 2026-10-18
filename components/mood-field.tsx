"use client"

import * as React from "react"

// ---------------------------------------------------------------- colour

function unwrapVar(input: string): string {
    // ControlType.Color can emit var(--token, <fallback>); take the fallback.
    const at = input.toLowerCase().indexOf("var(")
    if (at < 0) return input.trim()
    let depth = 0
    let comma = -1
    for (let i = at + 3; i < input.length; i++) {
        const c = input[i]
        if (c === "(") depth++
        else if (c === ")") {
            depth--
            if (depth === 0) {
                if (comma < 0) return input.trim()
                return input.slice(comma + 1, i).trim()
            }
        } else if (c === "," && depth === 1 && comma < 0) comma = i
    }
    return input.trim()
}

let probeCtx: CanvasRenderingContext2D | null | undefined

function normalizeCss(css: string): string | null {
    if (probeCtx === undefined) {
        probeCtx =
            typeof document === "undefined"
                ? null
                : document.createElement("canvas").getContext("2d")
    }
    if (!probeCtx) return null
    // Two sentinels: an invalid assignment leaves fillStyle untouched.
    probeCtx.fillStyle = "#000000"
    probeCtx.fillStyle = css
    const a = String(probeCtx.fillStyle)
    if (a !== "#000000") return a
    probeCtx.fillStyle = "#ffffff"
    probeCtx.fillStyle = css
    const b = String(probeCtx.fillStyle)
    return b === "#ffffff" ? null : b
}

function toRgb(
    input: string | undefined,
    fallback: [number, number, number]
): [number, number, number] {
    if (!input || typeof input !== "string") return fallback
    const css = normalizeCss(unwrapVar(input))
    if (!css) return fallback

    let hex = css.trim()
    if (hex[0] === "#") {
        if (hex.length === 4 || hex.length === 5) {
            hex =
                "#" +
                hex[1] + hex[1] +
                hex[2] + hex[2] +
                hex[3] + hex[3]
        }
        const n = parseInt(hex.slice(1, 7), 16)
        if (!Number.isNaN(n)) {
            return [
                ((n >> 16) & 255) / 255,
                ((n >> 8) & 255) / 255,
                (n & 255) / 255,
            ]
        }
        return fallback
    }
    const m = hex.match(/-?[\d.]+/g)
    if (m && m.length >= 3) {
        return [
            Math.min(1, Math.max(0, parseFloat(m[0]) / 255)),
            Math.min(1, Math.max(0, parseFloat(m[1]) / 255)),
            Math.min(1, Math.max(0, parseFloat(m[2]) / 255)),
        ]
    }
    return fallback
}

// ---------------------------------------------------------------- shaders

const VERT = `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
`

// precision highp: the fbm divides and the exp() falloff both sit near zero on
// mobile GPUs that silently downgrade mediump (rule 6).
const FRAG = `
precision highp float;

uniform vec2  iResolution;
uniform vec2  iMouse;
uniform float iTime;
uniform float uEmotion;
uniform vec3  uIntense;
uniform vec3  uCalm;
uniform vec3  uBg;
uniform float uScale;
uniform float uWarp;
uniform float uRidge;
uniform float uContrast;
uniform float uReach;
uniform float uHover;
uniform float uSwirl;
uniform float uPointer;

const mat2 R2 = mat2(0.80, 0.60, -0.60, 0.80);

float hash21(vec2 p){
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float vnoise(vec2 p){
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p){
    float sum  = 0.0;
    float amp  = 0.5;
    float norm = 0.0;
    for (int i = 0; i < 4; i++){
        float v = vnoise(p);
        v = mix(v, abs(v * 2.0 - 1.0), uRidge);
        sum  += amp * v;
        norm += amp;
        p = R2 * p * 2.03 + 7.13;
        amp *= 0.5;
    }
    return sum / max(norm, 1e-4);
}

void main(){
    float h = max(iResolution.y, 1.0);
    vec2 sp = (gl_FragCoord.xy - 0.5 * iResolution) / h;
    vec2 mp = (iMouse - 0.5 * iResolution) / h;

    float reach = max(uReach / h, 1e-4);
    vec2  d = sp - mp;
    float r = length(d);
    float infl = uPointer * uHover * exp(-(r * r) / (reach * reach));

    float ang = infl * uSwirl;
    float cs = cos(ang);
    float sn = sin(ang);
    sp = mp + mat2(cs, -sn, sn, cs) * d;
    sp += d * (infl * 0.30) / max(r, 1e-3);

    float tt = iTime * mix(1.55, 0.55, uEmotion);
    vec2 p = sp * uScale;

    vec2 q = vec2(
        fbm(p + vec2(0.0, tt * 0.16)),
        fbm(p + vec2(5.2, 1.3) - vec2(tt * 0.12, 0.0))
    );
    float f = fbm(p + uWarp * q + vec2(tt * 0.05, -tt * 0.04));

    float v = pow(clamp(f, 0.0, 1.0), uContrast);
    v = clamp(v + infl * 0.22, 0.0, 1.0);

    vec3 mood = mix(uIntense, uCalm, uEmotion);
    vec3 col = mix(uBg, mood, smoothstep(0.12, 0.92, v));
    col += mood * pow(v, 5.0) * 0.9;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

// ---------------------------------------------------------------- props

interface FlowGroup {
    warp?: number
    turbulence?: number
    contrast?: number
}

interface CursorGroup {
    reach?: number
    hover?: number
    swirl?: number
}

interface Props {
    background?: string
    intenseColor?: string
    calmColor?: string
    mood?: "intense" | "calm"
    speed?: number
    density?: number
    damping?: number
    flow?: FlowGroup
    cursor?: CursorGroup
    width?: number
    height?: number
    style?: React.CSSProperties
}

// Typed so an omitted optional field is not an error at the read site (rule 10).
const DEFAULTS: {
    background: "#05060a"
    intenseColor: "#FF00B3"
    calmColor: "#2f6bff"
    mood: "intense"
    speed: 50
    density: 100
    damping: 50
    flow: {
        defaultValue: {"warp":100,"contrast":100,"turbulence":100},"warp":100,"contrast":100,"turbulence":100}
    cursor: {
        defaultValue: {"hover":100,"reach":260,"swirl":90},"hover":100,"reach":260,"swirl":45}
} = {
    background: "#05060a",
    intenseColor: "#ff3a1f",
    calmColor: "#2f6bff",
    mood: "intense",
    speed: 50,
    density: 100,
    damping: 50,
    flow: { warp: 100, turbulence: 100, contrast: 100 },
    cursor: { reach: 260, hover: 100, swirl: 45 },
}

const MIN_W = 1200
const MIN_H = 800
const MAX_DPR = 1.5

export default function MoodField(props: Props) {
    const {
        background = DEFAULTS.background,
        intenseColor = DEFAULTS.intenseColor,
        calmColor = DEFAULTS.calmColor,
        mood = DEFAULTS.mood,
        speed = DEFAULTS.speed,
        density = DEFAULTS.density,
        damping = DEFAULTS.damping,
        style,
    } = props

    const flowIn = { ...DEFAULTS.flow, ...(props.flow ?? {}) }
    const cursorIn = { ...DEFAULTS.cursor, ...(props.cursor ?? {}) }
    const warp = flowIn.warp ?? DEFAULTS.flow.warp
    const turbulence = flowIn.turbulence ?? DEFAULTS.flow.turbulence
    const contrast = flowIn.contrast ?? DEFAULTS.flow.contrast
    const reach = cursorIn.reach ?? DEFAULTS.cursor.reach
    const hover = cursorIn.hover ?? DEFAULTS.cursor.hover
    const swirl = cursorIn.swirl ?? DEFAULTS.cursor.swirl

    const rootRef = React.useRef<HTMLDivElement | null>(null)
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null)

    // Every live input is read from this ref inside the loop, never from the
    // effect deps — otherwise each colour tweak rebuilds the GL context (rule 6).
    const live = React.useRef({
        bg: [0, 0, 0] as [number, number, number],
        intense: [1, 0, 0] as [number, number, number],
        calm: [0, 0, 1] as [number, number, number],
        target: 0,
        speed: 1,
        scale: 2.2,
        warp: 1.2,
        turbulence: 1,
        contrast: 1.75,
        reach: 260,
        hover: 1,
        swirl: 0.785,
    })

    live.current = {
        bg: toRgb(background, [0.02, 0.024, 0.04]),
        intense: toRgb(intenseColor, [1, 0.23, 0.12]),
        calm: toRgb(calmColor, [0.18, 0.42, 1]),
        target: mood === "calm" ? 1 : 0,
        speed: Math.max(0, speed) / 50,
        scale: (2.2 * Math.max(1, density)) / 100,
        warp: (1.2 * Math.max(0, warp)) / 100,
        turbulence: Math.max(0, turbulence) / 100,
        contrast: 0.5 + (2.5 * Math.max(0, contrast)) / 200,
        reach: Math.max(1, reach),
        hover: Math.max(0, hover) / 100,
        swirl: (Math.max(-90, Math.min(90, swirl)) * Math.PI) / 180,
    }

    // Damping 50 -> 0.03/frame, the sketch's own easing constant.
    const dampRef = React.useRef(0.03)
    dampRef.current = 0.0006 * Math.max(1, Math.min(100, damping))

    React.useEffect(() => {
        const canvas = canvasRef.current
        const root = rootRef.current
        if (!canvas || !root) return

        const gl = canvas.getContext("webgl", {
            alpha: false,
            antialias: false,
            depth: false,
            stencil: false,
            premultipliedAlpha: false,
        }) as WebGLRenderingContext | null
        if (!gl) return

        const compile = (type: number, src: string) => {
            const sh = gl.createShader(type)!
            gl.shaderSource(sh, src)
            gl.compileShader(sh)
            return sh
        }
        const prog = gl.createProgram()!
        gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        gl.useProgram(prog)

        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 3, -1, -1, 3]),
            gl.STATIC_DRAW
        )
        const aPos = gl.getAttribLocation(prog, "aPos")
        gl.enableVertexAttribArray(aPos)
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

        // Locations are per-program; a typo here fails silently (rule 8).
        const u = {
            res: gl.getUniformLocation(prog, "iResolution"),
            mouse: gl.getUniformLocation(prog, "iMouse"),
            time: gl.getUniformLocation(prog, "iTime"),
            emotion: gl.getUniformLocation(prog, "uEmotion"),
            intense: gl.getUniformLocation(prog, "uIntense"),
            calm: gl.getUniformLocation(prog, "uCalm"),
            bg: gl.getUniformLocation(prog, "uBg"),
            scale: gl.getUniformLocation(prog, "uScale"),
            warp: gl.getUniformLocation(prog, "uWarp"),
            ridge: gl.getUniformLocation(prog, "uRidge"),
            contrast: gl.getUniformLocation(prog, "uContrast"),
            reach: gl.getUniformLocation(prog, "uReach"),
            hover: gl.getUniformLocation(prog, "uHover"),
            swirl: gl.getUniformLocation(prog, "uSwirl"),
            pointer: gl.getUniformLocation(prog, "uPointer"),
        }

        let bw = 0
        let bh = 0
        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            // clientWidth, not the width prop: in the Framer preview the size
            // props are not numeric, and getBoundingClientRect carries the
            // canvas zoom (rule G).
            const w = Math.max(1, Math.round(root.clientWidth * dpr))
            const h = Math.max(1, Math.round(root.clientHeight * dpr))
            if (w === bw && h === bh) return
            bw = w
            bh = h
            canvas.width = w
            canvas.height = h
            gl.viewport(0, 0, w, h)
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(root)

        const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, presence: 0, want: 0 }
        const onMove = (e: PointerEvent) => {
            const r = root.getBoundingClientRect()
            // Ratios only — the zoom factor cancels in the division.
            mouse.tx = (e.clientX - r.left) / Math.max(r.width, 1)
            mouse.ty = (e.clientY - r.top) / Math.max(r.height, 1)
            mouse.want = 1
        }
        const onLeave = () => {
            mouse.want = 0
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointercancel", onLeave)

        let emotion = live.current.target
        let clock = 0
        let last = -1
        let raf = 0

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            // The first rAF timestamp can precede this effect: clamp, never
            // let a negative dt through.
            const dt = last < 0 ? 0 : Math.min(0.1, Math.max(0, (now - last) / 1000))
            last = now
            resize()

            const L = live.current
            const k = 1 - Math.pow(1 - dampRef.current, dt * 60)
            emotion += (L.target - emotion) * k
            clock += dt * L.speed

            const mk = 1 - Math.pow(1 - 0.18, dt * 60)
            mouse.x += (mouse.tx - mouse.x) * mk
            mouse.y += (mouse.ty - mouse.y) * mk
            mouse.presence += (mouse.want - mouse.presence) * mk

            gl.uniform2f(u.res, bw, bh)
            // Pointer y is top-down, gl_FragCoord.y is bottom-up.
            gl.uniform2f(u.mouse, mouse.x * bw, (1 - mouse.y) * bh)
            gl.uniform1f(u.time, clock)
            gl.uniform1f(u.emotion, emotion)
            gl.uniform3fv(u.intense, L.intense)
            gl.uniform3fv(u.calm, L.calm)
            gl.uniform3fv(u.bg, L.bg)
            gl.uniform1f(u.scale, L.scale)
            gl.uniform1f(u.warp, L.warp * (1 - 0.3 * emotion))
            gl.uniform1f(
                u.ridge,
                Math.min(1, L.turbulence * (0.9 - 0.6 * emotion))
            )
            gl.uniform1f(u.contrast, L.contrast)
            gl.uniform1f(u.reach, L.reach * (bh / Math.max(root.clientHeight, 1)))
            gl.uniform1f(u.hover, L.hover)
            gl.uniform1f(u.swirl, L.swirl)
            gl.uniform1f(u.pointer, mouse.presence)

            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointercancel", onLeave)
            // No loseContext(): getContext returns the same context per canvas,
            // so a StrictMode remount would reuse a force-lost one (rule 6).
        }
    }, [])

    return (
        <div
            ref={rootRef}
            style={{
                position: "relative",
                overflow: "hidden",
                isolation: "isolate",
                width: "100%",
                height: "100%",
                minWidth: MIN_W,
                minHeight: MIN_H,
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
        </div>
    )
}
