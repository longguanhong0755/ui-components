"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"

/**
 * InfiniteHole — a shaft of framed blocks that falls away forever. Rings of
 * boxes spiral outward and down into a wavy funnel, and the whole field steps
 * outward by exactly one ring every cycle, so it never ends and never repeats
 * visibly.
 *
 * Ported from strangerintheq's "hole" (CodePen bGeRqpz). One instanced draw
 * call, all of the geometry in the vertex shader, no matrix library, no three
 * (rule 8 / rule 10).
 *
 * THE FIELD IS GEOMETRIC, WHICH IS WHY IT LOOKS INFINITE. Ring 0 sits at
 * radius `shift`, and each ring outward is
 *
 *     r_{i+1} = r_i · (1 + arc)          arc = 2π / Columns
 *
 * so the rings grow by a fixed RATIO, not a fixed gap. A box is scaled to
 * `r·arc` in x and z, which is the arc length one column subtends at that
 * radius, so the boxes tile their ring exactly at every scale and the whole
 * structure is self-similar. That self-similarity is the entire trick: zoom out
 * by one ratio step and the picture is unchanged.
 *
 * THE LOOP IS SEAMLESS ONLY IF THE STEP MATCHES THE RATIO, AND THE REFERENCE'S
 * DOES NOT. Over one cycle `shift` slides from 3 down by `oneStep`, and at the
 * wrap every ring must land exactly where its inner neighbour was:
 *
 *     (3 - oneStep)(1 + arc)^i = 3(1 + arc)^(i-1)   for every i
 *     ⇒ oneStep = 3·arc / (1 + arc)
 *
 * At the reference's 64 columns that is 0.26823; the reference hard-codes
 * 0.283, 5.5% too far, so the field jumps back a fraction of a ring once per
 * cycle. Worse, the constant is only ever right for ONE column count, and
 * Columns is a control here — at 32 columns the correct step is 0.5137 and the
 * hard-coded value would be less than half of it. So it is derived, and the
 * seam is now exact at every setting (asserted numerically, not eyeballed).
 *
 * That fixes the RADII. The radial POSITIONS need one more term, because the
 * reference accumulates `zShift + shift`, which works out to
 *
 *     P_i = shift·(1 + arc)^(i+1) - shift·arc
 *
 * — geometric, minus a term that moves with `shift`. The geometric part wraps
 * perfectly; the trailing term does not, and it leaves the whole field jumping
 * outward by exactly `arc·oneStep` once per cycle (0.0263 world units at the
 * default, 0.097 at 32 columns). Replacing that term with a CONSTANT — the
 * `uSeam` uniform, `(3 - shift)·arc` — makes the wrap exact to 1e-15 at every
 * column count, and because it is zero at the start of a cycle the framing is
 * identical to the reference's there and drifts by at most that same 0.0263
 * before returning. A rigid drift nobody can see, in place of a jump.
 *
 * The vertical drop wraps on its own and always did: a ring's depth is
 *
 *     t = Falloff - row + |wave(column)| + frac(cycle)
 *
 * and at frac → 1 row i holds exactly what row i-1 held at frac = 0. Same
 * identity, already satisfied, left alone.
 *
 * THE BOXES ARE FRUSTA, NOT CUBES. `if (z > 0) radius += radius·arc` runs
 * PER VERTEX, so the outer face of every box is scaled at the next ring's
 * radius while the inner face is scaled at its own. Each box therefore widens
 * as it goes outward and the ring closes with no gaps — a cube would leave a
 * wedge between every pair of neighbours. It is one line and it is load-bearing.
 *
 * THE FRAME IS PROCEDURAL. The reference paints a 128px canvas white and
 * `clearRect`s all but a 3px border, then maps it with `transparent: false` —
 * so the cleared middle renders as opaque BLACK, not as a hole, and the boxes
 * occlude each other. That occlusion is what stops the far side of the shaft
 * showing through the near side. Reproduced here as a distance-to-edge test in
 * the fragment shader with fwidth antialiasing — same picture, no texture
 * upload, and Thickness becomes a real control instead of a magic 3. One
 * visible difference against the reference: its texture is mipmapped and
 * anisotropically filtered, so distant frames stay bold, while a procedural
 * edge test thins out with distance. The analytic one is the more correct
 * picture — the far rings genuinely are thinner — and it does not shimmer.
 *
 * Because the box interior is opaque, the interior colour must be the SAME
 * colour as the page behind it or the boxes read as grey plates. So Background
 * is both the root's CSS background and a uniform. The canvas itself still
 * clears transparent, so anything the component is dropped onto still shows
 * through where there is no geometry (rule 8b).
 *
 * NO THREE. The reference imports three 0.121 from unpkg for a box geometry, an
 * instanced mesh and two matrices. Here that is 24 vertices, one
 * `vertexAttribDivisor`, and a hand-written `lookAt`/`perspective` pair — the
 * file stays readable end to end and pins nothing to a CDN (rule 10).
 *
 * KEY CHANGES from the reference (staged port, clean break — rule 11c):
 *   - `oneStep = 0.283` → derived from Columns, as above.
 *   - `camera.lookAt(0, 0, 1)` → frozen in `LOOK_AT`; the panel exposes
 *     Camera Height and Distance, which is what actually reframes the shot.
 *   - The three wave terms (amplitudes 1.1 / 1.5 / 2.5 over periods 5.3 / 1.3 /
 *     1.7) collapse to `Wave` and `Ripple` — one amplitude scale and one
 *     frequency scale — rather than six raw floats no designer would tune.
 *   - `scene.rotation.y = -t/10000` → `Spin` in °/s. The reference's rate is
 *     -5.73°/s, so the default is -6 (rule 3).
 */

