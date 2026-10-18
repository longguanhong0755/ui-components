"use client"

import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"

/* ------------------------------------------------------------------ *
 *  StitchNova
 *
 *  A pink-on-charcoal pixel night sky, cross-stitch grid and all: a
 *  ringed planet in the middle, nebula clouds in the corners, dithered
 *  comet streaks running up and to the right. Modelled on a still
 *  97 × 97-cell pixel artwork, and refined from the user's
 *  `DitheredPixelGrid` component, whose controls it keeps in full.
 *
 *  Pattern
 *    Artwork    the reference itself, baked in below (ART). At rest it
 *               draws that picture cell for cell; in motion the clouds
 *               drift along Angle and slowly reshape, flowing in from a
 *               seamless extension of the art.
 *    Generated  the original noise field: streaks, blobs, specks and a
 *               procedural planet, tuned by the Advanced noise fields.
 *
 *  Motion
 *    Drift   clouds travel along Angle and boil as they go.
 *    Spin    the planet's surface turns as a globe; the rim stays put.
 *    Glints  pulses of light run up the dithered streaks (Artwork).
 *    Speed 0 holds the artwork exactly as drawn.
 *
 *  Interaction
 *    Hover   lights the cells around the pointer.
 *    Press   speeds everything up while held.
 *    Tap     sends a shockwave out from that point: a ring of lit cells
 *            that bends the picture like a lens as it passes, then
 *            fades into dither.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 1200
 * ------------------------------------------------------------------ */

export interface StitchNovaProps {
    /** Artwork draws the reference picture; Generated draws the original noise field. */
    pattern?: "artwork" | "generated"
    /** Show the planet. Hidden, its space fills with drifting pixel clouds. */
    planet?: boolean
    /** Shows through the grid lines when their opacity is lowered. */
    background?: string
    /** % — how big the cells and the whole pattern draw. */
    scale?: number
    /** % — more lit cells when higher, more dark ones when lower. */
    density?: number
    /** Width of the checkerboard band between lit and dark areas. */
    dither?: number
    /** Colour of the lit cells. */
    color?: string
    /** Colour of the unlit cells. */
    offColor?: string
    /** Colour of the lines between cells. */
    gridColor?: string
    /** % — strength of the pointer response. 0 turns it off. */
    hover?: number
    /** 0–10: how far a tap's shockwave travels before it fades. */
    rippleSize?: number
    /** 0–10: how hard the shockwave bends the picture and how bright its ring is. 0 turns taps off. */
    rippleStrength?: number
    /** Drift, spin and glint rate. 50 is the designed pace, 0 stops it. */
    speed?: number
    /** ° — direction the clouds drift in. */
    angle?: number
    /** Tuning constants behind the look; a partial object is fine. */
    advanced?: Partial<StitchNovaAdvanced>
    style?: CSSProperties
}

export interface StitchNovaAdvanced {
    seed: number
    cellsAcross: number
    planetSize: number
    planetX: number
    planetY: number
    rimWidth: number
    rimGap: number
    gridWidth: number
    gridOpacity: number
    bevel: number
    highlight: number
    mottle: number
    grain: number
    vignette: number
    streakLength: number
    streakWidth: number
    blobSize: number
    streakMix: number
    octaves: number
    contrast: number
    bias: number
    specks: number
    planetDetail: number
    warp: number
    landLevel: number
    lightAngle: number
    halo: number
    haloWidth: number
    drift: number
    morph: number
    spin: number
    glintGap: number
    glintWidth: number
    glintSpeed: number
    pointerRadius: number
    pressBoost: number
    rippleBend: number
    rippleWidth: number
    rippleLife: number
}

// Colours measured off the reference: cell body, unlit cells and the
// near-black lines (≈1.4px of a 12.37px cell). Streaks rise at ≈25°.
const DEFAULTS = {
    pattern: "artwork",
    planet: true,
    background: "#000000",
    scale: 41,
    density: 50,
    dither: 40,
    color: "#FF759B",
    offColor: "#292728",
    gridColor: "#0E0D0D",
    hover: 100,
    rippleSize: 5,
    rippleStrength: 5,
    speed: 50,
    angle: 25,
}

const DEFAULT_ADVANCED: StitchNovaAdvanced = {
    seed: 7,
    cellsAcross: 97,
    planetSize: 18,
    planetX: 0,
    planetY: 0,
    rimWidth: 2,
    rimGap: 1,
    gridWidth: 11,
    gridOpacity: 100,
    bevel: 0,
    highlight: 10,
    mottle: 0,
    grain: 0,
    vignette: 0,
    streakLength: 22,
    streakWidth: 6,
    blobSize: 14,
    streakMix: 55,
    octaves: 4,
    contrast: 120,
    bias: -4,
    specks: 45,
    planetDetail: 5,
    warp: 50,
    landLevel: 0,
    lightAngle: 225,
    halo: 60,
    haloWidth: 3,
    drift: 4,
    morph: 10,
    spin: 12,
    glintGap: 40,
    glintWidth: 4,
    glintSpeed: 8,
    pointerRadius: 15,
    pressBoost: 100,
    rippleBend: 3,
    rippleWidth: 6,
    rippleLife: 1.4,
}

