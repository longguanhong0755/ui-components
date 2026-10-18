"use client"

import { useEffect, useMemo, useRef, type CSSProperties } from "react"
import * as THREE from "three"

/**
 * Wax Seal — a molten blob pours in, settles into a coin, and a die presses the
 * emblem into it. Polished-gold shading.
 *
 * The seal is not a model. One RGBA texture is baked on the CPU carrying four
 * scalar fields — outer wax height, stamp delta, well-floor mask, and a signed
 * distance to the silhouette — and the shaders read all four out of it. That is
 * what makes every knob on the panel cheap: the shape is data, so a change is a
 * rebake of one texture rather than a remesh.
 *
 * The reveal is a shape morph, never a crossfade. The silhouette's signed
 * distance is interpolated between a circle and the final lobed pour, so the
 * outline itself travels; and each physical layer (perimeter, rings, emblem) is
 * blurred on its own, so the rim can stay bubbly without melting the emblem.
 *
 * Rebuilt from a Framer codegen bundle: the maths below is the original's.
 * What was wrong with it was the shape of the file and of its panel — three
 * minified lines, no types, and fifty flat sliders with two-decimal steps.
 *
 * Sub-options are now grouped into modals behind the toggle that owns them, and
 * every slider is a whole number mapped to its effective value inside. Most of
 * the original panel turned out to have one good setting each and no useful
 * second one, so those live as constants — FIXED here, and a block of `const`s
 * at the top of the fragment shader — rather than as questions the panel asks.
 *
 * What is left: the emblem and its shape, the wax colour, the pour's outline,
 * and the Transition that times the reveal. The seal is lit by a single key
 * light that follows the pointer, and it reveals on entering view.
 */

/* ────────────────────────────── Maths helpers ───────────────────────────── */

function clamp(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, n))
}

/**
 * Panel sliders are whole numbers; this is what turns one into the value the
 * maths actually wants. Keeping the mapping in one place is what lets a slider
 * read 0–20 while the shader sees, say, 0.1–3.
 */
function map(v: any, lo: number, hi: number, fallback: number, span = 20): number {
    const n = typeof v === "number" ? v : parseFloat(v)
    const t = Number.isFinite(n) ? clamp(n, 0, span) : fallback
    return lo + (t / span) * (hi - lo)
}

function smoothstepJS(e0: number, e1: number, x: number): number {
    const t = clamp((x - e0) / Math.max(1e-6, e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)
}

/**
 * Quintic smootherstep — zero first AND second derivative at both ends.
 *
 * Plain smoothstep leaves a discontinuity in curvature at its ends, and since
 * these heights are differentiated into normals, that discontinuity shows up as a
 * visible crease under the specular.
 */
function smootherstepJS(e0: number, e1: number, x: number): number {
    const t = clamp((x - e0) / Math.max(1e-6, e1 - e0), 0, 1)
    return t * t * t * (t * (6 * t - 15) + 10)
}

/**
 * Cross-section of a raised feature: 0 = pointed, 1 = semicircular bubble,
 * 2 = broad flat crest.
 *
 * `edgeToCenter` is 0 at the feature's edge and 1 at its middle, so the same
 * profile serves the perimeter rim, the rings and the emblem.
 */
function crestProfile(edgeToCenter: number, shape: number): number {
    const q = clamp(edgeToCenter, 0, 1)
    const sharp = q
    const bubble = Math.sqrt(Math.max(0, 1 - Math.pow(1 - q, 2)))
    const flat = smootherstepJS(0, 0.62, q)
    const s = clamp(shape, 0, 2)
    return s <= 1 ? sharp + (bubble - sharp) * s : bubble + (flat - bubble) * (s - 1)
}

function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3)
}

/** Overshoots and settles — what gives the press its snap. */
function easeOutBack(t: number): number {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/* ──────────────────────────────── Transition ────────────────────────────── */

type Transition = {
    type?: string
    duration?: number
    ease?: string | number[]
}

const NAMED_EASES: Record<string, number[]> = {
    linear: [0, 0, 1, 1],
    ease: [0.25, 0.1, 0.25, 1],
    easeIn: [0.42, 0, 1, 1],
    easeOut: [0, 0, 0.58, 1],
    easeInOut: [0.42, 0, 0.58, 1],
    circIn: [0.55, 0, 1, 0.45],
    circOut: [0, 0.55, 0.45, 1],
    circInOut: [0.85, 0, 0.15, 1],
    backIn: [0.36, 0, 0.66, -0.56],
    backOut: [0.34, 1.56, 0.64, 1],
    backInOut: [0.68, -0.6, 0.32, 1.6],
    anticipate: [0.36, 0, 0.66, -0.56],
}

/**
 * The Transition control is sampled by hand — its ease becomes a cubic-bezier
 * lookup, solved per frame by Newton's method.
 *
 * The reveal is driven by shader uniforms rather than by a CSS transition or a
 * motion value, so there is nothing to hand a timing function to; the curve has
 * to be evaluated here. Springs have no closed form to sample and fall back to
 * easeInOut.
 */
function makeEaseFn(transition?: Transition) {
    let pts: number[] = NAMED_EASES.easeInOut
    const ease = transition?.ease
    if (Array.isArray(ease) && ease.length === 4 && ease.every(Number.isFinite)) {
        pts = ease as number[]
    } else if (typeof ease === "string" && NAMED_EASES[ease]) {
        pts = NAMED_EASES[ease]
    }
    const [x1, y1, x2, y2] = pts
    if (x1 === y1 && x2 === y2) return (t: number) => t

    const bez = (a: number, b: number, t: number) => {
        const u = 1 - t
        return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t
    }
    return (t: number) => {
        const x = clamp(t, 0, 1)
        let s = x
        for (let i = 0; i < 8; i++) {
            const cx = bez(x1, x2, s) - x
            const u = 1 - s
            const dx = 3 * u * u * x1 + 6 * u * s * (x2 - x1) + 3 * s * s * (1 - x2)
            if (Math.abs(dx) < 1e-6) break
            s = clamp(s - cx / dx, 0, 1)
        }
        return bez(y1, y2, s)
    }
}

/* ─────────────────────────────── Logo source ────────────────────────────── */

type ImageInput = { src?: string; srcSet?: string } | string | undefined

/**
 * The widest candidate in a ResponsiveImage's srcSet.
 *
 * The emblem is turned into a distance field, so it wants the most pixels going
 * in — picking the default `src` would hand the bake a thumbnail and the emblem
 * would come out with stepped edges.
 */
function bestImageSrc(logo: ImageInput): string {
    if (!logo) return ""
    if (typeof logo === "string") return logo
    const srcSet = logo.srcSet?.trim()
    if (srcSet) {
        let bestUrl = ""
        let bestW = 0
        for (const part of srcSet.split(",")) {
            const bits = part.trim().split(/\s+/)
            const url = bits[0]
            const w = parseInt(bits[1] || "0", 10) || 0
            if (url && w >= bestW) {
                bestW = w
                bestUrl = url
            }
        }
        if (bestUrl) return bestUrl
    }
    return logo.src || ""
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
        if (typeof window === "undefined") {
            resolve(null)
            return
        }
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => resolve(img)
        // A dead URL should cost the default emblem, not a broken seal.
        img.onerror = () => resolve(null)
        img.src = src
    })
}

