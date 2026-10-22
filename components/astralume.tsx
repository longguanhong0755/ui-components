"use client"

import type { CSSProperties } from "react"
import * as React from "react"
import { useEffect, useRef } from "react"

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    tiltX: 0,
    tiltY: 0,
    spinOffset: 50,
    spinRate: 30,
    tumblePitch: 18,
    tumbleYaw: 12,
    tumblePeriod: 12000,
    armLength: 62,
    barThickness: 110,
    bevel: 16,
    ior: 150,
    fov: 31,
    keyColor: "#FFD9A8",
    keyIntensity: 100,
    fillColor: "#E6ECFF",
    fillIntensity: 100,
    rimColor: "#9AB0FF",
    rimIntensity: 100,
    warmColor: "#F2A24A",
    warmIntensity: 80,
    coreColor: "#2E4BFF",
    coreGlow: 50,
    frost: 60,
    sheen: 40,
    exposure: 100,
    offsetX: 0,
    offsetY: 0,
    pointerTilt: 15,
    pressDispersion: 30,
    resolution: 100,
    hover: 100,
    grain: 0,
    vignette: 0,
}

// ── moved controls (builder) ──
/**
 * Controls moved in the builder: into Advanced, out of it, or into groups of
 * their own. The code reads each one where it was first written, so the props
 * are put back in that shape before anything reads them.
 */
const MOVED_CONTROLS: { into: Record<string, string>; out: Record<string, string> } = {"into":{},"out":{"hover":"advanced"}}
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

