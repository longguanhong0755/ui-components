"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const MAX_DPR = 2
const CAM_Z = 12
const FOV = 45
const PARALLAX_RATE = 3.08 // 1/s; matches the source's 0.05-per-frame lerp at 60fps
const SEG = 48 // UV sphere resolution; the source used 64 and it is invisible past ~40

// scale, x, y, z, speed — the source's four "remixed" spheres
const SPHERES: [number, number, number, number, number][] = [
    [4.2, 6.5, -1.2, -1.5, 0.002],
    [1.8, -6.0, -4.0, 2.5, 0.004],
    [1.1, -4.5, 4.2, -2.0, 0.005],
    [0.75, 3.0, 5.5, 4.0, 0.008],
]

const SNOISE = `
vec3 permute(vec3 x){ return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
`

const QUAD_VERT = `
attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
`

const BG_FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;
uniform float uTime, uScale, uWarp, uBeam;
uniform vec3  uBg, uBase, uAccent;

${SNOISE}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 auv = uv;
  auv.x *= uRes.x / max(uRes.y, 1.0);

  vec2 st = auv * 0.5 * uScale;
  st += vec2(snoise(st + uTime * 0.04), snoise(st - uTime * 0.04)) * 0.4 * uWarp;

  float lo = 0.2;
  float hi = max(lo + 0.02, 0.2 + 0.7 * uBeam);
  float beam = smoothstep(lo, hi, snoise(vec2(st.x + st.y * 2.0 - uTime * 0.1, uTime * 0.03)));
  vec3 glow = mix(uBase, uAccent, snoise(auv * 2.0 + uTime * 0.15) * 0.5 + 0.5);

  // The source wrote smoothstep(1.5, 0.1, dist) — edge0 > edge1 is UNDEFINED in
  // GLSL — so the vignette is inverted here into the defined form.
  float vignette = 1.0 - smoothstep(0.1, 1.5, distance(uv, vec2(0.5)));
  vec3 edgeColor = uBg * 0.5;
  gl_FragColor = vec4(mix(edgeColor, mix(uBg, glow, beam * 0.6), vignette), 1.0);
}
`

const GLASS_VERT = `
precision highp float;

attribute vec3 a_pos;

uniform mat4 uViewProj;
uniform mat3 uNormalMat;
uniform vec3 uOrigin;
uniform float uScale;
uniform vec2 uSpin;   // x: rotation about x, y: about y

varying vec3 v_normal;

