"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/* ---------------------------------------------------------------- constants */

/** Backing store scale. Floored at 1.5 rather than capped at it: the silhouette
 *  of a cube is a hard edge with no cheap analytic coverage, so a 1× display is
 *  supersampled by the browser's own downscale of the oversized canvas. */
const DPR_MIN = 1.5
const DPR_CAP = 2

/** Ring-buffer depth. Also the shader's loop bound, so it is compiled in. */
const MAX_PULSES = 12

/** Die side as a fraction of the cell, at Die Size 100. A tumbling die must
 *  never cross into a neighbour or the DDA stops being exact, and the bound is
 *  set by the axes it actually turns about: all six are axis-aligned, so the
 *  worst corner reach in the grid plane is side·√2/2, NOT the side·√3/2 of a
 *  freely-oriented cube. 0.68 · 0.7071 = 0.481, inside the 0.5 wall with room
 *  to spare — measured, not assumed (math-probe B). */
const MAX_SIDE = 0.68

/** Reach of a corner under an axis-aligned turn (√2/2) and of the bounding
 *  sphere in any direction (√3/2). The first bounds the slab, the second the
 *  reject test, and they are genuinely different numbers. */
const AXIS_REACH = Math.SQRT2 / 2
const HALF_DIAG = Math.sqrt(3) / 2

/** Cells between consecutive rings. Pulses are emitted by DISTANCE travelled,
 *  not on a timer: a timer keeps firing while a slow ring crawls, so at low
 *  Travel the rings pile up, the 12-slot buffer fills, and the field goes
 *  silent for minutes (math-probe G measured 697 live pulses needed at
 *  Travel 1 / Distance 60). Fixed spacing makes the in-flight count depend on
 *  the field size alone. 16 cells is what the shipped rate produced — one ring
 *  every 16/9 ≈ 1.8s at Travel 50 — so the default look is unchanged. */
const RING_SPACING_CELLS = 16
const TRAVEL_CELLS_PER_SEC_AT_50 = 9
/** Seconds a die takes to complete its turn once a ring reaches it. */
const FLIP_SECONDS = 0.5

/** Ceiling on live pulses, below MAX_PULSES so a click always has a slot. Ring
 *  spacing widens on a big field rather than letting the buffer overflow. */
const MAX_LIVE_RINGS = 10

/** Depth fade, as a fraction of the near→far spread ACROSS THE FRAME. Fog was
 *  a multiple of the camera distance until probe G showed that put the far edge
 *  at 3.4× the distance while nothing past ~1.2× is ever on screen — which is
 *  what made the retire radius, and so the pulse count, absurd. */
const FOG_NEAR_FRAC = 0.35
const FOG_FAR_MUL = 1.02

/** Scene clock wrap. Every pulse time is rebased with it, so the shader never
 *  sees a float large enough to lose sub-frame resolution. */
const CLOCK_WRAP = 3600

/** Cut controls (rule 8b), frozen at the value the field ships with. Light
 *  direction, ambient and specular are the scene's look, not dials; a "Light
 *  Angle" nobody moves is exactly the speculative control rule 1 forbids. */
const LIGHT_DIR: [number, number, number] = [-0.34, 0.72, 0.6]

/* ------------------------------------------------------------------ shaders */

const VERT = `
precision highp float;
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

// Caustic-free but divide-heavy: highp throughout, and every denominator that
// can approach zero is guarded at the site (rule 6).
const FRAG = `
precision highp float;

#define MAX_PULSES ${MAX_PULSES}
#define MAX_CELLS 14
#define MARCH 20
#define HALF_PI 1.5707963

uniform vec2  uRes;       // device px
uniform float uTanHalf;   // tan(vertical fov / 2)
uniform float uCamDist;   // cells
uniform float uTilt;      // radians
uniform float uSide;      // die side, cells
uniform float uTime;      // scene seconds (wrapped)
uniform float uTravel;    // cells per scene-second, > 0
uniform float uFlipRate;  // 1 / flip seconds
uniform float uBaseQ;     // quarter turns already banked by retired pulses
uniform vec4  uPulse[MAX_PULSES]; // xy = origin cell, z = emit time, w = turns
uniform vec3  uBase;
uniform vec3  uAccent;
uniform float uAccentMix; // 0..1 share of dice taking the accent
uniform vec2  uFog;       // near, far — world t along the ray
uniform vec3  uLight;