const VERT = `#version 300 es
in vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAG = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 uRes;
uniform mat3 uRot;
uniform vec2 uOffset;
uniform float uScale;
uniform float uLen;
uniform float uBars;
uniform float uThick;
uniform float uBevel;
uniform float uIor;
uniform float uSpread;
uniform float uFocal;
uniform float uCamDist;
uniform vec3 uTint;
uniform vec3 uBg;
uniform vec3 uKeyCol;
uniform vec3 uFillCol;
uniform vec3 uRimCol;
uniform vec3 uWarmCol;
uniform vec3 uCoreCol;
uniform float uKeyInt;
uniform float uFillInt;
uniform float uRimInt;
uniform float uWarmInt;
uniform float uCoreInt;
uniform float uFrost;
uniform float uSheen;
uniform float uExposure;
uniform float uGrain;
uniform float uVignette;
uniform float uTime;
uniform vec2 uMouse;
uniform float uHover;

float sdRB(vec3 p, vec3 b, float r){
  vec3 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}

float map(vec3 pw){
  vec3 p = uRot * pw / uScale;
  vec3 b = vec3(uLen, uThick, uThick);
  // uBars bars crossing at the centre, spread evenly over half a turn (3 = the six-armed asterisk).
  float d = 1e9;
  float stepA = 3.14159265 / max(uBars, 1.0);
  for (int i = 0; i < 12; i++) {
    if (float(i) >= uBars) break;
    float a = float(i) * stepA;
    float c = cos(a);
    float s = sin(a);
    vec3 q = vec3(c * p.x + s * p.y, -s * p.x + c * p.y, p.z);
    d = min(d, sdRB(q, b, uBevel));
  }
  return d * uScale;
}

vec3 calcN(vec3 p){
  const vec2 k = vec2(1.0, -1.0);
  const float h = 0.0018;
  return normalize(k.xyy * map(p + k.xyy * h) + k.yyx * map(p + k.yyx * h) +
                   k.yxy * map(p + k.yxy * h) + k.xxx * map(p + k.xxx * h));
}

// Interleaved gradient noise: a per-pixel dither that breaks banding without visible grain.
float ign(vec2 p){
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

float softbox(vec3 d, vec3 c, vec3 ax, vec2 size, float soft){
  float fd = dot(d, c);
  if (fd <= 0.05) return 0.0;
  vec3 u = normalize(ax - c * dot(ax, c));
  vec3 v = cross(c, u);
  vec2 pp = vec2(dot(d, u), dot(d, v)) / max(fd, 0.05);
  vec2 a = abs(pp) - size;
  float m = max(a.x, a.y);
  return 1.0 - smoothstep(-soft, soft, m);
}

vec3 env(vec3 d){
  // Straight through the glass stays dark (the backdrop); everything bent away from it meets a lit studio.
  float back = smoothstep(0.45, 0.9, -d.z);
  vec3 dome = mix(vec3(0.10, 0.105, 0.12), vec3(0.42, 0.43, 0.46), smoothstep(-0.7, 0.9, d.y - 0.35 * d.x));
  vec3 col = mix(dome * uFillInt, uBg, back);
  // Wide falloffs: the glass magnifies these edges, so hard light edges read as jagged steps.
  col += uKeyCol * uKeyInt * 3.0 * softbox(d, normalize(vec3(-0.7, 0.6, 0.4)), vec3(0.0, 1.0, 0.0), vec2(0.45, 1.2), 0.28);
  col += uFillCol * uFillInt * 2.2 * softbox(d, normalize(vec3(-0.55, 0.5, -0.65)), vec3(1.0, 0.0, 0.0), vec2(1.0, 0.22), 0.16);
  col += uFillCol * uFillInt * 1.6 * softbox(d, normalize(vec3(0.15, 0.75, -0.65)), vec3(1.0, 0.0, 0.0), vec2(1.4, 0.12), 0.13);
  col += uRimCol * uRimInt * 2.6 * softbox(d, normalize(vec3(0.75, -0.35, -0.55)), vec3(0.0, 1.0, 0.0), vec2(0.22, 1.0), 0.14);
  col += uRimCol * uRimInt * 1.8 * softbox(d, normalize(vec3(0.85, 0.2, 0.4)), vec3(0.0, 1.0, 0.0), vec2(0.2, 0.9), 0.14);
  col += uWarmCol * uWarmInt * 2.4 * softbox(d, normalize(vec3(0.2, -0.85, 0.4)), vec3(1.0, 0.0, 0.0), vec2(0.9, 0.14), 0.13);
  col += uWarmCol * uWarmInt * 1.8 * softbox(d, normalize(vec3(-0.3, -0.6, -0.7)), vec3(1.0, 0.0, 0.0), vec2(0.8, 0.12), 0.13);
  vec3 md = normalize(vec3(uMouse * 0.8, 1.0));
  col += vec3(1.0) * uHover * 1.5 * smoothstep(0.96, 0.998, dot(d, md));
  return col;
}

float fres(float c){
  float x = 1.0 - clamp(c, 0.0, 1.0);
  return 0.04 + 0.96 * x * x * x * x * x;
}

vec3 glass(vec3 p, vec3 rd){
  vec3 n = calcN(p);
  float F = fres(dot(-rd, n));
  vec3 refl = env(reflect(rd, n));
  vec3 rdi = refract(rd, n, 1.0 / max(uIor, 1.0001));
  vec3 pi = p - n * 0.002;
  vec3 thr = vec3(1.0);
  vec3 acc = vec3(0.0);
  float core = 0.0;
  vec3 iors = vec3(uIor - uSpread * 0.43, uIor, uIor + uSpread * 0.57);
  float jit = ign(gl_FragCoord.xy);
  for (int bnc = 0; bnc < 3; bnc++) {
    float t = jit * 0.003;
    for (int i = 0; i < 56; i++) {
      vec3 q = pi + rdi * t;
      float d = -map(q);
      vec3 po = uRot * q / uScale;
      float s = max(d, 0.0025);
      core += exp(-dot(po, po) * 300.0) * s / uScale;
      if (d < 0.0004) break;
      t += s;
    }
    vec3 pe = pi + rdi * t;
    vec3 ne = calcN(pe);
    thr *= pow(max(uTint, vec3(0.001)), vec3(t * 1.5 / uScale));
    vec3 oR = refract(rdi, -ne, iors.x);
    vec3 oG = refract(rdi, -ne, iors.y);
    vec3 oB = refract(rdi, -ne, iors.z);
    if (dot(oR, oR) > 0.0) acc.r += thr.r * (1.0 - fres(dot(oR, ne))) * env(oR).r;
    if (dot(oG, oG) > 0.0) acc.g += thr.g * (1.0 - fres(dot(oG, ne))) * env(oG).g;
    if (dot(oB, oB) > 0.0) acc.b += thr.b * (1.0 - fres(dot(oB, ne))) * env(oB).b;
    float keep = dot(oG, oG) == 0.0 ? 0.9 : 0.3;
    thr *= keep;
    rdi = reflect(rdi, -ne);
    pi = pe - ne * 0.002;
  }
  acc += thr * env(rdi) * 0.5;

  // Frosted end caps and a milky sheen on faces turned to the key light.
  vec3 po = uRot * p / uScale;
  vec3 no = uRot * n;
  float rr = length(po.xy);
  float capAlign = abs(dot(normalize(no.xy + vec2(1e-5)), po.xy / max(rr, 1e-4)));
  float cap = smoothstep(0.85, 0.97, capAlign) * (1.0 - abs(no.z)) * smoothstep(0.6 * uLen, 0.9 * uLen, rr);
  vec3 keyD = normalize(vec3(-0.6, 0.65, 0.45));
  float lam = max(dot(n, keyD), 0.0);
  vec3 milky = mix(vec3(0.85, 0.86, 0.9), uKeyCol, 0.3);

  float ck = core * uCoreInt;
  vec3 coreCol = mix(uCoreCol, vec3(0.21, 0.82, 0.94), smoothstep(0.15, 0.45, ck));
  vec3 inside = acc + coreCol * ck * 2.5;
  vec3 col = refl * F + (1.0 - F) * inside;
  col += uFillCol * uSheen * 0.45 * lam * lam * uTint;
  col += milky * cap * uFrost * (0.35 + 0.6 * lam);
  return 1.0 - exp(-col * uExposure * 1.2);
}

float hash(vec2 p){
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main(){
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = (frag - 0.5 * uRes) / max(uRes.y, 1.0) - uOffset;
  vec3 ro = vec3(0.0, 0.0, uCamDist);
  vec3 rd = normalize(vec3(uv, -uFocal));
  vec3 col = uBg;
  float R = length(vec3(uLen, uThick, uThick)) * uScale + 0.02;
  float b = dot(ro, rd);
  float c = dot(ro, ro) - R * R;
  float h = b * b - c;
  if (h > 0.0) {
    float sh = sqrt(h);
    float t = max(-b - sh, 0.0);
    float tEnd = -b + sh;
    bool hit = false;
    // World size of one pixel per unit distance, for an anti-aliased silhouette.
    float pix = 1.0 / (uFocal * max(uRes.y, 1.0));
    float bestA = 1e9;
    float bestT = t;
    for (int i = 0; i < 96; i++) {
      float d = map(ro + rd * t);
      float a = d / max(t * pix, 1e-5);
      if (a < bestA) { bestA = a; bestT = t; }
      if (d < 0.0004) { hit = true; break; }
      t += d;
      if (t > tEnd) break;
    }
    if (hit) col = glass(ro + rd * t, rd);
    else if (bestA < 1.25) col = mix(glass(ro + rd * bestT, rd), uBg, smoothstep(0.0, 1.25, bestA));
  }
  vec2 q = frag / max(uRes, vec2(1.0)) - 0.5;
  col *= 1.0 - uVignette * smoothstep(0.2, 0.85, length(q) * 1.2);
  col += (hash(frag + fract(uTime * 0.37) * 100.0) - 0.5) * uGrain * 0.2;
  col += (ign(frag) - 0.5) / 255.0;
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

const UNIFORMS = [
    "uRes", "uRot", "uOffset", "uScale", "uLen", "uBars", "uThick", "uBevel", "uIor", "uSpread",
    "uFocal", "uCamDist", "uTint", "uBg", "uKeyCol", "uFillCol", "uRimCol", "uWarmCol",
    "uCoreCol", "uKeyInt", "uFillInt", "uRimInt", "uWarmInt", "uCoreInt", "uFrost", "uSheen",
    "uExposure", "uGrain", "uVignette", "uTime", "uMouse", "uHover",
]

function parseColor(input: any, fallback: number[]): number[] {
    if (typeof input !== "string") return fallback
    const s = input.trim()
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4) h = h.split("").map((ch) => ch + ch).join("")
        if (h.length < 6) return fallback
        const n = parseInt(h.slice(0, 6), 16)
        if (Number.isNaN(n)) return fallback
        return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
    }
    const m = s.match(/rgba?\(([^)]+)\)/i)
    if (m) {
        const parts = m[1].split(/[ ,/]+/).filter(Boolean).map(parseFloat)
        if (parts.length >= 3 && parts.slice(0, 3).every((v) => !Number.isNaN(v)))
            return [parts[0] / 255, parts[1] / 255, parts[2] / 255]
    }
    return fallback
}

function mul3(a: number[], b: number[]): number[] {
    const r = new Array(9).fill(0)
    for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++)
            r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]
    return r
}

function rotX(a: number) {
    const c = Math.cos(a), s = Math.sin(a)
    return [1, 0, 0, 0, c, -s, 0, s, c]
}
function rotY(a: number) {
    const c = Math.cos(a), s = Math.sin(a)
    return [c, 0, s, 0, 1, 0, -s, 0, c]
}
function rotZ(a: number) {
    const c = Math.cos(a), s = Math.sin(a)
    return [c, -s, 0, s, c, 0, 0, 0, 1]
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
    const sh = gl.createShader(type)
    if (!sh) throw new Error("Could not create shader")
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(sh)
        gl.deleteShader(sh)
        throw new Error("Shader compile failed: " + log)
    }
    return sh
}

export interface OneStillImageProps {
    background?: string
    tint?: string
    speed?: number
    scale?: number
    bars?: number
    dispersion?: number
    tumble?: number
    dragSensitivity?: number
    hover?: number
    advanced?: {
        tiltX?: number
        tiltY?: number
        spinOffset?: number
        spinRate?: number
        tumblePitch?: number
        tumbleYaw?: number
        tumblePeriod?: number
        armLength?: number
        barThickness?: number
        bevel?: number
        ior?: number
        fov?: number
        keyColor?: string
        keyIntensity?: number
        fillColor?: string
        fillIntensity?: number
        rimColor?: string
        rimIntensity?: number
        warmColor?: string
        warmIntensity?: number
        coreColor?: string
        coreGlow?: number
        frost?: number
        sheen?: number
        exposure?: number
        offsetX?: number
        offsetY?: number
        pointerTilt?: number
        pressDispersion?: number
        resolution?: number
        grain?: number
        vignette?: number
    }
    style?: CSSProperties
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function OneStillImage(props: OneStillImageProps) {
    props = withMovedControls(props)
    const {
        speed = 50,
        scale = 90,
        bars = 3,
        dispersion = 100,
        tumble = 100,
        tint = "#FFFFFF",
        background = "#000000",
        dragSensitivity = 100,
        style,
    } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef(props)
    propsRef.current = props

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
        if (!prog) throw new Error("Could not create program")
        gl.attachShader(prog, vs)
        gl.attachShader(prog, fs)
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
            throw new Error("Program link failed: " + gl.getProgramInfoLog(prog))
        gl.useProgram(prog)

        const loc: Record<string, WebGLUniformLocation> = {}
        for (const name of UNIFORMS) {
            const l = gl.getUniformLocation(prog, name)
            if (l === null) throw new Error("Missing uniform " + name)
            loc[name] = l
        }

        const vao = gl.createVertexArray()
        gl.bindVertexArray(vao)
        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        const aPos = gl.getAttribLocation(prog, "aPos")
        gl.enableVertexAttribArray(aPos)
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

        let cssW = root.offsetWidth || 1200
        let cssH = root.offsetHeight || 800
        const ro = new ResizeObserver(() => {
            cssW = root.offsetWidth || cssW
            cssH = root.offsetHeight || cssH
        })
        ro.observe(root)

        const reduced =
            typeof window !== "undefined" && window.matchMedia
                ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
                : false

        const pointer = { x: 0, y: 0, over: false, down: false }
        // Drag: raw pixel deltas gathered between frames, turned into angle in the loop.
        const drag = { active: false, id: -1, lx: 0, ly: 0, px: 0, py: 0, yaw: 0, pitch: 0, vYaw: 0, vPitch: 0 }
        const onMove = (e: PointerEvent) => {
            const w = root.offsetWidth || 1
            const h = root.offsetHeight || 1
            pointer.x = Math.max(-1, Math.min(1, (e.offsetX / w) * 2 - 1))
            pointer.y = Math.max(-1, Math.min(1, -((e.offsetY / h) * 2 - 1)))
            pointer.over = true
            if (drag.active && e.pointerId === drag.id) {
                drag.px += e.clientX - drag.lx
                drag.py += e.clientY - drag.ly
                drag.lx = e.clientX
                drag.ly = e.clientY
            }
        }
        const onEnter = (e: PointerEvent) => {
            pointer.over = true
            onMove(e)
        }
        const onLeave = () => {
            pointer.over = false
        }
        const onDown = (e: PointerEvent) => {
            pointer.down = true
            drag.active = true
            drag.id = e.pointerId
            drag.lx = e.clientX
            drag.ly = e.clientY
            drag.px = 0
            drag.py = 0
            drag.vYaw = 0
            drag.vPitch = 0
            try {
                canvas.setPointerCapture(e.pointerId)
            } catch {}
        }
        const onUp = () => {
            pointer.down = false
            drag.active = false
        }
        canvas.addEventListener("pointermove", onMove)
        canvas.addEventListener("pointerenter", onEnter)
        canvas.addEventListener("pointerleave", onLeave)
        canvas.addEventListener("pointerdown", onDown)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        let raf = 0
        let last = -1
        let phase = 0
        let clock = 0
        const spring = { x: 0, y: 0, vx: 0, vy: 0 }
        let hoverE = 0
        let downE = 0
        let mx = 0
        let my = 0
        const DEG = Math.PI / 180

        const frame = (now: number) => {
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            const p = propsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }

            const dpr = Math.min(window.devicePixelRatio || 1, 2) * Math.max(0.25, (adv.resolution ?? 100) / 100)
            const W = Math.max(1, Math.round(cssW * dpr))
            const H = Math.max(1, Math.round(cssH * dpr))
            if (canvas.width !== W || canvas.height !== H) {
                canvas.width = W
                canvas.height = H
            }
            gl.viewport(0, 0, W, H)

            const sp = Math.max(0, Math.min(100, p.speed ?? 50))
            const rate = reduced ? 0 : sp / 50
            phase += dt * rate
            clock += dt

            const hs = Math.max(0, adv.hover) / 50
            const ease = 1 - Math.exp(-dt * 6)
            hoverE += ((pointer.over ? 1 : 0) - hoverE) * ease
            downE += ((pointer.down ? 1 : 0) - downE) * (1 - Math.exp(-dt * 10))
            mx += ((pointer.over ? pointer.x : 0) - mx) * ease
            my += ((pointer.over ? pointer.y : 0) - my) * ease

            const tiltMax = (reduced ? Math.min(5, adv.pointerTilt) : adv.pointerTilt) * DEG * hs
            const tx = pointer.over ? -pointer.x * tiltMax : 0
            const ty = pointer.over ? pointer.y * tiltMax : 0
            const w = 10
            spring.vx += (w * w * (tx - spring.x) - 2 * w * spring.vx) * dt
            spring.vy += (w * w * (ty - spring.y) - 2 * w * spring.vy) * dt
            spring.x += spring.vx * dt
            spring.y += spring.vy * dt

            // Drag rotates the asterisk; on release it coasts and slows to a stop where it was let go.
            const dragSens = Math.max(0, Math.min(100, p.dragSensitivity ?? 50)) / 50
            const perPx = (reduced ? 0.25 : 1) * 0.4 * DEG * dragSens
            if (drag.active) {
                const dYaw = -drag.px * perPx
                const dPitch = -drag.py * perPx
                drag.yaw += dYaw
                drag.pitch += dPitch
                if (dt > 0) {
                    const k = 1 - Math.exp(-dt * 20)
                    drag.vYaw += (dYaw / dt - drag.vYaw) * k
                    drag.vPitch += (dPitch / dt - drag.vPitch) * k
                }
            } else {
                drag.yaw += drag.vYaw * dt
                drag.pitch += drag.vPitch * dt
                const fr = Math.exp(-dt * 3)
                drag.vYaw *= fr
                drag.vPitch *= fr
            }
            drag.px = 0
            drag.py = 0

            const tumbleAmt = Math.max(0, Math.min(100, p.tumble ?? 50)) / 50
            const period = Math.max(1, adv.tumblePeriod) / 1000
            const tp = (2 * Math.PI * phase) / period
            const spin = (adv.spinOffset + phase * adv.spinRate) * DEG
            const pitch = (adv.tiltX + adv.tumblePitch * tumbleAmt * Math.sin(tp)) * DEG + spring.y + drag.pitch
            const yaw = (adv.tiltY + adv.tumbleYaw * tumbleAmt * Math.sin(2 * tp)) * DEG + spring.x + drag.yaw
            const R = mul3(rotY(yaw), mul3(rotX(pitch), rotZ(spin)))

            const thick = Math.max(0.005, adv.barThickness / 1000)
            const bevelR = Math.min(Math.max(0, adv.bevel / 1000), thick * 0.9)
            const baseSpread = (Math.max(0, Math.min(100, p.dispersion ?? 50)) / 50) * 0.07
            const spread = baseSpread * (1 + (adv.pressDispersion / 100) * downE * hs)
            const fovR = Math.max(5, Math.min(120, adv.fov)) * DEG
            const focal = 0.5 / Math.tan(fovR / 2)
            const aspect = W / Math.max(H, 1)

            const bg = parseColor(p.background ?? "#000000", [0, 0, 0])
            const tintC = parseColor(p.tint ?? "#FFFFFF", [1, 1, 1])

            gl.uniform2f(loc.uRes, W, H)
            gl.uniformMatrix3fv(loc.uRot, false, new Float32Array(R))
            gl.uniform2f(loc.uOffset, (adv.offsetX / 100) * aspect, -adv.offsetY / 100)
            gl.uniform1f(loc.uScale, Math.max(0.05, (p.scale ?? 100) / 100))
            gl.uniform1f(loc.uLen, Math.max(0.05, adv.armLength / 100))
            gl.uniform1f(loc.uBars, Math.max(1, Math.min(12, Math.round(p.bars ?? 3))))
            gl.uniform1f(loc.uThick, thick)
            gl.uniform1f(loc.uBevel, bevelR)
            gl.uniform1f(loc.uIor, Math.max(1.01, adv.ior / 100))
            gl.uniform1f(loc.uSpread, spread)
            gl.uniform1f(loc.uFocal, focal)
            gl.uniform1f(loc.uCamDist, 3.2)
            gl.uniform3fv(loc.uTint, tintC)
            gl.uniform3fv(loc.uBg, bg)
            gl.uniform3fv(loc.uKeyCol, parseColor(adv.keyColor, [1, 0.85, 0.66]))
            gl.uniform3fv(loc.uFillCol, parseColor(adv.fillColor, [0.9, 0.92, 1]))
            gl.uniform3fv(loc.uRimCol, parseColor(adv.rimColor, [0.6, 0.69, 1]))
            gl.uniform3fv(loc.uWarmCol, parseColor(adv.warmColor, [0.95, 0.64, 0.29]))
            gl.uniform3fv(loc.uCoreCol, parseColor(adv.coreColor, [0.18, 0.29, 1]))
            gl.uniform1f(loc.uKeyInt, Math.max(0, adv.keyIntensity) / 100)
            gl.uniform1f(loc.uFillInt, Math.max(0, adv.fillIntensity) / 100)
            gl.uniform1f(loc.uRimInt, Math.max(0, adv.rimIntensity) / 100)
            gl.uniform1f(loc.uWarmInt, Math.max(0, adv.warmIntensity) / 100)
            gl.uniform1f(loc.uCoreInt, Math.max(0, adv.coreGlow) / 50)
            gl.uniform1f(loc.uFrost, Math.max(0, adv.frost) / 100)
            gl.uniform1f(loc.uSheen, Math.max(0, adv.sheen) / 100)
            gl.uniform1f(loc.uExposure, Math.max(0, adv.exposure) / 100)
            gl.uniform1f(loc.uGrain, Math.max(0, adv.grain) / 100)
            gl.uniform1f(loc.uVignette, Math.max(0, adv.vignette) / 100)
            gl.uniform1f(loc.uTime, clock)
            gl.uniform2f(loc.uMouse, mx, my)
            gl.uniform1f(loc.uHover, hoverE * hs * 0.5)

            gl.drawArrays(gl.TRIANGLES, 0, 3)
            raf = requestAnimationFrame(frame)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            canvas.removeEventListener("pointermove", onMove)
            canvas.removeEventListener("pointerenter", onEnter)
            canvas.removeEventListener("pointerleave", onLeave)
            canvas.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
            gl.deleteBuffer(buf)
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
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
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
                    touchAction: "none",
                    cursor: dragSensitivity > 0 ? "grab" : "default",
                }}
            />
        </div>
    )
}

// Control order arranged in the builder.
