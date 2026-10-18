"use client"

/**
 * AcrylicPour — a fluid-art "dirty pour" preloader: layered paint poured onto a dark board, then cells.
 * A cup of layered colours is poured by a wandering stream (an exact area-preserving point source,
 * so earlier paint is pushed outward in rings and the paint area IS the load). Silicone spots then
 * open cells by Marangoni flow (u = -K grad c, porous-medium spreading, film carried conservatively),
 * rendered glossy from the film height. Reveal: the coat self-levels, thins to paper, the site shows
 * through and the last gloss fades, leaving the live page.
 * Usage: pin over the page (Position Fixed, 100% × 100%). Loops on the canvas; in preview/live it
 * plays once, waits for the real page load, reveals, then fades out.
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
                inst = null
                return
            }
            if (revealAt >= 0 && t - revealAt >= revealS) {
                if (onCanvas) {
                    if (t - revealAt >= revealS + PRELOADER_HOLD_S) restart()
                } else {
                    finished = true
                    root.style.transition = `opacity ${PRELOADER_FADE_S}s ease`
                    root.style.opacity = "0"
                    root.style.pointerEvents = "none"
                    window.setTimeout(() => {
                        root.style.visibility = "hidden"
                    }, PRELOADER_FADE_S * 1000)
                    optsRef.current.onComplete && optsRef.current.onComplete()
                }
            }
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
        }
    }, [])
}
// ── /preloader-kit ──

type RGB = [number, number, number]

/** Framer's Color control hands back hex, rgb()/rgba(), hsl() or var(--token, fallback). */
function parseColor(value: string | undefined, fallback: string): RGB {
    let s = (value || fallback).trim()
    const v = /^var\(\s*--[^,]+,\s*(.+)\)$/.exec(s)
    if (v) s = v[1].trim()
    const hx = /^#([0-9a-f]{3,8})$/i.exec(s)
    if (hx) {
        let h = hx[1]
        if (h.length <= 4) h = h.split("").map((ch) => ch + ch).join("")
        return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255]
    }
    const rg = /^rgba?\(([^)]+)\)$/i.exec(s)
    if (rg) {
        const p = rg[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat)
        if (p.length >= 3 && p.every((n) => isFinite(n))) return [p[0] / 255, p[1] / 255, p[2] / 255]
    }
    if (typeof document !== "undefined" && s !== fallback) {
        const ctx = document.createElement("canvas").getContext("2d")
        if (ctx) {
            ctx.fillStyle = "#010203"
            ctx.fillStyle = s
            const n = String(ctx.fillStyle)
            if (n !== "#010203") return parseColor(n, fallback)
        }
    }
    return s === fallback ? [0, 0, 0] : parseColor(fallback, fallback)
}
const sameRGB = (a: RGB, b: RGB) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 1 / 255

// ── loader ──
const VS = `#version 300 es
void main() {
vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

const FS = `#version 300 es
precision highp float;
uniform sampler2D u_f;
uniform sampler2D u_page;
uniform vec2 u_res;
uniform vec2 u_grid;
uniform vec2 u_src;
uniform float u_q;
uniform float u_t;
uniform float u_rev;
uniform vec3 u_col[32];
uniform float u_end[32];
uniform int u_n;
uniform vec3 u_board;
uniform vec3 u_paper;
out vec4 o;

// Cubic B-spline sample from 4 bilinear taps. g in texel units (centres at i+0.5).
vec4 fieldB(vec2 g) {
vec2 st = g - 0.5;
vec2 i = floor(st);
vec2 f = st - i;
vec2 f2 = f * f, f3 = f2 * f;
vec2 w0 = (1.0 - 3.0 * f + 3.0 * f2 - f3) / 6.0;
vec2 w1 = (4.0 - 6.0 * f2 + 3.0 * f3) / 6.0;
vec2 w2 = (1.0 + 3.0 * f + 3.0 * f2 - 3.0 * f3) / 6.0;
vec2 w3 = f3 / 6.0;
vec2 g0 = w0 + w1, g1 = w2 + w3;
vec2 h0 = (i - 1.0 + w1 / g0 + 0.5) / u_grid;
vec2 h1 = (i + 1.0 + w3 / g1 + 0.5) / u_grid;
vec4 a = texture(u_f, vec2(h0.x, h0.y));
vec4 b = texture(u_f, vec2(h1.x, h0.y));
vec4 c = texture(u_f, vec2(h0.x, h1.y));
vec4 d = texture(u_f, vec2(h1.x, h1.y));
return g0.y * (g0.x * a + g1.x * b) + g1.y * (g0.x * c + g1.x * d);
}

