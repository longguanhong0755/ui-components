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
    coilRadius: 45,
    tubeRadius: 18,
    pitch: 78,
    startAngle: 203,
    turnMs: 13700,
    cameraDistance: 360,
    letterHeight: 51,
    letterDepth: 33,
    tracking: 2,
    fontWeight: 900,
    faceColor: "#5B005D",
    edgeColor: "#4FD8E8",
    fringeColor: "#AA40E0",
    interiorColor: "#030C38",
    rimColor: "#51676F",
    sheenColor: "#E8ECF5",
    sheen: 51,
    iridescence: 51,
    specular: 100,
    streak: 62,
    ior: 250,
    bounces: 1,
    striations: 100,
    stripeCount: 40,
    haze: 100,
    farDim: 69,
    lightAngle: 35,
    resolution: 100,
    marchSteps: 45,
    innerSteps: 22,
    grain: 0,
    vignette: 0,
}

const TAU = Math.PI * 2
const REF_ASPECT = 1.295 // reference height / width

type RGB = [number, number, number]

function parseColor(input: unknown, fallback: RGB): RGB {
    if (typeof input !== "string" || !input) return fallback
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
    }
    const m = s.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i)
    if (m) return [+m[1] / 255, +m[2] / 255, +m[3] / 255]
    return fallback
}

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

