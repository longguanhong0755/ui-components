"use client"

import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"

// Rule 8b: Speed is a bare dial where 50 is the rate the scene shipped at, and it
// is SIGNED because the spin has a direction — a negative value spins the globe the
// other way. Rule 8b puts the direction on the sign of Speed rather than on a second
// enum, since a Direction dial next to a Speed dial is one motion split across two
// rows and rule 1 bars the duplicate.
const SPIN_AT_50 = 1.1 // rad/sec — ~5.7 s per revolution
// Detail 100% is the shipped band size, in fbm cycles per sphere radius. Low on
// purpose: the look is long contiguous runs of one character, not a per-cell
// scramble, and a band has to survive being quantized into whole cells.
const FREQ_AT_100 = 1.15
// Glyphs are quantized to N directions, so the field has nothing to say between
// these steps — computing it at 30 Hz halves the cost and looks identical.
const FIELD_MS = 33
// Light: upper-left and toward the viewer, which is what puts the dense band in
// the same corner as the reference frame.
const LX = -0.42
const LY = 0.55
const LZ = 0.72
// The bearing the flame streams at with no rotation applied, measured from the
// alpha-weighted centroid of the drawn cells to the centroid of the voids, averaged
// over a full revolution. Direction is an ABSOLUTE compass dial, so this is what it
// subtracts to make its own number mean what it says.
const STREAM_BASE_DEG = 138
// Tangent step for the forward-difference gradient, in unit-sphere units.
const GRAD_EPS = 0.09
// Glyph height as a fraction of the cell. Cells are square and monospace glyphs
// are narrow, so the matrix reads spaced-out horizontally — that is the look.
const GLYPH_FRAC = 0.86
const MAX_GLYPHS = 24
// Direction bins run from φ = -π counter-clockwise, so index 0 is "points left"
// and index N/2 is "points right".
const DEFAULT_GLYPHS = "<Cv/>U-\\"

// ---- 3D value noise -------------------------------------------------------

function hash3(i: number, j: number, k: number) {
    let n = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1274126177)
    n = Math.imul(n ^ (n >>> 13), 1274126177)
    n = n ^ (n >>> 16)
    return (n >>> 0) / 4294967295
}

function vnoise(x: number, y: number, z: number) {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const zi = Math.floor(z)
    let fx = x - xi
    let fy = y - yi
    let fz = z - zi
    fx = fx * fx * (3 - 2 * fx)
    fy = fy * fy * (3 - 2 * fy)
    fz = fz * fz * (3 - 2 * fz)
    const c000 = hash3(xi, yi, zi)
    const c100 = hash3(xi + 1, yi, zi)
    const c010 = hash3(xi, yi + 1, zi)
    const c110 = hash3(xi + 1, yi + 1, zi)
    const c001 = hash3(xi, yi, zi + 1)
    const c101 = hash3(xi + 1, yi, zi + 1)
    const c011 = hash3(xi, yi + 1, zi + 1)
    const c111 = hash3(xi + 1, yi + 1, zi + 1)
    const x00 = c000 + (c100 - c000) * fx
    const x10 = c010 + (c110 - c010) * fx
    const x01 = c001 + (c101 - c001) * fx
    const x11 = c011 + (c111 - c011) * fx
    const y0 = x00 + (x10 - x00) * fy
    const y1 = x01 + (x11 - x01) * fy
    return y0 + (y1 - y0) * fz
}

// Two octaves, weighted 86/14 rather than the usual 68/32. The glyph is chosen
// from this field's GRADIENT, and differentiating multiplies each octave by its
// own frequency — at 68/32 the fine octave contributes 0.32 x 2.3 = 0.74 against
// the base octave's 0.68, so it wins the direction and the sphere renders as
// per-cell speckle instead of banding. 14% keeps a little texture in the void
// mask (which reads the value, not the gradient) at a 2.5:1 gradient margin.
function fbm(x: number, y: number, z: number) {
    return vnoise(x, y, z) * 0.86 + vnoise(x * 2.3 + 11.7, y * 2.3 - 5.1, z * 1.4 + 3.3) * 0.14
}

