"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    seed: 76,
    foldSpeed: 142,
    bandSpeed: 15,
    foldWidth: 12,
    foldHeight: 50,
    foldDepth: 70,
    bottomFolds: 160,
    bandWarp: 88,
    slabVariation: 0,
    capSmooth: 100,
    bevel: 10,
    centerX: 50,
    centerY: 51,
    skyColor: "#F4FFFF",
    horizonColor: "#B8F6FB",
    shadowColor: "#2F4FE0",
    grooveColor: "#56667A",
    lightAngle: 40,
    lightPower: 120,
    shininess: 10,
    rim: 70,
    filmBands: 120,
    filmPatches: 60,
    grooveDark: 75,
    glowColor: "#3F7FA6",
    glowSize: 8,
    glow: 35,
    exposure: 105,
    steps: 96,
    resolution: 100,
    grain: 0,
    vignette: 0,
}

const VERT = `#version 300 es
void main() {
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

const FRAG = `#version 300 es
precision highp float;
out vec4 outColor;

uniform vec2 uRes;
uniform vec2 uCenter;
uniform float uRadius;
uniform float uPx;
uniform float uAmp;
uniform float uBands;
uniform float uFoldTime;
uniform float uBandTime;
uniform vec4 uFold;   // fx, fy, depth, bottom weight
uniform vec4 uSlab;   // warp, variation, cap smooth, bevel
uniform vec3 uBase;
uniform vec3 uSky;
uniform vec3 uHorizon;
uniform vec3 uShadow;
uniform vec3 uGroove;
uniform vec3 uBg;
uniform vec3 uGlow;
uniform vec3 uLightDir;
uniform vec4 uShade;  // light power, shininess, rim, groove dark
uniform vec4 uFilm;   // iridescence, film bands, patches, exposure
uniform vec4 uPost;   // glow size, glow, grain, vignette
uniform float uSteps;
uniform float uFrame;
uniform mat3 uRot;

float hash3(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float vnoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash3(i);
    float b = hash3(i + vec3(1.0, 0.0, 0.0));
    float c = hash3(i + vec3(0.0, 1.0, 0.0));
    float d = hash3(i + vec3(1.0, 1.0, 0.0));
    float e = hash3(i + vec3(0.0, 0.0, 1.0));
    float g = hash3(i + vec3(1.0, 0.0, 1.0));
    float h = hash3(i + vec3(0.0, 1.0, 1.0));
    float k = hash3(i + vec3(1.0, 1.0, 1.0));
    return mix(mix(mix(a, b, f.x), mix(c, d, f.x), f.y),
               mix(mix(e, g, f.x), mix(h, k, f.x), f.y), f.z) * 2.0 - 1.0;
}

// Per-slab value that drifts over time (0..1)
float slabNoise(float idx, float salt, float T) {
    float i = floor(T);
    float f = fract(T);
    f = f * f * (3.0 - 2.0 * f);
    return mix(hash3(vec3(idx, salt, i)), hash3(vec3(idx, salt, i + 1.0)), f);
}

// Each slab is a disc of its own radius, skewed sideways so it sticks out on one side
float slabH(float idx, vec3 p) {
    float a = slabNoise(idx, 1.7, uBandTime);
    float b = slabNoise(idx, 5.3, uBandTime * 0.8 + 3.0) * 2.0 - 1.0;
    return (a * 1.3 - 0.35) * (uSlab.y + 0.3) + uSlab.y * 0.9 * b * p.x;
}

float bandCoord(vec3 p) {
    float warp = vnoise(vec3(p.x * 0.8, p.y * 1.2, p.z * 0.8 + uBandTime));
    return (p.y + uSlab.x * 0.14 * warp + 0.06 * sin(p.y * 2.7 + 1.3)) * uBands * 0.5 + 0.37;
}

float grooveAt(float s) {
    float f = fract(s);
    float db = min(f, 1.0 - f);
    float dip = 1.0 - smoothstep(0.0, 0.1, db);
    float gd = smoothstep(0.3, 0.6, slabNoise(floor(s + 0.5), 9.1, uBandTime * 0.7 + 1.0));
    return gd * dip;
}

