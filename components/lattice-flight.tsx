"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/* ---------------------------------------------------------------- constants */

const DPR_MIN = 1
/** 80 marching steps per pixel is the frame's whole cost, so the buffer is
 *  capped well under the display's DPR. Not a dial (rule 8b: quality knobs are
 *  the component's own job). */
const DPR_CAP = 1.5

/** Marching bound compiled into the shader — WebGL1 needs a constant. */
const MAX_STEPS = 80
/** Bound on the walk that gets the ray origin out of a strut the camera is
 *  passing through, and the overshoot each step adds. */
const ESCAPE_STEPS = 16
const ESCAPE_EPS = 0.002

/** Hit epsilon and far clip, both the reference's. */
const HIT_EPS = 0.001
const FAR_CLIP = 100.0

/** World units per second of forward flow at Speed 50 — the reference's
 *  `iTime * 0.3`. */
const FLOW_AT_50 = 0.3

/** Depth ramp at Fog 100 — the reference's `t * 0.09`. */
const FOG_AT_100 = 0.09

/** Half-extent of the box frame inside its cell. The cell is one unit and the
 *  frame fills it, so neighbouring cells share their struts and the lattice
 *  reads as continuous. Frozen, not a dial: any other value opens gaps that
 *  make the grid stop being a grid. */
const CELL_HALF = 0.5

/* ------------------------------------------------------------------ shaders */

const VERT = `
precision highp float;
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

/* Rule 6: highp, and mobile silently downgrades it — so no divide-by-near-zero
 * math anywhere below. The march is adds and multiplies plus one normalize of
 * a vector whose z is 1. */
const FRAG = `
precision highp float;

#define MAX_STEPS ${MAX_STEPS}
#define ESCAPE_STEPS ${ESCAPE_STEPS}

uniform vec2  uBuf;     // drawing buffer, device px — pixel lookup only
uniform vec2  uRes;     // host box, CSS px — aspect only
uniform vec2  uAngles;  // yaw, pitch in radians
uniform float uFlow;    // forward travel, in CELLS, wrapped to [0,1)
uniform float uScale;   // cells per world unit
uniform float uThick;   // frame bar half-thickness, cell units
uniform float uDist;    // camera pullback along -z
uniform float uFog;     // depth ramp per world unit
uniform vec3  uBase;

mat2 rot2D(float a) {
    return mat2(cos(a), -sin(a), sin(a), cos(a));
}

// iq — https://iquilezles.org/articles/distfunctions/
float sdBoxFrame(vec3 p, vec3 b, float e) {
       p = abs(p)-b;
  vec3 q = abs(p+e)-e;
  return min(min(
      length(max(vec3(p.x,q.y,q.z),0.0))+min(max(p.x,max(q.y,q.z)),0.0),
      length(max(vec3(q.x,p.y,q.z),0.0))+min(max(q.x,max(p.y,q.z)),0.0)),
      length(max(vec3(q.x,q.y,p.z),0.0))+min(max(q.x,max(q.y,p.z)),0.0));
}

// Scene distance. Space is scaled into cell units, translated along z, then
// folded — so the returned distance is divided back out by the scale to stay a
// world-space bound.
float map(vec3 p) {
    vec3 c = p * uScale;
    c.z += uFlow;
    vec3 q = fract(c) - 0.5;
    return sdBoxFrame(q, vec3(${CELL_HALF.toFixed(3)}), uThick) / uScale;
}

