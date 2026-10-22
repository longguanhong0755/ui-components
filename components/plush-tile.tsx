"use client"

/**
 * PlushTile — an app-icon tile grown over with real fur, modelled on the
 * user's reference photo of a four-colour envelope icon in white plush on a
 * dark red studio floor.
 *
 * The tile is a puffy cushion (rounded-square footprint, round bevel, slight
 * dome). Every hair is its own instanced strand: rooted on the cushion,
 * coloured by the artwork under its root, rising off the surface along the
 * normal, then combed along the artwork's edges (an edge-tangent flow field
 * built from the picture) and drooping under gravity. Strands are lit with a
 * Kajiya-Kay hair model, a top softbox, a red floor bounce and a backlit rim,
 * then drawn as anti-aliased tapered quads over a dark undercoat, so the gaps
 * read as depth. Rim strands stand out past the silhouette for the fuzzy
 * halo. Upload any picture and it becomes the fur's pattern.
 *
 * Pointer: the fur parts under the cursor like a finger run through it, and
 * the tile leans toward the cursor. A light breeze stirs the tips at rest.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 800
 * @framerIntrinsicHeight 800
 */
import { useEffect, useRef, useState, type CSSProperties } from "react"

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

type RGBA = [number, number, number, number]

const COLOR_CACHE = new Map<string, RGBA | null>()

/** Cached per string, so the frame loop parses nothing and allocates nothing. */
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
    const num = (p: string, scale: number) => (p.endsWith("%") ? (parseFloat(p) / 100) * scale : parseFloat(p))
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
    return out.every(Number.isFinite) ? (out.map((c) => Math.min(1, Math.max(0, c))) as RGBA) : null
}

function num(v: unknown, d: number): number {
    return typeof v === "number" && Number.isFinite(v) ? v : d
}
const clampN = (v: unknown, lo: number, hi: number, d: number) => Math.max(lo, Math.min(hi, num(v, d)))
const lin = (c: number) => Math.pow(c, 2.2)
const D2R = Math.PI / 180
const BG_FALLBACK: RGBA = [0.18, 0.027, 0.024, 1]
const FUR_FALLBACK: RGBA = [0.953, 0.929, 0.894, 1]
const LIGHT_FALLBACK: RGBA = [1, 0.957, 0.902, 1]

type ImageValue = string | { src?: string; srcSet?: string; alt?: string } | null | undefined
/** Reads both shapes ControlType.ResponsiveImage / Image hand us. */
const imageOf = (v: ImageValue): string => (typeof v === "string" ? v : v && typeof v.src === "string" ? v.src : "")

// ── defaults: one source of truth for the signature and the panel ──

const DEFAULTS = {
    background: "#000000",
    furColor: "#F3EDE4",
    scale: 115,
    radius: 48,
    puff: 5,
    breeze: 2,
}

type Fit = "contain" | "cover"
const DEFAULT_ARTWORK = { fit: "contain" as Fit, size: 92, offsetY: 0 }
type Artwork = typeof DEFAULT_ARTWORK

type Flow = "art" | "radial" | "down"
const DEFAULT_FUR = { density: 5, length: 6, lift: 5, frizz: 6, flow: "art" as Flow }
type Fur = typeof DEFAULT_FUR

const DEFAULT_PLACEMENT = { x: 0, y: 0, angle: 0, tilt: 0 }
type Placement = typeof DEFAULT_PLACEMENT

const DEFAULT_ENTRANCE = { animate: true, delay: 0.1, duration: 1.6 }
type Entrance = typeof DEFAULT_ENTRANCE

const DEFAULT_RESPONSE = { reach: 5, strength: 6, parallax: 4 }
type Response = typeof DEFAULT_RESPONSE

/** Tuning values behind the look. Out of the box Advanced changes nothing. */
const DEFAULT_ADVANCED = {
    seed: 0,
    edgeFlow: 75,
    emboss: 50,
    rimShare: 26,
    clump: 28,
    hairWidth: 0.85,
    tipFade: 25,
    lens: 20,
    lightAngle: 100,
    lightHeight: 40,
    lightColor: "#FFF4E6",
    keyFalloff: 75,
    sheen: 25,
    crimp: 20,
    rootShade: 60,
    depthShade: 45,
    undercoat: 22,
    rimLight: 90,
    colorJitter: 22,
    bounce: 55,
    glow: 60,
    shadow: 50,
}
type Advanced = typeof DEFAULT_ADVANCED

/** The reference's artwork, drawn when no Image is set: colours sampled off the photo's fur. */
const GLYPH = { red: "#EB1C1A", blue: "#1F5FE6", green: "#1EA52A", yellow: "#F7B00C" }

// Tile half-size at Scale 100, as a share of the frame's half short side: the
// reference tile spans 75% of the photo with its halo, 70% without.
const TILE_HALF = 0.7
// Floor line, frame-fixed, in half-short-sides below centre (the photo's horizon).
const HORIZON = -0.74
// Strands per square CSS pixel of tile at Density 5: about four hairs deep
// everywhere, so the undercoat only shows where the fur parts.
const STRANDS_PER_PX = 0.5
const MAX_STRANDS = 260000
// Segments per hair, drawn as two half-strands so every tip lands over every root.
const SEG = 4
const HALF_SEG = SEG / 2
const GRID = 48
const ART = 512
const FLOW = 64
const PIXEL_BUDGET = 2_600_000

// ── shaders ──

const COMMON = /* glsl */ `
uniform vec2 uHalf;
uniform float uCorner, uBevel, uDome;
uniform mat3 uRot;
uniform float uCam;
uniform vec2 uFrame, uRollCS, uOff;

// Signed distance to the rounded-square footprint, and its gradient.
float sdTile(vec2 p, out vec2 g) {
    vec2 sp = vec2(p.x < 0.0 ? -1.0 : 1.0, p.y < 0.0 ? -1.0 : 1.0);
    vec2 q = abs(p) - uHalf + uCorner;
    if (q.x > 0.0 && q.y > 0.0) { float l = length(q); g = q / l * sp; return l - uCorner; }
    g = q.x > q.y ? vec2(sp.x, 0.0) : vec2(0.0, sp.y);
    return max(q.x, q.y) - uCorner;
}
// Cushion: round bevel off the footprint edge plus a shallow dome.
vec3 surf(vec2 p, out vec3 n) {
    vec2 g; float d = sdTile(p, g);
    float e = max(-d, 0.0);
    float q = clamp(e / uBevel, 0.02, 1.0);
    float r = 1.0 - q;
    float rr = sqrt(1.0 - r * r);
    float z = uBevel * rr;
    float dz = r / rr;
    float span = min(uHalf.x, uHalf.y);
    float c = clamp(e / span, 0.0, 1.0);
    z += uDome * (1.0 - (1.0 - c) * (1.0 - c));
    dz += uDome * 2.0 * (1.0 - c) / span;
    n = normalize(vec3(g * dz, 1.0));
    return vec3(p, z);
}
// Tile-local point → NDC: turn, perspective, roll about the content centre, then offset.
vec2 toNdc(vec3 local) {
    vec3 w = uRot * local;
    vec2 xy = w.xy * (uCam / (uCam - w.z));
    xy = vec2(uRollCS.x * xy.x + uRollCS.y * xy.y, -uRollCS.y * xy.x + uRollCS.x * xy.y);
    return xy / uFrame + uOff;
}
vec3 toSrgb(vec3 c) { return pow(max(c, 0.0), vec3(1.0 / 2.2)); }
`

const BG_VERT = /* glsl */ `#version 300 es
void main() {
    vec2 p = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
    gl_Position = vec4(p, 0.0, 1.0);
}`

