"use client"

/**
 * StammerBands — stacked rows of heavy, extended type, cut into vertical
 * strips that stammer: clean zones read as words, echo zones repeat a letter
 * edge as nested arcs, slab zones drag it into hatched bars, and now and then
 * a section rolls edge-on and flips.
 *
 * `Scale` zooms the whole field about the frame's centre. At 100% `Rows` rows
 * fill the frame edge to edge; below it more rows tile in above and below,
 * above it the outer rows crop. The letters always fill their row.
 */

import * as React from "react"

// ── moved controls (builder) ──
/**
 * Controls moved in the builder: into Advanced, out of it, or into groups of
 * their own. The code reads each one where it was first written, so the props
 * are put back in that shape before anything reads them.
 */
const MOVED_CONTROLS: { into: Record<string, string>; out: Record<string, string> } = {"into":{},"out":{"hover":"advanced"}}
const GROUP_FALLBACKS: Record<string, any> = {  }
function withMovedControls(props: any): any {
    const out = { ...props }
    for (const [k, g] of Object.entries(MOVED_CONTROLS.into)) out[k] = props?.[g]?.[k] ?? GROUP_FALLBACKS[g]?.[k]
    for (const [k, g] of Object.entries(MOVED_CONTROLS.out)) {
        if (out[k] !== undefined) out[g] = { ...(out[g] ?? {}), [k]: out[k] }
    }
    return out
}
// ── /moved controls ──

/** Tuning values. Out of the box these are the look. */
const DEFAULT_ADVANCED = {
    stretch: 135,
    weight: 26,
    capHeight: 93,
    tracking: 6,
    wordGap: 45,
    rowGap: 8,
    drift: 8,
    textScroll: 0,
    zoneSize: 38,
    morph: 45,
    softness: 6,
    echoRate: 16,
    slabRate: 2,
    slabShare: 40,
    edgeBoost: 25,
    jitter: 20,
    twist: 12,
    twistSize: 70,
    rowShift: 37,
    seed: 7,
    pointerRadius: 16,
    grain: 0,
    vignette: 0,
    hover: 50,
}

const DEFAULT_FAMILY = `"Arial Black", "Archivo Black", "Helvetica Neue", Arial, sans-serif`
const REDUCED_T = 1.96

/** The subset of Framer's Font control value this component reads. */
export interface StammerBandsFont {
    fontFamily?: string
    fontWeight?: number | string
    fontStyle?: string
}

export interface StammerBandsProps {
    text?: string
    font?: StammerBandsFont
    textColor?: string
    background?: string
    /** Zoom of the whole field: 100% = `rows` rows filling the frame. */
    scale?: number
    rows?: number
    speed?: number
    distortion?: number
    stripWidth?: number
    advanced?: Partial<typeof DEFAULT_ADVANCED>
    style?: React.CSSProperties
}

function hash2(x: number, y: number) {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
    return s - Math.floor(s)
}

function noise2(x: number, y: number) {
    const ix = Math.floor(x)
    const iy = Math.floor(y)
    const fx = x - ix
    const fy = y - iy
    const ux = fx * fx * (3 - 2 * fx)
    const uy = fy * fy * (3 - 2 * fy)
    const a = hash2(ix, iy)
    const b = hash2(ix + 1, iy)
    const c = hash2(ix, iy + 1)
    const d = hash2(ix + 1, iy + 1)
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
}

function fbm(x: number, y: number) {
    return noise2(x, y) * 0.65 + noise2(x * 2.1 + 19.7, y * 1.6 + 3.1) * 0.35
}

function smoothstep(a: number, b: number, v: number) {
    const t = Math.min(1, Math.max(0, (v - a) / (b - a || 1e-6)))
    return t * t * (3 - 2 * t)
}

function mod(a: number, n: number) {
    return ((a % n) + n) % n
}