void main() {
    // p5 hands the reference a top-origin vTexCoord; gl_FragCoord is
    // bottom-origin, so y is flipped here to keep the drag's vertical sense.
    vec2 coord = vec2(gl_FragCoord.x / uBuf.x, 1.0 - gl_FragCoord.y / uBuf.y);
    vec2 uv = (coord * 2.0 - 1.0) * vec2(uRes.x / uRes.y, 1.0);

    vec3 ro = vec3(0.0, 0.0, -uDist);
    vec3 rd = normalize(vec3(uv, 1.0));

    ro.yz *= rot2D(-uAngles.y);
    rd.yz *= rot2D(-uAngles.y);
    ro.xz *= rot2D(-uAngles.x);
    rd.xz *= rot2D(-uAngles.x);

    // The camera orbits INSIDE the lattice, so it periodically passes through
    // a strut. Marched from inside a surface, the very first step satisfies
    // d < eps for EVERY ray — the march terminates at t = 0 and the whole
    // frame goes black. Measured on the shipped view: 4 of 40 samples across
    // one cell of travel were fully blank, a hard strobe roughly every two
    // seconds at Speed 50.
    //
    // So walk out of the surface first. -d is the depth inside, so stepping
    // that far plus a hair converges out of a thin bar in a couple of
    // iterations. ro is the same for every pixel, so the branch is coherent
    // and this costs one extra map() when the camera is in free space — where
    // it exits immediately and leaves the reference's image untouched.
    float t = 0.0;
    for (int i = 0; i < ESCAPE_STEPS; i++) {
        float d = map(ro + rd * t);
        if (d > 0.0) break;
        t += -d + ${ESCAPE_EPS.toFixed(4)};
    }

    for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * t;
        float d = map(p);
        t += d;
        if (d < ${HIT_EPS.toFixed(4)} || t > ${FAR_CLIP.toFixed(1)}) break;
    }

    float a = clamp(t * uFog, 0.0, 1.0);
    gl_FragColor = vec4(uBase * a, a);   // premultiplied
}
`

/* ------------------------------------------------------------------- helpers */

function parseColor(input: string): [number, number, number] {
    if (!input) return [0, 0, 0]
    const s = input.trim()
    const fn = s.match(/rgba?\(([^)]+)\)/i)
    if (fn) {
        const p = fn[1].split(",").map((v) => parseFloat(v.trim()))
        return [(p[0] || 0) / 255, (p[1] || 0) / 255, (p[2] || 0) / 255]
    }
    let h = s.replace("#", "")
    if (h.length === 3 || h.length === 4)
        h = h.split("").map((ch) => ch + ch).join("")
    h = h.padEnd(6, "0")
    return [
        parseInt(h.slice(0, 2), 16) / 255,
        parseInt(h.slice(2, 4), 16) / 255,
        parseInt(h.slice(4, 6), 16) / 255,
    ]
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
    const sh = gl.createShader(type)!
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS))
        console.warn("LatticeFlight shader:", gl.getShaderInfoLog(sh))
    return sh
}

function linkProg(gl: WebGLRenderingContext, vs: string, fs: string) {
    const prog = gl.createProgram()!
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, vs))
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, fs))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
        console.warn("LatticeFlight link:", gl.getProgramInfoLog(prog))
    return prog
}

/* --------------------------------------------------------------------- props */

interface CameraGroup {
    /** Degrees about the world Y axis. The resting view; a drag overrides it. */
    yaw?: number
    /** Degrees about the world X axis. */
    pitch?: number
}

/* A group the designer never opened arrives undefined, so it is spread over a
 * typed literal rather than read through a `??` chain (rule 11).
 *
 * The defaults are the reference's opening view, not round numbers: it starts
 * from `viewX = viewY = 300` PIXELS, which is resolution-dependent and means
 * nothing on a canvas. Evaluated at this component's 1200x800 floor,
 * m.x = (600-1200)/800 = -0.75 rad and m.y = (600-800)/800 = -0.25 rad. */
const CAMERA_DEFAULTS: Required<CameraGroup> = { yaw: -43, pitch: 65 }

interface Props {
    background?: string
    baseColor?: string
    /** 20..400 % of the density the lattice shipped at. Cells per world unit. */
    density?: number
    /** -100..100; 50 is the flow rate the lattice shipped at, 0 stops it, and
     *  the sign is the direction of travel. */
    speed?: number
    /** 1..40 % of a half-cell — the strut gauge. 5 is the reference's 0.025. */
    thickness?: number
    /** 10..400 % — how fast depth ramps up to the base colour. */
    fog?: number
    /** Camera pullback along -z, world units. */
    distance?: number
    camera?: CameraGroup
    width?: number
    height?: number
    style?: React.CSSProperties
}

/* ----------------------------------------------------------------- component */

export default function LatticeFlight(props: Props) {
    const {
        background = "#000000",
        baseColor = "rgb(0, 255, 255)",
        density = 307,
        speed = 27,
        thickness = 4,
        fog = 100,
        distance = 3,
        camera,
        style,
    } = props

    const cam: Required<CameraGroup> = { ...CAMERA_DEFAULTS, ...(camera || {}) }

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    /** Set by a drag, in radians. Null means "the dials own the view" — and
     *  editing either dial hands ownership back (rule F: a control a gesture
     *  can permanently silence maps to nothing). */
    const dragAngles = useRef<{ x: number; y: number } | null>(null)

    const live = useRef({
        baseColor, density, speed, thickness, fog, distance,
        yaw: cam.yaw, pitch: cam.pitch,
    })
    live.current = {
        baseColor, density, speed, thickness, fog, distance,
        yaw: cam.yaw, pitch: cam.pitch,
    }

    useEffect(() => {
        dragAngles.current = null
    }, [cam.yaw, cam.pitch])

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return

        const gl = canvas.getContext("webgl", {
            alpha: true,
            antialias: false,
            premultipliedAlpha: true,
            depth: false,
        }) as WebGLRenderingContext | null
        if (!gl) return

        const prog = linkProg(gl, VERT, FRAG)
        gl.useProgram(prog)

        const aPos = gl.getAttribLocation(prog, "aPos")
        const U = (n: string) => gl.getUniformLocation(prog, n)
        const u = {
            buf: U("uBuf"), res: U("uRes"), angles: U("uAngles"),
            flow: U("uFlow"), scale: U("uScale"), thick: U("uThick"),
            dist: U("uDist"), fog: U("uFog"), base: U("uBase"),
        }

        const tri = gl.createBuffer()!
        gl.bindBuffer(gl.ARRAY_BUFFER, tri)
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 3, -1, -1, 3]),
            gl.STATIC_DRAW
        )
        gl.enableVertexAttribArray(aPos)
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

        gl.disable(gl.DEPTH_TEST)
        gl.disable(gl.BLEND)

        /* ---- sizing ---- */
        let cssW = 0, cssH = 0, dpr = 1
        const resize = () => {
            dpr = Math.min(Math.max(window.devicePixelRatio || 1, DPR_MIN), DPR_CAP)
            // clientWidth, never getBoundingClientRect: the rect carries the
            // canvas zoom, and in preview the injected size props are not
            // numeric at all (rule G).
            cssW = canvas.clientWidth || host.clientWidth || 1
            cssH = canvas.clientHeight || host.clientHeight || 1
            const wpx = Math.max(1, Math.round(cssW * dpr))
            const hpx = Math.max(1, Math.round(cssH * dpr))
            if (canvas.width !== wpx || canvas.height !== hpx) {
                canvas.width = wpx
                canvas.height = hpx
            }
            gl.viewport(0, 0, wpx, hpx)
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(canvas)

        /* ---- flow accumulator, in CELLS ----
         * Kept in cell units and wrapped to [0,1) every frame: unbounded it
         * would eventually cost float32 precision inside fract(), and holding
         * the phase in cells rather than world units means a Density edit
         * re-scales the grid without also jumping its position. */
        let flow = 0

        let raf = 0
        let last = performance.now()

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = Math.min((now - last) / 1000, 0.05)
            last = now
            if (cssW <= 0 || cssH <= 0) { resize(); return }

            const L = live.current
            const scale = Math.max(L.density, 1) / 100
            flow += dt * FLOW_AT_50 * (L.speed / 50) * scale
            flow -= Math.floor(flow)

            const a = dragAngles.current ?? {
                x: (L.yaw * Math.PI) / 180,
                y: (L.pitch * Math.PI) / 180,
            }

            const [br, bgc, bb] = parseColor(L.baseColor)

            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)

            gl.uniform2f(u.buf, canvas.width, canvas.height)
            gl.uniform2f(u.res, cssW, cssH)
            gl.uniform2f(u.angles, a.x, a.y)
            gl.uniform1f(u.flow, flow)
            gl.uniform1f(u.scale, scale)
            gl.uniform1f(u.thick, (Math.max(L.thickness, 1) / 100) * CELL_HALF)
            gl.uniform1f(u.dist, Math.max(L.distance, 1))
            gl.uniform1f(u.fog, FOG_AT_100 * (Math.max(L.fog, 1) / 100))
            gl.uniform3f(u.base, br, bgc, bb)

            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }
        raf = requestAnimationFrame(frame)

        /* ---- drag: absolute pointer position -> absolute view angle ----
         * The reference's mapping exactly. viewY is flipped to a bottom-origin
         * pixel before the same normalisation the shader's mouse math used, so
         * the two angles come out in radians on the same scale the dials use. */
        let dragging = false
        const aim = (e: PointerEvent) => {
            const r = host.getBoundingClientRect()
            // Both sides carry the canvas zoom; clientWidth is the unzoomed
            // reference (rule G).
            const sx = r.width > 0 ? host.clientWidth / r.width : 1
            const sy = r.height > 0 ? host.clientHeight / r.height : 1
            const px = (e.clientX - r.left) * sx
            const py = (e.clientY - r.top) * sy
            const h = cssH || 1
            dragAngles.current = {
                x: (2 * px - (cssW || 1)) / h,
                y: (2 * (h - py) - h) / h,
            }
        }
        const onDown = (e: PointerEvent) => {
            dragging = true
            aim(e)
            host.style.cursor = "grabbing"
        }
        const onMove = (e: PointerEvent) => { if (dragging) aim(e) }
        const onUp = () => {
            dragging = false
            host.style.cursor = "grab"
        }

        host.addEventListener("pointerdown", onDown)
        // On window, not the host: a pointer that leaves mid-drag must keep
        // steering and must still release (rule K).
        window.addEventListener("pointermove", onMove)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            host.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointermove", onMove)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
            // No loseContext() — rule 6.
        }
    }, [])

    return (
        <div
            ref={hostRef}
            style={{
                // Floor before the style spread (rule 6).
                minWidth: 1200,
                minHeight: 800,
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                background,
                cursor: "grab",
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
