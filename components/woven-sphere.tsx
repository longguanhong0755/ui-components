"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/* ---------------------------------------------------------------- constants */

const TAU = Math.PI * 2
const FOV = 40 // vertical field of view, degrees
const DPR_CAP = 2
const MAX_POINTS = 260000

// Depth and Thickness are percents of this MUCH of the ribbon's own width —
// so 100% is a half-round strand. They have to scale with the ribbon and not
// with the sphere: pinned to the radius instead, raising Bands turns the same
// numbers from a flat weave into a field of spikes.
const RELIEF = 0.5
// A ribbon's full width in world units at Bands = N. Family A is the bands of
// constant b, and Δb = 1 is Δ(u,v) = (½, -½), i.e. Δφ = π/N and Δθ = π/2M with
// M = N/2 — the two are equal, so the width is π·√2/N.
const ribbonWidth = (bands: number) => (Math.PI * Math.SQRT2) / bands
// Spin rate, radians/sec, at Speed 50 — the rate the scene shipped at.
const SPIN_AT_50 = 0.22
// Polar decimation: samples below this latitude are thinned by sin θ / this, so
// the converging longitudes never pile into a hot blob. sin 35°.
const POLE_SIN = Math.sin((35 * Math.PI) / 180)
// A hair of cap around the exact singular point, in cell units.
const POLE_CAP = 0.02
// Normal probe step, in cell units. Must stay well inside the ribbon's half
// width so the two neighbours cannot cross a ⌊b⌋ flip.
const NORMAL_EPS = 0.008

// Drag 100 = one full revolution per canvas width of horizontal travel.
// Measured against the CANVAS, not a fixed px rate, so the same setting means
// the same gesture at any size.
const DRAG_TURN = TAU
// Fling decay after release, 1/sec — higher stops sooner — and a cap on the
// flung rate so a fast flick cannot spin the ball into a smear.
const FLING_DECAY = 2.2
const FLING_MAX = 6 // rad/sec
// Snap the fling to rest once the travel it has LEFT is negligible. An
// exponential never reaches zero, and cutting on the rate instead leaves the
// ball creeping for seconds after it looks stopped. Remaining travel of a decay
// is v/FLING_DECAY, so this cutoff is a hundredth of a degree of arc still owed.
const FLING_REST = (FLING_DECAY * Math.PI) / 180 / 100

// Camera distance at Scale 100 — the framing the scene shipped at.
const REF_DIST = 3.8
// Scale is the ball's on-screen radius as a percent of its radius at Scale 100.
// Silhouette half-angle for radius R at distance d is focal·R/√(d²−R²); holding
// that proportional to k and solving for d gives the line below. Exact at every
// relief setting, unlike the 1/d approximation.
const cameraDist = (k: number, R: number) => {
    const inner = Math.max(REF_DIST * REF_DIST - R * R, 0.01)
    // Never let the camera inside the ball, however far Scale is pushed.
    return Math.max(R * 1.05, Math.sqrt(R * R + inner / (k * k)))
}

/* Cut dials, frozen at the values they shipped with (rule 8b). The panel rows
 * are gone; the render path is unchanged. */
const CAMERA_FOV = FOV
const DOT_FLOOR = 0.1 // silhouette dots shrink toward this, never to nothing
// The whole Camera group is cut. Both angles are frozen at the values they
// shipped with, and the rotZ/rotX are still in the shader — nothing renders
// differently, there is just no panel row. Tilt 15 keeps both poles near the
// silhouette, where the lat/long convergence hides.
const ROLL = 0
const TILT = 15

/* ------------------------------------------------------------------ shaders */

