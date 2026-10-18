"use client"

import * as React from "react"
import { useEffect, useMemo, useRef } from "react"

/**
 * INTERACTIVE LANDSCAPE — raw-WebGL port of Codrops / André Mattos'
 * "Interactive Landscape", demo 1 (three.js r9x + Sky.js).
 * https://github.com/codrops/InteractiveLandscape/
 *
 * This is the BACKGROUND ONLY. The demo's title / subtitle / charming.js
 * letter-glitch and its TweenMax overlay fade are the page's content, not the
 * landscape, and the ask was the landscape as a background component, so none
 * of that is here. Nothing about the scene itself was reinterpreted.
 *
 * WHAT LEFT WITH THREE.JS, AND WHAT REPLACED IT (rule 10 — self-contained)
 *
 *   PlaneBufferGeometry(100, 400, N, N) + Mesh.rotation.x = -PI/2 +
 *   position.z = -180 — the model transform is one fixed rotation and one
 *   translation, so it is folded into the vertex shader's world construction:
 *   world = ((u-0.5)*100, h, -(v-0.5)*400 - 180). Only a vec2 uv attribute is
 *   uploaded; x and z are derived, which is also what makes a 500-segment grid
 *   (251,001 verts) cheap to rebuild when Density moves.
 *
 *   PerspectiveCamera(60, aspect, 0.1, 10000) — the camera never rotates, so
 *   the model-view is a translation and the projection is three scalars. Near
 *   and far are kept at 0.1 / 10000.
 *
 *   THREE.Fog(color, 10, 400) + the USE_FOG chunk — the smoothstep mix is
 *   written out in the fragment shader, same near/far, same order (fog is
 *   applied AFTER the palette's (1 - vDisplace) darkening, including where that
 *   term has gone negative on the black ridge crests — that clipping is what
 *   the original looks like).
 *
 *   THREE.Sky (Preetham, zz85) — ported verbatim as a fullscreen pass. Its
 *   vertex shader only produced per-draw constants (sun direction, sun
 *   intensity, sunfade, betaR, betaM), so those are computed on the CPU and
 *   handed over as uniforms; the fragment shader is the original's arithmetic
 *   line for line, including the Uncharted2 tonemap and the vec3(0, 0.0003,
 *   0.00075) bias that is the ONLY reason this sky is blue at all (demo 1 runs
 *   rayleigh = 0, which zeroes betaR outright). The 450000-unit BackSide box is
 *   replaced by the camera ray, which is the same direction to within 4e-5 rad.
 *
 *   The palette PNG (img/pallete5.png, 10x1024) — a hand-authored strip of
 *   flat colour BANDS, six colours in a non-repeating order, NOT a gradient.
 *   That band order is what turns the noise field into contour terraces, so it
 *   is baked below as BAND_RUNS (colour index, last row) and rebuilt into a
 *   1x1024 texture from the Palette control. Changing a swatch recolours a
 *   terrace; the terrace layout is the original's.
 *
 * WHAT THE PORT FIXES (rule 10 — in scope even though the ask was "add it")
 *
 *   - renderer.setPixelRatio = devicePixelRatio in the original ASSIGNS to the
 *     method instead of calling it, so the demo has always rendered at DPR 1.
 *     Here the drawing buffer is sized from clientWidth/clientHeight x DPR,
 *     capped at 2.
 *   - window.innerWidth / e.clientX mapped the pointer against the VIEWPORT.
 *     A Framer component is not the viewport, so the pointer is normalised
 *     against the host's own box.
 *   - Un-damped time: the original lerps the pointer 0.1 per FRAME, so it
 *     settles at whatever rate the display ticks. Damping is dt-corrected.
 *   - The pointer starts at (0, 0), so before the first mousemove the original
 *     renders at the top-left CORNER of both mapped ranges — a hard-bent road
 *     at its narrowest. Rest is the centre of both ranges here, which is the
 *     shape the demo's own promo frame shows. Cursor > Strength 0 pins it
 *     there.
 *   - touchmove was bound with preventDefault, which eats the page scroll on
 *     mobile for a decorative background. Pointer events, passive, no
 *     preventDefault.
 *   - scene.background was set to the fog colour and then covered by the sky
 *     box, so in the original it painted nothing and the three demos each
 *     hand-tuned their Sky uniforms to roughly agree with their fog. A single
 *     Background dial here tints the sky and IS the fog, so the terrain always
 *     recedes into the colour actually behind it.
 *
 * Rule 6 recipe verbatim: ONE GL context built in useEffect([]), every live
 * input read from a ref inside a raw rAF loop, never loseContext().
 *
 * PANEL (rule 8b): 14 leaf dials. Palette is one Array-of-Color row rather
 * than six loose swatches — the six are one decision (they are a palette), and
 * six top-level colour rows would spend nearly half the cap on them.
 */

