"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/* --------------------------------------------------------------- constants */

const DPR_CAP = 2
/** Vertical field of view. */
const FOV = (50 * Math.PI) / 180
const NEAR = 0.1
const FAR = 100

/** Width / Height dials are in millimetres; one world unit is 100mm. */
const MM = 0.01

/** Depth band of the ordinary notes, world units from the camera. */
const Z_NEAR = 3.5
const Z_FAR = 24
/** The close note. */
const HERO_Z = 1.9

/** Grid resolution of one note. The curl needs the width; height barely bends. */
const SEG_X = 24
const SEG_Y = 8

/** Atlas: two faces of 1024 x (512 - 2*GUTTER). */
const ATLAS = 1024
const GUTTER = 16
/** Deepest mip level the atlas texture may sample. Past this level the atlas
 *  has minified so far that the gutter can no longer keep the front and back
 *  faces apart — one bleeds into the other, which reads as one note's image
 *  "intruding" into the note behind it. Clamped instead of letting the full
 *  mip chain generate. */
const MAX_MIP_LEVEL = 6

/* ------------------------------------------------------------------ colour */

type RGB = [number, number, number]

/**
 * Framer's Color control does NOT hand back hex — `rgb()`, `rgba()`, `hsl()`
 * and `var(--token, <fallback>)` all arrive, so parse every form.
 */
function parseColor(input: string | undefined, fb: RGB): RGB {
    if (!input) return fb
    let s = String(input).trim()
    const v = /^var\(\s*--[^,]+,\s*(.+)\)\s*$/i.exec(s)
    if (v) s = v[1].trim()

    if (s.charAt(0) === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4) {
            h =
                h.charAt(0) + h.charAt(0) +
                h.charAt(1) + h.charAt(1) +
                h.charAt(2) + h.charAt(2)
        }
        if (h.length < 6) return fb
        const n = parseInt(h.slice(0, 6), 16)
        if (!isFinite(n)) return fb
        return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
    }

    const m = /^(rgba?|hsla?)\(([^)]+)\)\s*$/i.exec(s)
    if (!m) return fb
    const parts = m[2].split(/[\s,/]+/).filter((x) => x.length > 0)
    if (parts.length < 3) return fb

    if (m[1].charAt(0).toLowerCase() === "r") {
        const ch = (t: string) =>
            t.indexOf("%") >= 0 ? (parseFloat(t) / 100) * 255 : parseFloat(t)
        const r = ch(parts[0]), g = ch(parts[1]), b = ch(parts[2])
        if (!isFinite(r) || !isFinite(g) || !isFinite(b)) return fb
        return [r / 255, g / 255, b / 255]
    }

    let hue = parseFloat(parts[0])
    if (parts[0].indexOf("turn") >= 0) hue *= 360
    else if (parts[0].indexOf("rad") >= 0) hue *= 180 / Math.PI
    const sat = parseFloat(parts[1]) / 100
    const lit = parseFloat(parts[2]) / 100
    if (!isFinite(hue) || !isFinite(sat) || !isFinite(lit)) return fb
    const c = (1 - Math.abs(2 * lit - 1)) * sat
    const hp = (((hue % 360) + 360) % 360) / 60
    const x = c * (1 - Math.abs((hp % 2) - 1))
    let r = 0, g = 0, b = 0
    if (hp < 1) { r = c; g = x } else if (hp < 2) { r = x; g = c }
    else if (hp < 3) { g = c; b = x } else if (hp < 4) { g = x; b = c }
    else if (hp < 5) { r = x; b = c } else { r = c; b = x }
    const mm = lit - c / 2
    return [r + mm, g + mm, b + mm]
}

/* ----------------------------------------------------------------- shaders */

