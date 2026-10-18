"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * LeafDrift — leaves blowing across the frame from one side (WebGL).
 *
 * Supersedes FallingCanopy, which framed the page with generated branches. The
 * branches are gone; leaves now enter from ONE edge, chosen by a single
 * Direction dial, and cross the frame.
 *
 * ONE DRAW CALL. Every leaf is two triangles in a single buffer, with position,
 * rotation, size and tint uploaded once per frame. Physics runs on the CPU --
 * a few hundred leaves is nothing to integrate -- and no setState goes anywhere
 * near the loop (rule 10): a rAF calling a setter per leaf would re-render the
 * whole tree sixty times a second.
 *
 * DIRECTION IS THE WHOLE GEOMETRY, NOT A WIND OFFSET. Everything is expressed in
 * the travel frame: a unit vector d for the direction of travel and its
 * perpendicular p. Leaves are BORN on a line perpendicular to d, one frame
 * radius UPWIND of centre, and are recycled once they pass the same radius
 * downwind. So the emitting edge follows the dial for free -- point it right and
 * leaves enter from the left, point it up and they rise from the bottom -- with
 * no per-direction special cases and no edge to pick by hand.
 *
 * The radius is the frame's half DIAGONAL, not its half height. At any angle off
 * the axes the corner is further away than the edge, so a half-height radius
 * would pop leaves into existence inside the visible frame on the diagonals.
 *
 * Direction uses the same compass as Wave Direction elsewhere in this repo:
 * 0 down, 90 right, 180 up, 270 left. Same word, same numbers, so a designer
 * moving between components does not have to re-learn the dial.
 *
 * SPREAD AND SCATTER ARE DIFFERENT THINGS AND BOTH EARN A DIAL. Spread is how
 * WIDE the birth line is -- a narrow stream through one part of the frame, or a
 * full-width curtain. Scatter is how much each leaf's own heading DIVERGES from
 * the dial. Spread with no scatter is a ruled sheet of parallel leaves; scatter
 * with no spread is a fan from a point. Fusing them into one control could only
 * ever give the diagonal of those two, which is rule M's welded dial.
 *
 * Spread 100 spans the diagonal rather than the width, so a curtain stays full
 * at every Direction rather than thinning out on the diagonals.
 *
 * SWAY IS PER-LEAF, TURBULENCE IS A FIELD. Sway is each leaf's own regular
 * side-to-side oscillation as it falls, at its own rate and phase -- the thing
 * a real leaf does. Turbulence is a shared wandering flow that neighbours feel
 * together. One dial for both would make a gust and a flutter the same control.
 *
 * THE LEAF IS AN SDF, NOT A TEXTURE. Width follows W * (1 - y^2)^0.75, which
 * meets at BOTH ends instead of rounding off the way an ellipse would -- that
 * point is most of what reads as a leaf rather than a blob. The midrib is a thin
 * darker band down the centre, faded near the tips where the blade is too narrow
 * to hold one.
 *
 * ANTIALIASING WITHOUT DERIVATIVES. fwidth is the usual way to soften the edge
 * and needs OES_standard_derivatives, which WebGL1 does not guarantee; without
 * the extension AND its pragma the shader fails to compile and nothing renders
 * at all. The leaf's size in pixels is already known in the vertex shader, so
 * the antialias width is computed there exactly and no extension is involved.
 *
 * FLUTTER IS FREE. Brightness is modulated by the leaf's own rotation, so a leaf
 * turning edge-on darkens and reads as catching the light. One cosine, and no
 * separate shimmer dial to add.
 *
 * HOVER. The pointer pushes leaves within Reach, radially with a tangential
 * share folded in so the wake curls rather than exploding symmetrically. It is
 * an ACCELERATION, not a position offset: setting position directly would tear
 * leaves out from under the flow and snap them back on release, while an
 * acceleration lets drag settle them and the field keeps moving as one fluid.
 * Push 0 turns the gesture off -- no separate boolean (rule 1). Bound on window,
 * never the host, so a pointer travelling past still stirs them (rule K).
 *
 * Rule 6 recipe: ONE GL context built in useEffect([]); every live input read
 * from a ref inside a raw rAF loop. Never calls loseContext().
 */

const MAX_DPR = 2 // quality tier, not a design control (rule 10)
const MAX_LEAVES = 1400

