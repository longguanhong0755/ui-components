"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

// Never a static render outside Framer.
const useIsStaticRenderer = () => false

/**
 * WireTerrainScan — WireTerrain as a LiDAR capture: the landscape is a cloud
 * of round, depth-sized points over a faint ghost of the grid, and a scan
 * front sweeps outward from the camera, swelling and heating every point it
 * passes before they cool back into the cloud.
 *
 * Variation 3 of 3 on 15/WireTerrain.tsx. Inherited verbatim: the one static
 * lattice with the camera-relative wrap, the z-tiled value-noise heights and
 * the flat valley, the hidden-line fill, the fog, the sun at infinity through
 * the camera rotation, the pointer steering with idle sway. Changed:
 *
 *  - POINTS: the lattice also builds one vertex per node, drawn as GL_POINTS.
 *    gl_PointSize is DOT_PX * Dot Size * dpr / view z, so points shrink with
 *    distance like everything else in the frame; the fragment shader rounds
 *    them with gl_PointCoord. They depth-test against the same hidden-line
 *    fill, so a ridge hides the points behind it.
 *  - The grid lines stay, at GHOST alpha, so the cloud keeps its structure,
 *    and light up where the scan front crosses them, so the sweep reads as a
 *    line across the grid as well as a band of hot points.
 *  - A point sprite has one depth, so the slope rising toward the camera
 *    below it hid its lower half. Points are drawn at POINT_PULL of their
 *    view position — the same pixel, 3% nearer — which clears their own
 *    slope and is far too little to let a ridge stop hiding them.
 *  - SCAN: a front at distance scanZ = (t * SCAN_RATE) mod FOG_FAR, measured
 *    from the camera along z. Each point's boost is exp(-|z - scanZ| /
 *    SCAN_WIDTH), computed in the vertex shader: it swells the point by up to
 *    2.2x and heats its colour toward Accent. Speed drives both flight and
 *    scan, so Speed 0 freezes the capture.
 *  - Dot Size is a new dial. Panel: 10.
 *
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */

/* ------------------------------------------------------------------ constants */

const DEPTH = 60 // world units of lattice along z; noise periods divide it
const HALF_X = 64 // lattice half-width
const BACK = 10 // lattice kept behind the camera so a yawed view never sees the wrap
const FOG_NEAR = 14
const FOG_FAR = 46 // < DEPTH − BACK, so the recycle happens at alpha 0
const FLIGHT_RATE = 4 // world units / s at Speed 50
const EYE_HEIGHT = 1.7
const RIDGE = 4.2 // ridge amplitude at Relief 100
const VALLEY = 3 // half-width of the flat valley floor
const FOV = (58 * Math.PI) / 180
const SUN_ELEV = 0.02 // sun centre direction (0, e, 1)
const SUN_RADIUS = 0.22 // × host height at Sun Size 100
const BASE_PITCH = (6.5 * Math.PI) / 180
const STEER_YAW = (11 * Math.PI) / 180 // at Hover 100, pointer at an edge
const STEER_LIFT = 0.8 // eye height change at Hover 100, pointer at top/bottom
const DPR_CAP = 2
const DEG = Math.PI / 180
const DOT_PX = 60 // point diameter in CSS px at view depth 1, Dot Size 100
const GHOST = 0.14 // grid line alpha under the points
const SCAN_RATE = 9 // world units/s the scan front travels at Speed 50
const SCAN_WIDTH = 2.4 // world units, e-folding half-width of the front
const POINT_PULL = 0.97 // view-ray scale for points: same pixel, nearer depth

/* ---------------------------------------------------------------------- utils */

type RGBA = [number, number, number, number]
const colorCache = new Map<string, RGBA>()

/* ControlType.Color can hand back hex, rgb()/rgba(), hsl() or a token wrapped
 * in var(--x, <literal>). Unwrap var() first, then let a 1x1 2D canvas resolve
 * whatever CSS colour remains. */