/** Cells per side of the artwork. */
const N = 97
/** The artwork: N×N bits, row-major, most significant bit first, 1 = lit. */
const ART =
    "AAAAAAAAAD/+qqqqgAAAAAAAAD/+qqqqgAAAAAACCD/+qqqqAIAAAAACAB/+oqqqoAAAAgACAAf/qqKoqAAAAAACgAP/qqqqAIAoAAKCgB/+oqqiAICqgAKigB/6qqgKAICqgCKigB/+iqqqoCCIoKiqgA//qqqooCAqqKqqgAf/KqqgIGAqqqqqAAH+KoIgAPAiqiqqAAA4KgAggPqqqqqqAAB4KgAgAH6qqqgqAAB4IAAAAH6qqqoqAQB8AAAAAj+oqqqiAAA8AAAAAD+iqqgAAAB8AACAAD/qqqgAAABgAAAAAD/KqqgAAABAAAAAAP/qqqgAAABAAAAAAH/yoioAwABAAEAAAH/yqggAYABAAAAAEH9wKgAAAABAAAAAAD4AKgAAAAAAAAAAAAYAKoAAAAAAAAAAEAcACoAAAAAAAAAAAAcICoAAAAAAAAAAAAIAAIAAAAAAAAAAAAIAAoAAAABAAAAAAAAAAgAAAAAAP+AAAAHgAAAAAAAA6q4AAAbwAgIAAAABq/rAAAf4AAAAAgABK/+wAAfYAAAAAAADKv/+AAfAAAAAAAIiKr/+gQPBAAAAAAKCKqv+oAGAAAAAKAKBKgq/EAAAIAAAKoKBCgCuhAAAHAAAKqqBigCKgQEAHAAAKqqAgAKCgIGIAgEACqqAgACqgCEAAAAACqqAQACqARAAAAAKCqqAIAAAAIgAAAA6gqqAIAAAACIAAB46oqoAEAAYABEAAB8+oKoACGAeDgmAAQ/+qqoABjwfj2TAIAf/qqgAgz8fx/LgAAH/qqgAAZ+P7/pwAAH/yqAAAM/n//14AYH/6qAAAGfx//1sAMB/+oAAADP4P//2AAAP8gAAAAj8D//6AAAXwAAAgAY9w//VAAA9wAAAAAKP+f/IgAA/4RAAAAC//v8MgAAf4YAAAABv/n+cQAAf8YD/AAAb/v4MQAgP8ZD/4AAG/v8MQAAH8Q7/+AADv7/koAAB8Yf//gAA/74goAA48QP//wAAP/4B4AB8ewH//8AgB/4DwAA/egL///AAAf8HwAA/+wB///gAAD//gAAf/gA///4AAAP+AAAP/A4f//8AAAAAACAH/A+P//+AAgAAAAAj+Afn///AAAAAAAAg8Af7///gAAAAAAAocAP////wAAACAAAoYA/////4AAACoAKIwA/////8AAACqEKRgAf////8AAoCqAKRAAP////+AAqgqAKQAGH//7//CAqoqgKAADB/8D//AAqqKoqAAAAH+///gAKqqqqBwAGH+f//gAKqqqqD/AHj+P//gAqqqqqD/gH/8AePmCqqqqoB/4D/+AED/iqqqoqA/8B/+AAAegqKKoKAf/w//AAAOgKAKoqAP/+/+AAgApwACoqAD////AA4Ar4AAoKB5////woIAn4AAAAB+////8oACvwAQAAA/////8qAC/x4AAAAf////wqQC/h+AAAAP//5/wK0Aug/gAAAB//4fyikACgP4AIPn//gByqMAqif4AAP///wACopAqq/+AAP///gIAqr/qq//gAH///g+oqq/+qf/4AD///H/+qqgA=="

// Where the planet sits in the artwork, in cells. Its rim reaches radius
// 18.6; everything inside SURFACE_R turns, the rim and its gap do not.
const PLANET_C = 48
const PLANET_R = 18
const PLANET_DISC = 18.6
const SURFACE_R = 15.5
/** Cells of seamless bridge between the art's far edge and its repeat. */
const BRIDGE = 16
/** Torus the drifting clouds are read from: the art plus its bridge. */
const Q = N + BRIDGE
/** How far the boil pushes cloud edges around, in cells, and its grain. */
const BOIL = 2.5
const BOIL_SCALE = 12
/**
 * The art has no clouds where the planet sits, so once the clouds drift
 * that clearing would sail off as an empty disc. The filled field patches
 * it with the clouds this many rows further down the art.
 */
const DONOR_ROWS = 40
/** Cells of drift over which the patched clouds fade in. */
const FILL_FADE = 15
/** Share of the blurred field mixed into each cell — lets Density grow and shrink shapes. */
const SOFT = 0.3
/** The streaks in the artwork rise at about this angle; glints run along it. */
const STREAK_ANGLE = (25 * Math.PI) / 180
/** Most tap shockwaves alive at once; the oldest gives way. */
const MAX_RIPPLES = 8

