"use client"

/**
 * Depth Gallery — a corridor of pictures receding into the frame, flown
 * through by the scroll. Only ever one picture is really being looked at:
 * the plate ahead of the camera dissolves into the one behind it as the
 * scroll advances, so the gallery reads as depth rather than as a list.
 *
 * Four things hang off one number, the camera's position `p` measured in
 * plate slots — unbounded, because the corridor has no end:
 *
 *   1. RECESSION — the plate in focus sits exactly one slot ahead of the
 *      camera and the next one two, so as `p` crosses a slot the far plate
 *      arrives at the near plate's old depth and the pair renews with no
 *      seam. Card Width is the size the focused plate lands at on screen,
 *      not the size of some pre-perspective rectangle nobody can see: the
 *      geometry is pre-multiplied by the perspective divide it is about to
 *      take, so the slider means what it says at any Depth.
 *   2. DISSOLVE — the plate at `floor(p)` fades out over `frac(p)` while
 *      the one behind it fades in. Both indices are taken modulo the list,
 *      which is the whole of the loop: run off the end and the first
 *      picture is simply the next one down the corridor. Every other plate
 *      is at zero and taken out of the paint.
 *   3. MOOD — the ground under everything is built from the picture's own
 *      colour, sampled off the image on the client, and cross-faded on the
 *      same `frac(p)`. Two slow blobs and a grain sit over it, straight
 *      from the original's fragment shader — but as CSS gradients, because
 *      the shader had no texture fetch in it worth a GL context.
 *   4. BREATH — scroll velocity, not scroll position, drives a tilt, a
 *      scale pulse and a vertical drift. Hold still and the corridor is
 *      still; throw the wheel and the plates lean into it.
 *
 * Because it loops, side and depth are read off the *slot* rather than off
 * the picture's index in the array. An odd-length list would otherwise put
 * two plates on the same side of the frame across the wrap, and the pointer
 * parallax would jump as the index fell back to zero.
 *
 * The component owns its scroll. Wheel and drag push a target that the
 * rendered position chases with a lerp, and the position wraps on its own
 * span, so it runs forever without a scroll library. Touch arrives as a
 * drag on `touch-action: pan-x` — the same contract the rest of the
 * library's scroll-driven components keep.
 *
 * No `Transition` control: nothing here is a framer-motion animation for a
 * spring to drive — the corridor is an rAF lerp, so it carries its own
 * `Scroll Sens.` and `Smoothing` scales instead of a row that does nothing.
 *
 * After the original: "Atmospheric Depth Gallery" by houmahani (Codrops),
 * MIT — rebuilt from its Three.js scene as one file with no dependencies.
 */

import { useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties } from "react"

/* ------------------------------------------------------------------ types */

/** Accepts either a bare URL string or a responsive-image-like object. */
type ImageValue = string | { src?: string } | null | undefined

/** A row of the Images array: the `{ image, offsetY }` object the panel
 * writes, or a bare image for lists authored before the offset existed. */
type ItemInput = ImageValue | { image?: ImageValue; offsetY?: number }

interface MoodSettings {
    /** How far the ground travels from Background toward the picture's own
     * colour. 0 leaves the frame flat. */
    strength: number
    /** Size of the two drifting blobs, against the frame. */
    blobSize: number
    /** Film grain over the whole ground. */
    grain: number
}

interface ParallaxSettings {
    /** Pointer push on the plates, in and against the cursor. */
    pointer: number
    /** Velocity-driven tilt and scale pulse. */
    breath: number
    /** Velocity-driven vertical push, in the direction of travel. */
    drift: number
}

export interface DepthGalleryProps {
    images?: ItemInput[]
    background?: string
    depth?: number
    spread?: number
    cardWidth?: number
    cardHeight?: number
    radius?: number
    mood?: Partial<MoodSettings>
    parallax?: Partial<ParallaxSettings>
    sensitivity?: number
    smoothing?: number
    style?: CSSProperties
}

interface RGB {
    r: number
    g: number
    b: number
    a: number
}

interface Mood {
    background: RGB
    blob1: RGB
    blob2: RGB
}

/** One resolved plate. `offsetY` is carried, not baked in: it is applied
 * where the `<img>` is written, so dragging the slider reframes what is
 * already on screen instead of only the next thing drawn. */
interface Plate {
    src: string | null
    fill: string | null
    offsetY: number
    mood: Mood
}

/* -------------------------------------------------------------- constants */

