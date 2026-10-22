"use client"

import type { CSSProperties } from "react"
import * as React from "react"
import { useEffect, useRef, useState } from "react"

/**
 * Stipple Focus Type
 *
 * A typographic diffusion poster. An oversized, ultra-bold word is broken into
 * hyphenated rows of glyphs. Each glyph sits at its own depth of field: a focal
 * point drifts across the grid on a Lissajous path, and glyphs near it resolve
 * bright and nearly sharp while the rest dissolve, dim and heavily blurred.
 * The whole frame is a stochastic one-bit stipple of that blurred field, with
 * crawling grain. Crisp Swiss-style small print sits on top.
 *
 * Built with a canvas 2D compositor and a WebGL dither pass. Glyph sprites are
 * pre-blurred at 4 levels and mixed per glyph by focal distance, then a
 * fragment shader thresholds the field against per-dot white noise.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    hover: 50,
    grain: 0,
    vignette: 0,
    periodX: 8000,
    periodY: 12000,
    pathCenterX: 50,
    pathCenterY: 50,
    pathAmpX: 35,
    pathAmpY: 30,
    rowSize: 19,
    topOffset: -2,
    leftMargin: 6,
    capHeight: 91,
    tracking: -2,
    blurMin: 12,
    blurMax: 36,
    falloffStart: 20,
    falloffWidth: 50,
    verticalWeight: 45,
    dimLevel: 16,
    depthJitter: 25,
    gain: 115,
    gamma: 120,
    dotSize: 1,
    dotSoftness: 12,
    grainFps: 24,
    drift: 5,
    breatheScale: 3,
    breatheMin: 5000,
    breatheMax: 9000,
    followMs: 400,
    leaveMs: 800,
    pressTighten: 45,
    seed: 7,
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

const GLYPH_STACK =
    '"Arial Rounded MT Bold", "Nunito", "Helvetica Neue", Helvetica, Arial, sans-serif'
const INFO_FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif'

const VERT = `
attribute vec2 aPos;
void main() {
    gl_Position = vec4(aPos, 0.0, 1.0);
}
`

const FRAG = `
precision highp float;
uniform sampler2D uField;
uniform vec2 uRes;
uniform float uSeed;
uniform float uDot;
uniform float uStipple;
uniform float uSoft;
uniform float uGain;
uniform float uGamma;
uniform float uSpeck;
uniform float uVig;
uniform vec3 uInk;
uniform vec3 uBg;

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

void main() {
    vec2 uv = gl_FragCoord.xy / max(uRes, vec2(1.0));
    float l = texture2D(uField, uv).r;
    l = clamp(l * uGain, 0.0, 1.0);
    l = pow(max(l, 0.0), max(uGamma, 0.01));

    vec2 cell = floor(gl_FragCoord.xy / max(uDot, 1.0));
    float n = hash12(cell + vec2(uSeed * 37.0, uSeed * 91.0));
    float d = smoothstep(n - uSoft, n + uSoft, l) * step(0.004, l);
    float v = mix(l, d, uStipple);

    float s = hash12(cell * 1.37 + vec2(uSeed * 53.0 + 7.0, uSeed * 19.0 + 3.0));
    v = max(v, step(s, uSpeck * 0.6) * 0.2);

    vec2 q = uv - 0.5;
    q.x *= uRes.x / max(uRes.y, 1.0);
    float vig = smoothstep(0.35, 1.0, length(q));
    v *= 1.0 - uVig * vig;

    gl_FragColor = vec4(mix(uBg, uInk, clamp(v, 0.0, 1.0)), 1.0);
}
`

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const num = (v: any, d: number) => (typeof v === "number" && isFinite(v) ? v : d)
const smooth = (e0: number, e1: number, x: number) => {
    const t = clamp((x - e0) / Math.max(1e-6, e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)
}

function rnd(seed: number, i: number, k: number) {
    let t =
        (Math.imul(seed | 0, 374761393) +
            Math.imul(i | 0, 668265263) +
            Math.imul(k | 0, -2048144777)) |
        0
    t = Math.imul(t ^ (t >>> 15), -2048144789)
    t = Math.imul(t ^ (t >>> 13), -1028477387)
    t ^= t >>> 16
    return (t >>> 0) / 4294967296
}

function parseColor(c: any, fb: number[]): number[] {
    if (typeof c !== "string") return fb
    let s = c.trim()
    const v = s.match(/^var\([^,]+,\s*(.+)\)$/i)
    if (v) s = v[1].trim()
    let m = s.match(/^#([0-9a-f]{3,8})$/i)
    if (m) {
        let h = m[1]
        if (h.length === 3 || h.length === 4)
            h = h
                .split("")
                .map((x) => x + x)
                .join("")
        const n = parseInt(h.slice(0, 6), 16)
        if (isNaN(n)) return fb
        return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
    }
    m = s.match(/^rgba?\(([^)]+)\)/i)
    if (m) {
        const p = m[1]
            .split(/[\s,\/]+/)
            .filter(Boolean)
            .map(parseFloat)
        if (p.length >= 3 && p.slice(0, 3).every((x) => isFinite(x)))
            return [p[0] / 255, p[1] / 255, p[2] / 255]
    }
    return fb
}

/** Three box passes per axis ≈ Gaussian with σ ≈ r. In place on `a`. */
function blur3(a: Float32Array, w: number, h: number, r: number) {
    if (r < 1) return a
    const b = new Float32Array(w * h)
    const inv = 1 / (2 * r + 1)
    for (let pass = 0; pass < 3; pass++) {
        for (let y = 0; y < h; y++) {
            const o = y * w
            let acc = 0
            for (let i = 0; i <= r && i < w; i++) acc += a[o + i]
            for (let x = 0; x < w; x++) {
                b[o + x] = acc * inv
                const ad = x + r + 1
                if (ad < w) acc += a[o + ad]
                const rm = x - r
                if (rm >= 0) acc -= a[o + rm]
            }
        }
        for (let x = 0; x < w; x++) {
            let acc = 0
            for (let i = 0; i <= r && i < h; i++) acc += b[i * w + x]
            for (let y = 0; y < h; y++) {
                a[y * w + x] = acc * inv
                const ad = y + r + 1
                if (ad < h) acc += b[ad * w + x]
                const rm = y - r
                if (rm >= 0) acc -= b[rm * w + x]
            }
        }
    }
    return a
}

