"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * TimeSwirl — a double-spiral vortex of iridescent bands.
 *
 * A full-screen fragment shader. Polar coordinates around an off-centre point
 * are twisted by a distance-dependent angle term, the result is displaced by
 * its own fract/mod feedback, then scaled by a Perlin-noise "zoom" that drifts
 * with time — so the whole field breathes without any of it being animated
 * directly. Colour is three sines of the same radius at staggered phases, which
 * is where the red/teal iridescence comes from.
 *
 * Ported from "Time Swirl 2" by u396203
 * (https://openprocessing.org/sketch/2099889), itself a fork of Myong Jun
 * Jeon's "Time Swirl". The reference's only interaction is pointer X, which
 * offsets the swirl angle; that is kept, and nothing else is added.
 *
 * Two things the port had to fix rather than copy:
 *
 * 1. The sketch feeds a NORMALIZED texcoord through `u_resolution =
 *    (width/800, height/600)`. That divisor was meant for a pixel coordinate,
 *    so the pattern scale ends up proportional to 1/size^2 — resize the canvas
 *    and the composition zooms quadratically. Here the mapping is frozen at the
 *    reference's own 1112x834 framing (swirl centre 69.5% across, 30.5% down,
 *    and the reference's built-in 4:3 stretch of the pattern preserved) and
 *    generalised as a COVER fit, so a wider or taller instance crops instead of
 *    rescaling. At 4:3 the frame is pixel-identical to the sketch.
 *
 * 2. `precision mediump float` — the sketch's `pow(d, 0.8)` and the Perlin
 *    permute chain (mod 289 on growing values) both need the extra mantissa.
 */

const MAX_DPR = 2
// Reference clock: the sketch read cnoise at u_time / 20, in seconds.
const BASE_RATE = 1 / 20
// The reference canvas was 1112 x 834 against a (800, 600) divisor.
const REF_SPAN = 800 / 1112 // st units visible across the frame
const REF_AR = 1112 / 834

const VERT_SRC = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`

const FRAG_SRC = `
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform vec3  uBg;
uniform float uArms;
uniform float uSwirl;
uniform float uDensity;
uniform float uTurb;
uniform float uHue;
uniform float uSpread;
uniform float uBright;
uniform vec3  uColorA;
uniform vec3  uColorB;
uniform vec3  uColorC;
uniform vec2  uCenter;
uniform float uRotation;

// Frame mapping frozen at the reference's 1112 x 834 canvas.
const float REF_SPAN = ${REF_SPAN.toFixed(8)};
const float REF_AR   = ${REF_AR.toFixed(8)};

//  Classic Perlin 3D Noise 
//  by Stefan Gustavson
//
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

float cnoise(vec3 P){
    vec3 Pi0 = floor(P); // Integer part for indexing
    vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
    Pi0 = mod(Pi0, 289.0);
    Pi1 = mod(Pi1, 289.0);
    vec3 Pf0 = fract(P); // Fractional part for interpolation
    vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;

    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);

    vec4 gx0 = ixy0 / 7.0;
    vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);

    vec4 gx1 = ixy1 / 7.0;
    vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);

    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
    vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
    vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
    vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
    vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x;
    g010 *= norm0.y;
    g100 *= norm0.z;
    g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x;
    g011 *= norm1.y;
    g101 *= norm1.z;
    g111 *= norm1.w;

    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);

    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
    return 2.2 * n_xyz;
}

vec2 random2( vec2 p ) {
        return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);
}

