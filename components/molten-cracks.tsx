"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/* ---------------------------------------------------------------- constants */

const DPR_MIN = 1.5
const DPR_CAP = 2

/** Cell drift and flicker rates at Speed 50 — the rates the scene shipped at.
 *  Speed scales one clock, so 0 freezes the drift and the flicker together
 *  rather than leaving one of them running. */
const DRIFT_AT_50 = 0.25
const FLICKER_AT_50 = 2.1

/** Scene clock wrap. Only differences are read, so this is invisible, and it
 *  keeps a long session out of the range where highp loses resolution. */
const CLOCK_WRAP = 3600

/** Relief frequencies for the stone. Cut as dials (rule 8b) and frozen: this is
 *  the surface's material, not something a designer reaches for. */
const ROCK_SCALE = 7
const RELIEF_SCALE = 22

/* ------------------------------------------------------------------ shaders */

const VERT = `
precision highp float;
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAG = `
precision highp float;

uniform vec2  uRes;
uniform float uDensity;    // cells across the viewport height
uniform float uWidth;      // crack half-width, in cell units
uniform float uWarp;       // domain warp amount
uniform float uTime;       // scene seconds (wrapped)
uniform float uFlickRate;
uniform vec2  uHeat;       // eased pointer, uv units
uniform float uReach;      // heat radius, uv units
uniform float uAmbient;    // 0..1 baseline heat along the cracks
uniform float uFlicker;    // 0..1 flicker depth
uniform float uAccentMix;  // 0..1 share of the glow reaching the hot colour
uniform vec3  uStone;
uniform vec3  uWarm;
uniform vec3  uHot;

float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
vec2 h22(vec2 p){
  vec3 q = fract(vec3(p.xyx)*vec3(0.1031,0.1030,0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.xx + q.yz)*q.zy);
}
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), f.x),
             mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++){ v += a*vnoise(p); p *= 2.03; a *= 0.5; }
  return v;
}

/* Worley: nearest and second-nearest feature distances. Their DIFFERENCE is
 * zero on the wall between two cells, which is where a crack is. */
vec2 worley(vec2 p){
  vec2 n = floor(p), f = fract(p);
  float f1 = 8.0, f2 = 8.0;
  for (int j = -1; j <= 1; j++){
    for (int i = -1; i <= 1; i++){
      vec2 g = vec2(float(i), float(j));
      vec2 o = h22(n + g);
      o = 0.5 + 0.42*sin(uTime + 6.2831*o);
      float d = length(g + o - f);
      if (d < f1){ f2 = f1; f1 = d; } else if (d < f2){ f2 = d; }
    }
  }
  return vec2(f1, f2);
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*uRes)/uRes.y;

  vec2 q = uv*uDensity + vec2(fbm(uv*2.0), fbm(uv*2.0 + 4.0))*uWarp;
  vec2 w = worley(q);
  float edge = w.y - w.x;
  float crack = 1.0 - smoothstep(0.0, uWidth, edge);
  float deep  = 1.0 - smoothstep(0.0, uWidth*0.33, edge);

  // Heat is the crack network filtered by proximity — never a blob over it.
  float d = length(uv - uHeat);
  float prox = exp(-(d*d)/max(uReach*uReach, 1e-4));
  float heat = crack * (uAmbient + (1.0 - uAmbient)*prox);
  heat *= 1.0 - uFlicker*0.5 + uFlicker*0.5*sin(uTime*uFlickRate + w.x*22.0);

  float rock   = fbm(uv*${ROCK_SCALE}.0);
  float relief = fbm(uv*${RELIEF_SCALE}.0);
  vec3 stone = uStone*(0.55 + 1.15*rock);
  stone *= 0.75 + 0.45*relief;
  stone *= 1.0 - crack*0.55;          // the fissure sinks into shadow

  vec3 col = stone;
  col += uWarm*pow(heat, 1.7)*1.6;
  // Accent Mix widens the white-hot core: at 0 only the very centre of the
  // deepest fissure reaches it, at 100 most of the lit network does.
  col += uHot*pow(deep*heat, mix(7.0, 1.6, uAccentMix))*2.0;
  col += uWarm*prox*0.14;             // heat haze in the air around the spot

  gl_FragColor = vec4(col, 1.0);
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
        h = h.split("").map((c) => c + c).join("")
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
        console.warn("MoltenCracks shader:", gl.getShaderInfoLog(sh))
    return sh
}

function linkProg(gl: WebGLRenderingContext, vs: string, fs: string) {
    const prog = gl.createProgram()!
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, vs))
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, fs))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
        console.warn("MoltenCracks link:", gl.getProgramInfoLog(prog))
    return prog
}

