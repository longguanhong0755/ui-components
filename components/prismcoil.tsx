"use client"

import type { CSSProperties } from "react"
import * as React from "react"
import { useEffect, useRef } from "react"

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    cycleMs: 1000,
    lobes: 3,
    ringRadius: 280,
    tubeRadius: 64,
    rounding: 45,
    tilt: 12,
    centerX: 0,
    centerY: 0,
    rows: 3,
    strokeLength: 92,
    strokeWidth: 14,
    waveAmp: 26,
    waves: 15,
    blackShare: 30,
    sheenShift: 50,
    glint: 45,
    speckle: 25,
    ambient: 55,
    exposure: 125,
    aoStrength: 70,
    lightAngle: 135,
    lightHeight: 50,
    floorLine: 844,
    floorColor: "#000000",
    wallEdge: "#000000",
    shadowOpacity: 55,
    shadowWidth: 50,
    shadowBlur: 25,
    foilPlum: "#2E1626",
    foilMagenta: "#892867",
    foilPink: "#C030A0",
    foilOrange: "#A52B0D",
    foilAmber: "#E8A030",
    foilTeal: "#30B0C0",
    foilBlue: "#1C3A7A",
    strokeBlack: "#020101",
    seed: 7,
    grain: 0,
    vignette: 0,
}

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

const FRAG = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 uRes;
uniform float uPhase;
uniform float uTime;
uniform vec3 uGeo;
uniform vec4 uShape;
uniform vec3 uCenter;
uniform vec4 uStroke;
uniform vec4 uStroke2;
uniform vec4 uSurf;
uniform vec4 uLight;
uniform vec3 uBase;
uniform vec3 uBg;
uniform vec3 uWallEdge;
uniform vec3 uFloor;
uniform vec4 uFloorP;
uniform vec3 uPost;
uniform vec2 uSeed;
uniform vec3 uPal[7];
uniform vec3 uBlack;

const float PI = 3.14159265;
const float TAU = 6.28318531;
vec3 gY;
vec3 gZ;

float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float sdPoly(vec2 p, float ap, float n) {
    float an = PI / n;
    float a = atan(p.y, p.x);
    float bn = 2.0 * an * floor((a + an) / (2.0 * an));
    float c = cos(bn);
    float s = sin(bn);
    vec2 q = vec2(c * p.x + s * p.y, -s * p.x + c * p.y);
    float he = ap * tan(an);
    return length(q - vec2(ap, clamp(q.y, -he, he))) * sign(q.x - ap);
}

vec3 toObj(vec3 p) {
    vec3 q = p - vec3(uCenter.xy, 0.0);
    return vec3(q.x, dot(q, gY), dot(q, gZ)) / max(uShape.z, 0.001);
}

float mapObj(vec3 q) {
    float u = atan(q.y, q.x);
    vec2 c = vec2(length(q.xy) - uGeo.x, q.z);
    float th = (uShape.y * u + uPhase) / uShape.x;
    float cs = cos(th);
    float sn = sin(th);
    vec2 cp = vec2(cs * c.x + sn * c.y, -sn * c.x + cs * c.y);
    float rad = uGeo.y * uGeo.z;
    return sdPoly(cp, uGeo.y - rad, uShape.x) - rad;
}

float map(vec3 p) { return 0.7 * mapObj(toObj(p)) * uShape.z; }

vec3 calcNormal(vec3 p) {
    float e = 0.0005 * uShape.z;
    const vec2 k = vec2(1.0, -1.0);
    return normalize(
        k.xyy * map(p + k.xyy * e) +
        k.yyx * map(p + k.yyx * e) +
        k.yxy * map(p + k.yxy * e) +
        k.xxx * map(p + k.xxx * e));
}

float calcAO(vec3 p, vec3 n) {
    float occ = 0.0;
    float w = 1.0;
    float S = uShape.z;
    for (int i = 1; i <= 4; i++) {
        float hh = 0.014 * float(i) * S;
        occ += (hh - map(p + n * hh) / 0.7) * w;
        w *= 0.65;
    }
    return clamp(1.0 - uLight.w * 10.0 * occ / S, 0.35, 1.0);
}

