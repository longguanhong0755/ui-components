"use client"

import type { CSSProperties } from "react"
import * as React from "react"
import { useEffect, useRef } from "react"

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    cycleMs: 4000,
    startMs: 120,
    staggerMs: 2540,
    spinMinMs: 1200,
    spinMaxMs: 2000,
    easing: 50,
    fullSpin: 45,
    slideShare: 33,
    waveMix: 65,
    coinSize: 88,
    thickness: 37,
    cubeHeight: 66,
    yaw: 35,
    pitch: 24,
    fov: 28,
    lightAngle: 135,
    ambient: 42,
    specular: 60,
    rimColor: "#6F8BA8",
    sheenColor: "#6B5BC0",
    sheen: 40,
    pinkShare: 35,
    blueShare: 22,
    floorColor: "#2A2733",
    floorGlow: 45,
    seed: 7,
    pointerRadius: 22,
    pointerLift: 40,
    pointerTurn: 35,
    tilt: 5,
    burstDist: 80,
    burstMs: 1800,
    burstSway: 45,
    hover: 50,
    grain: 0,
    vignette: 0,
}

// ── moved controls (builder) ──
/**
 * Controls moved in the builder: into Advanced, out of it, or into groups of
 * their own. The code reads each one where it was first written, so the props
 * are put back in that shape before anything reads them.
 */
const MOVED_CONTROLS: { into: Record<string, string>; out: Record<string, string> } = {"into":{},"out":{"hover":"advanced"}}
const GROUP_FALLBACKS: Record<string, any> = { advanced: ADVANCED_DEFAULTS }
function withMovedControls(props: any): any {
    const out = { ...props }
    for (const [k, g] of Object.entries(MOVED_CONTROLS.into)) out[k] = props?.[g]?.[k] ?? GROUP_FALLBACKS[g]?.[k]
    for (const [k, g] of Object.entries(MOVED_CONTROLS.out)) {
        if (out[k] !== undefined) out[g] = { ...(out[g] ?? {}), [k]: out[k] }
    }
    return out
}
// ── /moved controls ──

const N = 8
const HALF = (N - 1) / 2
const SEG = 32
const STRIDE = 16

const GRAIN_URL = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.9'/></svg>")`