/* ──────────────────────────── Silhouette + bake ─────────────────────────── */

/** Soft wax-pour silhouette: gentle rounded lobes, like pressed wax. */
function edgeRadius(
    angle: number,
    irregularity: number,
    lobes: number,
    seed: number
): number {
    const irr = clamp(irregularity, 0, 0.75)
    const n = Math.max(3, Math.min(12, Math.round(lobes)))
    const a = angle + seed * 0.35
    // Two harmonics rather than one, so the outline never reads as a flower.
    const lobe = Math.sin(a * n) * 0.6 + Math.sin(a * (n + 1) + 1.3) * 0.2
    return 1 + lobe * irr * 0.45
}

/** Generic rounded five-point star stroke — a neutral stand-in emblem. */
function drawDefaultLogoMask(ctx: CanvasRenderingContext2D, size: number) {
    const cx = size * 0.5
    const cy = size * 0.5
    const outer = size * 0.15
    const inner = outer * 0.52
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = "#fff"
    ctx.lineWidth = size * 0.02
    ctx.beginPath()
    for (let i = 0; i < 10; i++) {
        const rad = i % 2 === 0 ? outer : inner
        const a = -Math.PI / 2 + (i * Math.PI) / 5
        const px = cx + Math.cos(a) * rad
        const py = cy + Math.sin(a) * rad
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.stroke()
}

/** Fast separable box blur over one scalar height layer. */
function boxBlur(
    data: Float32Array,
    size: number,
    radius: number,
    passes: number
) {
    if (radius < 1) return
    const line = new Float32Array(size)
    const w = radius * 2 + 1
    // Three passes of a box approximate a Gaussian closely enough that the
    // difference cannot be seen in a normal map, at a fraction of the cost.
    for (let pass = 0; pass < passes; pass++) {
        for (let y = 0; y < size; y++) {
            const row = y * size
            for (let x = 0; x < size; x++) line[x] = data[row + x]
            let acc = 0
            for (let x = -radius; x <= radius; x++) acc += line[clamp(x, 0, size - 1)]
            for (let x = 0; x < size; x++) {
                data[row + x] = acc / w
                acc +=
                    line[Math.min(size - 1, x + radius + 1)] -
                    line[Math.max(0, x - radius)]
            }
        }
        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) line[y] = data[y * size + x]
            let acc = 0
            for (let y = -radius; y <= radius; y++) acc += line[clamp(y, 0, size - 1)]
            for (let y = 0; y < size; y++) {
                data[y * size + x] = acc / w
                acc +=
                    line[Math.min(size - 1, y + radius + 1)] -
                    line[Math.max(0, y - radius)]
            }
        }
    }
}

/**
 * Approximate Euclidean distance from every pixel of a region to its boundary,
 * in two sweeps.
 *
 * This is what allows the emblem to have a real cross-section. Blurring a flat
 * alpha mask would only round its edges; a distance field says how deep inside
 * the glyph each pixel is, which is exactly what the crest profile needs.
 */
function chamferDistance(
    mask: Uint8Array,
    size: number,
    region: number
): Float32Array {
    const dist = new Float32Array(size * size)
    const far = size * 2
    for (let i = 0; i < dist.length; i++) dist[i] = mask[i] === region ? far : 0
    const diagonal = Math.SQRT2
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const i = y * size + x
            if (dist[i] === 0) continue
            let d = dist[i]
            if (x > 0) d = Math.min(d, dist[i - 1] + 1)
            if (y > 0) d = Math.min(d, dist[i - size] + 1)
            if (x > 0 && y > 0) d = Math.min(d, dist[i - size - 1] + diagonal)
            if (x + 1 < size && y > 0) d = Math.min(d, dist[i - size + 1] + diagonal)
            dist[i] = d
        }
    }
    for (let y = size - 1; y >= 0; y--) {
        for (let x = size - 1; x >= 0; x--) {
            const i = y * size + x
            if (dist[i] === 0) continue
            let d = dist[i]
            if (x + 1 < size) d = Math.min(d, dist[i + 1] + 1)
            if (y + 1 < size) d = Math.min(d, dist[i + size] + 1)
            if (x + 1 < size && y + 1 < size)
                d = Math.min(d, dist[i + size + 1] + diagonal)
            if (x > 0 && y + 1 < size) d = Math.min(d, dist[i + size - 1] + diagonal)
            dist[i] = d
        }
    }
    return dist
}

/** Everything the bake needs, already mapped out of panel units. */
type BakeOptions = {
    size: number
    irregularity: number
    lobes: number
    shapeSeed: number
    rimWidth: number
    relief: number
    logoSize: number
    logoWeight: number
    logoRelief: number
    logoBevel: number
    logoCrest: number
    showRings: boolean
    ringCount: number
    ringSize: number
    ringSpacing: number
    ringWidth: number
    ringPeak: number
    ringRelief: number
    ringBevel: number
    ringCrest: number
    wellDepth: number
    edgeCrest: number
    edgeRoundness: number
    ringRoundness: number
    logoRoundness: number
    logoImg: HTMLImageElement | null
}

/**
 * Bake the whole seal into one RGBA texture:
 *
 *   R = outer wax height
 *   G = stamp delta (0.5 = none)
 *   B = well-floor mask, for material masking
 *   A = silhouette signed distance
 */
