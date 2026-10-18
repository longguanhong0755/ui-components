"use client"

import * as React from "react"
import { useEffect, useRef, useState } from "react"

/**
 * DRY BRUSH REVEAL — hover paints a second picture over the first.
 *
 * An "effect surface" component in the sense of rule 8b: not a particle field,
 * so it ships no Base/Accent Color, no Density and no Dot Size. Two images, one
 * fullscreen quad, and every bit of the coverage maths in the fragment shader.
 *
 * THE WHOLE ANIMATION IS ONE SCALAR. `u_progress` runs 0 → 1 while the pointer
 * is over the frame and back to 0 when it leaves, integrated dt-correct at the
 * Speed dial's rate. Nothing else is animated; nothing is tweened per pass.
 *
 *   Passes bands tile the across-stroke axis, each widened by Overlap. Pass i
 *   owns the slice [i/N, (i+1)/N] of that scalar, so the strokes lay down one
 *   after another — sweep, then sweep again lower, then again. Each band's edges
 *   wander down the stroke, within the slack Overlap gives them.
 *
 *   Bristles are FIBRES: 2D value noise stretched ~16:1 along the stroke, so a
 *   mark is a long thin streak of finite length. Every pass gets its own noise
 *   phase, so pass 2's paint lands in the gaps pass 1 left — that is what fills
 *   the frame, and it is the only reason more than one pass is worth having.
 *
 *   Coverage reads as the PAINTED FRACTION of the stroke, because the threshold
 *   it sets runs through a fit of the fibre field's own inverse CDF (see
 *   coverageThreshold). Below 100, image 1 shows through as permanent streaks —
 *   a real dry brush, and one honest dial rather than a "does it finish" toggle.
 *
 *   Dry Out and the band taper RAISE that threshold rather than fade the paint,
 *   so gaps widen toward the end of a stroke and every painted pixel stays
 *   opaque. Fading them instead cross-fades the two pictures, which stops
 *   looking like paint at all.
 *
 * COVER FIT IS HARD-CODED. The two pictures can have different aspect ratios and
 * both are cropped to fill. Contain is deliberately not a control: it would
 * letterbox, and the brush would then spend half its stroke painting empty
 * gutter (rule 1 — a control has to map to something worth seeing).
 *
 * Rule 6 recipe verbatim: the GL context is built ONCE in useEffect([]), every
 * live input is read from a ref inside the raw rAF loop so a property edit never
 * recompiles the shader, and loseContext() is never called — getContext() hands
 * back the SAME context on the next mount and a force-lost one renders black.
 * Raw rAF is used rather than useAnimate because it ticks on the Framer canvas.
 */

/* ---------------------------------------------------------------- constants */

const DPR_CAP = 1.5
/** Sweeps per second at Speed 50 — the rate this shipped at (rule 8b). */
const SHIPPED_RATE = 1.1
/** Bristle lines counted across the stroke's full span, at dial 1 and dial 100. */
const BRISTLE_FREQ_MIN = 6
const BRISTLE_FREQ_MAX = 120
/** How far the ragged front may run ahead of / behind the sweep, in span units. */
const RAGGED_AMP = 0.18
/**
 * Half-width of the threshold ramp. Narrow: paint is opaque and a GAP IS BARE,
 * so the dry look comes from the pattern of gaps, not from translucency. Widening
 * this to blend the two pictures everywhere turns the whole thing into a
 * cross-fade — which is what it looked like at 0.18.
 */
const INK_SOFT = 0.07
/**
 * How far Dry Out (at 100) and the band taper (at its outer edge) push the ink
 * threshold up. 0.6 is past ink's measured maximum spread, so Dry Out 100 leaves
 * the far end of the stroke genuinely bare.
 */
const DRYOUT_SHIFT = 0.6
const BAND_SHIFT = 0.25
/**
 * Cap on how far a pass's own edge wanders across the stroke, in span units, and
 * the fraction of the overlap's slack it may use. 0.3 is where the worst join
 * over every pass count holds at a band profile of 0.42, against 0.70 for no
 * wobble at all and 0.00 for a fixed amplitude (swept numerically).
 */
const BAND_WOBBLE = 0.06
const WOBBLE_OF_SLACK = 0.3
/** Loop bound in the shader must be a constant, so the Passes dial is capped. */
const MAX_PASSES = 4

const DEFAULT_IMAGE =
    "https://images.unsplash.com/photo-1786731055468-b3da500107b8?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8dmlicmFudCUyMGltYWdlfGVufDB8MHwwfHx8MA%3D%3D"
