"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const MAX_DPR = 2
const FACE = '"Courier New", Courier, monospace'
const CHARS =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789=?#§¶△◊×÷%@&*/<>+-$¥£~^|:;.,()[]{}"
const MAX_RINGS = 8
const TAIL_BASE = 0.62 // the source's behind-the-front scale, i.e. Tail at 100%
const AUTO_PERIOD = 2.2 // seconds between auto rings at Auto = 50

function num(v: unknown, fb: number): number {
    return typeof v === "number" && isFinite(v) ? v : fb
}

function clampN(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v
}

function rng(seed: number): () => number {
    let s = seed >>> 0
    return function () {
        s ^= s << 13
        s >>>= 0
        s ^= s >> 17
        s ^= s << 5
        s >>>= 0
        return s / 4294967296
    }
}

// Alpha is carried through: Accent Color's alpha IS the mix strength, so a
// hex/rgba that drops it would silently pin the dial at full.
function parseRGBA(
    input: string | undefined,
    fb: [number, number, number, number]
): [number, number, number, number] {
    if (!input) return fb
    const str = String(input).trim()
    if (str.charAt(0) === "#") {
        let hex = str.slice(1)
        if (hex.length === 3 || hex.length === 4) {
            let out = ""
            for (let i = 0; i < hex.length; i++) out += hex.charAt(i) + hex.charAt(i)
            hex = out
        }
        if (hex.length >= 6) {
            const r = parseInt(hex.slice(0, 2), 16)
            const g = parseInt(hex.slice(2, 4), 16)
            const b = parseInt(hex.slice(4, 6), 16)
            const a = hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r, g, b, isNaN(a) ? 1 : a]
        }
        return fb
    }
    const m = str.match(/[\d.]+/g)
    if (m && m.length >= 3) return [+m[0], +m[1], +m[2], m.length >= 4 ? +m[3] : 1]
    return fb
}

type PlateGroup = { characters?: string; opacity?: number }
const PLATE_DEFAULTS: Required<PlateGroup> = { characters: CHARS, opacity: 82 }

type WaveGroup = { band?: number; travel?: number; weight?: number; tail?: number; life?: number }
const WAVE_DEFAULTS: Required<WaveGroup> = { band: 236, travel: 179, weight: 100, tail: 100, life: 1250 }

interface Props {
    style?: React.CSSProperties
    width?: number
    height?: number
    background?: string
    baseColor?: string
    accentColor?: string
    density?: number
    glyphSize?: number
    hover?: number
    auto?: number
    plate?: PlateGroup
    wave?: WaveGroup
}

