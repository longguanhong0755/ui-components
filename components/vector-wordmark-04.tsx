"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * VECTOR WORDMARK RASTER — VectorWordmark's disc, but what it reveals is the
 * wordmark RASTERISED: a zoomed-in pixel grid where every cell is one square,
 * lit by how much of the glyph covers it, over faint grid lines. A crosshair
 * runs through the pointer, the cell under it is outlined, and a readout gives
 * that cell's column and row.
 *
 * Variation 3 of 3 on framer/VectorWordmark.tsx. Inherited verbatim: the
 * two-channel runtime atlas, the six-tap foot blur, the metal gradient, the
 * disc falloff 1 - pow(smoothstep(0, reach, d), 3), the centred layout and
 * resolution-tier atlas re-bake, the damped pointer and the idle sweep that
 * keeps the Framer canvas alive (rule 5). Changed:
 *
 *  · THE REVEAL swaps the fill for its raster, not for the dotted outline.
 *    Only the R channel is read; the G outline is still baked into the atlas
 *    (the shared builder draws it) but nothing here samples it.
 *  · COVERAGE is a 2x2 box average at the cell's quarter points, not one tap
 *    at its centre: a centre tap on a stroke thinner than a cell drops the
 *    whole stroke, and a single tap also ignores the mip chain, since the
 *    cell-constant uv has zero derivative. Colour takes the gradient at the
 *    cell centre, so each pixel is ONE flat colour, as a pixel is.
 *  · The grid is anchored to the host's bottom-left corner in css px, so a
 *    cell is Size px on screen at any DPR and any frame size.
 *  · The foot fade touches only the wordmark, never the rig.
 *
 * CUT, frozen in constants (rule 11b): grid-line and crosshair strengths.
 *
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */

const MAX_DPR = 2 // quality tier, not a design control (rule 10)
const REF_WIDTH = 1200 // the width the font size is quoted at
const MAX_TEX = 4096

// --- inherited from VectorWordmark, frozen (rule 11b) --------------------
const SWEEP_RATE = 0.5 // uv/sec at Speed 50
const DAMP_REF = 20 // Damping 100 -> lerp rate 20/sec
const SPEED_REF = 50
const LABEL_MAX = 0.6 // readout opacity
const DOT_DIAMETER = 4 / 440 // measured off the reference atlas
const DOT_PITCH = 12 / 440

// --- this variation -------------------------------------------------------
const SWEEP_BAND = 0.28 // the base's: through the x-height
const GRID_ALPHA = 0.35 // grid lines, as a fraction of the accent alpha
const CROSS_ALPHA = 0.6 // crosshair, same

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x)
const fract = (x: number) => x - Math.floor(x)

// --- colour --------------------------------------------------------------
type RGBA = [number, number, number, number]

/**
 * ControlType.Color emits rgb()/rgba()/hsl()/hsla() and var(--token, value) as
 * well as hex, so a hex-only parse leaves the dial looking dead.
 */