const DEFAULT_HOVER_IMAGE =
    "https://images.unsplash.com/photo-1771792997124-1eb0b9fc8ba1?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjYyfHx2aWJyYW50JTIwaW1hZ2V8ZW58MHwwfDB8fHww"

/* ------------------------------------------------------------------ shaders */

const VS = `
precision highp float;
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
    v_uv = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

/**
 * fwidth() is an OES_standard_derivatives call in WebGL1, so the #extension
 * line has to be prepended BEFORE the precision statement (the spec requires
 * extension directives ahead of any non-preprocessor token). Without the
 * extension the front edge falls back to a fixed softness rather than failing
 * to compile.
 */
const FS_BODY = `
precision highp float;

varying vec2 v_uv;

uniform sampler2D u_texA;
uniform sampler2D u_texB;
uniform float u_aspA;
uniform float u_aspB;
uniform float u_frameAsp;
uniform float u_progress;
uniform float u_angle;
uniform float u_passes;
uniform float u_overlap;
uniform float u_bristles;
uniform float u_coverage;
uniform float u_ragged;
uniform float u_dryout;
uniform float u_hasB;

/** Crop-to-fill. The shorter axis keeps its full 0..1 range; the longer one is
 *  sampled over a narrower window, which is the crop. */
vec2 coverUV(vec2 uv, float frameAsp, float imgAsp) {
    vec2 s = vec2(1.0);
    if (imgAsp > frameAsp) s.x = frameAsp / imgAsp;
    else s.y = imgAsp / frameAsp;
    return (uv - 0.5) * s + 0.5;
}

float hash1(float n) { return fract(sin(n * 12.9898) * 43758.5453123); }
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

float vnoise1(float x) {
    float i = floor(x);
    float f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(hash1(i), hash1(i + 1.0), f);
}

