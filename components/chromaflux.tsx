"use client"

/**
 * RainbowHourglass — two tangent wells of rainbow light pinched at the waist,
 * the colour pouring through them forever. Built from the user's
 * "FullFrameColour" and matched to their 10-frame reference clip.
 *
 * Everything here was measured off the clip (9 frames share one phase, frame 6
 * is the same picture 0.1 cycle on), not eyeballed:
 *
 * - The whole picture is one cyclic palette indexed by a static field; only a
 *   global phase moves. The palette below is that loop, 12 linear stops fitted
 *   to it (1.3/255 rms).
 * - Outside the circles the field is a bipolar coordinate, linear in τ:
 *   u = K_OUT·½·ln[(a²x² + (y+ε)²) / (a²x² + (y−ε)²)] with a = 1.18 and the
 *   foci ε = 0.432 R inside the circles. The seam is u = 0, which is why the
 *   reference's centre line is one flat colour edge to edge.
 * - Two circles of radius 13.2% of the height sit 20 px (on 1280) apart. Near
 *   them the outer field bends round their rims; that is an even multipole
 *   series per circle (RIM_G), mirrored and negated for the lower one.
 * - Inside each circle the field is smooth: an even degree-8 polynomial over
 *   the disc (innerPoly), negated and mirrored for the lower circle. It meets
 *   the outside exactly at each circle's far point and jumps by up to 0.77 of
 *   a cycle at the near point, which is the sharp crescent rim of the clip.
 *
 * Fills its frame edge to edge and resizes with it. The design is framed on
 * the frame's height, or on its width when the frame is narrower than the
 * original 1200×800 landscape (the field carries on around it), so resizing
 * never crops the circles.
 *
 * Out of the box it renders the clip's frame 1 at t = 0 (mean colour error
 * 2.3/255 against the reference — the same as the noise between its frames).
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
import { useEffect, useRef, useState, type CSSProperties } from "react"

type RGBA = [number, number, number, number]

const COLOR_CACHE = new Map<string, RGBA | null>()

function parseColor(input: string | undefined, fallback: RGBA): RGBA {
    if (typeof input !== "string") return fallback
    let hit = COLOR_CACHE.get(input)
    if (hit === undefined) {
        hit = parseColorRaw(input)
        COLOR_CACHE.set(input, hit)
    }
    return hit ?? fallback
}

function parseColorRaw(raw: string): RGBA | null {
    let s = raw.trim()
    const v = /^var\(\s*--[^,]+,\s*(.+)\)$/.exec(s)
    if (v) s = v[1].trim()
    if (s[0] === "#") {
        const h = s.slice(1)
        const x = (a: string) => parseInt(a, 16)
        let r: number, g: number, b: number, a = 255
        if (h.length === 3 || h.length === 4) {
            r = x(h[0] + h[0]); g = x(h[1] + h[1]); b = x(h[2] + h[2])
            if (h.length === 4) a = x(h[3] + h[3])
        } else if (h.length === 6 || h.length === 8) {
            r = x(h.slice(0, 2)); g = x(h.slice(2, 4)); b = x(h.slice(4, 6))
            if (h.length === 8) a = x(h.slice(6, 8))
        } else return null
        const out: RGBA = [r / 255, g / 255, b / 255, a / 255]
        return out.every(Number.isFinite) ? out : null
    }
    const m = /^(rgba?|hsla?)\(([^)]*)\)$/i.exec(s)
    if (!m) return null
    const parts = m[2].split(/[\s,/]+/).filter(Boolean)
    if (parts.length < 3) return null
    const num = (p: string, scale: number) =>
        p.endsWith("%") ? (parseFloat(p) / 100) * scale : parseFloat(p)
    const alpha = parts.length > 3 ? num(parts[3], 1) : 1
    let rgb: [number, number, number]
    if (m[1].toLowerCase().startsWith("rgb")) {
        rgb = [num(parts[0], 255) / 255, num(parts[1], 255) / 255, num(parts[2], 255) / 255]
    } else {
        const hh = (((parseFloat(parts[0]) % 360) + 360) % 360) / 360
        const ss = num(parts[1], 1), ll = num(parts[2], 1)
        const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss
        const p = 2 * ll - q
        const f = (t: number) => {
            t = (t + 1) % 1
            if (t < 1 / 6) return p + (q - p) * 6 * t
            if (t < 1 / 2) return q
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
            return p
        }
        rgb = [f(hh + 1 / 3), f(hh), f(hh - 1 / 3)]
    }
    const out: RGBA = [rgb[0], rgb[1], rgb[2], alpha]
    return out.every(Number.isFinite) ? out.map((c) => Math.min(1, Math.max(0, c))) as RGBA : null
}

// ── Defaults (one source of truth for the signature and the panel) ──

const DEFAULTS = {
    background: "#020007",
    baseColor: "#02D1FC",
    accentColor: "#F97F04",
    hue: 0,
    bands: 120,
    scale: 48,
    speed: 50,
    hover: 50,
}

const DEFAULT_PLACEMENT = { angle: 0, tilt: 0 }
type Placement = typeof DEFAULT_PLACEMENT

const DEFAULT_ADVANCED = {
    radius: 132,
    gap: 16,
    centerX: 50,
    centerY: 50,
    fieldSpan: 100,
    innerSpan: 100,
    innerShift: 0,
    innerSkew: 0,
    indigoColor: "#7400E9",
    purpleColor: "#7F03F4",
    violetColor: "#AE2F9C",
    pinkColor: "#E26432",
    yellowColor: "#FAF702",
    mintColor: "#81F97A",
    cyanColor: "#07F6F4",
    blueColor: "#0279F5",
    deepBlueColor: "#021430",
    grain: 0,
    vignette: 0,
    cycleMs: 1000,
    phase: 14,
    pull: 4,
    swirl: 15,
    pointerSize: 18,
}
type Advanced = typeof DEFAULT_ADVANCED

export interface RainbowHourglassProps {
    /** Palette stop 0: the black the violet rises out of. Also the frame's ground if WebGL is unavailable. */
    background?: string
    /** Palette stop 9: the sky blue between cyan and blue. */
    baseColor?: string
    /** Palette stop 5: the orange between pink and yellow. */
    accentColor?: string
    /** Turns every colour of the palette round the hue wheel, in degrees. */
    hue?: number
    /** How many colour bands the field holds, % of the reference. */
    bands?: number
    /** Size of the whole design in the frame, % of the reference framing. */
    scale?: number
    /** Angle and Tilt; Advanced → Center X / Center Y move it. */
    placement?: Partial<Placement>
    /** Rate the colour pours through, 50 = the reference. Drives a hand-rolled clock, so there is no Transition. */
    speed?: number
    /** Overall strength of the pointer response, 0–100, 50 = as shipped, 0 = off. */
    hover?: number
    advanced?: Partial<Advanced>
    style?: CSSProperties
}

