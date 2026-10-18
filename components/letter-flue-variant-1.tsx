"use client"

import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"
import { animate, motion, useInView, useMotionValue, useTransform } from "motion/react"
import type { MotionValue, Transition, ValueAnimationTransition } from "motion/react"
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

/**
 * Letter Flue — falling down an endless square shaft whose four walls are
 * lettered, the words stretched long as they rush past and the whole shaft
 * slowly turning.
 *
 * Built after a reference animation supplied as ten still frames (720 × 720):
 * pale capitals reading "MOS / E RRUJ / SHPIRT" on a maroon ground, mapped onto
 * the inside of a square tunnel that the camera flies down while it rolls and
 * looks about. There was no source to transcribe, so the numbers below were
 * MEASURED off the frames (column and row scans of frame 1, where the view sits
 * dead centre and unrolled). The name is ours.
 *
 * WHAT THE FRAMES SAY, AND WHAT IS TRANSCRIBED
 *
 *   One block of type, repeated down every wall.  The phrase is set as a stacked
 *       block, left-aligned, read with each glyph's top pointing down the shaft:
 *       the first line is farthest, the last nearest. Every wall carries the same
 *       block, a quarter-turn round from the last, and all four are in phase, so
 *       the floor reads upright, the ceiling upside down ("MOS" → "SOW") and the
 *       side walls on their edges, every glyph's top toward the vanishing point.
 *       See `castRay` in the shader.
 *   Spacing in depth.  Taking the tunnel's half-width as 1 and the focal length
 *       as half the frame, lines repeat every 1.64 half-widths and each capital
 *       runs 0.76 of that (STRETCH_UNIT at Stretch 5, CAP_SHARE). Lines are evenly
 *       spaced: block to block is the same as line to line.
 *   Across the wall.  The longest line runs from 2% to 95.5% of the wall's width
 *       (TEXT_LEFT, TEXT_SPAN); shorter lines start at the same edge.
 *   A far end.  Type stops in a hard square at 5.6 half-widths (FAR_REF, at
 *       Depth 5); past it is bare ground. New lines arrive out of that edge.
 *   Frame 1's phase.  The last line's near edge sits 0.71 of a line out
 *       (NEAR_EDGE), so the component's first frame is the reference's.
 *   The motion.  Flying forward, rolling, and the view wandering: the vanishing
 *       point drifts off centre by up to ~120 px of 360 (≈18°, Sway 5) while the
 *       shaft stays square. Near letters smear, far ones stay crisp — motion blur
 *       over a fixed shutter, which is constant along the wall and so grows on
 *       screen with nearness (SHUTTER). Strokes ripple as they pass (Warp).
 *   Colours.  Ground #521825, type #DCE9ED, sampled.
 *
 * WHERE IT DEVIATES, AND WHY
 *
 *   No mesh. The shaft is ray-cast per pixel in one fragment shader rather than
 *   built as a back-faced box: the walls are exact planes at any depth, the type
 *   repeats forever without geometry, and the four seams are mathematically the
 *   diagonals, so nothing clips or z-fights at the far end.
 *   Speed, Spin and Sway rates are our choice: the frames give positions, not
 *   times. Sway is two incommensurate sines, so it never visibly loops.
 *   The type is fitted to the wall's width whatever the font, then the wall
 *   decides how long each letter runs (Stretch), so any face reads like the
 *   reference rather than overflowing or shrinking into the corner.
 *
 *   The pointer is ours: the frames have none. Over the frame, the view turns
 *   so the far square settles under the pointer (Follow) and the fall gathers
 *   speed (Boost); off it, both ease back to the reference's wander and
 *   cruise. Everything the pointer touches is eased (Smoothing), so nothing
 *   ever jumps.
 *
 * The Transition plays the entrance — the shaft fading up while the fall
 * gathers from a standstill to cruising speed — on a framer-motion value the
 * renderer reads every frame. The running flight is a hand-rolled clock; Speed,
 * Hover and Drift drive that.
 *
 * The `framer` import supplies the property controls only — under plain Next.js,
 * alias it to a stub exporting a no-op `addPropertyControls`, a `ControlType`
 * object, and a `RenderTarget` with `current: () => "preview"`.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 720
 * @framerIntrinsicHeight 720
 * @framerDisableUnlink
 */

/* --------------------------------------------------------------- constants --
 * World units are half-widths of the shaft; the camera sits on its axis.
 */

const TAU = Math.PI * 2

/** Focal length as a share of the frame's shorter side: 90° across it, which is
 * what the measurements were taken against. */
const FOCAL_SHARE = 0.5

/** Stretch 1 is this many half-widths of wall per line; 5 is the reference 1.64. */
const STRETCH_UNIT = 0.328
/** Capital height as a share of a line. */
const CAP_SHARE = 0.76
/** Where the last line's near edge starts at t = 0, in lines. */
const NEAR_EDGE = 0.707

/** The far end at Depth 5, in half-widths; every DEPTH_OCTAVE steps doubles it. */
const FAR_REF = 5.62
const DEPTH_OCTAVE = 2.5

/** The longest line spans this much of the wall's width, from this edge. */
const TEXT_LEFT = 0.02
const TEXT_SPAN = 0.935

/** Texture: one row per line. 4096 rows is the WebGL floor, so 16 lines. */
const TEX_W = 1024
const ROW_H = 256
const MAX_ROWS = 16