float field(vec3 p) {
    p = uRot * p;
    float s = bandCoord(p);
    float idx = floor(s);
    float f = fract(s);
    float bev = uSlab.w;
    float slab = mix(slabH(idx, p), slabH(idx + 1.0, p), smoothstep(1.0 - bev, 1.0, f));
    float groove = grooveAt(s);

    float n1 = vnoise(vec3(p.x * uFold.x, p.y * uFold.y, p.z * uFold.x + uFoldTime));
    float pool = smoothstep(0.15, 0.5, n1);
    float n2 = vnoise(vec3(p.x * uFold.x * 2.6 + 5.2, p.y * uFold.y * 2.2 + 1.3, p.z * uFold.x * 2.6 - uFoldTime * 1.4));
    float bottom = smoothstep(0.1, -0.8, p.y);
    float cap = 1.0 - uSlab.z * smoothstep(0.55, 0.88, p.y);
    float folds = 0.6 * pool + 0.4 * n2 * (0.25 + uFold.w * bottom * 0.6);
    return uAmp * (slab - groove * 0.6 + uFold.z * folds * cap);
}

float map(vec3 p) {
    return length(p) - 1.0 - field(p);
}

vec3 calcN(vec3 p) {
    const vec2 k = vec2(1.0, -1.0);
    const float e = 0.002;
    return normalize(k.xyy * map(p + k.xyy * e) + k.yyx * map(p + k.yyx * e) +
                     k.yxy * map(p + k.yxy * e) + k.xxx * map(p + k.xxx * e));
}

vec3 env(vec3 r) {
    float y = r.y;
    vec3 c = mix(uBase, uHorizon, smoothstep(-0.35, 0.1, y));
    c = mix(c, uSky, smoothstep(0.15, 0.6, y));
    c = mix(c, uSky, 0.6 * smoothstep(0.3, 0.95, r.x));
    c *= 0.85 + 0.2 * smoothstep(-0.8, 0.6, r.x);
    return c;
}

