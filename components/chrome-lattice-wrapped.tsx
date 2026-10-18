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
    periodMs: 3600,
    morph: 50,
    detail: 50,
    detailScale: 200,
    edgeSoftness: 60,
    bevel: 10,
    offsetX: 0,
    offsetY: 0,
    spin: 47,
    seed: 0,
    coreSize: 100,
    coreScale: 110,
    coreMorph: 50,
    coreBrightness: 100,
    coreFalloff: 50,
    backLattice: 0,
    holeShadow: 60,
    holeShadowWidth: 20,
    coreTeal: "#3FBF8A",
    coreViolet: "#7A4AD8",
    coreMagenta: "#E0287A",
    coreCoral: "#FF6A3D",
    coreLime: "#B8D23A",
    shadowColor: "#808184",
    contactColor: "#0041FF",
    highlightColor: "#FFFFFF",
    specular: 80,
    shininess: 100,
    lightAngle: 360,
    rimLight: 100,
    colorPickup: 100,
    envContrast: 100,
    grain: 0,
    vignette: 0,
}

const VERT = `#version 300 es
void main() {
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

const FRAG = `#version 300 es
precision highp float;
out vec4 outColor;

uniform vec2 uRes;
uniform vec2 uCenter;
uniform float uRadius;
uniform float uTheta;
uniform float uSpin;
uniform float uTiltX;
uniform float uFreq;
uniform float uThr;
uniform float uMorph;
uniform float uDetail;
uniform float uDetailScale;
uniform float uEdge;
uniform float uBevel;
uniform float uAo;
uniform float uAoWidth;
uniform float uCoreSize;
uniform float uCoreScale;
uniform float uCoreMorph;
uniform float uCoreBright;
uniform float uCoreFalloff;
uniform float uBack;
uniform vec3 uCol0;
uniform vec3 uCol1;
uniform vec3 uCol2;
uniform vec3 uCol3;
uniform vec3 uCol4;
uniform vec3 uMetal;
uniform vec3 uShadow;
uniform vec3 uContact;
uniform vec3 uHighlight;
uniform vec3 uBg;
uniform float uSpec;
uniform float uShine;
uniform vec2 uLight;
uniform float uRim;
uniform float uTint;
uniform float uEnvContrast;
uniform float uSeed;
uniform float uGrain;
uniform float uVignette;
uniform float uTime;

vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
float mod289(float x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
float permute(float x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float taylorInvSqrt(float r) { return 1.79284291400159 - 0.85373472095314 * r; }

vec4 grad4(float j, vec4 ip) {
    const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
    vec4 p, s;
    p.xyz = floor(fract(vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
    p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
    s = vec4(lessThan(p, vec4(0.0)));
    p.xyz = p.xyz + (s.xyz * 2.0 - 1.0) * s.www;
    return p;
}

float snoise(vec4 v) {
    const vec4 C = vec4(0.138196601125011, 0.276393202250021, 0.414589803375032, -0.447213595499958);
    vec4 i = floor(v + dot(v, vec4(0.309016994374947451)));
    vec4 x0 = v - i + dot(i, C.xxxx);
    vec4 i0;
    vec3 isX = step(x0.yzw, x0.xxx);
    vec3 isYZ = step(x0.zww, x0.yyz);
    i0.x = isX.x + isX.y + isX.z;
    i0.yzw = 1.0 - isX;
    i0.y += isYZ.x + isYZ.y;
    i0.zw += 1.0 - isYZ.xy;
    i0.z += isYZ.z;
    i0.w += 1.0 - isYZ.z;
    vec4 i3 = clamp(i0, 0.0, 1.0);
    vec4 i2 = clamp(i0 - 1.0, 0.0, 1.0);
    vec4 i1 = clamp(i0 - 2.0, 0.0, 1.0);
    vec4 x1 = x0 - i1 + C.xxxx;
    vec4 x2 = x0 - i2 + C.yyyy;
    vec4 x3 = x0 - i3 + C.zzzz;
    vec4 x4 = x0 + C.wwww;
    i = mod289(i);
    float j0 = permute(permute(permute(permute(i.w) + i.z) + i.y) + i.x);
    vec4 j1 = permute(permute(permute(permute(
                i.w + vec4(i1.w, i2.w, i3.w, 1.0))
              + i.z + vec4(i1.z, i2.z, i3.z, 1.0))
              + i.y + vec4(i1.y, i2.y, i3.y, 1.0))
              + i.x + vec4(i1.x, i2.x, i3.x, 1.0));
    vec4 ip = vec4(1.0 / 294.0, 1.0 / 49.0, 1.0 / 7.0, 0.0);
    vec4 p0 = grad4(j0, ip);
    vec4 p1 = grad4(j1.x, ip);
    vec4 p2 = grad4(j1.y, ip);
    vec4 p3 = grad4(j1.z, ip);
    vec4 p4 = grad4(j1.w, ip);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    p4 *= taylorInvSqrt(dot(p4, p4));
    vec3 m0 = max(0.6 - vec3(dot(x0, x0), dot(x1, x1), dot(x2, x2)), 0.0);
    vec2 m1 = max(0.6 - vec2(dot(x3, x3), dot(x4, x4)), 0.0);
    m0 = m0 * m0;
    m1 = m1 * m1;
    return 49.0 * (dot(m0 * m0, vec3(dot(p0, x0), dot(p1, x1), dot(p2, x2)))
                 + dot(m1 * m1, vec2(dot(p3, x3), dot(p4, x4))));
}

vec3 rotY(vec3 p, float a) {
    float c = cos(a), s = sin(a);
    return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

vec3 rotX(vec3 p, float a) {
    float c = cos(a), s = sin(a);
    return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z);
}

// Lattice field on the unit sphere. Time enters as a circle (periodic loop);
// the cos term shifts the field along the view axis, which reads as the
// measured inward pull on the front face.
float lattice(vec3 s) {
    vec3 q = rotY(rotX(s, uTiltX), uSpin) * uFreq + vec3(uSeed * 1.37, uSeed * 0.71, uSeed * 0.29);
    vec2 cs = vec2(cos(uTheta), sin(uTheta)) * uMorph;
    float n = snoise(vec4(q.xy, q.z + cs.x, cs.y));
    vec3 q2 = q * uDetailScale + vec3(5.2, 1.3, 2.8);
    n += uDetail * snoise(vec4(q2.xy, q2.z + cs.y, cs.x + 3.1));
    return n;
}

vec3 corePalette(float u) {
    vec3 c = mix(uCol0, uCol1, smoothstep(0.06, 0.27, u));
    c = mix(c, uCol2, smoothstep(0.27, 0.5, u));
    c = mix(c, uCol3, smoothstep(0.5, 0.73, u));
    c = mix(c, uCol4, smoothstep(0.73, 0.94, u));
    return c;
}

vec3 envMap(vec3 dir) {
    float up = smoothstep(-0.7, 0.8, dir.y);
    vec3 c = mix(uShadow * 0.55, uMetal * 0.85, up);
    vec3 L = normalize(vec3(uLight * 0.8, 0.55));
    float box = smoothstep(0.55, 0.92, dot(dir, L));
    float band = exp(-pow((dir.y - 0.18) * 7.0, 2.0)) * 0.45;
    float fill = smoothstep(0.2, 1.0, dir.z) * 0.3;
    float under = exp(-pow((dir.y + 0.45) * 5.0, 2.0)) * 0.18;
    c += uHighlight * (box * 0.75 + band + fill * 0.5 + under);
    c = (c - 0.5) * uEnvContrast + 0.5;
    return clamp(c, 0.0, 1.2);
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
    vec2 frag = gl_FragCoord.xy;
    float px = 1.0 / max(uRadius, 1.0);
    vec2 d = (frag - uCenter) * px;
    float r2 = dot(d, d);
    vec3 col = uBg;
    float lim = 1.0 + 2.0 * px;
    if (r2 < lim * lim) {
        float z = sqrt(max(1.0 - r2, 0.0));
        vec3 s = normalize(vec3(d, z));
        vec3 T1 = normalize(vec3(s.z, 0.0, -s.x) + vec3(0.0, 0.0, 1e-4));
        vec3 T2 = cross(s, T1);
        float e = 0.006;
        float n = lattice(s);
        float gn1 = (lattice(normalize(s + e * T1)) - n) / e;
        float gn2 = (lattice(normalize(s + e * T2)) - n) / e;
        float nb = lattice(normalize(vec3(d, -z - 1e-3)));
        float mb = smoothstep(-0.04, 0.04, uThr - nb);

        // What shows through a hole: the gel core, or the far wall at the rim.
        vec3 hole;
        float rc = uCoreSize;
        if (r2 < rc * rc) {
            float zc = sqrt(rc * rc - r2);
            vec3 cp = vec3(d, zc) / rc;
            vec3 q = rotY(rotX(cp, uTiltX), uSpin) * uCoreScale + vec3(uSeed * 0.53 + 17.0, uSeed * 0.91, uSeed * 0.37);
            vec2 cc = vec2(cos(uTheta + 1.7), sin(uTheta + 1.7)) * uCoreMorph;
            float c1 = snoise(vec4(q.xy, q.z + cc.x, cc.y + 11.0));
            float c2 = snoise(vec4(q * 2.3 + vec3(4.0, -2.0, 1.0 + cc.y), cc.x - 6.0));
            float u = clamp(0.5 + 0.65 * c1 + 0.15 * c2, 0.0, 1.0);
            vec3 g = corePalette(u);
            g *= mix(1.0 - uCoreFalloff, 1.0, cp.z) * (0.86 + 0.18 * c2) * uCoreBright;
            float ring = smoothstep(0.08, 0.0, abs(c2 - 0.25));
            g *= 1.0 - 0.18 * ring;
            g = mix(g, g * 0.45 + uShadow * 0.2, uBack * mb);
            hole = g;
        } else {
            hole = mix(uBg, uShadow * 0.6, mb);
        }
        vec3 coreTint = hole;
        float ao = smoothstep(0.0, uAoWidth, n - uThr);
        hole = mix(uContact, hole, 1.0 - uAo * (1.0 - ao));

        // Rounded tube profile across each strand → bent normal.
        float x = clamp((uThr - n) / uEdge, 0.0, 1.0);
        float h = sqrt(x * (2.0 - x));
        float xc = max(x, 0.03);
        float dhdn = -(1.0 - xc) / sqrt(xc * (2.0 - xc)) / uEdge;
        vec2 gh = dhdn * vec2(gn1, gn2);
        vec3 N = normalize(s - uBevel * (gh.x * T1 + gh.y * T2));
        vec3 R = reflect(vec3(0.0, 0.0, -1.0), N);

        vec3 metal = envMap(R);
        vec3 L3 = normalize(vec3(uLight * 0.75, 0.66));
        metal += uHighlight * pow(max(dot(R, L3), 0.0), uShine) * uSpec;
        float edge = 1.0 - h;
        metal = mix(metal, metal * 0.55 + coreTint * 0.7, uTint * edge * edge);
        metal = mix(metal, uContact, 0.55 * pow(edge, 6.0));
        float fr = pow(1.0 - clamp(s.z, 0.0, 1.0), 3.0);
        float side = 0.65 + 0.35 * dot(normalize(d + vec2(1e-5)), vec2(-0.8, -0.6));
        metal += fr * uRim * side * uMetal;

        float aa = length(vec2(gn1, gn2)) * px / max(s.z, 0.2) + 1e-4;
        float m = smoothstep(-aa, aa, uThr - n);
        vec3 ball = mix(hole, metal, m);
        float cov = 1.0 - smoothstep(1.0 - px, 1.0 + px, sqrt(r2));
        col = mix(uBg, ball, cov);
    }

    vec2 uv = frag / uRes;
    float vd = length(uv - 0.5) * 1.4142;
    col *= 1.0 - uVignette * smoothstep(0.35, 1.05, vd);
    float gr = hash(frag + fract(uTime * 7.13) * 400.0) - 0.5;
    col += gr * uGrain * 0.22;
    outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

const UNIFORMS = [
    "uRes", "uCenter", "uRadius", "uTheta", "uSpin", "uTiltX", "uFreq", "uThr", "uMorph",
    "uDetail", "uDetailScale", "uEdge", "uBevel", "uAo", "uAoWidth", "uCoreSize",
    "uCoreScale", "uCoreMorph", "uCoreBright", "uCoreFalloff", "uBack", "uCol0",
    "uCol1", "uCol2", "uCol3", "uCol4", "uMetal", "uShadow", "uContact",
    "uHighlight", "uBg", "uSpec", "uShine", "uLight", "uRim", "uTint",
    "uEnvContrast", "uSeed", "uGrain", "uVignette", "uTime",
] as const

type RGB = [number, number, number]

function parseColor(input: unknown, fallback: RGB): RGB {
    if (typeof input !== "string") return fallback
    let s = input.trim()
    const v = s.match(/^var\([^,]+,\s*(.+)\)$/)
    if (v) s = v[1].trim()
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4) h = h.split("").map((c) => c + c).join("")
        if (h.length >= 6) {
            const n = parseInt(h.slice(0, 6), 16)
            if (!isNaN(n)) return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
        }
        return fallback
    }
    const m = s.match(/rgba?\(([^)]+)\)/i)
    if (m) {
        const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat)
        if (p.length >= 3 && !isNaN(p[0]) && !isNaN(p[1]) && !isNaN(p[2])) {
            return [p[0] / 255, p[1] / 255, p[2] / 255]
        }
    }
    return fallback
}

const num = (v: unknown, d: number) => (typeof v === "number" && isFinite(v) ? v : d)

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
    const sh = gl.createShader(type)
    if (!sh) throw new Error("createShader failed")
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(sh)
        gl.deleteShader(sh)
        throw new Error("Shader compile failed: " + log)
    }
    return sh
}

