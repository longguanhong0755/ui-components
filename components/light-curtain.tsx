"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const MAX_DPR = 2

/* Pointer model. TRAIL = 1 live head + 7 frozen records. */
const TRAIL = 8
const HIST = TRAIL - 1
const TRAIL_LIFE = 0.62 // s a record stays lit
const TRAIL_STEP = 0.022 // uv distance between records
const PULSES = 3
const PULSE_LIFE = 1.15 // s
const PULSE_SPEED = 1.05 // uv per second, outward along x
const SWAY_W = 9.5 // rad/s
const SWAY_Z = 0.3 // underdamped — the fabric swings past and settles

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

const int TRAIL = 8;
const int PULSES = 3;

uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;
uniform float uHover;
uniform float uReach;
uniform float uSway;
uniform float uRush;
uniform vec3  uTrail[TRAIL];   // xy = uv position, z = weight
uniform vec3  uPulse[PULSES];  // x = uv x, y = radius, z = weight
uniform vec3  uBg;
uniform vec3  uBase;
uniform vec3  uAccent;
uniform vec3  uHigh;
uniform float uDensity;
uniform float uWidth;
uniform float uSpread;
uniform float uStriation;

float sat(float x) { return clamp(x, 0.0, 1.0); }

float h21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 34.56);
    return fract(p.x * p.y);
}

float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = h21(i), b = h21(i + vec2(1.0, 0.0));
    float c = h21(i + vec2(0.0, 1.0)), d = h21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm5(vec2 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
    return s;
}

