"use client"

import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"

/**
 * HexComb — a honeycomb that extrudes toward the viewer under the pointer.
 *
 * One fragment shader, one full-screen triangle, a raw rAF loop. Every cell is
 * a real prism: the height field is evaluated per cell and the prisms are
 * composited back to front INSIDE the shader, so a raised cell's walls occlude
 * its neighbours instead of being faked with a shadow.
 *
 *   - The lattice is the Voronoi diagram of a triangular point set with spacing
 *     2, which is exactly a pointy-top hexagon of apothem 1. Finding the cell
 *     that owns a pixel is two candidate roundings and a nearer-of-the-two.
 *     Verified over 200k samples that the nearest centre always contains the
 *     point.
 *   - Extrusion is oblique, not perspective: the top face is the base hex
 *     translated by `h * E` for a fixed screen-space E. The silhouette is then
 *     the convex hull of a hexagon and its own translate, and the hull of a
 *     convex body with a translate of itself is the union of the translates
 *     along the way — so it is exactly the six hex half-planes with each
 *     support pushed out by `max(0, n·hE)`, PLUS the two half-planes
 *     perpendicular to E that cap the sweep. Those last two are what a naive
 *     six-normal version misses, and without them the silhouette bulges past
 *     the prism. Checked against a brute-force union of 400 translates: 5
 *     disagreements in 200k samples, all of them points on the boundary.
 *   - The visible walls fall out for free. An edge whose outward normal points
 *     along E has its hull constraint set by the top face, so no wall region
 *     exists there; only the edges facing the viewer produce one.
 *   - The neighbourhood loop is bounded by measurement, not by guess. With the
 *     height capped at 2 apothems the set of cells whose prism can cover a
 *     given pixel is di ∈ [-1, 0], dj ∈ [-2, 1]; the loop runs one row and one
 *     column wider than that and rejects on a circle first, so away from the
 *     pointer roughly one cell per pixel survives. Both height dials are capped
 *     so their sum can never leave that window.
 *
 * Canvas vs preview: raw rAF ticks on the Framer canvas, so Swell animates
 * there. Hover needs a real pointer, so Lift and Reach are only observable in
 * preview — Swell is what keeps the component from rendering one frame and
 * sitting still on the canvas.
 *
 * There is deliberately no IntersectionObserver visibility gate in here: the
 * canvas suspends it, and a gated loop would then never start.
 */

/* ---------------------------------------------------------------- types --- */

interface Finish {
    grain?: number
    vignette?: number
}

interface Props {
    background?: string
    baseColor?: string
    accentColor?: string
    density?: number
    gap?: number
    lift?: number
    reach?: number
    swell?: number
    speed?: number
    finish?: Finish
    style?: CSSProperties
}

/** Typed, or every field the literal omits is an error at the read site. */
const DEFAULT_FINISH: Required<Finish> = {
    grain: 3,
    vignette: 36,
}

/* ------------------------------------------------------------- constants --- */

/**
 * Support of a unit-apothem hexagon along perp(E) — the half-width of the two
 * caps that close the swept prism. Constant because E is: 2/sqrt(3) times the
 * cosine of the 5.17 degrees between perp(E) and the nearest vertex.
 */
const PERP_SUPPORT = 1.15001227

/** Row pitch of the lattice, in apothems. */
const ROW_PITCH = 1.7320508

/**
 * Both height dials are capped so their sum can never exceed the 2 apothems the
 * neighbourhood loop was measured against.
 */
const MAX_LIFT = 1.5
const MAX_SWELL = 0.5

/** Quality tier, not a design control (rule 10) — picked, not exposed. */
const MAX_DPR = 2

/** Pointer easing rates, per second. */
const HOVER_RATE = 5
const POSITION_RATE = 9

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

