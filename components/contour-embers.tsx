"use client"

import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"

/* ---------------------------------------------------------------- types --- */

interface Props {
    background?: string
    baseColor?: string
    accentColor?: string
    density?: number
    scale?: number
    warp?: number
    angle?: number
    lineWidth?: number
    sparks?: number
    speed?: number
    rings?: number
    reach?: number
    style?: CSSProperties
}

/* ------------------------------------------------------------- constants --- */

/** Quality tier, not a design control — picked, not exposed. */
const MAX_DPR = 2

/** Hover fade, per second. The position is not eased: the hill IS the cursor. */
const HOVER_RATE = 6

/** Ember travel, in g-levels per second, at Speed 50. */
const EMBER_RATE = 0.42

/** Field drift, in world units per second, at Speed 50. */
const DRIFT_RATE = 0.012

/**
 * Mean |grad fbm| for the five octaves below, at unit Scale. Measured over 300k
 * samples: 0.4300. Warp divides by it so its strength can be stated as a ratio
 * against the ramp, which is what makes it independent of Scale.
 */
const MEAN_GRADIENT = 0.43

type Vec3 = [number, number, number]

/* ------------------------------------------------------------- utilities --- */

/** Parses `#fff`, `#rrggbb`, `#rrggbbaa`, `rgb()` and `rgba()` into 0..1 RGB. */
function parseColor(input: string | undefined, fallback: Vec3): Vec3 {
    if (!input) return fallback
    const str = String(input).trim()

    if (str.charAt(0) === "#") {
        let hex = str.slice(1)
        if (hex.length === 3 || hex.length === 4) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
        }
        if (hex.length >= 6) {
            const r = parseInt(hex.slice(0, 2), 16)
            const g = parseInt(hex.slice(2, 4), 16)
            const b = parseInt(hex.slice(4, 6), 16)
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r / 255, g / 255, b / 255]
        }
        return fallback
    }

    const parts = str.match(/[\d.]+/g)
    if (parts && parts.length >= 3) {
        return [
            Math.min(255, parseFloat(parts[0])) / 255,
            Math.min(255, parseFloat(parts[1])) / 255,
            Math.min(255, parseFloat(parts[2])) / 255,
        ]
    }
    return fallback
}

function clamp(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v
}

/** A prop that arrives undefined must not turn the whole render NaN. */
function num(v: unknown, fallback: number): number {
    return typeof v === "number" && isFinite(v) ? v : fallback
}

/* --------------------------------------------------------------- shaders --- */

const VERT_SRC = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAG_SRC = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;
uniform float uTime;
uniform float uDpr;

uniform vec3  uBg;
uniform vec3  uBase;
uniform vec3  uAccent;
uniform vec2  uFocus;       // world units, frame height = 1
uniform float uLevels;      // contour levels per unit of field
uniform float uScale;       // warp frequency, cycles per frame height
uniform vec2  uDir;         // ramp direction, unit
uniform float uWarpAmt;     // warp amplitude, field units
uniform float uHalfWidth;   // half the line width, world units
uniform float uSparkLevels; // g-levels per unit of the ember field, 0 = none
uniform float uPhase;       // ember travel, in g-levels
uniform float uDrift;       // field drift, world units
uniform float uAmp;         // pointer hill amplitude, field units
uniform float uReach;       // pointer hill radius, world units
uniform float uHover;       // 0 = no pointer, 1 = fully present

const float GLOW = 0.25;   // cut control, frozen at what it shipped at

float h21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// Value noise WITH its derivative. Returns (value, d/dx, d/dy).
//
// The quintic-free smoothstep u = f^2(3-2f) has derivative 6f(1-f); the bilinear
// blend then differentiates in closed form, which is the whole reason the line
// width below can be stated in pixels.
vec3 vnoiseD(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    vec2 du = 6.0 * f * (1.0 - f);

    float a = h21(i);
    float b = h21(i + vec2(1.0, 0.0));
    float c = h21(i + vec2(0.0, 1.0));
    float d = h21(i + vec2(1.0, 1.0));

    float k1 = b - a;
    float k2 = c - a;
    float k3 = a - b - c + d;

    float v = a + k1 * u.x + k2 * u.y + k3 * u.x * u.y;
    vec2 g = vec2(k1 + k3 * u.y, k2 + k3 * u.x) * du;
    return vec3(v, g);
}