// ---- sphere geometry ------------------------------------------------------

// Rodrigues about a UNIT axis (ax, ay, 0) — the axis is always in the screen
// plane, so every A·z term drops out. Writes into `out`: this runs once per cell
// per frame and must not allocate.
function rotAboutAxis(
    px: number,
    py: number,
    pz: number,
    ax: number,
    ay: number,
    c: number,
    s: number,
    out: Float64Array
) {
    const dotA = ax * px + ay * py
    const crx = ay * pz // (A × p).x = ay·pz - az·py
    const cry = -ax * pz // (A × p).y = az·px - ax·pz
    const crz = ax * py - ay * px
    const k = dotA * (1 - c)
    out[0] = px * c + crx * s + ax * k
    out[1] = py * c + cry * s + ay * k
    out[2] = pz * c + crz * s
}

const SCRATCH_B = new Float64Array(3)
// The render loop's own receiver for the world-space gradient.
const SCRATCH_W = new Float64Array(3)

/**
 * The whole per-cell geometry, in one place because the sign pairing inside it
 * is the component's single load-bearing invariant.
 *
 * `out` receives the WORLD-space gradient of the body-attached field at the
 * world point (u, v, z); the return value is the field sample itself, which the
 * caller uses for the Coverage gate.
 *
 * ct / st are cos θ and sin θ — one pair for both rotations, since
 * cos(-θ) = cos θ and sin(-θ) = -sin θ.
 *
 * Invariant:  sample(R(θ)·q, θ) == R(θ) · sample(q, 0)
 */
function surfaceSample(
    u: number,
    v: number,
    z: number,
    ax: number,
    ay: number,
    ct: number,
    st: number,
    freq: number,
    out: Float64Array
) {
    // 1. un-rotate the world point onto the body — angle -θ.
    rotAboutAxis(u, v, z, ax, ay, ct, -st, SCRATCH_B)
    let bx = SCRATCH_B[0]
    let by = SCRATCH_B[1]
    let bz = SCRATCH_B[2]
    // The cell is on the unit sphere by construction, but the rotation
    // accumulates float drift and the tangent basis below assumes |p| = 1.
    const bl = Math.hypot(bx, by, bz) || 1
    bx /= bl
    by /= bl
    bz /= bl

    // 2. tangent basis at the body point.
    let hx = 0
    let hy = 0
    let hz = 1
    if (bz > 0.9 || bz < -0.9) {
        hx = 1
        hz = 0
    }
    let t1x = hy * bz - hz * by
    let t1y = hz * bx - hx * bz
    let t1z = hx * by - hy * bx
    const t1l = Math.hypot(t1x, t1y, t1z) || 1
    t1x /= t1l
    t1y /= t1l
    t1z /= t1l
    const t2x = by * t1z - bz * t1y
    const t2y = bz * t1x - bx * t1z
    const t2z = bx * t1y - by * t1x

    // 3. body-attached field, forward-differenced along t1 / t2.
    const f0 = fbm(bx * freq, by * freq, bz * freq)
    const f1 = fbm(
        (bx + GRAD_EPS * t1x) * freq,
        (by + GRAD_EPS * t1y) * freq,
        (bz + GRAD_EPS * t1z) * freq
    )
    const f2 = fbm(
        (bx + GRAD_EPS * t2x) * freq,
        (by + GRAD_EPS * t2y) * freq,
        (bz + GRAD_EPS * t2z) * freq
    )
    const d1 = f1 - f0
    const d2 = f2 - f0

    // 4. rotate the gradient back to world — angle +θ. The OPPOSITE sign to step
    //    1. Same sign compiles, renders, and shimmers instead of spinning.
    rotAboutAxis(
        t1x * d1 + t2x * d2,
        t1y * d1 + t2y * d2,
        t1z * d1 + t2z * d2,
        ax,
        ay,
        ct,
        st,
        out
    )
    return f0
}

// ---- glyph atlas ----------------------------------------------------------