/* ==================================================================== GL CORE
 * ------------------------------------------------------------ GL CORE START */

const CANVAS_FPS = 30
const MAX_DPR = 2

/* --- the scene's fixed geometry, exactly as demo 1 built it ---------------- */
const PLANE_W = 100
const PLANE_D = 400
const TERRAIN_Z = -180
const CAM_FOV = 60
const CAM_NEAR = 0.1
const CAM_FAR = 10000
const FOG_NEAR = 10

/* --- cut controls (rule 8b/11b), frozen at the value demo 1 shipped -------- */
/** Sky.js uniforms. demo 1: turbidity is the one that reads, so only it is a
 *  dial (Haze); the rest are constants. rayleigh 0 is load-bearing — it zeroes
 *  betaR, and the sky's colour then comes entirely from the fragment shader's
 *  tiny blue bias term. */
const SKY_RAYLEIGH = 0
const SKY_MIE_COEFFICIENT = 0.01
const SKY_MIE_G = 0.8
const SKY_LUMINANCE = 1
/** angleCenter = uv.y * PI * MEANDER_FREQ, drifting at MEANDER_DRIFT * t. */
const MEANDER_FREQ = 4
const MEANDER_DRIFT = 0.9
/** distortCenter was map(mouseX, 0..w, -0.1, 0.1): amplitude 0.1 about 0. */
const BEND_AT_100 = 0.1
/** roadWidth was map(mouseY, 0..h, -0.5, 2.5): amplitude 1.5 about the rest. */
const SPREAD_AT_100 = 1.5
/** The exponent is 1.5 + roadWidth. Floored so pow(0.0, e) can never be
 *  pow(0, 0), which GLSL leaves undefined. */
const ROAD_EXPONENT_BASE = 1.5
const ROAD_EXPONENT_MIN = 0.05
/** speed uniform at Speed 50 — the rate demo 1 shipped at. */
const SPEED_AT_50 = 0.5
/** lerp(mouse, target, 0.1) per frame at 60Hz == Damping 10. */
const DAMPING_AT_SHIPPED = 10

/** img/pallete5.png, quantised to its six colours and run-length encoded as
 *  [colour index, LAST row] over the strip's 1024 rows, row 0 at the TOP of the
 *  image. three's TextureLoader sets flipY, so image row 0 is v = 1 — the
 *  texture is built bottom-up below to match. Runs under 3 rows in the source
 *  were the PNG's antialiased band edges and are folded into the run above. */
const BAND_RUNS: ReadonlyArray<readonly [number, number]> = [
    [3, 36], [2, 48], [4, 60], [2, 72], [4, 84], [0, 145], [1, 182], [3, 194],
    [2, 206], [1, 243], [2, 255], [3, 267], [4, 279], [0, 340], [3, 353],
    [0, 414], [5, 426], [2, 438], [0, 560], [1, 608], [2, 621], [5, 645],
    [3, 657], [4, 669], [5, 682], [2, 694], [3, 706], [4, 742], [5, 755],
    [1, 779], [2, 803], [1, 816], [2, 828], [0, 889], [3, 913], [1, 950],
    [5, 962], [2, 999], [4, 1011], [5, 1023],
]
const BAND_ROWS = 1024
/** pallete5.png's own six colours, in the index order BAND_RUNS refers to. */
const DEFAULT_PALETTE = [
    "#111111",
    "#5D675B",
    "#ABE188",
    "#F78E69",
    "#F7EF99",
    "#F1BB87",
]

/* ---------------------------------------------------------------- Perlin ---
 * webgl-noise cnoise, Stefan Gustavson / Ashima Arts, MIT. Verbatim from the
 * demo's inline <script id="custom-vertex">. */
const CNOISE_GLSL = `
vec3 mod289(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
vec3 fade(vec3 t){ return t*t*t*(t*(t*6.0-15.0)+10.0); }

float cnoise(vec3 P){
    vec3 Pi0 = floor(P);
    vec3 Pi1 = Pi0 + vec3(1.0);
    Pi0 = mod289(Pi0);
    Pi1 = mod289(Pi1);
    vec3 Pf0 = fract(P);
    vec3 Pf1 = Pf0 - vec3(1.0);
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;

    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);

    vec4 gx0 = ixy0 * (1.0 / 7.0);
    vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);

    vec4 gx1 = ixy1 * (1.0 / 7.0);
    vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);

    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
    vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
    vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
    vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
    vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x;
    g010 *= norm0.y;
    g100 *= norm0.z;
    g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x;
    g011 *= norm1.y;
    g101 *= norm1.z;
    g111 *= norm1.w;

    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);

    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
    return 2.2 * n_xyz;
}
`

/* ------------------------------------------------------------- terrain -----
 * The demo's custom-vertex, with the model transform folded in and the
 * projection written out. Nothing in the displacement math changed. */
