"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const MAX_DPR = 2
const FACE = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif'
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789<>/\\{}[]()=+-*#$%&@?!"
const FS = 0.018 // and the glyph size

// Cut controls (rule 11b): the panel row is gone, the render path is unchanged —
// each of these reads the value its dial shipped at.
const HOVER_K = 1 // was Hover, 100%
const MORPH_TAU = 0.46 // was Cloud > Morph, 100% — it only ever scaled Speed

// Every shape is a FILLED 24×24 path, because fitPoints scatters points inside a
// mask and an outline would leave it nothing to fill. Rings and crescents are cut
// with a second subpath under evenodd rather than a stroke, for the same reason.
// Normalisation is by the mask's own bounding box, so the 24-box padding here is
// cosmetic and a wide shape and a tall one still fill the same frame.
const SHAPES: Record<string, string> = {
    circle: "M12 1A11 11 0 1 1 11.99 1Z",
    ring: "M12 1A11 11 0 1 1 11.99 1ZM12 6A6 6 0 1 1 11.99 6Z",
    square: "M1 1H23V23H1Z",
    rounded: "M6 1H18A5 5 0 0 1 23 6V18A5 5 0 0 1 18 23H6A5 5 0 0 1 1 18V6A5 5 0 0 1 6 1Z",
    triangle: "M12 1L21.53 17.5H2.47Z",
    diamond: "M12 1L23 12L12 23L1 12Z",
    pentagon: "M12 1L22.46 8.6L18.47 20.9H5.53L1.54 8.6Z",
    hexagon: "M12 1L21.53 6.5V17.5L12 23L2.47 17.5V6.5Z",
    star: "M12 1L14.59 8.44L22.46 8.6L16.18 13.36L18.47 20.9L12 16.4L5.53 20.9L7.82 13.36L1.54 8.6L9.41 8.44Z",
    burst: "M12 1L14.11 6.92L19.78 4.22L17.08 9.9L23 12L17.08 14.1L19.78 19.78L14.11 17.08L12 23L9.89 17.08L4.22 19.78L6.92 14.1L1 12L6.92 9.9L4.22 4.22L9.89 6.92Z",
    cross: "M9 1H15V9H23V15H15V23H9V15H1V9H9Z",
    arrow: "M1 9H13V3L23 12L13 21V15H1Z",
    heart: "M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z",
    drop: "M12 1C12 1 21 10.5 21 15.5A9 9 0 1 1 3 15.5C3 10.5 12 1 12 1Z",
    moon: "M14 1C7.9 1 3 5.9 3 12C3 18.1 7.9 23 14 23C15.8 23 17.5 22.6 19 21.8C13.5 20.4 9.5 16.7 9.5 12C9.5 7.3 13.5 3.6 19 2.2C17.5 1.4 15.8 1 14 1Z",
    blob: "M15.5 2C20 3.5 23 7 22.5 12C22 17 18.5 22 13 22.5C7.5 23 3 19.5 2 14.5C1 9.5 3.5 4 8 2C10.5 1 13 1 15.5 2Z",
}
// Listed literally rather than via Object.keys, so the titles below can never
// drift out of step with the order Framer shows them in.
const SHAPE_KEYS = [
    "circle", "ring", "square", "rounded", "triangle", "diamond", "pentagon", "hexagon",
    "star", "burst", "cross", "arrow", "heart", "drop", "moon", "blob",
]
const SHAPE_TITLES = [
    "Circle", "Ring", "Square", "Rounded", "Triangle", "Diamond", "Pentagon", "Hexagon",
    "Star", "Burst", "Cross", "Arrow", "Heart", "Drop", "Moon", "Blob",
]
const PATH_A = SHAPES.circle
const PATH_B = SHAPES.diamond

// An unknown key — an instance saved before a rename, a hand-edited value — falls
// back rather than handing Path2D undefined and blanking that side of the morph.
function shapeKey(v: unknown, fb: string): string {
    const k = typeof v === "string" ? v : ""
    return SHAPES[k] ? k : fb
}

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

function parseRGB(input: string | undefined, fb: [number, number, number]): [number, number, number] {
    if (!input) return fb
    const str = String(input).trim()
    if (str.charAt(0) === "#") {
        let hex = str.slice(1)
        if (hex.length === 3 || hex.length === 4) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
        }
        if (hex.length >= 6) {
            const r = parseInt(hex.slice(0, 2), 16)
            const g = parseInt(hex.slice(2, 4), 16)
            const b = parseInt(hex.slice(4, 6), 16)
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r, g, b]
        }
        return fb
    }
    const m = str.match(/[\d.]+/g)
    if (m && m.length >= 3) return [+m[0], +m[1], +m[2]]
    return fb
}

