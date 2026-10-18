"use client"

import { useEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"

/* ------------------------------------------------------------------ *
 *  GrinIris
 *  A wet, glossy eyeball floating in the dark: pink-white sclera, a
 *  fibrous green iris under a clear cornea, and a white smiley painted
 *  on the cornea. It turns to look at the cursor.
 *
 *  Built after a still render of a smiley-iris eyeball (no source code,
 *  so this is a match to the picture, not a port). Every default below
 *  was measured off that image: sphere r 425px in a 1200px frame, iris
 *  r 203px gazing ~22deg right, pupil 0.30 of the iris, the smile's
 *  three points fitted to one circle.
 *
 *  One fragment shader, ray traced per pixel, orthographic:
 *
 *    1. two spheres - the eyeball (r 1) and a smaller corneal sphere
 *       whose cap bulges out past it over the iris. Whichever the view
 *       ray meets first is the surface; the cap can stand proud of the
 *       silhouette when the eye looks sideways, as a real one does.
 *    2. the cornea refracts (n 1.376) onto a recessed iris plane, so the
 *       iris slides under the glass with parallax as the eye turns
 *    3. the iris is procedural: radial fibres from noise stretched along
 *       the angle, a ragged brown collarette, a dark limbal ring
 *    4. the sclera is lit with per-channel wrap diffuse - red scatters
 *       further round the terminator than blue - which is what turns the
 *       shadow side that raw-meat red instead of grey
 *    5. both surfaces reflect a fixed studio (an overhead softbox, a
 *       window to the left, a back panel), so the highlights stay put
 *       while the ball turns under them. That is most of the realism.
 * ------------------------------------------------------------------ */

/* ----------------------------------------------------------- defaults */

const DEFAULTS = {
    background: "#000000",
    scale: 110,
    irisColor: "#FF2400",
    scleraColor: "#FFFFFF",
    pupilSize: 0,
    follow: "frame",
    reach: 10,
    dilate: 5.2,
    wander: 10,
    float: 10,
}

const DEFAULT_ADVANCED = {
    /** Where the eye looks with no cursor - the reference's own gaze */
    restX: 22,
    restY: 1,
    /** Hard limit on how far it turns toward the cursor */
    maxTurn: 42,
    /** Angular radius of the iris (limbus), seen from the eye's centre */
    irisAngle: 29,
    /** How far the cornea stands above the ball, % of its radius */
    bulge: 12,
    markColor: "#FFFFFF",
    collarColor: "#7A4A22",
    lightAngle: 0,
    gloss: 100,
    redness: 100,
    veins: 30,
    limbus: 75,
    fiber: 100,
    followMs: 45,
    saccadeMs: 2200,
    hippus: 30,
}

type Advanced = typeof DEFAULT_ADVANCED

/* -------------------------------------------------------------- types */

export interface GrinIrisProps {
    /** Sits behind the eye; the canvas composites over it */
    background?: string
    /** Size of the eye, in % of the reference's framing (100 = 71% of the frame's shorter side) */
    scale?: number
    /** Mid tone of the iris; fibres and shadows are derived from it */
    irisColor?: string
    /** Lit colour of the white of the eye */
    scleraColor?: string
    /** 0-10 resting pupil size */
    pupilSize?: number
    /** Follow the cursor anywhere on the page, only over the frame, or never */
    follow?: "page" | "frame" | "off"
    /** 0-10 how hard it turns toward the cursor */
    reach?: number
    /** 0-10 pupil reaction: widens as the cursor nears, snaps shut on press */
    dilate?: number
    /** 0-10 idle glances when nobody is pointing */
    wander?: number
    /** 0-10 slow bob of the whole ball */
    float?: number
    /** Tuning constants behind the look */
    advanced?: Partial<Advanced>
    style?: CSSProperties
}

/* ------------------------------------------------------------ shaders */

const VERT = `
attribute vec2 aPos;
void main() {
    gl_Position = vec4(aPos, 0.0, 1.0);
}
`

const FRAG = `
uniform vec2  uCenter;   // eye centre, device px
uniform float uRadius;   // eye radius, device px
uniform mat3  uRot;      // eye local -> view
uniform float uCosA;
uniform float uSinA;
uniform float uZc;       // corneal sphere centre, along the gaze axis
uniform float uRc;       // corneal sphere radius
uniform float uIrisZ;    // iris plane, along the gaze axis
uniform float uIrisR;
uniform float uPupil;    // pupil radius, share of the iris
uniform float uMark;
uniform vec3  uIris;
uniform vec3  uSclera;
uniform vec3  uMarkCol;
uniform vec3  uCollar;
uniform vec2  uLight;    // cos, sin of the studio's roll
uniform float uGloss;
uniform float uRed;
uniform float uVeins;
uniform float uLimbus;
uniform float uFiber;
uniform float uTime;

/* ------------------------------------------------------------- noise */

float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
}

float vnoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash13(i), hash13(i + vec3(1.0, 0.0, 0.0)), f.x),
                   mix(hash13(i + vec3(0.0, 1.0, 0.0)), hash13(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
               mix(mix(hash13(i + vec3(0.0, 0.0, 1.0)), hash13(i + vec3(1.0, 0.0, 1.0)), f.x),
                   mix(hash13(i + vec3(0.0, 1.0, 1.0)), hash13(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
}

/* ------------------------------------------------------------ studio */

// A rectangular light seen through a gnomonic projection, so its
// reflection keeps straight edges on the ball like a real softbox.
float box(vec3 R, vec3 d, vec3 up, vec2 hw, float soft) {
    float k = dot(R, d);
    if (k <= 0.0) return 0.0;
    vec3 rt = normalize(cross(up, d));
    vec3 u = cross(d, rt);
    vec2 uv = vec2(dot(R, rt), dot(R, u)) / k;
    vec2 e = smoothstep(hw + soft, hw - soft, abs(uv));
    return e.x * e.y;
}

vec3 roll(vec3 v) {
    return vec3(uLight.x * v.x - uLight.y * v.y, uLight.y * v.x + uLight.x * v.y, v.z);
}

vec3 env(vec3 R) {
    vec3 c = vec3(0.0);
    // overhead softbox, a little right and behind - the big top-right
    // highlight in the reference sits where this reflects
    c += vec3(1.0, 0.98, 0.97) * 16.0 *
         box(R, roll(normalize(vec3(0.40, 0.72, -0.55))), vec3(0.0, 0.0, 1.0), vec2(0.75, 0.75), 0.35);
    // tall window to the left: the vertical streaks down the left side
    c += vec3(1.0, 0.97, 0.95) * 9.0 *
         box(R, roll(normalize(vec3(-0.92, 0.05, 0.25))), vec3(0.0, 1.0, 0.0), vec2(0.22, 0.65), 0.10);
    // its lower pane, split by a mullion
    c += vec3(1.0, 0.95, 0.92) * 6.0 *
         box(R, roll(normalize(vec3(-0.80, -0.45, 0.10))), vec3(0.0, 1.0, 0.0), vec2(0.30, 0.18), 0.08);
    // back panel low left: the thin bright rim along the lower edge
    c += vec3(1.0, 0.9, 0.88) * 2.2 *
         box(R, roll(normalize(vec3(-0.45, -0.55, -0.70))), vec3(0.0, 1.0, 0.0), vec2(0.9, 0.35), 0.35);
    // dim room so no reflection ever reads as a hole
    c += vec3(0.05, 0.045, 0.045) * (0.4 + 0.6 * smoothstep(-0.4, 1.0, R.y));
    return c;
}

/* -------------------------------------------------------------- iris */

vec3 irisShade(vec2 q) {
    float r = length(q);
    float a = atan(q.y, q.x);
    vec2 cs = vec2(cos(a), sin(a));
    // a slow angular warp so the strands wave instead of ruling straight
    float w = (vnoise(vec3(cs * 5.0, r * 4.0)) - 0.5) * 0.06 +
              (vnoise(vec3(cs * 16.0, r * 10.0)) - 0.5) * 0.025;
    vec2 cw = vec2(cos(a + w), sin(a + w));
    // stretched along the angle: high frequency around, low along the
    // radius, which is what draws the fibres outward from the pupil
    float n1 = vnoise(vec3(cw * 9.0, r * 3.0 + 3.0));
    // threads are the zero crossings of two noises: thin bright lines
    // over a dark ground, which is how the reference's fibres read, not
    // as broad lit bundles
    float t1 = pow(1.0 - abs(vnoise(vec3(cw * 38.0, r * 3.0 + 9.0)) * 2.0 - 1.0), 5.0);
    float t2 = pow(1.0 - abs(vnoise(vec3(cw * 63.0, r * 5.0 + 1.7)) * 2.0 - 1.0), 6.0);
    // threads fade in and out along their length
    float run = smoothstep(0.25, 0.75, vnoise(vec3(cw * 20.0, r * 13.0 + 4.0)));
    float thr = clamp((t1 + t2 * 0.8) * (0.30 + 0.70 * run), 0.0, 1.0);

    vec3 dark = uIris * vec3(0.06, 0.10, 0.03);
    vec3 light = mix(uIris, vec3(0.80, 0.95, 0.30), 0.3) * 1.5;
    vec3 c = mix(dark, uIris * 0.8, smoothstep(0.2, 0.75, n1) * 0.35 + 0.05);
    c = mix(c, light, thr * uFiber);
    // crypts: dark pits between the bundles
    c *= 1.0 - 0.7 * smoothstep(0.68, 0.86, vnoise(vec3(cw * 16.0, r * 9.0 + 21.0))) * uFiber;
    float n2 = vnoise(vec3(cw * 30.0, r * 7.0 + 9.0));
    c = mix(mix(dark, uIris, 0.5), c, uFiber);

    // dark limbal ring at the rim of the iris
    c *= mix(1.0, 0.30, smoothstep(0.80, 1.0, r) * (0.5 + 0.5 * uLimbus));

    // collarette: a ragged brown ring flecked with red around the pupil
    float pr = uPupil;
    float cr = pr * (1.35 + 0.8 * (vnoise(vec3(cs * 6.0, 11.0)) - 0.5) +
                     0.45 * (n2 - 0.5));
    float collar = smoothstep(cr, cr - 0.07, r);
    vec3 cc = uCollar * (0.35 + 1.5 * n2);
    cc = mix(cc, vec3(0.50, 0.05, 0.03),
             smoothstep(0.62, 0.85, vnoise(vec3(cs * 23.0, r * 14.0))) * 0.8);
    c = mix(c, cc, collar * 0.85);

    // pupil, with a ruffled edge
    float jag = 0.03 * (vnoise(vec3(cs * 13.0, 2.0)) - 0.5);
    c *= mix(0.45, 1.0, smoothstep(pr, pr + 0.14, r));
    float pupil = smoothstep(pr + 0.012, pr - 0.012, r + jag);
    return mix(c, vec3(0.004), pupil);
}

/* -------------------------------------------------------------- mark */

float sdEllipse(vec2 p, vec2 ab) {
    return (length(p / ab) - 1.0) * min(ab.x, ab.y);
}

// Measured off the reference in iris radii, un-foreshortened.
float markSd(vec2 m) {
    float d = sdEllipse(m - vec2(-0.30, 0.50), vec2(0.18, 0.26));
    d = min(d, sdEllipse(m - vec2(0.355, 0.53), vec2(0.16, 0.30)));
    // smile: one circle through the three points of the drawn arc,
    // kept to its lower 204 degrees, round caps at both ends
    vec2 c = vec2(0.0905, -0.0839);
    float R = 0.772;
    vec2 v = m - c;
    vec2 mid = vec2(0.115, -0.993);
    float arc;
    if (dot(normalize(v), mid) > -0.208) {
        arc = abs(length(v) - R);
    } else {
        vec2 e1 = c + R * vec2(-0.9954, 0.0958);
        vec2 e2 = c + R * vec2(0.9475, 0.3198);
        arc = min(length(m - e1), length(m - e2));
    }
    return min(d, arc - 0.028);
}

/* ------------------------------------------------------------ sclera */

float veinLines(vec3 n, float f, float seed) {
    vec3 wq = n * f;
    wq += vec3(vnoise(wq * 0.5 + seed), vnoise(wq * 0.5 + seed + 7.1), vnoise(wq * 0.5 + seed + 3.3)) * 0.8;
    float v = vnoise(wq);
    return smoothstep(0.018, 0.0, abs(v - 0.5));
}

vec3 scleraAlbedo(vec3 nl) {
    vec3 a = uSclera;
    // veins run in from the back of the ball and fade before the limbus
    float away = smoothstep(uCosA - 0.06, uCosA - 0.55, nl.z);
    float big = veinLines(nl, 5.0, 0.0);
    float fine = veinLines(nl, 11.0, 17.0) * 0.6;
    float v = clamp(big + fine, 0.0, 1.0) * away * uVeins;
    a = mix(a, vec3(0.62, 0.07, 0.07), v * 0.75);
    // faint blotchy flush
    a *= mix(vec3(1.0), vec3(1.0, 0.82, 0.82), vnoise(nl * 3.0 + 5.0) * 0.5 * uRed);
    return a;
}

vec3 diffuse(vec3 n, vec3 albedo) {
    vec3 L = roll(normalize(vec3(0.50, 0.70, 0.55)));
    float ndl = dot(n, L);
    // per-channel wrap: red light scatters further round the terminator
    vec3 wrap = vec3(0.90, 0.50, 0.50) * (0.35 + 0.65 * uRed);
    vec3 d = clamp((ndl + wrap) / (1.0 + wrap), 0.0, 1.0);
    d *= d;
    float fill = max(0.0, dot(n, roll(normalize(vec3(-0.85, -0.15, 0.50)))));
    return albedo * (d * 1.55 + vec3(0.30, 0.16, 0.16) * fill + 0.03);
}

/* The soft grey ring round the iris. Applied to lit colour, not albedo:
   the lit sclera there is well past white, and darkening an albedo that
   then clips anyway leaves no ring at all. Pulled toward grey because
   that is the colour of the shadow in the reference, not a darker pink. */
vec3 limbShade(vec3 c, float k) {
    k = clamp(k, 0.0, 1.0);
    float g = dot(c, vec3(0.3, 0.5, 0.2));
    return mix(c, vec3(min(g, 1.2)) * 0.22, k);
}

/* -------------------------------------------------------------- main */

vec2 sphereHit(vec3 ro, vec3 rd, vec3 c, float r) {
    vec3 oc = ro - c;
    float b = dot(oc, rd);
    float h = b * b - (dot(oc, oc) - r * r);
    if (h < 0.0) return vec2(-1.0, h);
    return vec2(-b - sqrt(h), h);
}

float tone(float x) {
    return x < 0.8 ? x : 0.8 + 0.2 * (1.0 - exp(-(x - 0.8) / 0.2));
}

void main() {
    float px = 1.0 / uRadius;
    vec2 p = (gl_FragCoord.xy - uCenter) * px;

    vec3 ro = vec3(p, 4.0);
    vec3 rd = vec3(0.0, 0.0, -1.0);
    vec3 fwd = uRot * vec3(0.0, 0.0, 1.0);
    vec3 cc = fwd * uZc;

    vec2 hE = sphereHit(ro, rd, vec3(0.0), 1.0);
    vec2 hC = sphereHit(ro, rd, cc, uRc);
    vec3 PC = ro + rd * hC.x;
    bool capHit = hC.x > 0.0 && dot(PC, fwd) > uCosA;

    // coverage: the ball's disc, plus the corneal cap where it stands
    // proud of it
    float cov = 1.0 - smoothstep(1.0 - px, 1.0 + px, length(p));
    vec2 dc = p - cc.xy;
    vec3 rimC = cc + vec3(normalize(dc + 1e-6) * uRc, 0.0);
    float capRim = smoothstep(uCosA - 0.01, uCosA + 0.01, dot(rimC, fwd));
    cov = max(cov, (1.0 - smoothstep(uRc - px, uRc + px, length(dc))) * capRim);
    if (cov <= 0.0) {
        gl_FragColor = vec4(0.0);
        return;
    }

    vec3 col;
    // the cap lies outside the ball, so where it is hit it is in front
    if (capHit) {
        /* ---------------------------------------------------- cornea */
        vec3 N = normalize(PC - cc);
        vec3 Pl = PC * uRot;
        vec3 rr = refract(rd, N, 1.0 / 1.376);
        vec3 rl = rr * uRot;
        float t = (uIrisZ - Pl.z) / min(rl.z, -1e-3);
        // the iris stops a little short of the limbus; the band between
        // is where the limbal shadow shows through the cornea
        vec2 q = (Pl.xy + rl.xy * t) / (uIrisR * 0.95);
        float rq = length(q);

        vec3 ir = irisShade(q);
        // the iris sits in the eye's own shadow: lit from the gaze side
        float il = 0.75 + 0.5 * max(0.0, dot(fwd, roll(normalize(vec3(0.30, 0.75, 0.60)))));
        // the recess shades the top of the iris, as in the reference
        ir *= il * (0.78 + 0.22 * smoothstep(0.9, -0.4, q.y));
        // beyond the iris the refracted ray lands on sclera
        vec3 under = diffuse(normalize(fwd + uRot * vec3(q * uIrisR, 0.0)), scleraAlbedo(vec3(q * uSinA, uCosA)));
        vec3 base = mix(ir, under, smoothstep(0.97, 1.06, rq));
        // the soft grey limbal shadow straddling the iris edge
        float lr = (rq - 1.03) / 0.10;
        // and the cornea's own rim, which overhangs the sclera's shadow
        float rim = length(Pl.xy) / uSinA;
        float lc = (rim - 1.0) / 0.10;
        base = limbShade(base, uLimbus * max(exp(-lr * lr), exp(-lc * lc)));

        if (uMark > 0.5) {
            float sd = markSd(Pl.xy / uSinA);
            float aa = px / uSinA * 1.5;
            float m = smoothstep(aa, -aa, sd);
            // paint, not tissue: barely shaded, so it reads flat white
            vec3 mk = uMarkCol * (0.92 + 0.15 * max(0.0, N.y));
            base = mix(base, mk, m);
        }

        float ndv = max(0.0, N.z);
        float F = 0.025 + 0.975 * pow(1.0 - ndv, 5.0);
        col = base * (1.0 - F) + env(reflect(rd, N)) * F * uGloss * 1.4;
    } else {
        /* ---------------------------------------------------- sclera */
        vec3 P = ro + rd * max(hE.x, 0.0);
        // at the silhouette the hit misses by a fraction of a pixel
        if (hE.x < 0.0) P = vec3(normalize(p) * 0.999, 0.03);
        vec3 N = normalize(P);
        vec3 nl = N * uRot;
        col = diffuse(N, scleraAlbedo(nl));
        // limbal shadow just outside the cap
        float lg = (uCosA - nl.z) / 0.06;
        col = limbShade(col, uLimbus * exp(-lg * lg));
        // grazing view looks deep through wet tissue: darker and redder
        float graze = pow(1.0 - clamp(N.z, 0.0, 1.0), 3.0);
        col *= mix(vec3(1.0), vec3(0.62, 0.24, 0.23), graze * 0.9 * uRed);
        float F = 0.04 + 0.96 * pow(1.0 - clamp(N.z, 0.0, 1.0), 5.0);
        col += env(reflect(rd, N)) * F * uGloss;
    }

    col = vec3(tone(col.r), tone(col.g), tone(col.b));
    col = pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2));
    col += (hash13(vec3(gl_FragCoord.xy, uTime)) - 0.5) / 255.0;
    gl_FragColor = vec4(col * cov, cov);
}
`

/* ------------------------------------------------------------- helpers */

let parseCtx: CanvasRenderingContext2D | null | undefined

/** CSS colour string -> normalised sRGB triple. */
function toRGB(css: string): [number, number, number] {
    if (!css) return [0, 0, 0]
    const s = css.trim()
    const hex = /^#([0-9a-f]{3,8})$/i.exec(s)
    if (hex) {
        let h = hex[1]
        if (h.length === 3 || h.length === 4) {
            h = h
                .split("")
                .map((c) => c + c)
                .join("")
        }
        const n = parseInt(h.slice(0, 6), 16)
        return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
    }
    const fn = /^rgba?\(([^)]+)\)$/i.exec(s)
    if (fn) {
        const v = fn[1]
            .split(/[\s,/]+/)
            .filter(Boolean)
            .slice(0, 3)
            .map((x) => (x.indexOf("%") >= 0 ? parseFloat(x) * 2.55 : parseFloat(x)))
        return [(v[0] || 0) / 255, (v[1] || 0) / 255, (v[2] || 0) / 255]
    }
    // named colours, hsl(), oklch() ... let the browser resolve it
    if (typeof document !== "undefined") {
        if (parseCtx === undefined) parseCtx = document.createElement("canvas").getContext("2d")
        if (parseCtx) {
            parseCtx.fillStyle = "#000000"
            parseCtx.fillStyle = s
            const out = parseCtx.fillStyle
            if (typeof out === "string" && out.charAt(0) === "#" && out !== s) return toRGB(out)
        }
    }
    return [0, 0, 0]
}