/** Speed 1 is this many half-widths a second; 5 passes a line in ~0.8 s. */
const SPEED_UNIT = 0.4
/** Spin 1 is this many radians a second; 3 turns the shaft once in ~42 s. */
const SPIN_UNIT = 0.05
/** Sway 1 is this much look-about, in radians; 5 is the reference ≈18°. The
 * two axes run at unrelated rates (rad/s) and pitch a little shallower. */
const SWAY_UNIT = 0.06
const SWAY_YAW_RATE = 0.86
const SWAY_PITCH_RATE = 0.69
const SWAY_PITCH_SHARE = 0.8
/** Warp 1 shifts strokes sideways by this share of a half-width, on a wave this
 * many radians per half-width deep, travelling at this many rad/s. */
const WARP_UNIT = 0.012
const WARP_WAVE = 1.4
const WARP_RATE = 1.6

/** Motion-blur exposure, in seconds, and the samples spread across it. */
const SHUTTER = 0.045
const SAMPLES = 6

/** Scroll Sens. 1 flies this many half-widths per pixel scrolled, eased in. */
const SCROLL_UNIT = 0.0008
const SCROLL_EASE = 8

/** However far the pointer is, the far square is never aimed further off axis
 * than this, in focal lengths (~58°): past it the near walls swallow the frame. */
const AIM_LIMIT = 1.6
/** Boost 1 adds this share of Speed while the pointer is over the frame, so
 * Boost 5 falls at 2.5× and 10 at 4×. */
const BOOST_UNIT = 0.3
/** Smoothing 0 → 10 eases the aim from FOLLOW_FAST per second down to
 * FOLLOW_FAST · FOLLOW_SPAN (Smoothing 5 settles in ~0.6 s). */
const FOLLOW_FAST = 20
const FOLLOW_SPAN = 0.06
/** Hand-over between wander and pointer, and the speed boost, ease at these
 * shares of the aim's rate: the view turns first, then the fall gathers, so a
 * hover reads as one long acceleration rather than a lurch. */
const HOVER_SHARE = 0.6
const BOOST_SHARE = 0.3
/** The entrance is fully faded up at this share of its progress; the speed
 * gathers over all of it. */
const ENTRY_FADE = 0.5

/* ------------------------------------------------------------------- types -- */

export interface LetterFlueDrift {
    /** How fast the shaft rolls. Positive turns it clockwise, 0 holds it. */
    spin: number
    /** How far the view wanders off the shaft's axis. 0 looks dead ahead. */
    sway: number
    /** How much the strokes ripple as they rush past. 0 keeps them straight. */
    warp: number
}

export interface LetterFlueHover {
    /** How far the far square follows the pointer. 10 puts it right under the
     * pointer, 0 leaves the view to wander on its own. */
    follow: number
    /** How much faster you fall while the pointer is over the frame. 0 keeps
     * the cruise. */
    boost: number
    /** How lazily the view and the speed catch up with the pointer. */
    smoothing: number
}

export interface LetterFlueProps {
    /** The block of type on every wall, one row per line. The first line is the
     * farthest down the shaft, the last the nearest. */
    lines: string[]
    background: string
    /** Family, weight, style and letter spacing. Size is fitted to the wall. */
    font: CSSProperties
    textColor: string
    /** How far down the shaft the type reaches before it stops. */
    depth: number
    /** How long each line runs along the wall: the letters' smear. */
    stretch: number
    /** How the shaft answers the pointer: aim, speed-up, and how softly. */
    hover: Partial<LetterFlueHover>
    /** How fast you fall when nobody is pointing. 0 holds still. */
    speed: number
    /** The secondary motions: roll, look-about and ripple. */
    drift: Partial<LetterFlueDrift>
    /** How far scrolling the page flies you on. 0 ignores the scroll. */
    scrollSens: number
    /** Plays the entrance: the shaft fades up as the fall gathers from a
     * standstill to Speed. */
    transition: Transition
    style?: CSSProperties
}

/* ---------------------------------------------------------------- defaults -- */

const DEFAULT_FONT: CSSProperties = {
    fontFamily: `Inter, "Helvetica Neue", Arial, sans-serif`,
    fontWeight: 800,
}

const DEFAULT_DRIFT: LetterFlueDrift = {
    spin: 3,
    sway: 5,
    warp: 3,
}

const DEFAULT_HOVER: LetterFlueHover = {
    follow: 8,
    boost: 5,
    smoothing: 5,
}

const DEFAULT_TRANSITION: Transition = {
    type: "tween",
    duration: 2.4,
    // A soft start and a long glide in: the fall gathers from rest without a
    // kick, and settles into cruise rather than arriving at it.
    ease: [0.45, 0, 0.2, 1],
}

const DEFAULTS = {
    lines: ["MOS", "E RRUJ", "SHPIRT"],
    background: "#181717",
    font: {
        defaultValue: {"variant":"Regular","fontSize":"16px","textAlign":"left","fontFamily":"Inter, \"Helvetica Neue\", Arial, sans-serif","fontWeight":800,"lineHeight":"1.5em","letterSpacing":"0em"},"fontFamily":"Inter, \"Helvetica Neue\", Arial, sans-serif","variant":"Regular","fontWeight":800,"fontSize":"16px","lineHeight":"1.5em","letterSpacing":"0em","textAlign":"left"},
    textColor: "#DCE9ED",
    depth: 5,
    stretch: 5,
    hover: DEFAULT_HOVER,
    speed: 5,
    drift: DEFAULT_DRIFT,
    scrollSens: 0,
    transition: {
        defaultValue: {"ease":[0.45,0,0.2,1],"mass":1,"type":"tween","damping":60,"duration":2.4,"stiffness":800},"type":"tween","stiffness":800,"damping":60,"mass":1,"duration":2.4,"ease":[0.45,0,0.2,1]},
}

