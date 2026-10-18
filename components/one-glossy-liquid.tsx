"use client"

import type { CSSProperties } from "react"
import * as React from "react"
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
    colorPeriodMs: 2800,
    morphPeriodMs: 10400,
    rotation: 45,
    bandSpan: 50,
    amp4: 200,
    ampHi: 100,
    edgeSoft: 0,
    rimWidth: 25,
    rimShift: 40,
    rimStrength: 100,
    innerShadow: 30,
    highlight: 20,
    haloNear: 10,
    haloFar: 20,
    haloNearStrength: 100,
    haloFarStrength: 60,
    haloLowerBias: 70,
    bloom: 55,
    haloWarm: "#F0381E",
    haloCool: "#5E5AE8",
    colorBlue: "#3C36BA",
    colorDark: "#140A16",
    colorRed: "#E8301A",
    colorOrange: "#FF7A1A",
    colorYellow: "#FFE878",
    colorWhite: "#FFFDF6",
    colorLilac: "#D6D2FF",
    colorPeriwinkle: "#6C6EF6",
    offsetX: 0,
    offsetY: 0,
    exposure: 110,
    grain: 0,
    vignette: 0,
}

type RGB = [number, number, number]

function parseColor(c: unknown, fb: RGB): RGB {
    if (typeof c !== "string") return fb
    const s = c.trim()
    const v = s.match(/^var\([^,]+,\s*(.+)\)$/)
    if (v) return parseColor(v[1], fb)
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4)
            h = h
                .split("")
                .map((x) => x + x)
                .join("")
        if (h.length >= 6) {
            const n = parseInt(h.slice(0, 6), 16)
            if (!isNaN(n))
                return [
                    ((n >> 16) & 255) / 255,
                    ((n >> 8) & 255) / 255,
                    (n & 255) / 255,
                ]
        }
        return fb
    }
    const m = s.match(/rgba?\(([^)]+)\)/i)
    if (m) {
        const p = m[1]
            .split(/[\s,\/]+/)
            .filter(Boolean)
            .map(parseFloat)
        if (p.length >= 3 && !isNaN(p[0]) && !isNaN(p[1]) && !isNaN(p[2]))
            return [p[0] / 255, p[1] / 255, p[2] / 255]
    }
    return fb
}

// Outline keyframes over one reference morph cycle (seconds):
// [t, a0 base growth, a2, a4 (dominant lobes), a8 (2× lobes), hi (k=6/7)]
const MORPH_PERIOD = 10.4
const MORPH_KEYS: number[][] = [
    [0.0, -0.06, 0.0, 0.075, 0.012, 0.0],
    [0.3, -0.03, 0.0, 0.04, 0.004, 0.0],
    [0.65, -0.005, 0.0, 0.01, 0.0, 0.0],
    [1.3, 0.0, 0.0, 0.0, 0.0, 0.003],
    [2.0, -0.005, 0.01, -0.012, 0.0, 0.006],
    [2.71, -0.02, 0.01, -0.045, 0.006, 0.01],
    [3.33, -0.02, 0.0, 0.04, 0.004, 0.012],
    [3.96, -0.02, 0.0, 0.05, 0.0, 0.02],
    [4.58, -0.03, 0.0, -0.06, 0.006, 0.01],
    [5.21, -0.04, 0.0, -0.11, 0.012, 0.008],
    [5.83, 0.03, 0.0, -0.03, 0.004, 0.05],
    [6.46, 0.03, 0.0, 0.0, 0.0, 0.05],
    [7.08, 0.015, 0.01, 0.01, 0.0, 0.02],
    [7.92, 0.005, 0.01, 0.0, 0.0, 0.005],
    [8.54, 0.0, 0.005, 0.0, 0.0, 0.003],
    [9.17, 0.0, 0.015, 0.0, 0.0, 0.004],
    [9.79, 0.0, 0.04, 0.015, 0.0, 0.006],
]