const VERT = `#version 300 es
precision highp float;

layout(location = 0) in vec2 aUV;
layout(location = 1) in vec4 aSeed;
layout(location = 2) in float aHero;
layout(location = 3) in vec2 aOffset;

uniform float uTime;
uniform float uTumble;
uniform float uAspect;
uniform float uTanHalf;
uniform vec2 uSize;
uniform float uFlutter;
uniform float uSway;
uniform vec2 uPointer;
uniform float uInteract;

out vec2 vUV;
out vec3 vN;
out vec3 vPos;
out float vFog;

const float TAU = 6.2831853;

float h1(float s, float k) { return fract(sin(s * k + 1.7) * 43758.5453); }

mat3 axisAngle(vec3 a, float ang) {
    float s = sin(ang), c = cos(ang), oc = 1.0 - c;
    return mat3(
        oc * a.x * a.x + c,       oc * a.x * a.y + a.z * s, oc * a.z * a.x - a.y * s,
        oc * a.x * a.y - a.z * s, oc * a.y * a.y + c,       oc * a.y * a.z + a.x * s,
        oc * a.z * a.x + a.y * s, oc * a.y * a.z - a.x * s, oc * a.z * a.z + c);
}

// The note's surface in its own frame: width curled onto an arc of curvature
// k, plus a small travelling ripple along the width.
vec3 surf(vec2 uv, float k, float ph, float t) {
    vec2 p = (uv - 0.5) * uSize;
    float th = p.x * k;
    // Independent notes are never collision-checked against each other, so
    // two that happen to fall at nearly the same depth would otherwise have
    // their curl bulge alone be enough to push one's surface through the
    // other's — read as one image "colliding and penetrating" its neighbour.
    // Damping the z-push (while leaving the x curve alone) keeps the visible
    // bend but keeps each note thin enough in depth that overlapping notes
    // occlude cleanly instead of interleaving.
    vec3 q = vec3(sin(th) / k, p.y, (1.0 - cos(th)) / k * 0.35);
    q.z += uFlutter * 0.035 * uSize.x
        * sin(uv.x * 7.0 - t * 3.3 + ph * TAU) * (0.5 + 0.5 * uv.y);
    return q;
}

void main() {
    float s = aSeed.w;
    float hero = step(0.5, aHero);
    float t = uTime;
    float ph = h1(s, 12.9898);

    // Curvature, 1 / world. At the old 2.2 coefficient, full Flutter (100%)
    // already curled a note's edges 126 degrees apart, and the slider goes to
    // 200% — well past a half-turn, so the far edge folded back through the
    // note's own front face. That self-fold is what read as one image sitting
    // inside another. Capped so even 200% Flutter stays under a half-turn.
    float kAmp = uFlutter * 1.0 / max(uSize.x, 1e-3) * mix(1.0, 0.85, hero);
    float k = kAmp * (0.65 * sin(t * (0.9 + 0.8 * ph) + ph * TAU)
                   + 0.35 * sin(t * (1.7 + 0.6 * h1(s, 3.1)) + ph * 3.1))
            + 0.12 / max(uSize.x, 1e-3);
    k = (k >= 0.0 ? 1.0 : -1.0) * max(abs(k), 1e-3);

    // Orientation. Ordinary notes tumble about a random axis; the close note
    // only rocks, so it keeps showing its face as the reference's does.
    vec3 ax = normalize(vec3(h1(s, 7.3), h1(s, 5.1), h1(s, 9.7)) * 2.0 - 1.0 + vec3(1e-3));
    float dir = h1(s, 2.3) < 0.5 ? -1.0 : 1.0;
    float ang = ph * TAU + dir * uTumble * (0.6 + 0.9 * h1(s, 4.7));
    mat3 R = axisAngle(ax, ang);
    mat3 RH = axisAngle(vec3(1.0, 0.0, 0.0), -0.55 + 0.12 * sin(uTumble * 0.35))
            * axisAngle(vec3(0.0, 0.0, 1.0), -0.32 + 0.18 * sin(uTumble * 0.23 + 1.0))
            * axisAngle(vec3(0.0, 1.0, 0.0), 0.2 * sin(uTumble * 0.29));
    R = hero > 0.5 ? RH : R;

    vec3 q = surf(aUV, k, ph, t);
    float e = 0.01;
    vec3 du = surf(aUV + vec2(e, 0.0), k, ph, t) - q;
    vec3 dv = surf(aUV + vec2(0.0, e), k, ph, t) - q;
    vec3 n = R * normalize(cross(du, dv));

    // Placement at this note's depth.
    float z = mix(mix(Z_NEAR, Z_FAR, aSeed.z), HERO_Z, hero);
    float hh = z * uTanHalf;
    float hw = hh * uAspect;
    float margin = 0.6 * length(uSize) + 0.1;
    float rangeY = 2.0 * (hh + margin);
    float fall = mix(0.9 + 0.7 * h1(s, 8.8), 0.22, hero);
    float y = (hh + margin) - mod(aSeed.y * rangeY + fall * t, rangeY);
    float x = mix((aSeed.x * 2.0 - 1.0) * (hw + margin * 0.5), 0.12 * hw, hero)
            + uSway * 0.3 * uSize.x * sin(t * (0.45 + 0.5 * h1(s, 6.2)) + ph * TAU);

    // Pointer parallax: nearer notes shift more than the far layer.
    float depthScale = clamp(1.0 - (z - HERO_Z) / (Z_FAR - HERO_Z), 0.0, 1.0);
    x += uPointer.x * uInteract * (0.4 + 1.6 * depthScale);
    y += uPointer.y * uInteract * (0.25 + 0.9 * depthScale);

    // CPU-resolved collision correction: a per-instance push that keeps two
    // overlapping notes from occupying the same space, computed once a
    // frame on the CPU and streamed in as this extra attribute.
    x += aOffset.x;
    y += aOffset.y;

    vec3 pos = vec3(x, y, -z) + R * q;

    float f = 1.0 / uTanHalf;
    gl_Position = vec4(
        pos.x * f / uAspect,
        pos.y * f,
        (pos.z * (FAR_ + NEAR_) + 2.0 * FAR_ * NEAR_) / (NEAR_ - FAR_),
        -pos.z);

    vUV = aUV;
    vN = n;
    vPos = pos;
    vFog = smoothstep(8.0, Z_FAR + 2.0, z);
}
`
    .replace(/Z_NEAR/g, glf(Z_NEAR))
    .replace(/Z_FAR/g, glf(Z_FAR))
    .replace(/HERO_Z/g, glf(HERO_Z))
    .replace(/FAR_/g, glf(FAR))
    .replace(/NEAR_/g, glf(NEAR))