type Config = {
    lines: string[]
    background: string
    font: CSSProperties
    textColor: string
    depth: number
    stretch: number
    hover: LetterFlueHover
    speed: number
    drift: LetterFlueDrift
    scrollSens: number
}

/* ----------------------------------------------------------------- helpers -- */

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

function wrap(v: number, m: number): number {
    return ((v % m) + m) % m
}

type Rgba = [number, number, number, number]

/** A scratch 2D context normalises any colour CSS accepts. Framer can hand a
 * token as `var(--token, fallback)`, which a canvas cannot resolve, so the
 * fallback is used. */
const colorCache = new Map<string, Rgba>()
let colorCtx: CanvasRenderingContext2D | null = null

function parseColor(input: string | undefined, fallback: string): Rgba {
    const raw = (input || fallback).trim()
    const hit = colorCache.get(raw)
    if (hit) return hit
    let css = raw
    const token = /^var\(\s*--[^,]+,\s*(.+)\)$/.exec(css)
    if (token) css = token[1]
    if (!colorCtx) colorCtx = document.createElement("canvas").getContext("2d")
    let out: Rgba = [0, 0, 0, 1]
    if (colorCtx) {
        colorCtx.fillStyle = "#000000"
        colorCtx.fillStyle = css
        const normal = String(colorCtx.fillStyle)
        if (normal.startsWith("#") && normal.length === 7) {
            out = [
                parseInt(normal.slice(1, 3), 16) / 255,
                parseInt(normal.slice(3, 5), 16) / 255,
                parseInt(normal.slice(5, 7), 16) / 255,
                1,
            ]
        } else {
            const parts = normal.match(/[\d.]+/g)
            if (parts && parts.length >= 3) {
                out = [
                    Number(parts[0]) / 255,
                    Number(parts[1]) / 255,
                    Number(parts[2]) / 255,
                    parts.length > 3 ? Number(parts[3]) : 1,
                ]
            }
        }
    }
    colorCache.set(raw, out)
    return out
}

function fontStringFor(font: CSSProperties, px: number): string {
    const family = font.fontFamily || (DEFAULT_FONT.fontFamily as string)
    const style = font.fontStyle === "italic" ? "italic" : "normal"
    const weight = String(font.fontWeight ?? DEFAULT_FONT.fontWeight)
    return `${style} ${weight} ${px}px ${family}`
}

/** The lines that will be drawn: cleared rows are rows the user is done with. */
function linesOf(lines: string[] | undefined): string[] {
    if (!Array.isArray(lines)) return []
    return lines
        .map((line) => String(line ?? "").replace(/\s+/g, " ").trim())
        .filter((line) => line.length > 0)
        .slice(0, MAX_ROWS)
}

/** One line's run along the wall, in half-widths. */
function pitchOf(cfg: Config): number {
    return STRETCH_UNIT * clamp(cfg.stretch, 1, 10, DEFAULTS.stretch)
}

function farOf(cfg: Config): number {
    return FAR_REF * Math.pow(2, (clamp(cfg.depth, 0, 10, DEFAULTS.depth) - 5) / DEPTH_OCTAVE)
}

/** What the type canvas is keyed on, so a recolour is not a redraw. */
function textureKeyOf(cfg: Config): string {
    const f = cfg.font
    return [linesOf(cfg.lines).join("\n"), f.fontFamily, f.fontWeight, f.fontStyle, f.letterSpacing].join("|")
}

/**
 * The block of type as a coverage mask, white on black: one row per line, the
 * first line at the top. Read with flipY, the top is the far end of a repeat.
 * Every line shares one horizontal scale, fitted so the longest spans the wall.
 */
function drawBlock(cfg: Config): { canvas: HTMLCanvasElement; rows: number } {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const lines = linesOf(cfg.lines)
    if (!ctx || lines.length === 0) {
        canvas.width = 4
        canvas.height = 4
        if (ctx) {
            ctx.fillStyle = "#000"
            ctx.fillRect(0, 0, 4, 4)
        }
        return { canvas, rows: 1 }
    }

    const setFont = (px: number) => {
        ctx.font = fontStringFor(cfg.font, px)
        const spacing = cfg.font.letterSpacing
        const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string }
        if (spacing !== undefined && spacing !== null && "letterSpacing" in c) {
            try {
                c.letterSpacing = typeof spacing === "number" ? `${spacing}px` : String(spacing)
            } catch {
                /* an unparseable value leaves the default */
            }
        }
    }

    // Size the face by its capitals, whatever the family's em proportions.
    setFont(100)
    const capRatio = (ctx.measureText("H").actualBoundingBoxAscent || 72) / 100
    const capPx = CAP_SHARE * ROW_H
    const fontPx = capPx / capRatio
    setFont(fontPx)
    // Ink extents, so the left edge is the letters' and not the side bearing's.
    const metrics = lines.map((line) => {
        const m = ctx.measureText(line)
        const left = isFinite(m.actualBoundingBoxLeft) ? m.actualBoundingBoxLeft : 0
        const right = isFinite(m.actualBoundingBoxRight) ? m.actualBoundingBoxRight : m.width
        return { left, ink: Math.max(1, left + right) }
    })
    const widest = Math.max(...metrics.map((m) => m.ink))
    const sx = (TEXT_SPAN * TEX_W) / widest

    canvas.width = TEX_W
    canvas.height = lines.length * ROW_H
    // Resizing resets the context, so the font is set again after it.
    setFont(fontPx)
    ctx.fillStyle = "#000"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = "#FFF"
    ctx.textBaseline = "alphabetic"
    lines.forEach((line, i) => {
        ctx.setTransform(sx, 0, 0, 1, TEXT_LEFT * TEX_W, 0)
        // Capitals centred in the row; the leftover is the gap between lines.
        ctx.fillText(line, metrics[i].left, i * ROW_H + (ROW_H + capPx) / 2)
    })
    return { canvas, rows: lines.length }
}