const BG_FRAG = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec3 uBg, uWash;
uniform vec4 uTileBox;  // centre px, half-size px
uniform vec4 uShadowP;  // centre px, radii px
uniform float uGlow, uShadowK, uHorizon, uFade;
out vec4 o;
vec3 toSrgb(vec3 c) { return pow(max(c, 0.0), vec3(1.0 / 2.2)); }
void main() {
    vec2 px = gl_FragCoord.xy;
    float m = 0.5 * min(uRes.x, uRes.y);
    vec2 c = (px - 0.5 * uRes) / m;
    // Wall: deep red, a warm key wash high up, red spill around the tile.
    vec3 col = uBg * 0.14;
    col += uWash * exp(-(c.x * c.x * 1.4 + (c.y - 1.05) * (c.y - 1.05) * 1.1));
    vec2 tq = (px - uTileBox.xy) / uTileBox.zw;
    float tr = max(max(abs(tq.x), abs(tq.y)) - 0.9, 0.0);
    col += uBg * uGlow * 0.6 * exp(-tr * tr * 9.0) * uFade;
    // Floor below the horizon, catching a little more light near the line.
    float fy = (uHorizon - px.y) / m;
    vec3 floorC = uBg * (1.45 + 0.5 * exp(-fy * fy * 600.0));
    col = mix(col, floorC, smoothstep(-0.03, 0.06, fy));
    // Red bounce right under the tile, then its soft shadow further out.
    vec2 sq = (px - uShadowP.xy) / uShadowP.zw;
    col *= 1.0 - uShadowK * 0.6 * exp(-dot(sq, sq) * 1.4) * uFade;
    vec2 bq = (px - uShadowP.xy - vec2(0.0, uShadowP.w * 0.9)) / (uShadowP.zw * vec2(0.5, 0.6));
    col += uBg * uGlow * 2.2 * exp(-dot(bq, bq)) * uFade;
    col *= 1.0 - 0.8 * smoothstep(0.6, 1.6, length(c * vec2(0.9, 1.0)));
    // A little static dither so the dark gradients never band.
    uvec2 ip = uvec2(px);
    uint hsh = ip.x * 1597334677u ^ ip.y * 3812015801u;
    hsh = (hsh ^ (hsh >> 16)) * 0x7feb352du;
    float n = float(hsh >> 8) / 16777216.0;
    o = vec4(toSrgb(col) + (n - 0.5) / 255.0, 1.0);
}`

const SHADE = /* glsl */ `
uniform sampler2D uArt;  // sRGB texture: samples arrive linear
uniform vec3 uLight, uBounceC, uKeyC;
uniform vec2 uDown;
uniform float uKeyLow, uKey, uFade;
float keyGrad(vec3 P0) {
    // Softbox above the tile: brighter toward the light's side of the tile.
    vec2 ld = uLight.xy;
    float l = length(ld);
    float k = l > 1e-3 ? dot((uRot * P0).xy, ld / l) / max(uHalf.x, uHalf.y) : 0.0;
    // The cushion's lower roll sits in its own shadow above the floor.
    return mix(uKeyLow, 1.0, smoothstep(-1.15, 0.7, k)) * mix(0.5, 1.0, smoothstep(-1.1, -0.7, k));
}
vec2 artUv(vec2 p) { return vec2(p.x / uHalf.x, -p.y / uHalf.y) * 0.5 + 0.5; }
`

const UNDER_VERT = /* glsl */ `#version 300 es
precision highp float;
${COMMON}
${SHADE}
uniform float uUnder;
out vec2 vP;
out vec3 vCol;
const int G = ${GRID};
void main() {
    int cell = gl_VertexID / 6;
    int k = gl_VertexID % 6;
    ivec2 off = k == 0 ? ivec2(0, 0) : k == 1 || k == 4 ? ivec2(1, 0) : k == 2 || k == 3 ? ivec2(0, 1) : ivec2(1, 1);
    vec2 g = vec2(ivec2(cell % G, cell / G) + off) / float(G);
    vec2 p = (g * 2.0 - 1.0) * uHalf;
    vec3 N;
    vec3 P = surf(p, N);
    vec3 Nw = normalize(uRot * N);
    vec3 alb = texture(uArt, artUv(p)).rgb;
    float lam = max(dot(Nw, uLight), 0.0) * 0.75 + 0.25;
    vCol = alb * uUnder * vec3(1.0, 0.85, 0.7) * (uKeyC * lam * keyGrad(P) * uKey + uBounceC * max(dot(Nw.xy, uDown), 0.0) * 0.5);
    vP = p;
    gl_Position = vec4(toNdc(P), 0.0, 1.0);
}`

const UNDER_FRAG = /* glsl */ `#version 300 es
precision highp float;
${COMMON}
uniform float uPx;
uniform float uFade;
in vec2 vP;
in vec3 vCol;
out vec4 o;
void main() {
    vec2 g;
    // Slightly inside the footprint, so the rim's hair halo covers its edge.
    float d = sdTile(vP, g) + 0.012 * min(uHalf.x, uHalf.y);
    float a = (1.0 - smoothstep(-uPx, uPx, d)) * uFade;
    o = vec4(toSrgb(vCol) * a, a);
}`

const HASH = /* glsl */ `
uint hashu(uint x) { x ^= x >> 16; x *= 0x7feb352du; x ^= x >> 15; x *= 0x846ca68bu; x ^= x >> 16; return x; }
float h01(uint x) { return float(hashu(x) >> 8) * (1.0 / 16777216.0); }
`

/**
 * Per-hair setup, run once per change through transform feedback (in a unit
 * tile, so the entrance and Scale only rescale it): root, surface frame, lie
 * direction, tuft pull. The per-frame strand shader just reads it back.
 */
const PREP_VERT = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
${COMMON}
${HASH}
uniform sampler2D uFlow;
uniform float uLift, uSpread, uClump, uCs, uRimFrac, uEmboss;
uniform uint uSeed;
out vec4 oA; // root, crimp phase
out vec4 oB; // normal, lift
out vec4 oC; // lie direction, tuft brightness
out vec4 oD; // tuft pull, length factor (0 = no hair)
void main() {
    uint id = uint(gl_VertexID);
    uint hb = hashu(id + uSeed * 7919u) * 16u;
    float h0 = h01(hb), h1 = h01(hb + 1u), h2 = h01(hb + 2u), h3 = h01(hb + 3u);
    float h4 = h01(hb + 4u), h5 = h01(hb + 5u), h7 = h01(hb + 7u);
    vec2 g;
    vec2 p;
    float alive = 1.0;
    bool rim = h0 < uRimFrac;
    if (rim) {
        // Rim roots: march from the centre out to the edge along a random heading,
        // then sink a little way in, so the halo rings the whole silhouette.
        float an = h1 * 6.2831853;
        vec2 dir = vec2(cos(an), sin(an));
        float t = 0.0;
        for (int i = 0; i < 6; i++) t -= sdTile(dir * t, g);
        p = dir * t;
        sdTile(p, g);
        p -= g * (h2 * h2 * 0.45 * uBevel);
    } else {
        // Interior roots on the R2 low-discrepancy sequence: even cover at any count,
        // and a lower Density is a prefix of a higher one.
        uint k = id + uSeed * 100003u;
        vec2 r2 = vec2(float(k * 3242174889u + 2147483648u), float(k * 2447445414u + 2147483648u)) * (1.0 / 4294967296.0);
        p = (r2 * 2.0 - 1.0) * uHalf;
        if (sdTile(p, g) > 0.0) alive = 0.0;
    }
    vec3 N;
    vec3 P0 = surf(p, N);
    vec2 uv = vec2(p.x / uHalf.x, -p.y / uHalf.y) * 0.5 + 0.5;

    // Appliqué: the artwork's pile stands proud of the base fur, so its upper
    // edges catch the softbox and its lower edges fall into shade.
    const float TX = 1.0 / float(${FLOW});
    float hC = texture(uFlow, uv).b;
    float hx = (texture(uFlow, uv + vec2(TX, 0.0)).b - texture(uFlow, uv - vec2(TX, 0.0)).b) / (4.0 * TX * uHalf.x);
    float hy = -(texture(uFlow, uv + vec2(0.0, TX)).b - texture(uFlow, uv - vec2(0.0, TX)).b) / (4.0 * TX * uHalf.y);
    float inside = smoothstep(0.0, uBevel, -sdTile(p, g));
    P0.z += uEmboss * hC * inside;
    N = normalize(N - vec3(hx, hy, 0.0) * uEmboss * inside);

    // Lie direction from the flow field, projected onto the surface, fanned a little.
    vec2 fl = texture(uFlow, uv).rg * 2.0 - 1.0;
    vec3 t3 = vec3(fl.x, -fl.y, 0.0);
    vec3 T = t3 - N * dot(t3, N);
    float tl = length(T);
    T = tl > 0.05 ? T / tl : normalize(cross(N, vec3(0.0, 1.0, 0.0)) + vec3(1e-4, 0.0, 0.0));
    float fan = (h3 - 0.5) * uSpread;
    T = T * cos(fan) + cross(N, T) * sin(fan);

    // Tufts: hairs gather toward the nearest clump centre, so their tips meet and
    // dark partings open between clumps, as in real plush.
    vec2 ci = floor(p / uCs);
    vec2 best = p;
    float bd = 1e9;
    uint cid = 0u;
    for (int j = -1; j <= 1; j++)
        for (int i = -1; i <= 1; i++) {
            ivec2 cc = ivec2(ci) + ivec2(i, j);
            uint hh = hashu(uint(cc.x + 8192) * 73856093u ^ uint(cc.y + 8192) * 19349663u ^ (uSeed * 83492791u));
            vec2 pt = (vec2(cc) + vec2(h01(hh), h01(hh ^ 0x9e3779b9u))) * uCs;
            float d2 = dot(pt - p, pt - p);
            if (d2 < bd) { bd = d2; best = pt; cid = hh; }
        }
    vec3 pull = vec3(best - p, 0.0);
    pull = (pull - N * dot(pull, N)) * (rim ? 0.3 * uClump : uClump);
    float tuft = 1.0 + (h01(cid ^ 0x5bd1e995u) - 0.5) * 0.3;

    // At the whorl's source hair stands up in a crown instead of parting to the skin.
    float crown = mix(3.0, 1.0, texture(uFlow, uv).a);
    float lift = (rim ? max(uLift, 1.4) : uLift * crown) * (0.6 + 0.8 * h4);
    oA = vec4(P0, h7 * 6.2831853);
    oB = vec4(N, lift);
    oC = vec4(T, tuft);
    oD = vec4(pull, alive * (0.55 + 0.9 * h5));
    gl_Position = vec4(0.0);
}`

