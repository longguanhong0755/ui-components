"use client"

import type { CSSProperties } from "react"
import * as React from "react"
import { useEffect, useRef } from "react"

// Framer's editing canvas does not exist outside Framer: this build always
// renders in a real browser. Same values the live preview runs under.
const RenderTarget = {
    current: () => "preview",
    hasRestrictions: () => false,
    canvas: "canvas",
    export: "export",
    preview: "preview",
    thumbnail: "thumbnail",
}

/**
 * Sphere Shield Tiled — a static hex-plated sphere; a latitude band of lit,
 * outward-extruded plates sweeps from the north pole to the south pole.
 *
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    periodMs: 1500,
    phaseMs: 1030,
    freezeMs: 900,
    tiltDeg: 6,
    offsetX: 0,
    offsetY: 0,
    gapPct: 6,
    leadPct: 60,
    fadeStartPct: 25,
    mottlePct: 20,
    mottleDimPct: 50,
    seed: 10,
    midColor: "#3B546E",
    hotColor: "#9FF0FD",
    hotPct: 70,
    backColor: "#151C24",
    backWallPct: 45,
    baseCenterPct: 0,
    wallPct: 45,
    rimPower: 50,
    rimStrength: 70,
    ambientPct: 70,
    lightAzDeg: 180,
    lightElDeg: 90,
    grain: 0,
    vignette: 0,
}

// ── moved controls (builder) ──
/**
 * Controls moved in the builder: into Advanced, out of it, or into groups of
 * their own. The code reads each one where it was first written, so the props
 * are put back in that shape before anything reads them.
 */
const MOVED_CONTROLS: { into: Record<string, string>; out: Record<string, string> } = {"into":{},"out":{"midColor":"advanced","hotColor":"advanced","backColor":"advanced"}}
const GROUP_FALLBACKS: Record<string, any> = { advanced: ADVANCED_DEFAULTS }
function withMovedControls(props: any): any {
    const out = { ...props }
    for (const [k, g] of Object.entries(MOVED_CONTROLS.into)) out[k] = props?.[g]?.[k] ?? GROUP_FALLBACKS[g]?.[k]
    for (const [k, g] of Object.entries(MOVED_CONTROLS.out)) {
        if (out[k] !== undefined) out[g] = { ...(out[g] ?? {}), [k]: out[k] }
    }
    return out
}
// ── /moved controls ──

type RGBA = [number, number, number, number]

function parseColor(input: unknown, fallback: RGBA): RGBA {
    if (typeof input !== "string" || !input.trim()) return fallback
    let s = input.trim()
    const v = s.match(/^var\([^,]+,\s*(.+)\)$/)
    if (v) s = v[1].trim()
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4) h = h.split("").map((c) => c + c).join("")
        if (h.length !== 6 && h.length !== 8) return fallback
        const n = (i: number) => parseInt(h.slice(i, i + 2), 16) / 255
        return [n(0), n(2), n(4), h.length === 8 ? n(6) : 1]
    }
    const m = s.match(/rgba?\(([^)]+)\)/i)
    if (m) {
        const parts = m[1].split(/[\s,\/]+/).filter(Boolean)
        const ch = (p: string) => (p.endsWith("%") ? parseFloat(p) / 100 : parseFloat(p) / 255)
        const a = parts[3] !== undefined ? (parts[3].endsWith("%") ? parseFloat(parts[3]) / 100 : parseFloat(parts[3])) : 1
        const out: RGBA = [ch(parts[0]), ch(parts[1]), ch(parts[2]), a]
        return out.some((x) => Number.isNaN(x)) ? fallback : out
    }
    if (s === "transparent") return [0, 0, 0, 0]
    return fallback
}

