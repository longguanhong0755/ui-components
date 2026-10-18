"use client"

import type { CSSProperties } from "react"
import { useEffect, useRef } from "react"

// Framer's editing canvas does not exist outside Framer: this build always
// renders in a real browser. Same values the live preview runs under.
const RenderTarget = {
    current: () => "preview",
    hasRestrictions: () => false,
    canvas: "canvas",
    export: "export",
    preview: "preview",
    thumbnail: "thumbnail",
}

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    cycleSec: 20,
    apexMs: 1000,
    glowFade: 12,
    spinDeg: 55,
    axisX: 0,
    axisY: 0,
    offsetX: 0,
    offsetY: 0,
    dotSize: 15,
    dotGain: 100,
    haloSize: 200,
    haloAmount: 30,
    backDots: 45,
    limbBoost: 50,
    lightBias: 30,
    poleAngle: 35,
    poleFade: 70,
    rimPower: 3,
    rimAmount: 80,
    rimTilt: 25,
    edgeWidth: 2,
    outerGlow: 4,
    hotspotY: 37,
    hotspotSize: 32,
    mottle: 5,
    interior: 35,
    interiorColor: "#15254C",
    shadowColor: "#506EA1",
    grain: 0,
    vignette: 15,
    hover: 50,
}

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec2 uCenter;
uniform float uR;
uniform float uN;
uniform float uGlow;
uniform float uTheta;
uniform float uTime;
uniform vec3 uA;
uniform vec3 uE1;
uniform vec3 uE2;
uniform vec4 uDot;    // sigma frac, halo mul, halo amount, back dots
uniform vec4 uShade;  // limb boost, light bias, pole angle, pole fade
uniform vec4 uRim;    // power, amount, edge width, outer glow
uniform vec4 uLook;   // hotspot y, hotspot size, mottle, interior
uniform vec4 uPost;   // grain, vignette, rim tilt, dot gain
uniform vec3 uBg;
uniform vec3 uBase;
uniform vec3 uGlowC;
uniform vec3 uShadow;
uniform vec3 uInterior;
out vec4 outColor;

const float PI = 3.14159265;
const float TAU = 6.28318531;

float hash11(float x) { return fract(sin(x * 127.1 + 311.7) * 43758.5453); }
float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}
float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec2 lattice(vec3 n) {
    float D = PI / max(uN, 0.5);
    float c = acos(clamp(dot(n, uA), -1.0, 1.0));
    float lon = atan(dot(n, uE2), dot(n, uE1)) + uTheta;
    float sc = sin(c);
    float s = max(uDot.x * D, 1e-4);
    float ic = 1.0 / (2.0 * s * s);
    float sh = max(s * uDot.y, 1e-4);
    float ih = 1.0 / (2.0 * sh * sh);
    float k0 = floor(c / D);
    float core = 0.0;
    float halo = 0.0;
    for (int m = 0; m < 2; m++) {
        float k = k0 + float(m);
        float ck = k * D;
        if (ck > PI + 0.5 * D) continue;
        float dc = c - ck;
        float dc2 = dc * dc;
        if (dc2 * ih > 14.0) continue;
        float Mf = max(1.0, TAU * max(sin(min(ck, PI)), 0.0) / D);
        float Ma = floor(Mf);
        float w = Mf - Ma;
        for (int q = 0; q < 2; q++) {
            float M = Ma + float(q);
            float wq = q == 0 ? 1.0 - w : w;
            if (wq < 1e-3) continue;
            float st = TAU / M;
            float x = lon - k * 0.5 * st;
            float dl = (x - floor(x / st + 0.5) * st) * sc;
            float dd = dc2 + dl * dl;
            core += wq * exp(-dd * ic);
            halo += wq * exp(-dd * ih);
        }
    }
    float pole = mix(1.0 - uShade.w, 1.0, smoothstep(0.0, max(uShade.z, 1e-3), c));
    return vec2(core, halo) * pole;
}