/** How many slots ahead of the camera the plate in focus sits. The original
 * sampled its fade one gap in front of the camera; this is that offset, and
 * it is what stops the focused picture from arriving flat against the lens.
 * Fixed — moving it changes nothing a user can name. */
const VIEW_LEAD = 1

/** Perspective as a multiple of Card Width, so the recession looks the same
 * whatever size the plates are cut to. A knob for it would only ever be a
 * second, worse Depth slider. */
const PERSPECTIVE_RATIO = 3.2

/** Depth 0–10 → gap between plates, as a share of the perspective. */
const GAP_MIN = 0.26
const GAP_RANGE = 0.9

/** Spread 10 puts a plate this far off centre, as a share of Card Width. */
const SPREAD_RANGE = 0.6

/** Wheel pixels to cross one plate at a gain of 1 — so ~540 at Scroll
 * Sens. 5, which is where the original's own scroll-to-world factor put it. */
const WHEEL_SPAN = 650
const WHEEL_MIN = 0.4
const WHEEL_RANGE = 1.6

/** Drag moves further per pixel than the wheel does — a finger expects to
 * carry the corridor with it, a wheel expects to nudge it. */
const DRAG_GAIN = 1.8

/** Slots per frame that count as flat out. Everything velocity-driven is
 * normalised against this, so the breath is fully open at a brisk throw of
 * the wheel rather than only at an impossible one. */
const VELOCITY_MAX = 0.03
const VELOCITY_DAMPING = 0.12

/** Lerps for the things that chase a target inside the frame loop. */
const POINTER_SMOOTHING = 0.08
const BREATH_SMOOTHING = 0.14
const DRIFT_SMOOTHING = 0.05
const BREATH_GAIN = 1.1

/** The breath at Breath 5, from the original: a 2.6° lean and a 3% swell.
 * The control scales both together, because they are one gesture. */
const BREATH_TILT_DEG = 2.6
const BREATH_SCALE = 0.03

/** Extra pointer taken per slot of depth, which is what stops the parallax
 * reading as a flat slide. Measured in slots from the camera rather than in
 * list positions, so it does not jump where the loop wraps. */
const DEPTH_INFLUENCE = 0.05

/** The blobs are mixed this far back toward the ground before they are laid
 * over it, so they read as light in the room and not as two coloured discs. */
const BLOB_SOFTEN = 0.35

/** Blob radii in frame units at Blob Size 5, from the shader's uniforms. */
const BLOB1_RADIUS = 0.55
const BLOB2_RADIUS = 0.45

/** Grain at Grain 10, as an overlay alpha. */
const GRAIN_RANGE = 0.28

/** Weight added to every pixel when averaging a picture's colour, so a shot
 * with no saturation anywhere still returns its own grey rather than a
 * divide by nothing. */
const SAMPLE_FLOOR = 0.08

/** Edge of the noise tile, in pixels. */
const GRAIN_TILE = 128

const DEFAULT_BACKGROUND = "#F2EFE9"

/** What a plate falls back to with no picture, and what a picture whose
 * colour could not be read falls back to. */
const NEUTRAL_TINT: RGB = { r: 168, g: 166, b: 160, a: 1 }

const DEFAULT_MOOD: MoodSettings = {
    strength: 7,
    blobSize: 5,
    grain: 3,
}

const DEFAULT_PARALLAX: ParallaxSettings = {
    pointer: 5,
    breath: 5,
    drift: 5,
}

const DEFAULTS = {
    depth: 5,
    spread: 5,
    cardWidth: 420,
    cardHeight: 520,
    radius: 4,
    sensitivity: 5,
    smoothing: 6,
}

/** Stand-in plates so the component renders standing on its own with no
 * props — the original's five swatches, which is also what makes the mood
 * cross-fade visible the moment it is dropped on a canvas. */
const PLACEHOLDER_TINTS = [
    "#FECA4F",
    "#80455A",
    "#FA7B71",
    "#3C72C6",
    "#7D936E",
]

