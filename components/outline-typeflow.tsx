"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const MAX_DPR = 2
const FACE = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif'
const QA = Math.PI / 36 // 5 degrees: the angle quantum that stops the type shimmering
// The silhouette traced until a source is chosen, and whenever one fails to load.
// A ring with a triangle inside, so the multi-loop handling is exercised by default.
const FALLBACK_PATH = "M12 1.5A10.5 10.5 0 1 1 11.99 1.5Z M12 7.2L17 16.2H7Z"

type Line = { pts: { x: number; y: number }[]; acc: number[]; len: number }

function num(v: unknown, fb: number): number {
    return typeof v === "number" && isFinite(v) ? v : fb
}

function clampN(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v
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

// ---- the mark: text or an image, reduced to its OUTLINE ---------------------
//
// This study runs type ALONG the contour and rotates every glyph to the local
// tangent, so unlike its Elements siblings it cannot work from a distance field —
// it needs ordered boundary loops. The mask is traced with marching squares,
// which handles several shapes and their holes without special cases, and each
// loop is then arc-length parameterised so a glyph can be placed by distance.

const MASK_SIZE = 512 // text and images are traced once, so they get the big mask
const FACE_FALLBACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif'

type Mask = { img: ImageData; size: number; s: number; off: number }

function maskCanvas(size: number) {
    const c = document.createElement("canvas")
    c.width = size
    c.height = size
    return c
}

function maskFromPath(pathStr: string, size: number): Mask | null {
    if (typeof document === "undefined" || typeof Path2D === "undefined") return null
    const c = maskCanvas(size)
    const ctx = c.getContext("2d", { willReadFrequently: true })
    if (!ctx) return null
    const box = size * 0.72
    const sc = box / 24
    const off = (size - box) / 2
    ctx.setTransform(sc, 0, 0, sc, off, off)
    ctx.fillStyle = "#fff"
    try {
        ctx.fill(new Path2D(pathStr))
    } catch {
        return null
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    return { img: ctx.getImageData(0, 0, size, size), size, s: sc, off }
}

function maskFromText(text: string, family: string, weight: string, size: number, letterSpacing: number): Mask | null {
    if (typeof document === "undefined") return null
    const c = maskCanvas(size)
    const ctx = c.getContext("2d", { willReadFrequently: true })
    if (!ctx) return null
    const box = size * 0.72
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    // Fit by MEASURING the advance, not by guessing a size: a fixed size makes one
    // word tiny and clips the next.
    const lines = String(text).split("\n")
    const probe = 100
    ctx.font = weight + " " + probe + "px " + family
    let widest = 1
    for (const ln of lines) widest = Math.max(widest, ctx.measureText(ln).width)
    const fs = Math.max(4, Math.min((box / widest) * probe, (box / (lines.length * 1.12)) * probe))
    ctx.font = weight + " " + fs.toFixed(1) + "px " + family
    ctx.fillStyle = "#fff"
    const step = fs * 1.12
    const y0 = size / 2 - ((lines.length - 1) * step) / 2
    const ls = clampN(num(letterSpacing, 0), 0, 60)
    if (ls > 0) {
        // per-glyph draw: canvas text has no native API for a flat inter-letter gap
        ctx.textAlign = "left"
        for (let i = 0; i < lines.length; i++) {
            const ln = lines[i]
            let w = 0
            for (const ch of ln) w += ctx.measureText(ch).width + ls
            w -= ls
            let x = size / 2 - w / 2
            for (const ch of ln) {
                ctx.fillText(ch, x, y0 + i * step)
                x += ctx.measureText(ch).width + ls
            }
        }
    } else {
        for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], size / 2, y0 + i * step)
    }
    return { img: ctx.getImageData(0, 0, size, size), size, s: box / 24, off: (size - box) / 2 }
}

