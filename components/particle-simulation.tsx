"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/* ==================================================================== GL CORE
 * Everything between the GL CORE markers is annotation-free JS on purpose: the
 * verification harness slices this range straight out of the file and evals it,
 * so the shaders and the helpers under test are literally the ones on disk.
 * ------------------------------------------------------------ GL CORE START */

const DPR_CAP = 2
const CANVAS_FPS = 30
const CANVAS_DENSITY_CAP = 100000
const REBUILD_DEBOUNCE_MS = 200
const BUILD_BUDGET_MS = 8
const OFF_FIELD = -10

const BASE_JITTER = 0
const JITTER_X = 1
const JITTER_Y = 1
const ASPECT_RATIO = "16 / 9"
const HIDE_CURSOR = false
const IMAGE_SCALE = 1
const POINTER_LOCAL = true

const SHIPPED_JITTER_SPEED = 8

const SHIPPED_STRENGTH = 7
const SHIPPED_RETURN_SPEED = 0.03

const SHIPPED_DOT_PX = 3
const DOT_PX_AT_100 = SHIPPED_DOT_PX * 2
const DENSITY_MIN = 50000
const DENSITY_MAX = 2000000

const DEFAULT_IMAGE =
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=512&q=80"

/* ------------------------------------------------------------------ shaders */

const QUAD_VS = `
precision highp float;
attribute vec2 a_quad;
varying vec2 v_uv;
void main() {
    v_uv = a_quad * 0.5 + 0.5;
    gl_Position = vec4(a_quad, 0.0, 1.0);
}`

const SIM_ATOMIC = `
precision highp float;
uniform sampler2D u_posTex;
uniform sampler2D u_homeTex;
uniform vec2 u_mouse;
uniform float u_imageScale;
uniform float u_brushSize;
uniform float u_strength;
uniform float u_returnSpeed;
uniform float u_damping;
uniform float u_isInit;
varying vec2 v_uv;

void main() {
    vec4 data = texture2D(u_posTex, v_uv);
    vec2 home = texture2D(u_homeTex, v_uv).rg * u_imageScale;
    float energy = data.b;
    float velE = data.a;

    if (u_isInit > 0.5 || energy != energy || velE != velE) {
        energy = 0.0;
        velE = 0.0;
    }

    float forceE = (0.0 - energy) * (u_returnSpeed * 0.5);

    float d = distance(home, u_mouse);
    if (d < u_brushSize * 2.0 && u_mouse.x > -5.0) {
        float influence = smoothstep(u_brushSize * 2.0, 0.0, d);
        influence *= influence;
        forceE += influence * u_strength * 0.1;
    }

    velE += forceE;
    velE *= u_damping;
    energy += velE;
    energy = max(0.0, energy);

    gl_FragColor = vec4(home, energy, velE);
}`

const FETCH_GLSL = `
vec4 fetchState() {
    if (u_static > 0.5) return vec4(a_home.rg * u_imageScale, 0.0, 0.0);
    return texture2D(u_posTex, a_uv);
}
`

const VS_ATOMIC = `
precision highp float;
attribute vec4 a_color;
attribute vec2 a_uv;
attribute vec3 a_random;
attribute vec4 a_home;
varying vec4 v_color;
uniform sampler2D u_posTex;
uniform float u_static;
uniform float u_imageScale;
uniform float u_time;
uniform float u_particleSize;
uniform float u_baseJitter;
uniform float u_interJitter;
uniform vec2 u_jitterAxis;
uniform float u_jitterSpeed;
uniform float u_brushSize;
uniform float u_aspect;
${FETCH_GLSL}
void main() {
    v_color = a_color;
    vec4 data = fetchState();
    vec2 homeXY = data.rg;
    float energy = clamp(data.b, 0.0, 2.5);

    vec3 rd = vec3(
        sin(a_random.x * 134.11 + a_random.y * 311.23),
        cos(a_random.y * 111.45 + a_random.z * 277.92),
        sin(a_random.z * 188.77 + a_random.x * 399.11)
    );
    vec2 randDir = (rd / max(length(rd), 0.0001)).xy;

    float t = u_time * u_jitterSpeed;
    float orbitSpeed = 0.5 + a_random.y * 1.5;
    float dir = a_random.z > 0.5 ? 1.0 : -1.0;
    vec2 orbit = vec2(
        sin(t * orbitSpeed * dir + a_random.x * 6.28),
        cos(t * orbitSpeed * dir + a_random.y * 6.28)
    );

    float maxStretch = u_brushSize * (u_interJitter * 0.01);
    float stretchPower = (energy / 2.5) * maxStretch;
    vec2 offset = randDir * u_jitterAxis * (u_baseJitter * 0.01 + stretchPower);

    float orbitRadius = u_brushSize * 0.1 * (energy / 2.5);
    offset += orbit * orbitRadius * (0.2 + a_random.x * 1.8);

    vec2 pos = homeXY + offset;
    gl_PointSize = u_particleSize;
    gl_Position = vec4(pos.x / u_aspect, pos.y, 0.0, 1.0);
}`

