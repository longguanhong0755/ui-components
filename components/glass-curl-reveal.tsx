"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import { animate, motionValue } from "motion/react"

/**
 * framer-motion's `animate()` option bag. `AnimationOptions` is not exported by
 * the copy of framer-motion that ships inside Framer, and its `Transition` type
 * is not assignable to what `animate(value, …)` accepts, so the shape is
 * spelled out here — a type alias, not an interface, or it loses the implicit
 * index signature the intersection needs.
 */
type Motion = {
    type?: "spring" | "tween" | "keyframes" | "inertia"
    duration?: number
    ease?: [number, number, number, number]
    delay?: number
    stiffness?: number
    damping?: number
    mass?: number
    bounce?: number
    restSpeed?: number
    restDelta?: number
}

/**
 * GlassCurlReveal — an image seen through rippled glass that flattens in place.
 *
 * At progress 0 the image is displaced by a large-amplitude wave whose isolines
 * are bowed parabolas (the "curl"): adjacent bands sample wildly different rows,
 * so content stretches and compresses into the smeared arcs of the reference
 * frame. Chromatic dispersion splits R/B along the same offset for the glass
 * fringing; the derivative of the wave paints the bright/dark specular banding.
 * As progress runs to 1 the amplitude envelope decays to 0 and every one of
 * those terms vanishes together — the picture un-waves where it stands. No
 * wipe, no clip: the whole frame resolves at once.
 *
 * Trigger is Scroll (the element entering the viewport drives progress) or
 * Hover (pointer in reveals, pointer out re-curls, both on the Transition).
 *
 * Rendering: raw WebGL, context built once, every live input read from a ref
 * inside the rAF loop — no per-frame setState, no context teardown on a prop
 * change. Raw rAF ticks on the Framer canvas, so the effect is live there too.
 * Never calls loseContext(): getContext() returns the SAME (force-lost) context
 * on the next mount and would render black.
 */

const VERTEX_SRC = `
attribute vec4 a_position;
void main() { gl_Position = a_position; }
`