vec3 foil(float x) {
    x = fract(x) * 7.0;
    float i = floor(x);
    float fr = smoothstep(0.0, 1.0, x - i);
    int a = min(int(i), 6);
    int b = a + 1;
    if (b > 6) b = 0;
    return mix(uPal[a], uPal[b], fr);
}

vec3 shadeRing(vec3 p, vec3 rd, float t, float pix) {
    vec3 n = calcNormal(p);
    vec3 L = normalize(uLight.xyz);
    float S = uShape.z;
    float ndv = clamp(dot(n, -rd), 0.0, 1.0);
    float diff = max(dot(n, L), 0.0);
    float occ = calcAO(p, n);
    float amb = uSurf.z;
    float light = (amb * (0.85 + 0.15 * n.y) + (1.0 - amb) * diff) * occ * uSurf.w;
    float spec = pow(max(dot(reflect(rd, n), L), 0.0), 28.0);
    vec3 col = uBase * light + 0.05 * spec;

    vec3 q = toObj(p);
    float u = atan(q.y, q.x);
    float rho = length(q.xy);
    vec2 c = vec2(rho - uGeo.x, q.z);
    float th = (uShape.y * u + uPhase) / uShape.x;
    float cs = cos(th);
    float sn = sin(th);
    vec2 cp = vec2(cs * c.x + sn * c.y, -sn * c.x + cs * c.y);
    float v = atan(cp.y, cp.x);
    float M = uStroke.x;
    float rows = uStroke.y;
    float su = (u + PI) / TAU * M;
    float iu = floor(su);
    float bb = (su - iu - 0.5) * TAU / M * rho;
    float sv = v / TAU * rows;
    float iv = floor(sv + 0.5);
    float along = (sv - iv) * TAU / rows * length(cp);
    float hl = max(0.5 * uStroke.z * TAU / rows * uGeo.y * 1.25, 0.0005);
    float A = uStroke2.x * TAU / M * rho;
    float K = PI * uStroke2.y / hl;
    float xx = clamp(along, -hl, hl);
    float dy = A * K * cos(K * xx);
    float dP = (bb - A * sin(K * xx)) / sqrt(1.0 + dy * dy);
    float d = length(vec2(dP, along - xx));
    float hw = 0.5 * uStroke.w;
    float px = t * pix / S / max(ndv, 0.3);
    float m = 1.0 - smoothstep(hw - 0.7 * px, hw + 0.7 * px, d);
    if (m > 0.0) {
        vec2 cell = vec2(mod(iu, M), mod(iv, rows));
        float h1 = hash21(cell + uSeed);
        float h2 = hash21(cell.yx * 1.73 + uSeed.yx + 11.0);
        float x = h1 + (xx / (2.0 * hl)) * 0.45 + uStroke2.w * (1.0 - ndv) + 0.12 * n.y;
        vec3 fc = foil(x);
        vec3 sc = h2 < uStroke2.z ? mix(uBlack, fc, 0.1 + 0.3 * (1.0 - ndv)) : fc;
        float sp = hash21(floor(vec2(along, bb) * 700.0) + cell * 13.0 + uSeed * 3.0);
        sc *= 1.0 + uSurf.y * (sp - 0.5);
        sc = sc * clamp(0.3 + 0.8 * light, 0.0, 1.3) + uSurf.x * spec * vec3(1.0, 0.86, 0.93);
        col = mix(col, sc, m);
    }
    return col;
}