const VERT = `#version 300 es
void main() {
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec2 uCenter;
uniform float uRadius;
uniform float uHead;
uniform float uCols;
uniform float uBandRows;
uniform float uLead;
uniform float uFadeStart;
uniform float uExtrude;
uniform float uGap;
uniform vec2 uTilt;
uniform float uYaw;
uniform vec3 uLight;
uniform float uAmb;
uniform vec3 uBase;
uniform vec3 uMid;
uniform vec3 uLit;
uniform vec3 uHot;
uniform vec3 uRim;
uniform float uRimPow;
uniform float uRimStr;
uniform float uHotStr;
uniform float uWall;
uniform vec3 uBack;
uniform float uBackStr;
uniform float uBaseCenter;
uniform vec2 uMottle;
uniform float uSeed;
uniform vec4 uBg;
uniform float uGrain;
uniform float uVignette;
uniform float uNoiseT;
out vec4 outColor;

const float PI = 3.14159265;
const float TAU = 6.2831853;

float hash(vec2 v) { return fract(sin(dot(v, vec2(127.1, 311.7)) + uSeed * 13.17) * 43758.5453); }
float hash2(vec2 v) { return fract(sin(dot(v, vec2(12.9898, 78.233))) * 43758.5453); }

vec3 toSphere(vec3 v) {
    vec3 y = vec3(cos(uYaw) * v.x + sin(uYaw) * v.z, v.y, -sin(uYaw) * v.x + cos(uYaw) * v.z);
    return vec3(y.x, uTilt.x * y.y + uTilt.y * y.z, -uTilt.y * y.y + uTilt.x * y.z);
}
vec3 toView(vec3 p) {
    vec3 t = vec3(p.x, uTilt.x * p.y - uTilt.y * p.z, uTilt.y * p.y + uTilt.x * p.z);
    return vec3(cos(uYaw) * t.x - sin(uYaw) * t.z, t.y, sin(uYaw) * t.x + cos(uYaw) * t.z);
}

// xy = offset inside the hex cell, zw = cell centre (lattice space)
vec4 hexCell(vec3 p) {
    float phi = atan(p.x, p.z);
    float th = acos(clamp(p.y, -1.0, 1.0));
    vec2 uv = vec2(phi, th) * (uCols / TAU);
    vec2 r = vec2(1.0, 1.7320508);
    vec2 h = r * 0.5;
    vec2 a = mod(uv, r) - h;
    vec2 b = mod(uv - h, r) - h;
    vec2 gv = dot(a, a) < dot(b, b) ? a : b;
    return vec4(gv, uv - gv);
}

float hexEdge(vec2 gv) {
    gv = abs(gv);
    return max(gv.x, dot(gv, vec2(0.5, 0.8660254)));
}

float prof(float d) {
    return smoothstep(-uLead, uLead, d) * (1.0 - smoothstep(uFadeStart * uBandRows, max(uBandRows, uFadeStart * uBandRows + 0.01), d));
}

float activation(vec2 id) {
    float th = clamp(id.y * TAU / max(uCols, 1.0), 0.0, PI);
    float rowA = TAU / max(uCols, 1.0) * 0.8660254;
    float a = max(prof((uHead - th) / rowA), max(prof((uHead + PI - th) / rowA), prof((uHead - PI - th) / rowA)));
    vec2 key = vec2(mod(floor(id.x * 2.0 + 0.5), uCols * 2.0), floor(id.y * 2.0 + 0.5));
    if (hash(key) < uMottle.x) a *= uMottle.y;
    return a;
}

vec3 cellNormal(vec2 id) {
    float phi = id.x * TAU / max(uCols, 1.0);
    float th = clamp(id.y * TAU / max(uCols, 1.0), 0.0, PI);
    return toView(vec3(sin(th) * sin(phi), cos(th), sin(th) * cos(phi)));
}

vec3 ramp(vec3 base, float a) {
    return a < 0.5 ? mix(base, uMid, a * 2.0) : mix(uMid, uLit, a * 2.0 - 1.0);
}

void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 q = (frag - uCenter) / max(uRadius, 1.0);
    float rho2 = dot(q, q);
    float rho = sqrt(rho2);
    float px = 1.0 / max(uRadius, 1.0);
    float rMax = 1.0 + uExtrude;
    vec3 col = vec3(0.0);
    float cov = 0.0;
    float halfGap = 0.5 - uGap * 0.5;
    float latScale = uCols / TAU;

    if (rho < rMax + px) {
        float r = rMax;
        vec4 cell = vec4(0.0);
        float a = 0.0;
        for (int i = 0; i < 5; i++) {
            if (rho2 > r * r) break;
            vec3 v = vec3(q, sqrt(r * r - rho2)) / r;
            cell = hexCell(toSphere(v));
            a = activation(cell.zw);
            float rn = 1.0 + uExtrude * a;
            if (abs(rn - r) < 1e-3) break;
            r = rn;
        }
        if (rho2 <= r * r) {
            vec3 v = vec3(q, sqrt(r * r - rho2)) / r;
            cell = hexCell(toSphere(v));
            a = activation(cell.zw);

            vec3 n = v;
            vec3 nc = cellNormal(cell.zw);
            float ndv = clamp(n.z, 0.0, 1.0);
            float ndvc = clamp(nc.z, 0.0, 1.0);

            float fw = px * latScale / max(ndv, 0.15) * 0.75 + 1e-4;
            float edge = hexEdge(cell.xy);
            float inside = 1.0 - smoothstep(halfGap - fw, halfGap + fw, edge);

            float ndl = max(dot(nc, uLight), 0.0) / max(uLight.z, 0.3);
            float shade = uAmb + (1.0 - uAmb) * ndl;
            vec3 base = uBase * mix(uBaseCenter, 1.0, pow(1.0 - ndvc, 1.5));
            vec3 plate = ramp(base, a) * shade;
            plate = mix(plate, uHot, clamp(a * pow(1.0 - ndvc, 1.5) * uHotStr, 0.0, 1.0));

            vec3 back = vec3(0.0);
            if (rho2 < 1.0) {
                float bz = sqrt(1.0 - rho2);
                vec4 bc = hexCell(toSphere(vec3(q, -bz)));
                float ba = activation(bc.zw);
                float bfw = px * latScale / max(bz, 0.15) * 0.75 + 1e-4;
                float bin = 1.0 - smoothstep(halfGap - bfw, halfGap + bfw, hexEdge(bc.xy));
                back = mix(uBack, uMid, ba * 0.6) * bin * uBackStr;
            }

            float wallVis = step(0.03, a) * smoothstep(0.15, 0.7, 1.0 - ndv);
            vec3 gapCol = mix(back, plate * uWall, wallVis);
            vec3 frontCol = mix(gapCol, plate, inside);
            frontCol += back * (1.0 - a) * inside * 0.5;
            frontCol += uRim * pow(1.0 - ndv, uRimPow) * uRimStr;

            col = frontCol;
            cov = clamp((r - rho) / px + 0.5, 0.0, 1.0);
        }
    }

    vec3 rgb = col * cov + uBg.rgb * uBg.a * (1.0 - cov);
    float alpha = cov + uBg.a * (1.0 - cov);

    vec2 uvn = frag / uRes - 0.5;
    float vEdge = smoothstep(0.2, 0.8, length(uvn) * 1.4142) * uVignette;
    rgb *= 1.0 - vEdge;
    alpha = alpha + (1.0 - alpha) * vEdge;

    float g = (hash2(frag + vec2(uNoiseT * 17.0, uNoiseT * 31.0)) - 0.5) * uGrain * 0.25;
    rgb = clamp(rgb + g * alpha, 0.0, 1.0);

    outColor = vec4(rgb, alpha);
}`