const FRAG = `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 uRes;
uniform float uUnit;
uniform float uTheta;
uniform float uR;
uniform float uTube;
uniform float uK;
uniform float uCam;
uniform sampler2D uText;
uniform float uTextLen;
uniform float uGlyphH;
uniform float uDepth;
uniform vec3 uBg;
uniform vec3 uFace;
uniform vec3 uWall;
uniform vec3 uEdge;
uniform vec3 uFringe;
uniform vec3 uInterior;
uniform vec3 uRim;
uniform vec3 uSheen;
uniform float uSheenAmt;
uniform float uIrid;
uniform float uSpec;
uniform float uStreak;
uniform float uIor;
uniform float uDisp;
uniform float uBounces;
uniform float uStripeAmt;
uniform float uStripeFreq;
uniform float uHaze;
uniform float uFarDim;
uniform vec3 uLight;
uniform float uSteps;
uniform float uInSteps;
uniform float uGrain;
uniform float uVignette;
uniform float uTime;

const float TAU = 6.28318530718;

vec3 helixC(float ph) {
    float a = ph + uTheta;
    return vec3(uR * cos(a), uK * ph, uR * sin(a));
}

float initPhi(vec3 p) {
    float a = atan(p.z, p.x) - uTheta;
    return a + TAU * floor((p.y / uK - a) / TAU + 0.5);
}

float newton(vec3 p, float ph) {
    float a = ph + uTheta;
    float c = cos(a);
    float s = sin(a);
    vec3 d = p - vec3(uR * c, uK * ph, uR * s);
    float g = -dot(d, vec3(-uR * s, uK, uR * c));
    float h = max(uK * uK + uR * (c * p.x + s * p.z), 0.5 * uK * uK);
    return ph - clamp(g / max(h, 1e-5), -0.8, 0.8);
}

float localAt(vec3 q, float ph, out vec3 T, out vec3 N, out vec3 B, out vec3 dq) {
    float a = ph + uTheta;
    float c = cos(a);
    float s = sin(a);
    T = normalize(vec3(-uR * s, uK, uR * c));
    N = vec3(c, 0.0, s);
    B = cross(T, N);
    dq = q - vec3(uR * c, uK * ph, uR * s);
    return dot(dq, dq);
}

float glyph(float sx, float gy) {
    float v = 0.5 - gy / max(uGlyphH, 1e-4);
    if (v < 0.0 || v > 1.0) return 0.0;
    return textureLod(uText, vec2(sx / max(uTextLen, 1e-4), v), 0.0).r;
}

bool insideLetter(vec3 q, float ph, float arcK) {
    ph = newton(q, ph);
    vec3 T; vec3 N; vec3 B; vec3 dq;
    float r2 = localAt(q, ph, T, N, B, dq);
    if (r2 > uTube * uTube) return false;
    float u = dot(dq, N);
    if (abs(u) >= uDepth) return false;
    return glyph(-(ph * arcK + dot(dq, T)), dot(dq, B)) > 0.5;
}

vec3 envRefl(vec3 r) {
    vec3 Lstreak = normalize(vec3(-0.35, 0.9, 0.45));
    float top = smoothstep(-0.3, 0.9, r.y);
    vec3 e = vec3(0.06) + vec3(0.42) * top;
    e += vec3(0.6) * smoothstep(0.80, 0.97, dot(r, uLight));
    e += vec3(1.0) * smoothstep(0.982, 0.995, dot(r, Lstreak)) * uStreak;
    return e;
}

void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 q = (frag - 0.5 * uRes) / uUnit;
    vec3 ro = vec3(0.0, 0.0, uCam);
    vec3 rd = normalize(vec3(q, -uCam));
    vec3 col = uBg;

    float zmax = uR + uTube + 0.01;
    float t = (zmax - uCam) / rd.z;
    float t1 = (-zmax - uCam) / rd.z;
    float minD = 1e3;
    bool hit = false;
    float ph = 0.0;
    vec3 p = ro;

    if (abs(q.x) * (uCam - zmax) / uCam < zmax + 0.03) {
        for (int i = 0; i < 96; i++) {
            if (float(i) >= uSteps) break;
            p = ro + rd * t;
            ph = initPhi(p);
            ph = newton(p, ph);
            ph = newton(p, ph);
            float d = length(p - helixC(ph)) - uTube;
            minD = min(minD, d);
            if (d < 0.0006) { hit = true; break; }
            t += min(d * 0.9, uTube * 0.8);
            if (t > t1) break;
        }
    }

    if (hit) {
        ph = newton(p, ph);
        vec3 T; vec3 N; vec3 B; vec3 dp;
        localAt(p, ph, T, N, B, dp);
        vec3 n = normalize(dp);
        vec3 v = -rd;
        float ndv = clamp(dot(n, v), 0.0, 1.0);
        float F = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
        float arcK = sqrt(uR * uR + uK * uK);
        float arc = ph * arcK;

        vec3 rG = refract(rd, n, 1.0 / uIor);
        vec3 rR = refract(rd, n, 1.0 / max(uIor - uDisp, 1.01));
        vec3 rB = refract(rd, n, 1.0 / (uIor + uDisp));

        // March inside the glass rod; on reaching the far wall, reflect back
        // (internal reflection) so letter slices repeat as stacked rings.
        float stepLen = 2.1 * uTube / max(uInSteps, 1.0);
        vec3 org = p;
        vec3 dir = rG;
        float seg = 0.0;
        float total = 0.0;
        float bounces = 0.0;
        float atten = 1.0;
        float phi = ph;
        bool lhit = false;
        bool face = false;
        float covH = 0.0;
        float uH = 0.0;
        float sxH = 0.0;
        float gyH = 0.0;
        vec3 qh = p;
        vec3 dirH = rG;
        vec3 Th = T; vec3 Nh = N; vec3 Bh = B;
        float prevCov = glyph(-(arc + dot(dp, T)), dot(dp, B));

        for (int i = 1; i <= 144; i++) {
            if (float(i) > uInSteps * (1.0 + uBounces)) break;
            seg += stepLen;
            total += stepLen;
            vec3 qq = org + dir * seg;
            phi = newton(qq, phi);
            vec3 Ti; vec3 Ni; vec3 Bi; vec3 dq;
            float r2 = localAt(qq, phi, Ti, Ni, Bi, dq);
            if (r2 > uTube * uTube) {
                if (bounces >= uBounces) break;
                vec3 nIn = normalize(dq);
                org = org + dir * (seg - stepLen);
                dir = reflect(dir, nIn);
                seg = 0.0;
                bounces += 1.0;
                atten *= 0.72;
                prevCov = 0.0;
                continue;
            }
            float u = dot(dq, Ni);
            float sx = -(phi * arcK + dot(dq, Ti));
            float gy = dot(dq, Bi);
            float cv = glyph(sx, gy);
            if (cv > 0.5 && abs(u) < uDepth) {
                lhit = true;
                face = prevCov > 0.5;
                covH = cv; uH = u; sxH = sx; gyH = gy;
                Th = Ti; Nh = Ni; Bh = Bi;
                qh = qq; dirH = dir;
                break;
            }
            prevCov = cv;
        }

        vec3 interiorC = uInterior * 0.5 * ndv;
        vec3 inner = interiorC;
        if (lhit) {
            float e = uGlyphH * 1.5 / 128.0;
            float gs = glyph(sxH + e, gyH) - glyph(sxH - e, gyH);
            float gw = glyph(sxH, gyH + e) - glyph(sxH, gyH - e);
            vec3 gWorld = gs * Th - gw * Bh;
            vec3 faceN = Nh * (uH >= 0.0 ? 1.0 : -1.0);
            vec3 wallN = length(gWorld) > 1e-4 ? normalize(gWorld) : faceN;
            vec3 nl = face ? faceN : wallN;
            float dif = clamp(dot(nl, uLight), 0.0, 1.0);
            float hv = clamp(dot(nl, -dirH), 0.0, 1.0);
            vec3 letter;
            if (face) {
                letter = uFace * (0.9 + 1.4 * dif) + uWall * 0.15;
                float band = 1.0 - smoothstep(0.5, 0.8, covH);
                letter = mix(letter, uEdge, band * 0.8);
            } else {
                float hl = pow(dif, 3.0);
                letter = mix(uWall * (0.7 + 0.6 * dif), uEdge, hl * 0.8);
                float stripe = 0.5 + 0.5 * sin(uH * uStripeFreq);
                letter *= 1.0 - uStripeAmt * 0.5 * stripe;
                letter = mix(letter, uFringe, pow(1.0 - hv, 3.0) * 0.45);
            }
            letter *= atten;
            inner = letter;
            if (uDisp > 0.0) {
                inner.r = insideLetter(qh + (rR - rG) * total, phi, arcK) ? letter.r : interiorC.r;
                inner.b = insideLetter(qh + (rB - rG) * total, phi, arcK) ? letter.b : interiorC.b;
            }
        }

        float lit = dot(n, uLight);
        inner *= mix(0.45, 1.0, smoothstep(-0.2, 0.6, lit));

        vec3 refl = reflect(rd, n);
        float spec = pow(max(dot(refl, uLight), 0.0), 220.0);
        col = inner * (1.0 - F) + F * envRefl(refl);
        col += vec3(spec * uSpec * 3.0);
        col += vec3(smoothstep(0.982, 0.995, dot(refl, normalize(vec3(-0.35, 0.9, 0.45)))) * uStreak * 0.6);

        float sw = smoothstep(0.35, 0.9, dot(n, N)) * smoothstep(0.6, 0.98, abs(N.x)) * mix(0.6, 1.0, step(0.0, N.x));
        vec3 film = 0.5 + 0.5 * cos(TAU * (ndv * 1.7 + arc * 1.3 + vec3(0.0, 0.33, 0.67)));
        vec3 sheenC = mix(uSheen, film, uIrid);
        col = mix(col, sheenC, clamp(sw * uSheenAmt * 0.7, 0.0, 1.0));

        float rim = 1.0 - smoothstep(0.0, 0.07, ndv);
        col = mix(col, uRim * 0.6, rim * 0.8);
        float shade = smoothstep(0.0, -0.6, lit) * (1.0 - ndv);
        col = mix(col, uRim * 0.3, shade * 0.45);

        float zf = smoothstep(-uR, uR, p.z);
        col *= 1.0 - uFarDim * (1.0 - zf);
    } else {
        col += uInterior * 2.0 * uHaze * exp(-max(minD, 0.0) / 0.017);
    }

    vec2 uvn = frag / uRes - 0.5;
    float vig = smoothstep(0.25, 0.75, length(uvn) * 1.2);
    col *= 1.0 - uVignette * vig * 0.85;
    float g = fract(sin(dot(frag + fract(uTime) * 137.0, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
    col += g * uGrain * 0.18;

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

const UNIFORMS = [
    "uRes", "uUnit", "uTheta", "uR", "uTube", "uK", "uCam", "uText", "uTextLen",
    "uGlyphH", "uDepth", "uBg", "uFace", "uWall", "uEdge", "uFringe", "uInterior",
    "uRim", "uSheen", "uSheenAmt", "uIrid", "uSpec", "uStreak", "uIor", "uDisp",
    "uBounces", "uStripeAmt", "uStripeFreq", "uHaze", "uFarDim", "uLight", "uSteps",
    "uInSteps", "uGrain", "uVignette", "uTime",
] as const

function buildTextCanvas(text: string, weight: number, trackingPct: number) {
    const H = 128
    const fs = 100
    const c = document.createElement("canvas")
    const ctx = c.getContext("2d")!
    const font = `${weight} ${fs}px Inter, "Helvetica Neue", Arial, sans-serif`
    ctx.font = font
    const str = (text && text.trim() ? text.toUpperCase() : "SEND HELLO SOS") + "  "
    const track = (fs * trackingPct) / 100
    const chars = Array.from(str)
    let total = 0
    const adv = chars.map((ch) => {
        const a = ctx.measureText(ch).width + track
        total += a
        return a
    })
    const cap = ctx.measureText("H").actualBoundingBoxAscent || fs * 0.72
    const W = Math.min(4096, Math.max(64, Math.ceil(total)))
    c.width = W
    c.height = H
    ctx.fillStyle = "#000"
    ctx.fillRect(0, 0, W, H)
    ctx.font = font
    ctx.fillStyle = "#fff"
    ctx.textBaseline = "alphabetic"
    try {
        ctx.filter = "blur(2px)"
    } catch (e) {}
    if (total > W) ctx.scale(W / total, 1)
    let x = track / 2
    const y = H / 2 + cap / 2
    chars.forEach((ch, i) => {
        ctx.fillText(ch, x, y)
        x += adv[i]
    })
    return { canvas: c, cap, W, H }
}

export interface ThickClearGlassProps {
    background?: string
    baseColor?: string
    text?: string
    speed?: number
    scale?: number
    dispersion?: number
    hoverGlow?: number
    hoverSpeedBoost?: number
    dragSensitivity?: number
    advanced?: {
        coilRadius?: number
        tubeRadius?: number
        pitch?: number
        startAngle?: number
        turnMs?: number
        cameraDistance?: number
        letterHeight?: number
        letterDepth?: number
        tracking?: number
        fontWeight?: number
        faceColor?: string
        edgeColor?: string
        fringeColor?: string
        interiorColor?: string
        rimColor?: string
        sheenColor?: string
        sheen?: number
        iridescence?: number
        specular?: number
        streak?: number
        ior?: number
        bounces?: number
        striations?: number
        stripeCount?: number
        haze?: number
        farDim?: number
        lightAngle?: number
        resolution?: number
        marchSteps?: number
        innerSteps?: number
        grain?: number
        vignette?: number
    }
    style?: CSSProperties
}

/**
 * Thick Clear Glass — a refractive glass helix filled with extruded letters,
 * turning about its vertical axis.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function ThickClearGlass(props: ThickClearGlassProps) {
    const {
        text = "TEXT INSIDE",
        speed = 50,
        scale = 50,
        baseColor = "#BB204F",
        dispersion = 50,
        background = "#000000",
        hoverGlow = 100,
        hoverSpeedBoost = 100,
        dragSensitivity = 50,
        style,
    } = props

    const wrapRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef<any>(null)
    const hoverTargetRef = useRef(0)
    const hoverAmtRef = useRef(0)
    const dragRef = useRef({ active: false, lastX: 0, delta: 0 })
    propsRef.current = {
        ...props,
        text,
        speed,
        scale,
        baseColor,
        dispersion,
        background,
        hoverGlow,
        hoverSpeedBoost,
        dragSensitivity,
    }

    useEffect(() => {
        const canvas = canvasRef.current
        const wrap = wrapRef.current
        if (!canvas || !wrap) return
        const gl = canvas.getContext("webgl2", {
            antialias: false,
            alpha: false,
            premultipliedAlpha: false,
            preserveDrawingBuffer: true,
        }) as WebGL2RenderingContext | null
        if (!gl) return

        const compile = (type: number, src: string) => {
            const sh = gl.createShader(type)!
            gl.shaderSource(sh, src)
            gl.compileShader(sh)
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
                const log = gl.getShaderInfoLog(sh)
                gl.deleteShader(sh)
                throw new Error("ThickClearGlass shader: " + log)
            }
            return sh
        }
        const vs = compile(gl.VERTEX_SHADER, VERT)
        const fs = compile(gl.FRAGMENT_SHADER, FRAG)
        const prog = gl.createProgram()!
        gl.attachShader(prog, vs)
        gl.attachShader(prog, fs)
        gl.bindAttribLocation(prog, 0, "aPos")
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
            throw new Error("ThickClearGlass link: " + gl.getProgramInfoLog(prog))
        gl.deleteShader(vs)
        gl.deleteShader(fs)

        const loc: Record<string, WebGLUniformLocation> = {}
        for (const name of UNIFORMS) {
            const l = gl.getUniformLocation(prog, name)
            if (!l) throw new Error("ThickClearGlass: missing uniform " + name)
            loc[name] = l
        }

        const vao = gl.createVertexArray()
        const buf = gl.createBuffer()
        gl.bindVertexArray(vao)
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

        const tex = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)

        let textKey = ""
        let textInfo = { cap: 72, W: 512, H: 128 }
        let dirty = true
        const size = { w: wrap.offsetWidth, h: wrap.offsetHeight }
        const ro = new ResizeObserver(() => {
            size.w = wrap.offsetWidth
            size.h = wrap.offsetHeight
            dirty = true
        })
        ro.observe(wrap)

        const onPointerEnter = () => {
            hoverTargetRef.current = 1
            dirty = true
        }
        const onPointerLeave = () => {
            hoverTargetRef.current = 0
            dirty = true
        }
        const onPointerDown = (e: PointerEvent) => {
            dragRef.current.active = true
            dragRef.current.lastX = e.clientX
            dirty = true
        }
        const onPointerMove = (e: PointerEvent) => {
            if (!dragRef.current.active) return
            const dx = e.clientX - dragRef.current.lastX
            dragRef.current.lastX = e.clientX
            const sens = Math.max(0, Math.min(100, propsRef.current.dragSensitivity)) / 100
            dragRef.current.delta += dx * sens * 0.012
            dirty = true
        }
        const onPointerUp = () => {
            dragRef.current.active = false
        }
        wrap.addEventListener("pointerenter", onPointerEnter)
        wrap.addEventListener("pointerleave", onPointerLeave)
        wrap.addEventListener("pointerdown", onPointerDown)
        window.addEventListener("pointermove", onPointerMove)
        window.addEventListener("pointerup", onPointerUp)
        window.addEventListener("pointercancel", onPointerUp)

        let alive = true
        const fontsReady = (document as any).fonts?.ready
        if (fontsReady)
            fontsReady.then(() => {
                if (alive) textKey = ""
            })

        const reduce =
            typeof window !== "undefined" && window.matchMedia
                ? window.matchMedia("(prefers-reduced-motion: reduce)")
                : null

        let raf = 0
        let last = -1
        let phase = 0
        let lastKey = ""

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const P = propsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(P.advanced ?? {}) }
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now

            const rt = RenderTarget.current()
            const still =
                !!(reduce && reduce.matches) ||
                rt === RenderTarget.thumbnail ||
                rt === RenderTarget.export
            const turnS = Math.max(0.5, adv.turnMs / 1000)
            const dragging = dragRef.current.active
            const hoverTarget = dragging ? 0 : hoverTargetRef.current
            hoverAmtRef.current += (hoverTarget - hoverAmtRef.current) * Math.min(1, dt * 6)
            const hoverAmt = hoverAmtRef.current
            const speedBoost = 1 + hoverAmt * (Math.max(0, Math.min(100, P.hoverSpeedBoost)) / 100)
            const omega = (TAU / turnS) * (Math.max(0, Math.min(100, P.speed)) / 50) * speedBoost
            if (still) phase = (TAU / turnS) * 2.32
            else if (dragging) phase += dragRef.current.delta
            else phase += omega * dt
            dragRef.current.delta = 0

            const tk = `${P.text}|${adv.fontWeight}|${adv.tracking}`
            if (tk !== textKey) {
                textKey = tk
                const built = buildTextCanvas(P.text, adv.fontWeight, adv.tracking)
                textInfo = built
                gl.bindTexture(gl.TEXTURE_2D, tex)
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, built.canvas)
                dirty = true
            }

            const dpr =
                Math.min(window.devicePixelRatio || 1, 2) *
                Math.max(0.2, Math.min(1, adv.resolution / 100))
            const cw = Math.max(1, Math.round(size.w * dpr))
            const ch = Math.max(1, Math.round(size.h * dpr))
            if (canvas.width !== cw || canvas.height !== ch) {
                canvas.width = cw
                canvas.height = ch
                dirty = true
            }

            const animating =
                !still && (omega > 0 || dragging || Math.abs(hoverTarget - hoverAmt) > 0.001)
            if (!animating) {
                const k = JSON.stringify([
                    P.text, P.speed, P.scale, P.baseColor, P.dispersion, P.background,
                    P.hoverGlow, P.hoverSpeedBoost, P.dragSensitivity, adv, cw, ch, phase,
                ])
                if (k === lastKey && !dirty) return
                lastKey = k
            }
            dirty = false

            const unit =
                Math.min(cw, ch / REF_ASPECT) * (Math.max(10, P.scale) / 100)
            const tube = adv.tubeRadius / 100
            const capWorld = (adv.letterHeight / 100) * 2 * 0.92 * tube
            const stripH = (capWorld * textInfo.H) / Math.max(1, textInfo.cap)
            const textLen = (textInfo.W / textInfo.H) * stripH
            const depth = ((adv.letterDepth / 100) * capWorld) / 2
            const az = (adv.lightAngle * Math.PI) / 180
            const L = [Math.sin(az), Math.cos(az) * 0.8, 0.9]
            const ll = Math.hypot(L[0], L[1], L[2])

            gl.viewport(0, 0, cw, ch)
            gl.useProgram(prog)
            gl.bindVertexArray(vao)
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, tex)
            gl.uniform1i(loc.uText, 0)
            gl.uniform2f(loc.uRes, cw, ch)
            gl.uniform1f(loc.uUnit, unit)
            gl.uniform1f(loc.uTheta, (adv.startAngle * Math.PI) / 180 + phase)
            gl.uniform1f(loc.uR, adv.coilRadius / 100)
            gl.uniform1f(loc.uTube, tube)
            gl.uniform1f(loc.uK, Math.max(0.1, adv.pitch / 100) / TAU)
            gl.uniform1f(loc.uCam, Math.max(1.5, adv.cameraDistance / 100))
            gl.uniform1f(loc.uTextLen, textLen)
            gl.uniform1f(loc.uGlyphH, stripH)
            gl.uniform1f(loc.uDepth, depth)
            gl.uniform3fv(loc.uBg, parseColor(P.background, [0, 0, 0]))
            gl.uniform3fv(loc.uFace, parseColor(adv.faceColor, [0.024, 0.1, 0.416]))
            gl.uniform3fv(loc.uWall, parseColor(P.baseColor, [0.176, 0.369, 0.682]))
            gl.uniform3fv(loc.uEdge, parseColor(adv.edgeColor, [0.31, 0.847, 0.91]))
            gl.uniform3fv(loc.uFringe, parseColor(adv.fringeColor, [0.753, 0.251, 0.878]))
            gl.uniform3fv(loc.uInterior, parseColor(adv.interiorColor, [0.012, 0.047, 0.22]))
            gl.uniform3fv(loc.uRim, parseColor(adv.rimColor, [0.318, 0.404, 0.435]))
            gl.uniform3fv(loc.uSheen, parseColor(adv.sheenColor, [0.91, 0.925, 0.96]))
            const glow = 1 + hoverAmt * (Math.max(0, Math.min(100, P.hoverGlow)) / 100)
            gl.uniform1f(loc.uSheenAmt, Math.min(1, (adv.sheen / 100) * glow))
            gl.uniform1f(loc.uIrid, adv.iridescence / 100)
            gl.uniform1f(loc.uSpec, (adv.specular / 100) * glow)
            gl.uniform1f(loc.uStreak, Math.min(1, (adv.streak / 100) * glow))
            gl.uniform1f(loc.uIor, Math.max(1.05, adv.ior / 100))
            gl.uniform1f(loc.uDisp, (Math.max(0, Math.min(100, P.dispersion)) / 100) * 0.04)
            gl.uniform1f(loc.uBounces, Math.max(0, Math.min(2, Math.round(adv.bounces))))
            gl.uniform1f(loc.uStripeAmt, adv.striations / 100)
            gl.uniform1f(loc.uStripeFreq, (TAU * Math.max(1, adv.stripeCount)) / Math.max(1e-4, 2 * depth))
            gl.uniform1f(loc.uHaze, adv.haze / 100)
            gl.uniform1f(loc.uFarDim, Math.max(0, Math.min(1, adv.farDim / 100)))
            gl.uniform3f(loc.uLight, L[0] / ll, L[1] / ll, L[2] / ll)
            gl.uniform1f(loc.uSteps, Math.max(8, Math.min(96, adv.marchSteps)))
            gl.uniform1f(loc.uInSteps, Math.max(4, Math.min(48, adv.innerSteps)))
            gl.uniform1f(loc.uGrain, adv.grain / 100)
            gl.uniform1f(loc.uVignette, adv.vignette / 100)
            gl.uniform1f(loc.uTime, still ? 0 : now / 1000)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            alive = false
            cancelAnimationFrame(raf)
            ro.disconnect()
            wrap.removeEventListener("pointerenter", onPointerEnter)
            wrap.removeEventListener("pointerleave", onPointerLeave)
            wrap.removeEventListener("pointerdown", onPointerDown)
            window.removeEventListener("pointermove", onPointerMove)
            window.removeEventListener("pointerup", onPointerUp)
            window.removeEventListener("pointercancel", onPointerUp)
            gl.deleteTexture(tex)
            gl.deleteBuffer(buf)
            gl.deleteVertexArray(vao)
            gl.deleteProgram(prog)
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
                touchAction: dragSensitivity > 0 ? "none" : undefined,
                cursor: dragSensitivity > 0 ? "grab" : undefined,
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
