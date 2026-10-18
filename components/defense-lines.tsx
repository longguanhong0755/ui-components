"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * DefenseLines — a field of thin vertical filaments rising through the frame,
 * lit by a soft vertical band that runs down the middle.
 *
 * There is no light source and no blur. Every filament reads its own distance
 * from a FOCUS POINT and uses that one number four ways at once: it grows up to
 * five times longer, it brightens, its red washes out toward white, and it
 * speeds up. Nothing else changes across the frame. That single coupling is why
 * the centre band reads as a beam of attention rather than as a gradient laid
 * over the top -- the filaments are not being lit, they are behaving differently
 * where the focus is.
 *
 * The falloff is deliberately lopsided: horizontal distance can take a filament
 * to zero on its own, while vertical distance only ever scales it between 0.4
 * and 1.0. That is what makes the bright region a vertical BAND spanning the
 * full height rather than a round hotspot, and it is the difference between this
 * and a radial gradient.
 *
 * Each filament is drawn as two quads, not one, because its gradient has three
 * stops -- transparent, lit, transparent. One quad can only interpolate between
 * its two ends and would fade the whole length in a single direction. The split
 * at the midpoint is what puts the light in the middle of the line.
 *
 * What the port changed, and why:
 *
 *  - The source is Canvas 2D and calls createLinearGradient() once PER LINE PER
 *    FRAME -- a hundred gradient objects a frame, allocated and thrown away.
 *    This is one WebGL draw call: the ramp is a vertex attribute and the colour
 *    is resolved in the fragment shader, so nothing is allocated in the loop.
 *  - Positions advanced by a fixed step PER FRAME, so the field rose at whatever
 *    rate the display refreshed. Per-second off a measured dt now, and Speed
 *    reads 50 for the shipped rate.
 *  - The canvas sized itself from window.innerWidth/innerHeight, which in Framer
 *    is the browser window rather than the component. Sized from the injected
 *    width/height.
 *  - A line width below one device pixel cannot be rasterized: it either
 *    disappears or snaps to a full pixel and reads twice as heavy. The quad is
 *    widened to one device pixel and its alpha scaled by how much it was
 *    widened, which is what Canvas 2D's antialiasing was doing implicitly for
 *    the source's 0.5px stroke.
 *  - The particle count halved below 768px. A component that resizes itself by
 *    viewport width fights whatever the designer set, so it is one Density dial.
 *  - The light/dark MODE enum only ever swapped two hard-coded reds. The colour
 *    dials already do that, so it is gone rather than duplicated.
 *  - Respawn used Math.random(), so no two renders of the same settings matched.
 *    Seeded, which is also what makes the dial checks in the probe meaningful.
 *
 * The canvas carried a fixed 50% opacity in the page it came from; that is the
 * Lines > Opacity default rather than a hidden constant. The blurred red glow
 * behind it belonged to the hero section, not to this effect, and is not here.
 *
 * Ported from ThreeUI's Defense Lines (Constellation Field / Neuform).
 * INTERACTION HAS BEEN REMOVED: the focus point is pinned to the frame's
 * centre, exactly as the source shipped, with no pointer tracking.
 *
 * DIRECTION IS ALSO AN ADDITION -- the source only ever rose. It rotates the
 * FIELD, not the lines: travel, the wrap edges and the focus falloff are all
 * computed in the field's own two axes, so the lit band keeps running with the
 * filaments instead of staying stuck vertical while they turn. Positions are
 * stored normalized to those axes, which is what lets the angle change without
 * re-seeding. 0 is up, exactly as shipped.
 */

const MAX_DPR = 2
const MAX_DENSITY = 400 // the Density dial's ceiling
// Headroom for the diagonal area compensation below: the field's bounding box is
// up to ~2.1x the screen at 45deg on a 3:2 frame, and Density means lines ON
// SCREEN, so the drawn count has to be able to exceed the dial.
const MAX_LINES = 900
const VERTS_PER_LINE = 12 // two quads: the gradient has three stops
const STRIDE = 5 // x, y, ramp, proximity, opacity

// The source's numbers, kept as named constants.
const LEN_MIN = 20
const LEN_SPREAD = 80
const LEN_GAIN = 4 // length multiplier at full proximity
const SPEED_MIN = 0.2
const SPEED_SPREAD = 0.8
const SPEED_GAIN = 0.5 // extra speed at full proximity
const OPACITY_MIN = 0.05
const OPACITY_SPREAD = 0.2
const OPACITY_GAIN = 2
const BASE_RATE = 1.5 * 60 // the source stepped 1.5px per frame and assumed 60fps
const PROX_Y_FLOOR = 0.4 // vertical distance can only scale between this and 1
const END_TINT = 220 / 255 // the source's end stop is a darker red than its middle

