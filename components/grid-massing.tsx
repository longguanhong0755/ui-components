"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const MAX_DPR = 2 // quality tier, not a design control (rule 10)
const MAX_STEPS = 96 // matches the shader's loop bound

// Motif geometry the dials do not reach, in cell units (rule 11b). These
// numbers are not free, and two separate measurements pin them.
//
// The cluster has to be COMPACT enough that the cell corner is genuinely open
// air. A motif spanning most of its cell puts the eye a few hundredths of a
// cell from a face, and that one face then fills half the frame.
//
// It also has to be SPARSE enough that most rays reach the fog before they
// reach a block. Measured over a screenful of rays at the shipped defaults:
// 53% of the frame is true black and about 40 separate faces carry the
// picture, which is the reference's balance. A cluster in every cell at twice
// this scale gives 24% black and over a hundred faces -- a wall of clutter that
// no amount of fog fixes, because the clutter sits two to five cells out.
const COL_X0 = 0.35
const COL_Z0 = 0.35
const COL_Y0 = 0.19
const COL_H = 0.63
const RIGHT_W = 0.29
const RIGHT_D = 0.31
const RIGHT_Z0 = 0.34
const RIGHT_YF = 0.42 // up the column, as a fraction of its height
const LEFT_W = 0.22
const LEFT_D = 0.26
const LEFT_Z0 = 0.22
const LEFT_YF = 0.1
const LEFT_THIN = 0.8 // the lower ledge is thinner than the upper one

// The eye sits at the cell corner, the point farthest from every neighbouring
// cluster. Its x is inboard of every box's x-min at every dial setting, so it
// stays in clear air at any Height.
const EYE_X = 0.02
const EYE_Z = 0.02

// Height maps 0-100 onto this span of cell units. The default puts the eye
// INSIDE the column band rather than above it. Above the tops, every
// near-horizontal ray escapes the lattice at once and the horizon opens as a
// clean black slab straight across the frame -- the reference has no such
// band, and columns straddling the eye are what close it.
const EYE_Y_LO = -0.5
const EYE_Y_HI = 1.5

// Distance is whole numbers (rule 3) but the fog wants 1.5 cells, so the dial
// is in quarter-cells and divided here. One unit is a quarter of a lattice cell.
const FAR_PER_UNIT = 0.25

// How far the pointer moves the camera at Hover 100.
const YAW_SWING = 18 // degrees, each way
const LIFT_SWING = 0.45 // cell units, each way

const DAMP_RATE = 14 // 1/s at Damping 100

