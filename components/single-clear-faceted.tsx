"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    grain: 4,
    vignette: 0,
    ior: 151,
    bounces: 3,
    turnRate: 50,
    startAngle: 0,
    tilt: 6,
    wobble: 1,
    seed: 7,
    jitter: 6,
    crownTilt: 55,
    bodyWidth: 85,
    bodyLength: 140,
    bodyFlare: 2,
    bevelTilt: 45,
    apexY: 14,
    offsetX: 0,
    fov: 20,
    keyX: -26,
    keyY: 49,
    keyWidth: 40,
    keyHeight: 100,
    fillX: 40,
    fillStrength: 70,
    stripY: -30,
    stripStrength: 80,
    frontStrength: 50,
    softness: 14,
    falloff: 60,
    warmColor: "#D9A24E",
    warmStrength: 35,
    coolColor: "#3A5BFF",
    coolStrength: 30,
    contrast: 60,
    rimWidth: 2,
    rimStrength: 10,
    residual: 15,
    reflectStrength: 100,
}

type Advanced = typeof ADVANCED_DEFAULTS

interface Props {
    speed?: number
    scale?: number
    facets?: number
    dispersion?: number
    light?: number
    baseColor?: string
    background?: string
    advanced?: Partial<Advanced>
    animate?: boolean
    hoverStrength?: number
    hoverSpeedBoost?: number
    dragSensitivity?: number
    style?: React.CSSProperties
}

const DEG = Math.PI / 180
const MAX_PLANES = 64

const VERT = `#version 300 es
void main() {
    vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

const FRAG = `#version 300 es
precision highp float;
precision highp int;
out vec4 outColor;

uniform vec2 uRes;
uniform float uTime;
uniform float uAngle;
uniform float uWobble;
uniform int uCount;
uniform vec4 uPlanes[${MAX_PLANES}];
uniform float uPpu;
uniform vec2 uTarget;
uniform float uCamDist;
uniform float uPitch;
uniform float uIor;
uniform float uSpread;
uniform int uBounces;
uniform vec3 uLight;
uniform vec3 uBg;
uniform vec4 uKey;
uniform vec4 uFill;
uniform vec4 uStrip;
uniform vec4 uFront;
uniform vec4 uGains;
uniform vec3 uWarm;
uniform vec3 uCool;
uniform float uSoft;
uniform float uFalloff;
uniform float uExposure;
uniform float uContrast;
uniform vec2 uRim;
uniform float uResidual;
uniform float uReflect;
uniform float uGrain;
uniform float uVignette;

vec3 rotY(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(v.x * c + v.z * s, v.y, -v.x * s + v.z * c); }
vec3 rotZ(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(v.x * c - v.y * s, v.x * s + v.y * c, v.z); }
vec3 toObj(vec3 v) { return rotY(rotZ(v, -uWobble), -uAngle); }
vec3 toWorld(vec3 v) { return rotZ(rotY(v, uAngle), uWobble); }

// Soft rectangular light panel in (azimuth, elevation) radians, brightest at its centre.
float panel(vec2 a, vec4 b) {
    vec2 q = abs(a - b.xy) - b.zw;
    float edge = 1.0 - smoothstep(-uSoft, uSoft, max(q.x, q.y));
    float r = clamp((a.x - b.x) / max(b.z, 1e-3), -1.0, 1.0);
    return edge * (1.0 - uFalloff * r * r);
}

// Fixed studio: black, with softboxes behind the gem and one in front for reflections.
vec3 env(vec3 d) {
    float el = asin(clamp(d.y, -1.0, 1.0));
    vec2 back = vec2(atan(d.x, -d.z), el);
    vec2 front = vec2(atan(d.x, d.z), el);
    float l = panel(back, uKey) * uGains.x
            + panel(back, uFill) * uGains.y
            + panel(back, uStrip) * uGains.z
            + panel(front, uFront) * uGains.w;
    vec3 c = uLight * l;
    c += uWarm * panel(back, vec4(-1.05, -0.35, 0.32, 0.28));
    c += uCool * panel(back, vec4(0.55, 0.6, 0.28, 0.22));
    return c;
}

