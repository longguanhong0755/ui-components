"use client"

import * as React from "react"
import { useEffect, useRef, useState } from "react"

// ── moved controls (builder) ──
/**
 * Controls moved in the builder: into Advanced, out of it, or into groups of
 * their own. The code reads each one where it was first written, so the props
 * are put back in that shape before anything reads them.
 */
const MOVED_CONTROLS: { into: Record<string, string>; out: Record<string, string> } = {"into":{},"out":{"hover":"advanced"}}
const GROUP_FALLBACKS: Record<string, any> = {  }
function withMovedControls(props: any): any {
    const out = { ...props }
    for (const [k, g] of Object.entries(MOVED_CONTROLS.into)) out[k] = props?.[g]?.[k] ?? GROUP_FALLBACKS[g]?.[k]
    for (const [k, g] of Object.entries(MOVED_CONTROLS.out)) {
        if (out[k] !== undefined) out[g] = { ...(out[g] ?? {}), [k]: out[k] }
    }
    return out
}
// ── /moved controls ──

/**
 * MottoHoops — two linked tori ray-marched in WebGL2, wrapped in repeating
 * heavy type that flows along the rings and rolls around the tube.
 *
 * Refined from the user's `TypographicPosterClosed`; every control it had is
 * kept. Added: grab the rings and throw them — they tumble with inertia and
 * drift back to the poster pose — and the rings hang as loose chain links, so a
 * tap flips the ring you touched over the other and sets them knocking.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */

/** Tuning values behind the look. Out of the box, Advanced changes nothing. */
const DEFAULT_ADVANCED = {
    cycle: 12,
    flow: 33,
    roll: 100,
    swayPitch: 50,
    tilt: -37,
    rollAngle: -40,
    linkAngle: 65,
    ringA: 22,
    ringB: 27,
    tube: 5,
    offsetX: 1,
    offsetY: 0,
    perspective: 6,
    rows: 6,
    rowShift: 37,
    letterFill: 86,
    letterWidth: 82,
    letterBold: 55,
    edgeShade: 45,
    resolution: 100,
    grain: 0,
    hover: 50,
    hoverTilt: 10,
    hoverEase: 400,
    pressBoost: 100,
    throwGlide: 700,
    settle: 1.6,
    linkFreq: 1.8,
    linkDecay: 1.2,
    flipTurns: 1,
    flipTime: 0.8,
}
type Advanced = typeof DEFAULT_ADVANCED

interface FontValue {
    fontFamily?: string
    fontWeight?: number | string
    fontStyle?: string
    [key: string]: unknown
}

const DEFAULT_FONT: FontValue = {
    fontFamily: "Inter",
    variant: "Regular",
    fontWeight: 800,
    fontSize: 16,
    lineHeight: "1.5em",
    letterSpacing: "-0.01em",
    textAlign: "left",
}

export interface MottoHoopsProps {
    text?: string
    font?: FontValue
    speed?: number
    scale?: number
    sway?: number
    background?: string
    baseColor?: string
    skinColor?: string
    /** Grab the rings and spin them; a flick keeps them tumbling. */
    drag?: boolean
    /** 0–10. At 5, a drag across the frame's short side turns the rings 180°. */
    sensitivity?: number
    /** 0–10. How loosely the links hang: a tap or a throw sets them swinging,
     *  sliding and knocking on each other. 0 holds them rigid. */
    jangle?: number
    advanced?: Partial<Advanced>
    style?: React.CSSProperties
}

const DEG = Math.PI / 180
const DEFAULT_FAMILY = `"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif`
// High-refresh screens get every other frame: the motion reads the same at
// 60 fps and the GPU does half the work.
const MIN_FRAME_MS = 1000 / 75
// Chain links: ring B can swing about ring A's tube, slide along ring A, and
// rattle in the slack of its own hole. These fix how a link answers a knock.
const LINK_LAG = 0.5 // share of a pair rotation the loose link is left behind by
const CLINK_BOUNCE = 0.35 // speed kept when the link hits the end of its slack
const CLINK_JOLT = 0.15 // how much of that knock reaches the whole pair
const SLACK_MARGIN = 0.85 // play used, short of tube-on-tube contact
const FLIP_DAMPING = 0.7 // a flip lands with one small rock, not a dead stop

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uScale;
uniform float uDist;
uniform mat3 uMA;
uniform mat3 uMB;
uniform vec3 uCA;
uniform vec3 uCB;
uniform vec2 uTorA;
uniform vec2 uTorB;
uniform vec4 uMap;
uniform vec2 uPhase;
uniform vec3 uInk;
uniform vec3 uSkin;
uniform float uEdge;
uniform sampler2D uTex;
out vec4 outColor;

float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xy) - t.x, p.z);
    return length(q) - t.y;
}