/* ---------------------------------------------------------------- types --- */

interface CameraGroup {
    cameraHeight?: number
    perspective?: number
}

interface HoleGroup {
    layers?: number
    depth?: number
    falloff?: number
}

interface WaveGroup {
    wave?: number
    ripple?: number
}

interface InteractionGroup {
    hoverSpeed?: number
    clickPulse?: number
    transition?: any
}

interface InfiniteHoleProps {
    background?: string
    color?: string
    colors?: string[]
    colorSpread?: number
    columns?: number
    rows?: number
    thickness?: number
    speed?: number
    spin?: number
    distance?: number
    camera?: CameraGroup
    hole?: HoleGroup
    waveGroup?: WaveGroup
    interaction?: InteractionGroup
    style?: CSSProperties
}

type Vec3 = [number, number, number]

/* ------------------------------------------------------------- constants --- */

/**
 * Radius of the innermost ring, and the value `oneStep` is derived against.
 * Frozen at the reference's 3.0: it trades off against Distance one for one, so
 * exposing both would be two dials for one dimension (rule 11b).
 */
const SHIFT0 = 3

/** Where the camera aims. The reference's `lookAt(0, 0, 1)`, frozen. */
const LOOK_AT: Vec3 = [0, 0, 1]

/** The reference's near/far planes. */
const NEAR = 1
const FAR = 1000

/** Speed dial value that reproduces the reference's one-cycle-per-second. */
const SPEED_REFERENCE = 50

/** Longest frame the clock will integrate, so a stalled tab cannot jump. */
const MAX_DT = 0.05

/** Retina is enough; past it this is pure fill cost for no visible gain. */
const MAX_DPR = 2

/** Fixed-size uniform array in the shader; palettes longer than this repeat. */
const MAX_COLORS = 8

const DEFAULT_CAMERA: Required<CameraGroup> = {
    cameraHeight: 6,
    perspective: 60,
}

const DEFAULT_HOLE: Required<HoleGroup> = {
    layers: 2,
    depth: 100,
    falloff: 2,
}

const DEFAULT_WAVE: Required<WaveGroup> = {
    wave: 100,
    ripple: 100,
}