void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 q = (frag - uCenter) / max(uR, 1.0);
    float r = length(q);
    vec3 bg = uBg;
    vec3 col = bg;
    float aa = 1.5 / max(uR, 1.0);
    vec2 lrDir = vec2(0.7071, -0.7071);
    float inside = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, r);

    if (r < 1.0 + aa) {
        float z = sqrt(max(1.0 - r * r, 0.0));
        vec3 n = vec3(q, z);
        vec2 dir = q / max(r, 1e-4);
        float edge = exp(-pow((1.0 - min(r, 1.0)) / max(uRim.z, 1e-3), 2.0));
        float fres = pow(max(1.0 - z, 0.0), uRim.x);
        float rimShade = 1.0 + uPost.z * dot(dir, lrDir);

        // lattice state
        vec2 f = lattice(n);
        vec2 b = lattice(vec3(q, -z));
        float shade = (1.0 - uShade.x) + uShade.x * (1.0 - z);
        shade *= max(1.0 + uShade.y * dot(q, lrDir), 0.0);
        float core = f.x * shade + b.x * uDot.w * 0.6;
        float halo = f.y * shade + b.y * uDot.w * 0.6;
        float lrs = 0.5 + 0.5 * dot(q, lrDir);
        vec3 lat = bg + uInterior * uLook.w * (0.35 + 0.65 * lrs) * (0.5 + 0.5 * (1.0 - z));
        lat += uGlowC * core * uPost.w + uBase * halo * uDot.z;
        lat += vec3(1.0) * pow(min(core, 1.0), 3.0) * 0.3 * uPost.w;
        lat += mix(uBase, uGlowC, edge) * (fres * uRim.y * 0.8 + edge * uRim.y) * rimShade;

        // full-glow state
        vec3 body = mix(uShadow, uBase, smoothstep(-0.9, 0.4, dot(q, normalize(vec2(0.55, -0.85)))));
        vec2 hq = q - vec2(0.0, -uLook.x);
        float hot = exp(-dot(hq, hq) / (2.0 * max(uLook.y * uLook.y, 1e-4)));
        body = mix(body, uGlowC, clamp(hot, 0.0, 1.0) * 0.9);
        body *= 1.0 + uLook.z * (vnoise(q * 4.0 + 3.0) - 0.5) * 2.0;
        body = mix(body, mix(uGlowC, vec3(1.0), 0.35), clamp(edge * 0.85 + fres * 0.25, 0.0, 1.0));

        vec3 sph = mix(lat, body, uGlow);
        col = mix(bg, sph, inside);
    }

    float outside = 1.0 - inside;
    col += uGlowC * 0.4 * uRim.y * exp(-max(r - 1.0, 0.0) / max(uRim.w, 1e-3)) * outside;

    vec2 vq = (frag - 0.5 * uRes) / max(min(uRes.x, uRes.y), 1.0);
    col *= 1.0 - uPost.y * smoothstep(0.3, 0.95, length(vq));

    float g = hash21(frag + fract(uTime * 7.13) * vec2(91.7, 37.3)) - 0.5;
    col += g * uPost.x * 0.25;

    outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

const UNIFORMS = [
    "uRes", "uCenter", "uR", "uN", "uGlow", "uTheta", "uTime", "uA", "uE1", "uE2",
    "uDot", "uShade", "uRim", "uLook", "uPost",
    "uBg", "uBase", "uGlowC", "uShadow", "uInterior",
]