function buildSealTexture(opts: BakeOptions): Float32Array {
    const {
        size,
        irregularity,
        lobes,
        shapeSeed,
        rimWidth,
        relief,
        logoSize,
        logoWeight,
        logoRelief,
        logoBevel,
        logoCrest,
        showRings,
        ringCount,
        ringSize,
        ringSpacing,
        ringWidth,
        ringPeak,
        ringRelief,
        ringBevel,
        ringCrest,
        wellDepth,
        edgeCrest,
        edgeRoundness,
        ringRoundness,
        logoRoundness,
        logoImg,
    } = opts

    // A clean alpha mask only. Combining a fill with a stroke, or RGB with alpha,
    // lays two edges on top of each other and the emblem comes out double-ridged.
    const logoCanvas = document.createElement("canvas")
    logoCanvas.width = size
    logoCanvas.height = size
    const lctx = logoCanvas.getContext("2d")!
    const ls = clamp(logoSize, 5, 120) / 48

    let masked = false
    // Contrast inside the silhouette, -1…1, laid out like logoMask. A logo that
    // is one flat colour leaves this null.
    let logoInk: Float32Array | null = null
    if (logoImg) {
        const maxDim = size * 0.4 * ls
        const nw = Math.max(1, logoImg.naturalWidth || logoImg.width)
        const nh = Math.max(1, logoImg.naturalHeight || logoImg.height)
        const scale = maxDim / Math.max(nw, nh)
        const dw = Math.max(1, Math.round(nw * scale))
        const dh = Math.max(1, Math.round(nh * scale))
        const dx = Math.round((size - dw) / 2)
        const dy = Math.round((size - dh) / 2)
        lctx.drawImage(logoImg, dx, dy, dw, dh)

        try {
            // Only the drawn rectangle is inspected. Scanning the whole canvas
            // would find the transparent margin around the image every time and
            // call an opaque logo a cut-out one.
            const raw = lctx.getImageData(dx, dy, dw, dh)
            const px = raw.data
            let minA = 255
            for (let i = 0; i < px.length; i += 4) minA = Math.min(minA, px[i + 3])
            const hasTransparency = minA < 250

            /**
             * A cut-out logo is not always one flat colour. This one — a white
             * star on an orange disc — carries its silhouette in alpha and its
             * subject in ink, and a mask taken from alpha alone would press a
             * plain disc into the wax and lose the star entirely.
             *
             * So the silhouette still comes from alpha, and the contrast inside
             * it is kept separately as relief that rides on top. A logo that is
             * genuinely one colour has no contrast to find and is unaffected.
             */
            if (hasTransparency) {
                let sum = 0
                let count = 0
                for (let i = 0; i < px.length; i += 4) {
                    if (px[i + 3] < 128) continue
                    sum += (px[i] + px[i + 1] + px[i + 2]) / (255 * 3)
                    count++
                }
                if (count) {
                    const mean = sum / count
                    const ink = new Float32Array(size * size)
                    let peak = 0
                    for (let y = 0; y < dh; y++) {
                        for (let x = 0; x < dw; x++) {
                            const i = (y * dw + x) * 4
                            if (px[i + 3] < 128) continue
                            const lum = (px[i] + px[i + 1] + px[i + 2]) / (255 * 3)
                            const d = lum - mean
                            ink[(dy + y) * size + (dx + x)] = d
                            peak = Math.max(peak, Math.abs(d))
                        }
                    }
                    // Below this the logo is one colour to the eye, and what is
                    // left is compression noise rather than a subject.
                    if (peak > 0.08) {
                        for (let p = 0; p < ink.length; p++) ink[p] /= peak
                        logoInk = ink
                    }
                }
            }

            for (let i = 0; i < px.length; i += 4) {
                const a = px[i + 3] / 255
                const lum = (px[i] + px[i + 1] + px[i + 2]) / (255 * 3)
                // A cut-out logo carries its shape in alpha; a flat one carries
                // it in ink, so dark-on-light is inverted into the same mask.
                const v = hasTransparency ? a : 1 - lum
                const g = Math.round(clamp(v, 0, 1) * 255)
                px[i] = px[i + 1] = px[i + 2] = g
                px[i + 3] = g
            }
            lctx.clearRect(0, 0, size, size)
            lctx.putImageData(raw, dx, dy)
            masked = true
        } catch {
            // A host without CORS headers taints the canvas and getImageData
            // throws. The emblem cannot be read at all then, so it falls back
            // rather than baking a blank one.
            lctx.clearRect(0, 0, size, size)
        }
    }
    if (!masked) {
        lctx.save()
        lctx.translate(size / 2, size / 2)
        lctx.scale(ls, ls)
        lctx.translate(-size / 2, -size / 2)
        drawDefaultLogoMask(lctx, size)
        lctx.restore()
    }

    const logoPixels = lctx.getImageData(0, 0, size, size).data
    const logoMask = new Uint8Array(size * size)
    for (let p = 0; p < logoMask.length; p++)
        logoMask[p] = logoPixels[p * 4 + 3] >= 128 ? 1 : 0
    const logoInside = chamferDistance(logoMask, size, 1)
    const logoOutside = chamferDistance(logoMask, size, 0)
    let logoRadius = 1
    for (let p = 0; p < logoInside.length; p++)
        logoRadius = Math.max(logoRadius, logoInside[p])
    const logoWeightPx = size * clamp(logoWeight, -1, 4) * 0.006
    const logoCoreRadius = Math.max(1, logoRadius + logoWeightPx)
    const logoBevelPx = size * clamp(logoBevel, 0, 2) * 0.012

    /**
     * How far into the glyph the emboss climbs before it levels off.
     *
     * A stroked emblem is thin everywhere, so its deepest interior point is
     * only a few pixels in and the whole glyph is one crest. A solid shape is
     * hundreds of pixels thick, and normalising its cross-section by that
     * thickness spreads one crest across the entire shape — the height then
     * runs far past what the stamp channel can hold, clips flat, and only the
     * sloped band at the outline survives. Capping the rise fixes both ends:
     * the climb happens over a fixed distance from the shape's edge and
     * everything deeper is a plateau at full height, so a solid shape reads as
     * a raised shape with a bevelled rim rather than as an outline.
     */
    const logoRiseRadius = Math.min(logoCoreRadius, size * LOGO_RISE_CAP)

    const data = new Float32Array(size * size * 4)
    // Each physical layer is kept apart so it can be softened on its own.
    const edgeHeight = new Float32Array(size * size)
    const stampHeight = new Float32Array(size * size)
    const ringHeight = new Float32Array(size * size)
    const logoHeight = new Float32Array(size * size)

    const rimW = clamp(rimWidth, 3, 50) / 100
    const wellR = clamp(ringSize, 15, 85) / 100
    const seed = Math.round(shapeSeed)
    const nRings = showRings ? Math.max(0, Math.min(8, Math.round(ringCount))) : 0
    const spacing = clamp(ringSpacing, 0, 30) / 100

    // Width and bevel set the footprint; crest sets only its cross-section.
    const slope = 0.003 + clamp(ringBevel, 0, 2) * 0.027
    const ridgeRadius =
        0.004 + clamp(ringWidth, 0, 2) * 0.01 + clamp(ringPeak, 0, 2) * 0.008 + slope
    const rHeight = 0.025 + clamp(ringRelief, 0, 3) * 0.12
    const logoH =
        ((logoRiseRadius / size) * 2.2 * clamp(logoRelief, 0, 3)) /
        (0.34 * clamp(relief, 0.1, 3))
    const wellD = 0.035 + clamp(wellDepth, 0, 3) * 0.1
    const edgeRound = clamp(edgeRoundness, 0, 2)
    const ringRound = clamp(ringRoundness, 0, 2)
    const logoRound = clamp(logoRoundness, 0, 2)

    const ridgeProfile = (dist: number) => {
        const edgeToCenter = 1 - dist / Math.max(1e-6, ridgeRadius)
        return crestProfile(edgeToCenter, ringCrest)
    }

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const pi = (size - 1 - y) * size + x
            const i = pi * 4
            const nx = (x / (size - 1)) * 2 - 1
            const ny = (y / (size - 1)) * 2 - 1
            const r = Math.hypot(nx, ny)
            const angle = Math.atan2(ny, nx)
            const edge = 0.84 * edgeRadius(angle, irregularity, lobes, seed)
            const d = edge - r
            // The SDF range is deliberately wide (÷0.55) so the shadow can grow
            // well past the seal's own edge without running out of field.
            const sd = clamp(0.5 + d * 0.55, 0, 1)

            // Unstamped wax: the perimeter swells above the body, then settles
            // smoothly before the stamp's impression begins.
            const body = 0.48 * smootherstepJS(0, rimW * (0.2 + edgeRound * 0.08), d)
            const rimCenter = rimW * (0.46 + edgeRound * 0.05)
            const rimHalf = rimW * (0.5 + edgeRound * 0.3)
            const rimT = clamp(Math.abs(d - rimCenter) / Math.max(1e-6, rimHalf), 0, 1)
            const rimBell = crestProfile(1 - rimT, edgeCrest)
            const outer = body + 0.28 * rimBell

            // A metal die leaves one completely flat recessed field. Its outer
            // transition is the pinched annulus just outside the ring.
            const stampR = wellR + 0.065
            const stampBevel = 0.024 + ringRound * 0.012
            const stamped =
                1 - smootherstepJS(stampR - stampBevel, stampR + stampBevel, r)
            const pinchDist = Math.abs(r - stampR)
            const pinch = Math.pow(1 - smootherstepJS(0, 0.035 + stampBevel, pinchDist), 2)
            const stampDelta = -wellD * stamped - wellD * 0.22 * pinch

            if (nRings > 0) {
                for (let k = 0; k < nRings; k++) {
                    const rr = wellR - k * spacing
                    if (rr < 0.08) continue
                    const center = k === 0 ? wellR + 0.004 : rr
                    const amp = rHeight * (k === 0 ? 1.15 : 1 - k * 0.08)
                    ringHeight[pi] += amp * ridgeProfile(Math.abs(r - center))
                }
            }

            if (r < wellR - 0.04) {
                const lp = y * size + x
                const signedDistance =
                    (logoMask[lp] ? logoInside[lp] : -logoOutside[lp]) + logoWeightPx
                const edgeToCenter =
                    (signedDistance + logoBevelPx) / (logoRiseRadius + logoBevelPx)
                logoHeight[pi] = crestProfile(edgeToCenter, logoCrest) * logoH

                // The subject inside the silhouette stands on top of it, faded
                // in over the same distance the rim climbs so it never cuts
                // into the bevel.
                if (logoInk) {
                    const settled = smoothstepJS(0, logoRiseRadius, signedDistance)
                    logoHeight[pi] += logoInk[lp] * logoH * LOGO_INK_RELIEF * settled
                }
            }

            // Kept for material masking: this region is geometrically flat.
            const floor = stamped
            edgeHeight[pi] = outer
            stampHeight[pi] = stampDelta
            data[i + 2] = clamp(floor, 0, 1)
            data[i + 3] = sd
        }
    }

    // Softened independently, so the perimeter can stay bubbly without melting
    // the ring or the emblem.
    boxBlur(edgeHeight, size, Math.round(edgeRound * 12), 3)
    boxBlur(ringHeight, size, Math.round(ringRound * 9), 3)
    boxBlur(logoHeight, size, Math.round(logoRound * 9), 3)

    for (let p = 0; p < size * size; p++) {
        const i = p * 4
        const delta = stampHeight[p] + ringHeight[p] + logoHeight[p]
        data[i] = clamp(edgeHeight[p], 0, 1)
        data[i + 1] = clamp(0.5 + delta * 0.5, 0, 1)
    }
    return data
}