const TERRAIN_VS = `
precision highp float;

attribute vec2 aUv;

uniform float uTime;
uniform float uSpeed;
uniform float uDistort;
uniform float uRoadWidth;
uniform float uMaxHeight;
uniform float uNoiseScale;
uniform vec3 uCam;
uniform vec2 uPlane;
uniform float uTerrainZ;
uniform float uFocal;
uniform float uAspect;
uniform float uProjA;
uniform float uProjB;
uniform float uMeanderFreq;
uniform float uMeanderDrift;

varying float vDisplace;
varying float vFogDepth;

#define PI 3.1415926535897932384626433832795

${CNOISE_GLSL}

void main(){
    vec2 uv = aUv;

    float t = uTime * uSpeed;
    float wRoad = uDistort;

    float angleCenter = uv.y * PI * uMeanderFreq;
    angleCenter += t * uMeanderDrift;

    float centerOff = (sin(angleCenter) + sin(angleCenter * 0.5)) * wRoad;

    vec3 noiseIn = vec3(uv, 1.0) * uNoiseScale;
    float noise = cnoise(vec3(noiseIn.x, noiseIn.y + t, noiseIn.z));
    noise += 1.0;
    float h = noise;
    float angle = (uv.x - centerOff) * PI;
    float f = abs(cos(angle));
    h *= pow(f, max(${ROAD_EXPONENT_MIN.toFixed(3)}, ${ROAD_EXPONENT_BASE.toFixed(3)} + uRoadWidth));

    vDisplace = h;

    h *= uMaxHeight;

    // model: rotation.x = -PI/2 then position.z = TERRAIN_Z, folded in.
    vec3 world = vec3(
        (uv.x - 0.5) * uPlane.x,
        h,
        -(uv.y - 0.5) * uPlane.y + uTerrainZ
    );

    // view: the camera never rotates, so this is one translation.
    vec3 v = world - uCam;
    vFogDepth = -v.z;

    gl_Position = vec4(
        v.x * uFocal / uAspect,
        v.y * uFocal,
        v.z * uProjA + uProjB,
        -v.z
    );
}
`

const TERRAIN_FS = `
precision highp float;

uniform sampler2D uPalette;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;

varying float vDisplace;
varying float vFogDepth;

void main(){
    vec2 stripPos = vec2(0.0, vDisplace);
    vec4 stripColor = texture2D(uPalette, stripPos);
    // The original's pow(1.0 - vDisplace, 1.0). It goes NEGATIVE above 1.0,
    // which is what blacks out the ridge crests — kept, including through the
    // fog mix, because the mix is what the original applies to it.
    stripColor *= (1.0 - vDisplace);

    float fogFactor = smoothstep(uFogNear, uFogFar, vFogDepth);
    vec3 rgb = mix(stripColor.rgb, uFogColor, fogFactor);

    gl_FragColor = vec4(rgb, 1.0);
}
`

/* ----------------------------------------------------------------- sky -----
 * THREE.Sky (Preetham; Wallner / Upitis / zz85). The original's vertex stage
 * produced only per-draw constants, so it lives on the CPU as skyConstants()
 * and this pass is a fullscreen triangle carrying the camera ray. */
const SKY_VS = `
precision highp float;
attribute vec2 aPos;
varying vec2 vNdc;
void main(){
    vNdc = aPos;
    gl_Position = vec4(aPos, 0.0, 1.0);
}
`

