"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    spinRate: 100,
    lean: 20,
    startAngle: 0,
    staticAngle: 55,
    baseRoll: -40,
    basePitch: 12,
    baseYaw: 18,
    offsetX: 0,
    offsetY: 0,
    cameraDistance: 40,
    ior: 150,
    bounces: 3,
    innerReflection: 250,
    fresnel: 100,
    exposure: 100,
    lightIntensity: 100,
    stripSize: 100,
    stripSoftness: 2,
    smoke: 25,
    pinkColor: "#E0407A",
    yellowColor: "#E8D870",
    blueColor: "#1E3CE0",
    periwinkleColor: "#ABB1DD",
    tealColor: "#7FE0C8",
    whiteColor: "#F2F2F2",
    mauveColor: "#957BA5",
    glassTint: "#F4F6FF",
    resolution: 100,
    grain: 0,
    vignette: 0,
}

type RGB = [number, number, number]

function parseColor(input: unknown, fallback: RGB): RGB {
    if (typeof input !== "string") return fallback
    let s = input.trim()
    const v = s.match(/^var\([^,]+,\s*(.+)\)$/)
    if (v) s = v[1].trim()
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4)
            h = h
                .split("")
                .map((c) => c + c)
                .join("")
        if (h.length >= 6) {
            const n = parseInt(h.slice(0, 6), 16)
            if (!isNaN(n))
                return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
        }
        return fallback
    }
    const m = s.match(/rgba?\(([^)]+)\)/i)
    if (m) {
        const p = m[1]
            .split(/[\s,\/]+/)
            .filter(Boolean)
            .map(parseFloat)
        if (p.length >= 3 && p.slice(0, 3).every((x) => isFinite(x)))
            return [p[0] / 255, p[1] / 255, p[2] / 255]
    }
    return fallback
}

// Row-major 3×3 helpers
type M3 = number[]
function mul(a: M3, b: M3): M3 {
    const r: M3 = new Array(9).fill(0)
    for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++)
            r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]
    return r
}
function rotX(a: number): M3 {
    const c = Math.cos(a), s = Math.sin(a)
    return [1, 0, 0, 0, c, -s, 0, s, c]
}
function rotY(a: number): M3 {
    const c = Math.cos(a), s = Math.sin(a)
    return [c, 0, s, 0, 1, 0, -s, 0, c]
}
function rotZ(a: number): M3 {
    const c = Math.cos(a), s = Math.sin(a)
    return [c, -s, 0, s, c, 0, 0, 0, 1]
}
function axisAngle(k: number[], a: number): M3 {
    const c = Math.cos(a), s = Math.sin(a), t = 1 - c
    const [x, y, z] = k
    return [
        t * x * x + c, t * x * y - s * z, t * x * z + s * y,
        t * x * y + s * z, t * y * y + c, t * y * z - s * x,
        t * x * z - s * y, t * y * z + s * x, t * z * z + c,
    ]
}
function colMajor(m: M3): Float32Array {
    return new Float32Array([m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]])
}
const DEG = Math.PI / 180