const DEFAULT_INTERACTION: Required<InteractionGroup> = {
    hoverSpeed: 160,
    clickPulse: 160,
    transition: { type: "spring", duration: 0.6 },
}

/* ------------------------------------------------------------- utilities --- */

function clamp(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v
}

/**
 * Parses `#fff`, `#rrggbb`, `#rrggbbaa`, `rgb()`, `rgba()` and `hsl()` into
 * 0..1 RGB. Framer's Color control does NOT always emit hex — it emits
 * `rgba(…)` and `hsl(…)` too, and a hex-only parser makes the dial look dead.
 */
function parseColor(input: string | undefined, fallback: Vec3): Vec3 {
    if (!input) return fallback
    const s = input.trim()

    if (s[0] === "#") {
        const hex = s.slice(1)
        const short = hex.length === 3 || hex.length === 4
        const long = hex.length === 6 || hex.length === 8
        if (!short && !long) return fallback
        const grab = (i: number) =>
            short
                ? parseInt(hex[i] + hex[i], 16)
                : parseInt(hex.slice(i * 2, i * 2 + 2), 16)
        const r = grab(0)
        const g = grab(1)
        const b = grab(2)
        if ([r, g, b].some(Number.isNaN)) return fallback
        return [r / 255, g / 255, b / 255]
    }

    const rgb = s.match(/rgba?\(([^)]+)\)/i)
    if (rgb) {
        const p = rgb[1].split(/[,/\s]+/).map((v) => parseFloat(v))
        if (p.length >= 3 && p.slice(0, 3).every((v) => !Number.isNaN(v))) {
            return [p[0] / 255, p[1] / 255, p[2] / 255]
        }
    }

    const hsl = s.match(/hsla?\(([^)]+)\)/i)
    if (hsl) {
        const p = hsl[1].split(/[,/\s]+/).map((v) => parseFloat(v))
        if (p.length >= 3 && p.slice(0, 3).every((v) => !Number.isNaN(v))) {
            const h = ((p[0] % 360) + 360) % 360 / 360
            const sat = clamp(p[1] / 100, 0, 1)
            const li = clamp(p[2] / 100, 0, 1)
            const c = (1 - Math.abs(2 * li - 1)) * sat
            const x = c * (1 - Math.abs(((h * 6) % 2) - 1))
            const m = li - c / 2
            const seg = Math.floor(h * 6) % 6
            const t: Vec3 =
                seg === 0
                    ? [c, x, 0]
                    : seg === 1
                      ? [x, c, 0]
                      : seg === 2
                        ? [0, c, x]
                        : seg === 3
                          ? [0, x, c]
                          : seg === 4
                            ? [x, 0, c]
                            : [c, 0, x]
            return [t[0] + m, t[1] + m, t[2] + m]
        }
    }

    return fallback
}

/**
 * The per-cycle radial step that makes the loop seamless. See the header: it is
 * fixed by the ring ratio, so it cannot be a constant once Columns is a dial.
 */
export function oneStepFor(columns: number): number {
    const arc = (2 * Math.PI) / Math.max(3, columns)
    return (SHIFT0 * arc) / (1 + arc)
}

/* ----------------------------------------------------------- matrix math --- */
/* Column-major, the layout WebGL wants. Four functions, no library (rule 8). */

function perspective(fovDeg: number, aspect: number): Float32Array {
    const f = 1 / Math.tan((fovDeg * Math.PI) / 360)
    const nf = 1 / (NEAR - FAR)
    const m = new Float32Array(16)
    m[0] = f / aspect
    m[5] = f
    m[10] = (FAR + NEAR) * nf
    m[11] = -1
    m[14] = 2 * FAR * NEAR * nf
    return m
}

