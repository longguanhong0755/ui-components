"use client"

import { useEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"

/* ------------------------------------------------------------------ *
 *  FluidRibbons
 *  Curved luminous filaments swept through a magnified, domain-warped
 *  space, on a single full-screen WebGL2 triangle.
 *
 *  The picture is one scalar field:
 *    1. the sample point is aspect-corrected, offset to a focal point and
 *       rotated into a frame stretched along one diagonal
 *    2. domain-warped at two scales. Both sample their noise on a CIRCLE
 *       in its own domain rather than sliding along a line, which is what
 *       lets the motion loop with no cut
 *    3. magnified about the focus -- the "lens". Filaments open out over
 *       it and crowd around its shoulder, and that shoulder is where the
 *       brightest ribbons pile up
 *    4. two stripe families a wedge apart, each FANNED so its spacing
 *       widens one way, converging on a vanishing point off-frame
 *    5. each filament is shaded as a wide gaussian body with a hot core,
 *       then read through an indigo -> violet -> red -> peach ramp
 *
 *  Two rules the field is built around, both learned by watching it fail:
 *
 *  a. Nothing is read AT an angle. An atan() term around the focus draws
 *     a starburst -- every filament pinned to one point -- which the
 *     reference never has. The radial character comes from the
 *     magnification instead, so filaments sweep THROUGH the middle.
 *
 *  b. The lens magnifies the COORDINATE; it is never added to the phase.
 *     A phase bump steep enough to bend filaments this hard also closes
 *     them into rings. A magnification cannot close a contour while its
 *     Jacobian stays positive, so they bend as far as you like and still
 *     leave by the edge of the frame.
 * ------------------------------------------------------------------ */

/* ----------------------------------------------------------- defaults */

const MAX_STOPS = 9

/** Where the field is centred and how its filaments are laid out. */
const DEFAULT_FIELD = {
    focalX: -16,
    focalY: -10,
    filaments: 8.5,
    fan: -7.8,
    density: 5,
}

/** How a single filament is shaded. */
const DEFAULT_RIBBON = {
    width: 5,
    glow: 5,
    intensity: 5,
    opacity: 100,
}

const DEFAULTS = {
    colors: [
        "#0A0430", // deep indigo, the ground
        "#1E10A8", // blue
        "#4B22E8", // electric violet
        "#7B27D8", // violet
        "#C0208A", // magenta
        "#F0231F", // red
        "#FF6A28", // orange
        "#FFB98A", // peach
        "#FFF0E4", // near white
    ],
    background: "#0A0430",
    warp: 5.8,
    speed: 2.9,
    paused: false,
    interaction: 0,
}

// Seconds in one loop. Every time-dependent term in the shader is a sin/cos
// of the loop phase alone, and the JS clock wraps at exactly this period, so
// the frame at t and at t + LOOP_SECONDS are the same picture. Speed 5 runs
// it at 1x; any other speed still loops, just at a different period.
const LOOP_SECONDS = 2.3333

// Retina buys nothing on a field this smooth, and the fragment shader is the
// entire cost of the frame.
const DPR_CAP = 1.75

/* -------------------------------------------------------------- types */

export interface FluidRibbonsField {
    /** Focus of the lens, % of half-width from centre */
    focalX?: number
    /** Focus of the lens, % of half-height from centre */
    focalY?: number
    /** Filaments across the frame in the leading family */
    filaments?: number
    /** -10..10 how hard they fan; the sign picks which side crowds */
    fan?: number
    /** 0-10 how busy the underlying noise field reads; 5 is the tuned default */
    density?: number
}

export interface FluidRibbonsRibbon {
    /** 0-10 thickness of the ribbon body */
    width?: number
    /** 0-10 luminance of the ribbons */
    glow?: number
    /** 0-10 where the palette sits; higher pushes more of it toward peach */
    intensity?: number
    /** 0-100 */
    opacity?: number
}

export interface FluidRibbonsProps {
    /** Palette stops, ground -> peak. Read as one continuous ramp. */
    colors?: string[]
    /** Shows through wherever the field is at its darkest */
    background?: string
    field?: FluidRibbonsField
    ribbon?: FluidRibbonsRibbon
    /** 0-10 fluid bend in the filaments */
    warp?: number
    /** 0-10 rate the field deforms. 5 runs the 2.33s loop at 1x */
    speed?: number
    /** Freeze the animation */
    paused?: boolean
    /** 0-100 how far the pointer pulls the focal point off its base position */
    interaction?: number
    style?: CSSProperties
}

/* ------------------------------------------------------------- shaders */

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;

// One triangle in clip space, not a quad: nothing along the diagonal gets
// shaded twice, and there is no transform or camera to carry.
void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
}
`

const FRAG = `#version 300 es
precision highp float;

