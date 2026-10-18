"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * ACCRETION DISC — particle black hole.
 *
 * A flat orbiting point field around the center, and two polar jets.
 * One `drawArrays(POINTS)` for the whole cloud; every piece of 3D maths
 * (orbit, spiral pattern, camera, projection, depth of field, colour)
 * lives in the vertex shader.
 *
 * 2. THE ARMS ARE A DENSITY WAVE, NOT MATERIAL. Particles orbit at a Keplerian
 *    rate, omega = k * (rIn/r)^1.5, so the inner field genuinely leads. If the
 *    arms were material they would coil into a spool within a few laps — the
 *    classic winding problem. So the arm term is banded on the MATERIAL
 *    coordinate `arms * (theta - WIND * log(r/rIn))` minus a slow rigid
 *    pattern spin: the lanes hold their log-spiral shape forever while points
 *    stream through them. A swirl applied to positions alone is
 *    density-neutral and draws no lanes at all.
 *
 * 3. DEPTH OF FIELD DOES THE DEPTH CUEING. The sprite is world-sized (so it
 *    shrinks as 1/depth on its own) and a circle of confusion is ADDED from a
 *    focus plane parked at 1.75x the camera distance, behind the far edge of
 *    the disc. Near points become large soft discs, far points fall under a
 *    pixel and clamp hard, which is what reads as sharp. Alpha is divided by
 *    the radius ratio to conserve energy, then walked back with pow(.., 1.6),
 *    or the near bokeh blows the frame out to white.
 *
 * 4. THE HOT CREST COMES FROM ADDITIVE PILEUP, NOT A WHITE COLOUR STOP.
 *    blendFunc(ONE, ONE) over a transparent clear: a copper summed three deep
 *    clamps its red channel first and desaturates toward white on its own.
 *    That only happens above a point budget: at 24k the disc measured a peak
 *    channel of 119/255 and rendered as separated dots with no crest at all.
 *
 * 5. THE LANES ARE A CROWDING, NOT A STRIPE. The arm term also displaces theta
 *    toward the lane it bands, so the bright ridges are real concentrations of
 *    points. Modulating brightness alone left the field evenly spread and read
 *    as haze with a stripe painted on it.
 *
 * 6. THE GLOW IS IN THE SPRITE, NOT A BLOOM PASS. Each point is drawn HALO
 *    times wider than its optical radius with a faint wide skirt around the
 *    center, which buys the halo around the crest for one multiply instead of an
 *    FBO, a downsample and a blur.
 *
 * Rule 6 recipe: ONE GL context built in useEffect([]); every live input read
 * from a ref inside a raw rAF loop; never calls loseContext(). The particle
 * buffer is rebuilt only when Density changes — never the context.
 */

/* ---------------------------------------------------------------- constants */

const TAU = Math.PI * 2
const DPR_CAP = 2

// World units. The disc's outer radius is the scene's reference radius, and it
// is 100 so that every percent dial in the panel (Core, Length) is a direct
// world number and the Distance range reads in the same currency.
const ROUT = 100

// A long-ish lens. At a wide FOV the near half of the disc is so much closer
// than the far half that the projected ellipse is shoved below centre and the
// top of the frame dies.
const FOV_DEG = 34
const FOCAL = 1 / Math.tan((FOV_DEG * Math.PI) / 180 / 2)

// Inner edge of the disc floor when core is 0.
const RIN_FLOOR = 1.0

// Disc half-thickness at Scatter 100%, before the outward flare.
const THICKNESS = 2.4

// Log-spiral winding: d(theta)/d(ln r) for ONE arm. Multiplying by the arm
// count would change the pitch every time a lane was added, so the arm count
// is applied OUTSIDE this: lanes multiply, winding does not. 2.46 puts about
// a 16 degree pitch, matching the lane spacing in the reference.
const WIND = 3.40

