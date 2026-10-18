"use client"

import { animate, motion, useMotionValue, useTransform } from "motion/react"
import type { Transition, ValueAnimationTransition } from "motion/react"
import { useEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"
import * as THREE from "three"

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

/* ------------------------------------------------------------------ *
 *  MarigoldBrooch
 *
 *  A gold enamel pin floating in the dark: a sunflower of sixteen
 *  yellow petals round a brown seed head on a red-orange field, ringed
 *  by a black band of raised gold lettering with four-point stars
 *  between the phrases and a gold capsule bar closing the circle.
 *
 *  Built after a still of the "Flower Boy" album pin. Its layout is
 *  measured off that image (radii as a share of the pin's radius):
 *  field 0.66, gold border to 0.705, lettered band to 0.945, rim to the
 *  edge; petals from 0.27 to 0.555 with a brown slit up each base; the
 *  bar centred at -28 deg and 47 deg long. Its lettering is the default
 *  caption, and is yours to change.
 *
 *  HOW IT IS MADE
 *    The face is drawn once on a 2D canvas as a cloisonne drawing -
 *    gold walls, enamel cells - and baked into three maps: colour, a
 *    metal/roughness/clearcoat mask, and a normal map from a height
 *    field where the gold stands proud of the enamel. The walls are
 *    rounded by blurring that height, and the enamel creeps up the
 *    walls (a soft-enamel meniscus) from a wider blur, so every edge
 *    catches a highlight. The rim is a real lathe with a rounded edge,
 *    and the back carries a post and a rubber clutch, so a flick shows
 *    a pin rather than a coin.
 *
 *    Lit like the reference: a dark warm studio, so the flat gold tops
 *    read as deep bronze and only rounded edges flare, which the bloom
 *    spreads into the glow round the rings.
 *
 *  Interaction
 *    Hover   the pin leans toward the pointer and a warm light follows
 *            it across the metal.
 *    Drag    sideways spins it; let go and it coasts a turn or two under
 *            friction, then settles face up. Vertical drags still scroll
 *            the page on touch.
 *
 *  Logo
 *    Upload one (SVG, PNG, JPG, WebP, GIF, AVIF) and it replaces the
 *    flower, printed on the field under the enamel glaze.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 * ------------------------------------------------------------------ */

/* ----------------------------------------------------------- defaults */

export interface MarigoldBroochCaption {
    show: boolean
    lines: string[]
}

export interface MarigoldBroochColors {
    metal: string
    band: string
    field: string
    petals: string
    seeds: string
}

export interface MarigoldBroochAdvanced {
    capHeight: number
    letterGap: number
    barAngle: number
    barArc: number
    fieldRadius: number
    border: number
    rim: number
    seedRadius: number
    petalLength: number
    wall: number
    thickness: number
    fov: number
    relief: number
    goldRoughness: number
    enamelGloss: number
    exposure: number
    bloomThreshold: number
    vignette: number
}

export interface MarigoldBroochLogo {
    /** URL of an uploaded SVG, PNG, JPG, WebP, GIF or AVIF; empty shows the flower. */
    image: string
    /** "contain" sits it whole in the field; "cover" fills the field and crops. */
    fit: "contain" | "cover"
    /** %: logo size as a share of the field's diameter (contain only). */
    size: number
    /** -250 (bottom edge) to 250 (top edge): which band of the crop shows (cover only). */
    offsetY: number
}

export interface MarigoldBroochProps {
    /** A logo for the middle of the pin, in place of the flower. */
    logo?: Partial<MarigoldBroochLogo>
    /** Fill behind the pin. */
    background?: string
    /** Phrases set round the band, separated by stars; the bar fills what is left. */
    caption?: Partial<MarigoldBroochCaption>
    /** Typeface of the lettering; its size is fitted to the band. */
    font?: CSSProperties
    /** Metal of the raised letters, stars and bar. */
    textColor?: string
    /** Number of petals round the seed head. */
    petals?: number
    /** %: pin diameter as a share of the frame's short side. */
    size?: number
    /** Metal and enamel colours. */
    colors?: Partial<MarigoldBroochColors>
    /** 0–10: bloom off the bright edges. */
    glow?: number
    /** s: wait before the pin spins in. */
    delay?: number
    /** 0–10: how far the pin leans toward the pointer. */
    tilt?: number
    /** Drag sideways to spin the pin. */
    drag?: boolean
    /** 0–10: idle drift and float. */
    sway?: number
    /** Drives the entrance: the pin spins in from its back to face front. */
    transition?: Transition
    /** Tuning constants behind the look; a partial object is fine. */
    advanced?: Partial<MarigoldBroochAdvanced>
    style?: CSSProperties
}

const DEFAULT_LOGO: MarigoldBroochLogo = { image: "", fit: "contain", size: 64, offsetY: 0 }

const DEFAULT_CAPTION: MarigoldBroochCaption = {
    show: true,
    lines: ["FLOWER BOY", "FLOWER BOY", "FLOWER BOY"],
}

/** Sampled off the reference, then corrected for the warm studio light. */
const DEFAULT_COLORS: MarigoldBroochColors = {
    metal: "#FCBB5E",
    band: "#0E0906",
    field: "#F2400E",
    petals: "#FCC705",
    seeds: "#3C1503",
}

const DEFAULTS = {
    background: "#000000",
    textColor: "#FFFFFF",
    petals: 15,
    size: 66,
    glow: 8,
    delay: 0.2,
    tilt: 5,
    drag: true,
    sway: 0,
}

const DEFAULT_FONT = {
    fontFamily: "Inter",
    variant: "Black",
    fontWeight: 900,
    fontSize: 24,
    lineHeight: "1em",
    letterSpacing: "0em",
    textAlign: "center" as const,
}

/** A spring with a little overshoot, so the spin-in rocks once as it lands. */
const DEFAULT_TRANSITION: Transition = { type: "spring", stiffness: 55, damping: 11, mass: 1 }

const DEFAULT_ADVANCED: MarigoldBroochAdvanced = {
    capHeight: 80,
    letterGap: 8,
    barAngle: -28,
    barArc: 47,
    fieldRadius: 66,
    border: 4.5,
    rim: 5.5,
    seedRadius: 27,
    petalLength: 55.5,
    wall: 1.8,
    thickness: 9,
    fov: 24,
    relief: 100,
    goldRoughness: 15,
    enamelGloss: 94,
    exposure: 100,
    bloomThreshold: 320,
    vignette: 30,
}

/* ---------------------------------------------------------- constants */

const TAU = Math.PI * 2
const FALLBACK_FAMILY = 'Impact, "Arial Narrow", "Arial Black", sans-serif'
/** Face maps: colour and mask at this size, the normal map at half of it. */
const TEX = 2048
/** Gap between a phrase and its neighbour, and a star's radius, in cap heights. */
const GAP_K = 0.26
const STAR_K = 0.24
/** Letters stretch sideways at most this far to fill the ring, squeeze at most this far before they shrink… */
const STRETCH_MIN = 0.6
const STRETCH_MAX = 1.8
/** …and past the stretch spread at most this many cap heights apart; then the bar grows instead. */
const MAX_TRACK = 0.55
/** Petals touch where they are widest, this far from base to tip. */
const PETAL_WIDEST = 0.5
/** The brown slit up each petal's base, as a share of the petal's length and width. */
const SLIT_LEN = 0.36
const SLIT_W = 0.26
/** Capsule bar thickness, in cap heights. */
const BAR_K = 0.22
/** Wall rounding blur (in wall widths) and the wider meniscus blur (in rounding blurs). */
const WALL_ROUND = 0.55
const MENISCUS = 3.5
/** Height of a gold wall over the enamel, and how far the enamel climbs it. */
const H_WALL = 0.6
const H_MENISCUS = 0.16
/** Crown of the domed rim, in the same height units. */
const H_RIM_DOME = 0.35
/** Normal-map slope gain at a 1024 normal map. */
const NORMAL_GAIN = 16
/** Base roughness of the enamel under its clear glaze. */
const ENAMEL_ROUGH = 0.38
/** Rounded outer edge, as a share of the pin's radius. */
const EDGE_BEVEL = 0.028
/** Post and clutch on the back, in pin radii. */
const POST_LEN = 0.26
const CLUTCH_R = 0.13
/** Tilt 10 leans the pin this far toward the pointer. */
const TILT_MAX = (32 * Math.PI) / 180
/** Sway 10 drifts the pin this far either way, and floats it this far. */
const SWAY_MAX = (14 * Math.PI) / 180
const FLOAT_MAX = 0.04
/** Follow rate of the lean (1/s), and the settle spring of a spin. */
const LEAN_RATE = 5
const SPIN_STIFF = 26
const SPIN_DAMP = 5.5
/** A flick spins at most this fast (rad/s, three turns a second)... */
const MAX_SPIN = 3 * Math.PI * 2
/** ...slows under this friction (1/s) - about two turns from the hardest flick... */
const SPIN_FRICTION = 1.4
/** ...and below this speed (rad/s) settles face up. */
const SETTLE_VEL = 2.2
/** Pointer light strength (it sits about 1.6 pin radii out). */
const SEEK_POWER = 3.2
/** Dragging across the pin's own width turns it this far. */
const DRAG_TURN = Math.PI
/** Glow 10 is this much bloom. */
const BLOOM_UNIT = 0.11

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x)
const num = (x: unknown, fallback: number) => (typeof x === "number" && isFinite(x) ? x : fallback)
/** Reads a File control's URL or an image control's { src } alike. */
const srcOf = (v: unknown): string =>
    typeof v === "string" ? v : v && typeof v === "object" && typeof (v as { src?: unknown }).src === "string" ? (v as { src: string }).src : ""