const VERT = `#version 300 es
void main() {
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

const FRAG = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 uRes;
uniform mat3 uRot;
uniform float uScale;
uniform vec2 uOffset;
uniform float uCamDist;
uniform float uFocal;
uniform float uRadius;
uniform float uIor;
uniform float uSpread;
uniform int uBounces;
uniform float uInner;
uniform float uFresnel;
uniform float uExposure;
uniform float uLight;
uniform float uStripSize;
uniform float uSoft;
uniform float uSmoke;
uniform vec3 uTint;
uniform vec3 uBg;
uniform vec3 uPink;
uniform vec3 uYellow;
uniform vec3 uBlue;
uniform vec3 uPeri;
uniform vec3 uTeal;
uniform vec3 uWhite;
uniform vec3 uMauve;
uniform float uGrain;
uniform float uVignette;
uniform float uTime;

float sdBox(vec3 p) {
    float r = uRadius;
    vec3 q = abs(p) - vec3(0.5 - r);
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}

vec3 calcNormal(vec3 p) {
    const float e = 0.0012;
    const vec2 k = vec2(1.0, -1.0);
    return normalize(
        k.xyy * sdBox(p + k.xyy * e) +
        k.yyx * sdBox(p + k.yyx * e) +
        k.yxy * sdBox(p + k.yxy * e) +
        k.xxx * sdBox(p + k.xxx * e));
}

vec2 slab(vec3 o, vec3 d) {
    vec3 dd = mix(d, vec3(1e-6), step(abs(d), vec3(1e-6)));
    vec3 inv = 1.0 / dd;
    vec3 t1 = (vec3(-0.5) - o) * inv;
    vec3 t2 = (vec3(0.5) - o) * inv;
    vec3 tn = min(t1, t2);
    vec3 tf = max(t1, t2);
    return vec2(max(max(tn.x, tn.y), tn.z), min(min(tf.x, tf.y), tf.z));
}

float rect(vec2 a, vec2 c, vec2 hs) {
    vec2 h = hs * uStripSize;
    vec2 q = abs(a - c) - h;
    float s = max(uSoft, 1e-4);
    return (1.0 - smoothstep(-s, s, q.x)) * (1.0 - smoothstep(-s, s, q.y));
}

// Studio environment in world space: black, with hard-edged coloured light strips.
vec3 env(vec3 d) {
    float az = atan(d.x, -d.z);
    float el = asin(clamp(d.y, -1.0, 1.0));
    vec2 a = vec2(az, el);
    vec3 L = vec3(0.0);
    L += uBlue * rect(a, vec2(0.05, 0.78), vec2(0.6, 0.16));
    L += uYellow * rect(a, vec2(-0.82, 0.12), vec2(0.13, 0.42));
    L += uPink * rect(a, vec2(0.84, -0.02), vec2(0.12, 0.46));
    L += uPeri * rect(a, vec2(0.3, -0.78), vec2(0.5, 0.14));
    L += uTeal * rect(a, vec2(-0.4, -0.58), vec2(0.11, 0.13));
    L += uMauve * rect(a, vec2(1.25, -0.55), vec2(0.16, 0.12));
    L += uWhite * rect(a, vec2(1.65, 0.35), vec2(0.07, 0.6));
    L += uWhite * rect(a, vec2(-1.7, -0.25), vec2(0.06, 0.5));
    L += uWhite * 0.8 * rect(a, vec2(2.6, 0.55), vec2(0.3, 0.06));
    L += uBlue * rect(a, vec2(-2.65, -0.4), vec2(0.28, 0.08));
    L += uYellow * 0.7 * rect(a, vec2(-1.3, 0.75), vec2(0.18, 0.1));
    L += uPink * 0.8 * rect(a, vec2(2.2, -0.6), vec2(0.15, 0.1));
    float smoke = smoothstep(0.35, 1.3, abs(az)) * (1.0 - abs(el) * 0.63);
    return uBg + L * uLight + uSmoke * smoke * vec3(0.25, 0.29, 0.35);
}

vec3 W(vec3 d) { return uRot * d; }

float schlick(float c) {
    float f0 = 0.04;
    return f0 + (1.0 - f0) * pow(1.0 - clamp(c, 0.0, 1.0), 5.0);
}

vec3 shade(vec3 p, vec3 d) {
    vec3 n = calcNormal(p);
    float F = clamp(schlick(dot(-d, n)) * uFresnel, 0.0, 1.0);
    vec3 col = env(W(reflect(d, n))) * F;

    vec3 rd = refract(d, n, 1.0 / max(uIor, 1.0001));
    vec3 thr = vec3(1.0 - F) * uTint;
    vec3 pp = p - n * 0.002;

    for (int b = 0; b < 6; b++) {
        if (b >= uBounces) break;
        vec3 q = pp + rd * max(slab(pp, rd).y, 0.0);
        for (int i = 0; i < 12; i++) {
            float s = sdBox(q);
            if (s < 0.0004) break;
            q -= rd * s;
        }
        vec3 n2 = calcNormal(q);
        vec3 dg = refract(rd, -n2, uIor);
        bool tir = dot(dg, dg) < 0.5;
        if (!tir) {
            vec3 dr = refract(rd, -n2, max(uIor - uSpread, 1.0001));
            vec3 db = refract(rd, -n2, uIor + uSpread);
            float er = dot(dr, dr) > 0.5 ? env(W(dr)).r : 0.0;
            float eg = env(W(dg)).g;
            float eb = dot(db, db) > 0.5 ? env(W(db)).b : 0.0;
            float Fe = schlick(dot(dg, n2));
            col += thr * (1.0 - Fe) * vec3(er, eg, eb);
            thr *= min(Fe * uInner, 1.0) * uTint;
        } else {
            thr *= uTint;
        }
        rd = reflect(rd, -n2);
        pp = q - n2 * 0.002;
    }
    return col;
}

vec3 tone(vec3 c) {
    c *= uExposure;
    vec3 k = vec3(0.8);
    vec3 over = max(c - k, 0.0);
    return min(c, k) + 0.15 * (1.0 - exp(-over / 0.15));
}

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec2 frag = gl_FragCoord.xy;
    float m = max(min(uRes.x, uRes.y), 1.0);
    vec2 uv = (frag - 0.5 * uRes) / m;
    uv -= uOffset;
    uv /= max(uScale, 0.01);

    vec3 ro = vec3(0.0, 0.0, uCamDist);
    vec3 rdw = normalize(vec3(uv, -uFocal));
    mat3 inv = transpose(uRot);
    vec3 o = inv * ro;
    vec3 d = inv * rdw;

    vec3 col = uBg;
    vec2 tb = slab(o, d);
    if (tb.x < tb.y && tb.y > 0.0) {
        float t = max(tb.x, 0.0);
        bool hit = false;
        for (int i = 0; i < 24; i++) {
            float s = sdBox(o + d * t);
            if (s < 0.0004) { hit = true; break; }
            t += s;
            if (t > tb.y) break;
        }
        if (hit) col = tone(shade(o + d * t, d));
    }

    vec2 vq = frag / uRes - 0.5;
    col *= 1.0 - uVignette * smoothstep(0.2, 0.75, length(vq) * 1.2);
    float g = hash(frag + floor(uTime * 24.0) * 17.31) - 0.5;
    col += g * uGrain * 0.25;
    outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

const UNIFORMS = [
    "uRes", "uRot", "uScale", "uOffset", "uCamDist", "uFocal", "uRadius", "uIor", "uSpread",
    "uBounces", "uInner", "uFresnel", "uExposure", "uLight", "uStripSize", "uSoft", "uSmoke",
    "uTint", "uBg", "uPink", "uYellow", "uBlue", "uPeri", "uTeal", "uWhite", "uMauve",
    "uGrain", "uVignette", "uTime",
] as const

interface OneSolidGlassAdvanced {
    spinRate?: number
    lean?: number
    startAngle?: number
    staticAngle?: number
    baseRoll?: number
    basePitch?: number
    baseYaw?: number
    offsetX?: number
    offsetY?: number
    cameraDistance?: number
    ior?: number
    bounces?: number
    innerReflection?: number
    fresnel?: number
    exposure?: number
    lightIntensity?: number
    stripSize?: number
    stripSoftness?: number
    smoke?: number
    pinkColor?: string
    yellowColor?: string
    blueColor?: string
    periwinkleColor?: string
    tealColor?: string
    whiteColor?: string
    mauveColor?: string
    glassTint?: string
    resolution?: number
    grain?: number
    vignette?: number
}

interface OneSolidGlassProps {
    speed?: number
    scale?: number
    rounded?: number
    dispersion?: number
    tilt?: number
    background?: string
    hoverGlow?: number
    hoverSpeedBoost?: number
    dragToRotate?: boolean
    dragSensitivity?: number
    advanced?: OneSolidGlassAdvanced
    style?: React.CSSProperties
}

export default function OneSolidGlass(props: OneSolidGlassProps) {
    const {
        speed = 50,
        scale = 100,
        rounded = 14,
        dispersion = 50,
        tilt = 35,
        background = "#000000",
        style,
    } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef(props)
    propsRef.current = props
    const hoverRef = useRef(false)
    const draggingRef = useRef(false)
    const hoverTRef = useRef(0)
    const dragYawRef = useRef(0)
    const dragPitchRef = useRef(0)
    const lastPointerRef = useRef({ x: 0, y: 0 })

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const gl = canvas.getContext("webgl2", { antialias: false, premultipliedAlpha: false })
        if (!gl) return

        const compile = (type: number, src: string) => {
            const sh = gl.createShader(type)
            if (!sh) throw new Error("OneSolidGlass: shader alloc failed")
            gl.shaderSource(sh, src)
            gl.compileShader(sh)
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
                const log = gl.getShaderInfoLog(sh)
                gl.deleteShader(sh)
                throw new Error("OneSolidGlass: " + log)
            }
            return sh
        }
        const vs = compile(gl.VERTEX_SHADER, VERT)
        const fs = compile(gl.FRAGMENT_SHADER, FRAG)
        const prog = gl.createProgram()
        if (!prog) throw new Error("OneSolidGlass: program alloc failed")
        gl.attachShader(prog, vs)
        gl.attachShader(prog, fs)
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
            throw new Error("OneSolidGlass: " + gl.getProgramInfoLog(prog))
        gl.useProgram(prog)
        const vao = gl.createVertexArray()
        gl.bindVertexArray(vao)

        const loc: Record<string, WebGLUniformLocation> = {}
        for (const name of UNIFORMS) {
            const l = gl.getUniformLocation(prog, name)
            if (!l) throw new Error("OneSolidGlass: missing uniform " + name)
            loc[name] = l
        }

        let cssW = root.offsetWidth
        let cssH = root.offsetHeight
        const ro = new ResizeObserver(() => {
            cssW = root.offsetWidth
            cssH = root.offsetHeight
        })
        ro.observe(root)

        const onPointerEnter = () => {
            hoverRef.current = true
        }
        const onPointerLeave = () => {
            hoverRef.current = false
        }
        const onPointerDown = (e: PointerEvent) => {
            if (propsRef.current.dragToRotate === false) return
            draggingRef.current = true
            lastPointerRef.current = { x: e.clientX, y: e.clientY }
            canvas.style.cursor = "grabbing"
        }
        const onPointerMove = (e: PointerEvent) => {
            if (!draggingRef.current) return
            const dx = e.clientX - lastPointerRef.current.x
            const dy = e.clientY - lastPointerRef.current.y
            lastPointerRef.current = { x: e.clientX, y: e.clientY }
            const sens = Math.max(propsRef.current.dragSensitivity ?? 50, 0) / 100
            dragYawRef.current += dx * sens * 0.5
            dragPitchRef.current += dy * sens * 0.5
        }
        const onPointerUp = () => {
            draggingRef.current = false
            canvas.style.cursor = propsRef.current.dragToRotate === false ? "default" : "grab"
        }
        root.addEventListener("pointerenter", onPointerEnter)
        root.addEventListener("pointerleave", onPointerLeave)
        root.addEventListener("pointerdown", onPointerDown)
        window.addEventListener("pointermove", onPointerMove)
        window.addEventListener("pointerup", onPointerUp)
        window.addEventListener("pointercancel", onPointerUp)
        canvas.style.cursor = propsRef.current.dragToRotate === false ? "default" : "grab"
        canvas.style.touchAction = "none"

        const mq =
            typeof window !== "undefined" && window.matchMedia
                ? window.matchMedia("(prefers-reduced-motion: reduce)")
                : null

        let raf = 0
        let last = -1
        let angle = 0
        const t0 = performance.now()

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now

            const p = propsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
            const hoverTarget = hoverRef.current || draggingRef.current ? 1 : 0
            hoverTRef.current += (hoverTarget - hoverTRef.current) * Math.min(dt * 6, 1)
            const boost = 1 + (hoverTRef.current * Math.max(p.hoverSpeedBoost ?? 50, 0)) / 100
            const sp = Math.max(0, p.speed ?? 50) * boost
            angle += adv.spinRate * DEG * (sp / 50) * dt

            const res = Math.min(Math.max(adv.resolution, 25), 100) / 100
            const dpr = Math.min(window.devicePixelRatio || 1, 2) * res
            const w = Math.max(1, Math.round(cssW * dpr))
            const h = Math.max(1, Math.round(cssH * dpr))
            if (cssW <= 0 || cssH <= 0) return
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w
                canvas.height = h
            }
            gl.viewport(0, 0, w, h)

            const still = mq ? mq.matches : false
            const theta = (still ? adv.staticAngle : adv.startAngle) * DEG + (still ? 0 : angle)

            const tiltR = (p.tilt ?? 35) * DEG
            const ax = [Math.sin(tiltR), Math.cos(tiltR), Math.sin(adv.lean * DEG)]
            const al = Math.hypot(ax[0], ax[1], ax[2]) || 1
            const axis = [ax[0] / al, ax[1] / al, ax[2] / al]
            const drag = mul(rotX(dragPitchRef.current * DEG), rotY(dragYawRef.current * DEG))
            const base = mul(
                drag,
                mul(
                    rotZ(adv.baseRoll * DEG),
                    mul(rotX(adv.basePitch * DEG), rotY(adv.baseYaw * DEG))
                )
            )
            const rot = mul(axisAngle(axis, theta), base)

            const m = Math.max(Math.min(w, h), 1)
            const camDist = Math.max(adv.cameraDistance / 10, 1.5)
            const ior = Math.max(adv.ior / 100, 1.0001)
            const bg = parseColor(p.background ?? "#000000", [0, 0, 0])

            gl.uniform2f(loc.uRes, w, h)
            gl.uniformMatrix3fv(loc.uRot, false, colMajor(rot))
            gl.uniform1f(loc.uScale, Math.max(p.scale ?? 100, 1) / 100)
            gl.uniform2f(loc.uOffset, ((adv.offsetX / 100) * w) / m, (-(adv.offsetY / 100) * h) / m)
            gl.uniform1f(loc.uCamDist, camDist)
            gl.uniform1f(loc.uFocal, 0.45 * (camDist - 0.5))
            gl.uniform1f(loc.uRadius, Math.min(Math.max(p.rounded ?? 14, 0), 100) / 100 * 0.5)
            gl.uniform1f(loc.uIor, ior)
            gl.uniform1f(loc.uSpread, (Math.max(p.dispersion ?? 50, 0) / 100) * 0.06)
            gl.uniform1i(loc.uBounces, Math.round(Math.min(Math.max(adv.bounces, 0), 6)))
            const glow = 1 + (hoverTRef.current * Math.max(p.hoverGlow ?? 60, 0)) / 100
            gl.uniform1f(loc.uInner, adv.innerReflection / 100)
            gl.uniform1f(loc.uFresnel, (adv.fresnel / 100) * glow)
            gl.uniform1f(loc.uExposure, adv.exposure / 100)
            gl.uniform1f(loc.uLight, (adv.lightIntensity / 100) * glow)
            gl.uniform1f(loc.uStripSize, adv.stripSize / 100)
            gl.uniform1f(loc.uSoft, adv.stripSoftness / 100)
            gl.uniform1f(loc.uSmoke, adv.smoke / 100)
            gl.uniform3fv(loc.uTint, parseColor(adv.glassTint, [0.96, 0.96, 1]))
            gl.uniform3fv(loc.uBg, bg)
            gl.uniform3fv(loc.uPink, parseColor(adv.pinkColor, [0.88, 0.25, 0.48]))
            gl.uniform3fv(loc.uYellow, parseColor(adv.yellowColor, [0.91, 0.85, 0.44]))
            gl.uniform3fv(loc.uBlue, parseColor(adv.blueColor, [0.12, 0.24, 0.88]))
            gl.uniform3fv(loc.uPeri, parseColor(adv.periwinkleColor, [0.67, 0.69, 0.87]))
            gl.uniform3fv(loc.uTeal, parseColor(adv.tealColor, [0.5, 0.88, 0.78]))
            gl.uniform3fv(loc.uWhite, parseColor(adv.whiteColor, [0.95, 0.95, 0.95]))
            gl.uniform3fv(loc.uMauve, parseColor(adv.mauveColor, [0.58, 0.48, 0.65]))
            gl.uniform1f(loc.uGrain, adv.grain / 100)
            gl.uniform1f(loc.uVignette, adv.vignette / 100)
            gl.uniform1f(loc.uTime, (now - t0) / 1000)

            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            root.removeEventListener("pointerenter", onPointerEnter)
            root.removeEventListener("pointerleave", onPointerLeave)
            root.removeEventListener("pointerdown", onPointerDown)
            window.removeEventListener("pointermove", onPointerMove)
            window.removeEventListener("pointerup", onPointerUp)
            window.removeEventListener("pointercancel", onPointerUp)
            gl.deleteVertexArray(vao)
            gl.deleteProgram(prog)
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
                background,
                overflow: "hidden",
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

OneSolidGlass.displayName = "Glass Cube"