const PREP_FRAG = /* glsl */ `#version 300 es
precision highp float;
out vec4 o;
void main() { o = vec4(0.0); }`

const STRAND_VERT = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
${COMMON}
${SHADE}
${HASH}
layout(location = 0) in vec4 aA;
layout(location = 1) in vec4 aB;
layout(location = 2) in vec4 aC;
layout(location = 3) in vec4 aD;
uniform vec2 uRes;
uniform vec3 uGrav;
uniform vec4 uBrush;  // local xy, radius, strength
uniform float uLen, uFrizz, uGrow, uTime, uBreeze, uWidth;
uniform float uJitter, uTipFade, uRootShade, uSheen, uRim, uCount, uDepth;
uniform uint uSeed;
uniform int uSegBase;
out vec4 vCol;
out float vDist;
out float vHalf;
out vec2 vCrimp;  // position along the hair, glint phase
const int SEG = ${SEG};

void main() {
    if (aD.w <= 0.0) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); vCol = vec4(0.0); vDist = 0.0; vHalf = 0.0; vCrimp = vec2(0.0); return; }
    int seg = (gl_VertexID >> 1) + uSegBase;
    float side = (gl_VertexID & 1) == 0 ? -1.0 : 1.0;
    float s = float(seg) / float(SEG);
    uint id = uint(gl_InstanceID);
    uint hb = hashu(id ^ (uSeed * 0x2545F491u) ^ 0xA511E9B3u);
    float hj = float(hb & 1023u) / 1023.0;
    float hw = float((hb >> 10) & 1023u) / 1023.0;
    float hc = float((hb >> 20) & 1023u) / 1023.0;

    float a = uHalf.x;
    vec3 P0 = aA.xyz * a;
    vec3 N = aB.xyz;
    vec3 T = aC.xyz;
    vec3 B = cross(N, T);
    float lift = aB.w;
    float ph0 = aA.w;
    float curlF = 2.0 + 4.0 * hc;
    vec3 pull = aD.xyz * a;
    // Halo hairs (lift > 1.2 marks the rim) are the short, fine fringe round the silhouette.
    bool rimHair = lift > 1.2;
    float L = uLen * aD.w * uGrow * (rimHair ? 0.75 : 1.0);

    // Finger through the fur: strands near the cursor lean away from it and flatten.
    vec2 dv = P0.xy - uBrush.xy;
    float dd = dot(dv, dv);
    float fb = uBrush.w * exp(-dd / (uBrush.z * uBrush.z));
    vec3 bp = vec3(dv * inversesqrt(dd + 1e-6), 0.0);
    bp -= N * dot(bp, N);
    vec3 D0 = normalize(N * lift * (1.0 - 0.7 * min(fb, 1.0)) + T + bp * fb * 1.5);
    vec3 bend = T * 0.6 + uGrav * (rimHair ? 0.2 : 0.35) - N * lift * 0.3 + bp * fb * 1.5;
    vec2 wv = vec2(sin(uTime * 1.7 + P0.x * 6.0 + P0.y * 2.5 + hc * 1.5), cos(uTime * 1.3 + P0.y * 5.0 - P0.x * 3.0 + hj * 2.0));
    bend += vec3(wv, 0.0) * uBreeze;

    // Position and tangent along the hair: rise, lie down along the flow, droop,
    // wander, a fine crimp, and the pull into its tuft toward the tip.
    float ph = ph0 + s * curlF;
    float k1 = uFrizz * 0.18, k2 = uFrizz * 0.08;
    vec3 cw = B * sin(ph) + N * 0.4 * cos(ph);
    float cr = ph0 * 3.0 + s * 9.0;
    vec3 curl = cw * (k1 * s) + B * (sin(cr) * k2);
    vec3 dcurl = (B * cos(ph) - N * 0.4 * sin(ph)) * (curlF * k1 * s) + cw * k1 + B * (cos(cr) * 9.0 * k2);
    float rs = sqrt(s);
    vec3 P = P0 + L * (D0 * s + bend * (0.5 * s * s) + curl) + pull * (s * rs);
    vec3 dP = L * (D0 + bend * s + dcurl) + pull * (1.5 * rs);

    vec2 ndc = toNdc(P);
    vec2 dpx = (toNdc(P + dP * 0.02) - ndc) * uRes;
    vec2 perp = normalize(vec2(-dpx.y, dpx.x) + 1e-6);
    float w = uWidth * (1.0 - 0.5 * s) * (0.8 + 0.4 * hw) * (rimHair ? 0.75 : 1.0);
    float cov = min(w, 1.0);
    w = max(w, 1.0);
    // Half a pixel past the edge is all the coverage ramp below reaches.
    float hwid = 0.5 * w + 0.6;
    vDist = side * hwid;
    vHalf = 0.5 * w;
    vCrimp = vec2(s, hc * 6.2831853);
    gl_Position = vec4(ndc + perp * (side * hwid * 2.0) / uRes, 0.0, 1.0);

    // Kajiya-Kay hair under a top softbox, floor bounce from below, backlit rim.
    // Hairs drawn later sit on top: the R2 order keeps every prefix even, so the
    // first-drawn (buried) hairs shade darker and the last-drawn catch the light.
    vec3 Nw = normalize(uRot * N);
    vec3 Tw = normalize(uRot * dP);
    float layer = mix(1.0 - uDepth, 1.0, sqrt(float(id) / uCount));
    vec3 alb = texture(uArt, artUv(P0.xy)).rgb * (1.0 + (hj - 0.5) * 2.0 * uJitter) * aC.w * layer;
    float kg = keyGrad(P0);
    float tl2 = dot(Tw, uLight);
    float kk = sqrt(max(1.0 - tl2 * tl2, 0.0));
    float lam = max(dot(Nw, uLight), 0.0) * 0.9 + 0.1;
    // Light that reaches deep into pale fur has scattered off other hairs: its roots stay
    // lighter and its shadows go amber, not grey. Dyed fur keeps its own hue.
    float pale = min(min(alb.r, alb.g), alb.b) / max(max(alb.r, alb.g), max(alb.b, 1e-4));
    float ao1 = mix(1.0 - uRootShade * (1.0 - 0.35 * pale), 1.0, smoothstep(0.0, 1.0, s));
    vec3 ao = ao1 * mix(vec3(1.0), vec3(1.12, 0.94, 0.78), (1.0 - ao1) * pale);
    vec3 H = normalize(uLight + vec3(0.0, 0.0, 1.0));
    float th = dot(Tw, H);
    float sh = max(1.0 - th * th, 0.0);
    float spec = pow(sh, 24.0) * uSheen * kg * smoothstep(0.15, 0.9, s);
    float rimL = pow(1.0 - abs(Nw.z), 2.0) * s * uRim * kg * kg;
    vec3 sheenC = mix(alb * 1.6, vec3(1.0), 0.15 + 0.85 * pale * pale);
    // Pale fur out of the key is lit by light that has passed through other hairs: amber.
    vec3 warm = mix(vec3(1.0, 0.8, 0.62), vec3(1.0), mix(1.0, smoothstep(0.08, 0.6, lam * kg), pale));
    vec3 col = alb * (uKeyC * warm * lam * (0.55 + 0.45 * kk) * kg * ao * uKey + uBounceC * max(dot(Nw.xy, uDown), 0.0) * ao + uKeyC * rimL)
             + uKeyC * (sheenC * spec + alb * pow(sh, 8.0) * uSheen * 0.35 * kg);
    float al = cov * uFade * (1.0 - uTipFade * smoothstep(0.55, 1.0, s));
    vCol = vec4(toSrgb(col) * al, al);
}`

const STRAND_FRAG = /* glsl */ `#version 300 es
precision highp float;
uniform float uCrimpK;
in vec4 vCol;
in float vDist;
in float vHalf;
in vec2 vCrimp;
out vec4 o;
void main() {
    // Analytic coverage across the strand: smooth lines without MSAA.
    float cov = clamp(vHalf + 0.5 - abs(vDist), 0.0, 1.0);
    // A crimped fibre turns in and out of the light along its length: periodic glints,
    // far finer than the strand's own segments.
    float g = sin(vCrimp.x * 22.0 + vCrimp.y);
    float glint = 1.0 + uCrimpK * (g * g - 0.5);
    o = vec4(vCol.rgb * glint, vCol.a) * cov;
}`

// ── artwork + flow field (CPU, rebuilt only when the picture or its framing changes) ──

type ImgEntry = { img: HTMLImageElement; done: boolean; ok: boolean; listeners: Set<() => void> }
const IMAGES = new Map<string, ImgEntry>()

function requestImage(src: string, onReady: () => void): ImgEntry {
    let e = IMAGES.get(src)
    if (!e) {
        const img = new window.Image()
        img.crossOrigin = "anonymous"
        img.decoding = "async"
        const entry: ImgEntry = { img, done: false, ok: false, listeners: new Set() }
        const finish = (ok: boolean) => {
            entry.done = true
            entry.ok = ok && img.naturalWidth > 0
            entry.listeners.forEach((f) => f())
            entry.listeners.clear()
        }
        img.onload = () => finish(true)
        img.onerror = () => finish(false)
        img.src = src
        IMAGES.set(src, entry)
        e = entry
    }
    if (!e.done) e.listeners.add(onReady)
    return e
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
}

/**
 * The reference's envelope glyph, in units of the photo's tile measured with its
 * halo; that box is 4% wider than the cushion's footprint, so Size 92 draws it
 * at the photo's framing.
 */
function drawGlyph(ctx: CanvasRenderingContext2D, S: number, size: number) {
    const k = (size / 92) * 1.043
    const U = (u: number) => S * (0.5 + (u - 0.5) * k)
    const L = (u: number) => S * u * k
    ctx.fillStyle = GLYPH.blue
    roundRect(ctx, U(0.04), U(0.3), L(0.212), L(0.575), L(0.06))
    ctx.fill()
    ctx.fillStyle = GLYPH.green
    roundRect(ctx, U(0.748), U(0.3), L(0.212), L(0.575), L(0.06))
    ctx.fill()
    const stroke = () => {
        ctx.beginPath()
        ctx.moveTo(U(0.15), U(0.245))
        ctx.lineTo(U(0.501), U(0.505))
        ctx.lineTo(U(0.851), U(0.245))
        ctx.stroke()
    }
    ctx.lineWidth = L(0.205)
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = GLYPH.red
    stroke()
    ctx.save()
    ctx.beginPath()
    ctx.rect(U(0.745), 0, S, S)
    ctx.clip()
    ctx.strokeStyle = GLYPH.yellow
    stroke()
    ctx.restore()
}

/** `glyph`: with no picture, draw the reference envelope (no Image set) or leave plain fur (one is set but not usable yet). */
function paintArt(ctx: CanvasRenderingContext2D, fur: RGBA, img: HTMLImageElement | null, art: Artwork, glyph: boolean) {
    const S = ART
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalCompositeOperation = "source-over"
    ctx.globalAlpha = 1
    ctx.fillStyle = `rgb(${Math.round(fur[0] * 255)},${Math.round(fur[1] * 255)},${Math.round(fur[2] * 255)})`
    ctx.fillRect(0, 0, S, S)
    const size = clampN(art.size, 10, 100, DEFAULT_ARTWORK.size)
    if (!img) {
        if (glyph) drawGlyph(ctx, S, size)
        return
    }
    const box = (S * size) / 100
    const x0 = (S - box) / 2
    const iw = img.naturalWidth
    const ih = img.naturalHeight
    if (art.fit === "cover") {
        // Cover the box on the picture's own aspect; Y Offset picks the band, as objectPosition would.
        const k = Math.max(box / iw, box / ih)
        const dw = iw * k
        const dh = ih * k
        const f = 0.5 - clampN(art.offsetY, -250, 250, 0) / 500
        ctx.save()
        ctx.beginPath()
        ctx.rect(x0, x0, box, box)
        ctx.clip()
        ctx.drawImage(img, x0 + (box - dw) / 2, x0 - (dh - box) * f, dw, dh)
        ctx.restore()
    } else {
        const k = Math.min(box / iw, box / ih)
        ctx.drawImage(img, (S - iw * k) / 2, (S - ih * k) / 2, iw * k, ih * k)
    }
}

/**
 * Edge-tangent flow: hair lies along the artwork's edges (structure-tensor
 * minor eigenvector, heavily smoothed) and falls back to a combed radial
 * whorl where the picture is flat, as on the reference's white fur.
 */
function buildFlow(small: CanvasRenderingContext2D, art: HTMLCanvasElement, mode: Flow, edge: number, fur: RGBA, out: Uint8Array) {
    const n = FLOW
    let data: Uint8ClampedArray | null = null
    try {
        small.clearRect(0, 0, n, n)
        small.drawImage(art, 0, 0, n, n)
        data = small.getImageData(0, 0, n, n).data
    } catch {
        data = null
    }
    // Appliqué mask: wherever the picture departs from the base fur, the pile is raised.
    const mask = new Float32Array(n * n)
    if (data) {
        for (let i = 0; i < n * n; i++) {
            const dr = data[i * 4] / 255 - fur[0], dg = data[i * 4 + 1] / 255 - fur[1], db = data[i * 4 + 2] / 255 - fur[2]
            mask[i] = Math.min(1, Math.sqrt(dr * dr + dg * dg + db * db) * 2.5)
        }
        // Blurred to a padded cross-section: each shape domes up from its edges.
        const tmpM = new Float32Array(n * n)
        for (let pass = 0; pass < 3; pass++) {
            for (let y = 0; y < n; y++)
                for (let x = 0; x < n; x++) {
                    let sum = 0
                    for (let k = -2; k <= 2; k++) sum += mask[y * n + Math.min(n - 1, Math.max(0, x + k))]
                    tmpM[y * n + x] = sum / 5
                }
            for (let y = 0; y < n; y++)
                for (let x = 0; x < n; x++) {
                    let sum = 0
                    for (let k = -2; k <= 2; k++) sum += tmpM[Math.min(n - 1, Math.max(0, y + k)) * n + x]
                    mask[y * n + x] = sum / 5
                }
        }
    }
    if (mode !== "art" || edge <= 0) data = null
    const E = new Float32Array(n * n)
    const F = new Float32Array(n * n)
    const G = new Float32Array(n * n)
    if (data) {
        const px = (x: number, y: number, c: number) => data![((Math.min(n - 1, Math.max(0, y)) * n + Math.min(n - 1, Math.max(0, x))) << 2) + c] / 255
        for (let y = 0; y < n; y++)
            for (let x = 0; x < n; x++) {
                let e = 0, f = 0, g = 0
                for (let c = 0; c < 3; c++) {
                    const gx = px(x + 1, y - 1, c) + 2 * px(x + 1, y, c) + px(x + 1, y + 1, c) - px(x - 1, y - 1, c) - 2 * px(x - 1, y, c) - px(x - 1, y + 1, c)
                    const gy = px(x - 1, y + 1, c) + 2 * px(x, y + 1, c) + px(x + 1, y + 1, c) - px(x - 1, y - 1, c) - 2 * px(x, y - 1, c) - px(x + 1, y - 1, c)
                    e += gx * gx
                    f += gx * gy
                    g += gy * gy
                }
                const i = y * n + x
                E[i] = e
                F[i] = f
                G[i] = g
            }
        const tmp = new Float32Array(n * n)
        const blur = (a: Float32Array) => {
            const r = 3
            for (let pass = 0; pass < 2; pass++) {
                for (let y = 0; y < n; y++)
                    for (let x = 0; x < n; x++) {
                        let s = 0
                        for (let k = -r; k <= r; k++) s += a[y * n + Math.min(n - 1, Math.max(0, x + k))]
                        tmp[y * n + x] = s / (2 * r + 1)
                    }
                for (let y = 0; y < n; y++)
                    for (let x = 0; x < n; x++) {
                        let s = 0
                        for (let k = -r; k <= r; k++) s += tmp[Math.min(n - 1, Math.max(0, y + k)) * n + x]
                        a[y * n + x] = s / (2 * r + 1)
                    }
            }
        }
        blur(E)
        blur(F)
        blur(G)
    }
    let maxMag = 0
    for (let i = 0; i < n * n; i++) {
        const l1 = (E[i] + G[i]) / 2 + Math.sqrt(((E[i] - G[i]) / 2) ** 2 + F[i] * F[i])
        maxMag = Math.max(maxMag, Math.sqrt(l1))
    }
    const ref = Math.max(0.4 * maxMag, 0.05)
    for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
            const i = y * n + x
            const cx = (x + 0.5) / n - 0.5
            const cy = (y + 0.5) / n - 0.5
            const rl = Math.hypot(cx, cy) + 1e-6
            let bx: number, by: number
            if (mode === "down") {
                bx = cx * 0.4
                by = 1
            } else {
                // Combed whorl: outward from the centre with a little gravity, brushed
                // downward right at the centre so no starburst shows.
                const k = Math.min(1, rl * 5) / rl
                bx = cx * k
                by = cy * k + 0.1 + 0.9 * Math.max(0, 1 - rl * 4)
            }
            const bl = Math.hypot(bx, by) + 1e-6
            bx /= bl
            by /= bl
            // Near the whorl's source the base field fades out; mark it so hair stands up there.
            let src = Math.min(1, bl / 0.6)
            let dx = bx, dy = by
            if (data) {
                const e = E[i], f = F[i], g = G[i]
                const half = Math.sqrt(((e - g) / 2) ** 2 + f * f)
                const l1 = (e + g) / 2 + half
                const l2 = (e + g) / 2 - half
                let vx = e >= g ? l1 - g : f
                let vy = e >= g ? f : l1 - e
                const vl = Math.hypot(vx, vy)
                if (vl > 1e-9) {
                    vx /= vl
                    vy /= vl
                    // Comb along the edge without choosing a direction for it: take the base
                    // direction and remove only the part that would cross the edge (v is the
                    // edge normal). Picking a sign for the edge tangent instead flips it
                    // somewhere along every curved edge and opens a seam there.
                    const coh = (l1 - l2) / (l1 + l2 + 1e-9)
                    const w = Math.min(1, (Math.sqrt(l1) / ref) ** 2) * coh * edge
                    src = Math.max(src, w)
                    const across = (bx * vx + by * vy) * Math.min(w, 0.92)
                    dx = bx - vx * across
                    dy = by - vy * across
                    const dl = Math.hypot(dx, dy) + 1e-9
                    dx /= dl
                    dy /= dl
                }
            }
            out[i * 4] = Math.round((dx * 0.5 + 0.5) * 255)
            out[i * 4 + 1] = Math.round((dy * 0.5 + 0.5) * 255)
            out[i * 4 + 2] = Math.round(mask[i] * 255)
            out[i * 4 + 3] = Math.round(src * 255)
        }
}

// ── component ──

export interface PlushTileProps {
    /** The picture the fur is grown from. Empty draws the reference's four-colour envelope. */
    image?: ImageValue
    /** How the picture sits on the tile. */
    artwork?: Partial<Artwork>
    /** The studio: wall, floor and the glow around the tile are all shades of it. */
    background?: string
    /** Colour of the fur wherever the picture is transparent or does not reach. */
    furColor?: string
    /** Density, length, lift, frizz and lie of the hair. */
    fur?: Partial<Fur>
    /** How big the tile draws; 100% is the reference framing. */
    scale?: number
    /** Corner radius as a share of the tile's half-width; 100% is a disc. */
    radius?: number
    /** Cushion thickness: how round and deep the bevel is. */
    puff?: number
    placement?: Partial<Placement>
    /** Fur grows in from the roots as the tile fades up. Plays in its own rAF loop, so there is no Transition row. */
    entrance?: Partial<Entrance>
    response?: Partial<Response>
    /** Idle stir of the hair tips; 0 lets the tile settle and stop drawing. */
    breeze?: number
    advanced?: Partial<Advanced>
    style?: CSSProperties
}

export default function PlushTile({
    image = {"alt":"","src":"https://cdn.brandfetch.io/idGP0S1Jjj/theme/dark/symbol.svg?c=1dxbfHSJFAPEGdCLU4o5B"},
    artwork = {"fit":"contain","size":72,"offsetY":0},
    background = DEFAULTS.background,
    furColor = DEFAULTS.furColor,
    fur = {"flow":"art","lift":5,"frizz":6,"length":6,"density":5},
    scale = DEFAULTS.scale,
    radius = DEFAULTS.radius,
    puff = DEFAULTS.puff,
    placement = {"x":0,"y":0,"tilt":0,"angle":0},
    entrance = {"delay":0.1,"animate":true,"duration":1.6},
    response = {"reach":5,"parallax":4,"strength":6,"dragRotate":false,"dragIntensity":5},
    breeze = DEFAULTS.breeze,
    advanced = {"glow":60,"lens":20,"seed":0,"clump":28,"crimp":20,"sheen":25,"bounce":55,"emboss":50,"shadow":50,"tipFade":25,"edgeFlow":75,"rimLight":90,"rimShare":26,"hairWidth":0.85,"rootShade":60,"undercoat":22,"depthShade":45,"keyFalloff":75,"lightAngle":100,"lightColor":"#FFF4E6","colorJitter":22,"lightHeight":40},
    style,
}: PlushTileProps) {
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const art = { ...DEFAULT_ARTWORK, ...artwork }
    const fr = { ...DEFAULT_FUR, ...fur }
    const adv = { ...DEFAULT_ADVANCED, ...advanced }
    const src = imageOf(image)
    // Merged at render, so the frame loop reads plain values and allocates nothing.
    const cfg = {
        src,
        background,
        furColor,
        scale,
        radius,
        puff,
        breeze,
        art,
        fur: fr,
        pl: { ...DEFAULT_PLACEMENT, ...placement },
        en: { ...DEFAULT_ENTRANCE, ...entrance },
        rs: { ...DEFAULT_RESPONSE, ...response },
        adv,
        // Everything the artwork and flow textures are built from.
        artKey: [src, art.fit, art.size, art.offsetY, furColor, fr.flow, adv.edgeFlow].join("|"),
    }
    const cfgRef = useRef(cfg)
    cfgRef.current = cfg
    const wakeRef = useRef<() => void>(() => {})
    // Bumped when the GPU drops the context, so the effect rebuilds everything.
    const [generation, setGeneration] = useState(0)

    // Every prop change redraws, even when the loop has settled to zero.
    useEffect(() => wakeRef.current())

    useEffect(() => {
        const rootEl = rootRef.current
        const canvasEl = canvasRef.current
        if (!rootEl || !canvasEl) return
        const ctx = canvasEl.getContext("webgl2", {
            alpha: false,
            antialias: false,
            depth: false,
            stencil: false,
            premultipliedAlpha: true,
            powerPreference: "low-power",
            preserveDrawingBuffer: false,
        }) as WebGL2RenderingContext | null
        // No WebGL2: the root's CSS Background stays showing.
        if (!ctx) return
        const root: HTMLDivElement = rootEl
        const canvas: HTMLCanvasElement = canvasEl
        const gl: WebGL2RenderingContext = ctx

        const shaders: WebGLShader[] = []
        const programs: WebGLProgram[] = []
        const build = (vs: string, fs: string, varyings?: string[]) => {
            const compile = (type: number, s: string) => {
                const sh = gl.createShader(type)!
                gl.shaderSource(sh, s)
                gl.compileShader(sh)
                if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || "shader")
                shaders.push(sh)
                return sh
            }
            const p = gl.createProgram()!
            gl.attachShader(p, compile(gl.VERTEX_SHADER, vs))
            gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs))
            if (varyings) gl.transformFeedbackVaryings(p, varyings, gl.INTERLEAVED_ATTRIBS)
            gl.linkProgram(p)
            if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || "link")
            programs.push(p)
            return p
        }
        let bgProg: WebGLProgram, underProg: WebGLProgram, prepProg: WebGLProgram, strandProg: WebGLProgram
        try {
            bgProg = build(BG_VERT, BG_FRAG)
            underProg = build(UNDER_VERT, UNDER_FRAG)
            prepProg = build(PREP_VERT, PREP_FRAG, ["oA", "oB", "oC", "oD"])
            strandProg = build(STRAND_VERT, STRAND_FRAG)
        } catch (err) {
            console.error("PlushTile:", err)
            return
        }
        const vao = gl.createVertexArray()
        gl.bindVertexArray(vao)
        // Per-hair records (4 × vec4), written by the prep pass, read per instance by the strands.
        const STRIDE = 64
        const strandBuf = gl.createBuffer()
        const strandVao = gl.createVertexArray()
        const tf = gl.createTransformFeedback()
        gl.bindVertexArray(strandVao)
        gl.bindBuffer(gl.ARRAY_BUFFER, strandBuf)
        for (let i = 0; i < 4; i++) {
            gl.enableVertexAttribArray(i)
            gl.vertexAttribPointer(i, 4, gl.FLOAT, false, STRIDE, i * 16)
            gl.vertexAttribDivisor(i, 1)
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, null)
        gl.bindVertexArray(vao)
        let capacity = 0
        // Inputs of the last prep run; it reruns only when one changes.
        const prepKey = new Float64Array(12).fill(NaN)
        let flowVersion = 0

        // Uniforms upload only when their value changed.
        type Slot = { loc: WebGLUniformLocation | null; v: number[] }
        const makeU = (prog: WebGLProgram) => {
            const slots = new Map<string, Slot>()
            const slot = (name: string) => {
                let s = slots.get(name)
                if (!s) {
                    s = { loc: gl.getUniformLocation(prog, name), v: [NaN, NaN, NaN, NaN] }
                    slots.set(name, s)
                }
                return s
            }
            const same = (s: Slot, a: number, b: number, c: number, d: number) => s.v[0] === a && s.v[1] === b && s.v[2] === c && s.v[3] === d
            const put = (s: Slot, a: number, b: number, c: number, d: number) => {
                s.v[0] = a; s.v[1] = b; s.v[2] = c; s.v[3] = d
            }
            return {
                f1(name: string, a: number) { const s = slot(name); if (same(s, a, 0, 0, 0)) return; put(s, a, 0, 0, 0); gl.uniform1f(s.loc, a) },
                u1(name: string, a: number) { const s = slot(name); if (same(s, a, 0, 0, 0)) return; put(s, a, 0, 0, 0); gl.uniform1ui(s.loc, a) },
                i1(name: string, a: number) { const s = slot(name); if (same(s, a, 0, 0, 0)) return; put(s, a, 0, 0, 0); gl.uniform1i(s.loc, a) },
                f2(name: string, a: number, b: number) { const s = slot(name); if (same(s, a, b, 0, 0)) return; put(s, a, b, 0, 0); gl.uniform2f(s.loc, a, b) },
                f3(name: string, a: number, b: number, c: number) { const s = slot(name); if (same(s, a, b, c, 0)) return; put(s, a, b, c, 0); gl.uniform3f(s.loc, a, b, c) },
                f4(name: string, a: number, b: number, c: number, d: number) { const s = slot(name); if (same(s, a, b, c, d)) return; put(s, a, b, c, d); gl.uniform4f(s.loc, a, b, c, d) },
                m3(name: string, m: Float32Array) { gl.uniformMatrix3fv(slot(name).loc, false, m) },
            }
        }
        const U_BG = makeU(bgProg)
        const U_UN = makeU(underProg)
        const U_ST = makeU(strandProg)
        const U_PR = makeU(prepProg)

        // Textures: artwork on unit 0, flow on unit 1.
        const artTex = gl.createTexture()
        const flowTex = gl.createTexture()
        const setupTex = (t: WebGLTexture | null, unit: number) => {
            gl.activeTexture(gl.TEXTURE0 + unit)
            gl.bindTexture(gl.TEXTURE_2D, t)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        }
        setupTex(artTex, 0)
        setupTex(flowTex, 1)
        gl.useProgram(underProg)
        U_UN.i1("uArt", 0)
        gl.useProgram(strandProg)
        U_ST.i1("uArt", 0)
        gl.useProgram(prepProg)
        U_PR.i1("uFlow", 1)
        const artCanvas = document.createElement("canvas")
        artCanvas.width = artCanvas.height = ART
        const artCtx = artCanvas.getContext("2d")!
        const smallCanvas = document.createElement("canvas")
        smallCanvas.width = smallCanvas.height = FLOW
        const smallCtx = smallCanvas.getContext("2d", { willReadFrequently: true })!
        const flowData = new Uint8Array(FLOW * FLOW * 4)
        let artKey = ""
        let artImgState = ""
        const tainted = new Set<string>()

        const rebuildArt = (c: typeof cfg, img: HTMLImageElement | null) => {
            const fur = parseColor(c.furColor, FUR_FALLBACK)
            paintArt(artCtx, fur, img, c.art, !c.src)
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, artTex)
            try {
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, artCanvas)
            } catch {
                // A picture served without CORS cannot reach the GPU: fall back to plain fur.
                if (img) tainted.add(c.src)
                paintArt(artCtx, fur, null, c.art, false)
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, artCanvas)
            }
            const flow = (["art", "radial", "down"] as const).includes(c.fur.flow) ? c.fur.flow : DEFAULT_FUR.flow
            buildFlow(smallCtx, artCanvas, flow, clampN(c.adv.edgeFlow, 0, 100, DEFAULT_ADVANCED.edgeFlow) / 100, fur, flowData)
            gl.activeTexture(gl.TEXTURE1)
            gl.bindTexture(gl.TEXTURE_2D, flowTex)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, FLOW, FLOW, 0, gl.RGBA, gl.UNSIGNED_BYTE, flowData)
            flowVersion++
        }

        // Layout size from ResizeObserver only; never read per frame.
        let cssW = Math.max(1, root.offsetWidth)
        let cssH = Math.max(1, root.offsetHeight)
        let quality = 1
        const applySize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            const budget = Math.min(1, Math.sqrt(PIXEL_BUDGET / Math.max(1, cssW * cssH * dpr * dpr)))
            const k = dpr * budget * quality
            const w = Math.max(1, Math.round(cssW * k))
            const h = Math.max(1, Math.round(cssH * k))
            if (canvas.width !== w) canvas.width = w
            if (canvas.height !== h) canvas.height = h
        }
        applySize()
        const ro = new ResizeObserver((entries) => {
            const r = entries[0].contentRect
            cssW = Math.max(1, r.width)
            cssH = Math.max(1, r.height)
            applySize()
            wake()
        })
        ro.observe(root)

        // Pointer: handlers only record; the rect is read once per frame, only after a move or scroll.
        const ptr = { cx: 0, cy: 0, u: 0.5, v: 0.5, over: false, moved: false }
        const onMove = (e: PointerEvent) => {
            // Browsers re-send moves at the same spot after layout; those change nothing.
            if (ptr.over && e.clientX === ptr.cx && e.clientY === ptr.cy) return
            ptr.cx = e.clientX
            ptr.cy = e.clientY
            ptr.over = true
            ptr.moved = true
            wake()
        }
        const onLeave = () => {
            ptr.over = false
            wake()
        }
        const onUp = (e: PointerEvent) => {
            // On touch, lifting the finger ends the hover.
            if (e.pointerType !== "mouse") onLeave()
        }
        const onScroll = () => {
            if (ptr.over) ptr.moved = true
        }
        root.addEventListener("pointerenter", onMove)
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerdown", onMove)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerup", onUp)
        root.addEventListener("pointercancel", onLeave)
        window.addEventListener("scroll", onScroll, { passive: true, capture: true })

        const mq = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null
        let reduced = !!mq?.matches
        const onMq = () => {
            reduced = !!mq?.matches
            wake()
        }
        mq?.addEventListener?.("change", onMq)

        // Off-screen instances and hidden tabs stop drawing entirely.
        let visible = true
        const io = new IntersectionObserver((es) => {
            visible = es[es.length - 1].isIntersecting
            wake()
        })
        io.observe(root)
        const onVis = () => wake()
        document.addEventListener("visibilitychange", onVis)

        let disposed = false
        let raf = 0
        const onLost = (e: Event) => {
            e.preventDefault()
            disposed = true
            cancelAnimationFrame(raf)
        }
        const onRestored = () => setGeneration((g) => g + 1)
        canvas.addEventListener("webglcontextlost", onLost)
        canvas.addEventListener("webglcontextrestored", onRestored)

        // The editor canvas shows the finished tile; previews and the live site play the entrance.
        const onCanvas = RenderTarget.current() === RenderTarget.canvas
        const rot = new Float32Array(9)
        const tc = [0, 0]
        const tb = [0, 0]
        // This frame's view and shared uniforms, filled in by the loop; kept here so the
        // loop allocates nothing.
        const view = { cam: 1, fx: 1, fy: 1, rcs: 1, rsn: 0, offX: 0, offY: 0 }
        const sh = { a: 1, rc: 0, bevel: 0, dome: 0, lx: 0, ly: 0, lz: 1, dnx: 0, dny: -1, b0: 0, b1: 0, b2: 0, keyLow: 0, k0: 1, k1: 1, k2: 1, fade: 1 }
        /** Tile-local point → device pixels (GL origin), the JS twin of toNdc. */
        const project = (x: number, y: number, z: number, out: number[]) => {
            const wx = rot[0] * x + rot[3] * y + rot[6] * z
            const wy = rot[1] * x + rot[4] * y + rot[7] * z
            const wz = rot[2] * x + rot[5] * y + rot[8] * z
            const s = view.cam / (view.cam - wz)
            const X = wx * s, Y = wy * s
            const nx = (view.rcs * X + view.rsn * Y) / view.fx + view.offX
            const ny = (-view.rsn * X + view.rcs * Y) / view.fy + view.offY
            out[0] = (nx * 0.5 + 0.5) * canvas.width
            out[1] = (ny * 0.5 + 0.5) * canvas.height
        }
        const setShared = (U: ReturnType<typeof makeU>) => {
            U.f2("uHalf", sh.a, sh.a)
            U.f1("uCorner", Math.min(sh.rc, sh.a * 0.999))
            U.f1("uBevel", Math.max(sh.bevel, 1e-3))
            U.f1("uDome", sh.dome)
            U.m3("uRot", rot)
            U.f1("uCam", view.cam)
            U.f2("uFrame", view.fx, view.fy)
            U.f2("uRollCS", view.rcs, view.rsn)
            U.f2("uOff", view.offX, view.offY)
            U.f3("uLight", sh.lx, sh.ly, sh.lz)
            U.f3("uBounceC", sh.b0, sh.b1, sh.b2)
            U.f2("uDown", sh.dnx, sh.dny)
            U.f1("uKeyLow", sh.keyLow)
            U.f1("uKey", 1.9)
            U.f3("uKeyC", sh.k0, sh.k1, sh.k2)
            U.f1("uFade", sh.fade)
        }
        const sm = { bx: 0, by: 0, bw: 0, yaw: 0, pitch: 0 }
        let entT = 0
        let clock = 0
        let lastDraw = -1
        let frameEma = 16.7
        let slowFrames = 0
        let fastFrames = 0
        let scheduled = false

        function wake() {
            if (disposed || scheduled) return
            scheduled = true
            raf = requestAnimationFrame(loop)
        }
        wakeRef.current = wake

        function loop(now: number) {
            scheduled = false
            if (disposed || !visible || document.hidden) {
                lastDraw = -1
                return
            }
            const c = cfgRef.current
            const adv = c.adv
            const en = c.en

            // Artwork: (re)build when the picture, its framing or the fur colour changed.
            let img: HTMLImageElement | null = null
            let imgState = "none"
            if (c.src && !tainted.has(c.src)) {
                const e = requestImage(c.src, wake)
                imgState = e.done ? (e.ok ? "ok" : "err") : "wait"
                if (e.done && e.ok) img = e.img
            }
            if (c.artKey !== artKey || imgState !== artImgState) {
                artKey = c.artKey
                artImgState = imgState
                rebuildArt(c, img)
            }

            const dur = clampN(en.duration, 0.1, 6, DEFAULT_ENTRANCE.duration)
            const delay = clampN(en.delay, 0, 5, DEFAULT_ENTRANCE.delay)
            const playEntrance = en.animate !== false && !reduced && !onCanvas
            const entDone = !playEntrance || entT >= delay + dur
            const breezeK = reduced ? 0 : clampN(c.breeze, 0, 10, DEFAULTS.breeze) / 10
            const par = clampN(c.rs.parallax, 0, 10, DEFAULT_RESPONSE.parallax) / 10
            const tYaw = ptr.over ? (ptr.u - 0.5) * 2 * par * 16 * D2R : 0
            const tPitch = ptr.over ? (0.5 - ptr.v) * 2 * par * 16 * D2R : 0
            const tBw = ptr.over ? clampN(c.rs.strength, 0, 10, DEFAULT_RESPONSE.strength) / 5 : 0
            const active =
                ptr.moved ||
                !entDone ||
                Math.abs(tBw - sm.bw) > 4e-3 ||
                Math.abs(tYaw - sm.yaw) + Math.abs(tPitch - sm.pitch) > 1e-4
            // 60 fps while anything moves; 30 fps for the breeze; nothing once settled.
            const gap = active ? 15 : 31
            if (lastDraw >= 0 && now - lastDraw < gap) {
                wake()
                return
            }
            const dt = lastDraw < 0 ? 0 : Math.min((now - lastDraw) / 1000, 1 / 20)
            if (lastDraw >= 0) {
                frameEma += (now - lastDraw - frameEma) * 0.1
                // Step resolution down when frames run long; win it back when there is room again.
                const target = gap + 2
                if (frameEma > target * 1.45) slowFrames++
                else slowFrames = 0
                if (frameEma < target * 1.1) fastFrames++
                else fastFrames = 0
                if (slowFrames > 20 && quality > 0.6) {
                    quality = Math.max(0.6, quality * 0.88)
                    slowFrames = 0
                    applySize()
                } else if (fastFrames > 180 && quality < 1) {
                    quality = Math.min(1, quality * 1.08)
                    fastFrames = 0
                    applySize()
                }
            }
            lastDraw = now
            entT += dt
            clock = (clock + dt) % 3600

            let movedNow = false
            if (ptr.moved) {
                ptr.moved = false
                movedNow = true
                // Normalised against the box as displayed, so canvas zoom and scaled previews stay exact.
                const r = root.getBoundingClientRect()
                ptr.u = (ptr.cx - r.left) / Math.max(1, r.width)
                ptr.v = (ptr.cy - r.top) / Math.max(1, r.height)
            }

            // Entrance: fur grows from the roots while the tile fades and settles up.
            const ge = playEntrance ? Math.min(1, Math.max(0, (entT - delay) / dur)) : 1
            const grow = 1 - Math.pow(1 - ge, 3)
            const fade = Math.min(1, ge / 0.35)

            // Geometry.
            const aFull = TILE_HALF * (clampN(c.scale, 25, 115, DEFAULTS.scale) / 100)
            const a = aFull * (0.94 + 0.06 * grow)
            const rc = a * (clampN(c.radius, 0, 100, DEFAULTS.radius) / 100)
            const pf = clampN(c.puff, 0, 10, DEFAULTS.puff)
            const bevel = a * (0.06 + 0.032 * pf)
            const dome = a * 0.012 * pf
            const fov = clampN(adv.lens, 5, 60, DEFAULT_ADVANCED.lens) * D2R
            const cam = 1 / Math.tan(fov / 2)
            const minCss = Math.min(cssW, cssH)
            const fx = cssW / minCss
            const fy = cssH / minCss
            const pl = c.pl
            const ang = clampN(pl.angle, -180, 180, 0) * D2R
            const rcs = Math.cos(ang)
            const rsn = Math.sin(ang)
            const offX = (clampN(pl.x, -50, 50, 0) / 100) * 2
            const offY = (-clampN(pl.y, -50, 50, 0) / 100) * 2

            // Lean toward the cursor is secondary motion; it eases slower than the brush.
            const kv = 1 - Math.exp(-dt * 6)
            sm.yaw += (tYaw - sm.yaw) * kv
            sm.pitch += (tPitch - sm.pitch) * kv
            if (Math.abs(tYaw - sm.yaw) + Math.abs(tPitch - sm.pitch) < 1e-4) {
                sm.yaw = tYaw
                sm.pitch = tPitch
            }
            const pitch = clampN(pl.tilt, -60, 60, 0) * D2R + sm.pitch
            const yaw = sm.yaw
            const cp = Math.cos(-pitch), sp = Math.sin(-pitch), cy = Math.cos(yaw), sy = Math.sin(yaw)
            // Rx(-pitch) · Ry(yaw), column-major.
            rot[0] = cy; rot[1] = sp * sy; rot[2] = -cp * sy
            rot[3] = 0; rot[4] = cp; rot[5] = sp
            rot[6] = sy; rot[7] = -sp * cy; rot[8] = cp * cy

            view.cam = cam
            view.fx = fx
            view.fy = fy
            view.rcs = rcs
            view.rsn = rsn
            view.offX = offX
            view.offY = offY

            // Brush: cursor ray → the tile's top plane, in tile-local coordinates.
            if (ptr.over) {
                const nx = ptr.u * 2 - 1 - offX
                const ny = 1 - ptr.v * 2 - offY
                const X0 = nx * fx, Y0 = ny * fy
                const X = rcs * X0 - rsn * Y0
                const Y = rsn * X0 + rcs * Y0
                const zTop = bevel + dome * 0.5
                const n0 = rot[6], n1 = rot[7], n2 = rot[8]
                const denom = X * n0 + Y * n1 - cam * n2
                if (Math.abs(denom) > 1e-6) {
                    const t = (zTop - cam * n2) / denom
                    const hx = X * t, hy = Y * t, hz = cam + -cam * t
                    const lx = rot[0] * hx + rot[1] * hy + rot[2] * hz
                    const ly = rot[3] * hx + rot[4] * hy + rot[5] * hz
                    if (sm.bw < 0.02) {
                        // Arriving: the parting opens where the cursor is, not sliding in from elsewhere.
                        sm.bx = lx
                        sm.by = ly
                    }
                    const kf = movedNow || dt > 0 ? 1 - Math.exp(-dt * 18) : 0
                    sm.bx += (lx - sm.bx) * kf
                    sm.by += (ly - sm.by) * kf
                }
            }
            sm.bw += (tBw - sm.bw) * (1 - Math.exp(-dt * 8))
            if (Math.abs(tBw - sm.bw) < 4e-3) sm.bw = tBw

            // Light, fixed on screen while the content rolls: express it in pre-roll view space.
            const la = clampN(adv.lightAngle, 0, 360, DEFAULT_ADVANCED.lightAngle) * D2R
            const le = clampN(adv.lightHeight, 0, 90, DEFAULT_ADVANCED.lightHeight) * D2R
            const lsx = Math.cos(la) * Math.cos(le), lsy = Math.sin(la) * Math.cos(le), lz = Math.sin(le)
            const lx = rcs * lsx - rsn * lsy
            const ly = rsn * lsx + rcs * lsy
            const dnx = rsn, dny = -rcs // screen-down, pre-roll
            // Gravity in tile-local space: R^T · down.
            const gx = rot[0] * dnx + rot[1] * dny
            const gy = rot[3] * dnx + rot[4] * dny
            const gz = rot[6] * dnx + rot[7] * dny

            const bg = parseColor(c.background, BG_FALLBACK)
            const fc = parseColor(c.furColor, FUR_FALLBACK)
            const bgl0 = lin(bg[0]), bgl1 = lin(bg[1]), bgl2 = lin(bg[2])
            const bounce = clampN(adv.bounce, 0, 100, DEFAULT_ADVANCED.bounce) / 100
            const fu = c.fur
            const density = clampN(fu.density, 0.5, 10, DEFAULT_FUR.density)
            const lengthK = clampN(fu.length, 0, 10, DEFAULT_FUR.length)
            const frizz = clampN(fu.frizz, 0, 10, DEFAULT_FUR.frizz) / 10
            const kPx = canvas.width / cssW
            // Count from the settled size, so the entrance never reruns the prep pass.
            const tileCss = aFull * minCss
            // A device still slow at the resolution floor also thins the coat; wider hairs keep it covered.
            const thin = Math.min(1, quality / 0.75)
            const count = Math.min(MAX_STRANDS, Math.round((density / 5) * tileCss * tileCss * STRANDS_PER_PX * thin))
            const reach = clampN(c.rs.reach, 0, 10, DEFAULT_RESPONSE.reach)

            gl.viewport(0, 0, canvas.width, canvas.height)
            gl.disable(gl.BLEND)

            // 1. Studio.
            project(0, 0, 0, tc)
            project(0, -a, 0, tb)
            const halfPx = a * 0.5 * Math.min(canvas.width, canvas.height)
            gl.useProgram(bgProg)
            U_BG.f2("uRes", canvas.width, canvas.height)
            U_BG.f3("uBg", bgl0, bgl1, bgl2)
            const wash = 0.006
            U_BG.f3("uWash", lin(fc[0]) * wash, lin(fc[1]) * wash, lin(fc[2]) * wash)
            U_BG.f4("uTileBox", tc[0], tc[1], halfPx, halfPx)
            U_BG.f4("uShadowP", tb[0], tb[1] - halfPx * 0.08, halfPx * 1.0, halfPx * 0.16)
            U_BG.f1("uGlow", clampN(adv.glow, 0, 100, DEFAULT_ADVANCED.glow) / 100)
            U_BG.f1("uShadowK", clampN(adv.shadow, 0, 100, DEFAULT_ADVANCED.shadow) / 100)
            U_BG.f1("uHorizon", (0.5 + (HORIZON * Math.min(canvas.width, canvas.height)) / (2 * canvas.height)) * canvas.height)
            U_BG.f1("uFade", fade)
            gl.drawArrays(gl.TRIANGLES, 0, 3)

            gl.enable(gl.BLEND)
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
            const kc = parseColor(adv.lightColor, LIGHT_FALLBACK)
            sh.a = a
            sh.rc = rc
            sh.bevel = bevel
            sh.dome = dome
            sh.lx = lx
            sh.ly = ly
            sh.lz = lz
            sh.dnx = dnx
            sh.dny = dny
            sh.b0 = bgl0 * bounce * 14
            sh.b1 = bgl1 * bounce * 14
            sh.b2 = bgl2 * bounce * 14
            sh.keyLow = 1 - clampN(adv.keyFalloff, 0, 100, DEFAULT_ADVANCED.keyFalloff) / 100
            sh.k0 = lin(kc[0])
            sh.k1 = lin(kc[1])
            sh.k2 = lin(kc[2])
            sh.fade = fade

            // 2. Undercoat: the dark skin between the hairs.
            gl.useProgram(underProg)
            setShared(U_UN)
            U_UN.f1("uUnder", clampN(adv.undercoat, 0, 100, DEFAULT_ADVANCED.undercoat) / 100)
            // One device pixel in tile units, for the undercoat's anti-aliased edge.
            U_UN.f1("uPx", 2 / (minCss * kPx))
            gl.drawArrays(gl.TRIANGLES, 0, GRID * GRID * 6)

            // 3. Hair records: rerun the prep pass only when what it builds from changed.
            const lenK = 0.025 + 0.01 * lengthK
            const liftV = 0.1 + 0.15 * clampN(fu.lift, 0, 10, DEFAULT_FUR.lift)
            const seed = Math.round(clampN(adv.seed, 0, 100, 0))
            const clump = clampN(adv.clump, 0, 100, DEFAULT_ADVANCED.clump) / 100
            const rimFrac = clampN(adv.rimShare, 0, 50, DEFAULT_ADVANCED.rimShare) / 100
            const cornerU = Math.min(rc / a, 0.999)
            const bevelU = Math.max(bevel / a, 1e-3)
            const domeU = dome / a
            const embossU = (clampN(adv.emboss, 0, 100, DEFAULT_ADVANCED.emboss) / 100) * 0.1
            const key = prepKey
            if (
                key[0] !== count || key[1] !== seed || key[2] !== rimFrac || key[3] !== cornerU ||
                key[4] !== bevelU || key[5] !== domeU || key[6] !== liftV || key[7] !== frizz ||
                key[8] !== clump || key[9] !== lenK || key[10] !== flowVersion || key[11] !== embossU
            ) {
                key[0] = count; key[1] = seed; key[2] = rimFrac; key[3] = cornerU; key[4] = bevelU
                key[5] = domeU; key[6] = liftV; key[7] = frizz; key[8] = clump; key[9] = lenK; key[10] = flowVersion; key[11] = embossU
                if (count > capacity) {
                    capacity = Math.min(MAX_STRANDS, Math.ceil(count * 1.25))
                    gl.bindBuffer(gl.ARRAY_BUFFER, strandBuf)
                    gl.bufferData(gl.ARRAY_BUFFER, capacity * STRIDE, gl.DYNAMIC_COPY)
                    gl.bindBuffer(gl.ARRAY_BUFFER, null)
                }
                gl.useProgram(prepProg)
                // A unit tile: Scale and the entrance only rescale the records in the strand pass.
                U_PR.f2("uHalf", 1, 1)
                U_PR.f1("uCorner", cornerU)
                U_PR.f1("uBevel", bevelU)
                U_PR.f1("uDome", domeU)
                U_PR.f1("uLift", liftV)
                U_PR.f1("uSpread", 0.5 + frizz * 0.6)
                U_PR.f1("uClump", clump)
                U_PR.f1("uCs", lenK * 0.75)
                U_PR.f1("uRimFrac", rimFrac)
                U_PR.f1("uEmboss", embossU)
                U_PR.u1("uSeed", seed)
                gl.enable(gl.RASTERIZER_DISCARD)
                gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf)
                gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, strandBuf)
                gl.beginTransformFeedback(gl.POINTS)
                gl.drawArrays(gl.POINTS, 0, count)
                gl.endTransformFeedback()
                gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null)
                gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null)
                gl.disable(gl.RASTERIZER_DISCARD)
            }

            // 4. Strands.
            gl.useProgram(strandProg)
            setShared(U_ST)
            U_ST.f2("uRes", canvas.width, canvas.height)
            U_ST.f3("uGrav", gx, gy, gz)
            U_ST.f4("uBrush", sm.bx, sm.by, a * (0.08 + 0.035 * reach), sm.bw)
            U_ST.f1("uLen", a * lenK)
            U_ST.f1("uFrizz", frizz)
            U_ST.f1("uGrow", 0.15 + 0.85 * grow)
            U_ST.f1("uTime", clock)
            U_ST.f1("uBreeze", breezeK * 0.35)
            U_ST.f1("uWidth", (clampN(adv.hairWidth, 0.2, 4, DEFAULT_ADVANCED.hairWidth) * kPx) / Math.sqrt(thin))
            U_ST.f1("uJitter", clampN(adv.colorJitter, 0, 50, DEFAULT_ADVANCED.colorJitter) / 100)
            U_ST.f1("uTipFade", clampN(adv.tipFade, 0, 100, DEFAULT_ADVANCED.tipFade) / 100)
            U_ST.f1("uRootShade", clampN(adv.rootShade, 0, 100, DEFAULT_ADVANCED.rootShade) / 100)
            U_ST.f1("uSheen", clampN(adv.sheen, 0, 100, DEFAULT_ADVANCED.sheen) / 100)
            U_ST.f1("uRim", clampN(adv.rimLight, 0, 100, DEFAULT_ADVANCED.rimLight) / 100)
            U_ST.f1("uCount", Math.max(1, count))
            U_ST.f1("uDepth", clampN(adv.depthShade, 0, 100, DEFAULT_ADVANCED.depthShade) / 100)
            U_ST.u1("uSeed", seed)
            U_ST.f1("uCrimpK", clampN(adv.crimp, 0, 100, DEFAULT_ADVANCED.crimp) / 100)
            gl.bindVertexArray(strandVao)
            // Root halves of every hair first, then tip halves: real fur shows tips over roots.
            U_ST.i1("uSegBase", 0)
            gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, (HALF_SEG + 1) * 2, count)
            U_ST.i1("uSegBase", HALF_SEG)
            gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, (HALF_SEG + 1) * 2, count)
            gl.bindVertexArray(vao)

            if (active || breezeK > 0) wake()
        }
        wake()

        return () => {
            disposed = true
            wakeRef.current = () => {}
            cancelAnimationFrame(raf)
            ro.disconnect()
            io.disconnect()
            root.removeEventListener("pointerenter", onMove)
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerdown", onMove)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointerup", onUp)
            root.removeEventListener("pointercancel", onLeave)
            window.removeEventListener("scroll", onScroll, { capture: true })
            document.removeEventListener("visibilitychange", onVis)
            mq?.removeEventListener?.("change", onMq)
            canvas.removeEventListener("webglcontextlost", onLost)
            canvas.removeEventListener("webglcontextrestored", onRestored)
            if (gl.isContextLost()) return
            gl.deleteTexture(artTex)
            gl.deleteTexture(flowTex)
            gl.deleteVertexArray(vao)
            gl.deleteVertexArray(strandVao)
            gl.deleteBuffer(strandBuf)
            gl.deleteTransformFeedback(tf)
            shaders.forEach((s) => gl.deleteShader(s))
            programs.forEach((p) => gl.deleteProgram(p))
        }
    }, [generation])

    return (
        <div
            ref={rootRef}
            style={{ position: "relative", width: "100%", height: "100%", ...style, overflow: "hidden", background, touchAction: "pan-y" }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
            />
        </div>
    )
}
