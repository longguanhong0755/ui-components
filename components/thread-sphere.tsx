"use client"

import { AnimatePresence, motion } from "motion/react"
import type { Transition } from "motion/react"
import { useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties } from "react"

/* ------------------------------------------------------------------ *
 *  BriarGlobe
 *  A ball of hair-fine thread: a few hundred points wound into a
 *  sphere and tied together by thousands of straight chords, turning
 *  slowly on white. A handful of points are hubs that dozens of chords
 *  converge on, and they read as dark stars caught in the tangle. It
 *  arrives as a loose cloud of bright points that draws itself in, it
 *  breathes or wobbles while it turns, and hovering a point deepens the
 *  thread around it while a grey pill trails the cursor with its name.
 *
 *  Reverse-engineered from a screen recording of a dermatology network
 *  graph (frames only, no source), so the numbers below are read off
 *  the frames rather than transcribed. The labels are the six the
 *  recording showed; that the same names recur on different points
 *  (Melanoma three times, Basal Cell twice) is what says the list is
 *  short and cycled, not one name per point.
 *
 *  Eight decisions carry it:
 *
 *    1. THREE KINDS OF CHORD, BECAUSE THE FRAMES SHOW THREE. Short
 *       links to each point's nearest neighbours give the sphere its
 *       faceted, polygonal rim -- the outline in the recording is a
 *       many-sided polygon, not a circle, which is what surface chords
 *       look like edge-on. Links from every point to a few nearby hubs
 *       give the stars. A sprinkling of long random chords fills the
 *       interior with the fuzz that makes it read as a volume rather
 *       than a shell.
 *
 *    2. DEPTH IS OPACITY, PER VERTEX. The near side is dark and the far
 *       side nearly gone. Each end of a chord fades by its own depth and
 *       the GPU interpolates between them, so a chord running front to
 *       back thins out along its length.
 *
 *    3. WEBGL, WITH OUR OWN LINES. A 2D canvas is fine at a hairline and
 *       measured 5fps the moment a chord is wider than one device pixel,
 *       so it could never have had a Thickness control. `gl.LINES` is no
 *       better: one hard aliased pixel, whatever you ask for. Every chord
 *       is instead a quad the vertex shader pushes out sideways in screen
 *       space, feathered by one pixel in the fragment shader. Under a
 *       device pixel the width holds and the alpha drops, so Thickness is
 *       one continuous scale and a 1x and a 3x screen carry the same ink.
 *
 *    4. EVERY MOVEMENT IS ONE FORMULA, WRITTEN TWICE. The intro, the
 *       breathing and the wobble all move points, and the hover has to
 *       find the point the GPU actually drew. So `place()` exists in GLSL
 *       and again, line for line, in TypeScript -- which is also why the
 *       noise is a product of sines rather than simplex: it is as smooth
 *       and it can be written identically in both.
 *
 *    5. BREATHE AND WOBBLE ARE DIFFERENT MOTIONS, NOT ONE AT TWO SPEEDS.
 *       Breathing changes the ball's volume: a slow inhale under a soft
 *       travelling swell. Wobbling keeps the volume and changes the
 *       shape: the ball rocks on its axis (the brief's sin on x, cos on z)
 *       and squashes like jelly along an axis that drifts, stretching one
 *       way as it narrows the other. Motion picks one, or both.
 *
 *    6. THE INTRO IS A CONTRACTION, AND IT RIPPLES. The ball starts
 *       inflated, as bright points with the thread barely there, then
 *       draws itself in. Each point's start is staggered by a smooth
 *       function of where it sits, so the tightening travels across the
 *       surface as a wave instead of the whole cloud shrinking at once,
 *       and each point overshoots its place by a few percent and settles
 *       back. The thread comes up as its ends arrive and the points fade
 *       out as they land, so what is left is exactly the resting ball.
 *       It waits until the ball is on screen.
 *
 *    7. THE HOVER DEEPENS THE THREAD, IT DOES NOT MARK IT. The recording
 *       shows the section under the cursor coming up richer and darker,
 *       and no marker on the point. The patch is per pixel -- the
 *       fragment's distance to the cursor -- so a long chord darkens only
 *       where it passes under the pointer and the patch has no edge. The
 *       chords tied to the picked point deepen along their whole length.
 *
 *    8. THE PILL IS ON A SPRING WE INTEGRATE, AND ITS WORD IS ON THE
 *       TRANSITION. The pill chasing the cursor is a damped spring run in
 *       the draw loop, so it moves on the same frame as the ball and its
 *       lag is one slider; it leans a few degrees into its own velocity
 *       like a tag on a string. Restarting a framer-motion spring on every
 *       pointer event, which the first build did, re-plans the curve up
 *       to 120 times a second and stutters on fast moves. What framer-
 *       motion does play is the pill's pop in and out. The word itself
 *       changes on the spot: sliding it in and out made the text drift
 *       inside the pill every time the cursor crossed to a new point,
 *       which read as the pill lagging rather than the pill following.
 * ------------------------------------------------------------------ */

/* ---------------------------------------------------------- constants */

const TAU = Math.PI * 2

/** How much of the frame's short side the ball spans. Read off the
 *  recording, where it fills about 86% of the card's height. Fixed: the
 *  frame is the size control. */
const FILL = 0.86

/** Camera distance in sphere radii. Enough perspective that the near
 *  side swells a little past the far side as it turns -- the depth cue
 *  the opacity alone does not give -- without the rim bulging. */
const CAMERA = 3.4

/** Floor on the perspective divide. Breathing and jelly together never
 *  get near it; it is there so no setting can divide by zero. */
const CAMERA_NEAR = 0.6

/** Silhouette of a unit sphere under that camera, relative to its
 *  radius: the rim sits at `CAMERA / sqrt(CAMERA^2 - 1)`, not at 1. The
 *  radius is divided by this so FILL is the size you actually see. */
const SILHOUETTE = CAMERA / Math.sqrt(CAMERA * CAMERA - 1)

/** Diameter of the speck on every hub, in CSS px, so the stars have a
 *  centre and not just a convergence. */
const KNOT_SIZE = 2.8

/** Largest a speck may draw, in device px, whatever the perspective.
 *  Inside every GPU's point-size range. */
const MAX_POINT_PX = 48

/** Contrast curve on the depth fade. Above 1 keeps the far half faint
 *  and lets only the near third come up dark, which is the recording. */
const DEPTH_CURVE = 1.6

/** Nearest-neighbour links per point: the faceted skin. */
const MESH_LINKS = 3

/** Share of points that sit inside the ball rather than on its skin.
 *  Enough to give the interior some knots of its own. */
const INTERIOR_SHARE = 0.16

/** Spread of a point's pull towards hubs, in sphere radii. Smaller and
 *  every star is a tight local burst; larger and the chords run clean
 *  across the ball and the stars stop reading as places. */
const HUB_REACH = 0.75

/** Share of links spent on long random chords rather than hubs. */
const CHORD_SHARE = 0.3

/** Share of chords drawn in the accent tone. The recording is mostly
 *  grey with a warm brown running through it, not half and half. */
const ACCENT_SHARE = 0.25

/** Safety cap. 1200 points at full density lands well under this. */
const MAX_EDGES = 24000

/** A point is only pickable once it is this far round to the front, on
 *  0 (back) .. 1 (front). Just past the equator, so the rim stays
 *  pickable but nothing behind it is. */
const FRONT_T = 0.45

/** Once a point is picked, it keeps the pill until the cursor is this
 *  much further out than Reach -- so a cursor sitting between two points
 *  does not flicker the name between them. */
const HOLD_REACH = 1.35

/** Grace before the pill leaves when the cursor finds nothing. Bridges
 *  the gap between two points so moving across the ball reads as one
 *  continuous hover rather than a pill blinking on and off. */
const HOLD_MS = 220

/** Where the pill sits relative to the cursor it is chasing, in px. */
const PILL_OFFSET_X = 0
const PILL_OFFSET_Y = -30

/** The pill's spring, as natural frequency in rad/s at Pill Lag 0 and
 *  10. Geometric between them, so the middle of the slider is the
 *  middle of the feel: 0 all but pins it, 10 lets it float after the
 *  cursor for most of a second. */
const PILL_OMEGA_AT_ZERO = 38
const PILL_OMEGA_AT_TEN = 4

/** Damping ratio of that spring. Just under critical, so the pill
 *  arrives with a breath of overshoot instead of parking dead. */
const PILL_DAMPING = 0.78

