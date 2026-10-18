"use client"

/**
 * ChladniTune — sand on a vibrating metal plate, tuned up through its resonances.
 * A frequency sweep climbs with load progress through ascending free-plate modes
 * u = cos(nπx)cos(mπy) ± cos(mπx)cos(nπy). Sand is a Langevin gas: kicks ∝ |u|, drift
 * down ∇(u²), so grains on antinodes hop and grains near nodal lines settle — the
 * figure forms physically. The Hz readout in the corner is the progress readout.
 * Reveal: one loud burst throws the sand off outward and the plate lifts away.
 * Usage: pin over the page (Position Fixed, 100% × 100%). Loops on the canvas; in preview/live it
 * plays once, waits for the real page load, reveals, then fades out.
 *
 * No Snapshot control: the scene never shows page content before the reveal.
 * Colours: `Sand` and `Plate` travel to the loader through the kit palette
 * (`paper` = sand, `ink` = plate).
 *
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
import { useEffect, useRef, type CSSProperties, type MutableRefObject } from "react"

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

// ── preloader-kit v1 ──
// Shared by every preloaders/ component. Canonical copy: preloaders/kit/preloader-kit.v1.ts.
// Edit there, then run preloaders/checks/inject-kit.mjs; preloaders/checks/kit-sync.mjs enforces it.
//
// A loader is { revealS, create(canvas, api) -> { reset, frame, resize? } }, the same
// contract as the First Paint gallery. The kit owns the timeline:
//   CANVAS  loops a simulated load (surges and stalls), reveal, a hold, then again.
//   PREVIEW plays once, gated by the real page load, then fades the overlay out and
//           stops painting, so the page underneath is interactive.
// At reveal = 1 a loader draws api.page() unmodified. page() is TRANSPARENT unless the
// component passes a snapshot (or asks for the demo page), so the reveal ends on the
// live site underneath the overlay.

type LoaderPhase = "loading" | "reveal" | "page"
interface LoaderFrame { t: number; dt: number; progress: number; reveal: number; phase: LoaderPhase }
interface LoaderInstance { reset(): void; frame(f: LoaderFrame): void; resize?(): void }
interface LogoMask { w: number; h: number; data: Uint8Array }
interface SitePalette { paper: string; ink: string; accent: string; sea0: string; sea1: string; dusk: string }
interface LoaderApi {
    readonly W: number
    readonly H: number
    readonly dpr: number
    readonly pageVersion: number
    readonly interaction: boolean
    readonly interactionStrength: number
    readonly clickInteraction: boolean
    readonly clickStrength: number
    readonly multiplePatterns: boolean
    readonly patternCount: number
    page(): HTMLCanvasElement
    drawPage(ctx: CanvasRenderingContext2D, alpha?: number): void
    site: SitePalette
    brand: string
    drawLogo(ctx: CanvasRenderingContext2D, cx: number, cy: number, h: number, color?: string): void
    logoMask(w: number, h: number, fill?: number): LogoMask
    rand(seed: number): () => number
    loadS: number
}
interface LoaderDef { revealS: number; create(canvas: HTMLCanvasElement, api: LoaderApi): LoaderInstance }

interface FramerFont {
    fontFamily?: string
    fontWeight?: number | string
    fontStyle?: string
    fontSize?: number | string
    lineHeight?: number | string
    letterSpacing?: number | string
}
interface PreloaderOptions {
    /** Minimum seconds the load phase plays, even when the page is already loaded. */
    minTime: number
    /** Enable cursor interaction with the particle field. */
    interaction?: boolean
    /** Cursor interaction strength. */
    interactionStrength?: number
    /** Enable click-triggered resonance pulses. */
    clickInteraction?: boolean
    /** Click pulse strength. */
    clickStrength?: number
    /** Blend multiple Chladni modes at once. */
    multiplePatterns?: boolean
    /** Number of simultaneous modes when multiple patterns are enabled. */
    patternCount?: number
    /** Image drawn (cover-fit) as api.page(). */
    snapshot?: string
    /** With no snapshot, page() shows the built-in demo site instead of transparency. */
    demoPage?: boolean
    /** Wordmark for drawLogo / logoMask. */
    text?: string
    font?: FramerFont
    /** Scene palette override; missing keys keep the demo palette. */
    palette?: Partial<SitePalette>
    onComplete?: () => void
}

const PRELOADER_HOLD_S = 1.8
const PRELOADER_DPR_CAP = 2
const PRELOADER_FADE_S = 0.35