function parseColor(input: string | undefined, fallback: RGBA): RGBA {
    if (!input) return fallback
    const hit = colorCache.get(input)
    if (hit) return hit
    let s = input.trim()
    const v = /^var\(\s*--[^,]+,\s*(.+)\)$/.exec(s)
    if (v) s = v[1].trim()
    if (typeof document === "undefined") return fallback
    const cv = document.createElement("canvas")
    cv.width = cv.height = 1
    const ctx = cv.getContext("2d", { willReadFrequently: true })
    if (!ctx) return fallback
    ctx.fillStyle = "#010203"
    ctx.fillStyle = s
    if (ctx.fillStyle === "#010203" && s.toLowerCase() !== "#010203") return fallback
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillRect(0, 0, 1, 1)
    const d = ctx.getImageData(0, 0, 1, 1).data
    const out: RGBA = [d[0], d[1], d[2], d[3] / 255]
    colorCache.set(input, out)
    return out
}

/* ------------------------------------------------------------------- shaders */

const TERRAIN_VERT = `
precision highp float;
attribute vec3 aP; // x, anchor z, dz
uniform float uCamZ;
uniform vec3 uCam; // x, y (z is uCamZ, applied via the wrap)
uniform vec3 uR0;
uniform vec3 uR1;
uniform vec3 uR2;
uniform vec4 uProj; // fx, fy, A, B
uniform float uAmp;
uniform vec2 uNudge;
uniform float uPoint; // DOT_PX * Dot Size * dpr
uniform float uScan;  // scan front distance along z
uniform float uMode;  // 1 while drawing points
varying float vFog;
varying float vDist;
varying float vScan;

float hash(vec2 c) {
    return fract(sin(dot(c, vec2(127.1, 311.7))) * 43758.5453);
}
float vnoise(vec2 p, float period) {
    vec2 i = floor(p);
    vec2 f = p - i;
    vec2 u = f * f * (3.0 - 2.0 * f);
    float z0 = mod(i.y, period);
    float z1 = mod(i.y + 1.0, period);
    float a = hash(vec2(i.x, z0));
    float b = hash(vec2(i.x + 1.0, z0));
    float c = hash(vec2(i.x, z1));
    float d = hash(vec2(i.x + 1.0, z1));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float height(float x, float z) {
    // periods: ${DEPTH}/6, ${DEPTH}/3, ${DEPTH}/1.5 — all whole
    float n = vnoise(vec2(x, z) / 6.0, ${(DEPTH / 6).toFixed(1)}) * 0.6
            + vnoise(vec2(x, z) / 3.0, ${(DEPTH / 3).toFixed(1)}) * 0.27
            + vnoise(vec2(x, z) / 1.5, ${(DEPTH / 1.5).toFixed(1)}) * 0.13;
    float ax = abs(x);
    float side = smoothstep(${VALLEY.toFixed(1)}, ${(VALLEY + 13).toFixed(1)}, ax);
    return uAmp * (side * (pow(n, 1.6) * 2.1 + 0.55 * ax / ${HALF_X.toFixed(1)}) + 0.1 * (n - 0.5));
}

void main() {
    float relA = mod(aP.y - uCamZ + ${BACK.toFixed(1)}, ${DEPTH.toFixed(1)}) - ${BACK.toFixed(1)};
    float zr = relA + aP.z;
    float h = height(aP.x, uCamZ + zr);
    vec3 q = vec3(aP.x - uCam.x, h - uCam.y, zr);
    vec3 v = vec3(dot(uR0, q), dot(uR1, q), dot(uR2, q));
    // A point sprite has ONE depth, so the slope rising toward the camera
    // below it would hide its lower half. Scaling the view position along
    // its own ray keeps the pixel and pulls the depth nearer.
    if (uMode > 0.5) v *= ${POINT_PULL.toFixed(3)};
    float dist = length(vec2(q.x * 0.55, zr));
    vDist = dist;
    vFog = 1.0 - smoothstep(${FOG_NEAR.toFixed(1)}, ${FOG_FAR.toFixed(1)}, dist);
    gl_Position = vec4(v.x * uProj.x, v.y * uProj.y, uProj.z * v.z + uProj.w, v.z);
    gl_Position.xy += uNudge * v.z;
    vScan = exp(-abs(zr - uScan) / ${SCAN_WIDTH.toFixed(2)});
    gl_PointSize = max(uPoint / max(v.z, 0.05), 1.0) * (1.0 + 1.2 * vScan);
}
`

