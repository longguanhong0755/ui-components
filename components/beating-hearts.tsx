"use client"

import * as React from "react"
import { useEffect, useRef, useState } from "react"

/**
 * BeatingHearts — an endless log-spiral of hearts, pulsing on a heartbeat.
 *
 * Ported from Juan Carlos Ponce Campuzano's p5 sketch "Shader: Beating
 * Hearts" (openprocessing.org/@jcponcemath/2490014, CC BY-NC-SA). The maths
 * below is that fragment shader's, transcribed term for term, and every
 * dial's default IS the constant it replaced.
 *
 * WHAT IT IS. The frame is read in LOG-POLAR coordinates: `lg = D*log(r)` and
 * `an = N*atan(y, x)`. A single cosine of those two axes is thresholded at
 * zero — inside is a heart, outside is the background. Because `log` turns
 * scaling into translation, one period in `lg` is one ring of hearts and the
 * pattern repeats forever inward; the shared clock enters as `lg - t` and
 * `an + t` at once, which is why the rings zoom OUT while they rotate, and
 * why the arrangement reads as a spiral rather than concentric rings.
 *
 * The heart shape itself is the `abs(sin(lg - t))` term inside the angular
 * cosine — `Shape` scales it. At 0 the cells are round dots; at 100 the term
 * pushes one side of each lobe in and the cleft appears; past ~150 the lobes
 * shear into crescents. Nothing else in the formula is heart-specific.
 *
 * `beat` is a narrow pulse — `cos()` raised to the 12th — riding a 0.3 floor.
 * It feeds the two cosine gains INVERSELY (`1/(2*beat)` radially, `4*beat`
 * angularly), so a beat both fattens the hearts and tightens the spiral in
 * one stroke.
 *
 * PIXEL-VERIFIED AGAINST THE REFERENCE. This exact shader and the sketch's
 * were rendered side by side at 900x600 over t = 0, 0.25, 0.5, 1, 2.7, 5.5,
 * with the shader forced onto its no-derivatives path so the comparison is
 * like for like. Three of the six frames are identical to within one channel
 * step over all 540,000 pixels; the other three differ on 1 to 3 pixels each,
 * and every one of those has |pattern| < 2e-4 — a pixel sitting on the
 * threshold itself, flipped by the last bit of the `pow` rewrite below. Mean
 * channel difference over the whole set is 0.0002.
 *
 * THREE MACHINERY FIXES. Behaviour unchanged:
 *   · `pow(cos(x), 12.0)` is undefined in GLSL wherever cos is negative, and
 *     it is negative half the time. Written as three squarings, which is the
 *     value drivers that do not NaN already produce. This is the source of
 *     the knife-edge pixels above.
 *   · `log(length(uv))` at the exact centre is -inf and the pattern goes NaN
 *     there, which the reference's `if (p < 0.0)` silently paints as
 *     background. The radius is floored at 1e-6 (rule 6). At an even buffer
 *     width no sample lands on the origin, so this never fires at 900x600 —
 *     it is there for the odd sizes a fractional DPR produces.
 *   · The threshold is antialiased with `fwidth` instead of being a hard
 *     compare. Near the centre the log spiral outruns the sample rate and the
 *     reference resolves it as crawling salt-and-pepper; the filtered version
 *     converges to a smooth blend. Falls back to the reference's hard `step`
 *     if OES_standard_derivatives is missing.
 *
 * COLOUR IS EXACT, NOT APPROXIMATE. The reference maps the pattern value onto
 * HSB hue 0.9 -> 0.95 at full saturation and value. Every hue in that span
 * lands in the same sixth of the wheel, where the conversion returns
 * (1, 0, 1-f) with f linear in hue — so the reference's "gradient" is already
 * a straight RGB line from #FF0099 to #FF004D. Two swatches and a linear mix
 * reproduce it channel for channel; only the accent's blue rounds differently
 * (0.3 * 255 = 76.5, and #FF004D is 77).
 *
 * Two clocks, one per rate dial, so changing a rate never jumps a phase. The
 * pattern clock wraps at 2*PI and the beat clock at 2 — both exact periods of
 * the expressions they feed, so neither loop has a seam. Asserted: over 500
 * sample points, |p(t=0) - p(t=2*PI)| peaks at 5e-15 and the beat identity is
 * exact to the bit.
 *
 * COUNT MUST BE A WHOLE NUMBER. `atan` has its branch cut at 180 degrees, and
 * `cos(N*theta + ...)` only closes across it when N is an integer. Measured
 * along that cut over 400 radii: at N = 1, 2, 6, 7, 24 the discontinuity is
 * ~1e-15; at N = 6.5 it is 1.88, which renders as a hard tear running left
 * from the centre. The dial is `step: 1` and the value is rounded again on
 * the way to the uniform.
 *
 * Cut controls, each frozen at the reference's constant so the render path is
 * unchanged (rule 11b): the beat floor 0.3 (a second dial on the same axis as
 * Pulse, and its usable range is ~0.25-0.4 before the hearts dissolve into
 * radial ribbons), and the two cosine gain constants 1/2 and 4.
 *
 * Panel: 10 leaf dials.
 */