// Cut dials, frozen at the values they shipped with (rule 8b). The panel rows
// are gone; the render path is unchanged.
const TRAVEL_AT_50 = 0.55 // world units/sec along Direction at Speed 50
const DRAG = 1.7 // velocity damping, 1/sec
const SPIN_MAX = 2.6 // rad/sec, the fastest a leaf tumbles
const SWIRL = 0.55 // tangential share of the cursor push, folded into Push
const SWAY_RATE = 2.2 // per-leaf oscillation, rad/sec at Sway 100
const LEAF_W = 0.55 // half-width of the leaf profile
const SIZE_JITTER = 0.75 // per-leaf size spread, fraction of the mean

const VERT_LEAF = `
attribute vec2  aCorner;   // -1..1 quad corner
attribute vec2  aPos;
attribute float aAngle;
attribute float aSize;
attribute float aTint;
uniform float uAspect;
uniform float uPxPerUnit;
varying vec2  vUv;
varying float vTint;
varying float vShade;
varying float vAA;
void main() {
    float c = cos(aAngle), s = sin(aAngle);
    vec2 off = vec2(aCorner.x * c - aCorner.y * s, aCorner.x * s + aCorner.y * c) * aSize;
    vec2 p = aPos + off;
    gl_Position = vec4(p.x / max(uAspect, 0.0001), p.y, 0.0, 1.0);
    vUv = aCorner;
    vTint = aTint;
    // Antialias width in vUv units, derived EXACTLY from how many pixels this
    // leaf covers -- no derivatives extension involved.
    vAA = 1.3 / max(aSize * uPxPerUnit, 1.0);
    // Flutter for free: a leaf turning edge-on darkens, which is what reads as
    // catching the light.
    vShade = 0.62 + 0.38 * abs(cos(aAngle));
}
`

const FRAG_LEAF = `
precision mediump float;
uniform vec3 uBase;
uniform vec3 uAccent;
varying vec2  vUv;
varying float vTint;
varying float vShade;
varying float vAA;
void main() {
    // Pointed profile: the exponent makes the width meet at BOTH ends instead
    // of rounding off the way an ellipse would.
    float prof = pow(max(1.0 - vUv.y * vUv.y, 0.0), 0.75) * ${LEAF_W.toFixed(2)};
    float d = abs(vUv.x) - prof;
    float a = 1.0 - smoothstep(-vAA, vAA, d);
    if (a <= 0.003) discard;

    vec3 col = mix(uBase, uAccent, vTint);
    float rib = 1.0 - smoothstep(0.0, 0.045, abs(vUv.x));
    rib *= smoothstep(0.95, 0.55, abs(vUv.y));
    col *= vShade * (1.0 - 0.30 * rib);

    gl_FragColor = vec4(col * a, a);
}
`

/* ------------------------------------------------------------------ helpers */