const FRAG = `#version 300 es
precision highp float;

in vec2 vUV;
in vec3 vN;
in vec3 vPos;
in float vFog;

uniform sampler2D uTex;
uniform vec3 uBase;
uniform vec3 uBg;
uniform float uGut;

out vec4 outColor;

void main() {
    bool front = gl_FrontFacing;
    // Mirror u on the back so a note seen from behind reads the right way.
    float u = front ? vUV.x : 1.0 - vUV.x;
    float faceV = uGut + (1.0 - vUV.y) * (0.5 - 2.0 * uGut);
    vec2 st = vec2(u, faceV + (front ? 0.0 : 0.5));
    vec3 tex = texture(uTex, st).rgb;

    vec3 n = normalize(vN);
    if (!front) n = -n;
    vec3 L = normalize(vec3(-0.35, 0.55, 0.75));
    vec3 V = normalize(-vPos);
    // Paper is thin: light from behind still glows through a little.
    float diff = max(dot(n, L), 0.0) + 0.25 * max(-dot(n, L), 0.0);
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(n, H), 0.0), 28.0) * 0.1;

    vec3 col = tex * uBase * (0.22 + 0.9 * diff) + spec;
    col = mix(col, uBg, vFog * 0.85);
    outColor = vec4(col, 1.0);
}
`

/** A JS number as a GLSL float literal — `String(4)` is an int in GLSL. */
function glf(n: number): string {
    const s = String(n)
    return s.indexOf(".") >= 0 || s.indexOf("e") >= 0 ? s : s + ".0"
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("MoneyRain shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

function buildProgram(gl: WebGL2RenderingContext) {
    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return null
    const p = gl.createProgram()
    if (!p) return null
    gl.attachShader(p, vs)
    gl.attachShader(p, fs)
    gl.linkProgram(p)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        console.error("MoneyRain link:", gl.getProgramInfoLog(p))
        return null
    }
    return p
}

/* ---------------------------------------------------------------- geometry */

function gridGeo() {
    const uv = new Float32Array((SEG_X + 1) * (SEG_Y + 1) * 2)
    let o = 0
    for (let j = 0; j <= SEG_Y; j++) {
        for (let i = 0; i <= SEG_X; i++) {
            uv[o++] = i / SEG_X
            uv[o++] = j / SEG_Y
        }
    }
    const idx = new Uint16Array(SEG_X * SEG_Y * 6)
    o = 0
    for (let j = 0; j < SEG_Y; j++) {
        for (let i = 0; i < SEG_X; i++) {
            const a = j * (SEG_X + 1) + i
            const b = a + 1
            const c = a + SEG_X + 1
            const d = c + 1
            // Counter-clockwise seen from local +z: that side is the front.
            idx[o++] = a; idx[o++] = b; idx[o++] = d
            idx[o++] = a; idx[o++] = d; idx[o++] = c
        }
    }
    return { uv, idx }
}

/**
 * Per-instance seeds. Position strata come from the R3 low-discrepancy
 * sequence (1/phi3, 1/phi3^2, 1/phi3^3), which fills x / fall phase / depth
 * without the clumps a plain random gives. Instance 0 is the close note.
 */
function seedData(count: number) {
    const g = 1.2207440846057596
    const a1 = 1 / g, a2 = 1 / (g * g), a3 = 1 / (g * g * g)
    const d = new Float32Array(count * 5)
    for (let i = 0; i < count; i++) {
        const o = i * 5
        d[o] = (0.5 + a1 * i) % 1
        d[o + 1] = (0.5 + a2 * i) % 1
        d[o + 2] = (0.5 + a3 * i) % 1
        // Normalised id: fract(sin) collapses at large arguments.
        d[o + 3] = ((i * 0.618034) % 1) * 0.97 + 0.013
        d[o + 4] = i === 0 ? 1 : 0
    }
    // The close note starts on screen rather than mid-wrap.
    d[1] = 0.35
    return d
}

function h1js(s: number, k: number): number {
    const v = Math.sin(s * k + 1.7) * 43758.5453
    return v - Math.floor(v)
}

/**
 * Mirrors the vertex shader's coarse x/y/z placement on the CPU — time and
 * seed only, no curl/ripple/tumble/sway/pointer — so the collision resolver
 * has a stable position to test overlap against every frame.
 */
function noteBase(i: number, time: number, aspect: number, tanHalf: number, margin: number) {
    const g = 1.2207440846057596
    const a1 = 1 / g, a2 = 1 / (g * g), a3 = 1 / (g * g * g)
    const hero = i === 0
    const sx = (0.5 + a1 * i) % 1
    const sy = hero ? 0.35 : (0.5 + a2 * i) % 1
    const sz = (0.5 + a3 * i) % 1
    const sw = ((i * 0.618034) % 1) * 0.97 + 0.013
    const z = hero ? HERO_Z : Z_NEAR + (Z_FAR - Z_NEAR) * sz
    const hh = z * tanHalf
    const hw = hh * aspect
    const rangeY = 2 * (hh + margin)
    const fall = hero ? 0.22 : 0.9 + 0.7 * h1js(sw, 8.8)
    const yRaw = sy * rangeY + fall * time
    const y = (hh + margin) - (((yRaw % rangeY) + rangeY) % rangeY)
    const x = hero ? 0.12 * hw : (sx * 2 - 1) * (hw + margin * 0.5)
    return { x, y, z }
}

/* ------------------------------------------------------------------- atlas */

/** Seeded LCG so the procedural paper is identical on every mount. */
function lcg(seed: number) {
    let s = seed >>> 0
    return () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0
        return s / 4294967296
    }
}