const TERRAIN_FRAG = `
precision highp float;
uniform vec4 uColor;
uniform vec3 uHot;    // scan colour (Accent)
uniform float uSolid; // 1 for the hidden-line fill: opaque until the far edge
uniform float uMode;  // 1 for points: round them, let the scan heat them
varying float vFog;
varying float vDist;
varying float vScan;
void main() {
    if (uMode > 0.5) {
        vec2 pc = gl_PointCoord - 0.5;
        if (dot(pc, pc) > 0.25) discard;
    }
    float fillFog = 1.0 - smoothstep(${(FOG_FAR - 5).toFixed(1)}, ${FOG_FAR.toFixed(1)}, vDist);
    float a = uColor.a * mix(vFog, fillFog, uSolid);
    // Points heat fully; the ghost grid lights up as a scan LINE; the fill
    // never heats.
    float heat = vScan * mix(0.8 * (1.0 - uSolid), 1.0, uMode);
    vec3 c = mix(uColor.rgb, uHot, heat);
    float boost = mix(4.0, 1.0, uMode);
    gl_FragColor = vec4(c, clamp(a * (1.0 + heat * boost), 0.0, 1.0));
}
`

const SKY_VERT = `
attribute vec3 aP;
void main() { gl_Position = vec4(aP.xy, 0.0, 1.0); }
`