#define MAX_STOPS ${MAX_STOPS}

in vec2 vUv;
out vec4 fragColor;

uniform float uTime;        // seconds, already wrapped to the loop
uniform vec2  uResolution;
uniform vec3  uColors[MAX_STOPS];
uniform int   uCount;
uniform vec3  uBg;
uniform float uSpeed;
uniform float uWarp;
uniform float uFan;
uniform float uFilaments;
uniform float uWidth;
uniform float uGlow;
uniform float uIntensity;
uniform vec2  uFocal;
uniform float uOpacity;
uniform float uDensity;

const float TAU = 6.28318530718;
const float LOOP_SECONDS = ${LOOP_SECONDS};

/* --- composition constants. These are the look rather than knobs: each
   was tuned against the reference and has one right answer. --- */

const float DIAG    = -0.9599;  // -55 deg: the axis the field is stretched on
const float SQUASH  = 0.52;     // how far it is drawn out along that axis
const float LENS    = 0.62;     // magnification at the focus
const float LENS_R  = 1.0;      // how far that magnification reaches
const float LENS2   = 0.22;     // a weaker second centre, up and to the right,
const float LENS2_R = 1.9;      // which is what stops the halves mirroring
const vec2  LENS2_P = vec2(0.9, 0.5);
const float WEDGE   = 0.7679;   // 44 deg between the two filament families
const float CROSS   = 0.6;      // weight of the second family at the focus
const float SWELL   = 0.32;     // broad regions that sit at red on their own
const float COUNT_B = 0.6875;   // second family's share of Filaments

/* ------------------------------------------------------------- noise */

float hash(vec2 p) {
    return fract(sin(p.x * 127.1 + p.y * 311.7) * 43758.5453123);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = p - i;
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return (a + (b - a) * u.x + (c - a) * u.y + (a - b - c + d) * u.x * u.y)
           * 2.0 - 1.0;
}

// Octaves are rotated as well as scaled, so the value-noise lattice never
// lines up with itself and the warp reads as fluid rather than as a grid.
const mat2 FBM_ROT = mat2(1.36, 1.02, -1.02, 1.36);

float fbm(vec2 p, int octaves) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
        if (i >= octaves) break;
        v += amp * noise(p);
        p = FBM_ROT * p;
        amp *= 0.5;
    }
    return v;
}

/* -------------------------------------------------------- domain warp */

// The noise is sampled on a circle in its own domain rather than pushed
// along a line, which is what lets the motion loop without a cut.
vec2 domainWarp(vec2 p, float phase, float strength) {
    vec2 c1 = 0.60 * vec2(cos(phase), sin(phase));
    p += strength * 0.30 * vec2(
        fbm(p * 0.55 * uDensity + c1, 3),
        fbm(p * 0.55 * uDensity + vec2(4.3, -2.1) + c1.yx * vec2(1.0, -1.0), 3)
    );

    vec2 c2 = 0.90 * vec2(cos(phase + 2.1), sin(phase + 2.1));
    p += strength * 0.07 * vec2(
        fbm(p * 1.4 * uDensity + c2, 2),
        fbm(p * 1.4 * uDensity + vec2(-3.7, 1.9) + c2.yx * vec2(1.0, -1.0), 2)
    );
    return p;
}