const FS_ATOMIC = `
precision highp float;
varying vec4 v_color;
uniform float u_alphaComp;
void main() {
    if (length(gl_PointCoord - vec2(0.5)) > 0.5) discard;
    float inv = clamp(1.0 - v_color.a, 0.0, 1.0);
    float a = inv <= 0.0 ? 1.0 : 1.0 - pow(inv, u_alphaComp);
    gl_FragColor = vec4(v_color.rgb * a, a);
}`

const ENGINE = {
    sim: SIM_ATOMIC,
    vs: VS_ATOMIC,
    fs: FS_ATOMIC,
    simU: ["u_posTex", "u_homeTex", "u_mouse", "u_imageScale", "u_brushSize",
           "u_strength", "u_returnSpeed", "u_damping", "u_isInit"],
    drawU: ["u_posTex", "u_static", "u_imageScale", "u_time", "u_particleSize",
            "u_baseJitter", "u_interJitter", "u_jitterAxis", "u_jitterSpeed",
            "u_brushSize", "u_alphaComp", "u_aspect"],
}

/* ------------------------------------------------------------- GL utilities */

function compileShader(gl, type, src, tag) {
    const sh = gl.createShader(type)
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn("SpectralParticles " + tag + ":", gl.getShaderInfoLog(sh))
        return null
    }
    return sh
}

function linkProgram(gl, vsSrc, fsSrc, tag) {
    const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc, tag + ".vert")
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc, tag + ".frag")
    if (!vs || !fs) return null
    const prog = gl.createProgram()
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.warn("SpectralParticles " + tag + " link:", gl.getProgramInfoLog(prog))
        return null
    }
    return prog
}

function buildProgram(gl, vsSrc, fsSrc, names, tag) {
    const prog = linkProgram(gl, vsSrc, fsSrc, tag)
    if (!prog) return null
    const u = {}
    const nulls = new Array()
    for (let i = 0; i < names.length; i++) {
        const loc = gl.getUniformLocation(prog, names[i])
        if (loc === null) nulls.push(names[i])
        u[names[i]] = loc
    }
    return { prog, u, nulls }
}

function makeContext(canvas) {
    const opts = {
        alpha: true,
        antialias: false,
        premultipliedAlpha: true,
        depth: false,
        stencil: false,
        powerPreference: "high-performance",
    }
    let gl = canvas.getContext("webgl2", opts)
    let webgl2 = !!gl
    let floatRT = false
    if (gl) {
        floatRT = !!gl.getExtension("EXT_color_buffer_float")
    } else {
        gl = canvas.getContext("webgl", opts) || canvas.getContext("experimental-webgl", opts)
        if (!gl) return null
        floatRT = !!(
            gl.getExtension("OES_texture_float") &&
            gl.getExtension("WEBGL_color_buffer_float")
        )
    }
    if (gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) < 2) floatRT = false
    return { gl, webgl2, floatRT }
}

function floatFormat(gl, webgl2) {
    return {
        internal: webgl2 ? gl.RGBA32F : gl.RGBA,
        format: gl.RGBA,
        type: gl.FLOAT,
    }
}

function makeStateTexture(gl, fmt, size, pixels) {
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, fmt.internal, size, size, 0, fmt.format, fmt.type, pixels || null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.bindTexture(gl.TEXTURE_2D, null)
    return tex
}

