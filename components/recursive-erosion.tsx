"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const MAX_DPR = 2
const GRAIN = 0.3 // was the Grain dial's default; grading, so no longer a row
const VIGNETTE = 0.24 // was the Vignette dial's default
const DUR = 3.99 // reference loop length, seconds
const WORMS = 7
const TAIL = 14
const WN = WORMS * TAIL
const PEARL = 34
const TN = WORMS * PEARL
const TSTRIDE = 5
const GRAIN_TILE = 170

// Cut controls, frozen at the value they shipped at (the render path is
// unchanged; only the panel row is gone).
const CHROMA = 1.0 // per-dot red/blue fringe strength
const PERSP = 0.14 // weak perspective on the point cloud

// Sphere radius as a fraction of the short edge, at Size = 100%. Not a cut
// control — the Size dial scales it.
const SPHERE_FIT = 0.672

const VERT_SRC = `
precision highp float;

attribute vec3 a_dir;
attribute vec2 a_rand;

uniform mat3  uRot;
uniform float uTh, uPx, uPass, uThr, uTrail;
uniform vec2  uOff, uScale;
uniform vec3  uDim, uMid, uHot;
uniform float uMorph, uGlow, uChroma;
uniform vec4  uWorm[${WN}];

varying vec3  v_col;
varying float v_a, v_ca, v_k;

vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

void main(){
  vec3 dir=a_dir;
  vec2 c=vec2(cos(uTh),sin(uTh));

  // Every lookup rides a closed circular path, so the morph is exactly periodic.
  float n1=snoise(dir*1.30+vec3(c*0.95,0.0));
  float n2=snoise(dir*2.70+vec3(0.0,c*0.80));
  float n3=snoise(dir*5.60+vec3(c.y*0.62,0.0,c.x*0.62));
  float ridge=1.0-abs(n2);
  float disp=0.54*n1+0.44*(ridge-0.5)+0.20*n3;
  float R=1.0+0.305*uMorph*disp;

  // Recursive erosion: two scales of noise chew holes through the shell.
  float e=0.66*snoise(dir*1.45+vec3(c*1.30,0.4))+0.34*snoise(dir*3.10+vec3(0.3,c*1.05));
  float alive=smoothstep(uThr-0.05,uThr+0.06,e+0.5);

  vec3 n=uRot*dir;
  vec3 p=uRot*(dir*R);
  float persp=1.0/(1.0-${PERSP.toFixed(2)}*p.z);
  float face=smoothstep(-0.10,0.06,n.z);

  // The rope carries its own dense particles; the lattice underneath only picks
  // up a soft halo from them.
  float boost=0.0;
  if(uTrail>0.5){
    boost=a_rand.x*1.5;
  }else{
    for(int i=0;i<${WN};i++){
      vec3 d=dir-uWorm[i].xyz;
      boost+=uWorm[i].w*exp(-dot(d,d)*260.0);
    }
    boost=min(boost,1.5);
  }

  float live=(uTrail>0.5?1.0:max(alive,min(1.0,boost*0.9)))*face;
  float sz=uPx*persp*(uTrail>0.5
    ?(0.72+0.55*a_rand.y)*(1.0+boost*1.50)
    :(0.78+0.50*a_rand.y)*(1.0+boost*1.2));

  vec3 col=mix(uDim,uMid,a_rand.x*a_rand.x);
  if(uTrail>0.5) col=mix(uMid,uHot,clamp(boost,0.0,1.0));
  else col=mix(col,uHot,clamp(boost*1.1,0.0,1.0));

  float rim=1.0+0.12*pow(1.0-abs(n.z),4.0);
  float a=(uTrail>0.5
    ?(0.52+0.20*a_rand.y)*clamp(boost,0.0,1.22)
    :(0.92+0.28*a_rand.y)*(0.85+0.60*min(boost,1.2)))*rim*live;

  if(uPass>0.5){
    sz*=4.6; a*=0.115*uGlow*smoothstep(0.15,0.70,boost);
  }

  v_col=col; v_a=a;
  v_k=(uPass>0.5)?3.0:(uTrail>0.5?0.0:2.1);
  v_ca=((uPass>0.5)?0.0:(uTrail>0.5?0.02:clamp(2.0/max(sz,3.0),0.015,0.055)))*uChroma;

  gl_PointSize=(a<0.004)?0.0:clamp(sz,0.0,140.0);
  gl_Position=vec4(p.xy*persp*uScale+uOff,0.0,1.0);
}
`