// One point per lattice site.
//   aAB.x = a, aAB.y = b  (the sheared ribbon coordinates, in cell units)
//   aRnd  = per-point hash 0..1, drives the accent share
const VERT = `
precision highp float;

attribute vec2  aAB;
attribute float aRnd;

uniform vec2  uRes;
uniform float uN;       // Bands — longitude cells, the weave's period in u
uniform float uM;       // latitude cells (uN * 0.5, so cells are square)
uniform float uD;       // over/under amplitude, world units
uniform float uT;       // ribbon cross-section bulge, world units
uniform float uW;       // ribbon width, 0..1 of a cell
uniform float uSpin;
uniform float uTilt;
uniform float uRoll;
uniform float uDist;
uniform float uFocal;
uniform float uDot;     // dot radius at facing 1, world units
uniform float uAccent;  // 0..1 share taking the accent colour

varying float vAcc;

const float PI  = 3.14159265359;
const float TAU = 6.28318530718;

// A ribbon is not a sine. Its top is FLAT — that is what puts a broad patch of
// big, separated dots in the middle of every tile — and its sides fall away
// steeply, which is what crowds the samples into the bright arc at the fold.
// Both profiles are the same plateau, |x|^3 rolled off a flat crown:
//   crown(s) — across the ribbon, 1 at the centreline, 0 at either edge
//   ride(c)  — along it, ±1 while it sits over/under a crossing, diving fast
//              between. Feed it cos() so the sign flips every crossing.
// Neither clamps: the normal's two neighbours step outside the band and must
// stay on the same smooth branch or the normal snaps at every tile edge.
float crown(float s){ float t = 2.0 * s - 1.0; return 1.0 - t * t * t * (t > 0.0 ? 1.0 : -1.0); }
float ride(float c){ float m = 1.0 - abs(c); return (c >= 0.0 ? 1.0 : -1.0) * (1.0 - m * m * m); }

// The two ribbon families, UNGATED — the band test is a separate thing.
float hA(float a, float b){
    return 1.0 + uD * ride(cos(PI * (a - 0.5 + floor(b))))
               + uT * crown((fract(b) - (0.5 - uW * 0.5)) / uW);
}
float hB(float a, float b){
    return 1.0 - uD * ride(cos(PI * (b - 0.5 + floor(a))))
               + uT * crown((fract(a) - (0.5 - uW * 0.5)) / uW);
}

// Unit sphere direction for a sheared coordinate pair.
vec3 dirOf(float a, float b){
    float u = (a + b) * 0.5;
    float v = (a - b) * 0.5;
    float phi = u / uN * TAU;
    float th  = clamp(v / uM, 0.0, 1.0) * PI;
    float st  = sin(th);
    return vec3(st * cos(phi), cos(th), st * sin(phi));
}
vec3 posA(float a, float b){ return dirOf(a, b) * hA(a, b); }
vec3 posB(float a, float b){ return dirOf(a, b) * hB(a, b); }

mat3 rotY(float t){ float c = cos(t), s = sin(t); return mat3( c, 0.0, -s,  0.0, 1.0, 0.0,   s, 0.0, c); }
mat3 rotX(float t){ float c = cos(t), s = sin(t); return mat3(1.0, 0.0, 0.0, 0.0,   c,   s, 0.0,  -s, c); }
mat3 rotZ(float t){ float c = cos(t), s = sin(t); return mat3( c,   s, 0.0,  -s,   c, 0.0, 0.0, 0.0, 1.0); }

void main(){
    float a = aAB.x;
    float b = aAB.y;

    float hw = uW * 0.5;
    bool inA = abs(fract(b) - 0.5) <= hw;
    bool inB = abs(fract(a) - 0.5) <= hw;

    // Inside neither ribbon: the gap. Park it off-screen at zero size.
    if (!inA && !inB) {
        gl_Position  = vec4(2.0, 2.0, 2.0, 1.0);
        gl_PointSize = 0.0;
        return;
    }

    // Pick the family that is on top here, then stay on it for the normal.
    vec3 p, pa, pb;
    if (inA && (!inB || hA(a, b) >= hB(a, b))) {
        p  = posA(a, b);
        pa = posA(a + ${NORMAL_EPS.toFixed(4)}, b);
        pb = posA(a, b + ${NORMAL_EPS.toFixed(4)});
    } else {
        p  = posB(a, b);
        pa = posB(a + ${NORMAL_EPS.toFixed(4)}, b);
        pb = posB(a, b + ${NORMAL_EPS.toFixed(4)});
    }

    vec3 cr = cross(pa - p, pb - p);
    // Degenerate at the poles, where dirOf collapses — fall back to radial.
    vec3 n = length(cr) > 1e-9 ? normalize(cr) : normalize(p);
    if (dot(n, p) < 0.0) n = -n;

    mat3 R  = rotZ(uRoll) * rotX(uTilt) * rotY(uSpin);
    vec3 pe = R * p;
    vec3 ne = R * n;

    vec3 toCam  = normalize(vec3(0.0, 0.0, uDist) - pe);
    float facing = dot(ne, toCam);

    // Back-facing points are culled outright. The depth buffer alone will not
    // do it: the dots are sparse, so the far hemisphere would show through the
    // gaps between the near one's dots.
    if (facing <= 0.0) {
        gl_Position  = vec4(2.0, 2.0, 2.0, 1.0);
        gl_PointSize = 0.0;
        return;
    }

    float d = max(uDist - pe.z, 0.05);
    vec2 ndc = vec2(pe.x, pe.y) * uFocal / d;
    ndc.x *= uRes.y / uRes.x;

    float near = max(0.05, uDist - 2.0);
    float far  = uDist + 2.0;
    gl_Position = vec4(ndc, ((d - near) / (far - near)) * 2.0 - 1.0, 1.0);

    float pxPerUnit = uRes.y * 0.5 * uFocal / d;
    float shrink = max(facing, ${DOT_FLOOR.toFixed(3)});
    gl_PointSize = clamp(2.0 * uDot * shrink * pxPerUnit, 0.0, 64.0);

    vAcc = step(1.0 - uAccent, aRnd);
}
`