function mulberry32(seed: number): () => number {
    let a = seed >>> 0
    return function () {
        a = (a + 0x6d2b79f5) >>> 0
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

/** Simulated load: seeded asset chunks landing at uneven times; exactly 1 at loadS. */
function makeLoadCurve(seed: number, loadS: number): (t: number) => number {
    const r = mulberry32(seed)
    const chunks: { size: number; start: number; len: number }[] = []
    let total = 0
    for (let i = 0; i < 7; i++) {
        const size = 0.4 + r() * 1.2
        chunks.push({ size, start: r() * 0.78 * loadS, len: (0.25 + r() * 0.9) * Math.min(1, loadS / 4.4) })
        total += size
    }
    chunks.push({ size: total * 0.12, start: loadS - 0.45 * Math.min(1, loadS / 4.4), len: 0.45 * Math.min(1, loadS / 4.4) })
    total *= 1.12
    return (t) => {
        if (t >= loadS) return 1
        let p = 0
        for (const c of chunks) {
            const x = Math.min(1, Math.max(0, (t - c.start) / Math.max(1e-3, c.len)))
            p += c.size * x * x * (3 - 2 * x)
        }
        return Math.min(0.999, p / total)
    }
}

/** Real document load, 0..1. Images and fonts pull it up; the window load event finishes it. */
function realLoadProgress(): number {
    if (typeof document === "undefined") return 1
    if (document.readyState === "complete") return 1
    const imgs = document.images
    let done = 0
    for (let i = 0; i < imgs.length; i++) if (imgs[i].complete) done++
    const frac = imgs.length ? done / imgs.length : 1
    const fonts = document.fonts && document.fonts.status === "loaded" ? 1 : 0
    return Math.min(0.95, 0.15 + 0.6 * frac + 0.2 * fonts)
}

const DEMO_SITE: SitePalette = {
    paper: "#E6EAE4",
    ink: "#18201D",
    accent: "#D2733F",
    sea0: "#243B4A",
    sea1: "#5E8290",
    dusk: "#E7A56B",
}
const DEMO_SERIF = '"DM Serif Display", Georgia, "Times New Roman", serif'
const DEMO_SANS = '"Inter", system-ui, sans-serif'

/** Stand-in site for loaders that need page content when no snapshot is set. */
function drawDemoSite(ctx: CanvasRenderingContext2D, W: number, H: number, site: SitePalette) {
    ctx.save()
    ctx.fillStyle = site.paper
    ctx.fillRect(0, 0, W, H)
    const u = Math.min(W / 1200, H / 750)
    const pad = 56 * u
    ctx.fillStyle = site.ink
    ctx.textBaseline = "middle"
    ctx.font = `700 ${22 * u}px ${DEMO_SANS}`
    ctx.fillText("HALDEN", pad, pad * 0.8)
    ctx.font = `500 ${14 * u}px ${DEMO_SANS}`
    const nav = ["Recordings", "Field notes", "Residency", "Shop"]
    let x = W - pad
    for (let i = nav.length - 1; i >= 0; i--) {
        x -= ctx.measureText(nav[i]).width
        ctx.fillText(nav[i], x, pad * 0.8)
        x -= 28 * u
    }
    ctx.textBaseline = "alphabetic"
    ctx.font = `400 ${84 * u}px ${DEMO_SERIF}`
    ctx.fillText("Sound from the", pad, 230 * u)
    ctx.fillText("northern coast.", pad, 318 * u)
    ctx.font = `400 ${17 * u}px ${DEMO_SANS}`
    ctx.globalAlpha = 0.72
    ctx.fillText("Field recordings, tide tables and long listening sessions,", pad, 372 * u)
    ctx.fillText("pressed to vinyl in editions of three hundred.", pad, 398 * u)
    ctx.globalAlpha = 1
    const bw = 190 * u, bh = 50 * u, by = 436 * u
    ctx.fillStyle = site.ink
    ctx.beginPath()
    if (ctx.roundRect) ctx.roundRect(pad, by, bw, bh, bh / 2)
    else ctx.rect(pad, by, bw, bh)
    ctx.fill()
    ctx.fillStyle = site.paper
    ctx.font = `600 ${15 * u}px ${DEMO_SANS}`
    ctx.textBaseline = "middle"
    ctx.fillText("Listen to Vol. 7", pad + 26 * u, by + bh / 2)
    const ix = W * 0.56, iy = 120 * u, iw = W - ix - pad, ih = H - iy - pad
    ctx.save()
    ctx.beginPath()
    ctx.rect(ix, iy, iw, ih)
    ctx.clip()
    const sky = ctx.createLinearGradient(0, iy, 0, iy + ih * 0.62)
    sky.addColorStop(0, "#394E63")
    sky.addColorStop(0.55, "#B8866E")
    sky.addColorStop(1, site.dusk)
    ctx.fillStyle = sky
    ctx.fillRect(ix, iy, iw, ih * 0.62)
    ctx.fillStyle = "#FFE3B8"
    ctx.beginPath()
    ctx.arc(ix + iw * 0.62, iy + ih * 0.6, ih * 0.09, 0, Math.PI * 2)
    ctx.fill()
    const sea = ctx.createLinearGradient(0, iy + ih * 0.62, 0, iy + ih)
    sea.addColorStop(0, site.sea1)
    sea.addColorStop(1, site.sea0)
    ctx.fillStyle = sea
    ctx.fillRect(ix, iy + ih * 0.62, iw, ih * 0.38)
    ctx.restore()
    ctx.fillStyle = site.ink
    ctx.globalAlpha = 0.5
    ctx.font = `500 ${12 * u}px ${DEMO_SANS}`
    ctx.textBaseline = "alphabetic"
    ctx.fillText("64°N  ·  Recorded at low tide", pad, H - pad * 0.6)
    ctx.restore()
}

function quoteFontFamily(family: string): string {
    return family
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean)
        .map((n) => (n[0] === "'" || n[0] === '"' || /^[a-z-]+$/i.test(n) ? n : `"${n.replace(/"/g, '\\"')}"`))
        .join(", ")
}

/** CSS font shorthand at an explicit px size (the Font control's own size is ignored). */
function logoFontCss(font: FramerFont | undefined, px: number): string {
    const f = font || {}
    const family = f.fontFamily ? quoteFontFamily(f.fontFamily) : DEMO_SANS
    return `${f.fontStyle || "normal"} ${f.fontWeight || 800} ${px}px ${family}`
}

function drawLogoText(ctx: CanvasRenderingContext2D, text: string, font: FramerFont | undefined, cx: number, cy: number, h: number, color: string) {
    ctx.save()
    ctx.fillStyle = color
    ctx.font = logoFontCss(font, h)
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(text, cx, cy)
    ctx.restore()
}

function logoMaskOf(text: string, font: FramerFont | undefined, w: number, h: number, fill?: number): LogoMask {
    const c = document.createElement("canvas")
    c.width = Math.max(1, w)
    c.height = Math.max(1, h)
    const x = c.getContext("2d")!
    x.font = logoFontCss(font, 100)
    const per100 = Math.max(1, x.measureText(text).width)
    const size = Math.min(h * 0.8, (w * (fill || 0.8) * 100) / per100)
    drawLogoText(x, text, font, w / 2, h / 2, size, "#fff")
    const img = x.getImageData(0, 0, c.width, c.height).data
    const data = new Uint8Array(c.width * c.height)
    for (let i = 0; i < data.length; i++) data[i] = img[i * 4 + 3]
    return { w: c.width, h: c.height, data }
}

/**
 * Runs one loader on one canvas for the component's lifetime. Everything live is
 * read from optsRef, so the effect never re-runs on a prop change.
 */
function usePreloader(
    rootRef: MutableRefObject<HTMLDivElement | null>,
    canvasRef: MutableRefObject<HTMLCanvasElement | null>,
    def: LoaderDef,
    optsRef: MutableRefObject<PreloaderOptions>
) {
    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const onCanvas = RenderTarget.current() === RenderTarget.canvas
        const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

        let W = 0, H = 0, dpr = 1
        let pageVersion = 0
        const pageCanvas = document.createElement("canvas")
        let snapSrc: string | undefined
        let snapImg: HTMLImageElement | null = null
        let pageKey = ""
        const palette = (): SitePalette => ({ ...DEMO_SITE, ...(optsRef.current.palette || {}) })

        const redrawPage = () => {
            const o = optsRef.current
            const key = JSON.stringify([canvas.width, canvas.height, snapSrc, !!snapImg, !!o.demoPage, o.palette || null])
            if (key === pageKey) return
            pageKey = key
            pageCanvas.width = canvas.width
            pageCanvas.height = canvas.height
            const x = pageCanvas.getContext("2d")!
            x.setTransform(1, 0, 0, 1, 0, 0)
            x.clearRect(0, 0, pageCanvas.width, pageCanvas.height)
            if (snapImg && snapImg.naturalWidth > 0) {
                const s = Math.max(pageCanvas.width / snapImg.naturalWidth, pageCanvas.height / snapImg.naturalHeight)
                const dw = snapImg.naturalWidth * s, dh = snapImg.naturalHeight * s
                x.drawImage(snapImg, (pageCanvas.width - dw) / 2, 0, dw, dh)
            } else if (o.demoPage) {
                x.setTransform(dpr, 0, 0, dpr, 0, 0)
                drawDemoSite(x, W, H, palette())
            }
            pageVersion++
        }
        const syncSnapshot = () => {
            const src = optsRef.current.snapshot || undefined
            if (src === snapSrc) return
            snapSrc = src
            snapImg = null
            if (!src) return
            const img = new Image()
            img.crossOrigin = "anonymous"
            img.onload = () => {
                if (snapSrc === src) {
                    snapImg = img
                    pageKey = ""
                }
            }
            img.src = src
        }

        const resize = (): boolean => {
            const w = root.offsetWidth, h = root.offsetHeight
            const d = Math.min(window.devicePixelRatio || 1, PRELOADER_DPR_CAP)
            if (w === W && h === H && d === dpr) return false
            W = w
            H = h
            dpr = d
            canvas.width = Math.max(1, Math.round(W * dpr))
            canvas.height = Math.max(1, Math.round(H * dpr))
            pageKey = ""
            redrawPage()
            return true
        }
        resize()

        const api: LoaderApi = {
            get W() { return W },
            get H() { return H },
            get dpr() { return dpr },
            get pageVersion() { return pageVersion },
            get interaction() { return !!optsRef.current.interaction },
            get interactionStrength() { return optsRef.current.interactionStrength ?? 0.65 },
            get clickInteraction() { return !!optsRef.current.clickInteraction },
            get clickStrength() { return optsRef.current.clickStrength ?? 1 },
            get multiplePatterns() { return !!optsRef.current.multiplePatterns },
            get patternCount() { return Math.max(2, Math.min(4, Math.round(optsRef.current.patternCount ?? 3))) },
            page: () => pageCanvas,
            drawPage(ctx, alpha) {
                ctx.save()
                ctx.setTransform(1, 0, 0, 1, 0, 0)
                if (alpha !== undefined) ctx.globalAlpha = alpha
                ctx.drawImage(pageCanvas, 0, 0)
                ctx.restore()
            },
            get site() { return palette() },
            get brand() { return optsRef.current.text || "HALDEN" },
            drawLogo(ctx, cx, cy, h, color) {
                drawLogoText(ctx, optsRef.current.text || "HALDEN", optsRef.current.font, cx, cy, h, color || palette().ink)
            },
            logoMask(w, h, fill) {
                return logoMaskOf(optsRef.current.text || "HALDEN", optsRef.current.font, w, h, fill)
            },
            rand: mulberry32,
            get loadS() { return loadS },
        }

        let loadS = Math.max(0.5, optsRef.current.minTime)
        let curve = makeLoadCurve(7, loadS)
        let inst: LoaderInstance | null = null
        try {
            inst = def.create(canvas, api)
            inst.reset()
        } catch (e) {
            console.error(e)
            inst = null
        }

        const ro = new ResizeObserver(() => {
            if (resize() && inst && inst.resize) inst.resize()
        })
        ro.observe(root)

        // Timeline.
        let t = 0
        let progress = 0
        let revealAt = -1
        let finished = false
        const restart = () => {
            loadS = reduced ? 0.6 : Math.max(0.5, optsRef.current.minTime)
            curve = makeLoadCurve(7, loadS)
            t = 0
            progress = 0
            revealAt = -1
            inst && inst.reset()
        }
        restart()

        let raf = 0
        let last = -1
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min(0.05, (now - last) / 1000)
            last = now
            if (finished || !inst || W < 2) return
            syncSnapshot()
            redrawPage()
            t += dt
            const revealS = reduced ? 0.4 : def.revealS
            if (revealAt < 0) {
                // The real load only ever holds the simulated curve back, never pushes it on.
                const target = onCanvas ? curve(t) : Math.min(curve(t), realLoadProgress())
                progress = target >= 1 ? 1 : Math.min(target, progress + dt * 1.5)
                if (progress >= 1 && t >= loadS) revealAt = t
            }
            const reveal = revealAt < 0 ? 0 : Math.min(1, (t - revealAt) / revealS)
            const phase: LoaderPhase = revealAt < 0 ? "loading" : reveal < 1 ? "reveal" : "page"
            try {
                inst.frame({ t, dt, progress, reveal, phase })
            } catch (e) {
                console.error(e)
                // Never let a single bad frame permanently freeze the scene —
                // skip this frame's draw and keep the loop (and simulation) running.
            }
            // The Chladni field is intentionally persistent.
            // Keep the canvas alive forever instead of revealing/fading away.
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
        }
    }, [])
}
// ── /preloader-kit ──