interface Picture {
    img: HTMLImageElement
    state: "loading" | "ready" | "failed"
    w: number
    h: number
}

/* -------------------------------------------------------------- face */

interface Design {
    /** Draw the sunflower; off while a logo is loading or shown. */
    flower: boolean
    logo: { img: HTMLImageElement; w: number; h: number; fit: string; size: number; offsetY: number } | null
    lines: string[]
    font: string
    petals: number
    colors: MarigoldBroochColors
    textColor: string
    adv: MarigoldBroochAdvanced
}

interface BandLayout {
    glyphs: { ch: string; theta: number }[]
    stars: number[]
    barArc: number
    em: number
    cap: number
    rm: number
    /** Sideways stretch of the letters. */
    sx: number
}

/** Sets the phrases round the band: phrase, star, phrase … then the bar
 *  in what is left. As on the reference the letters fill the ring with
 *  only a small gap between them, so they are stretched or squeezed
 *  sideways to fit whatever font is chosen (between STRETCH_MIN and
 *  STRETCH_MAX); past that a short caption spreads out and leaves a
 *  longer bar, and a long one shrinks. Angles run clockwise from twelve. */
function layoutBand(ctx: CanvasRenderingContext2D, d: Design): BandLayout {
    const A = d.adv
    const bandIn = A.fieldRadius / 100 + A.border / 100
    const bandOut = 1 - A.rim / 100
    const band = Math.max(0.02, bandOut - bandIn)
    const rm = bandIn + band / 2

    ctx.font = d.font.replace("{px}", "100px")
    const capRatio = ctx.measureText("H").actualBoundingBoxAscent / 100 || 0.72
    let cap = (band * A.capHeight) / 100
    let em = cap / capRatio
    const widths = d.lines.map((l) => Array.from(l).map((ch) => ({ ch, w: ctx.measureText(ch).width / 100 })))

    const n = d.lines.length
    const gapA = (GAP_K * cap) / rm
    const starA = (2 * STAR_K * cap) / rm
    const room = (TAU - (A.barArc * Math.PI) / 180 - 2 * n * gapA - (n - 1) * starA) * rm
    const ems = Math.max(1e-3, widths.reduce((s, l) => s + l.reduce((t, g) => t + g.w, 0), 0))
    const gaps = widths.reduce((s, l) => s + Math.max(0, l.length - 1), 0)
    let track = (Math.max(0, A.letterGap) / 100) * cap
    let sx = (room - gaps * track) / (ems * em)
    if (sx < STRETCH_MIN) {
        const k = Math.max(0.1, room / (ems * em * STRETCH_MIN + gaps * track))
        em *= k
        cap *= k
        track *= k
        sx = STRETCH_MIN
    } else if (sx > STRETCH_MAX) {
        sx = STRETCH_MAX
        if (gaps > 0) track = Math.min(Math.max(track, MAX_TRACK * cap), (room - ems * em * sx) / gaps)
    }

    let used = 2 * n * gapA + (n - 1) * starA
    for (const l of widths) used += (l.reduce((t, g) => t + g.w * em * sx, 0) + Math.max(0, l.length - 1) * track) / rm
    const barArc = TAU - used

    const glyphs: BandLayout["glyphs"] = []
    const stars: number[] = []
    let th = (A.barAngle * Math.PI) / 180 + barArc / 2 + gapA
    widths.forEach((l, i) => {
        l.forEach((g, j) => {
            const w = g.w * em * sx
            glyphs.push({ ch: g.ch, theta: th + w / 2 / rm })
            th += (w + (j < l.length - 1 ? track : 0)) / rm
        })
        th += gapA
        if (i < n - 1) {
            stars.push(th + starA / 2)
            th += starA + gapA
        }
    })
    return { glyphs, stars, barArc, em, cap, rm, sx }
}

/** The face as a cloisonne drawing. `mask` draws the same lines in white
 *  metal on black enamel, which the relief and material maps are baked
 *  from; otherwise it is the colour map. */