vec3 layer(float t, int sh) {
int idx = u_n - 1;
for (int i = 0; i < 32; i++) {
    if (i >= u_n) break;
    if (t < u_end[i]) { idx = i; break; }
}
return u_col[(idx + sh) % u_n];
}
vec3 cup(float t, float w, int sh) {
return (layer(t - w, sh) + 2.0 * layer(t, sh) + layer(t + w, sh)) * 0.25;
}

float hgt(vec4 F, vec2 g) {
float me = smoothstep(0.3, 0.7, F.x);
float film = clamp(F.z, 0.0, 2.6);
float h = me * (0.7 + 0.62 * film);
vec2 d = g - u_src;
float r2 = dot(d, d);
float r = sqrt(r2);
h += u_q * me * (1.6 * exp(-r2 / 6.0) + 0.07 * sin(1.5 * r - 11.0 * u_t) * exp(-r * 0.22) * smoothstep(1.5, 5.0, r));
return h;
}

float box(vec2 d, vec2 c, vec2 hs, float soft) {
vec2 q = abs(d - c) - hs;
return (1.0 - smoothstep(-soft, soft, q.x)) * (1.0 - smoothstep(-soft, soft, q.y));
}

void main() {
if (u_rev >= 1.0) { o = texelFetch(u_page, ivec2(gl_FragCoord.xy), 0); return; }
vec2 uv = gl_FragCoord.xy / u_res;
vec2 g = vec2(uv.x, 1.0 - uv.y) * u_grid;
float e = 0.6;
vec4 F = fieldB(g);
vec4 Fx = fieldB(g + vec2(e, 0.0));
vec4 Fy = fieldB(g + vec2(0.0, e));
float lev = smoothstep(0.0, 0.55, u_rev);
float h0 = hgt(F, g);
vec2 grad = vec2(hgt(Fx, g + vec2(e, 0.0)) - h0, hgt(Fy, g + vec2(0.0, e)) - h0) / e;
grad *= (1.0 - lev);
// grid y runs down the screen; normal lives in GL space (y up)
vec3 n = normalize(vec3(-grad.x * 0.95, grad.y * 0.95, 1.0));

float me = smoothstep(0.44, 0.56, F.x);
float tau = F.y;
float w = clamp(fwidth(tau) * 0.8, 1e-5, 0.05);
vec3 top = cup(tau, w, 0);
vec3 und = cup(tau, w, 3);
float a = smoothstep(0.4, 0.56, F.z);
float lace = exp(-pow((F.z - 0.64) / 0.07, 2.0)) * me * smoothstep(0.02, 0.2, F.w);
vec3 paint = mix(und, top, a) * (1.0 - 0.3 * lace);

float asp = u_res.x / u_res.y;
vec3 L = normalize(vec3(-0.45, 0.55, 0.72));
float diff = 0.8 + 0.28 * dot(n, L);
vec2 vc = uv - 0.5;
float vig = 1.0 - 0.55 * dot(vc, vc);
vec3 board = u_board * vig * (0.94 + 0.12 * uv.y);
vec3 base = mix(board, paint * diff, me);

vec3 P = vec3(uv.x * asp, uv.y, 0.0);
vec3 E = vec3(0.5 * asp, 0.42, 1.5);
vec3 V = normalize(E - P);
vec3 R = reflect(-V, n);
vec2 d = R.xy / max(R.z, 0.08);
float win = box(d, vec2(-0.34, 0.33), vec2(0.17, 0.07), 0.035);
win += 0.55 * box(d, vec2(0.42, 0.10), vec2(0.035, 0.2), 0.03);
float sky = 0.05 * smoothstep(-0.5, 0.7, d.y);
float glint = pow(max(dot(R, normalize(vec3(-0.3, 0.5, 0.81))), 0.0), 140.0);
float slope = 1.0 - n.z;
float gloss = mix(0.2, 1.0, me) * (win * (0.14 + 1.8 * slope) + sky + glint * 0.85);

// reveal: thin regions and cells first, layer by layer
float T = me * clamp(0.25 + 0.5 * clamp(F.z, 0.0, 1.6), 0.0, 1.0);
float band = 0.5 + 0.5 * sin(tau * 6.2831853 * 14.0);
float ev = u_rev * 1.6 - 0.32 * T - 0.14 * band;
float k1 = smoothstep(0.0, 0.45, ev);
float k2 = smoothstep(0.35, 0.95, ev);
// premultiplied throughout: the page raster is transparent where the live site shows
vec4 page = texelFetch(u_page, ivec2(gl_FragCoord.xy), 0);
vec4 col = mix(vec4(base, 1.0), vec4(u_paper * mix(1.0, diff, 0.6), 1.0), k1);
col = mix(col, page, k2);
gloss *= 1.0 - smoothstep(0.5, 1.0, u_rev);
float gA = clamp(gloss, 0.0, 1.0);
// highlight composited OVER the paint: on an opaque coat this is the screen blend
o = vec4(gA * vec3(1.0, 0.975, 0.94), gA) + (1.0 - gA) * col;
}`

type PaintKey = "sea0" | "sea1" | "accent" | "dusk" | "paper" | "ink"
interface Seed { x: number; y: number; M: number; r: number; a: number; done: boolean }
interface Swirl { x: number; y: number; k: number; g: number }

const TAU = Math.PI * 2
const DEFAULT_SEA0: RGB = parseColor("#243B4A", "#243B4A")
const NX = 160 // grid columns; rows follow the aspect so cells stay square
const NL = 28 // layers in the cup
const POUR_END = 0.75 // progress at which the cup is empty
const K_MAR = 18.0 // Marangoni mobility, cells^2/s per unit c
const C_DECAY = 0.45 // surfactant loss, 1/s
const H_STEP = 1 / 120 // Marangoni step
// Isotropic 9-point flux stencil (axis 2/3, diagonal 1/6), so cells open round, not square.
const NB: [number, number, number][] = [[1, 0, 2 / 3], [0, 1, 2 / 3], [1, 1, 1 / 6], [-1, 1, 1 / 6]]

const LOADER: LoaderDef = {
    revealS: 2.0,
    create(canvas, api) {
        const glc = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false })
        if (!glc) throw new Error("AcrylicPour: WebGL2 unavailable")
        const gl: WebGL2RenderingContext = glc

        const shader = (type: number, src: string): WebGLShader => {
            const s = gl.createShader(type)
            if (!s) throw new Error("AcrylicPour: createShader failed")
            gl.shaderSource(s, src)
            gl.compileShader(s)
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error("AcrylicPour shader: " + gl.getShaderInfoLog(s))
            return s
        }
        const prog = gl.createProgram()
        if (!prog) throw new Error("AcrylicPour: createProgram failed")
        gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS))
        gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("AcrylicPour link: " + gl.getProgramInfoLog(prog))
        const loc = (k: string) => gl.getUniformLocation(prog, k)
        const U = {
            f: loc("u_f"), page: loc("u_page"), res: loc("u_res"), grid: loc("u_grid"), src: loc("u_src"), q: loc("u_q"),
            t: loc("u_t"), rev: loc("u_rev"), col: loc("u_col"), end: loc("u_end"), n: loc("u_n"), board: loc("u_board"), paper: loc("u_paper"),
        }
        const vao = gl.createVertexArray()

        const texParams = (filter: number) => {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        }
        const texF = gl.createTexture()
        const texP = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, texP)
        texParams(gl.NEAREST)
        let pageV = -1
        const uploadPage = () => {
            gl.bindTexture(gl.TEXTURE_2D, texP)
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true) // shader works premultiplied
            gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, api.page())
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
            pageV = api.pageVersion
        }

        // ── cup: a fixed random layer order; colours re-read live from the palette ──
        const seq: PaintKey[] = []
        const colArr = new Float32Array(96)
        const endArr = new Float32Array(32)
        {
            const r = api.rand(77)
            const keys: PaintKey[] = ["sea0", "sea1", "accent", "dusk", "paper", "ink"]
            const wt: Record<PaintKey, number> = { sea0: 1.0, sea1: 0.9, accent: 0.8, dusk: 0.8, paper: 0.3, ink: 0.4 }
            let prev = ""
            for (let i = 0; i < NL; i++) {
                let k: PaintKey
                do k = keys[Math.floor(r() * keys.length)]
                while (k === prev || (i > 0 && (k === "paper" || k === "ink") && (prev === "paper" || prev === "ink")))
                seq.push(k)
                prev = k
            }
            const w = seq.map((k) => wt[k] * (0.6 + 0.8 * r()))
            const tot = w.reduce((a, b) => a + b, 0)
            let acc = 0
            seq.forEach((_, i) => {
                acc += w[i] / tot
                endArr[i] = i === seq.length - 1 ? 2.0 : acc
            })
        }
        let board: RGB = [0, 0, 0]
        let paper: RGB = [0, 0, 0]
        let colKey = ""
        const syncColours = () => {
            const S = api.site
            const key = [S.sea0, S.sea1, S.accent, S.dusk, S.paper, S.ink].join("|")
            if (key === colKey) return
            colKey = key
            paper = parseColor(S.paper, "#E6EAE4")
            const sea0 = parseColor(S.sea0, "#243B4A")
            // the pale blue is Paint 1 thinned; the house tone is kept exactly while Paint 1 is default
            const sea1: RGB = sameRGB(sea0, DEFAULT_SEA0) ? parseColor(S.sea1, "#5E8290") : [0, 1, 2].map((i) => sea0[i] + (paper[i] - sea0[i]) * 0.4) as RGB
            const table: Record<PaintKey, RGB> = {
                sea0, sea1, paper,
                accent: parseColor(S.accent, "#D2733F"),
                dusk: parseColor(S.dusk, "#E7A56B"),
                ink: parseColor(S.ink, "#18201D"),
            }
            seq.forEach((k, i) => colArr.set(table[k], i * 3))
            board = table.ink.map((v) => v * 0.52) as RGB
        }

        // ── simulation grid ──
        let NY = 100, N = 0
        let m = new Float32Array(0), tau = new Float32Array(0), s = new Float32Array(0), c = new Float32Array(0)
        let m2 = new Float32Array(0), tau2 = new Float32Array(0), s2 = new Float32Array(0), c2 = new Float32Array(0)
        let dc = new Float32Array(0), ds = new Float32Array(0), pack = new Float32Array(0)
        const rowsFor = () => Math.max(40, Math.min(200, Math.round((NX * (api.H || 800)) / (api.W || 1200)) || 100))
        const alloc = () => {
            NY = rowsFor()
            N = NX * NY
            m = new Float32Array(N); tau = new Float32Array(N); s = new Float32Array(N); c = new Float32Array(N)
            m2 = new Float32Array(N); tau2 = new Float32Array(N); s2 = new Float32Array(N); c2 = new Float32Array(N)
            dc = new Float32Array(N); ds = new Float32Array(N); pack = new Float32Array(N * 4)
            gl.bindTexture(gl.TEXTURE_2D, texF)
            texParams(gl.LINEAR)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, NX, NY, 0, gl.RGBA, gl.FLOAT, pack)
        }

        let Vmax = 0, V = 0, acc = 0, q = 0, phi1 = 0, phi2 = 0
        let seeds: Seed[] = []
        let swirls: Swirl[] = []
        let lastSrc: [number, number] = [0, 0]

        const path = (u: number): [number, number] => [
            NX * (0.5 + 0.17 * Math.sin(TAU * 0.8 * u + phi1) - 0.05 * Math.cos(TAU * 2.1 * u)),
            NY * (0.5 + 0.17 * Math.sin(TAU * 1.25 * u + phi2)),
        ]

        // Exact incompressible source: r_before^2 = r_after^2 - dV/pi, plus area-preserving swirls.
        const pour = (dV: number, P: [number, number], u0: number, u1: number) => {
            const k = dV / Math.PI
            const xm = NX - 1 - 1e-4, ym = NY - 1 - 1e-4
            for (let j = 0; j < NY; j++) {
                const dy = j + 0.5 - P[1]
                for (let i = 0; i < NX; i++) {
                    const id = j * NX + i
                    const dx = i + 0.5 - P[0]
                    const r2 = dx * dx + dy * dy
                    const rb2 = r2 - k
                    if (rb2 <= 0) {
                        m2[id] = 1; s2[id] = 1; c2[id] = 0
                        tau2[id] = u0 + (u1 - u0) * (1 - r2 / k)
                        continue
                    }
                    const f = Math.sqrt(rb2 / r2)
                    let x = P[0] + dx * f, y = P[1] + dy * f
                    for (let w = 0; w < swirls.length; w++) {
                        const sw = swirls[w]
                        const ex = x - sw.x, ey = y - sw.y
                        const th = -dV * sw.g * Math.exp(-(ex * ex + ey * ey) * sw.k)
                        const cs = Math.cos(th), sn = Math.sin(th)
                        x = sw.x + ex * cs - ey * sn
                        y = sw.y + ex * sn + ey * cs
                    }
                    x -= 0.5
                    y -= 0.5
                    x = x < 0 ? 0 : x > xm ? xm : x
                    y = y < 0 ? 0 : y > ym ? ym : y
                    const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0
                    const a = y0 * NX + x0, b = a + 1, cc = a + NX, dd = cc + 1
                    const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy
                    m2[id] = m[a] * w00 + m[b] * w10 + m[cc] * w01 + m[dd] * w11
                    tau2[id] = tau[a] * w00 + tau[b] * w10 + tau[cc] * w01 + tau[dd] * w11
                    s2[id] = s[a] * w00 + s[b] * w10 + s[cc] * w01 + s[dd] * w11
                    c2[id] = c[a] * w00 + c[b] * w10 + c[cc] * w01 + c[dd] * w11
                }
            }
            let t = m; m = m2; m2 = t
            t = tau; tau = tau2; tau2 = t
            t = s; s = s2; s2 = t
            t = c; c = c2; c2 = t
            // anti-diffusion: repeated bilinear resampling would smear the puddle edge
            for (let id = 0; id < N; id++) {
                const v = 0.5 + (m[id] - 0.5) * 1.06
                m[id] = v < 0 ? 0 : v > 1 ? 1 : v
            }
        }

        const marangoni = (h: number) => {
            dc.fill(0)
            ds.fill(0)
            const kh = K_MAR * h
            for (let j = 0; j < NY; j++) {
                for (let i = 0; i < NX; i++) {
                    const a = j * NX + i
                    if (m[a] < 0.5) continue
                    const ca = c[a]
                    for (let n = 0; n < 4; n++) {
                        const ii = i + NB[n][0], jj = j + NB[n][1]
                        if (ii < 0 || ii >= NX || jj >= NY) continue
                        const b = jj * NX + ii
                        const cb = c[b]
                        if (m[b] < 0.5 || ca + cb < 1e-4) continue
                        let u = NB[n][2] * kh * (ca - cb)
                        u = u > 0.12 ? 0.12 : u < -0.12 ? -0.12 : u
                        const up = u > 0 ? a : b
                        const Fc = c[up] * u, Fs = s[up] * u
                        dc[a] -= Fc; dc[b] += Fc; ds[a] -= Fs; ds[b] += Fs
                    }
                }
            }
            const dec = Math.exp(-C_DECAY * h)
            for (let id = 0; id < N; id++) {
                const cv = (c[id] + dc[id]) * dec
                c[id] = cv > 0 ? cv : 0
                const sv = s[id] + ds[id]
                s[id] = sv > 0 ? (sv < 3 ? sv : 3) : 0
            }
        }

        const deposit = (sd: Seed) => {
            const i = Math.floor(sd.x), j = Math.floor(sd.y)
            if (i < 0 || j < 0 || i >= NX || j >= NY || m[j * NX + i] < 0.5) return
            const R = Math.ceil(sd.r * 2.5), k = 1 / (2 * sd.r * sd.r), amp = (sd.M * k) / Math.PI
            for (let y = Math.max(0, j - R); y <= Math.min(NY - 1, j + R); y++) {
                for (let x = Math.max(0, i - R); x <= Math.min(NX - 1, i + R); x++) {
                    const dx = x + 0.5 - sd.x, dy = y + 0.5 - sd.y
                    c[y * NX + x] += amp * Math.exp(-(dx * dx + dy * dy) * k)
                }
            }
        }

        const reset = () => {
            alloc()
            const r = api.rand(4242)
            phi1 = r() * TAU
            phi2 = r() * TAU
            Vmax = 1.3 * N
            V = 0
            acc = 0
            q = 0
            lastSrc = path(0)
            swirls = []
            for (let k = 0; k < 6; k++) {
                const rho = NX * (0.08 + 0.14 * r())
                swirls.push({
                    x: NX * (0.1 + 0.8 * r()),
                    y: NY * (0.1 + 0.8 * r()),
                    k: 1 / (2 * rho * rho),
                    g: ((k % 2 ? 1 : -1) * (0.9 + 1.3 * r())) / Vmax,
                })
            }
            seeds = []
            const sp = 10
            for (let y = sp * 0.5; y < NY; y += sp) {
                for (let x = sp * 0.5; x < NX; x += sp) {
                    if (r() > 0.78) continue
                    const g = Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(TAU * r())
                    seeds.push({
                        x: x + (r() - 0.5) * sp * 0.9,
                        y: y + (r() - 0.5) * sp * 0.9,
                        M: Math.min(120, Math.exp(3.3 + 0.5 * g)),
                        r: 0.9 + 1.6 * Math.pow(r(), 1.6),
                        a: 0.48 + 0.5 * Math.pow(r(), 0.8),
                        done: false,
                    })
                }
            }
        }

        const frame = (f: LoaderFrame) => {
            if (api.pageVersion !== pageV) uploadPage()
            syncColours()
            const dt = Math.min(f.dt, 0.05)
            const pp = f.phase === "loading" ? f.progress : 1
            const Vt = Vmax * (0.03 * Math.min(1, f.t / 0.35) + 0.97 * Math.min(1, pp / POUR_END))
            const dV = Vt - V
            if (dV > 1e-3) {
                const n = Math.ceil(dV / 180)
                for (let k = 0; k < n; k++) {
                    const u0 = (V + (dV * k) / n) / Vmax, u1 = (V + (dV * (k + 1)) / n) / Vmax
                    lastSrc = path(u1)
                    pour(dV / n, lastSrc, u0, u1)
                }
                V = Vt
            }
            const qt = dt > 0 ? Math.min(1, dV / dt / (Vmax / 2.6)) : q
            q += (qt - q) * Math.min(1, dt * 10)
            acc += dt
            let steps = 0
            while (acc >= H_STEP && steps < 6) {
                for (const sd of seeds) if (!sd.done && pp >= sd.a) { sd.done = true; deposit(sd) }
                marangoni(H_STEP)
                acc -= H_STEP
                steps++
            }
            if (steps === 6) acc = 0

            for (let id = 0, k = 0; id < N; id++, k += 4) {
                pack[k] = m[id]; pack[k + 1] = tau[id]; pack[k + 2] = s[id]; pack[k + 3] = c[id]
            }
            gl.bindTexture(gl.TEXTURE_2D, texF)
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, NX, NY, gl.RGBA, gl.FLOAT, pack)

            gl.viewport(0, 0, canvas.width, canvas.height)
            gl.disable(gl.BLEND)
            gl.useProgram(prog)
            gl.bindVertexArray(vao)
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, texF)
            gl.activeTexture(gl.TEXTURE1)
            gl.bindTexture(gl.TEXTURE_2D, texP)
            gl.activeTexture(gl.TEXTURE0)
            gl.uniform1i(U.f, 0)
            gl.uniform1i(U.page, 1)
            gl.uniform2f(U.res, canvas.width, canvas.height)
            gl.uniform2f(U.grid, NX, NY)
            gl.uniform2f(U.src, lastSrc[0], lastSrc[1])
            gl.uniform1f(U.q, q)
            gl.uniform1f(U.t, f.t)
            gl.uniform1f(U.rev, f.reveal)
            gl.uniform3fv(U.col, colArr)
            gl.uniform1fv(U.end, endArr)
            gl.uniform1i(U.n, seq.length)
            gl.uniform3fv(U.board, board)
            gl.uniform3fv(U.paper, paper)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }

        return {
            reset,
            frame,
            resize() {
                if (rowsFor() !== NY) reset()
            },
        }
    },
}
// ── /loader ──

interface Props {
    minTime?: number
    paint1?: string
    paint2?: string
    paint3?: string
    onComplete?: () => void
    style?: CSSProperties
}

export default function AcrylicPour(props: Props) {
    const { style } = props
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const optsRef = useRef<PreloaderOptions>({ minTime: 4 })
    optsRef.current = {
        minTime: props.minTime ?? 4,
        // the three poured colours; paper and ink seams and the board stay the house tones
        palette: { sea0: props.paint1 ?? "#243B4A", accent: props.paint2 ?? "#D2733F", dusk: props.paint3 ?? "#E7A56B" },
        onComplete: props.onComplete,
    }
    usePreloader(rootRef, canvasRef, LOADER, optsRef)
    return (
        <div ref={rootRef} style={{ position: "relative", width: "100%", height: "100%", minWidth: 1200, minHeight: 800, overflow: "hidden", ...style }}>
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
        </div>
    )
}