/* ─────────────────────────────── Shaders ────────────────────────────────── */

const SHARED_GLSL = `
    uniform sampler2D uMap;
    uniform float uSpread;  // 0 = molten ball, 1 = flat coin
    uniform float uLobe;    // 0 = round coin, 1 = lobed final silhouette
    uniform float uStamp;   // stamp detail press
    uniform float uRadius;  // current blob radius (plane units, 0..1)

    float ballDome(float r) {
        float x = clamp(r / max(uRadius, 1e-4), 0.0, 1.0);
        float dome = sqrt(max(0.0, 1.0 - x * x));
        float peak = mix(1.55, 0.66, uSpread);
        return dome * peak;
    }

    // Signed distance to the current silhouette: an SDF morph between the molten
    // ball's circle and the final lobed pour, so the outline itself travels —
    // never an alpha crossfade between two shapes.
    float edgeDist(vec2 uv) {
        vec2 p = uv * 2.0 - 1.0;
        float r = length(p);
        float dBall = uRadius - r;
        // A channel stores 0.5 + d*0.55 → decode
        float dFinal = (texture2D(uMap, uv).a - 0.5) / 0.55;
        return mix(dBall, dFinal, uLobe);
    }

    float compositeH(vec2 uv) {
        vec2 p = uv * 2.0 - 1.0;
        float r = length(p);
        vec4 t = texture2D(uMap, uv);
        float h = mix(ballDome(r), t.r, uSpread);
        float inside = smoothstep(0.0, 0.033, t.a - 0.5);
        h += (t.g - 0.5) * 2.0 * uStamp * inside;
        // Wax sinks smoothly to nothing at the moving edge
        h *= smoothstep(-0.015, 0.05, edgeDist(uv));
        return h;
    }

    float compositeA(vec2 uv) {
        return smoothstep(-0.012, 0.012, edgeDist(uv));
    }
`