function paintFace(ctx: CanvasRenderingContext2D, N: number, d: Design, mask: boolean) {
    const A = d.adv
    const s = N / 2
    const c = N / 2
    const metal = mask ? "#ffffff" : d.colors.metal
    const ink = mask ? "#ffffff" : d.textColor
    const enamel = (col: string) => (mask ? "#000000" : col)
    const lw = (A.wall / 100) * s
    const fieldR = A.fieldRadius / 100
    const bandIn = fieldR + A.border / 100
    const bandOut = 1 - A.rim / 100
    // A point `u` out along the ray at `th` and `v` across it, in pixels.
    const at = (th: number, u: number, v: number): [number, number] => [
        c + s * (u * Math.sin(th) + v * Math.cos(th)),
        c + s * (-u * Math.cos(th) + v * Math.sin(th)),
    ]

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.lineJoin = "round"
    ctx.lineCap = "round"
    ctx.fillStyle = metal
    ctx.fillRect(0, 0, N, N)

    // Lettered band.
    ctx.beginPath()
    ctx.arc(c, c, bandOut * s, 0, TAU)
    ctx.arc(c, c, bandIn * s, 0, TAU, true)
    ctx.fillStyle = enamel(d.colors.band)
    ctx.fill()

    // Field, a touch warmer toward the flower as on the reference.
    if (mask) ctx.fillStyle = "#000000"
    else {
        const g = ctx.createRadialGradient(c, c, 0, c, c, fieldR * s)
        const inner = new THREE.Color(d.colors.field).lerp(new THREE.Color(d.colors.petals), 0.05)
        g.addColorStop(0.45, "#" + inner.getHexString())
        g.addColorStop(1, d.colors.field)
        ctx.fillStyle = g
    }
    ctx.beginPath()
    ctx.arc(c, c, fieldR * s, 0, TAU)
    ctx.fill()

    // A logo in place of the flower: printed on the field under the glaze,
    // never stretched. Fit sits it whole inside Logo Size; Fill covers the
    // field and crops, with Y Offset choosing which band of the crop shows
    // - as a share of the overflow, so every step moves the picture.
    if (d.logo && !mask) {
        const lg = d.logo
        const cover = lg.fit === "cover"
        const box = 2 * fieldR * s * (cover ? 1 : clamp(lg.size, 5, 100) / 100)
        const k = box / (cover ? Math.min(lg.w, lg.h) : Math.max(lg.w, lg.h))
        const dw = lg.w * k
        const dh = lg.h * k
        const py = cover ? (50 - (clamp(lg.offsetY, -250, 250) / 250) * 50) / 100 : 0.5
        ctx.save()
        ctx.beginPath()
        ctx.arc(c, c, fieldR * s, 0, TAU)
        ctx.clip()
        ctx.drawImage(lg.img, c - dw / 2, c - box / 2 + (box - dh) * py, dw, dh)
        ctx.restore()
    }

    if (d.flower) {
        // Flower. The seed head reaches out to where the petals touch, so it
        // shows only between their bases - the brown spikes of the reference.
        const n = Math.max(3, Math.round(d.petals))
        const r0 = A.seedRadius / 100
        const r1 = Math.max(r0 + 0.02, A.petalLength / 100)
        const L = r1 - r0
        const rw = r0 + PETAL_WIDEST * L
        const hw = (Math.PI * rw) / n
        ctx.lineWidth = lw
        ctx.strokeStyle = metal
        ctx.beginPath()
        ctx.arc(c, c, rw * s, 0, TAU)
        ctx.fillStyle = enamel(d.colors.seeds)
        ctx.fill()
        ctx.stroke()

        const petal = (th: number) => {
            // Cubic halves; at t = .5 they reach hw across, PETAL_WIDEST along.
            ctx.beginPath()
            ctx.moveTo(...at(th, r0, 0))
            ctx.bezierCurveTo(...at(th, r0 + 0.1 * L, 1.6 * hw), ...at(th, r0 + 0.84 * L, 1.45 * hw), ...at(th, r1, 0))
            ctx.bezierCurveTo(...at(th, r0 + 0.84 * L, -1.45 * hw), ...at(th, r0 + 0.1 * L, -1.6 * hw), ...at(th, r0, 0))
            ctx.closePath()
        }
        const angles = Array.from({ length: n }, (_, k) => (k * TAU) / n)
        ctx.fillStyle = enamel(d.colors.petals)
        for (const th of angles) {
            petal(th)
            ctx.fill()
        }
        for (const th of angles) {
            petal(th)
            ctx.stroke()
        }
        // The slit: brown carried up each base, walled in gold on its long sides only.
        const slit = (th: number) => {
            ctx.beginPath()
            ctx.moveTo(...at(th, r0 - 0.02, SLIT_W * hw))
            ctx.lineTo(...at(th, r0 + SLIT_LEN * L, 0))
            ctx.lineTo(...at(th, r0 - 0.02, -SLIT_W * hw))
        }
        ctx.fillStyle = enamel(d.colors.seeds)
        for (const th of angles) {
            slit(th)
            ctx.closePath()
            ctx.fill()
        }
        for (const th of angles) {
            slit(th)
            ctx.stroke()
        }
        // Close the seed head off from the petal tips' gaps under the base.
        ctx.beginPath()
        ctx.arc(c, c, (r0 - 0.02) * s, 0, TAU)
        ctx.fill()
    }

    // Lettering.
    const lines = d.lines
    if (!lines.length) return
    const lay = layoutBand(ctx, d)
    const rb = lay.rm - lay.cap / 2
    ctx.font = d.font.replace("{px}", `${lay.em * s}px`)
    ctx.textAlign = "center"
    ctx.textBaseline = "alphabetic"
    ctx.fillStyle = ink
    for (const g of lay.glyphs) {
        if (!g.ch.trim()) continue
        const [x, y] = at(g.theta, rb, 0)
        ctx.setTransform(1, 0, 0, 1, x, y)
        ctx.rotate(g.theta)
        ctx.scale(lay.sx, 1)
        ctx.fillText(g.ch, 0, 0)
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0)

    // Four-point stars, concave-sided like the reference's sparkles.
    const R = STAR_K * lay.cap * s
    for (const th of lay.stars) {
        const [x, y] = at(th, lay.rm, 0)
        ctx.beginPath()
        for (let k = 0; k < 4; k++) {
            const a = th + (k * Math.PI) / 2
            const b = a + Math.PI / 2
            const px = x + R * Math.sin(a)
            const py = y - R * Math.cos(a)
            if (k === 0) ctx.moveTo(px, py)
            const m = a + Math.PI / 4
            ctx.quadraticCurveTo(x + 0.14 * R * Math.sin(m), y - 0.14 * R * Math.cos(m), x + R * Math.sin(b), y - R * Math.cos(b))
        }
        ctx.closePath()
        ctx.fill()
    }

    // The bar: a gold capsule outline with band enamel inside.
    if (lay.barArc > 0.02) {
        const th = (A.barAngle * Math.PI) / 180
        const half = lay.barArc / 2 - (BAR_K * lay.cap) / 2 / lay.rm
        if (half > 0) {
            const a0 = th - half - Math.PI / 2
            const a1 = th + half - Math.PI / 2
            const w = BAR_K * lay.cap * s
            ctx.beginPath()
            ctx.arc(c, c, lay.rm * s, a0, a1)
            ctx.lineWidth = w
            ctx.strokeStyle = ink
            ctx.stroke()
            ctx.lineWidth = Math.max(0, w - 2 * lw)
            ctx.strokeStyle = enamel(d.colors.band)
            ctx.stroke()
        }
    }
}