function lookAt(eye: Vec3, center: Vec3, up: Vec3): Float32Array {
    let zx = eye[0] - center[0]
    let zy = eye[1] - center[1]
    let zz = eye[2] - center[2]
    let len = Math.hypot(zx, zy, zz) || 1
    zx /= len
    zy /= len
    zz /= len

    let xx = up[1] * zz - up[2] * zy
    let xy = up[2] * zx - up[0] * zz
    let xz = up[0] * zy - up[1] * zx
    len = Math.hypot(xx, xy, xz) || 1
    xx /= len
    xy /= len
    xz /= len

    const yx = zy * xz - zz * xy
    const yy = zz * xx - zx * xz
    const yz = zx * xy - zy * xx

    const m = new Float32Array(16)
    m[0] = xx
    m[1] = yx
    m[2] = zx
    m[4] = xy
    m[5] = yy
    m[6] = zy
    m[8] = xz
    m[9] = yz
    m[10] = zz
    m[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2])
    m[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2])
    m[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2])
    m[15] = 1
    return m
}

/** `out = a · b`, both column-major 4×4. */
function multiply(a: Float32Array, b: Float32Array): Float32Array {
    const o = new Float32Array(16)
    for (let c = 0; c < 4; c++) {
        for (let r = 0; r < 4; r++) {
            o[c * 4 + r] =
                a[r] * b[c * 4] +
                a[4 + r] * b[c * 4 + 1] +
                a[8 + r] * b[c * 4 + 2] +
                a[12 + r] * b[c * 4 + 3]
        }
    }
    return o
}

/** The scene's own spin, about Y. The reference's `scene.rotation.y`. */
function rotationY(rad: number): Float32Array {
    const c = Math.cos(rad)
    const s = Math.sin(rad)
    const m = new Float32Array(16)
    m[0] = c
    m[2] = -s
    m[5] = 1
    m[8] = s
    m[10] = c
    m[15] = 1
    return m
}

/* -------------------------------------------------------------- geometry --- */

/** A unit box: 24 vertices, per-face UVs, 36 indices. `BoxGeometry(1,1,1)`. */
function unitBox(): { position: Float32Array; uv: Float32Array; index: Uint16Array } {
    const position: number[] = []
    const uv: number[] = []
    const index: number[] = []

    // axis: which local axis the face faces; sign: which way along it.
    const faces: { n: Vec3; u: Vec3; v: Vec3 }[] = [
        { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
        { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
        { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1] },
        { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, -1] },
        { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
        { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
    ]

    for (const f of faces) {
        const base = position.length / 3
        for (const [su, sv] of [
            [-1, -1],
            [1, -1],
            [1, 1],
            [-1, 1],
        ]) {
            position.push(
                (f.n[0] + su * f.u[0] + sv * f.v[0]) * 0.5,
                (f.n[1] + su * f.u[1] + sv * f.v[1]) * 0.5,
                (f.n[2] + su * f.u[2] + sv * f.v[2]) * 0.5
            )
            uv.push((su + 1) * 0.5, (sv + 1) * 0.5)
        }
        index.push(base, base + 1, base + 2, base, base + 2, base + 3)
    }

    return {
        position: new Float32Array(position),
        uv: new Float32Array(uv),
        index: new Uint16Array(index),
    }
}

/** One (row, column, layer) triple per instance, in the reference's order. */
function instanceData(rows: number, columns: number, layers: number): Float32Array {
    const out = new Float32Array(rows * columns * layers * 3)
    let n = 0
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < layers; j++) {
            for (let k = 0; k < columns; k++) {
                out[n++] = i
                out[n++] = k
                out[n++] = j
            }
        }
    }
    return out
}

/* --------------------------------------------------------------- shaders --- */