void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    float ar = uRes.x / uRes.y;

    // Cover fit around the reference framing. The reference's own anisotropy
    // (st is normalized per axis over a 4:3 frame, so the pattern is stretched
    // 4:3 horizontally) is part of the look and is preserved: fx / fy is pinned
    // to ar / REF_AR, which keeps st-per-pixel in the same ratio at any size.
    float fx = min(1.0, ar / REF_AR);
    float fy = min(1.0, REF_AR / ar);

    // st.y runs DOWNWARD from 1 at the bottom edge - the sketch flipped it
    // after the divide, and the spiral is chiral, so the flip stays.
    vec2 st = vec2(
        0.5 + (uv.x - uCenter.x) * REF_SPAN * fx,
        0.5 - (uv.y - uCenter.y) * REF_SPAN * fy
    );

    // Spin the whole field around the same pivot the framing centres on
    // (uCenter maps to st == 0.5), so rotation always pivots at the origin point.
    float rc = cos(uRotation);
    float rs = sin(uRotation);
    vec2 rel = st - vec2(0.5);
    st = vec2(0.5) + vec2(rel.x * rc - rel.y * rs, rel.x * rs + rel.y * rc);

    vec3 color = vec3(0.0);

    vec2 delta = st - vec2(0.5);
    float d = distance(st, vec2(0.5)) * 0.2;
    float ang = atan(delta.y, delta.x) * uArms
              + random2(st).x / 10.0
              + sin(pow(d, 0.8)) * cos(d * 5.0) * uSwirl;

    d = distance(st, vec2(0.5)) * 0.2 + sin(cos(ang));
    st.x += mod(sin(d) / 20.0, 0.5) / 5.0 + fract(d) / 5.0;
    st.y += mod(cos(d) / 20.0, 0.5) / 5.0 + fract(d) / 5.0;

    st += random2(st) / 15.0;

    float zoom = uDensity + cnoise(vec3(st, uTime)) * uTurb;
    st *= zoom;
    vec2 f_st = fract(st);

    d = distance(st, vec2(0.5 * zoom)) * 10.0;

    vec2 gridR = smoothstep(1.0, 0.1, f_st + random2(st * 1.2) * 0.1);
    vec2 gridG = smoothstep(0.8, 0.1, f_st + random2(st * 2.0) * 0.1);
    vec2 gridB = smoothstep(0.9, 0.2, f_st + random2(st * 2.0) * 0.1);

    d /= 5.0;
    float a = sin(ang / 2.0);
    float i1 = 0.1 + sin(d + uHue) * (1.0 + a) + gridR.x / 30.0;
    float i2 = 0.2 + sin(d + uHue + uSpread) * a + gridG.x / 20.0;
    float i3 = 0.1 + sin(d + uHue + uSpread * 2.0) * a + gridB.x / 10.5;
    color += uColorA * i1 + uColorB * i2 + uColorC * i3;

    color *= min(distance(st, vec2(0.5)) / 5.0, 1.0);

    // The sketch drew on black. Background is an additive floor, so it is the
    // colour that shows through everywhere the three sines clip to zero, and
    // #000000 reproduces the reference exactly.
    color = uBg + color * uBright;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`

function parseColor(input: string | undefined, fb: [number, number, number]): [number, number, number] {
    if (!input) return fb
    const str = String(input).trim()
    if (str.charAt(0) === "#") {
        let hex = str.slice(1)
        if (hex.length === 3 || hex.length === 4) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
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

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("TimeSwirl shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

interface TimeSwirlProps {
    style?: React.CSSProperties
    background?: string
    colors?: {
        colorA?: string
        colorB?: string
        colorC?: string
    }
    hue?: number
    hueSpread?: number
    brightness?: number
    density?: number
    speed?: number
    swirl?: number
    arms?: number
    turbulence?: number
    hover?: number
    centerX?: number
    centerY?: number
    rotationSpeed?: number
    clockwise?: boolean
    width?: number
    height?: number
}

export default function TimeSwirl(props: TimeSwirlProps) {
    const {
        style,
        background = "#000000",
        colors,
        hue = 0,
        hueSpread = 23,
        brightness = 100,
        density = 6,
        speed = 50,
        swirl = 100,
        arms = 4,
        turbulence = 100,
        hover = 200,
        centerX = 50,
        centerY = 50,
        rotationSpeed = 20,
        clockwise = true,
        width,
        height,
    } = props

    const colorA = colors?.colorA ?? "#FF0000"
    const colorB = colors?.colorB ?? "#00FF00"
    const colorC = colors?.colorC ?? "#0000FF"

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    // Whether the pointer is over the component — boosts the spin rate below
    // instead of the old position-based angle offset.
    const isHoverRef = useRef(false)

    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    const vRef = useRef({
        background,
        colorA,
        colorB,
        colorC,
        arms: 2,
        swirl: 80,
        density: 5,
        turb: 30,
        hue: 0,
        spread: 0.4,
        hover: 2,
        bright: 1,
        speed: 1,
        centerX: 0.695,
        centerY: 0.695,
        rotationSpeed: 0,
    })
    vRef.current = {
        background,
        colorA,
        colorB,
        colorC,
        // Even multipliers only: ang feeds sin(ang / 2), so an odd multiple of
        // atan is discontinuous across the branch cut and tears the spiral.
        arms: Math.round(clampN(num(arms, 2), 2, 8) / 2) * 2,
        swirl: (clampN(num(swirl, 100), 0, 300) / 100) * 80,
        density: clampN(num(density, 5), 1, 40),
        turb: (clampN(num(turbulence, 100), 0, 300) / 100) * 30,
        hue: (clampN(num(hue, 0), 0, 360) * Math.PI) / 180,
        spread: (clampN(num(hueSpread, 23), 0, 180) * Math.PI) / 180,
        bright: clampN(num(brightness, 100), 20, 300) / 100,
        speed: clampN(num(speed, 50), 0, 100) / 50,
        // centerX/Y are percentages from top-left; centerY is flipped to the
        // shader's bottom-up fragCoord fraction.
        centerX: clampN(num(centerX, 69.5), 0, 100) / 100,
        centerY: 1 - clampN(num(centerY, 30.5), 0, 100) / 100,
        // Speed is a magnitude and never negative; direction comes from the
        // separate clockwise toggle, folded in here so the render loop stays
        // a single signed value.
        rotationSpeed: (clampN(num(rotationSpeed, 20), 0, 180) * (clockwise ? 1 : -1) * Math.PI) / 180,
        // Fraction of rotationSpeed added on top while hovered — 200% doubles
        // the spin rate, so hovering triples it overall.
        hover: clampN(num(hover, 200), 0, 200) / 100,
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false })
        if (!gl) {
            console.error("TimeSwirl: WebGL unavailable")
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
            console.error("TimeSwirl link:", gl.getProgramInfoLog(prog))
            return
        }
        gl.useProgram(prog)

        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        const posLoc = gl.getAttribLocation(prog, "a_pos")
        gl.enableVertexAttribArray(posLoc)
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

        const locs: Record<string, WebGLUniformLocation | null> = {}
        const u = (name: string) => {
            if (!(name in locs)) locs[name] = gl.getUniformLocation(prog, name)
            return locs[name]
        }

        let raf = 0
        let last = performance.now()
        let clock = 0
        let rotAngle = 0

        const render = (now: number) => {
            const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
            last = now
            const v = vRef.current
            // cnoise has period 289 per axis, so wrapping there is seamless and
            // the accumulator never eats into the mantissa.
            clock = (clock + dt * v.speed * BASE_RATE) % 289
            // Hovering boosts the spin rate instead of shifting a static angle.
            const rotSpeedMul = 1 + (isHoverRef.current ? v.hover : 0)
            rotAngle = (rotAngle + dt * v.rotationSpeed * rotSpeedMul) % (Math.PI * 2)

            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            const cw = sizeRef.current.w || canvas.clientWidth || 1200
            const ch = sizeRef.current.h || canvas.clientHeight || 800
            const bw = Math.max(1, Math.round(cw * dpr))
            const bh = Math.max(1, Math.round(ch * dpr))
            if (canvas.width !== bw || canvas.height !== bh) {
                canvas.width = bw
                canvas.height = bh
                gl.viewport(0, 0, bw, bh)
            }

            const bg = parseColor(v.background, [0, 0, 0])
            const colA = parseColor(v.colorA, [1, 0, 0])
            const colB = parseColor(v.colorB, [0, 1, 0])
            const colC = parseColor(v.colorC, [0, 0, 1])

            gl.uniform2f(u("uRes"), bw, bh)
            gl.uniform1f(u("uTime"), clock)
            gl.uniform3f(u("uBg"), bg[0], bg[1], bg[2])
            gl.uniform3f(u("uColorA"), colA[0], colA[1], colA[2])
            gl.uniform3f(u("uColorB"), colB[0], colB[1], colB[2])
            gl.uniform3f(u("uColorC"), colC[0], colC[1], colC[2])
            gl.uniform2f(u("uCenter"), v.centerX, v.centerY)
            gl.uniform1f(u("uRotation"), rotAngle)
            gl.uniform1f(u("uArms"), v.arms)
            gl.uniform1f(u("uSwirl"), v.swirl)
            gl.uniform1f(u("uDensity"), v.density)
            gl.uniform1f(u("uTurb"), v.turb)
            gl.uniform1f(u("uHue"), v.hue)
            gl.uniform1f(u("uSpread"), v.spread)
            gl.uniform1f(u("uBright"), v.bright)

            gl.drawArrays(gl.TRIANGLES, 0, 3)
            raf = requestAnimationFrame(render)
        }

        raf = requestAnimationFrame(render)
        return () => {
            cancelAnimationFrame(raf)
        }
    }, [])

    return (
        <div
            ref={rootRef}
            onPointerEnter={() => {
                isHoverRef.current = true
            }}
            onPointerLeave={() => {
                isHoverRef.current = false
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
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                    // So offsetX above is always measured against the root.
                    pointerEvents: "none",
                }}
            />
        </div>
    )
}