/** Separable box blur, edges clamped; run twice it is close to a Gaussian. */
function boxBlur(src: Float32Array, dst: Float32Array, tmp: Float32Array, N: number, r: number) {
    const k = 1 / (2 * r + 1)
    for (let y = 0; y < N; y++) {
        const o = y * N
        let acc = src[o] * (r + 1)
        for (let x = 1; x <= r; x++) acc += src[o + Math.min(N - 1, x)]
        for (let x = 0; x < N; x++) {
            tmp[o + x] = acc * k
            acc += src[o + Math.min(N - 1, x + r + 1)] - src[o + Math.max(0, x - r)]
        }
    }
    for (let x = 0; x < N; x++) {
        let acc = tmp[x] * (r + 1)
        for (let y = 1; y <= r; y++) acc += tmp[Math.min(N - 1, y) * N + x]
        for (let y = 0; y < N; y++) {
            dst[y * N + x] = acc * k
            acc += tmp[Math.min(N - 1, y + r + 1) * N + x] - tmp[Math.max(0, y - r) * N + x]
        }
    }
}

/** Normal map (at half size) from the mask: gold walls rounded by one blur,
 *  the enamel's meniscus up them from a wider one. */
function bakeNormal(mask: Uint8ClampedArray, N: number, wall: number, rimIn: number, out: ImageData) {
    const M = N >> 1
    const m = new Float32Array(M * M)
    for (let y = 0; y < M; y++)
        for (let x = 0; x < M; x++) {
            const i = (2 * y * N + 2 * x) * 4
            m[y * M + x] = (mask[i] + mask[i + 4] + mask[i + N * 4] + mask[i + N * 4 + 4]) / 1020
        }
    const t = new Float32Array(M * M)
    const a = new Float32Array(M * M)
    const b = new Float32Array(M * M)
    const r1 = Math.max(1, Math.round((wall / 100) * (M / 2) * WALL_ROUND))
    const r2 = Math.max(2, Math.round(r1 * MENISCUS))
    boxBlur(m, a, t, M, r2)
    boxBlur(a, b, t, M, r2)
    boxBlur(m, a, t, M, r1)
    boxBlur(a, m, t, M, r1)
    for (let i = 0; i < M * M; i++) a[i] = H_WALL * m[i] + H_MENISCUS * b[i]
    // The rim is domed a little, so it catches the studio's ring of lights
    // across its width rather than only at its two edges.
    const span = Math.max(1e-3, 1 - rimIn)
    for (let y = 0; y < M; y++)
        for (let x = 0; x < M; x++) {
            const r = Math.hypot(x - M / 2 + 0.5, y - M / 2 + 0.5) / (M / 2)
            if (r > rimIn) a[y * M + x] += H_RIM_DOME * Math.sin(Math.PI * Math.min(1, (r - rimIn) / span))
        }
    const g = NORMAL_GAIN * (M / 1024)
    const o = out.data
    for (let y = 0; y < M; y++) {
        const yu = Math.max(0, y - 1) * M
        const yd = Math.min(M - 1, y + 1) * M
        for (let x = 0; x < M; x++) {
            const nx = -(a[y * M + Math.min(M - 1, x + 1)] - a[y * M + Math.max(0, x - 1)]) * g
            // Canvas rows run down, texture v up.
            const ny = (a[yd + x] - a[yu + x]) * g
            const l = 1 / Math.sqrt(nx * nx + ny * ny + 1)
            const j = (y * M + x) * 4
            o[j] = (nx * l * 0.5 + 0.5) * 255
            o[j + 1] = (ny * l * 0.5 + 0.5) * 255
            o[j + 2] = (l * 0.5 + 0.5) * 255
            o[j + 3] = 255
        }
    }
}

/** Clearcoat in R (enamel only), roughness in G, metalness in B - the
 *  channels three reads each of those maps from. */
function bakeOrm(mask: Uint8ClampedArray, goldRough: number, out: ImageData) {
    const o = out.data
    for (let i = 0; i < mask.length; i += 4) {
        const m = mask[i] / 255
        o[i] = (1 - m) * 255
        o[i + 1] = (m * goldRough + (1 - m) * ENAMEL_ROUGH) * 255
        o[i + 2] = m * 255
        o[i + 3] = 255
    }
}

/* ------------------------------------------------------------ studio */

/** A dark warm studio: a big softbox up and to the left and a ring of
 *  narrow strips for the rounded edges, and a dim card behind the
 *  camera, which is all the flat gold sees - so it reads as deep bronze
 *  and only the edges flare, as on the reference. */
function buildStudio(renderer: THREE.WebGLRenderer): THREE.WebGLRenderTarget {
    const room = new THREE.Scene()
    const geos: THREE.BufferGeometry[] = []
    const mats: THREE.Material[] = []
    const warm = new THREE.Color("#FFF0D8")
    const add = (w: number, h: number, k: number, x: number, y: number, z: number) => {
        const geo = new THREE.PlaneGeometry(w, h)
        const mat = new THREE.MeshBasicMaterial({ color: warm.clone().multiplyScalar(k), side: THREE.DoubleSide })
        geos.push(geo)
        mats.push(mat)
        const mesh = new THREE.Mesh(geo, mat)
        mesh.position.set(x, y, z)
        mesh.lookAt(0, 0, 0)
        room.add(mesh)
    }
    const box = new THREE.BoxGeometry(16, 16, 16)
    const wall = new THREE.MeshBasicMaterial({ color: 0x050302, side: THREE.BackSide })
    geos.push(box)
    mats.push(wall)
    room.add(new THREE.Mesh(box, wall))
    add(6, 3.5, 3.2, -3.5, 5.5, 3)
    // A ring of strips round the pin, so its round walls glint all the way
    // round as on the reference; brighter on the key's side.
    for (let k = 0; k < 12; k++) {
        const a = (k * TAU) / 12 + 0.3
        add(0.9, 3, 2.6 + 2 * Math.max(0, Math.cos(a - 2.4)), 6.5 * Math.cos(a), 6.5 * Math.sin(a), 2.2)
    }
    add(9, 6, 0.04, 0, 0, 7.5)
    add(8, 2, 0.6, 0, -6.5, 2.5)

    const pmrem = new THREE.PMREMGenerator(renderer)
    const rt = pmrem.fromScene(room, 0.015)
    pmrem.dispose()
    geos.forEach((g) => g.dispose())
    mats.forEach((m) => m.dispose())
    return rt
}

/* ------------------------------------------------------------- shaders */

const QUAD_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