type Pt = { x: number; y: number }
type Mask = { img: ImageData; size: number }

const MASK_SIZE = 320

function maskCanvas(size: number) {
    const c = document.createElement("canvas")
    c.width = size
    c.height = size
    return c
}

function maskFromPath(d: string, size: number): Mask | null {
    if (typeof document === "undefined" || typeof Path2D === "undefined") return null
    const c = maskCanvas(size)
    const x = c.getContext("2d", { willReadFrequently: true })
    if (!x) return null
    x.setTransform(size / 24, 0, 0, size / 24, 0, 0)
    x.fillStyle = "#000"
    try {
        x.fill(new Path2D(d), "evenodd")
    } catch {
        return null
    }
    x.setTransform(1, 0, 0, 1, 0, 0)
    return { img: x.getImageData(0, 0, size, size), size }
}

function maskFromText(text: string, family: string, weight: string, size: number): Mask | null {
    if (typeof document === "undefined") return null
    const c = maskCanvas(size)
    const x = c.getContext("2d", { willReadFrequently: true })
    if (!x) return null
    const box = size * 0.86
    x.textAlign = "center"
    x.textBaseline = "middle"
    // Fit by MEASURING the advance: a fixed size makes one word tiny and clips the next.
    const lines = String(text).split("\n")
    const probe = 100
    x.font = weight + " " + probe + "px " + family
    let widest = 1
    for (const ln of lines) widest = Math.max(widest, x.measureText(ln).width)
    const fs = Math.max(4, Math.min((box / widest) * probe, (box / (lines.length * 1.12)) * probe))
    x.font = weight + " " + fs.toFixed(1) + "px " + family
    x.fillStyle = "#000"
    const step = fs * 1.12
    const y0 = size / 2 - ((lines.length - 1) * step) / 2
    for (let i = 0; i < lines.length; i++) x.fillText(lines[i], size / 2, y0 + i * step)
    return { img: x.getImageData(0, 0, size, size), size }
}

// Alpha where the source has any, luminance where it does not, so a PNG cutout and
// an opaque JPEG both end up as the same kind of mask.
function maskFromImage(im: HTMLImageElement, size: number): Mask | null {
    if (typeof document === "undefined" || !im.naturalWidth) return null
    const c = maskCanvas(size)
    const x = c.getContext("2d", { willReadFrequently: true })
    if (!x) return null
    const box = size * 0.86
    const k = Math.min(box / im.naturalWidth, box / im.naturalHeight)
    const dw = im.naturalWidth * k
    const dh = im.naturalHeight * k
    try {
        x.drawImage(im, (size - dw) / 2, (size - dh) / 2, dw, dh)
    } catch {
        return null
    }
    let img: ImageData
    try {
        img = x.getImageData(0, 0, size, size)
    } catch {
        return null // a cross-origin source taints the canvas
    }
    const d = img.data
    let hasAlpha = false
    for (let i = 3; i < d.length; i += 4 * 97) {
        if (d[i] < 250) {
            hasAlpha = true
            break
        }
    }
    for (let i = 0; i < d.length; i += 4) {
        const lum = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000
        d[i + 3] = (hasAlpha ? d[i + 3] > 127 : lum > 127) ? 255 : 0
    }
    return { img, size }
}