/** How far the pill leans into its own velocity: degrees per px/s, and
 *  the most it will lean. Art direction -- a tag on a string, not a
 *  pendulum. */
const PILL_SWAY = 0.012
const PILL_SWAY_MAX = 7

/** Once the pill has been gone this long its exit has finished, and it
 *  re-seats on the cursor so the next one pops up where you are rather
 *  than flying in from where the last one left. */
const PILL_RESEAT_MS = 600

/** Fade of the picked point's own chords, per 60Hz frame. */
const LIT_FOLLOW = 0.16

/** The rock, as the brief gave it: `rotation.x = sin(t * 0.5) * 0.1`,
 *  `rotation.z = cos(t * 0.5) * 0.1`. Amount 5 is exactly that. */
const WOBBLE = 0.1
const WOBBLE_RATE = 0.5

/** Amount 10 of the jelly squash, as the stretch along its axis. The
 *  other two axes give back half each, so the volume holds. */
const MAX_JELLY = 0.12

/** Rate of the squash on the motion clock. Faster than the rock, which
 *  is what makes it read as a soft body rather than a tilt. */
const JELLY_RATE = 2

/** Amount 10 of the breath, as the share of the radius the swell can
 *  move a point. Past this the rim of a ball of straight chords tears
 *  and it stops reading as one body. */
const MAX_BREATHE = 0.1

/** The whole ball's slow in-and-out under the travelling swell, as a
 *  share of it. Without this it ripples but never inhales. */
const BREATH_SWELL = 0.4

/** Pace 0 and 10, as multipliers on the motion clock. */
const PACE_AT_ZERO = 0.25
const PACE_AT_TEN = 2

/** Parallax 10, in radians of lean with the cursor at the frame's edge.
 *  The brief's `mouse * 0.001` on a ~700px half-window comes to 0.7. */
const MAX_PARALLAX = 0.7

/** Smoothing 10, as the share of the gap closed per 60Hz frame;
 *  Smoothing 0 closes all of it. Geometric between, which puts the
 *  brief's 0.05 at 6.5 -- the default. */
const FOLLOW_AT_TEN = 0.01

/** How much more ink the hover patch lays on, on top of recolouring the
 *  thread. A richer shade at the resting alpha barely registers on white
 *  -- the thread is mostly transparent -- so it has to deepen as well. */
const GLOW_BOOST = 2.2

/** The chords tied to the picked point, as a share of a full patch. */
const PICKED_LIFT = 0.85

/** The patch's chase after the cursor and its fade, per 60Hz frame. */
const GLOW_FOLLOW = 0.14
const GLOW_FADE = 0.08

/** How late the last point starts contracting, as a share of the intro.
 *  0 and the cloud shrinks as one; this much and it ripples. */
const INTRO_STAGGER = 0.4

/** Overshoot of each point as it lands -- easeOutBack's `s`. About 5%:
 *  enough to feel the pull, not enough to read as a bounce. */
const INTRO_BACK = 1.1

/** The thread's opacity at the start of the intro, as a share of its
 *  resting opacity. The brief: the lines barely there, the points not. */
const INTRO_LINE_FLOOR = 0.12

/** The points the ball arrives as: diameter in CSS px and peak opacity. */
const INTRO_POINT_SIZE = 2.6
const INTRO_POINT_ALPHA = 0.85

/** Seconds the points take to fade up before anything moves, so the
 *  first frame is not a pop. */
const INTRO_FADE_IN = 0.5

/** Speed 10 in radians per second. The default turns once in about 42s. */
const MAX_SPIN = 0.5

const SEED = 0xb41a4

/* ----------------------------------------------------------- defaults */

/** The six names the recording shows. */
const DEFAULT_LABELS = [
    "Melanoma",
    "Erythema",
    "Folliculitis",
    "Pemphigus",
    "Basal Cell",
    "Shingles",
]

const DEFAULT_BACKGROUND = "#FFFFFF"

const DEFAULT_FONT: CSSProperties = {
    fontFamily: "Inter, sans-serif",
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: "-0.01em",
    lineHeight: 1.2,
}

const DEFAULT_TEXT_COLOR = "#FFFFFF"

export interface BriarGlobeNetwork {
    /** Points in the ball. */
    nodes: number
    /** Points that chords converge on. 0 leaves a plain even mesh. */
    hubs: number
    /** How many chords each point sends out, 0..10. */
    links: number
}

const DEFAULT_NETWORK: BriarGlobeNetwork = {
    nodes: 900,
    hubs: 28,
    links: 5,
}

export interface BriarGlobeLines {
    /** Most of the thread. */
    color: string
    /** The warm tone running through it. */
    accent: string
    /** Width of a chord in px. Under one device pixel it thins by fading. */
    thickness: number
    /** How dark the near side draws, 0..10. */
    opacity: number
    /** How far the far side fades, 0..10. 0 draws front and back alike;
     *  10 lets the back all but disappear. */
    depth: number
}

const DEFAULT_LINES: BriarGlobeLines = {
    color: "#3B3632",
    accent: "#7A5A3D",
    // The recording's hairline. Much wider and the tangle blocks up into
    // a grey disc -- which is a look, so it is on the slider.
    thickness: 0.55,
    opacity: 5,
    depth: 7,
}

export interface BriarGlobeIntro {
    /** Play the contraction when the ball first comes on screen. */
    play: boolean
    /** How big the cloud starts, as a multiple of the resting ball. */
    inflate: number
    /** Seconds from the first point moving to the last one landing. */
    duration: number
    /** Seconds the cloud holds, inflated, before it starts to draw in. */
    delay: number
}

const DEFAULT_INTRO: BriarGlobeIntro = {
    play: true,
    // Big enough to overrun the frame a little, which is what makes the
    // draw-in feel like it is gathering towards you.
    inflate: 1.4,
    duration: 2.6,
    delay: 0.4,
}

export interface BriarGlobeHover {
    /** How close the cursor has to come to a point to pick it, in px. */
    reach: number
    /** Radius of the deepened patch around the cursor, in px. */
    glowSize: number
    /** The richer shade the thread under the cursor takes on. Fully
     *  transparent turns the patch off. */
    glow: string
    /** The pill's fill. Translucent, so the thread shows through. */
    pill: string
    /** How far the pill trails the cursor, 0..10. 0 all but pins it to
     *  the cursor; 10 lets it float after it. */
    lag: number
}

const DEFAULT_HOVER: BriarGlobeHover = {
    reach: 18,
    glowSize: 120,
    // A deeper, warmer cut of the thread's own colour, not a new hue:
    // the recording's hovered section reads as the same thread, richer.
    glow: "#4A2C16",
    pill: "rgba(118, 112, 108, 0.78)",
    // Unhurried: the pill drifts after the cursor and settles in about
    // half a second, rather than snapping to it.
    lag: 6.5,
}

const DEFAULT_PARALLAX = 5
const DEFAULT_SMOOTHING = 6.5
const DEFAULT_SPEED = 3
const DEFAULT_DIRECTION: "left" | "right" = "right"
const DEFAULT_TILT = 18

export type BriarGlobeMotionStyle = "breathe" | "wobble" | "both" | "off"

export interface BriarGlobeMotion {
    /** Breathe changes the ball's volume; Wobble rocks it and squashes it
     *  like jelly; Both layers them; Off holds the shape still (the turn
     *  and the parallax carry on). */
    style: BriarGlobeMotionStyle
    /** How far it moves, 0..10. */
    amount: number
    /** How fast, 0..10. */
    pace: number
}

const DEFAULT_MOTION: BriarGlobeMotion = {
    style: "both",
    amount: 5,
    pace: 4,
}

/** Drives what framer-motion plays: the pill's pop in and out. The
 *  pill's chase after the cursor is Pill Lag. */
const DEFAULT_TRANSITION: Transition = {
    type: "spring",
    stiffness: 260,
    damping: 26,
    mass: 0.8,
}

/* ---------------------------------------------------------- internals */

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value))
}

/** mulberry32, so the ball is the same ball on every load -- and on the
 *  server, so nothing mismatches on hydration. */
function makeRng(seed: number): () => number {
    let a = seed >>> 0
    return () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

interface Rgba {
    r: number
    g: number
    b: number
    a: number
}

const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 1 }

/** Canvas normalises any colour CSS accepts to `#rrggbb` or `rgba(...)`
 *  on the way back out of `fillStyle`, so a scratch 2D context parses
 *  everything the Color control can hand us into numbers for a uniform. */
const colorCache = new Map<string, Rgba>()