/**
 * `highp` is requested explicitly. This shader divides by a per-cell height
 * that approaches zero, and a mobile GPU silently downgrades an unqualified
 * float.
 */
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
uniform float uScale;       // world units across the frame HEIGHT (apothem = 1)
uniform float uApothem;     // cell apothem after the gap is taken out
uniform float uPerp;        // hex support along perp(E), for the sweep caps
uniform float uLift;        // pointer lift, world units
uniform float uSwell;       // idle lift, world units
uniform float uReach;       // pointer falloff radius, world units
uniform vec2  uPointer;     // world units
uniform float uPointerAmt;
uniform float uGrain;
uniform float uVignette;

// Oblique extrusion direction. Unit to within 2e-5, so it is used as-is.
const vec2  E    = vec2(0.4200, 0.9075);
const vec2  PP   = vec2(-0.9075, 0.4200);   // perp(E)
const vec2  L    = vec2(-0.5548, 0.8320);   // light, upper left
const vec2  N0   = vec2(1.0, 0.0);
const vec2  N1   = vec2(0.5, 0.8660254);
const vec2  N2   = vec2(-0.5, 0.8660254);
const float ROW  = 1.7320508;               // row pitch = sqrt(3) apothems
const float CIRC = 1.1547005;               // circumradius at apothem 1

float h21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// One CSS pixel of grain, so the film stays the same physical size at DPR 2
// instead of halving. Stepped at 24Hz: per-frame noise reads as sparkle.
float filmGrain(vec2 fragCoord, float t, float dpr) {
    vec2 cell = floor(fragCoord / max(dpr, 1.0));
    return h21(cell + floor(t * 24.0) * 13.7) - 0.5;
}

// Radial darkening, aspect-corrected so it stays circular on a wide hero.
float vignetteMask(vec2 uv, float aspect, float amount) {
    vec2 v = uv - 0.5;
    v.x *= aspect;
    return 1.0 - amount * smoothstep(0.34, 1.0, length(v));
}

// Hexagon as the intersection of three slabs. Exact inside, and outside it
// under-reads only near a vertex, which is below one pixel of feather here.
float hexD(vec2 q, float a) {
    return max(max(abs(dot(q, N0)), abs(dot(q, N1))), abs(dot(q, N2))) - a;
}

// Silhouette of the prism: the hexagon's own six half-planes with their
// supports pushed out along +hE, plus the two caps perpendicular to E.
float hullD(vec2 q, float a, float h) {
    vec3 d = vec3(dot(N0, E), dot(N1, E), dot(N2, E)) * h;
    vec3 s = vec3(dot(q, N0), dot(q, N1), dot(q, N2));
    float m = abs(dot(q, PP)) - uPerp * a;
    m = max(m, max( s.x - a - max(0.0,  d.x), -s.x - a - max(0.0, -d.x)));
    m = max(m, max( s.y - a - max(0.0,  d.y), -s.y - a - max(0.0, -d.y)));
    m = max(m, max( s.z - a - max(0.0,  d.z), -s.z - a - max(0.0, -d.z)));
    return m;
}

float cellHeight(vec2 c) {
    float d = length(c - uPointer) / max(uReach, 0.001);
    float bump = exp(-d * d * 2.2);
    // Per-cell phase, or the swell reads as one flat sheet rocking.
    float w = 0.5 + 0.5 * sin(dot(c, vec2(0.21, 0.13)) + h21(c * 0.37) * 6.283 - uTime * 0.8);
    return uLift * uPointerAmt * bump + uSwell * w;
}

