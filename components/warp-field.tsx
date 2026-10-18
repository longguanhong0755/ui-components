"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const MAX_DPR = 2
const NEAR = 0.1
const FAR = 2000

// The corridor. Objects wrap from RECYCLE_Z (behind the lens) back to RESET_Z.
const RECYCLE_Z = 200
const RESET_Z = -1800
const SPAN = RECYCLE_Z - RESET_Z

const FOG_DENSITY = 0.001 // the source's FogExp2 density; framing, so not a dial

const STREAK_RADIUS_MIN = 20
const STREAK_SPREAD = 800
const STREAK_LEN_MIN = 50
const STREAK_LEN_SPREAD = 150
const MAX_STREAKS = 2000

const TILE_W = 8
const TILE_H = 20
const TILE_RADIUS_MIN = 100
const TILE_RADIUS_SPREAD = 400
const TILE_AIM_AHEAD = 100 // the source's lookAt(0, 0, z + 100)
const MAX_TILES = 120
// A glyph gets a square box (see the header): the blank tile's 8x20 would
// stretch every character 2.5x vertically.
const TILE_GLYPH = 20
// Multi Color palette cap. A fixed-size uniform array, not a texture -- the
// palette is a handful of swatches, not a gradient ramp.
const MAX_PALETTE = 8

// ---- glyph atlas ---------------------------------------------------------
const GLYPH_CELL = 64 // atlas cell, px
// Ink height as a fraction of the cell. The margin is not padding for looks: it
// is what stops a coarse mip level averaging in the neighbouring cell and
// ghosting a second letter onto a distant tile.
const GLYPH_INK = 0.72
const MAX_GLYPHS = 256
const ATLAS_MAX = 1024
const FALLBACK_FAMILY = 'ui-monospace, SFMono-Regular, Menlo, "Courier New", monospace'

// Cut controls, frozen at the values they shipped with (rule 11b): the panel row
// is gone, the render path is not.
const POINTER_BOOST = 1 // was Pointer > Boost, 100%
const POINTER_DAMPING = 30 // was Pointer > Damping, 30%

// The source stepped 15 units per frame and assumed 60fps.
const BASE_FLOW = 15 * 60 // units/sec at Speed 50

const STEER_MAX_DEG = 12 // yaw/pitch at Steer 100%

// Shared camera maths. Every layer steers by the same two angles, so the whole
// corridor swings together and the vanishing point lands under the pointer.
const CAMERA_GLSL = `
uniform vec2 uSteer;
uniform float uFocal, uAspect, uZA, uZB;

vec3 steerP(vec3 p){
  float cy = cos(uSteer.x), sy = sin(uSteer.x);
  p = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
  float cx = cos(uSteer.y), sx = sin(uSteer.y);
  return vec3(p.x, p.y * cx - p.z * sx, p.y * sx + p.z * cx);
}

vec4 projectP(vec3 p){
  return vec4(p.x * uFocal / uAspect, p.y * uFocal, p.z * uZA + uZB, -p.z);
}

// The vertex stage only hands over the view depth. Fog is FOG_GLSL's job, in the
// fragment stage, because that is where three evaluates FogExp2 -- and the
// difference is not cosmetic: interpolating exp(-(d * density)^2) itself across a
// streak 2000 units long pulls almost the whole on-screen rail down to the FAR
// end's value, so long streaks would read dimmer than short ones.
float depthOf(vec3 p){
  return max(-p.z, 0.0);
}
`

// Fragment-stage fog. uFog is declared here rather than in CAMERA_GLSL because
// only the fragment stage reads it.
const FOG_GLSL = `
uniform float uFog;

float clarity(float depth){
  float d = depth * uFog;
  return exp(-d * d);
}
`

// Multi Color: an explicit palette that overrides the Base/Accent ramp. t is
// a per-object random float baked once at build time, so the index it resolves
// to tracks however many colours are in the array right now -- the buffer
// never needs rebuilding when a swatch is added or removed.
const PALETTE_GLSL = `
uniform vec3 uPalette[${MAX_PALETTE}];
uniform float uPaletteCount, uMultiColor;

vec3 paletteColor(float t){
  float idx = floor(t * max(uPaletteCount, 1.0));
  vec3 c = uPalette[0];
  for (int i = 0; i < ${MAX_PALETTE}; i += 1) {
    if (float(i) == idx) c = uPalette[i];
  }
  return c;
}
`

