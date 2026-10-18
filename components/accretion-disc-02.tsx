"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * GALAXY COMPONENT — star particle system replacing the black hole accretion disc.
 *
 * A bright central stellar bulge, a flat spiral disc with logarithmic star arms,
 * a faint spherical halo of background stars, all rendered via WebGL points with
 * additive blending.
 */

const TAU = Math.PI * 2
const DPR_CAP = 2

const ROUT = 100
const FOV_DEG = 34
const FOCAL = 1 / Math.tan((FOV_DEG * Math.PI) / 180 / 2)

const ORBIT_REF = 0.449

const COUNT_BASE = 25000
const COUNT_PER = 4000

const TIME_WRAP = 1e5

const PARTICLE_VERT = `
precision highp float;

// Star types:
// 0.0 = bulge (tight sphere)
// 1.0 = disc / spiral arms
// 2.0 = halo (faint spherical background)
attribute vec4 aSeed;
attribute float aKind;

uniform float uTime;
uniform float uTilt;
uniform float uDist;
uniform float uAspect;
uniform float uHalfH;
uniform float uDotSize;
uniform float uBlur;
uniform float uScatter;
uniform float uCore;
uniform float uArms;
uniform float uArmTightness;
uniform float uBulgeDensity;
uniform float uBulgeSize;
uniform float uBulgeBrightness;
uniform float uDiscDensity;
uniform float uDiscBrightness;
uniform float uHaloDensity;
uniform float uHaloSize;
uniform float uHaloBrightness;

varying float vAlpha;
varying float vRamp;
varying float vKind;

const float FOCAL = ${FOCAL.toFixed(6)};
const float ROUT = ${ROUT.toFixed(1)};
const float ORBIT = ${ORBIT_REF.toFixed(4)};

void kill() {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    vAlpha = 0.0;
    vRamp = 0.0;
    vKind = 0.0;
}

void main() {
    vKind = aKind;
    vec3 p;
    float bright = 0.0;
    float ramp = 0.0;

    if (aKind == 0.5) {
        // ---- BULGE (Bright glowing cluster of overlapping stars) ----
        if (aSeed.w > uBulgeDensity) { kill(); return; }
        
        // Spherical Gaussian distribution for dense core
        float r = uBulgeSize * ROUT * 0.25 * pow(aSeed.x, 2.0);
        float th = aSeed.y;
        float ph = (aSeed.z - 0.5) * 3.14159;
        
        p = vec3(
            r * cos(ph) * cos(th),
            r * sin(ph) * 0.7,
            r * cos(ph) * sin(th)
        );

        float radial = 1.0 - smoothstep(0.0, uBulgeSize * ROUT * 0.25, r);
        bright = radial * uBulgeBrightness * 2.2;
        ramp = 0.05 + 0.15 * aSeed.x;

    } else if (aKind == 1.0) {
        // ---- DISC & SPIRAL ARMS ----
        if (aSeed.w > uDiscDensity) { kill(); return; }

        float rIn = max(uCore * 0.5, 4.0);
        float r = sqrt(mix(rIn * rIn, ROUT * ROUT, aSeed.x));
        float f = clamp((r - rIn) / max(ROUT - rIn, 1e-3), 0.0, 1.0);

        // Keplerian orbit rate
        float th = aSeed.y + ORBIT * pow(rIn / r, 1.5) * uTime;

        // Spiral arms using customizable arm tightness
        float winding = uArmTightness;
        float armAngle = uArms * (th - winding * log(r / rIn)) - 0.06 * uTime * min(uArms, 1.0);
        
        // Density wave crowding
        th -= 0.45 * sin(armAngle) / max(uArms, 1.0);
        float arm = pow(0.5 + 0.5 * cos(armAngle), 2.6);

        float flare = 0.2 + 0.8 * pow(f, 1.2);
        float y = aSeed.z * 2.4 * uScatter * flare;
        p = vec3(r * cos(th), y, r * sin(th));

        float radial = smoothstep(0.0, 0.05, f) * (1.0 - smoothstep(0.5, 1.0, f));
        radial *= 1.0 + 1.8 * exp(-pow((f - 0.3) / 0.18, 2.0));

        float farSide = 0.5 - 0.5 * (p.z / max(r, 1e-3));
        bright = radial * (0.3 + 0.8 * arm) * mix(0.7, 1.0, farSide) * uDiscBrightness * 1.6;
        ramp = clamp((1.0 - f) * 0.6 + arm * 0.4, 0.0, 1.0);

    } else {
        // ---- HALO (Faint spherical background stars) ----
        if (aSeed.w > uHaloDensity) { kill(); return; }

        float r = ROUT * (0.4 + 1.2 * aSeed.x) * uHaloSize;
        float th = aSeed.y * 6.28318;
        float ph = (aSeed.z - 0.5) * 3.14159;

        p = vec3(
            r * cos(ph) * cos(th),
            r * sin(ph) * 0.9,
            r * cos(ph) * sin(th)
        );

        bright = (0.15 + 0.35 * (1.0 - aSeed.x)) * uHaloBrightness;
        ramp = 0.9;
    }

    // Camera view transform (orbit at uTilt)
    float c = cos(uTilt);
    float s = sin(uTilt);
    vec3 camPos = vec3(0.0, uDist * s, uDist * c);
    vec3 rel = p - camPos;
    vec3 q = vec3(rel.x, c * rel.y - s * rel.z, s * rel.y + c * rel.z);
    float depth = -q.z;
    if (depth < 1.0) { kill(); return; }

    gl_Position = vec4(q.x * FOCAL / (depth * uAspect), q.y * FOCAL / depth, 0.0, 1.0);

    float ppw = FOCAL * uHalfH / depth;
    float focusD = uDist * 1.75;
    float coc = uBlur * max(0.0, focusD - depth) / focusD;
    
    float sizeMult = (aKind == 2.0) ? 0.5 : ((aKind == 0.5) ? 0.8 : 1.0);
    float px = (uDotSize * sizeMult + coc) * ppw * 1.5;

    vAlpha = bright * pow(uDotSize / max(uDotSize + coc, 1e-5), 1.5);
    float optical = px / 1.5;
    if (optical < 1.0) vAlpha *= optical * optical;
    vRamp = ramp;
    gl_PointSize = clamp(px, 1.0, 64.0);
}
`