/**
 * A generic engraved note in a 1180x500 logical box. Grey on grey; Base Color
 * supplies the hue. Not modelled on any real banknote.
 */
function drawNote(ctx: CanvasRenderingContext2D, back: boolean) {
    const W = 1180, H = 500
    const ink = "#3e3e3e"
    const rnd = lcg(back ? 29 : 11)

    ctx.fillStyle = "#e6e6e3"
    ctx.fillRect(0, 0, W, H)
    const glow = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.6)
    glow.addColorStop(0, "rgba(255,255,255,0.35)")
    glow.addColorStop(1, "rgba(0,0,0,0.08)")
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, W, H)
    for (let i = 0; i < 2600; i++) {
        ctx.fillStyle = rnd() < 0.5 ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)"
        ctx.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2, 1 + rnd() * 2)
    }

    // Border band: crosshatch clipped to the ring between two rectangles.
    const o = 16, i2 = 52
    ctx.save()
    ctx.beginPath()
    ctx.rect(o, o, W - 2 * o, H - 2 * o)
    ctx.rect(i2, i2, W - 2 * i2, H - 2 * i2)
    ctx.clip("evenodd")
    ctx.strokeStyle = "rgba(40,40,40,0.55)"
    ctx.lineWidth = 1.4
    for (let x = -H; x < W + H; x += 6) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + H, H); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x + H, 0); ctx.stroke()
    }
    ctx.restore()
    ctx.strokeStyle = ink
    ctx.lineWidth = 3
    ctx.strokeRect(o, o, W - 2 * o, H - 2 * o)
    ctx.lineWidth = 2
    ctx.strokeRect(i2, i2, W - 2 * i2, H - 2 * i2)

    // Corner numerals on light plates.
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    const corners: [number, number][] = [
        [128, 110], [W - 128, 110], [128, H - 110], [W - 128, H - 110],
    ]
    for (const [cx, cy] of corners) {
        ctx.fillStyle = "#ececea"
        ctx.beginPath()
        ctx.ellipse(cx, cy, 78, 46, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = ink
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.fillStyle = ink
        ctx.font = "700 62px Georgia, 'Times New Roman', serif"
        ctx.fillText("100", cx, cy + 3)
    }

    const spaced = (text: string, x: number, y: number, px: number, gap: number) => {
        ctx.font = `600 ${px}px Georgia, 'Times New Roman', serif`
        const widths = Array.from(text).map((c) => ctx.measureText(c).width)
        const total = widths.reduce((a, b) => a + b, 0) + gap * (text.length - 1)
        let cx = x - total / 2
        ctx.textAlign = "left"
        for (let k = 0; k < text.length; k++) {
            ctx.fillText(text.charAt(k), cx, y)
            cx += widths[k] + gap
        }
        ctx.textAlign = "center"
    }

    const hatch = (clip: () => void, spacing: number, alpha: number) => {
        ctx.save()
        ctx.beginPath()
        clip()
        ctx.clip()
        ctx.strokeStyle = `rgba(30,30,30,${alpha})`
        ctx.lineWidth = 1.2
        for (let y = 0; y < H; y += spacing) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
        }
        ctx.restore()
    }

    ctx.fillStyle = ink
    spaced("ONE HUNDRED", W / 2, 96, 40, 14)

    if (!back) {
        // Portrait oval with engraved rings and a hatched bust.
        const px = 470, py = 262
        ctx.fillStyle = "#d9d9d5"
        ctx.beginPath(); ctx.ellipse(px, py, 128, 150, 0, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = "rgba(40,40,40,0.4)"
        for (let r = 0; r < 12; r++) {
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.ellipse(px, py, 128 - r * 4, 150 - r * 4, 0, 0, Math.PI * 2)
            ctx.stroke()
        }
        hatch(() => {
            ctx.ellipse(px, py - 40, 46, 58, 0, 0, Math.PI * 2)
            ctx.moveTo(px - 100, py + 140)
            ctx.quadraticCurveTo(px - 90, py + 30, px, py + 22)
            ctx.quadraticCurveTo(px + 90, py + 30, px + 100, py + 140)
            ctx.closePath()
        }, 3, 0.75)
        ctx.strokeStyle = ink
        ctx.lineWidth = 3
        ctx.beginPath(); ctx.ellipse(px, py, 130, 152, 0, 0, Math.PI * 2); ctx.stroke()

        // Seal with rays.
        const sx = 850, sy = 262
        ctx.strokeStyle = "rgba(40,40,40,0.7)"
        ctx.lineWidth = 1.3
        for (let k = 0; k < 90; k++) {
            const a = (k / 90) * Math.PI * 2
            ctx.beginPath()
            ctx.moveTo(sx + Math.cos(a) * 40, sy + Math.sin(a) * 40)
            ctx.lineTo(sx + Math.cos(a) * 68, sy + Math.sin(a) * 68)
            ctx.stroke()
        }
        ctx.lineWidth = 2.5
        ctx.beginPath(); ctx.arc(sx, sy, 70, 0, Math.PI * 2); ctx.stroke()
        ctx.beginPath(); ctx.arc(sx, sy, 38, 0, Math.PI * 2); ctx.stroke()
        ctx.fillStyle = ink
        ctx.font = "700 30px Georgia, 'Times New Roman', serif"
        ctx.fillText("100", sx, sy + 2)

        ctx.font = "600 22px Georgia, 'Times New Roman', serif"
        ctx.fillText("A 00000000 A", 230, 262)
    } else {
        // Central vignette: a hatched sky behind a colonnade.
        const vx = W / 2, vy = 262
        hatch(() => ctx.ellipse(vx, vy, 250, 140, 0, 0, Math.PI * 2), 4, 0.35)
        ctx.strokeStyle = ink
        ctx.lineWidth = 3
        ctx.beginPath(); ctx.ellipse(vx, vy, 252, 142, 0, 0, Math.PI * 2); ctx.stroke()
        ctx.fillStyle = "#cfcfcb"
        ctx.fillRect(vx - 150, vy + 60, 300, 26)
        ctx.beginPath()
        ctx.moveTo(vx - 160, vy - 40)
        ctx.lineTo(vx, vy - 105)
        ctx.lineTo(vx + 160, vy - 40)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        for (let k = 0; k < 8; k++) {
            const cx = vx - 130 + k * (260 / 7)
            ctx.fillRect(cx - 8, vy - 38, 16, 98)
            ctx.strokeRect(cx - 8, vy - 38, 16, 98)
        }
        ctx.strokeRect(vx - 150, vy + 60, 300, 26)

        ctx.fillStyle = ink
        ctx.font = "700 118px Georgia, 'Times New Roman', serif"
        ctx.fillText("100", 250, 270)
        ctx.fillText("100", W - 250, 270)
    }

    ctx.fillStyle = ink
    spaced("ONE HUNDRED", W / 2, H - 92, 28, 10)
}