vec3 sceneBg(vec2 uv) {
    float fy = uFloorP.x;
    vec3 col;
    if (uv.y > fy) {
        float d = length((uv - vec2(0.0, 0.083)) * vec2(1.0, 1.1));
        col = mix(uBg, uWallEdge, smoothstep(0.2, 0.95, d) * 0.6);
    } else {
        float k = clamp((fy - uv.y) / max(fy + 0.5, 0.001), 0.0, 1.0);
        col = uFloor;
        col = mix(col, uWallEdge, smoothstep(0.45, 1.2, abs(uv.x) * 1.1 + k * 0.35) * 0.5);
        float sx = mix(-0.18, -0.21, k);
        float seam = 1.0 - smoothstep(0.0, 1.5 / uRes.y, abs(uv.x - sx));
        col = mix(col, uWallEdge, seam * 0.25);
    }
    float line = 1.0 - smoothstep(0.0, 1.5 / uRes.y, abs(uv.y - fy));
    col = mix(col, uWallEdge, line * 0.55);
    vec2 sp = vec2((uv.x - uCenter.x) / max(uFloorP.z, 0.001), (uv.y - fy - 0.004) / max(uFloorP.z * 0.09, 0.0001));
    float sh = 1.0 - smoothstep(0.2, 1.0 + uFloorP.w * 10.0, length(sp));
    col = mix(col, col * 0.78, sh * uFloorP.y);
    return col;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    vec3 col = sceneBg(uv);
    float tilt = uShape.w;
    gY = vec3(0.0, cos(tilt), -sin(tilt));
    gZ = vec3(0.0, sin(tilt), cos(tilt));
    float f = uCenter.z;
    vec3 ro = vec3(0.0, 0.0, f);
    vec3 rd = normalize(vec3(uv, -f));
    float pix = 1.0 / (uRes.y * f);
    float S = uShape.z;
    float an = PI / uShape.x;
    float rad = uGeo.y * uGeo.z;
    float corner = (uGeo.y - rad) / cos(an) + rad;
    float rOut = (uGeo.x + corner) * S * 1.03;
    float hz = corner * S * 1.03;
    vec3 C = vec3(uCenter.xy, 0.0);
    vec3 oc = ro - C;
    float b = dot(oc, rd);
    float h = b * b - (dot(oc, oc) - rOut * rOut);
    if (h > 0.0) {
        float sq = sqrt(h);
        float t0 = -b - sq;
        float t1 = -b + sq;
        float zo = dot(oc, gZ);
        float zd = dot(rd, gZ);
        if (abs(zd) > 1e-5) {
            float ta = (-hz - zo) / zd;
            float tb = (hz - zo) / zd;
            t0 = max(t0, min(ta, tb));
            t1 = min(t1, max(ta, tb));
        }
        if (t1 > t0) {
            float t = t0;
            bool hit = false;
            float dmin = 1e9;
            float tmin = t0;
            for (int i = 0; i < 90; i++) {
                float d = map(ro + rd * t);
                if (d < 0.4 * t * pix) { hit = true; break; }
                float ang = d / t;
                if (ang < dmin) { dmin = ang; tmin = t; }
                t += d;
                if (t > t1) break;
            }
            if (hit) {
                col = shadeRing(ro + rd * t, rd, t, pix);
            } else if (dmin < 0.7 * pix) {
                col = mix(shadeRing(ro + rd * tmin, rd, tmin, pix), col, smoothstep(0.0, pix, dmin / 0.7));
            }
        }
    }
    vec2 vq = gl_FragCoord.xy / uRes - 0.5;
    col *= 1.0 - uPost.y * 0.75 * smoothstep(0.2, 0.75, length(vq));
    float g = hash21(gl_FragCoord.xy + floor(uTime * 15.0) * vec2(17.0, 41.0)) - 0.5;
    col += g * uPost.x * 0.25;
    outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

const UNIFORMS = [
    "uRes", "uPhase", "uTime", "uGeo", "uShape", "uCenter", "uStroke", "uStroke2", "uSurf",
    "uLight", "uBase", "uBg", "uWallEdge", "uFloor", "uFloorP", "uPost", "uSeed", "uPal", "uBlack",
]

// Integer seed → two well-spread offsets in a small range, so the shader's
// float hash stays precise and every seed step gives a fresh shuffle.
function seedOffsets(seed: number): [number, number] {
    let h = Math.imul((seed | 0) ^ 0x9e3779b9, 0x85ebca6b)
    h ^= h >>> 13
    h = Math.imul(h, 0xc2b2ae35)
    h ^= h >>> 16
    const a = (h >>> 0) / 4294967296
    h = Math.imul(h ^ 0x27d4eb2f, 0x165667b1)
    h ^= h >>> 15
    const b = (h >>> 0) / 4294967296
    return [a * 61.7, b * 47.3]
}

type RGB = [number, number, number]

function parseColor(input: unknown, fallback: RGB): RGB {
    if (typeof input !== "string") return fallback
    const s = input.trim()
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
        if (p.length >= 3 && p.slice(0, 3).every((x) => isFinite(x))) return [p[0] / 255, p[1] / 255, p[2] / 255]
    }
    return fallback
}