const STREAK_VS = `
precision highp float;

attribute vec2 a_dir;
attribute float a_rnorm;
attribute float a_z0;
attribute float a_off;
attribute vec3 a_w;
attribute float a_pal;

uniform float uFlow, uSpan, uResetZ, uRadiusMin, uSpread, uLen;
uniform vec3 uBase, uAccent;

varying vec3 vTint;
varying float vDepth;
${CAMERA_GLSL}${PALETTE_GLSL}
void main(){
  float r = uRadiusMin + a_rnorm * uSpread;
  // The HEAD wraps; the tail rides a fixed offset ahead of it, so a streak never
  // splits across the seam.
  float zh = uResetZ + mod(a_z0 + uFlow - uResetZ, uSpan);
  vec3 p = steerP(vec3(a_dir * r, zh + a_off * uLen));
  // a_w carries the two-colour ramp weights; a_pal indexes the Palette array.
  // uMultiColor blends between them, so the same static buffer serves either mode.
  vTint = mix(mix(a_w.x * uBase, uAccent, a_w.y), paletteColor(a_pal), uMultiColor);
  vDepth = depthOf(p);
  gl_Position = projectP(p);
}
`

const STREAK_FS = `
precision highp float;
uniform float uOpacity;
${FOG_GLSL}varying vec3 vTint;
varying float vDepth;
void main(){
  float a = uOpacity * clarity(vDepth);
  gl_FragColor = vec4(vTint * a, a);
}
`

const TILE_VS = `
precision highp float;

attribute vec3 a_right;
attribute vec3 a_up;
attribute vec3 a_center;
attribute vec2 a_w;
attribute vec2 a_corner;
attribute float a_id;
attribute float a_pal;

uniform float uFlow, uSpan, uResetZ, uSize, uBoxW, uBoxH, uGrid, uCount;
uniform vec3 uBase, uAccent;

varying vec3 vTint;
varying float vDepth;
varying vec2 vUv;
${CAMERA_GLSL}${PALETTE_GLSL}
void main(){
  vec3 c = a_center;
  c.z = uResetZ + mod(a_center.z + uFlow - uResetZ, uSpan);
  // a_right / a_up are the tile's basis already rotated into world space and
  // scaled by its size roll, so the tile keeps the lean it was aimed with
  // instead of swivelling to face the camera. The BOX is a uniform rather than
  // baked into the corner offsets, because a glyph needs a square one and a
  // blank tile is 8x20 -- and neither should rebuild a static buffer.
  vec3 local = a_right * (a_corner.x * uBoxW) + a_up * (a_corner.y * uBoxH);
  vec3 p = steerP(c + local * uSize);
  // a_w carries the two-colour ramp weights; a_pal indexes the Palette array.
  // uMultiColor blends between them, so the same static buffer serves either mode.
  vTint = mix(mix(a_w.x * uBase, uAccent, a_w.y), paletteColor(a_pal), uMultiColor);
  vDepth = depthOf(p);
  // Atlas cell for this tile, resolved here from a uniform so retyping the
  // string reassigns every glyph without touching the vertex buffer.
  float ci = mod(a_id, max(uCount, 1.0));
  vec2 cellXY = vec2(mod(ci, uGrid), floor(ci / uGrid));
  // v runs DOWN the atlas: the canvas is uploaded unflipped, so its top row is
  // v = 0 and the quad's top corner (a_corner.y = +0.5) has to land there.
  vUv = (cellXY + vec2(a_corner.x + 0.5, 0.5 - a_corner.y)) / uGrid;
  gl_Position = projectP(p);
}
`