// ── Measured constants (see header) ──

/** Palette stop positions along one cycle, fitted with the stop colours. */
const POS = [0.0, 0.1799, 0.1957, 0.2659, 0.3365, 0.3557, 0.4956, 0.5915, 0.6842, 0.7534, 0.8633, 0.966]
const PAL_N = 256
const PIXEL_BUDGET = 4.2e6
/** The frame the composition is laid out for (the intrinsic 1200x800); it is contained, never cropped. */
const REF_ASPECT = 1200 / 800
const D2R = Math.PI / 180

const clampN = (v: unknown, lo: number, hi: number, d: number) =>
    Math.max(lo, Math.min(hi, typeof v === "number" && Number.isFinite(v) ? v : d))

/** Shared geometry: the field pass caches fieldVals at half resolution; the composite recomputes the rims at full. */
const FIELD_GLSL = `
uniform float uFAspect;
uniform vec2 uCenter;
uniform vec2 uLean;
uniform vec2 uRot;
uniform vec2 uTiltCS;
uniform float uZoom;
uniform float uR;
uniform float uD;

// Lens distance for Tilt, in frame heights. Fixed: it is the look, not a knob.
const float PERSP = 2.0;
// Outer bipolar field: horizontal stretch, focus offset (share of the radius), cycles per unit tau.
const float AX = 1.18;
const float EPS_R = 0.43195;
const float K_OUT = 1.27;

// Rim multipoles: per Chebyshev order n, weights of (R/r)^2, ^4, ^6, ^8.
float rimG(vec4 g, float q2) { return q2 * (g.x + q2 * (g.y + q2 * (g.z + q2 * g.w))); }
float rimCorr(float c, float q2) {
    float t0 = 1.0, t1 = c;
    float s = rimG(vec4(-0.44086, 4.16291, -5.86858, 2.54549), q2)
            + rimG(vec4(-0.41492, 6.18859, -9.12677, 3.99606), q2) * t1;
    float t2 = 2.0 * c * t1 - t0; s += rimG(vec4(-0.53343, 4.51925, -6.22289, 2.51755), q2) * t2;
    float t3 = 2.0 * c * t2 - t1; s += rimG(vec4(-0.26621, 1.84577, -1.91848, 0.46697), q2) * t3;
    float t4 = 2.0 * c * t3 - t2; s += rimG(vec4(-0.01017, 0.07588, 0.39333, -0.40015), q2) * t4;
    float t5 = 2.0 * c * t4 - t3; s += rimG(vec4(0.02312, -0.06693, 0.19149, -0.11664), q2) * t5;
    float t6 = 2.0 * c * t5 - t4; s += rimG(vec4(-0.01509, 0.10065, -0.16853, 0.09696), q2) * t6;
    return s;
}

// Upper disc, x and (y - D) in radii. Even in x; the lower disc is its negated mirror.
float innerPoly(vec2 sv) {
    float v = sv.y, s2 = sv.x * sv.x;
    float a0 = 0.71153 + v * (-0.21508 + v * (0.01314 + v * (0.02513 + v * (-0.09464 + v * (-0.13562 + v * (0.28910 + v * (0.09308 + v * (-0.18259))))))));
    float a2 = -0.05275 + v * (0.16243 + v * (-0.46429 + v * (-0.35075 + v * (0.58319 + v * (0.14475 + v * (-0.21385))))));
    float a4 = -0.21003 + v * (-0.99440 + v * (2.18215 + v * (0.93456 + v * (-1.22079))));
    float a6 = 0.20969 + v * (1.14395 + v * (-2.36209));
    float a8 = -0.16062;
    return a0 + s2 * (a2 + s2 * (a4 + s2 * (a6 + s2 * a8)));
}

// Screen uv -> content coordinates: pointer lean and Center offset, then undo Angle, then undo Tilt.
// vis is 0 beyond Tilt's horizon, where the field has fallen to its seam value anyway.
vec2 contentP(vec2 uv, out float vis) {
    vec2 p = vec2((uv.x - 0.5) * uFAspect, uv.y - 0.5) - uLean - uCenter;
    p = vec2(uRot.x * p.x - uRot.y * p.y, uRot.y * p.x + uRot.x * p.y);
    float den = PERSP * uTiltCS.x - p.y * uTiltCS.y;
    vis = step(1e-3, den);
    float yv = p.y * PERSP / max(den, 1e-3);
    return vec2(p.x * (PERSP + yv * uTiltCS.y) / PERSP, yv) / uZoom;
}

// (outer u, inner polynomial). Both stay smooth across the rims, so a half-res cache filters cleanly;
// the sharp edge between them comes from rimVals at full resolution.
vec2 fieldVals(vec2 p) {
    float e = EPS_R * uR;
    float q = AX * AX * p.x * p.x;
    float uo = K_OUT * 0.5 * log((q + (p.y + e) * (p.y + e) + 1e-12) / (q + (p.y - e) * (p.y - e) + 1e-12));
    vec2 du = p - vec2(0.0, uD);
    vec2 dl = p + vec2(0.0, uD);
    float ru = max(length(du), 1e-6);
    float rl = max(length(dl), 1e-6);
    float rr = uR * uR;
    // (R/r)^2 capped at 4: deep inside a circle the outer value is never shown, but must stay finite.
    uo += rimCorr(-du.y / ru, min(rr / (ru * ru), 4.0)) - rimCorr(dl.y / rl, min(rr / (rl * rl), 4.0));
    float s = p.y >= 0.0 ? 1.0 : -1.0;
    vec2 sv = vec2(p.x, p.y * s - uD) / uR;
    float ui = dot(sv, sv) < 1.6 ? innerPoly(clamp(sv, -1.2, 1.2)) : 0.0;
    return vec2(uo, ui);
}

// Signed circle coverage. Edge width from the true per-pixel change of the distance
// (fwidth would draw the rims twice as wide).
float rimVals(vec2 p, float vis) {
    float s = p.y >= 0.0 ? 1.0 : -1.0;
    float dc = length(vec2(p.x, p.y * s - uD));
    float pxw = max(length(vec2(dFdx(dc), dFdy(dc))), 1e-7);
    float cov = clamp(0.5 - (dc - uR) / pxw, 0.0, 1.0) * vis;
    return s * cov;
}
`

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