/* -------------------------------------------------------------- lens */

// Smooth magnification about the focus, easing back to 1 outside it. This is
// the whole radial deformation.
vec2 lensMagnify(vec2 p) {
    float m = 1.0 + LENS * exp(-dot(p, p) / (LENS_R * LENS_R));
    vec2 o = p - LENS2_P;
    m *= 1.0 + LENS2 * exp(-dot(o, o) / (LENS2_R * LENS2_R));
    return p * m;
}

/* --------------------------------------------------------- filaments */

// One family: a stripe phase fanned so its spacing widens across the frame,
// which puts the family's vanishing point outside the picture. tanh bounds
// the fan -- taken raw the factor crosses zero somewhere on screen, and that
// line is a dead band with no filaments in it at all.
float fanPhase(vec2 p, float count, float spread, float wobble) {
    return count * p.x * (1.0 + spread * tanh(p.y * 0.55)) + wobble;
}

// A ribbon is a wide body with a hot filament down the middle, and the body
// has to be WIDE: exponential falloffs off the crest spend most of the period
// near zero, which paints thin neon wire on a blue ground. A gaussian body
// holds a broad plateau -- 1.0 at the crest, 0.6 at half width, 0.12 in the
// gap -- which is the red / orange / indigo split the ramp then reads off.
float ribbonIntensity(float phase, float width) {
    float d = abs(sin(phase)) / max(width, 0.05);
    return exp(-d * d * 2.1) + exp(-d * d * 40.0) * 0.35;
}

/* ------------------------------------------------------------ colour */

vec3 colorRamp(float t) {
    float span = float(uCount - 1);
    if (span < 0.5) return uColors[0];

    float u = clamp(t, 0.0, 1.0) * span;
    int i = int(min(floor(u), span - 1.0));
    float k = clamp(u - float(i), 0.0, 1.0);
    k = k * k * (3.0 - 2.0 * k);
    return mix(uColors[i], uColors[i + 1], k);
}

// In-shader bloom. Only what has already clipped past white is allowed to
// bleed, so the peaks soften into the orange around them and the indigo
// ground is left alone -- the whole frame never goes soft.
vec3 bloomContribution(float v) {
    float over = max(v - 1.05, 0.0);
    return vec3(1.0, 0.86, 0.74) * (over * over * 0.55);
}

/* -------------------------------------------------------------- main */