const VERT_SRC = `
precision highp float;

attribute vec2 a_pos;   // pixels, y down from the top
attribute vec3 a_ramp;  // gradient ramp, focus proximity, line opacity

uniform vec2 uRes;

varying float vRamp;
varying float vProx;
varying float vOpacity;

void main(){
  vRamp = a_ramp.x;
  vProx = a_ramp.y;
  vOpacity = a_ramp.z;
  vec2 clip = vec2(a_pos.x / uRes.x * 2.0 - 1.0, 1.0 - a_pos.y / uRes.y * 2.0);
  gl_Position = vec4(clip, 0.0, 1.0);
}
`

const FRAG_SRC = `
precision highp float;

uniform vec3 uBase, uAccent, uEnd;
uniform float uOpacity;

varying float vRamp;
varying float vProx;
varying float vOpacity;

void main(){
  // Colour and alpha ride the SAME ramp, which is what a canvas gradient does
  // between its stops. Fading only the alpha leaves the ends the wrong colour
  // wherever the line crosses something.
  vec3 mid = mix(uBase, uAccent, vProx);
  vec3 col = mix(uEnd, mid, vRamp);
  float a = vOpacity * vRamp * uOpacity;
  gl_FragColor = vec4(col * a, a);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("DefenseLines shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

type RGBA = [number, number, number, number]

function parseColor(input: string | undefined, fb: RGBA): RGBA {
    if (!input) return fb
    const str = String(input).trim()
    if (str.charAt(0) === "#") {
        let hex = str.slice(1)
        if (hex.length === 3 || hex.length === 4) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2] + (hex.length === 4 ? hex[3] + hex[3] : "")
        }
        if (hex.length >= 6) {
            const r = parseInt(hex.slice(0, 2), 16)
            const g = parseInt(hex.slice(2, 4), 16)
            const b = parseInt(hex.slice(4, 6), 16)
            const a = hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r / 255, g / 255, b / 255, a]
        }
        return fb
    }
    const m = str.match(/[\d.]+/g)
    if (m && m.length >= 3) {
        return [
            Math.min(255, parseFloat(m[0])) / 255,
            Math.min(255, parseFloat(m[1])) / 255,
            Math.min(255, parseFloat(m[2])) / 255,
            m.length >= 4 ? Math.min(1, parseFloat(m[3])) : 1,
        ]
    }
    return fb
}

function num(v: unknown, fb: number): number {
    return typeof v === "number" && isFinite(v) ? v : fb
}

function clampN(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v
}

// Seeded, so the same props give the same frame -- a Math.random() respawn cannot
// be diffed across two renders and every dial check becomes a guess.
function mulberry32(seed: number) {
    let a = seed >>> 0
    return () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

type Lines = { width?: number; falloff?: number; opacity?: number }

const LINE_DEFAULTS: Required<Lines> = { width: 1, falloff: 100, opacity: 50 }

interface Props {
    style?: React.CSSProperties
    width?: number
    height?: number
    background?: string
    baseColor?: string
    accentColor?: string
    density?: number
    speed?: number
    direction?: number
    length?: number
    lines?: Lines
}

export default function DefenseLines(props: Props) {
    const {
        style,
        background = "#000000",
        baseColor = "#00FF4B",
        accentColor = "#FFFFFF",
        density = 400,
        speed = 100,
        direction = 169,
        length = 88,
        lines,
        width,
        height,
    } = props

    // A group the designer never opened arrives undefined; spread-merging over a
    // typed literal beats a hand-written ?? chain, where one missed key silently
    // pins a control forever.
    const lines_ = { ...LINE_DEFAULTS, ...(lines || {}) }

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    // Every live input is read from a ref inside the loop. Putting any of them in
    // the effect deps would rebuild the GL context on every colour tweak.
    const vRef = useRef<Record<string, number | string>>({})
    vRef.current = {
        base: baseColor,
        accent: accentColor,
        count: Math.round(clampN(num(density, 100), 8, MAX_DENSITY)),
        speed: clampN(num(speed, 50), 0, 100) / 50,
        direction: clampN(num(direction, 0), 0, 360),
        length: clampN(num(length, 100), 10, 400) / 100,
        lineWidth: clampN(num(lines_.width, 1), 1, 20),
        falloff: clampN(num(lines_.falloff, 100), 20, 300) / 100,
        opacity: clampN(num(lines_.opacity, 50), 0, 100) / 100,
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { alpha: true, antialias: true, depth: false })
        if (!gl) {
            console.error("DefenseLines: WebGL unavailable")
            return
        }

        const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC)
        const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC)
        if (!vs || !fs) return
        const prog = gl.createProgram()
        if (!prog) return
        gl.attachShader(prog, vs)
        gl.attachShader(prog, fs)
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("DefenseLines link:", gl.getProgramInfoLog(prog))
            return
        }
        gl.useProgram(prog)

        const rand = mulberry32(0x5eed17)

        // Per-line state. Allocated for MAX_LINES once, so Density only changes
        // the draw count and never rebuilds a buffer or touches the context.
        // Positions are NORMALIZED to the field's own axes -- na along travel, nb
        // across it, both in [-1, 1]. In pixels they would have to be re-seeded
        // every time Direction or a resize changed the field's extent; normalized,
        // the same numbers re-map themselves and the layout rotates with the field
        // instead of scattering.
        const na = new Float32Array(MAX_LINES)
        const nb = new Float32Array(MAX_LINES)
        const baseLen = new Float32Array(MAX_LINES)
        const baseSpeed = new Float32Array(MAX_LINES)
        const baseOpacity = new Float32Array(MAX_LINES)
        for (let i = 0; i < MAX_LINES; i += 1) {
            na[i] = rand() * 2 - 1
            nb[i] = rand() * 2 - 1
            baseLen[i] = rand() * LEN_SPREAD + LEN_MIN
            baseSpeed[i] = rand() * SPEED_SPREAD + SPEED_MIN
            baseOpacity[i] = rand() * OPACITY_SPREAD + OPACITY_MIN
        }

        const data = new Float32Array(MAX_LINES * VERTS_PER_LINE * STRIDE)
        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW)

        const aPos = gl.getAttribLocation(prog, "a_pos")
        const aRamp = gl.getAttribLocation(prog, "a_ramp")
        gl.enableVertexAttribArray(aPos)
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, STRIDE * 4, 0)
        gl.enableVertexAttribArray(aRamp)
        gl.vertexAttribPointer(aRamp, 3, gl.FLOAT, false, STRIDE * 4, 2 * 4)

        const locs: Record<string, WebGLUniformLocation | null> = {}
        const u = (name: string) => {
            if (!(name in locs)) locs[name] = gl.getUniformLocation(prog, name)
            return locs[name]
        }

        let raf = 0
        let last = performance.now()

        const render = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            const v = vRef.current

            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            const cw = sizeRef.current.w || canvas.clientWidth || 1200
            const ch = sizeRef.current.h || canvas.clientHeight || 800
            const bw = Math.max(1, Math.round(cw * dpr))
            const bh = Math.max(1, Math.round(ch * dpr))
            if (canvas.width !== bw || canvas.height !== bh) {
                canvas.width = bw
                canvas.height = bh
            }
            gl.viewport(0, 0, bw, bh)

            // Focus is pinned to the centre: interaction has been removed, so
            // there is no pointer target to ease toward.
            const cx = bw * 0.5
            const cy = bh * 0.5
            const focusX = cx
            const focusY = cy

            // Direction rotates the FIELD: a is the travel axis (0deg = up, as
            // shipped; 90 = right), b is across it. Everything below works in
            // these two axes.
            const ang = ((v.direction as number) * Math.PI) / 180
            const ax = Math.sin(ang)
            const ay = -Math.cos(ang)
            const bx = -ay
            const by = ax

            // Half-extent of the screen rect along each axis -- its support
            // function. At 0deg these are exactly bh/2 and bw/2, so nothing about
            // the shipped framing moves.
            const ha = (bw * Math.abs(ax) + bh * Math.abs(ay)) * 0.5
            const hb = (bw * Math.abs(bx) + bh * Math.abs(by)) * 0.5

            // Falloff reaches toward the frame EDGE along each axis, which is the
            // distance from the centre to the boundary -- not ha/hb, which are the
            // rect's circumscribed extents and are LARGER than either side at an
            // oblique angle (707px at 45deg on a 1200x800 frame, against 600 and
            // 400 on the axes). Using those made the lit band swell every time the
            // direction left an axis, and the frame read brighter at 45deg for no
            // reason a designer had asked for.
            const reach = (dx: number, dy: number) =>
                Math.min(
                    Math.abs(dx) > 1e-6 ? bw / (2 * Math.abs(dx)) : Infinity,
                    Math.abs(dy) > 1e-6 ? bh / (2 * Math.abs(dy)) : Infinity
                )
            const refAlong = Math.max(1, reach(ax, ay) * (v.falloff as number))
            const refAcross = Math.max(1, reach(bx, by) * (v.falloff as number))

            // The focus point in field axes, relative to the centre. Projecting it
            // is what keeps the band parallel to travel at every angle.
            const fa = (focusX - cx) * ax + (focusY - cy) * ay
            const fb = (focusX - cx) * bx + (focusY - cy) * by

            const lenScale = (v.length as number) * dpr
            const speedScale = (v.speed as number) * dpr

            // Below one device pixel the quad cannot be rasterized, so it is
            // widened and its alpha scaled back by exactly how much -- which is
            // what the source's antialiased 0.5px stroke did implicitly.
            const wantW = (v.lineWidth as number) * dpr * 0.5
            const halfW = Math.max(0.5, wantW)
            const widthAlpha = wantW / halfW

            // Lines spread over the field's BOUNDING BOX, which is bigger than
            // the screen at any angle off the axes -- 2.08x at 45deg on a 3:2
            // frame. Left alone, the same Density reads half as dense diagonally,
            // so the drawn count carries the area ratio and Density keeps meaning
            // lines-on-screen. Ratio is exactly 1 at 0/90/180/270.
            const areaRatio = (4 * ha * hb) / (bw * bh)
            const count = Math.min(MAX_LINES, Math.max(1, Math.round((v.count as number) * areaRatio)))

            // Perpendicular half-width offset -- same for every line.
            const ox = bx * halfW
            const oy = by * halfW

            let o = 0
            for (let i = 0; i < count; i += 1) {
                const la = na[i] * ha
                const lb = nb[i] * hb
                const proxX = Math.max(0, 1 - Math.abs(lb - fb) / refAcross)
                const proxY = Math.max(0, 1 - Math.abs(la - fa) / refAlong)
                // Lopsided on purpose: distance ACROSS travel can zero a filament,
                // distance ALONG it only ever scales it. That is what makes the lit
                // region a band running with the lines and not a round hotspot.
                const prox = proxX * (PROX_Y_FLOOR + proxY * (1 - PROX_Y_FLOOR))

                const len = baseLen[i] * lenScale * (1 + prox * LEN_GAIN)
                const op = Math.min(1, baseOpacity[i] + prox * OPACITY_GAIN) * widthAlpha

                // The head leads at la; the body trails back along -a.
                const hx = cx + ax * la + bx * lb
                const hy = cy + ay * la + by * lb

                // Two quads, split at the midpoint: three gradient stops cannot
                // live on one quad's two ends.
                const quad = (da: number, ra: number, db: number, rb: number) => {
                    const p0x = hx - ax * da
                    const p0y = hy - ay * da
                    const p1x = hx - ax * db
                    const p1y = hy - ay * db
                    const put = (xx: number, yy: number, rr: number) => {
                        data[o] = xx
                        data[o + 1] = yy
                        data[o + 2] = rr
                        data[o + 3] = prox
                        data[o + 4] = op
                        o += STRIDE
                    }
                    put(p0x - ox, p0y - oy, ra)
                    put(p0x + ox, p0y + oy, ra)
                    put(p1x + ox, p1y + oy, rb)
                    put(p0x - ox, p0y - oy, ra)
                    put(p1x + ox, p1y + oy, rb)
                    put(p1x - ox, p1y - oy, rb)
                }
                quad(0, 0, len * 0.5, 1)
                quad(len * 0.5, 1, len, 0)

                na[i] += (baseSpeed[i] * BASE_RATE * (1 + prox * SPEED_GAIN) * speedScale * dt) / ha
                // Tail past the far edge: respawn at the inflow edge, anywhere
                // across it.
                if (na[i] * ha - len > ha) {
                    na[i] = -1
                    nb[i] = rand() * 2 - 1
                }
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, buf)
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, data.subarray(0, count * VERTS_PER_LINE * STRIDE))

            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.disable(gl.DEPTH_TEST)
            gl.enable(gl.BLEND)
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA) // source-over, premultiplied

            const base = parseColor(v.base as string, [1, 0.149, 0.149, 1])
            const acc = parseColor(v.accent as string, [1, 0.855, 0.855, 1])

            gl.uniform2f(u("uRes"), bw, bh)
            gl.uniform1f(u("uOpacity"), v.opacity as number)
            gl.uniform3f(u("uBase"), base[0], base[1], base[2])
            gl.uniform3f(u("uAccent"), acc[0], acc[1], acc[2])
            // The source's outer stop is a darker red than its middle one; derived
            // from Base Color so the two never drift apart.
            gl.uniform3f(u("uEnd"), base[0] * END_TINT, base[1] * END_TINT, base[2] * END_TINT)

            gl.drawArrays(gl.TRIANGLES, 0, count * VERTS_PER_LINE)
            raf = requestAnimationFrame(render)
        }

        raf = requestAnimationFrame(render)

        // Never loseContext(): getContext returns the same context per canvas, so
        // StrictMode's mount -> cleanup -> mount would reuse a force-lost one.
        return () => {
            cancelAnimationFrame(raf)
        }
    }, [])

    return (
        <div
            style={{
                position: "relative",
                overflow: "hidden",
                background,
                isolation: "isolate",
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