void main() {
    float minS = min(uRes.x, uRes.y);
    vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / (0.5 * minS);
    vec2 dq = uv - uCenter;
    vec2 q = dq / uRadius;

    float r = length(q);
    float g = exp(-max(r - 1.0, 0.0) * uRadius / max(uPost.x, 0.001));
    float dirW = 0.45 + 0.55 * clamp(dot(normalize(dq + 1e-5), normalize(vec2(0.55, 0.85))), 0.0, 1.0);
    vec3 bg = uBg + uGlow * g * uPost.y * dirW;
    vec3 col = bg;

    float Rb = 1.0 + uAmp * (2.8 + uFold.z * 1.2 * (1.0 + uFold.w)) + 0.01;
    float q2 = dot(q, q);
    if (q2 < Rb * Rb) {
        float z = sqrt(Rb * Rb - q2);
        vec3 p = vec3(q, z);
        float t = 0.0;
        float dmin = 1e9;
        bool hit = false;
        float eps = 0.0015 + uPx * 0.5;
        for (int i = 0; i < 160; i++) {
            if (float(i) >= uSteps) break;
            p = vec3(q, z - t);
            float d = map(p);
            dmin = min(dmin, d);
            if (d < eps) { hit = true; break; }
            t += max(d * 0.38, eps * 0.5);
            if (t > 2.0 * z) break;
        }
        if (!hit && dmin < eps * 4.0 && t <= 2.0 * z) hit = true;

        if (hit) {
            vec3 n = calcN(p);
            float ndv = clamp(n.z, 0.0, 1.0);
            vec3 R = reflect(vec3(0.0, 0.0, -1.0), n);
            vec3 c = env(R);
            float fres = pow(1.0 - ndv, 2.5);

            // Broad rainbow reflections across the flat faces
            float fn = vnoise(vec3(p.x * 0.9 + 3.7, p.y * 1.6 + 1.1, p.z * 0.9 + uBandTime * 0.6));
            float hue = uFilm.y * (0.35 * R.x + 0.55 * R.y + 0.4 * (1.0 - ndv)) + 0.7 * fn;
            vec3 film = 0.5 + 0.5 * cos(6.2832 * (hue + vec3(0.0, 0.33, 0.67)));
            film = mix(film, vec3(1.0), 0.15) * 1.1;
            float mask = clamp((fn * 0.5 + 0.5 - (1.0 - uFilm.z)) * 2.2, 0.0, 1.0);
            mask *= 1.0 - smoothstep(0.45, 0.85, R.y);
            c = mix(c, film, uFilm.x * mask);

            // Deep blue horizon streak on slightly down-facing slopes
            c = mix(c, uShadow * 0.85, 0.55 * exp(-pow((R.y + 0.12) / 0.1, 2.0)));

            // Saturated cyan rims with a thin white edge
            c = mix(c, uBase * 1.15, clamp(fres * uShade.z * 1.2, 0.0, 1.0));
            c += vec3(0.9, 1.0, 1.0) * pow(fres, 6.0) * uShade.z * 0.8;

            // Grooves between slabs
            float gm = grooveAt(bandCoord(uRot * p));
            vec3 grooveC = mix(uGroove, uShadow, 0.35);
            c = mix(c, grooveC, uShade.w * gm);

            float k = max(dot(R, uLightDir), 0.0);
            c += vec3(pow(k, uShade.y)) * uShade.x + vec3(pow(k, 3.0)) * 0.18 * uShade.x;

            col = c * uFilm.w;
        } else {
            float cov = 1.0 - smoothstep(0.0, uPx * 1.5, dmin);
            col = mix(bg, uBase * 0.8, cov * 0.5);
        }
    }

    vec2 fuv = gl_FragCoord.xy / uRes - 0.5;
    float vd = length(fuv * uRes / minS);
    col *= 1.0 - uPost.w * smoothstep(0.35, 1.0, vd);
    col += (hash3(vec3(gl_FragCoord.xy, uFrame)) - 0.5) * uPost.z * 0.3;
    outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

const UNIFORMS = [
    "uRes", "uCenter", "uRadius", "uPx", "uAmp", "uBands", "uFoldTime", "uBandTime",
    "uFold", "uSlab", "uBase", "uSky", "uHorizon", "uShadow", "uGroove", "uBg", "uGlow",
    "uLightDir", "uShade", "uFilm", "uPost", "uSteps", "uFrame", "uRot",
]

type RGB = [number, number, number]

function parseColor(input: unknown, fallback = "#000000"): RGB {
    let s = String(input ?? "").trim()
    const v = s.match(/^var\([^,]+,\s*(.+)\)$/)
    if (v) s = v[1].trim()
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4) h = h.split("").map((c) => c + c).join("")
        if (h.length >= 6) {
            const n = parseInt(h.slice(0, 6), 16)
            if (!isNaN(n)) return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
        }
    }
    const m = s.match(/rgba?\(([^)]+)\)/i)
    if (m) {
        const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat)
        if (p.length >= 3 && p.slice(0, 3).every((x) => isFinite(x))) return [p[0] / 255, p[1] / 255, p[2] / 255]
    }
    return s === fallback ? [0, 0, 0] : parseColor(fallback, fallback)
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
    const sh = gl.createShader(type)
    if (!sh) throw new Error("createShader failed")
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(sh)
        gl.deleteShader(sh)
        throw new Error("Shader compile failed: " + log)
    }
    return sh
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

interface AdvancedProps {
    seed?: number
    foldSpeed?: number
    bandSpeed?: number
    foldWidth?: number
    foldHeight?: number
    foldDepth?: number
    bottomFolds?: number
    bandWarp?: number
    slabVariation?: number
    capSmooth?: number
    bevel?: number
    centerX?: number
    centerY?: number
    skyColor?: string
    horizonColor?: string
    shadowColor?: string
    grooveColor?: string
    lightAngle?: number
    lightPower?: number
    shininess?: number
    rim?: number
    filmBands?: number
    filmPatches?: number
    grooveDark?: number
    glowColor?: string
    glowSize?: number
    glow?: number
    exposure?: number
    steps?: number
    resolution?: number
    grain?: number
    vignette?: number
}

interface SingleGlossySphereProps {
    speed?: number
    scale?: number
    displacement?: number
    bands?: number
    iridescence?: number
    baseColor?: string
    background?: string
    dragSensitivity?: number
    autoRotate?: boolean
    rotateSpeed?: number
    advanced?: AdvancedProps
    style?: React.CSSProperties
}

/**
 * Iridescent liquid-chrome sphere: stacked offset slabs and lens folds displaced by evolving noise.
 */