void main() {
    // aspect: normalise against the short side so nothing stretches
    vec2 p = vUv * 2.0 - 1.0;
    p *= vec2(max(uResolution.x / uResolution.y, 1.0),
              max(uResolution.y / uResolution.x, 1.0));

    float phase = TAU * uTime * uSpeed / LOOP_SECONDS;

    // focal point, then into the stretched diagonal frame
    vec2 q = p - uFocal;
    float dc = cos(DIAG), ds = sin(DIAG);
    vec2 e = vec2(dc * q.x + ds * q.y, (-ds * q.x + dc * q.y) / SQUASH);

    e = domainWarp(e, phase, uWarp);
    e = lensMagnify(e);

    float r = length(e);

    // the two families, a wedge apart, each in its own frame
    float cw = cos(WEDGE * 0.5), sw = sin(WEDGE * 0.5);
    vec2 fa = vec2(cw * e.x + sw * e.y, -sw * e.x + cw * e.y);
    vec2 fb = vec2(cw * e.x - sw * e.y,  sw * e.x + cw * e.y);

    float phA = fanPhase(fa, uFilaments, uFan,
                         0.55 * sin(phase + fa.y * 0.8));
    float phB = fanPhase(fb, uFilaments * COUNT_B, -uFan * 0.7,
                         0.55 * sin(phase + 2.4 + fb.y * 0.7));

    // width breathes along a filament rather than being uniform
    float width = uWidth * (1.0 + 0.22 * fbm(e * 0.9 + vec2(9.1, -5.2), 2));

    // The second family is a guest: full strength where it crosses the first
    // near the focus, gone by the corners. Carried at equal weight everywhere
    // it reads as a woven mesh, which the reference is not.
    float cross = CROSS / (1.0 + r * r * 1.6);

    float v = ribbonIntensity(phA, width)
            + ribbonIntensity(phB, width) * cross;
    v *= uGlow;

    // the focus is where the two families crowd, so it runs hottest
    v *= 0.7 + 0.5 / (1.0 + r * r * 1.2);

    // Broad regions that sit at red with no filament in them. smoothstep
    // keeps the swell in patches; lifting the whole frame instead turns the
    // indigo pink and the picture loses its ground.
    float bn = fbm(e * 0.32 * uDensity + vec2(-2.3, 6.7)
                   + 0.35 * vec2(cos(phase), sin(phase)), 2);
    float swell = SWELL * smoothstep(-0.06, 0.40, bn);

    float energy = (v + swell) * uIntensity;
    vec3 col = colorRamp(energy) + bloomContribution(energy * 1.6);

    // the ground shows through wherever the field is at its darkest
    col += uBg * (1.0 - smoothstep(0.0, 0.30, energy));

    // vignette
    col *= 1.0 - 0.25 * min(1.0, dot(p, p) * 0.35);

    fragColor = vec4(clamp(col, 0.0, 1.0), uOpacity);
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
    gl: WebGL2RenderingContext,
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

type Resolved = {
    colors: string[]
    background: string
    field: Required<FluidRibbonsField>
    ribbon: Required<FluidRibbonsRibbon>
    warp: number
    speed: number
    paused: boolean
    interaction: number
}

/* ----------------------------------------------------------- component */

export default function FluidRibbons({
    colors = ["#0A0430","#1E10A8","#4B22E8","#7B27D8","#C0208A","#F0231F","#FF6A28","#FFB98A","#FFF0E4"],
    background = DEFAULTS.background,
    field,
    ribbon,
    warp = DEFAULTS.warp,
    speed = DEFAULTS.speed,
    paused = DEFAULTS.paused,
    interaction = DEFAULTS.interaction,
    style,
}: FluidRibbonsProps) {
    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [failed, setFailed] = useState(false)

    // Live prop mirror. The render loop reads from here, so tweaking a control
    // never tears down the GL context. Each object is merged over its own
    // DEFAULT_*, so a partial object from the panel is safe.
    const resolved: Resolved = {
        colors,
        background,
        field: { ...DEFAULT_FIELD, ...field },
        ribbon: { ...DEFAULT_RIBBON, ...ribbon },
        warp,
        speed,
        paused,
        interaction,
    }
    const propsRef = useRef<Resolved>(resolved)
    propsRef.current = resolved

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return

        let disposed = false
        let raf = 0
        let gl: WebGL2RenderingContext | null = null
        let program: WebGLProgram | null = null
        let buffer: WebGLBuffer | null = null
        let vao: WebGLVertexArrayObject | null = null
        let uni: Record<string, WebGLUniformLocation | null> = {}

        let onScreen = true
        let pageVisible = true
        let pointerTX = 0
        let pointerTY = 0
        let pointerX = 0
        let pointerY = 0

        // Wrapped to the loop, so elapsed never grows large enough to cost
        // float precision in the shader. Everything downstream is a sin/cos of
        // the loop phase, so the wrap is invisible.
        let elapsed = 0
        let lastNow = 0

        const colorBuf = new Float32Array(MAX_STOPS * 3)

        /* ------------------------------------------------------ setup */

        function init(): boolean {
            const ctx = canvas.getContext("webgl2", {
                alpha: true,
                antialias: false,
                depth: false,
                stencil: false,
                premultipliedAlpha: false,
                powerPreference: "high-performance",
            }) as WebGL2RenderingContext | null

            // GLSL ES 3.00, so there is no WebGL1 path to fall back to.
            if (!ctx) return false
            gl = ctx

            const vs = compile(gl, gl.VERTEX_SHADER, VERT)
            const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
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

            vao = gl.createVertexArray()
            gl.bindVertexArray(vao)
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
                "uResolution",
                "uColors[0]",
                "uCount",
                "uBg",
                "uSpeed",
                "uWarp",
                "uFan",
                "uFilaments",
                "uWidth",
                "uGlow",
                "uIntensity",
                "uFocal",
                "uOpacity",
                "uDensity",
            ]
            uni = {}
            for (const n of names) uni[n] = gl.getUniformLocation(prog, n)

            gl.clearColor(0, 0, 0, 0)
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
            const f = p.field
            const rb = p.ribbon

            // Damped toward the pointer target so a fast swipe eases in rather
            // than snapping the focal point.
            const damp = 1 - Math.exp(-dt * 6)
            pointerX += (pointerTX - pointerX) * damp
            pointerY += (pointerTY - pointerY) * damp

            // Abstract 0-10 scales in the panel, real units here. Speed 5 is
            // 1x, which is the reference's cadence and an exact 2.3333s loop.
            const rate = p.speed * 0.2

            const frozen = p.paused
            if (!frozen && rate > 0) {
                elapsed = (elapsed + dt) % (LOOP_SECONDS / rate)
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
            const bg = toRGB(p.background)

            gl.useProgram(program)
            gl.bindVertexArray(vao)
            gl.uniform1f(uni["uTime"], elapsed)
            gl.uniform2f(uni["uResolution"], canvas.width, canvas.height)
            gl.uniform3fv(uni["uColors[0]"], colorBuf)
            gl.uniform1i(uni["uCount"], Math.max(1, list.length))
            gl.uniform3f(uni["uBg"], bg[0], bg[1], bg[2])
            gl.uniform1f(uni["uSpeed"], rate)
            gl.uniform1f(uni["uWarp"], p.warp * 0.2)
            gl.uniform1f(uni["uDensity"], 0.4 + f.density * 0.12)
            gl.uniform1f(uni["uFan"], f.fan * 0.1)
            gl.uniform1f(uni["uFilaments"], f.filaments)
            gl.uniform1f(uni["uWidth"], 0.35 + rb.width * 0.13)
            gl.uniform1f(uni["uGlow"], rb.glow * 0.2)
            gl.uniform1f(uni["uIntensity"], rb.intensity * 0.156)
            const interactionAmt = p.interaction * 0.006
            gl.uniform2f(
                uni["uFocal"],
                f.focalX / 100 + pointerX * interactionAmt,
                f.focalY / 100 + pointerY * interactionAmt
            )
            gl.uniform1f(
                uni["uOpacity"],
                Math.max(0, Math.min(1, rb.opacity / 100))
            )

            gl.clear(gl.COLOR_BUFFER_BIT)
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

        const onPointerMove = (e: PointerEvent) => {
            const rect = host.getBoundingClientRect()
            pointerTX = ((e.clientX - rect.left) / rect.width) * 2 - 1
            pointerTY = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
        }
        const onPointerLeave = () => {
            pointerTX = 0
            pointerTY = 0
        }
        host.addEventListener("pointermove", onPointerMove)
        host.addEventListener("pointerleave", onPointerLeave)

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
            host.removeEventListener("pointermove", onPointerMove)
            host.removeEventListener("pointerleave", onPointerLeave)
            canvas.removeEventListener("webglcontextlost", onLost)
            canvas.removeEventListener("webglcontextrestored", onRestored)
            if (gl) {
                if (buffer) gl.deleteBuffer(buffer)
                if (vao) gl.deleteVertexArray(vao)
                if (program) gl.deleteProgram(program)
                const lose = gl.getExtension("WEBGL_lose_context")
                if (lose) lose.loseContext()
            }
        }
    }, [])

    // Static approximation for the rare no-WebGL2 case.
    const stops = colors && colors.length ? colors : DEFAULTS.colors
    const fallbackStyle: CSSProperties = failed
        ? {
              background:
                  "linear-gradient(115deg, " +
                  stops.concat(stops.slice().reverse()).join(", ") +
                  ")",
              filter: "blur(40px) saturate(1.3)",
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
                background,
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