function parseColor(ctx: CanvasRenderingContext2D, input: string | undefined): Rgba {
    if (!input) return BLACK
    const hit = colorCache.get(input)
    if (hit) return hit
    ctx.fillStyle = "#000000"
    ctx.fillStyle = input
    const normal = ctx.fillStyle
    let out = BLACK
    if (typeof normal === "string") {
        if (normal.startsWith("#") && normal.length === 7) {
            out = {
                r: parseInt(normal.slice(1, 3), 16),
                g: parseInt(normal.slice(3, 5), 16),
                b: parseInt(normal.slice(5, 7), 16),
                a: 1,
            }
        } else {
            const parts = normal.match(/[\d.]+/g)
            if (parts && parts.length >= 3) {
                out = {
                    r: Number(parts[0]),
                    g: Number(parts[1]),
                    b: Number(parts[2]),
                    a: parts.length > 3 ? Number(parts[3]) : 1,
                }
            }
        }
    }
    colorCache.set(input, out)
    return out
}

/** The ball, in unit-sphere coordinates. Built once per Network change. */
interface Graph {
    count: number
    /** x, y, z per point. */
    pos: Float32Array
    hub: Uint8Array
    /** Stable per-point integer; the label is `labels[key % length]`, read
     *  at render so editing the list re-names what is on screen. */
    labelKey: Uint32Array
    edgeCount: number
    edgeA: Uint32Array
    edgeB: Uint32Array
    /** 0 = color, 1 = accent. */
    edgeTone: Uint8Array
}

function buildGraph(nodes: number, hubs: number, links: number): Graph {
    const rng = makeRng(SEED)
    const count = Math.max(8, Math.round(nodes))
    const pos = new Float32Array(count * 3)
    const hub = new Uint8Array(count)
    const labelKey = new Uint32Array(count)

    // The skin: a Fibonacci lattice, jittered so it does not read as one.
    // A lattice rather than plain random directions because random ones
    // clump and leave bald patches, and a bald patch on a ball of thread
    // is a hole.
    const interior = Math.round(count * INTERIOR_SHARE)
    const shell = count - interior
    const golden = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < shell; i++) {
        const y0 = 1 - (2 * (i + 0.5)) / shell
        const theta = i * golden + (rng() - 0.5) * 0.9 * golden
        const y = clamp(y0 + (rng() - 0.5) * (1.6 / shell), -1, 1)
        const ring = Math.sqrt(Math.max(0, 1 - y * y))
        // Slightly under the surface, some more than others, so the skin
        // has thickness and the rim frays instead of cutting clean.
        const r = 1 - 0.09 * rng() * rng()
        pos[i * 3] = Math.cos(theta) * ring * r
        pos[i * 3 + 1] = y * r
        pos[i * 3 + 2] = Math.sin(theta) * ring * r
    }
    for (let i = shell; i < count; i++) {
        const z = rng() * 2 - 1
        const phi = rng() * TAU
        const ring = Math.sqrt(1 - z * z)
        const r = 0.3 + 0.58 * Math.cbrt(rng())
        pos[i * 3] = Math.cos(phi) * ring * r
        pos[i * 3 + 1] = z * r
        pos[i * 3 + 2] = Math.sin(phi) * ring * r
    }
    for (let i = 0; i < count; i++) labelKey[i] = Math.floor(rng() * 0xffffffff)

    // Hubs: every nth point of the lattice, which spreads them evenly
    // over the ball. A third are pulled inward, so some stars sit inside
    // the tangle rather than all of them on its skin.
    const hubCount = clamp(Math.round(hubs), 0, Math.max(0, shell))
    const hubIndex: number[] = []
    for (let h = 0; h < hubCount; h++) {
        const i = Math.min(shell - 1, Math.floor(((h + 0.5) * shell) / hubCount))
        if (hub[i]) continue
        hub[i] = 1
        hubIndex.push(i)
        if (rng() < 0.34) {
            const pull = 0.55 + 0.3 * rng()
            pos[i * 3] *= pull
            pos[i * 3 + 1] *= pull
            pos[i * 3 + 2] *= pull
        }
    }

    const edgeA = new Uint32Array(MAX_EDGES)
    const edgeB = new Uint32Array(MAX_EDGES)
    const edgeTone = new Uint8Array(MAX_EDGES)
    let edgeCount = 0
    const seen = new Set<number>()

    const addEdge = (a: number, b: number) => {
        if (a === b || edgeCount >= MAX_EDGES) return
        const lo = a < b ? a : b
        const hi = a < b ? b : a
        const key = lo * count + hi
        if (seen.has(key)) return
        seen.add(key)
        edgeA[edgeCount] = lo
        edgeB[edgeCount] = hi
        edgeTone[edgeCount] = rng() < ACCENT_SHARE ? 1 : 0
        edgeCount++
    }

    const dist2 = (a: number, b: number) => {
        const dx = pos[a * 3] - pos[b * 3]
        const dy = pos[a * 3 + 1] - pos[b * 3 + 1]
        const dz = pos[a * 3 + 2] - pos[b * 3 + 2]
        return dx * dx + dy * dy + dz * dz
    }

    // 1. The faceted skin: each point to its nearest few. O(n^2) once,
    //    which at the 1200-point ceiling is still ~1.4M distance checks.
    const nearD = new Float64Array(MESH_LINKS)
    const nearI = new Int32Array(MESH_LINKS)
    for (let i = 0; i < count; i++) {
        nearD.fill(Infinity)
        nearI.fill(-1)
        for (let j = 0; j < count; j++) {
            if (j === i) continue
            const d = dist2(i, j)
            if (d >= nearD[MESH_LINKS - 1]) continue
            let k = MESH_LINKS - 1
            while (k > 0 && nearD[k - 1] > d) {
                nearD[k] = nearD[k - 1]
                nearI[k] = nearI[k - 1]
                k--
            }
            nearD[k] = d
            nearI[k] = j
        }
        for (let k = 0; k < MESH_LINKS; k++) if (nearI[k] >= 0) addEdge(i, nearI[k])
    }

    // 2. The stars: each point to a few hubs, drawn by closeness. A
    //    fractional count is kept honest by rolling for the remainder.
    const density = clamp(links, 0, 10) / 10
    const perHub = density * 12 * (1 - CHORD_SHARE)
    const perChord = density * 12 * CHORD_SHARE
    const weights = new Float64Array(hubIndex.length)
    const spread = 2 * HUB_REACH * HUB_REACH
    const roll = (amount: number) => Math.floor(amount) + (rng() < amount % 1 ? 1 : 0)

    if (hubIndex.length > 0) {
        for (let i = 0; i < count; i++) {
            let total = 0
            for (let h = 0; h < hubIndex.length; h++) {
                const w = hubIndex[h] === i ? 0 : Math.exp(-dist2(i, hubIndex[h]) / spread)
                weights[h] = w
                total += w
            }
            if (total <= 0) continue
            const picks = roll(perHub)
            for (let p = 0; p < picks; p++) {
                let at = rng() * total
                let h = 0
                while (h < hubIndex.length - 1 && at > weights[h]) {
                    at -= weights[h]
                    h++
                }
                addEdge(i, hubIndex[h])
            }
        }
    }

    // 3. The fuzz: long chords across the ball. Rejected when short, so
    //    they actually cross the interior instead of thickening the skin.
    for (let i = 0; i < count; i++) {
        const picks = roll(perChord)
        for (let p = 0; p < picks; p++) {
            for (let tries = 0; tries < 6; tries++) {
                const j = Math.floor(rng() * count)
                if (j !== i && dist2(i, j) > 0.64) {
                    addEdge(i, j)
                    break
                }
            }
        }
    }

    return { count, pos, hub, labelKey, edgeCount, edgeA, edgeB, edgeTone }
}

/* ------------------------------------------------------------ motion */

/** easeOutBack over a smoothstep: leaves at rest, lands with a few
 *  percent of overshoot, settles at rest. The smoothstep is what stops
 *  the first moving point from jerking off the mark. */
function arriveEase(t: number): number {
    const s = t * t * (3 - 2 * t)
    const u = s - 1
    return 1 + u * u * ((INTRO_BACK + 1) * u + INTRO_BACK)
}

/** Everything `place()` needs that is the same for every point in a
 *  frame, worked out once. The shader gets the same numbers as uniforms. */
interface Pose {
    /** Row-major rotation. */
    rot: Float32Array
    clock: number
    breathe: number
    jelly: number
    intro: number
    inflate: number
}

/** The CPU's `place()`. Mirrors GLSL_PLACE line for line -- see decision
 *  4. Writes screen x, y in CSS px and depth 0 (back) .. 1 (front). */
