"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const MAX_DPR = 1.75 // quality tier, not a design control (rule 10). Measured at
// 0.43x the frame cost of ChromeCells, which ships in this folder at the same
// cap, so the extra resolution is affordable — and hair is exactly the kind of
// high-frequency pattern that pays for it.

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
uniform float uPitch;
uniform float uWidth;
uniform float uClump;
uniform float uCurl;
uniform float uFlow;
uniform float uDepth;
uniform float uLightA;
uniform float uSheen;
uniform float uContrast;
uniform vec2  uPtr;
uniform float uReach;
uniform float uSwirl;

// Sin-free hashes. Three shells of three-octave noise with derivatives, plus
// the relief, tip, flicker and jitter fields, is around a hundred and ten
// lookups per pixel; a sin-based hash is ruinous at that count.
float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

// Value noise AND its exact derivative. The derivative is the whole point: it
// is the hair tangent, the strand pitch and the antialiasing width, all three.
vec3 noised(vec2 p) {
    vec2 i = floor(p);
    vec2 f = p - i;
    vec2 u  = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    float k1 = b - a;
    float k2 = c - a;
    float k3 = a - b - c + d;
    return vec3(a + k1 * u.x + k2 * u.y + k3 * u.x * u.y,
                du.x * (k1 + k3 * u.y),
                du.y * (k2 + k3 * u.x));
}

float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = p - i;
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
               mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm3(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 3; i++) {
        v += a * vnoise(p);
        p = p * 2.03 + vec2(23.1, 7.9);
        a *= 0.5;
    }
    return v / 0.875;
}

// Octaves are rotated so the tangent field has no axis preference — unrotated
// value noise makes the hairs lie along x and y and the pelt looks combed onto
// a grid. The rotation has to be carried into the DERIVATIVE too: with
// p_i = M_i * p_0, the gradient with respect to p_0 is transpose(M_i) * grad n.
// Mt accumulates that transpose. GLSL ES 1.00 has no transpose(), so both the
// map and its transpose are written out.
const float LAC = 2.07;
const float CO  = 0.73850;
const float SI  = 0.67430;

vec3 fbmd(vec2 p, float gain) {
    mat2 A  = LAC * mat2(CO,  SI, -SI, CO);
    mat2 At = LAC * mat2(CO, -SI,  SI, CO);
    mat2 Mt = mat2(1.0, 0.0, 0.0, 1.0);
    vec3 s = vec3(0.0);
    float a = 1.0;
    float norm = 0.0;
    for (int i = 0; i < 3; i++) {
        vec3 n = noised(p);
        s.x  += a * n.x;
        s.yz += a * (Mt * n.yz);
        norm += a;
        p  = A * p + vec2(17.3, 9.7);
        Mt = Mt * At;
        a *= gain;
    }
    return s / norm;
}