void main(){
  float cx = cos(uSpin.x), sx = sin(uSpin.x);
  float cy = cos(uSpin.y), sy = sin(uSpin.y);
  vec3 p = vec3(a_pos.x, a_pos.y * cx - a_pos.z * sx, a_pos.y * sx + a_pos.z * cx);
  p = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);

  // a unit sphere's normal IS its position
  v_normal = normalize(uNormalMat * p);
  gl_Position = uViewProj * vec4(p * uScale + uOrigin, 1.0);
}
`

const GLASS_FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;
uniform float uTime, uScale2, uWarp, uBeam;
uniform vec3  uBody, uBase, uAccent;

varying vec3 v_normal;

${SNOISE}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  // Screen-space sample nudged by the normal: the field reads as seen THROUGH the
  // glass, and shifts as the sphere turns.
  uv += v_normal.xy * 0.2;
  uv.x *= uRes.x / max(uRes.y, 1.0);

  vec2 st = uv * 0.6 * uScale2;
  st += vec2(snoise(st + uTime * 0.06), snoise(st - uTime * 0.06)) * 0.35 * uWarp;

  float lo = 0.1;
  float hi = max(lo + 0.02, 0.1 + 0.8 * uBeam);
  float beam = smoothstep(lo, hi, snoise(vec2(st.x + st.y * 1.8 - uTime * 0.12, uTime * 0.02)));
  vec3 glow = mix(uBase, uAccent, snoise(uv * 1.8 + uTime * 0.12) * 0.5 + 0.5);

  float fresnel = pow(clamp(1.0 - dot(vec3(0.0, 0.0, 1.0), v_normal), 0.0, 1.0), 2.5);

  vec3 col = mix(uBody, glow, clamp(beam * 0.5 + fresnel * 0.8, 0.0, 1.0));
  gl_FragColor = vec4(col * 0.95, 0.95);   // premultiplied
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("DimensionalField shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

function link(gl: WebGLRenderingContext, vsSrc: string, fsSrc: string): WebGLProgram | null {
    const vs = compile(gl, gl.VERTEX_SHADER, vsSrc)
    const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc)
    if (!vs || !fs) return null
    const prog = gl.createProgram()
    if (!prog) return null
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error("DimensionalField link:", gl.getProgramInfoLog(prog))
        return null
    }
    return prog
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

function num(v: unknown, fb: number): number {
    return typeof v === "number" && isFinite(v) ? v : fb
}

function clampN(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v
}

// ---- the twenty lines of matrix maths that replace the dependency -----------

function perspective(out: Float32Array, fovDeg: number, aspect: number, near: number, far: number) {
    const f = 1 / Math.tan((fovDeg * Math.PI) / 360)
    out.fill(0)
    out[0] = f / aspect
    out[5] = f
    out[10] = (far + near) / (near - far)
    out[11] = -1
    out[14] = (2 * far * near) / (near - far)
}

// A look-at whose target is the origin, which is all this scene ever asks for.
function lookAtOrigin(view: Float32Array, nrm: Float32Array, ex: number, ey: number, ez: number) {
    let zx = ex
    let zy = ey
    let zz = ez // eye - target, target being (0,0,0)
    const zl = Math.hypot(zx, zy, zz) || 1
    zx /= zl
    zy /= zl
    zz /= zl
    // right = normalize(up x z), with up = +y
    let xx = zz * 1 - 0 * zy
    let xy = 0 * zx - zx * 0
    let xz = 0 * zy - 1 * zx
    xx = zz
    xy = 0
    xz = -zx
    const xl = Math.hypot(xx, xy, xz) || 1
    xx /= xl
    xy /= xl
    xz /= xl
    // up = z x right
    const yx = zy * xz - zz * xy
    const yy = zz * xx - zx * xz
    const yz = zx * xy - zy * xx

    view[0] = xx; view[1] = yx; view[2] = zx; view[3] = 0
    view[4] = xy; view[5] = yy; view[6] = zy; view[7] = 0
    view[8] = xz; view[9] = yz; view[10] = zz; view[11] = 0
    view[12] = -(xx * ex + xy * ey + xz * ez)
    view[13] = -(yx * ex + yy * ey + yz * ez)
    view[14] = -(zx * ex + zy * ey + zz * ez)
    view[15] = 1

    // the rotation part, which is the normal matrix for a rigid view + uniform scale
    nrm[0] = xx; nrm[1] = yx; nrm[2] = zx
    nrm[3] = xy; nrm[4] = yy; nrm[5] = zy
    nrm[6] = xz; nrm[7] = yz; nrm[8] = zz
}

function multiply(out: Float32Array, a: Float32Array, b: Float32Array) {
    for (let c = 0; c < 4; c++) {
        for (let r = 0; r < 4; r++) {
            out[c * 4 + r] =
                a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]
        }
    }
}

function uvSphere(seg: number): { pos: Float32Array; idx: Uint16Array } {
    const pos = new Float32Array((seg + 1) * (seg + 1) * 3)
    let k = 0
    for (let y = 0; y <= seg; y++) {
        const v = (y / seg) * Math.PI
        for (let x = 0; x <= seg; x++) {
            const u = (x / seg) * Math.PI * 2
            pos[k++] = Math.sin(v) * Math.cos(u)
            pos[k++] = Math.cos(v)
            pos[k++] = Math.sin(v) * Math.sin(u)
        }
    }
    const idx = new Uint16Array(seg * seg * 6)
    let m = 0
    for (let y = 0; y < seg; y++) {
        for (let x = 0; x < seg; x++) {
            const a = y * (seg + 1) + x
            const b = a + seg + 1
            idx[m++] = a
            idx[m++] = b
            idx[m++] = a + 1
            idx[m++] = b
            idx[m++] = b + 1
            idx[m++] = a + 1
        }
    }
    return { pos, idx }
}

type SphereGroup = { size?: number; float?: number; spin?: number }
const SPHERE_DEFAULTS: Required<SphereGroup> = { size: 97, float: 400, spin: 400 }

type FieldGroup = { scale?: number; warp?: number; beam?: number }
const FIELD_DEFAULTS: Required<FieldGroup> = { scale: 74, warp: 400, beam: 145 }

interface Props {
    style?: React.CSSProperties
    width?: number
    height?: number
    background?: string
    baseColor?: string
    accentColor?: string
    speed?: number
    hover?: number
    spheres?: SphereGroup
    field?: FieldGroup
}

export default function DimensionalField(props: Props) {
    const {
        style,
        background = "#050508",
        baseColor = "#00FFFD",
        accentColor = "#6600E6",
        speed = 100,
        hover = 200,
        spheres,
        field,
        width,
        height,
    } = props

    // A group the designer never opened arrives undefined; spread-merging over a
    // typed literal beats a hand-written ?? chain, where one missed key silently
    // pins a control forever.
    const spheres_ = { ...SPHERE_DEFAULTS, ...(spheres || {}) }
    const field_ = { ...FIELD_DEFAULTS, ...(field || {}) }

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    const ptrRef = useRef({ tx: 0, ty: 0, x: 0, y: 0 })

    // Every live input is read from a ref inside the loop. Putting any of them in
    // the effect deps would rebuild the GL context on every colour tweak.
    const vRef = useRef<Record<string, number | string>>({})
    vRef.current = {
        bg: background,
        base: baseColor,
        accent: accentColor,
        speed: clampN(num(speed, 50), 0, 100) / 50,
        hover: clampN(num(hover, 100), 0, 200) / 100,
        size: clampN(num(spheres_.size, 100), 20, 300) / 100,
        float: clampN(num(spheres_.float, 100), 0, 400) / 100,
        spin: clampN(num(spheres_.spin, 100), 0, 400) / 100,
        fScale: clampN(num(field_.scale, 100), 20, 400) / 100,
        fWarp: clampN(num(field_.warp, 100), 0, 400) / 100,
        fBeam: clampN(num(field_.beam, 100), 10, 300) / 100,
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { alpha: false, antialias: true, depth: true })
        if (!gl) {
            console.error("DimensionalField: WebGL unavailable")
            return
        }

        const bgProg = link(gl, QUAD_VERT, BG_FRAG)
        const glassProg = link(gl, GLASS_VERT, GLASS_FRAG)
        if (!bgProg || !glassProg) return

        const locs = new Map<string, WebGLUniformLocation | null>()
        const u = (prog: WebGLProgram, tag: string, name: string) => {
            // Uniform locations are PER PROGRAM, so the cache key carries the program.
            const key = tag + name
            if (!locs.has(key)) locs.set(key, gl.getUniformLocation(prog, name))
            return locs.get(key) as WebGLUniformLocation | null
        }

        const quad = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, quad)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)

        const { pos, idx } = uvSphere(SEG)
        const sphereBuf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuf)
        gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW)
        const sphereIdx = gl.createBuffer()
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIdx)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW)

        const proj = new Float32Array(16)
        const view = new Float32Array(16)
        const viewProj = new Float32Array(16)
        const normalMat = new Float32Array(9)
        const order = SPHERES.map((_, i) => i)

        let raf = 0
        let last = performance.now()
        let clock = 0

        const render = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            const v = vRef.current
            const sp = v.speed as number
            clock = (clock + dt * sp) % 62832

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

            const ptr = ptrRef.current
            const k = 1 - Math.exp(-dt * PARALLAX_RATE)
            const hv = v.hover as number
            ptr.x += (ptr.tx * cw * 0.005 * hv - ptr.x) * k
            ptr.y += (ptr.ty * ch * 0.005 * hv - ptr.y) * k

            const cg = parseColor(v.bg as string, [0.02, 0.02, 0.03])
            const cb = parseColor(v.base as string, [0.0, 0.8, 0.7])
            const ca = parseColor(v.accent as string, [0.4, 0.0, 0.9])

            gl.disable(gl.BLEND)
            gl.disable(gl.DEPTH_TEST)
            // The depth mask must be OPEN for the clear: glClear(DEPTH_BUFFER_BIT) is
            // a no-op while depth writes are masked off, so the buffer would keep the
            // previous frame's depths and the moving spheres would fail against stale
            // values in bands that track the mesh's latitude rows.
            gl.depthMask(true)
            gl.clearColor(0, 0, 0, 1)
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
            gl.depthMask(false)

            gl.useProgram(bgProg)
            gl.bindBuffer(gl.ARRAY_BUFFER, quad)
            const aQuad = gl.getAttribLocation(bgProg, "a_pos")
            gl.enableVertexAttribArray(aQuad)
            gl.vertexAttribPointer(aQuad, 2, gl.FLOAT, false, 0, 0)
            gl.uniform2f(u(bgProg, "B:", "uRes"), bw, bh)
            gl.uniform1f(u(bgProg, "B:", "uTime"), clock)
            gl.uniform1f(u(bgProg, "B:", "uScale"), v.fScale as number)
            gl.uniform1f(u(bgProg, "B:", "uWarp"), v.fWarp as number)
            gl.uniform1f(u(bgProg, "B:", "uBeam"), v.fBeam as number)
            gl.uniform3f(u(bgProg, "B:", "uBg"), cg[0], cg[1], cg[2])
            gl.uniform3f(u(bgProg, "B:", "uBase"), cb[0], cb[1], cb[2])
            gl.uniform3f(u(bgProg, "B:", "uAccent"), ca[0], ca[1], ca[2])
            gl.drawArrays(gl.TRIANGLES, 0, 3)
            gl.disableVertexAttribArray(aQuad)

            // --- spheres ---
            perspective(proj, FOV, bw / Math.max(bh, 1), 0.1, 100)
            lookAtOrigin(view, normalMat, ptr.x, -ptr.y, CAM_Z)
            multiply(viewProj, proj, view)

            gl.enable(gl.DEPTH_TEST)
            gl.depthMask(true)
            gl.enable(gl.BLEND)
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
            // Three's materials are FrontSide by default. Without culling, the back
            // hemisphere rasterises at nearly the same depth as the front and cuts a
            // sawtooth of z-fighting straight across every sphere.
            gl.enable(gl.CULL_FACE)
            gl.cullFace(gl.BACK)

            gl.useProgram(glassProg)
            gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuf)
            const aPos = gl.getAttribLocation(glassProg, "a_pos")
            gl.enableVertexAttribArray(aPos)
            gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0)
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIdx)

            gl.uniform2f(u(glassProg, "G:", "uRes"), bw, bh)
            gl.uniform1f(u(glassProg, "G:", "uTime"), clock)
            gl.uniform1f(u(glassProg, "G:", "uScale2"), v.fScale as number)
            gl.uniform1f(u(glassProg, "G:", "uWarp"), v.fWarp as number)
            gl.uniform1f(u(glassProg, "G:", "uBeam"), v.fBeam as number)
            gl.uniform3f(u(glassProg, "G:", "uBody"), cg[0] * 2, cg[1] * 2, cg[2] * 2)
            gl.uniform3f(u(glassProg, "G:", "uBase"), cb[0], cb[1], cb[2])
            gl.uniform3f(u(glassProg, "G:", "uAccent"), ca[0], ca[1], ca[2])
            gl.uniformMatrix4fv(u(glassProg, "G:", "uViewProj"), false, viewProj)
            gl.uniformMatrix3fv(u(glassProg, "G:", "uNormalMat"), false, normalMat)

            const sizeK = v.size as number
            const floatK = v.float as number
            const spinK = v.spin as number

            // Transparent bodies, so they go back to front. Four of them: an insertion
            // sort on view depth costs nothing and never allocates.
            order.sort((a, b) => SPHERES[a][3] - SPHERES[b][3])
            for (let n = 0; n < order.length; n++) {
                const [scale, sx, sy, sz, spd] = SPHERES[order[n]]
                const phase = order[n] * 1.7
                const y = sy + Math.sin(clock * spd * 120 + phase) * 0.5 * floatK
                gl.uniform3f(u(glassProg, "G:", "uOrigin"), sx, y, sz)
                gl.uniform1f(u(glassProg, "G:", "uScale"), scale * sizeK)
                gl.uniform2f(u(glassProg, "G:", "uSpin"), clock * spd * 18 * spinK, clock * spd * 24 * spinK)
                gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0)
            }
            gl.disableVertexAttribArray(aPos)
            gl.disable(gl.CULL_FACE)

            raf = requestAnimationFrame(render)
        }

        // The rect RATIO is zoom-invariant — offset and size scale together — so
        // this is safe on a zoomed Framer canvas where absolute px are not. The
        // source captured window.innerWidth/2 ONCE, so its parallax was centred on
        // whatever the viewport was at startup.
        const track = (e: PointerEvent) => {
            const r = canvas.getBoundingClientRect()
            if (r.width <= 0 || r.height <= 0) return
            ptrRef.current.tx = clampN((e.clientX - r.left) / r.width - 0.5, -0.5, 0.5)
            ptrRef.current.ty = clampN((e.clientY - r.top) / r.height - 0.5, -0.5, 0.5)
        }
        const onLeave = () => {
            ptrRef.current.tx = 0
            ptrRef.current.ty = 0
        }

        canvas.addEventListener("pointermove", track)
        canvas.addEventListener("pointerenter", track)
        canvas.addEventListener("pointerleave", onLeave)

        raf = requestAnimationFrame(render)

        // Never loseContext(): getContext returns the same context per canvas, so
        // StrictMode's mount -> cleanup -> mount would reuse a force-lost one.
        return () => {
            cancelAnimationFrame(raf)
            canvas.removeEventListener("pointermove", track)
            canvas.removeEventListener("pointerenter", track)
            canvas.removeEventListener("pointerleave", onLeave)
        }
    }, [])

    return (
        <div
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