/** Build the atlas: front in the top half, back in the bottom half. */
function buildAtlas(image: HTMLImageElement | null): HTMLCanvasElement | null {
    const c = document.createElement("canvas")
    c.width = ATLAS
    c.height = ATLAS
    const ctx = c.getContext("2d")
    if (!ctx) return null
    const faceH = ATLAS / 2 - 2 * GUTTER
    for (let f = 0; f < 2; f++) {
        const top = f * (ATLAS / 2)
        ctx.save()
        ctx.beginPath()
        ctx.rect(0, top, ATLAS, ATLAS / 2)
        ctx.clip()
        if (image) {
            // The gutter repeats the edge rows so mip levels sample the note,
            // not the neighbouring face.
            ctx.drawImage(image, 0, top, ATLAS, ATLAS / 2)
            ctx.drawImage(image, 0, top + GUTTER, ATLAS, faceH)
        } else {
            ctx.setTransform(ATLAS / 1180, 0, 0, (ATLAS / 2) / 500, 0, top)
            drawNote(ctx, f === 1)
            ctx.setTransform(1, 0, 0, faceH / 500, 0, top + GUTTER)
            drawNote(ctx, f === 1)
        }
        ctx.restore()
    }
    return c
}

/* ------------------------------------------------------------------- props */

interface BillGroup {
    image?: string
    itemWidth: number
    itemHeight: number
}

interface MotionGroup {
    flutter: number
    tumble: number
    sway: number
}

const BILL_DEFAULTS: BillGroup = {
    image: "https://images.unsplash.com/photo-1591537185130-42c4c19eb5e2?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mzl8fGRvbGxhciUyMGZ1bGwlMjBpbWFnZXxlbnwwfHwwfHx8MA%3D%3D",
    itemWidth: 122,
    itemHeight: 72,
}