const DEFAULT_IMAGES: ItemInput[] = [
    { image: { src: "https://images.unsplash.com/photo-1713456047285-52a8d18d1912?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NDkxfHx1c2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfHwwfHx8Mg%3D%3D" }, offsetY: 0 },
    { image: { src: "https://images.unsplash.com/photo-1629747387925-6905ff5a558a?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NDk1fHx1c2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfHwwfHx8Mg%3D%3D" }, offsetY: 0 },
    { image: { src: "https://images.unsplash.com/photo-1568044853110-277196781802?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NDk2fHx1c2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfHwwfHx8Mg%3D%3D\n" }, offsetY: 0 },
    { image: { src: "https://images.unsplash.com/photo-1787656235601-d0c3b837ed33?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NjUxfHx1c2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfHwwfHx8Mg%3D%3D" }, offsetY: 0 },
    { image: { src: "https://images.unsplash.com/photo-1613698808499-f772ccb4f527?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NzcwfHx1c2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfHwwfHx8Mg%3D%3D" }, offsetY: 0 },
    { image: { src: "https://images.unsplash.com/photo-1626858707111-2fefbc9a848e?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nzg1fHx1c2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfHwwfHx8Mg%3D%3D" }, offsetY: 0 },
    { image: { src: "https://images.unsplash.com/photo-1542305983-c4100e4b8cd2?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nzk2fHx1c2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfHwwfHx8Mg%3D%3D" }, offsetY: 0 },
    { image: { src: "https://images.unsplash.com/photo-1720569103781-daf2ecb89e1b?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8ODk3fHx1c2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfHwwfHx8Mg%3D%3D" }, offsetY: 0 },
    { image: { src: "https://images.unsplash.com/photo-1611938766054-6b4f25b06f2e?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OTI5fHx1c2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfHwwfHx8Mg%3D%3D" }, offsetY: 0 },
    { image: { src: "https://images.unsplash.com/photo-1643059514529-f6689eeba463?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTAyNHx8dXNlciUyMHByb2ZpbGUlMjBpbWFnZSUyMHZpYnJhbnR8ZW58MHx8MHx8fDI%3D" }, offsetY: 0 },
]

/* -------------------------------------------------------------- internals */

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value))
}

function mix(a: number, b: number, t: number): number {
    return a + (b - a) * t
}

/** Positive modulo — JS `%` keeps the sign of the dividend, which would send
 * a corridor scrolled backwards to a negative plate. */
function wrap(value: number, span: number): number {
    return ((value % span) + span) % span
}

/* ------------------------------------------------------------------ colour */

function hslToRgb(h: number, s: number, l: number, a = 1): RGB {
    const hue = ((h % 360) + 360) % 360
    const sat = clamp(s, 0, 100) / 100
    const lum = clamp(l, 0, 100) / 100
    const c = (1 - Math.abs(2 * lum - 1)) * sat
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
    const m = lum - c / 2
    let r = 0
    let g = 0
    let b = 0
    if (hue < 60) {
        r = c
        g = x
    } else if (hue < 120) {
        r = x
        g = c
    } else if (hue < 180) {
        g = c
        b = x
    } else if (hue < 240) {
        g = x
        b = c
    } else if (hue < 300) {
        r = x
        b = c
    } else {
        r = c
        b = x
    }
    return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255, a }
}

function rgbToHsl(color: RGB): { h: number; s: number; l: number } {
    const r = clamp(color.r, 0, 255) / 255
    const g = clamp(color.g, 0, 255) / 255
    const b = clamp(color.b, 0, 255) / 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const l = (max + min) / 2
    if (max === min) return { h: 0, s: 0, l: l * 100 }
    const d = max - min
    const s = d / (1 - Math.abs(2 * l - 1))
    let h = 0
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    return { h: (((h * 60) % 360) + 360) % 360, s: s * 100, l: l * 100 }
}

/** Reads colours as `rgba(...)`, hex, or `hsl(...)`. */
function parseColor(input: unknown, fallback: RGB): RGB {
    if (typeof input !== "string") return fallback
    const value = input.trim().toLowerCase()
    if (!value) return fallback

    if (value.charAt(0) === "#") {
        const hex = value.slice(1)
        const pair = (i: number) => parseInt(hex.substr(i * 2, 2), 16)
        const single = (i: number) =>
            parseInt(hex.charAt(i) + hex.charAt(i), 16)
        if (hex.length === 3 || hex.length === 4) {
            return {
                r: single(0),
                g: single(1),
                b: single(2),
                a: hex.length === 4 ? single(3) / 255 : 1,
            }
        }
        if (hex.length === 6 || hex.length === 8) {
            return {
                r: pair(0),
                g: pair(1),
                b: pair(2),
                a: hex.length === 8 ? pair(3) / 255 : 1,
            }
        }
        return fallback
    }

    const parts = value.match(/-?[\d.]+/g)
    if (!parts || parts.length < 3) return fallback
    const n = parts.map(Number)
    if (n.some((v) => !isFinite(v))) return fallback
    if (value.indexOf("hsl") === 0) {
        return hslToRgb(n[0], n[1], n[2], parts.length > 3 ? n[3] : 1)
    }
    return { r: n[0], g: n[1], b: n[2], a: parts.length > 3 ? n[3] : 1 }
}