export default function SingleGlossySphere(props: SingleGlossySphereProps) {
    const {
        speed = 50,
        scale = 71,
        displacement = 62,
        bands = 7,
        iridescence = 100,
        baseColor = "#00AFFF",
        background = "#010103",
        dragSensitivity = 100,
        autoRotate = true,
        rotateSpeed = 100,
        advanced = {},
        style,
    } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const valsRef = useRef<any>(null)
    const rotRef = useRef({ yaw: 0, pitch: 0 })
    valsRef.current = { speed, scale, displacement, bands, iridescence, baseColor, background, dragSensitivity, autoRotate, rotateSpeed, advanced }

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const gl = canvas.getContext("webgl2", {
            antialias: false,
            premultipliedAlpha: false,
            preserveDrawingBuffer: true,
        }) as WebGL2RenderingContext | null
        if (!gl) return

        const vs = compile(gl, gl.VERTEX_SHADER, VERT)
        const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
        const prog = gl.createProgram()
        if (!prog) throw new Error("createProgram failed")
        gl.attachShader(prog, vs)
        gl.attachShader(prog, fs)
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            throw new Error("Program link failed: " + gl.getProgramInfoLog(prog))
        }
        const loc: Record<string, WebGLUniformLocation> = {}
        for (const name of UNIFORMS) {
            const l = gl.getUniformLocation(prog, name)
            if (!l) throw new Error("Missing uniform " + name)
            loc[name] = l
        }
        const vao = gl.createVertexArray()

        const dbg = gl.getExtension("WEBGL_debug_renderer_info")
        const rendererName = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : ""
        const software = /swiftshader|llvmpipe|software/i.test(rendererName)

        const isStatic = false
        const mq = typeof window !== "undefined" && window.matchMedia
            ? window.matchMedia("(prefers-reduced-motion: reduce)")
            : null

        let cssW = root.offsetWidth
        let cssH = root.offsetHeight
        const ro = new ResizeObserver(() => {
            cssW = root.offsetWidth
            cssH = root.offsetHeight
        })
        ro.observe(root)

        const rot = rotRef.current
        let dragging = false
        let lastX = 0
        let lastY = 0
        const onPointerDown = (e: PointerEvent) => {
            dragging = true
            lastX = e.clientX
            lastY = e.clientY
            canvas.style.cursor = "grabbing"
        }
        const onPointerMove = (e: PointerEvent) => {
            if (!dragging) return
            const sens = (clamp(valsRef.current.dragSensitivity, 0, 100) / 100) * 0.012
            rot.yaw += (e.clientX - lastX) * sens
            rot.pitch = clamp(rot.pitch + (e.clientY - lastY) * sens, -1.4, 1.4)
            lastX = e.clientX
            lastY = e.clientY
        }
        const onPointerUp = () => {
            dragging = false
            canvas.style.cursor = "grab"
        }
        canvas.style.cursor = "grab"
        canvas.style.touchAction = "none"
        canvas.addEventListener("pointerdown", onPointerDown)
        window.addEventListener("pointermove", onPointerMove)
        window.addEventListener("pointerup", onPointerUp)
        window.addEventListener("pointercancel", onPointerUp)

        let raf = 0
        let last = -1
        let clock = 0
        let frame = 0
        let lastKey = ""

        const tick = (now: number) => {
            raf = requestAnimationFrame(tick)
            const v = valsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(v.advanced ?? {}) }

            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            const reduced = !!(mq && mq.matches)
            const moving = !isStatic && !reduced && v.speed > 0
            if (moving) {
                clock += (dt * v.speed) / 50
                if (clock > 2000) clock -= 2000
            }
            if (v.autoRotate && !isStatic && !reduced && !dragging) {
                rot.yaw += dt * (clamp(v.rotateSpeed, 0, 100) / 100) * 0.6
            }

            const pr = software ? 0.5 : Math.min(window.devicePixelRatio || 1, 2)
            const k = (pr * clamp(adv.resolution, 25, 100)) / 100
            let w = Math.max(1, Math.round(cssW * k))
            let h = Math.max(1, Math.round(cssH * k))
            const maxPx = 2.6e6
            if (w * h > maxPx) {
                const f = Math.sqrt(maxPx / (w * h))
                w = Math.max(1, Math.round(w * f))
                h = Math.max(1, Math.round(h * f))
            }
            let resized = false
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w
                canvas.height = h
                resized = true
            }

            const key = JSON.stringify(v) + "|" + rot.yaw.toFixed(4) + "," + rot.pitch.toFixed(4)
            if (!moving && !resized && key === lastKey) return
            lastKey = key
            frame = (frame + 1) % 1000

            const minS = Math.min(w, h)
            const radius = (0.86 * clamp(v.scale, 1, 400)) / 100
            const cx = (adv.centerX / 100 - 0.5) * (w / (0.5 * minS))
            const cy = (0.5 - adv.centerY / 100) * (h / (0.5 * minS))
            const a = (adv.lightAngle * Math.PI) / 180
            const lx = Math.sin(a)
            const ly = Math.cos(a)
            const lz = 0.6
            const ll = Math.hypot(lx, ly, lz)
            const seed = adv.seed

            gl.viewport(0, 0, w, h)
            gl.useProgram(prog)
            gl.bindVertexArray(vao)
            gl.uniform2f(loc.uRes, w, h)
            gl.uniform2f(loc.uCenter, cx, cy)
            gl.uniform1f(loc.uRadius, radius)
            gl.uniform1f(loc.uPx, 2 / (minS * radius))
            gl.uniform1f(loc.uAmp, (clamp(v.displacement, 0, 100) / 100) * 0.14)
            gl.uniform1f(loc.uBands, Math.max(1, v.bands))
            gl.uniform1f(loc.uFoldTime, seed * 2.9 + clock * (adv.foldSpeed / 100))
            gl.uniform1f(loc.uBandTime, seed * 1.7 + clock * (adv.bandSpeed / 100))
            gl.uniform4f(loc.uFold, adv.foldWidth / 10, adv.foldHeight / 10, adv.foldDepth / 100, adv.bottomFolds / 100)
            gl.uniform4f(loc.uSlab, adv.bandWarp / 100, adv.slabVariation / 100, adv.capSmooth / 100, clamp(adv.bevel, 10, 60) / 100)
            gl.uniform3fv(loc.uBase, parseColor(v.baseColor, "#47BDF3"))
            gl.uniform3fv(loc.uSky, parseColor(adv.skyColor, "#F4FFFF"))
            gl.uniform3fv(loc.uHorizon, parseColor(adv.horizonColor, "#B8F6FB"))
            gl.uniform3fv(loc.uShadow, parseColor(adv.shadowColor, "#2F4FE0"))
            gl.uniform3fv(loc.uGroove, parseColor(adv.grooveColor, "#56667A"))
            gl.uniform3fv(loc.uBg, parseColor(v.background, "#010103"))
            gl.uniform3fv(loc.uGlow, parseColor(adv.glowColor, "#3F7FA6"))
            gl.uniform3f(loc.uLightDir, lx / ll, ly / ll, lz / ll)
            gl.uniform4f(loc.uShade, adv.lightPower / 100, Math.max(1, adv.shininess), adv.rim / 100, adv.grooveDark / 100)
            gl.uniform4f(loc.uFilm, v.iridescence / 100, adv.filmBands / 100, adv.filmPatches / 100, adv.exposure / 100)
            gl.uniform4f(loc.uPost, (Math.max(0, adv.glowSize) / 100) * 2, adv.glow / 100, adv.grain / 100, adv.vignette / 100)
            gl.uniform1f(loc.uSteps, software ? Math.min(adv.steps, 64) : clamp(adv.steps, 8, 160))
            const cy_ = Math.cos(rot.yaw), sy_ = Math.sin(rot.yaw)
            const cp_ = Math.cos(rot.pitch), sp_ = Math.sin(rot.pitch)
            gl.uniformMatrix3fv(loc.uRot, false, new Float32Array([
                cy_, sp_ * sy_, -cp_ * sy_,
                0, cp_, sp_,
                sy_, -sp_ * cy_, cp_ * cy_,
            ]))
            gl.uniform1f(loc.uFrame, frame)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }
        raf = requestAnimationFrame(tick)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            canvas.removeEventListener("pointerdown", onPointerDown)
            window.removeEventListener("pointermove", onPointerMove)
            window.removeEventListener("pointerup", onPointerUp)
            window.removeEventListener("pointercancel", onPointerUp)
            gl.deleteVertexArray(vao)
            gl.deleteProgram(prog)
            gl.deleteShader(vs)
            gl.deleteShader(fs)
        }
    }, [])

    return (
        <div
            ref={rootRef}
            style={{
                minWidth: 1200,
                minHeight: 800,
                width: "100%",
                height: "100%",
                ...style,
                position: "relative",
                overflow: "hidden",
                background,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
            />
        </div>
    )
}

SingleGlossySphere.displayName = "Single Glossy Sphere"