// ── loader ──
type RGBA = [number, number, number, number]
const CT_SAND = "#EBDFC4"
const CT_PLATE = "#1B2220"
const ctColorCache = new Map<string, RGBA>()
/** Resolves any CSS colour Framer hands over (hex, rgb(), hsl(), var(--token)) via computed style. */
function ctResolveColor(el: HTMLElement, c: string, fallback: RGBA): RGBA {
    const hit = ctColorCache.get(c)
    if (hit) return hit
    let out = fallback
    try {
        const prev = el.style.color
        el.style.color = ""
        el.style.color = c
        const s = el.style.color ? getComputedStyle(el).color : ""
        el.style.color = prev
        const m = s.match(/rgba?\(([^)]+)\)/)
        if (m) {
            const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat)
            if (p.length >= 3 && p.every((v) => isFinite(v))) out = [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]
        }
    } catch (e) {
        out = fallback
    }
    ctColorCache.set(c, out)
    return out
}
const ctMix = (a: RGBA, b: [number, number, number], k: number): string =>
    `rgb(${Math.round(a[0] + (b[0] - a[0]) * k)},${Math.round(a[1] + (b[1] - a[1]) * k)},${Math.round(a[2] + (b[2] - a[2]) * k)})`

// (n, m, sign) ascending; frequency ∝ n² + m²
const CT_MODES: readonly [number, number, number][] = [
    [1, 2, 1],
    [1, 3, -1],
    [2, 3, 1],
    [1, 5, -1],
    [3, 5, 1],
    [3, 7, -1],
]
const CT_NM = CT_MODES.length
const CT_F0 = 92
const CT_FREQ = CT_MODES.map((m) => CT_F0 * (m[0] * m[0] + m[1] * m[1]))
const CT_DK = CT_MODES.map((m) => 5.2 / (Math.PI * Math.PI * (m[0] * m[0] + m[1] * m[1])))
const CT_N = 12000
const CT_SIG = 0.34 // kick strength, plate heights per √s at full amplitude
const CT_REST = 0.3 // off-resonance agitation
const CT_FLOOR = 0.035 // residual agitation (line thickness)
const CT_HOP = 0.013 // hop height at full amplitude, plate heights
const CT_LUT = 4096
const CT_COS = new Float32Array(CT_LUT + 1)
for (let i = 0; i <= CT_LUT; i++) CT_COS[i] = Math.cos((2 * Math.PI * i) / CT_LUT)
function ctCosp(t: number): number {
    let u = t * 0.5
    u -= Math.floor(u)
    return CT_COS[(u * CT_LUT) | 0]
}
const ctRes = (d: number): number => 1 / (1 + (d / 0.1) * (d / 0.1))
const ctSs = (a: number, b: number, x: number): number => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)
}
const CT_MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace'