function parseColor(c: unknown, fb: [number, number, number]): [number, number, number] {
    if (typeof c !== "string") return fb
    let s = c.trim()
    const v = s.match(/^var\([^,]+,\s*(.+)\)$/)
    if (v) s = v[1].trim()
    const hex = s.match(/^#([0-9a-f]{3,8})$/i)
    if (hex) {
        let h = hex[1]
        if (h.length === 3 || h.length === 4) h = h.split("").map((x) => x + x).join("")
        if (h.length < 6) return fb
        return [
            parseInt(h.slice(0, 2), 16) / 255,
            parseInt(h.slice(2, 4), 16) / 255,
            parseInt(h.slice(4, 6), 16) / 255,
        ]
    }
    const rgb = s.match(/rgba?\(([^)]+)\)/i)
    if (rgb) {
        const p = rgb[1].split(/[\s,\/]+/).filter(Boolean).map((x) => parseFloat(x))
        if (p.length >= 3 && p.slice(0, 3).every((x) => isFinite(x))) {
            return [p[0] / 255, p[1] / 255, p[2] / 255]
        }
    }
    return fb
}

function smoothstep(a: number, b: number, x: number) {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)
}

export interface ClipShowsOneProps {
    speed?: number
    scale?: number
    density?: number
    spin?: number
    dragSensitivity?: number
    glowColor?: string
    baseColor?: string
    background?: string
    advanced?: {
        cycleSec?: number
        apexMs?: number
        glowFade?: number
        spinDeg?: number
        axisX?: number
        axisY?: number
        offsetX?: number
        offsetY?: number
        dotSize?: number
        dotGain?: number
        haloSize?: number
        haloAmount?: number
        backDots?: number
        limbBoost?: number
        lightBias?: number
        poleAngle?: number
        poleFade?: number
        rimPower?: number
        rimAmount?: number
        rimTilt?: number
        edgeWidth?: number
        outerGlow?: number
        hotspotY?: number
        hotspotSize?: number
        mottle?: number
        interior?: number
        interiorColor?: string
        shadowColor?: string
        hover?: number
        grain?: number
        vignette?: number
    }
    style?: CSSProperties
}