/** Bright pass with a 4-tap Karis-weighted downsample and a soft knee,
 *  so a single hot glint on a wall cannot bloom into a square. */
const BRIGHT_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform float uThreshold;
vec3 tap(vec2 o, inout float wsum) {
    vec3 c = texture2D(uTex, vUv + uTexel * o).rgb;
    float w = 1.0 / (1.0 + max(c.r, max(c.g, c.b)));
    wsum += w;
    return c * w;
}
void main() {
    float ws = 0.0;
    vec3 c = tap(vec2(-0.5, -0.5), ws) + tap(vec2(0.5, -0.5), ws)
           + tap(vec2(-0.5, 0.5), ws) + tap(vec2(0.5, 0.5), ws);
    c /= ws;
    float l = max(c.r, max(c.g, c.b));
    float knee = 0.3;
    float soft = clamp(l - uThreshold + knee, 0.0, 2.0 * knee);
    soft = soft * soft / (4.0 * knee + 1e-4);
    float w = max(soft, l - uThreshold) / max(l, 1e-4);
    gl_FragColor = vec4(c * w, 1.0);
}
`

/** 9-tap Gaussian in five fetches, one axis at a time. */
const BLUR_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uStep;
void main() {
    vec2 o1 = uStep * 1.3846153846;
    vec2 o2 = uStep * 3.2307692308;
    vec3 c = texture2D(uTex, vUv).rgb * 0.2270270270;
    c += (texture2D(uTex, vUv + o1).rgb + texture2D(uTex, vUv - o1).rgb) * 0.3162162162;
    c += (texture2D(uTex, vUv + o2).rgb + texture2D(uTex, vUv - o2).rgb) * 0.0702702703;
    gl_FragColor = vec4(c, 1.0);
}
`

/** Scene plus bloom, tone-mapped, with a touch of vignette and moving
 *  grain so it sits like a photograph. Premultiplied: the glow is light
 *  laid over Background, which is a CSS fill behind the canvas. */