/* --------------------------------------------------------------------- props */

interface CracksGroup {
    /** 1..100 % — crack line thickness. */
    width?: number
    /** 0..100 % — how far the cell field is distorted. 0 is a tidy Voronoi. */
    warp?: number
}
interface HeatGroup {
    /** 0..100 % — glow along cracks the pointer is nowhere near. */
    ambient?: number
    /** 0..100 % — depth of the flicker. */
    flicker?: number
}
interface CursorGroup {
    /** 1..100 % of the half-height — radius of the hot spot. */
    reach?: number
    /** 1..100 % — how fast the hot spot follows. Higher settles faster. */
    damping?: number
}

/* A group the designer never opened arrives undefined, so each is spread over a
 * typed literal rather than read through a `??` chain (rule 11). */
const CRACKS_DEFAULTS: Required<CracksGroup> = { width: 30, warp: 50 }
const HEAT_DEFAULTS: Required<HeatGroup> = { ambient: 30, flicker: 20 }
const CURSOR_DEFAULTS: Required<CursorGroup> = { reach: 42, damping: 18 }

interface Props {
    /** The stone. This IS the background — the shader is opaque, so there is no
     *  separate root colour to set. */
    background?: string
    baseColor?: string
    accentColor?: string
    /** 0..100 % — how much of the lit network reaches the hot colour. */
    accentMix?: number
    /** Vignette, drawn ABOVE the canvas because the stone is opaque. */
    glow?: string
    /** Cells across the viewport height. */
    density?: number
    /** 0..100; 50 is the rate the scene shipped at. 0 freezes it. */
    speed?: number
    cracks?: CracksGroup
    heat?: HeatGroup
    cursor?: CursorGroup
    width?: number
    height?: number
    style?: React.CSSProperties
}

/* ----------------------------------------------------------------- component */