float exitPlane(vec3 ro, vec3 rd, out vec3 n) {
    float tm = 1e9;
    n = vec3(0.0, 1.0, 0.0);
    for (int i = 0; i < ${MAX_PLANES}; i++) {
        if (i >= uCount) break;
        vec4 P = uPlanes[i];
        float dn = dot(P.xyz, rd);
        if (dn > 1e-5) {
            float t = (P.w - dot(P.xyz, ro)) / dn;
            if (t < tm) { tm = t; n = P.xyz; }
        }
    }
    return clamp(tm, 0.0, 10.0);
}

float channel(vec3 p, vec3 rd, vec3 n0, float ior, int ch) {
    vec3 d = refract(rd, n0, 1.0 / ior);
    if (dot(d, d) < 1e-6) return 0.0;
    float r0 = (ior - 1.0) / (ior + 1.0);
    r0 *= r0;
    float w = 1.0;
    float acc = 0.0;
    for (int b = 0; b < 6; b++) {
        if (b >= uBounces) break;
        vec3 n;
        float t = exitPlane(p, d, n);
        p += d * t;
        vec3 o = refract(d, -n, ior);
        if (dot(o, o) > 1e-6) {
            float c = clamp(dot(o, n), 0.0, 1.0);
            float F = r0 + (1.0 - r0) * pow(1.0 - c, 5.0);
            acc += w * (1.0 - F) * env(toWorld(o))[ch];
            w *= F;
        }
        d = reflect(d, n);
        p -= n * 1e-4;
    }
    acc += w * uResidual * env(toWorld(d))[ch];
    return acc;
}

void main() {
    vec2 fc = gl_FragCoord.xy;
    vec2 sxy = (fc - 0.5 * uRes) / uPpu;
    float sp = sin(uPitch), cp = cos(uPitch);
    vec3 T = vec3(uTarget, 0.0);
    vec3 f = vec3(0.0, -sp, -cp);
    vec3 u = vec3(0.0, cp, -sp);
    vec3 cam = T - f * uCamDist;
    vec3 s = T + vec3(sxy.x, 0.0, 0.0) + u * sxy.y;
    vec3 rdW = normalize(s - cam);
    vec3 ro = toObj(cam);
    vec3 rd = toObj(rdW);

    float tN = -1e9;
    float tF = 1e9;
    int idx = 0;
    for (int i = 0; i < ${MAX_PLANES}; i++) {
        if (i >= uCount) break;
        vec4 P = uPlanes[i];
        float dn = dot(P.xyz, rd);
        float dist = P.w - dot(P.xyz, ro);
        if (abs(dn) < 1e-6) {
            if (dist < 0.0) tF = -1e9;
            continue;
        }
        float t = dist / dn;
        if (dn < 0.0) {
            if (t > tN) { tN = t; idx = i; }
        } else {
            tF = min(tF, t);
        }
    }

    float px = 1.0 / max(uPpu, 1e-3);
    float gap = tF - tN;
    vec3 col = uBg;
    if (gap > -2.0 * px && tN > 0.0) {
        vec3 n0 = uPlanes[idx].xyz;
        vec3 p = ro + rd * tN;
        vec3 pin = p - n0 * 1e-4;

        float r0 = (uIor - 1.0) / (uIor + 1.0);
        r0 *= r0;
        float ci = clamp(-dot(rd, n0), 0.0, 1.0);
        float Fe = r0 + (1.0 - r0) * pow(1.0 - ci, 5.0);
        vec3 refl = env(toWorld(reflect(rd, n0))) * uReflect;

        vec3 tr;
        tr.r = channel(pin, rd, n0, uIor - uSpread * 0.5, 0);
        tr.g = channel(pin, rd, n0, uIor, 1);
        tr.b = channel(pin, rd, n0, uIor + uSpread * 0.5, 2);
        vec3 g = Fe * refl + (1.0 - Fe) * tr;

        // Thin bright line along facet edges and the outline.
        float md = 1e9;
        for (int j = 0; j < ${MAX_PLANES}; j++) {
            if (j >= uCount) break;
            if (j == idx) continue;
            vec4 Q = uPlanes[j];
            md = min(md, Q.w - dot(Q.xyz, p));
        }
        float rim = 1.0 - smoothstep(0.0, max(uRim.x * px, 1e-5), max(md, 0.0));
        g += uLight * rim * uRim.y;

        g *= uExposure;
        g = 1.0 - exp(-g);
        g = mix(g, g * g * (3.0 - 2.0 * g), uContrast);
        float cover = smoothstep(-px, px, gap * 0.5);
        col = mix(uBg, g, cover);
    }

    float L = dot(col, vec3(0.299, 0.587, 0.114));
    float nz = fract(sin(dot(fc + fract(uTime * 7.13) * vec2(91.7, 47.3), vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
    col += nz * 2.0 * uGrain * 4.0 * L * (1.0 - L);
    vec2 q = fc / uRes - 0.5;
    col *= 1.0 - uVignette * smoothstep(0.2, 0.75, length(q));
    outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

function num(v: unknown, fallback: number): number {
    const n = typeof v === "number" ? v : parseFloat(String(v))
    return Number.isFinite(n) ? n : fallback
}

function clamp(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, v))
}

const colorCache = new Map<string, [number, number, number]>()
function toRgb(input: string | undefined, fallback: [number, number, number]): [number, number, number] {
    const key = String(input ?? "")
    const hit = colorCache.get(key)
    if (hit) return hit
    let s = key.trim()
    const v = s.match(/^var\([^,]+,\s*(.+)\)$/)
    if (v) s = v[1].trim()
    let out: [number, number, number] | null = null
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4) h = h.split("").map((c) => c + c).join("")
        if (h.length >= 6) {
            const n = parseInt(h.slice(0, 6), 16)
            if (!Number.isNaN(n)) out = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
        }
    } else {
        const m = s.match(/rgba?\(([^)]+)\)/i)
        if (m) {
            const parts = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat)
            if (parts.length >= 3 && parts.slice(0, 3).every((x) => Number.isFinite(x))) {
                out = [parts[0] / 255, parts[1] / 255, parts[2] / 255]
            }
        }
    }
    const result = out ?? fallback
    if (colorCache.size > 64) colorCache.clear()
    colorCache.set(key, result)
    return result
}