// An image, fitted and thresholded into a silhouette. Alpha is
// used where the source has any, luminance where it does not, so a PNG cutout and
// an opaque JPEG both end up as the same kind of mask.
function maskFromMedia(
    src: HTMLImageElement,
    w: number,
    h: number,
    size: number
): Mask | null {
    if (typeof document === "undefined" || !w || !h) return null
    const c = maskCanvas(size)
    const ctx = c.getContext("2d", { willReadFrequently: true })
    if (!ctx) return null
    const box = size * 0.72
    const k = Math.min(box / w, box / h) // contain, so nothing is cropped away
    const dw = w * k
    const dh = h * k
    try {
        ctx.drawImage(src, (size - dw) / 2, (size - dh) / 2, dw, dh)
    } catch {
        return null
    }
    let img: ImageData
    try {
        img = ctx.getImageData(0, 0, size, size)
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
    return { img, size, s: box / 24, off: (size - box) / 2 }
}

// Marching squares. Each cell emits 0-2 segments between edge midpoints; the two
// saddle cases emit two. Segments are then chained by their endpoints into closed
// loops, which is what gives the type a path it can run forever without falling
// off the end.
function traceContours(mask: Mask, minLen: number): Line[] {
    const { img, size, s, off } = mask
    const on = (x: number, y: number) =>
        x >= 0 && y >= 0 && x < size && y < size && img.data[(y * size + x) * 4 + 3] > 127

    // endpoints land on half-integer coordinates, so doubling makes an exact key
    const key = (x: number, y: number) => Math.round(x * 2) * 4096 + Math.round(y * 2)
    const links = new Map<number, number[]>()
    const addSeg = (ax: number, ay: number, bx: number, by: number) => {
        const ka = key(ax, ay)
        const kb = key(bx, by)
        if (ka === kb) return
        const la = links.get(ka)
        if (la) la.push(kb)
        else links.set(ka, [kb])
        const lb = links.get(kb)
        if (lb) lb.push(ka)
        else links.set(kb, [ka])
    }

    for (let y = -1; y < size; y++) {
        for (let x = -1; x < size; x++) {
            const a = on(x, y) ? 1 : 0
            const b = on(x + 1, y) ? 2 : 0
            const c = on(x + 1, y + 1) ? 4 : 0
            const d = on(x, y + 1) ? 8 : 0
            const code = a | b | c | d
            if (code === 0 || code === 15) continue
            const T = [x + 0.5, y]
            const Rr = [x + 1, y + 0.5]
            const B = [x + 0.5, y + 1]
            const L = [x, y + 0.5]
            switch (code) {
                case 1: case 14: addSeg(L[0], L[1], T[0], T[1]); break
                case 2: case 13: addSeg(T[0], T[1], Rr[0], Rr[1]); break
                case 3: case 12: addSeg(L[0], L[1], Rr[0], Rr[1]); break
                case 4: case 11: addSeg(Rr[0], Rr[1], B[0], B[1]); break
                case 6: case 9: addSeg(T[0], T[1], B[0], B[1]); break
                case 7: case 8: addSeg(L[0], L[1], B[0], B[1]); break
                // saddles: two separate crossings through one cell
                case 5: addSeg(L[0], L[1], T[0], T[1]); addSeg(Rr[0], Rr[1], B[0], B[1]); break
                case 10: addSeg(T[0], T[1], Rr[0], Rr[1]); addSeg(L[0], L[1], B[0], B[1]); break
            }
        }
    }

    const unkey = (k: number) => ({ x: Math.floor(k / 4096) / 2, y: (k % 4096) / 2 })
    const seen = new Set<number>()
    const out: Line[] = []
    // one sample every few pixels: the raw trace is denser than the type can use
    const decim = Math.max(1, Math.round(size / 220))

    for (const startK of links.keys()) {
        if (seen.has(startK)) continue
        let cur = startK
        let prev = -1
        const loop: { x: number; y: number }[] = []
        let guard = 0
        while (guard++ < size * 12) {
            seen.add(cur)
            const p = unkey(cur)
            loop.push({ x: (p.x - off) / s, y: (p.y - off) / s }) // back into 24-unit space
            const nbrs = links.get(cur)
            if (!nbrs) break
            let next = -1
            for (const n of nbrs) {
                if (n === prev) continue
                if (!seen.has(n) || n === startK) {
                    next = n
                    break
                }
            }
            if (next === -1 || next === startK) break
            prev = cur
            cur = next
        }
        if (loop.length < 12) continue
        const pts = decim > 1 ? loop.filter((_, i) => i % decim === 0) : loop
        if (pts.length < 6) continue
        const acc = [0]
        for (let i = 1; i < pts.length; i++) {
            acc.push(acc[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y))
        }
        // close the loop so the type wraps instead of stopping at the seam
        acc.push(acc[acc.length - 1] + Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y))
        const closed = pts.concat([pts[0]])
        const len = acc[acc.length - 1]
        if (len > minLen) out.push({ pts: closed, acc, len })
    }
    return out
}

