"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

// Quality tier, not a design control (rule 10). Measured: 1440x900 on a DPR-2
// host runs a locked 60 at 1.25 and 45 at 1.5, and the march is the whole
// cost — so this is the number, not the 2 a cheap shader can afford.
const MAX_DPR = 1.25

// Typical |grad F| per unit of field frequency, measured off the 4-octave
// field below. Density converts a wanted strip spacing into a contour period
// through it, which is what keeps Density and Scale independent.
const GRAD_PER_SCALE = 0.59

const VERT_SRC = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`

const FRAG_SRC = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;
uniform float uTime;
uniform float uDist;    // camera pullback, world units
uniform vec2  uLean;    // constant off-axis lean, xy per unit height
uniform float uScale;   // field frequency — swirl size
uniform float uPeriod;  // field units between contours — strip spacing
uniform float uThick;   // wall half-thickness, world units
uniform float uH;       // tallest wall, world units
uniform float uCut;     // coverage threshold: above it a strip exists
uniform float uScatter; // 0 = every strip full height, 1 = full variation
uniform vec2  uLxy;     // key light, horizontal part
uniform float uLz;      // key light, height
uniform vec3  uBg;
uniform vec3  uBase;
uniform vec3  uAccent;
uniform float uAccMix;
uniform vec2  uMouse;   // pointer position, board-plane world xy
uniform float uGlow;    // pointer proximity, 0 = idle, 1 = hovering

// World half-height of the board inside the frame. Fixed, so Distance is a
// dolly zoom and never re-frames the picture.
const float S = 1.0;

const int MARCH  = 128;
const int REFINE = 6;
const int SHADOW = 3;

const mat2 M2  = mat2( 0.80,  0.60, -0.60,  0.80);
const mat2 M2I = mat2( 0.80, -0.60,  0.60,  0.80);

float hash1(vec2 p) {
    p = 50.0 * fract(p * 0.3183099 + vec2(0.71, 0.113));
    return -1.0 + 2.0 * fract(p.x * p.y * (p.x + p.y));
}

// Value noise with its analytic derivative: (value, d/dx, d/dy). One call
// gives both the field and the gradient the contour distance needs.
vec3 noised(vec2 x) {
    vec2 i = floor(x);
    vec2 f = fract(x);
    vec2 u  = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
    float a = hash1(i);
    float b = hash1(i + vec2(1.0, 0.0));
    float c = hash1(i + vec2(0.0, 1.0));
    float d = hash1(i + vec2(1.0, 1.0));
    float k1 = b - a;
    float k2 = c - a;
    float k3 = a - b - c + d;
    return vec3(a + k1 * u.x + k2 * u.y + k3 * u.x * u.y,
                du.x * (k1 + k3 * u.y),
                du.y * (k2 + k3 * u.x));
}

// Value only — the height and colour fields never need a gradient.
float noise1(vec2 x) {
    vec2 i = floor(x);
    vec2 f = fract(x);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash1(i);
    float b = hash1(i + vec2(1.0, 0.0));
    float c = hash1(i + vec2(0.0, 1.0));
    float d = hash1(i + vec2(1.0, 1.0));
    return a + (b - a) * u.x + (c - a) * u.y + (a - b - c + d) * u.x * u.y;
}

// The field, with its gradient in WORLD units. Each octave slides on its own
// heading so the pattern morphs rather than translating; a per-octave
// translation leaves the derivative untouched, so the chain rule is unchanged.
vec3 field(vec2 p) {
    vec2 x = p * uScale;
    float a = 0.0;
    float b = 0.5;
    vec2 d = vec2(0.0);
    mat2 m = mat2(1.0, 0.0, 0.0, 1.0);
    float dr = 0.05;
    for (int i = 0; i < 4; i++) {
        float ang = 2.399963 * float(i);
        vec3 n = noised(x + uTime * dr * vec2(cos(ang), sin(ang)));
        a += b * n.x;
        d += b * (m * n.yz);
        b *= 0.42;
        x = 2.0 * (M2 * x);
        m = 2.0 * (M2I * m);
        dr *= 1.55;
    }
    return vec3(a, d * uScale);
}

// x = signed distance to the wall surface in xy (negative inside)
// y = strip id (the contour's integer level)
// zw = outward horizontal normal
vec4 wall(vec2 q) {
    vec3 F = field(q);
    float g = F.x / uPeriod;
    float id = floor(g + 0.5);
    float f = g - id;
    float gl = max(length(F.yz), 1e-4);
    float sgn = f >= 0.0 ? 1.0 : -1.0;
    return vec4(abs(f) * uPeriod / gl - uThick, id, (F.yz / gl) * sgn);
}

// How tall this strip stands here. Negative where the strip does not exist,
// which is what cuts the blunt ends.
float stripH(vec2 q, float id) {
    // The per-strip hash is deliberately a SMALL term next to the spatial
    // noise. Give neighbouring strips independent heights and the ray picks a
    // different wall every pixel, which reads as diagonal hatching across the
    // faces rather than as stacked layers of paper.
    float hn = noise1(q * uScale * 1.35 + vec2(id * 0.12, 4.3) + uTime * 0.03);
    float hs = hash1(vec2(id * 0.37, 11.7));
    float v = clamp(0.5 + 0.55 * hn + 0.09 * hs, 0.0, 1.0);
    v = mix(1.0, v, uScatter);
    float k = (v - uCut) / max(1e-3, 1.0 - uCut);
    if (k <= 0.0) return -1.0;
    return uH * (0.28 + 0.72 * min(k, 1.0));
}

// Top of the solid at q, or -1 where the board is bare.
float surfTop(vec2 q, out vec4 w) {
    w = wall(q);
    if (w.x > 0.0) return -1.0;
    return stripH(q, w.y);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;

    // The camera looks at the board OBLIQUELY. A ray that lands at uv * S on
    // the board is at uv * S - dir * z at height z, and dir has two parts:
    // a constant lean (Tilt) plus the perspective fan-out (Distance). The lean
    // is what makes every wall show a side face — a purely centred perspective
    // shows nothing at the frame's centre and a smear at its corners, which is
    // a lens, not a photograph of paper.
    vec2 dir = uv * S / uDist + uLean;
    float lat = max(length(dir), 1e-4);

    float z = uH * 1.0001;
    float zOut = z;
    bool hit = false;
    vec4 w = vec4(0.0);

    for (int i = 0; i < MARCH; i++) {
        float top = surfTop(uv * S - dir * z, w);
        if (z <= top) { hit = true; break; }
        // These factors are the whole ball game. Written as a FRACTION of the
        // remaining gap (0.85, 0.75) each rule is geometrically convergent: a
        // ray running along a wall's own footprint approaches its top and
        // never crosses it, so the hit is never registered, the ray drifts on
        // and the pixel is shaded as board. That painted fine hatching across
        // every face, aligned with the lean — which is what gave it away, since
        // real geometry does not rotate when the camera's lean does. Stepping
        // to the surface EXACTLY, plus a floor tied to the wall's own
        // thickness, makes every crossing detectable; the bisection below is
        // what buys back the accuracy the full step gives up.
        float dz = w.x > 0.0 ? 0.95 * w.x / lat : z - max(top, 0.0);
        dz = max(dz, max(uH * 0.004, uThick * 0.6 / lat));
        dz = min(dz, uH * 0.12);
        // Never fall behind the iteration budget. A ray running nearly tangent
        // to a wall takes vanishing steps, burns all MARCH iterations and stops
        // in mid-air — and the board then gets shaded at the point the ray had
        // reached rather than at z = 0, which paints diagonal streaks along the
        // lean. This floor guarantees the loop always reaches the board.
        dz = max(dz, z / float(MARCH - i));
        zOut = z;
        z -= dz;
        if (z <= 0.0) break;
    }
    if (!hit) z = 0.0;

    if (hit) {
        float zi = z;
        for (int i = 0; i < REFINE; i++) {
            float mid = 0.5 * (zi + zOut);
            vec4 ww;
            if (mid <= surfTop(uv * S - dir * mid, ww)) zi = mid;
            else zOut = mid;
        }
        z = zi;
    }

    vec2 q = uv * S - dir * z;
    // A cursor "torch": distance from the board point under the ray to the
    // pointer's world position, converted to a soft radial falloff. uGlow
    // fades this in/out on the CPU so hover/unhover is smooth, not a snap.
    float mdist = length(q - uMouse);
    float spot = uGlow * exp(-mdist * mdist * 16.0);
    vec3 col;

    if (!hit) {
        // Bare board. The cracks between strips read dark on their own, so
        // this only needs a light touch of proximity darkening.
        vec4 ww = wall(q);
        float ao = smoothstep(0.0, uThick * 4.0, ww.x);
        col = uBg * (0.52 + 0.48 * ao);
        col += spot * mix(uBg, vec3(1.0, 0.97, 0.90), 0.65) * (0.5 + 0.5 * ao);
    } else {
        float top = surfTop(q, w);

        // One expression covers both faces: deep down the normal is the wall's
        // outward horizontal, and it rolls over to +z across the top lip.
        float bev = max(min(uH * 0.35, uThick * 1.8), 1e-4);
        float a = clamp((top - z) / bev, 0.0, 1.0);
        vec3 n = normalize(vec3(w.zw * a, 1.0 - a + 1e-4));

        vec3 L = normalize(vec3(uLxy, uLz));
        float dif = max(dot(n, L), 0.0);
        float sky = 0.5 + 0.5 * clamp(n.z, 0.0, 1.0);

        // Cast shadow: step toward the light and see what is taller.
        float sh = 1.0;
        vec2 ld = normalize(uLxy);
        float rise = uLz / max(length(uLxy), 1e-3);
        // Taps stay close to the hit. Spacing is far smaller than height
        // here, so a tap half a wall-height away lands on an unrelated strip
        // and the "shadow" comes back as per-pixel acne rather than contact.
        for (int i = 1; i <= SHADOW; i++) {
            vec4 ww;
            float s = float(i) * uH * 0.16;
            float t2 = surfTop(q + ld * s, ww);
            sh = min(sh, smoothstep(-uH * 0.10, uH * 0.30, (z + s * rise) - t2));
        }
        sh = 0.42 + 0.58 * sh;

        // Colour comes from its own low-frequency fields, not from the contour
        // level — that is what makes the pale-to-deep drift a REGION.
        // These two frequencies are load-bearing. Take them much lower and
        // the whole frame fits inside ONE noise cell, so the "region" becomes
        // a hard diagonal half-plane across the picture. 0.40 and 0.42 put
        // roughly two and a half cells across the frame, which is a territory.
        // The centre and half-width below are the measured p10/p90 of the sum,
        // not an assumed zero mean — the sum of two cells is not symmetric.
        float tone = noise1(q * uScale * 0.40 + vec2(9.1, 2.7) + uTime * 0.012)
                   + 0.45 * noise1(q * uScale * 1.05 + vec2(1.3, 7.7));
        float t = clamp((tone - 0.39) / 0.62, -1.0, 1.0) * 0.5 + 0.5;
        vec3 dark = uBase * 0.55;
        vec3 pale = mix(uBase, vec3(0.90, 0.94, 0.97), 0.58);
        vec3 pc = mix(dark, uBase, smoothstep(0.02, 0.42, t));
        pc = mix(pc, pale, smoothstep(0.68, 1.0, t));

        float af = noise1(q * uScale * 0.42 + vec2(-4.2, 6.6))
                 + 0.5 * noise1(q * uScale * 1.15 + vec2(2.9, -3.4));
        // Measured quantiles of af: p1 = -0.11, p88 = 0.86, p99 = 1.10. So the
        // ends of this mix are just outside the field's range — Accent Mix 0
        // is genuinely no accent, 100 is genuinely all of it, and the default
        // 22 lands on roughly an eighth of the frame.
        float thr = mix(1.25, -0.52, uAccMix);
        pc = mix(pc, uAccent, smoothstep(thr, thr + 0.14, af));

        // Paper-to-paper tone variety, one hash off the strip id.
        pc *= 0.95 + 0.10 * (hash1(vec2(w.y * 0.53, 2.1)) * 0.5 + 0.5);

        // Occlusion is measured DOWN FROM THIS STRIP'S OWN TOP, not from the
        // board. Keyed to absolute z it barely varies — a raked view only ever
        // exposes the top third of a face before the next wall cuts it off — so
        // every ribbon came out the same flat tone and the field read as grey
        // corduroy instead of as separate pieces of paper.
        float below = clamp((top - z) / max(uH * 0.5, 1e-4), 0.0, 1.0);
        float ao = (1.0 - 0.72 * pow(below, 0.55)) * (0.42 + 0.58 * smoothstep(0.0, uH * 0.55, z));
        col = pc * ((0.22 + 0.36 * sky) * ao + 0.70 * dif * sh);
        col += pc * 0.18 * pow(clamp(n.z, 0.0, 1.0), 6.0) * ao;
        col += spot * mix(pc, vec3(1.0, 0.97, 0.88), 0.6) * (0.35 + 0.65 * ao);
    }

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

function num(v: unknown, fb: number): number {
    return typeof v === "number" && isFinite(v) ? v : fb
}

// Hex, rgb()/rgba(), hsl()/hsla() and var(--token, <color>) — a hex-only
// parse makes the dial look dead.
function parseColor(input: string | undefined, fb: [number, number, number]): [number, number, number] {
    if (!input) return fb
    let str = String(input).trim()
    if (str.slice(0, 4) === "var(") {
        const comma = str.indexOf(",")
        if (comma < 0) return fb
        str = str.slice(comma + 1, str.lastIndexOf(")")).trim()
    }
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
    const m = str.match(/-?[\d.]+/g)
    if (!m || m.length < 3) return fb
    if (str.slice(0, 3) === "hsl") {
        const hDeg = ((parseFloat(m[0]) % 360) + 360) % 360
        const s = Math.min(100, Math.max(0, parseFloat(m[1]))) / 100
        const l = Math.min(100, Math.max(0, parseFloat(m[2]))) / 100
        const c = (1 - Math.abs(2 * l - 1)) * s
        const x = c * (1 - Math.abs(((hDeg / 60) % 2) - 1))
        const mm = l - c / 2
        const seg = Math.floor(hDeg / 60) % 6
        const t: [number, number, number] =
            seg === 0 ? [c, x, 0] :
            seg === 1 ? [x, c, 0] :
            seg === 2 ? [0, c, x] :
            seg === 3 ? [0, x, c] :
            seg === 4 ? [x, 0, c] : [c, 0, x]
        return [t[0] + mm, t[1] + mm, t[2] + mm]
    }
    return [
        Math.min(255, Math.max(0, parseFloat(m[0]))) / 255,
        Math.min(255, Math.max(0, parseFloat(m[1]))) / 255,
        Math.min(255, Math.max(0, parseFloat(m[2]))) / 255,
    ]
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("PaperQuilling shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

interface PaperQuillingProps {
    style?: React.CSSProperties
    background?: string
    baseColor?: string
    accentColor?: string
    accentMix?: number
    density?: number
    scale?: number
    stripHeight?: number
    thickness?: number
    coverage?: number
    scatter?: number
    speed?: number
    tilt?: number
    distance?: number
    lightAngle?: number
    hoverIntensity?: number
    width?: number
    height?: number
}

const BG_D: [number, number, number] = [0.086, 0.204, 0.361]
const BASE_D: [number, number, number] = [0.247, 0.639, 0.812]
const ACC_D: [number, number, number] = [0.902, 0.784, 0.118]

export default function PaperQuilling(props: PaperQuillingProps) {
    const {
        style,
        background = "#000000",
        baseColor = "#FFFFFF",
        accentColor = "#E6C81E",
        accentMix = 100,
        density = 89,
        scale = 117,
        stripHeight = 84,
        thickness = 20,
        coverage = 100,
        scatter = 0,
        speed = 100,
        tilt = 45,
        distance = 120,
        lightAngle = 244,
        hoverIntensity = 38,
        width,
        height,
    } = props

    const canvasRef = useRef<HTMLCanvasElement>(null)
    // Pointer state lives outside React state: it is read every animation
    // frame, and a re-render per mousemove would fight the GL loop.
    const mouseRef = useRef({ x: 0, y: 0, target: 0, glow: 0 })

    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    // Every live input reaches the loop through this ref, never through the
    // effect deps — a dep would rebuild the GL context on every colour tweak.
    const vRef = useRef({
        bg: BG_D,
        base: BASE_D,
        accent: ACC_D,
        accMix: 0.22,
        period: 0.0535,
        scale: 1.65,
        h: 0.168,
        thick: 0.006,
        cut: 0.22,
        scatter: 0.65,
        speed: 1,
        dist: 6.0,
        lnx: 0.442,
        lny: -0.442,
        lx: -0.7071,
        ly: 0.7071,
        hoverAmt: 0.6,
    })

    {
        const dens = Math.max(6, num(density, 40))
        const sc = (Math.max(20, num(scale, 75)) / 100) * 2.2
        // Density is strips down the frame, and it means that at ANY Scale.
        // The frame is 2 world units tall, so the spacing it asks for is
        // 2/Density; a level set's spacing is period / |grad F|, and |grad F|
        // is proportional to the field frequency — hence the sc factor. Miss
        // it and every Scale change silently re-densities the strips.
        const spacing = 2 / dens
        const per = spacing * GRAD_PER_SCALE * sc
        const ang = (num(lightAngle, 135) * Math.PI) / 180
        const tiltR = (Math.min(45, Math.max(0, num(tilt, 32))) * Math.PI) / 180
        vRef.current = {
            bg: parseColor(background, BG_D),
            base: parseColor(baseColor, BASE_D),
            accent: parseColor(accentColor, ACC_D),
            accMix: Math.min(100, Math.max(0, num(accentMix, 22))) / 100,
            period: per,
            scale: sc,
            h: (Math.max(0, num(stripHeight, 120)) / 100) * 0.14,
            // Thickness is a share of the spacing, so a strip keeps its
            // proportions when Density or Scale moves.
            thick: (Math.max(5, num(thickness, 120)) / 100) * spacing * 0.10,
            cut: 1 - Math.min(100, Math.max(1, num(coverage, 78))) / 100,
            scatter: Math.min(150, Math.max(0, num(scatter, 65))) / 100,
            speed: Math.max(0, num(speed, 50)) / 50,
            dist: Math.max(60, num(distance, 600)) / 100,
            // The lean runs AWAY from the key light, so the faces the camera
            // can see are the faces the light is on. Welding it to Light Angle
            // is deliberate: a free azimuth's only interesting settings are the
            // ones near this, and the rest light the picture from behind.
            lnx: Math.tan(tiltR) * -Math.cos(ang),
            lny: Math.tan(tiltR) * -Math.sin(ang),
            lx: Math.cos(ang),
            ly: Math.sin(ang),
            // Scales the cursor-torch's peak brightness — 0 disables the
            // hover effect outright, 100 is the strength it shipped at.
            hoverAmt: Math.min(100, Math.max(0, num(hoverIntensity, 60))) / 100,
        }
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false })
        if (!gl) {
            console.error("PaperQuilling: WebGL unavailable")
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
            console.error("PaperQuilling link:", gl.getProgramInfoLog(prog))
            return
        }
        gl.useProgram(prog)

        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        const aloc = gl.getAttribLocation(prog, "a_pos")
        gl.enableVertexAttribArray(aloc)
        gl.vertexAttribPointer(aloc, 2, gl.FLOAT, false, 0, 0)

        const u = {
            res: gl.getUniformLocation(prog, "uRes"),
            time: gl.getUniformLocation(prog, "uTime"),
            dist: gl.getUniformLocation(prog, "uDist"),
            lean: gl.getUniformLocation(prog, "uLean"),
            scale: gl.getUniformLocation(prog, "uScale"),
            period: gl.getUniformLocation(prog, "uPeriod"),
            thick: gl.getUniformLocation(prog, "uThick"),
            h: gl.getUniformLocation(prog, "uH"),
            cut: gl.getUniformLocation(prog, "uCut"),
            scatter: gl.getUniformLocation(prog, "uScatter"),
            lxy: gl.getUniformLocation(prog, "uLxy"),
            lz: gl.getUniformLocation(prog, "uLz"),
            bg: gl.getUniformLocation(prog, "uBg"),
            base: gl.getUniformLocation(prog, "uBase"),
            accent: gl.getUniformLocation(prog, "uAccent"),
            accMix: gl.getUniformLocation(prog, "uAccMix"),
            mouse: gl.getUniformLocation(prog, "uMouse"),
            glow: gl.getUniformLocation(prog, "uGlow"),
        }

        // uv-space conversion mirrors the shader's own: (fragCoord - 0.5res)/res.y,
        // with the y flip WebGL's bottom-left origin needs against a
        // top-left pointer event. On the board's z = 0 plane this is exactly
        // the world xy the fragment shader lands on for that pixel.
        const onPointerMove = (e: PointerEvent) => {
            const rect = canvas.getBoundingClientRect()
            const localX = e.clientX - rect.left
            const localY = e.clientY - rect.top
            mouseRef.current.x = (localX - rect.width / 2) / rect.height
            mouseRef.current.y = (rect.height / 2 - localY) / rect.height
            mouseRef.current.target = 1
        }
        const onPointerLeave = () => {
            mouseRef.current.target = 0
        }
        canvas.addEventListener("pointermove", onPointerMove)
        canvas.addEventListener("pointerleave", onPointerLeave)

        let raf = 0
        let last = performance.now()
        // Time is accumulated on the CPU so Speed scales a RATE, not a clock
        // offset — moving the dial never jumps the pattern.
        let clock = 0

        const render = (now: number) => {
            const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
            last = now
            const v = vRef.current
            clock += dt * v.speed

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
            gl.uniform1f(u.dist, v.dist)
            gl.uniform2f(u.lean, v.lnx, v.lny)
            gl.uniform1f(u.scale, v.scale)
            gl.uniform1f(u.period, v.period)
            gl.uniform1f(u.thick, v.thick)
            gl.uniform1f(u.h, v.h)
            gl.uniform1f(u.cut, v.cut)
            gl.uniform1f(u.scatter, v.scatter)
            gl.uniform2f(u.lxy, v.lx, v.ly)
            gl.uniform1f(u.lz, 0.85)
            gl.uniform3f(u.bg, v.bg[0], v.bg[1], v.bg[2])
            gl.uniform3f(u.base, v.base[0], v.base[1], v.base[2])
            gl.uniform3f(u.accent, v.accent[0], v.accent[1], v.accent[2])
            gl.uniform1f(u.accMix, v.accMix)

            // Ease the glow toward its target rather than snapping, so the
            // torch fades in on hover and fades out on leave.
            const m = mouseRef.current
            m.glow += (m.target - m.glow) * Math.min(1, dt * 6)
            gl.uniform2f(u.mouse, m.x, m.y)
            gl.uniform1f(u.glow, m.glow * v.hoverAmt)

            gl.drawArrays(gl.TRIANGLES, 0, 3)
            raf = requestAnimationFrame(render)
        }

        raf = requestAnimationFrame(render)
        // No WEBGL_lose_context here: getContext hands back the same
        // context per canvas, so a force-lost one comes back black on remount.
        return () => {
            cancelAnimationFrame(raf)
            canvas.removeEventListener("pointermove", onPointerMove)
            canvas.removeEventListener("pointerleave", onPointerLeave)
        }
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