const LOADER: LoaderDef = {
    revealS: 1.8,
    create(canvas: HTMLCanvasElement, api: LoaderApi): LoaderInstance {
        const ctx = canvas.getContext("2d")!
        const X = new Float32Array(CT_N), Y = new Float32Array(CT_N)
        const HS = new Float32Array(CT_N), PH = new Float32Array(CT_N), OM = new Float32Array(CT_N)
        const VX = new Float32Array(CT_N), VY = new Float32Array(CT_N), VZ = new Float32Array(CT_N), Z = new Float32Array(CT_N)
        const clickRestoreX = new Float32Array(CT_N), clickRestoreY = new Float32Array(CT_N)
        const RL = new Float32Array(CT_N)
        const TONE = new Uint8Array(CT_N)
        let aspect = 1.6
        let ns = 1
        let burst = false
        let lastF = 0, lastK = 0
        let U = 0, UX = 0, UY = 0

        // Optional interaction state. These are deliberately additive so the
        // original particle motion remains unchanged when the controls are off.
        let pointerX = 0.5
        let pointerY = 0.5
        let pointerActive = false
        let pointerEnergy = 0
        let clickX = 0.5
        let clickY = 0.5
        let clickPulse = 0
        let clickPulseAge = 999
        let clickFlash = 0
        let clickRecovery = 0

        function rnd(): number {
            ns ^= ns << 13
            ns ^= ns >>> 17
            ns ^= ns << 5
            return (ns >>> 0) / 4294967296
        }
        const gauss = (): number => (rnd() + rnd() + rnd() - 1.5) * 2

        const onPointerMove = (e: PointerEvent) => {
            const rect = canvas.getBoundingClientRect()
            if (!rect.width || !rect.height) return
            pointerX = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
            pointerY = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
            pointerActive = true
            pointerEnergy = 1
        }

        const onPointerLeave = () => {
            pointerActive = false
        }

        const onPointerDown = (e: PointerEvent) => {
            if (!api.clickInteraction) return
            const rect = canvas.getBoundingClientRect()
            if (!rect.width || !rect.height) return

            clickX = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
            clickY = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
            clickPulse = Math.max(0.25, Math.min(3, api.clickStrength))
            clickPulseAge = 0
            clickFlash = 1
            clickRecovery = 1

            // Capture the exact formation at the instant of the click. The click
            // can disturb the particles, but they are explicitly spring-released
            // back to these positions so the recovery is quick and deterministic.
            for (let i = 0; i < CT_N; i++) {
                clickRestoreX[i] = X[i]
                clickRestoreY[i] = Y[i]
            }

            const hitX = clickX * aspect
            const hitY = clickY
            const radius = 0.18 + 0.10 * clickPulse

            // Do not move the particle positions here. The click disturbance is
            // applied inside the continuous simulation loop so the underlying
            // Chladni animation never pauses or gets locked to the pre-click frame.
            // The captured positions are only used as a short-lived return target.
            for (let i = 0; i < CT_N; i++) {
                const dx = X[i] - hitX
                const dy = Y[i] - hitY
                const d = Math.hypot(dx, dy) + 0.0001
                const falloff = Math.max(0, 1 - d / radius)
                if (falloff <= 0) continue
                HS[i] = Math.min(1.5, HS[i] + 0.12 * falloff * clickPulse)
                Z[i] = Math.min(0.055, Z[i] + 0.004 * falloff * clickPulse)
            }
        }

        canvas.addEventListener("pointermove", onPointerMove)
        canvas.addEventListener("pointerleave", onPointerLeave)
        canvas.addEventListener("pointerdown", onPointerDown)

        function modeEval(k: number, x: number, y: number) {
            const M = CT_MODES[k], n = M[0], m = M[1], s = M[2]
            const cnx = ctCosp(n * x), cmx = ctCosp(m * x), cny = ctCosp(n * y), cmy = ctCosp(m * y)
            const snx = ctCosp(n * x - 0.5), smx = ctCosp(m * x - 0.5), sny = ctCosp(n * y - 0.5), smy = ctCosp(m * y - 0.5)
            U = cnx * cmy + s * cmx * cny
            UX = -Math.PI * (n * snx * cmy + s * m * smx * cny)
            UY = -Math.PI * (m * cnx * smy + s * n * cmx * sny)
        }

        // 50 unique multi-mode formations built from the original six Chladni modes.
        // Every recipe contains 2–4 modes, so Multiple Patterns never falls back
        // to a single-mode formation.
        const CT_PATTERN_RECIPES: readonly number[][] = [
            [0, 1],
            [0, 2],
            [0, 3],
            [0, 4],
            [0, 5],
            [1, 2],
            [1, 3],
            [1, 4],
            [1, 5],
            [2, 3],
            [2, 4],
            [2, 5],
            [3, 4],
            [3, 5],
            [4, 5],
            [0, 1, 2],
            [0, 1, 3],
            [0, 1, 4],
            [0, 1, 5],
            [0, 2, 3],
            [0, 2, 4],
            [0, 2, 5],
            [0, 3, 4],
            [0, 3, 5],
            [0, 4, 5],
            [1, 2, 3],
            [1, 2, 4],
            [1, 2, 5],
            [1, 3, 4],
            [1, 3, 5],
            [1, 4, 5],
            [2, 3, 4],
            [2, 3, 5],
            [2, 4, 5],
            [3, 4, 5],
            [0, 1, 2, 3],
            [0, 1, 2, 4],
            [0, 1, 2, 5],
            [0, 1, 3, 4],
            [0, 1, 3, 5],
            [0, 1, 4, 5],
            [0, 2, 3, 4],
            [0, 2, 3, 5],
            [0, 2, 4, 5],
            [0, 3, 4, 5],
            [1, 2, 3, 4],
            [1, 2, 3, 5],
            [1, 2, 4, 5],
            [1, 3, 4, 5],
            [2, 3, 4, 5],
        ]

        // Fixed order kept outside the animation loop so we never allocate a new
        // 50-item array on every frame.
        const CT_PATTERN_ORDER: readonly number[] = [
            7, 32, 14, 41, 2, 27, 48, 18, 35, 9,
            44, 21, 3, 39, 12, 30, 46, 5, 24, 37,
            16, 49, 10, 28, 43, 1, 34, 20, 47, 6,
            26, 15, 40, 23, 45, 8, 31, 19, 42, 4,
            29, 11, 36, 0, 33, 22, 38, 13, 17, 25,
        ]

        const CT_RECIPE_BASE_WEIGHTS = [1.0, 0.72, 0.48, 0.30] as const

        function multiModeEval(recipeIndex: number, x: number, y: number) {
            const fullRecipe = CT_PATTERN_RECIPES[recipeIndex % CT_PATTERN_RECIPES.length]
            const layerCount = Math.max(
                1,
                Math.min(fullRecipe.length, Math.round(api.patternCount))
            )

            let e = 0, gx = 0, gy = 0

            // Give each recipe a distinct balance between its modes. This is
            // important because there are only 20 unique 3-mode combinations
            // from six source modes; weighted variants prevent the 50-pattern
            // library from looking repetitive when Mode Layers is set to 3.
            let weightSum = 0
            const phase = recipeIndex * 1.61803398875
            for (let j = 0; j < layerCount; j++) {
                const k = fullRecipe[j]
                modeEval(k, x, y)
                const slot = (j + recipeIndex) % 4
                const base = CT_RECIPE_BASE_WEIGHTS[slot]
                const variation = 0.82 + 0.18 * (0.5 + 0.5 * Math.sin(phase + j * 2.17))
                const weight = base * variation
                weightSum += weight
                e += U * weight
                gx += CT_DK[k] * UX * weight
                gy += CT_DK[k] * UY * weight
            }

            e /= weightSum || 1
            gx /= weightSum || 1
            gy /= weightSum || 1

            U = e
            UX = gx
            UY = gy
        }

        const plateColor = (): RGBA => ctResolveColor(canvas, api.site.ink || CT_PLATE, [27, 34, 32, 1])
        const sandColor = (): RGBA => ctResolveColor(canvas, api.site.paper || CT_SAND, [235, 223, 196, 1])

        function modeCoord(p: number): number {
            const raw = p * CT_NM - 0.5
            const k = Math.floor(raw)
            const q = k + ctSs(0.62, 1, raw - k)
            return Math.max(-1, Math.min(CT_NM - 1, q))
        }
        function freqAt(q: number): number {
            const k = Math.floor(q), fr = q - k
            const fa = k < 0 ? CT_FREQ[0] * 0.4 : CT_FREQ[k]
            const fb = k + 1 < CT_NM ? CT_FREQ[k + 1] : CT_FREQ[CT_NM - 1]
            return fa * Math.pow(fb / fa, fr)
        }

        function simulate(
            dt: number,
            p: number,
            patternIndex = 0,
            morph = 0,
            nextPatternIndex = 0,
            timeS = 0
        ): { q: number; A: number } {
            // Multiple-pattern mode has no per-interval amplitude sweep. The
            // old sweep made every interval rise/fall in energy like a beat.
            // Instead, the pattern itself is the animation: formations hold,
            // then organically morph into the next formation.
            const q = api.multiplePatterns
                ? ((patternIndex % CT_PATTERN_RECIPES.length) / CT_PATTERN_RECIPES.length) * CT_NM
                : modeCoord(p)
            const k0 = Math.floor(q), fr = q - k0
            const k1 = k0 + 1
            const w0 = k0 >= 0 ? ctRes(fr) : 0
            const w1 = k1 < CT_NM ? ctRes(1 - fr) : 0
            const A = api.multiplePatterns ? 1 : Math.max(w0, w1)
            const R = api.multiplePatterns ? 0 : 1 - A
            const use0 = w0 > 0.02, use1 = w1 > 0.02
            const ws = (use0 ? w0 : 0) + (use1 ? w1 : 0) || 1
            const sq = Math.sqrt(dt)
            const lim = 0.02
            for (let i = 0; i < CT_N; i++) {
                const x = X[i] / aspect, y = Y[i]
                let E = 0, gx = 0, gy = 0

                if (api.multiplePatterns) {
                    // Hold the current formation, then smoothly morph into the
                    // next formation near the end of the interval. This restores
                    // the organic transition while keeping every cycle different.
                    multiModeEval(patternIndex, x, y)
                    const e0 = U
                    const gx0 = UX
                    const gy0 = UY
                    if (morph > 0) {
                        multiModeEval(nextPatternIndex, x, y)
                        E = e0 * (1 - morph) + U * morph
                        gx = gx0 * (1 - morph) + UX * morph
                        gy = gy0 * (1 - morph) + UY * morph
                    } else {
                        E = e0
                        gx = gx0
                        gy = gy0
                    }
                } else {
                    if (use0) {
                        modeEval(k0, x, y)
                        E += w0 * U
                        gx += w0 * CT_DK[k0] * UX
                        gy += w0 * CT_DK[k0] * UY
                    }
                    if (use1) {
                        modeEval(k1, x, y)
                        E += w1 * U
                        gx += w1 * CT_DK[k1] * UX
                        gy += w1 * CT_DK[k1] * UY
                    }
                    E /= ws
                    gx /= ws
                    gy /= ws
                }

                const aLoc = A * Math.min(1, Math.abs(E) * 0.5)
                const ag = aLoc + CT_REST * R + CT_FLOOR
                HS[i] += (ag - HS[i]) * Math.min(1, dt * 8)
                let dx = (-A * 2 * E * gx * dt) / aspect + CT_SIG * ag * gauss() * sq
                let dy = -A * 2 * E * gy * dt + CT_SIG * ag * gauss() * sq

                // Keep the grains alive with a subtle spatially varying surface
                // current. This is intentionally not a global pulse or amplitude
                // beat: each particle gets a different phase, so the field keeps
                // moving even after the grains have settled onto the nodal lines.
                const phase0 = PH[i] * Math.PI * 2 + timeS * 1.37
                const phase1 = (X[i] * 9.7 + Y[i] * 13.1) + timeS * 0.83
                const ambient = 0.0028 * (0.35 + 0.65 * Math.min(1, ag * 2.2))
                dx += Math.sin(phase0 + phase1) * ambient * dt
                dy += Math.cos(phase0 * 0.77 - phase1) * ambient * dt

                // Meaningful hover interaction: the cursor acts like a local
                // resonance well. It bends the particle flow strongly enough to
                // be visible, but does not draw any UI element over the artwork.
                if (api.interaction) {
                    // The hover field has its own release envelope. When the
                    // pointer leaves the canvas, the force does not disappear
                    // instantly; it fades out so the particles settle naturally.
                    const hoverAmount = pointerActive ? 1 : pointerEnergy
                    if (hoverAmount > 0.001) {
                        const px = pointerX * aspect
                        const py = pointerY
                        const cdx = px - X[i]
                        const cdy = py - Y[i]
                        const cd = Math.hypot(cdx, cdy) + 0.0001
                        const radius = 0.34
                        if (cd < radius) {
                            const falloff = Math.pow(1 - cd / radius, 2)
                            const strength = api.interactionStrength * hoverAmount

                        // Strong inward pull in the center.
                        const radial = 1.15 * strength * falloff
                        dx += (cdx / cd) * radial * dt
                        dy += (cdy / cd) * radial * dt

                        // Tangential flow makes the pattern visibly curl around
                        // the cursor instead of simply moving toward it.
                        const swirl = 0.72 * strength * falloff
                        dx += (-cdy / cd) * swirl * dt
                        dy += (cdx / cd) * swirl * dt

                        // A softer outer shell pushes grains sideways, making the
                        // deformation visible even when particles are sparse.
                        const shell = Math.exp(-Math.pow((cd - radius * 0.72) / (radius * 0.18), 2))
                        const shellForce = 0.55 * strength * shell
                        dx += (-cdy / cd) * shellForce * dt
                        dy += (cdx / cd) * shellForce * dt

                            HS[i] = Math.min(1.8, HS[i] + 1.0 * falloff * strength * dt)
                            Z[i] = Math.min(0.055, Z[i] + 0.04 * falloff * strength * dt)
                        }
                    }
                }

                // Click interaction is additive to the normal simulation. The
                // Chladni field keeps running continuously while a short resonance
                // wave disturbs the grains. A brief return spring then guides the
                // affected particles back toward their pre-click positions without
                // freezing the underlying animation.
                if (api.clickInteraction && clickPulseAge < 0.62) {
                    const px = clickX * aspect
                    const py = clickY
                    const cdx = X[i] - px
                    const cdy = Y[i] - py
                    const cd = Math.hypot(cdx, cdy) + 0.0001
                    const radius = 0.18 + 0.10 * clickPulse
                    const local = Math.max(0, 1 - cd / radius)
                    const waveRadius = 0.035 + clickPulseAge * 0.24
                    const waveWidth = 0.045
                    const wave = Math.exp(-Math.pow((cd - waveRadius) / waveWidth, 2))
                    const decay = Math.pow(Math.max(0, 1 - clickPulseAge / 0.62), 1.7)
                    const pulse = wave * decay * api.clickStrength * 0.055

                    dx += (cdx / cd) * pulse
                    dy += (cdy / cd) * pulse

                    // Only pull particles that were actually affected by the click.
                    // This spring is deliberately short so it cannot lock the whole
                    // particle field in place.
                    if (clickRecovery > 0 && local > 0) {
                        const recovery = Math.pow(clickRecovery, 1.35)
                        const returnStrength = 11 * recovery * local
                        dx += (clickRestoreX[i] - X[i]) * returnStrength * dt
                        dy += (clickRestoreY[i] - Y[i]) * returnStrength * dt
                    }
                }

                dx = dx > lim ? lim : dx < -lim ? -lim : dx
                dy = dy > lim ? lim : dy < -lim ? -lim : dy
                let nx = X[i] + dx, ny = Y[i] + dy
                if (!isFinite(nx) || !isFinite(ny)) {
                    // A particle that went non-finite (e.g. from an interaction
                    // force edge case) would otherwise stay stuck forever, since
                    // NaN fails every bound check below. Drop it back onto the plate.
                    nx = gauss() * 0.01 + aspect * 0.5
                    ny = gauss() * 0.01 + 0.5
                    HS[i] = CT_REST
                }
                if (nx < 0) nx = -nx
                else if (nx > aspect) nx = 2 * aspect - nx
                if (ny < 0) ny = -ny
                else if (ny > 1) ny = 2 - ny
                X[i] = nx
                Y[i] = ny
            }
            return { q, A }
        }

        function drawReadout(fHz: number, q: number, A: number, r: number, Hb: number, alpha: number, sand: RGBA) {
            const k = Math.max(0, Math.round(q))
            const pad = Hb * 0.045
            const fs = Math.max(10 * api.dpr, Hb * 0.035)
            const fs2 = Math.max(8 * api.dpr, Hb * 0.026)
            const sc = `${Math.round(sand[0])},${Math.round(sand[1])},${Math.round(sand[2])}`
            ctx.save()
            ctx.globalAlpha = alpha
            ctx.textBaseline = "alphabetic"
            const bx = pad * 0.6, by = Hb - pad * 0.6 - fs * 1.9
            ctx.fillStyle = "rgba(6,9,8,0.55)"
            ctx.fillRect(bx, by, fs * 7.4, fs * 1.95)
            const lit = r > 0 ? 1 : A
            const led = ctx.createRadialGradient(bx + fs * 0.55, by + fs * 0.62, 0, bx + fs * 0.55, by + fs * 0.62, fs * 0.5)
            led.addColorStop(0, `rgba(255,190,140,${0.25 + 0.75 * lit})`)
            led.addColorStop(0.35, `rgba(210,115,63,${0.2 + 0.7 * lit})`)
            led.addColorStop(1, "rgba(210,115,63,0)")
            ctx.fillStyle = led
            ctx.fillRect(bx, by, fs * 1.1, fs * 1.2)
            ctx.font = `500 ${fs}px ${CT_MONO}`
            ctx.fillStyle = `rgb(${sc})`
            const whole = Math.floor(fHz)
            const txt = String(whole) + "." + Math.floor((fHz - whole) * 10)
            ctx.fillText(txt.padStart(7, " "), bx + fs * 1.05, by + fs * 0.98)
            ctx.font = `500 ${fs * 0.6}px ${CT_MONO}`
            ctx.fillStyle = `rgba(${sc},0.6)`
            ctx.fillText("Hz", bx + fs * 6.1, by + fs * 0.98)
            ctx.font = `500 ${fs2}px ${CT_MONO}`
            ctx.fillStyle = `rgba(${sc},0.55)`
            const M = CT_MODES[k]
            const label = r > 0 ? "BURST" : A > 0.5 ? `MODE ${k + 1}/${CT_NM}  (${M[0]},${M[1]})` : q < 0 ? "SWEEP" : "SWEEP ›"
            ctx.fillText(label, bx + fs * 0.35, by + fs * 1.68)
            ctx.restore()
        }

        const inst: LoaderInstance = {
            reset() {
                ns = 0x9e3779b9 >>> 0
                const r = api.rand(4211)
                aspect = api.W && api.H ? api.W / api.H : 1.6
                for (let i = 0; i < CT_N; i++) {
                    X[i] = r() * aspect
                    Y[i] = r()
                    HS[i] = CT_REST
                    PH[i] = r()
                    OM[i] = 3.2 + r() * 2.8
                    Z[i] = 0
                    VX[i] = VY[i] = VZ[i] = 0
                    RL[i] = 0
                    TONE[i] = (r() * 3) | 0
                }
                burst = false
                lastF = 0
                lastK = 0
            },
            resize() {
                const na = api.W / api.H
                if (na > 0 && Math.abs(na - aspect) > 1e-4) {
                    const s = na / aspect
                    for (let i = 0; i < CT_N; i++) X[i] *= s
                    aspect = na
                }
                
            },
            frame(f: LoaderFrame) {
                const W = canvas.width, Hb = canvas.height
                ctx.setTransform(1, 0, 0, 1, 0, 0)
                ctx.globalAlpha = 1
                ctx.clearRect(0, 0, W, Hb)

                const pc = plateColor()
                const sand = sandColor()
                const dt = Math.min(0.05, f.dt)

                // Loop continuously. Each interval gets a different multi-mode
                // formation, with a smooth morph into the next one near the end.
                const patternInterval = Math.max(0.5, api.loadS)
                const patternCycle = Math.floor(f.t / patternInterval)
                const cycleT = f.t - patternCycle * patternInterval
                const progress = cycleT / patternInterval

                // Walk through every recipe once before repeating. The order is
                // intentionally shuffled so adjacent formations do not feel like
                // a simple counting sequence.
                const orderIndex = patternCycle % CT_PATTERN_ORDER.length
                const patternIndex = api.multiplePatterns ? CT_PATTERN_ORDER[orderIndex] : 0
                const nextPatternIndex = api.multiplePatterns
                    ? CT_PATTERN_ORDER[(orderIndex + 1) % CT_PATTERN_ORDER.length]
                    : 0
                // Hold each formation most of the interval, then use a smooth
                // crossfade into a genuinely different weighted recipe.
                const morphStart = 0.68
                const morphT = Math.max(0, Math.min(1, (progress - morphStart) / (1 - morphStart)))
                const morph = morphT * morphT * (3 - 2 * morphT)

                if (clickPulseAge < 999) {
                    clickPulseAge += dt
                    clickFlash = Math.max(0, 1 - clickPulseAge / 0.4)
                    clickRecovery = Math.max(0, 1 - clickPulseAge / 0.36)
                }

                const steps = Math.max(1, Math.ceil(dt / (1 / 55)))
                let o = { q: modeCoord(progress), A: 1 - CT_REST }
                if (dt > 0) {
                    for (let s = 0; s < steps; s++) {
                        const stepT = ((cycleT - dt + (s + 1) * (dt / steps)) % patternInterval) / patternInterval
                        o = simulate(
                            dt / steps,
                            stepT,
                            patternIndex,
                            morph,
                            nextPatternIndex,
                            f.t - dt + (s + 1) * (dt / steps)
                        )
                    }
                }

                const q = o.q
                const A = o.A
                lastK = q
                lastF = freqAt(q) * (1 + 0.0009 * Math.sin(f.t * 6.3) * A)

                // Solid background only — the original textured plate and center dot
                // have been removed.
                ctx.fillStyle = `rgb(${Math.round(pc[0])},${Math.round(pc[1])},${Math.round(pc[2])})`
                ctx.fillRect(0, 0, W, Hb)

                const r = 0
                // No periodic camera shake in multi-pattern mode. It reads as a
                // beat and makes otherwise organic pattern changes feel timed.
                const shakeA = api.multiplePatterns ? 0 : Hb * 0.0012 * A * (progress > 0 ? 1 : 0)
                const sx = shakeA * Math.sin(f.t * 97)
                const sy = shakeA * Math.cos(f.t * 83)
                const sc = 1

                ctx.setTransform(sc, 0, 0, sc, W / 2 - (W / 2) * sc + sx, Hb / 2 - (Hb / 2) * sc + sy)
                ctx.globalAlpha = 1

                // sand
                const g0 = api.dpr * Math.min(2, Math.max(1, api.H / 330))
                const sandA = sand[3]

                for (let i = 0; i < CT_N; i++) {
                    PH[i] += dt * OM[i] * (0.5 + 0.8 * Math.min(1, HS[i]))
                }

                // shadows of airborne grains
                ctx.globalAlpha = sandA * 0.5
                ctx.fillStyle = "#050706"
                ctx.beginPath()
                for (let i = 0; i < CT_N; i++) {
                    const u = PH[i] - Math.floor(PH[i])
                    const z = CT_HOP * HS[i] * 4 * u * (1 - u)
                    const zp = z * Hb
                    if (zp < 0.6) continue
                    const s = g0 * (1 + Math.min(0.8, z * 1.6))
                    ctx.rect(X[i] * Hb + zp * 0.35, Y[i] * Hb + zp * 0.2, s, s)
                }
                ctx.fill()

                const tones = [
                    ctMix(sand, [0, 0, 0], 0.09),
                    ctMix(sand, [0, 0, 0], 0),
                    ctMix(sand, [255, 255, 255], 0.45),
                ]

                ctx.globalAlpha = sandA
                for (let tt = 0; tt < 3; tt++) {
                    ctx.fillStyle = tones[tt]
                    ctx.beginPath()

                    for (let i = 0; i < CT_N; i++) {
                        if (TONE[i] !== tt) continue

                        const u = PH[i] - Math.floor(PH[i])
                        const z = CT_HOP * HS[i] * 4 * u * (1 - u)
                        const s = g0 * (1 + Math.min(0.8, Math.max(0, z) * 1.6))
                        const px = X[i] * Hb
                        const py = (Y[i] - z) * Hb

                        if (px < -8 || py < -8 || px > W + 8 || py > Hb + 8) continue
                        ctx.rect(px, py, s, s)
                    }

                    ctx.fill()
                }

                ctx.globalAlpha = 1

                // Hover is intentionally particle-only. No cursor circle, ring, halo,
                // or marker is drawn over the artwork.
                // Smoothly release the hover field after the pointer leaves.
                // This is intentionally slow enough to make the sand visibly
                // settle back into the current Chladni formation.
                if (api.interaction && pointerActive) {
                    pointerEnergy = Math.min(1, pointerEnergy + dt * 8)
                } else {
                    pointerEnergy = Math.max(0, pointerEnergy - dt * 1.8)
                }

                // Click interaction is particle-only. No visible cursor/click
                // ring is drawn over the artwork.

                drawReadout(lastF, q, A, r, Hb, 1, sand)
                ctx.setTransform(1, 0, 0, 1, 0, 0)
                ctx.globalAlpha = 1
            },
        }
        const originalReset = inst.reset
        inst.reset = () => {
            originalReset()
            pointerActive = false
            pointerEnergy = 0
            clickPulse = 0
            clickPulseAge = 999
            clickFlash = 0
            clickRecovery = 0
        }

        return inst
    },
}
// ── /loader ──