/** Where the flight starts, so the first frame is the reference's frame 1. */
function startTravel(cfg: Config, rows: number): number {
    const pitch = pitchOf(cfg)
    return wrap(((1 - CAP_SHARE) / 2 - NEAR_EDGE) * pitch, pitch * rows)
}

type Point = { x: number; y: number }

/**
 * Where the far square sits on screen for a given look, in focal lengths from
 * the centre, Y up. The shader turns each ray by pitch, then yaw, so the
 * shaft's axis is seen along the inverse of that: Rx(−pitch)·Ry(−yaw)·ẑ. Roll
 * spins about the axis itself and does not move it.
 */
function vanishingOf(yaw: number, pitch: number): Point {
    return { x: -Math.tan(yaw) / Math.cos(pitch), y: Math.tan(pitch) }
}

/** The look that puts the far square at `p` — the exact inverse of the above,
 * so the square lands on the pointer rather than near it. */
function lookAt(p: Point): { yaw: number; pitch: number } {
    const pitch = Math.atan(p.y)
    return { yaw: -Math.atan(p.x * Math.cos(pitch)), pitch }
}

/** One frame's ease toward a target at `rate` per second, whatever the frame
 * rate. */
function easeOf(rate: number, dt: number): number {
    return 1 - Math.exp(-rate * dt)
}

/* ----------------------------------------------------------------- shaders --
 * A full-frame quad; each pixel casts one ray down the shaft per blur sample.
 */

const VERTEX = /* glsl */ `
void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const FRAGMENT = /* glsl */ `
precision highp float;

uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uFocal;
uniform float uTile;     // half-widths of shaft per repeat of the block
uniform float uTravel;   // how far we have fallen, wrapped to one repeat
uniform float uVel;      // half-widths a second, for the blur
uniform vec3 uView;      // roll, yaw, pitch
uniform vec3 uViewRate;  // and their rates a second, for the blur
uniform float uShutter;
uniform float uFar;
uniform vec3 uWarp;      // amplitude, phase, rate
uniform vec4 uBg;
uniform vec4 uInk;

#define SAMPLES ${SAMPLES}
#define WARP_WAVE ${WARP_WAVE.toFixed(4)}

struct Hit {
    vec2 st;
    vec2 xy;
    vec2 axis;
    float z;
};