const FRAG_SRC = `
precision mediump float;
varying vec3 v_col;
varying float v_a, v_ca, v_k;

float sp(vec2 c,float k){
  float d=length(c)*2.0;
  if(k<0.5) return 1.0-smoothstep(0.42,1.0,d);
  return pow(max(0.0,1.0-d),k);
}

void main(){
  vec2 q=gl_PointCoord-0.5;
  vec2 o=vec2(v_ca,v_ca*0.35);
  // Per-dot chromatic aberration: each dot carries a red/blue fringe.
  float aR=sp(q+o,v_k), aG=sp(q,v_k), aB=sp(q-o,v_k);
  vec3 c=vec3(v_col.r*aR,v_col.g*aG,v_col.b*aB)*v_a;
  // Premultiplied coverage, so the dots composite over whatever sits behind the
  // canvas instead of over a painted background.
  float cov=clamp(max(max(aR,aG),aB)*v_a,0.0,1.0);
  gl_FragColor=vec4(min(c,vec3(1.0)),cov);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("RecursiveErosion shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
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

function rng(seed: number): () => number {
    let a = seed >>> 0
    return function () {
        a += 0x6d2b79f5
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

/** Fibonacci sphere. Regenerated whenever Density moves — buffers, not context. */
function lattice(n: number): { dirs: Float32Array; rnds: Float32Array } {
    const R0 = rng(20260812)
    const dirs = new Float32Array(n * 3)
    const rnds = new Float32Array(n * 2)
    const GA = Math.PI * (3 - Math.sqrt(5))
    const SP = Math.sqrt((4 * Math.PI) / n)
    for (let i = 0; i < n; i++) {
        const y = 1 - ((i + 0.5) / n) * 2
        const r = Math.sqrt(Math.max(0, 1 - y * y))
        const th = GA * i
        // A touch of jitter keeps the grain even without reading as spiral arms.
        const jx = (R0() * 2 - 1) * SP * 0.08
        const jy = (R0() * 2 - 1) * SP * 0.08
        const jz = (R0() * 2 - 1) * SP * 0.08
        const vx = Math.cos(th) * r + jx
        const vy = y + jy
        const vz = Math.sin(th) * r + jz
        const il = 1 / Math.hypot(vx, vy, vz)
        dirs[i * 3] = vx * il
        dirs[i * 3 + 1] = vy * il
        dirs[i * 3 + 2] = vz * il
        rnds[i * 2] = R0()
        rnds[i * 2 + 1] = R0()
    }
    return { dirs, rnds }
}

type Path = {
    c: [number, number, number]
    u: [number, number, number]
    v: [number, number, number]
    sr: number
    cr: number
    m: number
    ph: number
    str: number
    arc: number
    fl: number
}

/** Each rope rides a tilted great circle, so the loop stays seamless. */
function buildPaths(): Path[] {
    const R0 = rng(77123)
    const out: Path[] = []
    for (let i = 0; i < WORMS; i++) {
        const cz = 0.06 + R0() * 0.86
        const ca0 = R0() * 6.283
        const crr = Math.sqrt(Math.max(0, 1 - cz * cz))
        const c: [number, number, number] = [Math.cos(ca0) * crr, Math.sin(ca0) * crr, cz]
        const t0 = Math.abs(c[1]) < 0.85 ? [0, 1, 0] : [1, 0, 0]
        const d = t0[0] * c[0] + t0[1] * c[1] + t0[2] * c[2]
        let u: [number, number, number] = [t0[0] - c[0] * d, t0[1] - c[1] * d, t0[2] - c[2] * d]
        const lu = Math.hypot(u[0], u[1], u[2])
        u = [u[0] / lu, u[1] / lu, u[2] / lu]
        const v: [number, number, number] = [
            c[1] * u[2] - c[2] * u[1],
            c[2] * u[0] - c[0] * u[2],
            c[0] * u[1] - c[1] * u[0],
        ]
        const rho = 0.46 + R0() * 0.42
        const sr = Math.sin(rho)
        out.push({
            c, u, v, sr, cr: Math.cos(rho),
            m: 1 + Math.floor(R0() * 2),
            ph: R0() * 6.283,
            str: 0.9 + R0() * 0.28,
            arc: (0.78 + R0() * 0.34) / sr,
            fl: R0() * 6.283,
        })
    }
    return out
}

type ShellGroup = { morph?: number; erosion?: number; tumble?: number }
const SHELL_DEFAULTS: Required<ShellGroup> = { morph: 100, erosion: 19, tumble: 100 }

type TrailsGroup = { count?: number; length?: number; glow?: number }
const TRAILS_DEFAULTS: Required<TrailsGroup> = { count: 7, length: 100, glow: 100 }

interface Props {
    style?: React.CSSProperties
    width?: number
    height?: number
    background?: string
    baseColor?: string
    accentColor?: string
    highlight?: string
    size?: number
    density?: number
    dotSize?: number
    speed?: number
    hover?: number
    shell?: ShellGroup
    trails?: TrailsGroup
}

export default function RecursiveErosion(props: Props) {
    const {
        style,
        background = "#07060A",
        baseColor = "#FFFFFF",
        accentColor = "#7500FF",
        highlight = "#5900FF",
        size = 59,
        density = 2500,
        dotSize = 100,
        speed = 50,
        hover = 100,
        shell,
        trails,
        width,
        height,
    } = props

    // A group the designer never opened arrives undefined; spread-merging over a
    // typed literal beats a hand-written ?? chain, where one missed key silently
    // pins a control forever.
    const shell_ = { ...SHELL_DEFAULTS, ...(shell || {}) }
    const trails_ = { ...TRAILS_DEFAULTS, ...(trails || {}) }

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const ptrRef = useRef({ tx: 0, ty: 0, x: 0, y: 0, down: false, lx: 0, ly: 0 })
    const grainRef = useRef<HTMLDivElement>(null)

    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    // Every live input is read from a ref inside the loop. Putting any of them in
    // the effect deps would rebuild the GL context on every colour tweak.
    const vRef = useRef<Record<string, number | string>>({})
    vRef.current = {
        dim: baseColor,
        mid: accentColor,
        hot: highlight,
        fit: clampN(num(size, 100), 20, 200) / 100,
        density: Math.round(clampN(num(density, 2500), 400, 4000)),
        dotSize: clampN(num(dotSize, 100), 20, 300) / 100,
        speed: clampN(num(speed, 50), 0, 100) / 50,
        hover: clampN(num(hover, 100), 0, 200) / 100,
        morph: clampN(num(shell_.morph, 100), 0, 250) / 100,
        erosion: clampN(num(shell_.erosion, 19), 0, 60) / 100,
        tumble: clampN(num(shell_.tumble, 100), 0, 250) / 100,
        trailCount: Math.round(clampN(num(trails_.count, 7), 0, WORMS)),
        trailLength: clampN(num(trails_.length, 100), 20, 200) / 100,
        trailGlow: clampN(num(trails_.glow, 100), 0, 300) / 100,
        grain: GRAIN,
    }

    useEffect(() => {
        const canvas = canvasRef.current
        const host = hostRef.current
        if (!canvas || !host) return
        const gl = canvas.getContext("webgl", {
            alpha: true,
            antialias: false,
            depth: false,
            premultipliedAlpha: true,
        })
        if (!gl) {
            console.error("RecursiveErosion: WebGL unavailable")
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
            // 116 vertex uniform vectors against a guaranteed 128 is the tight spot.
            console.error(
                "RecursiveErosion link:",
                gl.getProgramInfoLog(prog),
                "max vertex uniform vectors:",
                gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS)
            )
            return
        }
        gl.useProgram(prog)

        const aDir = gl.getAttribLocation(prog, "a_dir")
        const aRand = gl.getAttribLocation(prog, "a_rand")
        gl.enableVertexAttribArray(aDir)
        gl.enableVertexAttribArray(aRand)

        const locs: Record<string, WebGLUniformLocation | null> = {}
        const u = (name: string) => {
            if (!(name in locs)) locs[name] = gl.getUniformLocation(prog, name)
            return locs[name]
        }

        // ---- lattice buffers, rebuilt when Density moves ----
        const bDir = gl.createBuffer()
        const bRand = gl.createBuffer()
        let latticeN = 0
        const buildLattice = (n: number) => {
            const { dirs, rnds } = lattice(n)
            gl.bindBuffer(gl.ARRAY_BUFFER, bDir)
            gl.bufferData(gl.ARRAY_BUFFER, dirs, gl.STATIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, bRand)
            gl.bufferData(gl.ARRAY_BUFFER, rnds, gl.STATIC_DRAW)
            latticeN = n
        }

        // ---- rope buffer ----
        const paths = buildPaths()
        const pearls = new Float32Array(TN * TSTRIDE)
        const pearlSeed = new Float32Array(TN)
        const seedR = rng(4242)
        for (let i = 0; i < TN; i++) pearlSeed[i] = seedR()
        const bTrail = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, bTrail)
        gl.bufferData(gl.ARRAY_BUFFER, pearls.byteLength, gl.DYNAMIC_DRAW)

        const wormPos = new Float32Array(WN * 4)
        const tmp: [number, number, number] = [0, 0, 0]

        const onPath = (w: Path, ang: number, out: [number, number, number]) => {
            const ca = Math.cos(ang), sa = Math.sin(ang)
            out[0] = w.c[0] * w.cr + (w.u[0] * ca + w.v[0] * sa) * w.sr
            out[1] = w.c[1] * w.cr + (w.u[1] * ca + w.v[1] * sa) * w.sr
            out[2] = w.c[2] * w.cr + (w.u[2] * ca + w.v[2] * sa) * w.sr
        }

        const bindShell = () => {
            gl.bindBuffer(gl.ARRAY_BUFFER, bDir)
            gl.vertexAttribPointer(aDir, 3, gl.FLOAT, false, 0, 0)
            gl.bindBuffer(gl.ARRAY_BUFFER, bRand)
            gl.vertexAttribPointer(aRand, 2, gl.FLOAT, false, 0, 0)
        }
        const bindTrail = () => {
            gl.bindBuffer(gl.ARRAY_BUFFER, bTrail)
            gl.vertexAttribPointer(aDir, 3, gl.FLOAT, false, TSTRIDE * 4, 0)
            gl.vertexAttribPointer(aRand, 2, gl.FLOAT, false, TSTRIDE * 4, 12)
        }

        let raf = 0
        let last = performance.now()
        let clock = 0
        let alive = true

        const draw = () => {
            const v = vRef.current
            const th = 2 * Math.PI * (clock / DUR)
            const nActive = v.trailCount as number
            const lenK = v.trailLength as number

            // The uniform array is fixed size; inactive ropes are zeroed here so the
            // Trails dial never has to resize it (which would mean a recompile).
            for (let k = 0; k < WORMS; k++) {
                const w = paths[k]
                const on = k < nActive ? 1 : 0
                const head = th * w.m + w.ph
                const flick = 0.76 + 0.24 * Math.sin(th * 2.0 + w.fl)
                const arc = w.arc * lenK
                for (let j = 0; j < TAIL; j++) {
                    const o = k * TAIL + j
                    onPath(w, head - j * (arc / TAIL), tmp)
                    wormPos[o * 4] = tmp[0]
                    wormPos[o * 4 + 1] = tmp[1]
                    wormPos[o * 4 + 2] = tmp[2]
                    wormPos[o * 4 + 3] =
                        on * w.str * flick * (0.42 + 0.58 * Math.pow(1 - j / TAIL, 0.7)) *
                        (0.8 + 0.2 * Math.sin(j * 1.7 + head * 2.0))
                }
            }

            for (let k = 0; k < WORMS; k++) {
                const w = paths[k]
                const on = k < nActive ? 1 : 0
                const head = th * w.m + w.ph
                const flick = 0.86 + 0.14 * Math.sin(th * 2.0 + w.fl)
                const arc = w.arc * lenK
                const pstep = arc / PEARL
                for (let j = 0; j < PEARL; j++) {
                    const o = k * PEARL + j
                    const b = o * TSTRIDE
                    const uu = j / PEARL
                    // A small wobble keeps the rope from reading as a perfect arc
                    // without kinking it.
                    const wob = 0.055 * Math.sin(j * 0.42 + head * 2.0 + w.fl) + 0.03 * Math.sin(j * 0.17 - head)
                    onPath(w, head - j * pstep + wob, tmp)
                    pearls[b] = tmp[0]
                    pearls[b + 1] = tmp[1]
                    pearls[b + 2] = tmp[2]
                    pearls[b + 3] =
                        on * w.str * flick * (0.34 + 0.66 * Math.pow(1 - uu, 0.55)) *
                        (0.74 + 0.26 * Math.sin(j * 1.15 + head * 2.0 + w.fl))
                    pearls[b + 4] = pearlSeed[o]
                }
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, bTrail)
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, pearls)

            // ---- gentle tumble, periodic over the loop ----
            const tk = v.tumble as number
            const ax = (0.22 * Math.sin(th) + 0.06 * Math.sin(th * 2 + 1.1)) * tk
            const ay = (0.3 * Math.sin(th + 2.2) + 0.08 * Math.cos(th * 2)) * tk
            const az = 0.1 * Math.cos(th + 0.6) * tk
            // The pointer DRAGS the sphere: yaw and pitch are added to the closed
            // path the loop already rides, so the gesture cannot break the loop —
            // release it and the sphere eases back onto its own cycle. (draw() has
            // no dt of its own; the smoothing runs in the rAF callback that does.)
            const ptr = ptrRef.current
            const hv = v.hover as number
            const axd = ax - ptr.y * 1.1 * hv
            const ayd = ay + ptr.x * 2.0 * hv

            const cx = Math.cos(axd), sx = Math.sin(axd)
            const cy = Math.cos(ayd), sy = Math.sin(ayd)
            const cz = Math.cos(az), sz = Math.sin(az)
            // Rz * Ry * Rx, column-major for WebGL
            const rotM = new Float32Array([
                cz * cy, sz * cy, -sy,
                cz * sy * sx - sz * cx, sz * sy * sx + cz * cx, cy * sx,
                cz * sy * cx + sz * sx, sz * sy * cx - cz * sx, cy * cx,
            ])

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

            // The sphere is measured against the SHORT edge, so it stays round and
            // centred in any container aspect.
            const shortEdge = Math.min(bw, bh)
            const aspX = bw > bh ? bh / bw : 1
            const aspY = bh > bw ? bw / bh : 1

            const wantN = v.density as number
            if (wantN !== latticeN) buildLattice(wantN)

            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.disable(gl.DEPTH_TEST)
            gl.enable(gl.BLEND)
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

            gl.uniformMatrix3fv(u("uRot"), false, rotM)
            gl.uniform1f(u("uTh"), th)
            const fit = SPHERE_FIT * (v.fit as number)
            gl.uniform2f(u("uScale"), fit * aspX, fit * aspY)
            gl.uniform1f(u("uPx"), Math.max(1.0, (shortEdge / 1080) * 8.0 * (v.dotSize as number)))
            gl.uniform1f(u("uThr"), (v.erosion as number) + 0.04 * Math.sin(th * 2 + 0.8))
            gl.uniform2f(u("uOff"), 0.006 * Math.sin(th + 1.0), -0.012 * Math.cos(th))
            gl.uniform1f(u("uMorph"), v.morph as number)
            gl.uniform1f(u("uGlow"), v.trailGlow as number)
            gl.uniform1f(u("uChroma"), CHROMA)
            gl.uniform4fv(u("uWorm"), wormPos)
            const cd = parseColor(v.dim as string, [0.94, 0.33, 0.05])
            const cm = parseColor(v.mid as string, [1.0, 0.56, 0.16])
            const chh = parseColor(v.hot as string, [1.0, 0.71, 0.31])
            gl.uniform3f(u("uDim"), cd[0], cd[1], cd[2])
            gl.uniform3f(u("uMid"), cm[0], cm[1], cm[2])
            gl.uniform3f(u("uHot"), chh[0], chh[1], chh[2])

            bindShell()
            gl.uniform1f(u("uTrail"), 0)
            gl.uniform1f(u("uPass"), 0)
            gl.drawArrays(gl.POINTS, 0, latticeN)

            bindTrail()
            gl.uniform1f(u("uTrail"), 1)
            gl.uniform1f(u("uPass"), 1) // bloom under the rope
            gl.drawArrays(gl.POINTS, 0, TN)
            gl.uniform1f(u("uPass"), 0)
            gl.drawArrays(gl.POINTS, 0, TN)

            // Grain rides on a CSS layer: one transform write per frame beats a
            // second canvas and a full-frame fillRect.
            const gEl = grainRef.current
            if (gEl) {
                const f = Math.round(clock * 30)
                gEl.style.transform = `translate3d(${(f * 37) % GRAIN_TILE}px, ${(f * 61) % GRAIN_TILE}px, 0)`
            }
        }

        const render = (now: number) => {
            if (!alive) return
            const dt = Math.min(0.05, (now - last) / 1000)
            const ptrS = ptrRef.current
            const pk = 1 - Math.exp(-dt * 3.2)
            ptrS.x += (ptrS.tx - ptrS.x) * pk
            ptrS.y += (ptrS.ty - ptrS.y) * pk
            last = now
            clock = (clock + dt * (vRef.current.speed as number)) % DUR
            draw()
            raf = requestAnimationFrame(render)
        }

        // ---- grain tile, built once ----
        const gEl = grainRef.current
        if (gEl) {
            const tc = document.createElement("canvas")
            tc.width = tc.height = GRAIN_TILE
            const tctx = tc.getContext("2d")
            if (tctx) {
                const im = tctx.createImageData(GRAIN_TILE, GRAIN_TILE)
                const d = im.data
                const gr = rng(9001)
                for (let i = 0; i < d.length; i += 4) {
                    const vv = gr()
                    const nn = vv * vv * 255
                    d[i] = nn
                    d[i + 1] = nn * 0.74
                    d[i + 2] = nn * 0.52
                    d[i + 3] = 255
                }
                tctx.putImageData(im, 0, 0)
                gEl.style.backgroundImage = `url(${tc.toDataURL()})`
            }
        }

        buildLattice(vRef.current.density as number)

        const reduce =
            typeof window.matchMedia === "function" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches

        if (reduce) {
            clock = 1.2
            draw()
        } else {
            raf = requestAnimationFrame(render)
        }

        const ro = new ResizeObserver(() => {
            if (reduce) draw()
        })
        ro.observe(host)

        const onVis = () => {
            if (reduce) return
            if (document.hidden) {
                if (raf) { cancelAnimationFrame(raf); raf = 0 }
            } else if (!raf) {
                last = performance.now()
                raf = requestAnimationFrame(render)
            }
        }
        document.addEventListener("visibilitychange", onVis)

        // Drag: yaw and pitch accumulate from the pointer DELTA, then ease back to
        // zero on release. The rect RATIO is zoom-invariant — offset and size scale
        // together — so dividing a delta by it is safe on a zoomed Framer canvas,
        // where absolute px are not.
        const DRAG_X = 1.5 // accumulated yaw ceiling, in the units the loop reads
        const DRAG_Y = 1.0 // accumulated pitch ceiling
        // render() owns the smoothing, and it never runs under reduced motion, so
        // the eased value has to be snapped by hand there or the drag maps to
        // nothing at all.
        const snap = () => {
            const p = ptrRef.current
            p.x = p.tx
            p.y = p.ty
        }
        const onDown = (e: PointerEvent) => {
            const p = ptrRef.current
            p.down = true
            p.lx = e.clientX
            p.ly = e.clientY
            canvas.style.cursor = "grabbing"
            try {
                canvas.setPointerCapture(e.pointerId)
            } catch (err) {
                /* capture is a nicety; window-bound release is the real guarantee */
            }
        }
        const onMove = (e: PointerEvent) => {
            const p = ptrRef.current
            if (!p.down) return
            const r = canvas.getBoundingClientRect()
            if (r.width <= 0 || r.height <= 0) return
            p.tx = clampN(p.tx + (e.clientX - p.lx) / r.width, -DRAG_X, DRAG_X)
            p.ty = clampN(p.ty + (e.clientY - p.ly) / r.height, -DRAG_Y, DRAG_Y)
            p.lx = e.clientX
            p.ly = e.clientY
            if (reduce) {
                snap()
                draw()
            }
        }
        // Release binds on WINDOW, not the host: a pointer that leaves the
        // component mid-drag would otherwise never let go.
        const onUp = () => {
            const p = ptrRef.current
            if (!p.down) return
            p.down = false
            p.tx = 0
            p.ty = 0
            canvas.style.cursor = "grab"
            if (reduce) {
                snap()
                draw()
            }
        }
        canvas.addEventListener("pointerdown", onDown)
        window.addEventListener("pointermove", onMove)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        // Never loseContext(): getContext returns the same context per canvas, so
        // StrictMode's mount -> cleanup -> mount would reuse a force-lost one.
        return () => {
            alive = false
            if (raf) cancelAnimationFrame(raf)
            ro.disconnect()
            document.removeEventListener("visibilitychange", onVis)
            canvas.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointermove", onMove)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
        }
    }, [])

    // Grain and Vignette are film grading, not geometry, and are barred as default
    // panel rows. The behaviour is unchanged — their shipped values are frozen in
    // GRAIN and VIGNETTE at the top of the file.
    const vig = VIGNETTE
    const grn = GRAIN

    return (
        <div
            ref={hostRef}
            style={{
                position: "relative",
                overflow: "hidden",
                background,
                // mix-blend-mode blends against the nearest stacking context; a plain
                // position:relative root is not one, so the grain would blend into the
                // page behind the component.
                isolation: "isolate",
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
                    // Without this a touch drag scrolls the page instead of
                    // spinning the sphere.
                    touchAction: "none",
                    cursor: "grab",
                }}
            />
            <div
                ref={grainRef}
                style={{
                    position: "absolute",
                    left: -GRAIN_TILE,
                    top: -GRAIN_TILE,
                    right: -GRAIN_TILE,
                    bottom: -GRAIN_TILE,
                    pointerEvents: "none",
                    mixBlendMode: "screen",
                    opacity: grn * 0.35,
                    backgroundRepeat: "repeat",
                    willChange: "transform",
                }}
            />
            {vig > 0 && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        background: `radial-gradient(118% 90% at 50% 50%, rgba(0,0,0,0) 36%, ${background} 100%)`,
                        opacity: vig,
                    }}
                />
            )}
        </div>
    )
}