const TILE_FS = `
precision highp float;
uniform float uOpacity;
uniform vec3 uBg;
uniform sampler2D uAtlas;
${FOG_GLSL}varying vec3 vTint;
varying float vDepth;
varying vec2 vUv;
void main(){
  // With nothing typed the atlas is a single opaque white texel, so ink is 1.0
  // and the tile is the source's solid quad for the price of one sample.
  float ink = texture2D(uAtlas, vUv).a;
  float a = uOpacity * ink;
  // Alpha-blended, so fog MIXES toward the background rather than fading alpha.
  vec3 col = mix(uBg, vTint, clarity(vDepth));
  gl_FragColor = vec4(col * a, a);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("WarpField shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

function link(gl: WebGLRenderingContext, vsSrc: string, fsSrc: string): WebGLProgram | null {
    const vs = compile(gl, gl.VERTEX_SHADER, vsSrc)
    const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc)
    if (!vs || !fs) return null
    const prog = gl.createProgram()
    if (!prog) return null
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error("WarpField link:", gl.getProgramInfoLog(prog))
        return null
    }
    return prog
}

// Uniform locations are PER PROGRAM: one shared cache keyed by name would hand
// program B the locations it resolved for program A.
function uniformCache(gl: WebGLRenderingContext, prog: WebGLProgram) {
    const locs: Record<string, WebGLUniformLocation | null> = {}
    return (name: string) => {
        if (!(name in locs)) locs[name] = gl.getUniformLocation(prog, name)
        return locs[name]
    }
}

type RGBA = [number, number, number, number]

function parseColor(input: string | undefined, fb: RGBA): RGBA {
    if (!input) return fb
    const str = String(input).trim()
    if (str.charAt(0) === "#") {
        let hex = str.slice(1)
        if (hex.length === 3 || hex.length === 4) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2] + (hex.length === 4 ? hex[3] + hex[3] : "")
        }
        if (hex.length >= 6) {
            const r = parseInt(hex.slice(0, 2), 16)
            const g = parseInt(hex.slice(2, 4), 16)
            const b = parseInt(hex.slice(4, 6), 16)
            const a = hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r / 255, g / 255, b / 255, a]
        }
        return fb
    }
    const m = str.match(/[\d.]+/g)
    if (m && m.length >= 3) {
        return [
            Math.min(255, parseFloat(m[0])) / 255,
            Math.min(255, parseFloat(m[1])) / 255,
            Math.min(255, parseFloat(m[2])) / 255,
            m.length >= 4 ? Math.min(1, parseFloat(m[3])) : 1,
        ]
    }
    return fb
}

function num(v: unknown, fb: number): number {
    return typeof v === "number" && isFinite(v) ? v : fb
}

function clampN(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v
}

// Seeded, so the same props give the same frame -- a Math.random() field cannot
// be diffed across two renders and every dial check becomes a guess.
function mulberry32(seed: number) {
    let a = seed >>> 0
    return () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

type Atlas = { canvas: HTMLCanvasElement; grid: number; count: number }

// The characters actually drawn. Deduped, so "AAAB" is two cells rather than
// three copies of one, and whitespace-free, because a space is a blank cell and
// a tile carrying it is simply invisible.
function glyphList(text: string): string[] {
    const out: string[] = []
    const seen = new Set<string>()
    // Array.from splits by code POINT, so an emoji or an accented pair stays one
    // glyph instead of two broken halves.
    for (const ch of Array.from(text || "")) {
        if (/\s/.test(ch) || seen.has(ch)) continue
        seen.add(ch)
        out.push(ch)
        if (out.length >= MAX_GLYPHS) break
    }
    return out
}

function buildGlyphAtlas(chars: string[], family: string, weight: string, style: string): Atlas | null {
    if (typeof document === "undefined") return null
    const count = Math.min(chars.length, MAX_GLYPHS)
    if (count === 0) return null
    const grid = Math.ceil(Math.sqrt(count))
    // Power of two: WebGL1 refuses to mipmap an NPOT texture, and an unmipmapped
    // glyph at the far end of a 2000-unit corridor aliases into sparkle.
    let side = 1
    while (side < grid * GLYPH_CELL && side < ATLAS_MAX) side <<= 1
    const cell = side / grid
    const canvas = document.createElement("canvas")
    canvas.width = side
    canvas.height = side
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.clearRect(0, 0, side, side)
    ctx.fillStyle = "#fff"
    ctx.textAlign = "center"
    ctx.textBaseline = "alphabetic"
    const maxInk = cell * GLYPH_INK
    for (let i = 0; i < count; i += 1) {
        const ch = chars[i]
        const cx = (i % grid) * cell + cell / 2
        const cy = Math.floor(i / grid) * cell + cell / 2
        let px = maxInk
        ctx.font = style + " " + weight + " " + px + "px " + family
        let m = ctx.measureText(ch)
        // A wide glyph ('W', an emoji) would spill into the next cell, and the
        // spill reads as a ghost letter once the mip chain averages it in.
        const w = m.width || px
        if (w > maxInk) {
            px = Math.max(4, px * (maxInk / w))
            ctx.font = style + " " + weight + " " + px + "px " + family
            m = ctx.measureText(ch)
        }
        // Centre the INK, not the em box: 'x' and 'X' sit at different heights
        // inside the same em, and a field of both reads as a wobble.
        const asc = m.actualBoundingBoxAscent
        const desc = m.actualBoundingBoxDescent
        const dy = isFinite(asc) && isFinite(desc) ? (asc - desc) / 2 : px * 0.35
        ctx.fillText(ch, cx, cy + dy)
    }
    return { canvas, grid, count }
}

type Streaks = { length?: number; spread?: number; opacity?: number }
// Only these three fields of the extended Font control are read; see the header.
type TileFont = { fontFamily?: string; fontWeight?: number | string; fontStyle?: string }
type Tiles = { characters?: string; font?: TileFont; count?: number; opacity?: number; size?: number }

const STREAK_DEFAULTS: Required<Streaks> = { length: 100, spread: 100, opacity: 60 }
const TILE_DEFAULTS: Required<Tiles> = { characters: "abcdefghijklmn", font: {}, count: 120, opacity: 100, size: 176 }

interface WarpFieldProps {
    style?: React.CSSProperties
    width?: number
    height?: number
    background?: string
    /** First two swatches are the base/accent ramp; a third colour or more switches
     *  every streak and tile to a random pick across the full list instead. */
    palette?: string[]
    density?: number
    speed?: number
    perspective?: number
    steer?: number
    streaks?: Streaks
    tiles?: Tiles
    /** Removed group. Read only so a live instance keeps its Steer value. */
    pointer?: { steer?: number }
}

export default function WarpField(props: WarpFieldProps) {
    const {
        style,
        background = "#02040A",
        palette = ["#10B981", "#FFE400", "#50FF00", "#5000FF"],
        density = 400,
        speed = 50,
        perspective = 75,
        // NOT defaulted here: the fallback to the removed pointer.steer has to
        // see an actually-absent prop, and a destructure default would hide it.
        steer: steerProp,
        streaks,
        tiles,
        pointer,
        width,
        height,
    } = props

    // A group the designer never opened arrives undefined; spread-merging over a
    // typed literal beats a hand-written ?? chain, where one missed key silently
    // pins a control forever.
    const streaks_ = { ...STREAK_DEFAULTS, ...(streaks || {}) }
    const tiles_ = { ...TILE_DEFAULTS, ...(tiles || {}) }
    const steerPct = num(steerProp, num(pointer && pointer.steer, 100))

    // The Font control is a whole typography stack; a single glyph fitted to a
    // square cell can only honour these three.
    const tileFont: TileFont = tiles_.font || {}
    const glyphFamily = typeof tileFont.fontFamily === "string" && tileFont.fontFamily ? tileFont.fontFamily : FALLBACK_FAMILY
    const glyphWeight = tileFont.fontWeight != null ? String(tileFont.fontWeight) : "600"
    const glyphStyle = tileFont.fontStyle === "italic" ? "italic" : "normal"

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    // Every live input is read from a ref inside the loop. Putting any of them in
    // the effect deps would rebuild the GL context on every colour tweak.
    const vRef = useRef<Record<string, number | string | string[]>>({})
    vRef.current = {
        bg: background,
        palette: Array.isArray(palette) ? palette : [],
        streakCount: Math.round(clampN(num(density, 400), 50, MAX_STREAKS)),
        flow: BASE_FLOW * (clampN(num(speed, 50), 0, 100) / 50),
        fov: clampN(num(perspective, 75), 10, 120),
        len: clampN(num(streaks_.length, 100), 10, 400) / 100,
        spread: (clampN(num(streaks_.spread, 100), 10, 300) / 100) * STREAK_SPREAD,
        streakOpacity: clampN(num(streaks_.opacity, 60), 0, 100) / 100,
        tileCount: Math.round(clampN(num(tiles_.count, 40), 0, MAX_TILES)),
        tileOpacity: clampN(num(tiles_.opacity, 90), 0, 100) / 100,
        tileSize: clampN(num(tiles_.size, 100), 10, 400) / 100,
        text: typeof tiles_.characters === "string" ? tiles_.characters : "",
        fontFamily: glyphFamily,
        fontWeight: glyphWeight,
        fontStyle: glyphStyle,
        steer: (clampN(steerPct, 0, 200) / 100) * ((STEER_MAX_DEG * Math.PI) / 180),
    }

    const ptrRef = useRef({ x: 0, y: 0, down: false })

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", {
            alpha: false,
            antialias: true,
            depth: false,
            powerPreference: "high-performance",
        })
        if (!gl) {
            console.error("WarpField: WebGL unavailable")
            return
        }

        const streakProg = link(gl, STREAK_VS, STREAK_FS)
        const tileProg = link(gl, TILE_VS, TILE_FS)
        if (!streakProg || !tileProg) return
        const su = uniformCache(gl, streakProg)
        const tu = uniformCache(gl, tileProg)

        const rand = mulberry32(0x5eed17)

        // ---- streak buffer: 2 vertices per streak, 8 floats each --------------
        // Allocated for MAX_STREAKS once. Density then only changes the draw
        // count, so the dial never rebuilds a buffer and never touches the
        // context.
        const S_STRIDE = 9
        const streakData = new Float32Array(MAX_STREAKS * 2 * S_STRIDE)
        {
            // The source's [0x10b981, 0x059669, 0x34d399, 0xffffff]: the base, a
            // darker base, a base lifted toward the accent, the accent. Rebuilt
            // from the palette's first two swatches so both actually drive the
            // ramp; the shipped defaults land on that emerald ramp (the third
            // entry within a few units of 0x34d399).
            const ramp: Array<[number, number]> = [
                [1, 0],
                [0.81, 0],
                [1, 0.22],
                [0, 1],
            ]
            for (let i = 0; i < MAX_STREAKS; i += 1) {
                const angle = rand() * Math.PI * 2
                const rnorm = rand()
                const z0 = (rand() - 0.5) * 2000
                const len = rand() * STREAK_LEN_SPREAD + STREAK_LEN_MIN
                const pick = ramp[Math.floor(rand() * ramp.length)]
                const pal = rand()
                const dx = Math.cos(angle)
                const dy = Math.sin(angle)
                for (let e = 0; e < 2; e += 1) {
                    const o = (i * 2 + e) * S_STRIDE
                    streakData[o] = dx
                    streakData[o + 1] = dy
                    streakData[o + 2] = rnorm
                    streakData[o + 3] = z0
                    streakData[o + 4] = e === 0 ? 0 : len
                    // The palette entry rides as two weights, not a colour, so
                    // the Base/Accent dials repaint the field without touching
                    // this buffer.
                    streakData[o + 5] = pick[0]
                    streakData[o + 6] = pick[1]
                    streakData[o + 7] = 0
                    streakData[o + 8] = pal
                }
            }
        }
        const streakBuf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, streakBuf)
        gl.bufferData(gl.ARRAY_BUFFER, streakData, gl.STATIC_DRAW)

        // ---- tile buffer: 6 vertices per tile, 14 floats each -----------------
        // The corner is now an ATTRIBUTE and the box a uniform, so the same
        // static buffer draws an 8x20 blank tile or a square glyph.
        const T_STRIDE = 15
        const tileData = new Float32Array(MAX_TILES * 6 * T_STRIDE)
        const tileZ0 = new Float32Array(MAX_TILES)
        {
            // 0xa7f3d0 / 0xd1fae5 / 0xffffff at the source's 40 / 30 / 30 split,
            // as base lifted toward accent.
            const mixes = [0.62, 0.82, 1]
            const corners: Array<[number, number]> = [
                [-0.5, -0.5],
                [0.5, -0.5],
                [0.5, 0.5],
                [-0.5, -0.5],
                [0.5, 0.5],
                [-0.5, 0.5],
            ]
            for (let i = 0; i < MAX_TILES; i += 1) {
                const angle = rand() * Math.PI * 2
                const radius = rand() * TILE_RADIUS_SPREAD + TILE_RADIUS_MIN
                const cx = Math.cos(angle) * radius
                const cy = Math.sin(angle) * radius
                const cz = (rand() - 0.5) * 2000
                const scale = rand() * 1.5 + 0.5
                const roll = rand()
                const mix = roll > 0.6 ? mixes[0] : rand() > 0.5 ? mixes[1] : mixes[2]
                const pal = rand()
                tileZ0[i] = cz

                // lookAt(0, 0, cz + TILE_AIM_AHEAD), resolved once. three points
                // the mesh's +Z at the target and derives right/up from world up.
                let fz = TILE_AIM_AHEAD
                let fx = -cx
                let fy = -cy
                const fl = Math.hypot(fx, fy, fz) || 1
                fx /= fl
                fy /= fl
                fz /= fl
                // right = normalize(cross(worldUp, forward))
                let rx = fz
                let ry = 0
                let rz = -fx
                const rl = Math.hypot(rx, ry, rz) || 1
                rx /= rl
                ry /= rl
                rz /= rl
                // up = cross(forward, right)
                const ux = fy * rz - fz * ry
                const uy = fz * rx - fx * rz
                const uz = fx * ry - fy * rx

                for (let c = 0; c < 6; c += 1) {
                    const o = (i * 6 + c) * T_STRIDE
                    // The size roll rides on the basis vectors, so the shader
                    // multiplies corner x box x Size and nothing else.
                    tileData[o] = rx * scale
                    tileData[o + 1] = ry * scale
                    tileData[o + 2] = rz * scale
                    tileData[o + 3] = ux * scale
                    tileData[o + 4] = uy * scale
                    tileData[o + 5] = uz * scale
                    tileData[o + 6] = cx
                    tileData[o + 7] = cy
                    tileData[o + 8] = cz
                    tileData[o + 9] = 1
                    tileData[o + 10] = mix
                    tileData[o + 11] = corners[c][0]
                    tileData[o + 12] = corners[c][1]
                    tileData[o + 13] = i
                    tileData[o + 14] = pal
                }
            }
        }
        const tileBuf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, tileBuf)
        gl.bufferData(gl.ARRAY_BUFFER, tileData, gl.STATIC_DRAW)

        // Tiles are alpha-blended, so they need painting far-to-near. three did
        // this in its transparent sort; raw GL does not, so the index buffer is
        // reordered each frame. The order barely changes between frames, which is
        // exactly where insertion sort is linear.
        const tileIdx = new Uint16Array(MAX_TILES * 6)
        const tileOrder = new Uint16Array(MAX_TILES)
        const tileDepth = new Float32Array(MAX_TILES)
        let orderedFor = -1
        const paletteFlat = new Float32Array(MAX_PALETTE * 3)
        const tileIdxBuf = gl.createBuffer()
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tileIdxBuf)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, tileIdx, gl.DYNAMIC_DRAW)

        // ---- glyph atlas -----------------------------------------------------
        // Lives on the GL side and is rebuilt from inside the loop against a key,
        // never from React state: setState with the same canvas node bails out
        // and the texture would never re-upload.
        const WHITE = new Uint8Array([255, 255, 255, 255])
        const atlasTex = gl.createTexture()
        const bindAtlas = () => {
            gl.bindTexture(gl.TEXTURE_2D, atlasTex)
        }
        bindAtlas()
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, WHITE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

        let atlasKey = "\u0000init"
        let atlasGrid = 1
        let atlasCount = 1
        let atlasTextOn = false
        const fontAsked = new Set<string>()

        const syncAtlas = (text: string, family: string, weight: string, style: string) => {
            const key = text + "\u0000" + style + " " + weight + " " + family
            if (key === atlasKey) return
            atlasKey = key
            const built = buildGlyphAtlas(glyphList(text), family, weight, style)
            bindAtlas()
            // Only the alpha channel is sampled, so the canvas's own premultiply
            // is irrelevant and the flag stays off.
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
            if (built) {
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, built.canvas)
                gl.generateMipmap(gl.TEXTURE_2D)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
                atlasGrid = built.grid
                atlasCount = built.count
                atlasTextOn = true
                // A Framer webfont is not necessarily in the document yet when
                // the atlas is drawn, and canvas silently falls back to the
                // default face. Redraw once the face resolves -- once per spec,
                // or clearing the key here would rebuild every frame.
                const spec = style + " " + weight + " " + Math.round(GLYPH_CELL * GLYPH_INK) + "px " + family
                const fonts = typeof document !== "undefined" ? (document as any).fonts : null
                if (fonts && typeof fonts.load === "function" && !fontAsked.has(spec)) {
                    fontAsked.add(spec)
                    try {
                        fonts.load(spec).then(() => {
                            atlasKey = "\u0000reload"
                        })
                    } catch (e) {
                        /* a family string canvas rejects: the fallback face stands */
                    }
                }
            } else {
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, WHITE)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
                atlasGrid = 1
                atlasCount = 1
                atlasTextOn = false
            }
        }

        const bindAttribs = (prog: WebGLProgram, names: string[], sizes: number[], stride: number) => {
            let offset = 0
            const used: number[] = []
            for (let i = 0; i < names.length; i += 1) {
                const loc = gl.getAttribLocation(prog, names[i])
                if (loc >= 0) {
                    gl.enableVertexAttribArray(loc)
                    gl.vertexAttribPointer(loc, sizes[i], gl.FLOAT, false, stride * 4, offset * 4)
                    used.push(loc)
                }
                offset += sizes[i]
            }
            return used
        }

        let raf = 0
        let last = performance.now()
        let flow = 0
        let steerX = 0
        let steerY = 0
        let boostNow = 1

        const render = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            const v = vRef.current
            const p = ptrRef.current

            syncAtlas(v.text as string, v.fontFamily as string, v.fontWeight as string, v.fontStyle as string)

            // Eased toward target; higher Damping settles faster.
            const k = 1 - Math.exp(-POINTER_DAMPING * 0.12 * dt)
            const boostTarget = p.down ? 1 + POINTER_BOOST : 1
            boostNow += (boostTarget - boostNow) * k
            steerX += (-p.x * (v.steer as number) - steerX) * k
            steerY += (p.y * (v.steer as number) - steerY) * k

            flow = (flow + (v.flow as number) * boostNow * dt) % SPAN

            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            const cw = sizeRef.current.w || canvas.clientWidth || 1200
            const ch = sizeRef.current.h || canvas.clientHeight || 800
            const bw = Math.max(1, Math.round(cw * dpr))
            const bh = Math.max(1, Math.round(ch * dpr))
            if (canvas.width !== bw || canvas.height !== bh) {
                canvas.width = bw
                canvas.height = bh
            }
            gl.viewport(0, 0, bw, bh)

            const bg = parseColor(v.bg as string, [0.008, 0.016, 0.039, 1])

            // The palette IS the base/accent ramp now -- one control instead of
            // three. Its first two swatches feed uBase/uAccent for the baked
            // ramp; a third swatch or more switches every streak and tile to a
            // random pick across the whole list.
            const paletteList = (v.palette as string[]) || []
            const base = parseColor(paletteList[0], [0.063, 0.725, 0.506, 1])
            const acc = parseColor(paletteList[1], [1, 1, 1, 1])
            const paletteCount = Math.max(1, Math.min(MAX_PALETTE, paletteList.length))
            for (let pi = 0; pi < MAX_PALETTE; pi += 1) {
                const c = pi < paletteList.length ? parseColor(paletteList[pi], [1, 1, 1, 1]) : base
                paletteFlat[pi * 3] = c[0]
                paletteFlat[pi * 3 + 1] = c[1]
                paletteFlat[pi * 3 + 2] = c[2]
            }
            const multiColorOn = paletteList.length > 2 ? 1 : 0

            gl.clearColor(bg[0], bg[1], bg[2], 1)
            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.disable(gl.DEPTH_TEST)
            gl.disable(gl.CULL_FACE)
            gl.enable(gl.BLEND)

            const focal = 1 / Math.tan((((v.fov as number) * Math.PI) / 180) / 2)
            const aspect = bw / Math.max(1, bh)
            const zA = (FAR + NEAR) / (NEAR - FAR)
            const zB = (2 * FAR * NEAR) / (NEAR - FAR)

            const camera = (u: (n: string) => WebGLUniformLocation | null) => {
                gl.uniform2f(u("uSteer"), steerX, steerY)
                gl.uniform1f(u("uFocal"), focal)
                gl.uniform1f(u("uAspect"), aspect)
                gl.uniform1f(u("uZA"), zA)
                gl.uniform1f(u("uZB"), zB)
                gl.uniform1f(u("uFog"), FOG_DENSITY)
            }

            // ---- streaks: additive, premultiplied ----------------------------
            gl.blendFunc(gl.ONE, gl.ONE)
            gl.useProgram(streakProg)
            gl.bindBuffer(gl.ARRAY_BUFFER, streakBuf)
            const sAttribs = bindAttribs(
                streakProg,
                ["a_dir", "a_rnorm", "a_z0", "a_off", "a_w", "a_pal"],
                [2, 1, 1, 1, 3, 1],
                S_STRIDE
            )
            camera(su)
            gl.uniform1f(su("uFlow"), flow)
            gl.uniform1f(su("uSpan"), SPAN)
            gl.uniform1f(su("uResetZ"), RESET_Z)
            gl.uniform1f(su("uRadiusMin"), STREAK_RADIUS_MIN)
            gl.uniform1f(su("uSpread"), v.spread as number)
            // Speed takes the whole boost; length takes its square root. A streak
            // is brightest at its NEAR end, and fog means the on-screen part of an
            // over-long one is all far end: stretching Hyperspace's streaks past
            // ~2x pushes the bright end out of frame and the whole field measurably
            // DIMS (lit area peaks at 200% length and is back below the 100% value
            // by 400%). A boost that dims is not a boost.
            gl.uniform1f(su("uLen"), (v.len as number) * Math.sqrt(boostNow))
            gl.uniform1f(su("uOpacity"), v.streakOpacity as number)
            gl.uniform3f(su("uBase"), base[0], base[1], base[2])
            gl.uniform3f(su("uAccent"), acc[0], acc[1], acc[2])
            gl.uniform3fv(su("uPalette[0]"), paletteFlat)
            gl.uniform1f(su("uPaletteCount"), paletteCount)
            gl.uniform1f(su("uMultiColor"), multiColorOn)
            gl.drawArrays(gl.LINES, 0, (v.streakCount as number) * 2)
            for (const loc of sAttribs) gl.disableVertexAttribArray(loc)

            // ---- tiles: premultiplied alpha, sorted far to near ---------------
            const tCount = v.tileCount as number
            if (tCount > 0) {
                if (orderedFor !== tCount) {
                    for (let i = 0; i < tCount; i += 1) tileOrder[i] = i
                    orderedFor = tCount
                }
                for (let i = 0; i < tCount; i += 1) {
                    let z = (tileZ0[i] + flow - RESET_Z) % SPAN
                    if (z < 0) z += SPAN
                    tileDepth[i] = RESET_Z + z
                }
                for (let i = 1; i < tCount; i += 1) {
                    const key = tileOrder[i]
                    const kz = tileDepth[key]
                    let j = i - 1
                    while (j >= 0 && tileDepth[tileOrder[j]] > kz) {
                        tileOrder[j + 1] = tileOrder[j]
                        j -= 1
                    }
                    tileOrder[j + 1] = key
                }
                for (let i = 0; i < tCount; i += 1) {
                    const t = tileOrder[i] * 6
                    for (let c = 0; c < 6; c += 1) tileIdx[i * 6 + c] = t + c
                }

                gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
                gl.useProgram(tileProg)
                gl.bindBuffer(gl.ARRAY_BUFFER, tileBuf)
                const tAttribs = bindAttribs(
                    tileProg,
                    ["a_right", "a_up", "a_center", "a_w", "a_corner", "a_id", "a_pal"],
                    [3, 3, 3, 2, 2, 1, 1],
                    T_STRIDE
                )
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tileIdxBuf)
                gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, tileIdx.subarray(0, tCount * 6))
                camera(tu)
                gl.uniform1f(tu("uFlow"), flow)
                gl.uniform1f(tu("uSpan"), SPAN)
                gl.uniform1f(tu("uResetZ"), RESET_Z)
                gl.uniform1f(tu("uSize"), v.tileSize as number)
                gl.uniform1f(tu("uBoxW"), atlasTextOn ? TILE_GLYPH : TILE_W)
                gl.uniform1f(tu("uBoxH"), atlasTextOn ? TILE_GLYPH : TILE_H)
                gl.uniform1f(tu("uGrid"), atlasGrid)
                gl.uniform1f(tu("uCount"), atlasCount)
                gl.activeTexture(gl.TEXTURE0)
                bindAtlas()
                gl.uniform1i(tu("uAtlas"), 0)
                gl.uniform1f(tu("uOpacity"), v.tileOpacity as number)
                gl.uniform3f(tu("uBg"), bg[0], bg[1], bg[2])
                gl.uniform3f(tu("uBase"), base[0], base[1], base[2])
                gl.uniform3f(tu("uAccent"), acc[0], acc[1], acc[2])
                gl.uniform3fv(tu("uPalette[0]"), paletteFlat)
                gl.uniform1f(tu("uPaletteCount"), paletteCount)
                gl.uniform1f(tu("uMultiColor"), multiColorOn)
                gl.drawElements(gl.TRIANGLES, tCount * 6, gl.UNSIGNED_SHORT, 0)
                for (const loc of tAttribs) gl.disableVertexAttribArray(loc)
            }

            raf = requestAnimationFrame(render)
        }

        // The rect RATIO is zoom-invariant -- offset and size scale together --
        // so this is safe on a zoomed Framer canvas where absolute px are not.
        const track = (e: PointerEvent) => {
            const r = canvas.getBoundingClientRect()
            if (r.width <= 0 || r.height <= 0) return
            ptrRef.current.x = ((e.clientX - r.left) / r.width) * 2 - 1
            ptrRef.current.y = 1 - ((e.clientY - r.top) / r.height) * 2
        }
        const onLeave = () => {
            ptrRef.current.x = 0
            ptrRef.current.y = 0
            ptrRef.current.down = false
        }
        const onDown = (e: PointerEvent) => {
            track(e)
            ptrRef.current.down = true
        }
        // Release on window: a pointer that leaves the component mid-press would
        // otherwise never let go and the boost would stick on.
        const onUp = () => {
            ptrRef.current.down = false
        }

        canvas.addEventListener("pointermove", track)
        canvas.addEventListener("pointerenter", track)
        canvas.addEventListener("pointerleave", onLeave)
        canvas.addEventListener("pointerdown", onDown)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        raf = requestAnimationFrame(render)

        // Never loseContext(): getContext returns the same context per canvas, so
        // StrictMode's mount -> cleanup -> mount would reuse a force-lost one.
        return () => {
            cancelAnimationFrame(raf)
            canvas.removeEventListener("pointermove", track)
            canvas.removeEventListener("pointerenter", track)
            canvas.removeEventListener("pointerleave", onLeave)
            canvas.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
        }
    }, [])

    return (
        <div
            style={{
                position: "relative",
                overflow: "hidden",
                background,
                isolation: "isolate",
                minWidth: 1200,
                minHeight: 800,
                width: typeof width === "number" && width > 0 ? width : "100%",
                height: typeof height === "number" && height > 0 ? height : "100%",
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
        </div>
    )
}