/** sRGB -> linear, the shader lights in linear space */
function lin(css: string): [number, number, number] {
    const c = toRGB(css)
    return [Math.pow(c[0], 2.2), Math.pow(c[1], 2.2), Math.pow(c[2], 2.2)]
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        gl.deleteShader(sh)
        return null
    }
    return sh
}

const DEG = Math.PI / 180
/** Eye diameter at Scale 100, as a share of the frame's shorter side - measured off the reference (850px in 1200). */
const FIT = 0.71
const DPR_CAP = 2

/* ----------------------------------------------------------- component */

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 1200
 */
export default function GrinIris({
    background = DEFAULTS.background,
    scale = DEFAULTS.scale,
    irisColor = DEFAULTS.irisColor,
    scleraColor = DEFAULTS.scleraColor,
    pupilSize = DEFAULTS.pupilSize,
    follow = DEFAULTS.follow,
    reach = DEFAULTS.reach,
    dilate = DEFAULTS.dilate,
    wander = DEFAULTS.wander,
    float = DEFAULTS.float,
    advanced = {"bulge":12,"fiber":100,"gloss":100,"restX":22,"restY":1,"veins":30,"hippus":30,"limbus":75,"maxTurn":42,"redness":100,"followMs":45,"irisAngle":29,"markColor":"#FFFFFF","saccadeMs":2200,"lightAngle":0,"collarColor":"#7A4A22"},
    style,
}: GrinIrisProps) {
    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [failed, setFailed] = useState(false)

    // Live prop mirror: the render loop reads this, so a control change
    // never tears down the GL context.
    const propsRef = useRef({
        scale,
        irisColor,
        scleraColor,
        pupilSize,
        follow,
        reach,
        dilate,
        wander,
        float,
        adv: { ...DEFAULT_ADVANCED, ...advanced },
    })
    propsRef.current = {
        scale,
        irisColor,
        scleraColor,
        pupilSize,
        follow,
        reach,
        dilate,
        wander,
        float,
        adv: { ...DEFAULT_ADVANCED, ...advanced },
    }

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return

        let disposed = false
        let raf = 0
        let gl: WebGLRenderingContext | null = null
        let program: WebGLProgram | null = null
        let buffer: WebGLBuffer | null = null
        let uni: Record<string, WebGLUniformLocation | null> = {}
        let onScreen = true
        let pageVisible = true
        let reduceMotion = false
        let dpr = 1

        // Pointer as a 0-1 share of the frame (may run past it in page
        // mode), measured against the box as displayed.
        const pointer = { u: 0.5, v: 0.5, active: false, down: false }

        // gaze and pupil state, eased every frame
        let yaw = DEFAULT_ADVANCED.restX * DEG
        let pitch = DEFAULT_ADVANCED.restY * DEG
        let glanceX = 0
        let glanceY = 0
        let nextGlance = 1.2
        let pupil = 1
        let flash = 0
        let clock = 0
        let lastNow = 0

        /* ------------------------------------------------------ setup */

        function init(): boolean {
            const ctx = canvas!.getContext("webgl", {
                alpha: true,
                antialias: false,
                premultipliedAlpha: true,
            }) as WebGLRenderingContext | null
            if (!ctx) return false
            gl = ctx
            const hp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)
            const prelude = "precision " + (hp && hp.precision > 0 ? "highp" : "mediump") + " float;\n"
            const vs = compile(gl, gl.VERTEX_SHADER, VERT)
            const fs = compile(gl, gl.FRAGMENT_SHADER, prelude + FRAG)
            if (!vs || !fs) return false
            const prog = gl.createProgram()
            if (!prog) return false
            gl.attachShader(prog, vs)
            gl.attachShader(prog, fs)
            gl.bindAttribLocation(prog, 0, "aPos")
            gl.linkProgram(prog)
            gl.deleteShader(vs)
            gl.deleteShader(fs)
            if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false
            program = prog
            gl.useProgram(prog)

            buffer = gl.createBuffer()
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
            gl.enableVertexAttribArray(0)
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

            uni = {}
            for (const n of [
                "uCenter", "uRadius", "uRot", "uCosA", "uSinA", "uZc", "uRc", "uIrisZ", "uIrisR",
                "uPupil", "uMark", "uIris", "uSclera", "uMarkCol", "uCollar", "uLight", "uGloss",
                "uRed", "uVeins", "uLimbus", "uFiber", "uTime",
            ])
                uni[n] = gl.getUniformLocation(prog, n)
            gl.clearColor(0, 0, 0, 0)
            return true
        }

        function resize() {
            if (!gl) return
            dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
            const w = Math.max(1, Math.round(host!.clientWidth * dpr))
            const h = Math.max(1, Math.round(host!.clientHeight * dpr))
            if (canvas!.width !== w || canvas!.height !== h) {
                canvas!.width = w
                canvas!.height = h
                gl.viewport(0, 0, w, h)
            }
        }

        /* ------------------------------------------------------ frame */

        function draw(dt: number) {
            if (!gl || !program) return
            const p = propsRef.current
            const a = p.adv
            const still = reduceMotion
            clock += dt

            const W = canvas!.width
            const H = canvas!.height
            const radius = FIT * (Math.max(1, p.scale) / 100) * Math.min(W, H) * 0.5
            const bob = still ? 0 : Math.sin(clock * 0.9) * p.float * 0.006
            const cx = W * 0.5
            const cy = H * 0.5 + bob * radius

            /* gaze target */
            let tx = a.restX * DEG
            let ty = a.restY * DEG
            const following = p.follow !== "off" && pointer.active && p.reach > 0
            if (following) {
                // cursor in eye radii, on a plane D radii in front of the
                // eye: nearer plane = harder turn
                const dx = (pointer.u * W - cx) / radius
                const dy = -(pointer.v * H - cy) / radius
                const D = 17 / p.reach
                const lim = a.maxTurn * DEG
                tx = Math.max(-lim, Math.min(lim, Math.atan2(dx, D)))
                ty = Math.max(-lim, Math.min(lim, Math.atan2(dy, Math.hypot(dx, D))))
            } else if (!still && p.wander > 0) {
                // idle glances: hold, then jump - eyes saccade, they never glide
                nextGlance -= dt
                if (nextGlance <= 0) {
                    const amp = p.wander * 2.2 * DEG
                    const home = Math.random() < 0.4
                    glanceX = home ? 0 : (Math.random() * 2 - 1) * amp
                    glanceY = home ? 0 : (Math.random() * 2 - 1) * amp * 0.6
                    nextGlance = (a.saccadeMs / 1000) * (0.45 + Math.random() * 1.1)
                }
                tx += glanceX
                ty += glanceY
            }
            // fixational tremor, a few hundredths of a degree
            if (!still) {
                tx += Math.sin(clock * 37.0) * 0.05 * DEG + Math.sin(clock * 23.0) * 0.04 * DEG
                ty += Math.sin(clock * 31.0 + 1.0) * 0.05 * DEG
            }
            const k = 1 - Math.exp(-dt / Math.max(0.005, a.followMs / 1000))
            yaw += (tx - yaw) * k
            pitch += (ty - pitch) * k

            /* pupil: snaps shut on press, widens slowly as the cursor nears */
            const react = p.dilate / 10
            if (pointer.down) flash = 1
            const near = following ? 1 : 0
            const want = 1 + react * 0.22 * near - react * 0.45 * flash
            // constriction is fast, re-opening slow, as in a real iris
            const pk = 1 - Math.exp(-dt / (want < pupil ? 0.12 : 0.9))
            pupil += (want - pupil) * pk
            flash = pointer.down ? 1 : Math.max(0, flash - dt * 2.2)
            const hippus = still ? 0 : (a.hippus / 100) * 0.03 * Math.sin(clock * 1.7) * Math.sin(clock * 0.53 + 2.0)
            const pupilR = Math.min(0.6, (0.13 + p.pupilSize * 0.035) * (pupil + hippus))

            /* rotation, local -> view: yaw about y, then pitch about x */
            const cyw = Math.cos(yaw), syw = Math.sin(yaw)
            const cp = Math.cos(pitch), sp = Math.sin(pitch)
            const rot = new Float32Array([
                cyw, 0, -syw, // column 0: local x
                -syw * sp, cp, -cyw * sp, // column 1: local y
                syw * cp, sp, cyw * cp, // column 2: local z (gaze)
            ])

            /* cornea geometry from the limbus angle and bulge */
            const A = Math.max(10, Math.min(45, a.irisAngle)) * DEG
            const sinA = Math.sin(A)
            const cosA = Math.cos(A)
            const apex = 1 + Math.max(0.01, a.bulge / 100)
            // sphere through the limbus circle and the apex
            const rc = (sinA * sinA + (apex - cosA) * (apex - cosA)) / (2 * (apex - cosA))
            const zc = apex - rc
            // the iris lies a little behind the limbus plane
            const irisZ = cosA - 0.04
            const irisR = Math.sqrt(1 - irisZ * irisZ)

            gl.useProgram(program)
            gl.uniform2f(uni.uCenter, cx, H - cy)
            gl.uniform1f(uni.uRadius, radius)
            gl.uniformMatrix3fv(uni.uRot, false, rot)
            gl.uniform1f(uni.uCosA, cosA)
            gl.uniform1f(uni.uSinA, sinA)
            gl.uniform1f(uni.uZc, zc)
            gl.uniform1f(uni.uRc, rc)
            gl.uniform1f(uni.uIrisZ, irisZ)
            gl.uniform1f(uni.uIrisR, irisR)
            gl.uniform1f(uni.uPupil, pupilR)
            gl.uniform1f(uni.uMark, 0)
            const ic = lin(p.irisColor)
            const sc = lin(p.scleraColor)
            const mc = lin(a.markColor)
            const cc = lin(a.collarColor)
            gl.uniform3f(uni.uIris, ic[0], ic[1], ic[2])
            gl.uniform3f(uni.uSclera, sc[0], sc[1], sc[2])
            gl.uniform3f(uni.uMarkCol, mc[0], mc[1], mc[2])
            gl.uniform3f(uni.uCollar, cc[0], cc[1], cc[2])
            gl.uniform2f(uni.uLight, Math.cos(a.lightAngle * DEG), Math.sin(a.lightAngle * DEG))
            gl.uniform1f(uni.uGloss, a.gloss / 100)
            gl.uniform1f(uni.uRed, a.redness / 100)
            gl.uniform1f(uni.uVeins, a.veins / 100)
            gl.uniform1f(uni.uLimbus, a.limbus / 100)
            gl.uniform1f(uni.uFiber, a.fiber / 100)
            gl.uniform1f(uni.uTime, clock % 100)

            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }

        function loop(now: number) {
            if (disposed) return
            raf = requestAnimationFrame(loop)
            if (!onScreen || !pageVisible) {
                lastNow = now
                return
            }
            const dt = lastNow ? Math.min((now - lastNow) / 1000, 0.05) : 0
            lastNow = now
            resize()
            draw(dt)
        }

        if (!init()) {
            setFailed(true)
            return
        }

        /* --------------------------------------------------- pointer */

        const place = (e: PointerEvent) => {
            const r = host.getBoundingClientRect()
            if (r.width <= 0 || r.height <= 0) return
            pointer.u = (e.clientX - r.left) / r.width
            pointer.v = (e.clientY - r.top) / r.height
        }
        const onRootMove = (e: PointerEvent) => {
            place(e)
            pointer.active = true
        }
        const onRootLeave = () => {
            if (propsRef.current.follow === "frame") pointer.active = false
            pointer.down = false
        }
        const onWinMove = (e: PointerEvent) => {
            if (propsRef.current.follow !== "page") return
            place(e)
            pointer.active = true
        }
        const onWinOut = (e: PointerEvent) => {
            // cursor left the window entirely
            if (!e.relatedTarget && propsRef.current.follow === "page") pointer.active = false
        }
        const onDown = (e: PointerEvent) => {
            place(e)
            pointer.active = true
            pointer.down = true
        }
        const onUp = (e: PointerEvent) => {
            pointer.down = false
            // a lifted finger ends the hover on touch
            if (e.pointerType === "touch") pointer.active = false
        }
        host.addEventListener("pointermove", onRootMove)
        host.addEventListener("pointerleave", onRootLeave)
        host.addEventListener("pointerdown", onDown)
        window.addEventListener("pointermove", onWinMove)
        window.addEventListener("pointerout", onWinOut)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        /* --------------------------------------------------- lifecycle */

        const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => resize()) : null
        if (ro) ro.observe(host)
        const io =
            typeof IntersectionObserver !== "undefined"
                ? new IntersectionObserver((en) => (onScreen = en.some((e) => e.isIntersecting)), {
                      rootMargin: "128px",
                  })
                : null
        if (io) io.observe(host)
        const onVisibility = () => (pageVisible = document.visibilityState !== "hidden")
        document.addEventListener("visibilitychange", onVisibility)
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
        reduceMotion = mq.matches
        const onMQ = (e: MediaQueryListEvent) => (reduceMotion = e.matches)
        mq.addEventListener("change", onMQ)

        const onLost = (e: Event) => {
            e.preventDefault()
            cancelAnimationFrame(raf)
        }
        const onRestored = () => {
            if (disposed) return
            lastNow = 0
            if (init()) raf = requestAnimationFrame(loop)
            else setFailed(true)
        }
        canvas.addEventListener("webglcontextlost", onLost)
        canvas.addEventListener("webglcontextrestored", onRestored)

        resize()
        raf = requestAnimationFrame(loop)

        return () => {
            disposed = true
            cancelAnimationFrame(raf)
            host.removeEventListener("pointermove", onRootMove)
            host.removeEventListener("pointerleave", onRootLeave)
            host.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointermove", onWinMove)
            window.removeEventListener("pointerout", onWinOut)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
            if (ro) ro.disconnect()
            if (io) io.disconnect()
            document.removeEventListener("visibilitychange", onVisibility)
            mq.removeEventListener("change", onMQ)
            canvas.removeEventListener("webglcontextlost", onLost)
            canvas.removeEventListener("webglcontextrestored", onRestored)
            if (gl) {
                if (buffer) gl.deleteBuffer(buffer)
                if (program) gl.deleteProgram(program)
                const lose = gl.getExtension("WEBGL_lose_context")
                if (lose) lose.loseContext()
            }
        }
    }, [])

    // Static stand-in for the rare no-WebGL case.
    const fallback: CSSProperties = failed
        ? {
              width: FIT * scale + "%",
              aspectRatio: "1",
              maxHeight: FIT * scale + "%",
              margin: "auto",
              borderRadius: "50%",
              background:
                  "radial-gradient(circle at 70% 50%, #000 0 6%, " +
                  irisColor +
                  " 7% 22%, transparent 23%), radial-gradient(circle at 40% 30%, #fff, " +
                  scleraColor +
                  " 45%, #7a2b2b 100%)",
          }
        : { display: "none" }

    return (
        <div
            ref={hostRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                display: "flex",
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
                    display: failed ? "none" : "block",
                }}
            />
            <div style={fallback} />
        </div>
    )
}

/* --------------------------------------------------- property controls */

const A = DEFAULT_ADVANCED