function makeRenderTarget(gl, fmt, size) {
    const tex = makeStateTexture(gl, fmt, size, null)
    const fbo = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    return { tex, fbo, ok }
}

/* --------------------------------------------------------- particle builder */

const ALPHA_FLOOR = 8

function makeBuilder(data, w, h, aspect, target) {
    const step = Math.max(1, Math.sqrt((w * h) / Math.max(1, target)))
    const cols = Math.ceil(w / step) + 2
    const rows = Math.ceil(h / step) + 2
    const texSize = Math.max(2, Math.ceil(Math.sqrt(cols * rows)))
    const capacity = texSize * texSize

    const home = new Float32Array(capacity * 4)
    const color = new Float32Array(capacity * 4)
    const uv = new Float32Array(capacity * 2)
    const rand = new Float32Array(capacity * 3)

    let count = 0
    let y = 0
    let finished = false

    return {
        texSize,
        capacity,
        get count() { return count },
        get finished() { return finished },
        step(budgetMs) {
            const t0 = (typeof performance !== "undefined" ? performance : Date).now()
            while (y < h && count < capacity) {
                const iy = Math.floor(y)
                for (let x = 0; x < w; x += step) {
                    if (count >= capacity) break
                    const ix = Math.floor(x)
                    const idx = (iy * w + ix) * 4
                    const a = data[idx + 3]
                    if (a < ALPHA_FLOOR) continue
                    const r = data[idx] / 255
                    const g = data[idx + 1] / 255
                    const b = data[idx + 2] / 255
                    const alpha = a / 255
                    const i4 = count * 4
                    const i3 = count * 3
                    const i2 = count * 2
                    home[i4] = ((x / w) * 2 - 1) * aspect
                    home[i4 + 1] = (1 - y / h) * 2 - 1
                    home[i4 + 2] = 0
                    home[i4 + 3] = 0
                    color[i4] = r
                    color[i4 + 1] = g
                    color[i4 + 2] = b
                    color[i4 + 3] = alpha
                    rand[i3] = Math.random()
                    rand[i3 + 1] = Math.random()
                    rand[i3 + 2] = Math.random()
                    uv[i2] = ((count % texSize) + 0.5) / texSize
                    uv[i2 + 1] = (Math.floor(count / texSize) + 0.5) / texSize
                    count++
                }
                y += step
                const now = (typeof performance !== "undefined" ? performance : Date).now()
                if (budgetMs > 0 && now - t0 >= budgetMs) break
            }
            if (y >= h || count >= capacity) finished = true
            return finished
        },
        result() {
            return { home, color, uv, rand, count, texSize, gridStep: step, srcH: h }
        },
    }
}

function overlapCount(gridStep, srcH, imageScale, canvasH, diameterPx) {
    const spacing = (gridStep * imageScale * canvasH) / Math.max(1, srcH)
    if (!(spacing > 0) || !(diameterPx > 0)) return 1
    return Math.max(1, ((Math.PI / 4) * diameterPx * diameterPx) / (spacing * spacing))
}

function worldToClip(wx, wy, aspect) {
    return [wx / aspect, wy]
}
function clipToWorld(cx, cy, aspect) {
    return [cx * aspect, cy]
}

/* -------------------------------------------------------------- GL CORE END */

/* --------------------------------------------------------------------- props */

interface HoverGroup {
    reach: number
    lift: number
    damping: number
}

interface Props {
    portraitImage?: any
    background?: string
    density?: number
    dotSize?: number
    hover?: Partial<HoverGroup>
    width?: number
    height?: number
    style?: React.CSSProperties
}

const HOVER_DEFAULTS: HoverGroup = {
    reach: 20,
    lift: 79,
    damping: 34,
}

/* ----------------------------------------------------------------- component */