/** Stem width of "I" and cap height at a 100px font, measured from pixels. */
function measureGlyph(fontAt100: string) {
    const c = document.createElement("canvas")
    c.width = 240
    c.height = 160
    const g = c.getContext("2d", { willReadFrequently: true })
    if (!g) return { stem: 20, asc: 72 }
    g.font = fontAt100
    const asc = g.measureText("H").actualBoundingBoxAscent || 72
    g.fillStyle = "#fff"
    g.textBaseline = "alphabetic"
    g.fillText("I", 40, 130)
    const y = Math.round(130 - asc * 0.45)
    const row = g.getImageData(0, y, 240, 1).data
    let stem = 0
    for (let i = 3; i < row.length; i += 4) if (row[i] > 127) stem++
    return { stem: stem || 20, asc }
}

/**
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function StammerBands(props: StammerBandsProps) {
    props = withMovedControls(props)
    const {
        text = "TEXT",
        font = {"variant":"Black","fontSize":"16px","textAlign":"left","fontFamily":"Inter","fontWeight":400,"lineHeight":"1.5em","letterSpacing":"0em"},
        textColor = "#00FFDB",
        background = "#000000",
        scale = 88,
        rows = 8,
        speed = 22,
        distortion = 60,
        stripWidth = 8,
        style,
    } = props

    const rootRef = React.useRef<HTMLDivElement>(null)
    const canvasRef = React.useRef<HTMLCanvasElement>(null)
    const settingsRef = React.useRef<StammerBandsProps>({})
    settingsRef.current = {
        text,
        font,
        textColor,
        background,
        scale,
        rows,
        speed,
        distortion,
        stripWidth,
        advanced: props.advanced,
    }
    // Pointer as a 0–1 share of the frame, so it lands under the cursor at any zoom.
    const pointerRef = React.useRef({ u: 0, v: 0, inside: false, down: false })

    React.useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        let size = { w: root.offsetWidth, h: root.offsetHeight }
        const ro = new ResizeObserver(() => {
            size = { w: root.offsetWidth, h: root.offsetHeight }
        })
        ro.observe(root)

        let fontVersion = 0
        const bump = () => {
            fontVersion++
        }
        const fonts = document.fonts
        if (fonts) {
            fonts.ready?.then(bump)
            fonts.addEventListener?.("loadingdone", bump)
        }

        const release = () => {
            pointerRef.current.down = false
        }
        window.addEventListener("pointerup", release)
        window.addEventListener("pointercancel", release)

        const reduced =
            typeof window.matchMedia === "function" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches

        const up = document.createElement("canvas")
        const down = document.createElement("canvas")
        let tileKey = ""
        let tileW = 100
        let tileReady = false

        let grainPattern: CanvasPattern | null = null
        const makeGrain = () => {
            const g = document.createElement("canvas")
            g.width = 160
            g.height = 160
            const gc = g.getContext("2d")
            if (!gc) return null
            const img = gc.createImageData(160, 160)
            for (let i = 0; i < img.data.length; i += 4) {
                const v = Math.random() * 255
                img.data[i] = v
                img.data[i + 1] = v
                img.data[i + 2] = v
                img.data[i + 3] = 255
            }
            gc.putImageData(img, 0, 0)
            return ctx.createPattern(g, "repeat")
        }

        let rates = new Float32Array(0)
        let u0 = new Float32Array(0)
        let sys = new Float32Array(0)

        let tAnim = reduced ? REDUCED_T : 0
        let last: number | null = null
        let over = 0
        let raf = 0

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last == null ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now

            const s = settingsRef.current
            const adv = { ...DEFAULT_ADVANCED, ...(s.advanced ?? {}) }
            const W = size.w
            const H = size.h
            if (W < 2 || H < 2) return
            const dpr = Math.min(2, window.devicePixelRatio || 1)
            const cw = Math.round(W * dpr)
            const ch = Math.round(H * dpr)
            if (canvas.width !== cw || canvas.height !== ch) {
                canvas.width = cw
                canvas.height = ch
            }

            if (!reduced) tAnim += dt * (Math.max(0, s.speed ?? 26) / 50)
            const ptr = pointerRef.current
            const ptrX = ptr.u * W
            const ptrY = ptr.v * H
            over += ((ptr.inside ? 1 : 0) - over) * (1 - Math.exp(-dt * 5))
            const hoverK = Math.max(0, adv.hover) / 50

            // Scale zooms the field about the frame's centre: rows, gaps, letters and
            // zones all scale together, and rows keep tiling to fill the frame. The
            // earlier version shrank the letters inside fixed rows instead, which left
            // Background bands between them below ~65% and clipped them above ~107%.
            const k = Math.max(0.1, (s.scale ?? 100) / 100)
            const rowCount = Math.max(1, Math.min(20, Math.round(s.rows ?? 5)))
            const gap0 = Math.max(0, adv.rowGap)
            const rowH = Math.max(4, ((H - gap0 * (rowCount - 1)) / rowCount) * k)
            const gap = gap0 * k
            const pitch = rowH + gap
            // Row r's top is c + r * pitch; at 100% rows 0…rowCount-1 span exactly 0…H.
            const c = (H - rowH) / 2 - ((rowCount - 1) / 2) * pitch
            const rMin = Math.floor((-rowH - c) / pitch) + 1
            const rMax = Math.min(rMin + 80, Math.ceil((H - c) / pitch) - 1)
            const w = Math.max(2, s.stripWidth ?? 8)
            const str = String(s.text ?? "")
            const hasText = str.trim().length > 0

            const f = s.font || {}
            const family = f.fontFamily || DEFAULT_FAMILY
            const weight = f.fontWeight ?? 900
            const fstyle = f.fontStyle || "normal"
            const stretch = Math.max(0.2, adv.stretch / 100)

            const key = [
                str,
                family,
                weight,
                fstyle,
                s.textColor,
                rowH.toFixed(2),
                dpr,
                adv.stretch,
                adv.weight,
                adv.capHeight,
                adv.tracking,
                adv.wordGap,
                w,
                fontVersion,
            ].join("|")

            if (hasText && key !== tileKey) {
                tileKey = key
                const mc = up.getContext("2d")
                const dc = down.getContext("2d")
                if (mc && dc) {
                    // Heavy, extended type whatever font is installed: measure the
                    // real stem, then thicken with a stroke up to the target weight.
                    const m100 = measureGlyph(`${fstyle} ${weight} 100px ${family}`)
                    const capPx = rowH * (adv.capHeight / 100)
                    const targetStem = (Math.max(0, adv.weight) / 100) * capPx
                    let fontSize = Math.max(4, (capPx / m100.asc) * 100)
                    let lw = Math.max(0, targetStem - ((m100.stem * fontSize) / 100) * stretch) / stretch
                    // The stroke adds lw/2 above and below; shrink the font to keep the cap height.
                    fontSize = Math.max(4, ((capPx - lw) / m100.asc) * 100)
                    lw = Math.max(0, targetStem - ((m100.stem * fontSize) / 100) * stretch) / stretch
                    const fontStr = `${fstyle} ${weight} ${fontSize}px ${family}`

                    mc.setTransform(1, 0, 0, 1, 0, 0)
                    mc.font = fontStr
                    const chars = Array.from(str)
                    // Tracking is a length on the type, so it zooms with it.
                    const spacing = (adv.tracking * k) / stretch + lw
                    const widths = chars.map((ch2) => mc.measureText(ch2).width)
                    let textW = 0
                    for (const cw2 of widths) textW += cw2 + spacing
                    tileW = Math.max(10, textW * stretch + (adv.wordGap / 100) * fontSize)

                    const hD = Math.max(1, Math.ceil(rowH * dpr))
                    const wD = Math.min(16000, Math.ceil((tileW + w * 2 + 4) * dpr))
                    up.width = wD
                    up.height = hD
                    down.width = wD
                    down.height = hD
                    mc.setTransform(dpr, 0, 0, dpr, 0, 0)
                    mc.clearRect(0, 0, wD, hD)
                    mc.font = fontStr
                    mc.fillStyle = s.textColor || "#FFFFFF"
                    mc.strokeStyle = s.textColor || "#FFFFFF"
                    mc.lineWidth = lw
                    mc.lineJoin = "miter"
                    mc.miterLimit = 2
                    mc.textBaseline = "alphabetic"
                    mc.textAlign = "left"
                    const baseY = (rowH + capPx - lw) / 2
                    for (let x = -tileW; x < wD / dpr + tileW; x += tileW) {
                        mc.save()
                        mc.translate(x, baseY)
                        mc.scale(stretch, 1)
                        let cx = lw / 2
                        for (let j = 0; j < chars.length; j++) {
                            mc.fillText(chars[j], cx, 0)
                            if (lw > 0.2) mc.strokeText(chars[j], cx, 0)
                            cx += widths[j] + spacing
                        }
                        mc.restore()
                    }
                    dc.setTransform(1, 0, 0, -1, 0, hD)
                    dc.clearRect(0, 0, wD, hD)
                    dc.drawImage(up, 0, 0)
                    dc.setTransform(1, 0, 0, 1, 0, 0)
                    tileReady = true
                }
            }

            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.globalAlpha = 1
            ctx.globalCompositeOperation = "source-over"
            ctx.fillStyle = s.background || "#000000"
            ctx.fillRect(0, 0, cw, ch)

            if (hasText && tileReady) {
                const n = Math.ceil(W / w) + 1
                if (rates.length < n) {
                    rates = new Float32Array(n)
                    u0 = new Float32Array(n)
                    sys = new Float32Array(n)
                }
                const dist = Math.min(1, Math.max(0, (s.distortion ?? 60) / 100))
                const thresh = 0.3 + 0.4 * dist
                const soft = Math.max(0.005, adv.softness / 100)
                const zoneF = 100 / Math.max(1, adv.zoneSize)
                const twistF = 100 / Math.max(1, adv.twistSize)
                const morph = adv.morph / 100
                const driftW = (tAnim * adv.drift) / 100
                const echo = adv.echoRate / 100
                const slab = adv.slabRate / 100
                const slabCut = adv.slabShare / 100
                const boost = adv.edgeBoost / 100
                const jit = adv.jitter / 100
                const t0 = 0.82 - 0.4 * (adv.twist / 100)
                const twistOn = adv.twist > 0
                const R = Math.max(1, (adv.pointerRadius / 100) * W)
                const hD = up.height
                ctx.imageSmoothingEnabled = true

                for (let r = rMin; r <= rMax; r++) {
                    const rs = adv.seed * 1.37 + r * 7.91
                    const rowY = c + r * pitch
                    const gy = Math.exp(-Math.pow((rowY + rowH / 2 - ptrY) / (rowH * 0.9), 2))
                    const scrollVel = (adv.textScroll / 100) * (0.5 + hash2(r, adv.seed))
                    // Text position in the unzoomed field, mapped through the same
                    // centre zoom as everything else so zooming doesn't slide the words.
                    const phase =
                        -(driftW + tAnim * scrollVel) * W * k +
                        (W / 2) * (k - 1) +
                        r * (adv.rowShift / 100) * tileW +
                        hash2(adv.seed, r + 3) * tileW
                    const zt = tAnim * morph + rs * 3.1

                    let U = 0
                    let sw = 0
                    let sc = 0
                    for (let i = 0; i < n; i++) {
                        const x = (i + 0.5) * w
                        // Zones live in the unzoomed field, so they zoom with the type.
                        const px = (W / 2 + (x - W / 2) / k) / W - driftW
                        const nz = fbm(px * zoneF + rs * 11.3, zt)
                        let cz = smoothstep(thresh - soft, thresh + soft, nz)
                        const n2 = noise2(px * zoneF * 1.7 + rs * 5.7 + 40, zt * 1.3 + 9)
                        const smear = slab + (echo - slab) * smoothstep(slabCut - 0.08, slabCut + 0.08, n2)
                        const jIdx = Math.floor((px * W * k) / w)
                        let rate = smear + jit * (hash2(jIdx, rs) - 0.5)
                        rate = rate * (1 - cz) + cz + boost * 4 * cz * (1 - cz)

                        let pk = 0
                        if (hoverK > 0 && over > 0.001) {
                            pk = Math.min(1, hoverK * over * gy * Math.exp(-Math.pow((x - ptrX) / R, 2)))
                            rate += (echo * 0.5 - rate) * pk
                            cz *= 1 - pk
                        }

                        let theta = 0
                        if (twistOn) {
                            const n3 = noise2(px * twistF + rs * 3.3 + 80, tAnim * morph * 0.8 + rs)
                            theta = smoothstep(t0, t0 + 0.2, n3) * Math.PI
                        }
                        theta += pk * Math.PI * 0.4 * (ptr.down ? 2 : 1)

                        rates[i] = rate
                        sys[i] = Math.cos(theta)
                        u0[i] = U
                        U += rate * w
                        const wt = cz * cz + 0.01
                        sw += wt
                        sc += wt * (i * w + phase - u0[i])
                    }
                    const base = sc / sw

                    const rowYd = Math.round(rowY * dpr)
                    const rowHd = Math.max(1, Math.round((rowY + rowH) * dpr) - rowYd)
                    for (let i = 0; i < n; i++) {
                        const sy = sys[i]
                        const ay = Math.abs(sy)
                        if (ay < 0.03) continue
                        const dxd = Math.round(i * w * dpr)
                        const dwd = Math.round((i + 1) * w * dpr) - dxd
                        if (dwd <= 0 || dxd >= cw) continue
                        const sxd = Math.round(mod(base + u0[i], tileW) * dpr)
                        const dh = Math.max(1, Math.round(rowHd * ay))
                        const dy = rowYd + Math.round((rowHd - dh) / 2)
                        ctx.drawImage(sy < 0 ? down : up, sxd, 0, dwd, hD, dxd, dy, dwd, dh)
                    }
                }
            }

            if (adv.vignette > 0) {
                const v = Math.min(1, adv.vignette / 100)
                const mx = Math.max(cw, ch)
                const g = ctx.createRadialGradient(cw / 2, ch / 2, mx * 0.25, cw / 2, ch / 2, mx * 0.75)
                g.addColorStop(0, "rgba(0,0,0,0)")
                g.addColorStop(1, `rgba(0,0,0,${v})`)
                ctx.fillStyle = g
                ctx.fillRect(0, 0, cw, ch)
            }
            if (adv.grain > 0) {
                if (!grainPattern) grainPattern = makeGrain()
                if (grainPattern) {
                    ctx.save()
                    ctx.globalAlpha = Math.min(1, adv.grain / 100) * 0.35
                    ctx.translate(Math.floor(Math.random() * 160), Math.floor(Math.random() * 160))
                    ctx.fillStyle = grainPattern
                    ctx.fillRect(-160, -160, cw + 160, ch + 160)
                    ctx.restore()
                }
            }
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            window.removeEventListener("pointerup", release)
            window.removeEventListener("pointercancel", release)
            fonts?.removeEventListener?.("loadingdone", bump)
        }
    }, [])

    const onMove = (e: React.PointerEvent) => {
        const root = rootRef.current
        if (!root) return
        const r = root.getBoundingClientRect()
        const p = pointerRef.current
        p.u = (e.clientX - r.left) / (r.width || 1)
        p.v = (e.clientY - r.top) / (r.height || 1)
        p.inside = true
    }

    return (
        <div
            ref={rootRef}
            onPointerEnter={onMove}
            onPointerMove={onMove}
            onPointerLeave={() => {
                pointerRef.current.inside = false
            }}
            onPointerDown={(e) => {
                onMove(e)
                pointerRef.current.down = true
            }}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                background,
                ...style,
                overflow: "hidden",
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

// Control order arranged in the builder.