function parseColor(input: string | undefined, fallback: RGBA): RGBA {
    if (!input) return fallback
    let s = String(input).trim()
    if (s.slice(0, 4).toLowerCase() === "var(") {
        const comma = s.indexOf(",")
        const close = s.lastIndexOf(")")
        if (comma < 0 || close < comma) return fallback
        s = s.slice(comma + 1, close).trim()
    }
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4) {
            let x = ""
            for (const c of h) x += c + c
            h = x
        }
        if (h.length === 6) h += "ff"
        if (h.length !== 8 || /[^0-9a-f]/i.test(h)) return fallback
        return [
            parseInt(h.slice(0, 2), 16) / 255,
            parseInt(h.slice(2, 4), 16) / 255,
            parseInt(h.slice(4, 6), 16) / 255,
            parseInt(h.slice(6, 8), 16) / 255,
        ]
    }
    const m = s.match(/^(rgba?|hsla?)\(([^)]*)\)$/i)
    if (!m) return fallback
    const parts = m[2].split(/[\s,/]+/).filter((p) => p.length > 0)
    if (parts.length < 3) return fallback
    const num = (t: string, scale: number) => {
        const v = parseFloat(t)
        if (!Number.isFinite(v)) return 0
        return t.indexOf("%") >= 0 ? (v / 100) * scale : v
    }
    const alpha = parts.length > 3 ? clamp(num(parts[3], 1), 0, 1) : 1
    if (m[1].toLowerCase().slice(0, 3) === "rgb") {
        return [
            clamp(num(parts[0], 255) / 255, 0, 1),
            clamp(num(parts[1], 255) / 255, 0, 1),
            clamp(num(parts[2], 255) / 255, 0, 1),
            alpha,
        ]
    }
    const hh = fract(parseFloat(parts[0]) / 360)
    const sat = clamp(num(parts[1], 1), 0, 1)
    const li = clamp(num(parts[2], 1), 0, 1)
    const q = li < 0.5 ? li * (1 + sat) : li + sat - li * sat
    const p = 2 * li - q
    const chan = (t: number) => {
        let u = fract(t)
        if (u < 1 / 6) return p + (q - p) * 6 * u
        if (u < 1 / 2) return q
        if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6
        return p
    }
    return [chan(hh + 1 / 3), chan(hh), chan(hh - 1 / 3), alpha]
}

// --- GL ------------------------------------------------------------------
const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
}`

const FRAG = `
precision highp float;

uniform sampler2D uMap;
uniform vec2 uRes;      // host box, css px
uniform vec2 uAtlas;    // drawn wordmark size, css px
uniform vec2 uPtr;      // eased pointer, screen uv
uniform float uReach;   // disc radius, as a fraction of the host width
uniform float uCell;    // cell side, css px
uniform float uGap;     // gap, fraction of a cell
uniform vec3 uText;
uniform vec3 uShade;
uniform vec4 uAccent;   // rig colour; its alpha IS the rig intensity

varying vec2 vUv;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// VectorWordmark's blur, verbatim: six taps on a ring, each pushed out by a
// random amount, so they read as a soft disc rather than a hexagon.
vec2 blurRG(vec2 uv, float e) {
    vec4 sum = vec4(0.0);
    for (int i = 0; i < 6; i++) {
        float fi = float(i);
        float th = radians(fi / 6.0 * 360.0);
        vec2 dir = vec2(cos(th), sin(th));
        vec2 off = dir * (hash(vec2(fi, uv.x + uv.y)) + e);
        sum += texture2D(uMap, uv + off * e);
    }
    return (sum / 6.0).rg;
}

// 1 - smoothstep(lo, hi, d): smoothstep with edge0 > edge1 is undefined.
float stroke(float d, float lw, float px) {
    return 1.0 - smoothstep(lw, lw + px, d);
}

vec2 atlasUv(vec2 px) {
    return (px - (uRes - uAtlas) * 0.5) / uAtlas;
}

float coverage(vec2 px) {
    vec2 e = atlasUv(px);
    float inb = step(0.0, e.x) * step(e.x, 1.0) * step(0.0, e.y) * step(e.y, 1.0);
    return texture2D(uMap, clamp(e, 0.0, 1.0)).r * inb;
}