// Three octaves, derivatives carried by the chain rule: each octave's gradient
// picks up its own frequency factor as well as its amplitude. Five was tried
// and the top two only put jitter at the scale of the line width itself, which
// is not what a contour map looks like.
vec3 fbmD(vec2 p) {
    vec3 sum = vec3(0.0);
    float amp = 0.5;
    float freq = 1.0;
    for (int i = 0; i < 3; i++) {
        vec3 n = vnoiseD(p * freq + float(i) * 17.3);
        sum.x += amp * n.x;
        sum.yz += amp * freq * n.yz;
        freq *= 2.07;
        amp *= 0.5;
    }
    return sum;
}

void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    float aspect = uRes.x / uRes.y;

    // World space: the frame is 1 tall and aspect wide, so one world unit is
    // uRes.y device pixels no matter the shape of the host.
    vec2 p = vec2(uv.x * aspect, uv.y);
    float px = 1.0 / uRes.y;

    // ---- the field, and its gradient in WORLD units ----
    //
    // A RAMP warped by noise, not raw noise. Raw fbm contours are closed blobs
    // all the way down; the long, near-parallel, meandering lines this is after
    // come from a linear ramp (|grad| = 1 exactly, in the Angle direction) that
    // the noise bends. Warp is the ratio of the bend's gradient to the ramp's,
    // so 0 gives dead-straight parallel rules and 100 gives it a hard meander.
    vec3 nf = fbmD(p * uScale + vec2(uDrift, uDrift * 0.6));
    float f = dot(p, uDir) + (nf.x - 0.5) * uWarpAmt;
    vec2 gradF = uDir + nf.yz * uScale * uWarpAmt;

    // Pointer hill. It does NOT just add to the terrain: it FLATTENS what it
    // rises through, weighted by the same bell. Adding alone was measured to do
    // nothing useful — the field's own gradient runs about 1.5 at the shipped
    // Scale against the dome's 0.67, so the noise wins everywhere and no closed
    // contour ever forms. Suppressing the terrain under the bell lets the dome
    // own its neighbourhood, which is what makes the rings concentric.
    //
    //   w = 1 / (1 + (d/R)^2)
    //   f = terrain * (1 - w) + amp * w
    //
    float R = max(uReach, 1e-4);
    vec2 rv = p - uFocus;
    float d = length(rv);
    vec2 u = d > 1e-6 ? rv / d : vec2(0.0);
    float x = d / R;

    // A CONE, not a bell. A bell has zero slope at its own peak, so its rings
    // bunch toward the rim and its gradient goes tangential on the circle where
    // terrain happens to equal the amplitude — measured 90 degrees off radial,
    // and a Rings of 12 producing about 5. A cone has CONSTANT slope amp/R, so
    // inside the disc the gradient is exactly -amp/R radially, the contours are
    // exact circles, they are evenly spaced R/rings apart, and the count from
    // centre to rim is amp*levels = Rings exactly.
    // Based on the RAMP's own value at the pointer, not on zero. The ramp is
    // unbounded, so a zero-based cone left a step of order dot(focus, dir) at
    // its rim, and the transition band squeezed a dozen contours into a collar
    // — clearly visible as fur around the crater. Only the warp's contribution
    // is left to absorb, which is bounded and small.
    float base = dot(uFocus, uDir);
    float dome = base + uAmp * max(0.0, 1.0 - x);
    float dDome = x < 1.0 ? -uAmp / R : 0.0;

    // Terrain is fully replaced inside the disc, then handed back over a band
    // one whole radius wide. That band is the cone's foot and carries whatever
    // level change is left between its rim and the terrain.
    //
    // uHover gates the REPLACEMENT, not only the amplitude. Fading uAmp alone
    // left k at 1 inside the disc, so on pointer-leave the terrain there was
    // still replaced -- by a cone of zero height, i.e. the constant dot(uFocus, uDir).
    // A constant field has no gradient and therefore no contour lines: a dead
    // flat crater stayed parked wherever the pointer exited. Measured at
    // uAmp = 0: luminance sd 0.49 inside the disc against 59.1 outside.
    // With the weight gated, uHover = 0 gives f = terrain exactly.
    //
    // uHover is constant in space, so scaling dK by it stays the exact
    // derivative of the scaled k -- no chain-rule term is lost.
    float st = clamp(x - 1.0, 0.0, 1.0);
    float k = (1.0 - st * st * (3.0 - 2.0 * st)) * uHover;
    float dK = (-(6.0 * st * (1.0 - st)) / R) * uHover;

    float terrain = f;
    f = terrain * (1.0 - k) + dome * k;
    gradF = gradF * (1.0 - k) + (dome - terrain) * dK * u + k * dDome * u;

    float gfLen = max(length(gradF), 1e-5);

    // ---- contour lines ----
    // |fract(f*N + 1/2) - 1/2| / (N |grad f|) is a LENGTH, so the band below is
    // measured in world units and Line Width stays px at every Scale.
    float ff = f * uLevels;
    // Contours sit at HALF-integers of ff, not integers. The cone spans exactly
    // Rings level-widths with both ends landing on integers, so an integer
    // lattice puts a circle on each end and only Rings-1 strictly inside —
    // measured, the control read one low everywhere. Half-integers put exactly
    // Rings circles inside the disc and none on its rim.
    float sf = (fract(ff) - 0.5) / (uLevels * gfLen);         // signed, world
    float df = abs(sf);

    float line = 1.0 - smoothstep(uHalfWidth - px * 0.7, uHalfWidth + px * 0.7, df);
    float bleed = exp(-df / max(uHalfWidth * 5.0, px));

    // Nyquist guard. Contour spacing is 1 / (levels · |grad f|) — a length, for
    // free, from the same gradient. Where the field steepens enough that the
    // lines pack tighter than about twice their own width they stop being lines
    // and alias into speckle: measured at Scale 9, the 1st-percentile run length
    // collapsed from 3px to 1px. Fading them out there degrades the panel's top
    // end into a smooth wash instead of into noise. The bleed is deliberately
    // NOT faded, so those regions keep the warm glow the lines were carrying.
    // Thresholds are on spacing/WIDTH: lines stay solid past 1.8x and are gone
    // under 0.9x, where they would be overlapping anyway. A first cut at
    // 1.1x/2.6x was too eager and erased a Line Width of 8 across the whole
    // frame, since the typical spacing at the defaults is only about 26px.
    float spacing = 1.0 / (uLevels * gfLen);
    line *= smoothstep(0.9, 1.8, spacing / max(2.0 * uHalfWidth, px));

    // Ridges read warmer than valleys, which is what stops the field from
    // looking like a flat pattern.
    float tone = clamp(f * 1.6 + 0.5, 0.0, 1.0);
    vec3 ink = mix(uBase, uAccent, tone);

    vec3 col = uBg;
    col += ink * bleed * GLOW;
    col = mix(col, ink, line);

    // ---- embers ----
    if (uSparkLevels > 0.0) {
        vec3 ng = fbmD(p * uScale * 0.71 + vec2(43.7, 11.9));
        vec2 gradG = ng.yz * uScale * 0.71;
        float ggLen = max(length(gradG), 1e-5);

        float gg = ng.x * uSparkLevels - uPhase;
        float sg = (fract(gg + 0.5) - 0.5) / (uSparkLevels * ggLen);

        // Offset to the nearest intersection, rebuilt in world space from the
        // two unit gradient directions. Exact where they are orthogonal.
        vec2 nfDir = gradF / gfLen;
        vec2 ngDir = gradG / ggLen;
        vec2 off = sf * nfDir + sg * ngDir;

        // Stable identity: which f-level meets which g-level. It survives the
        // whole trip, so an ember keeps its size, colour and twinkle.
        vec2 id = vec2(floor(ff), floor(gg + 0.5));
        float r1 = h21(id);
        float r2 = h21(id + 7.31);
        float r3 = h21(id + 19.7);

        // Parallel gradients make the intersection ill-conditioned and it would
        // smear into a streak. Fade on the actual degeneracy. The window is
        // deliberately wide — a first cut at 0.10/0.42 still let visible smears
        // through where the two fields ran nearly together.
        float cross = abs(nfDir.x * ngDir.y - nfDir.y * ngDir.x);
        float cond = smoothstep(0.26, 0.62, cross);

        float twinkle = 0.55 + 0.45 * sin(uTime * (1.7 + 2.6 * r2) + r3 * 6.283);
        // Most embers are a pixel or two. The big ones are rare on purpose —
        // r1^3 puts only the top few percent above 2px, and only those get a
        // flare, which is what keeps the field reading as sparks on a line
        // rather than as molten rope.
        float size = px * (0.75 + 2.2 * r1 * r1 * r1) * (0.7 + 0.6 * twinkle);

        float rr = dot(off, off) / max(size * size, 1e-12);
        float core = exp(-rr);
        // Star flare, screen-aligned, only on the ones already big.
        float flare = exp(-abs(off.x) / (size * 7.0) - (off.y * off.y) / (size * size * 0.06))
                    + exp(-abs(off.y) / (size * 7.0) - (off.x * off.x) / (size * size * 0.06));

        vec3 emberCol = mix(uAccent, vec3(1.0), r2 * 0.85);
        float flareGate = smoothstep(0.72, 0.95, r1);
        col += emberCol * (core + flare * 0.45 * flareGate) * cond * (0.30 + 0.75 * twinkle);
    }

    col += (h21(gl_FragCoord.xy) - 0.5) * (1.5 / 255.0);

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
        console.error("ContourEmbers shader:", gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
    }
    return shader
}