const PARTICLE_FRAG = `
precision highp float;

uniform vec3 uBase;
uniform vec3 uAccent;

varying float vAlpha;
varying float vRamp;
varying float vKind;

void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r2 = dot(d, d) * 4.0;
    if (r2 > 1.0) discard;
    
    float core = max(0.0, exp(-r2 * 9.25) - 0.0000961);
    float skirt = max(0.0, exp(-r2 * 1.80) - 0.165299);
    float g = core + 0.30 * skirt;
    
    // Halo stars are dimmer and cooler
    float alphaMod = (vKind == 2.0) ? 0.4 : 1.0;
    float e = g * vAlpha * alphaMod;
    
    vec3 col = mix(uBase, uAccent, vRamp);
    if (vKind == 2.0) {
        col = mix(col, vec3(1.0, 1.0, 1.0), 0.6);
    }
    
    gl_FragColor = vec4(col * e, e);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string) {
    const sh = gl.createShader(type)!
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn("Galaxy shader:", gl.getShaderInfoLog(sh))
    }
    return sh
}

function link(gl: WebGLRenderingContext, vs: string, fs: string) {
    const p = gl.createProgram()!
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs))
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs))
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        console.warn("Galaxy link:", gl.getProgramInfoLog(p))
    }
    return p
}

function parseColor(input: string | undefined): [number, number, number] {
    if (!input) return [0, 0, 0]
    let s = String(input).trim()

    const token = s.match(/^var\(\s*--[^,)]+\s*,\s*(.+)\)\s*$/is)
    if (token) s = token[1].trim()

    const rgb = s.match(/rgba?\(([^)]+)\)/i)
    if (rgb) {
        const p = rgb[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat)
        return [(p[0] || 0) / 255, (p[1] || 0) / 255, (p[2] || 0) / 255]
    }

    const hsl = s.match(/hsla?\(([^)]+)\)/i)
    if (hsl) {
        const p = hsl[1].split(/[,\s/]+/).filter(Boolean)
        const h = ((parseFloat(p[0]) || 0) % 360) / 360
        const sat = (parseFloat(p[1]) || 0) / 100
        const li = (parseFloat(p[2]) || 0) / 100
        const q = li < 0.5 ? li * (1 + sat) : li + sat - li * sat
        const pp = 2 * li - q
        const chan = (t: number) => {
            if (t < 0) t += 1
            if (t > 1) t -= 1
            if (t < 1 / 6) return pp + (q - pp) * 6 * t
            if (t < 1 / 2) return q
            if (t < 2 / 3) return pp + (q - pp) * (2 / 3 - t) * 6
            return pp
        }
        return [chan(h + 1 / 3), chan(h), chan(h - 1 / 3)]
    }

    let hx = s.replace("#", "")
    if (hx.length === 3 || hx.length === 4) {
        hx = hx.split("").map((ch) => ch + ch).join("")
    }
    hx = hx.padEnd(6, "0")
    const v = (i: number) => {
        const n = parseInt(hx.slice(i, i + 2), 16)
        return Number.isFinite(n) ? n / 255 : 0
    }
    return [v(0), v(2), v(4)]
}

function mulberry32(a: number) {
    return () => {
        a |= 0
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

function buildGalaxyCloud(count: number) {
    const seed = new Float32Array(count * 4)
    const kind = new Float32Array(count)
    const rnd = mulberry32(0x9e3779b9)
    
    // Distribution: 25% Bulge, 60% Disc/Arms, 15% Halo
    for (let i = 0; i < count; i++) {
        const o = i * 4
        const roll = rnd()
        seed[o] = rnd()
        seed[o + 1] = rnd() * TAU
        seed[o + 2] = rnd()
        seed[o + 3] = rnd()

        if (roll < 0.25) {
            kind[i] = 0.5 // Bulge
        } else if (roll < 0.85) {
            kind[i] = 1.0 // Disc & Spiral Arms
        } else {
            kind[i] = 2.0 // Halo
        }
    }
    return { seed, kind }
}

interface Group {
    scatter?: number
    blur?: number
    tilt?: number
    core?: number
    arms?: number
    amount?: number
    length?: number
    spread?: number
}

interface GalaxyProps {
    background?: string
    baseColor?: string
    accentColor?: string
    density?: number
    dotSize?: number
    speed?: number
    distance?: number
    drag?: number
    armTightness?: number
    bulgeDensity?: number
    bulgeSize?: number
    bulgeBrightness?: number
    discDensity?: number
    discBrightness?: number
    haloDensity?: number
    haloSize?: number
    haloBrightness?: number
    field?: Group
    disc?: Group
    jets?: Group
    style?: React.CSSProperties
}

const FIELD_DEFAULTS: Required<Pick<Group, "scatter" | "blur">> = {
    scatter: 44,
    blur: 0,
}
const DISC_DEFAULTS: Required<Pick<Group, "tilt" | "core" | "arms">> = {
    tilt: 25,
    core: 4,
    arms: 2,
}

function merge<T extends object>(defaults: T, group: Partial<T> | undefined): T {
    const out = { ...defaults }
    if (!group) return out
    for (const k of Object.keys(group) as (keyof T)[]) {
        const v = group[k]
        if (v !== undefined) out[k] = v as T[keyof T]
    }
    return out
}

export default function AccretionDisc(props: GalaxyProps) {
    const {
        background = "#000000",
        baseColor = "#FF1E1E",
        accentColor = "#EB8787",
        density = 100,
        dotSize = 156,
        speed = 100,
        distance = 220,
        drag = 100,
        armTightness = 3.4,
        bulgeDensity = 100,
        bulgeSize = 100,
        bulgeBrightness = 5,
        discDensity = 48,
        discBrightness = 112,
        haloDensity = 124,
        haloSize = 135,
        haloBrightness = 100,
        field = {"blur":0,"scatter":44},
        disc = {"arms":8,"core":6,"tilt":44},
        style,
    } = props

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const live = useRef({
        base: parseColor(baseColor),
        accent: parseColor(accentColor),
        count: 0,
        dotSize: 0,
        speed: 0,
        distance: 0,
        scatter: 0,
        blur: 0,
        tilt: 0,
        core: 0,
        arms: 0,
        armTightness: 3.4,
        bulgeDensity: 1.0,
        bulgeSize: 1.0,
        bulgeBrightness: 1.0,
        discDensity: 1.0,
        discBrightness: 1.0,
        haloDensity: 1.0,
        haloSize: 1.0,
        haloBrightness: 1.0,
    })

    const f = merge(FIELD_DEFAULTS, field)
    const d = merge(DISC_DEFAULTS, disc)

    live.current.base = parseColor(baseColor)
    live.current.accent = parseColor(accentColor)
    live.current.count = Math.round(COUNT_BASE + density * COUNT_PER)
    live.current.dotSize = (0.16 * dotSize) / 100
    live.current.speed = speed
    live.current.distance = distance
    live.current.scatter = f.scatter / 100
    live.current.blur = (0.64 * f.blur) / 100
    live.current.tilt = (d.tilt * Math.PI) / 180
    live.current.core = (d.core / 100) * ROUT
    live.current.arms = d.arms
    live.current.armTightness = armTightness
    live.current.bulgeDensity = bulgeDensity / 100
    live.current.bulgeSize = bulgeSize / 100
    live.current.bulgeBrightness = bulgeBrightness / 100
    live.current.discDensity = discDensity / 100
    live.current.discBrightness = discBrightness / 100
    live.current.haloDensity = haloDensity / 100
    live.current.haloSize = haloSize / 100
    live.current.haloBrightness = haloBrightness / 100

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return

        const gl = canvas.getContext("webgl", {
            alpha: true,
            antialias: false,
            premultipliedAlpha: true,
            preserveDrawingBuffer: false,
        })
        if (!gl) return

        const particleProg = link(gl, PARTICLE_VERT, PARTICLE_FRAG)

        const pu = {
            uTime: gl.getUniformLocation(particleProg, "uTime"),
            uTilt: gl.getUniformLocation(particleProg, "uTilt"),
            uDist: gl.getUniformLocation(particleProg, "uDist"),
            uAspect: gl.getUniformLocation(particleProg, "uAspect"),
            uHalfH: gl.getUniformLocation(particleProg, "uHalfH"),
            uDotSize: gl.getUniformLocation(particleProg, "uDotSize"),
            uBlur: gl.getUniformLocation(particleProg, "uBlur"),
            uScatter: gl.getUniformLocation(particleProg, "uScatter"),
            uCore: gl.getUniformLocation(particleProg, "uCore"),
            uArms: gl.getUniformLocation(particleProg, "uArms"),
            uArmTightness: gl.getUniformLocation(particleProg, "uArmTightness"),
            uBulgeDensity: gl.getUniformLocation(particleProg, "uBulgeDensity"),
            uBulgeSize: gl.getUniformLocation(particleProg, "uBulgeSize"),
            uBulgeBrightness: gl.getUniformLocation(particleProg, "uBulgeBrightness"),
            uDiscDensity: gl.getUniformLocation(particleProg, "uDiscDensity"),
            uDiscBrightness: gl.getUniformLocation(particleProg, "uDiscBrightness"),
            uHaloDensity: gl.getUniformLocation(particleProg, "uHaloDensity"),
            uHaloSize: gl.getUniformLocation(particleProg, "uHaloSize"),
            uHaloBrightness: gl.getUniformLocation(particleProg, "uHaloBrightness"),
            uBase: gl.getUniformLocation(particleProg, "uBase"),
            uAccent: gl.getUniformLocation(particleProg, "uAccent"),
        }

        const aSeed = gl.getAttribLocation(particleProg, "aSeed")
        const aKind = gl.getAttribLocation(particleProg, "aKind")

        const seedBuf = gl.createBuffer()!
        const kindBuf = gl.createBuffer()!

        let built = 0
        const rebuild = (count: number) => {
            const { seed, kind } = buildGalaxyCloud(count)
            gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf)
            gl.bufferData(gl.ARRAY_BUFFER, seed, gl.STATIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, kindBuf)
            gl.bufferData(gl.ARRAY_BUFFER, kind, gl.STATIC_DRAW)
            built = count
        }

        gl.disable(gl.DEPTH_TEST)
        gl.enable(gl.BLEND)

        let bw = 1
        let bh = 1
        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
            const cw = canvas.clientWidth || host.clientWidth || 0
            const ch = canvas.clientHeight || host.clientHeight || 0
            const w = Math.max(1, Math.round(cw * dpr))
            const h = Math.max(1, Math.round(ch * dpr))
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w
                canvas.height = h
            }
            bw = w
            bh = h
            gl.viewport(0, 0, w, h)
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(canvas)

        let raf = 0
        let last = 0
        let t = 0

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last === 0 ? 0 : Math.min(0.05, Math.max(0, (now - last) / 1000))
            last = now

            const s = live.current
            const speedScale = s.speed / 50
            t = (t + dt * speedScale) % TIME_WRAP
            if (built !== s.count) rebuild(s.count)

            const aspect = bw / Math.max(bh, 1)
            const halfH = bh * 0.5

            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)

            gl.blendFunc(gl.ONE, gl.ONE)
            gl.useProgram(particleProg)
            gl.uniform1f(pu.uTime, t)
            gl.uniform1f(pu.uTilt, s.tilt)
            gl.uniform1f(pu.uDist, s.distance)
            gl.uniform1f(pu.uAspect, aspect)
            gl.uniform1f(pu.uHalfH, halfH)
            gl.uniform1f(pu.uDotSize, s.dotSize)
            gl.uniform1f(pu.uBlur, s.blur)
            gl.uniform1f(pu.uScatter, s.scatter)
            gl.uniform1f(pu.uCore, s.core)
            gl.uniform1f(pu.uArms, s.arms)
            gl.uniform1f(pu.uArmTightness, s.armTightness)
            gl.uniform1f(pu.uBulgeDensity, s.bulgeDensity)
            gl.uniform1f(pu.uBulgeSize, s.bulgeSize)
            gl.uniform1f(pu.uBulgeBrightness, s.bulgeBrightness)
            gl.uniform1f(pu.uDiscDensity, s.discDensity)
            gl.uniform1f(pu.uDiscBrightness, s.discBrightness)
            gl.uniform1f(pu.uHaloDensity, s.haloDensity)
            gl.uniform1f(pu.uHaloSize, s.haloSize)
            gl.uniform1f(pu.uHaloBrightness, s.haloBrightness)
            gl.uniform3fv(pu.uBase, s.base)
            gl.uniform3fv(pu.uAccent, s.accent)

            gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf)
            gl.enableVertexAttribArray(aSeed)
            gl.vertexAttribPointer(aSeed, 4, gl.FLOAT, false, 0, 0)

            gl.bindBuffer(gl.ARRAY_BUFFER, kindBuf)
            gl.enableVertexAttribArray(aKind)
            gl.vertexAttribPointer(aKind, 1, gl.FLOAT, false, 0, 0)

            gl.drawArrays(gl.POINTS, 0, built)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
        }
    }, [])

    return (
        <div
            ref={hostRef}
            style={{
                minWidth: 1200,
                minHeight: 800,
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                background,
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

// controls, rebuilt from the parent's schema