// Cut controls, frozen at the value they shipped at (rule 8b). The panel rows
// are gone; the render path is unchanged.
const ARM_SHARPNESS = 2.6 // how tight the lanes are, as a cosine exponent
// How hard material is pulled INTO a lane. A density wave that only modulates
// brightness leaves the field evenly spread and reads as haze with a stripe
// painted on it; the crest in the reference is a genuine crowding of points, so
// the lane term also displaces theta. 0.55 roughly doubles the lane's density.
const ARM_PULL = 0.45
const ARM_SPIN = 0.06 // rad/s of the pattern itself at Speed 50
const JET_FLOW = 0.09 // fraction of jet length per second at Speed 50
const JET_HELIX = 0.0055 // rad per world unit of climb — the streaks in a jet
const JET_SHARE = 0.32 // fraction of the buffer tagged as jet at build time
const FOCUS_MULT = 1.75 // focus plane, as a multiple of camera distance
// Sprites are drawn HALO times wider than their optical radius and carry a
// faint wide skirt outside the center. That skirt is the glow around the crest:
// a real bloom pass would need an FBO, a downsample and a blur, and this buys
// the same read for one multiply on the point size.
const HALO = 1.7
const ORBIT_REF = 0.449 // rad/s at the inner edge at Speed 50 -> ~14s a lap

// Reference magnitudes for the two percent dials, in world units.
const DOT_REF = 0.16
const BLUR_REF = 0.64

// Point budget. The crest in the reference is a PILEUP — three or four sprites
// deep on the same pixel — and that only happens above a threshold density.
// At 24k the disc rendered as separated dots with no hot core at all, measured:
// peak channel 119/255 instead of a clamped 255.
const COUNT_BASE = 20000
const COUNT_PER = 3600

// Time wrap. Orbit phase is omega * t in float32 and omega varies per particle,
// so there is no period that wraps every phase at once. 1e5 s holds the inner
// edge to ~0.4 degrees of drift, which is 28 hours of uptime.
const TIME_WRAP = 1e5

/* ------------------------------------------------------------------ shaders */