vec2 hitSphere(vec3 ro, vec3 rd, vec3 c, float r) {
    vec3 oc = ro - c;
    float b = dot(oc, rd);
    float h = b * b - dot(oc, oc) + r * r;
    if (h < 0.0) return vec2(1e9, -1e9);
    h = sqrt(h);
    return vec2(-b - h, -b + h);
}

void main() {
    float fitPx = max(min(1.2 * uRes.x, 0.8 * uRes.y), 1.0);
    vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / fitPx * 2.0;
    vec3 ro = vec3(0.0, 0.0, uDist);
    vec3 rd = normalize(vec3(uv / max(uScale * uDist, 1e-4), -1.0));
    vec2 ba = hitSphere(ro, rd, uCA, uTorA.x + uTorA.y + 0.01);
    vec2 bb = hitSphere(ro, rd, uCB, uTorB.x + uTorB.y + 0.01);
    float t0 = max(min(ba.x, bb.x), 0.0);
    float t1 = max(ba.y, bb.y);
    float t = t0;
    int id = -1;
    vec3 pa = vec3(0.0);
    vec3 pb = vec3(0.0);
    if (t1 > t0) {
        for (int i = 0; i < 90; i++) {
            vec3 p = ro + rd * t;
            pa = uMA * (p - uCA);
            pb = uMB * (p - uCB);
            float da = sdTorus(pa, uTorA);
            float db = sdTorus(pb, uTorB);
            float d = min(da, db);
            if (d < 0.00035 * t) { id = da < db ? 0 : 1; break; }
            t += d;
            if (t > t1) break;
        }
    }

    bool hitA = id == 0;
    vec3 pl = hitA ? pa : pb;
    vec2 tor = hitA ? uTorA : uTorB;
    float rep = hitA ? uMap.x : uMap.y;
    float rho = length(pl.xy);
    float ang = atan(pl.y, pl.x) / 6.2831853;
    float tub = atan(pl.z, rho - tor.x) / 6.2831853;
    float a = ang * rep + uPhase.x;
    float b = tub * uMap.z + uPhase.y;
    vec2 st = vec2(a + floor(b) * uMap.w, b);

    vec2 gx = vec2(dFdx(a), dFdx(b));
    vec2 gy = vec2(dFdy(a), dFdy(b));
    vec2 per = vec2(max(rep, 1.0), max(uMap.z, 1.0));
    gx -= floor(gx / per + 0.5) * per;
    gy -= floor(gy / per + 0.5) * per;
    float fid = float(id);
    float gmax = max(max(abs(gx.x), abs(gx.y)), max(abs(gy.x), abs(gy.y)));
    if (abs(dFdx(fid)) + abs(dFdy(fid)) > 0.0 || gmax > 0.2) {
        gx = vec2(0.0);
        gy = vec2(0.0);
    }
    float ink = textureGrad(uTex, st, gx, gy).r;

    vec2 dir = rho > 1e-5 ? pl.xy / rho : vec2(1.0, 0.0);
    vec3 cp = vec3(dir * tor.x, 0.0);
    vec3 nl = normalize(pl - cp + vec3(1e-6));
    vec3 nw = hitA ? nl * uMA : nl * uMB;
    float ndv = clamp(abs(dot(nw, rd)), 0.0, 1.0);
    vec3 col = mix(uSkin, uInk, ink);
    float rim = 1.0 - ndv;
    col *= 1.0 - uEdge * rim * rim;
    outColor = id < 0 ? vec4(0.0) : vec4(col, 1.0);
}
`

// ── row-major 3×3 helpers ──
type M3 = number[]
function rx(a: number): M3 {
    const c = Math.cos(a), s = Math.sin(a)
    return [1, 0, 0, 0, c, -s, 0, s, c]
}
function ry(a: number): M3 {
    const c = Math.cos(a), s = Math.sin(a)
    return [c, 0, s, 0, 1, 0, -s, 0, c]
}
function rz(a: number): M3 {
    const c = Math.cos(a), s = Math.sin(a)
    return [c, -s, 0, s, c, 0, 0, 0, 1]
}
function mul(A: M3, B: M3): M3 {
    const o: M3 = new Array(9).fill(0)
    for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++)
            o[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j]
    return o
}
function mulv(A: M3, v: number[]) {
    return [
        A[0] * v[0] + A[1] * v[1] + A[2] * v[2],
        A[3] * v[0] + A[4] * v[1] + A[5] * v[2],
        A[6] * v[0] + A[7] * v[1] + A[8] * v[2],
    ]
}

// ── grab rotation, as a quaternion [x, y, z, w] in view space ──
/** Pre-multiplies q by a turn of `ax` about view X and `ay` about view Y. */
function turnQ(q: number[], ax: number, ay: number) {
    const ang = Math.hypot(ax, ay)
    if (ang < 1e-9) return
    const s = Math.sin(ang / 2) / ang
    const dx = ax * s, dy = ay * s, dw = Math.cos(ang / 2)
    const [x, y, z, w] = q
    q[0] = dw * x + dx * w - dy * z
    q[1] = dw * y + dx * z + dy * w
    q[2] = dw * z - dx * y + dy * x
    q[3] = dw * w - dx * x - dy * y
    normQ(q)
}
function normQ(q: number[]) {
    const n = Math.hypot(q[0], q[1], q[2], q[3]) || 1
    for (let i = 0; i < 4; i++) q[i] /= n
}
function qToM(q: number[]): M3 {
    const [x, y, z, w] = q
    return [
        1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
        2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
        2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y),
    ]
}

function parseColor(input: unknown, fallback: number[]): number[] {
    let s = String(input ?? "").trim()
    const v = s.match(/^var\([^,]+,\s*(.+)\)$/)
    if (v) s = v[1].trim()
    let m = s.match(/^#([0-9a-f]{3,8})$/i)
    if (m) {
        let h = m[1]
        if (h.length === 3 || h.length === 4) h = h.split("").map((c) => c + c).join("")
        return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255]
    }
    m = s.match(/^rgba?\(([^)]+)\)$/i)
    if (m) {
        const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat)
        if (p.length >= 3) return [p[0] / 255, p[1] / 255, p[2] / 255]
    }
    return fallback
}

interface Vals {
    text: string
    font: FontValue
    speed: number
    scale: number
    sway: number
    baseColor: string
    skinColor: string
    drag: boolean
    sensitivity: number
    jangle: number
    adv: Advanced
}

export default function MottoHoops(props: MottoHoopsProps) {
    props = withMovedControls(props)
    const {
    text = "TEXT COMPONENT",
    font = {"variant":"Regular","fontSize":16,"textAlign":"left","fontFamily":"Inter","fontWeight":800,"lineHeight":"1.5em","letterSpacing":"-0.01em"},
    speed = 56,
    scale = 120,
    sway = 45,
    background = "#000000",
    baseColor = "#A183FF",
    skinColor = "#230049",
    drag = true,
    sensitivity = 5,
    jangle = 5,
    advanced = {"flow":33,"roll":125,"rows":6,"tilt":-37,"tube":6,"cycle":12,"grain":5,"ringA":27,"ringB":27,"offsetX":0,"offsetY":0,"rowShift":37,"vignette":0,"edgeShade":45,"hoverEase":400,"hoverTilt":10,"linkAngle":65,"rollAngle":-40,"swayPitch":69,"creaseDark":30,"creaseSeed":7,"creaseSoft":35,"letterBold":55,"letterFill":86,"pressBoost":100,"resolution":100,"creaseCount":45,"creaseLight":22,"letterWidth":82,"perspective":6},
    style,
} = props
    const adv: Advanced = { ...DEFAULT_ADVANCED, ...advanced }

    const rootRef = useRef<HTMLDivElement>(null)
    const glRef = useRef<HTMLCanvasElement>(null)
    const valsRef = useRef<Vals>(null!)
    valsRef.current = { text, font, speed, scale, sway, baseColor, skinColor, drag, sensitivity, jangle, adv }

    // Random grain is client-only so the server render and hydration agree.
    const [grainUrl, setGrainUrl] = useState("")
    useEffect(() => {
        const c = document.createElement("canvas")
        c.width = c.height = 160
        const g = c.getContext("2d")
        if (!g) return
        const img = g.createImageData(160, 160)
        for (let i = 0; i < img.data.length; i += 4) {
            const v = Math.random() * 255
            img.data[i] = img.data[i + 1] = img.data[i + 2] = v
            img.data[i + 3] = 255
        }
        g.putImageData(img, 0, 0)
        setGrainUrl(c.toDataURL())
    }, [])

    useEffect(() => {
        const root = rootRef.current
        const canvas = glRef.current
        if (!root || !canvas) return
        const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: "low-power" })
        if (!gl) return

        const compile = (type: number, src: string) => {
            const sh = gl.createShader(type)!
            gl.shaderSource(sh, src)
            gl.compileShader(sh)
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || "shader")
            return sh
        }
        const vs = compile(gl.VERTEX_SHADER, VERT)
        const fs = compile(gl.FRAGMENT_SHADER, FRAG)
        const prog = gl.createProgram()!
        gl.attachShader(prog, vs)
        gl.attachShader(prog, fs)
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || "link")
        gl.useProgram(prog)

        const U: Record<string, WebGLUniformLocation> = {}
        for (const n of ["uRes", "uScale", "uDist", "uMA", "uMB", "uCA", "uCB", "uTorA", "uTorB", "uMap", "uPhase", "uInk", "uSkin", "uEdge", "uTex"]) {
            const loc = gl.getUniformLocation(prog, n)
            if (loc === null) throw new Error(`Missing uniform ${n}`)
            U[n] = loc
        }

        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        const aPos = gl.getAttribLocation(prog, "aPos")
        gl.enableVertexAttribArray(aPos)
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

        const tex = gl.createTexture()
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        const aniso = gl.getExtension("EXT_texture_filter_anisotropic")
        if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)))
        gl.uniform1i(U.uTex, 0)

        const tcan = document.createElement("canvas")
        tcan.width = 4096
        tcan.height = 256
        const tctx = tcan.getContext("2d")!
        let texKey = ""
        let textAspect = 27
        const loadedFonts = new Set<string>()

        const buildTexture = (str: string, fam: string, wgt: number | string, fstyle: string, fill: number, bold: number) => {
            const W = tcan.width, H = tcan.height
            const phrase = (str && str.trim() ? str.trim() : " ") + "  "
            tctx.setTransform(1, 0, 0, 1, 0, 0)
            tctx.fillStyle = "#000"
            tctx.fillRect(0, 0, W, H)
            let fsz = 200
            tctx.font = `${fstyle} ${wgt} ${fsz}px ${fam}`
            const mh = tctx.measureText("H")
            const asc = mh.actualBoundingBoxAscent || fsz * 0.72
            const capTarget = H * Math.max(0.2, Math.min(0.98, fill / 100))
            fsz = (fsz * capTarget) / asc
            tctx.font = `${fstyle} ${wgt} ${fsz}px ${fam}`
            const stroke = fsz * 0.09 * Math.max(0, bold / 100)
            const w = Math.max(1, tctx.measureText(phrase).width + stroke)
            textAspect = w / capTarget
            tctx.save()
            tctx.scale(W / w, 1)
            tctx.fillStyle = "#fff"
            tctx.strokeStyle = "#fff"
            tctx.lineJoin = "round"
            tctx.textBaseline = "alphabetic"
            const x = stroke / 2
            const y = H / 2 + capTarget / 2 - stroke / 2
            tctx.fillText(phrase, x, y)
            if (stroke > 0) {
                tctx.lineWidth = stroke
                tctx.strokeText(phrase, x, y)
            }
            tctx.restore()
            gl.bindTexture(gl.TEXTURE_2D, tex)
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tcan)
            gl.generateMipmap(gl.TEXTURE_2D)
        }

        let cw = 0, ch = 0
        const resize = () => {
            cw = root.offsetWidth
            ch = root.offsetHeight
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(root)

        // Handlers only record client coordinates; the frame converts them to a
        // 0–1 share of the box as displayed (getBoundingClientRect), so hover
        // and drag stay under the cursor at any canvas zoom or parent scale.
        // The original divided offsetX by offsetWidth, which drifts when scaled.
        const ptr = { cx: 0, cy: 0, x: 0.5, y: 0.5, over: 0, down: 0, moved: false }
        const eased = { x: 0.5, y: 0.5, over: 0, down: 0 }
        const grab = { on: false, lx: 0, ly: 0, dx: 0, dy: 0 }
        const q = [0, 0, 0, 1]
        const spin = [0, 0] // rad/s about view X, Y
        const flick = [0, 0] // drag velocity, handed to spin on release
        // ring B relative to ring A: swing about A's tube, slide along A, slack in B's hole
        const link = { phi: 0, phiV: 0, th: 0, thV: 0, s: 0, sV: 0 }
        let struck = false
        let lastG: M3 = [1, 0, 0, 0, 1, 0, 0, 0, 1]
        // Tap flips: each ring turns over about its own tube where it threads
        // the other, while the other holds still. [A, B]; angle, rate, target.
        const flips = [
            { f: 0, v: 0, to: 0 },
            { f: 0, v: 0, to: 0 },
        ]
        // Last drawn rings, for picking which one a tap landed on. M is
        // local→view (row-major), c the centre, piv/ax the flip hinge in view.
        type Drawn = { M: M3; c: number[]; R: number; piv: number[]; ax: number[] }
        let drawn: Drawn[] | null = null
        let drawnCam = { W: 1, H: 1, scale: 1, dist: 6, r: 0.1 }
        /** March the tap's ray through both rings, as the shader does. */
        const pick = (u: number, vv: number) => {
            if (!drawn) return null
            const { W, H, scale, dist, r } = drawnCam
            const fit = Math.max(Math.min(1.2 * W, 0.8 * H), 1)
            const k = 1 / Math.max(scale * dist, 1e-4)
            const dx = ((u - 0.5) * W * 2 / fit) * k, dy = ((0.5 - vv) * H * 2 / fit) * k
            const n = Math.hypot(dx, dy, 1)
            const rd = [dx / n, dy / n, -1 / n]
            const sd = (p: number[], d: Drawn) => {
                const x = p[0] - d.c[0], y = p[1] - d.c[1], z = p[2] - d.c[2]
                const lx = d.M[0] * x + d.M[3] * y + d.M[6] * z
                const ly = d.M[1] * x + d.M[4] * y + d.M[7] * z
                const lz = d.M[2] * x + d.M[5] * y + d.M[8] * z
                return Math.hypot(Math.hypot(lx, ly) - d.R, lz) - r
            }
            let t = 0, best = 0, bestD = 1e9, p = [0, 0, dist]
            for (let i = 0; i < 120 && t < dist * 3; i++) {
                p = [rd[0] * t, rd[1] * t, dist + rd[2] * t]
                const da = sd(p, drawn[0]), db = sd(p, drawn[1])
                const d = Math.min(da, db)
                if (d < bestD) {
                    bestD = d
                    best = da <= db ? 0 : 1
                }
                if (d < 1e-3) break
                t += d
            }
            // A miss flips the ring the ray passed closest to.
            return { ring: best, at: p }
        }
        let side = 1

        const onMove = (e: PointerEvent) => {
            ptr.cx = e.clientX
            ptr.cy = e.clientY
            ptr.over = 1
            ptr.moved = true
            if (grab.on) {
                grab.dx += e.clientX - grab.lx
                grab.dy += e.clientY - grab.ly
                grab.lx = e.clientX
                grab.ly = e.clientY
            }
        }
        const onEnter = (e: PointerEvent) => onMove(e)
        const onLeave = () => {
            if (!grab.on) ptr.over = 0
        }
        const onDown = (e: PointerEvent) => {
            ptr.down = 1
            onMove(e)
            struck = true // applied in the frame, once the tap is in frame space
            if (!valsRef.current.drag) return
            grab.on = true
            grab.lx = e.clientX
            grab.ly = e.clientY
            spin[0] = spin[1] = 0
            flick[0] = flick[1] = 0
            root.style.cursor = "grabbing"
            try {
                root.setPointerCapture(e.pointerId)
            } catch {}
        }
        const onUp = (e: PointerEvent) => {
            ptr.down = 0
            if (!grab.on) return
            grab.on = false
            spin[0] += flick[0]
            spin[1] += flick[1]
            flick[0] = flick[1] = 0
            root.style.cursor = ""
            if (e.pointerType !== "mouse") ptr.over = 0 // lifting a finger ends the hover
        }
        const onScroll = () => (ptr.moved = true)
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerenter", onEnter)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerdown", onDown)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)
        window.addEventListener("scroll", onScroll, { passive: true, capture: true })

        const mql = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null

        let raf = 0
        let last = -1
        let time = 0
        let lastVals: Vals | null = null

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            if (last >= 0 && now - last < MIN_FRAME_MS) return
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            const v = valsRef.current
            const a = v.adv
            let dirty = v !== lastVals
            lastVals = v
            const dprBase = Math.min(window.devicePixelRatio || 1, 2)

            // lettering texture
            const f = v.font || {}
            const fam = f.fontFamily || DEFAULT_FAMILY
            const wgt = f.fontWeight || 800
            const fst = f.fontStyle || "normal"
            const key = `${v.text}|${fam}|${wgt}|${fst}|${a.letterFill}|${a.letterBold}`
            if (key !== texKey) {
                texKey = key
                dirty = true
                buildTexture(v.text, fam, wgt, fst, a.letterFill, a.letterBold)
                const fontStr = `${fst} ${wgt} 100px ${fam}`
                if (!loadedFonts.has(fontStr) && document.fonts?.load) {
                    loadedFonts.add(fontStr)
                    document.fonts.load(fontStr).then(() => (texKey = "")).catch(() => {})
                }
            }

            // canvas size
            const dpr = dprBase * Math.max(0.25, a.resolution / 100)
            const W = Math.max(1, Math.round(cw * dpr))
            const H = Math.max(1, Math.round(ch * dpr))
            if (canvas.width !== W || canvas.height !== H) {
                canvas.width = W
                canvas.height = H
                dirty = true
            }

            // pointer → share of the displayed box, read once per frame
            if (ptr.moved) {
                ptr.moved = false
                const r = root.getBoundingClientRect()
                if (r.width > 0 && r.height > 0) {
                    ptr.x = (ptr.cx - r.left) / r.width
                    ptr.y = (ptr.cy - r.top) / r.height
                    side = Math.min(r.width, r.height)
                }
            }

            // pointer easing
            const hoverK = a.hover / 50
            const kE = dt > 0 ? 1 - Math.exp(-dt / Math.max(0.016, a.hoverEase / 1000)) : 0
            eased.x += (ptr.x - eased.x) * kE
            eased.y += (ptr.y - eased.y) * kE
            // Tilt gives way while the rings are held, so the drag alone steers.
            eased.over += ((grab.on ? 0 : ptr.over) - eased.over) * kE
            eased.down += (ptr.down - eased.down) * kE
            const easing =
                Math.abs(ptr.x - eased.x) + Math.abs(ptr.y - eased.y) + Math.abs((grab.on ? 0 : ptr.over) - eased.over) + Math.abs(ptr.down - eased.down) > 1e-4

            const RA = a.ringA / 50
            const RB = a.ringB / 50
            const r = Math.max(0.01, a.tube / 50)

            // grab, throw, settle
            const perPx = (Math.PI * (Math.max(0, v.sensitivity) / 5)) / Math.max(1, side)
            let turnX = 0, turnY = 0 // this frame's view-space turn of the pair
            if (grab.dx || grab.dy) {
                const ax = grab.dy * perPx, ay = grab.dx * perPx
                turnQ(q, ax, ay)
                turnX += ax
                turnY += ay
                if (dt > 0) {
                    const kv = 1 - Math.exp(-dt / 0.04)
                    flick[0] += (ax / dt - flick[0]) * kv
                    flick[1] += (ay / dt - flick[1]) * kv
                }
                grab.dx = grab.dy = 0
            } else if (grab.on) {
                // Held still: nothing to throw on release.
                const g = Math.exp(-dt / 0.05)
                flick[0] *= g
                flick[1] *= g
            }
            if (dt > 0) {
                // Spin also carries the knocks from the links, so it runs while held.
                turnQ(q, spin[0] * dt, spin[1] * dt)
                turnX += spin[0] * dt
                turnY += spin[1] * dt
                const g = Math.exp(-dt / Math.max(0.016, a.throwGlide / 1000))
                spin[0] *= g
                spin[1] *= g
            }
            if (!grab.on && dt > 0) {
                if (a.settle > 0) {
                    if (q[3] < 0) for (let i = 0; i < 4; i++) q[i] = -q[i]
                    const ks = 1 - Math.exp(-dt / a.settle)
                    q[0] -= q[0] * ks
                    q[1] -= q[1] * ks
                    q[2] -= q[2] * ks
                    q[3] += (1 - q[3]) * ks
                    normQ(q)
                }
            }
            // chain links: ring B hangs loose on ring A
            const jg = Math.max(0, v.jangle) / 5
            const L = link
            // Play of A's tube inside B's hole: outward until the tubes touch,
            // inward until B's far side reaches A's opposite tube.
            const sMax = Math.max(0, RB - 2 * r) * SLACK_MARGIN
            const sMin = Math.min(0, Math.max(RB - 2 * RA + 2 * r, -(RB - 2 * r))) * SLACK_MARGIN
            // view-space vector → pair-local (lastG is local→view, so its transpose)
            const toLocal = (wx: number, wy: number) => [
                lastG[0] * wx + lastG[3] * wy,
                lastG[1] * wx + lastG[4] * wy,
                lastG[2] * wx + lastG[5] * wy,
            ]
            const swingAxis = [-Math.sin(L.th), Math.cos(L.th)] // A's tube at the link, in A's plane
            if (jg > 0) {
                // The loose link is left behind when the pair turns under it.
                const tl = toLocal(turnX, turnY)
                const lag = Math.min(1, LINK_LAG * jg)
                L.phi -= lag * (tl[0] * swingAxis[0] + tl[1] * swingAxis[1])
                L.th -= lag * tl[2]
            }
            if (struck) {
                struck = false
                const hit = a.flipTurns > 0 ? pick(ptr.x, ptr.y) : null
                if (hit && drawn) {
                    // The tap pushes the touched side away from you: the flip
                    // turns whichever way that push twists the ring on its hinge.
                    const d = drawn[hit.ring]
                    const arm = [hit.at[0] - d.piv[0], hit.at[1] - d.piv[1]]
                    const twist = -arm[1] * d.ax[0] + arm[0] * d.ax[1]
                    const fl = flips[hit.ring]
                    if (Math.abs(fl.to - fl.f) < 3 * Math.PI) fl.to += (twist < 0 ? -1 : 1) * a.flipTurns * 2 * Math.PI
                }
                if (jg > 0) {
                    // A tap pushes into the screen at the tap point: torque (-y, x, 0).
                    const tx = (ptr.x - 0.5) * 2, ty = (0.5 - ptr.y) * 2
                    const tl = toLocal(-ty, tx)
                    L.thV += 6 * tl[2] * jg
                    L.sV += 4 * jg
                    spin[0] += -ty * 0.6 * jg
                    spin[1] += tx * 0.6 * jg
                }
            }
            if (dt > 0) {
                const w0 = 2 * Math.PI * Math.max(0.1, a.linkFreq)
                const c = 2 / Math.max(0.05, a.linkDecay)
                const n = Math.ceil(dt / 0.008)
                const h = dt / n
                for (let i = 0; i < n; i++) {
                    L.phiV += (-w0 * w0 * L.phi - c * L.phiV) * h
                    L.phi += L.phiV * h
                    L.thV += (-w0 * w0 * L.th - c * L.thV) * h
                    L.th += L.thV * h
                    L.sV += (-0.6 * w0 * w0 * L.s - c * L.sV) * h
                    L.s += L.sV * h
                    // Tube meets tube: the link stops dead and knocks the pair.
                    const hit = L.s > sMax ? sMax : L.s < sMin ? sMin : null
                    if (hit !== null) {
                        const imp = L.sV
                        L.s = hit
                        L.sV = -imp * CLINK_BOUNCE
                        const cp = Math.cos(L.phi)
                        const e = [Math.cos(L.th) * cp, Math.sin(L.th) * cp, -Math.sin(L.phi)]
                        const ex = lastG[0] * e[0] + lastG[1] * e[1] + lastG[2] * e[2]
                        const ey = lastG[3] * e[0] + lastG[4] * e[1] + lastG[5] * e[2]
                        spin[0] += -ey * imp * CLINK_JOLT
                        spin[1] += ex * imp * CLINK_JOLT
                    }
                }
            }
            const jangling =
                Math.abs(L.phi) + Math.abs(L.th) + Math.abs(L.s) > 1e-4 || Math.abs(L.phiV) + Math.abs(L.thV) + Math.abs(L.sV) > 1e-3

            // flips: a slightly underdamped spring onto the target, so the ring
            // lands with a small rock rather than stopping dead
            let flipping = false
            if (dt > 0) {
                const wf = 6 / Math.max(0.1, a.flipTime)
                const n = Math.ceil(dt / 0.008)
                const h = dt / n
                for (const fl of flips) {
                    for (let i = 0; i < n; i++) {
                        fl.v += (wf * wf * (fl.to - fl.f) - 2 * FLIP_DAMPING * wf * fl.v) * h
                        fl.f += fl.v * h
                    }
                    if (Math.abs(fl.to - fl.f) < 1e-4 && Math.abs(fl.v) < 1e-3) {
                        // Whole turns look identical; drop them so the angle never grows.
                        const whole = Math.round(fl.to / (2 * Math.PI)) * 2 * Math.PI
                        fl.f = fl.to - whole
                        fl.to -= whole
                        fl.v = 0
                    } else flipping = true
                }
            }

            const turning =
                flipping || jangling || grab.on || Math.hypot(spin[0], spin[1]) > 1e-3 || (a.settle > 0 && 1 - Math.abs(q[3]) > 1e-7)

            // clock
            const reduced = !!(mql && mql.matches)
            const rate = (Math.max(0, v.speed) / 50) * (1 + (a.pressBoost / 100) * eased.down * hoverK)
            const ticking = !reduced && rate > 0
            if (ticking) time += dt * rate

            // Nothing moved and nothing changed: keep the last frame.
            if (!ticking && !easing && !turning && !dirty) return

            const cycle = Math.max(1, a.cycle)
            const phase = (time / cycle) * Math.PI * 2

            const tiltMax = a.hoverTilt * DEG * hoverK * eased.over
            const yaw = v.sway * DEG * Math.sin(phase) - tiltMax * (eased.x - 0.5) * 2
            const pitch = v.sway * (a.swayPitch / 100) * DEG * Math.sin(phase) + tiltMax * (0.5 - eased.y) * 2

            const G = mul(qToM(q), mul(mul(ry(yaw), rx(pitch)), mul(rz(a.rollAngle * DEG), rx(a.tilt * DEG))))
            lastG = G
            // Ring B in ring A's frame: slid θ along A, swung φ about A's tube,
            // shifted s in its own hole. All zero is the poster's pose.
            const slide = rz(L.th)
            const swing = ry(L.phi)
            const c0x = RB / 2
            const off = [a.offsetX / 50, -a.offsetY / 50, 0]

            // Ring A flips about its own tube where it threads B (hinge pA,
            // along A's tangent there); B holds still.
            const pA = mulv(slide, [RA, 0, 0])
            const RfA = mul(slide, mul(ry(flips[0].f), rz(-L.th)))
            const swungA = mulv(RfA, pA)
            const aC = [-c0x + pA[0] - swungA[0], pA[1] - swungA[1], pA[2] - swungA[2]]
            const MA = mul(G, RfA)
            const ca = mulv(G, aC)

            // Ring B flips about its own tube where it threads A: B-local
            // (-RB, 0, 0), along B-local y; A holds still.
            const RB0 = mul(slide, mul(swing, rx(a.linkAngle * DEG)))
            const RBf = mul(RB0, ry(flips[1].f))
            const bRel = mulv(slide, [RA + Math.cos(L.phi) * L.s, 0, -Math.sin(L.phi) * L.s])
            const hingeB = mulv(RB0, [-RB, 0, 0])
            const swungB = mulv(RBf, [RB, 0, 0])
            const bC = [bRel[0] - c0x + hingeB[0] + swungB[0], bRel[1] + hingeB[1] + swungB[1], bRel[2] + hingeB[2] + swungB[2]]
            const GB = mul(G, RBf)
            const cb = mulv(G, bC)

            const toView = (p: number[]) => {
                const w = mulv(G, p)
                return [w[0] + off[0], w[1] + off[1], w[2] + off[2]]
            }
            drawn = [
                { M: MA, c: [ca[0] + off[0], ca[1] + off[1], ca[2] + off[2]], R: RA, piv: toView([-c0x + pA[0], pA[1], pA[2]]), ax: mulv(G, mulv(slide, [0, 1, 0])) },
                {
                    M: GB,
                    c: [cb[0] + off[0], cb[1] + off[1], cb[2] + off[2]],
                    R: RB,
                    piv: toView([bRel[0] - c0x + hingeB[0], bRel[1] + hingeB[1], bRel[2] + hingeB[2]]),
                    ax: mulv(GB, [0, 1, 0]),
                },
            ]
            drawnCam = { W, H, scale: Math.max(0.05, v.scale / 100), dist: Math.max(1.5, a.perspective), r }

            const rows = Math.max(1, Math.round(a.rows))
            const capWorld = ((2 * Math.PI * r) / rows) * (a.letterFill / 100)
            const tileLen = Math.max(1e-3, textAspect * capWorld * (a.letterWidth / 100))
            const repA = Math.max(1, Math.round((2 * Math.PI * RA) / tileLen))
            const repB = Math.max(1, Math.round((2 * Math.PI * RB) / tileLen))

            gl.viewport(0, 0, W, H)
            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.useProgram(prog)
            gl.uniform2f(U.uRes, W, H)
            gl.uniform1f(U.uScale, Math.max(0.05, v.scale / 100))
            gl.uniform1f(U.uDist, Math.max(1.5, a.perspective))
            // row-major G == column-major G^T, which is the world→local matrix
            gl.uniformMatrix3fv(U.uMA, false, MA)
            gl.uniformMatrix3fv(U.uMB, false, GB)
            gl.uniform3f(U.uCA, ca[0] + off[0], ca[1] + off[1], ca[2] + off[2])
            gl.uniform3f(U.uCB, cb[0] + off[0], cb[1] + off[1], cb[2] + off[2])
            gl.uniform2f(U.uTorA, RA, r)
            gl.uniform2f(U.uTorB, RB, r)
            gl.uniform4f(U.uMap, repA, repB, rows, a.rowShift / 100)
            const turns = time / cycle
            gl.uniform2f(U.uPhase, turns * (a.flow / 100), turns * (a.roll / 100))
            const ink = parseColor(v.baseColor, [0.91, 0.91, 0.91])
            const skin = parseColor(v.skinColor, [0.07, 0.07, 0.07])
            gl.uniform3f(U.uInk, ink[0], ink[1], ink[2])
            gl.uniform3f(U.uSkin, skin[0], skin[1], skin[2])
            gl.uniform1f(U.uEdge, Math.max(0, Math.min(1, a.edgeShade / 100)))
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, tex)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerenter", onEnter)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
            window.removeEventListener("scroll", onScroll, { capture: true })
            gl.deleteTexture(tex)
            gl.deleteBuffer(buf)
            gl.deleteProgram(prog)
            gl.deleteShader(vs)
            gl.deleteShader(fs)
        }
    }, [])

    const fill: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }

    return (
        <div
            ref={rootRef}
            style={{
                width: "100%",
                height: "100%",
                ...style,
                position: "relative",
                overflow: "hidden",
                background,
                isolation: "isolate",
                cursor: drag ? "grab" : undefined,
                // Horizontal drags spin the rings on touch; vertical ones still
                // scroll the page, so the hero never traps a phone user.
                touchAction: drag ? "pan-y" : undefined,
                userSelect: drag ? "none" : undefined,
            }}
        >
            <canvas ref={glRef} style={fill} />
            {adv.grain > 0 && grainUrl && (
                <div
                    style={{
                        ...fill,
                        pointerEvents: "none",
                        backgroundImage: `url(${grainUrl})`,
                        backgroundSize: "160px 160px",
                        opacity: (adv.grain / 100) * 0.35,
                        mixBlendMode: "screen",
                    }}
                />
            )}

        </div>
    )
}

const D = DEFAULT_ADVANCED

// Control order arranged in the builder.