const _pt = { x: 0, y: 0, a: 0 }
function atLength(line: Line, t: number) {
    const len = line.len
    let u = t - Math.floor(t / len) * len // wrap: a subpath is a loop
    const a = line.acc
    let lo = 0
    let hi = a.length - 1
    while (lo < hi - 1) {
        const m = (lo + hi) >> 1
        if (a[m] <= u) lo = m
        else hi = m
    }
    const seg = a[hi] - a[lo] || 1
    const f = (u - a[lo]) / seg
    const p0 = line.pts[lo]
    const p1 = line.pts[hi]
    _pt.x = p0.x + (p1.x - p0.x) * f
    _pt.y = p0.y + (p1.y - p0.y) * f
    _pt.a = Math.atan2(p1.y - p0.y, p1.x - p0.x)
    return _pt
}

type FlowGroup = { markSize?: number; spacing?: number; kick?: number; light?: number }
const FLOW_DEFAULTS: Required<FlowGroup> = { markSize: 82, spacing: 100, kick: 100, light: 100 }

type MarkGroup = {
    source?: string
    text?: string
    image?: string
    letterSpacing?: number
}
const MARK_DEFAULTS: Required<Pick<MarkGroup, "source" | "text">> = { source: "text", text: "flow" }

interface Props {
    style?: React.CSSProperties
    width?: number
    height?: number
    background?: string
    baseColor?: string
    phrase?: string
    mark?: MarkGroup
    glyphSize?: number
    speed?: number
    hover?: number
    flow?: FlowGroup
}