// One `tile` px square per character, filled at full alpha. Per-cell brightness
// comes from globalAlpha at draw time, so one atlas serves every grey level.
function buildAtlas(chars: string, tile: number, color: string) {
    const cv = document.createElement("canvas")
    cv.width = Math.max(1, tile * chars.length)
    cv.height = tile
    const g = cv.getContext("2d")
    if (!g) return cv
    g.font = `${Math.max(
        4,
        Math.round(tile * GLYPH_FRAC)
    )}px ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace`
    g.textAlign = "center"
    g.textBaseline = "middle"
    g.fillStyle = color
    for (let i = 0; i < chars.length; i++) {
        g.fillText(chars[i], i * tile + tile / 2, tile / 2)
    }
    return cv
}

// The panel's string is user text: trim the characters that would render as a
// blank tile and cap the atlas width. Falls back to the shipped set rather than
// rendering an empty sphere.
function cleanGlyphs(raw: unknown) {
    const s = typeof raw === "string" ? raw.replace(/\s+/g, "") : ""
    return (s.length ? s : DEFAULT_GLYPHS).slice(0, MAX_GLYPHS)
}

const clamp = (v: number, lo: number, hi: number) =>
    v < lo ? lo : v > hi ? hi : v

// ---- component ------------------------------------------------------------

interface SurfaceGroup {
    detail?: number
    coverage?: number
}

interface AsciiFlameBallProps {
    background?: string
    baseColor?: string
    density?: number
    size?: number
    speed?: number
    direction?: number
    tilt?: number
    glyphs?: string
    surface?: SurfaceGroup
    width?: number
    height?: number
    style?: CSSProperties
}

interface Live {
    background: string
    baseColor: string
    density: number
    size: number
    speed: number
    direction: number
    tilt: number
    glyphs: string
    detail: number
    coverage: number
}