const COIN_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in float aPart;
layout(location=3) in vec3 iPos;
layout(location=4) in vec3 iNrm;
layout(location=5) in vec4 iAxisAng;
layout(location=6) in vec3 iColA;
layout(location=7) in vec3 iColB;
uniform mat4 uVP;
uniform mat4 uView;
uniform float uRadius;
uniform float uHalfT;
out vec3 vN;
out vec3 vCol;
out float vPart;
out vec3 vViewPos;
vec3 rot(vec3 v, vec3 a, float c, float s) {
    return v * c + cross(a, v) * s + a * dot(a, v) * (1.0 - c);
}
void main() {
    vec3 a = normalize(iAxisAng.xyz);
    vec3 n = normalize(iNrm);
    vec3 b = cross(n, a);
    float c = cos(iAxisAng.w);
    float s = sin(iAxisAng.w);
    vec3 lp = aPos.x * uRadius * a + aPos.y * uRadius * b + aPos.z * uHalfT * n;
    vec3 ln = aNrm.x * a + aNrm.y * b + aNrm.z * n;
    vec3 wp = iPos + rot(lp, a, c, s);
    vec3 wn = rot(ln, a, c, s);
    vN = mat3(uView) * wn;
    vViewPos = (uView * vec4(wp, 1.0)).xyz;
    vCol = aPart < 0.5 ? iColA : iColB;
    vPart = aPart;
    gl_Position = uVP * vec4(wp, 1.0);
}`

const COIN_FS = `#version 300 es
precision highp float;
in vec3 vN;
in vec3 vCol;
in float vPart;
in vec3 vViewPos;
uniform vec3 uLight;
uniform vec3 uRim;
uniform vec3 uSheen;
uniform float uAmb;
uniform float uSpec;
uniform float uSheenAmt;
out vec4 o;
void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(-vViewPos);
    bool rim = vPart > 1.5;
    float ndl = dot(N, uLight);
    float dif = max((ndl + 0.8) / 1.8, 0.0);
    vec3 H = normalize(uLight + V);
    vec3 base = rim ? uRim : vCol;
    float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.0);
    float shin = rim ? 40.0 : 22.0;
    float ks = rim ? uSpec * 1.4 : uSpec * 0.35;
    float sp = pow(max(dot(N, H), 0.0), shin) * ks;
    vec3 col = base * (uAmb * (0.75 + 0.25 * N.y) + (1.0 - uAmb * 0.6) * dif);
    if (rim) {
        col = mix(col, uSheen * (0.5 + max(ndl, 0.0)), clamp(uSheenAmt * (0.35 + fres), 0.0, 1.0));
        col += sp * vec3(0.75, 0.85, 1.0);
    } else {
        col += uSheen * uSheenAmt * 0.35 * fres;
        col += sp * vec3(1.0);
    }
    o = vec4(col, 1.0);
}`

const GLOW_VS = `#version 300 es
precision highp float;
const vec2 P[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() {
    gl_Position = vec4(P[gl_VertexID], 0.0, 1.0);
}`

const GLOW_FS = `#version 300 es
precision highp float;
uniform vec2 uC;
uniform vec2 uR;
uniform vec3 uCol;
uniform float uAmt;
out vec4 o;
void main() {
    vec2 p = (gl_FragCoord.xy - uC) / max(uR, vec2(1.0));
    float d = dot(p, p);
    float g = exp(-d * 2.5) * uAmt;
    o = vec4(uCol, clamp(g, 0.0, 1.0));
}`

function parseColor(c: any, fb: number[]): number[] {
    if (typeof c !== "string") return fb
    let s = c.trim()
    const v = s.match(/var\([^,]+,\s*(.+)\)$/)
    if (v) s = v[1].trim()
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4)
            h = h
                .split("")
                .map((x) => x + x)
                .join("")
        const n = parseInt(h.slice(0, 6), 16)
        if (isNaN(n)) return fb
        return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
    }
    const m = s.match(/rgba?\(([^)]+)\)/)
    if (m) {
        const p = m[1]
            .split(/[\s,\/]+/)
            .filter(Boolean)
            .map(parseFloat)
        if (p.length >= 3) return [p[0] / 255, p[1] / 255, p[2] / 255]
    }
    return fb
}

function hash(a: number, b: number, c: number): number {
    let h =
        Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^
        Math.imul(b + 0x632be5ab, 0xc2b2ae35) ^
        Math.imul(c + 0x27d4eb2f, 0x165667b1)
    h ^= h >>> 15
    h = Math.imul(h, 0x2c1b3c6d)
    h ^= h >>> 12
    h = Math.imul(h, 0x297a2d39)
    h ^= h >>> 15
    return (h >>> 0) / 4294967296
}

function easeInOut(u: number, p: number): number {
    return u < 0.5 ? 0.5 * Math.pow(2 * u, p) : 1 - 0.5 * Math.pow(2 - 2 * u, p)
}

function perspective(fovy: number, aspect: number, near: number, far: number) {
    const f = 1 / Math.tan(fovy / 2)
    const nf = 1 / (near - far)
    return new Float32Array([
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) * nf, -1,
        0, 0, 2 * far * near * nf, 0,
    ])
}

function lookAt(e: number[], t: number[], up: number[]) {
    let zx = e[0] - t[0], zy = e[1] - t[1], zz = e[2] - t[2]
    let l = Math.hypot(zx, zy, zz) || 1
    zx /= l; zy /= l; zz /= l
    let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx
    l = Math.hypot(xx, xy, xz) || 1
    xx /= l; xy /= l; xz /= l
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx
    return new Float32Array([
        xx, yx, zx, 0,
        xy, yy, zy, 0,
        xz, yz, zz, 0,
        -(xx * e[0] + xy * e[1] + xz * e[2]),
        -(yx * e[0] + yy * e[1] + yz * e[2]),
        -(zx * e[0] + zy * e[1] + zz * e[2]),
        1,
    ])
}

function mul(a: Float32Array, b: Float32Array) {
    const o = new Float32Array(16)
    for (let c = 0; c < 4; c++)
        for (let r = 0; r < 4; r++) {
            let s = 0
            for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]
            o[c * 4 + r] = s
        }
    return o
}

function coinMesh(seg: number) {
    const v: number[] = []
    const push = (x: number, y: number, z: number, nx: number, ny: number, nz: number, p: number) =>
        v.push(x, y, z, nx, ny, nz, p)
    for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * Math.PI * 2
        const a1 = ((i + 1) / seg) * Math.PI * 2
        const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1)
        push(0, 0, 1, 0, 0, 1, 0); push(c0, s0, 1, 0, 0, 1, 0); push(c1, s1, 1, 0, 0, 1, 0)
        push(0, 0, -1, 0, 0, -1, 1); push(c1, s1, -1, 0, 0, -1, 1); push(c0, s0, -1, 0, 0, -1, 1)
        push(c0, s0, 1, c0, s0, 0, 2); push(c0, s0, -1, c0, s0, 0, 2); push(c1, s1, 1, c1, s1, 0, 2)
        push(c1, s1, 1, c1, s1, 0, 2); push(c0, s0, -1, c0, s0, 0, 2); push(c1, s1, -1, c1, s1, 0, 2)
    }
    return new Float32Array(v)
}

function buildCoins() {
    const pos: number[] = []
    const nrm: number[] = []
    const axis: number[] = []
    for (let i = 0; i < N; i++)
        for (let j = 0; j < N; j++)
            for (let k = 0; k < N; k++) {
                const x = i - HALF, y = j - HALF, z = k - HALF
                const onX = Math.abs(x) === HALF
                const onY = Math.abs(y) === HALF
                const onZ = Math.abs(z) === HALF
                if (!onX && !onY && !onZ) continue
                const id = (i * N + j) * N + k
                pos.push(x, y, z)
                if (onX || onZ) {
                    const useX = onX && onZ ? hash(id, 1, 3) < 0.5 : onX
                    if (useX) nrm.push(Math.sign(x), 0, 0)
                    else nrm.push(0, 0, Math.sign(z))
                    axis.push(0, 1, 0)
                } else {
                    nrm.push(0, Math.sign(y), 0)
                    if (hash(id, 2, 5) < 0.5) axis.push(1, 0, 0)
                    else axis.push(0, 0, 1)
                }
            }
    return {
        count: pos.length / 3,
        pos: new Float32Array(pos),
        nrm: new Float32Array(nrm),
        axis: new Float32Array(axis),
    }
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
    const sh = gl.createShader(type)
    if (!sh) throw new Error("shader")
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(sh) || "shader compile")
    return sh
}

function makeProgram(gl: WebGL2RenderingContext, vs: string, fs: string) {
    const p = gl.createProgram()
    if (!p) throw new Error("program")
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs))
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs))
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS))
        throw new Error(gl.getProgramInfoLog(p) || "link")
    return p
}

function uni(gl: WebGL2RenderingContext, p: WebGLProgram, name: string) {
    const l = gl.getUniformLocation(p, name)
    if (l === null) throw new Error("uniform " + name)
    return l
}

export interface CubeBuiltAboutProps {
    background?: string
    colorA?: string
    colorB?: string
    colorC?: string
    speed?: number
    scale?: number
    scatter?: number
    dragSens?: number
    hover?: number
    advanced?: {
        cycleMs?: number
        startMs?: number
        staggerMs?: number
        spinMinMs?: number
        spinMaxMs?: number
        easing?: number
        fullSpin?: number
        slideShare?: number
        waveMix?: number
        coinSize?: number
        thickness?: number
        cubeHeight?: number
        yaw?: number
        pitch?: number
        fov?: number
        lightAngle?: number
        ambient?: number
        specular?: number
        rimColor?: string
        sheenColor?: string
        sheen?: number
        pinkShare?: number
        blueShare?: number
        floorColor?: string
        floorGlow?: number
        seed?: number
        pointerRadius?: number
        pointerLift?: number
        pointerTurn?: number
        tilt?: number
        burstDist?: number
        burstMs?: number
        burstSway?: number
        grain?: number
        vignette?: number
    }
    style?: CSSProperties
}

/**
 * Coin cube: ~300 two-sided coins on an 8×8×8 lattice spin and slide on their own,
 * scattering the cube and re-forming it with a new colour pattern every cycle.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function CubeBuiltAbout(props: CubeBuiltAboutProps) {
    props = withMovedControls(props)
    const {
        speed = 50,
        scale = 92,
        background = "#000000",
        colorA = "#7B4ABB",
        colorB = "#88FFE9",
        colorC = "#A9C3D6",
        scatter = 79,
        dragSens = 100,
        style,
    } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef<any>(null)
    propsRef.current = { speed, scale, background, colorA, colorB, colorC, scatter, dragSens, advanced: props.advanced }

    const advNow = { ...ADVANCED_DEFAULTS, ...(props.advanced ?? {}) }

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const gl = canvas.getContext("webgl2", {
            antialias: true,
            alpha: false,
            preserveDrawingBuffer: true,
        }) as WebGL2RenderingContext | null
        if (!gl) return

        let coinProg: WebGLProgram, glowProg: WebGLProgram
        let U: Record<string, WebGLUniformLocation>
        try {
            coinProg = makeProgram(gl, COIN_VS, COIN_FS)
            glowProg = makeProgram(gl, GLOW_VS, GLOW_FS)
            U = {
                vp: uni(gl, coinProg, "uVP"),
                view: uni(gl, coinProg, "uView"),
                radius: uni(gl, coinProg, "uRadius"),
                halfT: uni(gl, coinProg, "uHalfT"),
                light: uni(gl, coinProg, "uLight"),
                rim: uni(gl, coinProg, "uRim"),
                sheen: uni(gl, coinProg, "uSheen"),
                amb: uni(gl, coinProg, "uAmb"),
                spec: uni(gl, coinProg, "uSpec"),
                sheenAmt: uni(gl, coinProg, "uSheenAmt"),
                gC: uni(gl, glowProg, "uC"),
                gR: uni(gl, glowProg, "uR"),
                gCol: uni(gl, glowProg, "uCol"),
                gAmt: uni(gl, glowProg, "uAmt"),
            }
        } catch (err) {
            console.error(err)
            return
        }

        const coins = buildCoins()
        const count = coins.count
        const mesh = coinMesh(SEG)
        const vertCount = mesh.length / 7
        const inst = new Float32Array(count * STRIDE)

        const vao = gl.createVertexArray()
        gl.bindVertexArray(vao)
        const meshBuf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, meshBuf)
        gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0)
        gl.enableVertexAttribArray(1)
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 12)
        gl.enableVertexAttribArray(2)
        gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 28, 24)
        const instBuf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, instBuf)
        gl.bufferData(gl.ARRAY_BUFFER, inst.byteLength, gl.DYNAMIC_DRAW)
        const layout: [number, number, number][] = [
            [3, 3, 0],
            [4, 3, 12],
            [5, 4, 24],
            [6, 3, 40],
            [7, 3, 52],
        ]
        for (const [loc, size, off] of layout) {
            gl.enableVertexAttribArray(loc)
            gl.vertexAttribPointer(loc, size, gl.FLOAT, false, STRIDE * 4, off)
            gl.vertexAttribDivisor(loc, 1)
        }
        gl.bindVertexArray(null)
        const emptyVao = gl.createVertexArray()

        let W = 1, H = 1, dpr = 1
        const resize = () => {
            W = Math.max(1, root.offsetWidth)
            H = Math.max(1, root.offsetHeight)
            dpr = Math.min(2, window.devicePixelRatio || 1)
            canvas.width = Math.round(W * dpr)
            canvas.height = Math.round(H * dpr)
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(root)

        const ptr = {
            x: 0, y: 0, sx: 0, sy: 0, init: false, target: 0, over: 0, pressed: false, down: 0,
            lx: 0, ly: 0, yawOff: 0, pitchOff: 0, mvYaw: 0, mvPitch: 0, vYaw: 0, vPitch: 0,
            dx0: 0, dy0: 0, burst: -1, burstN: 0,
        }
        const dragK = () => (0.3 * Math.max(0, Math.min(100, propsRef.current?.dragSens ?? 50))) / 50
        const onMove = (e: PointerEvent) => {
            if (ptr.pressed) {
                const k = dragK()
                const ddx = (e.clientX - ptr.lx) * k
                const ddy = (e.clientY - ptr.ly) * k
                ptr.yawOff -= ddx
                ptr.pitchOff += ddy
                ptr.mvYaw -= ddx
                ptr.mvPitch += ddy
            }
            ptr.lx = e.clientX
            ptr.ly = e.clientY
            const r = root.getBoundingClientRect ? null : null
            void r
            ptr.x = e.offsetX
            ptr.y = e.offsetY
            if (!ptr.init) {
                ptr.sx = ptr.x
                ptr.sy = ptr.y
                ptr.init = true
            }
            ptr.target = 1
        }
        const onEnter = (e: PointerEvent) => {
            onMove(e)
            ptr.target = 1
        }
        const onLeave = () => {
            ptr.target = 0
        }
        const onDown = (e: PointerEvent) => {
            ptr.lx = e.clientX
            ptr.ly = e.clientY
            ptr.dx0 = e.clientX
            ptr.dy0 = e.clientY
            onMove(e)
            ptr.pressed = true
            ptr.vYaw = 0
            ptr.vPitch = 0
            try {
                root.setPointerCapture(e.pointerId)
            } catch {}
        }
        const onUp = (e: PointerEvent) => {
            // a click (press without a drag) scatters the coins, sways them and re-forms the cube
            if (
                ptr.pressed &&
                e.type === "pointerup" &&
                Math.hypot(e.clientX - ptr.dx0, e.clientY - ptr.dy0) < 6 &&
                ptr.burst < 0
            ) {
                ptr.burst = 0
                ptr.burstN++
            }
            ptr.pressed = false
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerenter", onEnter)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerdown", onDown)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        const reduced =
            typeof window !== "undefined" &&
            window.matchMedia &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches

        let time = 0
        let last = -1
        let raf = 0

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const p = propsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
            let dt = last < 0 ? 0 : (now - last) / 1000
            last = now
            dt = Math.min(dt, 0.05)
            if (!reduced) time += (dt * Math.max(0, Math.min(100, p.speed))) / 50

            if (!ptr.init) {
                ptr.sx = ptr.x = W / 2
                ptr.sy = ptr.y = H / 2
            }
            ptr.over += (ptr.target - ptr.over) * (1 - Math.exp(-dt * 5))
            ptr.down += ((ptr.pressed ? 1 : 0) - ptr.down) * (1 - Math.exp(-dt * 9))
            ptr.sx += (ptr.x - ptr.sx) * (1 - Math.exp(-dt * 8))
            ptr.sy += (ptr.y - ptr.sy) * (1 - Math.exp(-dt * 8))
            const hoverK = Math.max(0, adv.hover) / 50
            const pAmt = ptr.over * hoverK

            // drag to turn the cube; a flick keeps turning and eases out
            if (ptr.pressed) {
                if (dt > 0) {
                    ptr.vYaw = ptr.vYaw * 0.6 + (ptr.mvYaw / dt) * 0.4
                    ptr.vPitch = ptr.vPitch * 0.6 + (ptr.mvPitch / dt) * 0.4
                }
            } else {
                ptr.yawOff += ptr.vYaw * dt
                ptr.pitchOff += ptr.vPitch * dt
                const decay = Math.exp(-dt * 4)
                ptr.vYaw *= decay
                ptr.vPitch *= decay
            }
            ptr.mvYaw = 0
            ptr.mvPitch = 0
            ptr.yawOff = ((ptr.yawOff % 360) + 360) % 360
            ptr.pitchOff = Math.max(-80 - adv.pitch, Math.min(80 - adv.pitch, ptr.pitchOff))

            const nx = (ptr.sx / W - 0.5) * 2
            const ny = (ptr.sy / H - 0.5) * 2
            const yaw = ((adv.yaw + ptr.yawOff + nx * adv.tilt * pAmt) * Math.PI) / 180
            const pitch =
                ((Math.max(-80, Math.min(80, adv.pitch + ptr.pitchOff + ny * adv.tilt * 0.6 * pAmt))) * Math.PI) / 180
            const fov = (Math.max(10, adv.fov) * Math.PI) / 180
            const L = N
            const span = L * (Math.cos(pitch) + Math.abs(Math.sin(pitch)) * (Math.abs(Math.sin(yaw)) + Math.abs(Math.cos(yaw))))
            const frac = Math.max(0.05, (adv.cubeHeight / 100) * (p.scale / 100))
            const dist = span / (2 * Math.tan(fov / 2) * frac) + L * 0.5
            const eye = [
                dist * Math.sin(yaw) * Math.cos(pitch),
                dist * Math.sin(pitch),
                dist * Math.cos(yaw) * Math.cos(pitch),
            ]
            const proj = perspective(fov, W / H, 0.1, dist * 3)
            const view = lookAt(eye, [0, 0, 0], [0, 1, 0])
            const vp = mul(proj, view)
            const project = (x: number, y: number, z: number) => {
                const cx = vp[0] * x + vp[4] * y + vp[8] * z + vp[12]
                const cy = vp[1] * x + vp[5] * y + vp[9] * z + vp[13]
                const cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15] || 1
                return [(cx / cw * 0.5 + 0.5) * W, (1 - (cy / cw * 0.5 + 0.5)) * H]
            }

            const cA = parseColor(p.colorA, [0.84, 0.43, 0.75])
            const cB = parseColor(p.colorB, [0.17, 0.17, 0.4])
            const cC = parseColor(p.colorC, [0.66, 0.76, 0.84])
            const pinkS = adv.pinkShare / 100
            const blueS = adv.blueShare / 100
            const pick = (h: number) => (h < pinkS ? cA : h < pinkS + blueS ? cC : cB)

            const T = Math.max(0.5, adv.cycleMs / 1000)
            const k = Math.floor(time / T)
            const local = time - k * T
            const sd = Math.round(adv.seed) * 1013
            const sc = Math.max(0, Math.min(100, p.scatter)) / 50
            const spread = Math.min(T * 0.6, (adv.staggerMs / 1000) * sc)
            const start = adv.startMs / 1000
            const spinMin = adv.spinMinMs / 1000
            const spinMax = Math.max(spinMin, adv.spinMaxMs / 1000)
            const pw = 1 + Math.max(0, adv.easing) / 25
            const fullShare = adv.fullSpin / 100
            const slideShare = adv.slideShare / 100
            const waveMix = adv.waveMix / 100
            let dx = hash(k, 3, sd + 1) * 2 - 1
            let dy = hash(k, 4, sd + 1) * 2 - 1
            let dz = hash(k, 5, sd + 1) * 2 - 1
            const dl = Math.hypot(dx, dy, dz) || 1
            dx /= dl; dy /= dl; dz /= dl
            const lim = T - 0.06
            const pr = Math.max(1, (adv.pointerRadius / 100) * H)
            const lift = adv.pointerLift / 100
            const turn = (adv.pointerTurn * Math.PI) / 180
            const press = 1 + 0.8 * ptr.down

            // click burst: real time, so it plays even at Speed 0
            let bT = -1
            const bDur = Math.max(0.4, adv.burstMs / 1000)
            if (ptr.burst >= 0) {
                ptr.burst += dt
                if (ptr.burst >= bDur) ptr.burst = -1
                else bT = ptr.burst / bDur
            }
            const bReach = (Math.max(0, adv.burstDist) / 100) * HALF
            const bSway = Math.max(0, adv.burstSway) / 100
            const bn = ptr.burstN

            for (let i = 0; i < count; i++) {
                const px = coins.pos[i * 3], py = coins.pos[i * 3 + 1], pz = coins.pos[i * 3 + 2]
                const nX = coins.nrm[i * 3], nY = coins.nrm[i * 3 + 1], nZ = coins.nrm[i * 3 + 2]
                const w =
                    waveMix * (((px * dx + py * dy + pz * dz) / (HALF * Math.sqrt(3))) * 0.5 + 0.5) +
                    (1 - waveMix) * hash(i, k, sd + 2)
                let d = start + spread * w
                let D = spinMin + (spinMax - spinMin) * hash(i, k, sd + 3)
                if (d + D > lim) {
                    D = Math.max(0.25, lim - d)
                    d = Math.min(d, lim - D)
                }
                const u = Math.max(0, Math.min(1, (local - d) / D))
                const e = easeInOut(u, pw)
                const full = hash(i, k, sd + 4) < fullShare
                const sign = hash(i, k, sd + 5) < 0.5 ? -1 : 1
                const theta = full ? Math.PI * 2 : Math.PI
                let ang = sign * theta * e
                const slide =
                    hash(i, k, sd + 6) < slideShare
                        ? (hash(i, k, sd + 7) < 0.5 ? -1 : 1) * sc * Math.sin(Math.PI * e)
                        : 0

                const sp = project(px, py, pz)
                const dd = Math.hypot(sp[0] - ptr.sx, sp[1] - ptr.sy) / pr
                let f = dd < 1 ? (1 - dd * dd) * (1 - dd * dd) : 0
                f *= pAmt * press
                ang += f * turn * sign

                const prevC = pick(hash(i, k - 1, sd + 101))
                const nextC = pick(hash(i, k, sd + 101))
                const colA = full && Math.abs(ang) > Math.PI ? nextC : prevC
                const colB = full ? pick(hash(i, k, sd + 77)) : nextC

                let bx = 0, by = 0, bz = 0, bAng = 0
                if (bT >= 0) {
                    const lag = hash(i, bn, sd + 31) * 0.12
                    const v = Math.max(0, Math.min(1, (bT - lag) / 0.88))
                    // fly out (ease-out), hang and sway, then ease back into the lattice
                    const env =
                        v < 0.28
                            ? 1 - Math.pow(1 - v / 0.28, 3)
                            : v < 0.52
                              ? 1
                              : 1 - easeInOut((v - 0.52) / 0.48, 3)
                    const pl = Math.hypot(px, py, pz) || 1
                    let ox = px / pl + (hash(i, bn, sd + 32) - 0.5) * 0.8
                    let oy = py / pl + (hash(i, bn, sd + 33) - 0.5) * 0.8
                    let oz = pz / pl + (hash(i, bn, sd + 34) - 0.5) * 0.8
                    const ol = Math.hypot(ox, oy, oz) || 1
                    ox /= ol; oy /= ol; oz /= ol
                    const reach = bReach * (0.5 + hash(i, bn, sd + 35))
                    // sway sideways across the fly-out direction
                    let tx = -oz, tz = ox
                    const tl = Math.hypot(tx, tz) || 1
                    tx /= tl; tz /= tl
                    const ph = hash(i, bn, sd + 36) * Math.PI * 2
                    const sw = Math.sin(ptr.burst * Math.PI * 2 * 1.3 + ph) * bSway * env
                    bx = (ox * reach + tx * sw) * env
                    by = oy * reach * env + Math.cos(ptr.burst * Math.PI * 2 * 0.9 + ph) * bSway * 0.5 * env
                    bz = (oz * reach + tz * sw) * env
                    bAng = Math.sin(ptr.burst * Math.PI * 2 * 1.1 + ph) * bSway * 1.6 * env
                }

                const o = i * STRIDE
                inst[o] = px + nX * f * lift + bx
                inst[o + 1] = py + nY * f * lift + slide + by
                inst[o + 2] = pz + nZ * f * lift + bz
                inst[o + 3] = nX
                inst[o + 4] = nY
                inst[o + 5] = nZ
                inst[o + 6] = coins.axis[i * 3]
                inst[o + 7] = coins.axis[i * 3 + 1]
                inst[o + 8] = coins.axis[i * 3 + 2]
                inst[o + 9] = ang + bAng
                inst[o + 10] = colA[0]
                inst[o + 11] = colA[1]
                inst[o + 12] = colA[2]
                inst[o + 13] = colB[0]
                inst[o + 14] = colB[1]
                inst[o + 15] = colB[2]
            }

            const bg = parseColor(p.background, [0, 0, 0])
            gl.viewport(0, 0, canvas.width, canvas.height)
            gl.clearColor(bg[0], bg[1], bg[2], 1)
            gl.clearDepth(1)
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

            // floor glow under the cube
            const fb = project(0, -HALF - 0.5, 0)
            const cubePx = frac * H
            gl.disable(gl.DEPTH_TEST)
            gl.enable(gl.BLEND)
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
            gl.useProgram(glowProg)
            gl.bindVertexArray(emptyVao)
            gl.uniform2f(U.gC, (fb[0] + cubePx * 0.05) * dpr, (H - fb[1] - cubePx * 0.01) * dpr)
            gl.uniform2f(U.gR, cubePx * 0.62 * dpr, cubePx * 0.11 * dpr)
            const fc = parseColor(adv.floorColor, [0.16, 0.15, 0.2])
            gl.uniform3f(U.gCol, fc[0], fc[1], fc[2])
            gl.uniform1f(U.gAmt, Math.max(0, adv.floorGlow) / 100)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
            gl.disable(gl.BLEND)

            // coins
            gl.enable(gl.DEPTH_TEST)
            gl.depthFunc(gl.LEQUAL)
            gl.useProgram(coinProg)
            gl.bindVertexArray(vao)
            gl.bindBuffer(gl.ARRAY_BUFFER, instBuf)
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, inst)
            gl.uniformMatrix4fv(U.vp, false, vp)
            gl.uniformMatrix4fv(U.view, false, view)
            gl.uniform1f(U.radius, (adv.coinSize / 100) * 0.5)
            gl.uniform1f(U.halfT, Math.max(0.01, (adv.thickness / 100) * 0.5))
            const la = (adv.lightAngle * Math.PI) / 180
            let lx = Math.cos(la) * 0.6, ly = Math.sin(la) * 0.6, lz = 0.75
            const ll = Math.hypot(lx, ly, lz) || 1
            gl.uniform3f(U.light, lx / ll, ly / ll, lz / ll)
            const rc = parseColor(adv.rimColor, [0.44, 0.55, 0.66])
            gl.uniform3f(U.rim, rc[0], rc[1], rc[2])
            const shc = parseColor(adv.sheenColor, [0.42, 0.36, 0.75])
            gl.uniform3f(U.sheen, shc[0], shc[1], shc[2])
            gl.uniform1f(U.amb, Math.max(0, Math.min(100, adv.ambient)) / 100)
            gl.uniform1f(U.spec, Math.max(0, adv.specular) / 100)
            gl.uniform1f(U.sheenAmt, Math.max(0, adv.sheen) / 100)
            gl.drawArraysInstanced(gl.TRIANGLES, 0, vertCount, count)
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
            gl.deleteBuffer(meshBuf)
            gl.deleteBuffer(instBuf)
            gl.deleteVertexArray(vao)
            gl.deleteVertexArray(emptyVao)
            gl.deleteProgram(coinProg)
            gl.deleteProgram(glowProg)
        }
    }, [])

    const vig = Math.max(0, Math.min(100, advNow.vignette)) / 100
    const grain = Math.max(0, Math.min(100, advNow.grain)) / 100

    return (
        <div
            ref={rootRef}
            style={{
                minWidth: 1200,
                minHeight: 800,
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
                isolation: "isolate",
                touchAction: "none",
            }}
        >
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
                        background: `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,${vig * 0.85}) 100%)`,
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
                        backgroundSize: "160px 160px",
                        opacity: grain * 0.6,
                        mixBlendMode: "overlay",
                    }}
                />
            )}
        </div>
    )
}