void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    float aspect = uRes.x / uRes.y;
    vec2 p = vec2(uv.x * aspect, uv.y) * uScale;

    float unitPx = uRes.y / uScale;          // device px per apothem
    float aa = 1.4 / unitPx;
    float a = uApothem;
    float ceiling = max(uLift + uSwell, 0.001);

    vec3 col = uBg;

    float j0 = floor(p.y / ROW + 0.5);

    // Back to front: a larger row index is further up the frame and therefore
    // further away, and within a row the extrusion leans +x so the right-hand
    // neighbour is in front.
    for (int dj = 1; dj >= -3; dj--) {
        float fj = j0 + float(dj);
        float par = mod(fj, 2.0);
        float cy = fj * ROW;
        float i0 = floor((p.x - par) * 0.5 + 0.5);

        for (int di = -1; di <= 1; di++) {
            vec2 c = vec2((i0 + float(di)) * 2.0 + par, cy);
            vec2 q = p - c;
            float h = cellHeight(c);

            float bound = CIRC + h + 0.42;   // + the shadow band
            if (dot(q, q) > bound * bound) continue;

            // Contact shadow, sampled up-right so it falls down-left onto the
            // cells already drawn. Applied before this cell paints itself.
            if (h > 0.02) {
                float ds = hullD(q + vec2(0.11, 0.17), a, h);
                float sh = 1.0 - smoothstep(-0.02, 0.36, ds);
                col *= 1.0 - 0.55 * sh * clamp(h * 1.7, 0.0, 1.0);
            }

            float dh = hullD(q, a, h);
            float cov = 1.0 - smoothstep(-aa, aa, dh);
            if (cov <= 0.0) continue;

            float dt = hexD(q - h * E, a);
            float top = 1.0 - smoothstep(-aa, aa, dt);
            float wall = clamp(cov - top, 0.0, 1.0);
            float hn = clamp(h / ceiling, 0.0, 1.0);

            if (wall > 0.0) {
                // Which of the six edges this wall belongs to is the largest
                // signed slab coordinate — the facing edge, by definition.
                vec3 s = vec3(dot(q, N0), dot(q, N1), dot(q, N2));
                vec2 wn = N0 * sign(s.x);
                float best = abs(s.x);
                if (abs(s.y) > best) { best = abs(s.y); wn = N1 * sign(s.y); }
                if (abs(s.z) > best) { best = abs(s.z); wn = N2 * sign(s.z); }

                float lam = clamp(dot(wn, L) * 0.5 + 0.5, 0.0, 1.0);
                // 0 at the lip, 1 down at the floor.
                float depth = clamp(dot(q - h * E, -E) / max(h, 0.001), 0.0, 1.0);
                vec3 wallCol = mix(uBg, uBase, 0.12 + 0.74 * lam) * (1.0 - 0.62 * depth);
                col = mix(col, wallCol, wall);
            }

            if (top > 0.0) {
                vec2 qt = (q - h * E) / max(a, 0.001);
                vec3 rest = mix(uBg, uBase, 0.20);
                // Narrow crossover: a linear ramp from a blue to a yellow spends
                // most of its length in the grey between them, and the ring of
                // half-risen cells then reads as dirt rather than as a gradient.
                vec3 risen = mix(uBase * 1.25, uAccent, smoothstep(0.58, 1.0, hn));
                vec3 topCol = mix(rest, risen, smoothstep(0.0, 0.45, hn));
                topCol *= 0.86 + 0.16 * dot(qt, L);

                // The lip. Drawn at every height, so the comb still reads as a
                // comb with nothing lifted.
                float rim = smoothstep(-aa * 3.5, -aa * 1.0, dt) *
                            (1.0 - smoothstep(-aa * 1.0, aa, dt));
                topCol += rim * mix(uBase, uAccent, hn) * (0.30 + 0.75 * hn);

                col = mix(col, topCol, top);
            }
        }
    }

    col *= vignetteMask(uv, aspect, uVignette);
    col += (h21(gl_FragCoord.xy) - 0.5) * (1.5 / 255.0);
    col += filmGrain(gl_FragCoord.xy, uTime, uDpr) * uGrain;

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
        console.error("HexComb shader:", gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
    }
    return shader
}

/* ------------------------------------------------------------- component --- */