const FRAG = `
precision mediump float;

uniform vec3 uBase;
uniform vec3 uAccentCol;

varying float vAcc;

void main(){
    vec2 q = gl_PointCoord - 0.5;
    float r = length(q) * 2.0;
    float a = 1.0 - smoothstep(0.72, 1.0, r);
    if (a <= 0.004) discard;
    vec3 c = mix(uBase, uAccentCol, vAcc);
    // Premultiplied — the context is premultipliedAlpha:true so the CSS
    // background shows through the gaps between the dots.
    gl_FragColor = vec4(c * a, a);
}
`

/* -------------------------------------------------------------- glsl helpers */

function compile(
    gl: WebGLRenderingContext,
    type: number,
    src: string,
    label: string
): WebGLShader {
    const sh = gl.createShader(type)!
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn(`WovenSphere ${label}:`, gl.getShaderInfoLog(sh))
    }
    return sh
}

// #rgb / #rrggbb / #rrggbbaa / rgb() / rgba(), to 0..1 RGB plus alpha.
function parseColor(input?: string): [number, number, number, number] {
    if (!input) return [1, 1, 1, 1]
    const s = input.trim()
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4)
            h = h
                .split("")
                .map((c) => c + c)
                .join("")
        const n = parseInt(h.slice(0, 6), 16)
        const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
        return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, a]
    }
    const m = s.match(/rgba?\(([^)]+)\)/i)
    if (m) {
        const p = m[1].split(",").map((x) => parseFloat(x))
        return [(p[0] || 0) / 255, (p[1] || 0) / 255, (p[2] || 0) / 255, p.length > 3 ? p[3] : 1]
    }
    return [1, 1, 1, 1]
}

