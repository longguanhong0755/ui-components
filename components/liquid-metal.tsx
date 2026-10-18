"use client"

import { useEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"

/* ------------------------------------------------------------------ *
 *  LiquidMetal
 *  A slowly rotating vortex of liquid metal wrapped around a dark
 *  elliptical void.
 *
 *  VISUAL ARCHITECTURE
 *    void      a diagonal lens. The mask is taken from the field's own
 *              rotated, elongated distance, so the void IS an iso-contour
 *              of the folds rather than a shape pasted over them
 *    flow      folds are born inside the void and expand outward. Because
 *              the distance metric is anisotropic the wavefronts stay
 *              lens-shaped, so it ripples without being circular
 *    luminance nothing is coloured directly. A height field is turned
 *              into a surface normal and *shaded*: the palette is an
 *              environment ramp the normal reflects into, so the folds
 *              catch virtual light and roll highlights as they turn
 *
 *  MOTION - three independent channels, each seamless-looping
 *    Flow      outward travel of the folds; the primary motion
 *    Shimmer   hue rotation of the shaded result, oscillating so it
 *              wanders through adjacent spectrum rather than cycling
 *    Sweep     the light orbits and its intensity travels radially,
 *              so beams appear to rake across the folds
 * ------------------------------------------------------------------ */

/* ----------------------------------------------------------- defaults */

const DEFAULTS = {
    colors: [
        "#050418",
        "#0E1A6B",
        "#1F3AE8",
        "#7A34E8",
        "#D45BF0",
        "#FDE8FA",
    ],
    refraction: 0,
    frost: 0,
    voidSize: 0,
    angle: -85,
    twist: 3.1,
    stretch: 9.3,
    bands: 8.5,
    relief: 10,
    scale: 7.5,
    flow: 10,
    shimmer: 10,
    sweep: 10,
}

const MAX_STOPS = 6

/** Fixed choices, deliberately not exposed as controls. */
const FALLOFF = 1.75 // fold compression toward the frame edge
const SKEW = 0.75 // fold asymmetry; this is what draws the crease seams
const GRAIN = 0.012 // dither, purely to defeat 8-bit banding
const DPR_CAP = 1.75 // this shader is heavy; cap the pixel count
const GLOSS = 10 // specular sharpness/strength, fixed; no longer exposed as a control

/* -------------------------------------------------------------- types */

export interface LiquidMetalProps {
    /** Environment ramp, dark -> bright. Drives the whole material. */
    colors?: string[]
    /** 0-10 chromatic split of the reflection */
    refraction?: number
    /** 0-10 surface roughness: blurs and milks the reflection */
    frost?: number
    /** 0-10 length of the dark lens */
    voidSize?: number
    /** Orientation of the void's long axis, degrees */
    angle?: number
    /** -10..10 swirl strength; this is what bends the folds into sweeps */
    twist?: number
    /** 0-10 axis elongation, 5 = circular (exponential) */
    stretch?: number
    /** 1-20 folds between the void and the frame edge */
    bands?: number
    /** 0-10 fold depth, i.e. how molten the surface looks */
    relief?: number
    /** 0-10 zoom, 5 = neutral (exponential) */
    scale?: number
    /** 0-10 rate the folds travel outward from the void */
    flow?: number
    /** 0-10 hue drift through adjacent spectrum */
    shimmer?: number
    /** 0-10 orbiting light and travelling beam intensity */
    sweep?: number
    style?: CSSProperties
}

/* ------------------------------------------------------------- shaders */

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
}
`

const FRAG = `
#define MAX_STOPS ${MAX_STOPS}
#define TAPS 5
#define FALLOFF ${FALLOFF}
#define SKEW ${SKEW}
#define GRAIN ${GRAIN}

varying vec2 vUv;

uniform float uTime;
uniform float uAspect;
uniform vec3  uColors[MAX_STOPS];
uniform int   uCount;
uniform float uScale;
uniform float uAngle;
uniform float uPhase;
uniform float uTwist;
uniform float uStretch;
uniform float uFreq;
uniform float uRelief;
uniform float uVoid;
uniform float uVoidFade;
uniform float uGloss;
uniform float uRefract;
uniform float uFrost;
uniform float uHue;
uniform float uSweep;
uniform float uSweepPhase;

mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

/* ---------------------------------------------------------- noise */

float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

/* -------------------------------------------------- environment ramp */