export default function HexComb(props: Props) {
    const {
        background = "#080A10",
        baseColor = "#FFCA00",
        accentColor = "#FFFFFF",
        density = 24,
        gap = 10,
        lift = 100,
        reach = 9,
        swell = 100,
        speed = 100,
        finish,
        style,
    } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Re-pointed on every render, so the loop reads the current props without
    // the effect depending on them and tearing the context down.
    const propsRef = useRef(props)
    propsRef.current = props

    const pointerRef = useRef({ x: 0.5, y: 0.5, rawX: 0.5, rawY: 0.5, on: 0, onTarget: 0 })

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
            console.error("HexComb: WebGL unavailable")
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
            console.error("HexComb link:", gl.getProgramInfoLog(program))
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
        const uScale = loc("uScale")
        const uApothem = loc("uApothem")
        const uPerp = loc("uPerp")
        const uLift = loc("uLift")
        const uSwell = loc("uSwell")
        const uReach = loc("uReach")
        const uPointer = loc("uPointer")
        const uPointerAmt = loc("uPointerAmt")
        const uGrain = loc("uGrain")
        const uVignette = loc("uVignette")

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
            const finishNow: Required<Finish> = { ...DEFAULT_FINISH, ...(p.finish ?? {}) }
            const rate = reduceMotion ? 0 : clamp(num(p.speed, 50), 0, 100) / 50
            // Wrapped on the CPU: an unbounded accumulator eventually costs
            // float32 precision inside the shader's fract() and mod() calls.
            clock = (clock + dt * rate) % 3600

            const pointer = pointerRef.current
            const ease = (r: number) => 1 - Math.exp(-r * dt)
            pointer.on += (pointer.onTarget - pointer.on) * ease(HOVER_RATE)
            const targetX = pointer.onTarget > 0 ? pointer.rawX : 0.5
            const targetY = pointer.onTarget > 0 ? pointer.rawY : 0.5
            pointer.x += (targetX - pointer.x) * ease(POSITION_RATE)
            pointer.y += (targetY - pointer.y) * ease(POSITION_RATE)

            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            const bufferWidth = Math.max(1, Math.round(cssWidth * dpr))
            const bufferHeight = Math.max(1, Math.round(cssHeight * dpr))
            if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
                canvas.width = bufferWidth
                canvas.height = bufferHeight
                gl.viewport(0, 0, bufferWidth, bufferHeight)
            }
            const aspect = bufferWidth / bufferHeight

            // One cell is sqrt(3) apothems tall, so N cells across the height is
            // N * sqrt(3) world units of height.
            const scale = clamp(num(p.density, 11), 3, 24) * ROW_PITCH
            const pointerAmount = Math.min(1, pointer.on)
            const liftWorld = (clamp(num(p.lift, 70), 0, 100) / 100) * MAX_LIFT
            const raised = liftWorld * pointerAmount

            gl.uniform2f(uRes, bufferWidth, bufferHeight)
            gl.uniform1f(uTime, clock)
            gl.uniform1f(uDpr, dpr)

            const bg = parseColor(p.background, [0.031, 0.039, 0.063])
            const base = parseColor(p.baseColor, [0.357, 0.486, 1.0])
            const accent = parseColor(p.accentColor, [1.0, 0.808, 0.361])
            gl.uniform3f(uBg, bg[0], bg[1], bg[2])
            gl.uniform3f(uBase, base[0], base[1], base[2])
            gl.uniform3f(uAccent, accent[0], accent[1], accent[2])

            gl.uniform1f(uScale, scale)
            gl.uniform1f(uApothem, 1 - clamp(num(p.gap, 10), 0, 40) / 100)
            gl.uniform1f(uPerp, PERP_SUPPORT)
            gl.uniform1f(uLift, liftWorld)
            gl.uniform1f(uSwell, (clamp(num(p.swell, 14), 0, 100) / 100) * MAX_SWELL)
            gl.uniform1f(uReach, (clamp(num(p.reach, 26), 5, 100) / 100) * scale)
            // Sampled a little back along the extrusion direction, so the cluster
            // of RISEN tops lands under the cursor rather than up and to the
            // right of it — the cells rise obliquely, so the peak of the height
            // field is not where its top face ends up.
            gl.uniform2f(
                uPointer,
                pointer.x * aspect * scale - 0.42 * raised * 0.55,
                (1 - pointer.y) * scale - 0.9075 * raised * 0.55
            )
            gl.uniform1f(uPointerAmt, pointerAmount)
            gl.uniform1f(uGrain, (clamp(num(finishNow.grain, 3), 0, 100) / 100) * 0.09)
            gl.uniform1f(uVignette, clamp(num(finishNow.vignette, 36), 0, 100) / 100)

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