/**
 * Energy sphere — a glowing sphere whose dot lattice sweeps from a full glow
 * to a dense point cloud and back while it turns in 3D.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function ClipShowsOne(props: ClipShowsOneProps) {
    const {
        speed = 76,
        scale = 65,
        density = 28,
        spin = 50,
        dragSensitivity = 50,
        glowColor = "#00FFE2",
        baseColor = "#00FFC0",
        background = "#000000",
        style,
    } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef({ speed, scale, density, spin, dragSensitivity, glowColor, baseColor, background, advanced: props.advanced })
    propsRef.current = { speed, scale, density, spin, dragSensitivity, glowColor, baseColor, background, advanced: props.advanced }
    const pointerRef = useRef({ x: 0, y: 0, overTarget: 0, overEased: 0 })
    const dragRef = useRef({ active: false, lastX: 0, lastY: 0, yaw: 0, pitch: 0 })

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const gl = canvas.getContext("webgl2", {
            antialias: false,
            premultipliedAlpha: false,
            preserveDrawingBuffer: true,
        })
        if (!gl) return

        const compile = (type: number, src: string) => {
            const sh = gl.createShader(type)
            if (!sh) throw new Error("Shader create failed")
            gl.shaderSource(sh, src)
            gl.compileShader(sh)
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
                const log = gl.getShaderInfoLog(sh)
                gl.deleteShader(sh)
                throw new Error("Shader compile failed: " + log)
            }
            return sh
        }
        const vs = compile(gl.VERTEX_SHADER, VERT)
        const fs = compile(gl.FRAGMENT_SHADER, FRAG)
        const program = gl.createProgram()
        if (!program) throw new Error("Program create failed")
        gl.attachShader(program, vs)
        gl.attachShader(program, fs)
        gl.linkProgram(program)
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error("Program link failed: " + gl.getProgramInfoLog(program))
        }
        gl.useProgram(program)

        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        const aPos = gl.getAttribLocation(program, "aPos")
        gl.enableVertexAttribArray(aPos)
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

        const U: Record<string, WebGLUniformLocation> = {}
        for (const name of UNIFORMS) {
            const loc = gl.getUniformLocation(program, name)
            if (loc === null) throw new Error("Missing uniform " + name)
            U[name] = loc
        }

        let dpr = 1
        const resize = () => {
            dpr = Math.min(window.devicePixelRatio || 1, 2)
            const w = Math.max(1, Math.round(root.offsetWidth * dpr))
            const h = Math.max(1, Math.round(root.offsetHeight * dpr))
            if (canvas.width !== w) canvas.width = w
            if (canvas.height !== h) canvas.height = h
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(root)

        const toLocal = (e: PointerEvent) => {
            const rect = root.getBoundingClientRect()
            return {
                x: ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1,
                y: ((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1,
            }
        }
        const onPointerEnter = () => {
            pointerRef.current.overTarget = 1
        }
        const onPointerLeave = () => {
            pointerRef.current.overTarget = 0
            dragRef.current.active = false
        }
        const onPointerMove = (e: PointerEvent) => {
            const loc = toLocal(e)
            pointerRef.current.x = loc.x
            pointerRef.current.y = loc.y
            const d = dragRef.current
            if (d.active) {
                const sens = (Math.max(0, propsRef.current.dragSensitivity) / 50) * 0.012
                d.yaw += (e.clientX - d.lastX) * sens
                d.pitch = Math.max(-0.9, Math.min(0.9, d.pitch + (e.clientY - d.lastY) * sens))
                d.lastX = e.clientX
                d.lastY = e.clientY
            }
        }
        const onPointerDown = (e: PointerEvent) => {
            dragRef.current.active = true
            dragRef.current.lastX = e.clientX
            dragRef.current.lastY = e.clientY
            pointerRef.current.overTarget = 1
        }
        const endDrag = () => {
            dragRef.current.active = false
        }
        root.addEventListener("pointerenter", onPointerEnter)
        root.addEventListener("pointerleave", onPointerLeave)
        root.addEventListener("pointermove", onPointerMove)
        root.addEventListener("pointerdown", onPointerDown)
        window.addEventListener("pointerup", endDrag)
        window.addEventListener("pointercancel", endDrag)

        const mql = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null
        const target = RenderTarget.current()
        const staticTarget = target === RenderTarget.thumbnail || target === RenderTarget.export

        let raf = 0
        let last = -1
        let cycleT = 0
        let theta = 0
        let clock = 0
        const TAU = Math.PI * 2

        const frame = (now: number) => {
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            const p = propsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
            const frozen = staticTarget || (mql ? mql.matches : false)
            const over = pointerRef.current
            over.overEased += (over.overTarget - over.overEased) * Math.min(1, dt * 6)
            const hoverAmt = (Math.max(0, Math.min(100, adv.hover)) / 50) * over.overEased
            const sf = (Math.max(0, Math.min(100, p.speed)) / 50) * (1 + hoverAmt * 0.3)
            const cycleSec = Math.max(1, adv.cycleSec)

            if (!frozen) {
                cycleT = (cycleT + dt * sf) % cycleSec
                theta = (theta + dt * sf * ((adv.spinDeg * Math.PI) / 180) * (Math.max(0, p.spin) / 50)) % TAU
            }
            clock += dt

            // dot frequency: triangle over the cycle, apex rounded
            const u = frozen ? 0.5 : cycleT / cycleSec
            const tri = 1 - Math.abs(2 * u - 1)
            const a = Math.min(0.9, Math.max(0.001, adv.apexMs / 1000 / (cycleSec / 2)))
            const x = 1 - tri
            const g = x < a ? (x * x + a * a) / (2 * a) : x
            const f = Math.max(0, (1 - g) / (1 - a / 2))
            const N = Math.max(1, p.density) * f
            const glow = 1 - smoothstep(0, Math.max(0.1, adv.glowFade / 10), N)

            // rotation axis and its basis
            let ax = adv.axisX / 100
            let ay = Math.max(-0.95, Math.min(0.95, adv.axisY / 100 + dragRef.current.pitch))
            let az = Math.sqrt(Math.max(0.04, 1 - ax * ax - ay * ay))
            const al = Math.hypot(ax, ay, az) || 1
            ax /= al
            ay /= al
            az /= al
            let e1x = -ay
            let e1y = ax
            const el = Math.hypot(e1x, e1y)
            if (el < 1e-4) {
                e1x = 1
                e1y = 0
            } else {
                e1x /= el
                e1y /= el
            }
            const e1z = 0
            const e2x = ay * e1z - az * e1y
            const e2y = az * e1x - ax * e1z
            const e2z = ax * e1y - ay * e1x

            const W = canvas.width
            const H = canvas.height
            const short = Math.min(W, H)
            const R = (Math.max(1, p.scale) / 100) * short * 0.5
            const cx = W / 2 + (adv.offsetX / 100) * short
            const cy = H / 2 + (adv.offsetY / 100) * short

            gl.viewport(0, 0, W, H)
            gl.uniform2f(U.uRes, W, H)
            gl.uniform2f(U.uCenter, cx, cy)
            gl.uniform1f(U.uR, R)
            gl.uniform1f(U.uN, Math.max(N, 0.5))
            gl.uniform1f(U.uGlow, glow)
            gl.uniform1f(U.uTheta, theta + dragRef.current.yaw)
            gl.uniform1f(U.uTime, clock)
            gl.uniform3f(U.uA, ax, ay, az)
            gl.uniform3f(U.uE1, e1x, e1y, e1z)
            gl.uniform3f(U.uE2, e2x, e2y, e2z)
            gl.uniform4f(U.uDot, adv.dotSize / 100, adv.haloSize / 100, adv.haloAmount / 100, adv.backDots / 100)
            gl.uniform4f(
                U.uShade,
                adv.limbBoost / 100,
                adv.lightBias / 100,
                (adv.poleAngle * Math.PI) / 180,
                adv.poleFade / 100
            )
            gl.uniform4f(U.uRim, Math.max(1, adv.rimPower), adv.rimAmount / 100, adv.edgeWidth / 100, adv.outerGlow / 100)
            gl.uniform4f(U.uLook, adv.hotspotY / 100, adv.hotspotSize / 100, adv.mottle / 100, adv.interior / 100)
            gl.uniform4f(U.uPost, adv.grain / 100, adv.vignette / 100, adv.rimTilt / 100, (adv.dotGain * (1 + hoverAmt * 0.25)) / 100)
            gl.uniform3fv(U.uBg, parseColor(p.background, [0, 0, 0]))
            gl.uniform3fv(U.uBase, parseColor(p.baseColor, [0.43, 0.553, 0.745]))
            gl.uniform3fv(U.uGlowC, parseColor(p.glowColor, [0.627, 0.753, 0.925]))
            gl.uniform3fv(U.uShadow, parseColor(adv.shadowColor, [0.314, 0.431, 0.631]))
            gl.uniform3fv(U.uInterior, parseColor(adv.interiorColor, [0.082, 0.145, 0.298]))
            gl.drawArrays(gl.TRIANGLES, 0, 3)

            raf = requestAnimationFrame(frame)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            root.removeEventListener("pointerenter", onPointerEnter)
            root.removeEventListener("pointerleave", onPointerLeave)
            root.removeEventListener("pointermove", onPointerMove)
            root.removeEventListener("pointerdown", onPointerDown)
            window.removeEventListener("pointerup", endDrag)
            window.removeEventListener("pointercancel", endDrag)
            gl.deleteBuffer(buf)
            gl.deleteProgram(program)
            gl.deleteShader(vs)
            gl.deleteShader(fs)
        }
    }, [])

    return (
        <div
            ref={rootRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 1200,
                minHeight: 800,
                overflow: "hidden",
                background,
                touchAction: "none",
                cursor: "grab",
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