/* ------------------------------------------------------------- component --- */

export default function ContourEmbers(props: Props) {
    const {
        background = "#140603",
        baseColor = "#CD5A21",
        accentColor = "#FFD86B",
        density = 30,
        scale = 3,
        warp = 45,
        angle = 35,
        lineWidth = 2,
        sparks = 100,
        speed = 100,
        rings = 6,
        reach = 15,
        style,
    } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Re-pointed on every render, so the loop reads the current props without
    // the effect depending on them and tearing the context down.
    const propsRef = useRef(props)
    propsRef.current = props

    const pointerRef = useRef({ rawX: 0.5, rawY: 0.5, on: 0, onTarget: 0 })

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return

        const gl = canvas.getContext("webgl", {
            antialias: false,
            alpha: false,
            depth: false,
            preserveDrawingBuffer: false,
        })
        if (!gl) {
            console.error("ContourEmbers: WebGL unavailable")
            return
        }

        const vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC)
        const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC)
        if (!vs || !fs) return

        const program = gl.createProgram()
        if (!program) return
        gl.attachShader(program, vs)
        gl.attachShader(program, fs)
        gl.linkProgram(program)
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("ContourEmbers link:", gl.getProgramInfoLog(program))
            return
        }
        gl.useProgram(program)

        const buffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        const posLoc = gl.getAttribLocation(program, "aPos")
        gl.enableVertexAttribArray(posLoc)
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

        const loc = (name: string) => gl.getUniformLocation(program, name)
        const uRes = loc("uRes")
        const uTime = loc("uTime")
        const uDpr = loc("uDpr")
        const uBg = loc("uBg")
        const uBase = loc("uBase")
        const uAccent = loc("uAccent")
        const uFocus = loc("uFocus")
        const uLevels = loc("uLevels")
        const uScale = loc("uScale")
        const uDir = loc("uDir")
        const uWarpAmt = loc("uWarpAmt")
        const uHalfWidth = loc("uHalfWidth")
        const uSparkLevels = loc("uSparkLevels")
        const uPhase = loc("uPhase")
        const uDrift = loc("uDrift")
        const uAmp = loc("uAmp")
        const uReach = loc("uReach")
        const uHover = loc("uHover")

        // offsetWidth/offsetHeight rather than getBoundingClientRect: the rect
        // carries the canvas zoom, so the buffer would drift on a zoomed canvas.
        // Framer's width/height props are not numeric in preview either.
        let cssWidth = root.offsetWidth || 1
        let cssHeight = root.offsetHeight || 1
        const resizeObserver = new ResizeObserver(() => {
            cssWidth = root.offsetWidth || 1
            cssHeight = root.offsetHeight || 1
        })
        resizeObserver.observe(root)

        const reduceMotion =
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches

        let raf = 0
        let last = performance.now()
        let clock = 0

        const render = (now: number) => {
            raf = requestAnimationFrame(render)

            const dt = Math.min(0.05, (now - last) / 1000)
            last = now

            const p = propsRef.current
            const rate = reduceMotion ? 0 : clamp(num(p.speed, 100), 0, 100) / 50
            // Wrapped on the CPU: an unbounded accumulator eventually costs
            // float32 precision inside the shader's fract() calls.
            clock = (clock + dt * rate) % 3600

            const pointer = pointerRef.current
            pointer.on += (pointer.onTarget - pointer.on) * (1 - Math.exp(-HOVER_RATE * dt))

            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            const bufferWidth = Math.max(1, Math.round(cssWidth * dpr))
            const bufferHeight = Math.max(1, Math.round(cssHeight * dpr))
            if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
                canvas.width = bufferWidth
                canvas.height = bufferHeight
                gl.viewport(0, 0, bufferWidth, bufferHeight)
            }
            const aspect = bufferWidth / bufferHeight

            // Density is LINES ACROSS THE FRAME HEIGHT. It used to be levels per
            // unit of field, which is not something a designer can see: the line
            // count then rode on |grad f| and therefore on Scale, and the
            // shipped default worked out to about 176 lines rather than the ~30
            // it looked like. Dividing by the field's mean gradient makes the
            // two controls independent — Scale changes the shape, Density
            // changes the count.
            const lines = Math.round(clamp(num(p.density, 30), 4, 60))
            const scale = clamp(num(p.scale, 3), 1, 20)
            // Warp is stated as a RATIO of the bend's gradient to the ramp's, so
            // it means the same thing at every Scale: the amplitude that gives
            // that ratio is warpRatio / (meanGradient * scale).
            const warpRatio = (clamp(num(p.warp, 45), 0, 100) / 100) * 1.5
            const warpAmt = warpRatio / (MEAN_GRADIENT * scale)
            // The ramp contributes exactly 1 and the warp warpRatio, in
            // quadrature, so Density stays lines across the frame height.
            const meanGrad = Math.sqrt(1 + warpRatio * warpRatio)
            const levels = lines / meanGrad
            const angle = (clamp(num(p.angle, 35), 0, 360) * Math.PI) / 180
            const rings = Math.round(clamp(num(p.rings, 6), 0, 12))

            gl.uniform2f(uRes, bufferWidth, bufferHeight)
            gl.uniform1f(uTime, clock)
            gl.uniform1f(uDpr, dpr)

            const bg = parseColor(p.background, [0.078, 0.024, 0.012])
            const base = parseColor(p.baseColor, [0.804, 0.353, 0.129])
            const accent = parseColor(p.accentColor, [1.0, 0.847, 0.42])
            gl.uniform3f(uBg, bg[0], bg[1], bg[2])
            gl.uniform3f(uBase, base[0], base[1], base[2])
            gl.uniform3f(uAccent, accent[0], accent[1], accent[2])

            // Pointer y arrives top-down; gl_FragCoord is bottom-up.
            gl.uniform2f(uFocus, pointer.rawX * aspect, 1 - pointer.rawY)
            gl.uniform1f(uLevels, levels)
            gl.uniform1f(uScale, scale)
            gl.uniform2f(uDir, Math.cos(angle), Math.sin(angle))
            gl.uniform1f(uWarpAmt, warpAmt)
            gl.uniform1f(uHalfWidth, (clamp(num(p.lineWidth, 2), 1, 8) * 0.5 * dpr) / bufferHeight)
            // Sparks 0 turns the whole branch off rather than dimming it.
            const sparks = clamp(num(p.sparks, 100), 0, 100)
            gl.uniform1f(uSparkLevels, sparks === 0 ? 0 : 8 + (sparks / 100) * 52)
            gl.uniform1f(uPhase, clock * EMBER_RATE)
            gl.uniform1f(uDrift, clock * DRIFT_RATE)
            // Amplitude in contour levels: the dome's peak stands `rings`
            // levels above the flattened ground under it.
            // Full height -- the fade is the crossfade in uHover, so the hill
            // blends in and out of the terrain instead of collapsing to a
            // flat plate that never goes away.
            gl.uniform1f(uAmp, rings / levels)
            gl.uniform1f(uReach, clamp(num(p.reach, 15), 5, 100) / 100)
            gl.uniform1f(uHover, Math.min(1, Math.max(0, pointer.on)))

            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }

        const readPointer = (event: PointerEvent) => {
            // The rect is only used to turn a viewport coordinate into a
            // fraction of the host, which is scale-invariant.
            const rect = root.getBoundingClientRect()
            if (rect.width <= 0 || rect.height <= 0) return
            const pointer = pointerRef.current
            pointer.rawX = clamp((event.clientX - rect.left) / rect.width, 0, 1)
            pointer.rawY = clamp((event.clientY - rect.top) / rect.height, 0, 1)
        }

        const onMove = (event: PointerEvent) => {
            readPointer(event)
            pointerRef.current.onTarget = 1
        }
        const onLeave = () => {
            pointerRef.current.onTarget = 0
        }

        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerenter", onMove)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointercancel", onLeave)
        // A pointer that leaves through an overlay never fires the host's own
        // leave, so the window gets a say too.
        window.addEventListener("blur", onLeave)

        raf = requestAnimationFrame(render)

        return () => {
            cancelAnimationFrame(raf)
            resizeObserver.disconnect()
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerenter", onMove)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointercancel", onLeave)
            window.removeEventListener("blur", onLeave)
            gl.deleteBuffer(buffer)
            gl.deleteProgram(program)
            gl.deleteShader(vs)
            gl.deleteShader(fs)
            // No loseContext(): getContext hands back the same context per
            // canvas, so a StrictMode remount would reuse a force-lost one and
            // render black forever after.
        }
    }, [])

    return (
        <div
            ref={rootRef}
            style={{
                // Floor before the spread, so an explicit size on the instance
                // still wins. A percentage root collapses to 0x0 under Fit
                // Content, and the canvas is absolutely positioned, so there is
                // no in-flow content to hold the box open.
                minWidth: 1200,
                minHeight: 800,
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                isolation: "isolate",
                background,
                touchAction: "none",
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