export default function OutlineTypeflow(props: Props) {
    const {
        style,
        background = "#0B0C0E",
        baseColor = "#00FFDF",
        phrase = "thetyperunsthepathandwritesitbackagain",
        mark,
        glyphSize = 100,
        speed = 26,
        hover = 200,
        flow,
        width,
        height,
    } = props

    // A group the designer never opened arrives undefined; spread-merging over a
    // typed literal beats a hand-written ?? chain, where one missed key silently
    // pins a control forever.
    const flow_ = { ...FLOW_DEFAULTS, ...(flow || {}) }
    const mark_ = { ...MARK_DEFAULTS, ...(mark || {}) }

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    const ptrRef = useRef({ on: 0, x: -1e9, y: -1e9, kick: -1e9 })

    // Every live input is read from a ref inside the loop. Putting any of them in
    // the effect deps would restart the loop on every colour tweak.
    const vRef = useRef<Record<string, number | string>>({})
    vRef.current = {
        base: baseColor,
        phrase: String(phrase || "").length ? String(phrase) : "path",
        source: String(mark_.source || "text"),
        text: String(mark_.text ?? ""),
        image: String((mark_ as MarkGroup).image || ""),
        glyphSize: clampN(num(glyphSize, 100), 20, 300) / 100,
        speed: clampN(num(speed, 50), 0, 100) / 50,
        hover: clampN(num(hover, 100), 0, 200) / 100,
        markSize: clampN(num(flow_.markSize, 82), 20, 100) / 100,
        spacing: clampN(num(flow_.spacing, 100), 40, 400) / 100,
        kick: clampN(num(flow_.kick, 100), 0, 300) / 100,
        light: clampN(num(flow_.light, 100), 0, 300) / 100,
        markLetterSpacing: clampN(num((mark_ as MarkGroup).letterSpacing, 0), 0, 60),
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) {
            console.error("OutlineTypeflow: 2D context unavailable")
            return
        }

        // The mark is traced ONCE per change — and for a video, at a fixed low rate.
        // Tracing per frame is what makes this kind of study stutter.
        let lines: Line[] = []
        let markKey = ""
        let warned = false
        const media = { img: null as HTMLImageElement | null, url: "" }

        const traceMask = (m: Mask | null) => {
            if (!m) return false
            const got = traceContours(m, 0.4)
            if (!got.length) return false
            lines = got
            return true
        }
        const fallback = () => traceMask(maskFromPath(FALLBACK_PATH, MASK_SIZE))

        const build = (v: Record<string, number | string>) => {
            const src = v.source as string
            if (src === "image") {
                const url = v.image as string
                if (!url) return fallback()
                if (media.url !== url) {
                    media.url = url
                    const im = new Image()
                    im.crossOrigin = "anonymous" // or getImageData taints and throws
                    im.onload = () => {
                        media.img = im
                        markKey = "" // force a retrace now that the pixels exist
                    }
                    im.onerror = () => {
                        media.img = null
                        markKey = ""
                    }
                    im.src = url
                    return fallback()
                }
                const im = media.img
                if (!im || !im.naturalWidth) return fallback()
                if (!traceMask(maskFromMedia(im, im.naturalWidth, im.naturalHeight, MASK_SIZE))) {
                    if (!warned) {
                        warned = true
                        console.warn("OutlineTypeflow: the image could not be traced, showing the fallback mark")
                    }
                    return fallback()
                }
                return true
            }
            const text = (v.text as string).trim()
            if (!text) return fallback()
            return (
                traceMask(maskFromText(text, FACE_FALLBACK, "700", MASK_SIZE, v.markLetterSpacing as number)) ||
                fallback()
            )
        }

        let raf = 0
        let last = performance.now()
        let clock = 0
        let flowPos = 0
        let rate = 1

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

            const key =
                (v.source as string) + "|" + (v.text as string) + "|" + (v.image as string) + "|" + (v.markLetterSpacing as number)
            if (key !== markKey) {
                markKey = key
                build(v)
            }
            if (!lines.length) {
                raf = requestAnimationFrame(render)
                return
            }

            const u = Math.min(cw, ch)
            const ptr = ptrRef.current
            const hv = (v.hover as number) * ptr.on
            const want = 1 + hv * 2.1 // the source's 1 -> 3.1 under the hand
            rate += (want - rate) * Math.min(1, (dt * sp) / 0.28)
            flowPos += rate * dt * sp * 1.9

            const span = u * (v.markSize as number)
            const k = span / 24
            const cx = cw / 2 - 12 * k
            const cy = ch / 2 - 12 * k
            const fs = u * 0.025 * (v.glyphSize as number)
            const step = (fs * 0.76 * (v.spacing as number)) / k // spacing in path units

            // the most recent click sends a shove outward that settles back
            let kick = 0
            if (ptr.kick > -1e8) {
                const age = clock - ptr.kick
                kick = Math.max(0, 1 - age / 1.1)
                kick = kick * kick * (v.kick as number)
            }

            const ink = parseRGB(v.base as string, [226, 228, 233])
            const rgb = ink[0] + "," + ink[1] + "," + ink[2]
            ctx.textAlign = "center"
            ctx.textBaseline = "middle"
            ctx.font = "bold " + fs.toFixed(2) + "px " + FACE
            const base = 0.92 - kick * 0.35
            ctx.fillStyle = "rgba(" + rgb + "," + base.toFixed(3) + ")"

            let lit = -1
            const lx = ptr.on ? ptr.x : -1e9
            const ly = ptr.on ? ptr.y : -1e9
            const LR = u * 0.22
            const LR2 = LR * LR
            const glowK = (v.light as number) * (v.hover as number)

            const text = v.phrase as string
            let idx = 0
            for (let li = 0; li < lines.length; li++) {
                const line = lines[li]
                const n = Math.max(3, Math.round(line.len / step))
                const sps = line.len / n
                for (let i = 0; i < n; i++) {
                    const q = atLength(line, i * sps + flowPos)
                    let pxx = cx + q.x * k
                    let pyy = cy + q.y * k

                    if (kick > 0) {
                        const dx = pxx - (cx + 12 * k)
                        const dy = pyy - (cy + 12 * k)
                        const d = Math.hypot(dx, dy) || 1
                        const wob = Math.sin(i * 1.7 + li * 2.3)
                        pxx += (dx / d) * kick * u * 0.11 * (0.6 + 0.5 * wob)
                        pyy += (dy / d) * kick * u * 0.11 * (0.6 + 0.5 * wob)
                    }

                    let gd = 0
                    if (ptr.on && glowK > 0) {
                        const ddx = pxx - lx
                        const ddy = pyy - ly
                        const dd = ddx * ddx + ddy * ddy
                        if (dd < LR2) gd = (1 - Math.sqrt(dd) / LR) * glowK
                    }
                    // five quantised levels, so fillStyle is touched a handful of times
                    const lv = Math.min(5, (gd * 5) | 0)
                    if (lv !== lit) {
                        lit = lv
                        const a = base + (1 - base) * ((lv + (lv ? 0.5 : 0)) / 5)
                        ctx.fillStyle = "rgba(" + rgb + "," + Math.min(1, a).toFixed(3) + ")"
                    }
                    ctx.save()
                    ctx.translate(pxx, pyy)
                    // quantised: a tangent that jitters every frame makes canvas
                    // re-rasterise every glyph and the type shimmers
                    ctx.rotate(Math.round(q.a / QA) * QA)
                    ctx.fillText(text.charAt(idx++ % text.length), 0, 0)
                    ctx.restore()
                }
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
            if ((vRef.current.hover as number) <= 0) return
            ptrRef.current.kick = clock
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