vec3 ramp(float t) {
    float span = float(uCount - 1);
    if (span < 0.5) {
        vec3 c = vec3(0.0);
        for (int k = 0; k < MAX_STOPS; k++) { if (k == 0) c = uColors[k]; }
        return c;
    }
    float u = min(clamp(t, 0.0, 1.0) * span, span - 1e-4);
    float i = floor(u);
    float fr = u - i;
    fr = fr * fr * (3.0 - 2.0 * fr);
    vec3 a = vec3(0.0), b = vec3(0.0);
    for (int k = 0; k < MAX_STOPS; k++) {
        if (float(k) == i)       a = uColors[k];
        if (float(k) == i + 1.0) b = uColors[k];
    }
    return mix(a, b, fr);
}

// Reflected direction -> position along the ramp.
//
// A purely directional sky (the first term) shades one flank of the lens
// bright and the opposite flank dark, because their normals face opposite
// ways. The reference has the full navy-blue-magenta-white sequence on
// BOTH flanks, so an isotropic "how tilted is this" term is blended in.
// Too much of it and the deep navy washes out, hence the modest 0.35.
float envT(vec2 dir) {
    float directional = 0.5 + 0.5 * (dir.y * 1.3 + dir.x * 0.45);
    float isotropic = clamp(length(dir) * 1.4, 0.0, 1.0);
    return clamp(mix(directional, isotropic, 0.35), 0.0, 1.0);
}

// one env lookup per channel at slightly different spreads
vec3 chroma(vec2 dir, float disp) {
    return vec3(
        ramp(envT(dir * (1.0 + disp))).r,
        ramp(envT(dir)).g,
        ramp(envT(dir * (1.0 - disp))).b
    );
}

/* --------------------------------------------------- the height field *
 *  Returns (height, warped distance). The distance is reused for the
 *  void mask and the travelling beam, so it is handed back rather than
 *  recomputed.                                                          */

// Folds are not symmetric ridges. Each has a broad lit face and a sharp
// crease, and skewing the sine compresses one flank; the fast normal swing
// across that flank is what draws the hairline seam between folds.
float fold(float f) {
    return sin(f + SKEW * sin(f));
}

vec2 fieldAt(vec2 p) {
    // orient the lens, then elongate along that rotated frame: this is the
    // whole reason the void ends up diagonal
    p = rot(uAngle) * p;

    // twist grows with radius, so the folds curve around the lens instead
    // of running straight
    float r = length(p);
    p = rot(uTwist * r) * p;

    // The twist is invisible without anisotropy, and the anisotropy is also
    // what keeps the expanding wavefronts lens-shaped instead of circular.
    p.x *= uStretch;

    float d = length(p);
    // subtracting the phase puts a given fold at ever-larger d, i.e. it
    // travels outward from inside the void
    float h = fold(pow(max(d, 1e-4), FALLOFF) * uFreq - uPhase) * uRelief;
    return vec2(h, d);
}

/* ------------------------------------------------------------- colour */

// Rodrigues rotation about the (1,1,1) axis: a cheap hue shift.
vec3 hueShift(vec3 c, float a) {
    vec3 k = vec3(0.57735);
    float ca = cos(a);
    return c * ca + cross(k, c) * sin(a) + k * dot(k, c) * (1.0 - ca);
}