// ── colour helpers ──
function parseColor(c: string): [number, number, number, number] {
    let s = c.trim()
    const v = s.match(/^var\([^,]+,\s*(.+)\)$/)
    if (v) s = v[1].trim()
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4)
            h = h
                .split("")
                .map((ch) => ch + ch)
                .join("")
        const n = parseInt(h.slice(0, 6), 16)
        const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a]
    }
    const r = s.match(/rgba?\(([^)]+)\)/)
    if (r) {
        const p = r[1]
            .split(/[\s,/]+/)
            .filter(Boolean)
            .map(parseFloat)
        return [p[0] || 0, p[1] || 0, p[2] || 0, p[3] === undefined || isNaN(p[3]) ? 1 : p[3]]
    }
    return [0, 0, 0, 1]
}
function css(c: number[]) {
    return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${c[3]})`
}
function shade(c: number[], k: number) {
    if (k >= 0) return [c[0] + (255 - c[0]) * k, c[1] + (255 - c[1]) * k, c[2] + (255 - c[2]) * k, c[3]]
    return [c[0] * (1 + k), c[1] * (1 + k), c[2] * (1 + k), c[3]]
}

// ── noise ──
let SEED = 0
function hash3(x: number, y: number, z: number) {
    let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(z | 0, 0x61c88647) ^ SEED
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b)
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
}
function noise3(x: number, y: number, z: number) {
    const xi = Math.floor(x),
        yi = Math.floor(y),
        zi = Math.floor(z)
    const fx = x - xi,
        fy = y - yi,
        fz = z - zi
    const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10)
    const v = fy * fy * fy * (fy * (fy * 6 - 15) + 10)
    const w = fz * fz * fz * (fz * (fz * 6 - 15) + 10)
    const a0 = hash3(xi, yi, zi),
        a1 = hash3(xi + 1, yi, zi)
    const b0 = hash3(xi, yi + 1, zi),
        b1 = hash3(xi + 1, yi + 1, zi)
    const c0 = hash3(xi, yi, zi + 1),
        c1 = hash3(xi + 1, yi, zi + 1)
    const d0 = hash3(xi, yi + 1, zi + 1),
        d1 = hash3(xi + 1, yi + 1, zi + 1)
    const ab = a0 + (a1 - a0) * u + (b0 + (b1 - b0) * u - (a0 + (a1 - a0) * u)) * v
    const cd = c0 + (c1 - c0) * u + (d0 + (d1 - d0) * u - (c0 + (c1 - c0) * u)) * v
    return ab + (cd - ab) * w
}
function fbm(x: number, y: number, z: number, oct: number) {
    let sum = 0,
        amp = 1,
        norm = 0,
        f = 1
    for (let k = 0; k < oct; k++) {
        sum += amp * noise3(x * f + k * 17.13, y * f + k * 9.71, z * f * 0.5 + k * 3.3)
        norm += amp
        amp *= 0.55
        f *= 2
    }
    return sum / norm
}
function smoothstep(a: number, b: number, x: number) {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)
}
const wrapQ = (a: number) => ((a % Q) + Q) % Q

/**
 * Unpacks the artwork into the cloud torus the Artwork pattern reads from.
 *   L  1 lit, 0 dark, 0.5 part of a dithered (checkerboard) patch
 *   P  checker phase, so a dithered cell read in place gives back its own bit
 *   S  L blurred, for Density to grow and shrink shapes by
 * The planet is lifted out (it is drawn on its own and does not drift), and
 * a BRIDGE-cell strip past the right and bottom edges cross-fades the art's
 * far edge into its near one, so the field repeats with no seam.
 * Lf / Pf / Sf are the same field with the planet's clearing patched with
 * clouds (DONOR_ROWS); the art read in place uses the unpatched one.
 */
function buildArtwork() {
    const bytes = atob(ART)
    const bit = new Uint8Array(N * N)
    for (let k = 0; k < N * N; k++) bit[k] = (bytes.charCodeAt(k >> 3) >> (7 - (k & 7))) & 1
    const at = (i: number, j: number) => (i < 0 || j < 0 || i >= N || j >= N ? 0 : bit[j * N + i])

    const L0 = new Float32Array(N * N)
    const P0 = new Uint8Array(N * N)
    for (let j = 0; j < N; j++)
        for (let i = 0; i < N; i++) {
            const k = j * N + i
            const dx = i - PLANET_C,
                dy = j - PLANET_C
            if (dx * dx + dy * dy < PLANET_DISC * PLANET_DISC) continue
            const b = bit[k]
            const differ = +(at(i - 1, j) !== b) + +(at(i + 1, j) !== b) + +(at(i, j - 1) !== b) + +(at(i, j + 1) !== b)
            let dens = 0
            for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) dens += at(i + u, j + v)
            dens /= 9
            if (differ >= 3 && dens >= 0.3 && dens <= 0.7) {
                L0[k] = 0.5
                P0[k] = b ^ ((i + j) & 1)
            } else L0[k] = b
        }
    // Cells round a dithered patch take its phase too. In motion a cell
    // reads its checker phase from wherever its source is; if the edge cells
    // had none, every patch would flicker along its border as it drifts.
    const PHASE_REACH = [
        [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
        [2, 0], [-2, 0], [0, 2], [0, -2],
    ]
    for (let j = 0; j < N; j++)
        for (let i = 0; i < N; i++) {
            if (L0[j * N + i] === 0.5) continue
            for (const [u, v] of PHASE_REACH) {
                const x = i + u,
                    y = j + v
                if (x < 0 || y < 0 || x >= N || y >= N || L0[y * N + x] !== 0.5) continue
                P0[j * N + i] = P0[y * N + x]
                break
            }
        }

    // Bridge across x, then across y, on the already-bridged rows.
    const Lx = new Float32Array(Q * N)
    const Px = new Uint8Array(Q * N)
    for (let j = 0; j < N; j++)
        for (let x = 0; x < Q; x++) {
            if (x < N) {
                Lx[j * Q + x] = L0[j * N + x]
                Px[j * Q + x] = P0[j * N + x]
                continue
            }
            const w = (x - N + 0.5) / BRIDGE
            const a = j * N + (2 * N - 1 - x),
                b = j * N + (Q - 1 - x)
            Lx[j * Q + x] = L0[a] + (L0[b] - L0[a]) * w
            Px[j * Q + x] = w < 0.5 ? P0[a] : P0[b]
        }
    const L = new Float32Array(Q * Q)
    const P = new Uint8Array(Q * Q)
    for (let y = 0; y < Q; y++)
        for (let x = 0; x < Q; x++) {
            if (y < N) {
                L[y * Q + x] = Lx[y * Q + x]
                P[y * Q + x] = Px[y * Q + x]
                continue
            }
            const w = (y - N + 0.5) / BRIDGE
            const a = (2 * N - 1 - y) * Q + x,
                b = (Q - 1 - y) * Q + x
            L[y * Q + x] = Lx[a] + (Lx[b] - Lx[a]) * w
            P[y * Q + x] = w < 0.5 ? Px[a] : Px[b]
        }
    const Lf = new Float32Array(Q * Q)
    const Pf = new Uint8Array(Q * Q)
    for (let y = 0; y < Q; y++)
        for (let x = 0; x < Q; x++) {
            const k = y * Q + x
            const kd = wrapQ(y + DONOR_ROWS) * Q + x
            const w = 1 - smoothstep(21, 25, Math.hypot(x - PLANET_C, y - PLANET_C))
            Lf[k] = L[k] + (L[kd] - L[k]) * w
            Pf[k] = w > 0.5 ? P[kd] : P[k]
        }
    const blur = (F: Float32Array) => {
        const out = new Float32Array(Q * Q)
        for (let y = 0; y < Q; y++)
            for (let x = 0; x < Q; x++) {
                let s = 0
                for (let v = -1; v <= 1; v++)
                    for (let u = -1; u <= 1; u++) s += F[wrapQ(y + v) * Q + wrapQ(x + u)] * (2 - Math.abs(u)) * (2 - Math.abs(v))
                out[y * Q + x] = s / 16
            }
        return out
    }
    return { bit, L, P, S: blur(L), Lf, Pf, Sf: blur(Lf) }
}

interface Ripple {
    x: number
    y: number
    t: number
}

export default function StitchNova({
    pattern = DEFAULTS.pattern,
    planet = DEFAULTS.planet,
    background = DEFAULTS.background,
    scale = DEFAULTS.scale,
    density = DEFAULTS.density,
    dither = DEFAULTS.dither,
    color = DEFAULTS.color,
    offColor = DEFAULTS.offColor,
    gridColor = DEFAULTS.gridColor,
    hover = DEFAULTS.hover,
    rippleSize = DEFAULTS.rippleSize,
    rippleStrength = DEFAULTS.rippleStrength,
    speed = DEFAULTS.speed,
    angle = DEFAULTS.angle,
    advanced = {"bias":-4,"halo":60,"seed":7,"spin":12,"warp":50,"bevel":0,"drift":4,"grain":0,"hover":100,"morph":10,"mottle":0,"rimGap":1,"specks":45,"octaves":4,"planetX":0,"planetY":0,"blobSize":14,"contrast":120,"glintGap":40,"rimWidth":2,"vignette":0,"gridWidth":11,"haloWidth":3,"highlight":10,"landLevel":0,"streakMix":55,"glintSpeed":8,"glintWidth":4,"lightAngle":225,"planetSize":18,"pressBoost":100,"rippleBend":3,"rippleLife":1.4,"cellsAcross":97,"gridOpacity":100,"rippleWidth":6,"streakWidth":6,"planetDetail":5,"streakLength":22,"pointerRadius":15},
    style,
}: StitchNovaProps) {
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const live = {
        pattern,
        planet,
        background,
        scale,
        density,
        dither,
        color,
        offColor,
        gridColor,
        hover,
        rippleSize,
        rippleStrength,
        speed,
        angle,
        adv: { ...DEFAULT_ADVANCED, ...advanced },
    }
    const propsRef = useRef(live)
    propsRef.current = live

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        const ctx = canvas?.getContext("2d")
        if (!root || !canvas || !ctx) return

        const art = buildArtwork()

        let W = 1,
            H = 1
        let dirty = true
        const resize = () => {
            const dpr = Math.min(2, window.devicePixelRatio || 1)
            W = Math.max(1, Math.round(root.offsetWidth * dpr))
            H = Math.max(1, Math.round(root.offsetHeight * dpr))
            canvas.width = W
            canvas.height = H
            dirty = true
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(root)

        // Grid geometry, in device px. The Artwork covers the frame on its own
        // square aspect (Cells Across on the long side); Generated keeps the
        // original's Cells Across on the short side. Either way cell index
        // (N - 1) / 2 sits at the frame centre.
        let cs = 1,
            gx = 0,
            gy = 0
        const layout = () => {
            const p = propsRef.current
            const across = Math.max(10, p.adv.cellsAcross)
            const side = p.pattern === "generated" ? Math.min(W, H) : Math.max(W, H)
            cs = (side / across) * (Math.max(1, p.scale) / 100)
            gx = W / 2 - (N / 2) * cs
            gy = H / 2 - (N / 2) * cs
        }

        // Pointer, in device px. Rect, not offsetX: Framer's canvas zoom
        // scales the element.
        const ptr = { x: 0, y: 0, inside: false, down: false, over: 0, boost: 0 }
        const ripples: Ripple[] = []
        let now = 0 // frame clock, s; taps are stamped with it too
        const toLocal = (e: PointerEvent) => {
            const r = root.getBoundingClientRect()
            ptr.x = ((e.clientX - r.left) / Math.max(1, r.width)) * W
            ptr.y = ((e.clientY - r.top) / Math.max(1, r.height)) * H
        }
        const onMove = (e: PointerEvent) => {
            toLocal(e)
            ptr.inside = true
            dirty = true
        }
        const onLeave = () => {
            ptr.inside = false
        }
        const onDown = (e: PointerEvent) => {
            onMove(e)
            ptr.down = true
            if (propsRef.current.rippleStrength <= 0) return
            layout()
            ripples.push({ x: (ptr.x - gx) / cs - 0.5, y: (ptr.y - gy) / cs - 0.5, t: now })
            if (ripples.length > MAX_RIPPLES) ripples.shift()
        }
        const onUp = () => {
            ptr.down = false
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerenter", onMove)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerdown", onDown)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        const mq = window.matchMedia("(prefers-reduced-motion: reduce)")

        let grainPat: CanvasPattern | null = null
        const getGrain = () => {
            if (grainPat) return grainPat
            const c = document.createElement("canvas")
            c.width = 128
            c.height = 128
            const x = c.getContext("2d")!
            const img = x.createImageData(128, 128)
            for (let i = 0; i < img.data.length; i += 4) {
                const v = Math.random() * 255
                img.data[i] = v
                img.data[i + 1] = v
                img.data[i + 2] = v
                img.data[i + 3] = 255
            }
            x.putImageData(img, 0, 0)
            grainPat = ctx.createPattern(c, "repeat")
            return grainPat
        }

        let clock = 0
        let last = -1
        let raf = 0
        let lastKey = ""
        let par = false // checker phase of the cell the field last returned

        const frame = (nowMs: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min(0.05, (nowMs - last) / 1000)
            last = nowMs
            now = nowMs / 1000

            const p = propsRef.current
            const adv = p.adv
            const reduced = mq.matches
            const isArt = p.pattern !== "generated"

            // Pointer easing and press boost, as in the original.
            const hk = reduced ? 0 : Math.max(0, p.hover) / 50
            ptr.over += ((ptr.inside ? 1 : 0) - ptr.over) * (1 - Math.exp(-dt / 0.1))
            ptr.boost += ((ptr.down && hk > 0 ? 1 : 0) - ptr.boost) * (1 - Math.exp(-dt / 0.15))
            const rate = reduced ? 0 : Math.max(0, p.speed) / 50
            clock += dt * rate * (1 + ptr.boost * (adv.pressBoost / 100) * Math.min(1, hk))
            for (let k = ripples.length - 1; k >= 0; k--) if (now - ripples[k].t >= adv.rippleLife) ripples.splice(k, 1)

            // Nothing moving: redraw only when something changed.
            const settling = hk > 0 && ptr.over > 0.001 && ptr.over < 0.999
            const key = JSON.stringify(p) + W + "x" + H
            if (rate === 0 && !ripples.length && !settling && !dirty && adv.grain <= 0 && key === lastKey) return
            lastKey = key
            dirty = false

            SEED = Math.imul((adv.seed | 0) + 1, 0x9e3779b1)
            layout()

            const pa = (p.angle * Math.PI) / 180
            const dirX = Math.cos(pa),
                dirY = -Math.sin(pa)

            // ── Artwork field ──
            // Clouds are read from the torus at (cell − drift + boil), blended
            // between cells, and each cell then decides on / dither / off for
            // itself. A cloud edge therefore advances cell by cell, each one
            // switching as the edge reaches it — never the whole sky hopping a
            // cell at once, which is what reading the nearest cell does (and
            // at 25° its x and y hops alternate into a zig-zag). At clock 0
            // drift and boil are zero, every cell reads itself exactly, and
            // the picture is the artwork.
            const aD = clock * adv.drift
            const aDx = dirX * aD,
                aDy = dirY * aD
            const aZ = clock * (adv.morph / 100) * 1.5
            const aFade = smoothstep(0, FILL_FADE, aD)
            const aShift = ((p.density - 50) / 50) * 0.25
            const aHw = (Math.max(0, p.dither) / 100) * 0.45
            const theta = (clock * adv.spin * Math.PI) / 180
            const SR2 = SURFACE_R * SURFACE_R
            const showPlanet = p.planet && adv.planetSize > 0
            const pk = showPlanet ? PLANET_R / adv.planetSize : 0
            // The art's own clearing is only ~2.4 cells, so at rest the halo
            // must stay that tight; once the clouds are on the move it opens
            // to twice Halo Width so passing clouds part round the planet.
            const aHaloS = (adv.halo / 100) * 1.1 * (1 + 0.5 * aFade)
            const aHaloW = Math.max(0.5, adv.haloWidth) * (1 + aFade)
            const ca = Math.cos(STREAK_ANGLE),
                sa = Math.sin(STREAK_ANGLE)
            const glintOn = rate > 0 && adv.glintWidth > 0
            const glintGap = Math.max(1, adv.glintGap)
            const glintT = clock * adv.glintSpeed

            const artField = (i: number, j: number) => {
                // Planet: drawn from the art in place, scaled by Planet Size.
                const ax = (i - PLANET_C - adv.planetX) * pk,
                    ay = (j - PLANET_C - adv.planetY) * pk
                const ar2 = ax * ax + ay * ay
                if (pk > 0 && ar2 < PLANET_DISC * PLANET_DISC) {
                    par = false
                    let sx = ax
                    if (theta !== 0 && ar2 < SR2) {
                        // A globe whose far side repeats the near one, so the
                        // art rolls in at the left limb and out at the right;
                        // the seam sits on the limb, where cells are most
                        // foreshortened. (A mirrored far side has no seam but
                        // turns the planet into a symmetric face at 90°.)
                        const w = Math.sqrt(SR2 - ay * ay)
                        let lam = Math.asin(Math.max(-1, Math.min(1, ax / w))) + theta
                        lam -= Math.PI * Math.floor((lam + Math.PI / 2) / Math.PI)
                        sx = w * Math.sin(lam)
                    }
                    return art.bit[Math.round(PLANET_C + ay) * N + Math.round(PLANET_C + sx)] ? 1 : -1
                }
                // Clouds.
                let sx = i - aDx,
                    sy = j - aDy
                if (aZ !== 0) {
                    const nx = sx / BOIL_SCALE,
                        ny = sy / BOIL_SCALE
                    sx += BOIL * (noise3(nx, ny, aZ) - noise3(nx, ny, 0))
                    sy += BOIL * (noise3(nx + 13.1, ny + 4.7, aZ + 50) - noise3(nx + 13.1, ny + 4.7, 50))
                }
                const rx = Math.round(sx),
                    ry = Math.round(sy)
                const k = wrapQ(ry) * Q + wrapQ(rx)
                const x0 = Math.floor(sx),
                    y0 = Math.floor(sy)
                const fx = sx - x0,
                    fy = sy - y0
                const r0 = wrapQ(y0) * Q,
                    r1 = wrapQ(y0 + 1) * Q
                const c0 = wrapQ(x0),
                    c1 = wrapQ(x0 + 1)
                const bilerp = (F: Float32Array) =>
                    (F[r0 + c0] * (1 - fx) + F[r0 + c1] * fx) * (1 - fy) + (F[r1 + c0] * (1 - fx) + F[r1 + c1] * fx) * fy
                // The art's own copy fades its patch in as it drifts off the
                // planet; every repeat around it, and the whole sky when the
                // planet is hidden, is patched from the start.
                const own = rx >= 0 && ry >= 0 && rx < N && ry < N
                const f = own && pk > 0 ? aFade : 1
                let Ln: number, Sb: number, Lk: number, Pk: number
                if (f <= 0) {
                    Ln = bilerp(art.L)
                    Sb = bilerp(art.S)
                    Lk = art.L[k]
                    Pk = art.P[k]
                } else if (f >= 1) {
                    Ln = bilerp(art.Lf)
                    Sb = bilerp(art.Sf)
                    Lk = art.Lf[k]
                    Pk = art.Pf[k]
                } else {
                    Ln = bilerp(art.L) * (1 - f) + bilerp(art.Lf) * f
                    Sb = bilerp(art.S) * (1 - f) + bilerp(art.Sf) * f
                    Lk = art.L[k] + (art.Lf[k] - art.L[k]) * f
                    Pk = f < 0.5 ? art.P[k] : art.Pf[k]
                }
                // Checker on this cell's own parity, in the source's phase:
                // a dithered patch keeps its pattern still while its edges
                // flow, instead of the whole patch flipping each time the
                // drift crosses half a cell.
                par = (((i + j) & 1) ^ Pk) === 1
                if (glintOn && Lk > 0.45 && Lk < 0.55) {
                    // Glint: a band running up-right along the streaks, filling
                    // the checkerboard solid. Bands come and go per streak lane.
                    const across = rx * sa + ry * ca
                    const ph = (rx * ca - ry * sa - glintT) / glintGap + 0.15 * Math.sin(across / 9)
                    const band = Math.floor(ph)
                    if ((ph - band) * glintGap <= adv.glintWidth && hash3(band, Math.floor(across / 14), 313) < 0.5) return 1
                }
                let s = (1 - SOFT) * Ln + SOFT * Sb - 0.5 + aShift
                // Clearing round the planet, so drifting clouds part around it.
                if (pk > 0 && aHaloS > 0) s -= aHaloS * (1 - smoothstep(PLANET_DISC, PLANET_DISC + aHaloW, Math.sqrt(ar2)))
                return s
            }

            // ── Generated field: the original component's, transcribed ──
            const gDx = dirX,
                gDy = dirY
            const gNx = -gDy,
                gNy = gDx
            const D = clock * adv.drift
            const z = clock * (adv.morph / 100) * 0.5
            const La = Math.max(1, adv.streakLength)
            const Lb = Math.max(1, adv.streakWidth)
            const Lbl = Math.max(1, adv.blobSize)
            const mix = Math.max(0, Math.min(1, adv.streakMix / 100))
            const oct = Math.max(1, Math.min(6, Math.round(adv.octaves)))
            const contrast = adv.contrast / 100
            const bias = adv.bias / 100
            const gShift = ((p.density - 50) / 50) * 0.2
            const gW = (Math.max(0, p.dither) / 100) * 0.35
            const gHw = gW / 2
            const speckThr = 1 - (Math.max(0, adv.specks) / 100) * 0.12
            const R = p.planet ? Math.max(0, adv.planetSize) : 0
            const rimHalf = Math.max(0.3, adv.rimWidth * 0.4)
            const gap = Math.max(0, adv.rimGap)
            const haloW = Math.max(0.5, adv.haloWidth)
            const haloS = (adv.halo / 100) * 0.3
            const la = (adv.lightAngle * Math.PI) / 180
            const Lx = Math.cos(la),
                Ly = -Math.sin(la)
            const ct = Math.cos(theta),
                st = Math.sin(theta)
            const Lp = Math.max(1, adv.planetDetail)
            const warp = (adv.warp / 100) * 3
            const land0 = adv.landLevel / 100

            const genField = (i: number, j: number) => {
                const x = i - PLANET_C,
                    y = j - PLANET_C
                par = ((i + j) & 1) === 0
                let s = 0
                let outside = true
                let r = 0
                if (R > 0) {
                    const ex = x - adv.planetX,
                        ey = y - adv.planetY
                    r = Math.sqrt(ex * ex + ey * ey)
                    if (r <= R + rimHalf) {
                        outside = false
                        if (r >= R - rimHalf) {
                            // rim: solid on the lit side, checker on the far side
                            const inv = r > 0 ? 1 / r : 0
                            const light = ex * inv * Lx + ey * inv * Ly
                            s = gW * (0.6 + light) + (noise3(x * 0.6 + 7, y * 0.6 + 3, z + 9) - 0.5) * gW * 1.5 + gShift
                        } else if (r >= R - rimHalf - gap) {
                            s = -1
                        } else {
                            // interior: rotating field under a fixed light
                            const rx = ex * ct - ey * st
                            const ry = ex * st + ey * ct
                            const qx = rx / Lp,
                                qy = ry / Lp
                            const wx = noise3(qx * 0.7, qy * 0.7, 40 + z) - 0.5
                            const wy = noise3(qx * 0.7 + 13.1, qy * 0.7 + 4.7, 60 + z) - 0.5
                            const base = fbm(qx + wx * warp, qy + wy * warp, 20 + z, 3)
                            const yn = ey / R,
                                rn = r / R
                            const land = smoothstep(-0.35 - land0, 0.0 - land0, yn)
                            const capT = (yn + 0.68) / 0.17
                            const cap = Math.exp(-capT * capT)
                            const edge = smoothstep(0.78, 0.94, rn) * smoothstep(-0.5, -0.3, yn) * (1 - Math.max(0, yn))
                            s = (land - 0.55) * 0.5 + (base - 0.5) * 1.1 + cap * 0.28 - edge * 0.3 + gShift
                        }
                    }
                }
                if (outside) {
                    const qx = x - gDx * D,
                        qy = y - gDy * D
                    const along = qx * gDx + qy * gDy
                    const across = qx * gNx + qy * gNy
                    const streak = fbm(along / La, across / Lb, z, oct)
                    const blob = fbm(qx / Lbl + 31.7, qy / Lbl + 11.3, z * 0.7 + 5, 3)
                    const v = blob + (streak - blob) * mix
                    s = (v - 0.5 + bias) * contrast + gShift
                    if (R > 0 && haloS > 0) s -= haloS * (1 - smoothstep(R + rimHalf, R + rimHalf + haloW, r))
                    if (s < -gHw && speckThr < 1 && noise3(qx / 1.7 + 101, qy / 1.7 + 57, z * 3 + 77) > speckThr) s = 1
                }
                return s
            }

            const field = isArt ? artField : genField
            const hw = isArt ? aHw : gHw

            // Hover: lifts the field around the pointer (index units).
            const pX = (ptr.x - gx) / cs - 0.5,
                pY = (ptr.y - gy) / cs - 0.5
            const pR = Math.max(1, adv.pointerRadius)
            const pR2 = pR * pR * 0.5
            const pAmp = hk * ptr.over * 0.35

            // Tap shockwaves.
            const reach = 10 + Math.max(0, p.rippleSize) * 8
            const power = Math.max(0, p.rippleStrength) / 5
            const bend = adv.rippleBend * power
            const glowK = Math.min(1, power)
            const rw = Math.max(1, adv.rippleWidth)

            // Finish of a cell: grid line, a lighter rim on lit cells (the
            // stitched-bead edge in the reference), optional bevel and mottle.
            const gw = Math.min(Math.floor(cs) - 1, Math.max(1, Math.round((cs * adv.gridWidth) / 100)))
            const hl = adv.highlight > 0 ? Math.max(1, Math.round(cs * 0.08)) : 0
            const bw = adv.bevel > 0 ? Math.max(1, Math.round(cs * 0.15)) : 0
            const variants = adv.mottle > 0 ? 3 : 1
            const offOuter = new Path2D()
            const offInner = new Path2D()
            const onRim = [new Path2D(), new Path2D(), new Path2D()]
            const onOuter = [new Path2D(), new Path2D(), new Path2D()]
            const onInner = [new Path2D(), new Path2D(), new Path2D()]

            const i0 = Math.floor(-gx / cs),
                i1 = Math.ceil((W - gx) / cs)
            const j0 = Math.floor(-gy / cs),
                j1 = Math.ceil((H - gy) / cs)
            for (let j = j0; j <= j1; j++) {
                const y = Math.round(gy + j * cs) + gw
                const h = Math.round(gy + (j + 1) * cs) - y
                if (h <= 0) continue
                for (let i = i0; i <= i1; i++) {
                    let si = i,
                        sj = j,
                        glow = 0,
                        wake = 0
                    if (ripples.length) {
                        let ddx = 0,
                            ddy = 0
                        for (const r of ripples) {
                            const age = (now - r.t) / adv.rippleLife
                            const env = (1 - age) * (1 - age)
                            const ex = i - r.x,
                                ey = j - r.y
                            const d = Math.sqrt(ex * ex + ey * ey) || 1
                            const dd = d - age * reach // cells past the front
                            const sr = dd / rw
                            if (sr <= -1 || sr >= 1) continue
                            // Lens: pulls in ahead of the front, pushes out behind it.
                            const disp = env * bend * Math.sin(Math.PI * sr) * (1 - Math.abs(sr))
                            ddx += (ex / d) * disp
                            ddy += (ey / d) * disp
                            glow += (1 - age) * Math.exp(-(dd * dd) / 1.6)
                            wake += (1 - age) * Math.exp(-((dd + 2.4) * (dd + 2.4)) / 0.8)
                        }
                        si = Math.round(i - ddx)
                        sj = Math.round(j - ddy)
                        glow *= glowK
                        wake *= glowK
                    }
                    let s = field(si, sj)
                    if (pAmp > 0.001) {
                        const ex = i - pX,
                            ey = j - pY
                        s += pAmp * Math.exp(-(ex * ex + ey * ey) / pR2)
                    }
                    // The shockwave front is a solid ring while fresh and fades
                    // through dither; a dark wake just inside it sets it off.
                    const on =
                        glow > 0.5 ||
                        (glow > 0.2 && ((i + j) & 1) === 0) ||
                        (wake < 0.45 && (s > hw || (s >= -hw && par)))

                    const x = Math.round(gx + i * cs) + gw
                    const w = Math.round(gx + (i + 1) * cs) - x
                    if (w <= 0) continue
                    if (!on) {
                        offOuter.rect(x, y, w, h)
                        if (bw && w > 2 * bw && h > 2 * bw) offInner.rect(x + bw, y + bw, w - 2 * bw, h - 2 * bw)
                        continue
                    }
                    const b = variants > 1 ? Math.min(2, (hash3(i, j, 991) * 3) | 0) : 0
                    onRim[b].rect(x, y, w, h)
                    if (w > 2 * hl && h > 2 * hl) onOuter[b].rect(x + hl, y + hl, w - 2 * hl, h - 2 * hl)
                    const ib = hl + bw
                    if (bw && w > 2 * ib && h > 2 * ib) onInner[b].rect(x + ib, y + ib, w - 2 * ib, h - 2 * ib)
                }
            }

            // ── draw ──
            const cOn = parseColor(p.color)
            const cOff = parseColor(p.offColor)
            const bev = adv.bevel / 100
            const m = adv.mottle / 100
            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.globalCompositeOperation = "source-over"
            ctx.globalAlpha = 1
            ctx.clearRect(0, 0, W, H)
            ctx.fillStyle = css(parseColor(p.background))
            ctx.fillRect(0, 0, W, H)
            ctx.globalAlpha = Math.max(0, Math.min(1, adv.gridOpacity / 100))
            ctx.fillStyle = css(parseColor(p.gridColor))
            ctx.fillRect(0, 0, W, H)
            ctx.globalAlpha = 1
            ctx.fillStyle = css(bw ? shade(cOff, -bev * 0.3) : cOff)
            ctx.fill(offOuter)
            if (bw) {
                ctx.fillStyle = css(cOff)
                ctx.fill(offInner)
            }
            for (let b = 0; b < variants; b++) {
                const body = variants > 1 ? shade(cOn, b === 1 ? m : b === 2 ? -m : 0) : cOn
                ctx.fillStyle = css(shade(body, adv.highlight / 100))
                ctx.fill(onRim[b])
                ctx.fillStyle = css(bw ? shade(body, -bev) : body)
                ctx.fill(onOuter[b])
                if (bw) {
                    ctx.fillStyle = css(body)
                    ctx.fill(onInner[b])
                }
            }

            if (adv.grain > 0) {
                const gp = getGrain()
                if (gp) {
                    ctx.save()
                    ctx.globalAlpha = Math.min(1, (adv.grain / 100) * 0.5)
                    ctx.globalCompositeOperation = "overlay"
                    ctx.translate(-Math.floor(Math.random() * 128), -Math.floor(Math.random() * 128))
                    ctx.fillStyle = gp
                    ctx.fillRect(0, 0, W + 128, H + 128)
                    ctx.restore()
                }
            }
            if (adv.vignette > 0) {
                const mr = Math.sqrt(W * W + H * H) / 2
                const vg = ctx.createRadialGradient(W / 2, H / 2, mr * 0.45, W / 2, H / 2, mr)
                vg.addColorStop(0, "rgba(0,0,0,0)")
                vg.addColorStop(1, `rgba(0,0,0,${Math.min(1, (adv.vignette / 100) * 0.85)})`)
                ctx.fillStyle = vg
                ctx.fillRect(0, 0, W, H)
            }
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerenter", onMove)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
        }
    }, [])

    return (
        <div
            ref={rootRef}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
                cursor: rippleStrength > 0 ? "pointer" : undefined,
            }}
        >
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
        </div>
    )
}

function advNumber(key: keyof StitchNovaAdvanced, title: string, min: number, max: number, step: number, unit: string, description: string) {
    return { type: ControlType.Number, title, min, max, step, unit, defaultValue: DEFAULT_ADVANCED[key], description }
}