const SKY_FS = `
precision highp float;

varying vec2 vNdc;

uniform vec3 uSunDirection;
uniform float uSunE;
uniform float uSunfade;
uniform vec3 uBetaR;
uniform vec3 uBetaM;
uniform float uLuminance;
uniform float uMieDirectionalG;
uniform float uTanHalfFov;
uniform float uAspect;
uniform vec3 uTint;

const float pi = 3.141592653589793238462643383279502884197169;
const float rayleighZenithLength = 8.4E3;
const float mieZenithLength = 1.25E3;
const vec3 up = vec3(0.0, 1.0, 0.0);
const float sunAngularDiameterCos = 0.999956676946448443553574619906976478926848692873900859324;
const float THREE_OVER_SIXTEENPI = 0.05968310365946075;
const float ONE_OVER_FOURPI = 0.07957747154594767;

const float A = 0.15;
const float B = 0.50;
const float C = 0.10;
const float D = 0.20;
const float E = 0.02;
const float F = 0.30;
const float whiteScale = 1.0748724675633854;

float rayleighPhase(float cosTheta){
    return THREE_OVER_SIXTEENPI * (1.0 + pow(cosTheta, 2.0));
}

float hgPhase(float cosTheta, float g){
    float g2 = pow(g, 2.0);
    float inverse = 1.0 / pow(1.0 - 2.0 * g * cosTheta + g2, 1.5);
    return ONE_OVER_FOURPI * ((1.0 - g2) * inverse);
}

vec3 Uncharted2Tonemap(vec3 x){
    return ((x * (A * x + C * B) + D * E) / (x * (A * x + B) + D * F)) - E / F;
}

void main(){
    // The original read the direction off a 450000-unit sky box centred on the
    // world origin; from a camera less than 10 units away that is the camera
    // ray to within 4e-5 rad.
    vec3 direction = normalize(vec3(
        vNdc.x * uTanHalfFov * uAspect,
        vNdc.y * uTanHalfFov,
        -1.0
    ));

    float zenithAngle = acos(max(0.0, dot(up, direction)));
    float inv = 1.0 / (cos(zenithAngle) + 0.15 * pow(93.885 - ((zenithAngle * 180.0) / pi), -1.253));
    float sR = rayleighZenithLength * inv;
    float sM = mieZenithLength * inv;

    vec3 Fex = exp(-(uBetaR * sR + uBetaM * sM));

    float cosTheta = dot(direction, uSunDirection);

    float rPhase = rayleighPhase(cosTheta * 0.5 + 0.5);
    vec3 betaRTheta = uBetaR * rPhase;

    float mPhase = hgPhase(cosTheta, uMieDirectionalG);
    vec3 betaMTheta = uBetaM * mPhase;

    vec3 Lin = pow(uSunE * ((betaRTheta + betaMTheta) / (uBetaR + uBetaM)) * (1.0 - Fex), vec3(1.5));
    Lin *= mix(
        vec3(1.0),
        pow(uSunE * ((betaRTheta + betaMTheta) / (uBetaR + uBetaM)) * Fex, vec3(1.0 / 2.0)),
        clamp(pow(1.0 - dot(up, uSunDirection), 5.0), 0.0, 1.0)
    );

    vec3 L0 = vec3(0.1) * Fex;

    float sundisk = smoothstep(sunAngularDiameterCos, sunAngularDiameterCos + 0.00002, cosTheta);
    L0 += (uSunE * 19000.0 * Fex) * sundisk;

    // This bias is the whole reason demo 1's sky is blue: rayleigh = 0 makes
    // betaR zero, so nothing else in the model carries a hue.
    vec3 texColor = (Lin + L0) * 0.04 + vec3(0.0, 0.0003, 0.00075);

    vec3 curr = Uncharted2Tonemap((log2(2.0 / pow(uLuminance, 4.0))) * texColor);
    vec3 color = curr * whiteScale;

    vec3 retColor = pow(color, vec3(1.0 / (1.2 + (1.2 * uSunfade))));

    // Background owns the atmosphere. The Preetham model has no colour input
    // of its own, so the dial is a MULTIPLY over its output: white is the
    // identity and leaves demo 1's sky byte-for-byte as it was, and any other
    // colour tints the whole dome INCLUDING the horizon glow. That matters
    // because the same colour is the fog, so the terrain always melts into the
    // exact colour of the sky it is melting into — which is what it stopped
    // doing when Background moved the fog alone and left the sky blue.
    gl_FragColor = vec4(retColor * uTint, 1.0);
}
`

/* ------------------------------------------------------------- sky maths ---
 * The original's Sky vertex shader, moved to the CPU because every line of it
 * is constant across the draw. */
function skyConstants(sunElevationDeg: number, turbidity: number) {
    const el = (sunElevationDeg * Math.PI) / 180
    // The demo placed the sun at radius 400000 with x == 0, z negative.
    const R = 400000
    const sun: [number, number, number] = [0, Math.sin(el) * R, -Math.cos(el) * R]

    const len = Math.hypot(sun[0], sun[1], sun[2]) || 1
    const dir: [number, number, number] = [sun[0] / len, sun[1] / len, sun[2] / len]

    const e = Math.E
    const cutoffAngle = 1.6110731556870734
    const steepness = 1.5
    const EE = 1000
    const zenithAngleCos = Math.max(-1, Math.min(1, dir[1]))
    const sunE = EE * Math.max(0, 1 - Math.pow(e, -((cutoffAngle - Math.acos(zenithAngleCos)) / steepness)))

    const sunfade = 1 - Math.max(0, Math.min(1, 1 - Math.exp(sun[1] / 450000)))

    const rayleighCoefficient = SKY_RAYLEIGH - 1 * (1 - sunfade)
    const totalRayleigh = [5.804542996261093e-6, 1.3562911419845635e-5, 3.0265902468824876e-5]
    const betaR: [number, number, number] = [
        totalRayleigh[0] * rayleighCoefficient,
        totalRayleigh[1] * rayleighCoefficient,
        totalRayleigh[2] * rayleighCoefficient,
    ]

    const MieConst = [1.8399918514433978e14, 2.7798023919660528e14, 4.0790479543861094e14]
    const c = 0.2 * turbidity * 10e-18
    const betaM: [number, number, number] = [
        0.434 * c * MieConst[0] * SKY_MIE_COEFFICIENT,
        0.434 * c * MieConst[1] * SKY_MIE_COEFFICIENT,
        0.434 * c * MieConst[2] * SKY_MIE_COEFFICIENT,
    ]

    return { dir, sunE, sunfade, betaR, betaM }
}