function mulberry32(seed: number) {
    let a = seed | 0
    return () => {
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

// The gem as an intersection of half-spaces n·p ≤ d: crown, body, bottom bevel, base.
function buildPlanes(adv: Advanced, facets: number, out: Float32Array) {
    const N = Math.round(clamp(facets, 5, 16))
    const rand = mulberry32(Math.round(num(adv.seed, 7)))
    const jit = clamp(num(adv.jitter, 6), 0, 30) * DEG
    const eC = (90 - clamp(num(adv.crownTilt, 55), 20, 85)) * DEG
    const crownH = 1 / Math.tan(eC)
    const Rb = clamp(num(adv.bodyWidth, 85), 20, 200) / 100
    const flare = clamp(num(adv.bodyFlare, 2), -30, 30) * DEG
    const L = clamp(num(adv.bodyLength, 140), 0, 400) / 100
    const eB = -clamp(num(adv.bevelTilt, 45), 5, 85) * DEG
    let k = 0
    const push = (x: number, y: number, z: number, d: number) => {
        out[k * 4] = x
        out[k * 4 + 1] = y
        out[k * 4 + 2] = z
        out[k * 4 + 3] = d
        k++
    }
    const step = (Math.PI * 2) / N
    for (let i = 0; i < N; i++) {
        const phi = i * step + (rand() * 2 - 1) * jit
        const e = eC + (rand() * 2 - 1) * jit * 0.5
        push(Math.cos(e) * Math.cos(phi), Math.sin(e), Math.cos(e) * Math.sin(phi), Math.sin(e) * crownH)
    }
    for (let i = 0; i < N; i++) {
        const phi = (i + 0.5) * step + (rand() * 2 - 1) * jit
        const e = flare + (rand() * 2 - 1) * jit * 0.3
        const d = Math.cos(e) * Rb * (1 + (rand() * 2 - 1) * 0.02)
        push(Math.cos(e) * Math.cos(phi), Math.sin(e), Math.cos(e) * Math.sin(phi), d)
    }
    const rBot = ((Rb + L * Math.tan(flare)) / Math.cos(Math.PI / N)) * 0.97
    for (let i = 0; i < N; i++) {
        const phi = i * step + (rand() * 2 - 1) * jit
        push(Math.cos(eB) * Math.cos(phi), Math.sin(eB), Math.cos(eB) * Math.sin(phi), Math.cos(eB) * rBot - Math.sin(eB) * L)
    }
    push(0, -1, 0, L + 1.2)
    return { count: k, crownH }
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
    const s = gl.createShader(type)
    if (!s) throw new Error("Could not create shader")
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(s)
        gl.deleteShader(s)
        throw new Error("Shader compile failed: " + log)
    }
    return s
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function SingleClearFaceted(props: Props) {
    const {
        speed = 50,
        scale = 61,
        facets = 6,
        dispersion = 79,
        light = 92,
        baseColor = "#EEF1EE",
        background = "#000000",
        animate = true,
        hoverStrength = 30,
        hoverSpeedBoost = 200,
        dragSensitivity = 40,
        style,
    } = props

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const pointerRef = useRef({ dragging: false, lastX: 0, angleOffset: 0, hoverTarget: 0, hover: 0 })
    const propsRef = useRef({ speed, scale, facets, dispersion, light, baseColor, background, animate, hoverStrength, hoverSpeedBoost, dragSensitivity, advanced: props.advanced })
    propsRef.current = { speed, scale, facets, dispersion, light, baseColor, background, animate, hoverStrength, hoverSpeedBoost, dragSensitivity, advanced: props.advanced }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl2", {
            antialias: false,
            alpha: false,
            preserveDrawingBuffer: true,
            powerPreference: "high-performance",
        }) as WebGL2RenderingContext | null
        if (!gl) return

        const vs = compile(gl, gl.VERTEX_SHADER, VERT)
        const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
        const prog = gl.createProgram()
        if (!prog) throw new Error("Could not create program")
        gl.attachShader(prog, vs)
        gl.attachShader(prog, fs)
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            throw new Error("Program link failed: " + gl.getProgramInfoLog(prog))
        }
        gl.useProgram(prog)
        const vao = gl.createVertexArray()
        gl.bindVertexArray(vao)

        const loc = (name: string) => {
            const l = gl.getUniformLocation(prog, name) ?? gl.getUniformLocation(prog, name + "[0]")
            if (!l) throw new Error("Missing uniform " + name)
            return l
        }
        const U = {
            res: loc("uRes"),
            time: loc("uTime"),
            angle: loc("uAngle"),
            wobble: loc("uWobble"),
            count: loc("uCount"),
            planes: loc("uPlanes"),
            ppu: loc("uPpu"),
            target: loc("uTarget"),
            camDist: loc("uCamDist"),
            pitch: loc("uPitch"),
            ior: loc("uIor"),
            spread: loc("uSpread"),
            bounces: loc("uBounces"),
            light: loc("uLight"),
            bg: loc("uBg"),
            key: loc("uKey"),
            fill: loc("uFill"),
            strip: loc("uStrip"),
            front: loc("uFront"),
            gains: loc("uGains"),
            warm: loc("uWarm"),
            cool: loc("uCool"),
            soft: loc("uSoft"),
            falloff: loc("uFalloff"),
            exposure: loc("uExposure"),
            contrast: loc("uContrast"),
            rim: loc("uRim"),
            residual: loc("uResidual"),
            reflect: loc("uReflect"),
            grain: loc("uGrain"),
            vignette: loc("uVignette"),
        }

        let software = false
        const dbg = gl.getExtension("WEBGL_debug_renderer_info")
        if (dbg) {
            const r = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? "")
            software = /swiftshader|llvmpipe|software|basic render/i.test(r)
        }

        let dpr = 1
        const resize = () => {
            dpr = software ? 0.75 : Math.min(window.devicePixelRatio || 1, 2)
            const w = Math.max(1, Math.round(canvas.offsetWidth * dpr))
            const h = Math.max(1, Math.round(canvas.offsetHeight * dpr))
            if (canvas.width !== w) canvas.width = w
            if (canvas.height !== h) canvas.height = h
        }
        const ro = new ResizeObserver(resize)
        ro.observe(canvas)
        resize()

        const onPointerEnter = () => { pointerRef.current.hoverTarget = 1 }
        const onPointerLeave = () => { pointerRef.current.hoverTarget = 0 }
        const onPointerDown = (e: PointerEvent) => {
            if (num(propsRef.current.dragSensitivity, 40) <= 0) return
            pointerRef.current.dragging = true
            pointerRef.current.lastX = e.clientX
            canvas.setPointerCapture?.(e.pointerId)
        }
        const onPointerMove = (e: PointerEvent) => {
            if (!pointerRef.current.dragging) return
            const dx = e.clientX - pointerRef.current.lastX
            pointerRef.current.lastX = e.clientX
            const sens = clamp(num(propsRef.current.dragSensitivity, 40), 0, 100) / 100
            pointerRef.current.angleOffset += dx * sens * 0.6 * DEG
        }
        const endDrag = () => { pointerRef.current.dragging = false }
        canvas.addEventListener("pointerenter", onPointerEnter)
        canvas.addEventListener("pointerleave", onPointerLeave)
        canvas.addEventListener("pointerdown", onPointerDown)
        canvas.addEventListener("pointermove", onPointerMove)
        window.addEventListener("pointerup", endDrag)
        window.addEventListener("pointercancel", endDrag)

        const mq = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null
        const planeData = new Float32Array(MAX_PLANES * 4)
        let raf = 0
        let last = -1
        let elapsed = 0
        let phase = 0

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            elapsed += dt

            const p = propsRef.current
            const adv: Advanced = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
            const reduced = !!mq?.matches
            const turn = num(adv.turnRate, 50) * DEG
            const dragging = pointerRef.current.dragging
            const animating = p.animate !== false && !reduced && !dragging
            pointerRef.current.hover += (pointerRef.current.hoverTarget - pointerRef.current.hover) * Math.min(dt * 6, 1)
            const speedBoost = 1 + (clamp(num(p.hoverSpeedBoost, 50), 0, 200) / 100) * pointerRef.current.hover
            if (animating) phase += turn * (clamp(num(p.speed, 50), 0, 100) / 50) * speedBoost * dt
            const theta = num(adv.startAngle, 0) * DEG + (reduced ? turn * 0.54 : phase) + pointerRef.current.angleOffset

            const W = canvas.width
            const H = canvas.height
            const { count, crownH } = buildPlanes(adv, num(p.facets, 6), planeData)
            const ppu = (Math.min(H, W * 1.65) / 3.3) * (clamp(num(p.scale, 100), 10, 400) / 100)
            const frameH = H / ppu
            const topY = crownH + (num(adv.apexY, 4) / 100) * frameH
            const centerY = topY - frameH / 2
            const targetX = -(num(adv.offsetX, 0) / 100) * (W / ppu)
            const fov = clamp(num(adv.fov, 20), 1, 120) * DEG
            const camDist = 1.65 / Math.max(Math.tan(fov / 2), 1e-3)

            const lightRgb = toRgb(p.baseColor, [0.933, 0.945, 0.933])
            const bgRgb = toRgb(p.background, [0, 0, 0])
            const warmRgb = toRgb(adv.warmColor, [0.85, 0.64, 0.31])
            const coolRgb = toRgb(adv.coolColor, [0.23, 0.36, 1])
            const warmK = num(adv.warmStrength, 35) / 100
            const coolK = num(adv.coolStrength, 30) / 100
            const kw = (num(adv.keyWidth, 40) / 2) * DEG
            const kh = (num(adv.keyHeight, 100) / 2) * DEG

            gl.viewport(0, 0, W, H)
            gl.useProgram(prog)
            gl.bindVertexArray(vao)
            gl.uniform2f(U.res, W, H)
            gl.uniform1f(U.time, elapsed)
            gl.uniform1f(U.angle, theta)
            gl.uniform1f(U.wobble, num(adv.wobble, 1) * DEG * Math.sin(theta * 2))
            gl.uniform1i(U.count, count)
            gl.uniform4fv(U.planes, planeData)
            gl.uniform1f(U.ppu, ppu)
            gl.uniform2f(U.target, targetX, centerY)
            gl.uniform1f(U.camDist, camDist)
            gl.uniform1f(U.pitch, num(adv.tilt, 6) * DEG)
            gl.uniform1f(U.ior, clamp(num(adv.ior, 151), 101, 400) / 100)
            gl.uniform1f(U.spread, (clamp(num(p.dispersion, 50), 0, 100) / 100) * 0.08)
            gl.uniform1i(U.bounces, Math.round(clamp(num(adv.bounces, 3), 1, 6)))
            gl.uniform3f(U.light, lightRgb[0], lightRgb[1], lightRgb[2])
            gl.uniform3f(U.bg, bgRgb[0], bgRgb[1], bgRgb[2])
            gl.uniform4f(U.key, num(adv.keyX, -26) * DEG, num(adv.keyY, 6) * DEG, kw, kh)
            gl.uniform4f(U.fill, num(adv.fillX, 40) * DEG, 0, kw * 0.7, kh * 0.8)
            gl.uniform4f(U.strip, 0, num(adv.stripY, -30) * DEG, 70 * DEG, 5 * DEG)
            gl.uniform4f(U.front, -35 * DEG, 20 * DEG, 20 * DEG, 30 * DEG)
            gl.uniform4f(
                U.gains,
                1,
                num(adv.fillStrength, 70) / 100,
                num(adv.stripStrength, 80) / 100,
                num(adv.frontStrength, 50) / 100
            )
            gl.uniform3f(U.warm, warmRgb[0] * warmK, warmRgb[1] * warmK, warmRgb[2] * warmK)
            gl.uniform3f(U.cool, coolRgb[0] * coolK, coolRgb[1] * coolK, coolRgb[2] * coolK)
            gl.uniform1f(U.soft, Math.max(num(adv.softness, 14), 0.5) * DEG)
            gl.uniform1f(U.falloff, clamp(num(adv.falloff, 60), 0, 100) / 100)
            gl.uniform1f(
                U.exposure,
                (clamp(num(p.light, 60), 0, 100) / 100) *
                    5 *
                    (1 + (clamp(num(p.hoverStrength, 30), 0, 100) / 100) * pointerRef.current.hover)
            )
            gl.uniform1f(U.contrast, clamp(num(adv.contrast, 60), 0, 100) / 100)
            gl.uniform2f(U.rim, num(adv.rimWidth, 2) * dpr, num(adv.rimStrength, 10) / 100)
            gl.uniform1f(U.residual, clamp(num(adv.residual, 15), 0, 100) / 100)
            gl.uniform1f(U.reflect, num(adv.reflectStrength, 100) / 100)
            gl.uniform1f(U.grain, clamp(num(adv.grain, 4), 0, 100) / 100)
            gl.uniform1f(U.vignette, clamp(num(adv.vignette, 0), 0, 100) / 100)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            canvas.removeEventListener("pointerenter", onPointerEnter)
            canvas.removeEventListener("pointerleave", onPointerLeave)
            canvas.removeEventListener("pointerdown", onPointerDown)
            canvas.removeEventListener("pointermove", onPointerMove)
            window.removeEventListener("pointerup", endDrag)
            window.removeEventListener("pointercancel", endDrag)
            gl.deleteVertexArray(vao)
            gl.deleteProgram(prog)
            gl.deleteShader(vs)
            gl.deleteShader(fs)
        }
    }, [])

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
                minWidth: 1200,
                minHeight: 800,
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
                    cursor: dragSensitivity > 0 ? "grab" : "default",
                    touchAction: dragSensitivity > 0 ? "none" : "auto",
                }}
            />
        </div>
    )
}