type Sprite = {
    adv: number
    bx: number
    by: number
    sw: number
    sh: number
    levels: HTMLCanvasElement[]
}

function makeSprite(
    ch: string,
    fontStr: string,
    fontPx: number,
    fs: number,
    sigmas: number[]
): Sprite {
    const meas = document.createElement("canvas").getContext("2d") as CanvasRenderingContext2D
    meas.font = fontStr
    const adv = Math.max(fontPx * 0.2, meas.measureText(ch).width)
    const over = fontPx * 0.15
    const pad = Math.ceil(sigmas[sigmas.length - 1] * fs * 3) + 2
    const sw = Math.max(1, Math.ceil((adv + over * 2) * fs) + pad * 2)
    const sh = Math.max(1, Math.ceil(fontPx * 1.3 * fs) + pad * 2)
    const bx = pad + over * fs
    const by = pad + fontPx * 1.05 * fs

    const src = document.createElement("canvas")
    src.width = sw
    src.height = sh
    const sx = src.getContext("2d") as CanvasRenderingContext2D
    sx.setTransform(fs, 0, 0, fs, 0, 0)
    sx.font = fontStr
    sx.textBaseline = "alphabetic"
    sx.fillStyle = "#ffffff"
    sx.fillText(ch, bx / fs, by / fs)
    const data = sx.getImageData(0, 0, sw, sh).data
    const base = new Float32Array(sw * sh)
    for (let i = 0; i < base.length; i++) base[i] = data[i * 4 + 3] / 255

    const levels = sigmas.map((sig) => {
        const arr = blur3(base.slice(), sw, sh, Math.round(sig * fs))
        const c = document.createElement("canvas")
        c.width = sw
        c.height = sh
        const cx = c.getContext("2d") as CanvasRenderingContext2D
        const img = cx.createImageData(sw, sh)
        const d = img.data
        for (let i = 0; i < arr.length; i++) {
            d[i * 4] = 255
            d[i * 4 + 1] = 255
            d[i * 4 + 2] = 255
            d[i * 4 + 3] = clamp(Math.round(arr[i] * 255), 0, 255)
        }
        cx.putImageData(img, 0, 0)
        return c
    })
    return { adv, bx, by, sw, sh, levels }
}

type Cell = {
    x: number
    base: number
    cx: number
    cy: number
    sprite: Sprite
    jit: number
    phase: number
    period: number
}