function setup(gl: WebGL2RenderingContext) {
    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    const prog = gl.createProgram()
    if (!prog) throw new Error("createProgram failed")
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Program link failed: " + gl.getProgramInfoLog(prog))
    }
    const loc: Record<string, WebGLUniformLocation> = {}
    for (const name of UNIFORMS) {
        const l = gl.getUniformLocation(prog, name)
        if (l === null) throw new Error("Missing uniform " + name)
        loc[name] = l
    }
    const vao = gl.createVertexArray()
    return { prog, loc, vao }
}

export interface ChromeLatticeWrappedProps {
    background?: string
    metalColor?: string
    size?: number
    speed?: number
    openness?: number
    holeScale?: number
    dragSensitivity?: number
    hoverIntensity?: number
    advanced?: {
        periodMs?: number
        morph?: number
        detail?: number
        detailScale?: number
        edgeSoftness?: number
        bevel?: number
        offsetX?: number
        offsetY?: number
        spin?: number
        seed?: number
        coreSize?: number
        coreScale?: number
        coreMorph?: number
        coreBrightness?: number
        coreFalloff?: number
        backLattice?: number
        holeShadow?: number
        holeShadowWidth?: number
        coreTeal?: string
        coreViolet?: string
        coreMagenta?: string
        coreCoral?: string
        coreLime?: string
        shadowColor?: string
        contactColor?: string
        highlightColor?: string
        specular?: number
        shininess?: number
        lightAngle?: number
        rimLight?: number
        colorPickup?: number
        envContrast?: number
        grain?: number
        vignette?: number
    }
    style?: CSSProperties
}