export default function MoltenCracks(props: Props) {
    const {
        background = "#441000",
        baseColor = "#FF6A0E",
        accentColor = "#FFE8A6",
        accentMix = 80,
        glow = "rgba(255,110,30,0.10)",
        density = 22,
        speed = 100,
        cracks,
        heat,
        cursor,
        style,
    } = props

    const cr: Required<CracksGroup> = { ...CRACKS_DEFAULTS, ...(cracks || {}) }
    const ht: Required<HeatGroup> = { ...HEAT_DEFAULTS, ...(heat || {}) }
    const cu: Required<CursorGroup> = { ...CURSOR_DEFAULTS, ...(cursor || {}) }

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Live inputs via ref — the context is built once and a prop change must
    // never reach the effect's deps (rule 6).
    const live = useRef({
        background, baseColor, accentColor, accentMix, density, speed,
        width: cr.width, warp: cr.warp,
        ambient: ht.ambient, flicker: ht.flicker,
        reach: cu.reach, damping: cu.damping,
    })
    live.current = {
        background, baseColor, accentColor, accentMix, density, speed,
        width: cr.width, warp: cr.warp,
        ambient: ht.ambient, flicker: ht.flicker,
        reach: cu.reach, damping: cu.damping,
    }

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return

        const gl = canvas.getContext("webgl", {
            alpha: false,
            antialias: false,
            depth: false,
        }) as WebGLRenderingContext | null
        if (!gl) return

        const prog = linkProg(gl, VERT, FRAG)
        gl.useProgram(prog)

        const aPos = gl.getAttribLocation(prog, "aPos")
        const U = (n: string) => gl.getUniformLocation(prog, n)
        const u = {
            res: U("uRes"), density: U("uDensity"), width: U("uWidth"),
            warp: U("uWarp"), time: U("uTime"), flickRate: U("uFlickRate"),
            heat: U("uHeat"), reach: U("uReach"), ambient: U("uAmbient"),
            flicker: U("uFlicker"), accentMix: U("uAccentMix"),
            stone: U("uStone"), warm: U("uWarm"), hot: U("uHot"),
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

        /* ---- sizing ---- */
        // Never the injected width/height props: they are not numeric in
        // preview. The buffer is sized from the canvas's own CSS box.
        let cssW = 0, cssH = 0, dpr = 1
        const resize = () => {
            dpr = Math.min(Math.max(window.devicePixelRatio || 1, DPR_MIN), DPR_CAP)
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

        /* ---- pointer ---- */
        const ptr = { x: 0, y: 0, has: false }
        const spot = { x: 0, y: 0 } // eased hot spot, uv units

        /* ---- rAF loop ---- */
        let raf = 0
        let last = performance.now()
        let sceneT = 0 // dt × speed, so Speed 0 freezes drift and flicker alike
        let idleT = 0

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dtReal = Math.min((now - last) / 1000, 0.05)
            last = now
            if (cssW <= 0 || cssH <= 0) { resize(); return }

            const L = live.current
            sceneT += dtReal * (L.speed / 50)
            if (sceneT > CLOCK_WRAP) sceneT -= CLOCK_WRAP

            /* -- hot spot: the pointer, or a drift before it has ever moved
             *    (and after it leaves) so the canvas is never a dead frame -- */
            // Scaled by Speed, not raw: Speed 0 must stop the AUTONOMOUS
            // motion, and the idle drift is autonomous motion. Freezing only
            // the shader clock left the hot spot still wandering, so Speed 0
            // was not a freeze at all — measured as a 2.59 pixel delta across
            // 90 frames that should have been identical. A real pointer still
            // moves the spot at Speed 0, because input is not autonomy.
            idleT += dtReal * (L.speed / 50)
            let tx: number, ty: number
            if (ptr.has) {
                // Same uv convention as the shader: centred, y up, divided by
                // HEIGHT on both axes so x carries the aspect.
                tx = (ptr.x * dpr - 0.5 * canvas.width) / canvas.height
                ty = (0.5 * canvas.height - ptr.y * dpr) / canvas.height
            } else {
                tx = Math.sin(idleT * 0.23) * 0.44
                ty = Math.cos(idleT * 0.17) * 0.3
            }
            const k = 1 - Math.exp(-(L.damping / 100) * 12 * dtReal)
            spot.x += (tx - spot.x) * k
            spot.y += (ty - spot.y) * k

            const [sr, sg, sb] = parseColor(L.background)
            const [wr, wg, wb] = parseColor(L.baseColor)
            const [hr, hg, hb] = parseColor(L.accentColor)

            gl.uniform2f(u.res, canvas.width, canvas.height)
            gl.uniform1f(u.density, Math.max(L.density, 1))
            // Percent -> cell units. The useful range is narrow: past ~0.16 the
            // walls merge and the network stops reading as cracks.
            gl.uniform1f(u.width, 0.012 + (L.width / 100) * 0.15)
            gl.uniform1f(u.warp, (L.warp / 100) * 1.1)
            gl.uniform1f(u.time, sceneT * DRIFT_AT_50)
            gl.uniform1f(u.flickRate, FLICKER_AT_50 / DRIFT_AT_50)
            gl.uniform2f(u.heat, spot.x, spot.y)
            gl.uniform1f(u.reach, Math.max(L.reach, 1) / 100 * 0.9)
            gl.uniform1f(u.ambient, Math.min(Math.max(L.ambient, 0), 100) / 100)
            gl.uniform1f(u.flicker, Math.min(Math.max(L.flicker, 0), 100) / 100)
            gl.uniform1f(u.accentMix, Math.min(Math.max(L.accentMix, 0), 100) / 100)
            gl.uniform3f(u.stone, sr, sg, sb)
            gl.uniform3f(u.warm, wr, wg, wb)
            gl.uniform3f(u.hot, hr, hg, hb)

            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }
        raf = requestAnimationFrame(frame)

        /* ---- pointer wiring ---- */
        const onMove = (e: PointerEvent) => {
            const r = host.getBoundingClientRect()
            // Zoom-free: both sides of the subtraction carry the canvas zoom and
            // clientWidth is the unzoomed reference (rule G).
            const scale = r.width > 0 ? host.clientWidth / r.width : 1
            ptr.x = (e.clientX - r.left) * scale
            ptr.y = (e.clientY - r.top) * scale
            ptr.has = true
        }
        const onLeave = () => { ptr.has = false }

        host.addEventListener("pointermove", onMove)
        host.addEventListener("pointerleave", onLeave)
        window.addEventListener("pointerup", onLeave) // rule K

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            host.removeEventListener("pointermove", onMove)
            host.removeEventListener("pointerleave", onLeave)
            window.removeEventListener("pointerup", onLeave)
            // No loseContext() — rule 6
        }
    }, [])

    return (
        <div
            ref={hostRef}
            style={{
                // Floor before the style spread: the canvas is absolute, the
                // root has no in-flow content and collapses under Fit Content
                // (rule 6). An explicit size on the instance still wins.
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
            {/* Above the canvas, not beneath it: the stone is opaque, so a
                vignette painted as the root's background would never be seen and
                the Glow dial would map to nothing (rule F). */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    background: `radial-gradient(68% 54% at 50% 46%, ${glow} 0%, transparent 72%)`,
                }}
            />
        </div>
    )
}