interface Props {
    minTime?: number
    sand?: string
    plate?: string
    interaction?: boolean
    interactionStrength?: number
    clickInteraction?: boolean
    clickStrength?: number
    multiplePatterns?: boolean
    patternCount?: number
    onComplete?: () => void
    style?: CSSProperties
}

function __BaseImpl_ChladniTune(props: Props) {
    const { style } = props
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const optsRef = useRef<PreloaderOptions>({ minTime: 4 })
    optsRef.current = {
        minTime: props.minTime ?? 4,
        interaction: props.interaction ?? true,
        interactionStrength: props.interactionStrength ?? 0.65,
        clickInteraction: props.clickInteraction ?? true,
        clickStrength: props.clickStrength ?? 1,
        multiplePatterns: props.multiplePatterns ?? false,
        patternCount: props.patternCount ?? 3,
        palette: { paper: props.sand ?? CT_SAND, ink: props.plate ?? CT_PLATE },
        onComplete: props.onComplete,
    }
    usePreloader(rootRef, canvasRef, LOADER, optsRef)
    return (
        <div
            ref={rootRef}
            style={{ position: "relative", width: "100%", height: "100%", minWidth: 1200, minHeight: 800, overflow: "hidden", ...style }}
        >
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
        </div>
    )
}

const __presetProps = {
  "minTime": 2,
  "sand": "#EBDFC4",
  "plate": "#000000",
  "multiplePatterns": true,
  "patternCount": 3,
  "interaction": true,
  "interactionStrength": 0.65,
  "clickInteraction": true,
  "clickStrength": 1
};

export default function ChladniTune(props: Record<string, unknown>) {
  return <__BaseImpl_ChladniTune {...(__presetProps as Record<string, unknown>)} {...props} />;
}