const VERTEX_SHADER = `
    ${SHARED_GLSL}
    uniform float uDisp;
    varying vec2 vUv;
    void main() {
        vUv = uv;
        vec3 pos = position;
        pos.z += compositeH(uv) * uDisp;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`

const FRAGMENT_SHADER = `
    ${SHARED_GLSL}
    uniform vec3 uColor;
    uniform float uDisp;
    uniform float uFade;
    uniform float uTexel;
    uniform vec3 uLight;      // key light direction (uv space, z toward viewer)
    varying vec2 vUv;

    // Settled values, not knobs. Polished gold is one material, and every one of
    // these was a slider whose only good setting is the one below.
    const float GLOSS = 2.0;
    const float SPECULAR = 1.2;
    const float GOLD_DEPTH = 1.0;
    const float WARMTH = 0.0;
    const float SHEEN = 1.05;
    const float FILL_LIGHT = 1.05;
    const float LIGHT_SIZE = 3.0;
    const float EDGE_FOCUS = 0.7;
    // Normal strength and crevice AO — on a relief these two read as one thing,
    // so they move together.
    const float CONTRAST = 2.5;
    const float AO = 1.2;

    float specularLobe(vec3 normal, vec3 view, vec3 lightDir, float tightPower, float broadPower) {
        float ndh = max(dot(normal, normalize(lightDir + view)), 0.0);
        float tight = pow(ndh, tightPower) * (tightPower + 2.0) / 60.0;
        float broad = pow(ndh, broadPower) * (broadPower + 2.0) / 17.0;
        return tight * 1.15 + broad * 0.18 * SHEEN;
    }

    void main() {
        float alpha = compositeA(vUv) * uFade;
        if (alpha < 0.01) discard;

        // Per-pixel normals from the animated height field
        float e = uTexel * 1.6;
        float hC = compositeH(vUv);
        float hR = compositeH(vUv + vec2(e, 0.0));
        float hL = compositeH(vUv - vec2(e, 0.0));
        float hU = compositeH(vUv + vec2(0.0, e));
        float hD = compositeH(vUv - vec2(0.0, e));
        // world slope: plane spans 2.2 units over uv 0..1
        float k = uDisp / 2.2 / (2.0 * e) * CONTRAST;
        vec3 n = normalize(vec3(-(hR - hL) * k, -(hU - hD) * k, 1.0));

        // Cheap crevice AO
        float e2 = uTexel * 7.0;
        float occ = 0.0;
        occ += max(0.0, compositeH(vUv + vec2(e2, 0.0)) - hC);
        occ += max(0.0, compositeH(vUv - vec2(e2, 0.0)) - hC);
        occ += max(0.0, compositeH(vUv + vec2(0.0, e2)) - hC);
        occ += max(0.0, compositeH(vUv - vec2(0.0, e2)) - hC);
        float ao = 1.0 - clamp(occ * AO, 0.0, 0.4);

        // Polished gold: key light plus a weak warm fill from the opposite side
        vec3 L = normalize(uLight);
        vec3 V = vec3(0.0, 0.0, 1.0);
        float lit = dot(n, L) * 0.5 + 0.5;
        float fill = max(dot(n, normalize(vec3(-uLight.x, -uLight.y, 0.35))), 0.0);

        vec3 deepGold = mix(uColor * 0.26, vec3(0.28, 0.16, 0.02), 0.55);
        vec3 deep = mix(uColor * 0.58, deepGold, min(GOLD_DEPTH, 1.0));
        deep *= 1.0 - max(GOLD_DEPTH - 1.0, 0.0) * 0.22;
        vec3 mid = uColor;
        vec3 coolHighlight = mix(uColor, vec3(1.0, 0.98, 0.9), 0.85);
        vec3 warmHighlight = mix(uColor * 1.15, vec3(1.0, 0.78, 0.3), 0.42);
        vec3 hi = mix(coolHighlight, warmHighlight, WARMTH);

        // Flat top-facing surfaces read as mid gold; highlights only where
        // normals tilt toward the key light, shadows where they tilt away
        vec3 base = mix(deep, mid, smoothstep(0.42, 0.8, lit));
        base = mix(base, hi, smoothstep(0.88, 1.0, lit));
        base += mid * fill * 0.28 * FILL_LIGHT;

        float slope = length(n.xy);
        float perimeter = 1.0 - smoothstep(0.07, 0.27, edgeDist(vUv));
        float reliefOnly = smoothstep(0.025, 0.22, slope);
        float focusMask = mix(1.0, perimeter * 1.25 + reliefOnly * 0.12, EDGE_FOCUS);
        float tightPower = 10.0 + GLOSS * 70.0;
        float broadPower = 3.0 + GLOSS * 14.0;
        vec3 lightTangent = normalize(vec3(-L.y, L.x, 0.0));
        vec3 lightBitangent = normalize(cross(L, lightTangent));
        float spread = LIGHT_SIZE * 0.36;
        float areaSpec = specularLobe(n, V, L, tightPower, broadPower);
        areaSpec += specularLobe(n, V, normalize(L + lightTangent * spread), tightPower, broadPower);
        areaSpec += specularLobe(n, V, normalize(L - lightTangent * spread), tightPower, broadPower);
        areaSpec += specularLobe(n, V, normalize(L + lightBitangent * spread), tightPower, broadPower);
        areaSpec += specularLobe(n, V, normalize(L - lightBitangent * spread), tightPower, broadPower);
        float areaPeak = 1.0 / (1.0 + LIGHT_SIZE * 0.3);
        float spec = areaSpec * 0.2 * areaPeak * SPECULAR * focusMask;

        vec3 coolSpec = vec3(1.0, 0.97, 0.88);
        vec3 warmSpec = mix(vec3(1.0, 0.82, 0.42), uColor * 1.22, 0.35);
        vec3 col = base + spec * mix(coolSpec, warmSpec, WARMTH);
        col *= ao;

        gl_FragColor = vec4(col, alpha);
    }
`