export interface StippleFocusTypeProps {
    background?: string
    ink?: string
    text?: string
    font?: Record<string, unknown>
    speed?: number
    scale?: number
    focus?: number
    stipple?: number
    hover?: number
    advanced?: {
        grain?: number
        vignette?: number
        periodX?: number
        periodY?: number
        pathCenterX?: number
        pathCenterY?: number
        pathAmpX?: number
        pathAmpY?: number
        rowSize?: number
        topOffset?: number
        leftMargin?: number
        capHeight?: number
        tracking?: number
        blurMin?: number
        blurMax?: number
        falloffStart?: number
        falloffWidth?: number
        verticalWeight?: number
        dimLevel?: number
        depthJitter?: number
        gain?: number
        gamma?: number
        dotSize?: number
        dotSoftness?: number
        grainFps?: number
        drift?: number
        breatheScale?: number
        breatheMin?: number
        breatheMax?: number
        followMs?: number
        leaveMs?: number
        pressTighten?: number
        seed?: number
    }
    style?: CSSProperties
}

export default function StippleFocusType(props: StippleFocusTypeProps) {
    props = withMovedControls(props)
    const {
        text = "TEXT COMPONENT",
        font = {"variant":"Regular","fontSize":"16px","textAlign":"left","fontFamily":"Inter","fontWeight":900,"lineHeight":"1.5em","letterSpacing":"0em"},
        ink = "#FFFFFF",
        background = "#000000",
        speed = 50,
        scale = 100,
        focus = 50,
        stipple = 100,
        style,
    } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef<any>(null)
    propsRef.current = {
        text,
        font,
        ink,
        background,
        speed,
        scale,
        focus,
        stipple,
        advanced: props.advanced,
    }
    const [size, setSize] = useState({ w: 1200, h: 800 })

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return

        let W = 1200
        let H = 800
        let dpr = 1
        let fs = 0.5
        const field = document.createElement("canvas")
        const fctx = field.getContext("2d") as CanvasRenderingContext2D

        let gl: any = null
        let prog: any = null
        let buf: any = null
        let tex: any = null
        let vs: any = null
        let frs: any = null
        const U: any = {}
        let showingField = false

        try {
            gl = canvas.getContext("webgl", {
                antialias: false,
                premultipliedAlpha: false,
                preserveDrawingBuffer: true,
            })
            if (!gl) throw new Error("WebGL unavailable")
            const compile = (type: number, src: string) => {
                const s = gl.createShader(type)
                gl.shaderSource(s, src)
                gl.compileShader(s)
                if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
                    throw new Error(gl.getShaderInfoLog(s) || "shader compile failed")
                return s
            }
            vs = compile(gl.VERTEX_SHADER, VERT)
            frs = compile(gl.FRAGMENT_SHADER, FRAG)
            prog = gl.createProgram()
            gl.attachShader(prog, vs)
            gl.attachShader(prog, frs)
            gl.linkProgram(prog)
            if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
                throw new Error(gl.getProgramInfoLog(prog) || "link failed")
            gl.useProgram(prog)
            buf = gl.createBuffer()
            gl.bindBuffer(gl.ARRAY_BUFFER, buf)
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
            const aPos = gl.getAttribLocation(prog, "aPos")
            if (aPos < 0) throw new Error("Missing attribute aPos")
            gl.enableVertexAttribArray(aPos)
            gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
            const names = [
                "uField",
                "uRes",
                "uSeed",
                "uDot",
                "uStipple",
                "uSoft",
                "uGain",
                "uGamma",
                "uSpeck",
                "uVig",
                "uInk",
                "uBg",
            ]
            for (const n of names) {
                const loc = gl.getUniformLocation(prog, n)
                if (loc === null) throw new Error("Missing uniform " + n)
                U[n] = loc
            }
            tex = gl.createTexture()
            gl.bindTexture(gl.TEXTURE_2D, tex)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
        } catch (e) {
            gl = null
            field.style.cssText =
                "position:absolute;left:0;top:0;width:100%;height:100%;display:block;pointer-events:auto;"
            canvas.style.display = "none"
            root.insertBefore(field, root.firstChild)
            showingField = true
        }

        const resize = () => {
            W = Math.max(1, root.offsetWidth)
            H = Math.max(1, root.offsetHeight)
            dpr = Math.min(2, window.devicePixelRatio || 1)
            canvas.width = Math.max(1, Math.round(W * dpr))
            canvas.height = Math.max(1, Math.round(H * dpr))
            fs = Math.min(0.5, 900 / W)
            field.width = Math.max(1, Math.ceil(W * fs))
            field.height = Math.max(1, Math.ceil(H * fs))
            const w = W
            const h = H
            setSize((s) => (s.w === w && s.h === h ? s : { w, h }))
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(root)

        // ── fonts ──
        let fontsVersion = 0
        let loadingFont = ""
        let alive = true
        const bump = () => {
            if (alive) fontsVersion++
        }
        const fonts: any = (document as any).fonts
        if (fonts?.ready) fonts.ready.then(bump, () => {})
        if (fonts?.addEventListener) fonts.addEventListener("loadingdone", bump)

        // ── layout ──
        const sprites = new Map<string, Sprite>()
        let spriteKey = ""
        let layoutKey = ""
        let cells: Cell[] = []

        const ensureLayout = (p: any, a: any, sc: number) => {
            const f = p.font || {}
            const fam = f.fontFamily ? `${f.fontFamily}, ${GLYPH_STACK}` : GLYPH_STACK
            const weight = f.fontWeight || 900
            const fstyle = f.fontStyle || "normal"
            const rowH = Math.max(8, ((H * num(a.rowSize, 19)) / 100) * sc)
            const capH = (rowH * num(a.capHeight, 91)) / 100
            const fontPx = Math.max(4, capH / 0.72)
            const fontStr = `${fstyle} ${weight} ${fontPx.toFixed(2)}px ${fam}`
            const k = (H / 800) * sc
            const bMin = Math.max(0, num(a.blurMin, 12)) * k
            const bMax = Math.max(bMin + 0.5, num(a.blurMax, 36) * k)
            const sig = [0, 1, 2, 3].map((i) => bMin + ((bMax - bMin) * i) / 3)
            const sKey = `${fontStr}|${fs.toFixed(4)}|${sig
                .map((v) => v.toFixed(2))
                .join(",")}|${fontsVersion}`
            if (sKey !== spriteKey) {
                sprites.clear()
                spriteKey = sKey
                if (fontStr !== loadingFont) {
                    loadingFont = fontStr
                    if (fonts?.load) fonts.load(fontStr).then(bump, () => {})
                }
            }
            const word = String(p.text ?? "").toUpperCase()
            const lKey = `${sKey}|${W}|${H}|${word}|${rowH}|${a.topOffset}|${a.leftMargin}|${a.tracking}|${a.seed}|${a.breatheMin}|${a.breatheMax}`
            if (lKey === layoutKey) return
            layoutKey = lKey

            let letters = Array.from(word).filter((c) => c.trim() !== "")
            if (!letters.length) letters = Array.from("DIFFUSION")
            const L = letters.length
            const top = (H * num(a.topOffset, -2)) / 100
            const left = (H * num(a.leftMargin, -8)) / 100
            const track = (fontPx * num(a.tracking, -2)) / 100
            const nRows = clamp(Math.ceil((H - top) / rowH), 1, 40)
            const seed = num(a.seed, 7) | 0
            const bLo = Math.max(500, num(a.breatheMin, 5000))
            const bHi = Math.max(bLo, num(a.breatheMax, 9000))
            const pattern = [3, 2]
            const get = (ch: string) => {
                let s = sprites.get(ch)
                if (!s) {
                    s = makeSprite(ch, fontStr, fontPx, fs, sig)
                    sprites.set(ch, s)
                }
                return s
            }
            const out: Cell[] = []
            let idx = 0
            let g = 0
            // How far past each side a row must run so a glyph's blur fades off-canvas,
            // not on it.
            const bleed = bMax * 3 + rowH * 0.25
            for (let r = 0; r < nRows; r++) {
                const rowTop = top + r * rowH
                const base = rowTop + (rowH + capH) / 2
                const start = idx < L ? idx : g % L
                const items: string[] = []
                if (idx < L) {
                    const n = pattern[r % 2]
                    for (let j = 0; j < n && idx < L; j++) items.push(letters[idx++])
                    if (idx < L) items.push("-")
                    g = idx % L
                }
                // Prepend the letters that come before this row in the word until the
                // row starts beyond the left bleed.
                const pre: string[] = []
                let x = left
                for (let j = 1; x > -bleed && j < 60; j++) {
                    const ch = letters[(((start - j) % L) + L) % L]
                    x -= Math.max(fontPx * 0.1, get(ch).adv + track)
                    pre.unshift(ch)
                }
                const push = (ch: string) => {
                    const sp = get(ch)
                    const n = out.length
                    out.push({
                        x,
                        base,
                        cx: x + sp.adv / 2,
                        cy: rowTop + rowH / 2,
                        sprite: sp,
                        jit: rnd(seed, n, 1),
                        phase: rnd(seed, n, 2) * Math.PI * 2,
                        period: (bLo + (bHi - bLo) * rnd(seed, n, 3)) / 1000,
                    })
                    x += Math.max(fontPx * 0.1, sp.adv + track)
                }
                for (const ch of pre) push(ch)
                for (const ch of items) push(ch)
                let guard = 0
                while (x < W + bleed && guard++ < 200 && out.length < 900) {
                    push(letters[g % L])
                    g++
                }
            }
            cells = out
        }

        // ── pointer ──
        const pointer = {
            x: 0,
            y: 0,
            sx: 0,
            sy: 0,
            inside: false,
            over: 0,
            down: false,
            press: 0,
        }
        const lastF = { x: 0, y: 0 }
        const onMove = (e: PointerEvent) => {
            pointer.x = e.offsetX
            pointer.y = e.offsetY
            if (!pointer.inside) {
                if (pointer.over < 0.02) {
                    pointer.sx = lastF.x
                    pointer.sy = lastF.y
                }
                pointer.inside = true
            }
        }
        const onLeave = () => {
            pointer.inside = false
            pointer.down = false
        }
        const onDown = (e: PointerEvent) => {
            onMove(e)
            pointer.down = true
        }
        const onUp = () => {
            pointer.down = false
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerenter", onMove)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerdown", onDown)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        const reduce =
            typeof window.matchMedia === "function"
                ? window.matchMedia("(prefers-reduced-motion: reduce)")
                : null

        // ── loop ──
        let raf = 0
        let last = -1
        let clock = 0
        let grainClock = 0
        const TAU = Math.PI * 2

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min(Math.max(0, (now - last) / 1000), 1 / 20)
            last = now
            const p = propsRef.current
            const a: any = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
            const still = !!(reduce && reduce.matches)
            const rate = clamp(num(p.speed, 50), 0, 100) / 50
            if (!still) {
                clock += dt * rate
                if (rate > 0) grainClock += dt
            }
            const sc = clamp(num(p.scale, 100), 10, 400) / 100
            ensureLayout(p, a, sc)

            // focal point on its Lissajous path
            const px = Math.max(0.1, num(a.periodX, 8000) / 1000)
            const py = Math.max(0.1, num(a.periodY, 12000) / 1000)
            let fx =
                ((num(a.pathCenterX, 45) +
                    num(a.pathAmpX, 35) * Math.sin((TAU * clock) / px - Math.PI / 2)) /
                    100) *
                W
            let fy =
                ((num(a.pathCenterY, 40) +
                    num(a.pathAmpY, 30) * Math.sin((TAU * clock) / py - Math.PI / 2)) /
                    100) *
                H

            // pointer pulls the focus
            const k = clamp(num(a.hover, 50) / 50, 0, 2)
            const kIn = 1 - Math.exp((-dt * 1000) / Math.max(16, num(a.followMs, 400)))
            const kOut = 1 - Math.exp((-dt * 1000) / Math.max(16, num(a.leaveMs, 800)))
            pointer.sx += (pointer.x - pointer.sx) * kIn
            pointer.sy += (pointer.y - pointer.sy) * kIn
            pointer.over +=
                ((pointer.inside ? 1 : 0) - pointer.over) * (pointer.inside ? kIn : kOut)
            pointer.press += ((pointer.down && pointer.inside ? 1 : 0) - pointer.press) * kIn
            const pull = Math.min(1, pointer.over * k)
            fx += (pointer.sx - fx) * pull
            fy += (pointer.sy - fy) * pull
            lastF.x = fx
            lastF.y = fy

            const fz = clamp(num(p.focus, 50), 0, 100) / 100
            let r0 = (num(a.falloffStart, 20) / 100) * (0.4 + 1.2 * fz)
            const rw = Math.max(0.01, (num(a.falloffWidth, 50) / 100) * (0.7 + 0.6 * fz))
            r0 *=
                1 -
                clamp(num(a.pressTighten, 45) / 100, 0, 0.95) * pointer.press * Math.min(1, k)

            // composite the blurred field
            fctx.setTransform(1, 0, 0, 1, 0, 0)
            fctx.globalCompositeOperation = "source-over"
            fctx.globalAlpha = 1
            fctx.fillStyle = "#000000"
            fctx.fillRect(0, 0, field.width, field.height)
            fctx.globalCompositeOperation = "lighter"
            const vw = clamp(num(a.verticalWeight, 45) / 100, 0, 2)
            const dim = clamp(num(a.dimLevel, 16) / 100, 0, 1)
            const jit = clamp(num(a.depthJitter, 25) / 100, 0, 1)
            const driftPx = still ? 0 : ((num(a.drift, 5) * H) / 800) * sc
            const bs = still ? 0 : num(a.breatheScale, 3) / 100
            for (const c of cells) {
                const sp = c.sprite
                const dx = (c.cx - fx) / H
                const dy = ((c.cy - fy) / H) * vw
                let w = 1 - smooth(r0, r0 + rw, Math.hypot(dx, dy))
                w = clamp(w + (c.jit - 0.5) * jit, 0, 1)
                const b = dim + (1 - dim) * w
                const nl = sp.levels.length - 1
                const Lf = (1 - w) * nl
                const i = Math.min(nl - 1, Math.floor(Lf))
                const f = Lf - i
                const ph = (TAU * clock) / c.period + c.phase
                const ox = driftPx * Math.sin(ph)
                const oy = driftPx * Math.cos(ph * 0.77 + c.phase)
                const s = 1 + bs * (0.5 + 0.5 * Math.sin(ph * 0.83 + 1.3))
                const dw = sp.sw * s
                const dh = sp.sh * s
                const lx = (c.x + ox) * fs - sp.bx - (dw - sp.sw) / 2
                const ty = (c.base + oy) * fs - sp.by - (dh - sp.sh) / 2
                if (1 - f > 0.002) {
                    fctx.globalAlpha = b * (1 - f)
                    fctx.drawImage(sp.levels[i], lx, ty, dw, dh)
                }
                if (f > 0.002) {
                    fctx.globalAlpha = b * f
                    fctx.drawImage(sp.levels[i + 1], lx, ty, dw, dh)
                }
            }
            fctx.globalAlpha = 1
            fctx.globalCompositeOperation = "source-over"

            if (!gl || showingField) return

            // stipple pass
            const seedBase = num(a.seed, 7) | 0
            const seed = still
                ? 1 + (seedBase % 97)
                : (Math.floor(grainClock * Math.max(1, num(a.grainFps, 24))) % 997) +
                  1 +
                  (seedBase % 97)
            gl.viewport(0, 0, canvas.width, canvas.height)
            gl.useProgram(prog)
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, tex)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, field)
            gl.uniform1i(U.uField, 0)
            gl.uniform2f(U.uRes, canvas.width, canvas.height)
            gl.uniform1f(U.uSeed, seed)
            gl.uniform1f(U.uDot, Math.max(1, Math.round(num(a.dotSize, 1) * dpr)))
            gl.uniform1f(U.uStipple, clamp(num(p.stipple, 100) / 100, 0, 1))
            gl.uniform1f(U.uSoft, clamp(num(a.dotSoftness, 12) / 100, 0.001, 0.5))
            gl.uniform1f(U.uGain, Math.max(0, num(a.gain, 115) / 100))
            gl.uniform1f(U.uGamma, Math.max(0.1, num(a.gamma, 120) / 100))
            gl.uniform1f(U.uSpeck, clamp(num(a.grain, 8) / 100, 0, 1))
            gl.uniform1f(U.uVig, clamp(num(a.vignette, 0) / 100, 0, 1))
            gl.uniform3fv(U.uInk, parseColor(p.ink, [0.96, 0.96, 0.96]))
            gl.uniform3fv(U.uBg, parseColor(p.background, [0, 0, 0]))
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            alive = false
            cancelAnimationFrame(raf)
            ro.disconnect()
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerenter", onMove)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
            if (fonts?.removeEventListener) fonts.removeEventListener("loadingdone", bump)
            if (showingField && field.parentNode) field.parentNode.removeChild(field)
            canvas.style.display = "block"
            if (gl) {
                if (tex) gl.deleteTexture(tex)
                if (buf) gl.deleteBuffer(buf)
                if (prog) gl.deleteProgram(prog)
                if (vs) gl.deleteShader(vs)
                if (frs) gl.deleteShader(frs)
            }
            sprites.clear()
        }
    }, [])

    return (
        <div
            ref={rootRef}
            style={{
                minWidth: 1200,
                minHeight: 800,
                width: "100%",
                height: "100%",
                ...style,
                position: "relative",
                overflow: "hidden",
                background,
                isolation: "isolate",
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                }}
            />
        </div>
    )
}