const VERT_SRC = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`

const FRAG_SRC = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;
uniform vec3  uEye;
uniform vec3  uFwd;
uniform vec3  uRight;
uniform float uTanHalf;
uniform float uDensity;
uniform float uLineW;
uniform float uFar;
uniform vec3  uLine;
uniform vec3  uBoxMin[3];
uniform vec3  uBoxMax[3];

const vec3 UP = vec3(0.0, 1.0, 0.0);

// Nearest forward entry into any of the cell's three boxes. ro is the ray
// origin expressed relative to the cell corner. A negative tNear means the eye
// is INSIDE that box, and the box is skipped rather than drawn from within.
bool hitCell(vec3 ro, vec3 rd, vec3 inv, out float tHit, out vec3 nrm) {
    tHit = 1e9;
    nrm = vec3(0.0);
    bool got = false;
    for (int i = 0; i < 3; i++) {
        vec3 a = (uBoxMin[i] - ro) * inv;
        vec3 b = (uBoxMax[i] - ro) * inv;
        vec3 lo = min(a, b);
        vec3 hi = max(a, b);
        float tn = max(max(lo.x, lo.y), lo.z);
        float tf = min(min(hi.x, hi.y), hi.z);
        if (tf >= tn && tn > 1e-5 && tn < tHit) {
            tHit = tn;
            got = true;
            if (lo.x > lo.y && lo.x > lo.z) nrm = vec3(rd.x > 0.0 ? -1.0 : 1.0, 0.0, 0.0);
            else if (lo.y > lo.z)           nrm = vec3(0.0, rd.y > 0.0 ? -1.0 : 1.0, 0.0);
            else                            nrm = vec3(0.0, 0.0, rd.z > 0.0 ? -1.0 : 1.0);
        }
    }
    return got;
}

void main() {
    vec2 ndc = (gl_FragCoord.xy * 2.0 - uRes) / uRes.y;

    vec3 rdU = uFwd * (1.0 / uTanHalf) + uRight * ndc.x + UP * ndc.y;
    float L = length(rdU);
    vec3 rd = rdU / L;

    // Per-pixel perturbation of the normalised direction, for the analytic
    // footprint below. The unnormalised ray moves by right or up times 2/resY
    // per pixel; projecting that off rd and dividing by L normalises it.
    float px = 2.0 / uRes.y;
    vec3 ex = (uRight - rd * dot(uRight, rd)) * (px / L);
    vec3 ey = (UP - rd * dot(UP, rd)) * (px / L);

    vec3 srd = vec3(rd.x >= 0.0 ? 1.0 : -1.0, rd.y >= 0.0 ? 1.0 : -1.0, rd.z >= 0.0 ? 1.0 : -1.0);
    vec3 sd = srd * max(abs(rd), vec3(1e-5));
    vec3 inv = 1.0 / sd;
    vec3 tDelta = abs(inv);

    vec3 cell = floor(uEye);
    vec3 tMax = ((cell + max(srd, 0.0)) - uEye) * inv;

    float bestT = -1.0;
    vec3 bestN = vec3(0.0);

    for (int i = 0; i < 96; i++) {
        float th;
        vec3 nn;
        if (hitCell(uEye - cell, sd, inv, th, nn)) {
            bestT = th;
            bestN = nn;
            break;
        }
        float m = min(tMax.x, min(tMax.y, tMax.z));
        if (m > uFar * 3.0) break;
        if (tMax.x == m) { cell.x += srd.x; tMax.x += tDelta.x; }
        else if (tMax.y == m) { cell.y += srd.y; tMax.y += tDelta.y; }
        else { cell.z += srd.z; tMax.z += tDelta.z; }
    }

    if (bestT < 0.0) {
        gl_FragColor = vec4(0.0);
        return;
    }

    vec3 P = uEye + sd * bestT;

    float dn = dot(rd, bestN);
    dn = (dn < 0.0 ? -1.0 : 1.0) * max(abs(dn), 1e-4);
    vec3 Fx = (ex - rd * (dot(ex, bestN) / dn)) * bestT;
    vec3 Fy = (ey - rd * (dot(ey, bestN) / dn)) * bestT;

    vec3 an = abs(bestN);
    vec2 uv, fx, fy;
    if (an.x > 0.5)      { uv = P.yz; fx = Fx.yz; fy = Fy.yz; }
    else if (an.y > 0.5) { uv = P.xz; fx = Fx.xz; fy = Fy.xz; }
    else                 { uv = P.xy; fx = Fx.xy; fy = Fy.xy; }

    uv *= uDensity;
    vec2 w = max(sqrt(fx * fx + fy * fy) * uDensity, vec2(1e-6));

    vec2 d = abs(fract(uv + 0.5) - 0.5) / w;
    float hw = uLineW * 0.5;
    vec2 a = vec2(1.0) - smoothstep(vec2(max(hw - 0.5, 0.0)), vec2(hw + 0.5), d);

    // Fade a line out once its own pitch approaches the pixel grid, so the far
    // field thins instead of aliasing into moire.
    vec2 lod = smoothstep(vec2(1.5), vec2(3.5), 1.0 / w);

    float line = max(a.x * lod.x, a.y * lod.y);
    float alpha = line * exp(-bestT / uFar);

    gl_FragColor = vec4(uLine * alpha, alpha);
}
`

function num(v: unknown, fb: number): number {
    return typeof v === "number" && isFinite(v) ? v : fb
}