void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    float aspect = uRes.x / uRes.y;
    vec2 q = (uv - 0.5) * vec2(aspect, 1.0) * 3.0;
    float px    = 3.0 / uRes.y;              // world units per DEVICE pixel
    float pxCss = px * max(uDpr, 1.0);       // world units per CSS pixel
    float t = uTime;
    float lam = uClump;                      // tuft size, world units

    // Pointer cowlick. Added to psi, so it is a circulation once curled, and it
    // also compresses the band spacing at its centre — the knot a real cowlick
    // has. One term for both, which is what the stream function buys.
    float r2i   = 1.0 / max(uReach * uReach, 1e-5);
    vec2  pd    = q - uPtr;
    float bump  = uSwirl * exp(-dot(pd, pd) * r2i);
    vec2  bumpG = bump * (-2.0 * r2i) * pd;

    // Tuft relief. It occludes the roots and tips each hair out of the image
    // plane, which is what stops the specular from being a flat function of
    // screen direction. It has to run at TUFT scale: at frame scale the same
    // occlusion paints smooth black blotches, and the reference's dark valleys
    // are striated black — you can still count hairs in them.
    float hgt = fbm3(q / (lam * 0.70) + vec2(t * 0.021, -t * 0.014));

    vec3 L = normalize(vec3(cos(uLightA) * 0.86, sin(uLightA) * 0.86, 0.51));
    vec2 dHat = vec2(cos(uFlow), sin(uFlow));

    vec3 col = uBg;

    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float dt = fi * 0.5;

        // The three shells are three different COATS, not one coat at three
        // brightnesses. A pelt is plush because a dense dim undercoat covers
        // everything and sparse bright guard hairs lie on top of it; three
        // copies of one coat leave voids of bare background between the tufts,
        // which is what read as wire rather than fur.
        float isU = step(dt, 0.25);
        float isG = step(0.75, dt);
        float isB = 1.0 - isU - isG;

        float pitchMul = 0.55 * isU + 0.85 * isB + 1.60 * isG;
        float widMul   = 1.60 * isU + 1.15 * isB + 1.05 * isG;
        float softMul  = 0.80 * isU + 0.50 * isB + 0.18 * isG;
        // Width ceiling, per shell. Where the field flattens the pitch grows and
        // the width clamp is what keeps a shell visible — but a GUARD hair that
        // fattens to five pixels stops being a hair and becomes an isolated
        // shiny ribbon. The undercoat may spread; the guard coat may not.
        float hwMax    = 5.00 * isU + 2.20 * isB + 1.10 * isG;
        // Each shell also gets its own tuft scale. Different pitches alone are
        // not enough: two shells crossing at a shallow angle whose LOCAL pitches
        // happen to sit in a stable ratio lock into a plaid patch, and the local
        // pitch follows |grad psi|, which follows the noise. Different lam means
        // different gradient statistics, so a coincidence stays a coincidence.
        float lamS     = lam * (0.85 * isU + 1.00 * isB + 1.30 * isG);
        // Depth separation, and Depth is exactly its exponent: 0 flattens every
        // shell to full strength, 1 ships the coat, 2 doubles the falloff. This
        // is what stops two shells crossing at a large local angle from reading
        // as PLAID — in real fur the front layer occludes the back, so a
        // crossing reads as depth. Three similarly bright crossing layers read
        // as a weave however small the nominal angle between them is, which is
        // why shrinking that angle never fixed it. Only the BODY shell takes the
        // big cut: the weave was between it and the guard coat, and the
        // undercoat is dense and soft enough that it never plaids — dimming that
        // one only costs the plush base every layer is seen against.
        float dimS     = 0.75 * isU + 0.45 * isB + 1.00 * isG;
        // Shells cross at real angles: isolines of one psi can never cross each
        // other, so a shell has exactly ONE hair direction at any point and a
        // stack of parallel shells is a corrugated surface, not a coat. The
        // nominal angle is small because the local tangent already deviates by
        // another twenty degrees or so either way; what keeps those crossings
        // from reading as plaid is dimS above, not this number.
        float ra = -0.10 * isB + 0.16 * isG;

        mat2  RS = mat2(cos(ra), sin(ra), -sin(ra), cos(ra));
        vec2  m  = RS * vec2(-dHat.y, dHat.x);
        vec2  qs = q + vec2(fi * 13.7, fi * 7.1)
                 + vec2(sin(t * 0.050 + fi) * 0.10, cos(t * 0.043 + fi * 1.7) * 0.10);

        // psi = LINEAR + noise. The linear term is the whole difference between
        // fur and a topographic map: isolines of a pure fbm close into loops,
        // and a coat of closed loops reads as an oil slick. With the linear term
        // DOMINANT the isolines run edge to edge and merely wander, and loops
        // survive only where the noise gradient beats it — the sparse rosettes
        // the reference actually has.
        //
        // Dominant is a measured claim, not a hopeful one, and it is the single
        // number this component is most sensitive to. grad psi = m + Curl * grad
        // fbm (the lam cancels, so Curl is exactly the tangent-deviation ratio
        // and is scale free), and the hair pitch is 1/(B |grad psi|). rms |grad
        // fbm| is 0.69 here, so at Curl 1.15 the noise term averages 0.79
        // against the unit linear term: 8.5% of the frame drops below |grad| =
        // 0.5, the pitch there runs past twice nominal, and a guard hair that
        // spread that far hits its width ceiling and paints an isolated shiny
        // ribbon. At Curl 0.60 that tail is 2.9%, while the tangent still
        // deviates 13.6 degrees on average and up to 139 in the tail — coherent
        // tufts with occasional sharp turns, which is what the reference is.
        // Deviation and pitch stability are the same knob; no scalar field can
        // give large direction change at constant |grad|, so the trade is real
        // and this is where it is set.
        vec3  ps  = fbmd(qs / lamS, 0.50);
        float psi = dot(qs, m) + uCurl * lamS * ps.x + bump;
        vec2  g   = m + uCurl * ps.yz + bumpG;

        vec2 T = dHat;
        float gl2 = dot(g, g);
        if (gl2 > 1e-12) T = vec2(g.y, -g.x) * inversesqrt(gl2);

        // ---- fine striation. This is a TEXTURE on the coat, not the coat.
        float pitchW = uPitch * pxCss * pitchMul;
        float B  = 1.0 / pitchW;
        // A slow lateral wander of the whole band family. Two jobs: hairs in one
        // shell are otherwise spaced EXACTLY evenly, which reads as combed, and
        // two evenly spaced shells crossing at a shallow angle lock into a plaid
        // patch wherever their local pitches sit in a stable ratio. Its own
        // gradient is about 2% of |grad b| here, so the distance estimate below
        // does not need correcting for it, and the drift is a third of a pitch
        // over seventy pixels — irregular spacing, not broken hairs.
        float bb = psi * B + 0.55 * (vnoise(qs / (lamS * 0.35)) - 0.5);
        float gb = max(length(g) * B, 1e-5);

        float pitchCss = 1.0 / (gb * pxCss);
        float pitchDev = 1.0 / (gb * px);

        float sid = floor(bb);
        float r1 = hash11(sid * 1.37 + fi * 57.3 + 11.7);
        float r2 = hash11(sid * 2.11 + fi * 13.9 + 4.3);

        // Tips and roots. The noise is offset by the STRAND's own hash, so
        // neighbouring hairs break in different places; a shared field would cut
        // one comb-straight seam across every hair at once.
        float br = smoothstep(0.38, 0.60, fbm3(qs / (lamS * 0.55) + vec2(r1 * 31.0, r2 * 27.0)));

        // Width is clamped in CSS PIXELS, and tapered by the same field that
        // dims a hair, so a hair fades to a point instead of stopping at full
        // gauge — the difference between a coat of hairs and a set of ruled
        // lines. Softness is a FRACTION of the half-width, floored at one device
        // pixel: an absolute blur radius that exceeds the half-width makes the
        // smoothstep never reach zero and the shell paints a continuous wash.
        float hw = clamp(pitchCss * 0.26 * uWidth * widMul * (0.55 + 0.90 * r1), 0.18, hwMax)
                 * (0.45 + 0.75 * br) * pxCss;
        float aa = max(0.70 * px, hw * softMul * (0.60 + 0.50 * uDepth));
        float stripe = 1.0 - smoothstep(hw - aa, hw + aa, abs((fract(bb) - 0.5) / gb));
        // Below about a device pixel of pitch the striation cannot be resolved.
        // Fading it toward a flat mid value, not toward zero, is what matters:
        // zeroing it leaves the bare tuft shading, and a smooth specular with no
        // texture on it is a wet blob. Unresolved hair should read as grey hair.
        stripe = mix(0.40, stripe, smoothstep(0.60, 1.60, pitchDev));
        // The other end of the same problem. Near a rosette |grad psi| collapses
        // and one isoline closes into a small loop, so a single hair spreads to
        // many times its nominal spacing and paints an isolated bright hook.
        // Fade a shell out once its own pitch runs far past nominal: a coat that
        // has thinned that much should read as thin, not as one fat ribbon.
        float pr = pitchCss / max(uPitch * pitchMul, 1e-3);
        stripe *= mix(1.0, 0.08, smoothstep(1.6, 3.2, pr));
        // Per-hair sparkle, skewed so a few hairs blaze. Neighbouring hairs have
        // to differ by more than the shading varies across them, or the eye
        // integrates them into one corrugated sheet.
        stripe *= mix(0.55 + 0.60 * r2, 0.20 + 1.55 * r2 * r2, dt);

        // ---- clump shading. Smooth at the TUFT scale, and this carries the
        // whole tonal composition: Kajiya-Kay sin(T,L) with T coherent over a
        // tuft is why whole clumps go silver and the ones beside them go black.
        float tilt = (hgt - 0.5) * 1.70;
        vec3  T3   = vec3(T * cos(tilt), sin(tilt));
        float TL   = dot(T3, L);
        float sTL  = sqrt(max(1.0 - TL * TL, 0.0));
        float spec = pow(sTL, mix(2.0, 30.0, clamp(uSheen * 0.5, 0.0, 1.0)));
        float occ  = 0.30 + 0.85 * smoothstep(0.16, 0.80, hgt);
        // Where the isolines crowd, hairs converge into a cowlick and shadow
        // each other. Without this the crowded cores keep full specular with no
        // striation left on them and read as wet plastic droplets — the one
        // artefact that survived every earlier pass.
        occ *= mix(0.32, 1.0, smoothstep(0.50, 1.80, pitchDev));

        float clump = (mix(0.90, 0.40, dt) * sTL
                     + mix(0.45, 1.85, dt) * spec
                     + mix(0.18, 0.05, dt)) * occ;

        // Fine flicker along each hair, one octave at roughly fifteen pixels.
        // Without it every hair carries a smoothly varying specular and the coat
        // reads as poured liquid however fine the strands get. Offset by the
        // strand hash so it does not line up across neighbours.
        float fv = vnoise(qs / (lamS * 0.055) + vec2(r1 * 53.0, r2 * 41.0));
        clump *= mix(0.90 + 0.20 * fv, 0.45 + 0.90 * fv, dt);

        // The stripe MODULATES the clump, it does not gate it: between two guard
        // hairs there is still coat. baseFrac is how much light survives between
        // hairs — high in the undercoat (a haze), near zero in the guard coat
        // (discrete strands).
        float baseFrac = mix(0.60, 0.14, dt);
        float v = clump * (baseFrac + (1.0 - baseFrac) * stripe);
        v = pow(clamp(v, 0.0, 2.2), uContrast) * pow(dimS, uDepth);

        // Coverage per shell: the undercoat all but covers the frame, the body
        // coat is patchy at tuft scale, the guard coat is only where its hairs
        // are. The undercoat deliberately stops SHORT of 1.0 in the deepest
        // partings — a coat that covers exactly everything paints over the clear
        // colour, and Background then maps to nothing at all (rule 1). Letting
        // the parting floor show is also what real fur does.
        float cov = isU * (0.55 + 0.45 * smoothstep(0.05, 0.80, hgt))
                  + isB * (0.20 + 0.80 * br)
                  + isG * (stripe * (0.30 + 0.70 * br));

        vec3 sc = mix(uBase, uAccent, clamp(v * 0.80, 0.0, 1.0)) * clamp(v, 0.0, 1.35);
        col = mix(col, sc, clamp(cov, 0.0, 1.0));
    }

    // Always-on dither, no control (rule 11a). A near-black field with hair
    // gradients a couple of pixels wide bands hard at eight bits; this is one
    // bit of noise per CSS pixel and is not a Grain effect.
    vec2 gp = floor(gl_FragCoord.xy / max(uDpr, 1.0));
    col += (hash21(gp) - 0.5) * (1.6 / 255.0);

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

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
    // ControlType.Color also emits rgb()/rgba()/hsl(); a hex-only parse makes
    // the colour dials look dead the moment a designer uses the alpha slider.
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

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("FurPelt shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

type FurGroup = { clump?: number; curl?: number; flow?: number; depth?: number }
type LightGroup = { angle?: number; sheen?: number; contrast?: number }
type CursorGroup = { reach?: number; swirl?: number }

// Typed so an omitted field is a type error rather than an undefined that
// reaches arithmetic and turns the whole frame NaN.
const D_FUR: Required<FurGroup> = { clump: 100, curl: 100, flow: 158, depth: 100 }
const D_LIGHT: Required<LightGroup> = { angle: 24, sheen: 100, contrast: 115 }
const D_CURSOR: Required<CursorGroup> = { reach: 34, swirl: 55 }

interface FurPeltProps {
    style?: React.CSSProperties
    background?: string
    baseColor?: string
    accentColor?: string
    density?: number
    thickness?: number
    speed?: number
    fur?: FurGroup
    light?: LightGroup
    cursor?: CursorGroup
    width?: number
    height?: number
}

export default function FurPelt(props: FurPeltProps) {
    const {
        style,
        background = "#000000",
        baseColor = "#EB00FF",
        accentColor = "#FFFFFF",
        density = 20,
        thickness = 300,
        speed = 100,
        fur,
        light,
        cursor,
        width,
        height,
    } = props

    // Spread-merge over a typed default, never a hand-written ?? chain: one
    // missed key in a chain silently pins a control forever.
    const F = { ...D_FUR, ...(fur ?? {}) }
    const G = { ...D_LIGHT, ...(light ?? {}) }
    const C = { ...D_CURSOR, ...(cursor ?? {}) }

    const canvasRef = useRef<HTMLCanvasElement>(null)

    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    const vRef = useRef({
        bg: [0, 0, 0] as [number, number, number],
        base: [0, 0, 0] as [number, number, number],
        accent: [0, 0, 0] as [number, number, number],
        pitch: 2.6,
        widthMul: 1,
        clump: 0.80,
        curl: 0.60,
        flow: 2.76,
        depth: 1,
        angle: 0.42,
        sheen: 1,
        contrast: 1.15,
        speed: 1,
        reach: 0.31,
        swirl: 0.3,
    })
    vRef.current = {
        bg: parseColor(background, [0, 0, 0]),
        base: parseColor(baseColor, [0.431, 0.443, 0.463]),
        accent: parseColor(accentColor, [1, 1, 1]),
        // Pitch is the hair spacing in CSS px, so Density is a real density:
        // 100% is 2.6px between hairs. Floored so 300% cannot drive the pitch
        // under a pixel — past the floor the dial saturates into a haze rather
        // than aliasing into grey.
        pitch: Math.max(1.3, 2.6 * (100 / Math.max(1, num(density, 100)))),
        widthMul: num(thickness, 100) / 100,
        clump: 0.80 * (num(F.clump, 100) / 100),
        curl: 0.60 * (num(F.curl, 100) / 100),
        flow: (num(F.flow, 158) * Math.PI) / 180,
        depth: num(F.depth, 100) / 100,
        angle: (num(G.angle, 24) * Math.PI) / 180,
        sheen: num(G.sheen, 100) / 100,
        contrast: num(G.contrast, 115) / 100,
        speed: num(speed, 50) / 50,
        reach: (num(C.reach, 34) / 100) * 0.9,
        swirl: (num(C.swirl, 55) / 100) * 0.55,
    }

    const ptrRef = useRef({ x: 0, y: 0, nx: 0.5, ny: 0.5, on: 0, onTarget: 0 })

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false })
        if (!gl) {
            console.error("FurPelt: WebGL unavailable")
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
            console.error("FurPelt link:", gl.getProgramInfoLog(prog))
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
            pitch: gl.getUniformLocation(prog, "uPitch"),
            width: gl.getUniformLocation(prog, "uWidth"),
            clump: gl.getUniformLocation(prog, "uClump"),
            curl: gl.getUniformLocation(prog, "uCurl"),
            flow: gl.getUniformLocation(prog, "uFlow"),
            depth: gl.getUniformLocation(prog, "uDepth"),
            lightA: gl.getUniformLocation(prog, "uLightA"),
            sheen: gl.getUniformLocation(prog, "uSheen"),
            contrast: gl.getUniformLocation(prog, "uContrast"),
            ptr: gl.getUniformLocation(prog, "uPtr"),
            reach: gl.getUniformLocation(prog, "uReach"),
            swirl: gl.getUniformLocation(prog, "uSwirl"),
        }

        let raf = 0
        let last = performance.now()
        let clock = 0

        const render = (now: number) => {
            const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
            last = now
            const v = vRef.current
            clock = (clock + dt * v.speed) % 7200

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

            const aspect = bw / bh
            const p = ptrRef.current
            const k = 1 - Math.exp(-5 * dt)
            p.on += (p.onTarget - p.on) * k

            // Idle drift when there is no pointer — the Framer canvas never
            // delivers one, so the cowlick has to wander on its own there.
            const idleX = Math.sin(clock * 0.17) * 0.34
            const idleY = Math.cos(clock * 0.13) * 0.26
            const aimX = (p.nx - 0.5) * p.on + idleX * (1 - p.on)
            const aimY = (p.ny - 0.5) * p.on + idleY * (1 - p.on)
            p.x += (aimX * aspect * 3.0 - p.x) * k
            p.y += (aimY * 3.0 - p.y) * k

            gl.uniform2f(u.res, bw, bh)
            gl.uniform1f(u.time, clock)
            gl.uniform1f(u.dpr, dpr)
            gl.uniform3f(u.bg, v.bg[0], v.bg[1], v.bg[2])
            gl.uniform3f(u.base, v.base[0], v.base[1], v.base[2])
            gl.uniform3f(u.accent, v.accent[0], v.accent[1], v.accent[2])
            gl.uniform1f(u.pitch, v.pitch)
            gl.uniform1f(u.width, v.widthMul)
            gl.uniform1f(u.clump, v.clump)
            gl.uniform1f(u.curl, v.curl)
            gl.uniform1f(u.flow, v.flow)
            gl.uniform1f(u.depth, v.depth)
            gl.uniform1f(u.lightA, v.angle)
            gl.uniform1f(u.sheen, v.sheen)
            gl.uniform1f(u.contrast, v.contrast)
            gl.uniform2f(u.ptr, p.x, p.y)
            gl.uniform1f(u.reach, v.reach)
            gl.uniform1f(u.swirl, v.swirl)

            gl.drawArrays(gl.TRIANGLES, 0, 3)
            raf = requestAnimationFrame(render)
        }

        const onMove = (e: PointerEvent) => {
            // offsetWidth, not the rect alone: getBoundingClientRect carries the
            // Framer canvas zoom and the cowlick would sit off the pointer.
            const r = canvas.getBoundingClientRect()
            const ow = canvas.offsetWidth || 1
            const oh = canvas.offsetHeight || 1
            const sx = r.width > 0 ? ow / r.width : 1
            const sy = r.height > 0 ? oh / r.height : 1
            const p = ptrRef.current
            p.nx = ((e.clientX - r.left) * sx) / ow
            p.ny = 1 - ((e.clientY - r.top) * sy) / oh
        }
        const onEnter = () => {
            ptrRef.current.onTarget = 1
        }
        const onLeave = () => {
            ptrRef.current.onTarget = 0
        }

        canvas.addEventListener("pointermove", onMove)
        canvas.addEventListener("pointerenter", onEnter)
        canvas.addEventListener("pointerleave", onLeave)
        raf = requestAnimationFrame(render)

        return () => {
            cancelAnimationFrame(raf)
            canvas.removeEventListener("pointermove", onMove)
            canvas.removeEventListener("pointerenter", onEnter)
            canvas.removeEventListener("pointerleave", onLeave)
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