function __BaseImpl_AsciiFlameBall(props: AsciiFlameBallProps) {
    const {
        background = "#000000",
        baseColor = "#E9EB14",
        density = 80,
        size = 65,
        speed = 100,
        direction = 116,
        tilt = 45,
        glyphs = "<Cv/>U-\\",
        // A group the designer never opened arrives undefined, so it is
        // destructured as {} with a fallback per field (rule 8b / 11c) — the
        // control's own defaultValue is never the only source.
        surface = {},
        width = 1200,
        height = 800,
        style,
    } = props
    const { detail = 290, coverage = 40 } = surface

    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const live = useRef<Live>({
        background,
        baseColor,
        density,
        size,
        speed,
        direction,
        tilt,
        glyphs,
        detail,
        coverage,
    }).current
    Object.assign(live, {
        background,
        baseColor,
        density,
        size,
        speed,
        direction,
        tilt,
        glyphs,
        detail,
        coverage,
    })

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        let raf = 0
        let last = 0
        let theta = 0 // spin angle, wrapped into [0, 2π)

        let W = 0
        let H = 0
        let cols = 0
        let rows = 0
        let cell = 0
        let tile = 0
        let originX = 0
        let originY = 0
        let gIdx = new Int16Array(0) // glyph per cell, -1 = blank
        let gAlpha = new Uint8Array(0)
        let gx = new Int32Array(0) // blit x per column
        let gy = new Int32Array(0) // blit y per row
        let atlas: HTMLCanvasElement | null = null
        let atlasKey = ""
        let atlasChars = DEFAULT_GLYPHS
        let acc = 1e9 // force a field build on frame 1

        // Light is fixed; normalize once.
        const ll = Math.hypot(LX, LY, LZ)
        const lx = LX / ll
        const ly = LY / ll
        const lz = LZ / ll

        const buildField = (radius: number) => {
            const chars = atlasChars
            const N = chars.length
            const freq = (clamp(live.detail, 10, 300) / 100) * FREQ_AT_100
            const cov = clamp(live.coverage, 0, 100)
            // Coverage 100 draws nearly every cell in the disc, 0 draws none.
            const T = 1.05 - (cov / 100) * 0.95

            // Axis: leaned within the screen plane by Tilt, so 0° spins about
            // screen-vertical and the sign of Tilt picks which way it leans.
            const tr = (clamp(live.tilt, -60, 60) * Math.PI) / 180
            const ax = Math.sin(tr)
            const ay = Math.cos(tr)

            // Rigid rotation of the whole field about the view axis — see the
            // header. phi is measured off the bearing the flame streams at when
            // nothing is applied, so the dial reads as an absolute compass.
            const phi = ((live.direction - STREAM_BASE_DEG) * Math.PI) / 180
            const cp = Math.cos(phi)
            const sp = Math.sin(phi)
            // az is 0 by construction — every A·z term below is dropped.

            const ct = Math.cos(theta)
            const st = Math.sin(theta)

            gIdx.fill(-1)

            for (let r = 0; r < rows; r++) {
                const py = originY + (r + 0.5) * cell
                const v = (H / 2 - py) / radius
                const row = r * cols
                if (v * v >= 1) continue
                const uMax = Math.sqrt(1 - v * v)
                // Only the columns whose centres fall inside the disc.
                const c0 = Math.max(
                    0,
                    Math.ceil((W / 2 - uMax * radius - originX) / cell - 0.5)
                )
                const c1 = Math.min(
                    cols - 1,
                    Math.floor((W / 2 + uMax * radius - originX) / cell - 0.5)
                )
                for (let c = c0; c <= c1; c++) {
                    const px = originX + (c + 0.5) * cell
                    const u = (px - W / 2) / radius
                    const d2 = u * u + v * v
                    if (d2 >= 1) continue
                    // u² + v² is invariant under the rotation, so z is too and
                    // the silhouette cannot move.
                    const z = Math.sqrt(1 - d2)
                    const ur = u * cp - v * sp
                    const vr = u * sp + v * cp

                    const f0 = surfaceSample(
                        ur,
                        vr,
                        z,
                        ax,
                        ay,
                        ct,
                        st,
                        freq,
                        SCRATCH_W
                    )
                    const wx = SCRATCH_W[0]
                    const wy = SCRATCH_W[1]

                    // ---- lambert, in world space where the normal IS the ROTATED
                    // (ur, vr, z): the light is a fixed constant, so turning the
                    // sample point is what carries the lit body round.
                    const lam = ur * lx + vr * ly + z * lz
                    const lamP = lam > 0 ? lam : 0

                    // The void mask leans on lambert with the noise as texture,
                    // NOT the other way round: weight the noise past ~0.9 and a
                    // single low-frequency patch eats the whole unlit bottom of
                    // the disc, which stops reading as a sphere at all.
                    const w = 0.62 * lamP + 0.85 * (f0 - 0.5) + 0.5
                    if (w < T) continue

                    // Rotate the gradient back the other way, so the glyph still
                    // points along the flow the viewer actually sees.
                    const sx = wx * cp + wy * sp
                    const sy = -wx * sp + wy * cp
                    const ang = Math.atan2(sy, sx)
                    let bin = Math.floor(((ang + Math.PI) / (2 * Math.PI)) * N)
                    if (bin < 0) bin = 0
                    else if (bin >= N) bin = N - 1

                    // Continuous — no grey quantizer. See the header note: the
                    // steps were the contrast rings.
                    const shade = 0.22 + 0.78 * Math.pow(lamP, 0.85)

                    const i = row + c
                    gIdx[i] = bin
                    gAlpha[i] = Math.round(clamp(shade, 0, 1) * 255)
                }
            }
        }

        const render = (now: number) => {
            if (!last) last = now
            let dt = (now - last) / 1000
            last = now
            if (dt > 0.05) dt = 0.05 // tab-switch / canvas-throttle guard

            // 50 on the dial is the rate the loader shipped at; 0 holds it still;
            // a negative value spins the other way.
            const omega = (clamp(live.speed, -100, 100) / 50) * SPIN_AT_50
            theta += omega * dt
            // Wrap on the CPU: unbounded, the accumulator eventually costs float
            // precision inside the trig.
            const TAU = Math.PI * 2
            if (theta >= TAU || theta <= -TAU) theta %= TAU

            // ---- size: measure the element, not the props (props are not
            // numeric in preview), then rebuild the grid only on a real change.
            const cssW = canvas.clientWidth || 300
            const cssH = canvas.clientHeight || 300
            const nW = Math.max(1, Math.round(cssW * dpr))
            const nH = Math.max(1, Math.round(cssH * dpr))
            const radius = (clamp(live.size, 5, 100) / 100) * Math.min(nW, nH) / 2
            const nCell = (2 * radius) / clamp(Math.round(live.density), 8, 160)
            const nCols = Math.max(1, Math.ceil(nW / nCell) + 1)
            const nRows = Math.max(1, Math.ceil(nH / nCell) + 1)

            if (nW !== W || nH !== H) {
                W = nW
                H = nH
                canvas.width = W
                canvas.height = H
                acc = 1e9
            }
            if (nCols !== cols || nRows !== rows || nCell !== cell) {
                cols = nCols
                rows = nRows
                cell = nCell
                originX = W / 2 - (cols / 2) * cell
                originY = H / 2 - (rows / 2) * cell
                const n = cols * rows
                if (gIdx.length !== n) {
                    gIdx = new Int16Array(n)
                    gAlpha = new Uint8Array(n)
                }
                tile = Math.max(4, Math.round(cell))
                gx = new Int32Array(cols)
                gy = new Int32Array(rows)
                for (let c = 0; c < cols; c++)
                    gx[c] = Math.round(originX + c * cell + (cell - tile) / 2)
                for (let r = 0; r < rows; r++)
                    gy[r] = Math.round(originY + r * cell + (cell - tile) / 2)
                acc = 1e9
            }

            const chars = cleanGlyphs(live.glyphs)
            const key = `${tile}|${chars}|${live.baseColor}`
            if (key !== atlasKey) {
                atlasKey = key
                atlasChars = chars
                atlas = buildAtlas(chars, tile, live.baseColor || "#B9B9B9")
                acc = 1e9
            }

            // The glyph field IS the entire visual state, so compute and draw are
            // gated on the same accumulator: nothing changed, nothing to repaint.
            acc += dt * 1000
            if (acc >= FIELD_MS) {
                acc = 0
                buildField(radius)

                // ---- draw. Canvas stays transparent; the background is CSS.
                ctx.clearRect(0, 0, W, H)
                const img = atlas as HTMLCanvasElement
                for (let r = 0; r < rows; r++) {
                    const row = r * cols
                    const yy = gy[r]
                    for (let c = 0; c < cols; c++) {
                        const i = row + c
                        const gi = gIdx[i]
                        if (gi < 0) continue
                        ctx.globalAlpha = gAlpha[i] / 255
                        ctx.drawImage(
                            img,
                            gi * tile,
                            0,
                            tile,
                            tile,
                            gx[c],
                            yy,
                            tile,
                            tile
                        )
                    }
                }
                ctx.globalAlpha = 1
            }

            raf = requestAnimationFrame(render)
        }

        raf = requestAnimationFrame(render)
        return () => cancelAnimationFrame(raf)
    }, [])

    return (
        <div
            style={{
                minWidth: 1200,
                minHeight: 800,
                position: "relative",
                overflow: "hidden",
                background,
                width: typeof width === "number" ? width : "100%",
                height: typeof height === "number" ? height : "100%",
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ display: "block", width: "100%", height: "100%" }}
            />
        </div>
    )
}

const __presetProps = {
  "background": "#000000",
  "baseColor": "#EBE614",
  "density": 80,
  "size": 65,
  "speed": 100,
  "direction": 135,
  "tilt": 45,
  "glyphs": "<Cv/>U-\\",
  "surface": {
    "detail": 300,
    "coverage": 40
  }
};

export default function AsciiFlameBall(props: Record<string, unknown>) {
  return <__BaseImpl_AsciiFlameBall {...(__presetProps as Record<string, unknown>)} {...props} />;
}