function num(v: unknown, d: number): number {
    return typeof v === "number" && isFinite(v) ? v : d
}

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
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

function createProgram(gl: WebGL2RenderingContext): WebGLProgram {
    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    const prog = gl.createProgram()
    if (!prog) throw new Error("createProgram failed")
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.bindAttribLocation(prog, 0, "aPos")
    gl.linkProgram(prog)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Program link failed: " + gl.getProgramInfoLog(prog))
    }
    return prog
}

export interface SingleWhiteRingProps {
    background?: string
    baseColor?: string
    speed?: number
    scale?: number
    twist?: number
    strokeCount?: number
    hover?: number
    advanced?: {
        cycleMs?: number
        lobes?: number
        ringRadius?: number
        tubeRadius?: number
        rounding?: number
        tilt?: number
        centerX?: number
        centerY?: number
        rows?: number
        strokeLength?: number
        strokeWidth?: number
        waveAmp?: number
        waves?: number
        blackShare?: number
        sheenShift?: number
        glint?: number
        speckle?: number
        ambient?: number
        exposure?: number
        aoStrength?: number
        lightAngle?: number
        lightHeight?: number
        floorLine?: number
        floorColor?: string
        wallEdge?: string
        shadowOpacity?: number
        shadowWidth?: number
        shadowBlur?: number
        foilPlum?: string
        foilMagenta?: string
        foilPink?: string
        foilOrange?: string
        foilAmber?: string
        foilTeal?: string
        foilBlue?: string
        strokeBlack?: string
        seed?: number
        grain?: number
        vignette?: number
    }
    style?: CSSProperties
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function SingleWhiteRing(props: SingleWhiteRingProps) {
    const {
        speed = 50,
        scale = 73,
        twist = 4,
        strokeCount = 24,
        hover = 50,
        background = "#000000",
        baseColor = "#00B9A1",
        style,
    } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const live = useRef({ speed, scale, twist, strokeCount, hover, background, baseColor, advanced: props.advanced })
    live.current = { speed, scale, twist, strokeCount, hover, background, baseColor, advanced: props.advanced }
    const pointer = useRef({ x: 0, y: 0, tx: 0, ty: 0, over: 0, overTarget: 0, down: 0 })

    useEffect(() => {
        const canvas = canvasRef.current
        const root = rootRef.current
        if (!canvas || !root) return
        const gl = canvas.getContext("webgl2", {
            antialias: false,
            alpha: false,
            premultipliedAlpha: false,
            preserveDrawingBuffer: true,
        }) as WebGL2RenderingContext | null
        if (!gl) return

        let prog: WebGLProgram
        const loc: Record<string, WebGLUniformLocation> = {}
        try {
            prog = createProgram(gl)
            for (const name of UNIFORMS) {
                const l = gl.getUniformLocation(prog, name)
                if (l === null) throw new Error("Missing uniform " + name)
                loc[name] = l
            }
        } catch (err) {
            console.error(err)
            return
        }

        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        const vao = gl.createVertexArray()
        gl.bindVertexArray(vao)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

        const resize = () => {
            const w = root.offsetWidth
            const h = root.offsetHeight
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            const cw = Math.max(1, Math.round(w * dpr))
            const ch = Math.max(1, Math.round(h * dpr))
            if (canvas.width !== cw || canvas.height !== ch) {
                canvas.width = cw
                canvas.height = ch
            }
        }
        const ro = new ResizeObserver(resize)
        ro.observe(root)
        resize()

        const onPointerMove = (e: PointerEvent) => {
            const r = root.getBoundingClientRect()
            pointer.current.tx = ((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1
            pointer.current.ty = ((e.clientY - r.top) / Math.max(1, r.height)) * 2 - 1
            pointer.current.overTarget = 1
        }
        const onPointerLeave = () => {
            pointer.current.overTarget = 0
            pointer.current.tx = 0
            pointer.current.ty = 0
        }
        const onPointerDown = () => {
            pointer.current.down = 1
        }
        const onPointerUp = () => {
            pointer.current.down = 0
        }
        root.addEventListener("pointermove", onPointerMove)
        root.addEventListener("pointerenter", onPointerMove)
        root.addEventListener("pointerleave", onPointerLeave)
        root.addEventListener("pointerdown", onPointerDown)
        window.addEventListener("pointerup", onPointerUp)
        window.addEventListener("pointercancel", onPointerUp)

        const mq = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null
        let reduced = mq ? mq.matches : false
        const onMq = (e: MediaQueryListEvent) => {
            reduced = e.matches
        }
        mq?.addEventListener?.("change", onMq)

        const pal = new Float32Array(21)
        let raf = 0
        let last = -1
        let cycles = 0
        let clock = 0

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            const p = live.current
            const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }

            const lobes = Math.max(3, Math.min(8, Math.round(num(adv.lobes, 3))))
            const hoverK = num(p.hover, 50) / 50
            const ease = Math.min(1, dt * 6)
            pointer.current.over += (pointer.current.overTarget - pointer.current.over) * ease
            pointer.current.x += (pointer.current.tx - pointer.current.x) * ease
            pointer.current.y += (pointer.current.ty - pointer.current.y) * ease
            const pointerBoost = hoverK * (0.6 * pointer.current.over + 0.8 * pointer.current.down)
            const spd = (Math.max(0, num(p.speed, 50)) / 50) * (1 + pointerBoost)
            const rate = 1000 / Math.max(100, num(adv.cycleMs, 1000))
            if (!reduced) cycles = (cycles + dt * spd * rate) % lobes
            clock = (clock + dt) % 100

            if (canvas.width < 2 || canvas.height < 2) return
            const S = Math.max(0.05, num(p.scale, 100) / 100)
            const la = (num(adv.lightAngle, 135) * Math.PI) / 180
            const le = (num(adv.lightHeight, 50) * Math.PI) / 180

            gl.viewport(0, 0, canvas.width, canvas.height)
            gl.useProgram(prog)
            gl.bindVertexArray(vao)
            gl.uniform2f(loc.uRes, canvas.width, canvas.height)
            gl.uniform1f(loc.uPhase, cycles * Math.PI * 2)
            gl.uniform1f(loc.uTime, clock)
            gl.uniform3f(
                loc.uGeo,
                num(adv.ringRadius, 280) / 1000,
                Math.max(0.005, num(adv.tubeRadius, 64) / 1000),
                Math.min(0.95, Math.max(0, num(adv.rounding, 45) / 100))
            )
            const tiltAdj = num(adv.tilt, 12) + pointer.current.x * 16 * hoverK * pointer.current.over
            gl.uniform4f(
                loc.uShape,
                lobes,
                Math.round(num(p.twist, 4)),
                S,
                (tiltAdj * Math.PI) / 180
            )
            gl.uniform3f(
                loc.uCenter,
                num(adv.centerX, 10) / 1000 + pointer.current.x * 0.025 * hoverK * pointer.current.over,
                num(adv.centerY, 22) / 1000 - pointer.current.y * 0.02 * hoverK * pointer.current.over,
                0.5 / Math.tan((15 * Math.PI) / 180)
            )
            gl.uniform4f(
                loc.uStroke,
                Math.max(1, Math.round(num(p.strokeCount, 24))),
                Math.max(1, Math.round(num(adv.rows, 3))),
                num(adv.strokeLength, 92) / 100,
                num(adv.strokeWidth, 14) / 1000
            )
            gl.uniform4f(
                loc.uStroke2,
                num(adv.waveAmp, 26) / 100,
                num(adv.waves, 15) / 10,
                num(adv.blackShare, 30) / 100,
                num(adv.sheenShift, 50) / 100
            )
            gl.uniform4f(
                loc.uSurf,
                num(adv.glint, 45) / 100,
                num(adv.speckle, 25) / 100,
                num(adv.ambient, 55) / 100,
                num(adv.exposure, 125) / 100
            )
            gl.uniform4f(
                loc.uLight,
                Math.cos(la) * Math.cos(le),
                Math.sin(la) * Math.cos(le),
                Math.sin(le),
                num(adv.aoStrength, 70) / 100
            )
            gl.uniform3fv(loc.uBase, parseColor(p.baseColor, [0.957, 0.957, 0.941]))
            gl.uniform3fv(loc.uBg, parseColor(p.background, [0, 0, 0]))
            gl.uniform3fv(loc.uWallEdge, parseColor(adv.wallEdge, [0, 0, 0]))
            gl.uniform3fv(loc.uFloor, parseColor(adv.floorColor, [0, 0, 0]))
            gl.uniform4f(
                loc.uFloorP,
                0.5 - num(adv.floorLine, 844) / 1000,
                num(adv.shadowOpacity, 55) / 100,
                (num(adv.shadowWidth, 50) / 200) * S,
                num(adv.shadowBlur, 25) / 1000
            )
            gl.uniform3f(
                loc.uPost,
                num(adv.grain, 0) / 100,
                num(adv.vignette, 0) / 100,
                Math.round(num(adv.seed, 7))
            )
            const so = seedOffsets(Math.round(num(adv.seed, 7)))
            gl.uniform2f(loc.uSeed, so[0], so[1])
            const foils = [
                parseColor(adv.foilPlum, [0.18, 0.086, 0.149]),
                parseColor(adv.foilMagenta, [0.537, 0.157, 0.404]),
                parseColor(adv.foilPink, [0.753, 0.188, 0.627]),
                parseColor(adv.foilOrange, [0.647, 0.169, 0.051]),
                parseColor(adv.foilAmber, [0.91, 0.627, 0.188]),
                parseColor(adv.foilTeal, [0.188, 0.69, 0.753]),
                parseColor(adv.foilBlue, [0.11, 0.227, 0.478]),
            ]
            for (let i = 0; i < 7; i++) {
                pal[i * 3] = foils[i][0]
                pal[i * 3 + 1] = foils[i][1]
                pal[i * 3 + 2] = foils[i][2]
            }
            gl.uniform3fv(loc.uPal, pal)
            gl.uniform3fv(loc.uBlack, parseColor(adv.strokeBlack, [0.008, 0.004, 0.004]))
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            root.removeEventListener("pointermove", onPointerMove)
            root.removeEventListener("pointerenter", onPointerMove)
            root.removeEventListener("pointerleave", onPointerLeave)
            root.removeEventListener("pointerdown", onPointerDown)
            window.removeEventListener("pointerup", onPointerUp)
            window.removeEventListener("pointercancel", onPointerUp)
            mq?.removeEventListener?.("change", onMq)
            gl.deleteVertexArray(vao)
            gl.deleteBuffer(buf)
            gl.deleteProgram(prog)
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
                ...style,
                overflow: "hidden",
                background,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
            />
        </div>
    )
}
