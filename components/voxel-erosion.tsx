"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    loopMs: 14590,
    centerX: 50,
    centerY: 50,
    yaw: -60,
    pitch: 30,
    camera: 70,
    fill: 95,
    noiseScale: 283,
    drift: 103,
    detail: 4,
    detailScale: 230,
    edgeErosion: 15,
    softness: 9,
    minCube: 14,
    topLift: 259,
    sideDepth: 160,
    deepDepth: 318,
    lightAngle: 16,
    gradient: 12,
    ao: 55,
    floorGlow: 0,
    floorOffset: 63,
    floorWidth: 80,
    tilt: 8,
    carve: 45,
    carveRadius: 22,
    glow: 25,
    seed: 7,
    grain: 0,
    vignette: 20,
    hover: 50,
}

type Adv = typeof ADVANCED_DEFAULTS

type Props = {
    speed?: number
    size?: number
    density?: number
    erosion?: number
    baseColor?: string
    background?: string
    dragSensitivity?: number
    advanced?: Partial<Adv>
    style?: React.CSSProperties
}

const VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec4 aInst;
uniform mat3 uModel;
uniform vec2 uCenter;
uniform float uPx;
uniform float uDist;
uniform vec2 uRes;
out vec3 vLocal;
out vec3 vLocalN;
out vec3 vWorldN;
out vec2 vScreen;
void main() {
    vec3 lp = aInst.xyz + aPos * (2.0 * aInst.w);
    vec3 v = uModel * lp;
    float persp = uDist / max(uDist - v.z, 0.05);
    vec2 px = uCenter + vec2(v.x, -v.y) * persp * uPx;
    vLocal = lp;
    vLocalN = aNormal;
    vWorldN = uModel * aNormal;
    vScreen = px;
    gl_Position = vec4(
        px.x / max(uRes.x, 1.0) * 2.0 - 1.0,
        1.0 - px.y / max(uRes.y, 1.0) * 2.0,
        clamp(-v.z / 4.0, -1.0, 1.0),
        1.0
    );
}`

const FRAG = `#version 300 es
precision highp float;
in vec3 vLocal;
in vec3 vLocalN;
in vec3 vWorldN;
in vec2 vScreen;
uniform vec3 uTop;
uniform vec3 uFront;
uniform vec3 uSide;
uniform vec3 uDeep;
uniform vec2 uLight;
uniform float uGrad;
uniform float uAo;
uniform vec3 uGlow;
uniform float uGlowR;
out vec4 outColor;
void main() {
    vec3 c;
    if (vLocalN.y > 0.5) {
        c = uTop;
    } else if (vLocalN.y < -0.5) {
        c = uDeep;
    } else {
        vec2 h = vWorldN.xz;
        float hl = max(length(h), 1e-4);
        float d = dot(h / hl, uLight);
        c = d >= 0.0 ? mix(uSide, uFront, d) : mix(uSide, uDeep, -d);
    }
    float hgt = clamp(vLocal.y * 0.5 + 0.5, 0.0, 1.0);
    c *= mix(1.0 - uGrad, 1.0 + uGrad * 0.5, hgt);
    vec3 a = abs(vLocal);
    float depth = 1.0 - max(max(a.x, a.y), a.z);
    c = mix(c, uDeep, uAo * smoothstep(0.0, 0.45, depth));
    vec2 dp = vScreen - uGlow.xy;
    float g = uGlow.z * exp(-dot(dp, dp) / max(uGlowR * uGlowR, 1.0));
    c += (vec3(1.0) - c) * g;
    outColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`

function makeNoise(seed: number) {
    const p = new Uint8Array(256)
    for (let i = 0; i < 256; i++) p[i] = i
    let r = Math.imul(Math.floor(seed) + 1, 2654435761) >>> 0 || 1
    for (let i = 255; i > 0; i--) {
        r = (Math.imul(r, 1664525) + 1013904223) >>> 0
        const j = r % (i + 1)
        const t = p[i]
        p[i] = p[j]
        p[j] = t
    }
    const perm = new Uint8Array(512)
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255]
    const G = [
        1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1,
        -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1,
    ]
    const F3 = 1 / 3
    const G3 = 1 / 6
    const corner = (gi: number, x: number, y: number, z: number) => {
        const t = 0.6 - x * x - y * y - z * z
        if (t < 0) return 0
        const g = (gi % 12) * 3
        const t2 = t * t
        return t2 * t2 * (G[g] * x + G[g + 1] * y + G[g + 2] * z)
    }
    return (x: number, y: number, z: number) => {
        const sk = (x + y + z) * F3
        const i = Math.floor(x + sk)
        const j = Math.floor(y + sk)
        const k = Math.floor(z + sk)
        const t = (i + j + k) * G3
        const x0 = x - (i - t)
        const y0 = y - (j - t)
        const z0 = z - (k - t)
        let i1, j1, k1, i2, j2, k2
        if (x0 >= y0) {
            if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0 }
            else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1 }
            else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1 }
        } else {
            if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1 }
            else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1 }
            else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0 }
        }
        const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3
        const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3
        const x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3
        const ii = i & 255, jj = j & 255, kk = k & 255
        const n0 = corner(perm[ii + perm[jj + perm[kk]]], x0, y0, z0)
        const n1 = corner(perm[ii + i1 + perm[jj + j1 + perm[kk + k1]]], x1, y1, z1)
        const n2 = corner(perm[ii + i2 + perm[jj + j2 + perm[kk + k2]]], x2, y2, z2)
        const n3 = corner(perm[ii + 1 + perm[jj + 1 + perm[kk + 1]]], x3, y3, z3)
        return 32 * (n0 + n1 + n2 + n3)
    }
}

function parseColor(c: string | undefined, fallback: [number, number, number]): [number, number, number] {
    if (!c || typeof c !== "string") return fallback
    const s = c.trim()
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4) h = h.split("").map((ch) => ch + ch).join("")
        if (h.length >= 6) {
            const n = parseInt(h.slice(0, 6), 16)
            if (!isNaN(n)) return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
        }
        return fallback
    }
    const m = s.match(/rgba?\(([^)]+)\)/i)
    if (m) {
        const parts = m[1].split(/[ ,/]+/).filter(Boolean).map(parseFloat)
        if (parts.length >= 3 && parts.slice(0, 3).every((v) => !isNaN(v)))
            return [parts[0] / 255, parts[1] / 255, parts[2] / 255]
    }
    return fallback
}

const BASE_FALLBACK: [number, number, number] = [68 / 255, 152 / 255, 215 / 255]

function deriveColors(base: [number, number, number], adv: Adv) {
    const top = base.map((c) => 1 - Math.pow(1 - c, Math.max(adv.topLift, 1) / 100)) as [number, number, number]
    const side = base.map((c) => Math.pow(c, Math.max(adv.sideDepth, 1) / 100)) as [number, number, number]
    const deep = base.map((c) => Math.pow(c, Math.max(adv.deepDepth, 1) / 100)) as [number, number, number]
    return { top, front: base, side, deep }
}

function toCss(c: [number, number, number]) {
    return `rgb(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)})`
}

function cubeGeometry() {
    const out: number[] = []
    const normals = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]
    for (const n of normals) {
        const u = Math.abs(n[1]) > 0.5 ? [1, 0, 0] : [0, 1, 0]
        const v = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]]
        const pt = (a: number, b: number) => [
            n[0] * 0.5 + u[0] * a * 0.5 + v[0] * b * 0.5,
            n[1] * 0.5 + u[1] * a * 0.5 + v[1] * b * 0.5,
            n[2] * 0.5 + u[2] * a * 0.5 + v[2] * b * 0.5,
        ]
        const quad = [pt(-1, -1), pt(1, -1), pt(1, 1), pt(-1, -1), pt(1, 1), pt(-1, 1)]
        for (const q of quad) out.push(q[0], q[1], q[2], n[0], n[1], n[2])
    }
    return new Float32Array(out)
}

function rotation(yaw: number, pitch: number) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw)
    const cp = Math.cos(pitch), sp = Math.sin(pitch)
    return [cy, 0, sy, sp * sy, cp, -sp * cy, -cp * sy, sp, cp * cy]
}

const smoothstep = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / Math.max(b - a, 1e-5)))
    return t * t * (3 - 2 * t)
}

const GRAIN_URL =
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")"

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function CubeMadeLattice(props: Props) {
    const {
        speed = 21,
        size = 450,
        density = 10,
        erosion = 100,
        baseColor = "#A49900",
        background = "#000000",
        dragSensitivity = 100,
        style,
    } = props
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef<Props>(props)
    propsRef.current = props

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const gl = canvas.getContext("webgl2", {
            antialias: true,
            alpha: true,
            premultipliedAlpha: true,
            preserveDrawingBuffer: true,
        })
        if (!gl) return

        const compile = (type: number, src: string) => {
            const sh = gl.createShader(type)
            if (!sh) throw new Error("shader alloc failed")
            gl.shaderSource(sh, src)
            gl.compileShader(sh)
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || "shader")
            return sh
        }
        let program: WebGLProgram
        let vs: WebGLShader, fs: WebGLShader
        const U: Record<string, WebGLUniformLocation> = {}
        try {
            vs = compile(gl.VERTEX_SHADER, VERT)
            fs = compile(gl.FRAGMENT_SHADER, FRAG)
            const pr = gl.createProgram()
            if (!pr) throw new Error("program alloc failed")
            gl.attachShader(pr, vs)
            gl.attachShader(pr, fs)
            gl.linkProgram(pr)
            if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr) || "link")
            program = pr
            for (const name of [
                "uModel", "uCenter", "uPx", "uDist", "uRes", "uTop", "uFront", "uSide",
                "uDeep", "uLight", "uGrad", "uAo", "uGlow", "uGlowR",
            ]) {
                const loc = gl.getUniformLocation(program, name)
                if (loc === null) throw new Error(`uniform ${name} missing`)
                U[name] = loc
            }
        } catch (err) {
            console.error("CubeMadeLattice:", err)
            return
        }

        const vao = gl.createVertexArray()
        gl.bindVertexArray(vao)
        const geo = cubeGeometry()
        const geoBuf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, geoBuf)
        gl.bufferData(gl.ARRAY_BUFFER, geo, gl.STATIC_DRAW)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0)
        gl.enableVertexAttribArray(1)
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12)
        const instBuf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, instBuf)
        gl.enableVertexAttribArray(2)
        gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 16, 0)
        gl.vertexAttribDivisor(2, 1)
        gl.bindVertexArray(null)

        let gridN = 0
        let inst = new Float32Array(0)
        let centers = new Float32Array(0)
        let edges = new Float32Array(0)
        const buildGrid = (N: number) => {
            gridN = N
            const total = N * N * N
            inst = new Float32Array(total * 4)
            centers = new Float32Array(total * 3)
            edges = new Float32Array(total)
            let c = 0
            for (let i = 0; i < N; i++)
                for (let j = 0; j < N; j++)
                    for (let k = 0; k < N; k++) {
                        const x = -1 + ((i + 0.5) * 2) / N
                        const y = -1 + ((j + 0.5) * 2) / N
                        const z = -1 + ((k + 0.5) * 2) / N
                        centers[c * 3] = x
                        centers[c * 3 + 1] = y
                        centers[c * 3 + 2] = z
                        const a = [Math.abs(x), Math.abs(y), Math.abs(z)].sort((m, n) => n - m)
                        edges[c] = Math.pow(a[1], 3) + 0.5 * Math.pow(a[2], 3)
                        c++
                    }
            gl.bindBuffer(gl.ARRAY_BUFFER, instBuf)
            gl.bufferData(gl.ARRAY_BUFFER, inst.byteLength, gl.DYNAMIC_DRAW)
        }

        let noiseSeed = NaN
        let noise = makeNoise(0)

        let cssW = root.offsetWidth
        let cssH = root.offsetHeight
        const ro = new ResizeObserver(() => {
            cssW = root.offsetWidth
            cssH = root.offsetHeight
        })
        ro.observe(root)

        const ptr = { x: 0, y: 0, sx: 0, sy: 0, inside: false, pressed: false, over: 0, down: 0, seen: false }
        const drag = { active: false, lastX: 0, lastY: 0, yaw: 0, pitch: 0 }
        root.style.cursor = "grab"
        const onMove = (e: PointerEvent) => {
            ptr.x = e.offsetX
            ptr.y = e.offsetY
            if (!ptr.seen) {
                ptr.sx = ptr.x
                ptr.sy = ptr.y
                ptr.seen = true
            }
            ptr.inside = true
            if (drag.active) {
                const dx = e.clientX - drag.lastX
                const dy = e.clientY - drag.lastY
                drag.lastX = e.clientX
                drag.lastY = e.clientY
                const sens = Math.max(0, propsRef.current.dragSensitivity ?? 50) / 50
                drag.yaw += dx * 0.006 * sens
                drag.pitch = Math.max(-1.4, Math.min(1.4, drag.pitch - dy * 0.006 * sens))
            }
        }
        const onEnter = (e: PointerEvent) => onMove(e)
        const onLeave = () => {
            ptr.inside = false
        }
        const onDown = (e: PointerEvent) => {
            onMove(e)
            ptr.pressed = true
            drag.active = true
            drag.lastX = e.clientX
            drag.lastY = e.clientY
            root.style.cursor = "grabbing"
            try {
                root.setPointerCapture(e.pointerId)
            } catch {}
        }
        const onUp = () => {
            ptr.pressed = false
            drag.active = false
            root.style.cursor = "grab"
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerenter", onEnter)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerdown", onDown)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        const reduced =
            typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null

        let raf = 0
        let last = -1
        let phase = 0
        const DEG = Math.PI / 180

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 0.05)
            last = now
            const p = propsRef.current
            const adv: Adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
            const dpr = Math.min(window.devicePixelRatio || 1, 2)

            const W = Math.max(1, Math.round(cssW * dpr))
            const H = Math.max(1, Math.round(cssH * dpr))
            if (canvas.width !== W || canvas.height !== H) {
                canvas.width = W
                canvas.height = H
            }

            const hk = Math.max(0, adv.hover) / 50
            ptr.over += ((ptr.inside ? 1 : 0) - ptr.over) * (1 - Math.exp(-dt * 6))
            ptr.down += ((ptr.pressed ? 1 : 0) - ptr.down) * (1 - Math.exp(-dt * 10))
            const pe = 1 - Math.exp(-dt * 12)
            ptr.sx += (ptr.x - ptr.sx) * pe
            ptr.sy += (ptr.y - ptr.sy) * pe
            const over = ptr.over * hk

            const sp = Math.min(100, Math.max(0, p.speed ?? 50))
            if (!(reduced && reduced.matches)) {
                phase = (phase + (dt * (sp / 50)) / Math.max(adv.loopMs / 1000, 0.5)) % 1
            }
            const th = phase * Math.PI * 2

            if (adv.seed !== noiseSeed) {
                noiseSeed = adv.seed
                noise = makeNoise(adv.seed)
            }
            const N = Math.min(24, Math.max(2, Math.round(p.density ?? 10)))
            if (N !== gridN) buildGrid(N)

            // pose and framing (base pose sets the scale so tilt never resizes)
            const D = Math.max(adv.camera / 10, 2.2)
            const yawB = -adv.yaw * DEG
            const pitchB = adv.pitch * DEG
            const MB = rotation(yawB, pitchB)
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
            for (let c = 0; c < 8; c++) {
                const x = c & 1 ? 1 : -1, y = c & 2 ? 1 : -1, z = c & 4 ? 1 : -1
                const vx = MB[0] * x + MB[1] * y + MB[2] * z
                const vy = MB[3] * x + MB[4] * y + MB[5] * z
                const vz = MB[6] * x + MB[7] * y + MB[8] * z
                const ps = D / Math.max(D - vz, 0.05)
                const X = vx * ps, Y = -vy * ps
                if (X < minX) minX = X
                if (X > maxX) maxX = X
                if (Y < minY) minY = Y
                if (Y > maxY) maxY = Y
            }
            const sizePx = Math.max(20, p.size ?? 380) * dpr
            const k = sizePx / Math.max(maxY - minY, 1e-3)
            const cX = (W * adv.centerX) / 100 - ((minX + maxX) / 2) * k
            const cY = (H * adv.centerY) / 100 - ((minY + maxY) / 2) * k

            const tx = cssW > 0 ? (ptr.sx / cssW - 0.5) * 2 : 0
            const ty = cssH > 0 ? (ptr.sy / cssH - 0.5) * 2 : 0
            const hoverK = drag.active ? 0 : over
            const M = rotation(
                yawB + drag.yaw + tx * adv.tilt * DEG * hoverK,
                pitchB + drag.pitch + ty * adv.tilt * 0.6 * DEG * hoverK
            )

            // voxel field
            const f = adv.noiseScale / 100
            const f2 = f * (adv.detailScale / 100)
            const R = adv.drift / 100
            const c1x = R * Math.cos(th), c1y = R * Math.sin(th)
            const c2y = R * 0.8 * Math.cos(th + 1.7), c2z = R * 0.8 * Math.sin(th + 1.7)
            const ero = Math.min(100, Math.max(0, p.erosion ?? 50))
            const thr = (0.1 * ero) / 100 - 0.02
            const soft = Math.max(adv.softness / 100, 0.005)
            const detail = adv.detail / 100
            const edgeW = adv.edgeErosion / 100
            const fill = adv.fill / 100
            const minS = adv.minCube / 100
            const carveAmt = Math.min(0.95, (adv.carve / 100) * (0.6 + 0.6 * ptr.down) * over)
            const carveR = Math.max((sizePx * adv.carveRadius) / 100, 1)
            const pX = ptr.sx * dpr, pY = ptr.sy * dpr
            const total = N * N * N
            for (let c = 0; c < total; c++) {
                const x = centers[c * 3], y = centers[c * 3 + 1], z = centers[c * 3 + 2]
                const n1 = noise(x * f + c1x, y * f + c1y, z * f)
                const n2 = noise(x * f2 + 31.7, y * f2 + c2y + 11.3, z * f2 + c2z)
                const r = Math.abs(n1) - edgeW * edges[c]
                let s = smoothstep(thr, thr + soft, r)
                s *= 1 - detail * Math.min(1, Math.max(0, 0.5 - n2))
                if (carveAmt > 0.001) {
                    const vx = M[0] * x + M[1] * y + M[2] * z
                    const vy = M[3] * x + M[4] * y + M[5] * z
                    const vz = M[6] * x + M[7] * y + M[8] * z
                    const ps = D / Math.max(D - vz, 0.05)
                    const dx = cX + vx * ps * k - pX
                    const dy = cY - vy * ps * k - pY
                    s *= 1 - carveAmt * Math.exp(-(dx * dx + dy * dy) / (carveR * carveR))
                }
                if (s < minS) s = 0
                inst[c * 4] = x
                inst[c * 4 + 1] = y
                inst[c * 4 + 2] = z
                inst[c * 4 + 3] = (fill * s) / N
            }

            const cols = deriveColors(parseColor(p.baseColor, BASE_FALLBACK), adv)
            const la = adv.lightAngle * DEG

            gl.viewport(0, 0, W, H)
            gl.clearColor(0, 0, 0, 0)
            gl.clearDepth(1)
            gl.enable(gl.DEPTH_TEST)
            gl.depthFunc(gl.LESS)
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
            gl.useProgram(program)
            gl.uniformMatrix3fv(U.uModel, true, new Float32Array(M))
            gl.uniform2f(U.uCenter, cX, cY)
            gl.uniform1f(U.uPx, k)
            gl.uniform1f(U.uDist, D)
            gl.uniform2f(U.uRes, W, H)
            gl.uniform3fv(U.uTop, cols.top)
            gl.uniform3fv(U.uFront, cols.front)
            gl.uniform3fv(U.uSide, cols.side)
            gl.uniform3fv(U.uDeep, cols.deep)
            gl.uniform2f(U.uLight, -Math.sin(la), Math.cos(la))
            gl.uniform1f(U.uGrad, adv.gradient / 100)
            gl.uniform1f(U.uAo, adv.ao / 100)
            gl.uniform3f(U.uGlow, pX, pY, (adv.glow / 100) * over * (1 + 0.5 * ptr.down))
            gl.uniform1f(U.uGlowR, carveR * 1.4)
            gl.bindVertexArray(vao)
            gl.bindBuffer(gl.ARRAY_BUFFER, instBuf)
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, inst)
            gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, total)
            gl.bindVertexArray(null)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerenter", onEnter)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
            gl.deleteBuffer(geoBuf)
            gl.deleteBuffer(instBuf)
            gl.deleteVertexArray(vao)
            gl.deleteProgram(program)
            gl.deleteShader(vs)
            gl.deleteShader(fs)
        }
    }, [])

    const adv: Adv = { ...ADVANCED_DEFAULTS, ...(props.advanced ?? {}) }
    const glowColor = toCss(deriveColors(parseColor(baseColor, BASE_FALLBACK), adv).side)
    const floorW = (size * adv.floorWidth) / 100
    const vig = Math.min(1, Math.max(0, adv.vignette / 100))
    const grain = Math.min(1, Math.max(0, adv.grain / 100))

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
                isolation: "isolate",
                touchAction: "none",
                ...style,
            }}
        >
            <div
                style={{
                    position: "absolute",
                    left: `${adv.centerX}%`,
                    top: `calc(${adv.centerY}% + ${(size * adv.floorOffset) / 100}px)`,
                    width: floorW,
                    height: floorW * 0.22,
                    transform: "translate(-50%, -50%)",
                    borderRadius: "50%",
                    background: `radial-gradient(closest-side, ${glowColor} 0%, ${glowColor} 25%, transparent 100%)`,
                    opacity: Math.min(1, Math.max(0, adv.floorGlow / 100)),
                    pointerEvents: "none",
                }}
            />
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
            />
            {vig > 0 && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        background: `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,${vig}) 100%)`,
                    }}
                />
            )}
            {grain > 0 && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        backgroundImage: GRAIN_URL,
                        backgroundSize: "220px 220px",
                        opacity: grain * 0.6,
                        mixBlendMode: "overlay",
                    }}
                />
            )}
        </div>
    )
}