/* ------------------------------------------------------------------ misc ---*/

function compile(gl: WebGLRenderingContext, type: number, src: string) {
    const sh = gl.createShader(type)!
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        // eslint-disable-next-line no-console
        console.error(gl.getShaderInfoLog(sh))
    }
    return sh
}

function link(gl: WebGLRenderingContext, vsSrc: string, fsSrc: string) {
    const p = gl.createProgram()!
    const vs = compile(gl, gl.VERTEX_SHADER, vsSrc)
    const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc)
    gl.attachShader(p, vs)
    gl.attachShader(p, fs)
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        // eslint-disable-next-line no-console
        console.error(gl.getProgramInfoLog(p))
    }
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    return p
}

/** ControlType.Color hands back rgb() / hsl() / var(--token, …), not only hex. */
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

/** The 1x1024 band strip. Written bottom-up: image row 0 is v = 1, because
 *  three's loader flips Y and the shader's vDisplace lookup expects that. */
function buildPaletteBytes(colors: string[]): Uint8Array {
    const list = colors.length ? colors : DEFAULT_PALETTE
    const rgb = list.map(parseColor)
    const out = new Uint8Array(BAND_ROWS * 4)
    let run = 0
    for (let row = 0; row < BAND_ROWS; row++) {
        while (run < BAND_RUNS.length - 1 && row > BAND_RUNS[run][1]) run++
        const c = rgb[BAND_RUNS[run][0] % rgb.length]
        const i = (BAND_ROWS - 1 - row) * 4
        out[i] = Math.round(c[0] * 255)
        out[i + 1] = Math.round(c[1] * 255)
        out[i + 2] = Math.round(c[2] * 255)
        out[i + 3] = 255
    }
    return out
}

/** uv-only grid for a segments x segments plane. x and z are derived in the
 *  vertex shader, so this is the whole geometry. */
function buildGrid(segments: number) {
    const n = segments + 1
    const uv = new Float32Array(n * n * 2)
    let p = 0
    for (let iy = 0; iy < n; iy++) {
        // PlaneBufferGeometry's uv.y is 1 - iy / segments.
        const v = 1 - iy / segments
        for (let ix = 0; ix < n; ix++) {
            uv[p++] = ix / segments
            uv[p++] = v
        }
    }
    const quads = segments * segments
    const idx = quads * 6 > 65535 ? new Uint32Array(quads * 6) : new Uint16Array(quads * 6)
    let q = 0
    for (let iy = 0; iy < segments; iy++) {
        for (let ix = 0; ix < segments; ix++) {
            const a = ix + n * iy
            const b = ix + n * (iy + 1)
            const c = ix + 1 + n * (iy + 1)
            const d = ix + 1 + n * iy
            idx[q++] = a
            idx[q++] = b
            idx[q++] = d
            idx[q++] = b
            idx[q++] = c
            idx[q++] = d
        }
    }
    return { uv, idx, count: quads * 6 }
}

/* -------------------------------------------------------------- GL CORE END */

interface TerrainGroup {
    /** key is maxHeight, never height — Framer injects a numeric height prop. */
    maxHeight: number
    roadWidth: number
    detail: number
}
interface SkyGroup {
    sunHeight: number
    haze: number
    fog: number
}
interface CameraGroup {
    cameraHeight: number
    distance: number
}
interface CursorGroup {
    strength: number
    damping: number
}

const DEFAULT_TERRAIN: TerrainGroup = { maxHeight: 10, roadWidth: 50, detail: 10 }
const DEFAULT_SKY: SkyGroup = { sunHeight: 4, haze: 20, fog: 400 }
const DEFAULT_CAMERA: CameraGroup = { cameraHeight: 8, distance: 4 }
const DEFAULT_CURSOR: CursorGroup = { strength: 100, damping: DAMPING_AT_SHIPPED }

interface InteractiveLandscapeProps {
    background?: string
    palette?: string[]
    density?: number
    speed?: number
    terrain?: Partial<TerrainGroup>
    sky?: Partial<SkyGroup>
    camera?: Partial<CameraGroup>
    cursor?: Partial<CursorGroup>
    style?: React.CSSProperties
}