/* ──────────────────────────────── Defaults ──────────────────────────────── */

/**
 * One DEFAULTS drives the destructure fallbacks, the modal defaults and the
 * control defaults. Sliders are whole numbers here — the mapping to effective
 * values happens in one place, further down.
 */
const DEFAULTS = {
    waxColor: "#FFE800",
    logo: {
        size: 50,
        weight: 12,
    },
    rings: false,
    ring: {
        count: 1,
        size: 58,
        gap: 6,
    },
    shape: {
        wellDepth: 10,
        rimWidth: 19,
        edgeWarp: 5,
        lobes: 8,
    },
    replay: true,
    transition: {
        type: "tween",
        duration: 0.9,
        ease: [0.4, 0, 0.2, 1],
    } as Transition,
}

/**
 * The cross-section knobs, and the ones that only ever wanted a single good
 * setting. Every one of these used to be a panel slider; each is kept at the
 * effective value the shipped defaults produced, so nothing about the seal
 * looks different — the panel is just no longer asking about it.
 */
const FIXED = {
    // Overall relief of the wax, and how far the emblem and the rings stand out
    // of it. Each raised feature's cross-section follows below.
    relief: 0.45,
    logoRelief: 0.6,
    ringRelief: 0.6,
    logoBevel: 0.1,
    logoCrest: 1,
    logoSoftness: 0.4,
    ringWidth: 1,
    ringPeak: 1,
    ringBevel: 0.2,
    ringCrest: 1,
    ringSoftness: 0.3,
    rimCrest: 1,
    rimSoftness: 0.9,
    // The silhouette's random variation is seeded once. It was a panel value,
    // but one warped outline is as good as another.
    shapeSeed: 0,
    // The bearing the key light falls back to until the pointer has been seen.
    lightAngle: 139,
    // Degrees above the seal — low, so the relief casts along its own surface.
    lightHeight: 21,
}

// Resolution of the baked texture. High enough that the emblem's distance field
// has room, and it is baked once per shape change rather than per frame.
const TEXTURE_SIZE = 768

// How far in from the emblem's outline the emboss climbs, as a share of the
// texture. A stroked glyph is thinner than this and is unaffected; a solid one
// levels off here instead of doming across its whole width.
const LOGO_RISE_CAP = 0.03

// Height of the detail inside a silhouette, against the silhouette's own. Under
// 1 so the subject reads as sitting on the shape rather than replacing it.
const LOGO_INK_RELIEF = 0.7

// The emblem pressed into the wax when the panel has no image on it.
const FALLBACK_LOGO =
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/64c33201-edce-4ee4-1b30-a008a365fa00/w=800"

interface WaxSealProps {
    waxColor: string
    logo: ImageInput
    logoStyle: Partial<typeof DEFAULTS.logo>
    rings: boolean
    ring: Partial<typeof DEFAULTS.ring>
    shape: Partial<typeof DEFAULTS.shape>
    replay: boolean
    transition: Transition
    style?: CSSProperties
}