function mixRGB(a: RGB, b: RGB, t: number): RGB {
    const k = clamp(t, 0, 1)
    return {
        r: mix(a.r, b.r, k),
        g: mix(a.g, b.g, k),
        b: mix(a.b, b.b, k),
        a: mix(a.a, b.a, k),
    }
}

function rgba(color: RGB, alpha: number): string {
    return `rgba(${Math.round(clamp(color.r, 0, 255))}, ${Math.round(
        clamp(color.g, 0, 255)
    )}, ${Math.round(clamp(color.b, 0, 255))}, ${clamp(alpha, 0, 1).toFixed(3)})`
}

function cssColor(color: RGB): string {
    return rgba(color, color.a)
}

function toHex(color: RGB): string {
    const part = (v: number) =>
        Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")
    return `#${part(color.r)}${part(color.g)}${part(color.b)}`.toUpperCase()
}

/** The atmosphere one picture puts in the room: a pale wash of its own hue
 * for the ground, and two blobs a little brighter and a little turned. The
 * ground follows the picture's lightness part of the way, so a dark shot
 * gets a moodier room than a bright one without anyone choosing that. */
function moodFromTint(tint: RGB): Mood {
    const { h, s, l } = rgbToHsl(tint)
    const groundL = clamp(58 + l * 0.32, 44, 92)
    const groundS = clamp(s * 0.34, 0, 46)
    return {
        background: hslToRgb(h, groundS, groundL),
        blob1: hslToRgb(h, clamp(s * 0.66, 0, 84), clamp(groundL + 9, 0, 96)),
        blob2: hslToRgb(
            h + 28,
            clamp(s * 0.52, 0, 72),
            clamp(groundL + 3, 0, 94)
        ),
    }
}

/* ------------------------------------------------------------- item shapes */

function resolveSrc(value: ImageValue): string | null {
    if (!value) return null
    if (typeof value === "string") return value || null
    const src = value.src
    return typeof src === "string" && src ? src : null
}

function imageOf(item: ItemInput): string | null {
    if (item && typeof item === "object" && "image" in item)
        return resolveSrc((item as { image?: ImageValue }).image)
    return resolveSrc(item as ImageValue)
}

function offsetOf(item: ItemInput): number {
    if (item && typeof item === "object" && "offsetY" in item) {
        const offset = (item as { offsetY?: number }).offsetY
        return typeof offset === "number" && isFinite(offset) ? offset : 0
    }
    return 0
}

/** Stand-in artwork, built from the plate's own colour so the placeholder
 * and the mood it drives agree with each other. */
function placeholderFill(tint: RGB): string {
    const { h, s, l } = rgbToHsl(tint)
    const near = `hsl(${h.toFixed(0)} ${clamp(s, 14, 82).toFixed(0)}% ${clamp(
        l + 14,
        20,
        92
    ).toFixed(0)}%)`
    const far = `hsl(${(h + 34).toFixed(0)} ${clamp(s * 0.8, 10, 70).toFixed(
        0
    )}% ${clamp(l - 20, 8, 66).toFixed(0)}%)`
    return `linear-gradient(155deg, ${near}, ${far})`
}

/** One blob of the ground. The shader's falloff is a smoothstep and a CSS
 * gradient interpolates straight, so the curve is spelled out in stops at a
 * quarter, half and three quarters of the radius. `ellipse R% R%` rather
 * than `circle`: the original measures distance in UV, which is already
 * stretched to the frame, and a percentage radius stretches the same way. */
function blobLayer(color: RGB, cx: number, cy: number, radius: number): string {
    const x = (cx * 100).toFixed(2)
    // GLSL's UV runs up from the bottom, CSS percentages run down from the
    // top, so the blob would drift the wrong way without this.
    const y = ((1 - cy) * 100).toFixed(2)
    const r = (radius * 100).toFixed(2)
    return `radial-gradient(ellipse ${r}% ${r}% at ${x}% ${y}%, ${rgba(
        color,
        1
    )} 0%, ${rgba(color, 0.84)} 25%, ${rgba(color, 0.5)} 50%, ${rgba(
        color,
        0.16
    )} 75%, ${rgba(color, 0)} 100%)`
}

/** Average colour of a picture, weighted toward its saturated pixels — a
 * flat mean of every pixel comes back mud whatever the subject was. Kept
 * off the displayed `<img>`: this one asks for CORS, and a host that will
 * not grant it should cost us a palette, not the picture itself. */