const UNIFORMS = [
    "uRes", "uCenter", "uRadius", "uHead", "uCols", "uBandRows", "uLead", "uFadeStart", "uExtrude", "uGap",
    "uTilt", "uYaw", "uLight", "uAmb", "uBase", "uMid", "uLit", "uHot", "uRim", "uRimPow", "uRimStr", "uHotStr",
    "uWall", "uBack", "uBackStr", "uBaseCenter", "uMottle", "uSeed", "uBg", "uGrain", "uVignette", "uNoiseT",
] as const

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
    const sh = gl.createShader(type)
    if (!sh) throw new Error("shader alloc failed")
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(sh)
        gl.deleteShader(sh)
        throw new Error("shader compile failed: " + log)
    }
    return sh
}

export interface SphereShieldTiledProps {
    background?: string
    color?: string
    rimColor?: string
    midColor?: string
    hotColor?: string
    backColor?: string
    speed?: number
    size?: number
    cellCount?: number
    bandWidth?: number
    extrude?: number
    baseColor?: string
    dragToRotate?: boolean
    dragSensitivity?: number
    hoverSpeed?: number
    hoverGlow?: number
    advanced?: {
        periodMs?: number
        phaseMs?: number
        freezeMs?: number
        tiltDeg?: number
        offsetX?: number
        offsetY?: number
        gapPct?: number
        leadPct?: number
        fadeStartPct?: number
        mottlePct?: number
        mottleDimPct?: number
        seed?: number
        hotPct?: number
        backWallPct?: number
        baseCenterPct?: number
        wallPct?: number
        rimPower?: number
        rimStrength?: number
        ambientPct?: number
        lightAzDeg?: number
        lightElDeg?: number
    }
    style?: CSSProperties
}