/**
 * Chrome lattice wrapped around a glowing iridescent core; the lattice
 * morphs continuously in a seamless loop.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function ChromeLatticeWrapped(props: ChromeLatticeWrappedProps) {
    const {
        size = 448,
        speed = 43,
        openness = 56,
        holeScale = 41,
        metalColor = "#FFFFFF",
        background = "#000000",
        dragSensitivity = 50,
        hoverIntensity = 100,
        advanced = {},
        style,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef({ size, speed, openness, holeScale, metalColor, background, dragSensitivity, hoverIntensity, advanced })
    propsRef.current = { size, speed, openness, holeScale, metalColor, background, dragSensitivity, hoverIntensity, advanced }

    useEffect(() => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return
        const gl = canvas.getContext("webgl2", {
            antialias: false,
            alpha: false,
            premultipliedAlpha: false,
            preserveDrawingBuffer: true,
        })
        if (!gl) return

        let res: ReturnType<typeof setup> | null = null
        const init = () => {
            try {
                res = setup(gl)
            } catch (err) {
                console.warn(err)
                res = null
            }
        }
        init()

        let cssW = 1
        let cssH = 1
        let dpr = 1
        const resize = () => {
            cssW = Math.max(1, container.offsetWidth)
            cssH = Math.max(1, container.offsetHeight)
            dpr = Math.min(2, window.devicePixelRatio || 1)
            const w = Math.max(1, Math.round(cssW * dpr))
            const h = Math.max(1, Math.round(cssH * dpr))
            if (canvas.width !== w) canvas.width = w
            if (canvas.height !== h) canvas.height = h
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(container)

        // Drag rotates the lattice (meaningful: it spins the ball under the
        // pointer); hover eases the core open and brightens the rim so the
        // ball visibly wakes up before a drag even starts.
        let dragging = false
        let dragRotation = 0
        let dragTiltX = 0
        let lastPointerX = 0
        let lastPointerY = 0
        let hovering = false
        let hoverT = 0
        const onPointerDown = (e: PointerEvent) => {
            dragging = true
            lastPointerX = e.clientX
            lastPointerY = e.clientY
            canvas.style.cursor = "grabbing"
        }
        const onPointerMove = (e: PointerEvent) => {
            if (!dragging) return
            const dx = e.clientX - lastPointerX
            const dy = e.clientY - lastPointerY
            lastPointerX = e.clientX
            lastPointerY = e.clientY
            const sens = Math.max(0, num(propsRef.current.dragSensitivity, 50)) / 50
            dragRotation += dx * 0.012 * sens
            dragTiltX += dy * 0.012 * sens
        }
        const onPointerUp = () => {
            dragging = false
            canvas.style.cursor = "grab"
        }
        const onPointerEnter = () => {
            hovering = true
        }
        const onPointerLeave = () => {
            hovering = false
        }
        canvas.style.cursor = "grab"
        canvas.addEventListener("pointerdown", onPointerDown)
        canvas.addEventListener("pointerenter", onPointerEnter)
        canvas.addEventListener("pointerleave", onPointerLeave)
        window.addEventListener("pointermove", onPointerMove)
        window.addEventListener("pointerup", onPointerUp)
        window.addEventListener("pointercancel", onPointerUp)

        const onLost = (e: Event) => {
            e.preventDefault()
            res = null
        }
        const onRestored = () => init()
        canvas.addEventListener("webglcontextlost", onLost)
        canvas.addEventListener("webglcontextrestored", onRestored)

        const target = RenderTarget.current()
        const frozenTarget = target === RenderTarget.thumbnail || target === RenderTarget.export
        const motionQuery =
            typeof window !== "undefined" && window.matchMedia
                ? window.matchMedia("(prefers-reduced-motion: reduce)")
                : null

        let raf = 0
        let last: number | null = null
        let t = 0
        let spinAngle = 0

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            let dt = last === null ? 0 : (now - last) / 1000
            last = now
            dt = Math.min(Math.max(dt, 0), 1 / 20)
            if (!res || gl.isContextLost()) return

            hoverT += ((hovering ? 1 : 0) - hoverT) * Math.min(1, dt * 6)

            const p = propsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
            const frozen = frozenTarget || (motionQuery ? motionQuery.matches : false)
            const rate = frozen ? 0 : Math.max(0, num(p.speed, 50)) / 50
            t += dt * rate
            spinAngle += ((num(adv.spin, 0) * Math.PI) / 180) * dt * rate

            const period = Math.max(100, num(adv.periodMs, 3600)) / 1000
            const theta = ((t % period) / period) * Math.PI * 2

            const W = canvas.width
            const H = canvas.height
            const radius = (Math.max(1, num(p.size, 320)) / 2) * dpr
            const cx = W / 2 + (num(adv.offsetX, 0) / 100) * W
            const cy = H / 2 - (num(adv.offsetY, 0) / 100) * H

            const hoverAmt = Math.max(0, num(p.hoverIntensity, 60)) / 100
            const op = num(p.openness, 50)
            const thr = 0.05 + ((50 - op) / 50) * 0.35 - hoverT * hoverAmt * 0.09
            const freq = 0.6 + Math.max(1, num(p.holeScale, 50)) * 0.024
            const la = (num(adv.lightAngle, 135) * Math.PI) / 180

            const { prog, loc, vao } = res
            gl.viewport(0, 0, W, H)
            gl.useProgram(prog)
            gl.bindVertexArray(vao)

            const c = (key: string, v: unknown, fb: RGB) => {
                const rgb = parseColor(v, fb)
                gl.uniform3f(loc[key], rgb[0], rgb[1], rgb[2])
            }

            gl.uniform2f(loc.uRes, W, H)
            gl.uniform2f(loc.uCenter, cx, cy)
            gl.uniform1f(loc.uRadius, radius)
            gl.uniform1f(loc.uTheta, theta)
            gl.uniform1f(loc.uSpin, spinAngle + dragRotation)
            gl.uniform1f(loc.uTiltX, dragTiltX)
            gl.uniform1f(loc.uFreq, freq)
            gl.uniform1f(loc.uThr, thr)
            gl.uniform1f(loc.uMorph, num(adv.morph, 45) / 100)
            gl.uniform1f(loc.uDetail, num(adv.detail, 25) / 100)
            gl.uniform1f(loc.uDetailScale, Math.max(10, num(adv.detailScale, 210)) / 100)
            gl.uniform1f(loc.uEdge, Math.max(1, num(adv.edgeSoftness, 18)) / 100)
            gl.uniform1f(loc.uBevel, num(adv.bevel, 6) / 100)
            gl.uniform1f(loc.uAo, num(adv.holeShadow, 60) / 100)
            gl.uniform1f(loc.uAoWidth, Math.max(1, num(adv.holeShadowWidth, 25)) / 100)
            gl.uniform1f(loc.uCoreSize, Math.min(100, Math.max(50, num(adv.coreSize, 95))) / 100)
            gl.uniform1f(loc.uCoreScale, Math.max(10, num(adv.coreScale, 110)) / 100)
            gl.uniform1f(loc.uCoreMorph, num(adv.coreMorph, 50) / 100)
            gl.uniform1f(loc.uCoreBright, (num(adv.coreBrightness, 100) / 100) * (1 + hoverT * hoverAmt * 0.7))
            gl.uniform1f(loc.uCoreFalloff, num(adv.coreFalloff, 55) / 100)
            gl.uniform1f(loc.uBack, num(adv.backLattice, 30) / 100)
            c("uCol0", adv.coreTeal, [0.247, 0.749, 0.541])
            c("uCol1", adv.coreViolet, [0.478, 0.29, 0.847])
            c("uCol2", adv.coreMagenta, [0.878, 0.157, 0.478])
            c("uCol3", adv.coreCoral, [1, 0.416, 0.239])
            c("uCol4", adv.coreLime, [0.722, 0.824, 0.227])
            c("uMetal", p.metalColor, [0.788, 0.792, 0.784])
            c("uShadow", adv.shadowColor, [0.325, 0.329, 0.345])
            c("uContact", adv.contactColor, [0.161, 0.125, 0.188])
            c("uHighlight", adv.highlightColor, [1, 1, 1])
            c("uBg", p.background, [0, 0, 0])
            gl.uniform1f(loc.uSpec, num(adv.specular, 80) / 100)
            gl.uniform1f(loc.uShine, Math.max(1, num(adv.shininess, 60)))
            gl.uniform2f(loc.uLight, Math.cos(la), Math.sin(la))
            gl.uniform1f(loc.uRim, (num(adv.rimLight, 60) / 100) * (1 + hoverT * hoverAmt * 1.2))
            gl.uniform1f(loc.uTint, num(adv.colorPickup, 35) / 100)
            gl.uniform1f(loc.uEnvContrast, num(adv.envContrast, 100) / 100)
            gl.uniform1f(loc.uSeed, num(adv.seed, 7))
            gl.uniform1f(loc.uGrain, num(adv.grain, 0) / 100)
            gl.uniform1f(loc.uVignette, num(adv.vignette, 0) / 100)
            gl.uniform1f(loc.uTime, frozen ? 0 : now / 1000)

            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            canvas.removeEventListener("webglcontextlost", onLost)
            canvas.removeEventListener("webglcontextrestored", onRestored)
            canvas.removeEventListener("pointerdown", onPointerDown)
            canvas.removeEventListener("pointerenter", onPointerEnter)
            canvas.removeEventListener("pointerleave", onPointerLeave)
            window.removeEventListener("pointermove", onPointerMove)
            window.removeEventListener("pointerup", onPointerUp)
            window.removeEventListener("pointercancel", onPointerUp)
            if (res && !gl.isContextLost()) {
                gl.deleteProgram(res.prog)
                gl.deleteVertexArray(res.vao)
            }
            res = null
        }
    }, [])

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 1200,
                minHeight: 800,
                background,
                ...style,
                overflow: "hidden",
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
                    touchAction: "none",
                    userSelect: "none",
                }}
            />
        </div>
    )
}
