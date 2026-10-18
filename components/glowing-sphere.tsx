"use client"

import type { CSSProperties } from "react"
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

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    loopMs: 12000,
    flow: 30,
    rockDeg: 20,
    tiltDeg: 20,
    noiseScale: 90,
    detail: 3,
    seed: 7,
    offsetX: 0,
    offsetY: -1,
    coreX: 3,
    coreY: 6,
    coreSize: 80,
    core2X: -8,
    core2Y: 72,
    core2Size: 40,
    coreStrength: 100,
    foldDark: 45,
    foldDepth: 55,
    filament: 80,
    filamentSharp: 12,
    filamentScale: 300,
    flicker: 15,
    hiBias: 80,
    speckGrid: 22,
    speckSize: 12,
    bubbles: 3,
    speckColor: "#F2EEFF",
    rimColor: "#EFA8F2",
    rimCyan: "#B8E6FF",
    rimWidth: 5,
    rimStrength: 100,
    innerGlow: 25,
    halo: 12,
    haloWidth: 4,
    shade: 10,
    grain: 0,
    vignette: 0,
    quality: 100,
    jellyStiffness: 140,
    jellyDamping: 9,
}

// ── moved controls (builder) ──
/**
 * Controls moved in the builder: into Advanced, out of it, or into groups of
 * their own. The code reads each one where it was first written, so the props
 * are put back in that shape before anything reads them.
 */