float vnoise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash2(i);
    float b = hash2(i + vec2(1.0, 0.0));
    float c = hash2(i + vec2(0.0, 1.0));
    float d = hash2(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

/**
 * How much paint one pass leaves at (tn, sn). The bristle term varies ACROSS the
 * stroke and the skip term only slowly ALONG it, so the streaks run parallel to
 * the motion. ph is the pass's own phase — different per pass, which is what
 * lets a later pass fill an earlier one's gaps.
 */
float ink(float tn, float sn, float ph) {
    // FIBRES. Two octaves of 2D value noise stretched ~16:1 along the stroke, so
    // a bristle mark is a long thin streak of FINITE length. A 1D noise across tn
    // cannot do this: its gaps are hairlines that run the full length of the
    // stroke and never close, which read as torn tape rather than as brush hair.
    float f1 = vnoise2(vec2(tn * u_bristles + ph, sn * u_bristles * 0.18));
    float f2 = vnoise2(vec2(tn * u_bristles * 0.31 + ph * 1.7, sn * u_bristles * 0.06));
    float b = 0.5 * f1 + 0.5 * f2;
    // Clumps: the hairs bunch, and a bunch varies slowly down the stroke.
    b *= 0.45 + 0.55 * vnoise2(vec2(tn * u_bristles * 0.12 + ph, sn * 1.6));
    // Larger dry patches.
    b *= 0.35 + 0.65 * vnoise2(vec2(sn * 6.0 + ph, tn * 2.0 - ph));
    // Three multiplied noises pile up near zero, which put the Coverage threshold
    // out in the tail where a few percent of dial travel swung the whole frame.
    // The curve lifts the bulk into the middle without moving either end.
    return pow(max(b, 0.0), 0.55);
}

/**
 * Coverage -> ink threshold. This is a cubic fit of ink()'s own inverse CDF,
 * measured over the whole Bristles range, so the dial reads as the PAINTED
 * FRACTION of the stroke: 25 paints about a quarter of it, 78 about three
 * quarters. A straight linear threshold could not — three multiplied noises pile
 * up between 0.28 and 0.68, so 0-35 of the dial did nothing at all and 78-100
 * was already saturated (measured, not guessed).
 *
 * Dry Out and the band taper multiply the ink after this, so the mapping is
 * approximate near the end of a stroke. The two ENDS are exact: at 0 the
 * threshold sits above ink's maximum and nothing paints, at 100 below its
 * minimum and every lit bristle paints.
 */
float coverageThreshold(float c) {
    float t = 0.7518 + c * (-1.1823 + c * (1.9134 + c * -1.2365));
    t = mix(1.0 + ${INK_SOFT}, t, smoothstep(0.0, 0.06, c));
    return mix(t, -${INK_SOFT}, smoothstep(0.94, 1.0, c));
}

void main() {
    vec4 colA = texture2D(u_texA, coverUV(v_uv, u_frameAsp, u_aspA));

    if (u_hasB < 0.5) {
        gl_FragColor = colA;
        return;
    }

    // Stroke space. The uv is aspect-corrected first, so Angle is a true
    // geometric angle and not skewed by the frame's proportions.
    vec2 q = (v_uv - 0.5) * vec2(u_frameAsp, 1.0);
    float ca = cos(u_angle);
    float sa = sin(u_angle);
    float sAlong = q.x * ca + q.y * sa;
    float tAcross = -q.x * sa + q.y * ca;
    // The rotated rectangle's own projected half-extent on each axis — NOT the
    // half-diagonal. With the diagonal the bands tile a span larger than the
    // frame, so at Angle 0 the first pass lands mostly off-screen and the sweep
    // spends part of its time crossing nothing. These two make the sweep cross
    // exactly the frame and the bands tile exactly what is visible, at any angle.
    float Rs = 0.5 * (u_frameAsp * abs(ca) + abs(sa));
    float Rt = 0.5 * (u_frameAsp * abs(sa) + abs(ca));
    float sn = (sAlong + Rs) / (2.0 * Rs);
    float tn = (tAcross + Rt) / (2.0 * Rt);

    float thr = coverageThreshold(clamp(u_coverage, 0.0, 1.0));
    float amp = u_ragged * ${RAGGED_AMP};
    float halfBand = (0.5 / u_passes) * (1.0 + u_overlap);
    float cov = 0.0;

    for (int i = 0; i < ${MAX_PASSES}; i++) {
        float fi = float(i);
        if (fi >= u_passes) break;

        float ph = fi * 37.719 + 4.31;
        float qi = clamp(u_progress * u_passes - fi, 0.0, 1.0);
        if (qi <= 0.0) continue;

        // Band across the stroke, tapered at its edges so overlapping passes
        // cross-hatch instead of butting up against a straight seam.
        float c = (fi + 0.5) / u_passes;
        // The band's own edges wander down the stroke. Without this the side of
        // every pass is a dead straight cut and the whole thing reads as a wipe
        // with a ragged front, not as a brush.
        //
        // The amplitude is capped by the SLACK the overlap actually provides.
        // Each pass wobbles independently, so two neighbours can wander apart —
        // and at Passes 3 and 4 a fixed amplitude reopens exactly the bare seam
        // that Overlap exists to close (measured: worst band profile 0.01 at
        // Passes 3, 0.00 at Passes 4). Tied to the slack it cannot, and the edges
        // wander further when the designer gives them more overlap to wander in.
        float slack = (0.5 / u_passes) * u_overlap;
        float wobAmp = min(${BAND_WOBBLE}, ${WOBBLE_OF_SLACK} * slack);
        float wob = (vnoise2(vec2(sn * 2.2 + ph, fi * 3.7)) - 0.5) * 2.0 * wobAmp;
        float d = abs(tn - c + wob) / halfBand;
        float band = 1.0 - smoothstep(0.55, 1.0, d);
        if (band <= 0.0) continue;
        // The taper and the drying both RAISE THE THRESHOLD rather than scale the
        // ink. Scaling the ink did two wrong things: it fought the Coverage
        // calibration (a full sweep landed at 29% painted instead of 78%), and it
        // made thin paint translucent, so the picture cross-faded through it. As a
        // threshold shift the paint stays opaque and the GAPS widen instead —
        // which is what a brush running dry actually does.
        float thrHere = thr + ${DRYOUT_SHIFT} * u_dryout * sn + ${BAND_SHIFT} * (1.0 - band);

        // Leading edge, chewed by the bristles. The front is mapped past 0 and 1
        // by the ragged amplitude, so qi == 1 always paints all the way out and
        // a strip at the far edge can never be left permanently bare.
        float front = mix(-amp, 1.0 + amp, qi)
                    + amp * (vnoise1(tn * u_bristles * 0.12 + ph) - 0.5) * 1.4
                    + amp * (vnoise1(tn * u_bristles * 0.6 + ph * 2.3) - 0.5) * 0.6;
#ifdef HAS_FWIDTH
        float fw = max(fwidth(sn), 1e-4) * 1.5;
#else
        float fw = 0.004;
#endif
        float gate = 1.0 - smoothstep(front - fw, front + fw, sn);
        if (gate <= 0.0) continue;

        cov = max(cov, gate * smoothstep(thrHere - ${INK_SOFT}, thrHere + ${INK_SOFT}, ink(tn, sn, ph)));
    }

    vec4 colB = texture2D(u_texB, coverUV(v_uv, u_frameAsp, u_aspB));
    gl_FragColor = mix(colA, colB, clamp(cov, 0.0, 1.0));
}
`

/* ------------------------------------------------------------------ helpers */

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** Framer's Image control hands back a URL on older versions and a
 *  ResponsiveImage object on newer ones. */
function imageSrc(v: string | { src?: string } | undefined): string {
    if (!v) return ""
    return (typeof v === "string" ? v : v.src) || ""
}

function compile(gl: WebGLRenderingContext, type: number, src: string, tag: string) {
    const sh = gl.createShader(type)!
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn(`DryBrushReveal: ${tag} shader failed\n${gl.getShaderInfoLog(sh)}`)
        gl.deleteShader(sh)
        return null
    }
    return sh
}

/** 1x1 opaque placeholder so the first frames sample a real texture. */
function makeTexture(gl: WebGLRenderingContext) {
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
        new Uint8Array([20, 20, 22, 255])
    )
    // The pictures are NPOT: CLAMP_TO_EDGE and no mipmap, or they sample black.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    return tex
}

/* ----------------------------------------------------------------- component */

type BrushGroup = {
    overlap?: number
    bristles?: number
    coverage?: number
    ragged?: number
    dryOut?: number
}

/** Typed, so an omitted field is not a TypeScript error at the read site
 *  (rule 10) and a group the designer never opened still has every value. */
const BRUSH_DEFAULTS: Required<BrushGroup> = {
    overlap: 40,
    bristles: 50,
    coverage: 95,
    ragged: 55,
    dryOut: 12,
}

type Props = {
    image?: string | { src?: string }
    hoverImage?: string | { src?: string }
    background?: string
    rounded?: number
    angle?: number
    passes?: number
    speed?: number
    brush?: BrushGroup
    style?: React.CSSProperties
}

function __BaseImpl_DryBrushReveal(props: Props) {
    const {
        background = "#0b0b0c",
        rounded = 0,
        angle = 12,
        passes = 3,
        speed = 50,
        style,
    } = props

    // Spread-merge over the typed defaults rather than a ?? chain per field: one
    // missed key in a chain is what silently pins a control forever (rule 11).
    const brush = { ...BRUSH_DEFAULTS, ...(props.brush ?? {}) }

    const srcA = imageSrc(props.image) || DEFAULT_IMAGE
    const srcB = imageSrc(props.hoverImage) || DEFAULT_HOVER_IMAGE

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    /** Every live input the loop reads. The GL effect has no deps, so a control
     *  change must never reach it (rule 6). Dials are resolved to engine units
     *  here: whole numbers in the panel, fractions in the shader (rule 3). */
    const live = useRef({
        angle: 0, passes: 3, rate: SHIPPED_RATE,
        overlap: 0.4, bristles: 63, coverage: 0.95, ragged: 0.55, dryout: 0.12,
    })
    live.current = {
        angle: (((angle % 360) + 360) % 360) * (Math.PI / 180),
        passes: clamp(Math.round(passes), 1, MAX_PASSES),
        rate: SHIPPED_RATE * (clamp(speed, 0, 100) / 50),
        overlap: clamp(brush.overlap, 0, 100) / 100,
        bristles:
            BRISTLE_FREQ_MIN +
            (clamp(brush.bristles, 1, 100) / 100) * (BRISTLE_FREQ_MAX - BRISTLE_FREQ_MIN),
        coverage: clamp(brush.coverage, 0, 100) / 100,
        ragged: clamp(brush.ragged, 0, 100) / 100,
        dryout: clamp(brush.dryOut, 0, 100) / 100,
    }

    const hovered = useRef(false)
    const progress = useRef(0)

    /** Decoded pictures parked in refs. A new URL must not tear the context
     *  down, so the loop uploads whichever slot is flagged pending — a texture
     *  handed to setState on the same node never re-uploads. */
    const pending = useRef<{ a: HTMLImageElement | null; b: HTMLImageElement | null }>({
        a: null,
        b: null,
    })

    useEffect(() => {
        let dead = false
        const im = new Image()
        im.crossOrigin = "anonymous"
        im.onload = () => {
            if (!dead) pending.current.a = im
        }
        im.onerror = () => console.warn("DryBrushReveal: image failed to load", srcA)
        im.src = srcA
        return () => {
            dead = true
        }
    }, [srcA])

    useEffect(() => {
        let dead = false
        const im = new Image()
        im.crossOrigin = "anonymous"
        im.onload = () => {
            if (!dead) pending.current.b = im
        }
        im.onerror = () => console.warn("DryBrushReveal: hover image failed to load", srcB)
        im.src = srcB
        return () => {
            dead = true
        }
    }, [srcB])

    /** Rounded is a percent of the MAX radius — half the short side — so 100 is
     *  a true pill at any size (rule 7). offsetWidth/offsetHeight, never
     *  getBoundingClientRect, which carries the canvas zoom (rule G). */
    const [shortSide, setShortSide] = useState(0)
    useEffect(() => {
        const host = hostRef.current
        if (!host) return
        const measure = () => setShortSide(Math.min(host.offsetWidth, host.offsetHeight))
        measure()
        if (typeof ResizeObserver === "undefined") return
        const ro = new ResizeObserver(measure)
        ro.observe(host)
        return () => ro.disconnect()
    }, [])
    const radius = (clamp(rounded, 0, 100) / 100) * (shortSide / 2)

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return

        const gl = (canvas.getContext("webgl", {
            antialias: false,
            alpha: false,
            premultipliedAlpha: false,
            depth: false,
            stencil: false,
        }) || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null
        if (!gl) {
            console.warn("DryBrushReveal: no WebGL context")
            return
        }

        const hasFwidth = !!gl.getExtension("OES_standard_derivatives")
        const fsSrc =
            (hasFwidth
                ? "#extension GL_OES_standard_derivatives : enable\n#define HAS_FWIDTH 1\n"
                : "") + FS_BODY

        const vs = compile(gl, gl.VERTEX_SHADER, VS, "vertex")
        const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc, "fragment")
        if (!vs || !fs) return
        const prog = gl.createProgram()!
        gl.attachShader(prog, vs)
        gl.attachShader(prog, fs)
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.warn(`DryBrushReveal: link failed\n${gl.getProgramInfoLog(prog)}`)
            return
        }
        gl.useProgram(prog)

        // Uniform locations are per-program and a typo'd name comes back null and
        // fails silently, so the whole set is fetched in one place and checked.
        const NAMES = [
            "u_texA", "u_texB", "u_aspA", "u_aspB", "u_frameAsp", "u_progress",
            "u_angle", "u_passes", "u_overlap", "u_bristles", "u_coverage",
            "u_ragged", "u_dryout", "u_hasB",
        ] as const
        const U: Record<string, WebGLUniformLocation | null> = {}
        for (const n of NAMES) {
            U[n] = gl.getUniformLocation(prog, n)
            if (U[n] === null) console.warn(`DryBrushReveal: null uniform location ${n}`)
        }

        const quad = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, quad)
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 3, -1, -1, 3]),
            gl.STATIC_DRAW
        )
        const aPos = gl.getAttribLocation(prog, "a_pos")
        gl.enableVertexAttribArray(aPos)
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

        const texA = makeTexture(gl)
        const texB = makeTexture(gl)
        let aspA = 1
        let aspB = 1
        let hasB = 0

        gl.uniform1i(U.u_texA as WebGLUniformLocation, 0)
        gl.uniform1i(U.u_texB as WebGLUniformLocation, 1)

        let needsDraw = true

        const upload = (tex: WebGLTexture, unit: number, im: HTMLImageElement) => {
            gl.activeTexture(unit === 0 ? gl.TEXTURE0 : gl.TEXTURE1)
            gl.bindTexture(gl.TEXTURE_2D, tex)
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im)
            const w = im.naturalWidth || im.width || 1
            const h = im.naturalHeight || im.height || 1
            return w / h
        }

        /* ---- sizing: measure the ELEMENT. Framer's width/height props are not
               numeric in the preview, only on the canvas. ---- */
        let frameAsp = 16 / 9
        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
            const cssW = canvas.clientWidth || host.clientWidth || 0
            const cssH = canvas.clientHeight || host.clientHeight || 0
            const w = Math.max(1, Math.round(cssW * dpr))
            const h = Math.max(1, Math.round(cssH * dpr))
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w
                canvas.height = h
                needsDraw = true
            }
            frameAsp = w / h
        }
        resize()

        const ro =
            typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null
        ro?.observe(host)

        const onEnter = () => {
            hovered.current = true
        }
        const onLeave = () => {
            hovered.current = false
        }
        host.addEventListener("pointerenter", onEnter)
        host.addEventListener("pointerleave", onLeave)
        // A pointer released outside the host must not leave the sweep latched on.
        window.addEventListener("pointercancel", onLeave)

        let raf = 0
        let last = performance.now()

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
            last = now
            const L = live.current

            if (pending.current.a) {
                aspA = upload(texA, 0, pending.current.a)
                pending.current.a = null
                needsDraw = true
            }
            if (pending.current.b) {
                aspB = upload(texB, 1, pending.current.b)
                pending.current.b = null
                hasB = 1
                needsDraw = true
            }

            // One scalar, integrated at a RATE (rule P): the same Speed means the
            // same sweep velocity whatever the frame's size or pass count.
            const target = hovered.current ? 1 : 0
            if (progress.current !== target && L.rate > 0) {
                const step = L.rate * dt
                progress.current =
                    target > progress.current
                        ? Math.min(target, progress.current + step)
                        : Math.max(target, progress.current - step)
                needsDraw = true
            }

            if (!needsDraw) return
            needsDraw = false

            gl.viewport(0, 0, canvas.width, canvas.height)
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, texA)
            gl.activeTexture(gl.TEXTURE1)
            gl.bindTexture(gl.TEXTURE_2D, texB)

            gl.uniform1f(U.u_aspA as WebGLUniformLocation, aspA)
            gl.uniform1f(U.u_aspB as WebGLUniformLocation, aspB)
            gl.uniform1f(U.u_frameAsp as WebGLUniformLocation, frameAsp)
            gl.uniform1f(U.u_progress as WebGLUniformLocation, progress.current)
            gl.uniform1f(U.u_angle as WebGLUniformLocation, L.angle)
            gl.uniform1f(U.u_passes as WebGLUniformLocation, L.passes)
            gl.uniform1f(U.u_overlap as WebGLUniformLocation, L.overlap)
            gl.uniform1f(U.u_bristles as WebGLUniformLocation, L.bristles)
            gl.uniform1f(U.u_coverage as WebGLUniformLocation, L.coverage)
            gl.uniform1f(U.u_ragged as WebGLUniformLocation, L.ragged)
            gl.uniform1f(U.u_dryout as WebGLUniformLocation, L.dryout)
            gl.uniform1f(U.u_hasB as WebGLUniformLocation, hasB)

            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro?.disconnect()
            host.removeEventListener("pointerenter", onEnter)
            host.removeEventListener("pointerleave", onLeave)
            window.removeEventListener("pointercancel", onLeave)
            gl.deleteTexture(texA)
            gl.deleteTexture(texB)
            gl.deleteBuffer(quad)
            gl.deleteProgram(prog)
            gl.deleteShader(vs)
            gl.deleteShader(fs)
            // No loseContext(): getContext returns the same context per canvas,
            // so a force-lost one comes back on the next mount and renders black.
        }
    }, [])

    return (
        <div
            ref={hostRef}
            style={{
                // Floor BEFORE the style spread: the canvas is absolutely
                // positioned, so the root has no in-flow content and would
                // collapse under Framer's Fit Content sizing. 1200x800 is the
                // repo-wide floor (rule 10) — an explicit size on the instance
                // still wins, because it arrives in ...style.
                minWidth: 1200,
                minHeight: 800,
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                ...style,
                backgroundColor: background,
                borderRadius: radius,
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
                    // The canvas is its own compositing layer, so the root's
                    // rounded overflow is not guaranteed to clip it — give it the
                    // same radius rather than relying on the parent.
                    borderRadius: radius,
                    // Hover is read off the host, which must stay the event target.
                    pointerEvents: "none",
                }}
            />
        </div>
    )
}

DryBrushReveal.displayName = "Dry Brush Reveal"

const __presetProps = {
  "image": "https://images.unsplash.com/photo-1697463112303-cdae04af750e?q=80&w=2728&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "hoverImage": "https://images.unsplash.com/photo-1678931546551-ea7e9ad0efbc?q=80&w=2728&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "background": "#0b0b0c",
  "rounded": 0,
  "angle": 12,
  "passes": 3,
  "speed": 50,
  "brush": {
    "dryOut": 12,
    "ragged": 55,
    "overlap": 100,
    "bristles": 50,
    "coverage": 95
  }
};

export default function DryBrushReveal(props: Record<string, unknown>) {
  return <__BaseImpl_DryBrushReveal {...(__presetProps as Record<string, unknown>)} {...props} />;
}