// Deterministic hash so the accent share and the polar decimation are stable
// across rebuilds — a Math.random() here makes every Density nudge reshuffle
// which dots are accented.
function hash2(i: number, j: number): number {
    let h = (i * 374761393 + j * 668265263) | 0
    h = (h ^ (h >>> 13)) | 0
    h = Math.imul(h, 1274126177) | 0
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/* -------------------------------------------------------------------- props */

type WeaveGroup = { bands: number; depth: number; thickness: number; width: number }

const WEAVE_DEFAULTS: WeaveGroup = { bands: 18, depth: 80, thickness: 95, width: 92 }

type Props = {
    background?: string
    baseColor?: string
    accentColor?: string
    accentMix?: number
    density?: number
    dotSize?: number
    speed?: number
    direction?: "cw" | "ccw"
    scale?: number
    drag?: number
    weave?: Partial<WeaveGroup>
    width?: number
    height?: number
    style?: React.CSSProperties
}

/* ---------------------------------------------------------------- component */

export default function WovenSphere(props: Props) {
    const {
        background = "#000000",
        baseColor = "#ffffff",
        accentColor = "#FFF900",
        accentMix = 0,
        density = 4,
        dotSize = 30,
        speed = 100,
        direction = "cw",
        scale = 67,
        drag = 200,
        weave,
        style,
    } = props

    // A group the designer never opened arrives undefined, and one opened before
    // a field existed arrives missing that field — spread-merge over a typed
    // literal rather than a ?? chain, which is where one missed key silently
    // pins a control forever.
    const wv: WeaveGroup = { ...WEAVE_DEFAULTS, ...(weave ?? {}) }

    const bands = Math.max(4, Math.round(wv.bands))
    const latBands = Math.max(2, Math.round(bands / 2))
    const K = Math.max(2, Math.round(density))

    const [br, bg, bb] = parseColor(baseColor)
    const [ar, ag, ab] = parseColor(accentColor)

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const live = useRef({
        bands,
        latBands,
        K,
        depth: wv.depth,
        thickness: wv.thickness,
        width: wv.width,
        dotSize,
        // Speed is unsigned; Direction carries the sign. Positive yaw turns the
        // ball counterclockwise seen from ABOVE, down the spin axis.
        speed: Math.max(0, speed),
        spinDir: direction === "ccw" ? 1 : -1,
        scale: Math.max(1, scale) / 100,
        drag,
        accentMix,
        base: [br, bg, bb] as [number, number, number],
        accent: [ar, ag, ab] as [number, number, number],
    })
    live.current = {
        bands,
        latBands,
        K,
        depth: wv.depth,
        thickness: wv.thickness,
        width: wv.width,
        dotSize,
        speed: Math.max(0, speed),
        spinDir: direction === "ccw" ? 1 : -1,
        scale: Math.max(1, scale) / 100,
        drag,
        accentMix,
        base: [br, bg, bb],
        accent: [ar, ag, ab],
    }

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return

        const gl = canvas.getContext("webgl", {
            alpha: true,
            antialias: false,
            premultipliedAlpha: true,
            depth: true,
        }) as WebGLRenderingContext | null
        if (!gl) return

        const prog = gl.createProgram()!
        gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT, "vert"))
        gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG, "frag"))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.warn("WovenSphere link:", gl.getProgramInfoLog(prog))
            return
        }
        gl.useProgram(prog)

        const aAB = gl.getAttribLocation(prog, "aAB")
        const aRnd = gl.getAttribLocation(prog, "aRnd")
        const U = (n: string) => gl.getUniformLocation(prog, n)
        const u = {
            res: U("uRes"),
            n: U("uN"),
            m: U("uM"),
            d: U("uD"),
            t: U("uT"),
            w: U("uW"),
            spin: U("uSpin"),
            tilt: U("uTilt"),
            roll: U("uRoll"),
            dist: U("uDist"),
            focal: U("uFocal"),
            dot: U("uDot"),
            accent: U("uAccent"),
            base: U("uBase"),
            accentCol: U("uAccentCol"),
        }

        /* ---- lattice buffer (rebuilt when Bands or Density change) ---- */
        const buf = gl.createBuffer()!
        let count = 0
        let builtKey = ""
        // The sample spacing at the equator, half of it being the dot radius at
        // Dot Size 100%. Kept per build so Dot Size means the same coverage at
        // every Bands / Density.
        let refRadius = 0.02

        const build = (N: number, M: number, Kin: number) => {
            // 2·N·M·K² sites; step K down rather than let the count run away.
            let k = Kin
            while (2 * N * M * k * k > MAX_POINTS && k > 2) k--

            const data: number[] = []
            const maxIA = Math.ceil((N + M) * k)
            const minIB = -Math.ceil(M * k)
            const maxIB = Math.ceil(N * k)
            for (let ia = 0; ia <= maxIA; ia++) {
                for (let ib = minIB; ib <= maxIB; ib++) {
                    const a = ia / k
                    const b = ib / k
                    const uu = (a + b) * 0.5
                    const vv = (a - b) * 0.5
                    if (uu < 0 || uu >= N) continue
                    if (vv < POLE_CAP || vv > M - POLE_CAP) continue
                    const th = (vv / M) * Math.PI
                    const keep = Math.min(1, Math.sin(th) / POLE_SIN)
                    const h = hash2(ia, ib)
                    if (keep < 1 && h > keep) continue
                    data.push(a, b, hash2(ib, ia))
                }
            }
            count = data.length / 3
            gl.bindBuffer(gl.ARRAY_BUFFER, buf)
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW)
            refRadius = (0.5 * Math.PI * Math.SQRT2) / (k * N)
            builtKey = `${N}|${M}|${Kin}`
        }

        /* ---- GL state ---- */
        gl.enable(gl.DEPTH_TEST)
        gl.depthFunc(gl.LEQUAL)
        gl.enable(gl.BLEND)
        // Premultiplied source-over: hard dots, correct occlusion, nothing blooms.
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
        gl.clearColor(0, 0, 0, 0)

        /* ---- sizing ---- */
        let dpr = 1
        const resize = () => {
            dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
            // clientWidth, never the width/height props: those are not numeric
            // in the Framer preview and the buffer comes out 0×0.
            const cssW = canvas.clientWidth || host.clientWidth || 0
            const cssH = canvas.clientHeight || host.clientHeight || 0
            const w = Math.max(1, Math.round(cssW * dpr))
            const h = Math.max(1, Math.round(cssH * dpr))
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w
                canvas.height = h
            }
            gl.viewport(0, 0, w, h)
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(canvas)

        /* ---- drag ---- */
        // Yaw from the gesture lives in its own accumulator beside the autospin
        // one, so the two compose instead of overwriting each other. Vertical
        // travel is not read at all — the ball turns about its polar axis only.
        let dragYaw = 0 // radians
        let flingVel = 0 // rad/sec, decaying after release
        let dragging = false
        let lastX = 0
        let lastMoveT = 0

        const sens = () => Math.max(0, live.current.drag) / 100

        const onDown = (e: PointerEvent) => {
            if (sens() <= 0) return
            dragging = true
            flingVel = 0
            lastX = e.clientX
            // performance.now(), not e.timeStamp: coalesced moves can share a
            // timestamp, and the fling velocity then divides by zero-ish.
            lastMoveT = performance.now()
            host.style.cursor = "grabbing"
        }
        const onMove = (e: PointerEvent) => {
            if (!dragging) return
            const s = sens()
            // clientWidth, never getBoundingClientRect — the rect carries the
            // Framer canvas zoom and the gesture would drift on a zoomed canvas.
            const cw = canvas.clientWidth || 1
            const dx = e.clientX - lastX
            lastX = e.clientX

            const dYaw = (dx / cw) * DRAG_TURN * s
            dragYaw += dYaw

            const now = performance.now()
            const dt = (now - lastMoveT) / 1000
            lastMoveT = now
            // Blended, not raw: one event's rate is jittery, and a blend also
            // means a few still frames before release settle it to zero, so
            // holding the ball still and letting go does not fling it.
            if (dt > 0.001) flingVel = flingVel * 0.25 + (dYaw / dt) * 0.75
        }
        const onUp = () => {
            if (!dragging) return
            dragging = false
            flingVel = Math.max(-FLING_MAX, Math.min(FLING_MAX, flingVel))
            host.style.cursor = sens() > 0 ? "grab" : "default"
        }

        host.addEventListener("pointerdown", onDown)
        // Move and release on window: a pointer that leaves the component
        // mid-drag would otherwise never release (rule K).
        window.addEventListener("pointermove", onMove)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        /* ---- loop ---- */
        const focal = 1 / Math.tan(((CAMERA_FOV * Math.PI) / 180) * 0.5)
        let spin = 0
        let last = 0
        let raf = 0

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last ? Math.min(0.05, (now - last) / 1000) : 0
            last = now
            const L = live.current

            const key = `${L.bands}|${L.latBands}|${L.K}`
            if (key !== builtKey) build(L.bands, L.latBands, L.K)
            if (!count) return

            // 50 is the rate the scene shipped at; Direction carries the sign.
            spin += dt * (L.speed / 50) * SPIN_AT_50 * L.spinDir
            if (spin > TAU) spin -= TAU
            if (spin < -TAU) spin += TAU

            // Fling coasts the drag yaw after release, then hands back to the
            // autospin. Wrap the accumulator: unbounded it eventually costs
            // float32 precision in the shader's trig.
            if (!dragging && flingVel !== 0) {
                dragYaw += flingVel * dt
                flingVel *= Math.exp(-FLING_DECAY * dt)
                if (Math.abs(flingVel) < FLING_REST) flingVel = 0
            }
            if (dragYaw > TAU) dragYaw -= TAU
            if (dragYaw < -TAU) dragYaw += TAU

            const cursor = L.drag > 0 ? (dragging ? "grabbing" : "grab") : "default"
            if (host.style.cursor !== cursor) host.style.cursor = cursor

            resize()
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
            gl.useProgram(prog)

            gl.bindBuffer(gl.ARRAY_BUFFER, buf)
            gl.enableVertexAttribArray(aAB)
            gl.vertexAttribPointer(aAB, 2, gl.FLOAT, false, 12, 0)
            gl.enableVertexAttribArray(aRnd)
            gl.vertexAttribPointer(aRnd, 1, gl.FLOAT, false, 12, 8)

            gl.uniform2f(u.res, canvas.width, canvas.height)
            gl.uniform1f(u.n, L.bands)
            gl.uniform1f(u.m, L.latBands)
            const rw = ribbonWidth(L.bands)
            const relD = (L.depth / 100) * RELIEF * rw
            const relT = (L.thickness / 100) * RELIEF * rw
            gl.uniform1f(u.d, relD)
            gl.uniform1f(u.t, relT)
            gl.uniform1f(u.w, Math.max(0.05, L.width / 100))
            gl.uniform1f(u.spin, spin + dragYaw)
            gl.uniform1f(u.tilt, (TILT * Math.PI) / 180)
            gl.uniform1f(u.roll, (ROLL * Math.PI) / 180)
            // hA/hB peak at 1 + Depth + Thickness, so that IS the ball's outer
            // radius — feeding the real value keeps Scale meaning the same
            // on-screen size at every relief setting.
            gl.uniform1f(u.dist, cameraDist(L.scale, 1 + relD + relT))
            gl.uniform1f(u.focal, focal)
            gl.uniform1f(u.dot, refRadius * (L.dotSize / 100))
            gl.uniform1f(u.accent, L.accentMix / 100)
            gl.uniform3fv(u.base, L.base)
            gl.uniform3fv(u.accentCol, L.accent)

            gl.drawArrays(gl.POINTS, 0, count)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            host.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointermove", onMove)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
            // No loseContext(): getContext returns the same context per canvas,
            // so StrictMode's mount/cleanup/mount would reuse a force-lost one.
        }
    }, [])

    return (
        <div
            ref={hostRef}
            style={{
                // Floor BEFORE the style spread: the canvas is absolutely
                // positioned, so the root has no in-flow content and would
                // collapse to a dot under Framer's Fit Content sizing.
                minWidth: 1200,
                minHeight: 800,
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                background,
                // A touch drag must turn the ball, not scroll the page.
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