export default function WaxSeal(props: Partial<WaxSealProps>) {
    const {
        waxColor = DEFAULTS.waxColor,
        logo,
        rings = DEFAULTS.rings,
        replay = DEFAULTS.replay,
        style,
    } = props

    // An Object control hands back only the keys the user has touched, so each
    // modal is merged over its defaults rather than read raw — a missing key
    // would otherwise arrive as undefined and clamp to a fallback silently.
    const L = { ...DEFAULTS.logo, ...(props.logoStyle ?? {}) }
    const R = { ...DEFAULTS.ring, ...(props.ring ?? {}) }
    const S = { ...DEFAULTS.shape, ...(props.shape ?? {}) }
    const T: Transition = { ...DEFAULTS.transition, ...(props.transition ?? {}) }
    const easeFn = useMemo(() => makeEaseFn(T), [T.ease])

    const mountRef = useRef<HTMLDivElement | null>(null)
    const cursorPositionRef = useRef<{ x: number; y: number } | null>(null)
    const dynamicLightRef = useRef({ x: 0, y: 0 })
    const isStatic = false

    const logoSrc = bestImageSrc(logo) || FALLBACK_LOGO

    /**
     * Everything the bake depends on, mapped out of panel units.
     *
     * Held in one memo so the effect can key off a single string: the bake walks
     * 768² pixels four times over, and re-running it because a colour changed
     * would be the most expensive thing this component ever does.
     */
    const bake = useMemo(
        () => ({
            size: TEXTURE_SIZE,
            relief: FIXED.relief,
            irregularity: map(S.edgeWarp, 0, 0.75, DEFAULTS.shape.edgeWarp),
            lobes: clamp(Math.round(S.lobes), 3, 12),
            shapeSeed: FIXED.shapeSeed,
            rimWidth: clamp(Math.round(S.rimWidth), 3, 50),
            edgeCrest: FIXED.rimCrest,
            edgeRoundness: FIXED.rimSoftness,
            wellDepth: map(S.wellDepth, 0, 3, DEFAULTS.shape.wellDepth),
            logoSize: clamp(Math.round(L.size), 5, 120),
            logoWeight: map(L.weight, -1, 4, DEFAULTS.logo.weight),
            logoRelief: FIXED.logoRelief,
            logoBevel: FIXED.logoBevel,
            logoCrest: FIXED.logoCrest,
            logoRoundness: FIXED.logoSoftness,
            showRings: !!rings,
            ringCount: clamp(Math.round(R.count), 1, 8),
            ringSize: clamp(Math.round(R.size), 15, 85),
            ringSpacing: clamp(Math.round(R.gap), 0, 30),
            ringRelief: FIXED.ringRelief,
            ringWidth: FIXED.ringWidth,
            ringPeak: FIXED.ringPeak,
            ringBevel: FIXED.ringBevel,
            ringCrest: FIXED.ringCrest,
            ringRoundness: FIXED.ringSoftness,
        }),
        [
            rings,
            S.edgeWarp,
            S.lobes,
            S.rimWidth,
            S.wellDepth,
            L.size,
            L.weight,
            R.count,
            R.size,
            R.gap,
        ]
    )
    const bakeKey = `${logoSrc}|${JSON.stringify(bake)}|${isStatic}`

    /**
     * Live values, read by the render loop.
     *
     * Everything here is a uniform write, so changing any of it never rebakes the
     * texture and never tears the WebGL context down.
     */
    const liveRef = useRef<any>(null)
    liveRef.current = {
        waxColor,
        replay: replay !== false,
        // Straight out of the Transition, in seconds.
        revealDuration: clamp(T.duration ?? 0.7, 0.1, 20),
        easeFn,
        isStatic,
    }

    /* ── Pointer, which the key light follows ──────────────────────────── */
    useEffect(() => {
        if (typeof window === "undefined") return
        const onPointerMove = (event: PointerEvent) => {
            cursorPositionRef.current = { x: event.clientX, y: event.clientY }
            // The loop draws on demand, so a new pointer position has to ask
            // for the frame that will show it.
            if (!liveRef.current.isStatic)
                (mountRef.current as any)?.__waxApi?.invalidate()
        }
        window.addEventListener("pointermove", onPointerMove, { passive: true })
        return () => window.removeEventListener("pointermove", onPointerMove)
    }, [])

    /* ── Scene ─────────────────────────────────────────────────────────── */
    useEffect(() => {
        if (typeof window === "undefined" || !mountRef.current) return
        const mount = mountRef.current

        let disposed = false
        let raf = 0
        let renderer: THREE.WebGLRenderer | null = null
        let ro: ResizeObserver | null = null
        let io: IntersectionObserver | null = null
        let isVisible = liveRef.current.isStatic
        let hiddenAt = 0
        let requestRender = () => {}
        const disposables: Array<{ dispose: () => void }> = []

        const api = { play: () => {}, reset: () => {}, invalidate: () => {} }
        ;(mount as any).__waxApi = api

        ;(async () => {
            const logoImg = logoSrc ? await loadImage(logoSrc) : null
            if (disposed || !mount) return

            renderer = new THREE.WebGLRenderer({
                alpha: true,
                antialias: true,
                powerPreference: "high-performance",
            })
            renderer.setPixelRatio(Math.min(2.5, window.devicePixelRatio || 1))
            renderer.setClearColor(0x000000, 0)
            renderer.outputColorSpace = THREE.SRGBColorSpace
            renderer.domElement.style.display = "block"
            renderer.domElement.style.width = "100%"
            renderer.domElement.style.height = "100%"
            mount.appendChild(renderer.domElement)

            const scene = new THREE.Scene()
            // Orthographic and looking straight down: the seal is read as a relief
            // lit from the side, so any perspective would fight the illusion.
            const viewSize = 1.18
            const camera = new THREE.OrthographicCamera(
                -viewSize,
                viewSize,
                viewSize,
                -viewSize,
                0.1,
                40
            )
            camera.position.set(0, 8, 0)
            camera.rotation.order = "YXZ"
            camera.rotation.set(-Math.PI / 2, 0, 0)

            const sealData = buildSealTexture({ ...bake, logoImg })

            // Half-float, because 8-bit heights show visible stair-stepping once
            // they are differentiated into normals.
            const half = new Uint16Array(sealData.length)
            for (let i = 0; i < sealData.length; i++)
                half[i] = THREE.DataUtils.toHalfFloat(sealData[i])
            const sealTex = new THREE.DataTexture(
                half,
                TEXTURE_SIZE,
                TEXTURE_SIZE,
                THREE.RGBAFormat,
                THREE.HalfFloatType
            )
            sealTex.flipY = false
            sealTex.minFilter = THREE.LinearFilter
            sealTex.magFilter = THREE.LinearFilter
            sealTex.wrapS = THREE.ClampToEdgeWrapping
            sealTex.wrapT = THREE.ClampToEdgeWrapping
            sealTex.needsUpdate = true
            disposables.push(sealTex)

            const live = liveRef.current
            // The shader's maths is authored in sRGB, so the sRGB components are
            // recovered from the colour three has already managed.
            const srgb = new THREE.Color(live.waxColor).convertLinearToSRGB()

            const material = new THREE.ShaderMaterial({
                uniforms: {
                    uMap: { value: sealTex },
                    uColor: { value: srgb },
                    uDisp: { value: 0.34 * FIXED.relief },
                    uTexel: { value: 1 / TEXTURE_SIZE },
                    uLight: { value: new THREE.Vector3(-0.48, 0.58, 0.62) },
                    uSpread: { value: 1 },
                    uLobe: { value: 1 },
                    uStamp: { value: 1 },
                    uRadius: { value: 0.7 },
                    uFade: { value: 1 },
                },
                vertexShader: VERTEX_SHADER,
                fragmentShader: FRAGMENT_SHADER,
                transparent: true,
                depthWrite: true,
            })
            disposables.push(material)

            // The height field is applied in the vertex shader as well as read in
            // the fragment one, so the silhouette has real relief at its rim —
            // which needs actual vertices to move.
            const segments = 220
            const geo = new THREE.PlaneGeometry(2.2, 2.2, segments, segments)
            disposables.push(geo)
            const seal = new THREE.Mesh(geo, material)
            seal.rotation.x = -Math.PI / 2
            const group = new THREE.Group()
            group.add(seal)
            scene.add(group)

            const resize = () => {
                if (!renderer || !mount) return
                // clientWidth, not a bounding rect: it's read after any container
                // transform, so it reports untransformed layout pixels.
                const w = Math.max(1, mount.clientWidth)
                const h = Math.max(1, mount.clientHeight)
                renderer.setSize(w, h, false)
                const aspect = w / h
                if (aspect >= 1) {
                    camera.left = -viewSize * aspect
                    camera.right = viewSize * aspect
                    camera.top = viewSize
                    camera.bottom = -viewSize
                } else {
                    camera.left = -viewSize
                    camera.right = viewSize
                    camera.top = viewSize / aspect
                    camera.bottom = -viewSize / aspect
                }
                camera.updateProjectionMatrix()
                requestRender()
            }
            resize()
            ro = new ResizeObserver(resize)
            ro.observe(mount)

            let playing = false
            let t0 = 0
            let progress = live.isStatic ? 1 : 0
            let hasPlayed = live.isStatic

            /**
             * Two-beat reveal: pour a molten blob that settles, then press it.
             *
             * The beats overlap deliberately. The lobes are only about half formed
             * when the press finishes, and their remaining travel creeps through
             * the long tail — which is what reads as hot wax setting rather than
             * as an animation ending.
             */
            const applyPose = (p: number) => {
                // The Transition's own curve, sampled here — the reveal is
                // uniforms, so there is nothing to hand a timing function to.
                const pe = liveRef.current.easeFn(p)
                const fade = smoothstepJS(0, 0.05, pe)

                // Beat 1 — dribble (0→48%): a small circular drop accumulates and
                // settles. It stays round and featureless until impact.
                const pour = smoothstepJS(0, 0.48, pe)
                const pourEase = easeOutCubic(pour)
                const jiggle = Math.sin(pour * Math.PI * 3) * (1 - pour) * (1 - pour) * 0.035
                const blobRadius = 0.12 + 0.34 * pourEase + jiggle

                // Beat 2 — press (52→72%): the die creates the well, rings and
                // emblem while displacing most of the wax.
                const press = smoothstepJS(0.52, 0.72, pe)
                const pressEase = easeOutCubic(press)
                const radius = blobRadius + (0.72 - blobRadius) * pressEase
                const spread = 0.12 * pour + 0.88 * easeInOutCubic(press)
                const stamp = easeOutBack(press)
                const squish = Math.sin(press * Math.PI) * 0.045

                const lobeTime = clamp((pe - 0.52) / 0.48, 0, 1)
                const lobe = 1 - Math.pow(1 - lobeTime, 1.45)

                material.uniforms.uFade.value = fade
                material.uniforms.uSpread.value = spread
                material.uniforms.uRadius.value = radius
                material.uniforms.uLobe.value = lobe
                material.uniforms.uStamp.value = stamp
                group.scale.setScalar(1 + squish)
            }

            const play = () => {
                playing = true
                progress = 0
                hasPlayed = true
                t0 = performance.now()
                requestRender()
            }
            const reset = () => {
                playing = false
                progress = 0
                hasPlayed = false
                applyPose(0)
                requestRender()
            }
            api.play = play
            api.reset = reset
            applyPose(progress)

            io = new IntersectionObserver(
                (entries) => {
                    const entry = entries[0]
                    const nextVisible = !!(
                        entry &&
                        entry.isIntersecting &&
                        entry.intersectionRatio >= 0.01
                    )
                    const becameVisible = nextVisible && !isVisible
                    const becameHidden = !nextVisible && isVisible
                    isVisible = nextVisible
                    const p = liveRef.current
                    if (p.isStatic) return

                    if (becameHidden) {
                        if (raf) {
                            cancelAnimationFrame(raf)
                            raf = 0
                        }
                        if (playing) hiddenAt = performance.now()
                        if (p.replay) reset()
                        return
                    }
                    if (becameVisible) {
                        // Time spent off screen is given back rather than counted,
                        // so a reveal scrolled past and returned to does not jump
                        // to wherever the clock got to.
                        if (hiddenAt && playing) {
                            t0 += performance.now() - hiddenAt
                            hiddenAt = 0
                        }
                        // The reveal always plays on entering view; Replay
                        // decides whether it does so more than once.
                        if (!hasPlayed || p.replay) play()
                        else requestRender()
                    }
                },
                { threshold: [0, 0.01] }
            )
            io.observe(mount)

            const tick = (now: number) => {
                if (disposed || !renderer) return
                raf = 0
                const p = liveRef.current
                if (!isVisible && !p.isStatic) return

                material.uniforms.uColor.value.set(p.waxColor).convertLinearToSRGB()

                // The key light follows the pointer. Until one has been seen, it
                // rests at the fixed bearing instead.
                const restRad = (FIXED.lightAngle * Math.PI) / 180
                let targetX = Math.cos(restRad)
                let targetY = Math.sin(restRad)
                const cursor = p.isStatic ? null : cursorPositionRef.current
                if (cursor) {
                    const rect = mount.getBoundingClientRect()
                    const dx = cursor.x - (rect.left + rect.width / 2)
                    const dy = cursor.y - (rect.top + rect.height / 2)
                    const length = Math.hypot(dx, dy)
                    if (length > 1) {
                        targetX = dx / length
                        targetY = dy / length
                    }
                }

                // The light chases its target rather than snapping to it, so a
                // cursor flick sweeps the highlight instead of teleporting it.
                const dynamicLight = dynamicLightRef.current
                const lightDelta = Math.hypot(
                    targetX - dynamicLight.x,
                    targetY - dynamicLight.y
                )
                if (dynamicLight.x === 0 && dynamicLight.y === 0) {
                    dynamicLight.x = targetX
                    dynamicLight.y = targetY
                } else {
                    dynamicLight.x += (targetX - dynamicLight.x) * 0.12
                    dynamicLight.y += (targetY - dynamicLight.y) * 0.12
                }
                const rad = Math.atan2(dynamicLight.y, dynamicLight.x)
                const elevation = (FIXED.lightHeight * Math.PI) / 180
                const planar = Math.cos(elevation)
                material.uniforms.uLight.value.set(
                    Math.cos(rad) * planar,
                    Math.sin(rad) * planar,
                    Math.sin(elevation)
                )

                if (playing) {
                    const dur = Math.max(0.05, p.revealDuration) * 1000
                    progress = clamp((now - t0) / dur, 0, 1)
                    applyPose(progress)
                    if (progress >= 1) playing = false
                }

                renderer.render(scene, camera)
                // Drawn on demand, not continuously: a seal at rest is a still
                // image, and the only reasons to keep going are an unfinished
                // reveal or a light still travelling.
                if (playing || (!p.isStatic && lightDelta > 0.001)) requestRender()
            }

            requestRender = () => {
                if (
                    disposed ||
                    !renderer ||
                    raf ||
                    (!isVisible && !liveRef.current.isStatic)
                )
                    return
                raf = requestAnimationFrame(tick)
            }
            api.invalidate = requestRender
            requestRender()
        })()

        return () => {
            disposed = true
            cancelAnimationFrame(raf)
            io?.disconnect()
            ro?.disconnect()
            mount.querySelector("canvas")?.remove()
            // Disposed by name and exactly once. Walking the scene would hand the
            // one shared texture to dispose() several times over.
            for (const d of disposables) d.dispose()
            renderer?.dispose()
            renderer = null
        }
    }, [bakeKey, bake, logoSrc])

    // A colour or light change only needs one more frame drawn, so it pokes the
    // loop rather than rebuilding anything.
    useEffect(() => {
        ;(mountRef.current as any)?.__waxApi?.invalidate()
    }, [
        waxColor,
        replay,
        props.transition,
    ])

    return (
        <div
            ref={mountRef}
            role="img"
            aria-label="Wax seal"
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                ...style,
            }}
        />
    )
}

WaxSeal.displayName = "Wax Seal"