void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    float t = uTime;

    float rx  = max(uReach, 0.02);
    float rx2 = rx * rx;

    // Trail. lift is x-only so it smears top to bottom like the curtain does;
    // blob is x AND y, the bright head that actually sits under the cursor.
    float lift = 0.0, blob = 0.0, cenY = 0.0, cenW = 0.0;
    for (int i = 0; i < TRAIL; i++) {
        vec3 s = uTrail[i];
        float dx = uv.x - s.x;
        float dy = uv.y - s.y;
        float gx = s.z * exp(-(dx * dx) / rx2);
        lift += gx;
        blob += gx * exp(-(dy * dy) / (rx2 * 2.6));
        cenY += gx * s.y;
        cenW += gx;
    }
    float trailY = cenY / max(cenW, 1e-4);

    // Press rings, travelling outward along x.
    float ring = 0.0;
    for (int i = 0; i < PULSES; i++) {
        vec3 p = uPulse[i];
        float d = abs(uv.x - p.x) - p.y;
        ring += p.z * exp(-(d * d) / 0.0012);
    }

    lift = (min(lift, 2.0) + ring * 0.9) * uHover;
    blob = min(blob, 1.5) * uHover;

    // Drag. The lag is signed, so the overshoot on release reads as a swing
    // back through centre rather than an ease-out.
    float nearP = exp(-pow(uv.x - uMouse.x, 2.0) / (rx2 * 4.0));
    float xw = uv.x - uSway * 0.09 * (0.25 + 0.75 * nearP) * uHover;

    float n1 = fbm5(vec2(xw * 6.5 * uDensity, t * 0.045));
    float n2 = fbm5(vec2(xw * 24.0 * uDensity + 3.1, t * 0.075));
    float n3 = vnoise(vec2(xw * 210.0 * uDensity, t * 0.04));
    float n4 = vnoise(vec2(xw * 70.0 * uDensity, 4.0 + t * 0.03));

    float band = pow(sat(n1 * 1.30 + n2 * 0.80 - 0.58 + lift * 0.34), 1.95);
    band *= 0.62 + 0.70 * n4;

    float yc = 0.50 + 0.24 * uSpread * (fbm5(vec2(xw * 3.1 * uDensity, 11.0)) - 0.5) * 2.0;
    yc = mix(yc, trailY, sat(cenW * 1.1) * uHover * 0.45);

    // A fast sweep flares the columns it passes through.
    float wdt = uWidth * (0.22 + 0.28 * n2 + 0.10 * n1) * (1.0 + 0.5 * uRush * sat(lift));
    float prof = exp(-pow(abs(uv.y - yc) / max(wdt, 0.02), 1.75));

    float inten = band * prof * (1.0 - uStriation * 0.5 + uStriation * n3);

    // Two colours across the field, the third only where the column is both
    // narrow and bright — the warm sliver in the reference.
    float blend = sat(n1 * 1.30 - n2 * 0.55 + 0.28);
    vec3 c = mix(uBase, uAccent, blend);
    float amber = sat((n2 - 0.70) * 5.2) * sat(n1 * 1.6 - 0.35);
    c = mix(c, uHigh, amber * 0.85);

    vec3 col = uBg;
    col += c * pow(inten, 0.88) * 1.42;
    col += vec3(1.0, 0.94, 1.0) * pow(inten, 4.5) * 0.65;
    col += c * 0.30 * pow(sat(prof * band * 3.0), 0.70);
    col += c * 0.10 * pow(sat(prof * 1.2), 1.3);
    // Trail bloom. Speed pushes it toward Highlight, so the gesture is what
    // brings the third colour out rather than a dial nobody moves.
    col += mix(uAccent, uHigh, sat(uRush)) * blob * (0.22 + 0.16 * uRush);
    // The ring emits its own light. Folded into band alone it was gated by the
    // darkness it is supposed to light up: it flashed at the click and vanished
    // the moment it reached the first gap between columns. prof still shapes
    // it, so it reads as the curtain lighting up, not as a bar crossing it.
    col += mix(uAccent, uHigh, 0.35) * ring * prof * 0.75 * uHover;
    col += vec3(1.0, 0.95, 0.92) * pow(ring, 3.0) * prof * 0.35 * uHover;
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
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
        console.error("LightCurtain shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

interface CurtainGroup {
    curtainWidth?: number
    spread?: number
    striation?: number
}

interface LightCurtainProps {
    style?: React.CSSProperties
    background?: string
    baseColor?: string
    accentColor?: string
    highlight?: string
    density?: number
    speed?: number
    curtain?: CurtainGroup
    hover?: number
    reach?: number
    width?: number
    height?: number
}

const CURTAIN_DEFAULTS: Required<CurtainGroup> = {
    curtainWidth: 100,
    spread: 100,
    striation: 55,
}

function __BaseImpl_LightCurtain(props: LightCurtainProps) {
    const {
        style,
        background = "#05030A",
        baseColor = "#7A2CE0",
        accentColor = "#E24BC8",
        highlight = "#FF9E3D",
        density = 150,
        speed = 50,
        curtain,
        hover = 100,
        reach = 30,
        width,
        height,
    } = props

    const cur = { ...CURTAIN_DEFAULTS, ...(curtain || {}) }

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    const vRef = useRef({
        bg: "#05030A",
        base: "#7A2CE0",
        accent: "#E24BC8",
        high: "#FF9E3D",
        density: 1,
        speed: 1,
        cw: 1,
        spread: 1,
        striation: 0.55,
        hover: 1,
        reach: 0.074,
    })
    vRef.current = {
        bg: background,
        base: baseColor,
        accent: accentColor,
        high: highlight,
        density: clampN(num(density, 50), 10, 150) / 50,
        speed: clampN(num(speed, 50), 0, 100) / 50,
        cw: clampN(num(cur.curtainWidth, 100), 30, 250) / 100,
        spread: clampN(num(cur.spread, 100), 0, 200) / 100,
        striation: clampN(num(cur.striation, 55), 0, 100) / 100,
        hover: clampN(num(hover, 100), 0, 200) / 100,
        // Percent of the reachable radius: 0 % is one column, 100 % is a fifth
        // of the width either side.
        reach: 0.02 + (clampN(num(reach, 30), 0, 100) / 100) * 0.18,
    }

    const ptrRef = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, on: 0, onTarget: 0, downAt: -1 })

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false })
        if (!gl) {
            console.error("LightCurtain: WebGL unavailable")
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
            console.error("LightCurtain link:", gl.getProgramInfoLog(prog))
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

        // Trail ring buffer. Records are FROZEN at emit — a live one would drag
        // the whole tail along with the cursor and there would be no tail.
        const hx = new Float32Array(HIST)
        const hy = new Float32Array(HIST)
        const hAge = new Float32Array(HIST).fill(TRAIL_LIFE * 2)
        let head = 0
        let lastEmitX = 0.5
        let lastEmitY = 0.5
        const trailData = new Float32Array(TRAIL * 3)

        const pulseX = new Float32Array(PULSES)
        const pulseAge = new Float32Array(PULSES).fill(PULSE_LIFE * 2)
        let pulseHead = 0
        const pulseData = new Float32Array(PULSES * 3)

        const sway = { p: 0.5, v: 0 }
        let rush = 0
        let prevX = 0.5
        let prevY = 0.5

        let raf = 0
        let last = performance.now()
        let clock = 0

        const render = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            const v = vRef.current

            clock = (clock + dt * v.speed) % 3600

            const ptr = ptrRef.current
            const kOn = 1 - Math.exp(-6 * dt)
            ptr.on += (ptr.onTarget - ptr.on) * kOn
            // Head follows fast; the LAG is the spring's job, not the filter's.
            // It follows tx/ty even after the pointer leaves — re-targeting the
            // centre on leave sends the glow racing across the curtain (kHead is
            // far faster than the fade) instead of just dimming where it was.
            const kHead = 1 - Math.exp(-22 * dt)
            ptr.x += (ptr.tx - ptr.x) * kHead
            ptr.y += (ptr.ty - ptr.y) * kHead

            // Speed, from the raw target so the head filter does not eat it.
            // Fast attack, slow release: between two pointermove events the
            // instantaneous speed is 0, and a symmetric filter would flicker.
            const inst = Math.hypot(ptr.tx - prevX, ptr.ty - prevY) / Math.max(dt, 1e-3)
            prevX = ptr.tx
            prevY = ptr.ty
            const rushTarget = clampN(inst / 2.0, 0, 1) * ptr.on
            rush += (rushTarget - rush) * (1 - Math.exp(-(rushTarget > rush ? 14 : 3.2) * dt))

            // Underdamped spring, semi-implicit Euler (stable at dt <= 0.05).
            sway.v += (-2 * SWAY_Z * SWAY_W * sway.v - SWAY_W * SWAY_W * (sway.p - ptr.x)) * dt
            sway.p += sway.v * dt
            const lag = clampN((ptr.x - sway.p) * 3.0, -1, 1)

            // Emit by distance, not by timer.
            const my = 1 - ptr.y
            if (ptr.on > 0.02 && Math.hypot(ptr.x - lastEmitX, my - lastEmitY) > TRAIL_STEP) {
                head = (head + 1) % HIST
                hx[head] = ptr.x
                hy[head] = my
                hAge[head] = 0
                lastEmitX = ptr.x
                lastEmitY = my
            }

            trailData[0] = ptr.x
            trailData[1] = my
            trailData[2] = ptr.on
            for (let i = 0; i < HIST; i++) {
                const idx = (head - i + HIST * 2) % HIST
                hAge[idx] += dt
                const a = hAge[idx]
                const w = a >= TRAIL_LIFE ? 0 : Math.pow(1 - a / TRAIL_LIFE, 1.6) * ptr.on * 0.8
                trailData[(i + 1) * 3] = hx[idx]
                trailData[(i + 1) * 3 + 1] = hy[idx]
                trailData[(i + 1) * 3 + 2] = w
            }

            for (let i = 0; i < PULSES; i++) {
                pulseAge[i] += dt
                const a = pulseAge[i]
                const w = a >= PULSE_LIFE ? 0 : Math.pow(1 - a / PULSE_LIFE, 2.0)
                pulseData[i * 3] = pulseX[i]
                pulseData[i * 3 + 1] = a * PULSE_SPEED
                pulseData[i * 3 + 2] = w
            }

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

            const bg = parseColor(v.bg, [0.02, 0.012, 0.039])
            const base = parseColor(v.base, [0.478, 0.173, 0.878])
            const accent = parseColor(v.accent, [0.886, 0.294, 0.784])
            const high = parseColor(v.high, [1.0, 0.62, 0.239])

            gl.uniform2f(u("uRes"), bw, bh)
            gl.uniform1f(u("uTime"), clock)
            gl.uniform2f(u("uMouse"), ptr.x, my)
            gl.uniform1f(u("uHover"), Math.min(1, ptr.on) * v.hover)
            gl.uniform1f(u("uReach"), v.reach)
            gl.uniform1f(u("uSway"), lag)
            gl.uniform1f(u("uRush"), rush)
            gl.uniform3fv(u("uTrail[0]"), trailData)
            gl.uniform3fv(u("uPulse[0]"), pulseData)
            gl.uniform3f(u("uBg"), bg[0], bg[1], bg[2])
            gl.uniform3f(u("uBase"), base[0], base[1], base[2])
            gl.uniform3f(u("uAccent"), accent[0], accent[1], accent[2])
            gl.uniform3f(u("uHigh"), high[0], high[1], high[2])
            gl.uniform1f(u("uDensity"), v.density)
            gl.uniform1f(u("uWidth"), v.cw)
            gl.uniform1f(u("uSpread"), v.spread)
            gl.uniform1f(u("uStriation"), v.striation)

            gl.drawArrays(gl.TRIANGLES, 0, 3)
            raf = requestAnimationFrame(render)
        }

        // offsetX / offsetWidth, never getBoundingClientRect: the rect carries
        // the Framer canvas zoom and the pointer would drift on a zoomed canvas.
        const track = (e: PointerEvent) => {
            const w = canvas.offsetWidth
            const h = canvas.offsetHeight
            if (w <= 0 || h <= 0) return
            const p = ptrRef.current
            p.tx = clampN(e.offsetX / w, 0, 1)
            p.ty = clampN(e.offsetY / h, 0, 1)
            if (p.on < 0.02) {
                // Cold entry: teleport the whole model to the new spot. Easing
                // in from the last visit would drag a bright streak across the
                // curtain and hang a ghost tail off a place nobody touched.
                p.x = p.tx
                p.y = p.ty
                sway.p = p.tx
                sway.v = 0
                prevX = p.tx
                prevY = p.ty
                lastEmitX = p.tx
                lastEmitY = 1 - p.ty
                hAge.fill(TRAIL_LIFE * 2)
            }
            p.onTarget = 1
        }
        const onDown = (e: PointerEvent) => {
            track(e)
            pulseHead = (pulseHead + 1) % PULSES
            pulseX[pulseHead] = ptrRef.current.tx
            pulseAge[pulseHead] = 0
        }
        const onLeave = () => {
            ptrRef.current.onTarget = 0
        }

        canvas.addEventListener("pointermove", track)
        canvas.addEventListener("pointerenter", track)
        canvas.addEventListener("pointerdown", onDown)
        canvas.addEventListener("pointerleave", onLeave)
        raf = requestAnimationFrame(render)

        return () => {
            cancelAnimationFrame(raf)
            canvas.removeEventListener("pointermove", track)
            canvas.removeEventListener("pointerenter", track)
            canvas.removeEventListener("pointerdown", onDown)
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

const __presetProps = {
  "background": "#05030A",
  "baseColor": "#E02C2C",
  "accentColor": "#E24BC8",
  "highlight": "#FF9E3D",
  "density": 150,
  "speed": 50,
  "curtain": {
    "spread": 0,
    "striation": 100,
    "curtainWidth": 30
  },
  "hover": 100,
  "reach": 30
};

export default function LightCurtain(props: Record<string, unknown>) {
  return <__BaseImpl_LightCurtain {...(__presetProps as Record<string, unknown>)} {...props} />;
}