function sampleTint(src: string): Promise<string | null> {
    return new Promise((resolve) => {
        const probe = new window.Image()
        probe.crossOrigin = "anonymous"
        probe.onerror = () => resolve(null)
        probe.onload = () => {
            try {
                const size = 12
                const canvas = document.createElement("canvas")
                canvas.width = size
                canvas.height = size
                const ctx = canvas.getContext("2d", {
                    willReadFrequently: true,
                })
                if (!ctx) {
                    resolve(null)
                    return
                }
                ctx.drawImage(probe, 0, 0, size, size)
                const data = ctx.getImageData(0, 0, size, size).data
                let r = 0
                let g = 0
                let b = 0
                let weight = 0
                for (let i = 0; i < data.length; i += 4) {
                    const pr = data[i]
                    const pg = data[i + 1]
                    const pb = data[i + 2]
                    const max = Math.max(pr, pg, pb)
                    const min = Math.min(pr, pg, pb)
                    const w = (max - min) / 255 + SAMPLE_FLOOR
                    r += pr * w
                    g += pg * w
                    b += pb * w
                    weight += w
                }
                if (weight <= 0) {
                    resolve(null)
                    return
                }
                resolve(
                    toHex({ r: r / weight, g: g / weight, b: b / weight, a: 1 })
                )
            } catch {
                // A picture served without CORS headers taints the canvas and
                // reading it throws. The room then stays on the frame's own
                // Background, which is the honest answer for a colour we were
                // never allowed to look at.
                resolve(null)
            }
        }
        probe.src = src
    })
}

/** Sampled palettes outlive a mount, so changing a control does not send
 * every picture back through the canvas. */
const tintCache = new Map<string, string>()

/** Everything the animation frame needs, refreshed on every render so the
 * rAF loop never has to be torn down and rebuilt when a control changes. */
interface Frame {
    plates: Plate[]
    count: number
    gap: number
    scaleK: number
    spreadPx: number
    ease: number
    wheelToSlot: number
    dragToSlot: number
    pointerAmount: number
    driftAmount: number
    breathTilt: number
    breathScale: number
    ground: RGB
    moodStrength: number
    blob1Radius: number
    blob2Radius: number
}

/* -------------------------------------------------------------- component */