const SKY_FRAG = `
precision highp float;
uniform vec2 uRes;    // buffer px
uniform vec3 uUp;     // world-y of the view axes (R0.y, R1.y, R2.y)
uniform vec2 uFocal;  // fx, fy
uniform vec3 uSun;    // centre xy buffer px (y up), radius buffer px
uniform float uBandT;
uniform vec3 uBg;
uniform vec4 uAccent;

void main() {
    vec2 p = gl_FragCoord.xy;
    vec2 ndc = p / uRes * 2.0 - 1.0;
    vec3 ray = vec3(ndc.x / uFocal.x, ndc.y / uFocal.y, 1.0);
    float worldY = dot(uUp, ray) / length(ray);
    // horizon cut, ~1 buffer px soft
    float pxPerRad = uRes.y * 0.5 * uFocal.y;
    float above = clamp(worldY * pxPerRad + 0.5, 0.0, 1.0);

    vec3 col = uBg;
    float R = max(uSun.z, 1.0);
    vec2 dv = p - uSun.xy;
    float d = length(dv);

    // haze: a low wide glow, strongest along the horizon
    float halo = exp(-max(d - R, 0.0) / (R * 0.9)) * 0.16;
    col = mix(col, uAccent.rgb, halo * uAccent.a * (0.35 + 0.65 * above));

    // disc
    float disc = clamp(R - d + 0.5, 0.0, 1.0);
    float yy = (uSun.y - p.y) / R; // -1 top, +1 bottom
    float period = max(R * 0.11, 3.0);
    float s = fract((uSun.y - p.y) / period + uBandT) * period;
    float cut = clamp((yy + 0.3) * 0.5, 0.0, 0.8) * period;
    float band = yy > -0.3 ? clamp(s - cut + 0.5, 0.0, 1.0) : 1.0;
    vec3 sunTop = mix(uAccent.rgb, vec3(1.0, 0.93, 0.78), 0.32);
    vec3 sunCol = mix(sunTop, uAccent.rgb * 0.9, clamp(yy * 0.5 + 0.5, 0.0, 1.0));
    // no horizon cut on the disc: the ground stops short of the horizon, and
    // cutting there left a strip of bare Background under the sun. The
    // hidden-line fill occludes it instead, so it sits behind the ridges.
    col = mix(col, sunCol, disc * band * uAccent.a);

    gl_FragColor = vec4(col, 1.0);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("WireTerrainScan shader: " + gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

function link(gl: WebGLRenderingContext, vs: string, fs: string): WebGLProgram | null {
    const v = compile(gl, gl.VERTEX_SHADER, vs)
    const f = compile(gl, gl.FRAGMENT_SHADER, fs)
    if (!v || !f) return null
    const prog = gl.createProgram()
    if (!prog) return null
    gl.attachShader(prog, v)
    gl.attachShader(prog, f)
    // one attribute slot shared by both programs (WebGL1 enables are global)
    gl.bindAttribLocation(prog, 0, "aP")
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error("WireTerrainScan link: " + gl.getProgramInfoLog(prog))
        return null
    }
    return prog
}

/* ------------------------------------------------------------------ lattice */

function buildLattice(rows: number) {
    const s = DEPTH / rows
    const nx = Math.max(2, 2 * Math.round(HALF_X / s))
    const tris = new Float32Array(nx * rows * 18)
    const lines = new Float32Array(nx * rows * 12)
    const points = new Float32Array(nx * rows * 3)
    let t = 0
    let l = 0
    let n = 0
    for (let j = 0; j < rows; j++) {
        const z0 = j * s
        for (let i = 0; i < nx; i++) {
            // half-cell offset: no column at exactly x = 0
            const x0 = -HALF_X + (i + 0.5) * s
            const x1 = x0 + s
            tris.set([x0, z0, 0, x1, z0, 0, x1, z0, s, x0, z0, 0, x1, z0, s, x0, z0, s], t)
            t += 18
            lines.set([x0, z0, 0, x1, z0, 0, x0, z0, 0, x0, z0, s], l)
            l += 12
            points.set([x0, z0, 0], n)
            n += 3
        }
    }
    return { tris, lines, points }
}

/* ---------------------------------------------------------------- component */

interface Props {
    background?: string
    lineColor?: string
    accent?: string
    density?: number
    speed?: number
    relief?: number
    sunSize?: number
    cameraHeight?: number
    hover?: number
    dotSize?: number
    style?: React.CSSProperties
}

const DEFAULTS = {
    background: "#04110F",
    lineColor: "#5FE8C8",
    accent: "#FF7A45",
    density: 80,
    speed: 50,
    relief: 250,
    sunSize: 0,
    cameraHeight: 100,
    hover: 100,
    dotSize: 100,
}

export default function WireTerrainScan(props: Props) {
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef(props)
    propsRef.current = props
    const isStatic = useIsStaticRenderer()
    const staticRef = useRef(isStatic)
    staticRef.current = isStatic

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const gl = canvas.getContext("webgl", { antialias: true, alpha: false, depth: true }) as WebGLRenderingContext | null
        if (!gl) return

        const terrain = link(gl, TERRAIN_VERT, TERRAIN_FRAG)
        const sky = link(gl, SKY_VERT, SKY_FRAG)
        if (!terrain || !sky) return
        const tu = {
            camZ: gl.getUniformLocation(terrain, "uCamZ"),
            cam: gl.getUniformLocation(terrain, "uCam"),
            r0: gl.getUniformLocation(terrain, "uR0"),
            r1: gl.getUniformLocation(terrain, "uR1"),
            r2: gl.getUniformLocation(terrain, "uR2"),
            proj: gl.getUniformLocation(terrain, "uProj"),
            amp: gl.getUniformLocation(terrain, "uAmp"),
            nudge: gl.getUniformLocation(terrain, "uNudge"),
            color: gl.getUniformLocation(terrain, "uColor"),
            point: gl.getUniformLocation(terrain, "uPoint"),
            scan: gl.getUniformLocation(terrain, "uScan"),
            hot: gl.getUniformLocation(terrain, "uHot"),
            mode: gl.getUniformLocation(terrain, "uMode"),
            solid: gl.getUniformLocation(terrain, "uSolid"),
        }
        const su = {
            res: gl.getUniformLocation(sky, "uRes"),
            up: gl.getUniformLocation(sky, "uUp"),
            focal: gl.getUniformLocation(sky, "uFocal"),
            sun: gl.getUniformLocation(sky, "uSun"),
            bandT: gl.getUniformLocation(sky, "uBandT"),
            bg: gl.getUniformLocation(sky, "uBg"),
            accent: gl.getUniformLocation(sky, "uAccent"),
        }
        const missing = [
            ...Object.entries(tu).filter(([, v]) => !v).map(([k]) => "terrain." + k),
            ...Object.entries(su).filter(([, v]) => !v).map(([k]) => "sky." + k),
        ]
        if (missing.length) {
            console.error("WireTerrainScan: uniform location missing: " + missing.join(", "))
            return
        }

        const quad = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, quad)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), gl.STATIC_DRAW)
        const triBuf = gl.createBuffer()
        const lineBuf = gl.createBuffer()
        const pointBuf = gl.createBuffer()
        let triCount = 0
        let lineCount = 0
        let pointCount = 0
        let latticeRows = -1
        gl.enableVertexAttribArray(0)
        gl.depthFunc(gl.LEQUAL)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

        let W = 0
        let H = 0
        let dpr = 1
        const resize = () => {
            dpr = Math.min(DPR_CAP, window.devicePixelRatio || 1)
            W = root.offsetWidth || 1200
            H = root.offsetHeight || 800
            const bw = Math.max(1, Math.round(W * dpr))
            const bh = Math.max(1, Math.round(H * dpr))
            if (canvas.width !== bw || canvas.height !== bh) {
                canvas.width = bw
                canvas.height = bh
            }
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(root)

        const pointer = { nx: 0, ny: 0, active: false, presence: 0 }
        const cam = { yaw: 0, roll: 0, lift: 0, init: false }
        let camZ = 0
        let tIdle = 0
        let scanZ = 0
        let raf = 0
        let last = -1

        const frame = (now: number) => {
            const p = propsRef.current
            const background = p.background ?? DEFAULTS.background
            const bg = parseColor(background, [232, 225, 211, 1])
            const line = parseColor(p.lineColor ?? DEFAULTS.lineColor, [43, 41, 38, 1])
            const acc = parseColor(p.accent ?? DEFAULTS.accent, [200, 82, 46, 1])
            const rows = Math.max(10, Math.min(120, Math.round(p.density ?? DEFAULTS.density)))
            const speed = Math.max(0, p.speed ?? DEFAULTS.speed)
            const relief = Math.max(0, p.relief ?? DEFAULTS.relief) / 100
            const sunSize = Math.max(0, p.sunSize ?? DEFAULTS.sunSize) / 100
            const eye = Math.max(0.1, (p.cameraHeight ?? DEFAULTS.cameraHeight) / 100) * EYE_HEIGHT
            const hover = Math.max(0, p.hover ?? DEFAULTS.hover) / 100
            const dotSize = Math.max(0, p.dotSize ?? DEFAULTS.dotSize) / 100

            if (rows !== latticeRows) {
                latticeRows = rows
                const lat = buildLattice(rows)
                gl.bindBuffer(gl.ARRAY_BUFFER, triBuf)
                gl.bufferData(gl.ARRAY_BUFFER, lat.tris, gl.STATIC_DRAW)
                triCount = lat.tris.length / 3
                gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf)
                gl.bufferData(gl.ARRAY_BUFFER, lat.lines, gl.STATIC_DRAW)
                lineCount = lat.lines.length / 3
                gl.bindBuffer(gl.ARRAY_BUFFER, pointBuf)
                gl.bufferData(gl.ARRAY_BUFFER, lat.points, gl.STATIC_DRAW)
                pointCount = lat.points.length / 3
            }

            // clamp the first dt at 0: rAF's first timestamp can precede the effect
            const dt = last < 0 ? 0 : Math.min(0.05, Math.max(0, (now - last) / 1000))
            last = now
            const rate = speed / 50
            camZ = (camZ + dt * rate * FLIGHT_RATE) % DEPTH
            tIdle += dt * rate
            scanZ = (scanZ + dt * rate * SCAN_RATE) % FOG_FAR

            const pe = 1 - Math.exp(-dt * 3)
            pointer.presence += ((pointer.active ? 1 : 0) - pointer.presence) * pe
            if (!pointer.active && pointer.presence < 0.002) pointer.presence = 0
            const k = pointer.presence * Math.min(1, hover)
            const idleYaw = (Math.sin(tIdle * 0.21) * 3 + Math.sin(tIdle * 0.13 + 2) * 1.5) * DEG
            const idleRoll = Math.sin(tIdle * 0.17 + 1) * 1.8 * DEG
            const idleLift = Math.sin(tIdle * 0.11) * 0.12
            const yawT = idleYaw * (1 - k) + pointer.nx * STEER_YAW * hover * k
            const liftT = idleLift * (1 - k) + -pointer.ny * STEER_LIFT * hover * k
            const rollT = idleRoll * (1 - k) - yawT * 0.55 * k
            if (!cam.init) {
                cam.yaw = yawT
                cam.roll = rollT
                cam.lift = liftT
                cam.init = true
            }
            const ce = 1 - Math.exp(-dt * 2.5)
            cam.yaw += (yawT - cam.yaw) * ce
            cam.roll += (rollT - cam.roll) * ce
            cam.lift += (liftT - cam.lift) * ce

            const camY = Math.max(0.35, eye * (1 + cam.lift))
            const pitch = BASE_PITCH + (camY / EYE_HEIGHT - 1) * 2.2 * DEG

            // R = Rz(roll) · Rx(pitch) · Ry(yaw), rows
            const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw)
            const cp = Math.cos(pitch), sp = Math.sin(pitch)
            const cr = Math.cos(cam.roll), sr = Math.sin(cam.roll)
            // Ry rows: [cy,0,-sy] [0,1,0] [sy,0,cy]
            // Rx·Ry rows
            const a0 = [cy, 0, -sy]
            const a1 = [sp * sy, cp, sp * cy]
            const a2 = [cp * sy, -sp, cp * cy]
            // Rz · (Rx·Ry)
            const r0 = [cr * a0[0] - sr * a1[0], cr * a0[1] - sr * a1[1], cr * a0[2] - sr * a1[2]]
            const r1 = [sr * a0[0] + cr * a1[0], sr * a0[1] + cr * a1[1], sr * a0[2] + cr * a1[2]]
            const r2 = a2

            const aspect = W / Math.max(1, H)
            const fy = 1 / Math.tan(FOV / 2)
            const fx = fy / aspect
            const near = 0.05
            const far = 200
            const A = (far + near) / (far - near)
            const B = (-2 * far * near) / (far - near)

            // sun direction at infinity through the same rotation
            const sd = [0, SUN_ELEV, 1]
            const sv = [
                r0[0] * sd[0] + r0[1] * sd[1] + r0[2] * sd[2],
                r1[0] * sd[0] + r1[1] * sd[1] + r1[2] * sd[2],
                r2[0] * sd[0] + r2[1] * sd[1] + r2[2] * sd[2],
            ]
            const svz = Math.max(1e-3, sv[2])
            const bw = canvas.width
            const bh = canvas.height
            const sunX = ((sv[0] / svz) * fx * 0.5 + 0.5) * bw
            const sunY = ((sv[1] / svz) * fy * 0.5 + 0.5) * bh

            gl.viewport(0, 0, bw, bh)
            gl.clearColor(bg[0] / 255, bg[1] / 255, bg[2] / 255, 1)
            gl.depthMask(true)
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

            // sky + sun
            gl.disable(gl.DEPTH_TEST)
            gl.disable(gl.BLEND)
            gl.useProgram(sky)
            gl.bindBuffer(gl.ARRAY_BUFFER, quad)
            gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
            gl.uniform2f(su.res, bw, bh)
            gl.uniform3f(su.up, r0[1], r1[1], r2[1])
            gl.uniform2f(su.focal, fx, fy)
            gl.uniform3f(su.sun, sunX, sunY, SUN_RADIUS * sunSize * bh)
            gl.uniform1f(su.bandT, tIdle * 0.12)
            gl.uniform3f(su.bg, bg[0] / 255, bg[1] / 255, bg[2] / 255)
            gl.uniform4f(su.accent, acc[0] / 255, acc[1] / 255, acc[2] / 255, sunSize > 0 ? acc[3] : 0)
            gl.drawArrays(gl.TRIANGLES, 0, 3)

            // terrain
            gl.useProgram(terrain)
            gl.uniform1f(tu.camZ, camZ)
            gl.uniform3f(tu.cam, 0, camY, 0)
            gl.uniform3f(tu.r0, r0[0], r0[1], r0[2])
            gl.uniform3f(tu.r1, r1[0], r1[1], r1[2])
            gl.uniform3f(tu.r2, r2[0], r2[1], r2[2])
            gl.uniform4f(tu.proj, fx, fy, A, B)
            gl.uniform1f(tu.amp, RIDGE * relief)
            gl.uniform1f(tu.point, DOT_PX * dotSize * dpr)
            gl.uniform1f(tu.scan, scanZ)
            gl.uniform3f(tu.hot, acc[0] / 255, acc[1] / 255, acc[2] / 255)
            gl.uniform1f(tu.mode, 0)
            gl.enable(gl.DEPTH_TEST)
            gl.enable(gl.BLEND)

            // hidden-line fill: Background, pushed back so its own edges pass
            gl.depthMask(true)
            gl.enable(gl.POLYGON_OFFSET_FILL)
            gl.polygonOffset(1, 1)
            gl.uniform2f(tu.nudge, 0, 0)
            gl.uniform1f(tu.solid, 1)
            gl.uniform4f(tu.color, bg[0] / 255, bg[1] / 255, bg[2] / 255, 1)
            gl.bindBuffer(gl.ARRAY_BUFFER, triBuf)
            gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
            gl.drawArrays(gl.TRIANGLES, 0, triCount)
            gl.disable(gl.POLYGON_OFFSET_FILL)

            // the grid, as a faint ghost under the points
            gl.depthMask(false)
            gl.uniform1f(tu.solid, 0)
            gl.uniform4f(tu.color, line[0] / 255, line[1] / 255, line[2] / 255, line[3] * GHOST)
            gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf)
            gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
            gl.drawArrays(gl.LINES, 0, lineCount)

            // the point cloud
            if (dotSize > 0) {
                gl.uniform1f(tu.mode, 1)
                gl.uniform4f(tu.color, line[0] / 255, line[1] / 255, line[2] / 255, line[3])
                gl.bindBuffer(gl.ARRAY_BUFFER, pointBuf)
                gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
                gl.drawArrays(gl.POINTS, 0, pointCount)
                gl.uniform1f(tu.mode, 0)
            }
            gl.depthMask(true)

            root.style.backgroundColor = background
            if (!staticRef.current) raf = requestAnimationFrame(frame)
        }
        raf = requestAnimationFrame(frame)

        // offsetX/offsetY are element-local and carry no canvas zoom (rule G)
        const onMove = (e: PointerEvent) => {
            const w = root.offsetWidth || 1
            const h = root.offsetHeight || 1
            pointer.nx = Math.max(-1, Math.min(1, (e.offsetX / w) * 2 - 1))
            pointer.ny = Math.max(-1, Math.min(1, (e.offsetY / h) * 2 - 1))
            pointer.active = true
        }
        const onLeave = () => {
            pointer.active = false
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerleave", onLeave)

        return () => {
            // No loseContext(): getContext returns the same context per canvas,
            // so a StrictMode remount would reuse a force-lost one.
            cancelAnimationFrame(raf)
            ro.disconnect()
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerleave", onLeave)
        }
    }, [])

    return (
        <div
            ref={rootRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 1200,
                minHeight: 800,
                overflow: "hidden",
                backgroundColor: props.background ?? DEFAULTS.background,
                ...props.style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
            />
        </div>
    )
}