export default function SphereShieldTiled(props: SphereShieldTiledProps) {
    props = withMovedControls(props)
    const {
        speed = 50,
        size = 520,
        cellCount = 40,
        bandWidth = 5,
        extrude = 5,
        color = "#7AC2F9",
        baseColor = "#000000",
        rimColor = "#5683AE",
        background = "#000000",
        dragToRotate = true,
        dragSensitivity = 100,
        hoverSpeed = 40,
        hoverGlow = 100,
        style,
    } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef<any>(null)
    propsRef.current = { speed, size, cellCount, bandWidth, extrude, color, baseColor, rimColor, background, dragToRotate, dragSensitivity, hoverSpeed, hoverGlow, advanced: props.advanced }

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false })
        if (!gl) return

        let program: WebGLProgram | null = null
        let vs: WebGLShader | null = null
        let fs: WebGLShader | null = null
        let vao: WebGLVertexArrayObject | null = null
        const loc: Record<string, WebGLUniformLocation> = {}
        try {
            vs = compile(gl, gl.VERTEX_SHADER, VERT)
            fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
            program = gl.createProgram()
            if (!program) throw new Error("program alloc failed")
            gl.attachShader(program, vs)
            gl.attachShader(program, fs)
            gl.linkProgram(program)
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("link failed: " + gl.getProgramInfoLog(program))
            for (const name of UNIFORMS) {
                const l = gl.getUniformLocation(program, name)
                if (l === null) throw new Error("missing uniform " + name)
                loc[name] = l
            }
            vao = gl.createVertexArray()
        } catch (err) {
            console.error("[SphereShieldTiled]", err)
            return
        }

        let cssW = 1, cssH = 1, dpr = 1
        const resize = () => {
            cssW = Math.max(1, root.offsetWidth)
            cssH = Math.max(1, root.offsetHeight)
            dpr = Math.min(window.devicePixelRatio || 1, 2)
            const w = Math.max(1, Math.round(cssW * dpr))
            const h = Math.max(1, Math.round(cssH * dpr))
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w
                canvas.height = h
            }
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(root)

        const mq = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null
        let reduced = !!mq?.matches
        const onMq = (e: MediaQueryListEvent) => { reduced = e.matches }
        mq?.addEventListener?.("change", onMq)

        const target = RenderTarget.current()
        const isStatic = target === RenderTarget.thumbnail || target === (RenderTarget as any).export

        let hover = 0
        let hoverTarget = 0
        const onEnter = () => { hoverTarget = 1 }
        const onLeave = () => { hoverTarget = 0 }
        root.addEventListener("pointerenter", onEnter)
        root.addEventListener("pointerleave", onLeave)

        // Drag-to-rotate: yaw spins the hex lattice about the vertical
        // axis, tiltOff rides on top of the Tilt dial. Release is bound on
        // window so a drag that leaves the component still ends cleanly.
        const drag = { active: false, x: 0, y: 0, yaw: 0, tiltOff: 0 }
        const onDown = (e: PointerEvent) => {
            if (!propsRef.current.dragToRotate) return
            drag.active = true
            drag.x = e.clientX
            drag.y = e.clientY
        }
        const onMove = (e: PointerEvent) => {
            if (!drag.active) return
            const sens = Math.max(0, Number(propsRef.current.dragSensitivity) || 0) / 50
            const dx = e.clientX - drag.x
            const dy = e.clientY - drag.y
            drag.x = e.clientX
            drag.y = e.clientY
            drag.yaw += (dx / Math.max(1, cssW)) * Math.PI * sens
            drag.tiltOff = Math.max(-60, Math.min(60, drag.tiltOff - (dy / Math.max(1, cssH)) * 90 * sens))
        }
        const onUp = () => { drag.active = false }
        root.addEventListener("pointerdown", onDown)
        window.addEventListener("pointermove", onMove)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        let raf = 0
        let last = -1
        let sim = 0
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            const p = propsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
            hover += (hoverTarget - hover) * Math.min(1, dt * 6)
            root.style.cursor = drag.active ? "grabbing" : p.dragToRotate ? "grab" : "default"
            const hoverSpeedBoost = Math.max(0, Number(p.hoverSpeed) || 0) / 100
            sim += (dt * Math.max(0, Number(p.speed) || 0) / 50) * (1 + hover * hoverSpeedBoost)
            const t = reduced || isStatic ? adv.freezeMs / 1000 : sim

            const period = Math.max(100, adv.periodMs)
            const phase = (((t * 1000 + adv.phaseMs) / period) % 1 + 1) % 1
            const head = phase * Math.PI

            const W = canvas.width, H = canvas.height
            gl.viewport(0, 0, W, H)
            gl.useProgram(program)
            gl.bindVertexArray(vao)

            const tilt = ((adv.tiltDeg + drag.tiltOff) * Math.PI) / 180
            const hoverGlowAmt = Math.max(0, Number(p.hoverGlow) || 0) / 100
            const az = (adv.lightAzDeg * Math.PI) / 180
            const el = (adv.lightElDeg * Math.PI) / 180
            const c3 = (c: unknown, fb: RGBA) => parseColor(c, fb).slice(0, 3) as [number, number, number]

            gl.uniform2f(loc.uRes, W, H)
            gl.uniform2f(loc.uCenter, W * (0.5 + adv.offsetX / 100), H * (0.5 - adv.offsetY / 100))
            gl.uniform1f(loc.uRadius, (Math.max(10, p.size) / 2) * dpr)
            gl.uniform1f(loc.uHead, head)
            gl.uniform1f(loc.uCols, Math.max(6, Math.round(p.cellCount)))
            gl.uniform1f(loc.uBandRows, Math.max(1, p.bandWidth))
            gl.uniform1f(loc.uLead, Math.max(0.05, adv.leadPct / 100))
            gl.uniform1f(loc.uFadeStart, Math.min(0.95, Math.max(0, adv.fadeStartPct / 100)))
            gl.uniform1f(loc.uExtrude, Math.max(0, p.extrude) / 100)
            gl.uniform1f(loc.uGap, Math.min(0.8, Math.max(0, adv.gapPct / 100)))
            gl.uniform2f(loc.uTilt, Math.cos(tilt), Math.sin(tilt))
            gl.uniform1f(loc.uYaw, drag.yaw)
            gl.uniform3f(loc.uLight, Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el))
            gl.uniform1f(loc.uAmb, Math.min(1, adv.ambientPct / 100 + hover * hoverGlowAmt * 0.3))
            gl.uniform3fv(loc.uBase, c3(p.baseColor, [0.082, 0.11, 0.141, 1]))
            gl.uniform3fv(loc.uMid, c3(adv.midColor, [0.231, 0.329, 0.431, 1]))
            gl.uniform3fv(loc.uLit, c3(p.color, [0.478, 0.761, 0.976, 1]))
            gl.uniform3fv(loc.uHot, c3(adv.hotColor, [0.624, 0.941, 0.992, 1]))
            gl.uniform3fv(loc.uRim, c3(p.rimColor, [0.337, 0.514, 0.682, 1]))
            gl.uniform1f(loc.uRimPow, Math.max(0.5, adv.rimPower / 10))
            gl.uniform1f(loc.uRimStr, (adv.rimStrength / 100) * (1 + hover * hoverGlowAmt))
            gl.uniform1f(loc.uHotStr, adv.hotPct / 100)
            gl.uniform1f(loc.uWall, adv.wallPct / 100)
            gl.uniform3fv(loc.uBack, c3(adv.backColor, [0.082, 0.11, 0.141, 1]))
            gl.uniform1f(loc.uBackStr, adv.backWallPct / 100)
            gl.uniform1f(loc.uBaseCenter, adv.baseCenterPct / 100)
            gl.uniform2f(loc.uMottle, adv.mottlePct / 100, adv.mottleDimPct / 100)
            gl.uniform1f(loc.uSeed, adv.seed)
            const bg = parseColor(p.background, [0, 0, 0, 1])
            gl.uniform4f(loc.uBg, bg[0], bg[1], bg[2], bg[3])
            gl.uniform1f(loc.uGrain, adv.grain / 100)
            gl.uniform1f(loc.uVignette, adv.vignette / 100)
            gl.uniform1f(loc.uNoiseT, Math.floor(now / 42) % 1000)

            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            mq?.removeEventListener?.("change", onMq)
            root.removeEventListener("pointerenter", onEnter)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointermove", onMove)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
            if (vao) gl.deleteVertexArray(vao)
            if (program) gl.deleteProgram(program)
            if (vs) gl.deleteShader(vs)
            if (fs) gl.deleteShader(fs)
        }
    }, [])

    return (
        <div
            ref={rootRef}
            style={{
                minWidth: 1200,
                minHeight: 800,
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
                isolation: "isolate",
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
            />
        </div>
    )
}