/* ------------------------------------------------------------------ hashing */

float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

/* ------------------------------------------------------------------- die SDF */

// Pip dimples, as ONE sphere: the nearest pip on the face the point is nearest
// to. Faces are the standard arrangement, opposite faces summing to 7 — which
// falls out of the layout, so a rolled die is always a real die.
// Returns the sphere's signed distance; the body subtracts it.
float pipSphere(vec3 p, float h) {
    vec3 a3 = abs(p);
    float mx = max(a3.x, max(a3.y, a3.z));
    vec2 q2; float val;
    if (mx == a3.x)      { q2 = p.yz; val = p.x > 0.0 ? 1.0 : 6.0; }
    else if (mx == a3.y) { q2 = p.xz; val = p.y > 0.0 ? 2.0 : 5.0; }
    else                 { q2 = p.xy; val = p.z > 0.0 ? 3.0 : 4.0; }

    float a  = uSide * 0.27;   // pip offset from the face centre
    float pr = uSide * 0.105;  // dimple sphere radius
    float pd = 1e5;

    // centre pip — 1, 3, 5
    if (val < 1.5 || (val > 2.5 && val < 3.5) || (val > 4.5 && val < 5.5))
        pd = min(pd, length(q2))
    // leading diagonal pair — 2, 3. Cannot be folded with abs(): that would
    // mirror the pair onto the other diagonal and print four pips.
    if (val > 1.5 && val < 3.5)
        pd = min(pd, min(length(q2 - vec2(a, a)), length(q2 + vec2(a, a))));
    // four corners — 4, 5, 6. Symmetric, so abs() folding IS exact here.
    if (val > 3.5)
        pd = min(pd, length(abs(q2) - vec2(a, a)));
    // mid pair — 6 only
    if (val > 5.5)
        pd = min(pd, length(abs(q2) - vec2(a, 0.0)));

    float cz = h + pr - uSide * 0.05; // sphere centre sits just outside the face
    return length(vec2(pd, mx - cz)) - pr;
}

float sdBody(vec3 p) {
    float h = uSide * 0.5;
    float r = uSide * 0.13;
    vec3 q = abs(p) - (vec3(h) - r);
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}

float sdDie(vec3 p) {
    float h = uSide * 0.5;
    return max(sdBody(p), -pipSphere(p, h));
}

/* -------------------------------------------------------------- orientation */

vec3 rotA(vec3 p, vec3 a, float ang) {
    float s = sin(ang), c = cos(ang);
    return p * c + cross(a, p) * s + a * dot(a, p) * (1.0 - c);
}

// A cell's tumble axis is fixed and hashed, so the field reads as organic while
// every die still turns on the same beat. Axis-aligned and the angle is always
// a whole number of quarter turns, which is what makes a die land on a face.
void cellRot(vec2 cell, out vec3 ax, out float ang) {
    float h1 = hash21(cell + 11.7);
    float h2 = hash21(cell - 3.1);
    ax = h1 < 0.38 ? vec3(1.0, 0.0, 0.0)
       : h1 < 0.76 ? vec3(0.0, 1.0, 0.0)
                   : vec3(0.0, 0.0, 1.0);
    ax *= h2 < 0.5 ? -1.0 : 1.0;

    vec2 c = cell + 0.5;
    float sum = 0.0;
    for (int i = 0; i < MAX_PULSES; i++) {
        vec4 pu = uPulse[i];
        float arrive = pu.z + length(c - pu.xy) / uTravel;
        float e = clamp((uTime - arrive) * uFlipRate, 0.0, 1.0);
        sum += pu.w * (e * e * (3.0 - 2.0 * e));
    }
    ang = HALF_PI * (uBaseQ + sum);
}

/* -------------------------------------------------------------------- shading */