export default function SpectralParticles(props: Props) {
    const {
        portraitImage = "https://images.unsplash.com/photo-1659787050050-d5aa2b1ec0dc?q=80&w=1309&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        background = "#000000",
        density = 50,
        dotSize = 50,
        style,
    } = props

    const { reach, lift, damping } = {
        ...HOVER_DEFAULTS,
        ...(props.hover ?? {}),
    }

    const rawSrc: any = portraitImage
    const imageSrc: string =
        (typeof rawSrc === "string" ? rawSrc : rawSrc?.src) || DEFAULT_IMAGE

    const isCanvas = false

    const effectiveDensity = React.useMemo(() => {
        const pct = Math.max(0, Math.min(100, density)) / 100
        let base = Math.round(DENSITY_MIN + pct * (DENSITY_MAX - DENSITY_MIN))
        if (isCanvas) return Math.min(base, CANVAS_DENSITY_CAP)
        const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
        if (dpr > 2) base = Math.floor(base * 0.75)
        return base
    }, [density, isCanvas])

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const live = useRef<any>({})
    live.current = {
        brush: reach / 100,
        strength: SHIPPED_STRENGTH,
        returnSpeed: SHIPPED_RETURN_SPEED,
        damping: Math.max(1, Math.min(100, damping)) / 100,
        jitterSpeed: SHIPPED_JITTER_SPEED,
        baseJitter: BASE_JITTER,
        interJitter: lift,
        jitterX: JITTER_X,
        jitterY: JITTER_Y,
        particleSize: (Math.max(0, Math.min(100, dotSize)) / 100) * DOT_PX_AT_100,
        imageScale: IMAGE_SCALE,
        density: effectiveDensity,
        isCanvas,
    }

    const imageRef = useRef<{ data: Uint8ClampedArray; w: number; h: number; aspect: number } | null>(null)
    const imageVer = useRef(0)

    useEffect(() => {
        let dead = false
        const im = new Image()
        im.crossOrigin = "anonymous"
        im.onload = () => {
            if (dead) return
            const w = im.naturalWidth || im.width
            const h = im.naturalHeight || im.height
            if (!w || !h) return
            const c = document.createElement("canvas")
            c.width = w
            c.height = h
            const ctx = c.getContext("2d", { willReadFrequently: true })
            if (!ctx) return
            ctx.drawImage(im, 0, 0, w, h)
            let data: Uint8ClampedArray
            try {
                data = ctx.getImageData(0, 0, w, h).data
            } catch (err) {
                console.warn("SpectralParticles: image is cross-origin tainted", imageSrc)
                return
            }
            imageRef.current = { data, w, h, aspect: w / h }
            imageVer.current++
        }
        im.onerror = () => console.warn("SpectralParticles: image failed to load", imageSrc)
        im.src = imageSrc
        return () => {
            dead = true
        }
    }, [imageSrc])

    const pointer = useRef({
        tx: OFF_FIELD, ty: OFF_FIELD,
        sx: OFF_FIELD, sy: OFF_FIELD,
    })

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return

        const ctx = makeContext(canvas)
        if (!ctx) {
            console.warn("SpectralParticles: no WebGL context")
            return
        }
        const { gl, webgl2, floatRT } = ctx
        if (!floatRT) {
            console.warn(
                "SpectralParticles: no float render target — rendering the portrait at rest, physics disabled"
            )
        }
        const fmt = floatFormat(gl, webgl2)

        const sim = floatRT
            ? buildProgram(gl, QUAD_VS, ENGINE.sim, ENGINE.simU, "sim")
            : { prog: null, u: {}, nulls: [] }
        const draw = buildProgram(gl, ENGINE.vs, ENGINE.fs, ENGINE.drawU, "draw")
        if (!draw || !sim) return
        if (sim.nulls.length || draw.nulls.length) {
            console.warn(
                "SpectralParticles: null uniform locations",
                sim.nulls.concat(draw.nulls)
            )
        }
        const PR: any = {
            sim,
            draw,
            aColor: gl.getAttribLocation(draw.prog, "a_color"),
            aUv: gl.getAttribLocation(draw.prog, "a_uv"),
            aRandom: gl.getAttribLocation(draw.prog, "a_random"),
            aHome: gl.getAttribLocation(draw.prog, "a_home"),
            aQuad: sim.prog ? gl.getAttribLocation(sim.prog, "a_quad") : -1,
        }

        const quadBuf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf)
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
            gl.STATIC_DRAW
        )

        const dummyTex = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, dummyTex)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
            new Uint8Array([0, 0, 0, 0]))
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.bindTexture(gl.TEXTURE_2D, null)

        const bufColor = gl.createBuffer()
        const bufUv = gl.createBuffer()
        const bufRandom = gl.createBuffer()
        const bufHome = gl.createBuffer()

        let builtKey = ""
        let pendingKey = ""
        let pendingSince = 0
        let builder: any = null
        let count = 0
        let texSize = 0
        let homeTex: WebGLTexture | null = null
        let rtA: any = null
        let rtB: any = null
        let ready = false
        let seeded = false
        let gridStep = 0
        let srcH = 0

        const disposeSet = () => {
            if (homeTex) gl.deleteTexture(homeTex)
            if (rtA) { gl.deleteTexture(rtA.tex); gl.deleteFramebuffer(rtA.fbo) }
            if (rtB) { gl.deleteTexture(rtB.tex); gl.deleteFramebuffer(rtB.fbo) }
            homeTex = null
            rtA = null
            rtB = null
            ready = false
        }

        const upload = (r: any) => {
            disposeSet()
            count = r.count
            texSize = r.texSize
            if (!count) return

            homeTex = makeStateTexture(gl, fmt, texSize, r.home)

            gl.bindBuffer(gl.ARRAY_BUFFER, bufColor)
            gl.bufferData(gl.ARRAY_BUFFER, r.color.subarray(0, count * 4), gl.STATIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, bufUv)
            gl.bufferData(gl.ARRAY_BUFFER, r.uv.subarray(0, count * 2), gl.STATIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, bufRandom)
            gl.bufferData(gl.ARRAY_BUFFER, r.rand.subarray(0, count * 3), gl.STATIC_DRAW)
            if (!floatRT) {
                gl.bindBuffer(gl.ARRAY_BUFFER, bufHome)
                gl.bufferData(gl.ARRAY_BUFFER, r.home.subarray(0, count * 4), gl.STATIC_DRAW)
            }

            if (floatRT) {
                rtA = makeRenderTarget(gl, fmt, texSize)
                rtB = makeRenderTarget(gl, fmt, texSize)
                if (!rtA.ok || !rtB.ok) {
                    console.warn("SpectralParticles: float framebuffer incomplete")
                    disposeSet()
                    return
                }
            }
            gridStep = r.gridStep
            srcH = r.srcH
            ready = true
            seeded = false
        }

        const simUniforms = (P: any, L: any, isInit: number, srcTex: WebGLTexture) => {
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, srcTex)
            gl.uniform1i(P.u.u_posTex, 0)
            gl.activeTexture(gl.TEXTURE1)
            gl.bindTexture(gl.TEXTURE_2D, homeTex)
            gl.uniform1i(P.u.u_homeTex, 1)
            gl.uniform2f(P.u.u_mouse, pointer.current.sx, pointer.current.sy)
            gl.uniform1f(P.u.u_imageScale, L.imageScale)
            gl.uniform1f(P.u.u_brushSize, L.brush)
            gl.uniform1f(P.u.u_strength, L.strength)
            gl.uniform1f(P.u.u_returnSpeed, L.returnSpeed)
            gl.uniform1f(P.u.u_damping, L.damping)
            gl.uniform1f(P.u.u_isInit, isInit)
        }

        const simPass = (P: any, aQuad: number, L: any, isInit: number, dst: any, srcTex: WebGLTexture) => {
            gl.useProgram(P.prog)
            gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo)
            gl.viewport(0, 0, texSize, texSize)
            gl.disable(gl.BLEND)
            simUniforms(P, L, isInit, srcTex)
            gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf)
            gl.enableVertexAttribArray(aQuad)
            gl.vertexAttribPointer(aQuad, 2, gl.FLOAT, false, 0, 0)
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
            gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        }

        const seedState = (L: any) => {
            if (!floatRT || !ready) return
            simPass(PR.sim, PR.aQuad, L, 1, rtA, homeTex!)
            simPass(PR.sim, PR.aQuad, L, 1, rtB, homeTex!)
        }

        let cssW = 0
        let cssH = 0
        let aspect = 16 / 9
        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
            cssW = canvas.clientWidth || host.clientWidth || 0
            cssH = canvas.clientHeight || host.clientHeight || 0
            const w = Math.max(1, Math.round(cssW * dpr))
            const h = Math.max(1, Math.round(cssH * dpr))
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w
                canvas.height = h
            }
            aspect = w / h
            bounds = null
        }

        let bounds: DOMRect | null = null
        const clearPointer = () => {
            const p = pointer.current
            p.tx = OFF_FIELD; p.ty = OFF_FIELD
            p.sx = OFF_FIELD; p.sy = OFF_FIELD
        }

        const movePointer = (clientX: number, clientY: number) => {
            if (!bounds) bounds = host.getBoundingClientRect()
            const r = bounds
            if (!r.width || !r.height) return
            const mx = r.width * 0.01
            const my = r.height * 0.01
            if (
                clientX <= r.left + mx || clientX >= r.right - mx ||
                clientY <= r.top + my || clientY >= r.bottom - my
            ) {
                clearPointer()
                return
            }
            const nx = ((clientX - r.left) / r.width) * 2 - 1
            const ny = -(((clientY - r.top) / r.height) * 2 - 1)
            pointer.current.tx = nx * (r.width / r.height)
            pointer.current.ty = ny
        }

        const isOutside = (e: Event) => POINTER_LOCAL && e.target !== host

        const onMouseMove = (e: MouseEvent) => {
            if (isOutside(e)) { clearPointer(); return }
            movePointer(e.clientX, e.clientY)
        }
        const onTouchMove = (e: TouchEvent) => {
            if (isOutside(e)) { clearPointer(); return }
            if (e.touches[0]) movePointer(e.touches[0].clientX, e.touches[0].clientY)
        }
        const onTouchStart = (e: TouchEvent) => {
            if (isOutside(e)) return
            if (e.touches[0]) movePointer(e.touches[0].clientX, e.touches[0].clientY)
        }
        const onTouchEnd = () => clearPointer()
        const onScroll = () => { bounds = null }
        const onLeave = () => clearPointer()
        const onEnter = () => { bounds = null }

        window.addEventListener("mousemove", onMouseMove, { passive: true })
        window.addEventListener("touchstart", onTouchStart, { passive: true })
        window.addEventListener("touchmove", onTouchMove, { passive: true })
        window.addEventListener("touchend", onTouchEnd, { passive: true })
        window.addEventListener("scroll", onScroll, { passive: true })
        host.addEventListener("mouseleave", onLeave)
        host.addEventListener("mouseenter", onEnter)

        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(canvas)

        let visible = true
        let io: IntersectionObserver | null = null
        if (!live.current.isCanvas) {
            io = new IntersectionObserver(
                ([entry]) => {
                    visible = entry.isIntersecting
                    if (!visible) clearPointer()
                },
                { threshold: 0.01 }
            )
            io.observe(host)
        }

        gl.disable(gl.DEPTH_TEST)

        let raf = 0
        let lastFrame = -1e9
        let clock = 0
        let lastClock = performance.now()

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)

            const L = live.current
            const interval = L.isCanvas ? 1000 / CANVAS_FPS : 0
            if (now - lastFrame < interval) return
            lastFrame = now

            const dt = Math.min((now - lastClock) / 1000, 0.05)
            lastClock = now
            clock += dt

            const img = imageRef.current
            const key = img ? imageVer.current + "|" + Math.round(L.density) : ""
            if (key && key !== builtKey && !builder) {
                if (key !== pendingKey) {
                    pendingKey = key
                    pendingSince = now
                } else if (now - pendingSince >= REBUILD_DEBOUNCE_MS) {
                    builder = makeBuilder(
                        img!.data, img!.w, img!.h, img!.aspect, L.density
                    )
                }
            }
            if (builder) {
                if (builder.step(BUILD_BUDGET_MS)) {
                    upload(builder.result())
                    builtKey = pendingKey
                    builder = null
                }
            }

            if (!visible || !ready || !count) return

            const p = pointer.current
            if (p.tx < -5) {
                p.sx += (p.tx - p.sx) * 0.08
                p.sy += (p.ty - p.sy) * 0.08
            } else if (p.sx < -5) {
                p.sx = p.tx
                p.sy = p.ty
            } else {
                p.sx += (p.tx - p.sx) * 0.15
                p.sy += (p.ty - p.sy) * 0.15
            }

            if (!seeded) {
                seedState(L)
                seeded = true
            }

            if (floatRT) {
                simPass(PR.sim, PR.aQuad, L, 0, rtB, rtA.tex)
                const t = rtA
                rtA = rtB
                rtB = t
            }

            gl.useProgram(PR.draw.prog)
            gl.viewport(0, 0, canvas.width, canvas.height)
            gl.enable(gl.BLEND)
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, floatRT ? rtA.tex : dummyTex)
            gl.uniform1i(PR.draw.u.u_posTex, 0)
            gl.uniform1f(PR.draw.u.u_static, floatRT ? 0 : 1)
            gl.uniform1f(PR.draw.u.u_imageScale, L.imageScale)
            gl.uniform1f(PR.draw.u.u_time, clock)
            gl.uniform1f(PR.draw.u.u_aspect, aspect)
            gl.uniform1f(PR.draw.u.u_baseJitter, L.baseJitter)
            gl.uniform1f(PR.draw.u.u_interJitter, L.interJitter)
            gl.uniform2f(PR.draw.u.u_jitterAxis, L.jitterX, L.jitterY)
            gl.uniform1f(PR.draw.u.u_jitterSpeed, L.jitterSpeed)
            gl.uniform1f(PR.draw.u.u_brushSize, L.brush)
            const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
            const resScale = Math.max(1, cssW / 1200)
            const pointPx = L.particleSize * dpr * resScale
            gl.uniform1f(PR.draw.u.u_particleSize, pointPx)
            gl.uniform1f(
                PR.draw.u.u_alphaComp,
                1 / overlapCount(gridStep, srcH, L.imageScale, canvas.height, pointPx)
            )

            gl.bindBuffer(gl.ARRAY_BUFFER, bufColor)
            gl.enableVertexAttribArray(PR.aColor)
            gl.vertexAttribPointer(PR.aColor, 4, gl.FLOAT, false, 0, 0)
            gl.bindBuffer(gl.ARRAY_BUFFER, bufUv)
            gl.enableVertexAttribArray(PR.aUv)
            gl.vertexAttribPointer(PR.aUv, 2, gl.FLOAT, false, 0, 0)
            gl.bindBuffer(gl.ARRAY_BUFFER, bufRandom)
            gl.enableVertexAttribArray(PR.aRandom)
            gl.vertexAttribPointer(PR.aRandom, 3, gl.FLOAT, false, 0, 0)
            if (PR.aHome >= 0) {
                if (floatRT) {
                    gl.disableVertexAttribArray(PR.aHome)
                    gl.vertexAttrib4f(PR.aHome, 0, 0, 0, 0)
                } else {
                    gl.bindBuffer(gl.ARRAY_BUFFER, bufHome)
                    gl.enableVertexAttribArray(PR.aHome)
                    gl.vertexAttribPointer(PR.aHome, 4, gl.FLOAT, false, 0, 0)
                }
            }

            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)
            if (pointPx > 0) gl.drawArrays(gl.POINTS, 0, count)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            if (io) io.disconnect()
            window.removeEventListener("mousemove", onMouseMove)
            window.removeEventListener("touchstart", onTouchStart)
            window.removeEventListener("touchmove", onTouchMove)
            window.removeEventListener("touchend", onTouchEnd)
            window.removeEventListener("scroll", onScroll)
            host.removeEventListener("mouseleave", onLeave)
            host.removeEventListener("mouseenter", onEnter)
            disposeSet()
        }
    }, [])

    const autoHeight = !style?.height || style.height === "auto"

    return (
        <div
            ref={hostRef}
            style={{
                minWidth: 1200,
                minHeight: 800,
                width: "100%",
                height: autoHeight ? "auto" : style!.height,
                aspectRatio: autoHeight ? ASPECT_RATIO.replace(/\s+/g, "") : undefined,
                position: "relative",
                overflow: "hidden",
                touchAction: "none",
                ...style,
                backgroundColor: background,
                cursor: HIDE_CURSOR ? "none" : "auto",
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
                    pointerEvents: "none",
                }}
            />
        </div>
    )
}