// The shaft is |x| <= 1, |y| <= 1, running down +z. A ray from its axis meets
// the wall its larger lateral component points at, so the seams are the
// diagonals. Each wall reads across along its own axis, a quarter-turn round
// from the last: floor +x, right wall +y, ceiling -x, left wall -y. That is
// one block wrapped round, every glyph's top pointing down the shaft.
Hit castRay(vec2 p, float tau) {
    float roll = uView.x + uViewRate.x * tau;
    float yaw = uView.y + uViewRate.y * tau;
    float pitch = uView.z + uViewRate.z * tau;

    vec3 d = vec3(p, 1.0);
    float c = cos(pitch);
    float s = sin(pitch);
    d = vec3(d.x, c * d.y - s * d.z, s * d.y + c * d.z);
    c = cos(yaw);
    s = sin(yaw);
    d = vec3(c * d.x + s * d.z, d.y, -s * d.x + c * d.z);
    c = cos(roll);
    s = sin(roll);
    d.xy = vec2(c * d.x + s * d.y, -s * d.x + c * d.y);

    float ax = abs(d.x);
    float ay = abs(d.y);
    vec3 h = d / max(max(ax, ay), 1e-6);
    vec2 axis;
    if (ay >= ax) axis = d.y < 0.0 ? vec2(1.0, 0.0) : vec2(-1.0, 0.0);
    else axis = d.x > 0.0 ? vec2(0.0, 1.0) : vec2(0.0, -1.0);

    float u = dot(h.xy, axis);
    u += uWarp.x * sin(h.z * WARP_WAVE + uWarp.y + uWarp.z * tau);

    Hit r;
    r.st = vec2(u * 0.5 + 0.5, (h.z + uTravel + uVel * tau) / uTile);
    r.xy = h.xy;
    r.axis = axis;
    r.z = h.z;
    return r;
}

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uFocal;

    // Gradients from the hit point, which is continuous over the seams (the
    // wall coordinate jumps there and would pick the coarsest mip in a line
    // down every diagonal), projected onto this pixel's wall.
    Hit h0 = castRay(p, 0.0);
    vec2 dxy = dFdx(h0.xy);
    vec2 dyy = dFdy(h0.xy);
    float dzx = dFdx(h0.z);
    float dzy = dFdy(h0.z);
    vec2 gx = vec2(0.5 * dot(dxy, h0.axis), dzx / uTile);
    vec2 gy = vec2(0.5 * dot(dyy, h0.axis), dzy / uTile);
    float edge = max(abs(dzx) + abs(dzy), 1e-5);

    // Each pixel starts its samples at its own point in the first slot
    // (interleaved gradient noise), so the nearest letters smear smoothly
    // instead of showing SAMPLES stepped copies.
    float jitter = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    float cover = 0.0;
    for (int k = 0; k < SAMPLES; k++) {
        float tau = ((float(k) + jitter) / float(SAMPLES) - 0.5) * uShutter;
        Hit h = castRay(p, tau);
        float ink = textureGrad(uTex, h.st, gx, gy).r;
        // The far end: a hard square, antialiased over one pixel of depth.
        ink *= clamp((uFar - h.z) / edge, 0.0, 1.0);
        cover += ink;
    }
    cover /= float(SAMPLES);

    float a = mix(uBg.a, uInk.a, cover);
    vec3 rgb = uBg.rgb * uBg.a * (1.0 - cover) + uInk.rgb * uInk.a * cover;
    gl_FragColor = vec4(rgb, a);
}
`

/* ------------------------------------------------------------------- scene -- */

class FlueScene {
    private host: HTMLElement
    private cfg: Config
    private renderer: THREE.WebGLRenderer
    private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    private scene = new THREE.Scene()
    private material: THREE.ShaderMaterial
    private mesh: THREE.Mesh
    private blank: THREE.DataTexture

    private texture: THREE.CanvasTexture | null = null
    private textureKey = ""
    private rows = 1

    private width = 1
    private height = 1
    private frameId = 0
    private lastT = 0
    private disposed = false
    private visible = true
    private observer: IntersectionObserver | null = null
    private fontRequests = new Set<string>()

    /** The flight's clock, distance fallen (wrapped to one repeat) and roll. */
    private time = 0
    private travel = 0
    private roll = 0
    private scrollTarget = 0
    private scrollDone = 0
    private scrollVel = 0
    private lastScrollY = 0
    private running = false

    /** The pointer, in focal lengths from the frame's centre, Y up. */
    private pointer: Point & { inside: boolean } = { x: 0, y: 0, inside: false }
    /** Where the far square is being steered to, eased after the pointer. */
    private aim: Point = { x: 0, y: 0 }
    /** Where the far square is drawn this frame. */
    private vanishing: Point = { x: 0, y: 0 }
    /** 0 → 1: how far the pointer has taken over the view, and the speed. */
    private hold = 0
    private boost = 0
    /** The look and fall drawn this frame, and their rates for the blur. */
    private yaw = 0
    private pitch = 0
    private yawRate = 0
    private pitchRate = 0
    private vel = 0

    /** The entrance's progress, 0 → 1, read every frame. */
    entry: () => number = () => 1
    /** Set by the host so a static render can repaint once fonts land. */
    onRedraw: (() => void) | null = null

    constructor(host: HTMLElement, mount: HTMLElement, cfg: Config) {
        this.host = host
        this.cfg = cfg

        // One full-frame quad: the shader does its own filtering, so no MSAA.
        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        this.renderer.setClearColor(0x000000, 0)
        const canvas = this.renderer.domElement
        canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block"
        mount.appendChild(canvas)

        this.blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1)
        this.blank.needsUpdate = true

        this.material = new THREE.ShaderMaterial({
            vertexShader: VERTEX,
            fragmentShader: FRAGMENT,
            // The shader writes premultiplied colour, ground and type both.
            blending: THREE.NoBlending,
            depthTest: false,
            depthWrite: false,
            uniforms: {
                uTex: { value: this.blank },
                uRes: { value: new THREE.Vector2(1, 1) },
                uFocal: { value: 1 },
                uTile: { value: 1 },
                uTravel: { value: 0 },
                uVel: { value: 0 },
                uView: { value: new THREE.Vector3() },
                uViewRate: { value: new THREE.Vector3() },
                uShutter: { value: SHUTTER },
                uFar: { value: FAR_REF },
                uWarp: { value: new THREE.Vector3() },
                uBg: { value: new THREE.Vector4(0, 0, 0, 1) },
                uInk: { value: new THREE.Vector4(1, 1, 1, 1) },
            },
        })
        this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material)
        this.mesh.frustumCulled = false
        this.scene.add(this.mesh)

        if (document.fonts) document.fonts.addEventListener("loadingdone", this.onFontsLoaded)

        this.applyConfig()
        this.travel = startTravel(this.cfg, this.rows)
        // A still frame is blurred as if cruising; a running one starts at rest.
        this.vel = this.speedVel()
    }

    /* ---- config --------------------------------------------------------------- */

    private applyConfig() {
        const cfg = this.cfg
        this.buildTexture(false)
        const u = this.material.uniforms
        const bg = parseColor(cfg.background, DEFAULTS.background)
        const ink = parseColor(cfg.textColor, DEFAULTS.textColor)
        ;(u.uBg.value as THREE.Vector4).set(bg[0], bg[1], bg[2], bg[3])
        ;(u.uInk.value as THREE.Vector4).set(ink[0], ink[1], ink[2], ink[3])
    }

    /** Redraw the type if it changed; `force` redraws regardless (fonts landed). */
    private buildTexture(force: boolean) {
        const key = textureKeyOf(this.cfg)
        if (!force && key === this.textureKey && this.texture) return
        this.textureKey = key
        const block = drawBlock(this.cfg)
        const texture = new THREE.CanvasTexture(block.canvas)
        // Across the wall it stops at the corners; down it, it repeats forever.
        texture.wrapS = THREE.ClampToEdgeWrapping
        texture.wrapT = THREE.RepeatWrapping
        texture.minFilter = THREE.LinearMipmapLinearFilter
        texture.magFilter = THREE.LinearFilter
        // The walls are seen nearly edge-on toward the far end; without this the
        // type there smears to a pink haze.
        texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy())
        texture.colorSpace = THREE.NoColorSpace
        texture.needsUpdate = true
        this.texture?.dispose()
        this.texture = texture
        this.rows = block.rows
        this.material.uniforms.uTex.value = texture
        this.requestFont()
    }

    /** Ask for the face; the loadingdone listener redraws when it lands. */
    private requestFont() {
        if (!document.fonts) return
        const spec = fontStringFor(this.cfg.font, 32)
        if (this.fontRequests.has(spec)) return
        this.fontRequests.add(spec)
        document.fonts.load(spec, linesOf(this.cfg.lines).join(" ") || "A").then(
            () => this.onFontsLoaded(),
            () => undefined
        )
    }

    private onFontsLoaded = () => {
        if (this.disposed) return
        this.buildTexture(true)
        this.onRedraw?.()
    }

    private tile(): number {
        return pitchOf(this.cfg) * this.rows
    }

    private drift(): LetterFlueDrift {
        const d = this.cfg.drift
        return {
            spin: clamp(d.spin, -10, 10, DEFAULT_DRIFT.spin),
            sway: clamp(d.sway, 0, 10, DEFAULT_DRIFT.sway),
            warp: clamp(d.warp, 0, 10, DEFAULT_DRIFT.warp),
        }
    }

    private speedVel(): number {
        return clamp(this.cfg.speed, 0, 10, DEFAULTS.speed) * SPEED_UNIT
    }

    private hoverCfg(): LetterFlueHover {
        const h = this.cfg.hover
        return {
            follow: clamp(h.follow, 0, 10, DEFAULT_HOVER.follow),
            boost: clamp(h.boost, 0, 10, DEFAULT_HOVER.boost),
            smoothing: clamp(h.smoothing, 0, 10, DEFAULT_HOVER.smoothing),
        }
    }

    /* ---- motion --------------------------------------------------------------- */

    private advance(dt: number) {
        this.time += dt
        const t = this.time
        const hover = this.hoverCfg()
        const drift = this.drift()
        const rate = FOLLOW_FAST * Math.pow(FOLLOW_SPAN, hover.smoothing / 10)
        const inside = this.pointer.inside ? 1 : 0

        // The pointer takes the view over gradually, and gives it back the same
        // way, so entering or leaving the frame is a turn, never a snap.
        this.hold += ((hover.follow > 0 ? inside : 0) - this.hold) * easeOf(rate * HOVER_SHARE, dt)
        this.boost += (inside - this.boost) * easeOf(rate * BOOST_SHARE, dt)

        // The aim chases the pointer, stopping short of it by Follow and never
        // swinging past AIM_LIMIT.
        const share = hover.follow / 10
        let tx = this.pointer.x * share
        let ty = this.pointer.y * share
        const reach = Math.hypot(tx, ty)
        if (reach > AIM_LIMIT) {
            tx *= AIM_LIMIT / reach
            ty *= AIM_LIMIT / reach
        }
        const k = easeOf(rate, dt)
        this.aim.x += (tx - this.aim.x) * k
        this.aim.y += (ty - this.aim.y) * k

        // The reference's wander, as a place on screen, handed over to the aim.
        const swayAmp = drift.sway * SWAY_UNIT
        const wander = vanishingOf(
            swayAmp * Math.sin(SWAY_YAW_RATE * t),
            swayAmp * SWAY_PITCH_SHARE * Math.sin(SWAY_PITCH_RATE * t)
        )
        this.vanishing = {
            x: wander.x + (this.aim.x - wander.x) * this.hold,
            y: wander.y + (this.aim.y - wander.y) * this.hold,
        }
        const look = lookAt(this.vanishing)
        if (dt > 0) {
            this.yawRate = (look.yaw - this.yaw) / dt
            this.pitchRate = (look.pitch - this.pitch) / dt
        }
        this.yaw = look.yaw
        this.pitch = look.pitch

        // The entrance gathers the fall from rest; hovering adds Boost on top.
        const gather = Math.max(0, this.entry())
        this.vel = this.speedVel() * (1 + hover.boost * BOOST_UNIT * this.boost) * gather

        // A wheel's steps arrive as one glide rather than a lurch per notch.
        const step = (this.scrollTarget - this.scrollDone) * easeOf(SCROLL_EASE, dt)
        this.scrollDone += step
        this.scrollVel = dt > 0 ? step / dt : 0
        this.travel = wrap(this.travel + this.vel * dt + step, this.tile())
        // Positive Spin is clockwise on screen, which is a negative roll here.
        this.roll = wrap(this.roll - drift.spin * SPIN_UNIT * dt, TAU)
    }

    private draw() {
        const u = this.material.uniforms
        const drift = this.drift()
        const t = this.time

        u.uTile.value = this.tile()
        u.uTravel.value = this.travel
        u.uVel.value = this.vel + this.scrollVel
        ;(u.uView.value as THREE.Vector3).set(this.roll, this.yaw, this.pitch)
        ;(u.uViewRate.value as THREE.Vector3).set(-drift.spin * SPIN_UNIT, this.yawRate, this.pitchRate)
        u.uFar.value = farOf(this.cfg)
        ;(u.uWarp.value as THREE.Vector3).set(drift.warp * WARP_UNIT, wrap(WARP_RATE * t, TAU), WARP_RATE)
        this.renderer.render(this.scene, this.camera)
    }

    /* ---- pointer -------------------------------------------------------------- */

    private readPointer(event: PointerEvent) {
        // The rect is the frame as shown, scale and all, and so is the focal
        // length taken from it: the square lands on the pointer at any zoom.
        const rect = this.host.getBoundingClientRect()
        const focal = Math.max(1, Math.min(rect.width, rect.height) * FOCAL_SHARE)
        this.pointer.x = (event.clientX - rect.left - rect.width / 2) / focal
        this.pointer.y = (rect.top + rect.height / 2 - event.clientY) / focal
    }

    private onPointerEnter = (event: PointerEvent) => {
        this.readPointer(event)
        // Start the chase from where the square is now, not where it was left.
        if (!this.pointer.inside && this.hold < 0.01) this.aim = { ...this.vanishing }
        this.pointer.inside = true
    }

    private onPointerMove = (event: PointerEvent) => {
        this.readPointer(event)
        this.pointer.inside = true
    }

    private onPointerLeave = () => {
        this.pointer.inside = false
    }

    /* ---- page ----------------------------------------------------------------- */

    private onScroll = () => {
        const y = window.scrollY
        const delta = y - this.lastScrollY
        this.lastScrollY = y
        const sens = clamp(this.cfg.scrollSens, 0, 10, DEFAULTS.scrollSens)
        // Down flies you on; up pulls you back up the shaft.
        this.scrollTarget += delta * sens * SCROLL_UNIT
    }

    private attach() {
        const node = this.host
        node.addEventListener("pointerenter", this.onPointerEnter)
        node.addEventListener("pointermove", this.onPointerMove)
        node.addEventListener("pointerleave", this.onPointerLeave)
        node.addEventListener("pointercancel", this.onPointerLeave)
        this.lastScrollY = window.scrollY
        window.addEventListener("scroll", this.onScroll, { passive: true })
        if (typeof IntersectionObserver !== "undefined") {
            this.observer = new IntersectionObserver((entries) => {
                this.visible = entries.some((e) => e.isIntersecting)
            })
            this.observer.observe(this.host)
        }
    }

    private detach() {
        const node = this.host
        node.removeEventListener("pointerenter", this.onPointerEnter)
        node.removeEventListener("pointermove", this.onPointerMove)
        node.removeEventListener("pointerleave", this.onPointerLeave)
        node.removeEventListener("pointercancel", this.onPointerLeave)
        window.removeEventListener("scroll", this.onScroll)
        this.observer?.disconnect()
        this.observer = null
    }

    /* ---- host ----------------------------------------------------------------- */

    setSize(width: number, height: number) {
        if (this.disposed) return
        this.width = Math.max(1, width)
        this.height = Math.max(1, height)
        this.renderer.setSize(this.width, this.height, false)
        const dpr = this.renderer.getPixelRatio()
        const u = this.material.uniforms
        ;(u.uRes.value as THREE.Vector2).set(this.width * dpr, this.height * dpr)
        u.uFocal.value = Math.min(this.width, this.height) * dpr * FOCAL_SHARE
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        this.cfg = cfg
        this.applyConfig()
        if (!this.running) this.vel = this.speedVel()
    }

    /** One frame for the Framer canvas, at rest. */
    renderStatic() {
        if (this.disposed) return
        this.draw()
    }

    start() {
        this.running = true
        this.vel = 0
        this.attach()
        this.lastT = performance.now()
        const loop = () => {
            if (this.disposed) return
            this.frameId = requestAnimationFrame(loop)
            const now = performance.now()
            let dt = (now - this.lastT) / 1000
            this.lastT = now
            if (!this.visible) return
            if (!isFinite(dt) || dt < 0) dt = 0
            // A tab back from the background must not jump the flight.
            if (dt > 0.05) dt = 0.05
            this.advance(dt)
            this.draw()
        }
        this.frameId = requestAnimationFrame(loop)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        this.detach()
        if (document.fonts) document.fonts.removeEventListener("loadingdone", this.onFontsLoaded)
        this.mesh.geometry.dispose()
        this.material.dispose()
        this.texture?.dispose()
        this.blank.dispose()
        this.renderer.dispose()
        const canvas = this.renderer.domElement
        canvas.parentNode?.removeChild(canvas)
    }
}

/* -------------------------------------------------------------- component -- */

/** On the Framer canvas frames are painted on demand, so a board full of
 * instances is not a board full of render loops. */
function isStatic(): boolean {
    try {
        return RenderTarget.current() === RenderTarget.canvas
    } catch {
        return false
    }
}

function prefersReducedMotion(): boolean {
    return (
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 720
 * @framerIntrinsicHeight 720
 * @framerDisableUnlink
 */
function __BaseImpl_LetterFlue(props: Partial<LetterFlueProps>) {
    const {
        lines = ["MOS","E RRUJ","SHPIRT"],
        background = DEFAULTS.background,
        font = {"variant":"Regular","fontSize":"16px","textAlign":"left","fontFamily":"Inter, \"Helvetica Neue\", Arial, sans-serif","fontWeight":800,"lineHeight":"1.5em","letterSpacing":"0em"},
        textColor = DEFAULTS.textColor,
        depth = DEFAULTS.depth,
        stretch = DEFAULTS.stretch,
        hover = DEFAULTS.hover,
        speed = DEFAULTS.speed,
        drift = DEFAULTS.drift,
        scrollSens = DEFAULTS.scrollSens,
        transition = {"ease":[0.45,0,0.2,1],"mass":1,"type":"tween","damping":60,"duration":2.4,"stiffness":800},
        style,
    } = props

    const hostRef = useRef<HTMLDivElement>(null)
    const mountRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<FlueScene | null>(null)
    // 0 on the server and on first paint alike, so nothing mismatches.
    const entry: MotionValue<number> = useMotionValue(0)
    const inView = useInView(hostRef, { once: true, amount: 0.2 })
    // Up in the first part of the entrance; the fall keeps gathering after.
    const fade = useTransform(entry, [0, ENTRY_FADE], [0, 1])

    // Rebuilt per render and read by the scene, so a slider drag lands on the
    // next frame without the renderer ever being torn down.
    const cfg: Config = {
        lines: Array.isArray(lines) ? lines : DEFAULTS.lines,
        background,
        font: { ...DEFAULT_FONT, ...font },
        textColor,
        depth,
        stretch,
        hover: { ...DEFAULT_HOVER, ...hover },
        speed,
        drift: { ...DEFAULT_DRIFT, ...drift },
        scrollSens,
    }
    const cfgRef = useRef<Config>(cfg)
    cfgRef.current = cfg
    const cfgKey = JSON.stringify(cfg)
    const transitionKey = JSON.stringify(transition ?? null)

    /* ---- the entrance: declared before the renderer so a static paint sees 1 */

    useEffect(() => {
        if (isStatic() || prefersReducedMotion()) {
            entry.set(1)
            sceneRef.current?.renderStatic()
            return
        }
        if (!inView) {
            entry.set(0)
            return
        }
        // Replays whenever the curve changes, so it can be judged by editing it.
        entry.set(0)
        // The panel hands back the general Transition shape; for one number it
        // is exactly the single-value options animate() takes.
        const controls = animate(entry, 1, transition as ValueAnimationTransition<number>)
        return () => controls.stop()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inView, transitionKey])

    /* ---- the renderer, built once ---- */

    useEffect(() => {
        const host = hostRef.current
        const mount = mountRef.current
        if (!host || !mount) return
        let scene: FlueScene
        try {
            scene = new FlueScene(host, mount, cfgRef.current)
        } catch {
            // No WebGL — the bare ground rather than a thrown render.
            return
        }
        sceneRef.current = scene
        scene.entry = () => entry.get()
        scene.setSize(host.clientWidth, host.clientHeight)

        // Reduced motion gets frame 1 held still: the shaft, without the fall.
        const still = isStatic() || prefersReducedMotion()
        if (still) {
            scene.onRedraw = () => scene.renderStatic()
            scene.renderStatic()
        } else {
            scene.start()
        }

        const ro = new ResizeObserver(() => {
            scene.setSize(host.clientWidth, host.clientHeight)
            if (still) scene.renderStatic()
        })
        ro.observe(host)
        return () => {
            ro.disconnect()
            scene.dispose()
            sceneRef.current = null
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        const scene = sceneRef.current
        if (!scene) return
        scene.updateConfig(cfgRef.current)
        if (isStatic() || prefersReducedMotion()) scene.renderStatic()
    }, [cfgKey])

    return (
        <div
            ref={hostRef}
            role="img"
            aria-label={linesOf(cfg.lines).join(" ") || "A tunnel of lettered walls"}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 120,
                minHeight: 120,
                overflow: "hidden",
                backgroundColor: background,
                userSelect: "none",
                ...style,
            }}
        >
            <motion.div ref={mountRef} style={{ position: "absolute", inset: 0, opacity: fade }} />
        </div>
    )
}

LetterFlue.displayName = "Letter Flue"
LetterFlue.defaultProps = { ...DEFAULTS }

/* ---------------------------------------------------------------- controls -- */

const __presetProps = {
  "background": "#181717",
  "textColor": "#C5FF00",
  "lines": [
    "COMPONENT",
    "LETTER",
    "STUDIO"
  ],
  "font": {
    "variant": "Regular",
    "fontSize": "16px",
    "textAlign": "left",
    "fontFamily": "Inter, \"Helvetica Neue\", Arial, sans-serif",
    "fontWeight": 800,
    "lineHeight": "1.5em",
    "letterSpacing": "0em"
  },
  "depth": 10,
  "stretch": 5,
  "speed": 5,
  "scrollSens": 0,
  "hover": {
    "boost": 5,
    "follow": 8,
    "smoothing": 5
  },
  "drift": {
    "spin": 3,
    "sway": 5,
    "warp": 3
  },
  "transition": {
    "ease": [
      0.45,
      0,
      0.2,
      1
    ],
    "mass": 1,
    "type": "tween",
    "damping": 60,
    "duration": 2.4,
    "stiffness": 800
  }
};

export default function LetterFlue(props: Record<string, unknown>) {
  return <__BaseImpl_LetterFlue {...(__presetProps as Record<string, unknown>)} {...props} />;
}
