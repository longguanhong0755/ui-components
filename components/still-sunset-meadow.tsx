"use client"

import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"
import * as THREE from "three"

/* ------------------------------------------------------------------ *
 *  MeadowBlush
 *
 *  A voxel meadow at sunset, seen from down in the grass: a square sun
 *  sinking behind blocky hills on the left, cube clouds lit peach from
 *  below, raised turf terraces on the horizon, and a field of block
 *  flowers and tall grass that leans as gusts roll across it. The
 *  pointer parts the grass.
 *
 *  Built after a still (a pink-and-gold voxel meadow at sunset, 1:2
 *  portrait) and the canvas draft that came with it, StillSunsetMeadow,
 *  whose layout tables -- clouds, hero flowers, terraces, sun -- are
 *  carried over as measured off the still, in that 1:2 frame.
 *
 *  What changed from the draft, and why:
 *    Letterboxed 1:2 scene
 *        The draft painted a fixed-aspect picture and filled the rest
 *        with a background colour. This is a real 3D scene (three.js):
 *        one low camera over a ground plane, so the frame is always
 *        full. A wider frame sees more meadow; the tables are read as
 *        screen positions so the composition holds at any aspect.
 *    Painter's cubes
 *        2D faces faked toward a vanishing point. Here every voxel is
 *        an instanced box with real perspective and a depth buffer, so
 *        flowers can sit inside the grass rather than on top of it.
 *    Depth of field
 *        The draft blurred two baked bitmaps. Here the meadow is split
 *        by distance into a sharp field, a softly blurred band and a
 *        heavily blurred foreground, each blurred on the GPU.
 *    Panel
 *        Thirty-odd tuning colours and timings are fixed as the look;
 *        what is left is on 0-10 scales.
 *
 *  Interaction
 *    Hover     the grass parts around the pointer and is swept along by
 *              its motion, each patch on its own damped spring, so it
 *              lags, overshoots and wobbles back when the pointer moves
 *              on. Pressing parts it wider. The camera itself stays put:
 *              a pointer-led drift of the view slid the thin path tiles
 *              and hairline far blades by fractions of a pixel, and they
 *              shimmered under every small hand movement.
 *    Clouds    drift continuously left or right and wrap round.
 *    Day       optional: the sun climbs from the right, crosses and
 *              sets on the left (the still is the moment of sunset),
 *              then a square moon and stars, and round again.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 700
 */

type RGB = [number, number, number]

interface Sky {
    top: string
    horizon: string
    glow: string
}

interface DayCycle {
    /** Run the day. Off holds the scene at Time. */
    cycle: boolean
    /** Time of day in hours: 6 sunrise, 12 noon, 18 the still's sunset, 0 midnight. */
    time: number
    /** Seconds for one full 24 h day. */
    length: number
}

export interface MeadowBlushProps {
    /** How many flowers grow in the field, 0-10. 0 leaves only grass. */
    flowers?: number
    /** Sky colours at sunset (and sunrise); day and night skies are fixed. */
    sky?: Partial<Sky>
    /** How thick the grass grows, 0-10. */
    grass?: number
    /** Horizon height from the top of the frame, %. */
    horizon?: number
    /** Which arrangement of grass and flowers. */
    seed?: number
    /** Size of the grass voxels, 0-10. */
    voxelSize?: number
    /** Depth-of-field blur on the foreground, 0-10. */
    depthBlur?: number
    /** Warm haze toward the horizon, 0-10. */
    haze?: number
    /** How strongly the grass parts, follows and springs back around the pointer, 0-10. 0 is off. */
    hover?: number
    /** How far the gusts lean the grass, 0-10. */
    wind?: number
    /** Playback rate of the wind, 0-10. 0 holds the grass still. */
    speed?: number
    /** Which way the clouds drift. */
    cloudDirection?: "left" | "right"
    /** How fast the clouds drift, 0-10. 0 holds them. */
    cloudSpeed?: number
    /** The day-and-night cycle. */
    day?: Partial<DayCycle>
    style?: CSSProperties
}

const DEFAULT_SKY: Sky = { top: "#E2A8AE", horizon: "#F8A68E", glow: "#FFCB8C" }
const DEFAULT_DAY: DayCycle = { cycle: false, time: 18, length: 90 }

const DEFAULTS = {
    cloudDirection: "right",
    cloudSpeed: 3,
    flowers: 3.7,
    grass: 5,
    horizon: 50,
    seed: 7,
    voxelSize: 10,
    depthBlur: 4.9,
    haze: 5,
    hover: 10,
    wind: 10,
    speed: 10,
}

// ── look ──────────────────────────────────────────────────────────────
// Fixed: these are the picture, not knobs. Sampled off the still.

const DEG = Math.PI / 180
/** Eye height. Everything else is measured against it. */
const CAM_H = 1
/** The draft's tables were measured with the horizon at 47 % of the frame. */
const REF_H = 0.47
/** Grass voxel edge at the default Voxel Size, in eye heights. */
const VOXEL = 0.036
/** Cloud depth: close enough that their undersides and sun-side faces show, as the still's do. */
const CLOUD_D = 40
/** Floats per instance: centre 3, size 3, colour 3 + tip, root x/z, height, kind. */
const STRIDE = 14
/** Instance kinds, read by the shader. */
const K_GRASS = 0
const K_FLOWER = 1
const K_BLOCK = 2
const K_CLOUD = 3

function hex(s: string): RGB {
    const n = parseInt(s.slice(1), 16)
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

const C = {
    sun: hex("#FFF7E8"),
    grassDark: hex("#172604"),
    grassMid: hex("#4A700E"),
    grassLight: hex("#8AAA18"),
    grassTip: hex("#CACC34"),
    rim: hex("#F4D040"),
    groundDark: hex("#162404"),
    groundMid: hex("#34500E"),
    groundFar: hex("#647616"),
    dapple: hex("#B09A1C"),
    dirt: hex("#74491E"),
    dirtDark: hex("#4E3212"),
    turf: hex("#6A8216"),
    turf2: hex("#A4A026"),
    stem: hex("#4A8C24"),
    leaf: hex("#2C5A16"),
    hazeGold: hex("#E2A832"),
    hazeSun: hex("#F7944A"),
}

/** Noon and midnight. The sunset palette is the panel's Sky; these are what the day blends through either side of it. */
const DAY_SKY = { top: hex("#5E9BE6"), horizon: hex("#BCD9F2"), glow: hex("#FFF4DC") }
const NIGHT_SKY = { top: hex("#060A20"), horizon: hex("#1A2350"), glow: hex("#9DB0F0") }
/** Light on the land: noon, sunset (as sampled), night. */
const LIGHT_DAY: RGB = [1.1, 1.1, 1.08]
const LIGHT_NIGHT: RGB = [0.22, 0.27, 0.46]
const CLOUD_DAY: RGB = [1.04, 1.04, 1.04]
const CLOUD_NIGHT: RGB = [0.3, 0.34, 0.5]

const FLOWER_COLS = ["#E0402C", "#F08030", "#F08AB0", "#D04A9A", "#3C6AE0", "#7A4AD0", "#F6F0EA", "#F2C83A"]

// [x, head y, cube, stem base y, petal, centre] -- x as a share of the
// width, y as a share of the height, cube in half-heights (the draft's
// unit: half the height of its 1:2 frame).
type FlowerRow = [number, number, number, number, string, string]

const HERO_FLOWERS: FlowerRow[] = [
    [0.118, 0.655, 0.04, 0.735, "#D8352A", "#F08030"],
    [0.03, 0.69, 0.036, 0.765, "#F07A30", "#F2C83A"],
    [0.3, 0.728, 0.05, 0.83, "#F6F0EE", "#F2C83A"],
    [0.847, 0.69, 0.022, 0.745, "#E0508A", "#F2C83A"],
    [0.905, 0.655, 0.038, 0.74, "#F0507A", "#F2C83A"],
    [0.935, 0.74, 0.046, 0.85, "#F6B83A", "#E09A2A"],
    [0.69, 0.79, 0.07, 0.975, "#FFF4EC", "#F4C24A"],
]
const FRONT_FLOWERS: FlowerRow[] = [
    [0.45, 1.0, 0.068, 1.16, "#E890B0", "#F2C83A"],
    [0.95, 0.965, 0.068, 1.16, "#F6C040", "#E09A2A"],
]
const MID_FLOWERS: FlowerRow[] = [
    [0.075, 0.603, 0.018, 0.64, "#D88AB8", "#F2C83A"],
    [0.45, 0.598, 0.021, 0.64, "#3A5AE0", "#F2C83A"],
    [0.67, 0.603, 0.018, 0.642, "#D83030", "#F2C83A"],
    [0.63, 0.632, 0.019, 0.672, "#F4F0EA", "#F2C83A"],
    [0.2, 0.62, 0.018, 0.66, "#F08030", "#F2C83A"],
    [0.88, 0.598, 0.016, 0.632, "#F2E6D2", "#F2C83A"],
    [0.94, 0.62, 0.016, 0.655, "#F2C83A", "#E86A2A"],
    [0.61, 0.567, 0.012, 0.592, "#E86A2A", "#F2C83A"],
    [0.4, 0.575, 0.013, 0.6, "#7A4AD0", "#F2C83A"],
]

// Clouds: front-face blocks as [x0, y0, x1, y1] in the draft's 1:2
// frame, laid out around an anchor (ax, as a share of the width) so a
// cloud keeps its shape at any aspect. Colours: lit front face.
interface CloudDef {
    ax: number
    color: string
    blocks: number[][]
}
const CLOUDS: CloudDef[] = [
    {
        ax: 1, color: "#F8D4B8",
        blocks: [
            [0.83, 0.024, 1.04, 0.127],
            [0.74, 0.078, 0.8, 0.098],
            [0.69, 0.098, 0.83, 0.127],
            [0.615, 0.122, 0.82, 0.18],
            [0.82, 0.122, 0.995, 0.17],
            [0.67, 0.17, 0.99, 0.21],
        ],
    },
    {
        ax: 0.3, color: "#F4B0BA",
        blocks: [
            [0.19, 0.255, 0.415, 0.288],
            [0.235, 0.243, 0.3, 0.256],
            [0.27, 0.232, 0.37, 0.256],
            [0.36, 0.246, 0.4, 0.256],
        ],
    },
    {
        ax: 0.83, color: "#FAF2F2",
        blocks: [
            [0.7, 0.318, 0.965, 0.352],
            [0.72, 0.308, 0.79, 0.319],
            [0.76, 0.296, 0.86, 0.319],
            [0.86, 0.302, 0.93, 0.319],
            [0.93, 0.311, 0.952, 0.319],
        ],
    },
]
/** Extra clouds for wide frames, which would otherwise show empty sky. */
const WIDE_CLOUDS: { min: number; def: number; ax: number; dy: number; scale: number }[] = [
    { min: 1, def: 2, ax: 0.5, dy: -0.13, scale: 0.8 },
    { min: 1.5, def: 1, ax: 0.66, dy: 0.05, scale: 0.9 },
    { min: 2.2, def: 2, ax: 0.18, dy: -0.18, scale: 0.7 },
]

// ── helpers ───────────────────────────────────────────────────────────

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, Number.isFinite(v) ? v : a))
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const shade = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k]