const VERT = `#version 300 es
precision highp float;

in vec3 aPosition;
in vec2 aUv;
in vec3 aRcl;          // (row, column, layer)

uniform mat4 uProjection;
uniform mat4 uModelView;
uniform float uArc;     // 2*PI / Columns
uniform float uShift;   // this frame's inner radius
uniform float uPhase;   // frac(cycle), 0..1
uniform float uSeam;    // (SHIFT0 - uShift) * uArc — see the header
uniform float uDepth;
uniform float uFalloff;
uniform float uWave;
uniform float uRipple;
uniform vec3 uColors[8];
uniform int uColorCount;
uniform float uColorSpread;

out vec2 vUv;
out vec3 vColor;

void main() {
    // Walk out to this instance's ring. Both the radius and the running
    // distance are geometric, which is what makes the field self-similar.
    float radius = uShift;
    float zShift = 0.0;
    int row = int(aRcl.x + 0.5);
    for (int i = 0; i < row; i++) {
        radius += radius * uArc;
        zShift += radius * uArc;
    }

    vec4 p = vec4(aPosition, 1.0);

    // PER VERTEX: the outward face sits at the NEXT ring's radius, so the box
    // is a frustum and its ring closes with no wedge between neighbours.
    if (p.z > 0.0) radius += radius * uArc;

    p.xz *= radius * uArc;
    // The reference's zShift + shift is geometric MINUS a term proportional to
    // the live shift, and that term is what breaks the wrap. Subtracting uSeam
    // replaces it with a constant, which makes the loop exact and leaves the
    // framing identical at the start of every cycle.
    p.z += zShift + uShift - uSeam;

    // The rim's profile: three fixed terms in the column index, scaled by one
    // amplitude and one frequency.
    float c = aRcl.y * uRipple;
    float wave = sin(c / 5.3) * 1.1 + sin(c / 1.3) * 1.5 + cos(c / 1.7) * 2.5;
    wave *= uWave;

    float t = uFalloff - aRcl.x + abs(wave) + uPhase;
    t += aRcl.z * abs(sin(aRcl.y));
    t = max(t, 0.0);
    p.y -= t * t * t * uDepth + aRcl.z;

    // Seat the box on its column. Rotation is LAST, so everything above is
    // computed in the ring's own frame.
    float a = aRcl.y * uArc;
    float sn = sin(a);
    float cs = cos(a);
    p.xz = p.xz * mat2(cs, -sn, sn, cs);

    // Blend this instance's colour along the palette, one full pass every
    // uColorSpread rows. A single-colour palette (uColorCount == 1) always
    // resolves to uColors[0], so this is the old solid-colour behaviour when
    // no extra stops are added.
    float span = uColorSpread > 0.0
        ? mod(aRcl.x, uColorSpread) / uColorSpread * float(uColorCount)
        : 0.0;
    float idxF = floor(span);
    float fracT = span - idxF;
    int i0 = int(mod(idxF, float(uColorCount)));
    int i1 = int(mod(idxF + 1.0, float(uColorCount)));
    vec3 c0 = uColors[0];
    vec3 c1 = uColors[0];
    for (int k = 0; k < 8; k++) {
        if (k == i0) c0 = uColors[k];
        if (k == i1) c1 = uColors[k];
    }
    vColor = mix(c0, c1, fracT);

    vUv = aUv;
    gl_Position = uProjection * uModelView * p;
}
`

const FRAG = `#version 300 es
precision highp float;

in vec2 vUv;
in vec3 vColor;

uniform vec3 uBackground;
uniform float uThickness;

out vec4 fragColor;

void main() {
    // Distance to the nearest face edge, in UV units.
    float d = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    float aa = max(fwidth(d), 1e-5);
    float frame = 1.0 - smoothstep(uThickness - aa, uThickness + aa, d);

    // OPAQUE, including the middle: the boxes have to occlude each other or
    // the far side of the shaft shows through the near side.
    fragColor = vec4(mix(uBackground, vColor, frame), 1.0);
}
`

/* ------------------------------------------------------------ component --- */