export default function InteractiveLandscape(props: InteractiveLandscapeProps) {
    const {
        background = "#FFAE00",
        palette = ["#111111","#5D675B","#ABE188","#F78E69","#F7EF99","#F1BB87"],
        density = 100,
        speed = 100,
        // A group the designer never opened arrives undefined, so every group is
        // spread over a typed defaults literal rather than a ?? chain (rule 11).
        terrain,
        sky,
        camera,
        cursor,
        style,
    } = props

    const t: TerrainGroup = { ...DEFAULT_TERRAIN, ...terrain }
    const s: SkyGroup = { ...DEFAULT_SKY, ...sky }
    const c: CameraGroup = { ...DEFAULT_CAMERA, ...camera }
    const cu: CursorGroup = { ...DEFAULT_CURSOR, ...cursor }

    const hostRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    // Every live input the loop reads lives in a ref, so nothing here can land
    // in the GL effect's deps and rebuild the context (rule 6).
    const live = useRef({
        background,
        speed,
        maxHeight: t.maxHeight,
        roadWidth: t.roadWidth,
        detail: t.detail,
        sunHeight: s.sunHeight,
        haze: s.haze,
        fog: s.fog,
        cameraHeight: c.cameraHeight,
        distance: c.distance,
        strength: cu.strength,
        damping: cu.damping,
    })
    live.current = {
        background,
        speed,
        maxHeight: t.maxHeight,
        roadWidth: t.roadWidth,
        detail: t.detail,
        sunHeight: s.sunHeight,
        haze: s.haze,
        fog: s.fog,
        cameraHeight: c.cameraHeight,
        distance: c.distance,
        strength: cu.strength,
        damping: cu.damping,
    }

    // Density and Palette rebuild BUFFERS, never the context. Both are handed
    // to the loop as a version stamp it polls.
    const segments = Math.max(8, Math.round(density))
    const gridRef = useRef<{ seg: number; data: ReturnType<typeof buildGrid> } | null>(null)
    if (!gridRef.current || gridRef.current.seg !== segments) {
        gridRef.current = { seg: segments, data: buildGrid(segments) }
    }
    const paletteKey = useMemo(() => (palette || []).join("|"), [palette])
    const paletteRef = useRef<Uint8Array>(buildPaletteBytes(palette || []))
    const paletteStampRef = useRef(paletteKey)
    if (paletteStampRef.current !== paletteKey) {
        paletteStampRef.current = paletteKey
        paletteRef.current = buildPaletteBytes(palette || [])
    }

    const gridDataRef = useRef(gridRef.current)
    gridDataRef.current = gridRef.current

    const paletteVersionRef = useRef(0)
    const lastPaletteKeyRef = useRef(paletteKey)
    if (lastPaletteKeyRef.current !== paletteKey) {
        lastPaletteKeyRef.current = paletteKey
        paletteVersionRef.current++
    }

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return

        const gl = (canvas.getContext("webgl2", {
            antialias: true,
            alpha: false,
            preserveDrawingBuffer: true,
        }) ||
            canvas.getContext("webgl", {
                antialias: true,
                alpha: false,
                preserveDrawingBuffer: true,
            })) as WebGLRenderingContext | null
        if (!gl) return

        const isWebGL2 = typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext
        if (!isWebGL2) gl.getExtension("OES_element_index_uint")

        /* --- programs --- */
        const skyProg = link(gl, SKY_VS, SKY_FS)
        const terProg = link(gl, TERRAIN_VS, TERRAIN_FS)

        const skyU = {
            sunDirection: gl.getUniformLocation(skyProg, "uSunDirection"),
            sunE: gl.getUniformLocation(skyProg, "uSunE"),
            sunfade: gl.getUniformLocation(skyProg, "uSunfade"),
            betaR: gl.getUniformLocation(skyProg, "uBetaR"),
            betaM: gl.getUniformLocation(skyProg, "uBetaM"),
            luminance: gl.getUniformLocation(skyProg, "uLuminance"),
            mieG: gl.getUniformLocation(skyProg, "uMieDirectionalG"),
            tanHalfFov: gl.getUniformLocation(skyProg, "uTanHalfFov"),
            aspect: gl.getUniformLocation(skyProg, "uAspect"),
            tint: gl.getUniformLocation(skyProg, "uTint"),
        }
        const terU = {
            time: gl.getUniformLocation(terProg, "uTime"),
            speed: gl.getUniformLocation(terProg, "uSpeed"),
            distort: gl.getUniformLocation(terProg, "uDistort"),
            roadWidth: gl.getUniformLocation(terProg, "uRoadWidth"),
            maxHeight: gl.getUniformLocation(terProg, "uMaxHeight"),
            noiseScale: gl.getUniformLocation(terProg, "uNoiseScale"),
            cam: gl.getUniformLocation(terProg, "uCam"),
            plane: gl.getUniformLocation(terProg, "uPlane"),
            terrainZ: gl.getUniformLocation(terProg, "uTerrainZ"),
            focal: gl.getUniformLocation(terProg, "uFocal"),
            aspect: gl.getUniformLocation(terProg, "uAspect"),
            projA: gl.getUniformLocation(terProg, "uProjA"),
            projB: gl.getUniformLocation(terProg, "uProjB"),
            meanderFreq: gl.getUniformLocation(terProg, "uMeanderFreq"),
            meanderDrift: gl.getUniformLocation(terProg, "uMeanderDrift"),
            paletteTex: gl.getUniformLocation(terProg, "uPalette"),
            fogColor: gl.getUniformLocation(terProg, "uFogColor"),
            fogNear: gl.getUniformLocation(terProg, "uFogNear"),
            fogFar: gl.getUniformLocation(terProg, "uFogFar"),
        }

        const skyPosLoc = gl.getAttribLocation(skyProg, "aPos")
        const terUvLoc = gl.getAttribLocation(terProg, "aUv")

        /* --- buffers --- */
        const quadBuf = gl.createBuffer()!
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)

        const uvBuf = gl.createBuffer()!
        const idxBuf = gl.createBuffer()!
        let indexCount = 0
        let indexType: number = gl.UNSIGNED_SHORT
        let uploadedSeg = -1

        const uploadGrid = () => {
            const g = gridDataRef.current
            if (!g) return
            gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf)
            gl.bufferData(gl.ARRAY_BUFFER, g.data.uv, gl.STATIC_DRAW)
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf)
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g.data.idx, gl.STATIC_DRAW)
            indexCount = g.data.count
            indexType = g.data.idx instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT
            uploadedSeg = g.seg
        }
        uploadGrid()

        /* --- palette texture --- */
        const tex = gl.createTexture()!
        let uploadedPalette = -1
        const uploadPalette = () => {
            gl.bindTexture(gl.TEXTURE_2D, tex)
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                1,
                BAND_ROWS,
                0,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                paletteRef.current
            )
            // Mipmapped, because three's TextureLoader defaults to
            // LinearMipmapLinearFilter and that is load-bearing here: where the
            // terrain is compressed into the distance, vDisplace's screen
            // derivative is large, the sampler drops into a high mip, and the
            // bands average into the soft brown crests the original's far hills
            // have. With plain LINEAR those hills render flat black and the
            // mid-ground bands alias.
            gl.generateMipmap(gl.TEXTURE_2D)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
            // Clamp, as three's TextureLoader defaults to — vDisplace runs past
            // 1.0 on the ridge crests and must NOT wrap back to the first band.
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            uploadedPalette = paletteVersionRef.current
        }
        uploadPalette()

        /* --- pointer, scoped to the host so hover outside the canvas is a no-op --- */
        const mouse = { x: 0.5, y: 0.5, xd: 0.5, yd: 0.5 }
        const onMove = (e: PointerEvent) => {
            // A ratio inside the host's own box: both the rect and the pointer
            // carry the same canvas zoom, so the ratio is zoom-independent even
            // though the rect's px are not (rule G).
            const r = host.getBoundingClientRect()
            if (r.width <= 0 || r.height <= 0) return
            mouse.x = (e.clientX - r.left) / r.width
            mouse.y = (e.clientY - r.top) / r.height
        }
        host.addEventListener("pointermove", onMove, { passive: true })

        /* --- size --- */
        let w = 0
        let h = 0
        const resize = () => {
            // clientWidth/clientHeight, never the injected width/height props:
            // those are not numeric in the Framer preview.
            const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1)
            const cw = Math.max(1, Math.round(canvas.clientWidth * dpr))
            const ch = Math.max(1, Math.round(canvas.clientHeight * dpr))
            if (cw === w && ch === h) return
            w = cw
            h = ch
            canvas.width = w
            canvas.height = h
        }
        const ro = new ResizeObserver(resize)
        ro.observe(canvas)
        resize()

        /* --- loop --- */
        const minFrame = 1000 / CANVAS_FPS
        let raf = 0
        let last = -1
        let clock = 0
        let gate = 0

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            // The first rAF timestamp can precede the effect, so dt is clamped.
            const dt = last < 0 ? 1 / 60 : Math.min(0.1, Math.max(0, (now - last) / 1000))
            if (minFrame > 0) {
                if (now - gate < minFrame) return
                gate = now
            }
            last = now
            clock += dt

            resize()
            const L = live.current

            if (gridDataRef.current && gridDataRef.current.seg !== uploadedSeg) uploadGrid()
            if (paletteVersionRef.current !== uploadedPalette) uploadPalette()

            // Damping is a per-second settle, so the shipped 0.1-per-frame at
            // 60Hz is reproduced and every other frame rate matches it.
            const damp = Math.max(1, Math.min(100, L.damping)) / 100
            const a = 1 - Math.pow(1 - damp, dt * 60)
            mouse.xd += (mouse.x - mouse.xd) * a
            mouse.yd += (mouse.y - mouse.yd) * a

            const strength = Math.max(0, L.strength) / 100
            const distort = (mouse.xd - 0.5) * 2 * BEND_AT_100 * strength
            const roadRest = -0.5 + (Math.max(0, Math.min(100, L.roadWidth)) / 100) * 3
            const roadWidth = roadRest + (mouse.yd - 0.5) * 2 * SPREAD_AT_100 * strength

            const aspect = h > 0 ? w / h : 1
            const tanHalf = Math.tan((CAM_FOV * Math.PI) / 360)
            const focal = 1 / tanHalf
            const projA = (CAM_FAR + CAM_NEAR) / (CAM_NEAR - CAM_FAR)
            const projB = (2 * CAM_FAR * CAM_NEAR) / (CAM_NEAR - CAM_FAR)

            gl.viewport(0, 0, w, h)
            gl.disable(gl.DEPTH_TEST)
            gl.depthMask(false)

            /* sky first, covering the frame at the far plane exactly as the
             * BackSide box did. Background tints it and is also the fog, so
             * the two can never disagree about what the horizon is. */
            const bg = parseColor(L.background)
            const sk = skyConstants(L.sunHeight, Math.max(0.001, L.haze))
            gl.useProgram(skyProg)
            gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf)
            gl.enableVertexAttribArray(skyPosLoc)
            gl.vertexAttribPointer(skyPosLoc, 2, gl.FLOAT, false, 0, 0)
            gl.uniform3f(skyU.sunDirection, sk.dir[0], sk.dir[1], sk.dir[2])
            gl.uniform1f(skyU.sunE, sk.sunE)
            gl.uniform1f(skyU.sunfade, sk.sunfade)
            gl.uniform3f(skyU.betaR, sk.betaR[0], sk.betaR[1], sk.betaR[2])
            gl.uniform3f(skyU.betaM, sk.betaM[0], sk.betaM[1], sk.betaM[2])
            gl.uniform1f(skyU.luminance, SKY_LUMINANCE)
            gl.uniform1f(skyU.mieG, SKY_MIE_G)
            gl.uniform1f(skyU.tanHalfFov, tanHalf)
            gl.uniform1f(skyU.aspect, aspect)
            gl.uniform3f(skyU.tint, bg[0], bg[1], bg[2])
            gl.drawArrays(gl.TRIANGLES, 0, 3)
            gl.disableVertexAttribArray(skyPosLoc)

            /* terrain over it */
            gl.enable(gl.DEPTH_TEST)
            gl.depthFunc(gl.LEQUAL)
            gl.depthMask(true)
            gl.clear(gl.DEPTH_BUFFER_BIT)

            gl.useProgram(terProg)
            gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf)
            gl.enableVertexAttribArray(terUvLoc)
            gl.vertexAttribPointer(terUvLoc, 2, gl.FLOAT, false, 0, 0)
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf)

            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, tex)
            gl.uniform1i(terU.paletteTex, 0)

            gl.uniform1f(terU.time, clock)
            gl.uniform1f(terU.speed, (Math.max(0, L.speed) / 50) * SPEED_AT_50)
            gl.uniform1f(terU.distort, distort)
            gl.uniform1f(terU.roadWidth, roadWidth)
            gl.uniform1f(terU.maxHeight, L.maxHeight)
            gl.uniform1f(terU.noiseScale, Math.max(0.001, L.detail))
            gl.uniform3f(terU.cam, 0, L.cameraHeight, L.distance)
            gl.uniform2f(terU.plane, PLANE_W, PLANE_D)
            gl.uniform1f(terU.terrainZ, TERRAIN_Z)
            gl.uniform1f(terU.focal, focal)
            gl.uniform1f(terU.aspect, aspect)
            gl.uniform1f(terU.projA, projA)
            gl.uniform1f(terU.projB, projB)
            gl.uniform1f(terU.meanderFreq, MEANDER_FREQ)
            gl.uniform1f(terU.meanderDrift, MEANDER_DRIFT)
            gl.uniform3f(terU.fogColor, bg[0], bg[1], bg[2])
            gl.uniform1f(terU.fogNear, FOG_NEAR)
            gl.uniform1f(terU.fogFar, Math.max(FOG_NEAR + 1, L.fog))

            gl.drawElements(gl.TRIANGLES, indexCount, indexType, 0)
            gl.disableVertexAttribArray(terUvLoc)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            host.removeEventListener("pointermove", onMove)
            gl.deleteTexture(tex)
            gl.deleteBuffer(uvBuf)
            gl.deleteBuffer(idxBuf)
            gl.deleteBuffer(quadBuf)
            gl.deleteProgram(skyProg)
            gl.deleteProgram(terProg)
            // No loseContext(): getContext hands back the same context per
            // canvas, so a force-lost one survives StrictMode's remount black.
        }
    }, [])

    return (
        <div
            ref={hostRef}
            style={{
                // Floor BEFORE the style spread, so an explicit size on the
                // instance still wins: the canvas is absolutely positioned, so
                // the root has no in-flow content and would collapse to a dot
                // under Framer's Fit Content sizing.
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