function placeAll(
    g: Graph,
    pose: Pose,
    radius: number,
    ox: number,
    oy: number,
    sx: Float32Array,
    sy: Float32Array,
    st: Float32Array
): void {
    const { rot, clock, breathe, jelly, intro, inflate } = pose
    const swell = BREATH_SWELL * Math.sin(clock * 0.8)
    let ax = Math.sin(clock * 0.37)
    let ay = 0.6 + 0.4 * Math.cos(clock * 0.29)
    let az = 0.8 * Math.sin(clock * 0.23 + 1)
    const al = Math.hypot(ax, ay, az)
    ax /= al
    ay /= al
    az /= al
    const j = jelly * Math.sin(clock * JELLY_RATE)
    const keep = 1 - 0.5 * j
    const pull = 1.5 * j
    const pos = g.pos
    for (let i = 0; i < g.count; i++) {
        const x = pos[i * 3]
        const y = pos[i * 3 + 1]
        const z = pos[i * 3 + 2]

        const stagger = 0.5 + 0.5 * Math.sin(x * 3.1 + y * 2.3 + z * 1.7)
        const arrive = clamp((intro - stagger * INTRO_STAGGER) / (1 - INTRO_STAGGER), 0, 1)
        const grow = 1 + (inflate - 1) * (1 - arriveEase(arrive))

        const n =
            Math.sin(x * 2.3 + clock * 0.9) * Math.sin(y * 1.9 - clock * 0.7 + 1.3) +
            Math.sin(z * 2.7 + clock * 1.1 + 2.1) * Math.sin(x * 1.5 + y * 1.2 - clock * 0.5)
        const s = 1 + breathe * (swell + 0.5 * n)

        let qx = x * s
        let qy = y * s
        let qz = z * s
        const along = (qx * ax + qy * ay + qz * az) * pull
        qx = qx * keep + ax * along
        qy = qy * keep + ay * along
        qz = qz * keep + az * along

        const rx = rot[0] * qx + rot[1] * qy + rot[2] * qz
        const ry = rot[3] * qx + rot[4] * qy + rot[5] * qz
        const rz = rot[6] * qx + rot[7] * qy + rot[8] * qz
        const k = (CAMERA / Math.max(CAMERA - rz, CAMERA_NEAR)) * grow
        sx[i] = ox + rx * radius * k
        sy[i] = oy - ry * radius * k
        st[i] = clamp((rz + 1) * 0.5, 0, 1)
    }
}

/* ------------------------------------------------------------- shaders */

/** Shared by every program, and mirrored by `placeAll` on the CPU.
 *  Change one, change the other. */
const GLSL_PLACE = `
uniform mat3 uRot;
uniform float uTime;
uniform float uBreathe;
uniform float uJelly;
uniform float uIntro;
uniform float uInflate;
uniform vec2 uCentre;
uniform float uRadius;

float arriveEase(float t) {
    float s = t * t * (3.0 - 2.0 * t);
    float u = s - 1.0;
    return 1.0 + u * u * ((INTRO_BACK + 1.0) * u + INTRO_BACK);
}

vec3 place(vec3 p, out float arrive) {
    float stagger = 0.5 + 0.5 * sin(p.x * 3.1 + p.y * 2.3 + p.z * 1.7);
    arrive = clamp((uIntro - stagger * INTRO_STAGGER) / (1.0 - INTRO_STAGGER), 0.0, 1.0);
    float grow = 1.0 + (uInflate - 1.0) * (1.0 - arriveEase(arrive));

    float n =
        sin(p.x * 2.3 + uTime * 0.9) * sin(p.y * 1.9 - uTime * 0.7 + 1.3) +
        sin(p.z * 2.7 + uTime * 1.1 + 2.1) * sin(p.x * 1.5 + p.y * 1.2 - uTime * 0.5);
    float s = 1.0 + uBreathe * (BREATH_SWELL * sin(uTime * 0.8) + 0.5 * n);
    vec3 q = p * s;

    vec3 axis = normalize(vec3(
        sin(uTime * 0.37),
        0.6 + 0.4 * cos(uTime * 0.29),
        0.8 * sin(uTime * 0.23 + 1.0)
    ));
    float j = uJelly * sin(uTime * JELLY_RATE);
    q = q * (1.0 - 0.5 * j) + axis * (dot(q, axis) * 1.5 * j);

    vec3 r = uRot * q;
    float k = CAMERA / max(CAMERA - r.z, CAMERA_NEAR);
    // The inflation scales the picture, not the depth: grown in 3D, the
    // near side of the cloud rushes the camera and the far side shrinks
    // away, and it reads as flying through a starfield, not a ball.
    return vec3(uCentre + r.xy * uRadius * k * grow, r.z);
}
`

const LINE_VERT = `
attribute vec3 aPos;
attribute vec3 aOther;
attribute vec2 aMeta;
attribute vec2 aNodes;
uniform vec2 uViewport;
uniform float uHalf;
uniform float uRear;
uniform float uPicked;
uniform float uPickedAlpha;
varying float vEdge;
varying float vFade;
varying float vFront;
varying float vTone;
varying float vLit;
GLSL_PLACE
void main() {
    float arriveA;
    float arriveB;
    vec3 a = place(aPos, arriveA);
    vec3 b = place(aOther, arriveB);
    vec2 dir = b.xy - a.xy;
    float len = length(dir);
    vec2 normal = len > 0.0001 ? vec2(-dir.y, dir.x) / len : vec2(0.0, 1.0);
    vec2 px = a.xy + normal * aMeta.x * uHalf;
    float t = clamp((a.z + 1.0) * 0.5, 0.0, 1.0);
    vEdge = aMeta.x * uHalf;
    // The intro: each end of a chord comes up as its own point lands.
    float drawn = mix(INTRO_LINE_FLOOR, 1.0, smoothstep(0.35, 1.0, arriveA));
    vFade = (uRear + (1.0 - uRear) * pow(t, DEPTH_CURVE)) * drawn;
    vFront = smoothstep(0.3, 0.75, t);
    vTone = aMeta.y;
    float mine = step(abs(aNodes.x - uPicked), 0.5) + step(abs(aNodes.y - uPicked), 0.5);
    vLit = min(1.0, mine) * uPickedAlpha;
    gl_Position = vec4(px / uViewport * 2.0 - 1.0, 0.0, 1.0);
}
`