export default function InfiniteHole(props: InfiniteHoleProps) {
    const {
        background = "#000000",
        color = "#FFFFFF",
        colors = ["#8B00FF","#FF00C9"],
        colorSpread = 8,
        columns = 93,
        rows = 36,
        thickness = 3,
        speed = 38,
        spin = 15,
        distance = 34,
        camera,
        hole,
        waveGroup,
        interaction,
        style,
    } = props

    const cam: Required<CameraGroup> = { ...DEFAULT_CAMERA, ...(camera ?? {}) }
    const hol: Required<HoleGroup> = { ...DEFAULT_HOLE, ...(hole ?? {}) }
    const wav: Required<WaveGroup> = { ...DEFAULT_WAVE, ...(waveGroup ?? {}) }
    const int: Required<InteractionGroup> = {
        ...DEFAULT_INTERACTION,
        ...(interaction ?? {}),
    }

    const rootRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    /** Pointer-hover target — 0 or 1 — eased toward inside the loop. */
    const hoverRef = useRef(0)
    /** Eased hover amount. Lives only in the loop, so a dial change never fights a live gesture. */
    const hoverAmtRef = useRef(0)
    /** Click/tap pulse — set to 1 on pointer-down, decays toward 0 in the loop. */
    const pulseRef = useRef(0)

    /**
     * Every live input the loop reads. A ref, so changing a dial never tears
     * down the GL context or recompiles the program (rule 6).
     */
    const liveRef = useRef({
        background,
        color,
        colors,
        colorSpread,
        columns,
        rows,
        thickness,
        speed,
        spin,
        distance,
        cam,
        hol,
        wav,
        int,
    })
    liveRef.current = {
        background,
        color,
        colors,
        colorSpread,
        columns,
        rows,
        thickness,
        speed,
        spin,
        distance,
        cam,
        hol,
        wav,
        int,
    }

    /** Set when the instance count changed; the loop rebuilds the buffer. */
    const geomRef = useRef({ rows: -1, columns: -1, layers: -1 })

    useEffect(() => {
        const canvas = canvasRef.current
        const root = rootRef.current
        if (!canvas || !root) return

        const gl = canvas.getContext("webgl2", {
            alpha: true,
            antialias: true,
            premultipliedAlpha: true,
        })
        if (!gl) return

        /* ------------------------------------------------------ program --- */

        const compile = (type: number, src: string) => {
            const sh = gl.createShader(type)
            if (!sh) return null
            gl.shaderSource(sh, src)
            gl.compileShader(sh)
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
                console.error("InfiniteHole shader:", gl.getShaderInfoLog(sh))
                gl.deleteShader(sh)
                return null
            }
            return sh
        }

        const vs = compile(gl.VERTEX_SHADER, VERT)
        const fs = compile(gl.FRAGMENT_SHADER, FRAG)
        if (!vs || !fs) return

        const program = gl.createProgram()
        if (!program) return
        gl.attachShader(program, vs)
        gl.attachShader(program, fs)
        gl.linkProgram(program)
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("InfiniteHole link:", gl.getProgramInfoLog(program))
            return
        }
        gl.useProgram(program)

        const U = {
            projection: gl.getUniformLocation(program, "uProjection"),
            modelView: gl.getUniformLocation(program, "uModelView"),
            arc: gl.getUniformLocation(program, "uArc"),
            shift: gl.getUniformLocation(program, "uShift"),
            phase: gl.getUniformLocation(program, "uPhase"),
            seam: gl.getUniformLocation(program, "uSeam"),
            depth: gl.getUniformLocation(program, "uDepth"),
            falloff: gl.getUniformLocation(program, "uFalloff"),
            wave: gl.getUniformLocation(program, "uWave"),
            ripple: gl.getUniformLocation(program, "uRipple"),
            colors: gl.getUniformLocation(program, "uColors[0]"),
            colorCount: gl.getUniformLocation(program, "uColorCount"),
            colorSpread: gl.getUniformLocation(program, "uColorSpread"),
            background: gl.getUniformLocation(program, "uBackground"),
            thickness: gl.getUniformLocation(program, "uThickness"),
        }

        /* ----------------------------------------------------- geometry --- */

        const box = unitBox()
        const vao = gl.createVertexArray()
        gl.bindVertexArray(vao)

        const posBuf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuf)
        gl.bufferData(gl.ARRAY_BUFFER, box.position, gl.STATIC_DRAW)
        const aPosition = gl.getAttribLocation(program, "aPosition")
        gl.enableVertexAttribArray(aPosition)
        gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0)

        const uvBuf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf)
        gl.bufferData(gl.ARRAY_BUFFER, box.uv, gl.STATIC_DRAW)
        const aUv = gl.getAttribLocation(program, "aUv")
        gl.enableVertexAttribArray(aUv)
        gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0)

        const rclBuf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, rclBuf)
        const aRcl = gl.getAttribLocation(program, "aRcl")
        gl.enableVertexAttribArray(aRcl)
        gl.vertexAttribPointer(aRcl, 3, gl.FLOAT, false, 0, 0)
        gl.vertexAttribDivisor(aRcl, 1)

        const idxBuf = gl.createBuffer()
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, box.index, gl.STATIC_DRAW)

        let instances = 0
        const rebuild = (r: number, c: number, l: number) => {
            const data = instanceData(r, c, l)
            gl.bindBuffer(gl.ARRAY_BUFFER, rclBuf)
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
            instances = r * c * l
            geomRef.current = { rows: r, columns: c, layers: l }
        }

        gl.enable(gl.DEPTH_TEST)
        // Deliberately no face culling: the boxes are closed and opaque, so the
        // depth test already hides every back face, and this cannot get the
        // winding wrong for a frustum that flips inside out at extreme dials.
        gl.clearColor(0, 0, 0, 0)

        /* --------------------------------------------------------- size --- */

        let cssW = 0
        let cssH = 0
        const resize = () => {
            // clientWidth / clientHeight, never the width/height PROPS: those
            // are not numeric in the Framer preview, and never
            // getBoundingClientRect, which carries the canvas zoom (rule G).
            const w = canvas.clientWidth || 1
            const h = canvas.clientHeight || 1
            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            const bw = Math.max(1, Math.round(w * dpr))
            const bh = Math.max(1, Math.round(h * dpr))
            if (canvas.width !== bw || canvas.height !== bh) {
                canvas.width = bw
                canvas.height = bh
            }
            cssW = w
            cssH = h
            gl.viewport(0, 0, bw, bh)
        }
        resize()

        const ro = new ResizeObserver(resize)
        ro.observe(canvas)

        /* --------------------------------------------------------- loop --- */

        let raf = 0
        let last = performance.now()
        /** Cycles elapsed. Wrapped on the CPU so float precision cannot decay. */
        let cycles = 0
        /** Spin angle, in radians, wrapped to one turn for the same reason. */
        let angle = 0

        const tick = (now: number) => {
            // Clamped at zero: the first rAF timestamp can predate `last`.
            const dt = clamp((now - last) / 1000, 0, MAX_DT)
            last = now

            const L = liveRef.current

            // Hover eases toward its target over the transition's duration; a
            // click fires a pulse that decays over roughly the same window.
            // Both live only in the loop, so a dial change never fights a live
            // gesture, and neither needs a re-render.
            const transDur =
                typeof L.int.transition?.duration === "number" &&
                L.int.transition.duration > 0
                    ? L.int.transition.duration
                    : 0.4
            hoverAmtRef.current +=
                (hoverRef.current - hoverAmtRef.current) *
                (1 - Math.exp(-dt / (transDur * 0.5)))
            pulseRef.current *= Math.exp(-dt / (transDur * 0.6))
            if (pulseRef.current < 0.001) pulseRef.current = 0
            const hoverAmt = hoverAmtRef.current
            const pulseAmt = pulseRef.current
            const hoverSpeedFactor =
                1 + hoverAmt * (clamp(L.int.hoverSpeed, 0, 400) / 100 - 1)
            const clickPulseFactor =
                1 + pulseAmt * (clamp(L.int.clickPulse, 0, 400) / 100 - 1)

            const cols = Math.max(3, Math.round(L.columns))
            const rws = Math.max(1, Math.round(L.rows))
            const lyrs = Math.max(1, Math.round(L.hol.layers))

            const g = geomRef.current
            if (g.rows !== rws || g.columns !== cols || g.layers !== lyrs) {
                rebuild(rws, cols, lyrs)
            }

            cycles = (cycles + dt * ((L.speed * hoverSpeedFactor) / SPEED_REFERENCE)) % 1
            angle =
                (angle + dt * ((L.spin * Math.PI) / 180)) % (Math.PI * 2)

            const arc = (2 * Math.PI) / cols
            const step = (SHIFT0 * arc) / (1 + arc)
            const shift = SHIFT0 - cycles * step

            const eye: Vec3 = [
                0,
                L.cam.cameraHeight,
                L.distance - hoverAmt * (L.distance * 0.15),
            ]
            const view = lookAt(eye, LOOK_AT, [0, 1, 0])
            const modelView = multiply(view, rotationY(angle))
            const proj = perspective(
                clamp(L.cam.perspective, 5, 175),
                Math.max(cssW, 1) / Math.max(cssH, 1)
            )

            const stops = [L.color, ...(Array.isArray(L.colors) ? L.colors : [])].slice(
                0,
                MAX_COLORS
            )
            const colorCount = Math.max(1, stops.length)
            const colorsFlat = new Float32Array(MAX_COLORS * 3)
            for (let i = 0; i < MAX_COLORS; i++) {
                const c = parseColor(stops[i % colorCount], [1, 1, 1])
                colorsFlat[i * 3] = c[0]
                colorsFlat[i * 3 + 1] = c[1]
                colorsFlat[i * 3 + 2] = c[2]
            }
            const bg = parseColor(L.background, [0, 0, 0])

            gl.useProgram(program)
            gl.bindVertexArray(vao)
            gl.uniformMatrix4fv(U.projection, false, proj)
            gl.uniformMatrix4fv(U.modelView, false, modelView)
            gl.uniform1f(U.arc, arc)
            gl.uniform1f(U.shift, shift)
            gl.uniform1f(U.phase, cycles)
            gl.uniform1f(U.seam, (SHIFT0 - shift) * arc)
            gl.uniform1f(U.depth, (Math.max(0, L.hol.depth) / 100) * clickPulseFactor)
            gl.uniform1f(U.falloff, L.hol.falloff)
            gl.uniform1f(U.wave, (Math.max(0, L.wav.wave) / 100) * clickPulseFactor)
            gl.uniform1f(U.ripple, Math.max(0, L.wav.ripple) / 100)
            gl.uniform3fv(U.colors, colorsFlat)
            gl.uniform1i(U.colorCount, colorCount)
            gl.uniform1f(U.colorSpread, Math.max(0.0001, L.colorSpread))
            gl.uniform3f(U.background, bg[0], bg[1], bg[2])
            gl.uniform1f(
                U.thickness,
                clamp((clamp(L.thickness, 0, 49) / 100) * (1 + pulseAmt * 0.4), 0, 0.5)
            )

            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
            gl.drawElementsInstanced(
                gl.TRIANGLES,
                box.index.length,
                gl.UNSIGNED_SHORT,
                0,
                instances
            )

            raf = requestAnimationFrame(tick)
        }

        raf = requestAnimationFrame(tick)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            // Never loseContext(): getContext returns the same context for a
            // canvas, so StrictMode's mount → cleanup → mount would reuse a
            // force-lost one and render black (rule 6).
            geomRef.current = { rows: -1, columns: -1, layers: -1 }
        }
    }, [])

    const handlePointerEnter = () => {
        hoverRef.current = 1
    }
    const handlePointerLeave = () => {
        hoverRef.current = 0
    }
    const handlePointerDown = () => {
        pulseRef.current = 1
    }

    return (
        <div
            ref={rootRef}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
            onPointerDown={handlePointerDown}
            style={{
                // Floor before the spread, so an explicit size on the instance
                // still wins and Fit Content cannot collapse the root to 0×0.
                minWidth: 1200,
                minHeight: 800,
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                cursor: "pointer",
                // Also a uniform: the boxes' interiors are painted with it so
                // they occlude, and they must match what is behind them.
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
                }}
            />
        </div>
    )
}