void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    uv.x *= uAspect;
    vec2 p = uv / max(uScale, 0.01);

    // finite-difference normal
    float e = 0.0035 / max(uScale, 0.01);
    vec2 f0 = fieldAt(p);
    float hx = fieldAt(p + vec2(e, 0.0)).x;
    float hy = fieldAt(p + vec2(0.0, e)).x;
    float d = f0.y;
    vec3 n = normalize(vec3(-(hx - f0.x) / e, -(hy - f0.x) / e, 1.0));

    // frost roughens the surface before anything is shaded
    if (uFrost > 0.001) {
        vec2 j = vec2(vnoise(p * 6.0), vnoise(p * 6.0 + 7.3)) - 0.5;
        n = normalize(n + vec3(j * uFrost * 0.25, 0.0));
    }

    vec3 v = vec3(0.0, 0.0, 1.0);
    vec3 r = reflect(-v, n);

    // Blurred, chromatically split environment reflection. The extra taps
    // only cost anything when frost is actually on.
    vec3 col = chroma(r.xy, uRefract);
    if (uFrost > 0.001) {
        for (int t = 1; t < TAPS; t++) {
            float a = float(t) * 2.399963;
            vec2 off = vec2(cos(a), sin(a)) * uFrost * 0.5;
            col += chroma(r.xy + off, uRefract);
        }
        col /= float(TAPS);
    }

    // Sweep: the light orbits, and a broad gain travels radially so beams
    // rake across the folds. At sweep 0 the phase is frozen and this is a
    // plain fixed key light at 135 degrees.
    float la = 2.35619 + uSweepPhase;
    vec3 l = normalize(vec3(cos(la), sin(la), 0.65));
    vec3 hv = normalize(l + v);
    float shine = mix(6.0, 200.0, uGloss) * (1.0 - 0.70 * uFrost);
    float spec = pow(max(dot(n, hv), 0.0), max(shine, 2.0));
    float beam = 1.0 + uSweep * 0.9 * sin(uSweepPhase * 1.3 + d * 3.0);
    col += spec * uGloss * 0.55 * max(beam, 0.0);

    // fresnel rim lights the steep wall of every fold
    float fres = pow(1.0 - clamp(n.z, 0.0, 1.0), 3.0);
    col += fres * uGloss * 0.15 * ramp(1.0);

    // frost lifts the blacks and flattens contrast: milky, not mirrored
    col = mix(col, col * 0.72 + 0.16, uFrost * 0.30);

    // Shimmer, applied to the shaded result so highlights drift in hue too
    if (abs(uHue) > 0.001) col = hueShift(col, uHue);

    // The void is an iso-contour of the very field that makes the folds,
    // so it is automatically the same diagonal lens they wrap around.
    col *= smoothstep(uVoid, uVoid + uVoidFade, d);

    col += (hash21(gl_FragCoord.xy + fract(uTime) * 137.0) - 0.5) * GRAIN;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

/* ------------------------------------------------------------- helpers */

let parseCtx: CanvasRenderingContext2D | null | undefined

/** CSS colour string -> normalised rgb triple. */
function toRGB(css: string): [number, number, number] {
    if (!css) return [0, 0, 0]
    const s = css.trim()

    const hex = /^#([0-9a-f]{3,8})$/i.exec(s)
    if (hex) {
        let h = hex[1]
        if (h.length === 3 || h.length === 4) {
            h = h
                .split("")
                .map((c) => c + c)
                .join("")
        }
        const n = parseInt(h.slice(0, 6), 16)
        return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
    }

    const fn = /^rgba?\(([^)]+)\)$/i.exec(s)
    if (fn) {
        const parts = fn[1].split(/[\s,/]+/).filter(Boolean).slice(0, 3)
        const v = parts.map((x) =>
            x.indexOf("%") >= 0 ? parseFloat(x) * 2.55 : parseFloat(x)
        )
        return [(v[0] || 0) / 255, (v[1] || 0) / 255, (v[2] || 0) / 255]
    }

    // named colours, hsl(), oklch() ... let the browser resolve it
    if (typeof document !== "undefined") {
        if (parseCtx === undefined) {
            parseCtx = document.createElement("canvas").getContext("2d")
        }
        if (parseCtx) {
            parseCtx.fillStyle = "#000000"
            parseCtx.fillStyle = s
            const out = parseCtx.fillStyle
            if (typeof out === "string" && out.charAt(0) === "#" && out !== s) {
                return toRGB(out)
            }
        }
    }
    return [0, 0, 0]
}

function compile(
    gl: WebGLRenderingContext,
    type: number,
    src: string
): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        gl.deleteShader(sh)
        return null
    }
    return sh
}

/* ----------------------------------------------------------- component */