const MOVED_CONTROLS: { into: Record<string, string>; out: Record<string, string> } = {"into":{"speed":"motion","turbulence":"motion"},"out":{}}
/** The "motion" group's defaults, for when Framer passes it unopened. */
const MOTION_DEFAULTS = { speed: 50, turbulence: 50 }
const GROUP_FALLBACKS: Record<string, any> = { advanced: ADVANCED_DEFAULTS, motion: MOTION_DEFAULTS }
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
void main() {
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

const FRAG = `#version 300 es
precision highp float;
precision highp int;
out vec4 outColor;

uniform vec2 uRes;
uniform float uPhase;
uniform float uRadius;
uniform vec2 uCenter;
uniform float uWarp;
uniform float uNoiseScale;
uniform int uOctaves;
uniform float uFlow;
uniform float uRock;
uniform float uTilt;
uniform float uDragYaw;
uniform float uDragPitch;
uniform vec2 uSquash;
uniform vec3 uBg;
uniform vec3 uBase;
uniform vec3 uDeep;
uniform vec3 uCore;
uniform vec3 uHi;
uniform vec3 uRimA;
uniform vec3 uRimB;
uniform vec3 uSpeck;
uniform vec3 uCoreA;
uniform vec3 uCoreB;
uniform float uCoreStrength;
uniform float uFoldDark;
uniform float uFoldDepth;
uniform float uFilament;
uniform float uFilSharp;
uniform float uFilScale;
uniform float uFlicker;
uniform float uHiBias;
uniform float uSpeckDensity;
uniform float uSpeckGrid;
uniform float uSpeckSize;
uniform float uBubbles;
uniform float uRimStrength;
uniform float uRimWidth;
uniform float uInnerGlow;
uniform float uHalo;
uniform float uHaloWidth;
uniform float uShade;
uniform float uSeed;
uniform float uGrain;
uniform float uVignette;
uniform float uFrame;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float fbm(vec3 p, int oct) {
    float a = 0.5;
    float s = 0.0;
    for (int i = 0; i < 6; i++) {
        if (i >= oct) break;
        s += a * snoise(p);
        p = p * 2.03 + vec3(1.7, -3.1, 2.3);
        a *= 0.5;
    }
    return s;
}

float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

vec3 screenB(vec3 a, vec3 b) { return 1.0 - (1.0 - a) * (1.0 - clamp(b, 0.0, 1.0)); }

vec3 rotAxis(vec3 v, vec3 k, float a) {
    float c = cos(a);
    float s = sin(a);
    return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c);
}

void main() {
    float sMin = max(min(uRes.x, uRes.y), 1.0);
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / (0.5 * sMin);
    float R = max(uRadius, 0.01);
    vec2 q = (p - uCenter) / R;
    q *= uSquash;
    float r = length(q);
    float px = 2.0 / (sMin * R);
    vec2 dir = q / max(r, 1e-4);
    float cyanAmt = smoothstep(0.1, 0.9, dot(dir, normalize(vec2(0.6, 0.8))));
    vec3 rimCol = mix(uRimA, uRimB, cyanAmt * 0.7);
    float a = uPhase * 6.2831853;

    // Everything below is computed for every pixel (no branch) so screen-space
    // derivatives of the relief stay defined; the sphere mask is applied at the end.
    float rr = min(r, 0.999);
    float z = sqrt(max(0.0, 1.0 - rr * rr));
    vec3 n = vec3(q * (rr / max(r, 1e-4)), z);
    n = rotAxis(n, vec3(0.0, 1.0, 0.0), uDragYaw);
    n = rotAxis(n, vec3(1.0, 0.0, 0.0), uDragPitch);
    vec3 axis = normalize(vec3(sin(uTilt), cos(uTilt), 0.0));
    vec3 m = rotAxis(n, axis, uRock * sin(a));
    vec3 seedOff = vec3(uSeed * 1.731, uSeed * 0.917, uSeed * 2.113);
    vec3 P = m * uNoiseScale + seedOff;
    vec3 tOff = vec3(cos(a), sin(a), 0.0) * uFlow;

    // Gentle large-scale warp so the plates stay big.
    vec3 w = vec3(
        fbm(P * 0.8 + tOff, 2),
        fbm(P * 0.8 + vec3(5.2, 1.3, 2.8) + tOff.yzx, 2),
        fbm(P * 0.8 + vec3(-3.7, 8.1, -1.9) - tOff.zxy, 2));
    vec3 Pw = P + uWarp * w * 0.6;
    float f = fbm(Pw + 0.5 * tOff.zxy, uOctaves);
    float t = clamp(f * 0.8 + 0.5, 0.0, 1.0);

    // Crumpled-glass relief: ridged noise gives broad facets meeting at sharp creases.
    float n1 = snoise(Pw * 1.1 + vec3(2.0, -1.0, 0.5));
    float n2 = snoise(Pw * 2.3 + vec3(-4.1, 3.3, 1.7));
    float hgt = 0.65 * abs(n1) + 0.35 * abs(n2);
    vec2 grad = vec2(dFdx(hgt), dFdy(hgt)) / max(px, 1e-5);
    vec3 N = normalize(vec3(-grad * uFoldDepth * 0.25, 1.0));
    vec3 L = normalize(vec3(-0.45, 0.6, 0.65));
    float diff = clamp(dot(N, L) / L.z, 0.0, 1.6);
    float spec = pow(max(dot(reflect(-L, N), vec3(0.0, 0.0, 1.0)), 0.0), 18.0);
    float crease = 1.0 - smoothstep(0.0, 0.06, abs(n1));

    vec3 c = mix(uDeep, uBase, smoothstep(0.15, 0.65, t));
    c = mix(c, uDeep * 0.55, crease * uFoldDark * 0.6);

    // Pink-magenta core: a wide soft band through the middle, plus a lower lobe.
    vec2 qw = q + w.xy * 0.3;
    float ca = 1.0 - smoothstep(0.0, max(uCoreA.z, 0.01), length((qw - uCoreA.xy) * vec2(0.8, 1.15)));
    float cb = 1.0 - smoothstep(0.0, max(uCoreB.z, 0.01), length(qw - uCoreB.xy));
    float pn = snoise(Pw * 0.9 + vec3(11.0, -4.0, 2.0)) * 0.5 + 0.5;
    float pink = clamp(max(ca, cb * 0.85) * (0.75 + 0.5 * pn), 0.0, 1.0);
    pink = smoothstep(0.05, 0.8, pink);
    float fres = pow(1.0 - z, 2.0);
    float edgePink = fres * (1.0 - 0.75 * cyanAmt) * (0.6 + 0.4 * pn);
    pink = max(pink, edgePink * 0.85) * uCoreStrength;

    vec3 lavender = mix(uBase, uCore, 0.55);
    vec3 pinkCol = mix(lavender, uCore, smoothstep(0.3, 0.8, t));
    c = mix(c, pinkCol, smoothstep(0.0, 0.7, pink));
    c = mix(c, uCore * 1.08, smoothstep(0.6, 1.0, pink) * 0.6);

    c *= mix(1.0, diff, 0.55) * (0.88 + 0.22 * t);
    c = screenB(c, mix(vec3(0.7, 0.85, 1.0), vec3(1.0, 0.85, 0.95), pink) * spec * 0.4);

    // Cyan veins and glow along the fold creases, mostly in the upper half.
    float bias = mix(1.0, smoothstep(-0.5, 0.8, dot(q, normalize(vec2(0.25, 1.0)))), uHiBias);
    float region = smoothstep(0.35, 0.75, snoise(Pw * 0.9 + vec3(4.0, -2.0, 1.0)) * 0.5 + 0.5);
    region = region * bias * (1.0 - 0.8 * pink);
    float flick = 1.0 + uFlicker * snoise(m * 1.5 + vec3(cos(3.0 * a), sin(3.0 * a), 0.0) * 0.7 + seedOff);
    float vein = pow(1.0 - abs(n1), uFilSharp);
    float glow = pow(1.0 - abs(n1), max(uFilSharp * 0.25, 1.0)) * 0.35;
    c = screenB(c, uHi * (vein + glow) * region * uFilament * flick);

    // Fine white ice cracks, sparse.
    vec3 Pf = P * uFilScale + uWarp * w * 0.8 + vec3(0.0, 0.0, 3.3);
    float crack = pow(1.0 - abs(snoise(Pf)), uFilSharp * 2.5);
    float crackMask = smoothstep(0.45, 0.75, 1.0 - pn) * (1.0 - 0.5 * pink);
    c = screenB(c, vec3(vein * vein * region * uFilament * flick * 0.5 + crack * crackMask * uFilament * 0.3));

    // Specks and small crater bubbles riding the surface.
    vec2 st = m.xy / max(1.0 + m.z, 0.25) + w.xy * 0.03;
    vec2 g = st * uSpeckGrid;
    vec2 id = floor(g);
    vec2 fp = fract(g);
    float h1 = hash21(id + uSeed * 0.37);
    float h2 = hash21(id + 17.3 + uSeed);
    float h3 = hash21(id + 41.7);
    float h4 = hash21(id + 73.1);
    vec2 pt = 0.2 + 0.6 * vec2(h2, h3);
    float d = length(fp - pt) / max(uSpeckGrid, 1.0);
    float rad = uSpeckSize * 0.5 * (0.6 + 0.8 * h4);
    float aa = px * 0.5 + 1e-5;
    float speck = step(h1, uSpeckDensity) * (1.0 - smoothstep(rad - aa, rad + aa, d)) * (0.55 + 0.4 * h4);
    float rb = rad * (2.0 + 1.5 * h2);
    float bubble = step(1.0 - uBubbles, h1) * (1.0 - smoothstep(0.0, aa * 1.5 + rad * 0.2, abs(d - rb))) * 0.5;
    float pit = step(1.0 - uBubbles, h1) * (1.0 - smoothstep(rb * 0.6, rb, d)) * 0.25;
    vec3 sc = mix(uSpeck, mix(uCore, vec3(1.0), 0.6), step(0.6, h4) * 0.7 + pink * 0.3);
    c *= 1.0 - pit;
    c = mix(c, sc, clamp(speck, 0.0, 1.0));
    c = screenB(c, uSpeck * bubble);

    // Pink-lavender rim glow, whiter toward the upper right.
    float rimBand = exp(-(1.0 - rr) / max(uRimWidth, 1e-3));
    float rimLit = 0.75 + 0.35 * max(-dir.y, 0.0);
    c = screenB(c, rimCol * (rimBand + 0.25 * fres) * uRimStrength * rimLit);

    c += c * (1.0 - rr * rr) * uInnerGlow;
    c *= 1.0 - uShade * clamp(dot(q, normalize(vec2(0.7, -0.7))), 0.0, 1.0);

    vec3 col = uBg;
    float halo = exp(-max(r - 1.0, 0.0) / max(uHaloWidth, 1e-3)) * step(1.0 - 2.0 * px, r);
    col = screenB(col, rimCol * halo * uHalo * 0.25);
    float alpha = 1.0 - smoothstep(1.0 - 1.5 * px, 1.0 + 0.5 * px, r);
    col = mix(col, clamp(c, 0.0, 1.0), alpha);

    vec2 uv = gl_FragCoord.xy / uRes;
    float vd = length((uv - 0.5) * vec2(uRes.x / max(uRes.y, 1.0), 1.0));
    col *= 1.0 - uVignette * smoothstep(0.25, 0.95, vd);
    col += (hash21(gl_FragCoord.xy + fract(uFrame * 0.6180339) * 137.0) - 0.5) * uGrain;
    outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

const UNIFORMS = [
    "uRes", "uPhase", "uRadius", "uCenter", "uWarp", "uNoiseScale", "uOctaves", "uFlow", "uRock", "uTilt",
    "uDragYaw", "uDragPitch", "uSquash",
    "uBg", "uBase", "uDeep", "uCore", "uHi", "uRimA", "uRimB", "uSpeck", "uCoreA", "uCoreB",
    "uCoreStrength", "uFoldDark", "uFoldDepth", "uFilament", "uFilSharp", "uFilScale", "uFlicker", "uHiBias",
    "uSpeckDensity", "uSpeckGrid", "uSpeckSize", "uBubbles", "uRimStrength", "uRimWidth", "uInnerGlow",
    "uHalo", "uHaloWidth", "uShade", "uSeed", "uGrain", "uVignette", "uFrame",
]

function parseColor(input: any, fallback: [number, number, number]): [number, number, number] {
    if (typeof input !== "string") return fallback
    const rgb = input.match(/rgba?\(([^)]+)\)/i)
    if (rgb) {
        const parts = rgb[1].split(/[\s,\/]+/).filter(Boolean).map((v) => parseFloat(v))
        if (parts.length >= 3 && parts.slice(0, 3).every((v) => isFinite(v))) {
            return [parts[0] / 255, parts[1] / 255, parts[2] / 255]
        }
    }
    const hex = input.match(/#([0-9a-f]{3,8})\b/i)
    if (hex) {
        let h = hex[1]
        if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split("").map((c) => c + c).join("")
        if (h.length >= 6) {
            return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255]
        }
    }
    return fallback
}

function num(v: any, fallback: number, min: number, max: number) {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.min(max, Math.max(min, n))
}

export interface SingleGlowingSphereProps {
    background?: string
    baseColor?: string
    deepColor?: string
    coreColor?: string
    highlightColor?: string
    motion?: {
        speed?: number
        turbulence?: number
    }
    scale?: number
    density?: number
    dragSensitivity?: number
    clickStrength?: number
    advanced?: {
        loopMs?: number
        flow?: number
        rockDeg?: number
        tiltDeg?: number
        noiseScale?: number
        detail?: number
        seed?: number
        offsetX?: number
        offsetY?: number
        coreX?: number
        coreY?: number
        coreSize?: number
        core2X?: number
        core2Y?: number
        core2Size?: number
        coreStrength?: number
        foldDark?: number
        foldDepth?: number
        filament?: number
        filamentSharp?: number
        filamentScale?: number
        flicker?: number
        hiBias?: number
        speckGrid?: number
        speckSize?: number
        bubbles?: number
        speckColor?: string
        rimColor?: string
        rimCyan?: string
        rimWidth?: number
        rimStrength?: number
        innerGlow?: number
        halo?: number
        haloWidth?: number
        shade?: number
        quality?: number
        jellyStiffness?: number
        jellyDamping?: number
    }
    style?: CSSProperties
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function SingleGlowingSphere(props: SingleGlowingSphereProps) {
    props = withMovedControls(props)
    const {
        speed = 50,
        scale = 64,
        turbulence = 50,
        baseColor = "#3A44F2",
        deepColor = "#2A1FA8",
        coreColor = "#F58AD8",
        highlightColor = "#7FD8FF",
        density = 18,
        background = "#0B0B0D",
        dragSensitivity = 100,
        clickStrength = 12,
        style,
    } = props

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef<any>(props)
    propsRef.current = {
        ...props,
        speed,
        scale,
        turbulence,
        baseColor,
        deepColor,
        coreColor,
        highlightColor,
        density,
        background,
        dragSensitivity,
        clickStrength,
    }
    const dirtyRef = useRef(true)
    const dragRef = useRef({ active: false, x: 0, y: 0, lastX: 0, lastY: 0 })
    const hoverRef = useRef(false)
    const hoverAmtRef = useRef(0)
    const squishRef = useRef({ s: 0, v: 0 })

    useEffect(() => {
        dirtyRef.current = true
    })

    useEffect(() => {
        const canvas = canvasRef.current
        const host = hostRef.current
        if (!canvas || !host) return
        const gl = canvas.getContext("webgl2", {
            antialias: false,
            alpha: false,
            premultipliedAlpha: false,
            preserveDrawingBuffer: true,
        })
        if (!gl) return

        const compile = (type: number, src: string) => {
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
        const vs = compile(gl.VERTEX_SHADER, VERT)
        const fs = compile(gl.FRAGMENT_SHADER, FRAG)
        const prog = gl.createProgram()
        if (!prog) throw new Error("Could not create program")
        gl.attachShader(prog, vs)
        gl.attachShader(prog, fs)
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            throw new Error("Program link failed: " + gl.getProgramInfoLog(prog))
        }
        const U: Record<string, WebGLUniformLocation> = {}
        for (const name of UNIFORMS) {
            const loc = gl.getUniformLocation(prog, name)
            if (!loc) throw new Error(`Uniform ${name} not found`)
            U[name] = loc
        }
        const vao = gl.createVertexArray()

        let software = false
        try {
            const ext = gl.getExtension("WEBGL_debug_renderer_info")
            const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER))
            software = /swiftshader|llvmpipe|software/i.test(name)
        } catch {}

        let cssW = host.offsetWidth
        let cssH = host.offsetHeight
        const ro = new ResizeObserver(() => {
            cssW = host.offsetWidth
            cssH = host.offsetHeight
            dirtyRef.current = true
        })
        ro.observe(host)

        host.style.cursor = "grab"
        const onPointerEnter = () => {
            hoverRef.current = true
            dirtyRef.current = true
        }
        const onPointerLeave = () => {
            hoverRef.current = false
            dirtyRef.current = true
        }
        const onPointerDown = (e: PointerEvent) => {
            dragRef.current.active = true
            dragRef.current.lastX = e.clientX
            dragRef.current.lastY = e.clientY
            host.style.cursor = "grabbing"
            const kick = num(propsRef.current.clickStrength, 50, 0, 100) / 50
            squishRef.current.v -= 9 * kick
            dirtyRef.current = true
            try {
                host.setPointerCapture(e.pointerId)
            } catch {}
        }
        const onPointerMove = (e: PointerEvent) => {
            if (!dragRef.current.active) return
            dragRef.current.x += e.clientX - dragRef.current.lastX
            dragRef.current.y += e.clientY - dragRef.current.lastY
            dragRef.current.lastX = e.clientX
            dragRef.current.lastY = e.clientY
            dirtyRef.current = true
        }
        const onPointerUp = () => {
            if (!dragRef.current.active) return
            dragRef.current.active = false
            host.style.cursor = hoverRef.current ? "grab" : "grab"
        }
        host.addEventListener("pointerenter", onPointerEnter)
        host.addEventListener("pointerleave", onPointerLeave)
        host.addEventListener("pointerdown", onPointerDown)
        window.addEventListener("pointermove", onPointerMove)
        window.addEventListener("pointerup", onPointerUp)
        window.addEventListener("pointercancel", onPointerUp)

        const target = RenderTarget.current()
        const staticMode = target === RenderTarget.thumbnail || target === RenderTarget.export
        const reduceQuery =
            typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null

        let raf = 0
        let last = -1
        let phase = 0
        let frame = 0

        const tick = (now: number) => {
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            const p = propsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
            const sp = num(p.speed, 50, 0, 100) / 50
            const reduced = !!(reduceQuery && reduceQuery.matches)
            const moving = !staticMode && !reduced && sp > 0

            const hoverTarget = hoverRef.current ? 1 : 0
            hoverAmtRef.current += (hoverTarget - hoverAmtRef.current) * Math.min(dt * 6, 1)
            if (Math.abs(hoverTarget - hoverAmtRef.current) > 0.001) dirtyRef.current = true

            if (!dragRef.current.active) {
                if (Math.abs(dragRef.current.x) > 0.02 || Math.abs(dragRef.current.y) > 0.02) {
                    const decay = Math.pow(0.001, Math.max(dt, 0))
                    dragRef.current.x *= decay
                    dragRef.current.y *= decay
                    dirtyRef.current = true
                } else {
                    dragRef.current.x = 0
                    dragRef.current.y = 0
                }
            }

            // Jelly / water-ball spring: a click kicks the velocity, this is a
            // damped spring-mass integration pulling it back to rest (s = 0).
            const springK = num(adv.jellyStiffness, 140, 20, 400)
            const springDamp = num(adv.jellyDamping, 9, 1, 40)
            const springAcc = -springK * squishRef.current.s - springDamp * squishRef.current.v
            squishRef.current.v += springAcc * dt
            squishRef.current.s += squishRef.current.v * dt
            if (Math.abs(squishRef.current.s) > 0.0005 || Math.abs(squishRef.current.v) > 0.0005) {
                dirtyRef.current = true
            } else {
                squishRef.current.s = 0
                squishRef.current.v = 0
            }

            if (moving) {
                const loopSec = Math.max(num(adv.loopMs, 12000, 100, 600000), 100) / 1000
                phase = (phase + (dt * sp) / loopSec) % 1
                frame++
            }

            let dpr = Math.min(window.devicePixelRatio || 1, 2)
            if (software) dpr = Math.min(dpr, 1)
            dpr *= num(adv.quality, 100, 25, 100) / 100
            const W = Math.max(1, Math.round(cssW * dpr))
            const H = Math.max(1, Math.round(cssH * dpr))
            if (canvas.width !== W || canvas.height !== H) {
                canvas.width = W
                canvas.height = H
                dirtyRef.current = true
            }

            if (moving || dirtyRef.current) {
                dirtyRef.current = false
                gl.viewport(0, 0, W, H)
                gl.useProgram(prog)
                gl.bindVertexArray(vao)

                const col = (v: any, fb: [number, number, number]) => parseColor(v, fb)
                gl.uniform2f(U.uRes, W, H)
                gl.uniform1f(U.uPhase, phase)
                const dragSens = num(p.dragSensitivity, 50, 0, 100) / 100
                const dragYaw = Math.max(-2.6, Math.min(2.6, (dragRef.current.x / 220) * dragSens))
                const dragPitch = Math.max(-1.3, Math.min(1.3, (dragRef.current.y / 220) * dragSens))
                const hoverBoost = hoverAmtRef.current
                gl.uniform1f(U.uRadius, (num(p.scale, 64, 1, 200) / 100) * (1 + hoverBoost * 0.06))
                gl.uniform2f(U.uCenter, num(adv.offsetX, 0, -100, 100) * 0.02, -num(adv.offsetY, 0, -100, 100) * 0.02)
                gl.uniform1f(U.uDragYaw, dragYaw)
                gl.uniform1f(U.uDragPitch, dragPitch)
                const squeeze = Math.max(-0.45, Math.min(0.45, squishRef.current.s))
                gl.uniform2f(U.uSquash, 1 - squeeze * 0.5, 1 + squeeze * 0.5)
                gl.uniform1f(U.uWarp, (num(p.turbulence, 50, 0, 100) / 100) * 2.0)
                gl.uniform1f(U.uNoiseScale, num(adv.noiseScale, 90, 10, 1000) / 100)
                gl.uniform1i(U.uOctaves, Math.round(num(adv.detail, 3, 1, 6)))
                gl.uniform1f(U.uFlow, num(adv.flow, 30, 0, 300) / 100)
                gl.uniform1f(U.uRock, (num(adv.rockDeg, 20, 0, 180) * Math.PI) / 180)
                gl.uniform1f(U.uTilt, (num(adv.tiltDeg, 20, -90, 90) * Math.PI) / 180)
                gl.uniform3fv(U.uBg, col(p.background, [0.043, 0.043, 0.051]))
                gl.uniform3fv(U.uBase, col(p.baseColor, [0.227, 0.267, 0.949]))
                gl.uniform3fv(U.uDeep, col(p.deepColor, [0.165, 0.122, 0.659]))
                gl.uniform3fv(U.uCore, col(p.coreColor, [0.961, 0.541, 0.847]))
                gl.uniform3fv(U.uHi, col(p.highlightColor, [0.498, 0.847, 1]))
                gl.uniform3fv(U.uRimA, col(adv.rimColor, [0.937, 0.659, 0.949]))
                gl.uniform3fv(U.uRimB, col(adv.rimCyan, [0.722, 0.902, 1]))
                gl.uniform3fv(U.uSpeck, col(adv.speckColor, [0.949, 0.933, 1]))
                gl.uniform3f(
                    U.uCoreA,
                    num(adv.coreX, 3, -100, 100) / 100,
                    -num(adv.coreY, 6, -100, 100) / 100,
                    num(adv.coreSize, 80, 1, 200) / 100
                )
                gl.uniform3f(
                    U.uCoreB,
                    num(adv.core2X, -8, -100, 100) / 100,
                    -num(adv.core2Y, 72, -100, 100) / 100,
                    num(adv.core2Size, 40, 1, 200) / 100
                )
                gl.uniform1f(U.uCoreStrength, num(adv.coreStrength, 100, 0, 100) / 100)
                gl.uniform1f(U.uFoldDark, num(adv.foldDark, 45, 0, 100) / 100)
                gl.uniform1f(U.uFoldDepth, num(adv.foldDepth, 55, 0, 100) / 100)
                gl.uniform1f(U.uFilament, num(adv.filament, 80, 0, 200) / 100)
                gl.uniform1f(U.uFilSharp, num(adv.filamentSharp, 12, 1, 40))
                gl.uniform1f(U.uFilScale, num(adv.filamentScale, 300, 10, 800) / 100)
                gl.uniform1f(U.uFlicker, num(adv.flicker, 15, 0, 100) / 100)
                gl.uniform1f(U.uHiBias, num(adv.hiBias, 80, 0, 100) / 100)
                gl.uniform1f(U.uSpeckDensity, (num(p.density, 18, 0, 100) / 100) * 0.92)
                gl.uniform1f(U.uSpeckGrid, num(adv.speckGrid, 22, 2, 40))
                gl.uniform1f(U.uSpeckSize, num(adv.speckSize, 12, 1, 40) / 1000)
                gl.uniform1f(U.uBubbles, num(adv.bubbles, 3, 0, 30) / 100)
                gl.uniform1f(U.uRimStrength, (num(adv.rimStrength, 100, 0, 200) / 100) * (1 + hoverBoost * 0.35))
                gl.uniform1f(U.uRimWidth, num(adv.rimWidth, 5, 1, 40) / 100)
                gl.uniform1f(U.uInnerGlow, (num(adv.innerGlow, 25, 0, 100) / 100) * (1 + hoverBoost * 0.4))
                gl.uniform1f(U.uHalo, (num(adv.halo, 12, 0, 100) / 100) * (1 + hoverBoost * 0.5))
                gl.uniform1f(U.uHaloWidth, num(adv.haloWidth, 4, 1, 40) / 100)
                gl.uniform1f(U.uShade, num(adv.shade, 10, 0, 100) / 100)
                gl.uniform1f(U.uSeed, num(adv.seed, 7, 0, 100))
                gl.uniform1f(U.uGrain, (num(adv.grain, 0, 0, 100) / 100) * 0.12)
                gl.uniform1f(U.uVignette, num(adv.vignette, 0, 0, 100) / 100)
                gl.uniform1f(U.uFrame, frame)
                gl.drawArrays(gl.TRIANGLES, 0, 3)
            }
            raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            host.removeEventListener("pointerenter", onPointerEnter)
            host.removeEventListener("pointerleave", onPointerLeave)
            host.removeEventListener("pointerdown", onPointerDown)
            window.removeEventListener("pointermove", onPointerMove)
            window.removeEventListener("pointerup", onPointerUp)
            window.removeEventListener("pointercancel", onPointerUp)
        }
    }, [])

    return (
        <div
            ref={hostRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                minWidth: 1200,
                minHeight: 800,
                background,
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