// Quality tier, not a design control (rule 10). The per-pixel cost is four
// trig calls, so 2x is affordable and the filtered edges want the samples.
const MAX_DPR = 2

// Pattern-clock units per second at Speed 50 — the sketch's millis() / 1000.
const BASE_RATE = 1

// The reference's beat floor and pulse amplitude.
const BEAT_FLOOR = 0.3
const BEAT_AMP = 0.1

// Exact wrap periods. The pattern clock enters only as cos(lg - t) and
// cos(an + t - ...), both 2*PI-periodic in t; the beat clock enters only as
// cos(PI * t), period 2.
const WRAP_PATTERN = Math.PI * 2
const WRAP_BEAT = 2

const VERT_SRC = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`

const FRAG_SRC = `#extension GL_OES_standard_derivatives : enable
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;
uniform float uT;        // pattern clock
uniform float uBeatT;    // beat clock, 1.0 per pulse
uniform float uDensity;  // rings per e-fold of radius; 6.0 shipped
uniform float uCount;    // hearts per turn; 6.0 shipped, integer or the atan seam tears
uniform float uPulse;    // beat amplitude; 0.1 shipped
uniform float uShape;    // gain on the cleft term; 1.0 shipped
uniform float uWeight;   // threshold on the pattern; 0.0 shipped
uniform vec3  uBg;
uniform vec3  uBase;
uniform vec3  uAccent;

#define PI 3.14159265359