vec3 dieNormal(vec3 p) {
    vec2 k = vec2(1.0, -1.0);
    float e = uSide * 0.004;
    return normalize(k.xyy * sdDie(p + k.xyy * e) +
                     k.yyx * sdDie(p + k.yyx * e) +
                     k.yxy * sdDie(p + k.yxy * e) +
                     k.xxx * sdDie(p + k.xxx * e));
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;

    // Camera sits BELOW the field's centre and looks slightly up, so the grid
    // recedes toward the top of the frame. Above-and-looking-down is the same
    // maths with the sign flipped, and puts the far dice along the bottom edge,
    // which reads as a floor seen from underneath.
    float st = sin(uTilt), ct = cos(uTilt);
    vec3 R = vec3(1.0, 0.0, 0.0);
    vec3 F = vec3(0.0,  st, -ct);   // camera forward, = -normalize(camPos)
    vec3 U = vec3(0.0,  ct,  st);   // = cross(R, F)
    vec3 ro = vec3(0.0, -uCamDist * st, uCamDist * ct);
    vec3 rd = normalize(uv.x * R + uv.y * U + (0.5 / uTanHalf) * F);

    vec3 col = vec3(0.0);
    float alpha = 0.0;

    // ---- clip the ray to the slab the dice live in -------------------------
    // Half-thickness is the AXIS-ALIGNED corner reach, not the full diagonal:
    // the tumble axes are axis-aligned, so no corner ever gets further out of
    // the plane than side·√2/2 (math-probe B).
    float hz = uSide * ${AXIS_REACH.toFixed(5)} + 0.002;
    if (rd.z < -1e-3) {
        float t0 = max((hz - ro.z) / rd.z, 0.0);
        float t1 = (-hz - ro.z) / rd.z;
        float tEnd = min(t1, uFog.y);

        if (tEnd > t0) {
            // ---- 2D DDA over the grid -------------------------------------
            vec2 pos = (ro + rd * t0).xy;
            vec2 cell = floor(pos);
            vec2 sgn = vec2(rd.x >= 0.0 ? 1.0 : -1.0, rd.y >= 0.0 ? 1.0 : -1.0);
            // t to cross one whole cell on each axis. A component of rd near
            // zero parks its boundary at ~1e6 and is simply never the minimum.
            vec2 tDelta = 1.0 / max(abs(rd.xy), vec2(1e-6));
            // (bound - pos) always carries rd's sign, so × sgn × tDelta is the
            // positive t of the next wall — no divide by a signed rd.
            vec2 bound = cell + max(sgn, 0.0);
            vec2 tMaxV = t0 + (bound - pos) * sgn * tDelta;

            float tCur = t0;
            float hitT = -1.0;
            vec3 hitN = vec3(0.0);
            vec3 hitAlbedo = vec3(0.0);

            for (int i = 0; i < MAX_CELLS; i++) {
                float tNext = min(min(tMaxV.x, tMaxV.y), tEnd);

                // Bounding-sphere reject FIRST — no rotation, no pulse loop.
                // The gaps between dice are most of the frame, so this branch
                // is what keeps the whole thing affordable.
                vec3 cc = vec3(cell + 0.5, 0.0);
                vec3 oc = ro - cc;
                // The sphere must contain the die whatever its orientation, so
                // this one IS the full half-diagonal — a different number from
                // the slab above, deliberately.
                float bRad = uSide * ${HALF_DIAG.toFixed(5)};
                float b = dot(oc, rd);
                float cq = dot(oc, oc) - bRad * bRad;
                float disc = b * b - cq;

                if (disc > 0.0) {
                    float sq = sqrt(disc);
                    float sNear = -b - sq;
                    float sFar  = -b + sq;
                    if (sFar > tCur && sNear < tNext) {
                        vec3 ax; float ang;
                        cellRot(cell, ax, ang);

                        // Rigid transform, so t is preserved: the die is solved
                        // in its own frame and the hit t means the same thing.
                        vec3 lo = rotA(ro - cc, ax, -ang);
                        vec3 ld = rotA(rd, ax, -ang);

                        float h = uSide * 0.5 + 0.002;
                        vec3 idl = 1.0 / max(abs(ld), vec3(1e-6)) *
                                   vec3(ld.x >= 0.0 ? 1.0 : -1.0,
                                        ld.y >= 0.0 ? 1.0 : -1.0,
                                        ld.z >= 0.0 ? 1.0 : -1.0);
                        vec3 ta = (-vec3(h) - lo) * idl;
                        vec3 tb = ( vec3(h) - lo) * idl;
                        vec3 t1v = min(ta, tb);
                        vec3 t2v = max(ta, tb);
                        float tn = max(max(t1v.x, t1v.y), t1v.z);
                        float tf = min(min(t2v.x, t2v.y), t2v.z);

                        float ts = max(max(tn, tCur), 0.0);
                        float te = min(min(tf, tNext), tEnd);

                        if (tf > tn && te > ts) {
                            float t = ts;
                            for (int s = 0; s < MARCH; s++) {
                                vec3 p = lo + ld * t;
                                float d = sdDie(p);
                                if (d < 0.0012) {
                                    vec3 n = rotA(dieNormal(p), ax, ang);
                                    float pipMask =
                                        step(sdBody(p), -pipSphere(p, uSide * 0.5));

                                    float hc = hash21(cell + 71.3);
                                    vec3 body = hc < uAccentMix ? uAccent : uBase;
                                    float lum = dot(body, vec3(0.299, 0.587, 0.114));
                                    // Pips read against their own die, so a dark
                                    // die gets light pips and a light die dark
                                    // ones — one rule, no second colour dial.
                                    vec3 pipCol = lum > 0.45
                                        ? body * 0.12
                                        : min(body + vec3(0.72), vec3(1.0));

                                    hitAlbedo = mix(body, pipCol, pipMask);
                                    hitN = n;
                                    hitT = t;
                                    break;
                                }
                                t += d;
                                if (t > te) break;
                            }
                        }
                    }
                }

                if (hitT > 0.0) break;
                if (tNext >= tEnd) break;

                if (tMaxV.x < tMaxV.y) {
                    cell.x += sgn.x; tCur = tMaxV.x; tMaxV.x += tDelta.x;
                } else {
                    cell.y += sgn.y; tCur = tMaxV.y; tMaxV.y += tDelta.y;
                }
            }

            if (hitT > 0.0) {
                vec3 n = hitN;
                float ndl = max(dot(n, uLight), 0.0);
                // Ambient leans on the face turned toward the camera, so a die
                // at rest still separates from its neighbours.
                float amb = 0.26 + 0.20 * max(n.z, 0.0);
                col = hitAlbedo * (amb + 0.86 * ndl);
                vec3 hv = normalize(uLight - rd);
                col += vec3(1.0) * pow(max(dot(n, hv), 0.0), 46.0) * 0.30;
                alpha = 1.0 - smoothstep(uFog.x, uFog.y, hitT);
            }
        }
    }

    // Premultiplied: the canvas is transparent and the CSS background and glow
    // underneath are the scene's backdrop, never a GL clear (rule 8b).
    gl_FragColor = vec4(col * alpha, alpha);
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
        console.warn("DiceWaveField shader:", gl.getShaderInfoLog(sh))
    return sh
}