function sampleMorph(t: number): number[] {
    const n = MORPH_KEYS.length
    const tt = ((t % MORPH_PERIOD) + MORPH_PERIOD) % MORPH_PERIOD
    let i = n - 1
    for (let k = 0; k < n; k++) {
        const t0 = MORPH_KEYS[k][0]
        const t1 = k + 1 < n ? MORPH_KEYS[k + 1][0] : MORPH_PERIOD
        if (tt >= t0 && tt < t1) {
            i = k
            break
        }
    }
    const key = (j: number) => {
        const jj = ((j % n) + n) % n
        const wrap = Math.floor(j / n)
        return { t: MORPH_KEYS[jj][0] + wrap * MORPH_PERIOD, v: MORPH_KEYS[jj] }
    }
    const p0 = key(i - 1)
    const p1 = key(i)
    const p2 = key(i + 1)
    const p3 = key(i + 2)
    const h = Math.max(p2.t - p1.t, 1e-4)
    const s = (tt - p1.t) / h
    const s2 = s * s
    const s3 = s2 * s
    const h00 = 2 * s3 - 3 * s2 + 1
    const h10 = s3 - 2 * s2 + s
    const h01 = -2 * s3 + 3 * s2
    const h11 = s3 - s2
    const out: number[] = []
    for (let c = 1; c < 6; c++) {
        const m1 = (p2.v[c] - p0.v[c]) / Math.max(p2.t - p0.t, 1e-4)
        const m2 = (p3.v[c] - p1.v[c]) / Math.max(p3.t - p1.t, 1e-4)
        out.push(h00 * p1.v[c] + h10 * h * m1 + h01 * p2.v[c] + h11 * h * m2)
    }
    return out
}