function parseColor(input: unknown, fallback: RGB): RGB {
    if (typeof input !== "string") return fallback
    let s = input.trim()
    const v = /^var\(\s*--[^,]+,\s*(.+)\)$/.exec(s)
    if (v) s = v[1].trim()
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4) h = h.split("").map((c) => c + c).join("")
        const n = parseInt(h.slice(0, 6), 16)
        return h.length >= 6 && !isNaN(n) ? [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255] : fallback
    }
    const m = /rgba?\(([^)]+)\)/i.exec(s)
    if (m) {
        const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat)
        if (p.length >= 3 && p.slice(0, 3).every(Number.isFinite)) return [p[0] / 255, p[1] / 255, p[2] / 255]
    }
    return fallback
}

function mulberry32(a: number) {
    return () => {
        a |= 0
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

/** Vertical field of view: the still's 50° in portrait, narrowing for wide frames so they read as a wider view, not a fisheye. */
function vfovFor(aspect: number) {
    const t = clamp((aspect - 0.6) / 1.4, 0, 1)
    return 50 - 14 * t * t * (3 - 2 * t)
}

// ── scene build ───────────────────────────────────────────────────────

interface BuildOpts {
    flowers: number
    grass: number
    horizon: number
    seed: number
    voxelSize: number
}

interface Built {
    /** Sharp field, horizon and terraces. */
    main: number[]
    /** Lightly blurred band just in front of focus. */
    soft: number[]
    /** Sharp, but their own geometry: seen from below. */
    clouds: number[]
    /** Heavily blurred foreground. */
    near: number[]
    /** Ground tile edge, for the ground shader. */
    tile: number
    /** Half the visible width at the clouds' depth. */
    cloudHalf: number
    /** Where a drifting cloud's centre wraps round: past the edge by its own width. */
    cloudWrap: number
}

function put(o: number[], cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, c: RGB, tip: number, rx: number, rz: number, h: number, kind: number) {
    o.push(cx, cy, cz, sx, sy, sz, c[0], c[1], c[2], tip, rx, rz, h, kind)
}

function buildMeadow(W: number, H: number, o: BuildOpts): Built {
    const rnd = mulberry32(Math.round(clamp(o.seed, 0, 9999)) * 9973 + 17)
    const aspect = W / H
    const h = clamp(o.horizon, 30, 70) / 100
    const f = 0.5 / Math.tan((vfovFor(aspect) * DEG) / 2)
    const vk = Math.pow(2, (clamp(o.voxelSize, 0, 10) - 5) / 5)
    const v = VOXEL * vk
    const dens = clamp(o.grass, 0, 10) / 5
    const fd = clamp(o.flowers, 0, 10) / 5
    /** How many portrait frames wide this is, for scaling counts. */
    const wk = Math.pow(Math.max(1, aspect / 0.5), 0.8)

    // Screen positions are in heights: x from 0 to aspect, y from 0 (top) to 1.
    const toY = (fy: number) => (fy <= REF_H ? (fy * h) / REF_H : h + ((fy - REF_H) * (1 - h)) / (1 - REF_H))
    const depthAt = (y: number) => (f * CAM_H) / Math.max(1e-4, y - h)
    const wx = (x: number, d: number) => ((x - aspect / 2) / f) * d
    const halfW = (d: number) => (aspect / 2 / f) * d
    const heightAt = (y: number, d: number) => CAM_H - ((y - h) / f) * d
    const len = (s: number, d: number) => (s / f) * d

    const dBottom = depthAt(1)
    const main: number[] = []
    const soft: number[] = []
    const near: number[] = []
    const clouds: number[] = []
    const pick = (d: number) => (d < dBottom * 0.94 ? near : d < dBottom * 1.3 ? soft : main)

    // ── grass ──
    const blade = (out: number[], x: number, d: number, c: number, n: number, bright: boolean, y0 = 0) => {
        const tone = bright ? 0.3 + rnd() * 0.7 : rnd()
        const body = mix(C.grassMid, C.grassLight, 0.1 + tone * 0.6)
        const slant = (rnd() - 0.5) * 0.5
        for (let i = 0; i < n; i++) {
            const t = n > 1 ? i / (n - 1) : 1
            // Green the whole way up; only the last voxel or two catch the
            // light. The rows in front hide the roots, so a blade that
            // lightened over its whole height would read as a pale carpet.
            let col = mix(C.grassDark, body, Math.min(1, 0.3 + t * 1.1))
            if (i === n - 1) col = mix(col, C.grassTip, 0.55)
            else if (i === n - 2) col = mix(col, C.grassTip, 0.2)
            const r = rnd()
            if (r < 0.18) col = shade(col, 0.78)
            else if (r < 0.28) col = mix(col, C.grassTip, 0.35)
            // Blades are cards: a voxel wide, a third of one deep, so the
            // field reads as tall grass rather than a heap of cubes.
            put(out, x + Math.round(i * slant) * c * 0.8, y0 + (i + 0.5) * c, -d, c * 0.8, c, c * 0.35, col, t, x, -d, (i + 0.5) * c, K_GRASS)
        }
    }

    // The path: a strip of bare turf from the bottom edge into the field,
    // a little right of centre, as in the still.
    const pathX = 0.07 * dBottom
    const pathHalf = 0.17 * dBottom
    const pathEnd = dBottom / 0.39
    const ph1 = rnd() * 6.28
    const ph2 = rnd() * 6.28

    if (dens > 0) {
        const fPx = f * Math.min(H, 900)
        const sq = Math.sqrt(dens)
        let d = dBottom * 0.6
        while (d < 48) {
            const c = v * Math.max(1, d / 14)
            // Rows close enough to overlap by half a voxel on screen near
            // by, and ~1.6 px apart where they crowd toward the horizon.
            const step = Math.max(0.8 * c * d, (2 * d * d) / fPx) / sq
            const sx = (c * 1.5) / sq
            const hw = halfW(d) + c * 4
            const q = d / dBottom
            for (let x = -hw + rnd() * sx; x < hw; x += sx * (0.6 + rnd() * 0.8)) {
                const bd = d + rnd() * step
                const clump = 0.5 + 0.5 * Math.sin(x * 2.3 + bd * 0.9 + ph1) * Math.sin(x * 0.7 - bd * 1.7 + ph2)
                // Tall at the lens, knee-high in the field, so the flowers
                // stand clear of it as they do in the still.
                const tall = (0.22 + 0.1 / q) * (0.55 + 0.45 * rnd()) * (0.7 + 0.6 * clump)
                let n = Math.max(1, Math.round(tall / c))
                if (bd < pathEnd * (0.85 + rnd() * 0.3) && Math.abs(x - pathX) < pathHalf + (rnd() - 0.5) * 0.12 * dBottom) {
                    if (rnd() > 0.08) continue
                    n = 1 + Math.floor(rnd() * 2)
                }
                blade(pick(bd), x, bd, c, n, false)
            }
            d += step
        }

        // Big out-of-focus blades across the bottom edge, thick on the
        // left, thinner on the right, clear over the path.
        const bokeh = (count: number, u0: number, u1: number, top0: number, top1: number) => {
            for (let i = 0; i < count; i++) {
                const d = dBottom * (0.5 + rnd() * 0.35)
                const u = u0 + (u1 - u0) * ((i + rnd() * 0.8) / count)
                const c = len((0.05 + rnd() * 0.03) * 0.5 * vk, d)
                const top = heightAt(toY(top0 + rnd() * (top1 - top0)), d)
                blade(near, wx(u * aspect, d), d, c, Math.max(3, Math.round(top / c)), true)
            }
        }
        bokeh(Math.round(11 * wk * sq), 0, 0.3, 0.72, 0.8)
        bokeh(Math.round(8 * wk * sq), 0.66, 1, 0.84, 0.9)
    }

    // ── flowers ──
    const flower = (x: number, d: number, stemH: number, s: number, petal: RGB, centre: RGB, leafy: boolean) => {
        const out = pick(d)
        const z = -d
        const sw = s * 0.55
        const n = Math.max(1, Math.round(stemH / sw))
        const step = stemH / n
        const stem = mix(C.stem, C.grassDark, rnd() * 0.25)
        for (let i = 0; i < n; i++) {
            const y = (i + 0.5) * step
            put(out, x, y, z, sw, step, sw, i % 2 ? shade(stem, 0.9) : stem, 0, x, z, y, K_FLOWER)
        }
        if (leafy && n > 2) {
            const a = Math.max(1, Math.floor(n * 0.3))
            const b = Math.max(a + 1, Math.floor(n * 0.55))
            put(out, x - sw * 1.05, (a + 0.5) * step, z, sw * 1.1, sw * 0.9, sw * 1.1, C.leaf, 0, x, z, (a + 0.5) * step, K_FLOWER)
            put(out, x + sw * 1.05, (b + 0.5) * step, z, sw * 1.1, sw * 0.9, sw * 1.1, C.leaf, 0, x, z, (b + 0.5) * step, K_FLOWER)
            // a dark tuft of leaves round the foot of the stem
            for (let k = 0; k < 3; k++) {
                const lx = x + (k - 1) * sw * 1.15
                const lz = z + (rnd() - 0.5) * sw * 1.4
                const lh = sw * (0.9 + rnd() * 1.4)
                put(out, lx, lh / 2, lz, sw * 1.1, lh, sw * 1.1, shade(C.leaf, 0.75 + rnd() * 0.3), 0, x, z, lh / 2, K_FLOWER)
            }
        }
        // The head is a cross of petal cubes round a centre cube, tipped
        // ~55° toward the camera so it shows its face, as in the still.
        const hc = stemH + s * 0.5
        const pv = () => mix(petal, [1, 1, 1], (rnd() - 0.5) * 0.12)
        const r = s * 0.8
        const up = r * 0.82
        const fwd = r * 0.57
        const petals = [[-r, 0, 0], [r, 0, 0], [0, up, -fwd], [0, -up, fwd]]
        for (const [dx, dy, dz] of petals) put(out, x + dx, hc + dy, z + dz, s, s, s, pv(), 0, x, z, hc, K_FLOWER)
        put(out, x, hc + s * 0.05, z + s * 0.5, s * 0.75, s * 0.75, s * 0.75, centre, 0, x, z, hc, K_FLOWER)
    }

    const fromRow = (r: FlowerRow, sizeK: number, leafy: boolean) => {
        const d = depthAt(toY(r[3]))
        const s = len(r[2] * 0.5 * sizeK, d)
        const stemH = Math.max(s * 1.5, heightAt(toY(r[1]), d) - s * 0.5)
        flower(wx(r[0] * aspect, d), d, stemH, s, hex(r[4]), hex(r[5]), leafy)
    }

    if (fd > 0) {
        for (const r of HERO_FLOWERS) fromRow(r, vk, true)
        for (const r of FRONT_FLOWERS) fromRow(r, vk, true)
        for (const r of MID_FLOWERS) fromRow(r, vk * 1.35, rnd() < 0.5)
        // Wide frames repeat the hero row in the space the still never had.
        for (let k = 1; k < Math.floor(aspect / 0.9); k++) {
            const r = HERO_FLOWERS[(k * 3) % HERO_FLOWERS.length]
            fromRow([(k + 0.4 + rnd() * 0.3) / Math.floor(aspect / 0.9 + 1), r[1], r[2] * 0.8, r[3], r[4], r[5]], vk, true)
        }
        const pickCol = () => FLOWER_COLS[Math.floor(rnd() * FLOWER_COLS.length)]
        const extra = Math.round(16 * fd * wk)
        for (let i = 0; i < extra; i++) {
            const yc = 0.56 + rnd() * 0.12
            const col = pickCol()
            const cen = col === "#F2C83A" ? "#E86A2A" : "#F2C83A"
            fromRow([rnd(), yc, (0.011 + rnd() * 0.008) * (1 + (yc - 0.56) * 4), yc + 0.028 + rnd() * 0.02, col, cen], vk, rnd() < 0.4)
        }
        // Specks of colour toward the horizon: one-voxel heads on short stems.
        const tiny = Math.round(70 * fd * wk)
        for (let i = 0; i < tiny; i++) {
            const d = depthAt(toY(0.502 + Math.pow(rnd(), 1.6) * 0.1))
            const c = v * Math.max(1, d / 14)
            const x = (rnd() * 2 - 1) * halfW(d)
            const sh = c * (2 + Math.floor(rnd() * 4))
            put(main, x, sh / 2, -d, c * 0.5, sh, c * 0.5, C.stem, 0, x, -d, sh / 2, K_FLOWER)
            put(main, x, sh + c, -d, c * 2.2, c * 1.8, c * 2.2, hex(pickCol()), 0, x, -d, sh + c, K_FLOWER)
        }
    }

    // ── terraces ──
    // Raised turf on the horizon: [u0, u1] as shares of the width,
    // base and top as the still's screen y, rows of blocks.
    const terrace = (u0: number, u1: number, base: number, top: number, rows: number) => {
        const d = depthAt(toY(base))
        const tall = heightAt(toY(top), d)
        const B = tall / rows
        const deep = B * 3
        const x0 = u0 <= 0 ? -halfW(d) * 1.1 : wx(u0 * aspect, d)
        const x1 = u1 >= 1 ? halfW(d) * 1.1 : wx(u1 * aspect, d)
        for (let x = x0; x < x1; x += B) {
            put(main, x + B / 2, tall / 2, -d - deep / 2, B, tall, deep, C.dirt, 8 / B, 0, 0, 0, K_BLOCK)
        }
        const c = B / 5
        for (let x = x0; x < x1; x += c * (0.5 + rnd() * 0.7)) {
            blade(main, x, d + rnd() * c * 3, c, 1 + Math.floor(rnd() * 5), true, tall)
            if (fd > 0 && rnd() < 0.05) {
                const fx = x + c / 2
                put(main, fx, tall + c * 2.2, -d - c, c * 1.8, c * 1.5, c * 1.8, hex(FLOWER_COLS[Math.floor(rnd() * FLOWER_COLS.length)]), 0, fx, -d, c * 2.2, K_FLOWER)
            }
        }
    }
    terrace(0.62, 1, 0.494, 0.438, 4)
    terrace(0.48, 1, 0.508, 0.471, 2)
    terrace(0, 0.23, 0.51, 0.476, 2)

    // ── far hills ──
    // Blocky silhouettes on the skyline, highest behind the sun; the haze
    // turns them to the still's orange-brown.
    {
        const d = 170
        const hw = halfW(d) * 1.1
        const B = 2.4
        for (let x = -hw; x < hw; x += B) {
            const u = (x + hw) / (2 * hw)
            const lift = Math.max(0, 1 - u * 1.8)
            let rows = 1 + (Math.sin(x * 0.09 + ph1) + rnd() * 0.8 > 0.6 ? 1 : 0)
            if (rnd() < 0.06 + lift * 0.2) rows += 1
            const tall = rows * B
            put(main, x + B / 2, tall / 2, -d - rnd() * 10, B, tall, B * 3, C.dirt, 8 / B, 0, 0, 0, K_BLOCK)
        }
    }

    // ── clouds ──
    // Each block carries its cloud's centre and a drift rate, so the
    // shader can slide a whole cloud and wrap it round off-screen.
    let cloudWide = 0
    const cloud = (def: CloudDef, ax: number, dy: number, scale: number) => {
        const dc = CLOUD_D
        const cx = ax * aspect
        const rate = 0.85 + rnd() * 0.3
        const col = hex(def.color)
        const rects = def.blocks.map((b) => [
            cx + (b[0] - def.ax) * 0.5 * scale,
            toY(b[1] + dy),
            cx + (b[2] - def.ax) * 0.5 * scale,
            toY(b[3] + dy),
        ])
        const x0 = Math.min(...rects.map((r) => r[0]))
        const x1 = Math.max(...rects.map((r) => r[2]))
        const span = len(x1 - x0, dc)
        const mid = wx((x0 + x1) / 2, dc)
        cloudWide = Math.max(cloudWide, span)
        for (const r of rects) {
            const xa = wx(r[0], dc)
            const xb = wx(r[2], dc)
            const yt = heightAt(r[1], dc)
            const yb = heightAt(r[3], dc)
            const dz = span * (0.6 + rnd() * 0.5)
            put(clouds, (xa + xb) / 2, (yt + yb) / 2, -dc - dz / 2, xb - xa, yt - yb, dz, col, 0, mid, rate, 0, K_CLOUD)
        }
    }
    for (const def of CLOUDS) cloud(def, def.ax, 0, 1)
    for (const w of WIDE_CLOUDS) if (aspect >= w.min) cloud(CLOUDS[w.def], w.ax, w.dy, w.scale)

    const cloudHalf = halfW(CLOUD_D)
    return { main, soft, clouds, near, tile: v * 1.6, cloudHalf, cloudWrap: cloudHalf + cloudWide * 0.6 }
}

// ── shaders ───────────────────────────────────────────────────────────

const NOISE = /* glsl */ `
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vn(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
`

/** Shared tail of every lit fragment: key light from the sun (or moon), the hour's tint, then haze. */
const LIGHT = /* glsl */ `
uniform vec3 uGlow;
uniform vec3 uLight;
uniform float uKeyDir;
uniform vec3 uHazeA;
uniform vec3 uHazeB;
uniform float uHazeK;
uniform vec2 uSunNdc;
uniform float uAspect;
float sunNear(vec2 ndc) { return exp(-length((ndc - uSunNdc) * vec2(uAspect, 1.0)) * 1.3); }
vec3 hazeOf(vec3 col, float depth, float sunP) {
    float fog = 1.0 - exp(-depth * uHazeK);
    return mix(col, mix(uHazeA, uHazeB, sunP), fog);
}
`

const VOXEL_VERT = /* glsl */ `
attribute vec3 aCenter;
attribute vec3 aSize;
attribute vec4 aColor;
attribute vec4 aBend;
uniform float uTime;
uniform float uWind;
uniform float uAspect;
uniform sampler2D uPush;
uniform float uCloudShift;
uniform float uCloudWrap;
varying vec3 vColor;
varying vec3 vN;
varying vec3 vLocal;
varying vec3 vSize;
varying float vTip;
varying float vKind;
varying float vDepth;
varying vec3 vClip;
void main() {
    float kind = aBend.w;
    vec3 p = aCenter + position * aSize;
    if (kind < 1.5) {
        // Grass and flowers shear from the root: each voxel slides by
        // lean x its height, so a blade bends in steps and stays voxel.
        float h = aBend.z;
        vec2 r = aBend.xy;
        float s = sin(uTime * 0.7 - r.x * 0.32 - r.y * 0.04);
        float gust = s > 0.0 ? s * s * s : 0.0;
        float sway = sin(uTime * 2.1 + r.x * 3.7 + r.y * 2.9);
        float lean = uWind * (0.11 * gust + 0.022 * sway);
        // The pointer's lean, read from the spring grid at the voxel's
        // place on screen: the grid does the lag and the wobble.
        vec4 rc = projectionMatrix * viewMatrix * vec4(r.x, h, r.y, 1.0);
        lean += texture2D(uPush, rc.xy / rc.w * 0.5 + 0.5).r;
        p.x += lean * h;
        p.y -= 0.5 * lean * lean * h;
    } else if (kind > 2.5) {
        // Slide the whole cloud by its centre and wrap it round off-screen.
        float cx = aBend.x;
        float nx = mod(cx + uCloudShift * aBend.y + uCloudWrap, 2.0 * uCloudWrap) - uCloudWrap;
        p.x += nx - cx;
    }
    vec4 mv = viewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vColor = aColor.rgb;
    vTip = aColor.a;
    vKind = kind;
    vN = normal;
    vLocal = position;
    vSize = aSize;
    vDepth = -mv.z;
    vClip = gl_Position.xyw;
}
`

const VOXEL_FRAG = /* glsl */ `
uniform vec3 uRim;
uniform float uRimK;
uniform vec3 uCloudLight;
uniform float uCloudWhite;
uniform vec3 uDirt;
uniform vec3 uDirt2;
uniform vec3 uTurf;
uniform vec3 uTurf2;
varying vec3 vColor;
varying vec3 vN;
varying vec3 vLocal;
varying vec3 vSize;
varying float vTip;
varying float vKind;
varying float vDepth;
varying vec3 vClip;
${NOISE}
${LIGHT}
void main() {
    vec3 n = vN;
    vec3 col = vColor;
    float sunP = sunNear(vClip.xy / vClip.z);
    if (vKind > 2.5) {
        // Clouds: lit from below and from the sun's side. Sunset tints
        // them peach and pink; by day they whiten.
        col = mix(col, vec3(1.0), uCloudWhite);
        vec3 top = mix(col, vec3(1.0), 0.45);
        vec3 under = col * mix(vec3(0.88, 0.66, 0.56), vec3(0.86, 0.88, 0.94), uCloudWhite);
        float lit = 0.5 + 0.5 * n.x * uKeyDir;
        if (n.y < -0.5) col = under;
        else if (abs(n.x) > 0.5) col = mix(mix(col, under, 0.5), mix(col, top, 0.4), lit);
        else col = mix(mix(col, under, 0.3), mix(col, top, 0.3), vLocal.y + 0.5);
        gl_FragColor = vec4(mix(col * uCloudLight, uHazeA, 0.08), 1.0);
        return;
    }
    if (vKind > 1.5) {
        // Turf blocks: 8 x 8 texels a block, dirt with a ragged grass lip.
        vec3 lp = (vLocal + 0.5) * vSize * vTip;
        vec2 uv = abs(n.y) > 0.5 ? lp.xz : (abs(n.x) > 0.5 ? lp.zy : lp.xy);
        vec2 tx = floor(uv);
        float hs = h21(tx + n.xz * 31.0);
        float lip = 1.0 + floor(h21(vec2(tx.x, 7.0)) * 2.5);
        bool turf = n.y > 0.5 || (vSize.y * vTip - lp.y) < lip;
        col = turf ? mix(uTurf, uTurf2, hs) : mix(uDirt, uDirt2, hs);
    }
    // Backlit: the faces toward the camera are in their own shade, the
    // tops and the sun side catch the low warm light.
    float side = abs(n.x) > 0.5 ? 0.5 + 0.5 * n.x * uKeyDir : 0.0;
    float face = n.y > 0.5 ? 0.95 : (abs(n.x) > 0.5 ? mix(0.55, 0.88, side) : 0.68);
    col *= face;
    col = mix(col, col * uGlow * 1.3, max(n.y, 0.0) * 0.2 + side * 0.25);
    col *= uLight;
    // Backlight through the grass tips.
    if (vKind < 0.5) col += uRim * uRimK * pow(vTip, 2.0) * (0.04 + 0.3 * sunP + 0.5 * smoothstep(5.0, 25.0, vDepth));
    gl_FragColor = vec4(hazeOf(col, vDepth, sunP), 1.0);
}
`

const GROUND_VERT = /* glsl */ `
varying vec3 vW;
varying float vDepth;
varying vec3 vClip;
void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    vec4 mv = viewMatrix * wp;
    gl_Position = projectionMatrix * mv;
    vDepth = -mv.z;
    vClip = gl_Position.xyw;
}
`

const GROUND_FRAG = /* glsl */ `
uniform float uTile;
uniform vec3 uGDark;
uniform vec3 uGMid;
uniform vec3 uGFar;
uniform vec3 uDapple;
varying vec3 vW;
varying float vDepth;
varying vec3 vClip;
${NOISE}
${LIGHT}
void main() {
    float d = -vW.z;
    vec2 cell = floor(vW.xz / uTile);
    float hs = h21(cell);
    float chk = mod(cell.x + cell.y, 2.0);
    // Turf tiles, a soft checker with pools of low sun across them.
    vec3 tile = mix(uGDark, uGMid, chk * 0.45 + hs * 0.55);
    float dap = smoothstep(0.5, 0.68, vn(cell * 0.16 + 11.0));
    tile = mix(tile, uDapple * (0.75 + 0.45 * hs), dap * 0.6);
    vec3 far = mix(uGMid, uGFar, smoothstep(3.0, 30.0, d));
    vec3 col = mix(far, tile, clamp(1.4 - d / 14.0, 0.0, 1.0));
    col = mix(col, col * uGlow * 1.3, 0.25) * uLight;
    float sunP = sunNear(vClip.xy / vClip.z);
    gl_FragColor = vec4(hazeOf(col, vDepth, sunP), 1.0);
}
`

const SCREEN_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }
`

const SKY_FRAG = /* glsl */ `
uniform float uAspect;
uniform float uHy;
uniform vec3 uTop;
uniform vec3 uHor;
uniform vec3 uGlow;
uniform vec3 uSun;
uniform vec2 uSunPos;
uniform float uSunSize;
uniform float uSunK;
uniform vec2 uMoonPos;
uniform float uMoonK;
uniform float uGold;
uniform float uNight;
uniform float uTime;
uniform float uClock;
varying vec2 vUv;
${NOISE}
void main() {
    vec2 p = vec2(vUv.x * uAspect, 1.0 - vUv.y);
    float t = clamp(p.y / uHy, 0.0, 1.0);
    vec3 peach = mix(mix(uTop, uHor, 0.5), uGlow, 0.12 * uGold);
    vec3 c = mix(uTop, peach, smoothstep(0.0, 0.42, t));
    c = mix(c, uHor, smoothstep(0.5, 0.95, t));
    // cooler, mauve toward the top right, away from the setting sun
    c = mix(c, c * vec3(0.95, 0.97, 1.06), (1.0 - t) * vUv.x * 0.7 * uGold);
    vec2 q = p - uSunPos;
    float g1 = exp(-dot(q * vec2(4.0, 6.0), q * vec2(4.0, 6.0)));
    float g2 = exp(-length(q * vec2(1.6, 3.0)) * 3.2);
    // the coral band low on the right, away from the sun
    float pinkB = smoothstep(0.62, 0.8, t) * (1.0 - smoothstep(0.9, 1.0, t)) * smoothstep(0.25, 0.9, vUv.x) * uGold;
    c = mix(c, mix(uHor, vec3(0.96, 0.56, 0.58), 0.45), pinkB * 0.6);
    c = mix(c, uGlow, clamp((g1 * 0.6 + g2 * 0.3) * uSunK, 0.0, 1.0));
    c = mix(c, mix(uGlow, uSun, 0.6), exp(-length(q * vec2(1.0, 1.7)) * 10.0) * 0.85 * uSunK);
    // stars: square, one to a cell, twinkling, thinning toward the skyline
    vec2 sg = p * 110.0;
    vec2 cell = floor(sg);
    float hs = h21(cell);
    vec2 sd = abs(fract(sg) - (vec2(h21(cell + 3.1), h21(cell + 7.7)) * 0.6 + 0.2));
    float star = step(0.982, hs) * step(max(sd.x, sd.y), 0.07 + 0.09 * h21(cell + 1.7));
    star *= 0.55 + 0.45 * sin(uClock * (1.5 + hs * 3.0) + hs * 40.0);
    c += vec3(0.92, 0.95, 1.0) * star * uNight * (1.0 - smoothstep(0.55, 0.95, t));
    // thin wisps, stretched along the horizon
    vec2 sp = vec2(p.x * 1.3 + uTime * 0.004, p.y * 15.0);
    float n = fbm(sp + fbm(sp * 0.5) * 1.6);
    float band = smoothstep(0.12, 0.3, t) * (1.0 - smoothstep(0.86, 1.0, t));
    vec3 wisp = mix(mix(uHor, vec3(1.0, 0.88, 0.8), 0.45), uGlow, g2);
    c = mix(c, wisp, smoothstep(0.55, 0.8, n) * band * 0.4 * (1.0 - 0.7 * uNight));
    // the square moon, with a few darker texels for its seas
    vec2 mq = p - uMoonPos;
    vec2 msq = abs(mq) - vec2(uSunSize * 0.42);
    float mbox = max(msq.x, msq.y);
    float moonM = (1.0 - smoothstep(-0.0015, 0.0015, mbox)) * uMoonK;
    float sea = step(0.7, h21(floor((mq / (uSunSize * 0.84) + 0.5) * 6.0) + 5.0)) * 0.16;
    c += vec3(0.55, 0.65, 1.0) * exp(-max(mbox, 0.0) / 0.03) * 0.25 * uMoonK;
    c = mix(c, vec3(0.9, 0.93, 1.0) - sea, moonM);
    // the square sun
    vec2 sq = abs(q) - vec2(uSunSize * 0.5);
    float box = max(sq.x, sq.y);
    float sunM = 1.0 - smoothstep(-0.0015, 0.0015, box);
    c += uGlow * exp(-max(box, 0.0) / 0.014) * 0.35 * uSunK;
    c = mix(c, uSun, sunM);
    c = mix(c, mix(uHor, uGlow, 0.5), step(uHy, p.y));
    c += (h21(gl_FragCoord.xy) - 0.5) / 255.0;
    gl_FragColor = vec4(c, 1.0);
}
`

const BLUR_FRAG = /* glsl */ `
uniform sampler2D tMap;
uniform vec2 uStep;
varying vec2 vUv;
void main() {
    vec4 s = vec4(0.0);
    float w = 0.0;
    for (int i = -6; i <= 6; i++) {
        float fi = float(i);
        float k = exp(-fi * fi / 18.0);
        s += texture2D(tMap, vUv + uStep * fi) * k;
        w += k;
    }
    gl_FragColor = s / w;
}
`

const COPY_FRAG = /* glsl */ `
uniform sampler2D tMap;
varying vec2 vUv;
void main() { gl_FragColor = texture2D(tMap, vUv); }
`

/** Sun bloom over everything, and a warm vignette, in one premultiplied pass. */
const POST_FRAG = /* glsl */ `
uniform float uAspect;
uniform float uHy;
uniform vec2 uSunPos;
uniform vec2 uMoonPos;
uniform float uMoonK;
uniform vec3 uGlow;
uniform float uGlowK;
varying vec2 vUv;
void main() {
    vec2 p = vec2(vUv.x * uAspect, 1.0 - vUv.y);
    vec2 q = p - uSunPos;
    float r = length(q * vec2(0.8, 1.0));
    // core, halo, and a flare along the skyline while the sun is low
    float g = 0.28 * exp(-r * r / 0.004) + 0.12 * exp(-r / 0.12)
            + 0.18 * exp(-abs(p.y - uHy) / 0.025) * exp(-abs(q.x) / 0.35) * exp(-max(abs(q.y) - 0.08, 0.0) / 0.1);
    vec2 mq = p - uMoonPos;
    float mr = length(mq);
    float gm = (0.16 * exp(-mr * mr / 0.003) + 0.05 * exp(-mr / 0.1)) * uMoonK;
    vec3 glow = uGlow * g * uGlowK + vec3(0.55, 0.65, 1.0) * gm;
    vec2 v = vUv - 0.5;
    float vig = smoothstep(0.35, 0.95, length(v * vec2(1.0, 1.15)) * 1.2) * 0.14;
    gl_FragColor = vec4(glow * (1.0 - vig) + vec3(0.12, 0.03, 0.0) * vig, vig);
}
`

// ── geometry ──────────────────────────────────────────────────────────

/** BoxGeometry face groups: +x, -x, +y, -y, +z, -z. The camera only ever sees some of them. */
const FACES_GROUNDED = [0, 1, 2, 4]
const FACES_ALOFT = [0, 1, 3, 4]

function instanced(base: THREE.BoxGeometry, faces: number[], data: number[]) {
    const g = new THREE.InstancedBufferGeometry()
    g.setAttribute("position", base.getAttribute("position").clone())
    g.setAttribute("normal", base.getAttribute("normal").clone())
    const idx = base.getIndex()!.array
    const sub: number[] = []
    for (const face of faces) for (let i = 0; i < 6; i++) sub.push(idx[face * 6 + i])
    g.setIndex(sub)
    const ib = new THREE.InstancedInterleavedBuffer(new Float32Array(data), STRIDE)
    g.setAttribute("aCenter", new THREE.InterleavedBufferAttribute(ib, 3, 0))
    g.setAttribute("aSize", new THREE.InterleavedBufferAttribute(ib, 3, 3))
    g.setAttribute("aColor", new THREE.InterleavedBufferAttribute(ib, 4, 6))
    g.setAttribute("aBend", new THREE.InterleavedBufferAttribute(ib, 4, 10))
    g.instanceCount = data.length / STRIDE
    return g
}

const vec3 = (c: RGB) => new THREE.Vector3(c[0], c[1], c[2])
const setV = (u: { value: THREE.Vector3 }, c: RGB) => u.value.set(c[0], c[1], c[2])
const smooth = (a: number, b: number, x: number) => {
    const t = clamp((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)
}
const blend3 = (a: RGB, b: RGB, c: RGB, wa: number, wb: number, wc: number): RGB => [
    a[0] * wa + b[0] * wb + c[0] * wc,
    a[1] * wa + b[1] * wb + c[1] * wc,
    a[2] * wa + b[2] * wb + c[2] * wc,
]

/**
 * Where the day stands at an hour: the sun's angle round its arc and how
 * much noon, golden hour and night is in the light. 18 h is the still --
 * the sun exactly on its sunset mark, the light all golden.
 */
function dayAt(hour: number) {
    const th = ((hour - 6) / 24) * Math.PI * 2
    const e = Math.sin(th)
    const day = smooth(0.12, 0.5, e)
    const gold = (1 - day) * smooth(-0.2, 0, e)
    return { th, e, day, gold, night: 1 - day - gold }
}

// The pointer's effect on the grass is a coarse grid over the frame, each
// cell a damped spring pulled toward the lean the pointer asks of it. The
// grass reads its lean from the grid, so it lags the pointer, overshoots,
// and wobbles back upright after it has gone.
/** Grid rows across the frame height; columns follow the aspect. */
const PUSH_ROWS = 28
/** A patch of grass springs at ~1.4 Hz and is lightly damped. */
const PUSH_HZ = 1.4
const PUSH_ZETA = 0.22

// ── component ─────────────────────────────────────────────────────────

export default function MeadowBlush(props: MeadowBlushProps) {
    const {
        flowers = DEFAULTS.flowers,
        grass = DEFAULTS.grass,
        horizon = DEFAULTS.horizon,
        seed = DEFAULTS.seed,
        voxelSize = DEFAULTS.voxelSize,
        depthBlur = DEFAULTS.depthBlur,
        haze = DEFAULTS.haze,
        hover = DEFAULTS.hover,
        wind = DEFAULTS.wind,
        speed = DEFAULTS.speed,
        cloudDirection = DEFAULTS.cloudDirection,
        cloudSpeed = DEFAULTS.cloudSpeed,
        style,
    } = props
    const sky: Sky = { ...DEFAULT_SKY, ...props.sky }
    const day: DayCycle = { ...DEFAULT_DAY, ...props.day }
    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const live = { flowers, grass, horizon, seed, voxelSize, depthBlur, haze, hover, wind, speed, cloudDirection, cloudSpeed, sky, day }
    const propsRef = useRef(live)
    propsRef.current = live

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return
        let renderer: THREE.WebGLRenderer
        try {
            renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" })
        } catch {
            return // no WebGL: the host's sky-coloured background stands in
        }
        renderer.autoClear = false

        const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 8000)
        camera.position.set(0, CAM_H, 0)
        const screenCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

        const shared = {
            uTime: { value: 0 },
            uWind: { value: 1 },
            uAspect: { value: 1 },
            uGlow: { value: new THREE.Vector3() },
            uLight: { value: new THREE.Vector3(1, 1, 1) },
            uKeyDir: { value: -1 },
            uHazeA: { value: new THREE.Vector3() },
            uHazeB: { value: new THREE.Vector3() },
            uHazeK: { value: 0.0085 },
            uSunNdc: { value: new THREE.Vector2() },
        }
        const voxelMat = new THREE.ShaderMaterial({
            vertexShader: VOXEL_VERT,
            fragmentShader: VOXEL_FRAG,
            uniforms: {
                ...shared,
                uPush: { value: null as THREE.Texture | null },
                uCloudShift: { value: 0 },
                uCloudWrap: { value: 100 },
                uRim: { value: vec3(C.rim) },
                uRimK: { value: 1 },
                uCloudLight: { value: new THREE.Vector3(1, 1, 1) },
                uCloudWhite: { value: 0 },
                uDirt: { value: vec3(C.dirt) },
                uDirt2: { value: vec3(C.dirtDark) },
                uTurf: { value: vec3(C.turf) },
                uTurf2: { value: vec3(C.turf2) },
            },
        })
        const groundMat = new THREE.ShaderMaterial({
            vertexShader: GROUND_VERT,
            fragmentShader: GROUND_FRAG,
            uniforms: {
                ...shared,
                uTile: { value: VOXEL * 1.6 },
                uGDark: { value: vec3(C.groundDark) },
                uGMid: { value: vec3(C.groundMid) },
                uGFar: { value: vec3(C.groundFar) },
                uDapple: { value: vec3(C.dapple) },
            },
        })
        const skyMat = new THREE.ShaderMaterial({
            vertexShader: SCREEN_VERT,
            fragmentShader: SKY_FRAG,
            depthTest: false,
            depthWrite: false,
            uniforms: {
                uAspect: shared.uAspect,
                uGlow: shared.uGlow,
                uTime: shared.uTime,
                uClock: { value: 0 },
                uHy: { value: 0.47 },
                uTop: { value: new THREE.Vector3() },
                uHor: { value: new THREE.Vector3() },
                uSun: { value: vec3(C.sun) },
                uSunPos: { value: new THREE.Vector2() },
                uSunSize: { value: 0.065 },
                uSunK: { value: 1 },
                uMoonPos: { value: new THREE.Vector2() },
                uMoonK: { value: 0 },
                uGold: { value: 1 },
                uNight: { value: 0 },
            },
        })
        const blurMat = new THREE.ShaderMaterial({
            vertexShader: SCREEN_VERT,
            fragmentShader: BLUR_FRAG,
            depthTest: false,
            depthWrite: false,
            uniforms: { tMap: { value: null }, uStep: { value: new THREE.Vector2() } },
        })
        const copyMat = new THREE.ShaderMaterial({
            vertexShader: SCREEN_VERT,
            fragmentShader: COPY_FRAG,
            depthTest: false,
            depthWrite: false,
            transparent: true,
            premultipliedAlpha: true,
            uniforms: { tMap: { value: null } },
        })
        const postMat = new THREE.ShaderMaterial({
            vertexShader: SCREEN_VERT,
            fragmentShader: POST_FRAG,
            depthTest: false,
            depthWrite: false,
            transparent: true,
            premultipliedAlpha: true,
            uniforms: {
                uAspect: shared.uAspect,
                uGlow: shared.uGlow,
                uHy: skyMat.uniforms.uHy,
                uSunPos: skyMat.uniforms.uSunPos,
                uMoonPos: skyMat.uniforms.uMoonPos,
                uMoonK: skyMat.uniforms.uMoonK,
                uGlowK: { value: 1 },
            },
        })

        const tri = new THREE.BufferGeometry()
        tri.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3))
        const screen = new THREE.Mesh(tri, copyMat)
        screen.frustumCulled = false
        const screenScene = new THREE.Scene()
        screenScene.add(screen)

        const skyMesh = new THREE.Mesh(tri, skyMat)
        skyMesh.frustumCulled = false
        skyMesh.renderOrder = -1
        const groundGeo = new THREE.PlaneGeometry(8000, 8000).rotateX(-Math.PI / 2).translate(0, 0, -3950)
        const ground = new THREE.Mesh(groundGeo, groundMat)
        ground.frustumCulled = false

        const mainScene = new THREE.Scene()
        mainScene.add(skyMesh, ground)
        const softScene = new THREE.Scene()
        const nearScene = new THREE.Scene()
        const box = new THREE.BoxGeometry(1, 1, 1)
        let meshes: THREE.Mesh[] = []

        // Two blurred layers: the soft band renders at full size (MSAA, so
        // it is crisp when Depth Blur is 0), the foreground at half.
        const rtOpts = { depthBuffer: true, type: THREE.UnsignedByteType }
        const softRT = new THREE.WebGLRenderTarget(1, 1, { ...rtOpts, samples: 4 })
        const softTmp = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false })
        const nearRT = new THREE.WebGLRenderTarget(1, 1, rtOpts)
        const nearTmp = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false })

        // ── pointer ──
        // x/y: where the pointer is (NDC); sx/sy: where the grass thinks it
        // is, a beat behind; vx: how fast that is moving across.
        const pointer = { x: 0, y: 0, sx: 0, sy: 0, vx: 0, inside: false, down: false, over: 0, press: 0 }
        let gw = 0
        let lean = new Float32Array(0)
        let vel = new Float32Array(0)
        let half = new Uint16Array(0)
        let pushTex: THREE.DataTexture | null = null
        let calm = false
        const sizeGrid = (aspect: number) => {
            const w = Math.round(clamp(PUSH_ROWS * aspect, 8, 96))
            if (w === gw) return
            gw = w
            lean = new Float32Array(gw * PUSH_ROWS)
            vel = new Float32Array(gw * PUSH_ROWS)
            half = new Uint16Array(gw * PUSH_ROWS)
            pushTex?.dispose()
            pushTex = new THREE.DataTexture(half, gw, PUSH_ROWS, THREE.RedFormat, THREE.HalfFloatType)
            pushTex.minFilter = THREE.LinearFilter
            pushTex.magFilter = THREE.LinearFilter
            pushTex.needsUpdate = true
            voxelMat.uniforms.uPush.value = pushTex
            calm = false
        }
        const stepPush = (dt: number, hk: number, aspect: number) => {
            const kf = 1 - Math.exp(-dt / 0.06)
            const nx = pointer.sx + (pointer.x - pointer.sx) * kf
            const ny = pointer.sy + (pointer.y - pointer.sy) * kf
            const vx = dt > 0 ? (nx - pointer.sx) / dt : 0
            pointer.vx += (vx - pointer.vx) * (1 - Math.exp(-dt / 0.08))
            pointer.sx = nx
            pointer.sy = ny
            const amp = pointer.over * hk
            if (!pushTex || (calm && amp < 1e-3)) return
            // Pressing parts a wider, deeper swathe.
            const R = 0.22 + 0.12 * pointer.press
            const inv = 1 / (R * R)
            const part = 0.2 * (1 + 0.8 * pointer.press)
            const sweep = clamp(pointer.vx * aspect * 0.035, -0.22, 0.22)
            const w = PUSH_HZ * Math.PI * 2
            const steps = Math.max(1, Math.ceil(dt * 120))
            const h = dt / steps
            let energy = 0
            for (let j = 0; j < PUSH_ROWS; j++) {
                const dy = ((j + 0.5) / PUSH_ROWS) * 2 - 1 - ny
                for (let i = 0; i < gw; i++) {
                    const k = j * gw + i
                    let target = 0
                    if (amp > 1e-3) {
                        const dx = (((i + 0.5) / gw) * 2 - 1 - nx) * aspect
                        const f = Math.exp(-(dx * dx + dy * dy) * inv) * amp
                        // Part the grass away from under the pointer, and
                        // drag it along the way the pointer is moving.
                        target = f * ((part * dx) / Math.sqrt(dx * dx + 0.004) + sweep)
                    }
                    let x = lean[k]
                    let v = vel[k]
                    for (let s = 0; s < steps; s++) {
                        v += (w * w * (target - x) - 2 * PUSH_ZETA * w * v) * h
                        x += v * h
                    }
                    lean[k] = x
                    vel[k] = v
                    half[k] = THREE.DataUtils.toHalfFloat(x)
                    energy += Math.abs(x) + Math.abs(v)
                }
            }
            pushTex.needsUpdate = true
            calm = energy < 1e-4 * gw * PUSH_ROWS
        }

        let W = 0
        let H = 0
        let dpr = 1
        const resize = () => {
            W = host.clientWidth
            H = host.clientHeight
            dpr = Math.min(2, window.devicePixelRatio || 1)
            if (W < 2 || H < 2) return
            renderer.setPixelRatio(dpr)
            renderer.setSize(W, H, false)
            const fw = Math.round(W * dpr)
            const fh = Math.round(H * dpr)
            softRT.setSize(fw, fh)
            softTmp.setSize(fw, fh)
            nearRT.setSize(Math.ceil(fw / 2), Math.ceil(fh / 2))
            nearTmp.setSize(Math.ceil(fw / 2), Math.ceil(fh / 2))
            sizeGrid(W / H)
        }
        resize()
        const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null
        ro?.observe(host)

        let visible = true
        const io =
            typeof IntersectionObserver !== "undefined"
                ? new IntersectionObserver((en) => (visible = en.some((e) => e.isIntersecting)), { rootMargin: "128px" })
                : null
        io?.observe(host)

        const onMove = (e: PointerEvent) => {
            const r = host.getBoundingClientRect()
            pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1
            pointer.y = 1 - ((e.clientY - r.top) / r.height) * 2
            // Arriving from outside is not a sweep: start the lagged point here.
            if (!pointer.inside) {
                pointer.sx = pointer.x
                pointer.sy = pointer.y
                pointer.vx = 0
            }
            pointer.inside = true
        }
        const onDown = (e: PointerEvent) => {
            onMove(e)
            pointer.down = true
        }
        const onUp = () => (pointer.down = false)
        const onLeave = () => (pointer.inside = false)
        host.addEventListener("pointermove", onMove)
        host.addEventListener("pointerdown", onDown)
        host.addEventListener("pointerleave", onLeave)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

        let builtKey = ""
        let builtAt = -1e9
        let built = { aspect: 1, h: REF_H, cloudHalf: 1, cloudWrap: 100 }
        const rebuild = (key: string, now: number) => {
            const p = propsRef.current
            const b = buildMeadow(W, H, p)
            for (const m of meshes) {
                m.removeFromParent()
                m.geometry.dispose()
            }
            meshes = [
                new THREE.Mesh(instanced(box, FACES_GROUNDED, b.main), voxelMat),
                new THREE.Mesh(instanced(box, FACES_GROUNDED, b.soft), voxelMat),
                new THREE.Mesh(instanced(box, FACES_ALOFT, b.clouds), voxelMat),
                new THREE.Mesh(instanced(box, FACES_GROUNDED, b.near), voxelMat),
            ]
            for (const m of meshes) m.frustumCulled = false
            mainScene.add(meshes[0], meshes[2])
            softScene.add(meshes[1])
            nearScene.add(meshes[3])
            groundMat.uniforms.uTile.value = b.tile
            built = { aspect: W / H, h: clamp(p.horizon, 30, 70) / 100, cloudHalf: b.cloudHalf, cloudWrap: b.cloudWrap }
            builtKey = key
            builtAt = now
        }

        const blur = (src: THREE.WebGLRenderTarget, tmp: THREE.WebGLRenderTarget, px: number) => {
            const k = px / 6
            screen.material = blurMat
            blurMat.uniforms.tMap.value = src.texture
            blurMat.uniforms.uStep.value.set(k / src.width, 0)
            renderer.setRenderTarget(tmp)
            renderer.render(screenScene, screenCam)
            blurMat.uniforms.tMap.value = tmp.texture
            blurMat.uniforms.uStep.value.set(0, k / src.height)
            renderer.setRenderTarget(src)
            renderer.render(screenScene, screenCam)
        }
        const layer = (scene: THREE.Scene, rt: THREE.WebGLRenderTarget, tmp: THREE.WebGLRenderTarget, px: number) => {
            renderer.setRenderTarget(rt)
            renderer.setClearColor(0x000000, 0)
            renderer.clear(true, true, false)
            renderer.render(scene, camera)
            if (px > 0.3) blur(rt, tmp, px)
            renderer.setRenderTarget(null)
            screen.material = copyMat
            copyMat.uniforms.tMap.value = rt.texture
            renderer.render(screenScene, screenCam)
        }

        let time = 0
        let clock = 0
        let cloudShift = 0
        let hour = DEFAULT_DAY.time
        let lastTime = Number.NaN
        let keyDir = -1
        let last = -1
        let raf = 0
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min(0.05, (now - last) / 1000)
            last = now
            if (!visible || W < 2 || H < 2) return
            const p = propsRef.current
            const key = [W, H, p.flowers, p.grass, p.horizon, p.seed, p.voxelSize].join("|")
            // Rebuilding is ~10 ms of JS; while a frame is being dragged,
            // do it at most a few times a second.
            if (key !== builtKey && (builtKey === "" || now - builtAt > 160)) rebuild(key, now)
            const aspect = W / H
            const h = built.h

            // ── pointer: ease in and out, then step the springs ──
            const hk = reduce ? 0 : clamp(p.hover, 0, 10) / 5
            const ease = 1 - Math.exp(-dt / 0.35)
            pointer.over += ((pointer.inside ? 1 : 0) - pointer.over) * ease
            pointer.press += ((pointer.down && pointer.inside ? 1 : 0) - pointer.press) * (1 - Math.exp(-dt / 0.15))
            stepPush(dt, hk, aspect)
            camera.fov = vfovFor(built.aspect)
            camera.aspect = aspect
            // Shift the lens rather than tilt the camera, so voxels stay upright.
            camera.setViewOffset(W, H, 0, (0.5 - h) * H, W, H)
            camera.updateProjectionMatrix()

            // ── clocks ──
            if (!reduce) {
                time += (dt * clamp(p.speed, 0, 10)) / 5
                clock += dt
                const dir = p.cloudDirection === "left" ? -1 : 1
                cloudShift += dir * clamp(p.cloudSpeed, 0, 10) * 0.006 * 2 * built.cloudHalf * dt
            }
            const dp = p.day
            if (dp.time !== lastTime) {
                // A new Time on the panel is where the day (re)starts.
                hour = clamp(dp.time, 0, 24)
                lastTime = dp.time
            }
            if (!dp.cycle) hour = clamp(dp.time, 0, 24)
            else if (!reduce) hour = (hour + (dt * 24) / clamp(dp.length, 5, 3600)) % 24
            const D = dayAt(hour)

            // ── sun and moon ──
            // One arc for both, rising on the right and setting on the
            // left; 18 h puts the sun on the still's sunset mark.
            const baseY = h - (0.041 * h) / REF_H - 0.0325
            const arc = baseY - 0.13
            const reach = aspect / 2 - 0.03
            const sun = [aspect / 2 + Math.cos(D.th) * reach, baseY - Math.sin(D.th) * arc]
            const moon = [aspect / 2 - Math.cos(D.th) * reach, baseY + Math.sin(D.th) * arc]
            const sunUp = smooth(-0.12, 0.02, D.e)
            // The moon only shows once the sun is well down, so the still has none.
            const moonUp = smooth(0.06, 0.22, -D.e)
            // Light comes from the sun until well after it has set, then from
            // the moon; the switch happens while both are too dim to show it.
            const src = D.e > -0.3 ? sun : moon
            keyDir += (clamp((src[0] - aspect / 2) / (aspect / 2), -1, 1) - keyDir) * (1 - Math.exp(-dt / 0.8))
            if (dt === 0) keyDir = clamp((src[0] - aspect / 2) / (aspect / 2), -1, 1)

            // ── colours for the hour ──
            const sk = p.sky
            const userTop = parseColor(sk.top, hex(DEFAULT_SKY.top))
            const userHor = parseColor(sk.horizon, hex(DEFAULT_SKY.horizon))
            const userGlow = parseColor(sk.glow, hex(DEFAULT_SKY.glow))
            const w3 = <T extends RGB>(a: T, b: T, c: T) => blend3(a, b, c, D.day, D.gold, D.night)
            const top = w3(DAY_SKY.top, userTop, NIGHT_SKY.top)
            const hor = w3(DAY_SKY.horizon, userHor, NIGHT_SKY.horizon)
            const glow = w3(DAY_SKY.glow, userGlow, NIGHT_SKY.glow)

            shared.uTime.value = time
            shared.uWind.value = clamp(p.wind, 0, 10) / 5
            shared.uAspect.value = aspect
            setV(shared.uGlow, glow)
            setV(shared.uLight, w3(LIGHT_DAY, [1, 1, 1], LIGHT_NIGHT))
            shared.uKeyDir.value = keyDir
            setV(shared.uHazeA, w3(mix(DAY_SKY.horizon, [0.86, 0.9, 0.95], 0.3), mix(userHor, C.hazeGold, 0.7), shade(NIGHT_SKY.horizon, 0.9)))
            setV(shared.uHazeB, w3(mix(DAY_SKY.glow, DAY_SKY.horizon, 0.5), mix(userGlow, C.hazeSun, 0.55), shade(NIGHT_SKY.glow, 0.35)))
            shared.uHazeK.value = 0.0017 * clamp(p.haze, 0, 10)
            shared.uSunNdc.value.set((src[0] / aspect) * 2 - 1, 1 - 2 * src[1])

            voxelMat.uniforms.uCloudShift.value = cloudShift
            voxelMat.uniforms.uCloudWrap.value = built.cloudWrap
            voxelMat.uniforms.uRimK.value = sunUp * (1 - 0.5 * D.day) + 0.15 * moonUp * smooth(-0.3, -0.5, D.e)
            setV(voxelMat.uniforms.uCloudLight, w3(CLOUD_DAY, [1, 1, 1], CLOUD_NIGHT))
            voxelMat.uniforms.uCloudWhite.value = D.day * 0.8 + D.night * 0.6

            skyMat.uniforms.uHy.value = h
            setV(skyMat.uniforms.uTop, top)
            setV(skyMat.uniforms.uHor, hor)
            skyMat.uniforms.uSunPos.value.set(sun[0], sun[1])
            skyMat.uniforms.uMoonPos.value.set(moon[0], moon[1])
            skyMat.uniforms.uSunK.value = sunUp * (1 - 0.4 * D.day)
            skyMat.uniforms.uMoonK.value = moonUp
            skyMat.uniforms.uGold.value = D.gold
            skyMat.uniforms.uNight.value = D.night
            skyMat.uniforms.uClock.value = clock
            // The sun breathes: a slow swell in its bloom.
            postMat.uniforms.uGlowK.value = (0.9 + 0.1 * Math.cos(time * 0.8)) * sunUp * (1 - 0.6 * D.day)

            const blurK = (clamp(p.depthBlur, 0, 10) / 5) * H * dpr
            renderer.setRenderTarget(null)
            renderer.setClearColor(0x000000, 1)
            renderer.clear()
            renderer.render(mainScene, camera)
            layer(softScene, softRT, softTmp, blurK * 0.005)
            layer(nearScene, nearRT, nearTmp, blurK * 0.022 * 0.5)
            screen.material = postMat
            renderer.render(screenScene, screenCam)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro?.disconnect()
            io?.disconnect()
            host.removeEventListener("pointermove", onMove)
            host.removeEventListener("pointerdown", onDown)
            host.removeEventListener("pointerleave", onLeave)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
            for (const m of meshes) m.geometry.dispose()
            for (const g of [box, tri, groundGeo]) g.dispose()
            for (const m of [voxelMat, groundMat, skyMat, blurMat, copyMat, postMat]) m.dispose()
            for (const t of [softRT, softTmp, nearRT, nearTmp]) t.dispose()
            pushTex?.dispose()
            renderer.dispose()
        }
    }, [])

    return (
        <div
            ref={hostRef}
            style={{
                width: "100%",
                height: "100%",
                ...style,
                position: "relative",
                overflow: "hidden",
                background: `linear-gradient(${sky.top}, ${sky.horizon} ${horizon}%, #2E4410 ${horizon}%)`,
            }}
        >
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
        </div>
    )
}

const slider = (title: string, defaultValue: number) => ({
    type: ControlType.Number,
    title,
    defaultValue,
    min: 0,
    max: 10,
    step: 0.1,
})