const PARTICLE_VERT = `
precision highp float;

// Disc:  x = radial parameter, y = birth angle, z = gaussian height, w = random
// Jet:   x = axial parameter,  y = azimuth,     z = sqrt(rand) radius, w = keep
attribute vec4 aSeed;
// 0 = disc, +1 = jet up, -1 = jet down
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
uniform float uJetAmount;
uniform float uJetLen;
uniform float uJetSpread;

varying float vAlpha;
varying float vRamp;

const float FOCAL = ${FOCAL.toFixed(6)};
const float ROUT = ${ROUT.toFixed(1)};
const float WIND = ${WIND.toFixed(3)};
const float THICKNESS = ${THICKNESS.toFixed(2)};
// Orbit rate at the inner edge. Speed scales the CPU clock, not this, so the
// rate itself never varies and has no business being a uniform.
const float ORBIT = ${ORBIT_REF.toFixed(4)};

void kill() {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    vAlpha = 0.0;
    vRamp = 0.0;
}

void main() {
    float rIn = max(uCore * 1.32, ${RIN_FLOOR.toFixed(1)});
    vec3 p;
    float bright;
    float ramp;

    if (aKind == 0.0) {
        /* ---- disc ---- */
        // Equal-area radial sampling: uniform in r would pile every particle
        // into the inner annulus and leave the outer disc bare.
        float r = sqrt(mix(0.0, ROUT * ROUT, aSeed.x));
        float f = clamp(r / max(ROUT, 1e-3), 0.0, 1.0);

        // Keplerian: the inner field leads. This is what streams points
        // through the stationary arm pattern.
        float th = aSeed.y + ORBIT * pow(max(rIn, 0.1) / max(r, 0.1), 1.5) * uTime;

        // The lanes. Banded on the material coordinate so they never wind up;
        // the arm count multiplies lanes without touching the pitch.
        // min(uArms,1) gates the spin: at 0 lanes the whole term collapses to a
        // constant, instead of pulsing the entire disc in unison.
        float armAngle = uArms * (th - WIND * log(max(r, 0.1) / max(rIn, 0.1)))
                       - ${ARM_SPIN.toFixed(3)} * uTime * min(uArms, 1.0);
        // Crowd material INTO the lane before placing the point. armAngle is
        // arms*theta, so shifting theta by -k*sin(armAngle)/arms contracts the
        // angle about the lane by (1 - k) and genuinely raises local density.
        th -= ${ARM_PULL.toFixed(2)} * sin(armAngle) / max(uArms, 1.0);
        float arm = pow(0.5 + 0.5 * cos(armAngle), ${ARM_SHARPNESS.toFixed(1)});

        // The disc flares outward, so the vertical spread is not constant.
        float flare = 0.30 + 0.70 * pow(f, 1.2);
        float y = aSeed.z * THICKNESS * uScatter * flare;
        p = vec3(r * cos(th), y, r * sin(th));

        // Radial envelope: crest a third of the way out, then long feather to rim.
        float radial = 1.0 - smoothstep(0.45, 1.0, f);
        radial *= 1.0 + 1.4 * exp(-pow((f - 0.32) / 0.20, 2.0));

        // The far arc is brighter than the near one in the reference.
        float farSide = 0.5 - 0.5 * (p.z / max(r, 1e-3));

        bright = radial * (0.34 + 0.75 * arm) * mix(0.62, 1.0, farSide) * 1.45;
        ramp = clamp((1.0 - f) * 0.55 + arm * 0.55, 0.0, 1.0);
    } else {
        /* ---- jets ---- */
        if (aSeed.w > uJetAmount) { kill(); return; }

        // Stream outward and wrap. pow() packs the sampling toward the base,
        // where the column is bright and narrow.
        float u = fract(aSeed.x + ${JET_FLOW.toFixed(3)} * uTime);
        float climb = pow(u, 1.35) * uJetLen;
        float cone = tan(uJetSpread) * climb * (0.30 + 0.70 * u) + uCore * 0.35;
        float rr = aSeed.z * cone;
        float az = aSeed.y + climb * ${JET_HELIX.toFixed(4)};
        p = vec3(rr * cos(az), aKind * climb, rr * sin(az));

        bright = mix(1.0, 0.20, smoothstep(0.0, 1.0, u)) * (0.28 + 0.72 * (1.0 - aSeed.z)) * 1.75;
        ramp = 0.30 + 0.40 * (1.0 - u);
    }

    /* ---- camera: orbit at uTilt above the disc plane, aimed at the origin ---- */
    float c = cos(uTilt);
    float s = sin(uTilt);
    vec3 camPos = vec3(0.0, uDist * s, uDist * c);
    vec3 rel = p - camPos;
    // Transpose of Rx(uTilt): takes the look direction onto -Z exactly.
    vec3 q = vec3(rel.x, c * rel.y - s * rel.z, s * rel.y + c * rel.z);
    float depth = -q.z;
    if (depth < 1.0) { kill(); return; }

    gl_Position = vec4(q.x * FOCAL / (depth * uAspect), q.y * FOCAL / depth, 0.0, 1.0);

    /* ---- size: world sprite + circle of confusion, focus behind the disc ---- */
    float ppw = FOCAL * uHalfH / depth;
    float focusD = uDist * ${FOCUS_MULT.toFixed(2)};
    float coc = uBlur * max(0.0, focusD - depth) / focusD;
    float px = (uDotSize + coc) * ppw * ${HALO.toFixed(2)};

    // Energy conservation, then walked back: physically exact bokeh reads far
    // too dim against a near-black field.
    vAlpha = bright * pow(uDotSize / max(uDotSize + coc, 1e-5), 1.6);
    // Under a pixel a point cannot get smaller, so it has to get fainter.
    float optical = px / ${HALO.toFixed(2)};
    if (optical < 1.0) vAlpha *= optical * optical;
    vRamp = ramp;
    gl_PointSize = clamp(px, 1.0, 96.0);
}
`

const PARTICLE_FRAG = `
precision highp float;

uniform vec3 uBase;
uniform vec3 uAccent;

varying float vAlpha;
varying float vRamp;

void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r2 = dot(d, d) * 4.0;
    if (r2 > 1.0) discard;
    float core = max(0.0, exp(-r2 * 9.25) - 0.0000961);
    float skirt = max(0.0, exp(-r2 * 1.80) - 0.165299);
    float g = core + 0.30 * skirt;
    float e = g * vAlpha;
    vec3 col = mix(uBase, uAccent, vRamp);
    gl_FragColor = vec4(col * e, e);
}
`

/* ------------------------------------------------------------------ helpers */