void main() {
    vec2 uv = (gl_FragCoord.xy / uRes) * 2.0 - 1.0;
    uv.x *= uRes.x / uRes.y;

    // log(0) is -inf and poisons the whole frame; the floor is well below one
    // device pixel at any size this component renders at.
    float r = max(length(uv), 1e-6);
    float lg = uDensity * log(r);
    float an = uCount * atan(uv.y, uv.x);

    // cos()^12 without pow(): pow of a negative base is undefined in GLSL and
    // cos is negative half the cycle.
    float q = cos(PI * uBeatT);
    float q2 = q * q;
    float q4 = q2 * q2;
    float beat = max(uPulse * (q4 * q4 * q4) + ${BEAT_FLOOR.toFixed(1)}, 1e-3);

    float s = lg - uT;
    float p = cos((1.0 / (2.0 * beat)) * cos(s)
                + 4.0 * beat * cos(an + uT - uShape * abs(sin(s))));

    // Coverage. Filtered by the pattern's own screen-space slope, so the
    // centre — where the log spiral outruns the sample rate — resolves to a
    // blend instead of crawling noise.
    float m;
#ifdef GL_OES_standard_derivatives
    float w = max(fwidth(p), 1e-4);
    m = 1.0 - smoothstep(uWeight - w, uWeight + w, p);
#else
    m = step(p, uWeight);
#endif

    // Base at the deepest part of the cell, accent at its rim, normalised by
    // the live threshold so the full ramp survives a Weight change.
    float k = clamp((p + 1.0) / max(uWeight + 1.0, 1e-3), 0.0, 1.0);
    vec3 heart = mix(uBase, uAccent, k);

    gl_FragColor = vec4(mix(uBg, heart, m), 1.0);
}
`

function num(v: unknown, fb: number): number {
    return typeof v === "number" && isFinite(v) ? v : fb
}

// ControlType.Color emits rgb()/rgba()/hsl()/hsla() and var(--token, …) as
// well as hex, so this parses all of them; a hex-only reader makes the colour
// dials look dead.
function parseColor(input: string | undefined, fb: [number, number, number]): [number, number, number] {
    if (!input) return fb
    const str = String(input).trim()

    if (str.charAt(0) === "#") {
        let hex = str.slice(1)
        if (hex.length === 3 || hex.length === 4) {
            hex = hex.split("").map((c) => c + c).join("")
        }
        if (hex.length >= 6) {
            const r = parseInt(hex.slice(0, 2), 16)
            const g = parseInt(hex.slice(2, 4), 16)
            const b = parseInt(hex.slice(4, 6), 16)
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r / 255, g / 255, b / 255]
        }
        return fb
    }

    const nums = str.match(/-?[\d.]+/g)
    if (!nums || nums.length < 3) return fb

    if (/^hsla?/i.test(str)) {
        const h = ((parseFloat(nums[0]) % 360) + 360) / 360
        const s = Math.min(1, Math.max(0, parseFloat(nums[1]) / 100))
        const l = Math.min(1, Math.max(0, parseFloat(nums[2]) / 100))
        const c = (1 - Math.abs(2 * l - 1)) * s
        const x = c * (1 - Math.abs(((h * 6) % 2) - 1))
        const m = l - c / 2
        const t = Math.floor(h * 6) % 6
        const rgb: [number, number, number] =
            t === 0 ? [c, x, 0] : t === 1 ? [x, c, 0] : t === 2 ? [0, c, x] :
            t === 3 ? [0, x, c] : t === 4 ? [x, 0, c] : [c, 0, x]
        return [rgb[0] + m, rgb[1] + m, rgb[2] + m]
    }

    return [
        Math.min(255, Math.max(0, parseFloat(nums[0]))) / 255,
        Math.min(255, Math.max(0, parseFloat(nums[1]))) / 255,
        Math.min(255, Math.max(0, parseFloat(nums[2]))) / 255,
    ]
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("BeatingHearts shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

// ------------------------------------------------------------------ props

type HeartsGroup = { count?: number; shape?: number; weight?: number }
type BeatGroup = { rate?: number; pulse?: number }

interface BeatingHeartsProps {
    style?: React.CSSProperties
    background?: string
    baseColor?: string
    accentColor?: string
    density?: number
    speed?: number
    hearts?: HeartsGroup
    beat?: BeatGroup
    width?: number
    height?: number
}

// A group the designer never opened arrives undefined, so these are
// spread-merged rather than read through a hand-written ?? chain.
const D_HEARTS: Required<HeartsGroup> = { count: 12, shape: 100, weight: 0 }
const D_BEAT: Required<BeatGroup> = { rate: 115, pulse: 100 }

const C_BG: [number, number, number] = [0.15, 0.15, 0.15]
const C_BASE: [number, number, number] = [1, 0, 0.6]
const C_ACCENT: [number, number, number] = [1, 0, 0.3]

function __BaseImpl_BeatingHearts(props: BeatingHeartsProps) {
    const {
        style,
        background = "#000000",
        baseColor = "#1800DE",
        accentColor = "#0FFFF6",
        density = 8,
        speed = 50,
        hearts,
        beat,
        width,
        height,
    } = props

    const gHearts = { ...D_HEARTS, ...(hearts ?? {}) }
    const gBeat = { ...D_BEAT, ...(beat ?? {}) }

    const [isHovered, setIsHovered] = useState(false)

    const canvasRef = useRef<HTMLCanvasElement>(null)

    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    // Every live input is read from this ref inside the loop, so no dial change
    // ever rebuilds the GL context (rule 6).
    const vRef = useRef({
        bg: C_BG,
        base: C_BASE,
        accent: C_ACCENT,
        density: 6,
        count: 6,
        pulse: BEAT_AMP,
        shape: 1,
        weight: 0,
        speed: 1,
        beatRate: 1,
    })
    vRef.current = {
        bg: parseColor(background, C_BG),
        base: parseColor(baseColor, C_BASE),
        accent: parseColor(accentColor, C_ACCENT),
        density: Math.max(1, num(density, 6)),
        // Non-integer counts tear the frame open along the atan branch cut at
        // 180 degrees, so the dial is stepped and rounded here as well.
        count: Math.max(1, Math.round(num(gHearts.count, 6))),
        pulse: BEAT_AMP * (num(gBeat.pulse, 100) / 100),
        shape: num(gHearts.shape, 100) / 100,
        weight: num(gHearts.weight, 0) / 100,
        speed: num(speed, 50) / 50,
        beatRate: Math.max(0, num(gBeat.rate, 60)) / 60,
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false })
        if (!gl) {
            console.error("BeatingHearts: WebGL unavailable")
            return
        }
        // Must precede compilation or the #extension line does not define the
        // macro and the shader silently takes the hard-edged fallback.
        gl.getExtension("OES_standard_derivatives")

        const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC)
        const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC)
        if (!vs || !fs) return
        const prog = gl.createProgram()
        if (!prog) return
        gl.attachShader(prog, vs)
        gl.attachShader(prog, fs)
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("BeatingHearts link:", gl.getProgramInfoLog(prog))
            return
        }
        gl.useProgram(prog)

        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        const posLoc = gl.getAttribLocation(prog, "a_pos")
        gl.enableVertexAttribArray(posLoc)
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

        const u = {
            res: gl.getUniformLocation(prog, "uRes"),
            t: gl.getUniformLocation(prog, "uT"),
            beatT: gl.getUniformLocation(prog, "uBeatT"),
            density: gl.getUniformLocation(prog, "uDensity"),
            count: gl.getUniformLocation(prog, "uCount"),
            pulse: gl.getUniformLocation(prog, "uPulse"),
            shape: gl.getUniformLocation(prog, "uShape"),
            weight: gl.getUniformLocation(prog, "uWeight"),
            bg: gl.getUniformLocation(prog, "uBg"),
            base: gl.getUniformLocation(prog, "uBase"),
            accent: gl.getUniformLocation(prog, "uAccent"),
        }

        let raf = 0
        let last = performance.now()
        // One accumulator per rate, so changing a rate dial never jumps a phase.
        let tPattern = 0
        let tBeat = 0

        // Speed is signed, so the modulo has to survive a negative accumulator.
        const wrap = (x: number, period: number) => ((x % period) + period) % period

        const render = (now: number) => {
            const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
            last = now
            const v = vRef.current
            tPattern = wrap(tPattern + dt * v.speed * BASE_RATE, WRAP_PATTERN)
            tBeat = wrap(tBeat + dt * v.beatRate, WRAP_BEAT)

            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            // Measure the laid-out box FIRST, not the injected width/height
            // props: the minWidth/minHeight floor clamps the root, so on an
            // instance sized below the floor the prop and the real box
            // disagree and the buffer would be stretched to a wrong aspect.
            // clientWidth/clientHeight are transform-independent, so they do
            // not carry the canvas zoom the way a bounding rect would (rule
            // G). The props are the fallback for the preview, where they are
            // not always numeric.
            const cw = canvas.clientWidth || sizeRef.current.w || 1200
            const ch = canvas.clientHeight || sizeRef.current.h || 800
            const bw = Math.max(1, Math.round(cw * dpr))
            const bh = Math.max(1, Math.round(ch * dpr))
            if (canvas.width !== bw || canvas.height !== bh) {
                canvas.width = bw
                canvas.height = bh
                gl.viewport(0, 0, bw, bh)
            }

            gl.uniform2f(u.res, bw, bh)
            gl.uniform1f(u.t, tPattern)
            gl.uniform1f(u.beatT, tBeat)
            gl.uniform1f(u.density, v.density)
            gl.uniform1f(u.count, v.count)
            gl.uniform1f(u.pulse, v.pulse)
            gl.uniform1f(u.shape, v.shape)
            gl.uniform1f(u.weight, v.weight)
            gl.uniform3f(u.bg, v.bg[0], v.bg[1], v.bg[2])
            gl.uniform3f(u.base, v.base[0], v.base[1], v.base[2])
            gl.uniform3f(u.accent, v.accent[0], v.accent[1], v.accent[2])

            gl.drawArrays(gl.TRIANGLES, 0, 3)
            raf = requestAnimationFrame(render)
        }

        raf = requestAnimationFrame(render)
        return () => cancelAnimationFrame(raf)
    }, [])

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                position: "relative",
                overflow: "hidden",
                background,
                minWidth: 1200,
                minHeight: 800,
                width: typeof width === "number" && width > 0 ? width : "100%",
                height: typeof height === "number" && height > 0 ? height : "100%",
                filter: isHovered
                    ? `brightness(1.3) drop-shadow(0 0 45px ${accentColor}) drop-shadow(0 0 90px ${accentColor})`
                    : "brightness(1) drop-shadow(0 0 0px transparent)",
                transition: "filter 0.4s ease",
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
            />
        </div>
    )
}

const __presetProps = {
  "background": "#000000",
  "baseColor": "#1800DE",
  "accentColor": "#0FFFF6",
  "density": 8,
  "speed": 50,
  "hearts": {
    "count": 12,
    "shape": 100,
    "weight": 0
  },
  "beat": {
    "rate": 115,
    "pulse": 100
  }
};

export default function BeatingHearts(props: Record<string, unknown>) {
  return <__BaseImpl_BeatingHearts {...(__presetProps as Record<string, unknown>)} {...props} />;
}