const MOTION_DEFAULTS: MotionGroup = {
    flutter: 156,
    tumble: 50,
    sway: 100,
}

interface Props {
    background?: string
    baseColor?: string
    density?: number
    speed?: number
    interaction?: number
    bill?: Partial<BillGroup>
    motion?: Partial<MotionGroup>
    width?: number
    height?: number
    style?: React.CSSProperties
}

/* ---------------------------------------------------------------- component */

export default function MoneyRain(props: Props) {
    const {
        background = "#050505",
        baseColor = "#CDD6C6",
        density = 587,
        speed = 50,
        interaction = 40,
        bill,
        motion,
        style,
    } = props

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    /* Pointer parallax target/current, eased once per frame in the loop. */
    const pointer = useRef({ x: 0, y: 0, tx: 0, ty: 0 })

    const billV: BillGroup = { ...BILL_DEFAULTS, ...bill }
    const motionV: MotionGroup = { ...MOTION_DEFAULTS, ...motion }

    /* Every live input the loop reads — never a dep of the GL effect (rule 6). */
    const live = useRef({
        bg: [0, 0, 0] as RGB,
        base: [1, 1, 1] as RGB,
        density: 160,
        speed: 50,
        interaction: 40,
        bill: BILL_DEFAULTS,
        motion: MOTION_DEFAULTS,
    })
    live.current = {
        bg: parseColor(background, [0.02, 0.02, 0.02]),
        base: parseColor(baseColor, [0.8, 0.84, 0.78]),
        density,
        speed,
        interaction,
        bill: billV,
        motion: motionV,
    }

    /* The current atlas and a version the loop compares against what it last
     * uploaded. Set from the image effect, consumed in rAF — the GL context
     * lives only inside the render effect, and a StrictMode remount starts
     * its own "uploaded" at -1 so it re-uploads the same atlas. */
    const atlas = useRef<{ canvas: HTMLCanvasElement | null; version: number }>({
        canvas: null,
        version: 0,
    })
    const setAtlas = (c: HTMLCanvasElement | null) => {
        if (!c) return
        atlas.current = { canvas: c, version: atlas.current.version + 1 }
    }

    const imageSrc = billV.image
    useEffect(() => {
        if (!imageSrc) {
            setAtlas(buildAtlas(null))
            return
        }
        let cancelled = false
        const im = new Image()
        im.crossOrigin = "anonymous"
        im.onload = () => {
            if (cancelled) return
            setAtlas(buildAtlas(im))
        }
        im.onerror = () => {
            if (!cancelled) console.warn("MoneyRain: image failed to load", imageSrc)
        }
        im.src = imageSrc
        return () => {
            cancelled = true
        }
    }, [imageSrc])

    useEffect(() => {
        const canvas = canvasRef.current
        const host = hostRef.current
        if (!canvas || !host) return

        const gl = canvas.getContext("webgl2", {
            antialias: true,
            alpha: true,
            premultipliedAlpha: true,
            depth: true,
        }) as WebGL2RenderingContext | null
        if (!gl) {
            console.warn("MoneyRain: WebGL2 unavailable")
            return
        }

        const prog = buildProgram(gl)
        if (!prog) return
        gl.useProgram(prog)

        const names = [
            "uTime", "uTumble", "uAspect", "uTanHalf", "uSize", "uFlutter",
            "uSway", "uTex", "uBase", "uBg", "uGut", "uPointer", "uInteract",
        ] as const
        const U = {} as Record<(typeof names)[number], WebGLUniformLocation>
        for (const n of names) {
            const loc = gl.getUniformLocation(prog, n)
            if (!loc) {
                console.error("MoneyRain: uniform location missing", n)
                return
            }
            U[n] = loc
        }

        /* ---- geometry ---- */
        const { uv, idx } = gridGeo()
        const vao = gl.createVertexArray()
        gl.bindVertexArray(vao)
        const uvBuf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf)
        gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
        const idxBuf = gl.createBuffer()
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW)

        const seedBuf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf)
        gl.enableVertexAttribArray(1)
        gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 20, 0)
        gl.vertexAttribDivisor(1, 1)
        gl.enableVertexAttribArray(2)
        gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 20, 16)
        gl.vertexAttribDivisor(2, 1)
        const MAX_INSTANCES = 2000
        const offX = new Float32Array(MAX_INSTANCES)
        const offY = new Float32Array(MAX_INSTANCES)
        const velX = new Float32Array(MAX_INSTANCES)
        const velY = new Float32Array(MAX_INSTANCES)
        const collX = new Float32Array(MAX_INSTANCES)
        const collY = new Float32Array(MAX_INSTANCES)
        const collZ = new Float32Array(MAX_INSTANCES)
        const pushX = new Float32Array(MAX_INSTANCES)
        const pushY = new Float32Array(MAX_INSTANCES)
        const offsetData = new Float32Array(MAX_INSTANCES * 2)

        const offsetBuf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, offsetBuf)
        gl.bufferData(gl.ARRAY_BUFFER, offsetData, gl.DYNAMIC_DRAW)
        gl.enableVertexAttribArray(3)
        gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 8, 0)
        gl.vertexAttribDivisor(3, 1)

        let count = 0
        const setCount = (n: number) => {
            count = n
            gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf)
            gl.bufferData(gl.ARRAY_BUFFER, seedData(n), gl.STATIC_DRAW)
            // A density change is already a discontinuity for these slots —
            // drop any in-flight correction rather than let it snap onto
            // whatever note now lands on that index.
            offX.fill(0, 0, n)
            offY.fill(0, 0, n)
            velX.fill(0, 0, n)
            velY.fill(0, 0, n)
        }

        /* ---- texture ---- */
        const tex = gl.createTexture()
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
            new Uint8Array([220, 220, 216, 255]))
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, MAX_MIP_LEVEL)
        // Tumbling notes are seen at grazing angles most of the time.
        const aniso = gl.getExtension("EXT_texture_filter_anisotropic")
        if (aniso) {
            const max = gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number
            gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, max))
        }
        if (!atlas.current.canvas) setAtlas(buildAtlas(null))
        gl.uniform1i(U.uTex, 0)
        gl.uniform1f(U.uGut, GUTTER / ATLAS)

        gl.enable(gl.DEPTH_TEST)
        gl.depthFunc(gl.LEQUAL)
        gl.disable(gl.CULL_FACE)
        gl.clearColor(0, 0, 0, 0)

        /* ---- pointer ---- */
        const onPointerMove = (e: PointerEvent) => {
            const rect = host.getBoundingClientRect()
            const nx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1
            const ny = ((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1
            pointer.current.tx = Math.max(-1, Math.min(1, nx))
            pointer.current.ty = Math.max(-1, Math.min(1, -ny))
        }
        const onPointerLeave = () => {
            pointer.current.tx = 0
            pointer.current.ty = 0
        }
        host.addEventListener("pointermove", onPointerMove)
        host.addEventListener("pointerleave", onPointerLeave)

        /* ---- collision resolution ----
         * Instances are placed independently with no cross-instance
         * awareness, so two notes can end up occupying the same space. This
         * mirrors each note's coarse fall position on the CPU, finds
         * overlapping pairs with a uniform grid, and resolves the overlap
         * with a positional push along the collision normal plus a
         * spring-damper velocity so they settle apart instead of vibrating
         * or snapping — then streams the correction to the shader as an
         * extra per-instance attribute. Existing curl/tumble/sway/pointer
         * motion is untouched; this only nudges x/y apart when crowded. */
        const resolveCollisions = (dt: number) => {
            const P = live.current
            const sizeX = Math.max(1, P.bill.itemWidth) * MM
            const sizeY = Math.max(1, P.bill.itemHeight) * MM
            const margin = 0.6 * Math.hypot(sizeX, sizeY) + 0.1
            const radius = 0.55 * Math.hypot(sizeX, sizeY)
            const minDist = radius * 1.7
            const cell = minDist
            const aspect = canvas.width / Math.max(1, canvas.height)
            const tanHalf = Math.tan(FOV / 2)

            const buckets = new Map<number, number[]>()
            for (let i = 0; i < count; i++) {
                const b = noteBase(i, time, aspect, tanHalf, margin)
                collX[i] = b.x + offX[i]
                collY[i] = b.y + offY[i]
                collZ[i] = b.z
                const key = Math.floor(collX[i] / cell) * 100003 + Math.floor(collY[i] / cell)
                let arr = buckets.get(key)
                if (!arr) { arr = []; buckets.set(key, arr) }
                arr.push(i)
            }

            pushX.fill(0, 0, count)
            pushY.fill(0, 0, count)
            for (let i = 0; i < count; i++) {
                const gx = Math.floor(collX[i] / cell)
                const gy = Math.floor(collY[i] / cell)
                for (let ox = -1; ox <= 1; ox++) {
                    for (let oy = -1; oy <= 1; oy++) {
                        const arr = buckets.get((gx + ox) * 100003 + (gy + oy))
                        if (!arr) continue
                        for (const j of arr) {
                            if (j <= i) continue
                            if (Math.abs(collZ[i] - collZ[j]) > minDist) continue
                            const dx = collX[i] - collX[j]
                            const dy = collY[i] - collY[j]
                            const dist = Math.hypot(dx, dy)
                            if (dist > 1e-4 && dist < minDist) {
                                // Collision normal is (dx, dy) / dist; split
                                // the penetration evenly between both notes.
                                const push = ((minDist - dist) / dist) * 0.5
                                const cx = dx * push
                                const cy = dy * push
                                pushX[i] += cx; pushY[i] += cy
                                pushX[j] -= cx; pushY[j] -= cy
                            }
                        }
                    }
                }
            }

            // The push above is a target displacement, not an instant snap:
            // it drives a damped spring so colliding notes settle apart
            // instead of vibrating, and a restoring term pulls each note
            // back toward its own seed path once nothing touches it, so a
            // correction never sticks around. Every rate is scaled by dt so
            // this holds up at any frame rate.
            const stiffness = 45, restore = 22, damping = 9
            const maxOffset = radius * 1.4
            const maxSpeed = radius * 14
            for (let i = 0; i < count; i++) {
                velX[i] += (pushX[i] * stiffness - offX[i] * restore) * dt
                velY[i] += (pushY[i] * stiffness - offY[i] * restore) * dt
                const damp = Math.max(0, 1 - damping * dt)
                velX[i] *= damp
                velY[i] *= damp
                const speed = Math.hypot(velX[i], velY[i])
                if (speed > maxSpeed) {
                    const sc = maxSpeed / speed
                    velX[i] *= sc; velY[i] *= sc
                }
                offX[i] += velX[i] * dt
                offY[i] += velY[i] * dt
                const mag = Math.hypot(offX[i], offY[i])
                if (mag > maxOffset) {
                    const sc = maxOffset / mag
                    offX[i] *= sc; offY[i] *= sc
                    velX[i] *= 0.3; velY[i] *= 0.3
                }
                offsetData[i * 2] = offX[i]
                offsetData[i * 2 + 1] = offY[i]
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, offsetBuf)
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, offsetData.subarray(0, count * 2))
        }

        /* ---- sizing ---- */
        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
            const cssW = canvas.clientWidth || host.clientWidth || 0
            const cssH = canvas.clientHeight || host.clientHeight || 0
            const w = Math.max(1, Math.round(cssW * dpr))
            const h = Math.max(1, Math.round(cssH * dpr))
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w
                canvas.height = h
            }
            gl.viewport(0, 0, w, h)
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(canvas)

        /* ---- loop ---- */
        let raf = 0
        let last = -1
        // Scene clocks integrate dt x rate, so moving a dial never jumps the
        // phase. Reset long before float32 costs precision in the trig.
        let time = 0
        let tumble = 0
        let uploaded = -1

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            // The first rAF timestamp can precede the effect; clamp at 0.
            const dt = last < 0 ? 0 : Math.min(0.05, Math.max(0, (now - last) / 1000))
            last = now

            const P = live.current
            const A = atlas.current
            if (A.canvas && A.version !== uploaded) {
                uploaded = A.version
                try {
                    gl.bindTexture(gl.TEXTURE_2D, tex)
                    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, A.canvas)
                    gl.generateMipmap(gl.TEXTURE_2D)
                } catch (err) {
                    console.warn("MoneyRain: image could not be used (cross-origin?)", err)
                }
            }

            const n = Math.max(1, Math.min(2000, Math.round(P.density)))
            if (n !== count) setCount(n)

            const rate = Math.max(0, P.speed) / 50
            time = (time + dt * rate) % 20000
            tumble = (tumble + dt * rate * (Math.max(0, P.motion.tumble) / 50)) % 20000

            gl.uniform1f(U.uTime, time)
            gl.uniform1f(U.uTumble, tumble)
            gl.uniform1f(U.uAspect, canvas.width / Math.max(1, canvas.height))
            gl.uniform1f(U.uTanHalf, Math.tan(FOV / 2))
            gl.uniform2f(
                U.uSize,
                Math.max(1, P.bill.itemWidth) * MM,
                Math.max(1, P.bill.itemHeight) * MM
            )
            gl.uniform1f(U.uFlutter, Math.max(0, P.motion.flutter) / 100)
            gl.uniform1f(U.uSway, Math.max(0, P.motion.sway) / 100)
            gl.uniform3fv(U.uBase, P.base)
            gl.uniform3fv(U.uBg, P.bg)

            // Ease toward the pointer target once per frame — no snapping.
            pointer.current.x += (pointer.current.tx - pointer.current.x) * 0.08
            pointer.current.y += (pointer.current.ty - pointer.current.y) * 0.08
            gl.uniform2f(U.uPointer, pointer.current.x, pointer.current.y)
            gl.uniform1f(U.uInteract, Math.max(0, P.interaction) / 100)

            resolveCollisions(dt || 1 / 60)

            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
            gl.bindVertexArray(vao)
            gl.drawElementsInstanced(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0, count)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            host.removeEventListener("pointermove", onPointerMove)
            host.removeEventListener("pointerleave", onPointerLeave)
            gl.deleteBuffer(uvBuf)
            gl.deleteBuffer(idxBuf)
            gl.deleteBuffer(seedBuf)
            gl.deleteBuffer(offsetBuf)
            gl.deleteVertexArray(vao)
            gl.deleteTexture(tex)
            gl.deleteProgram(prog)
            // No loseContext(): StrictMode's remount would reuse a lost
            // context and render black (rule 6).
        }
    }, [])

    return (
        <div
            ref={hostRef}
            style={{
                // Floor BEFORE the spread: the canvas is absolute, so the root
                // has no in-flow content and collapses under Fit Content.
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