export default function DepthGallery({
    images = DEFAULT_IMAGES,
    background = "#000000",
    depth = DEFAULTS.depth,
    spread = DEFAULTS.spread,
    cardWidth = DEFAULTS.cardWidth,
    cardHeight = DEFAULTS.cardHeight,
    radius = DEFAULTS.radius,
    mood,
    parallax,
    sensitivity = DEFAULTS.sensitivity,
    smoothing = DEFAULTS.smoothing,
    style,
}: DepthGalleryProps) {
    // Merge, so a panel object that is missing a field is still safe.
    const atmosphere = { ...DEFAULT_MOOD, ...mood }
    const response = { ...DEFAULT_PARALLAX, ...parallax }

    const containerRef = useRef<HTMLDivElement | null>(null)
    const groundRef = useRef<HTMLDivElement | null>(null)
    const plateNodes = useRef<(HTMLDivElement | null)[]>([])
    const target = useRef(0)
    const current = useRef(0)
    const pointerTarget = useRef({ x: 0, y: 0 })

    const [tints, setTints] = useState<Record<string, string>>({})
    const [grain, setGrain] = useState<string | null>(null)

    /* ---- every picture's colour has to come off the picture itself */
    const sources = useMemo(() => {
        const list: string[] = []
        const items = Array.isArray(images) ? images : []
        items.forEach((item) => {
            const src = imageOf(item)
            if (src && list.indexOf(src) === -1) list.push(src)
        })
        return list
    }, [images])

    // The list of URLs is the dependency, not the array identity that
    // callers may hand back new on every render.
    const sourceKey = sources.join("|")

    useEffect(() => {
        if (!sources.length) return
        let alive = true

        const cached: Record<string, string> = {}
        sources.forEach((src) => {
            const hit = tintCache.get(src)
            if (hit) cached[src] = hit
        })
        if (Object.keys(cached).length) {
            setTints((prev) => ({ ...prev, ...cached }))
        }

        sources
            .filter((src) => !tintCache.has(src))
            .forEach((src) => {
                sampleTint(src).then((hex) => {
                    if (!hex) return
                    tintCache.set(src, hex)
                    if (!alive) return
                    setTints((prev) =>
                        prev[src] === hex ? prev : { ...prev, [src]: hex }
                    )
                })
            })

        return () => {
            alive = false
        }
    }, [sourceKey])

    /* ---- grain tile. Built in an effect, never during render: a random
     * value on the first paint is a hydration mismatch waiting to happen. */
    useEffect(() => {
        const canvas = document.createElement("canvas")
        canvas.width = GRAIN_TILE
        canvas.height = GRAIN_TILE
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        const noise = ctx.createImageData(GRAIN_TILE, GRAIN_TILE)
        for (let i = 0; i < noise.data.length; i += 4) {
            const value = Math.round(Math.random() * 255)
            noise.data[i] = value
            noise.data[i + 1] = value
            noise.data[i + 2] = value
            noise.data[i + 3] = 255
        }
        ctx.putImageData(noise, 0, 0)
        setGrain(canvas.toDataURL())
    }, [])

    /* ---- the plates: the user's pictures, or the swatches when empty */
    const plates = useMemo<Plate[]>(() => {
        const items = Array.isArray(images) ? images : []
        const resolved: Plate[] = items.map((item) => {
            const src = imageOf(item)
            const tint = parseColor(
                src ? tints[src] : undefined,
                NEUTRAL_TINT
            )
            return {
                src,
                fill: src ? null : placeholderFill(tint),
                offsetY: offsetOf(item),
                mood: moodFromTint(tint),
            }
        })

        const list = resolved.length
            ? resolved
            : PLACEHOLDER_TINTS.map((swatch) => {
                  const tint = parseColor(swatch, NEUTRAL_TINT)
                  return {
                      src: null,
                      fill: placeholderFill(tint),
                      offsetY: 0,
                      mood: moodFromTint(tint),
                  }
              })

        // The dissolve is always between two plates, so a list of one has to
        // be given a second copy of itself to fly into. One picture then
        // loops through itself down the corridor rather than sitting still.
        return list.length === 1 ? [list[0], { ...list[0] }] : list
    }, [images, tints])

    /* ---- derived motion: abstract 0–10 scales mapped to real units */
    const perspective = Math.max(cardWidth, 120) * PERSPECTIVE_RATIO
    const gap = perspective * (GAP_MIN + (clamp(depth, 0, 10) / 10) * GAP_RANGE)
    // Card Width is what the focused plate measures on screen, so the plate
    // is cut oversize by exactly the perspective divide it is about to take
    // at the focus distance. Width, height, corner and spread all take it,
    // or the geometry would stop agreeing with itself.
    const scaleK = (perspective + gap) / perspective
    const plateWidth = Math.max(cardWidth, 1) * scaleK
    const plateHeight = Math.max(cardHeight, 1) * scaleK
    const wheelToSlot =
        (WHEEL_MIN + (clamp(sensitivity, 0, 10) / 10) * WHEEL_RANGE) /
        WHEEL_SPAN

    const frame = useRef<Frame | null>(null)
    frame.current = {
        plates,
        count: plates.length,
        gap,
        scaleK,
        spreadPx: (clamp(spread, 0, 10) / 10) * SPREAD_RANGE * cardWidth,
        ease: 0.16 - (clamp(smoothing, 0, 10) / 10) * 0.135,
        wheelToSlot,
        dragToSlot: wheelToSlot * DRAG_GAIN,
        pointerAmount: (clamp(response.pointer, 0, 10) / 10) * 0.11 * cardWidth,
        driftAmount: (clamp(response.drift, 0, 10) / 10) * 0.035 * cardHeight,
        breathTilt: (clamp(response.breath, 0, 10) / 5) * BREATH_TILT_DEG,
        breathScale: (clamp(response.breath, 0, 10) / 5) * BREATH_SCALE,
        ground: parseColor(background, { r: 255, g: 255, b: 255, a: 1 }),
        moodStrength: clamp(atmosphere.strength, 0, 10) / 10,
        blob1Radius:
            BLOB1_RADIUS * (0.5 + clamp(atmosphere.blobSize, 0, 10) / 10),
        blob2Radius:
            BLOB2_RADIUS * (0.5 + clamp(atmosphere.blobSize, 0, 10) / 10),
    }

    /* ---- the frame loop */
    useEffect(() => {
        let raf = 0
        let started = 0
        let previous = current.current
        let velocity = 0
        let breath = 0
        let drift = 0
        const pointer = { x: 0, y: 0 }

        /** Put one plate at one slot of the corridor. Everything positional
         * is read off `slot` and `ahead`, never off `index`: the same
         * picture is a different place in the corridor on every lap. */
        const place = (
            f: Frame,
            index: number,
            slot: number,
            opacity: number,
            ahead: number
        ) => {
            const node = plateNodes.current[index]
            if (!node) return
            const distance = ahead + VIEW_LEAD
            const z = -distance * f.gap
            const influence = opacity * (1 + distance * DEPTH_INFLUENCE)
            const side = wrap(slot, 2) === 0 ? -1 : 1
            const x =
                side * f.spreadPx * f.scaleK +
                pointer.x * f.pointerAmount * influence
            const y =
                pointer.y * f.pointerAmount * 0.5 * influence +
                drift * f.driftAmount
            const lean = breath * opacity
            const tiltX = -pointer.y * f.breathTilt * lean
            const tiltY = pointer.x * f.breathTilt * lean
            const pulse = 1 + f.breathScale * lean

            node.style.visibility = "visible"
            node.style.opacity = opacity.toFixed(3)
            node.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(
                2
            )}px, ${z.toFixed(2)}px) rotateX(${tiltX.toFixed(
                3
            )}deg) rotateY(${tiltY.toFixed(3)}deg) scale(${pulse.toFixed(4)})`
        }

        const tick = (now: number) => {
            raf = requestAnimationFrame(tick)
            const f = frame.current
            if (!f || f.count < 2) return
            if (!started) started = now
            const time = now - started

            current.current += (target.current - current.current) * f.ease

            // Nothing bounds the scroll, so the position is folded back onto
            // one lap once it leaves it. Target and previous move by the same
            // whole number of laps, or the lerp would jump and the velocity
            // would spike on the frame it happened.
            //
            // An odd list folds on two laps rather than one. The slot drives
            // the item through `count` and the side through 2, so the fold
            // has to be a whole number of both cycles — fold an odd list by
            // its own length and a plate flips sides on the frame it lands.
            const span = f.count % 2 === 0 ? f.count : f.count * 2
            if (current.current < -span || current.current > span) {
                const laps = Math.floor(current.current / span) * span
                current.current -= laps
                target.current -= laps
                previous -= laps
            }
            const position = current.current

            // Velocity is measured on the rendered position, not the target,
            // so a flick the lerp is still catching up on keeps the corridor
            // breathing after the wheel has stopped.
            const raw = position - previous
            previous = position
            velocity += (raw - velocity) * VELOCITY_DAMPING
            if (Math.abs(velocity) < 1e-6) velocity = 0
            const speed = clamp(Math.abs(velocity) / VELOCITY_MAX, 0, 1)
            const signed = clamp(velocity / VELOCITY_MAX, -1, 1)

            breath += (speed * BREATH_GAIN - breath) * BREATH_SMOOTHING
            drift += (signed - drift) * DRIFT_SMOOTHING
            pointer.x +=
                (pointerTarget.current.x - pointer.x) * POINTER_SMOOTHING
            pointer.y +=
                (pointerTarget.current.y - pointer.y) * POINTER_SMOOTHING

            const slot = Math.floor(position)
            const blend = position - slot
            const focus = wrap(slot, f.count)
            const following = wrap(slot + 1, f.count)

            /* -- plates. Only the pair is ever painted; everything else is
             * taken out of the compositor rather than left at zero alpha. */
            for (let i = 0; i < f.count; i += 1) {
                if (i === focus || i === following) continue
                const node = plateNodes.current[i]
                if (!node || node.style.visibility === "hidden") continue
                node.style.visibility = "hidden"
                node.style.opacity = "0"
            }
            place(f, focus, slot, 1 - blend, -blend)
            place(f, following, slot + 1, blend, 1 - blend)

        }

        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [])

    /* ---- wheel / trackpad. Consumed over the component's own bounds, so
     * the page will not scroll past the section while the cursor is inside
     * it — there is no end of the corridor to hand the scroll back at. */
    useEffect(() => {
        const node = containerRef.current
        if (!node) return
        const onWheel = (event: WheelEvent) => {
            const f = frame.current
            if (!f) return
            event.preventDefault()
            const delta =
                event.deltaMode === 1
                    ? event.deltaY * 16
                    : event.deltaMode === 2
                      ? event.deltaY * window.innerHeight
                      : event.deltaY
            target.current += delta * f.wheelToSlot
        }
        node.addEventListener("wheel", onWheel, { passive: false })
        return () => node.removeEventListener("wheel", onWheel)
    }, [])

    /* ---- pointer drag */
    useEffect(() => {
        const node = containerRef.current
        if (!node) return
        let active: number | null = null
        let lastY = 0

        const onDown = (event: PointerEvent) => {
            if (active !== null) return
            active = event.pointerId
            lastY = event.clientY
            node.setPointerCapture(event.pointerId)
        }
        const onMove = (event: PointerEvent) => {
            if (active !== event.pointerId) return
            const f = frame.current
            const dy = event.clientY - lastY
            lastY = event.clientY
            if (!f) return
            // Dragging up pulls the corridor toward the viewer, so the
            // camera advances — the same sign a wheel-down gives.
            target.current -= dy * f.dragToSlot
        }
        const onUp = (event: PointerEvent) => {
            if (active !== event.pointerId) return
            active = null
            if (node.hasPointerCapture(event.pointerId))
                node.releasePointerCapture(event.pointerId)
        }

        node.addEventListener("pointerdown", onDown)
        node.addEventListener("pointermove", onMove)
        node.addEventListener("pointerup", onUp)
        node.addEventListener("pointercancel", onUp)
        return () => {
            node.removeEventListener("pointerdown", onDown)
            node.removeEventListener("pointermove", onMove)
            node.removeEventListener("pointerup", onUp)
            node.removeEventListener("pointercancel", onUp)
        }
    }, [])

    /* ---- pointer parallax */
    useEffect(() => {
        const node = containerRef.current
        if (!node) return
        const onMove = (event: PointerEvent) => {
            const box = node.getBoundingClientRect()
            if (!box.width || !box.height) return
            pointerTarget.current.x =
                ((event.clientX - box.left) / box.width) * 2 - 1
            // Up is positive, matching the tilt it drives.
            pointerTarget.current.y = -(
                ((event.clientY - box.top) / box.height) * 2 -
                1
            )
        }
        const onLeave = () => {
            pointerTarget.current.x = 0
            pointerTarget.current.y = 0
        }
        node.addEventListener("pointermove", onMove)
        node.addEventListener("pointerleave", onLeave)
        return () => {
            node.removeEventListener("pointermove", onMove)
            node.removeEventListener("pointerleave", onLeave)
        }
    }, [])

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
                cursor: "grab",
                touchAction: "pan-x",
                userSelect: "none",
                ...style,
            }}
        >
            {/* the room: flat ground, two drifting blobs */}
            <div
                ref={groundRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    backgroundColor: background,
                    pointerEvents: "none",
                }}
            />

            {/* film grain. Static, as it is in the original — the noise is a
             * function of position alone there, so animating it would be a
             * change of look rather than a port of one. */}
            {grain && atmosphere.grain > 0 ? (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        backgroundImage: `url(${grain})`,
                        backgroundSize: `${GRAIN_TILE}px ${GRAIN_TILE}px`,
                        opacity:
                            (clamp(atmosphere.grain, 0, 10) / 10) * GRAIN_RANGE,
                        mixBlendMode: "overlay",
                        pointerEvents: "none",
                    }}
                />
            ) : null}

            {/* the corridor */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    perspective: `${perspective}px`,
                    perspectiveOrigin: "50% 50%",
                    transformStyle: "preserve-3d",
                    pointerEvents: "none",
                }}
            >
                {plates.map((plate, i) => (
                    <div
                        key={`plate-${i}-${plate.src || "fill"}`}
                        ref={(el) => {
                            plateNodes.current[i] = el
                        }}
                        style={{
                            position: "absolute",
                            left: "50%",
                            top: "50%",
                            width: plateWidth,
                            height: plateHeight,
                            // Centred with margins, not a static
                            // translate(-50%, -50%): the frame loop owns this
                            // element's `transform` and would overwrite it.
                            marginLeft: -plateWidth / 2,
                            marginTop: -plateHeight / 2,
                            borderRadius: Math.max(radius, 0) * scaleK,
                            overflow: "hidden",
                            background: plate.fill || undefined,
                            backfaceVisibility: "hidden",
                            visibility: "hidden",
                            opacity: 0,
                            willChange: "transform, opacity",
                        }}
                    >
                        {plate.src ? (
                            <img
                                src={plate.src}
                                alt=""
                                draggable={false}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    display: "block",
                                    objectFit: "cover",
                                    // `cover` already overflows the box on one
                                    // axis; this picks which part of that
                                    // overflow you see — as a share of it,
                                    // never as pixels, so every step of the
                                    // slider moves whatever picture it is.
                                    objectPosition: `50% ${
                                        50 - (plate.offsetY / 250) * 50
                                    }%`,
                                    pointerEvents: "none",
                                }}
                            />
                        ) : null}
                    </div>
                ))}
            </div>
        </div>
    )
}

DepthGallery.displayName = "Depth Gallery"