// Points scattered evenly INSIDE the mask, centred and normalised to its own
// bounding box, so a wide mark and a tall one fill the same frame.
function fitPoints(mask: Mask | null, spacing: number, rand: () => number): Pt[] {
    const out: Pt[] = []
    if (!mask) return out
    const S = mask.size
    const data = mask.img.data
    const hit = new Uint8Array(S * S)
    let x0 = 1e9
    let x1 = -1e9
    let y0 = 1e9
    let y1 = -1e9
    let any = false
    for (let i = 0; i < S * S; i++) {
        if (data[i * 4 + 3] <= 128) continue
        any = true
        hit[i] = 1
        const gx = i % S
        const gy = (i / S) | 0
        if (gx < x0) x0 = gx
        if (gx > x1) x1 = gx
        if (gy < y0) y0 = gy
        if (gy > y1) y1 = gy
    }
    if (!any) return out
    const span = Math.max(x1 - x0, y1 - y0) || 1
    const mx = (x0 + x1) / 2
    const my = (y0 + y1) / 2
    // a jittered grid at the glyph's own advance: letters sit shoulder to shoulder
    // without stacking into a smear
    const cell = Math.max(1.6, spacing * span)
    for (let gy2 = y0; gy2 < y1; gy2 += cell) {
        for (let gx2 = x0; gx2 < x1; gx2 += cell) {
            const jx = gx2 + rand() * cell
            const jy = gy2 + rand() * cell
            const ix = jx | 0
            const iy = jy | 0
            if (ix < 0 || ix >= S || iy < 0 || iy >= S || !hit[iy * S + ix]) continue
            out.push({ x: (jx - mx) / span, y: (jy - my) / span })
        }
    }
    return out
}

function markKeyOf(v: Record<string, number | string>, spacing: number, markSize: number): string {
    return [
        v.source, v.textA, v.textB, v.fontFamily, v.fontWeight,
        v.shapeA, v.shapeB, v.imageA, v.imageB, spacing, markSize,
    ].join("|")
}

// Sort by bearing about the centre, so glyph i in one mark maps to the glyph at
// the same angle in the other and the morph reads as a rotation, not a shuffle.
function byAngle(set: Pt[]): number[] {
    return set
        .map((p, i) => ({ i, a: Math.atan2(p.y, p.x), r: Math.hypot(p.x, p.y) }))
        .sort((u, v) => u.a - v.a || u.r - v.r)
        .map((o) => o.i)
}

type CloudGroup = { markSize?: number; spacing?: number; breath?: number }
const CLOUD_DEFAULTS: Required<CloudGroup> = { markSize: 100, spacing: 106, breath: 0 }

type MarkGroup = {
    source?: string
    textA?: string
    textB?: string
    shapeA?: string
    shapeB?: string
    imageA?: string
    imageB?: string
}
const MARK_DEFAULTS: Required<Pick<MarkGroup, "source" | "textA" | "textB" | "shapeA" | "shapeB" | "imageA" | "imageB">> = {
    source: "text",
    textA: "BEFORE",
    textB: "AFTER",
    shapeA: "circle",
    shapeB: "diamond",
    imageA: "",
    imageB: "",
}

interface Props {
    style?: React.CSSProperties
    width?: number
    height?: number
    background?: string
    baseColor?: string
    mark?: MarkGroup
    glyphSize?: number
    speed?: number
    cloud?: CloudGroup
}