const VERT = `#version 300 es
void main() {
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec2 uCenter;
uniform float uR;
uniform vec4 uAmp;
uniform vec2 uHi;
uniform vec4 uPh;
uniform vec2 uPull;
uniform vec2 uLight;
uniform float uK;
uniform float uShift;
uniform float uSpan;
uniform vec3 uRamp[8];
uniform vec4 uRim;
uniform float uEdge;
uniform float uHighlight;
uniform vec4 uHalo;
uniform float uLowerBias;
uniform float uBloom;
uniform vec3 uHaloWarm;
uniform vec3 uHaloCool;
uniform vec3 uBg;
uniform float uExposure;
uniform float uGrain;
uniform float uVignette;
uniform float uTime;
out vec4 o;

// blue → dark → red → orange → yellow → white → lilac → periwinkle → blue
const float P[9] = float[9](0.0, 0.20, 0.32, 0.42, 0.55, 0.70, 0.84, 0.92, 1.0);

vec3 ramp(float u) {
    u = fract(u);
    vec3 c = uRamp[0];
    for (int i = 0; i < 8; i++) {
        if (u >= P[i] && u <= P[i + 1]) {
            float f = (u - P[i]) / max(P[i + 1] - P[i], 1e-4);
            f = f * f * (3.0 - 2.0 * f);
            c = mix(uRamp[i], uRamp[(i + 1) % 8], f);
        }
    }
    return c;
}

float warmth(float u) {
    u = fract(u);
    return smoothstep(0.22, 0.32, u) * (1.0 - smoothstep(0.76, 0.86, u));
}

float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 q = (frag - uCenter) / max(uR, 1.0);
    float rho = length(q);
    float th = atan(q.y, q.x);
    float a = th - uPh.x;

    float r = 1.0 + uAmp.x
        + uAmp.y * cos(2.0 * a + uPh.y)
        + uAmp.z * cos(uK * a)
        + uAmp.w * cos(2.0 * uK * a)
        + uHi.x * cos(6.0 * th + uPh.z)
        + uHi.y * cos(7.0 * th + uPh.w);
    float dr = -2.0 * uAmp.y * sin(2.0 * a + uPh.y)
        - uK * uAmp.z * sin(uK * a)
        - 2.0 * uK * uAmp.w * sin(2.0 * uK * a)
        - 6.0 * uHi.x * sin(6.0 * th + uPh.z)
        - 7.0 * uHi.y * sin(7.0 * th + uPh.w);
    // hover: a soft bulge reaching toward the pointer
    float pa = th - uPull.x;
    float pc = max(cos(pa), 0.0);
    r += uPull.y * pc * pc * pc * pc;
    dr -= 4.0 * uPull.y * pc * pc * pc * sin(pa);
    r = max(r, 0.2);
    float d = (rho - r) / sqrt(1.0 + (dr * dr) / (r * r));

    float aa = 1.5 / max(uR, 1.0);
    float soft = max(uEdge, aa);
    float inside = 1.0 - smoothstep(-soft, soft, d);
    float u = q.y * uSpan + uShift;

    // body: scrolling vertical ramp, soft gloss from the top-left
    vec3 base = ramp(u);
    vec3 body = base;
    float rn = clamp(rho / r, 0.0, 1.0);
    vec3 n = normalize(vec3(q / r, sqrt(max(1.0 - rn * rn, 0.0)) + 0.15));
    vec3 L = normalize(vec3(uLight, 0.6));
    float spec = pow(max(dot(n, L), 0.0), 6.0);
    body += uHighlight * spec * (body * 0.6 + 0.2);

    // soft rim crescent, strongest on the lit (top-left) side, with a faint dark line at its outer edge
    float ind = max(-d, 0.0);
    vec2 dir = rho > 1e-4 ? q / rho : vec2(0.0, 1.0);
    vec2 lightDir = length(uLight) > 1e-4 ? normalize(uLight) : vec2(-0.6, 0.8);
    float lightSide = 0.5 + 0.5 * dot(dir, lightDir);
    float rimSide = smoothstep(0.2, 0.95, lightSide);
    float w = max(uRim.x * (0.5 + 0.8 * lightSide), 1e-4);
    float rimBand = exp(-pow(ind / w, 2.0));
    vec3 rimCol = ramp(u + uRim.y);
    body = mix(body, rimCol, clamp(rimBand * uRim.z * (0.2 + 0.8 * rimSide), 0.0, 1.0));
    float hair = exp(-pow((ind - w * 0.35) / (w * 0.2), 2.0)) * rimSide;
    body *= 1.0 - uRim.w * 0.6 * hair;

    // halo: pale bloom at the edge, a near ring and a wide lower glow; order swaps with warmth
    float od = max(d, 0.0);
    float nW = max(uHalo.x, 1e-3);
    float fW = max(uHalo.y, 1e-3);
    float bloomB = exp(-pow(od / (nW * 0.4), 2.0));
    float nearB = exp(-pow((od - nW * 0.6) / nW, 2.0));
    float farB = exp(-pow((od - fW * 0.5) / fW, 2.0));
    float wm = warmth(u);
    vec3 nearCol = mix(uHaloCool, uHaloWarm, wm);
    vec3 farCol = mix(uHaloWarm, uHaloCool, wm);
    float lowerW = mix(1.0, 0.35 + 1.1 * smoothstep(0.5, -0.9, q.y), uLowerBias);
    vec3 halo = base * bloomB * uBloom
        + nearCol * nearB * uHalo.z
        + farCol * farB * uHalo.w * (1.0 - 0.5 * nearB) * lowerW;

    vec3 col = mix(uBg + halo, body, inside);
    col *= uExposure;

    vec2 vq = (frag / uRes - 0.5) * vec2(uRes.x / max(uRes.y, 1.0), 1.0);
    col *= 1.0 - uVignette * smoothstep(0.3, 1.0, length(vq));
    col += (hash(frag + fract(uTime) * 137.0) - 0.5) * uGrain * 0.25;

    o = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

export interface OneGlossyLiquidProps {
    background?: string
    glow?: number
    speed?: number
    size?: number
    wobble?: number
    lobes?: number
    hover?: number
    advanced?: {
        colorPeriodMs?: number
        morphPeriodMs?: number
        rotation?: number
        bandSpan?: number
        amp4?: number
        ampHi?: number
        edgeSoft?: number
        rimWidth?: number
        rimShift?: number
        rimStrength?: number
        innerShadow?: number
        highlight?: number
        haloNear?: number
        haloFar?: number
        haloNearStrength?: number
        haloFarStrength?: number
        haloLowerBias?: number
        bloom?: number
        haloWarm?: string
        haloCool?: string
        colorBlue?: string
        colorDark?: string
        colorRed?: string
        colorOrange?: string
        colorYellow?: string
        colorWhite?: string
        colorLilac?: string
        colorPeriwinkle?: string
        offsetX?: number
        offsetY?: number
        exposure?: number
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
export default function OneGlossyLiquid(props: OneGlossyLiquidProps) {
    const {
        speed = 50,
        size = 391,
        wobble = 50,
        lobes = 5,
        glow = 0,
        hover = 100,
        background = "#000000",
        style,
    } = props

    const wrapRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef(props)
    propsRef.current = props

    useEffect(() => {
        const wrap = wrapRef.current
        const canvas = canvasRef.current
        if (!wrap || !canvas) return
        const gl = canvas.getContext("webgl2", {
            antialias: false,
            alpha: false,
            premultipliedAlpha: false,
            preserveDrawingBuffer: true,
        })
        if (!gl) return

        const compile = (type: number, src: string) => {
            const sh = gl.createShader(type)
            if (!sh) throw new Error("shader alloc failed")
            gl.shaderSource(sh, src)
            gl.compileShader(sh)
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS))
                throw new Error(gl.getShaderInfoLog(sh) || "shader compile failed")
            return sh
        }
        const vs = compile(gl.VERTEX_SHADER, VERT)
        const fs = compile(gl.FRAGMENT_SHADER, FRAG)
        const prog = gl.createProgram()
        if (!prog) throw new Error("program alloc failed")
        gl.attachShader(prog, vs)
        gl.attachShader(prog, fs)
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
            throw new Error(gl.getProgramInfoLog(prog) || "program link failed")
        const vao = gl.createVertexArray()

        const U = (name: string) => {
            const loc = gl.getUniformLocation(prog, name)
            if (loc === null) throw new Error(`missing uniform ${name}`)
            return loc
        }
        const loc = {
            res: U("uRes"),
            center: U("uCenter"),
            r: U("uR"),
            amp: U("uAmp"),
            hi: U("uHi"),
            ph: U("uPh"),
            pull: U("uPull"),
            light: U("uLight"),
            k: U("uK"),
            shift: U("uShift"),
            span: U("uSpan"),
            ramp: U("uRamp"),
            rim: U("uRim"),
            edge: U("uEdge"),
            highlight: U("uHighlight"),
            halo: U("uHalo"),
            lowerBias: U("uLowerBias"),
            bloom: U("uBloom"),
            haloWarm: U("uHaloWarm"),
            haloCool: U("uHaloCool"),
            bg: U("uBg"),
            exposure: U("uExposure"),
            grain: U("uGrain"),
            vignette: U("uVignette"),
            time: U("uTime"),
        }

        let W = 1
        let H = 1
        let cssW = 1
        let cssH = 1
        let dpr = 1
        const resize = () => {
            dpr = Math.min(window.devicePixelRatio || 1, 2)
            cssW = Math.max(1, wrap.offsetWidth)
            cssH = Math.max(1, wrap.offsetHeight)
            W = Math.max(1, Math.round(cssW * dpr))
            H = Math.max(1, Math.round(cssH * dpr))
            if (canvas.width !== W) canvas.width = W
            if (canvas.height !== H) canvas.height = H
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(wrap)

        const target = RenderTarget.current()
        const isStatic =
            target === RenderTarget.thumbnail || target === RenderTarget.export
        const mq =
            typeof window !== "undefined" && window.matchMedia
                ? window.matchMedia("(prefers-reduced-motion: reduce)")
                : null
        let reduced = !!mq?.matches
        const onMq = () => {
            reduced = !!mq?.matches
        }
        mq?.addEventListener?.("change", onMq)

        const rampBuf = new Float32Array(24)
        let raf = 0
        let last = -1
        let T = 0
        let clock = 0

        // Pointer in CSS px (offsetX/Y stay in the element's own space, unaffected by canvas zoom)
        const ptr = { x: 0, y: 0, over: false }
        let hx = 0
        let hy = 0
        let seeded = false
        let hoverAmt = 0
        const onMove = (e: PointerEvent) => {
            ptr.x = e.offsetX
            ptr.y = e.offsetY
            ptr.over = true
        }
        const onLeave = () => {
            ptr.over = false
        }
        canvas.addEventListener("pointerenter", onMove)
        canvas.addEventListener("pointermove", onMove)
        canvas.addEventListener("pointerleave", onLeave)
        window.addEventListener("pointercancel", onLeave)

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            clock += dt

            const p = propsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
            const sp = Math.max(0, Math.min(100, p.speed ?? 50))
            const frozen = reduced || isStatic
            if (!frozen) T += dt * (sp / 50)

            const morphScale = 10400 / Math.max(2000, adv.morphPeriodMs)
            const morphT = frozen ? 1.6 : T * morphScale
            const colorShift = frozen
                ? 0.61
                : T / (Math.max(500, adv.colorPeriodMs) / 1000)
            const phi = frozen ? 0 : ((-adv.rotation * Math.PI) / 180) * T

            const m = sampleMorph(morphT)
            const wob = Math.max(0, p.wobble ?? 50) / 50
            const mod4 = 1 + 0.18 * Math.sin((2 * Math.PI * T) / 27.3 + 0.6)
            const modHi = 1 + 0.3 * Math.sin((2 * Math.PI * T) / 17.9 + 1.1)
            const s4 = (adv.amp4 / 100) * wob * mod4
            const sHi = (adv.ampHi / 100) * wob * modHi
            const a0 = m[0] * wob
            const a2 = m[1] * sHi
            const a4 = m[2] * s4
            const a8 = m[3] * s4
            const hi = m[4] * sHi

            // The default diameter (560 px) is 71% of the short side; shrink the whole
            // effect proportionally when the frame is too small to hold it with its halo.
            const sizePx = Math.max(10, p.size ?? 560)
            const fit = Math.min(1, (Math.min(cssW, cssH) * 0.71) / 560)
            const R = (sizePx / 2) * fit * dpr
            const cx = W * (0.5 + adv.offsetX / 100)
            const cy = H * (0.5 - adv.offsetY / 100)

            const g = Math.max(0, p.glow ?? 60) / 60
            const widthScale = 0.7 + 0.3 * g

            // Hover: the blob leans and bulges toward the pointer, swells a little,
            // and its gloss and rim swing round to face it. Eased in and out.
            const hv = isStatic
                ? 0
                : Math.max(0, Math.min(100, p.hover ?? 50)) / 50
            hoverAmt +=
                ((ptr.over && hv > 0 ? 1 : 0) - hoverAmt) *
                (1 - Math.exp(-dt * 4))
            if (ptr.over) {
                const tx = ptr.x * dpr
                const ty = (cssH - ptr.y) * dpr
                if (!seeded) {
                    hx = tx
                    hy = ty
                    seeded = true
                }
                const follow = 1 - Math.exp(-dt * 7)
                hx += (tx - hx) * follow
                hy += (ty - hy) * follow
            }
            const vx = seeded ? (hx - cx) / Math.max(R, 1) : 0
            const vy = seeded ? (hy - cy) / Math.max(R, 1) : 0
            const dist = Math.hypot(vx, vy)
            const near = Math.min(1, dist / 0.4)
            const hAmt = hv * hoverAmt
            const pullAngle = Math.atan2(vy, vx)
            const pull =
                0.09 * hAmt * near * Math.exp(-Math.max(dist - 1, 0) * 0.7)
            const nudge = (0.05 * hAmt * R) / Math.max(dist, 1)
            const ccx = cx + nudge * vx
            const ccy = cy + nudge * vy
            const swell = 0.025 * hAmt
            const lt = 0.8 * Math.min(hAmt, 1) * Math.min(1, dist / 0.3)
            const ldx = dist > 1e-4 ? (vx / dist) * 0.78 : -0.45
            const ldy = dist > 1e-4 ? (vy / dist) * 0.78 : 0.65
            const lx = -0.45 + (ldx + 0.45) * lt
            const ly = 0.65 + (ldy - 0.65) * lt

            const ramp: RGB[] = [
                parseColor(adv.colorBlue, [0.24, 0.21, 0.73]),
                parseColor(adv.colorDark, [0.08, 0.04, 0.09]),
                parseColor(adv.colorRed, [0.91, 0.19, 0.1]),
                parseColor(adv.colorOrange, [1, 0.48, 0.1]),
                parseColor(adv.colorYellow, [1, 0.91, 0.47]),
                parseColor(adv.colorWhite, [1, 0.99, 0.96]),
                parseColor(adv.colorLilac, [0.84, 0.82, 1]),
                parseColor(adv.colorPeriwinkle, [0.42, 0.43, 0.96]),
            ]
            for (let i = 0; i < 8; i++) {
                rampBuf[i * 3] = ramp[i][0]
                rampBuf[i * 3 + 1] = ramp[i][1]
                rampBuf[i * 3 + 2] = ramp[i][2]
            }

            gl.viewport(0, 0, W, H)
            gl.useProgram(prog)
            gl.bindVertexArray(vao)
            gl.uniform2f(loc.res, W, H)
            gl.uniform2f(loc.center, ccx, ccy)
            gl.uniform1f(loc.r, R)
            gl.uniform4f(loc.amp, a0 + swell, a2, a4, a8)
            gl.uniform2f(loc.pull, pullAngle, pull)
            gl.uniform2f(loc.light, lx, ly)
            gl.uniform2f(loc.hi, hi * 0.6, hi * 0.5)
            gl.uniform4f(
                loc.ph,
                phi,
                0.15 * T + 0.8,
                0.35 * T + 1.0,
                -0.28 * T + 2.3
            )
            gl.uniform1f(loc.k, Math.max(2, Math.round(p.lobes ?? 4)))
            gl.uniform1f(loc.shift, colorShift)
            gl.uniform1f(loc.span, adv.bandSpan / 100 / 2)
            gl.uniform3fv(loc.ramp, rampBuf)
            gl.uniform4f(
                loc.rim,
                adv.rimWidth / 100,
                adv.rimShift / 100,
                adv.rimStrength / 100,
                adv.innerShadow / 100
            )
            gl.uniform1f(loc.edge, adv.edgeSoft / 100)
            gl.uniform1f(loc.highlight, adv.highlight / 100)
            gl.uniform4f(
                loc.halo,
                (adv.haloNear / 100) * widthScale,
                (adv.haloFar / 100) * widthScale,
                (adv.haloNearStrength / 100) * g,
                (adv.haloFarStrength / 100) * g
            )
            gl.uniform1f(loc.lowerBias, adv.haloLowerBias / 100)
            gl.uniform1f(loc.bloom, (adv.bloom / 100) * Math.min(g, 1.5))
            const hw = parseColor(adv.haloWarm, [0.94, 0.22, 0.12])
            const hc = parseColor(adv.haloCool, [0.37, 0.35, 0.91])
            const bg = parseColor(p.background, [0, 0, 0])
            gl.uniform3f(loc.haloWarm, hw[0], hw[1], hw[2])
            gl.uniform3f(loc.haloCool, hc[0], hc[1], hc[2])
            gl.uniform3f(loc.bg, bg[0], bg[1], bg[2])
            gl.uniform1f(loc.exposure, adv.exposure / 100)
            gl.uniform1f(loc.grain, adv.grain / 100)
            gl.uniform1f(loc.vignette, adv.vignette / 100)
            gl.uniform1f(loc.time, clock)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            mq?.removeEventListener?.("change", onMq)
            canvas.removeEventListener("pointerenter", onMove)
            canvas.removeEventListener("pointermove", onMove)
            canvas.removeEventListener("pointerleave", onLeave)
            window.removeEventListener("pointercancel", onLeave)
            gl.deleteVertexArray(vao)
            gl.deleteProgram(prog)
            gl.deleteShader(vs)
            gl.deleteShader(fs)
        }
    }, [])

    return (
        <div
            ref={wrapRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 1200,
                minHeight: 800,
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
        </div>
    )
}