const LINE_FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec4 uColor;
uniform vec4 uAccent;
uniform vec4 uGlowColor;
uniform float uStrength;
uniform float uCore;
uniform float uInk;
uniform vec3 uGlow;
uniform float uGlowAmt;
varying float vEdge;
varying float vFade;
varying float vFront;
varying float vTone;
varying float vLit;
void main() {
    // One feathered pixel either side of the core.
    float cover = clamp(uCore + 0.5 - abs(vEdge), 0.0, 1.0) * uInk;
    vec4 tone = mix(uColor, uAccent, vTone);
    float d = distance(gl_FragCoord.xy, uGlow.xy) / max(1.0, uGlow.z);
    float g = pow(clamp(1.0 - d, 0.0, 1.0), 2.0) * uGlowAmt * vFront;
    g = max(g, vLit * PICKED_LIFT) * uGlowColor.a;
    vec3 rgb = mix(tone.rgb, uGlowColor.rgb, g);
    float alpha = min(1.0, tone.a * uStrength * vFade * (1.0 + g * GLOW_BOOST)) * cover;
    gl_FragColor = vec4(rgb * alpha, alpha);
}
`

/** Specks: the knots on the hubs, and the bright points the ball arrives
 *  as. `uVanish` 1 fades a speck out as its point lands; 0 keeps it. */
const DOT_VERT = `
attribute vec3 aPos;
uniform vec2 uViewport;
uniform float uSize;
uniform float uRear;
uniform float uVanish;
varying float vFade;
varying float vSize;
varying float vShow;
GLSL_PLACE
void main() {
    float arrive;
    vec3 a = place(aPos, arrive);
    float t = clamp((a.z + 1.0) * 0.5, 0.0, 1.0);
    vFade = uRear + (1.0 - uRear) * pow(t, DEPTH_CURVE);
    vShow = 1.0 - uVanish * smoothstep(0.55, 1.0, arrive);
    vSize = min(uSize * (CAMERA / max(CAMERA - a.z, CAMERA_NEAR)), MAX_POINT_PX - 1.0);
    gl_PointSize = vSize + 1.0;
    gl_Position = vec4(a.xy / uViewport * 2.0 - 1.0, 0.0, 1.0);
}
`

const DOT_FRAG = `
precision mediump float;
uniform vec4 uTint;
uniform float uAlpha;
varying float vFade;
varying float vSize;
varying float vShow;
void main() {
    // A uniform shared across stages must match in precision or the
    // program will not link, so the size arrives as a varying.
    float d = length(gl_PointCoord - 0.5) * (vSize + 1.0);
    float cover = clamp(vSize * 0.5 + 0.5 - d, 0.0, 1.0);
    float alpha = min(1.0, uTint.a * uAlpha * vFade) * vShow * cover;
    gl_FragColor = vec4(uTint.rgb * alpha, alpha);
}
`

const GLSL_CONSTANTS: Array<[string, number]> = [
    ["INTRO_LINE_FLOOR", INTRO_LINE_FLOOR],
    ["INTRO_STAGGER", INTRO_STAGGER],
    ["INTRO_BACK", INTRO_BACK],
    ["BREATH_SWELL", BREATH_SWELL],
    ["JELLY_RATE", JELLY_RATE],
    ["DEPTH_CURVE", DEPTH_CURVE],
    ["GLOW_BOOST", GLOW_BOOST],
    ["PICKED_LIFT", PICKED_LIFT],
    ["MAX_POINT_PX", MAX_POINT_PX],
    ["CAMERA_NEAR", CAMERA_NEAR],
    // Last: it is a prefix of CAMERA_NEAR.
    ["CAMERA", CAMERA],
]

function glsl(source: string): string {
    let out = source.replace("GLSL_PLACE", GLSL_PLACE)
    for (const [name, value] of GLSL_CONSTANTS) out = out.split(name).join(value.toFixed(4))
    return out
}

function compile(gl: WebGLRenderingContext, vert: string, frag: string): WebGLProgram | null {
    const program = gl.createProgram()
    if (!program) return null
    const stages: Array<[number, string]> = [
        [gl.VERTEX_SHADER, glsl(vert)],
        [gl.FRAGMENT_SHADER, glsl(frag)],
    ]
    for (const [type, source] of stages) {
        const shader = gl.createShader(type)
        if (!shader) return null
        gl.shaderSource(shader, source)
        gl.compileShader(shader)
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.warn("BriarGlobe shader:", gl.getShaderInfoLog(shader))
            return null
        }
        gl.attachShader(program, shader)
    }
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.warn("BriarGlobe program:", gl.getProgramInfoLog(program))
        return null
    }
    return program
}

/** Floats per vertex: aPos 3, aOther 3, aMeta 2, aNodes 2. */
const STRIDE = 10

/** Six vertices a chord, each knowing both ends so the shader can find
 *  the chord's direction on screen and push itself out sideways. */
function lineVertices(g: Graph): Float32Array {
    const out = new Float32Array(g.edgeCount * 6 * STRIDE)
    let at = 0
    const put = (self: number, other: number, side: number, tone: number) => {
        out[at++] = g.pos[self * 3]
        out[at++] = g.pos[self * 3 + 1]
        out[at++] = g.pos[self * 3 + 2]
        out[at++] = g.pos[other * 3]
        out[at++] = g.pos[other * 3 + 1]
        out[at++] = g.pos[other * 3 + 2]
        out[at++] = side
        out[at++] = tone
        out[at++] = self
        out[at++] = other
    }
    for (let e = 0; e < g.edgeCount; e++) {
        const a = g.edgeA[e]
        const b = g.edgeB[e]
        const tone = g.edgeTone[e]
        // At the far end the chord's direction reads reversed, so its
        // normal is too: -1 there is the same physical side as +1 here.
        put(a, b, 1, tone)
        put(a, b, -1, tone)
        put(b, a, -1, tone)
        put(a, b, -1, tone)
        put(b, a, -1, tone)
        put(b, a, 1, tone)
    }
    return out
}

function pointVertices(g: Graph, hubsOnly: boolean): Float32Array {
    const out: number[] = []
    for (let i = 0; i < g.count; i++) {
        if (hubsOnly && !g.hub[i]) continue
        out.push(g.pos[i * 3], g.pos[i * 3 + 1], g.pos[i * 3 + 2])
    }
    return new Float32Array(out)
}

/** Live settings the draw loop reads, so a slider drag repaints the next
 *  frame without tearing the loop down. */
interface Params {
    color: string
    accent: string
    opacity: number
    depth: number
    thickness: number
    introPlay: boolean
    introInflate: number
    introDuration: number
    introDelay: number
    /** Changes whenever an intro setting does, so the loop can replay it
     *  -- which is what makes the intro previewable on Framer's canvas. */
    introKey: string
    reach: number
    glow: string
    glowSize: number
    /** Pill spring's natural frequency, rad/s. */
    pillOmega: number
    parallax: number
    follow: number
    spin: number
    tilt: number
    breathe: number
    jelly: number
    rock: number
    pace: number
    pickable: boolean
}

/* --------------------------------------------------------------- props */

export interface BriarGlobeProps {
    /** Names shown on hover, cycled over the points. Empty rows are
     *  skipped; an empty list turns the hover off. */
    labels?: string[]
    /** The component's own ground. */
    background?: string
    /** The pill's type. */
    font?: CSSProperties
    textColor?: string
    network?: Partial<BriarGlobeNetwork>
    lines?: Partial<BriarGlobeLines>
    intro?: Partial<BriarGlobeIntro>
    hover?: Partial<BriarGlobeHover>
    /** How far the ball leans after the cursor, 0..10. 0 ignores it. */
    parallax?: number
    /** How heavily that lean trails the cursor. 0 is rigid, 10 is syrup. */
    smoothing?: number
    /** How fast the ball turns, 0..10. 0 holds it still. */
    speed?: number
    /** Which way the near side travels as it turns. */
    direction?: "left" | "right"
    /** Lean of the axis it turns on, in degrees. */
    tilt?: number
    motion?: Partial<BriarGlobeMotion>
    /** Drives the pill's pop in and out. The ball's own motion is a rAF
     *  loop and is set by Speed, Parallax, Motion and Intro; the pill's
     *  chase after the cursor is Pill Lag. */
    transition?: Transition
    style?: CSSProperties
    className?: string
}

/* ----------------------------------------------------------- component */

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 640
 * @framerIntrinsicHeight 520
 */
export default function BriarGlobe(props: BriarGlobeProps) {
    const {
        labels = ["Melanoma","Erythema","Folliculitis","Pemphigus","Basal Cell","Shingles"],
        background = "#000000",
        font = {"variant":"Regular","fontSize":15,"textAlign":"left","fontFamily":"Inter, sans-serif","fontWeight":600,"lineHeight":1.2,"letterSpacing":"-0.01em"},
        textColor = "#000000",
        network = {"hubs":28,"links":5,"nodes":900},
        lines = {"color":"#FFFFFF","depth":10,"accent":"#8400FF","opacity":5,"thickness":0.55},
        intro = {"play":true,"delay":0.4,"inflate":1.4,"duration":2.6},
        hover = {"lag":3.9,"glow":"#A200FF","pill":"#FFFFFFC7","reach":18,"glowSize":120},
        parallax = 9,
        smoothing = 10,
        speed = 0,
        direction = "left",
        tilt = 18,
        motion: motionSettings,
        transition = {"mass":0.8,"type":"spring","damping":26,"stiffness":260},
        style,
        className,
    } = props

    const resolvedNetwork = { ...DEFAULT_NETWORK, ...network }
    const resolvedLines = { ...DEFAULT_LINES, ...lines }
    const resolvedIntro = { ...DEFAULT_INTRO, ...intro }
    const resolvedHover = { ...DEFAULT_HOVER, ...hover }
    const resolvedMotion = { ...DEFAULT_MOTION, ...motionSettings }
    const pillFont: CSSProperties = { ...DEFAULT_FONT, ...font }

    const words = (labels ?? []).filter((line) => typeof line === "string" && line.trim())

    const hostRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const pillRef = useRef<HTMLDivElement | null>(null)

    /* ------------------------------------------------------------ graph */

    const nodes = clamp(Math.round(resolvedNetwork.nodes), 50, 1200)
    const hubs = clamp(Math.round(resolvedNetwork.hubs), 0, 120)
    const links = clamp(resolvedNetwork.links, 0, 10)
    const graph = useMemo(() => buildGraph(nodes, hubs, links), [nodes, hubs, links])
    const graphRef = useRef(graph)
    graphRef.current = graph

    /* ---------------------------------------------------------- live set */

    const amount = clamp(resolvedMotion.amount, 0, 10) / 10
    const moveStyle = resolvedMotion.style
    const breathes = moveStyle === "breathe" || moveStyle === "both"
    const wobbles = moveStyle === "wobble" || moveStyle === "both"
    const introInflate = clamp(resolvedIntro.inflate, 1, 2.5)
    const introDuration = clamp(resolvedIntro.duration, 0.2, 10)
    const introDelay = clamp(resolvedIntro.delay, 0, 5)

    const live: Params = {
        color: resolvedLines.color,
        accent: resolvedLines.accent,
        opacity: clamp(resolvedLines.opacity, 0, 10),
        depth: clamp(resolvedLines.depth, 0, 10),
        thickness: clamp(resolvedLines.thickness, 0.1, 6),
        introPlay: !!resolvedIntro.play,
        introInflate,
        introDuration,
        introDelay,
        introKey: `${!!resolvedIntro.play}|${introInflate}|${introDuration}|${introDelay}`,
        reach: Math.max(1, resolvedHover.reach),
        glow: resolvedHover.glow,
        glowSize: Math.max(0, resolvedHover.glowSize),
        pillOmega:
            PILL_OMEGA_AT_ZERO *
            Math.pow(PILL_OMEGA_AT_TEN / PILL_OMEGA_AT_ZERO, clamp(resolvedHover.lag, 0, 10) / 10),
        parallax: (clamp(parallax, 0, 10) / 10) * MAX_PARALLAX,
        // Geometric, so the useful range sits in the middle of the slider.
        follow: Math.pow(FOLLOW_AT_TEN, clamp(smoothing, 0, 10) / 10),
        spin: (clamp(speed, 0, 10) / 10) * MAX_SPIN * (direction === "left" ? -1 : 1),
        tilt: (clamp(tilt, -90, 90) * Math.PI) / 180,
        breathe: breathes ? amount * MAX_BREATHE : 0,
        jelly: wobbles ? amount * MAX_JELLY : 0,
        rock: wobbles ? amount * 2 * WOBBLE : 0,
        pace: PACE_AT_ZERO + (clamp(resolvedMotion.pace, 0, 10) / 10) * (PACE_AT_TEN - PACE_AT_ZERO),
        pickable: words.length > 0,
    }
    const paramsRef = useRef<Params>(live)
    paramsRef.current = live

    const invalidRef = useRef(true)
    invalidRef.current = true

    /* ------------------------------------------------------------- pill */

    /** Index of the picked point, or null. Only changes when the pick does. */
    const [picked, setPicked] = useState<number | null>(null)

    const word =
        picked !== null && picked < graph.count && words.length > 0
            ? words[graph.labelKey[picked] % words.length].trim()
            : null

    // What the pill last said, so it keeps its word while it fades out.
    const lastWordRef = useRef<string>("")
    if (word !== null) lastWordRef.current = word
    const pillWord = word ?? lastWordRef.current

    /* ------------------------------------------------------- draw loop */

    useEffect(() => {
        if (!hostRef.current || !canvasRef.current || !pillRef.current) return
        const host: HTMLDivElement = hostRef.current
        const canvas: HTMLCanvasElement = canvasRef.current
        const pillEl: HTMLDivElement = pillRef.current

        // Only here to turn CSS colours into numbers for the uniforms.
        const scratch = document.createElement("canvas").getContext("2d")
        if (!scratch) return
        const inkwell: CanvasRenderingContext2D = scratch

        const context = canvas.getContext("webgl", {
            alpha: true,
            premultipliedAlpha: true,
            // The chords feather their own edges in the fragment shader,
            // which is finer than MSAA and costs no extra samples.
            antialias: false,
            depth: false,
            stencil: false,
        })
        if (!context) return
        const gl: WebGLRenderingContext = context

        const reducedMotion =
            typeof window.matchMedia === "function" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches

        type Uniforms = Record<string, WebGLUniformLocation | null>
        interface Kit {
            line: WebGLProgram
            dot: WebGLProgram
            lineBuffer: WebGLBuffer
            knotBuffer: WebGLBuffer
            pointBuffer: WebGLBuffer
            lineU: Uniforms
            dotU: Uniforms
        }
        let kit: Kit | null = null
        let lineCount = 0
        let knotCount = 0
        let pointCount = 0

        const PLACED = [
            "uRot",
            "uTime",
            "uBreathe",
            "uJelly",
            "uIntro",
            "uInflate",
            "uCentre",
            "uRadius",
            "uViewport",
            "uRear",
        ]

        function uniforms(program: WebGLProgram, names: string[]): Uniforms {
            const out: Uniforms = {}
            for (const name of names) out[name] = gl.getUniformLocation(program, name)
            return out
        }

        function setup(): Kit | null {
            const line = compile(gl, LINE_VERT, LINE_FRAG)
            const dot = compile(gl, DOT_VERT, DOT_FRAG)
            const lineBuffer = gl.createBuffer()
            const knotBuffer = gl.createBuffer()
            const pointBuffer = gl.createBuffer()
            if (!line || !dot || !lineBuffer || !knotBuffer || !pointBuffer) return null
            gl.disable(gl.DEPTH_TEST)
            gl.enable(gl.BLEND)
            // Premultiplied, to match the canvas the page composites.
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
            return {
                line,
                dot,
                lineBuffer,
                knotBuffer,
                pointBuffer,
                lineU: uniforms(line, [
                    ...PLACED,
                    "uHalf",
                    "uPicked",
                    "uPickedAlpha",
                    "uColor",
                    "uAccent",
                    "uGlowColor",
                    "uStrength",
                    "uCore",
                    "uInk",
                    "uGlow",
                    "uGlowAmt",
                ]),
                dotU: uniforms(dot, [...PLACED, "uSize", "uVanish", "uTint", "uAlpha"]),
            }
        }

        function upload(g: Graph) {
            if (!kit) return
            const lineData = lineVertices(g)
            const knotData = pointVertices(g, true)
            const pointData = pointVertices(g, false)
            gl.bindBuffer(gl.ARRAY_BUFFER, kit.lineBuffer)
            gl.bufferData(gl.ARRAY_BUFFER, lineData, gl.STATIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, kit.knotBuffer)
            gl.bufferData(gl.ARRAY_BUFFER, knotData, gl.STATIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, kit.pointBuffer)
            gl.bufferData(gl.ARRAY_BUFFER, pointData, gl.STATIC_DRAW)
            lineCount = g.edgeCount * 6
            knotCount = knotData.length / 3
            pointCount = pointData.length / 3
        }

        kit = setup()

        let width = 0
        let height = 0
        let dpr = 1

        // Projected positions for the pick, in CSS px.
        let sx = new Float32Array(0)
        let sy = new Float32Array(0)
        let st = new Float32Array(0)

        const pose: Pose = {
            rot: new Float32Array(9),
            clock: 0,
            breathe: 0,
            jelly: 0,
            intro: 1,
            inflate: 1,
        }
        /** `pose.rot`, column-major for the uniform. */
        const rotGl = new Float32Array(9)

        let phase = 0
        let shown: number | null = null
        let lostAt = 0
        let litNode = -1
        let litAlpha = 0
        // Off until the observer says otherwise, so a ball below the fold
        // does not play its intro to nobody.
        let visible = false

        let introStart = -1
        let introKey = ""
        let pointsIn = 1

        const pointer = { x: 0, y: 0, inside: false }
        /** The lean, chasing the cursor. */
        const lean = { x: 0, y: 0 }
        /** The deepened patch, chasing it faster. */
        const glow = { x: 0, y: 0, amount: 0, seeded: false }
        /** The pill's spring. */
        const pill = { x: 0, y: 0, vx: 0, vy: 0, sway: 0, hiddenAt: -Infinity, written: "" }

        function resize() {
            const rect = host.getBoundingClientRect()
            const nextW = host.clientWidth || rect.width
            const nextH = host.clientHeight || rect.height
            if (nextW <= 0 || nextH <= 0) return
            width = nextW
            height = nextH
            dpr = Math.min(window.devicePixelRatio || 1, 3)
            canvas.width = Math.max(1, Math.round(width * dpr))
            canvas.height = Math.max(1, Math.round(height * dpr))
            gl.viewport(0, 0, canvas.width, canvas.height)
            invalidRef.current = true
        }

        function radiusPx(): number {
            return (Math.min(width, height) * 0.5 * FILL) / SILHOUETTE
        }

        /** This frame's rotation: turn, then lean, then roll. */
        function orient() {
            const p = paramsRef.current
            const rot = pose.rot
            const rockAt = pose.clock * WOBBLE_RATE
            const yaw = phase + lean.x
            const pitch = p.tilt + lean.y + Math.sin(rockAt) * p.rock
            const roll = Math.cos(rockAt) * p.rock
            const cy = Math.cos(yaw)
            const sy0 = Math.sin(yaw)
            const cp = Math.cos(pitch)
            const sp = Math.sin(pitch)
            const cr = Math.cos(roll)
            const sr = Math.sin(roll)
            // Ry then Rx, as rows...
            const m00 = cy
            const m01 = 0
            const m02 = sy0
            const m10 = sp * sy0
            const m11 = cp
            const m12 = -sp * cy
            // ...then Rz over the top.
            rot[0] = cr * m00 - sr * m10
            rot[1] = cr * m01 - sr * m11
            rot[2] = cr * m02 - sr * m12
            rot[3] = sr * m00 + cr * m10
            rot[4] = sr * m01 + cr * m11
            rot[5] = sr * m02 + cr * m12
            rot[6] = -cp * sy0
            rot[7] = sp
            rot[8] = cp * cy
            for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) rotGl[c * 3 + r] = rot[r * 3 + c]
        }

        function project(g: Graph) {
            if (sx.length !== g.count) {
                sx = new Float32Array(g.count)
                sy = new Float32Array(g.count)
                st = new Float32Array(g.count)
            }
            placeAll(g, pose, radiusPx(), width / 2, height / 2, sx, sy, st)
        }

        function pick(g: Graph): number | null {
            const p = paramsRef.current
            // Not while the cloud is still drawing in: the names belong to
            // the ball, not to the points on their way to it.
            if (!pointer.inside || !p.pickable || pose.intro < 1) return null
            const reach = p.reach
            let best = -1
            let bestD = reach * reach
            for (let i = 0; i < g.count; i++) {
                if (st[i] < FRONT_T) continue
                const dx = sx[i] - pointer.x
                const dy = sy[i] - pointer.y
                const d = dx * dx + dy * dy
                if (d < bestD) {
                    bestD = d
                    best = i
                }
            }
            // Keep the current pick while it is still close, unless the
            // new one is clearly closer -- stops the word flickering.
            if (shown !== null && shown < g.count && st[shown] >= FRONT_T) {
                const dx = sx[shown] - pointer.x
                const dy = sy[shown] - pointer.y
                const d = dx * dx + dy * dy
                const hold = reach * HOLD_REACH
                if (d < hold * hold && (best < 0 || bestD > d * 0.36)) return shown
            }
            return best >= 0 ? best : null
        }

        function rgba(location: WebGLUniformLocation | null, color: Rgba) {
            gl.uniform4f(location, color.r / 255, color.g / 255, color.b / 255, color.a)
        }

        function bindPlaced(u: Uniforms, rear: number) {
            gl.uniformMatrix3fv(u.uRot, false, rotGl)
            gl.uniform1f(u.uTime, pose.clock)
            gl.uniform1f(u.uBreathe, pose.breathe)
            gl.uniform1f(u.uJelly, pose.jelly)
            gl.uniform1f(u.uIntro, pose.intro)
            gl.uniform1f(u.uInflate, pose.inflate)
            gl.uniform2f(u.uCentre, canvas.width / 2, canvas.height / 2)
            gl.uniform1f(u.uRadius, radiusPx() * dpr)
            gl.uniform2f(u.uViewport, canvas.width, canvas.height)
            gl.uniform1f(u.uRear, rear)
        }

        function drawDots(
            k: Kit,
            buffer: WebGLBuffer,
            count: number,
            rear: number,
            size: number,
            vanish: number,
            tint: Rgba,
            alpha: number
        ) {
            if (count <= 0 || alpha <= 0) return
            gl.useProgram(k.dot)
            bindPlaced(k.dotU, rear)
            gl.uniform1f(k.dotU.uSize, size * dpr)
            gl.uniform1f(k.dotU.uVanish, vanish)
            gl.uniform1f(k.dotU.uAlpha, alpha)
            rgba(k.dotU.uTint, tint)
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
            const at = gl.getAttribLocation(k.dot, "aPos")
            gl.enableVertexAttribArray(at)
            gl.vertexAttribPointer(at, 3, gl.FLOAT, false, 0, 0)
            gl.drawArrays(gl.POINTS, 0, count)
            gl.disableVertexAttribArray(at)
        }

        function draw() {
            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)
            if (!kit || width <= 0 || height <= 0) return
            const p = paramsRef.current

            const strength = 0.04 + (p.opacity / 10) * 0.42
            const rear = 1 - (p.depth / 10) * 0.95
            const color = parseColor(inkwell, p.color)
            const accent = parseColor(inkwell, p.accent)

            /* -- the thread --------------------------------------------- */

            // Under a device pixel a chord cannot get any thinner, so it
            // gets fainter instead: the core holds at one pixel and the
            // shortfall comes off the alpha.
            const devicePx = p.thickness * dpr
            const core = Math.max(1, devicePx) / 2
            const ink = Math.min(1, devicePx)

            gl.useProgram(kit.line)
            bindPlaced(kit.lineU, rear)
            gl.uniform1f(kit.lineU.uHalf, core + 1)
            gl.uniform1f(kit.lineU.uCore, core)
            gl.uniform1f(kit.lineU.uInk, ink)
            gl.uniform1f(kit.lineU.uStrength, strength)
            gl.uniform1f(kit.lineU.uPicked, litNode)
            gl.uniform1f(kit.lineU.uPickedAlpha, litAlpha)
            rgba(kit.lineU.uColor, color)
            rgba(kit.lineU.uAccent, accent)
            rgba(kit.lineU.uGlowColor, parseColor(inkwell, p.glow))
            // gl_FragCoord counts up from the bottom; the pointer counts down.
            gl.uniform3f(kit.lineU.uGlow, glow.x * dpr, (height - glow.y) * dpr, p.glowSize * dpr)
            gl.uniform1f(kit.lineU.uGlowAmt, glow.amount)

            gl.bindBuffer(gl.ARRAY_BUFFER, kit.lineBuffer)
            const bytes = STRIDE * 4
            const layout: Array<[string, number, number]> = [
                ["aPos", 3, 0],
                ["aOther", 3, 3],
                ["aMeta", 2, 6],
                ["aNodes", 2, 8],
            ]
            const bound: number[] = []
            for (const [name, size, offset] of layout) {
                const at = gl.getAttribLocation(kit.line, name)
                if (at < 0) continue
                gl.enableVertexAttribArray(at)
                gl.vertexAttribPointer(at, size, gl.FLOAT, false, bytes, offset * 4)
                bound.push(at)
            }
            gl.drawArrays(gl.TRIANGLES, 0, lineCount)
            for (const at of bound) gl.disableVertexAttribArray(at)

            /* -- the knots, and the points the ball arrives as ---------- */

            drawDots(kit, kit.knotBuffer, knotCount, rear, KNOT_SIZE, 0, accent, Math.min(1, strength * 1.6))
            if (pose.intro < 1) {
                // Half the depth fade, so the far side of the cloud still
                // reads as points rather than haze.
                drawDots(
                    kit,
                    kit.pointBuffer,
                    pointCount,
                    0.5 + rear * 0.5,
                    INTRO_POINT_SIZE,
                    1,
                    color,
                    INTRO_POINT_ALPHA * pointsIn
                )
            }
        }

        /** The pill's chase: a damped spring, integrated in small fixed
         *  steps so it is the same spring at 60Hz and 144Hz. */
        function stepPill(dt: number, now: number) {
            const p = paramsRef.current
            const tx = pointer.x + PILL_OFFSET_X
            const ty = pointer.y + PILL_OFFSET_Y
            if (shown === null && now - pill.hiddenAt > PILL_RESEAT_MS) {
                pill.x = tx
                pill.y = ty
                pill.vx = 0
                pill.vy = 0
                pill.sway = 0
            } else {
                const w = p.pillOmega
                const w2 = w * w
                const c = 2 * PILL_DAMPING * w
                const steps = Math.max(1, Math.ceil(dt * 240))
                const h = dt / steps
                for (let s = 0; s < steps; s++) {
                    pill.vx += (-w2 * (pill.x - tx) - c * pill.vx) * h
                    pill.vy += (-w2 * (pill.y - ty) - c * pill.vy) * h
                    pill.x += pill.vx * h
                    pill.y += pill.vy * h
                }
                // Lean into the motion: a tag above the cursor trails its
                // top edge behind it.
                const sway = clamp(-pill.vx * PILL_SWAY, -PILL_SWAY_MAX, PILL_SWAY_MAX)
                pill.sway += (sway - pill.sway) * (1 - Math.pow(0.85, dt * 60))
            }
            const next = `translate3d(${pill.x.toFixed(2)}px, ${pill.y.toFixed(2)}px, 0) rotate(${pill.sway.toFixed(2)}deg)`
            if (next !== pill.written) {
                pill.written = next
                pillEl.style.transform = next
            }
        }

        let frame = 0
        let last = performance.now()
        let lastGraph: Graph | null = null

        function tick(now: number) {
            frame = requestAnimationFrame(tick)
            const dt = Math.min((now - last) / 1000, 0.1)
            last = now
            if (!visible || width <= 0 || !kit) return
            const g = graphRef.current
            const p = paramsRef.current

            if (g !== lastGraph) {
                // A new ball: the old point indices mean nothing now.
                lastGraph = g
                upload(g)
                shown = null
                litNode = -1
                litAlpha = 0
                pill.hiddenAt = -Infinity
                setPicked(null)
                invalidRef.current = true
            }

            /* -- the intro ---------------------------------------------- */

            if (introStart < 0 || p.introKey !== introKey) {
                introStart = now
                introKey = p.introKey
            }
            const elapsed = (now - introStart) / 1000
            if (!p.introPlay || reducedMotion) {
                pose.intro = 1
                pointsIn = 1
            } else {
                pose.intro = clamp((elapsed - p.introDelay) / p.introDuration, 0, 1)
                pointsIn = clamp(elapsed / INTRO_FADE_IN, 0, 1)
            }
            pose.inflate = p.introInflate
            const introRunning = pose.intro < 1

            /* -- the body ----------------------------------------------- */

            phase += p.spin * dt
            pose.clock += p.pace * dt
            pose.breathe = p.breathe
            pose.jelly = p.jelly

            // The lean: the brief's `rotation += 0.05 * (target -
            // rotation)`, rebased on elapsed time so Smoothing is the same
            // weight at 60Hz and at 144Hz.
            const nx = pointer.inside ? clamp((pointer.x - width / 2) / (width / 2), -1, 1) : 0
            const ny = pointer.inside ? clamp((pointer.y - height / 2) / (height / 2), -1, 1) : 0
            const kLean = 1 - Math.pow(1 - p.follow, dt * 60)
            const leanX = lean.x
            const leanY = lean.y
            lean.x += (nx * p.parallax - lean.x) * kLean
            lean.y += (ny * p.parallax - lean.y) * kLean
            const leaning = Math.abs(lean.x - leanX) + Math.abs(lean.y - leanY) > 1e-5

            // The patch: quick to follow, slow to open and close.
            const kGlow = 1 - Math.pow(1 - GLOW_FOLLOW, dt * 60)
            const kAmount = 1 - Math.pow(1 - GLOW_FADE, dt * 60)
            const glowWas = glow.amount
            const glowTarget = pointer.inside ? 1 : 0
            if (pointer.inside) {
                if (!glow.seeded) {
                    glow.x = pointer.x
                    glow.y = pointer.y
                    glow.seeded = true
                }
                glow.x += (pointer.x - glow.x) * kGlow
                glow.y += (pointer.y - glow.y) * kGlow
            }
            glow.amount += (glowTarget - glow.amount) * kAmount
            if (Math.abs(glowTarget - glow.amount) < 0.003) {
                glow.amount = glowTarget
                if (!pointer.inside) glow.seeded = false
            }
            const glowing =
                glow.amount !== glowWas ||
                (glow.amount > 0 &&
                    Math.abs(pointer.x - glow.x) + Math.abs(pointer.y - glow.y) > 0.05)

            orient()
            project(g)

            /* -- the pick ----------------------------------------------- */

            const next = pick(g)
            if (next !== null) {
                lostAt = 0
                if (next !== shown) {
                    shown = next
                    litNode = next
                    setPicked(next)
                }
            } else if (shown !== null) {
                if (lostAt === 0) lostAt = now
                if (now - lostAt > HOLD_MS || !pointer.inside) {
                    shown = null
                    lostAt = 0
                    pill.hiddenAt = now
                    setPicked(null)
                }
            }

            const litTarget = shown !== null ? 1 : 0
            const litWas = litAlpha
            litAlpha += (litTarget - litAlpha) * (1 - Math.pow(1 - LIT_FOLLOW, dt * 60))
            if (Math.abs(litTarget - litAlpha) < 0.003) litAlpha = litTarget
            const fading = litAlpha !== litWas

            stepPill(dt, now)

            // A ball told to hold perfectly still has nothing new to draw.
            const alive = p.spin !== 0 || p.rock > 0 || p.breathe > 0 || p.jelly > 0
            if (alive || introRunning || pointsIn < 1 || leaning || glowing || fading || invalidRef.current) {
                invalidRef.current = false
                draw()
            }
        }

        function onPointerMove(event: PointerEvent) {
            const rect = host.getBoundingClientRect()
            if (rect.width <= 0 || rect.height <= 0) return
            // Screen pixels back down to CSS pixels: Framer's canvas, or any
            // transformed ancestor, may be drawing the frame at a zoom.
            pointer.x = ((event.clientX - rect.left) * width) / rect.width
            pointer.y = ((event.clientY - rect.top) * height) / rect.height
            pointer.inside = true
        }

        function onPointerLeave() {
            pointer.inside = false
        }

        function onContextLost(event: Event) {
            event.preventDefault()
            kit = null
        }

        function onContextRestored() {
            kit = setup()
            lastGraph = null
            resize()
        }

        resize()
        const observer = new ResizeObserver(resize)
        observer.observe(host)

        // Nothing to turn while nobody can see it -- and the intro waits
        // for the first time somebody can.
        const seen = new IntersectionObserver((entries) => {
            for (const entry of entries) visible = entry.isIntersecting
            if (visible) invalidRef.current = true
        })
        seen.observe(host)

        host.addEventListener("pointermove", onPointerMove, { capture: true })
        host.addEventListener("pointerleave", onPointerLeave)
        host.addEventListener("pointercancel", onPointerLeave)
        canvas.addEventListener("webglcontextlost", onContextLost)
        canvas.addEventListener("webglcontextrestored", onContextRestored)
        window.addEventListener("resize", resize)

        frame = requestAnimationFrame(tick)

        return () => {
            cancelAnimationFrame(frame)
            observer.disconnect()
            seen.disconnect()
            host.removeEventListener("pointermove", onPointerMove, { capture: true })
            host.removeEventListener("pointerleave", onPointerLeave)
            host.removeEventListener("pointercancel", onPointerLeave)
            canvas.removeEventListener("webglcontextlost", onContextLost)
            canvas.removeEventListener("webglcontextrestored", onContextRestored)
            window.removeEventListener("resize", resize)
            if (kit) {
                gl.deleteBuffer(kit.lineBuffer)
                gl.deleteBuffer(kit.knotBuffer)
                gl.deleteBuffer(kit.pointBuffer)
                gl.deleteProgram(kit.line)
                gl.deleteProgram(kit.dot)
            }
        }
    }, [])

    /* ---------------------------------------------------------- render */

    return (
        <div
            ref={hostRef}
            className={className}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                backgroundColor: background,
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
                    pointerEvents: "none",
                }}
            />

            {/* The pill. The outer element is moved by the draw loop -- the
                spring and the lean. The plain div centres it; the motion
                element inside pops in and out. Kept
                apart because framer-motion owns the transform of any
                element it animates. */}
            <div
                ref={pillRef}
                style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    pointerEvents: "none",
                    zIndex: 1,
                    willChange: "transform",
                }}
            >
                <div style={{ transform: "translate(-50%, -50%)" }}>
                    <AnimatePresence>
                        {word !== null && (
                            <motion.div
                                key="pill"
                                initial={{ opacity: 0, scale: 0.82, y: 8 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 4 }}
                                transition={transition}
                                style={{
                                    padding: "0.5em 1.1em",
                                    borderRadius: 999,
                                    backgroundColor: resolvedHover.pill,
                                    backdropFilter: "blur(6px)",
                                    WebkitBackdropFilter: "blur(6px)",
                                    color: textColor,
                                    whiteSpace: "nowrap",
                                    userSelect: "none",
                                    ...pillFont,
                                }}
                            >
                                {pillWord}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}

/* ------------------------------------------------------------ controls */