function linkProg(gl: WebGLRenderingContext, vs: string, fs: string) {
    const prog = gl.createProgram()!
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, vs))
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, fs))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
        console.warn("DiceWaveField link:", gl.getProgramInfoLog(prog))
    return prog
}

/* --------------------------------------------------------------------- props */

interface WaveGroup {
    /** Cells per second the ring expands. 50 is the rate the field shipped at. */
    travel?: number
    /** Quarter turns a die performs as the ring passes. */
    turns?: number
}

/** A group the designer never opened arrives `undefined`, so the defaults are
 *  spread-merged over a typed literal rather than read through a `??` chain —
 *  one missed key in a chain silently pins a control forever (rule 11). */
const WAVE_DEFAULTS: Required<WaveGroup> = { travel: 50, turns: 1 }

interface DiceWaveFieldProps {
    background?: string
    baseColor?: string
    accentColor?: string
    /** 0..100 % of dice taking the accent colour. */
    accentMix?: number
    /** Vignette. Its ALPHA is the intensity — never a second dial (rule 8b). */
    glow?: string
    /** Cells across the viewport height. */
    density?: number
    /** 0..100 % of the largest die that still fits its own cell. */
    dieSize?: number
    /** 0..100; 50 is the rate the field shipped at. 0 freezes it. */
    speed?: number
    /** Camera pullback in cells. With Density fixed this is a dolly zoom. */
    distance?: number
    /** Camera pitch, degrees. 0 looks straight at the grid. */
    tilt?: number
    wave?: WaveGroup
    /** 1..100 % — how fast the pulse origin settles onto the pointer. Higher
     *  settles faster (rule 8b: three files used to mean the opposite). */
    damping?: number
    width?: number
    height?: number
    style?: React.CSSProperties
}

/* ----------------------------------------------------------------- component */