void main() {
    float aspect = uRes.x / uRes.y;
    vec2 p = vUv * uRes; // css px, y up

    // Smooth wordmark, exactly as the base.
    vec2 E = atlasUv(p);
    float inside = step(0.0, E.x) * step(E.x, 1.0) * step(0.0, E.y) * step(E.y, 1.0);
    vec2 safeUv = clamp(E, 0.0, 1.0);
    float b = clamp(1.0 - E.y * 3.5, 0.0, 1.0) * 0.008;
    float softMask = blurRG(safeUv, b).r * inside;
    vec3 fillS = mix(uShade, uText, smoothstep(0.0, 1.0, E.y));

    // Raster: one flat square per cell.
    vec2 cell = floor(p / uCell);
    vec2 cc = (cell + 0.5) * uCell;
    float q = uCell * 0.25;
    float cov = 0.25 * (
        coverage(cc + vec2(-q, -q)) + coverage(cc + vec2(q, -q)) +
        coverage(cc + vec2(-q, q)) + coverage(cc + vec2(q, q))
    );
    vec2 f = fract(p / uCell) * uCell; // px within the cell
    float g = uGap * uCell * 0.5;
    vec2 sqd = min(f - g, uCell - g - f); // >0 inside the square
    float sq = smoothstep(-0.5, 0.5, min(sqd.x, sqd.y));
    float rasterMask = cov * sq;
    vec3 fillR = mix(uShade, uText, smoothstep(0.0, 1.0, atlasUv(cc).y));

    float d = length((vUv - uPtr) / vec2(1.0, aspect));
    float k = 1.0 - pow(smoothstep(0.0, max(uReach, 1e-4), d), 3.0);

    float fade = pow(clamp(E.y, 0.0, 1.0), 0.7);
    float mask = mix(softMask, rasterMask, k);
    vec3 rgbP = mix(fillS * softMask, fillR * rasterMask, k);
    vec4 card = vec4(rgbP, mask) * fade;

    // Rig: grid lines inside the disc, a full-frame crosshair, and the
    // outline of the cell under the pointer.
    vec2 edge = min(f, uCell - f);
    float grid = stroke(min(edge.x, edge.y), 0.25, 1.0) * k * ${GRID_ALPHA.toFixed(3)};
    vec2 c = uPtr * uRes;
    float cross = max(stroke(abs(p.x - c.x), 0.5, 1.0), stroke(abs(p.y - c.y), 0.5, 1.0)) * ${CROSS_ALPHA.toFixed(3)};
    vec2 pc = floor(c / uCell);
    float same = 1.0 - step(0.5, length(cell - pc));
    float hl = stroke(min(edge.x, edge.y), 0.5, 1.0) * same;
    float A = max(max(grid, cross), hl) * uAccent.a;

    gl_FragColor = vec4(uAccent.rgb * A, A) + card * (1.0 - A);
}`

function compile(gl: WebGLRenderingContext, vs: string, fs: string) {
    const make = (type: number, src: string) => {
        const sh = gl.createShader(type)!
        gl.shaderSource(sh, src)
        gl.compileShader(sh)
        return sh
    }
    const p = gl.createProgram()!
    gl.attachShader(p, make(gl.VERTEX_SHADER, vs))
    gl.attachShader(p, make(gl.FRAGMENT_SHADER, fs))
    gl.bindAttribLocation(p, 0, "aPos")
    gl.linkProgram(p)
    return p
}

// --- atlas ---------------------------------------------------------------
type Atlas = { canvas: HTMLCanvasElement; cssW: number; cssH: number }

type FontSpec = {
    family: string
    weight: string
    style: string
    size: number
    letterSpacing: string
}

function fontString(f: FontSpec, px: number) {
    return `${f.style} ${f.weight} ${px}px ${f.family}`
}

/**
 * Draws the two-channel atlas the shader samples: R is the solid fill, G the
 * dotted outline. The ground is OPAQUE black so upload never unpremultiplies
 * the antialiased edges (see the file header).
 */
function buildAtlas(
    text: string,
    f: FontSpec,
    drawFontPx: number,
    dpr: number
): Atlas | null {
    const probe = document.createElement("canvas").getContext("2d")
    if (!probe) return null

    const setFont = (ctx: CanvasRenderingContext2D, px: number) => {
        ctx.font = fontString(f, px)
        // Chrome and Safari support ctx.letterSpacing; older engines do not,
        // and a throw here would take the whole atlas down.
        try {
            if ("letterSpacing" in ctx) {
                ;(ctx as unknown as { letterSpacing: string }).letterSpacing =
                    f.letterSpacing
            }
        } catch (e) {
            /* engine without canvas letter-spacing — glyphs still measure */
        }
    }

    const measure = (px: number) => {
        setFont(probe, px)
        const m = probe.measureText(text)
        const asc = m.actualBoundingBoxAscent || px * 0.8
        const desc = m.actualBoundingBoxDescent || px * 0.22
        return { w: Math.max(1, m.width), asc, desc }
    }

    let fpx = Math.max(8, drawFontPx * dpr)
    let m = measure(fpx)
    let pad = fpx * 0.12
    const over = Math.max(
        (m.w + pad * 2) / MAX_TEX,
        (m.asc + m.desc + pad * 2) / MAX_TEX
    )
    if (over > 1) {
        fpx = Math.max(8, fpx / over)
        m = measure(fpx)
        pad = fpx * 0.12
    }

    const w = Math.max(1, Math.ceil(m.w + pad * 2))
    const h = Math.max(1, Math.ceil(m.asc + m.desc + pad * 2))
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    ctx.fillStyle = "#000000"
    ctx.fillRect(0, 0, w, h)
    setFont(ctx, fpx)
    ctx.textBaseline = "alphabetic"
    ctx.textAlign = "left"
    ctx.globalCompositeOperation = "lighter"

    ctx.fillStyle = "#ff0000"
    ctx.fillText(text, pad, pad + m.asc)

    // Zero-length dashes with a round cap ARE the dots. A solid stroke here
    // would read as an outline, not as a vector path with points on it.
    // Dot diameter and pitch are the reference texture's, measured off it:
    // 4 px and 12 px against a 440 px glyph block, so they are quoted against
    // the block height and hold at any font size.
    const block = m.asc + m.desc
    ctx.strokeStyle = "#00ff00"
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.lineWidth = Math.max(1, block * DOT_DIAMETER)
    ctx.setLineDash([0, Math.max(2, block * DOT_PITCH)])
    ctx.strokeText(text, pad, pad + m.asc)

    const cssPerPx = drawFontPx / fpx
    return { canvas, cssW: w * cssPerPx, cssH: h * cssPerPx }
}

// --- props ---------------------------------------------------------------
type GridGroup = { size: number; gap: number; labels: boolean }

const GRID_DEFAULTS: GridGroup = { size: 14, gap: 20, labels: true }

export interface VectorWordmarkRasterProps {
    text?: string
    font?: React.CSSProperties
    background?: string
    textColor?: string
    shade?: string
    accent?: string
    reach?: number
    speed?: number
    damping?: number
    grid?: Partial<GridGroup>
    style?: React.CSSProperties
}

/** @framerDisableUnlink */
export default function VectorWordmarkRaster(props: VectorWordmarkRasterProps) {
    const {
        text = "Raster",
        font = {"variant":"Medium","fontSize":240,"textAlign":"left","fontFamily":"Inter","fontWeight":400,"lineHeight":"1em","letterSpacing":"-0.02em"},
        background = "#000000",
        textColor = "#D9FFE9",
        shade = "#0B2A1D",
        accent = "rgba(80, 255, 160, 0.5)",
        reach = 200,
        speed = 50,
        damping = 35,
        grid = {"gap":20,"size":14,"labels":true},
        style,
    } = props

    // Spread-merge over a typed literal: a group the designer never opened
    // arrives undefined (rule 11).
    const hg: GridGroup = { ...GRID_DEFAULTS, ...(grid ?? {}) }

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const labelRefs = useRef<(HTMLDivElement | null)[]>([null])

    const rawSize = font?.fontSize
    const fontSpec: FontSpec = {
        family: (font?.fontFamily as string) || "Inter, system-ui, sans-serif",
        weight: String(font?.fontWeight ?? 500),
        style: font?.fontStyle === "italic" ? "italic" : "normal",
        size: Math.max(8, parseFloat(String(rawSize ?? 240)) || 240),
        letterSpacing: String(font?.letterSpacing ?? "0px"),
    }

    const accentRGBA = parseColor(accent, [0.314, 1, 0.627, 0.5])
    const labelColor = `rgb(${Math.round(accentRGBA[0] * 255)}, ${Math.round(
        accentRGBA[1] * 255
    )}, ${Math.round(accentRGBA[2] * 255)})`

    // Every live input is read from a ref inside the loop, so changing a dial
    // never tears down the GL context (rule 6).
    const live = useRef({
        text,
        fontSpec,
        textColor,
        shade,
        accentRGBA,
        reach,
        speed,
        damping,
        hg,
    })
    live.current.text = text
    live.current.fontSpec = fontSpec
    live.current.textColor = textColor
    live.current.shade = shade
    live.current.accentRGBA = accentRGBA
    live.current.reach = reach
    live.current.speed = speed
    live.current.damping = damping
    live.current.hg = hg

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return

        const attrs: WebGLContextAttributes = {
            alpha: true,
            antialias: false,
            depth: false,
            stencil: false,
            premultipliedAlpha: true,
            powerPreference: "high-performance",
        }
        const gl = (canvas.getContext("webgl2", attrs) ||
            canvas.getContext("webgl", attrs)) as WebGLRenderingContext | null
        if (!gl) return
        const isGL2 =
            typeof WebGL2RenderingContext !== "undefined" &&
            gl instanceof WebGL2RenderingContext

        const prog = compile(gl, VERT, FRAG)
        const U = {
            map: gl.getUniformLocation(prog, "uMap"),
            res: gl.getUniformLocation(prog, "uRes"),
            atlas: gl.getUniformLocation(prog, "uAtlas"),
            ptr: gl.getUniformLocation(prog, "uPtr"),
            reach: gl.getUniformLocation(prog, "uReach"),
            cell: gl.getUniformLocation(prog, "uCell"),
            gap: gl.getUniformLocation(prog, "uGap"),
            text: gl.getUniformLocation(prog, "uText"),
            shade: gl.getUniformLocation(prog, "uShade"),
            accent: gl.getUniformLocation(prog, "uAccent"),
        }

        const quad = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, quad)
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
            gl.STATIC_DRAW
        )
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
        gl.disable(gl.BLEND)

        const tex = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            1,
            1,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            new Uint8Array([0, 0, 0, 255])
        )
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

        let alive = true

        // --- layout ------------------------------------------------------
        // offsetWidth/Height, never getBoundingClientRect: the rect carries
        // the Framer canvas zoom and the atlas would re-bake on every zoom
        // step (rule G).
        let boxW = Math.max(1, host.offsetWidth)
        let boxH = Math.max(1, host.offsetHeight)
        let boxDirty = true
        let dpr = 1
        let bufW = 0
        let bufH = 0
        // Ratios, not sizes: cssW / drawFontPx is invariant to the
        // resolution the atlas happens to be baked at, so the displayed size
        // is recomputed every frame from the live box while the texture is
        // only re-baked when it crosses a resolution tier.
        let atlasRatioW = 1
        let atlasRatioH = 1
        let atlasKey = ""

        function drawFontPx() {
            return live.current.fontSpec.size * (boxW / REF_WIDTH)
        }

        function resize() {
            boxW = Math.max(1, host!.offsetWidth)
            boxH = Math.max(1, host!.offsetHeight)
            dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1)
            const w = Math.max(1, Math.round(boxW * dpr))
            const h = Math.max(1, Math.round(boxH * dpr))
            if (w === bufW && h === bufH) return
            bufW = w
            bufH = h
            canvas!.width = w
            canvas!.height = h
        }

        function rebuildAtlas() {
            const L = live.current
            const f = L.fontSpec
            const px = Math.max(8, drawFontPx())
            const atlas = buildAtlas(L.text || " ", f, px, dpr)
            if (!atlas) return
            atlasRatioW = Math.max(1e-4, atlas.cssW / px)
            atlasRatioH = Math.max(1e-4, atlas.cssH / px)
            // A family still downloading would otherwise bake the fallback
            // glyphs in forever — re-bake once it lands.
            if (typeof document !== "undefined" && document.fonts) {
                try {
                    const probe = fontString(f, 64)
                    if (!document.fonts.check(probe)) {
                        const again = () => {
                            if (alive) atlasKey = ""
                        }
                        document.fonts.load(probe, L.text).then(again, again)
                    }
                } catch (e) {
                    /* engine without FontFaceSet */
                }
            }
            gl!.bindTexture(gl!.TEXTURE_2D, tex)
            gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, true)
            gl!.texImage2D(
                gl!.TEXTURE_2D,
                0,
                gl!.RGBA,
                gl!.RGBA,
                gl!.UNSIGNED_BYTE,
                atlas.canvas
            )
            gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, false)
            const cw = atlas.canvas.width
            const ch = atlas.canvas.height
            const pot = (cw & (cw - 1)) === 0 && (ch & (ch - 1)) === 0
            // WebGL1 refuses mipmaps on a non-power-of-two texture; WebGL2
            // does not, and the wordmark's dotted channel aliases badly.
            if (isGL2 || pot) {
                gl!.generateMipmap(gl!.TEXTURE_2D)
                gl!.texParameteri(
                    gl!.TEXTURE_2D,
                    gl!.TEXTURE_MIN_FILTER,
                    gl!.LINEAR_MIPMAP_LINEAR
                )
            } else {
                gl!.texParameteri(
                    gl!.TEXTURE_2D,
                    gl!.TEXTURE_MIN_FILTER,
                    gl!.LINEAR
                )
            }
        }

        // --- pointer -----------------------------------------------------
        const target = { x: -0.5, y: 0.5 } // raw pointer, screen uv
        const eased = { x: -0.5, y: 0.5 } // what the shader reads
        const prev = { x: -0.5, y: 0.5 } // eased, one frame ago
        let hasPointer = false
        let clock = 0 // Speed-scaled seconds

        const onMove = (e: PointerEvent) => {
            hasPointer = true
            // A FRACTION of the rect, not a measurement: clientX and the rect
            // are in the same zoomed space, so the zoom divides out. This is
            // the one place getBoundingClientRect is the right tool — every
            // size the shader reads still comes from offsetWidth (rule G).
            const r = host!.getBoundingClientRect()
            if (r.width <= 0 || r.height <= 0) return
            target.x = (e.clientX - r.left) / r.width
            target.y = 1 - (e.clientY - r.top) / r.height
        }
        host.addEventListener("pointermove", onMove)

        // --- loop ---------------------------------------------------------
        let raf = 0
        let last = 0
        let running = true

        function sync() {
            const L = live.current
            if (boxDirty) {
                boxDirty = false
                resize()
            }
            const f = L.fontSpec
            const key = [
                L.text,
                f.family,
                f.weight,
                f.style,
                f.letterSpacing,
                dpr,
                Math.ceil(Math.max(8, drawFontPx()) / 64), // resolution tier
            ].join("|")
            if (key !== atlasKey) {
                atlasKey = key
                rebuildAtlas()
            }
        }

        function step(dt: number) {
            const L = live.current
            const rate = Math.max(0, L.speed) / SPEED_REF

            if (!hasPointer) {
                // No pointer yet (and never on the Framer canvas): sweep a
                // fake one across the wordmark band, as the base does.
                const band = (atlasRatioH * Math.max(8, drawFontPx())) / boxH
                target.x += dt * SWEEP_RATE * rate
                target.y = (1 - band) / 2 + SWEEP_BAND * band
                if (target.x > 1.5) {
                    target.x = -0.5
                    eased.x = -0.5
                    prev.x = -0.5
                }
            }

            const damp = clamp((L.damping / 100) * DAMP_REF * dt, 0, 1)
            prev.x = eased.x
            prev.y = eased.y
            eased.x += (target.x - eased.x) * damp
            eased.y += (target.y - eased.y) * damp
            clock += dt * rate
        }

        function writeLabels() {
            const L = live.current
            const el = labelRefs.current[0]
            if (!el) return
            const cellPx = Math.max(1, L.hg.size)
            const cx = eased.x * boxW
            const cyUp = eased.y * boxH
            // Same cell the shader outlines: floor of css px, y up. Rows are
            // then counted from the top, the way a design tool reads them.
            const col = Math.floor(cx / cellPx)
            const rowUp = Math.floor(cyUp / cellPx)
            const row = Math.max(0, Math.ceil(boxH / cellPx) - 1 - rowUp)
            el.style.transform = `translate(${(col + 1) * cellPx + 6}px, ${
                boxH - (rowUp + 1) * cellPx - 16
            }px)`
            el.textContent = `${col}, ${row}`
        }

        function draw() {
            const L = live.current
            const tc = parseColor(L.textColor, [0.859, 0.918, 0.992, 1])
            const sc = parseColor(L.shade, [0.035, 0.063, 0.102, 1])
            const ac = L.accentRGBA

            gl!.viewport(0, 0, bufW, bufH)
            gl!.useProgram(prog)
            gl!.uniform1i(U.map, 0)
            gl!.activeTexture(gl!.TEXTURE0)
            gl!.bindTexture(gl!.TEXTURE_2D, tex)
            gl!.uniform2f(U.res, boxW, boxH)
            const px = Math.max(8, drawFontPx())
            gl!.uniform2f(U.atlas, atlasRatioW * px, atlasRatioH * px)
            gl!.uniform2f(U.ptr, eased.x, eased.y)
            gl!.uniform1f(U.reach, Math.max(1, L.reach) / boxW)
            gl!.uniform1f(U.cell, Math.max(1, L.hg.size))
            gl!.uniform1f(U.gap, clamp(L.hg.gap, 0, 80) / 100)
            gl!.uniform3f(U.text, tc[0], tc[1], tc[2])
            gl!.uniform3f(U.shade, sc[0], sc[1], sc[2])
            gl!.uniform4f(U.accent, ac[0], ac[1], ac[2], ac[3])
            gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4)
        }

        const frame = (now: number) => {
            const dt = last ? Math.min(0.1, (now - last) / 1000) : 0
            last = now
            sync()
            step(dt)
            writeLabels()
            draw()
            raf = requestAnimationFrame(frame)
        }

        const gate = () => {
            if (running && !document.hidden) {
                if (!raf) {
                    last = 0
                    raf = requestAnimationFrame(frame)
                }
            } else if (raf) {
                cancelAnimationFrame(raf)
                raf = 0
            }
        }

        const ro = new ResizeObserver(() => {
            boxDirty = true
        })
        ro.observe(host)
        document.addEventListener("visibilitychange", gate)

        // Safety net for a family that finishes after the first bake but
        // that document.fonts.check() reported as present.
        if (typeof document !== "undefined" && document.fonts) {
            document.fonts.ready.then(
                () => { if (alive) atlasKey = "" },
                () => {}
            )
        }

        gate()

        return () => {
            alive = false
            running = false
            if (raf) cancelAnimationFrame(raf)
            ro.disconnect()
            host.removeEventListener("pointermove", onMove)
            document.removeEventListener("visibilitychange", gate)
            // Never loseContext(): getContext returns the same context per
            // canvas, so StrictMode's mount -> cleanup -> mount would reuse a
            // force-lost one and render black (rule 6).
        }
        // Built once; every live input is read from `live` inside the loop.
    }, [])

    return (
        <div
            ref={hostRef}
            style={{
                position: "relative",
                overflow: "hidden",
                background,
                // Floor before the spread, so an explicit size on the instance
                // still wins and Fit Content can't collapse the root to 0x0.
                minWidth: 1200,
                minHeight: 800,
                width: "100%",
                height: "100%",
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                }}
            />
            {hg.labels
                ? [0].map((i) => (
                      <div
                          key={i}
                          ref={(el) => {
                              labelRefs.current[i] = el
                          }}
                          style={{
                              position: "absolute",
                              left: 0,
                              top: 0,
                              opacity: LABEL_MAX,
                              pointerEvents: "none",
                              whiteSpace: "nowrap",
                              fontFamily:
                                  "ui-monospace, SFMono-Regular, Menlo, monospace",
                              fontSize: 11,
                              letterSpacing: "0.08em",
                              color: labelColor,
                          }}
                      />
                  ))
                : null}
        </div>
    )
}