export default function MorphingGlyphCloud(props: Props) {
    const {
        style,
        background = "#0B0C0E",
        baseColor = "#00FFFA",
        mark,
        glyphSize = 77,
        speed = 50,
        cloud,
        width,
        height,
    } = props

    // A group the designer never opened arrives undefined; spread-merging over a
    // typed literal beats a hand-written ?? chain, where one missed key silently
    // pins a control forever.
    const cloud_ = { ...CLOUD_DEFAULTS, ...(cloud || {}) }
    const mark_ = { ...MARK_DEFAULTS, ...(mark || {}) }

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    const ptrRef = useRef({ on: 0, x: -1e9, y: -1e9, toggle: 0 })

    // Every live input is read from a ref inside the loop. Putting any of them in
    // the effect deps would restart the loop on every colour tweak.
    const vRef = useRef<Record<string, number | string>>({})
    vRef.current = {
        base: baseColor,
        source: String(mark_.source || "text"),
        textA: String(mark_.textA ?? ""),
        textB: String(mark_.textB ?? ""),
        shapeA: shapeKey(mark_.shapeA, "circle"),
        shapeB: shapeKey(mark_.shapeB, "diamond"),
        imageA: String((mark_ as MarkGroup).imageA || ""),
        imageB: String((mark_ as MarkGroup).imageB || ""),
        glyphSize: clampN(num(glyphSize, 100), 20, 300) / 100,
        speed: clampN(num(speed, 50), 0, 100) / 50,
        markSize: clampN(num(cloud_.markSize, 88), 20, 100) / 100,
        spacing: clampN(num(cloud_.spacing, 100), 40, 300) / 100,
        breath: clampN(num(cloud_.breath, 100), 0, 400) / 100,
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) {
            console.error("MorphingGlyphCloud: 2D context unavailable")
            return
        }

        let pair: [Pt, Pt][] = []
        let glyphs: { c: string; ph: number; sp: number; wob: number }[] = []
        let builtKey = ""

        // Two images have to BOTH be decoded before the pairing means anything, so a
        // side that has not arrived yet falls back to its built-in shape and the
        // rebuild is retriggered by onload.
        const media = {
            a: null as HTMLImageElement | null,
            b: null as HTMLImageElement | null,
            urlA: "",
            urlB: "",
        }
        const loadInto = (slot: "a" | "b", url: string) => {
            const im = new Image()
            im.crossOrigin = "anonymous" // or getImageData taints and throws
            im.onload = () => {
                media[slot] = im
                builtKey = "" // force a rebuild now that the pixels exist
            }
            im.onerror = () => {
                media[slot] = null
                builtKey = ""
            }
            im.src = url
        }

        const maskFor = (v: Record<string, number | string>, side: "A" | "B"): Mask | null => {
            const fallbackPath = side === "A" ? PATH_A : PATH_B
            // No load, no taint, no async: a shape is already a path, so this side
            // never has to fall through to the built-in and wait for an onload.
            if ((v.source as string) === "shape") {
                const key = v[("shape" + side) as "shapeA" | "shapeB"] as string
                return maskFromPath(SHAPES[key] || fallbackPath, MASK_SIZE)
            }
            if ((v.source as string) === "image") {
                const url = v[("image" + side) as "imageA" | "imageB"] as string
                if (!url) return maskFromPath(fallbackPath, MASK_SIZE)
                const slot = side === "A" ? "a" : "b"
                const urlKey = side === "A" ? "urlA" : "urlB"
                if (media[urlKey] !== url) {
                    media[urlKey] = url
                    media[slot] = null
                    loadInto(slot, url)
                    return maskFromPath(fallbackPath, MASK_SIZE)
                }
                const im = media[slot]
                if (!im) return maskFromPath(fallbackPath, MASK_SIZE)
                return maskFromImage(im, MASK_SIZE) || maskFromPath(fallbackPath, MASK_SIZE)
            }
            const text = String(v[("text" + side) as "textA" | "textB"] || "").trim()
            if (!text) return maskFromPath(fallbackPath, MASK_SIZE)
            return (
                maskFromText(text, FACE, "700", MASK_SIZE) ||
                maskFromPath(fallbackPath, MASK_SIZE)
            )
        }

        const build = (v: Record<string, number | string>, spacing: number, markSize: number) => {
            const rand = rng(9152026)
            // The gap is the glyph's own advance expressed in the mark's normalised
            // units, so it has to divide by the size the cloud is actually DRAWN at.
            // Dividing by the source's fixed 0.6 instead — as this did — samples at the wrong
            // density for every Mark Size except the one it was written for, and the
            // letters come out too sparse to read.
            const gap = ((FS * 0.6 * 1.06) / Math.max(0.05, markSize)) * spacing
            const A = fitPoints(maskFor(v, "A"), gap, rand)
            const B = fitPoints(maskFor(v, "B"), gap, rand)
            pair = []
            glyphs = []
            builtKey = markKeyOf(v, spacing, markSize)
            if (!A.length || !B.length) return
            const oa = byAngle(A)
            const ob = byAngle(B)
            const M = Math.min(A.length, B.length)
            for (let j = 0; j < M; j++) {
                pair.push([A[oa[((j * A.length) / M) | 0]], B[ob[((j * B.length) / M) | 0]]])
            }
            for (let i = 0; i < pair.length; i++) {
                glyphs.push({
                    c: CHARS.charAt((rand() * CHARS.length) | 0),
                    ph: rand() * Math.PI * 2,
                    sp: 0.55 + rand() * 0.9,
                    wob: 0.4 + rand() * 0.8,
                })
            }
        }

        let raf = 0
        let last = performance.now()
        let clock = 0
        let m = 0
        let target = 0
        let seenToggle = 0

        const render = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            const v = vRef.current
            const sp = v.speed as number
            clock += dt * sp

            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            const cw = sizeRef.current.w || canvas.clientWidth || 1200
            const ch = sizeRef.current.h || canvas.clientHeight || 800
            const bw = Math.max(1, Math.round(cw * dpr))
            const bh = Math.max(1, Math.round(ch * dpr))
            if (canvas.width !== bw || canvas.height !== bh) {
                canvas.width = bw
                canvas.height = bh
            }
            // setTransform is ABSOLUTE, so re-applying it per frame cannot compound.
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.clearRect(0, 0, cw, ch)

            if (markKeyOf(v, v.spacing as number, v.markSize as number) !== builtKey) {
                build(v, v.spacing as number, v.markSize as number)
            }
            if (!pair.length) {
                raf = requestAnimationFrame(render)
                return
            }

            const ptr = ptrRef.current
            if (ptr.toggle !== seenToggle) {
                seenToggle = ptr.toggle
                target = 1 - target
            }

            m += (target - m) * Math.min(1, (dt * sp) / MORPH_TAU)
            const e = m < 0.5 ? 4 * m * m * m : 1 - Math.pow(-2 * m + 2, 3) / 2 // easeInOutCubic

            const u = Math.min(cw, ch)
            const span = u * (v.markSize as number)
            const cx = cw / 2
            const cy = ch / 2
            const fs = u * FS * (v.glyphSize as number)
            const travel = 4 * e * (1 - e) // loosest at the halfway point
            const breath = u * 0.0035 * (v.breath as number)

            const ink = parseRGB(v.base as string, [226, 228, 233])
            const rgb = ink[0] + "," + ink[1] + "," + ink[2]
            ctx.textAlign = "center"
            ctx.textBaseline = "middle"
            ctx.font = "bold " + fs.toFixed(2) + "px " + FACE
            ctx.fillStyle = "rgba(" + rgb + ",0.88)"

            const hv = HOVER_K * ptr.on
            const rr = u * 0.1
            let dirty = false

            for (let i = 0; i < pair.length; i++) {
                const g = glyphs[i]
                const p = pair[i]
                const ux = p[0].x + (p[1].x - p[0].x) * e
                const uy = p[0].y + (p[1].y - p[0].y) * e
                let pxx = cx + ux * span
                let pyy = cy + uy * span

                // a slow breath at rest, an arc while morphing
                pxx += Math.sin(clock * g.sp + g.ph) * breath * g.wob
                pyy += Math.cos(clock * g.sp * 0.9 + g.ph) * breath * g.wob
                pyy -= travel * Math.sin(g.ph) * u * 0.05

                let a = 0.88
                if (hv > 0) {
                    const dx = pxx - ptr.x
                    const dy = pyy - ptr.y
                    const d2 = dx * dx + dy * dy
                    if (d2 < rr * rr) {
                        const d = Math.sqrt(d2) || 1
                        const push = 1 - d / rr
                        pxx += (dx / d) * push * push * u * 0.055 * hv
                        pyy += (dy / d) * push * push * u * 0.055 * hv
                        a = 0.88 - 0.35 * push * hv
                    }
                }
                // fillStyle is only touched when the value actually changes
                if (a !== 0.88) {
                    ctx.fillStyle = "rgba(" + rgb + "," + Math.max(0, a).toFixed(3) + ")"
                    dirty = true
                } else if (dirty) {
                    ctx.fillStyle = "rgba(" + rgb + ",0.88)"
                    dirty = false
                }
                ctx.fillText(g.c, pxx, pyy)
            }

            raf = requestAnimationFrame(render)
        }

        // The rect RATIO is zoom-invariant — offset and size scale together — so
        // this is safe on a zoomed Framer canvas where absolute px are not.
        const track = (e: PointerEvent) => {
            const r = canvas.getBoundingClientRect()
            if (r.width <= 0 || r.height <= 0) return
            const cw = sizeRef.current.w || canvas.clientWidth || 1200
            const ch = sizeRef.current.h || canvas.clientHeight || 800
            ptrRef.current.x = ((e.clientX - r.left) / r.width) * cw
            ptrRef.current.y = ((e.clientY - r.top) / r.height) * ch
            ptrRef.current.on = 1
        }
        const onLeave = () => {
            ptrRef.current.on = 0
        }
        const onDown = () => {
            ptrRef.current.toggle++
        }

        canvas.addEventListener("pointermove", track)
        canvas.addEventListener("pointerenter", track)
        canvas.addEventListener("pointerleave", onLeave)
        canvas.addEventListener("pointerdown", onDown)
        raf = requestAnimationFrame(render)

        return () => {
            cancelAnimationFrame(raf)
            canvas.removeEventListener("pointermove", track)
            canvas.removeEventListener("pointerenter", track)
            canvas.removeEventListener("pointerleave", onLeave)
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