function __BaseImpl_DiceWaveField(props: DiceWaveFieldProps) {
    const {
        background = "#000000",
        baseColor = "#EDEDED",
        accentColor = "#FF2400",
        accentMix = 27,
        glow = "rgba(255,255,255,0.07)",
        density = 20,
        dieSize = 100,
        speed = 50,
        distance = 22,
        tilt = 45,
        wave,
        damping = 100,
        style,
    } = props

    const w: Required<WaveGroup> = { ...WAVE_DEFAULTS, ...(wave || {}) }

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Every live input via ref — the context is built once and a prop change
    // must never land in the effect's deps (rule 6).
    const live = useRef({
        baseColor, accentColor, accentMix, density, dieSize,
        speed, distance, tilt, travel: w.travel, turns: w.turns, damping,
    })
    live.current = {
        baseColor, accentColor, accentMix, density, dieSize,
        speed, distance, tilt, travel: w.travel, turns: w.turns, damping,
    }

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
            res: U("uRes"), tanHalf: U("uTanHalf"), camDist: U("uCamDist"),
            tilt: U("uTilt"), side: U("uSide"), time: U("uTime"),
            travel: U("uTravel"), flipRate: U("uFlipRate"), baseQ: U("uBaseQ"),
            pulse: U("uPulse[0]"),
            base: U("uBase"), accent: U("uAccent"), accentMix: U("uAccentMix"),
            fog: U("uFog"), light: U("uLight"),
        }

        // Fullscreen triangle — WebGL1 has no gl_VertexID, so it comes from a
        // buffer. Three verts, uploaded once.
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
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA) // premultiplied over CSS

        /* ---- sizing ---- */
        // Never the injected width/height props: those are not numeric in
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

        /* ---- pulse ring buffer ---- */
        // xy = origin cell, z = emit time (scene clock), w = quarter turns.
        // An empty slot is parked far in the FUTURE so its eased progress is 0;
        // parking it in the past would silently add a turn to every die.
        const pulseBuf = new Float32Array(MAX_PULSES * 4)
        const pulses: { x: number; y: number; t: number; turns: number }[] = []
        let bankedQ = 0 // quarter turns banked by retired pulses, mod 4

        /* ---- pointer ---- */
        const ptr = { x: 0, y: 0, has: false }
        const originC = { x: 0, y: 0 } // eased pulse origin, cell coords

        // Camera frame, recomputed per frame from the live dials. Shared by the
        // shader (as uniforms) and by the CPU's screen→field solve, so the two
        // can never drift apart.
        const cam = {
            tanHalf: 0.3, dist: 22, st: 0, ct: 1,
        }

        /** Ray t where the frame direction (uvx, uvy) meets the die plane, or
         *  null when it never does. Same basis as the shader — one derivation,
         *  used by the fog bounds and by the pointer solve below. */
        const planeT = (uvx: number, uvy: number): number | null => {
            const fl = 0.5 / cam.tanHalf
            let dy = uvy * cam.ct + fl * cam.st
            let dz = uvy * cam.st - fl * cam.ct
            const L = Math.sqrt(uvx * uvx + dy * dy + dz * dz) || 1
            dz /= L
            if (dz > -1e-4) return null
            return -(cam.dist * cam.ct) / dz
        }

        /** Screen CSS px → the die plane (z = 0), in cell coordinates.
         *  Mirrors the fragment shader's ray construction exactly; the
         *  round-trip against `fieldToScreen` is asserted in the probe. */
        const screenToField = (mx: number, my: number): [number, number] => {
            const wpx = canvas.width, hpx = canvas.height
            if (hpx <= 0) return [0, 0]
            const uvx = (mx * dpr - 0.5 * wpx) / hpx
            const uvy = (0.5 * hpx - my * dpr) / hpx // gl_FragCoord y is up
            const fl = 0.5 / cam.tanHalf
            // R = (1,0,0), U = (0,ct,st), F = (0,st,-ct) — same basis as FRAG
            let dx = uvx
            let dy = uvy * cam.ct + fl * cam.st
            let dz = uvy * cam.st - fl * cam.ct
            const L = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1
            dx /= L; dy /= L; dz /= L
            const oz = cam.dist * cam.ct
            const oy = -cam.dist * cam.st
            if (dz > -1e-4) return [originC.x, originC.y] // ray never reaches
            const t = -oz / dz
            return [t * dx, oy + t * dy]
        }

        /* ---- rAF loop ---- */
        let raf = 0
        let last = performance.now()
        let sceneT = 0 // scene clock: dt × speed, so Speed 0 freezes all of it
        let lastEmit = -Infinity // first ring fires on the first frame
        let idleT = 0

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dtReal = Math.min((now - last) / 1000, 0.05)
            last = now
            if (cssW <= 0 || cssH <= 0) { resize(); return }

            const L = live.current
            const dt = dtReal * (L.speed / 50)
            sceneT += dt
            if (sceneT > CLOCK_WRAP) {
                // Rebase the whole clock together — the shader only ever sees
                // differences, so this is invisible, and it keeps highp from
                // losing sub-frame resolution after a long session.
                sceneT -= CLOCK_WRAP
                lastEmit -= CLOCK_WRAP
                for (const p of pulses) p.t -= CLOCK_WRAP
            }

            /* -- camera -- */
            cam.dist = L.distance
            cam.tanHalf = Math.min(
                Math.max(L.density / (2 * Math.max(L.distance, 1)), 0.06),
                1.1
            )
            const tiltRad = (L.tilt * Math.PI) / 180
            cam.st = Math.sin(tiltRad)
            cam.ct = Math.cos(tiltRad)

            // Fog is measured from the frame, not guessed from the distance:
            // the ray t at the four corners and the centre bounds what is
            // actually on screen. At Tilt 0 that spread is tiny and the fade is
            // invisible; at Tilt 45 it is most of the depth in the shot.
            const aspect = cssW / Math.max(cssH, 1)
            let tMin = Infinity, tMax = 0
            for (const [ux, uy] of [
                [-0.5 * aspect, -0.5], [0.5 * aspect, -0.5],
                [-0.5 * aspect, 0.5], [0.5 * aspect, 0.5], [0, 0],
            ]) {
                const t = planeT(ux, uy)
                if (t === null) continue
                tMin = Math.min(tMin, t)
                tMax = Math.max(tMax, t)
            }
            if (!isFinite(tMin) || tMax <= tMin) {
                tMin = L.distance
                tMax = L.distance * 3
            }
            // A near-grazing corner can run to the horizon; the visible field
            // is capped so the fade never stretches past the cell budget.
            tMax = Math.min(tMax, L.distance * 8)
            const fogNear = tMin + FOG_NEAR_FRAC * (tMax - tMin)
            const fogFar = tMax * FOG_FAR_MUL
            const travel = Math.max(
                (L.travel / 50) * TRAVEL_CELLS_PER_SEC_AT_50,
                0.05
            )

            /* -- origin: pointer, or a drift before the pointer has ever moved
             *    (and after it leaves) so the canvas is never a dead frame -- */
            idleT += dtReal
            let tx: number, ty: number
            if (ptr.has) {
                const p = screenToField(ptr.x, ptr.y)
                tx = p[0]; ty = p[1]
            } else {
                const rad = L.density * 0.22
                tx = Math.sin(idleT * 0.21) * rad
                ty = Math.cos(idleT * 0.147) * rad * 0.6
            }
            // Higher Damping settles faster.
            const k = 1 - Math.exp(-(L.damping / 100) * 12 * dtReal)
            originC.x += (tx - originC.x) * k
            originC.y += (ty - originC.y) * k

            /* -- retire, then emit -- */
            // A pulse retires only once its ring has cleared every visible
            // cell, where its contribution is exactly 1 everywhere. Folding it
            // into bankedQ is therefore continuous — nothing on screen moves.
            const retireR = fogFar + Math.hypot(originC.x, originC.y) + 6
            // The cell at retireR is reached at t + retireR/travel and has
            // finished its turn FLIP_SECONDS later. Past that every visible die
            // has banked this pulse in full.
            const flightDone = retireR / travel + FLIP_SECONDS
            for (let i = pulses.length - 1; i >= 0; i--) {
                const p = pulses[i]
                if (sceneT - p.t > flightDone) {
                    bankedQ = (bankedQ + p.turns) % 4
                    pulses.splice(i, 1)
                }
            }

            // Emission is by DISTANCE travelled, so the number of rings alive
            // depends on the field's size and never on how slowly they crawl.
            // Spacing widens only when the field is big enough that the shipped
            // 16 cells would not fit inside the buffer.
            const spacing = Math.max(RING_SPACING_CELLS, retireR / MAX_LIVE_RINGS)
            if (L.speed > 0 && (sceneT - lastEmit) * travel >= spacing) {
                // Skip rather than evict: evicting a live pulse would drop its
                // partial turn out from under mid-flip dice.
                if (pulses.length < MAX_PULSES)
                    pulses.push({
                        x: originC.x, y: originC.y,
                        t: sceneT, turns: L.turns,
                    })
                lastEmit = sceneT
            }

            /* -- upload pulses -- */
            for (let i = 0; i < MAX_PULSES; i++) {
                const p = pulses[i]
                if (p) {
                    pulseBuf[i * 4] = p.x
                    pulseBuf[i * 4 + 1] = p.y
                    pulseBuf[i * 4 + 2] = p.t
                    pulseBuf[i * 4 + 3] = p.turns
                } else {
                    pulseBuf[i * 4] = 0
                    pulseBuf[i * 4 + 1] = 0
                    pulseBuf[i * 4 + 2] = sceneT + 1e6 // parked in the future
                    pulseBuf[i * 4 + 3] = 0
                }
            }

            const [br, bg, bb] = parseColor(L.baseColor)
            const [ar, ag, ab] = parseColor(L.accentColor)
            const side = MAX_SIDE * Math.min(Math.max(L.dieSize, 1), 100) / 100

            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)

            gl.uniform2f(u.res, canvas.width, canvas.height)
            gl.uniform1f(u.tanHalf, cam.tanHalf)
            gl.uniform1f(u.camDist, cam.dist)
            gl.uniform1f(u.tilt, tiltRad)
            gl.uniform1f(u.side, side)
            gl.uniform1f(u.time, sceneT)
            gl.uniform1f(u.travel, travel)
            gl.uniform1f(u.flipRate, 1 / FLIP_SECONDS)
            gl.uniform1f(u.baseQ, bankedQ)
            gl.uniform4fv(u.pulse, pulseBuf)
            gl.uniform3f(u.base, br, bg, bb)
            gl.uniform3f(u.accent, ar, ag, ab)
            gl.uniform1f(u.accentMix, Math.min(Math.max(L.accentMix, 0), 100) / 100)
            gl.uniform2f(u.fog, fogNear, fogFar)
            gl.uniform3f(u.light, LIGHT_DIR[0], LIGHT_DIR[1], LIGHT_DIR[2])

            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }
        raf = requestAnimationFrame(frame)

        /* ---- pointer wiring ---- */
        const onMove = (e: PointerEvent) => {
            const r = host.getBoundingClientRect()
            // Only the pointer's position within the host is needed, and both
            // sides of the subtraction carry the same canvas zoom, so the ratio
            // below is zoom-free. clientWidth is the unzoomed reference.
            const scale = r.width > 0 ? host.clientWidth / r.width : 1
            ptr.x = (e.clientX - r.left) * scale
            ptr.y = (e.clientY - r.top) * scale
            ptr.has = true
        }
        const onLeave = () => { ptr.has = false }
        const onDown = (e: PointerEvent) => {
            onMove(e)
            // The click ring: same machinery, double the turns. Skipped when
            // the buffer is full for exactly the reason above.
            if (pulses.length < MAX_PULSES)
                pulses.push({
                    x: originC.x, y: originC.y,
                    t: sceneT, turns: live.current.turns * 2,
                })
        }

        host.addEventListener("pointermove", onMove)
        host.addEventListener("pointerdown", onDown)
        host.addEventListener("pointerleave", onLeave)
        // Release/track on window, never the host, or a pointer that leaves
        // mid-gesture is never seen again (rule K).
        window.addEventListener("pointerup", onLeave)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            host.removeEventListener("pointermove", onMove)
            host.removeEventListener("pointerdown", onDown)
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
                background: `radial-gradient(68% 54% at 50% 46%, ${glow} 0%, transparent 72%), ${background}`,
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

const __presetProps = {
  "background": "#000000",
  "baseColor": "#EDEDED",
  "accentColor": "#FF2400",
  "accentMix": 27,
  "glow": "#FFFFFF00",
  "density": 20,
  "dieSize": 100,
  "speed": 50,
  "distance": 22,
  "tilt": 45,
  "wave": {
    "turns": 1,
    "travel": 50
  },
  "damping": 100
};

export default function DiceWaveField(props: Record<string, unknown>) {
  return <__BaseImpl_DiceWaveField {...(__presetProps as Record<string, unknown>)} {...props} />;
}