function hexToRgb(hex: string): [number, number, number] {
    if (typeof hex !== "string") return [0.5, 0.5, 0.5]
    let s = hex.trim()
    const m = s.match(/^rgba?\(([^)]+)\)$/i)
    if (m) {
        const p = m[1].split(",").map((v) => parseFloat(v))
        return [(p[0] || 0) / 255, (p[1] || 0) / 255, (p[2] || 0) / 255]
    }
    s = s.replace("#", "")
    if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2]
    if (s.length === 8) s = s.slice(0, 6)
    if (s.length !== 6) return [0.5, 0.5, 0.5]
    const n = parseInt(s, 16)
    if (!isFinite(n)) return [0.5, 0.5, 0.5]
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("LeafDrift shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

/* --------------------------------------------------------------- component */

interface LeavesGroup {
    size?: number
    spin?: number
    sway?: number
}
interface FlowGroup {
    spread?: number
    scatter?: number
    turbulence?: number
}
interface CursorGroup {
    push?: number
    reach?: number
}

interface Props {
    background: string
    baseColor: string
    accentColor: string
    density: number
    speed: number
    direction: number
    leaves: LeavesGroup
    flow: FlowGroup
    cursor: CursorGroup
    width?: number
    height?: number
    style?: React.CSSProperties
}

// Typed so an omitted optional field is an error here and not at the read site
// (rule 10). A group the designer never opened arrives undefined, so each is
// spread over its defaults rather than reached through a chain of ?? -- one
// missed key in such a chain silently pins a control forever.
const LEAVES_DEFAULTS: Required<LeavesGroup> = { size: 32, spin: 98, sway: 100 }
const FLOW_DEFAULTS: Required<FlowGroup> = { spread: 100, scatter: 0, turbulence: 0 }
const CURSOR_DEFAULTS: Required<CursorGroup> = { push: 200, reach: 80 }

export default function LeafDrift(props: Partial<Props>) {
    const {
        background = "#0E1410",
        baseColor = "#C9702B",
        accentColor = "#E8B23C",
        density = 1400,
        speed = 100,
        direction = 104,
        leaves,
        flow,
        cursor,
        width,
        height,
        style,
    } = props

    const lf = { ...LEAVES_DEFAULTS, ...(leaves || {}) }
    const fw = { ...FLOW_DEFAULTS, ...(flow || {}) }
    const cu = { ...CURSOR_DEFAULTS, ...(cursor || {}) }

    const hostRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    const live = useRef({
        density: 0,
        speed: 0,
        direction: 0,
        leafSize: 0,
        spin: 0,
        sway: 0,
        spread: 0,
        scatter: 0,
        turb: 0,
        push: 0,
        reach: 0,
        bg: [0, 0, 0] as number[],
        base: [1, 1, 1] as number[],
        accent: [1, 1, 1] as number[],
    })

    live.current = {
        density: Math.max(10, Math.min(MAX_LEAVES, Math.round(density))),
        speed,
        // Compass: 0 down, 90 right, 180 up, 270 left.
        direction: (direction * Math.PI) / 180,
        leafSize: lf.size / 1000,
        spin: lf.spin / 100,
        sway: (lf.sway / 100) * 0.5,
        spread: fw.spread / 100,
        scatter: (fw.scatter * Math.PI) / 180,
        turb: fw.turbulence / 100,
        push: (cu.push / 100) * 2.2,
        reach: cu.reach / 100,
        bg: hexToRgb(background),
        base: hexToRgb(baseColor),
        accent: hexToRgb(accentColor),
    }

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return

        const gl = canvas.getContext("webgl", {
            antialias: true,
            alpha: false,
            depth: false,
            // The headless harness reads the buffer back; without this every
            // read is black and looks exactly like a broken shader (rule 11d).
            preserveDrawingBuffer: true,
        }) as WebGLRenderingContext | null
        if (!gl) return

        const vs = compile(gl, gl.VERTEX_SHADER, VERT_LEAF)
        const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_LEAF)
        if (!vs || !fs) return
        const prog = gl.createProgram()
        if (!prog) return
        gl.attachShader(prog, vs)
        gl.attachShader(prog, fs)
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("LeafDrift link:", gl.getProgramInfoLog(prog))
            return
        }
        gl.useProgram(prog)

        const loc = {
            corner: gl.getAttribLocation(prog, "aCorner"),
            pos: gl.getAttribLocation(prog, "aPos"),
            angle: gl.getAttribLocation(prog, "aAngle"),
            size: gl.getAttribLocation(prog, "aSize"),
            tint: gl.getAttribLocation(prog, "aTint"),
            aspect: gl.getUniformLocation(prog, "uAspect"),
            pxPerUnit: gl.getUniformLocation(prog, "uPxPerUnit"),
            base: gl.getUniformLocation(prog, "uBase"),
            accent: gl.getUniformLocation(prog, "uAccent"),
        }

        gl.disable(gl.DEPTH_TEST)
        gl.enable(gl.BLEND)
        // Premultiplied source: the shader outputs colour already multiplied by
        // alpha, which is what keeps the antialiased leaf edge from fringing.
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

        /* ---- leaf state (CPU) ---- */
        const px = new Float32Array(MAX_LEAVES)
        const py = new Float32Array(MAX_LEAVES)
        const vx = new Float32Array(MAX_LEAVES)
        const vy = new Float32Array(MAX_LEAVES)
        const ang = new Float32Array(MAX_LEAVES)
        const spn = new Float32Array(MAX_LEAVES)
        const sz = new Float32Array(MAX_LEAVES)
        const tint = new Float32Array(MAX_LEAVES)
        const scat = new Float32Array(MAX_LEAVES) // own heading offset, -1..1
        const swPh = new Float32Array(MAX_LEAVES) // sway phase
        const swRt = new Float32Array(MAX_LEAVES) // sway rate multiplier
        let seeded = 0

        // Deterministic PRNG: Math.random would reshuffle the whole field on
        // every StrictMode remount, so a given look would never be reproducible.
        let rs = 0xbeef >>> 0
        const rand = () => {
            rs = (rs * 1664525 + 1013904223) >>> 0
            return rs / 4294967296
        }

        const LEAF_STRIDE = 7 // corner.xy, pos.xy, angle, size, tint
        const leafData = new Float32Array(MAX_LEAVES * 6 * LEAF_STRIDE)
        const leafBuf = gl.createBuffer()

        // Everything is expressed in the travel frame: d is the direction of
        // travel, p its perpendicular. Leaves are born one frame radius UPWIND
        // and retired one radius downwind, so the emitting edge follows the dial
        // with no per-direction special cases.
        const respawn = (i: number, dx: number, dy: number, R: number, spreadHalf: number, firstFill: boolean) => {
            const pxp = dy
            const pyp = -dx
            const along = firstFill ? (rand() * 2 - 1) * R : -R
            const across = (rand() * 2 - 1) * spreadHalf
            px[i] = dx * along + pxp * across
            py[i] = dy * along + pyp * across
            vx[i] = 0
            vy[i] = 0
            ang[i] = rand() * Math.PI * 2
            spn[i] = (rand() * 2 - 1) * SPIN_MAX
            sz[i] = 1 - SIZE_JITTER * 0.5 + SIZE_JITTER * rand()
            tint[i] = rand()
            scat[i] = rand() * 2 - 1
            swPh[i] = rand() * Math.PI * 2
            swRt[i] = 0.6 + rand() * 0.9
        }

        /* ---- sizing ---- */
        let bufW = 0
        let bufH = 0
        let aspect = 1
        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            // clientWidth, never getBoundingClientRect -- the rect carries the
            // Framer canvas zoom and the buffer would resize on zoom (rule G).
            const bw = Math.max(1, Math.round((canvas.clientWidth || host.clientWidth || 1) * dpr))
            const bh = Math.max(1, Math.round((canvas.clientHeight || host.clientHeight || 1) * dpr))
            if (bw === bufW && bh === bufH) return
            bufW = bw
            bufH = bh
            aspect = bw / bh
            canvas.width = bw
            canvas.height = bh
            gl.viewport(0, 0, bw, bh)
        }
        const ro = new ResizeObserver(resize)
        ro.observe(host)
        resize()

        /* ---- pointer ---- */
        let curX = 0
        let curY = 0
        let engaged = false
        const onMove = (e: PointerEvent) => {
            const r = host.getBoundingClientRect()
            // The rect only locates the pointer WITHIN the host; offset and size
            // carry the same canvas zoom, so the ratio divides it out.
            if (r.width <= 0 || r.height <= 0) return
            const m = Math.min(r.width, r.height)
            curX = (e.clientX - r.left - r.width * 0.5) / m
            curY = -(e.clientY - r.top - r.height * 0.5) / m
            engaged = true
        }
        // On window: a pointer travelling past should still stir the leaves, and
        // one that leaves mid-gesture must not strand the field (rule K).
        window.addEventListener("pointermove", onMove)

        /* ---- loop ---- */
        let clock = 0
        let last = 0
        let raf = 0

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const rawDt = last ? Math.min(0.05, (now - last) / 1000) : 0
            last = now
            const L = live.current
            const dt = rawDt * (L.speed / 50)
            clock += dt

            resize()

            // Compass: 0 down, 90 right, 180 up, 270 left. y is up, so 0 is -y.
            const dx = Math.sin(L.direction)
            const dy = -Math.cos(L.direction)
            const ppx = dy
            const ppy = -dx
            // Half DIAGONAL, not half height: off the axes the corner is further
            // away than the edge, and a half-height radius would pop leaves into
            // existence inside the visible frame on the diagonals.
            const R = Math.hypot(aspect, 1) + 0.12
            const spreadHalf = L.spread * Math.hypot(aspect, 1)

            const n = L.density
            for (let i = seeded; i < n; i++) respawn(i, dx, dy, R, spreadHalf, true)
            if (n > seeded) seeded = n

            const reach2 = L.reach * L.reach
            const travel = TRAVEL_AT_50 * 2

            let w = 0
            for (let i = 0; i < n; i++) {
                // Each leaf's own heading, diverging from the dial by Scatter.
                const a = L.direction + scat[i] * L.scatter * 0.5
                const lx = Math.sin(a)
                const ly = -Math.cos(a)

                // Sway: this leaf's own regular oscillation across its heading.
                // Per-leaf and phase-shifted, unlike Turbulence, which is a
                // shared field neighbours feel together.
                const s = Math.sin(clock * SWAY_RATE * swRt[i] + swPh[i]) * L.sway
                // Turbulence: a wandering flow, kept a RATE so Speed scales it.
                const fx = (Math.sin(py[i] * 2.3 + clock * 0.7) * 0.5 + Math.sin(px[i] * 3.1 - clock * 0.5) * 0.25) * L.turb
                const fy = (Math.sin(px[i] * 1.9 - clock * 0.5) * 0.5 + Math.sin(py[i] * 3.7 + clock * 0.6) * 0.25) * L.turb

                let ax = (lx * travel + ppx * s + fx - vx[i]) * DRAG
                let ay = (ly * travel + ppy * s + fy - vy[i]) * DRAG

                if (engaged && L.push > 0) {
                    const ddx = px[i] - curX
                    const ddy = py[i] - curY
                    const d2 = ddx * ddx + ddy * ddy
                    if (d2 < reach2 && d2 > 1e-8) {
                        const d = Math.sqrt(d2)
                        // Smooth falloff, so a leaf crossing the edge of Reach
                        // does not get a discontinuous kick.
                        const f = (1 - d / L.reach) * L.push
                        ax += ((ddx / d) * (1 - SWIRL) + (-ddy / d) * SWIRL) * f
                        ay += ((ddy / d) * (1 - SWIRL) + (ddx / d) * SWIRL) * f
                    }
                }

                vx[i] += ax * dt
                vy[i] += ay * dt
                px[i] += vx[i] * dt
                py[i] += vy[i] * dt
                ang[i] += (spn[i] * L.spin + (vx[i] * ppx + vy[i] * ppy) * 1.6) * dt

                // Retire in the TRAVEL frame, not against the screen box: at any
                // Direction the same test then means the same thing, and a leaf
                // blown far sideways still comes back.
                const along = px[i] * dx + py[i] * dy
                const across = px[i] * ppx + py[i] * ppy
                if (along > R || Math.abs(across) > spreadHalf + R) respawn(i, dx, dy, R, spreadHalf, false)

                const size = sz[i] * L.leafSize
                const cx = px[i]
                const cy = py[i]
                const an = ang[i]
                const ti = tint[i]
                const C = [-1, -1, 1, -1, -1, 1, 1, -1, 1, 1, -1, 1]
                for (let k = 0; k < 6; k++) {
                    leafData[w++] = C[k * 2]
                    leafData[w++] = C[k * 2 + 1]
                    leafData[w++] = cx
                    leafData[w++] = cy
                    leafData[w++] = an
                    leafData[w++] = size
                    leafData[w++] = ti
                }
            }

            gl.clearColor(L.bg[0], L.bg[1], L.bg[2], 1)
            gl.clear(gl.COLOR_BUFFER_BIT)

            gl.useProgram(prog)
            gl.bindBuffer(gl.ARRAY_BUFFER, leafBuf)
            gl.bufferData(gl.ARRAY_BUFFER, leafData.subarray(0, w), gl.DYNAMIC_DRAW)
            const S = LEAF_STRIDE * 4
            gl.enableVertexAttribArray(loc.corner)
            gl.vertexAttribPointer(loc.corner, 2, gl.FLOAT, false, S, 0)
            gl.enableVertexAttribArray(loc.pos)
            gl.vertexAttribPointer(loc.pos, 2, gl.FLOAT, false, S, 8)
            gl.enableVertexAttribArray(loc.angle)
            gl.vertexAttribPointer(loc.angle, 1, gl.FLOAT, false, S, 16)
            gl.enableVertexAttribArray(loc.size)
            gl.vertexAttribPointer(loc.size, 1, gl.FLOAT, false, S, 20)
            gl.enableVertexAttribArray(loc.tint)
            gl.vertexAttribPointer(loc.tint, 1, gl.FLOAT, false, S, 24)
            gl.uniform1f(loc.aspect, aspect)
            // y spans -1..1 across the buffer height, so this is the scale from
            // world units to device pixels.
            gl.uniform1f(loc.pxPerUnit, bufH * 0.5)
            gl.uniform3fv(loc.base, L.base)
            gl.uniform3fv(loc.accent, L.accent)
            gl.drawArrays(gl.TRIANGLES, 0, n * 6)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            window.removeEventListener("pointermove", onMove)
            // No loseContext(): getContext returns the same context per canvas,
            // so StrictMode's mount/cleanup/mount would reuse a force-lost one
            // and render black (rule 6).
        }
    }, [])

    return (
        <div
            ref={hostRef}
            style={{
                position: "relative",
                overflow: "hidden",
                background,
                // Floor BEFORE the style spread: the canvas is absolutely
                // positioned, so the root has no in-flow content and would
                // collapse to a dot under Framer's Fit Content sizing.
                minWidth: 1200,
                minHeight: 800,
                width: typeof width === "number" && width > 0 ? width : "100%",
                height: typeof height === "number" && height > 0 ? height : "100%",
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