const FRAGMENT_SRC = `
precision highp float;

uniform vec2 iResolution;
uniform float uTime;
uniform float uProgress;   // 0 = fully curled, 1 = clean
uniform sampler2D uTex;
uniform vec2 uCover;       // uv scale that reproduces object-fit: cover
uniform float uAspect;     // canvas w/h
uniform vec2 uDir;         // unit displacement direction
uniform float uAmp;        // peak displacement, uv units
uniform float uFreq;       // radians per unit of wave coordinate
uniform float uCurve;      // even bend of the isolines — the C bow
uniform float uSCurve;     // odd bend of the isolines — the S
uniform float uDisp;       // chromatic split
uniform float uShine;      // specular banding
uniform vec3 uTint;        // glass colour, white = untinted

// Spatial phase of the wave, in radians.
//
// Distance along uDir sets the band spacing (uFreq). Distance ACROSS it bends
// the bands, and the bend is the sum of two independent shapes:
//
//   bow = s*s              even in s, so both edges bend the SAME way — a C.
//   ess = 2.5*(s^3 - 0.6s) odd in s, so the edges bend OPPOSITE ways — an S.
//
// A single quadratic term can only ever make the C; that is why an S needs the
// cubic. The -0.6s is what makes it a real ogee rather than a flat middle with
// two hooks: it puts turning points at s = ±0.447 and an inflection with
// non-zero slope at the centre. The 2.5 renormalizes so the term still reaches
// ±1 at the frame edge, i.e. both controls are on the same scale.
//
// s is normalized to [-1, 1] by the support function of the frame rect, so a
// Curve setting means the same bend at any Angle and any aspect ratio.
//
// The bend is added in RADIANS, not multiplied by uFreq. Folded inside the
// frequency it scaled with Ripples — the same Curve setting meant a gentle bow
// at 3 ripples and 30 cycles of it at 30, so the control did not name one
// thing. Out here it is band-widths of arc at any Ripples.
//
// Note Curve alone is symmetric about the centre line, so at large values the
// two halves mirror and content folds across the seam. That is what the shape
// is; mix in some S Curve to break it.
float wavePhase(vec2 p) {
    vec2 perp = vec2(-uDir.y, uDir.x);
    float a = dot(p, uDir);
    float halfSpan = 0.5 * (uAspect * abs(perp.x) + abs(perp.y));
    float s = dot(p, perp) / max(halfSpan, 0.0001);
    float bow = s * s;
    float ess = 2.5 * (s * s * s - 0.6 * s);
    return a * uFreq + uCurve * bow + uSCurve * ess;
}

// Three octaves: the carrier, a fine ripple, and a long sweep that gives the
// frame its single big S-bend. Normalized so uAmp stays the true peak.
float wave(float q, float t) {
    float w = sin(q + t);
    w += 0.45 * sin(q * 2.3 - t * 1.4);
    w += 0.30 * sin(q * 0.35 + t * 0.6);
    return w / 1.75;
}

// d/dq of wave(), scaled back to roughly [-1, 1] — the surface slope, which is
// where a real sheet of rippled glass throws its highlight.
float waveSlope(float q, float t) {
    float d = cos(q + t);
    d += 0.45 * 2.3 * cos(q * 2.3 - t * 1.4);
    d += 0.30 * 0.35 * cos(q * 0.35 + t * 0.6);
    return clamp(d / 2.14, -1.0, 1.0);
}

vec2 cover(vec2 uv) {
    return (uv - 0.5) * uCover + 0.5;
}

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution;

    // Amplitude envelope. Quadratic so the last of the ripple leaves quickly
    // and the image lands crisp rather than crawling to a stop.
    float env = 1.0 - clamp(uProgress, 0.0, 1.0);
    env = env * env * (0.6 + 0.4 * env);

    vec2 p = (uv - 0.5) * vec2(uAspect, 1.0);
    float q = wavePhase(p);
    float t = uTime * 0.9;

    float w = wave(q, t);

    vec2 off = uDir * (w * uAmp * env);
    off.x /= uAspect;

    // Chromatic split rides the same offset, so it only exists while curled.
    float d = uDisp * env;
    vec3 col;
    col.r = texture2D(uTex, cover(uv + off * (1.0 + d))).r;
    col.g = texture2D(uTex, cover(uv + off)).g;
    col.b = texture2D(uTex, cover(uv + off * (1.0 - d))).b;

    float s = waveSlope(q, t) * uShine * env;
    col += max(s, 0.0) * 0.75;          // crest catches the light
    col *= 1.0 - max(-s, 0.0) * 0.35;   // trough falls into shadow

    // The tint belongs to the GLASS, so it rides the same envelope as every
    // other term and is gone the moment the image lands clean.
    col *= mix(vec3(1.0), uTint, env);

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

function compileShader(
    gl: WebGLRenderingContext,
    type: number,
    src: string
): WebGLShader | null {
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, src)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
    }
    return shader
}

function num(v: number | undefined, fallback: number): number {
    return typeof v === "number" && Number.isFinite(v) ? v : fallback
}

type ImageProp = { src?: string; srcSet?: string; alt?: string }

/* Panel follows rule 11 — 8 leaf dials, flat, no groups, whole numbers (rule 3).
 *
 * Changed keys, clean break, no fallback chains (rule 11c). Every one of these
 * strands a live instance's stored value:
 *
 *   glass.tint            -> tint          (promoted to top level)
 *   glass.ripples         -> ripples       (promoted to top level)
 *   background            -> CUT, frozen   (never visible — see BACKGROUND)
 *   glass.curve            -> CUT, frozen   (see CURVE)
 *   glass.sCurve           -> CUT, frozen   (see S_CURVE)
 *   glass.dispersion       -> CUT, frozen   (see DISPERSION)
 *   glass.shine            -> CUT, frozen   (see SHINE)
 *
 * The `glass` group is gone with them: two surviving rows are not a repeating
 * family, and rule 11 keeps headline dials flat.
 *
 * Earlier passes, still true: `Motion { Duration, Delay }` was replaced by a
 * single `transition` (ControlType.Transition, rule 2), and Trigger dropped Time
 * — an instance still storing "time" is not a value the enum offers, so it reads
 * as Scroll (the default and the `else` of the trigger mapping). */

type Props = {
    image?: ImageProp
    rounded?: number // percent of the max radius
    trigger?: "scroll" | "hover"
    amount?: number // percent
    angle?: number // degrees
    ripples?: number // count
    tint?: string // glass colour, white = untinted
    transition?: Motion
    width?: number // injected by Framer — reliable when clientWidth reads 0
    height?: number
    style?: React.CSSProperties
}

/** #rgb / #rrggbb / rgb() -> 0..1 triple. Anything unparseable reads white. */
function parseRGB(input: string | undefined): [number, number, number] {
    if (!input) return [1, 1, 1]
    const s = input.trim()
    const m = s.match(/^#([0-9a-f]{3,8})$/i)
    if (m) {
        let h = m[1]
        if (h.length === 3 || h.length === 4)
            h = h
                .slice(0, 3)
                .split("")
                .map((c) => c + c)
                .join("")
        const n = parseInt(h.slice(0, 6), 16)
        return [
            ((n >> 16) & 255) / 255,
            ((n >> 8) & 255) / 255,
            (n & 255) / 255,
        ]
    }
    const r = s.match(/rgba?\(([^)]+)\)/i)
    if (r) {
        const p = r[1].split(",").map((v) => parseFloat(v))
        if (p.length >= 3) return [p[0] / 255, p[1] / 255, p[2] / 255]
    }
    return [1, 1, 1]
}

const DEFAULT_IMAGE: ImageProp = {
    src: "https://framerusercontent.com/images/GfGkADagM4KEibNcIiRUWlfrR0.jpg",
    alt: "",
}

// How long the canvas-only preview loop rests on the revealed image before it
// curls back up. Canvas affordance, not a design control — the canvas has no
// scroll and gets no pointer enter/leave, so neither trigger can drive it.
const CANVAS_HOLD_MS = 1400

// Radians of isoline bend at the frame edge for a Curve / S Curve of 100 —
// two full band-widths each way.
const BEND_MAX = Math.PI * 4

/* ---- Cut controls, frozen at the value they shipped at (rule 11b) ----
 *
 * The panel row is gone; the render path below is unchanged and reads these
 * constants at the old `defaultValue`, so nothing renders differently.
 *
 * BACKGROUND — the fragment shader writes alpha 1.0 across the whole quad and
 *   the canvas is inset:0 at 100%/100%, so this colour is covered the moment the
 *   first frame draws. It survives only as the pre-paint backdrop and the
 *   no-WebGL fallback, which is the component's own job, not a design decision
 *   (rule F: a control that maps to no visible behavior).
 * CURVE / S_CURVE — the even and odd terms of ONE shape, the isoline bend. Two
 *   dials for one decision, and micro-geometry a designer does not tune
 *   (rule 11b). 30 / 70 is the curl the component shipped with.
 * DISPERSION / SHINE — the chromatic fringe and the specular banding. Glass
 *   character that rides the same envelope as everything else and is gone once
 *   the image lands; Amount already scales the whole effect.
 */
const BACKGROUND = "#0b0b0d"
const CURVE_RAD = (30 / 100) * BEND_MAX
const S_CURVE_RAD = (70 / 100) * BEND_MAX
const DISPERSION = (25 / 100) * 0.35
const SHINE = 40 / 100

/**
 * The reveal playhead the component shipped with: a linear 2200ms ramp, no delay.
 * It was a `Motion { Duration, Delay }` pair of number dials, which is exactly
 * what ControlType.Transition replaces (rule 2) — a designer now gets native
 * Spring physics on the curl instead of a fixed linear sweep.
 */
const DEFAULT_TRANSITION: Motion = {
    type: "tween",
    duration: 2.2,
    // linear, as the cubic-bezier the tuple type needs.
    ease: [0, 0, 1, 1],
    delay: 0,
}

/**
 * How hard the Scroll-triggered playhead chases raw scroll, per frame at 60fps.
 * Frozen from the value the component shipped at. Scroll mode has no state
 * change to tween — the playhead IS the scrollbar — so the Transition control is
 * hidden there rather than pointed at a filter it cannot describe.
 */
const SCROLL_FOLLOW = 0.12

/**
 * Scroll progress from the element's OWN geometry, read fresh every frame.
 *
 * Travel here is `min(vh, h)` — scroll from the moment the top edge crosses the
 * viewport bottom until either the element fills the viewport (tall) or is fully
 * visible (short). Always monotone, and it reaches exactly 1.
 *
 * getBoundingClientRect is the right call here: the quantity IS the element's
 * position relative to the viewport, which offsetTop cannot give through nested
 * scrollers.
 */
function scrollProgress(el: HTMLElement): number {
    const vh =
        window.innerHeight || document.documentElement.clientHeight || 1
    const r = el.getBoundingClientRect()
    const travel = Math.max(1, Math.min(vh, r.height))
    return Math.min(1, Math.max(0, (vh - r.top) / travel))
}

export default function GlassCurlReveal(props: Props) {
    const {
        image = {"alt":"","src":"https://images.unsplash.com/photo-1737834495647-f60b20534b22?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MzB8fHZpYnJhbnQlMjBpbWFnZXN8ZW58MHwwfDB8fHwy"},
        rounded = 0,
        trigger = "hover",
        amount = 55,
        angle = 360,
        ripples = 22,
        tint = "#FFFFFF",
        transition = {"ease":[0,0,1,1],"mass":1,"type":"tween","delay":0,"damping":60,"duration":1,"stiffness":800},
        width,
        height,
        style,
    } = props

    const src = image?.src || DEFAULT_IMAGE.src
    const alt = image?.alt || ""

    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const isStatic = false
    const isCanvas = false

    // Fallback size only. The laid-out box wins (see the loop): the minWidth /
    // minHeight floor can override the injected width/height, and sizing the
    // buffer from the props then stretches a small buffer across a large canvas.
    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    const valuesRef = useRef({
        trigger: "scroll" as "scroll" | "hover",
        amp: 0.165,
        freq: 37.7,
        curve: 3.77,
        sCurve: 8.8,
        dirX: 0,
        dirY: 1,
        disp: 0.25,
        shine: 0.4,
        tint: [1, 1, 1] as [number, number, number],
    })
    {
        const rad = (num(angle, 90) * Math.PI) / 180
        valuesRef.current = {
            trigger: trigger === "hover" ? "hover" : "scroll",
            // 0.40 uv at full Amount — enough displacement for bands to fold
            // over each other, which is where the smear in the reference lives.
            amp: (num(amount, 55) / 100) * 0.4,
            freq: Math.max(1, num(ripples, 12)) * Math.PI,
            // Frozen bend, in radians at the frame edge — the C bow and the S,
            // both on the same scale (that is what renormalizing the cubic buys).
            curve: CURVE_RAD,
            sCurve: S_CURVE_RAD,
            dirX: Math.cos(rad),
            dirY: Math.sin(rad),
            disp: DISPERSION,
            shine: SHINE,
            tint: parseRGB(tint),
        }
    }

    /* The Hover-triggered reveal playhead, and the canvas preview loop. A
     * MotionValue rather than an elapsed/duration ramp so the Transition control
     * owns the easing — the rAF loop only reads .get(), so nothing here
     * re-renders the tree. Scroll mode never touches it: there the playhead is
     * computed straight from the element's geometry inside the loop. */
    const progressMV = useRef(motionValue(0)).current

    /* Framer hands back a fresh Transition object on every render, so it can
     * never be an effect dep: the ResizeObserver's setBox alone would then tear
     * down and restart the canvas loop on every resize frame. Read it from a ref
     * at the moment a run starts — an edit lands on the next lap. */
    const transitionRef = useRef<Motion>(transition)
    transitionRef.current = transition

    /* Canvas-only ping-pong. Kept for parity with the source; isCanvas is always
     * false outside Framer, so this effect resolves to the preview/live branch. */
    useEffect(() => {
        if (isStatic) {
            progressMV.set(1)
            return
        }
        if (!isCanvas) {
            // Preview / live starts curled; scroll or the pointer takes it from
            // here.
            progressMV.set(0)
            return
        }
        let cancelled = false
        let timer: ReturnType<typeof setTimeout> | undefined
        let controls: { stop: () => void } | undefined

        const run = async () => {
            while (!cancelled) {
                progressMV.set(0)
                const playback = animate(progressMV, 1, transitionRef.current)
                controls = playback
                await playback
                if (cancelled) break
                await new Promise<void>((res) => {
                    timer = setTimeout(res, CANVAS_HOLD_MS)
                })
            }
        }
        run()

        return () => {
            cancelled = true
            if (timer) clearTimeout(timer)
            controls?.stop()
        }
    }, [isCanvas, isStatic, progressMV])

    /* Hover. Pointer in runs the playhead to 1 (clean), pointer out back to 0
     * (curled), both on the Transition control — so the same dial describes the
     * reveal and the re-curl. The previous run is stopped rather than left to
     * fight the new one, which is what makes a fast in-out-in read smoothly. */
    const hoverAnim = useRef<{ stop: () => void } | null>(null)
    const hoverTo = React.useCallback(
        (to: number) => {
            if (isCanvas || isStatic || trigger !== "hover") return
            hoverAnim.current?.stop()
            hoverAnim.current = animate(progressMV, to, transitionRef.current)
        },
        [isCanvas, isStatic, trigger, progressMV]
    )
    // Switching trigger away from Hover mid-hover would strand the playhead
    // wherever it stopped; scroll recomputes every frame, so only the unmount /
    // mode-change stop is needed.
    useEffect(() => () => hoverAnim.current?.stop(), [])

    /* Rounded is a percent of the MAX radius — half the short side — so 100 is
     * a true stadium at any size. A CSS percentage radius resolves per axis and
     * would give an ellipse on a non-square box, so the box has to be measured.
     * offsetWidth/offsetHeight, never getBoundingClientRect (canvas zoom). */
    const [box, setBox] = React.useState({ w: 0, h: 0 })
    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const read = () => setBox({ w: el.offsetWidth, h: el.offsetHeight })
        read()
        const ro = new ResizeObserver(read)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])
    /* Percent of the max radius — half the box's short side — and 100 is a true
     * CIRCLE at any aspect, not a pill: the clip box narrows toward a square as
     * the radius grows, so the two meet at a circle of diameter min(w, h) and
     * the long axis is clipped away. The element's own box never resizes. */
    const roundedClip = (() => {
        if (!box.w || !box.h) return "none"
        const t = Math.max(0, Math.min(100, rounded)) / 100
        const short = Math.min(box.w, box.h)
        const insetX = (t * (box.w - short)) / 2
        const insetY = (t * (box.h - short)) / 2
        return `inset(${insetY}px ${insetX}px round ${(t * short) / 2}px)`
    })()

    const glRef = useRef<{
        gl: WebGLRenderingContext
        texture: WebGLTexture
    } | null>(null)
    const imageSizeRef = useRef({ w: 1, h: 1 })

    // ---- GL context: built once, never rebuilt ----
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const gl = canvas.getContext("webgl", { premultipliedAlpha: false })
        if (!gl) {
            console.error("WebGL not supported")
            return
        }

        const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SRC)
        const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC)
        if (!vs || !fs) return

        const program = gl.createProgram()
        if (!program) return
        gl.attachShader(program, vs)
        gl.attachShader(program, fs)
        gl.linkProgram(program)
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("Program link error:", gl.getProgramInfoLog(program))
            return
        }
        gl.useProgram(program)

        const buffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
            gl.STATIC_DRAW
        )
        const posLoc = gl.getAttribLocation(program, "a_position")
        gl.enableVertexAttribArray(posLoc)
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

        // 1×1 placeholder so the first frames draw something instead of black
        // while the picture is still downloading.
        const texture = gl.createTexture()
        if (!texture) return
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            1,
            1,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            new Uint8Array([16, 16, 20, 255])
        )
        // NPOT images are arbitrary sizes — NPOT demands CLAMP + no mipmaps.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

        glRef.current = { gl, texture }

        const u = {
            resolution: gl.getUniformLocation(program, "iResolution"),
            time: gl.getUniformLocation(program, "uTime"),
            progress: gl.getUniformLocation(program, "uProgress"),
            tex: gl.getUniformLocation(program, "uTex"),
            cover: gl.getUniformLocation(program, "uCover"),
            aspect: gl.getUniformLocation(program, "uAspect"),
            dir: gl.getUniformLocation(program, "uDir"),
            amp: gl.getUniformLocation(program, "uAmp"),
            freq: gl.getUniformLocation(program, "uFreq"),
            curve: gl.getUniformLocation(program, "uCurve"),
            sCurve: gl.getUniformLocation(program, "uSCurve"),
            disp: gl.getUniformLocation(program, "uDisp"),
            shine: gl.getUniformLocation(program, "uShine"),
            tint: gl.getUniformLocation(program, "uTint"),
        }
        gl.uniform1i(u.tex, 0)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, texture)

        const start = performance.now()
        let scrollSmooth = 0
        let scrollPrimed = false
        let rafId = 0

        const render = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            const cw = canvas.clientWidth || sizeRef.current.w || 1200
            const ch = canvas.clientHeight || sizeRef.current.h || 800
            const bw = Math.max(1, Math.round(cw * dpr))
            const bh = Math.max(1, Math.round(ch * dpr))
            if (canvas.width !== bw || canvas.height !== bh) {
                canvas.width = bw
                canvas.height = bh
                gl.viewport(0, 0, bw, bh)
            }

            const v = valuesRef.current
            const now = performance.now()
            const t = (now - start) / 1000

            // ---- progress ----
            let progress: number
            const host = containerRef.current
            if (v.trigger === "scroll" && !isCanvas && host) {
                const raw = scrollProgress(host)
                if (!scrollPrimed) {
                    scrollSmooth = raw
                    scrollPrimed = true
                } else {
                    scrollSmooth += (raw - scrollSmooth) * SCROLL_FOLLOW
                }
                progress = scrollSmooth
            } else {
                // Hover, and the canvas loop. The playhead is a MotionValue
                // driven by the Transition control; the loop only reads it, so a
                // spring with bounce overshoots past 1 and settles, which a
                // linear elapsed/duration ramp could never do.
                progress = progressMV.get()
            }

            // object-fit: cover, in uv space.
            const ca = bw / bh
            const ia = imageSizeRef.current.w / imageSizeRef.current.h
            const sx = ia > ca ? ca / ia : 1
            const sy = ia > ca ? 1 : ia / ca

            gl.uniform2f(u.resolution, bw, bh)
            gl.uniform1f(u.time, t)
            gl.uniform1f(u.progress, progress)
            gl.uniform2f(u.cover, sx, sy)
            gl.uniform1f(u.aspect, ca)
            gl.uniform2f(u.dir, v.dirX, v.dirY)
            gl.uniform1f(u.amp, v.amp)
            gl.uniform1f(u.freq, v.freq)
            gl.uniform1f(u.curve, v.curve)
            gl.uniform1f(u.sCurve, v.sCurve)
            gl.uniform1f(u.disp, v.disp)
            gl.uniform1f(u.shine, v.shine)
            gl.uniform3f(u.tint, v.tint[0], v.tint[1], v.tint[2])

            gl.drawArrays(gl.TRIANGLES, 0, 6)
            rafId = requestAnimationFrame(render)
        }
        rafId = requestAnimationFrame(render)

        return () => {
            cancelAnimationFrame(rafId)
            glRef.current = null
        }
        // Built once. Every live input flows through valuesRef/sizeRef.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // ---- texture upload: src only, so a group object identity change can't
    // retrigger it ----
    useEffect(() => {
        if (!src) return
        let cancelled = false
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
            const ctx = glRef.current
            if (cancelled || !ctx) return
            const { gl, texture } = ctx
            imageSizeRef.current = {
                w: img.naturalWidth || 1,
                h: img.naturalHeight || 1,
            }
            gl.bindTexture(gl.TEXTURE_2D, texture)
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                img
            )
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        }
        img.onerror = () => console.error("GlassCurlReveal: image load failed")
        img.src = src
        return () => {
            cancelled = true
        }
    }, [src])

    // Static render (thumbnails, export) has no GL — ship the plain picture.
    if (isStatic) {
        return (
            <div
                ref={containerRef}
                style={{
                    minWidth: 1200,
                    minHeight: 800,
                    ...style,
                    position: "relative",
                    overflow: "hidden",
                    background: BACKGROUND,
                    clipPath: roundedClip,
                }}
            >
                <img
                    src={src}
                    alt={alt}
                    style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                    }}
                />
            </div>
        )
    }

    return (
        <div
            ref={containerRef}
            // Pointer, not mouse: it covers pen and touch, and pointerleave
            // fires on the cancel a touch drag ends with. The listeners sit on
            // the root, which never transforms, so the hit box cannot move out
            // from under a stationary pointer and flap.
            onPointerEnter={() => hoverTo(1)}
            onPointerLeave={() => hoverTo(0)}
            onPointerCancel={() => hoverTo(0)}
            style={{
                minWidth: 1200,
                minHeight: 800,
                ...style,
                position: "relative",
                overflow: "hidden",
                background: BACKGROUND,
                clipPath: roundedClip,
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