const FIELD_FRAG = `#version 300 es
precision highp float;
${FIELD_GLSL}
uniform vec2 uFRes;
out vec4 outField;
void main() {
    float vis;
    vec2 p = contentP(gl_FragCoord.xy / uFRes, vis);
    outField = vec4(fieldVals(p) * vis, 0.0, 1.0);
}`

/** Composite pass: the rim edge at full resolution, then one palette lookup per side of it at the current phase. */
const compositeFrag = (direct: boolean) => `#version 300 es
precision highp float;
${FIELD_GLSL}
uniform sampler2D uField;
uniform sampler2D uPal;
uniform vec2 uRes;
uniform float uAspect;
uniform float uBase;
uniform vec2 uMouse;
uniform float uHover;
uniform float uSwirl;
uniform float uPSize;
uniform float uBands;
uniform float uOutK;
uniform float uInK;
uniform float uInShift;
uniform float uInSkew;
uniform float uHue;
uniform float uGrain;
uniform float uVig;
uniform float uTime;
out vec4 outColor;

// Inner field value at each circle's far point, where it meets the outside.
const float U_TOP = 0.5040;

vec3 hueRot(vec3 c, float a) {
    if (abs(a) < 1e-4) return c;
    const vec3 k = vec3(0.57735027);
    float ca = cos(a), sa = sin(a);
    return clamp(c * ca + cross(k, c) * sa + k * dot(k, c) * (1.0 - ca), 0.0, 1.0);
}

float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }

void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    float vis;
    vec2 p = contentP(uv, vis);
    vec2 f = ${direct ? "fieldVals(p) * vis" : "texture(uField, uv).rg"};
    float rv = rimVals(p, vis);
    vec2 dm = (uv - uMouse) * vec2(uAspect, 1.0);
    // Pointer: a soft local push of the colour phase, in screen space so it sits under the cursor.
    float b = uBase + uSwirl * uHover * exp(-dot(dm, dm) / max(uPSize * uPSize, 1e-4));
    vec3 col = texture(uPal, vec2(b + uBands * uOutK * f.x, 0.5)).rgb;
    float cov = abs(rv);
    if (cov > 0.0) {
        float s = rv < 0.0 ? -1.0 : 1.0;
        float ui = s * (uBands * (U_TOP + uInK * (f.y - U_TOP)) + uInShift) + uInSkew;
        col = mix(col, texture(uPal, vec2(b + ui, 0.5)).rgb, cov);
    }
    col = hueRot(col, uHue);
    float v = length((uv - 0.5) * vec2(uAspect, 1.0)) / max(length(0.5 * vec2(uAspect, 1.0)), 1e-4);
    col *= 1.0 - uVig * 0.85 * smoothstep(0.35, 1.0, v);
    if (uGrain > 0.0) col += (h21(gl_FragCoord.xy + floor(uTime * 24.0) * vec2(17.0, 31.0)) - 0.5) * uGrain * 0.25;
    outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

type Slot = { loc: WebGLUniformLocation | null; v: number[] }

function makeProgram(gl: WebGL2RenderingContext, fs: string): WebGLProgram | null {
    const sh = (type: number, src: string) => {
        const s = gl.createShader(type)
        if (!s) return null
        gl.shaderSource(s, src)
        gl.compileShader(s)
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) {
            console.error("RainbowHourglass shader:", gl.getShaderInfoLog(s))
            gl.deleteShader(s)
            return null
        }
        return s
    }
    const vs = sh(gl.VERTEX_SHADER, VERT)
    const fsh = sh(gl.FRAGMENT_SHADER, fs)
    const prog = gl.createProgram()
    if (!vs || !fsh || !prog) return null
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fsh)
    gl.bindAttribLocation(prog, 0, "aPos")
    gl.linkProgram(prog)
    gl.deleteShader(vs)
    gl.deleteShader(fsh)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        if (!gl.isContextLost()) console.error("RainbowHourglass link:", gl.getProgramInfoLog(prog))
        gl.deleteProgram(prog)
        return null
    }
    return prog
}

/** Uniform setters that only upload a value when it changed. */
function uniforms(gl: WebGL2RenderingContext, prog: WebGLProgram) {
    const slots = new Map<string, Slot>()
    const slot = (name: string) => {
        let s = slots.get(name)
        if (!s) {
            s = { loc: gl.getUniformLocation(prog, name), v: [NaN, NaN, NaN] }
            slots.set(name, s)
        }
        return s
    }
    return {
        f1(name: string, a: number) {
            const s = slot(name)
            if (s.v[0] === a) return
            s.v[0] = a
            gl.uniform1f(s.loc, a)
        },
        f2(name: string, a: number, b: number) {
            const s = slot(name)
            if (s.v[0] === a && s.v[1] === b) return
            s.v[0] = a
            s.v[1] = b
            gl.uniform2f(s.loc, a, b)
        },
        f3(name: string, a: number, b: number, c: number) {
            const s = slot(name)
            if (s.v[0] === a && s.v[1] === b && s.v[2] === c) return
            s.v[0] = a
            s.v[1] = b
            s.v[2] = c
            gl.uniform3f(s.loc, a, b, c)
        },
        i1(name: string, a: number) {
            const s = slot(name)
            if (s.v[0] === a) return
            s.v[0] = a
            gl.uniform1i(s.loc, a)
        },
    }
}

export default function RainbowHourglass({
    background = DEFAULTS.background,
    baseColor = DEFAULTS.baseColor,
    accentColor = DEFAULTS.accentColor,
    hue = DEFAULTS.hue,
    bands = DEFAULTS.bands,
    scale = DEFAULTS.scale,
    placement,
    speed = DEFAULTS.speed,
    hover = DEFAULTS.hover,
    advanced,
    style,
}: RainbowHourglassProps) {
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    // Merged once per render, never inside the loop.
    const cfg = {
        background, baseColor, accentColor, hue, bands, scale, speed, hover,
        pl: { ...DEFAULT_PLACEMENT, ...placement },
        adv: { ...DEFAULT_ADVANCED, ...advanced },
    }
    const cfgRef = useRef(cfg)
    const lastJson = useRef("")
    const json = JSON.stringify(cfg)
    // Framer re-renders with identical props constantly; only a real change wakes the loop.
    const changed = json !== lastJson.current
    lastJson.current = json
    cfgRef.current = cfg
    const wakeRef = useRef<() => void>(() => {})
    const [generation, setGeneration] = useState(0)
    const forceDirectRef = useRef(false)

    useEffect(() => {
        if (changed) wakeRef.current()
    })

    useEffect(() => {
        const rootEl = rootRef.current
        const canvasEl = canvasRef.current
        if (!rootEl || !canvasEl) return
        const root: HTMLDivElement = rootEl
        const canvas: HTMLCanvasElement = canvasEl
        const ctx = canvas.getContext("webgl2", {
            alpha: false,
            antialias: false,
            depth: false,
            stencil: false,
            powerPreference: "low-power",
            preserveDrawingBuffer: false,
        })
        // No WebGL2: the root's Background stays showing.
        if (!ctx) return
        const gl: WebGL2RenderingContext = ctx

        // Cache the static field in a half-float target when the GPU can render to one.
        const canFloat = !!gl.getExtension("EXT_color_buffer_float")
        let direct = !canFloat || forceDirectRef.current
        const fieldProg = direct ? null : makeProgram(gl, FIELD_FRAG)
        if (!fieldProg) direct = true
        const compProg = makeProgram(gl, compositeFrag(direct))
        if (!compProg) return
        const uf = fieldProg ? uniforms(gl, fieldProg) : null
        const uc = uniforms(gl, compProg)

        const vao = gl.createVertexArray()
        gl.bindVertexArray(vao)
        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

        // Palette: 256 x 1, linear + repeat, so the cyclic gradient wraps seamlessly.
        const palTex = gl.createTexture()
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D, palTex)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        const palBytes = new Uint8Array(PAL_N * 4)
        const stops: RGBA[] = new Array(12)
        let palKey = ""

        let fieldTex: WebGLTexture | null = null
        let fbo: WebGLFramebuffer | null = null
        let fieldKey = ""
        // The field is smooth, so it is cached at half resolution and filtered; only the rims need full res.
        const fieldW = () => Math.max(1, Math.ceil(canvas.width / 2))
        const fieldH = () => Math.max(1, Math.ceil(canvas.height / 2))
        const ensureTarget = () => {
            if (direct) return
            if (!fieldTex) {
                fieldTex = gl.createTexture()
                gl.activeTexture(gl.TEXTURE0)
                gl.bindTexture(gl.TEXTURE_2D, fieldTex)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            }
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, fieldTex)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG16F, fieldW(), fieldH(), 0, gl.RG, gl.HALF_FLOAT, null)
            if (!fbo) {
                fbo = gl.createFramebuffer()
                gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fieldTex, 0)
                const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
                gl.bindFramebuffer(gl.FRAMEBUFFER, null)
                // A GPU that cannot render half floats after all: compute the field in the composite instead.
                if (!ok) {
                    forceDirectRef.current = true
                    setGeneration((g) => g + 1)
                }
            }
        }

        // Layout size from ResizeObserver only. `shown` is the on-screen scale (Framer zoom, scaled previews).
        let cssW = Math.max(1, root.offsetWidth)
        let cssH = Math.max(1, root.offsetHeight)
        let shown = 1
        let quality = 1
        const applySize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            // Never below the frame's own layout size: a page or preview that shrinks the frame with a
            // CSS transform (BuilderPreview, the live site below 1024px) reads a buffer matching the
            // shrunk width as a component that mis-measured, and drops the scaling. Zoomed in (Framer's
            // canvas), the buffer still grows so it stays sharp.
            const sh = Math.min(2, Math.max(1, shown))
            const want = cssW * cssH * dpr * dpr * sh * sh
            const k = dpr * sh * Math.min(1, Math.sqrt(PIXEL_BUDGET / Math.max(1, want))) * quality
            const w = Math.max(1, Math.round(cssW * k))
            const h = Math.max(1, Math.round(cssH * k))
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w
                canvas.height = h
                ensureTarget()
                fieldKey = ""
            }
        }
        applySize()
        ensureTarget()
        const ro = new ResizeObserver((entries) => {
            const r = entries[0].contentRect
            cssW = Math.max(1, r.width)
            cssH = Math.max(1, r.height)
            // One layout read per resize: how big the frame is actually shown.
            const b = root.getBoundingClientRect()
            if (b.width > 0) shown = b.width / cssW
            applySize()
            wake()
        })
        ro.observe(root)

        // Pointer handlers only record; the rect is read at most once per frame.
        let px = 0
        let py = 0
        let over = 0
        let moved = false
        const onMove = (e: PointerEvent) => {
            // Chrome repeats pointermove at the same spot after layout; a resting cursor must not keep us awake.
            if (over === 1 && e.clientX === px && e.clientY === py) return
            px = e.clientX
            py = e.clientY
            over = 1
            moved = true
            wake()
        }
        const onLeave = () => {
            over = 0
            wake()
        }
        const onScroll = () => {
            if (over) {
                moved = true
                wake()
            }
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerdown", onMove)
        root.addEventListener("pointerleave", onLeave)
        // On touch, lifting the finger ends the hover.
        const onUp = (e: PointerEvent) => {
            if (e.pointerType === "touch") onLeave()
        }
        root.addEventListener("pointerup", onUp)
        window.addEventListener("scroll", onScroll, { passive: true, capture: true })

        const mq = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null
        let reduced = !!mq?.matches
        const onMq = () => {
            reduced = !!mq?.matches
            wake()
        }
        mq?.addEventListener?.("change", onMq)

        // Off screen or in a hidden tab: draw nothing.
        let visible = true
        const io = new IntersectionObserver((es) => {
            const e = es[es.length - 1]
            visible = e.isIntersecting
            if (e.boundingClientRect.width > 0) {
                const s = e.boundingClientRect.width / cssW
                if (Math.abs(s - shown) > 0.02) {
                    shown = s
                    applySize()
                }
            }
            wake()
        })
        io.observe(root)
        const onVis = () => wake()
        document.addEventListener("visibilitychange", onVis)

        let disposed = false
        let lost = false
        let raf = 0
        const onLost = (e: Event) => {
            e.preventDefault()
            disposed = true
            lost = true
            cancelAnimationFrame(raf)
        }
        const onRestored = () => setGeneration((g) => g + 1)
        canvas.addEventListener("webglcontextlost", onLost)
        canvas.addEventListener("webglcontextrestored", onRestored)

        let clock = 0
        let due = 0
        let last = -1
        let mx = 0.5
        let my = 0.5
        let tx = 0.5
        let ty = 0.5
        let hov = 0
        let frames = 0
        let drawnEma = 16.7
        let minGap = 1e9
        let slow = 0
        let fast = 0
        let scheduled = false
        let rectLeft = 0
        let rectTop = 0
        let rectW = 1
        let rectH = 1

        function wake() {
            if (disposed || scheduled) return
            scheduled = true
            raf = requestAnimationFrame(loop)
        }
        wakeRef.current = wake

        function loop(now: number) {
            scheduled = false
            if (disposed || !visible || document.hidden) {
                last = -1
                return
            }
            const c = cfgRef.current
            const adv = c.adv
            const rate = (clampN(c.speed, 0, 100, DEFAULTS.speed) / 50) * (reduced ? 0.25 : 1)
            const hoverAmt = clampN(c.hover, 0, 100, DEFAULTS.hover) / 50
            const easing = Math.abs(hov - over) > 0.002 || Math.abs(mx - tx) + Math.abs(my - ty) > 1e-4
            const animating = rate > 0 || easing || moved

            // Pace with an accumulator so 120/144/165 Hz screens draw at 60, not 48-55.
            if (last >= 0 && now < due - 3) {
                wake()
                return
            }
            if (last >= 0) {
                const gapMs = now - last
                minGap = Math.min(minGap * 1.001, gapMs)
                drawnEma += (gapMs - drawnEma) * 0.1
                // Judged against the display's own cadence: Framer's canvas often ticks at 30 Hz.
                const target = Math.max(1000 / 60, minGap) * 1.5
                if (++frames > 30) {
                    if (drawnEma > target) slow++
                    else slow = 0
                    if (drawnEma < target * 0.75) fast++
                    else fast = 0
                    if (slow > 30 && quality > 0.6) {
                        quality = Math.max(0.6, quality * 0.88)
                        slow = 0
                        applySize()
                    } else if (fast > 150 && quality < 1) {
                        quality = Math.min(1, quality * 1.08)
                        fast = 0
                        applySize()
                    }
                }
            }
            due = last < 0 ? now + 1000 / 60 : Math.max(due + 1000 / 60, now - 1000 / 60)
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now

            if (moved || frames % 30 === 0) {
                // Normalised against the box as displayed, so zoomed canvases and scaled previews stay exact.
                const r = root.getBoundingClientRect()
                rectLeft = r.left
                rectTop = r.top
                rectW = Math.max(1, r.width)
                rectH = Math.max(1, r.height)
                const s = rectW / cssW
                if (Math.abs(s - shown) > 0.02) {
                    shown = s
                    applySize()
                }
            }
            if (moved) {
                tx = (px - rectLeft) / rectW
                ty = 1 - (py - rectTop) / rectH
                moved = false
            }
            // Follow, don't trail: ~50 ms ease on the spot under the cursor.
            const k = dt > 0 ? 1 - Math.exp(-dt / 0.05) : 1
            mx += (tx - mx) * k
            my += (ty - my) * k
            hov += (over - hov) * k
            if (Math.abs(hov - over) < 0.002) hov = over

            clock = (clock + dt * rate) % 3600
            const cycles = 1000 / clampN(adv.cycleMs, 100, 10000, DEFAULT_ADVANCED.cycleMs)
            const base = (clampN(adv.phase, 0, 100, DEFAULT_ADVANCED.phase) / 100 + clock * cycles) % 1

            // Palette texture, rebuilt only when a stop colour changes.
            stops[0] = parseColor(c.background, [0.008, 0, 0.027, 1])
            stops[1] = parseColor(adv.indigoColor, [0.455, 0, 0.914, 1])
            stops[2] = parseColor(adv.purpleColor, [0.498, 0.012, 0.957, 1])
            stops[3] = parseColor(adv.violetColor, [0.682, 0.184, 0.612, 1])
            stops[4] = parseColor(adv.pinkColor, [0.886, 0.392, 0.196, 1])
            stops[5] = parseColor(c.accentColor, [0.976, 0.498, 0.016, 1])
            stops[6] = parseColor(adv.yellowColor, [0.98, 0.969, 0.008, 1])
            stops[7] = parseColor(adv.mintColor, [0.506, 0.976, 0.478, 1])
            stops[8] = parseColor(adv.cyanColor, [0.027, 0.965, 0.957, 1])
            stops[9] = parseColor(c.baseColor, [0.008, 0.82, 0.988, 1])
            stops[10] = parseColor(adv.blueColor, [0.008, 0.475, 0.961, 1])
            stops[11] = parseColor(adv.deepBlueColor, [0.008, 0.078, 0.188, 1])
            const pk = `${c.background}|${adv.indigoColor}|${adv.purpleColor}|${adv.violetColor}|${adv.pinkColor}|${c.accentColor}|${adv.yellowColor}|${adv.mintColor}|${adv.cyanColor}|${c.baseColor}|${adv.blueColor}|${adv.deepBlueColor}`
            if (pk !== palKey) {
                palKey = pk
                let j = 0
                for (let i = 0; i < PAL_N; i++) {
                    const t = (i + 0.5) / PAL_N
                    while (j < 11 && t >= POS[j + 1]) j++
                    const p0 = POS[j]
                    const p1 = j < 11 ? POS[j + 1] : 1
                    const f = (t - p0) / Math.max(1e-6, p1 - p0)
                    const a = stops[j]
                    const b = stops[(j + 1) % 12]
                    for (let ch = 0; ch < 3; ch++) palBytes[i * 4 + ch] = Math.round((a[ch] + (b[ch] - a[ch]) * f) * 255)
                    palBytes[i * 4 + 3] = 255
                }
                gl.activeTexture(gl.TEXTURE1)
                gl.bindTexture(gl.TEXTURE_2D, palTex)
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, PAL_N, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, palBytes)
            }

            const aspect = cssW / cssH
            const ang = clampN(c.pl.angle, -180, 180, 0) * D2R
            const tilt = clampN(c.pl.tilt, -75, 75, 0) * D2R
            const R = clampN(adv.radius, 20, 400, DEFAULT_ADVANCED.radius) / 1000
            const D = R + clampN(adv.gap, 0, 100, DEFAULT_ADVANCED.gap) / 2000
            const cxp = (clampN(adv.centerX, 0, 100, 50) / 100 - 0.5) * aspect
            const cyp = 0.5 - clampN(adv.centerY, 0, 100, 50) / 100
            // Contain: the 1200x800 composition always fits. Narrower frames shrink it to their width and
            // the field simply carries on above and below; wider frames keep it sized to the height.
            const fit = Math.min(1, aspect / REF_ASPECT)
            // Pointer lean: the design's centre leans toward the pointer, at most Pointer Pull of its height.
            const pull = (clampN(adv.pull, 0, 30, DEFAULT_ADVANCED.pull) / 100) * fit
            let lx = (mx - 0.5) * aspect - cxp
            let ly = my - 0.5 - cyp
            const lm = Math.hypot(lx, ly)
            const lk = (lm > 1e-6 ? Math.min(lm, pull) / lm : 0) * hov * hoverAmt
            lx = Math.round(lx * lk * 1e5) / 1e5
            ly = Math.round(ly * lk * 1e5) / 1e5
            const zoom = (clampN(c.scale, 10, 300, DEFAULTS.scale) / 100) * fit

            const setField = (u: ReturnType<typeof uniforms>) => {
                u.f1("uFAspect", aspect)
                u.f2("uCenter", cxp, cyp)
                u.f2("uLean", lx, ly)
                u.f2("uRot", Math.cos(ang), Math.sin(ang))
                u.f2("uTiltCS", Math.cos(tilt), Math.sin(tilt))
                u.f1("uZoom", zoom)
                u.f1("uR", R)
                u.f1("uD", D)
            }
            if (!direct && uf && fieldProg) {
                const key = `${canvas.width}x${canvas.height}|${aspect}|${cxp}|${cyp}|${lx}|${ly}|${ang}|${tilt}|${zoom}|${R}|${D}`
                if (key !== fieldKey) {
                    fieldKey = key
                    gl.useProgram(fieldProg)
                    setField(uf)
                    uf.f2("uFRes", fieldW(), fieldH())
                    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
                    gl.viewport(0, 0, fieldW(), fieldH())
                    gl.drawArrays(gl.TRIANGLES, 0, 3)
                    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
                }
            }

            gl.viewport(0, 0, canvas.width, canvas.height)
            gl.useProgram(compProg)
            setField(uc)
            if (!direct) {
                gl.activeTexture(gl.TEXTURE0)
                gl.bindTexture(gl.TEXTURE_2D, fieldTex)
                uc.i1("uField", 0)
            }
            uc.i1("uPal", 1)
            uc.f2("uRes", canvas.width, canvas.height)
            uc.f1("uAspect", aspect)
            uc.f1("uBase", base)
            uc.f2("uMouse", mx, my)
            uc.f1("uHover", hov * hoverAmt)
            uc.f1("uSwirl", clampN(adv.swirl, 0, 100, DEFAULT_ADVANCED.swirl) / 100)
            uc.f1("uPSize", (clampN(adv.pointerSize, 2, 100, DEFAULT_ADVANCED.pointerSize) / 100) * fit)
            uc.f1("uBands", clampN(c.bands, 25, 300, DEFAULTS.bands) / 100)
            uc.f1("uOutK", clampN(adv.fieldSpan, 0, 300, DEFAULT_ADVANCED.fieldSpan) / 100)
            uc.f1("uInK", clampN(adv.innerSpan, 0, 300, DEFAULT_ADVANCED.innerSpan) / 100)
            uc.f1("uInShift", clampN(adv.innerShift, -100, 100, 0) / 100)
            uc.f1("uInSkew", clampN(adv.innerSkew, -100, 100, 0) / 100)
            uc.f1("uHue", clampN(c.hue, 0, 360, 0) * D2R)
            const grain = clampN(adv.grain, 0, 100, 0) / 100
            uc.f1("uGrain", grain)
            uc.f1("uVig", clampN(adv.vignette, 0, 100, 0) / 100)
            uc.f1("uTime", clock)
            gl.drawArrays(gl.TRIANGLES, 0, 3)

            // Keep going while the colour pours or the pointer settles; a still scene stops drawing.
            if (animating) wake()
        }
        wake()

        return () => {
            disposed = true
            wakeRef.current = () => {}
            cancelAnimationFrame(raf)
            ro.disconnect()
            io.disconnect()
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerdown", onMove)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointerup", onUp)
            window.removeEventListener("scroll", onScroll, { capture: true })
            document.removeEventListener("visibilitychange", onVis)
            mq?.removeEventListener?.("change", onMq)
            canvas.removeEventListener("webglcontextlost", onLost)
            canvas.removeEventListener("webglcontextrestored", onRestored)
            // Objects from a lost context belong to nobody once it is restored.
            if (lost || gl.isContextLost()) return
            gl.deleteBuffer(buf)
            gl.deleteVertexArray(vao)
            gl.deleteTexture(palTex)
            if (fieldTex) gl.deleteTexture(fieldTex)
            if (fbo) gl.deleteFramebuffer(fbo)
            if (fieldProg) gl.deleteProgram(fieldProg)
            gl.deleteProgram(compProg)
        }
    }, [generation])

    return (
        <div
            ref={rootRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                // Only used when the parent leaves the height open; any sized frame is filled exactly.
                aspectRatio: "1200 / 800",
                ...style,
                overflow: "hidden",
                background,
                touchAction: "pan-y",
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
            />
        </div>
    )
}