function compile(gl: WebGLRenderingContext, type: number, src: string) {
    const sh = gl.createShader(type)!
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn("AccretionDisc shader:", gl.getShaderInfoLog(sh))
    }
    return sh
}

function link(gl: WebGLRenderingContext, vs: string, fs: string) {
    const p = gl.createProgram()!
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs))
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs))
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        console.warn("AccretionDisc link:", gl.getProgramInfoLog(p))
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

function gauss(rnd: () => number) {
    const u1 = Math.max(1e-9, rnd())
    const u2 = rnd()
    const g = Math.sqrt(-2 * Math.log(u1)) * Math.cos(TAU * u2)
    return Math.max(-3, Math.min(3, g))
}

function buildCloud(count: number) {
    const seed = new Float32Array(count * 4)
    const kind = new Float32Array(count)
    const rnd = mulberry32(0x9e3779b9)
    for (let i = 0; i < count; i++) {
        const o = i * 4
        if (rnd() >= JET_SHARE) {
            seed[o] = rnd()
            seed[o + 1] = rnd() * TAU
            seed[o + 2] = gauss(rnd)
            seed[o + 3] = rnd()
            kind[i] = 0
        } else {
            seed[o] = rnd()
            seed[o + 1] = rnd() * TAU
            seed[o + 2] = Math.sqrt(rnd())
            seed[o + 3] = rnd()
            kind[i] = rnd() < 0.5 ? 1 : -1
        }
    }
    return { seed, kind }
}

/* -------------------------------------------------------------------- props */

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

interface Props {
    background?: string
    baseColor?: string
    accentColor?: string
    density?: number
    dotSize?: number
    speed?: number
    distance?: number
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
    tilt: 16,
    core: 0,
    arms: 5,
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

const JETS_DEFAULTS: Required<Pick<Group, "amount" | "length" | "spread">> = {
    amount: 40,
    length: 300,
    spread: 34,
}

export default function AccretionDisc(props: Props) {
    const {
        background = "#000000",
        baseColor = "#1900FF",
        accentColor = "#A0C0FF",
        density = 61,
        dotSize = 127,
        speed = 100,
        distance = 220,
        field = {"blur":0,"scatter":0},
        disc = {"arms":4,"core":7,"tilt":14},
        jets = {"amount":0,"length":200,"spread":34},
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
        jetAmount: 0,
        jetLen: 0,
        jetSpread: 0,
    })

    const f = merge(FIELD_DEFAULTS, field)
    const d = merge(DISC_DEFAULTS, disc)
    const j = merge(JETS_DEFAULTS, jets)

    live.current.base = parseColor(baseColor)
    live.current.accent = parseColor(accentColor)
    live.current.count = Math.round(COUNT_BASE + density * COUNT_PER)
    live.current.dotSize = (DOT_REF * dotSize) / 100
    live.current.speed = speed
    live.current.distance = distance
    live.current.scatter = f.scatter / 100
    live.current.blur = (BLUR_REF * f.blur) / 100
    live.current.tilt = (d.tilt * Math.PI) / 180
    live.current.core = (d.core / 100) * ROUT
    live.current.arms = d.arms
    live.current.jetAmount = j.amount / 100
    live.current.jetLen = (j.length / 100) * ROUT
    live.current.jetSpread = (j.spread * Math.PI) / 180

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
            uJetAmount: gl.getUniformLocation(particleProg, "uJetAmount"),
            uJetLen: gl.getUniformLocation(particleProg, "uJetLen"),
            uJetSpread: gl.getUniformLocation(particleProg, "uJetSpread"),
            uBase: gl.getUniformLocation(particleProg, "uBase"),
            uAccent: gl.getUniformLocation(particleProg, "uAccent"),
        }
        const aSeed = gl.getAttribLocation(particleProg, "aSeed")
        const aKind = gl.getAttribLocation(particleProg, "aKind")

        const seedBuf = gl.createBuffer()!
        const kindBuf = gl.createBuffer()!

        let built = 0
        const rebuild = (count: number) => {
            const { seed, kind } = buildCloud(count)
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
            gl.uniform1f(pu.uJetAmount, s.jetAmount)
            gl.uniform1f(pu.uJetLen, s.jetLen)
            gl.uniform1f(pu.uJetSpread, s.jetSpread)
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