function parseColor(input: string | undefined, fb: [number, number, number]): [number, number, number] {
    if (!input) return fb
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
        return fb
    }
    const m = str.match(/[\d.]+/g)
    if (m && m.length >= 3) {
        return [
            Math.min(255, parseFloat(m[0])) / 255,
            Math.min(255, parseFloat(m[1])) / 255,
            Math.min(255, parseFloat(m[2])) / 255,
        ]
    }
    return fb
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("GridMassing shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

// Every box bound lands on a whole grid line, so a block silhouette IS a grid
// line and needs no separate edge pass. Extents are floored at one grid cell so
// a coarse Density can never collapse a box to zero thickness.
function snapBoxes(density: number, column: number, ledge: number): { min: Float32Array; max: Float32Array } {
    const g = 1 / density
    const q = (x: number) => Math.round(x * density) * g
    const span = (a: number, b: number): [number, number] => {
        const lo = q(a)
        let hi = q(b)
        if (hi <= lo) hi = lo + g
        return [lo, hi]
    }
    const cw = column / 100
    const lt = ledge / 100

    const [cx0, cx1] = span(COL_X0, COL_X0 + cw)
    const [cz0, cz1] = span(COL_Z0, COL_Z0 + cw)
    const [cy0, cy1] = span(COL_Y0, COL_Y0 + COL_H)

    const [rx0, rx1] = span(cx1, cx1 + RIGHT_W)
    const [ry0, ry1] = span(COL_Y0 + COL_H * RIGHT_YF, COL_Y0 + COL_H * RIGHT_YF + lt)
    const [rz0, rz1] = span(RIGHT_Z0, RIGHT_Z0 + RIGHT_D)

    const [lx0, lx1] = span(COL_X0 - LEFT_W, COL_X0)
    const [ly0, ly1] = span(COL_Y0 + COL_H * LEFT_YF, COL_Y0 + COL_H * LEFT_YF + lt * LEFT_THIN)
    const [lz0, lz1] = span(LEFT_Z0, LEFT_Z0 + LEFT_D)

    return {
        min: new Float32Array([cx0, cy0, cz0, rx0, ry0, rz0, lx0, ly0, lz0]),
        max: new Float32Array([cx1, cy1, cz1, rx1, ry1, rz1, lx1, ly1, lz1]),
    }
}

type CameraGroup = { height?: number; yaw?: number }
type PointerGroup = { hover?: number; damping?: number }
type FieldGroup = { column?: number; ledge?: number }

interface GridMassingProps {
    style?: React.CSSProperties
    background?: string
    baseColor?: string
    density?: number
    lineWidth?: number
    distance?: number
    perspective?: number
    camera?: CameraGroup
    pointer?: PointerGroup
    field?: FieldGroup
    width?: number
    height?: number
}

const D_CAMERA: Required<CameraGroup> = { height: 50, yaw: 24 }
const D_POINTER: Required<PointerGroup> = { hover: 100, damping: 30 }
const D_FIELD: Required<FieldGroup> = { column: 26, ledge: 12 }

export default function GridMassing(props: GridMassingProps) {
    const {
        style,
        background = "#000000",
        baseColor = "#FFFFFF",
        density = 60,
        lineWidth = 6,
        distance = 13,
        perspective = 120,
        camera,
        pointer,
        field,
        width,
        height,
    } = props

    const gCamera = { ...D_CAMERA, ...(camera ?? {}) }
    const gPointer = { ...D_POINTER, ...(pointer ?? {}) }
    const gField = { ...D_FIELD, ...(field ?? {}) }

    const canvasRef = useRef<HTMLCanvasElement>(null)

    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    // Pointer target in [0,1]^2, and the eased value the camera actually uses.
    const targetRef = useRef({ x: 0.5, y: 0.5 })
    const easeRef = useRef({ x: 0.5, y: 0.5 })
    // Nothing animates on its own, so the loop needs to be told when a prop
    // changed. Set on every React render; cleared once the frame is drawn.
    const dirtyRef = useRef(true)
    dirtyRef.current = true

    const vRef = useRef({
        line: [0.863, 0.863, 0.863] as [number, number, number],
        density: 24,
        lineWidth: 1,
        far: 6 * FAR_PER_UNIT,
        tanHalf: Math.tan((60 * Math.PI) / 360),
        height: 50,
        yaw: 24,
        hover: 1,
        damping: 0.3,
        boxes: snapBoxes(24, 26, 12),
    })
    vRef.current = {
        line: parseColor(baseColor, [0.863, 0.863, 0.863]),
        density: Math.max(1, Math.round(num(density, 24))),
        lineWidth: Math.max(1, num(lineWidth, 1)),
        far: Math.max(1, num(distance, 6)) * FAR_PER_UNIT,
        tanHalf: Math.tan((Math.min(150, Math.max(10, num(perspective, 60))) * Math.PI) / 360),
        height: num(gCamera.height, 50),
        yaw: num(gCamera.yaw, 24),
        hover: Math.max(0, num(gPointer.hover, 100)) / 100,
        damping: Math.min(1, Math.max(0.01, num(gPointer.damping, 30) / 100)),
        boxes: snapBoxes(
            Math.max(1, Math.round(num(density, 24))),
            num(gField.column, 26),
            num(gField.ledge, 12)
        ),
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", {
            antialias: false,
            alpha: true,
            depth: false,
            premultipliedAlpha: true,
        })
        if (!gl) {
            console.error("GridMassing: WebGL unavailable")
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
            console.error("GridMassing link:", gl.getProgramInfoLog(prog))
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
            eye: gl.getUniformLocation(prog, "uEye"),
            fwd: gl.getUniformLocation(prog, "uFwd"),
            right: gl.getUniformLocation(prog, "uRight"),
            tanHalf: gl.getUniformLocation(prog, "uTanHalf"),
            densityU: gl.getUniformLocation(prog, "uDensity"),
            lineW: gl.getUniformLocation(prog, "uLineW"),
            far: gl.getUniformLocation(prog, "uFar"),
            line: gl.getUniformLocation(prog, "uLine"),
            boxMin: gl.getUniformLocation(prog, "uBoxMin[0]"),
            boxMax: gl.getUniformLocation(prog, "uBoxMax[0]"),
        }

        gl.clearColor(0, 0, 0, 0)

        let raf = 0
        let last = performance.now()

        const render = (now: number) => {
            raf = requestAnimationFrame(render)
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            const v = vRef.current

            const tgt = targetRef.current
            const es = easeRef.current
            const k = 1 - Math.exp(-dt * v.damping * DAMP_RATE)
            const moving = Math.abs(tgt.x - es.x) + Math.abs(tgt.y - es.y) > 2e-4
            if (moving) {
                es.x += (tgt.x - es.x) * k
                es.y += (tgt.y - es.y) * k
            } else {
                es.x = tgt.x
                es.y = tgt.y
            }

            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            const cw = sizeRef.current.w || canvas.clientWidth || 1200
            const ch = sizeRef.current.h || canvas.clientHeight || 800
            const bw = Math.max(1, Math.round(cw * dpr))
            const bh = Math.max(1, Math.round(ch * dpr))
            const resized = canvas.width !== bw || canvas.height !== bh
            if (resized) {
                canvas.width = bw
                canvas.height = bh
                gl.viewport(0, 0, bw, bh)
            }

            if (!moving && !resized && !dirtyRef.current) return
            dirtyRef.current = false

            const yawDeg = v.yaw + (es.x - 0.5) * 2 * v.hover * YAW_SWING
            const yaw = (yawDeg * Math.PI) / 180
            const lift = (0.5 - es.y) * 2 * v.hover * LIFT_SWING
            const eyeY = EYE_Y_LO + (Math.min(100, Math.max(0, v.height)) / 100) * (EYE_Y_HI - EYE_Y_LO) + lift

            gl.uniform2f(u.res, bw, bh)
            gl.uniform3f(u.eye, EYE_X, eyeY, EYE_Z)
            gl.uniform3f(u.fwd, Math.sin(yaw), 0, Math.cos(yaw))
            gl.uniform3f(u.right, Math.cos(yaw), 0, -Math.sin(yaw))
            gl.uniform1f(u.tanHalf, v.tanHalf)
            gl.uniform1f(u.densityU, v.density)
            gl.uniform1f(u.lineW, v.lineWidth)
            gl.uniform1f(u.far, v.far)
            gl.uniform3f(u.line, v.line[0], v.line[1], v.line[2])
            gl.uniform3fv(u.boxMin, v.boxes.min)
            gl.uniform3fv(u.boxMax, v.boxes.max)

            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }

        raf = requestAnimationFrame(render)
        return () => cancelAnimationFrame(raf)
    }, [])

    return (
        <div
            onPointerMove={(e) => {
                const r = e.currentTarget
                const w = r.offsetWidth || 1
                const h = r.offsetHeight || 1
                const box = r.getBoundingClientRect()
                // offsetWidth/Height carry no canvas zoom; the rect only supplies
                // the origin, and the ratio below cancels its scale out.
                targetRef.current = {
                    x: Math.min(1, Math.max(0, (e.clientX - box.left) / (box.width || w))),
                    y: Math.min(1, Math.max(0, (e.clientY - box.top) / (box.height || h))),
                }
            }}
            onPointerLeave={() => {
                targetRef.current = { x: 0.5, y: 0.5 }
            }}
            style={{
                position: "relative",
                overflow: "hidden",
                background,
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
