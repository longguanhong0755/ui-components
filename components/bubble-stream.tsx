"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const MAX_DPR = 2 // quality tier, not a design control (rule 10)
const MAX_LAYERS = 4

const VERT_SRC = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`

const FRAG_SRC = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;
uniform float uTime;
uniform float uDpr;
uniform vec3  uBg;
uniform vec3  uBase;
uniform vec3  uAccent;
uniform vec2  uDir;
uniform float uGrid;
uniform float uSize;
uniform float uLayers;
uniform float uScatter;
uniform float uWobble;
uniform float uIrid;
uniform float uRim;
uniform float uSpec;
uniform float uGrain;
uniform float uVig;
uniform float uGap;

vec4 hash4(vec2 p) {
    vec4 q = vec4(dot(p, vec2(127.1, 311.7)),
                  dot(p, vec2(269.5, 183.3)),
                  dot(p, vec2(419.2, 371.9)),
                  dot(p, vec2(113.5, 271.9)));
    return fract(sin(q) * 43758.5453123);
}

void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * uRes) / uRes.y;

    // Screen -> flow space: +x is the travel direction.
    mat2 rot = mat2(uDir.x, -uDir.y, uDir.y, uDir.x);
    vec2 fp = rot * p;
    // Fixed key light, upper left on SCREEN, carried into flow space.
    vec2 L = rot * vec2(-0.42, 0.42);

    vec3 col = uBg;

    for (int li = 0; li < 4; li++) {
        if (float(li) >= uLayers) break;
        float t = uLayers > 1.0 ? float(li) / (uLayers - 1.0) : 1.0; // 0 far, 1 near
        float gm   = mix(1.90, 0.75, t);
        float rate = mix(0.35, 1.25, t);
        float dim  = mix(0.42, 1.00, t);
        float soft = mix(3.20, 1.00, t);

        float g = uGrid * gm;
        float px = g / uRes.y; // one device pixel, in cell units

        vec2 q = fp * g;
        q.x -= uTime * rate * g * 0.09;   // travel along +x of flow space
        q.y += float(li) * 7.31;          // decorrelate the lanes

        vec2 ic = floor(q);
        vec2 fc = q - ic;

        for (int dy = -1; dy <= 1; dy++) {
            for (int dx = -1; dx <= 1; dx++) {
                vec2 o = vec2(float(dx), float(dy));
                vec4 h = hash4(ic + o + vec2(float(li) * 31.7, float(li) * 23.1));
                if (h.w > 0.82) continue; // punch holes so the lattice never reads

                float ph = h.x * 6.2831853;
                vec2 cen = o + vec2(0.5) + (h.xy - 0.5) * 0.70 * uScatter;
                cen.y += sin(uTime * (0.70 + h.z * 0.60) + ph) * uWobble;
                cen.x += cos(uTime * (0.50 + h.y * 0.50) + ph) * uWobble * 0.5;

                float rad = max(0.0, mix(0.10, 0.26, h.z) * uSize - uGap * uDpr * px * 0.5);
                vec2 dv = fc - cen;
                float d = length(dv);
                if (d > rad + px * soft * 2.0) continue;

                float aa = px * soft * 1.5;
                float mask = 1.0 - smoothstep(rad - aa, rad + aa, d);
                if (mask <= 0.001) continue;

                float u = min(d / rad, 1.0);
                float ct = sqrt(max(0.0, 1.0 - u * u));   // cos of the view angle
                float fres = pow(1.0 - ct, 3.0);

                // Thin film: optical path ~ thickness / cos(theta).
                float film = fract(0.55 / max(ct, 0.10) + h.z * 0.80 + h.y * 0.35);
                vec3 irid = 0.5 + 0.5 * cos(6.2831853 * (film + vec3(0.0, 0.33, 0.67)));
                vec3 shell = mix(uBase, irid, uIrid);

                float s1 = 1.0 - smoothstep(0.0, rad * 0.30, length(dv - L * rad));
                float s2 = 1.0 - smoothstep(0.0, rad * 0.42, length(dv + L * rad * 0.80));
                float spec = (s1 * s1 + s2 * 0.35) * uSpec;

                float a = clamp((0.05 + fres) * uRim, 0.0, 1.0) * mask * dim;
                col = mix(col, shell * (0.30 + 0.85 * fres), a);
                col += uAccent * spec * mask * dim;
            }
        }
    }

    vec2 uvn = frag / uRes;
    float vig = 1.0 - uVig * pow(clamp(length((uvn - 0.5) * vec2(1.25, 1.0)) * 1.35, 0.0, 1.0), 2.0);
    col *= clamp(vig, 0.0, 1.0);

    col += (hash4(frag / uDpr + fract(uTime) * 91.7).x - 0.5) * uGrain * 0.09;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

function parseColor(str: string | undefined, fb: [number, number, number]): [number, number, number] {
    if (!str || typeof str !== "string") return fb
    const s = str.trim()
    if (s[0] === "#") {
        let hex = s.slice(1)
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
    const m = s.match(/[\d.]+/g)
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

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("BubbleStream shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

type FieldGroup = { layers?: number; scatter?: number; wobble?: number }
type FilmGroup = { iridescence?: number; rim?: number; highlight?: number }

interface BubbleStreamProps {
    style?: React.CSSProperties
    background?: string
    baseColor?: string
    accentColor?: string
    density?: number
    size?: number
    speed?: number
    angle?: number
    field?: FieldGroup
    film?: FilmGroup
    width?: number
    height?: number
}

const D_FIELD: Required<FieldGroup> = { layers: 3, scatter: 100, wobble: 40 }
const D_FILM: Required<FilmGroup> = { iridescence: 70, rim: 85, highlight: 90 }

export default function BubbleStream(props: BubbleStreamProps) {
    const {
        style,
        background = "#000000",
        baseColor = "#7FD8FF",
        accentColor = "#FFFFFF",
        density = 30,
        size = 100,
        speed = 50,
        angle = 0,
        field,
        film,
        width,
        height,
    } = props

    const F = { ...D_FIELD, ...(field ?? {}) }
    const M = { ...D_FILM, ...(film ?? {}) }

    const canvasRef = useRef<HTMLCanvasElement>(null)

    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    const a = (num(angle, 0) * Math.PI) / 180

    const vRef = useRef({
        bg: [0, 0, 0] as [number, number, number],
        base: [0, 0, 0] as [number, number, number],
        accent: [0, 0, 0] as [number, number, number],
        dir: [1, 0] as [number, number],
        grid: 4.8,
        size: 1,
        speed: 1,
        layers: 3,
        scatter: 1,
        wobble: 0.1,
        irid: 0.7,
        rim: 0.85,
        spec: 0.9,
        grain: 0.25,
        vig: 0.35,
        gap: 0,
    })
    vRef.current = {
        bg: parseColor(background, [0.02, 0.043, 0.078]),
        base: parseColor(baseColor, [0.498, 0.847, 1]),
        accent: parseColor(accentColor, [1, 1, 1]),
        dir: [Math.cos(a), Math.sin(a)],
        grid: 1.5 + Math.max(1, Math.min(100, num(density, 30))) * 0.11,
        size: num(size, 100) / 100,
        speed: num(speed, 50) / 50,
        layers: Math.max(1, Math.min(MAX_LAYERS, Math.round(num(F.layers, 3)))),
        scatter: num(F.scatter, 100) / 100,
        wobble: (num(F.wobble, 40) / 100) * 0.25,
        irid: num(M.iridescence, 70) / 100,
        rim: num(M.rim, 85) / 100,
        spec: num(M.highlight, 90) / 100,
        grain: 0.25,
        vig: 0.35,
        gap: 0,
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false })
        if (!gl) {
            console.error("BubbleStream: WebGL unavailable")
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
            console.error("BubbleStream link:", gl.getProgramInfoLog(prog))
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
            time: gl.getUniformLocation(prog, "uTime"),
            dpr: gl.getUniformLocation(prog, "uDpr"),
            bg: gl.getUniformLocation(prog, "uBg"),
            base: gl.getUniformLocation(prog, "uBase"),
            accent: gl.getUniformLocation(prog, "uAccent"),
            dir: gl.getUniformLocation(prog, "uDir"),
            grid: gl.getUniformLocation(prog, "uGrid"),
            size: gl.getUniformLocation(prog, "uSize"),
            layers: gl.getUniformLocation(prog, "uLayers"),
            scatter: gl.getUniformLocation(prog, "uScatter"),
            wobble: gl.getUniformLocation(prog, "uWobble"),
            irid: gl.getUniformLocation(prog, "uIrid"),
            rim: gl.getUniformLocation(prog, "uRim"),
            spec: gl.getUniformLocation(prog, "uSpec"),
            grain: gl.getUniformLocation(prog, "uGrain"),
            vig: gl.getUniformLocation(prog, "uVig"),
            gap: gl.getUniformLocation(prog, "uGap"),
        }

        let raf = 0
        let last = performance.now()
        let clock = 0

        const render = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            const v = vRef.current
            clock = (clock + dt * v.speed) % 3600

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

            gl.uniform2f(u.res, bw, bh)
            gl.uniform1f(u.time, clock)
            gl.uniform1f(u.dpr, dpr)
            gl.uniform3f(u.bg, v.bg[0], v.bg[1], v.bg[2])
            gl.uniform3f(u.base, v.base[0], v.base[1], v.base[2])
            gl.uniform3f(u.accent, v.accent[0], v.accent[1], v.accent[2])
            gl.uniform2f(u.dir, v.dir[0], v.dir[1])
            gl.uniform1f(u.grid, v.grid)
            gl.uniform1f(u.size, v.size)
            gl.uniform1f(u.layers, v.layers)
            gl.uniform1f(u.scatter, v.scatter)
            gl.uniform1f(u.wobble, v.wobble)
            gl.uniform1f(u.irid, v.irid)
            gl.uniform1f(u.rim, v.rim)
            gl.uniform1f(u.spec, v.spec)
            gl.uniform1f(u.grain, v.grain)
            gl.uniform1f(u.vig, v.vig)
            gl.uniform1f(u.gap, v.gap)

            gl.drawArrays(gl.TRIANGLES, 0, 3)
            raf = requestAnimationFrame(render)
        }

        raf = requestAnimationFrame(render)
        return () => cancelAnimationFrame(raf)
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