const COMPOSITE_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uScene;
uniform sampler2D uBloomA;
uniform sampler2D uBloomB;
uniform sampler2D uBloomC;
uniform float uBloom;
uniform float uExposure;
uniform float uVignette;
uniform float uAspect;
uniform float uTime;
vec3 aces(vec3 x) {
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
void main() {
    vec4 s = texture2D(uScene, vUv);
    vec3 glow = texture2D(uBloomA, vUv).rgb * 0.9
              + texture2D(uBloomB, vUv).rgb * 0.35
              + texture2D(uBloomC, vUv).rgb * 0.12;
    // Tone-mapped on the brightest channel, so enamel keeps the hue it was
    // given at any brightness - per channel, ACES crushes red before green
    // and the petals went lemon. Only true highlights roll off to white.
    // Glints bloom toward warm white, not the deeper gold they came off.
    glow = mix(glow, vec3(dot(glow, vec3(0.3, 0.55, 0.15))) * vec3(1.0, 0.86, 0.55), 0.55);
    vec3 x = (s.rgb + glow * uBloom) * uExposure;
    float m = max(x.r, max(x.g, x.b));
    vec3 c = mix(x * (aces(vec3(m)).r / max(m, 1e-4)), aces(x), smoothstep(1.5, 8.0, m));
    c = pow(c, vec3(1.0 / 2.2));
    vec2 v = (vUv - 0.5) * vec2(uAspect, 1.0);
    c *= 1.0 - uVignette * smoothstep(0.3, 1.0, length(v));
    float a = clamp(max(s.a, max(c.r, max(c.g, c.b))), 0.0, 1.0);
    float n = fract(sin(dot(gl_FragCoord.xy + fract(uTime) * 97.0, vec2(12.9898, 78.233))) * 43758.5453);
    c += (n - 0.5) * 0.018 * a;
    gl_FragColor = vec4(max(c, 0.0), a);
}
`

/* ----------------------------------------------------------- component */

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function MarigoldBrooch({
    logo = {"fit":"contain","size":64,"image":"https://cdn.brandfetch.io/idGP0S1Jjj/theme/dark/symbol.svg?c=1dxbfHSJFAPEGdCLU4o5B","offsetY":0},
    background = DEFAULTS.background,
    caption = {"show":true,"lines":["PINTEREST","PINTEREST"]},
    font = {"variant":"Black","fontSize":24,"textAlign":"center","fontFamily":"Inter","fontWeight":900,"lineHeight":"1em","letterSpacing":"0em"},
    textColor = DEFAULTS.textColor,
    petals = DEFAULTS.petals,
    size = DEFAULTS.size,
    colors = {"band":"#0E0906","field":"#FFFFFF","metal":"#F00A23","seeds":"#3C1503","petals":"#ED0921"},
    glow = DEFAULTS.glow,
    delay = DEFAULTS.delay,
    tilt = DEFAULTS.tilt,
    drag = DEFAULTS.drag,
    sway = DEFAULTS.sway,
    transition = {"mass":1,"type":"spring","damping":11,"stiffness":55},
    advanced = {"fov":24,"rim":5.5,"wall":1.8,"barArc":47,"border":4.5,"relief":100,"barAngle":-28,"exposure":100,"vignette":30,"capHeight":80,"letterGap":8,"thickness":9,"seedRadius":27,"enamelGloss":94,"fieldRadius":66,"petalLength":55.5,"goldRoughness":15,"bloomThreshold":320},
    style,
}: MarigoldBroochProps) {
    const mark = { ...DEFAULT_LOGO, ...logo }
    const cap = { ...DEFAULT_CAPTION, ...caption }
    const palette = { ...DEFAULT_COLORS, ...colors }
    const adv = { ...DEFAULT_ADVANCED, ...advanced }

    const hostRef = useRef<HTMLDivElement>(null)
    const [ready, setReady] = useState(false)
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const arrive = useMotionValue(0)
    const opacity = useTransform(arrive, [0, 0.2], [0, 1])

    // Live prop mirror: the loop reads it, so a control change never rebuilds the GL context.
    const live = { mark, cap, font, textColor, petals, size, palette, glow, tilt, drag, sway, adv }
    const propsRef = useRef(live)
    propsRef.current = live

    useEffect(() => {
        if (!ready) return
        const still =
            typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
        if (isCanvas || still) {
            arrive.set(1)
            return
        }
        const ctl = animate(arrive, 1, { ...(transition as ValueAnimationTransition<number>), delay })
        return () => ctl.stop()
    }, [ready])

    useEffect(() => {
        const host = hostRef.current
        if (!host) return

        let renderer: THREE.WebGLRenderer
        try {
            renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: "high-performance" })
        } catch {
            return
        }
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        renderer.setPixelRatio(dpr)
        renderer.setClearColor(0x000000, 0)
        const canvas = renderer.domElement
        canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block"
        host.appendChild(canvas)

        const floatOk = renderer.extensions.has("EXT_color_buffer_float") || renderer.extensions.has("EXT_color_buffer_half_float")
        const type = floatOk ? THREE.HalfFloatType : THREE.UnsignedByteType
        const postOpts = { type, depthBuffer: false, stencilBuffer: false }
        const rtScene = new THREE.WebGLRenderTarget(1, 1, { type, samples: 4 })
        const rts = Array.from({ length: 6 }, () => new THREE.WebGLRenderTarget(1, 1, postOpts))
        const [rtA, rtB, rtC, rtD, rtE, rtF] = rts

        /* ---- face maps */

        const maxAniso = renderer.capabilities.getMaxAnisotropy()
        const makeCanvas = (n: number) => {
            const cv = document.createElement("canvas")
            cv.width = n
            cv.height = n
            return cv
        }
        const colorCv = makeCanvas(TEX)
        const maskCv = makeCanvas(TEX)
        const ormCv = makeCanvas(TEX)
        const normalCv = makeCanvas(TEX >> 1)
        const colorCtx = colorCv.getContext("2d")
        const maskCtx = maskCv.getContext("2d", { willReadFrequently: true })
        const ormCtx = ormCv.getContext("2d")
        const normalCtx = normalCv.getContext("2d")
        const tex = (cv: HTMLCanvasElement, srgb: boolean) => {
            const t = new THREE.CanvasTexture(cv)
            t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
            t.anisotropy = maxAniso
            return t
        }
        const colorTex = tex(colorCv, true)
        const ormTex = tex(ormCv, false)
        const normalTex = tex(normalCv, false)

        /* ---- scene */

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(DEFAULT_ADVANCED.fov, 1, 0.1, 100)
        const env = buildStudio(renderer)
        scene.environment = env.texture

        const key = new THREE.DirectionalLight(0xfff0dc, 4.0)
        key.position.set(-1.2, 1.8, 2.6)
        const fill = new THREE.DirectionalLight(0xffd9a8, 1.0)
        fill.position.set(1.6, -0.8, 2.2)
        const seek = new THREE.PointLight(0xffe4b5, 0, 0, 2)
        scene.add(key, fill, seek)

        const pin = new THREE.Group()
        scene.add(pin)

        const faceMat = new THREE.MeshPhysicalMaterial({
            map: colorTex,
            normalMap: normalTex,
            clearcoatNormalMap: normalTex,
            roughnessMap: ormTex,
            metalnessMap: ormTex,
            clearcoatMap: ormTex,
            metalness: 1,
            roughness: 1,
            clearcoat: 1,
            // The glaze is the enamel's only reflective surface; a second,
            // rougher sheen under it greyed the black band.
            specularIntensity: 0,
        })
        const goldMat = new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 0.3 })
        const backMat = new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 0.5 })
        const rubberMat = new THREE.MeshPhysicalMaterial({ color: 0x141210, roughness: 0.55, metalness: 0, sheen: 0.4 })

        const faceGeo = new THREE.CircleGeometry(1 - EDGE_BEVEL, 256)
        {
            // Canvas radius 1 spans the uv square, so the face shows the
            // drawing out to its bevel and the rim's lathe carries the rest.
            const pos = faceGeo.attributes.position
            const uv = faceGeo.attributes.uv
            for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / 2 + 0.5, pos.getY(i) / 2 + 0.5)
        }
        const face = new THREE.Mesh(faceGeo, faceMat)
        const backGeo = new THREE.CircleGeometry(1 - EDGE_BEVEL, 128).rotateY(Math.PI)
        const back = new THREE.Mesh(backGeo, backMat)
        const postGeo = new THREE.CylinderGeometry(0.03, 0.03, POST_LEN, 24).rotateX(Math.PI / 2)
        const clutchGeo = new THREE.CylinderGeometry(CLUTCH_R, CLUTCH_R * 0.92, 0.07, 48).rotateX(Math.PI / 2)
        const post = new THREE.Mesh(postGeo, goldMat)
        const clutch = new THREE.Mesh(clutchGeo, rubberMat)
        let edge: THREE.Mesh | null = null
        let edgeKey = -1
        const buildEdge = (thickPct: number) => {
            if (thickPct === edgeKey) return
            edgeKey = thickPct
            const T = Math.max(0.01, thickPct / 200)
            const b = Math.min(EDGE_BEVEL, T * 0.9)
            const pts: THREE.Vector2[] = []
            const arc = (cx: number, cy: number, a0: number, a1: number) => {
                for (let k = 0; k <= 8; k++) {
                    const a = a0 + ((a1 - a0) * k) / 8
                    pts.push(new THREE.Vector2(cx + b * Math.cos(a), cy + b * Math.sin(a)))
                }
            }
            arc(1 - b, -T + b, -Math.PI / 2, 0)
            arc(1 - b, T - b, 0, Math.PI / 2)
            pts.push(new THREE.Vector2(1 - EDGE_BEVEL - 0.001, T))
            const geo = new THREE.LatheGeometry(pts, 256).rotateX(Math.PI / 2)
            if (edge) {
                edge.geometry.dispose()
                edge.geometry = geo
            } else {
                edge = new THREE.Mesh(geo, goldMat)
                pin.add(edge)
            }
            face.position.z = T + 0.0004
            back.position.z = -T - 0.0004
            post.position.z = -T - POST_LEN / 2
            clutch.position.z = -T - POST_LEN * 0.62
        }
        pin.add(face, back, post, clutch)

        /* ---- post */

        const postScene = new THREE.Scene()
        const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
        const quadGeo = new THREE.PlaneGeometry(2, 2)
        const shader = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>) =>
            new THREE.ShaderMaterial({ vertexShader: QUAD_VERTEX, fragmentShader, uniforms, depthTest: false, depthWrite: false })
        const bright = shader(BRIGHT_FRAGMENT, {
            uTex: { value: rtScene.texture },
            uTexel: { value: new THREE.Vector2() },
            uThreshold: { value: 0.7 },
        })
        const blur = shader(BLUR_FRAGMENT, { uTex: { value: null }, uStep: { value: new THREE.Vector2() } })
        const composite = shader(COMPOSITE_FRAGMENT, {
            uScene: { value: rtScene.texture },
            uBloomA: { value: rtA.texture },
            uBloomB: { value: rtD.texture },
            uBloomC: { value: rtF.texture },
            uBloom: { value: 0 },
            uExposure: { value: 1 },
            uVignette: { value: 0.3 },
            uAspect: { value: 1 },
            uTime: { value: 0 },
        })
        const quad = new THREE.Mesh(quadGeo, composite)
        quad.frustumCulled = false
        postScene.add(quad)
        const pass = (mat: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) => {
            quad.material = mat
            renderer.setRenderTarget(target)
            renderer.render(postScene, postCam)
        }

        /* ---- baking */

        let fontsVersion = 0
        const onFonts = () => {
            fontsVersion++
        }
        document.fonts?.addEventListener?.("loadingdone", onFonts)
        let shapeKey = ""
        let colorKey = ""
        let roughKey = ""
        let lastBake = -1e9
        let mask: Uint8ClampedArray | null = null
        let wantFont = ""
        // Logos are loaded once per URL. CORS is asked for because the face is
        // a WebGL texture: a picture that refuses it cannot be drawn there,
        // so it fails and the flower stays.
        const pictures = new Map<string, Picture>()
        const picture = (url: string): Picture => {
            const hit = pictures.get(url)
            if (hit) return hit
            const img = new window.Image()
            const pic: Picture = { img, state: "loading", w: 1, h: 1 }
            img.crossOrigin = "anonymous"
            img.onload = () => {
                // An SVG with no width/height can report 0; treat it as square.
                pic.w = img.naturalWidth || 1
                pic.h = img.naturalWidth ? img.naturalHeight || 1 : 1
                pic.state = "ready"
            }
            img.onerror = () => {
                pic.state = "failed"
            }
            img.src = url
            pictures.set(url, pic)
            return pic
        }
        const designOf = (p: typeof live): Design => {
            const url = srcOf(p.mark.image)
            const pic = url ? picture(url) : null
            const f = p.font as CSSProperties
            const family = f.fontFamily ? `${f.fontFamily}, ${FALLBACK_FAMILY}` : FALLBACK_FAMILY
            const lines = p.cap.show ? (p.cap.lines ?? []).map((l) => String(l)).filter((l) => l.trim()) : []
            return {
                flower: !pic || pic.state === "failed",
                logo:
                    pic && pic.state === "ready"
                        ? { img: pic.img, w: pic.w, h: pic.h, fit: p.mark.fit, size: num(p.mark.size, DEFAULT_LOGO.size), offsetY: num(p.mark.offsetY, 0) }
                        : null,
                lines,
                font: `${f.fontStyle || "normal"} ${f.fontWeight || 900} {px} ${family}`,
                petals: clamp(Math.round(num(p.petals, DEFAULTS.petals)), 3, 48),
                colors: p.palette,
                textColor: p.textColor,
                adv: p.adv,
            }
        }
        /** Rebakes whatever changed: the mask, normal and material maps when
         *  the drawing's shape does, only the colour map when only colour
         *  does. Throttled, so dragging a slider does not queue bakes. */
        const bake = (now: number) => {
            if (!colorCtx || !maskCtx || !ormCtx || !normalCtx) return
            const d = designOf(propsRef.current)
            const A = d.adv
            const shape = JSON.stringify([d.flower, d.lines, d.font, d.petals, A.capHeight, A.letterGap, A.barAngle, A.barArc, A.fieldRadius, A.border, A.rim, A.seedRadius, A.petalLength, A.wall, fontsVersion])
            const lg = d.logo
            const color = shape + JSON.stringify([d.colors, d.textColor, lg && [lg.img.src, lg.fit, lg.size, lg.offsetY]])
            const rough = shape + A.goldRoughness
            if (shape === shapeKey && color === colorKey && rough === roughKey) return
            if (now - lastBake < 120) return
            lastBake = now
            const fontStr = d.font.replace("{px}", "100px")
            if (fontStr !== wantFont) {
                wantFont = fontStr
                document.fonts?.load(fontStr).then(onFonts, () => {})
            }
            if (shape !== shapeKey) {
                paintFace(maskCtx, TEX, d, true)
                mask = maskCtx.getImageData(0, 0, TEX, TEX).data
                const nImg = normalCtx.createImageData(TEX >> 1, TEX >> 1)
                bakeNormal(mask, TEX, A.wall, 1 - A.rim / 100, nImg)
                normalCtx.putImageData(nImg, 0, 0)
                normalTex.needsUpdate = true
            }
            if (mask && (rough !== roughKey || shape !== shapeKey)) {
                const oImg = ormCtx.createImageData(TEX, TEX)
                bakeOrm(mask, clamp(A.goldRoughness / 100, 0.02, 1), oImg)
                ormCtx.putImageData(oImg, 0, 0)
                ormTex.needsUpdate = true
            }
            if (color !== colorKey) {
                paintFace(colorCtx, TEX, d, false)
                colorTex.needsUpdate = true
            }
            shapeKey = shape
            colorKey = color
            roughKey = rough
        }

        /* ---- size */

        let W = 1
        let H = 1
        const resize = () => {
            W = Math.max(1, host.clientWidth)
            H = Math.max(1, host.clientHeight)
            renderer.setSize(W, H, false)
            const cw = Math.round(W * dpr)
            const ch = Math.round(H * dpr)
            rtScene.setSize(cw, ch)
            // Bloom at a half, a quarter and an eighth: the tight glow on
            // the walls, the halo round the rings, and the haze.
            rts.forEach((rt, i) => {
                const sh = (i >> 1) + 1
                rt.setSize(Math.max(1, cw >> sh), Math.max(1, ch >> sh))
            })
            camera.aspect = W / H
            composite.uniforms.uAspect.value = W / H
        }
        const ro = new ResizeObserver(resize)
        ro.observe(host)
        resize()

        /* ---- input */

        const pt = { x: 0, y: 0, over: 0, tover: 0, dragging: false, lastX: 0, lastT: 0 }
        let spin = 0
        let spinVel = 0
        /** The face-up angle a spin is settling on, once it has slowed; null while it coasts. */
        let settleTo: number | null = 0
        const local = (e: PointerEvent) => {
            const r = host.getBoundingClientRect()
            pt.x = clamp(((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1, -1, 1)
            pt.y = clamp(1 - ((e.clientY - r.top) / Math.max(1, r.height)) * 2, -1, 1)
        }
        const onMove = (e: PointerEvent) => {
            local(e)
            pt.tover = 1
            if (!pt.dragging) return
            const pinPx = (Math.max(10, num(propsRef.current.size, DEFAULTS.size)) / 100) * Math.min(W, H)
            const d = ((e.clientX - pt.lastX) / pinPx) * DRAG_TURN
            const dt = Math.max(1, e.timeStamp - pt.lastT) / 1000
            spin += d
            spinVel = spinVel * 0.6 + (d / dt) * 0.4
            pt.lastX = e.clientX
            pt.lastT = e.timeStamp
        }
        const onDown = (e: PointerEvent) => {
            local(e)
            pt.tover = 1
            if (!propsRef.current.drag) return
            pt.dragging = true
            pt.lastX = e.clientX
            pt.lastT = e.timeStamp
            spinVel = 0
            settleTo = null
            host.setPointerCapture?.(e.pointerId)
        }
        const onUp = (e: PointerEvent) => {
            if (!pt.dragging) return
            pt.dragging = false
            // A pointer held still before letting go throws nothing; a flick
            // throws at most MAX_SPIN.
            spinVel = e.timeStamp - pt.lastT > 90 ? 0 : clamp(spinVel, -MAX_SPIN, MAX_SPIN)
        }
        const onLeave = () => {
            if (!pt.dragging) pt.tover = 0
        }
        host.addEventListener("pointermove", onMove)
        host.addEventListener("pointerdown", onDown)
        host.addEventListener("pointerup", onUp)
        host.addEventListener("pointercancel", onUp)
        host.addEventListener("pointerleave", onLeave)

        let visible = true
        const io =
            typeof IntersectionObserver === "function"
                ? new IntersectionObserver((es) => {
                      visible = es.some((e) => e.isIntersecting)
                  })
                : null
        io?.observe(host)
        const reduce = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null

        /* ---- loop */

        let raf = 0
        let last = -1
        let clock = 0
        let leanX = 0
        let leanY = 0
        let announced = false
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min(0.05, (now - last) / 1000)
            last = now
            if (!visible && announced) return
            const p = propsRef.current
            const A = p.adv
            const still = !!(reduce && reduce.matches)

            bake(now)
            buildEdge(clamp(num(A.thickness, DEFAULT_ADVANCED.thickness), 2, 30))
            if (!still) clock += dt

            // Colours and finish, read live.
            goldMat.color.set(p.palette.metal)
            backMat.color.set(p.palette.metal)
            const rough = clamp(A.goldRoughness / 100, 0.02, 1)
            goldMat.roughness = rough
            backMat.roughness = clamp(rough + 0.25, 0, 1)
            faceMat.clearcoatRoughness = clamp(1 - A.enamelGloss / 100, 0, 1)
            const relief = Math.max(0, A.relief) / 100
            faceMat.normalScale.set(relief, relief)
            faceMat.clearcoatNormalScale.set(relief, relief)

            // Framing: the pin's diameter is Size of the short side.
            const fov = clamp(A.fov, 5, 80)
            if (camera.fov !== fov) camera.fov = fov
            camera.updateProjectionMatrix()
            const sz = clamp(num(p.size, DEFAULTS.size), 10, 120) / 100
            const viewH = (2 * H) / (sz * Math.min(W, H))
            camera.position.set(0, 0, viewH / 2 / Math.tan((fov * Math.PI) / 360))
            camera.lookAt(0, 0, 0)

            // Pointer lean, idle sway, drag spin with a settle back face up.
            pt.over += (pt.tover - pt.over) * (1 - Math.exp(-dt * 4))
            const tl = (clamp(num(p.tilt, DEFAULTS.tilt), 0, 10) / 10) * TILT_MAX
            const kl = 1 - Math.exp(-dt * LEAN_RATE)
            leanY += (pt.x * tl * pt.over - leanY) * kl
            leanX += (-pt.y * tl * pt.over - leanX) * kl
            const sw = still ? 0 : (clamp(num(p.sway, DEFAULTS.sway), 0, 10) / 10) * (1 - 0.6 * pt.over)
            // A released spin coasts down under friction, then settles on the
            // face-up angle it is heading for, chosen once. (Choosing it every
            // frame from the speed kept moving it a turn ahead, so the spring
            // fed the spin instead of stopping it.)
            if (!pt.dragging) {
                if (settleTo === null) {
                    spinVel *= Math.exp(-dt * SPIN_FRICTION)
                    spin += spinVel * dt
                    if (Math.abs(spinVel) < SETTLE_VEL) settleTo = TAU * Math.round((spin + spinVel * 0.35) / TAU)
                } else {
                    spinVel += (SPIN_STIFF * (settleTo - spin) - SPIN_DAMP * spinVel) * dt
                    spin += spinVel * dt
                }
            }
            const e = arrive.get()
            pin.rotation.order = "YXZ"
            pin.rotation.y = spin + leanY + sw * SWAY_MAX * Math.sin(clock * 0.43) - (1 - e) * Math.PI
            pin.rotation.x = leanX + sw * SWAY_MAX * 0.55 * Math.sin(clock * 0.31 + 1.2)
            pin.position.y = sw * FLOAT_MAX * Math.sin(clock * 0.7)
            pin.scale.setScalar(0.82 + 0.18 * clamp(e, 0, 1.2))

            // A warm light that follows the pointer, and drifts on its own when it is away.
            const ix = Math.cos(clock * 0.35) * 1.4
            const iy = Math.sin(clock * 0.35) * 0.9 + 0.4
            seek.position.set(ix + (pt.x * 1.6 - ix) * pt.over, iy + (pt.y * 1.6 - iy) * pt.over, 1.6)
            seek.intensity = SEEK_POWER

            renderer.setRenderTarget(rtScene)
            renderer.clear()
            renderer.render(scene, camera)

            const g = clamp(num(p.glow, DEFAULTS.glow), 0, 10)
            composite.uniforms.uBloom.value = g * BLOOM_UNIT
            composite.uniforms.uExposure.value = Math.max(0, A.exposure) / 100
            composite.uniforms.uVignette.value = clamp(A.vignette / 100, 0, 1)
            composite.uniforms.uTime.value = now / 1000
            bright.uniforms.uThreshold.value = Math.max(0, A.bloomThreshold) / 100
            if (g > 0) {
                ;(bright.uniforms.uTexel.value as THREE.Vector2).set(1 / rtScene.width, 1 / rtScene.height)
                pass(bright, rtA)
                const step = blur.uniforms.uStep.value as THREE.Vector2
                const levels: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget, THREE.WebGLRenderTarget][] = [
                    [rtA, rtB, rtA],
                    [rtA, rtC, rtD],
                    [rtD, rtE, rtF],
                ]
                levels.forEach(([src, mid, dst], i) => {
                    blur.uniforms.uTex.value = src.texture
                    step.set((i === 0 ? 1 : 2) / src.width, 0)
                    pass(blur, mid)
                    blur.uniforms.uTex.value = mid.texture
                    step.set(0, 1 / mid.height)
                    pass(blur, dst)
                })
            }
            pass(composite, null)

            if (!announced && shapeKey) {
                announced = true
                setReady(true)
            }
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            document.fonts?.removeEventListener?.("loadingdone", onFonts)
            host.removeEventListener("pointermove", onMove)
            host.removeEventListener("pointerdown", onDown)
            host.removeEventListener("pointerup", onUp)
            host.removeEventListener("pointercancel", onUp)
            host.removeEventListener("pointerleave", onLeave)
            io?.disconnect()
            ro.disconnect()
            ;[faceGeo, backGeo, postGeo, clutchGeo, quadGeo].forEach((g) => g.dispose())
            ;(edge as THREE.Mesh | null)?.geometry.dispose()
            ;[faceMat, goldMat, backMat, rubberMat, bright, blur, composite].forEach((m) => m.dispose())
            ;[colorTex, ormTex, normalTex].forEach((t) => t.dispose())
            ;[rtScene, ...rts].forEach((rt) => rt.dispose())
            env.dispose()
            renderer.dispose()
            renderer.forceContextLoss()
            canvas.remove()
        }
    }, [])

    return (
        <div
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
            }}
        >
            <motion.div
                ref={hostRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    opacity,
                    touchAction: "pan-y",
                    userSelect: "none",
                    cursor: drag ? "grab" : undefined,
                }}
            />
        </div>
    )
}