export default function RippleStudy(props: Props) {
    const {
        style,
        background = "#000000",
        baseColor = "#FFFFFF",
        accentColor = "#FFFFFF",
        density = 20,
        glyphSize = 93,
        hover = 100,
        auto = 100,
        plate,
        wave,
        width,
        height,
    } = props

    // A group the designer never opened arrives undefined; spread-merging over a
    // typed literal beats a hand-written ?? chain, where one missed key silently
    // pins a control forever.
    const plate_ = { ...PLATE_DEFAULTS, ...(plate || {}) }
    const wave_ = { ...WAVE_DEFAULTS, ...(wave || {}) }

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    const ringsRef = useRef<{ x: number; y: number; t: number }[]>([])

    // Every live input is read from a ref inside the loop. Putting any of them in
    // the effect deps would restart the loop on every colour tweak.
    const vRef = useRef<Record<string, number | string>>({})
    const chars = typeof plate_.characters === "string" && plate_.characters.length > 0 ? plate_.characters : CHARS
    vRef.current = {
        base: baseColor,
        accent: accentColor,
        chars,
        density: Math.round(clampN(num(density, 24), 6, 64)),
        glyphSize: clampN(num(glyphSize, 100), 20, 300) / 100,
        hover: clampN(num(hover, 100), 0, 200) / 100,
        auto: clampN(num(auto, 50), 0, 100) / 50,
        opacity: clampN(num(plate_.opacity, 82), 0, 100) / 100,
        band: clampN(num(wave_.band, 100), 20, 400) / 100,
        travel: clampN(num(wave_.travel, 100), 20, 400) / 100,
        weight: clampN(num(wave_.weight, 100), 0, 300) / 100,
        tail: clampN(num(wave_.tail, 100), 20, 300) / 100,
        life: clampN(num(wave_.life, 1250), 200, 4000) / 1000,
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) {
            console.error("RippleStudy: 2D context unavailable")
            return
        }

        // The plate is seeded, so it is the same field of type on every mount and a
        // resize never reshuffles the letters. Rebuilt when the grid OR the
        // alphabet changes — keying on the count alone would freeze Characters.
        let glyphs: string[] = []
        let builtFor = -1
        let builtChars = ""
        const build = (n: number, set: string) => {
            const r = rng(20260809)
            glyphs = new Array(n * n)
            for (let i = 0; i < n * n; i++) glyphs[i] = set.charAt(Math.floor(r() * set.length))
            builtFor = n
            builtChars = set
        }

        // Auto rings walk their own seeded stream, so the canvas thumbnail and every
        // reload place them identically.
        const autoRng = rng(880219)
        let autoAcc = 0

        let raf = 0
        let last = performance.now()
        let clock = 0

        const emit = (x: number, y: number) => {
            const rings = ringsRef.current
            rings.push({ x, y, t: clock })
            if (rings.length > MAX_RINGS) rings.shift()
        }

        const render = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            const v = vRef.current
            clock += dt

            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            const cw = sizeRef.current.w || canvas.clientWidth || 1200
            const ch = sizeRef.current.h || canvas.clientHeight || 800
            const bw = Math.max(1, Math.round(cw * dpr))
            const bh = Math.max(1, Math.round(ch * dpr))
            if (canvas.width !== bw || canvas.height !== bh) {
                canvas.width = bw
                canvas.height = bh
            }
            // setTransform is ABSOLUTE, so re-applying it per frame cannot compound the
            // way the source's per-resize ctx.scale(dpr, dpr) did.
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.clearRect(0, 0, cw, ch)

            const N = v.density as number
            const set = v.chars as string
            if (N !== builtFor || set !== builtChars) build(N, set)

            const cell = (Math.min(cw, ch) / N) * 0.86
            const fs = cell * 1.1 * (v.glyphSize as number)
            const x0 = cw / 2 - (cell * (N - 1)) / 2
            const y0 = ch / 2 - (cell * (N - 1)) / 2

            const life = v.life as number
            const rate = v.auto as number
            if (rate > 0) {
                autoAcc += dt * rate
                // A while-loop, not an if: at 100% with a long frame more than one ring
                // can be due, and dropping the extra would make the dial's top half flat.
                while (autoAcc >= AUTO_PERIOD) {
                    autoAcc -= AUTO_PERIOD
                    emit(autoRng() * cw, autoRng() * ch)
                }
            }

            const rings = ringsRef.current
            while (rings.length && clock - rings[0].t > life) rings.shift()

            const speed = cw * 1.2 * (v.travel as number)
            const band = cell * 2.45 * (v.band as number)
            // Tail is a stretch: 100% is the source's 0.62, larger stretches the
            // falloff behind the front further. The cull bound has to follow it, or a
            // long tail is clipped square at the old constant.
            const tail = TAIL_BASE / (v.tail as number)
            const cullBack = -2.4 / tail
            const gain = v.hover as number

            const ink = parseRGBA(v.base as string, [20, 19, 16, 1])
            const acc = parseRGBA(v.accent as string, [193, 68, 14, 1])
            const mixMax = acc[3]
            const op = v.opacity as number

            ctx.textAlign = "center"
            ctx.textBaseline = "middle"
            ctx.font = fs.toFixed(2) + "px " + FACE
            ctx.lineJoin = "round"

            for (let gy = 0; gy < N; gy++) {
                const py = y0 + gy * cell
                for (let gx = 0; gx < N; gx++) {
                    const px = x0 + gx * cell
                    let val = 0
                    for (let k = 0; k < rings.length; k++) {
                        const R = rings[k]
                        const age = clock - R.t
                        if (age < 0) continue
                        const rad = speed * age
                        const dx = px - R.x
                        const dy = py - R.y
                        const d = Math.sqrt(dx * dx + dy * dy)
                        let q = (d - rad) / band
                        if (q > 2.4 || q < cullBack) continue
                        // Behind the front the falloff is stretched, which is what gives the
                        // ring a tail and therefore a direction of travel.
                        if (q < 0) q *= tail
                        const env = Math.max(0, 1 - age / life)
                        val += Math.exp(-q * q) * Math.pow(env, 1.15)
                    }
                    // Hover is the ring's strength, not just a gate — at 0 the plate is
                    // inert, at 200% the front is twice as deep.
                    val *= gain
                    if (val > 1) val = 1

                    const a = (op + val * (1 - op)) * ink[3]
                    const m = val * mixMax
                    const cr = Math.round(ink[0] + (acc[0] - ink[0]) * m)
                    const cg = Math.round(ink[1] + (acc[1] - ink[1]) * m)
                    const cb = Math.round(ink[2] + (acc[2] - ink[2]) * m)
                    const col = "rgba(" + cr + "," + cg + "," + cb + "," + a.toFixed(3) + ")"
                    const chr = glyphs[gy * N + gx]
                    ctx.fillStyle = col
                    ctx.fillText(chr, px, py)
                    if (val > 0.03 && (v.weight as number) > 0) {
                        // WEIGHT, not tone: the ring thickens the letter it passes.
                        ctx.strokeStyle = col
                        ctx.lineWidth = fs * val * 0.105 * (v.weight as number)
                        ctx.strokeText(chr, px, py)
                    }
                }
            }

            raf = requestAnimationFrame(render)
        }

        // The rect RATIO is zoom-invariant — offset and size scale together — so
        // this is safe on a zoomed Framer canvas where absolute px are not.
        const onDown = (e: PointerEvent) => {
            if ((vRef.current.hover as number) <= 0) return
            const r = canvas.getBoundingClientRect()
            if (r.width <= 0 || r.height <= 0) return
            const cw = sizeRef.current.w || canvas.clientWidth || 1200
            const ch = sizeRef.current.h || canvas.clientHeight || 800
            emit(((e.clientX - r.left) / r.width) * cw, ((e.clientY - r.top) / r.height) * ch)
        }

        canvas.addEventListener("pointerdown", onDown)
        raf = requestAnimationFrame(render)

        return () => {
            cancelAnimationFrame(raf)
            canvas.removeEventListener("pointerdown", onDown)
        }
    }, [])

    return (
        <div
            style={{
                position: "relative",
                overflow: "hidden",
                background,
                minWidth: 1200,
                minHeight: 800,
                width: typeof width === "number" && width > 0 ? width : "100%",
                height: typeof height === "number" && height > 0 ? height : "100%",
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