export default function LiquidMetal({
    colors = ["#050418","#000839","#001281","#6400FF","#D45BF0","#000000"],
    refraction = DEFAULTS.refraction,
    frost = DEFAULTS.frost,
    voidSize = DEFAULTS.voidSize,
    angle = DEFAULTS.angle,
    twist = DEFAULTS.twist,
    stretch = DEFAULTS.stretch,
    bands = DEFAULTS.bands,
    relief = DEFAULTS.relief,
    scale = DEFAULTS.scale,
    flow = DEFAULTS.flow,
    shimmer = DEFAULTS.shimmer,
    sweep = DEFAULTS.sweep,
    style,
}: LiquidMetalProps) {
    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [failed, setFailed] = useState(false)

    // Live prop mirror. The render loop reads from here so that tweaking a
    // control never tears down the GL context.
    const propsRef = useRef({
        colors,
        refraction,
        frost,
        voidSize,
        angle,
        twist,
        stretch,
        bands,
        relief,
        scale,
        flow,
        shimmer,
        sweep,
    })
    propsRef.current = {
        colors,
        refraction,
        frost,
        voidSize,
        angle,
        twist,
        stretch,
        bands,
        relief,
        scale,
        flow,
        shimmer,
        sweep,
    }

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return

        let disposed = false
        let raf = 0
        let gl: WebGLRenderingContext | null = null
        let program: WebGLProgram | null = null
        let buffer: WebGLBuffer | null = null
        let uni: Record<string, WebGLUniformLocation | null> = {}

        let onScreen = true
        let pageVisible = true
        let reduceMotion = false

        // One accumulator per motion channel, so changing a rate never
        // snaps the animation.
        let elapsed = 0
        let phase = 0
        let shimmerPhase = 0
        let sweepPhase = 0
        let lastNow = 0

        const colorBuf = new Float32Array(MAX_STOPS * 3)

        /* ------------------------------------------------------ setup */

        function init(): boolean {
            const ctx =
                (canvas.getContext("webgl", {
                    alpha: false,
                    antialias: false,
                    powerPreference: "high-performance",
                }) as WebGLRenderingContext | null) ||
                (canvas.getContext(
                    "experimental-webgl"
                ) as WebGLRenderingContext | null)

            if (!ctx) return false
            gl = ctx

            const hp = gl.getShaderPrecisionFormat(
                gl.FRAGMENT_SHADER,
                gl.HIGH_FLOAT
            )
            const precision = hp && hp.precision > 0 ? "highp" : "mediump"

            const vs = compile(gl, gl.VERTEX_SHADER, VERT)
            const fs = compile(
                gl,
                gl.FRAGMENT_SHADER,
                "precision " + precision + " float;\n" + FRAG
            )
            if (!vs || !fs) return false

            const prog = gl.createProgram()
            if (!prog) return false
            gl.attachShader(prog, vs)
            gl.attachShader(prog, fs)
            gl.bindAttribLocation(prog, 0, "aPos")
            gl.linkProgram(prog)
            gl.deleteShader(vs)
            gl.deleteShader(fs)
            if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false

            program = prog
            gl.useProgram(prog)

            buffer = gl.createBuffer()
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
            gl.bufferData(
                gl.ARRAY_BUFFER,
                new Float32Array([-1, -1, 3, -1, -1, 3]),
                gl.STATIC_DRAW
            )
            gl.enableVertexAttribArray(0)
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

            const names = [
                "uTime",
                "uAspect",
                "uColors[0]",
                "uCount",
                "uScale",
                "uAngle",
                "uPhase",
                "uTwist",
                "uStretch",
                "uFreq",
                "uRelief",
                "uVoid",
                "uVoidFade",
                "uGloss",
                "uRefract",
                "uFrost",
                "uHue",
                "uSweep",
                "uSweepPhase",
            ]
            uni = {}
            for (const n of names) uni[n] = gl.getUniformLocation(prog, n)

            gl.clearColor(0, 0, 0, 1)
            return true
        }

        /* ----------------------------------------------------- resize */

        function resize() {
            if (!gl) return
            const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
            const w = Math.max(1, Math.round(host.clientWidth * dpr))
            const h = Math.max(1, Math.round(host.clientHeight * dpr))
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w
                canvas.height = h
                gl.viewport(0, 0, w, h)
            }
        }

        /* ------------------------------------------------------ frame */

        function draw(dt: number) {
            if (!gl || !program) return
            const p = propsRef.current

            if (!reduceMotion) {
                elapsed += dt
                // flow 5 -> ~0.6/s -> a new fold every ~10s
                phase += dt * p.flow * 0.12
                shimmerPhase += dt * 0.18
                sweepPhase += dt * p.sweep * 0.06
            }

            const list = (
                p.colors && p.colors.length ? p.colors : DEFAULTS.colors
            ).slice(0, MAX_STOPS)
            colorBuf.fill(0)
            for (let i = 0; i < list.length; i++) {
                const c = toRGB(list[i])
                colorBuf[i * 3] = c[0]
                colorBuf[i * 3 + 1] = c[1]
                colorBuf[i * 3 + 2] = c[2]
            }

            // exponential so 5 is neutral and the useful range is reachable
            const zoom = Math.pow(2.4, (p.scale - 5) / 2.5)
            // Calibrated against the *warped* distance, whose range is
            // stretched well past 1. The fade must finish inside the frame
            // or the mask never reaches full brightness anywhere.
            const voidR = p.voidSize * 0.06

            gl.useProgram(program)
            gl.uniform1f(uni["uTime"], elapsed)
            gl.uniform1f(
                uni["uAspect"],
                canvas.width / Math.max(1, canvas.height)
            )
            gl.uniform3fv(uni["uColors[0]"], colorBuf)
            gl.uniform1i(uni["uCount"], Math.max(1, list.length))
            gl.uniform1f(uni["uScale"], zoom)
            gl.uniform1f(uni["uAngle"], (p.angle * Math.PI) / 180)
            gl.uniform1f(uni["uPhase"], phase)
            gl.uniform1f(uni["uTwist"], p.twist * 0.35)
            gl.uniform1f(uni["uStretch"], Math.pow(2.2, (p.stretch - 5) / 2.5))
            gl.uniform1f(uni["uFreq"], p.bands * 0.45)
            gl.uniform1f(uni["uRelief"], p.relief * 0.02)
            gl.uniform1f(uni["uVoid"], voidR)
            gl.uniform1f(uni["uVoidFade"], 0.15 + p.voidSize * 0.04)
            gl.uniform1f(uni["uGloss"], GLOSS / 10)
            gl.uniform1f(uni["uRefract"], p.refraction * 0.022)
            gl.uniform1f(uni["uFrost"], p.frost / 10)
            // oscillate rather than cycle: adjacent spectrum, not a rainbow
            gl.uniform1f(uni["uHue"], Math.sin(shimmerPhase) * p.shimmer * 0.05)
            gl.uniform1f(uni["uSweep"], p.sweep / 10)
            gl.uniform1f(uni["uSweepPhase"], sweepPhase)

            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }

        function loop(now: number) {
            if (disposed) return
            raf = requestAnimationFrame(loop)
            if (!onScreen || !pageVisible) {
                lastNow = now
                return
            }
            const dt = lastNow ? Math.min((now - lastNow) / 1000, 0.05) : 0
            lastNow = now
            resize()
            draw(dt)
        }

        /* --------------------------------------------------- listeners */

        if (!init()) {
            setFailed(true)
            return
        }

        const ro =
            typeof ResizeObserver !== "undefined"
                ? new ResizeObserver(() => resize())
                : null
        if (ro) ro.observe(host)

        const io =
            typeof IntersectionObserver !== "undefined"
                ? new IntersectionObserver(
                      (entries) => {
                          onScreen = entries.some((e) => e.isIntersecting)
                      },
                      { rootMargin: "128px" }
                  )
                : null
        if (io) io.observe(host)

        const onVisibility = () => {
            pageVisible = document.visibilityState !== "hidden"
        }
        document.addEventListener("visibilitychange", onVisibility)

        const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
        reduceMotion = mq.matches
        const onMQ = (e: MediaQueryListEvent) => {
            reduceMotion = e.matches
        }
        if (mq.addEventListener) mq.addEventListener("change", onMQ)
        else mq.addListener(onMQ)

        const onLost = (e: Event) => {
            e.preventDefault()
            cancelAnimationFrame(raf)
        }
        const onRestored = () => {
            if (disposed) return
            lastNow = 0
            if (init()) raf = requestAnimationFrame(loop)
            else setFailed(true)
        }
        canvas.addEventListener("webglcontextlost", onLost)
        canvas.addEventListener("webglcontextrestored", onRestored)

        resize()
        raf = requestAnimationFrame(loop)

        return () => {
            disposed = true
            cancelAnimationFrame(raf)
            if (ro) ro.disconnect()
            if (io) io.disconnect()
            document.removeEventListener("visibilitychange", onVisibility)
            if (mq.removeEventListener) mq.removeEventListener("change", onMQ)
            else mq.removeListener(onMQ)
            canvas.removeEventListener("webglcontextlost", onLost)
            canvas.removeEventListener("webglcontextrestored", onRestored)
            if (gl) {
                if (buffer) gl.deleteBuffer(buffer)
                if (program) gl.deleteProgram(program)
                const lose = gl.getExtension("WEBGL_lose_context")
                if (lose) lose.loseContext()
            }
        }
    }, [])

    // Static approximation for the rare no-WebGL case: dark centre, colour
    // toward the edges, matching the real composition.
    const fallbackStyle: CSSProperties = failed
        ? {
              background:
                  "radial-gradient(ellipse at 50% 50%, #000000, #000000, " +
                  (colors && colors.length ? colors : DEFAULTS.colors)
                      .slice(1)
                      .join(", ") +
                  ")",
          }
        : {}

    return (
        <div
            ref={hostRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background: "#000000",
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
                    ...fallbackStyle,
                }}
            />
        </div>
    )
}
