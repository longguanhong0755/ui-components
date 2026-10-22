"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

// ── moved controls (builder) ──
/**
 * Controls moved in the builder: into Advanced, out of it, or into groups of
 * their own. The code reads each one where it was first written, so the props
 * are put back in that shape before anything reads them.
 */
const MOVED_CONTROLS: { into: Record<string, string>; out: Record<string, string> } = {"into":{},"out":{"hover":"advanced"}}
const GROUP_FALLBACKS: Record<string, any> = {  }
function withMovedControls(props: any): any {
    const out = { ...props }
    for (const [k, g] of Object.entries(MOVED_CONTROLS.into)) out[k] = props?.[g]?.[k] ?? GROUP_FALLBACKS[g]?.[k]
    for (const [k, g] of Object.entries(MOVED_CONTROLS.out)) {
        if (out[k] !== undefined) out[g] = { ...(out[g] ?? {}), [k]: out[k] }
    }
    return out
}
// ── /moved controls ──

/**
 * PuttyRanks — a wall of chunky matte letters, rows of one word packed edge to
 * edge, the camera sliding across it in one steady direction. (The original's
 * hard cut to a front-on second shot is still there behind Advanced >
 * Second Shot, off by default.)
 *
 * Refined from the user's `WallThickLetters`. The letters were 2D sprites
 * stacked along a screen direction, which cannot show which way a wall faces,
 * what is behind what, or where a crevice closes up — so the wall read as flat
 * outlines on black. The wall is now a real heightfield ray-marched through a
 * perspective camera: rounded bevels, true side walls, ambient occlusion, a
 * soft key light with cast shadows, a foam grain on the surface and a shallow
 * focus falloff. Every control from the original is kept.
 */

// ---------------------------------------------------------------- defaults

const DEFAULT_COLORS = {
    blue: "#4C81F1",
    violet: "#826AEE",
    deep: "#313B9F",
    white: "#E8E4DE",
    pink: "#CB81E2",
}

/** The look. Advanced changes nothing until a field is moved off these. */
const DEFAULT_ADVANCED = {
    // what it is
    seed: 7,
    inflate: 7,
    widen: 120,
    capHeight: 86,
    letterGap: 2,
    rowHeight: 175,
    bevel: 3,
    // framing
    rowAngle: 25,
    tilt: 36,
    extrudeAngle: 120,
    lens: 300,
    fan: 3,
    shot1Depth: 75,
    shot2Tilt: 22,
    shot2Depth: 60,
    // look
    sideShade: 32,
    backShade: 64,
    shadowTint: "#0C0E3D",
    highlight: 12,
    soften: 1,
    focus: 0,
    grain: 30,
    vignette: 0,
    blueShare: 45,
    violetShare: 20,
    deepShare: 15,
    whiteShare: 10,
    pinkShare: 10,
    // motion
    cut: false,
    shot1Ms: 5000,
    shot2Ms: 5000,
    trackSpeed: 71,
    trackAngle: 141,
    drift: 30,
    pullBack: 12,
    hover: 50,
}

type Advanced = typeof DEFAULT_ADVANCED
type Colors = typeof DEFAULT_COLORS

interface FontValue {
    fontFamily?: string
    fontWeight?: number | string
    fontStyle?: string
}

export interface PuttyRanksProps {
    text?: string
    font?: FontValue
    speed?: number
    angle?: number
    scale?: number
    depth?: number
    background?: string
    colors?: Partial<Colors>
    advanced?: Partial<Advanced>
    style?: React.CSSProperties
}

/** Rows baked into one tile. A multiple of 3: owner rows are stored mod 3. */
const TILE_ROWS = 12
/** Texels per row in the baked tile; the SDF stays smooth well past 2× this. */
const ROW_PX = 128
/** Signed-distance window stored per texel, in texels. */
const SD_OUT = 8
const SD_IN = 0.45 * ROW_PX
/** Most letters per word the owner table addresses. */
const MAX_LETTERS = 64
/**
 * Key light, in the shot's resting camera axes (right, down, toward camera):
 * a soft studio key just above-left of the lens, so the walls facing the
 * camera stay lit as in the reference and the bevels catch it top-left.
 */
const LIGHT_CAM = [-0.42, -0.55, 0.72]
/** Device pixels the march may shade per frame before resolution steps down. */
const PIXEL_BUDGET = 4.2e6
const FALLBACK_FAMILY = `"Arial Black", "Helvetica Neue", Arial, sans-serif`
const DEG = Math.PI / 180

// ---------------------------------------------------------------- helpers

function clamp(v: number, a: number, b: number) {
    return v < a ? a : v > b ? b : v
}

function num(v: unknown, fb: number) {
    return typeof v === "number" && Number.isFinite(v) ? v : fb
}

function norm3(v: number[]) {
    const l = Math.hypot(v[0], v[1], v[2]) || 1
    return [v[0] / l, v[1] / l, v[2] / l]
}

function hash3(a: number, b: number, c: number) {
    let h =
        Math.imul(a | 0, 0x27d4eb2d) ^
        Math.imul(b | 0, 0x165667b1) ^
        Math.imul(c | 0, 0x9e3779b1)
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b)
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
}

function parseColor(input: unknown, fb: number[]): number[] {
    if (typeof input !== "string") return fb
    let s = input.trim()
    const v = s.match(/^var\([^,]+,\s*(.+)\)$/)
    if (v) s = v[1].trim()
    if (s[0] === "#") {
        let hx = s.slice(1)
        if (hx.length === 3 || hx.length === 4)
            hx = hx
                .split("")
                .map((ch) => ch + ch)
                .join("")
        if (hx.length >= 6) {
            const n = parseInt(hx.slice(0, 6), 16)
            if (!isNaN(n)) return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
        }
        return fb
    }
    const m = s.match(/rgba?\(([^)]+)\)/)
    if (m) {
        const p = m[1]
            .split(/[ ,/]+/)
            .filter(Boolean)
            .map(parseFloat)
        if (p.length >= 3 && p.slice(0, 3).every((x) => Number.isFinite(x)))
            return [p[0], p[1], p[2]]
    }
    return fb
}

function linear(c: number[]) {
    return c.map((x) => Math.pow(clamp(x, 0, 255) / 255, 2.2))
}

// Euclidean distance transform, after Mapbox TinySDF (BSD-2): squared
// distances, one column pass then one row pass.
const INF = 1e20
function edt1d(
    g: Float64Array,
    off: number,
    stride: number,
    len: number,
    f: Float64Array,
    v: Uint16Array,
    z: Float64Array
) {
    v[0] = 0
    z[0] = -INF
    z[1] = INF
    f[0] = g[off]
    for (let q = 1, k = 0, s = 0; q < len; q++) {
        f[q] = g[off + q * stride]
        const q2 = q * q
        do {
            const r = v[k]
            s = (f[q] - f[r] + q2 - r * r) / (q - r) / 2
        } while (s <= z[k] && --k > -1)
        k++
        v[k] = q
        z[k] = s
        z[k + 1] = INF
    }
    for (let q = 0, k = 0; q < len; q++) {
        while (z[k + 1] < q) k++
        const r = v[k]
        const qr = q - r
        g[off + q * stride] = f[r] + qr * qr
    }
}
function edt(g: Float64Array, w: number, h: number) {
    const n = Math.max(w, h)
    const f = new Float64Array(n)
    const z = new Float64Array(n + 1)
    const v = new Uint16Array(n)
    for (let x = 0; x < w; x++) edt1d(g, x, w, h, f, v, z)
    for (let y = 0; y < h; y++) edt1d(g, y * w, 1, w, f, v, z)
}

/** Check byte that makes a blended edge pixel fail to decode as an owner. */
function ownerCheck(j3: number, i: number) {
    return Math.floor(hash3(j3, i, 4242) * 256)
}

type Tile = {
    data: Uint8Array
    sd: Float32Array
    w: number
    h: number
    wordW: number
    offs: number[]
    letterC: number[]
    centerY: number
}

/**
 * Bakes TILE_ROWS rows of the word into one periodic tile: a float signed
 * distance to the letter edge (row units; 8 bits made the wall normals
 * streak), plus per texel G owner row mod 3, B owner letter index and
 * A coverage (mip-mapped for occlusion). Owners are exact integers,
 * so a wall hit always knows which word it belongs to.
 */
function bakeTile(
    text: string,
    fontFor: (px: number) => string,
    a: Advanced
): Tile | null {
    const chars = Array.from(text).slice(0, MAX_LETTERS)
    const n = chars.length
    if (!n) return null
    const probe = document.createElement("canvas").getContext("2d")
    if (!probe) return null
    probe.font = fontFor(100)
    const capAt100 = probe.measureText("H").actualBoundingBoxAscent || 72
    const capPx = (ROW_PX * clamp(a.capHeight, 20, 160)) / 100
    const FS = (100 * capPx) / capAt100
    probe.font = fontFor(FS)
    const widen = clamp(a.widen, 50, 200) / 100
    const inflPx = (capPx * clamp(a.inflate, 0, 20)) / 100
    const gapPx = (ROW_PX * a.letterGap) / 100
    const xs: number[] = []
    const cs: number[] = []
    let acc = 0
    for (const ch of chars) {
        const adv = probe.measureText(ch).width * widen
        xs.push(acc + inflPx)
        cs.push(acc + inflPx + adv / 2)
        acc += adv + 2 * inflPx + gapPx
    }
    const wordPx = Math.max(ROW_PX * 0.5, acc)
    const tw = Math.max(8, Math.round(wordPx))
    const sx = tw / wordPx // exact periodicity: the word spans whole texels
    const th = TILE_ROWS * ROW_PX
    const P = 72
    const W = tw + 2 * P
    const H = th + 2 * P
    const cv = document.createElement("canvas")
    cv.width = W
    cv.height = H
    const g = cv.getContext("2d", { willReadFrequently: true })
    if (!g) return null
    g.font = fontFor(FS)
    g.textBaseline = "alphabetic"
    g.lineJoin = "round"
    g.lineWidth = inflPx * 2
    const seed = Math.round(a.seed)
    const offs: number[] = []
    for (let j = 0; j < TILE_ROWS; j++) offs.push(hash3(j, 7777, seed) * tw)
    const kSpan = Math.ceil(P / tw) + 1
    for (let j = -2; j < TILE_ROWS + 2; j++) {
        const jr = ((j % TILE_ROWS) + TILE_ROWS) % TILE_ROWS
        const j3 = jr % 3
        const base = P + (j + 1) * ROW_PX
        for (let k = -kSpan; k <= kSpan; k++) {
            const x0 = P + offs[jr] + k * tw
            for (let i = 0; i < n; i++) {
                if (!chars[i].trim()) continue
                const col = `rgb(${7 + 120 * j3},${1 + 3 * i},${ownerCheck(j3, i)})`
                g.fillStyle = col
                g.strokeStyle = col
                g.setTransform(sx * widen, 0, 0, 1, x0 + xs[i] * sx, base)
                g.fillText(chars[i], 0, 0)
                if (inflPx > 0) g.strokeText(chars[i], 0, 0)
            }
        }
    }
    const img = g.getImageData(0, 0, W, H).data
    const N = W * H
    const outer = new Float64Array(N)
    const inner = new Float64Array(N)
    const own = new Int16Array(N).fill(-1)
    for (let p = 0; p < N; p++) {
        const al = img[p * 4 + 3] / 255
        if (al >= 1) {
            outer[p] = 0
            inner[p] = INF
            const r = img[p * 4]
            const gg = img[p * 4 + 1]
            const b = img[p * 4 + 2]
            const j3 = Math.round((r - 7) / 120)
            const i = Math.round((gg - 1) / 3)
            if (
                j3 >= 0 &&
                j3 < 3 &&
                i < n &&
                r === 7 + 120 * j3 &&
                gg === 1 + 3 * i &&
                b === ownerCheck(j3, i)
            )
                own[p] = j3 * 256 + i
        } else if (al <= 0) {
            outer[p] = INF
            inner[p] = 0
        } else {
            const d = 0.5 - al
            outer[p] = d > 0 ? d * d : 0
            inner[p] = d < 0 ? d * d : 0
        }
    }
    edt(outer, W, H)
    edt(inner, W, H)
    // Edge pixels are colour blends; hand them their nearest decoded owner.
    for (let pass = 0; pass < 4; pass++) {
        const prev = own.slice()
        for (let y = 1; y < H - 1; y++)
            for (let x = 1; x < W - 1; x++) {
                const p = y * W + x
                if (prev[p] >= 0) continue
                const q =
                    prev[p - 1] >= 0
                        ? prev[p - 1]
                        : prev[p + 1] >= 0
                          ? prev[p + 1]
                          : prev[p - W] >= 0
                            ? prev[p - W]
                            : prev[p + W]
                if (q >= 0) own[p] = q
            }
    }
    // Canvas coverage is not exact area, so the raw zero crossing wiggles by a
    // fraction of a texel — enough to stripe every side wall, whose normal is
    // the outline's. Two binomial passes smooth it without moving straight
    // edges; corners round off by a texel, which putty wants anyway.
    const raw = new Float64Array(N)
    for (let p = 0; p < N; p++) raw[p] = Math.sqrt(inner[p]) - Math.sqrt(outer[p])
    const tmp = new Float64Array(N)
    for (let pass = 0; pass < 2; pass++) {
        for (let y = 0; y < H; y++)
            for (let x = 2; x < W - 2; x++) {
                const p = y * W + x
                tmp[p] = (raw[p - 2] + 4 * raw[p - 1] + 6 * raw[p] + 4 * raw[p + 1] + raw[p + 2]) / 16
            }
        for (let y = 2; y < H - 2; y++)
            for (let x = 0; x < W; x++) {
                const p = y * W + x
                raw[p] = (tmp[p - 2 * W] + 4 * tmp[p - W] + 6 * tmp[p] + 4 * tmp[p + W] + tmp[p + 2 * W]) / 16
            }
    }
    const data = new Uint8Array(tw * th * 4)
    const sdf = new Float32Array(tw * th)
    for (let y = 0; y < th; y++)
        for (let x = 0; x < tw; x++) {
            const p = (y + P) * W + x + P
            const o = (y * tw + x) * 4
            sdf[y * tw + x] = clamp(raw[p], -SD_OUT, SD_IN) / ROW_PX
            data[o + 1] = own[p] >= 0 ? own[p] >> 8 : 3
            data[o + 2] = own[p] >= 0 ? own[p] & 255 : 255
            data[o + 3] = img[p * 4 + 3]
        }
    return {
        data,
        sd: sdf,
        w: tw,
        h: th,
        wordW: tw / ROW_PX,
        offs: offs.map((o) => o / ROW_PX),
        letterC: cs.map((c) => (c * sx) / ROW_PX),
        centerY: 1 - capPx / 2 / ROW_PX,
    }
}

// ---------------------------------------------------------------- shaders

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

const MARCH = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uTex;    // owner + coverage
uniform sampler2D uSd;     // signed distance, row units
uniform vec2 uTile;        // tile size, row units
uniform ivec2 uTexSize;
uniform vec2 uRes;
uniform float uF, uFan;
uniform vec3 uCam, uRight, uDown, uFwd;
uniform float uH, uBevel;
uniform vec2 uPtr;
uniform float uLift, uLiftR;
uniform float uOff[${TILE_ROWS}];
uniform float uLetterC[${MAX_LETTERS}];
uniform float uWordW, uCenterY;
uniform vec3 uPal[5];
uniform float uShares[5];
uniform float uShareTot;
uniform int uSeed;
uniform ivec2 uOrigin;     // whole rows / words the camera has travelled
uniform vec3 uBg, uTint, uLight;
uniform float uSide, uBack, uHigh, uGrain, uFocusDepth, uCocK;
out vec4 outColor;

float hash3(int a, int b, int c) {
    uint h = (uint(a) * 0x27d4eb2du) ^ (uint(b) * 0x165667b1u) ^ (uint(c) * 0x9e3779b1u);
    h = (h ^ (h >> 15)) * 0x85ebca6bu;
    h = (h ^ (h >> 13)) * 0xc2b2ae35u;
    h ^= h >> 16;
    return float(h) / 4294967296.0;
}
int pick(float u) {
    if (uShareTot <= 0.0) return 0;
    float x = u * uShareTot;
    for (int i = 0; i < 5; i++) { x -= uShares[i]; if (x < 0.0) return i; }
    return 4;
}
int colorAt(int r, int c) {
    int s = uSeed * 31;
    r += uOrigin.x;
    c += uOrigin.y;
    int k = pick(hash3(r, c, s + 1));
    int l = pick(hash3(r, c - 1, s + 1));
    if (k == l) { k = pick(hash3(r, c, s + 2)); if (k == l) k = (k + 1) % 5; }
    return k;
}
int imod(int a, int m) { int r = a % m; return r < 0 ? r + m : r; }

float sdAt(vec2 p) { return textureLod(uSd, p / uTile, 0.0).r; }

// Which letter owns p: world row, word index, letter centre. False on ground.
bool ownerAt(vec2 p, out int row, out int word, out vec2 centre) {
    vec2 f = fract(p / uTile) * vec2(uTexSize);
    ivec2 q = min(ivec2(f), uTexSize - 1);
    vec4 o = texelFetch(uTex, q, 0);
    int j3 = int(o.g * 255.0 + 0.5);
    int li = int(o.b * 255.0 + 0.5);
    if (j3 > 2 || li >= ${MAX_LETTERS}) return false;
    int r = int(floor(p.y));
    row = r + imod(j3 - imod(r, 3) + 1, 3) - 1;
    float off = uOff[imod(row, ${TILE_ROWS})] + uLetterC[li];
    word = int(floor((p.x - off) / uWordW + 0.5));
    centre = vec2(off + float(word) * uWordW, float(row) + uCenterY);
    return true;
}

float liftAt(vec2 p) {
    int row, word; vec2 c;
    if (!ownerAt(p, row, word, c)) return 0.0;
    vec2 d = c - uPtr;
    return uLift * exp(-dot(d, d) / (uLiftR * uLiftR));
}

// Rounded bevel: a vertical wall, then a quarter circle into the face.
float profile(float sd) {
    float b = min(uBevel, uH);
    if (sd >= b) return uH;
    float e = b - sd;
    return uH - b + sqrt(max(b * b - e * e, 0.0));
}

float heightAt(vec2 p) {
    float sd = sdAt(p);
    if (sd <= 0.0) return 0.0;
    float h = profile(sd);
    if (uLift != 0.0) h = max(h + liftAt(p), uH * 0.04);
    return h;
}

float grainAt(vec3 p, float footprint) {
    // Two power-of-two cell sizes blended by the pixel footprint: speckle
    // sits on the surface yet stays about one CSS pixel at any distance.
    float lv = log2(max(footprint * 1.4, 1e-5));
    float l0 = floor(lv);
    float c0 = exp2(l0), c1 = c0 * 2.0;
    ivec3 a = ivec3(floor(p / c0)), b = ivec3(floor(p / c1));
    float n0 = hash3(a.x, a.y * 7 + a.z * 131, 99);
    float n1 = hash3(b.x, b.y * 7 + b.z * 131, 98);
    return mix(n0, n1, lv - l0) - 0.5;
}

void main() {
    vec2 s = gl_FragCoord.xy - 0.5 * uRes;
    s.y = -s.y;
    float r2 = dot(s, s) / dot(0.5 * uRes, 0.5 * uRes);
    s *= 1.0 + uFan * r2;
    vec3 rd = normalize(uFwd * uF + uRight * s.x + uDown * s.y);
    vec3 ro = uCam;
    if (rd.z > -1e-4) { outColor = vec4(pow(uBg, vec3(1.0 / 2.2)), 0.0); return; }

    float top = uH + max(uLift, 0.0) + 0.002;
    float tA = (ro.z - top) / -rd.z;
    float tB = ro.z / -rd.z;
    float span = (tB - tA) * length(rd.xy);
    int steps = int(clamp(ceil(span / 0.022), 2.0, 80.0));
    float dt = (tB - tA) / float(steps);
    float t = tA, tp = tA;
    bool hit = false;
    for (int k = 0; k <= 80; k++) {
        if (k > steps) break;
        vec3 p = ro + rd * t;
        // h > 0: the last sample sits on the floor, where float error alone
        // would otherwise decide hit or miss.
        float h = heightAt(p.xy);
        if (p.z < h && h > 0.0) { hit = true; break; }
        tp = t;
        t += dt;
    }
    if (hit) {
        for (int k = 0; k < 7; k++) {
            float tm = 0.5 * (tp + t);
            vec3 p = ro + rd * tm;
            if (p.z < heightAt(p.xy)) t = tm; else tp = tm;
        }
    } else t = tB;
    vec3 p = ro + rd * t;
    float footprint = t / uF;

    float e = 2.0 / float(${ROW_PX});
    float sd = sdAt(p.xy);
    vec2 gsd = vec2(sdAt(p.xy + vec2(e, 0.0)) - sdAt(p.xy - vec2(e, 0.0)),
                    sdAt(p.xy + vec2(0.0, e)) - sdAt(p.xy - vec2(0.0, e)));
    vec2 inward = length(gsd) > 1e-6 ? normalize(gsd) : vec2(0.0);
    // A miss that lands inside an outline is a letter with no depth (Depth 0).
    bool onLetter = (hit && sd > -2.0 * e) || (!hit && sd > 0.0);

    vec3 n = vec3(0.0, 0.0, 1.0);
    vec3 albedo = uBg;
    float zf = 0.0;
    if (onLetter) {
        int row, word; vec2 c;
        // Read the owner a texel and a half inside the edge: walls are hit
        // exactly on the outline, where neighbouring words meet.
        vec2 pin = p.xy + inward * 1.5 * e;
        float lifted = 0.0;
        if (ownerAt(pin, row, word, c)) {
            int k = colorAt(row, word);
            albedo = k == 0 ? uPal[0] : k == 1 ? uPal[1] : k == 2 ? uPal[2] : k == 3 ? uPal[3] : uPal[4];
            if (uLift != 0.0) lifted = max(liftAt(pin), uH * 0.04 - uH);
        }
        float b = min(uBevel, uH);
        zf = uH + lifted < 1e-3 ? 1.0 : clamp(p.z / (uH + lifted), 0.0, 1.0);
        if (p.z < uH - b + lifted - 0.004) {
            // On the straight side wall: the normal is the outline's.
            n = vec3(-inward, 0.0);
        } else {
            float sc = clamp(sd, 0.02 * b, b);
            float slope = (b - sc) / sqrt(max(b * b - (b - sc) * (b - sc), 1e-6));
            n = normalize(vec3(-inward * min(slope, 40.0), 1.0));
        }
    }

    // Occlusion from how much letter surrounds the point, weighted by how deep it sits.
    vec2 uv = p.xy / uTile;
    float cov = 0.55 * textureLod(uTex, uv, 3.0).a + 0.45 * textureLod(uTex, uv, 5.0).a;
    float deep = onLetter ? pow(1.0 - zf, 1.6) : 1.0;
    float ao = 1.0 - clamp(cov * deep * (0.35 + 0.9 * uBack), 0.0, 0.97);

    // Soft cast shadow toward the key light. Clearance beside a wall is the
    // SDF's horizontal distance, so the penumbra is smooth at any step size.
    float sh = 1.0;
    if (uH > 0.0 && dot(n, uLight) > 0.0) {
        vec3 q = p + n * 0.02 + uLight * 0.02;
        float st = 0.02;
        for (int k = 0; k < 16; k++) {
            vec3 x = q + uLight * st;
            if (x.z > top) break;
            float s = sdAt(x.xy);
            float c = s > 0.0 ? x.z - heightAt(x.xy) : max(-s, x.z - top);
            sh = min(sh, clamp(0.5 + c / (0.16 * st), 0.0, 1.0));
            st += 0.035;
        }
    }

    float ndl = max(dot(n, uLight), 0.0);
    float wall = 1.0 - n.z;
    // The crevice floor sinks into the shadow tint (deep navy in the
    // reference, never black); bare Background shows only in open ground.
    vec3 crevice = mix(uBg, uTint, clamp(cov * 1.6, 0.0, 1.0)) * mix(0.55, 1.0, ao);
    vec3 col;
    if (onLetter) {
        vec3 base = mix(albedo, uTint, clamp(wall * mix(uSide, uBack, 1.0 - zf) * 0.45, 0.0, 1.0));
        // Matte foam, evenly lit faces. Walls keep the face's hue and drop to
        // about a third of it in linear light, which is what makes them read
        // deep and saturated in the reference rather than grey.
        col = base * (0.55 * (0.45 + 0.55 * n.z) * mix(0.3, 1.0, ao) + 0.6 * ndl * sh * mix(0.5, 1.0, ao));
        // Catch-light on the bevel, strongest mid-curve, turned to the light.
        float rim = max(dot(normalize(n.xy + 1e-5), normalize(uLight.xy)), 0.0) * 4.0 * n.z * wall;
        col += albedo * uHigh * 1.6 * rim * sh;
        // Sand speckle: per pixel and unblurred, so it reads sharp, not hazy.
        col *= 1.0 + uGrain * 0.7 * grainAt(p, footprint / max(abs(dot(n, rd)), 0.25));
        // Contact occlusion: a wall sinks into a dark of its own colour at
        // its foot, so the seam with the floor never shows as an edge.
        col = mix(mix(crevice, albedo * 0.08, 0.5), col, smoothstep(0.0, 0.1 + 0.35 * uBack, zf));
    } else col = crevice;

    float ze = t * dot(rd, uFwd);
    float coc = clamp(abs(1.0 - uFocusDepth / ze) * uCocK, 0.0, 1.0);
    outColor = vec4(pow(max(col, 0.0), vec3(1.0 / 2.2)), coc);
}`

const COMPOSITE = `#version 300 es
precision highp float;
uniform sampler2D uImg;
uniform vec2 uRes;
uniform float uSoft, uFocusPx, uGrain, uVig;
out vec4 outColor;
float h21(vec2 p) { p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    vec4 c0 = texture(uImg, uv);
    float rad = max(uSoft, c0.a * uFocusPx);
    vec3 col = c0.rgb;
    if (rad > 0.35) {
        vec3 acc = c0.rgb;
        float wsum = 1.0;
        for (int i = 0; i < 16; i++) {
            float fi = float(i) + 0.5;
            float r = sqrt(fi / 16.0) * rad;
            float a = fi * 2.39996;
            vec4 s = texture(uImg, uv + vec2(cos(a), sin(a)) * r / uRes);
            // A sharp neighbour does not smear into a blurred pixel's disc.
            float w = clamp(max(uSoft, s.a * uFocusPx) / max(r, 1e-3), 0.0, 1.0);
            acc += s.rgb * w;
            wsum += w;
        }
        col = acc / wsum;
    }
    col += (h21(gl_FragCoord.xy) - 0.5) * uGrain * 0.02;
    vec2 d = uv - 0.5;
    col *= 1.0 - uVig * 0.85 * smoothstep(0.2, 0.75, length(d));
    outColor = vec4(col, 1.0);
}`

function compile(gl: WebGL2RenderingContext, vs: string, fs: string) {
    const mk = (type: number, src: string) => {
        const s = gl.createShader(type)!
        gl.shaderSource(s, src)
        gl.compileShader(s)
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
            console.warn("PuttyRanks shader:", gl.getShaderInfoLog(s))
        return s
    }
    const p = gl.createProgram()!
    gl.attachShader(p, mk(gl.VERTEX_SHADER, vs))
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs))
    gl.bindAttribLocation(p, 0, "aPos")
    gl.linkProgram(p)
    const cache = new Map<string, WebGLUniformLocation | null>()
    const u = (name: string) => {
        if (!cache.has(name)) cache.set(name, gl.getUniformLocation(p, name))
        return cache.get(name)!
    }
    return { p, u }
}

type Basis = { r: number[]; d: number[]; f: number[] }

/**
 * Camera axes in wall space. `T` tilts the view off the wall normal toward
 * screen direction `psi` (that is the way the side walls run on screen), and
 * the rows are turned `A` in the wall plane.
 */
function basis(T: number, psi: number, A: number): Basis {
    const ux = Math.cos(psi)
    const uy = Math.sin(psi)
    const cT = Math.cos(T)
    const sT = Math.sin(T)
    const f = [-sT * ux, -sT * uy, -cT]
    const eu = [cT * ux, cT * uy, -sT]
    const ew = [-uy, ux, 0]
    const r = [0, 1, 2].map((i) => ux * eu[i] - uy * ew[i])
    const d = [0, 1, 2].map((i) => uy * eu[i] + ux * ew[i])
    const c = Math.cos(-A)
    const s = Math.sin(-A)
    const rot = (v: number[]) => [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]]
    return { r: rot(r), d: rot(d), f: rot(f) }
}

/**
 * Rolls the camera so the whole picture turns `th` on screen (clockwise,
 * y down): rows, side walls, light and the slide all turn together.
 */
function roll(B: Basis, th: number): Basis {
    const c = Math.cos(th)
    const s = Math.sin(th)
    return {
        r: [0, 1, 2].map((i) => c * B.r[i] - s * B.d[i]),
        d: [0, 1, 2].map((i) => s * B.r[i] + c * B.d[i]),
        f: B.f,
    }
}

// ---------------------------------------------------------------- component

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function PuttyRanks(props: PuttyRanksProps) {
    props = withMovedControls(props)
    const { background = "#000000", style } = props
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef(props)
    propsRef.current = props
    const wakeRef = useRef<() => void>(() => {})
    useEffect(() => wakeRef.current())

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const gl = canvas.getContext("webgl2", {
            alpha: false,
            antialias: false,
            depth: false,
            powerPreference: "low-power",
        })
        if (!gl) return

        const march = compile(gl, VERT, MARCH)
        const comp = compile(gl, VERT, COMPOSITE)
        const vbo = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

        const tileTex = gl.createTexture()
        const sdTex = gl.createTexture()
        const fboTex = gl.createTexture()
        const fbo = gl.createFramebuffer()
        let fboW = 0
        let fboH = 0

        let cssW = 0
        let cssH = 0
        let dpr = 1
        let quality = 1
        const ro = new ResizeObserver((es) => {
            const r = es[0].contentRect
            cssW = r.width
            cssH = r.height
            dpr = Math.min(2, window.devicePixelRatio || 1)
            wake()
        })
        ro.observe(root)

        const mq =
            typeof window.matchMedia === "function"
                ? window.matchMedia("(prefers-reduced-motion: reduce)")
                : null
        let reduced = !!mq?.matches
        const onMq = () => {
            reduced = !!mq?.matches
            wake()
        }
        mq?.addEventListener?.("change", onMq)

        // Pointer: handlers only record; the rect is read once per frame.
        const ptr = { cx: 0, cy: 0, moved: false, u: 0.5, v: 0.5, x: 0, y: 0, overT: 0, over: 0, downT: 0, down: 0, wx: 0, wy: 0 }
        const onMove = (e: PointerEvent) => {
            ptr.cx = e.clientX
            ptr.cy = e.clientY
            ptr.moved = true
            ptr.overT = 1
            wake()
        }
        const onLeave = () => {
            ptr.overT = 0
            ptr.downT = 0
            wake()
        }
        const onDown = (e: PointerEvent) => {
            onMove(e)
            ptr.downT = 1
        }
        const onUp = (e: PointerEvent) => {
            ptr.downT = 0
            if (e.pointerType === "touch") ptr.overT = 0
            wake()
        }
        const onScroll = () => {
            ptr.moved = true
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerenter", onMove)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerdown", onDown)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)
        window.addEventListener("scroll", onScroll, true)

        let fontVersion = 0
        const requested = new Set<string>()
        const fonts = document.fonts
        const onFonts = () => {
            fontVersion++
            wake()
        }
        fonts?.addEventListener?.("loadingdone", onFonts)

        let tile: Tile | null = null
        let tileKey = ""

        let clock = 0
        let last: number | null = null
        let lastDraw = -1e9
        let slow = 0
        let fast = 0
        let raf = 0
        let dirty = true

        // Anything that calls wake has changed the picture: draw at least once.
        function wake() {
            dirty = true
            if (!raf) raf = requestAnimationFrame(frame)
        }
        wakeRef.current = wake

        function frame(now: number) {
            raf = 0
            const p = propsRef.current
            const a: Advanced = { ...DEFAULT_ADVANCED, ...(p.advanced ?? {}) }
            const speedV = clamp(num(p.speed, 50), 0, 100)
            const moving = speedV > 0 && !reduced
            const settling =
                Math.abs(ptr.overT - ptr.over) > 0.002 ||
                Math.abs(ptr.downT - ptr.down) > 0.002 ||
                Math.abs(ptr.u * 2 - 1 - ptr.x) > 0.002 ||
                Math.abs(ptr.v * 2 - 1 - ptr.y) > 0.002 ||
                ptr.moved
            // 60 fps while anything moves; idle frames cost nothing.
            if (now - lastDraw < 1000 / 61) {
                raf = requestAnimationFrame(frame)
                return
            }
            const dt = last === null ? 0 : Math.min(1 / 20, Math.max(0, (now - last) / 1000))
            last = now
            const gap = now - lastDraw
            lastDraw = now
            if (gap < 40) {
                // Step the shading resolution down when frames run long.
                slow = gap > 22 ? slow + 1 : 0
                fast = gap < 18 ? fast + 1 : 0
                if (slow > 20) {
                    quality = Math.max(0.8, quality - 0.1)
                    slow = 0
                }
                if (fast > 120) {
                    quality = Math.min(1, quality + 0.1)
                    fast = 0
                }
            }

            if (cssW < 2 || cssH < 2) return
            clock += (dt * speedV) / 50

            if (ptr.moved) {
                const r = root!.getBoundingClientRect()
                if (r.width > 0 && r.height > 0) {
                    ptr.u = clamp((ptr.cx - r.left) / r.width, 0, 1)
                    ptr.v = clamp((ptr.cy - r.top) / r.height, 0, 1)
                }
                ptr.moved = false
            }
            // Follow, don't trail: ~80 ms to the cursor.
            const kF = 1 - Math.exp(-dt * 12)
            ptr.over += (ptr.overT - ptr.over) * (1 - Math.exp(-dt * 7))
            ptr.down += (ptr.downT - ptr.down) * (1 - Math.exp(-dt * 9))
            ptr.x += (ptr.u * 2 - 1 - ptr.x) * kF
            ptr.y += (ptr.v * 2 - 1 - ptr.y) * kF
            const hk = clamp(num(a.hover, 50), 0, 100) / 50
            const pOver = ptr.over * hk

            // resolution
            const q = Math.min(1, Math.sqrt(PIXEL_BUDGET / Math.max(1, cssW * cssH * dpr * dpr))) * quality
            const W = Math.max(1, Math.round(cssW * dpr * q))
            const H = Math.max(1, Math.round(cssH * dpr * q))
            if (canvas!.width !== W || canvas!.height !== H) {
                canvas!.width = W
                canvas!.height = H
            }
            if (fboW !== W || fboH !== H) {
                fboW = W
                fboH = H
                gl!.bindTexture(gl!.TEXTURE_2D, fboTex)
                gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA8, W, H, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, null)
                gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR)
                gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR)
                gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE)
                gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE)
                gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo)
                gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, fboTex, 0)
            }

            // font + tile
            const text = typeof p.text === "string" ? p.text : "UNIQUE"
            const f = p.font ?? {}
            const fam =
                typeof f.fontFamily === "string" && f.fontFamily.trim()
                    ? `${f.fontFamily}, ${FALLBACK_FAMILY}`
                    : FALLBACK_FAMILY
            const weight = f.fontWeight ?? 900
            const fstyle = f.fontStyle === "italic" ? "italic" : "normal"
            const fontFor = (px: number) => `${fstyle} ${weight} ${px.toFixed(2)}px ${fam}`
            const loadKey = fontFor(100)
            if (fonts?.load && !requested.has(loadKey)) {
                requested.add(loadKey)
                fonts
                    .load(loadKey, text || "A")
                    .then(onFonts)
                    .catch(() => {})
            }
            const tk = [text, loadKey, fontVersion, a.capHeight, a.letterGap, a.seed, a.inflate, a.widen].join("|")
            if (tk !== tileKey) {
                tileKey = tk
                tile = text.trim() ? bakeTile(text, fontFor, a) : null
                if (tile) {
                    gl!.bindTexture(gl!.TEXTURE_2D, tileTex)
                    gl!.pixelStorei(gl!.UNPACK_ALIGNMENT, 1)
                    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA8, tile.w, tile.h, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, tile.data)
                    gl!.generateMipmap(gl!.TEXTURE_2D)
                    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR_MIPMAP_LINEAR)
                    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR)
                    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.REPEAT)
                    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.REPEAT)
                    gl!.bindTexture(gl!.TEXTURE_2D, sdTex)
                    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.R16F, tile.w, tile.h, 0, gl!.RED, gl!.FLOAT, tile.sd)
                    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR)
                    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR)
                    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.REPEAT)
                    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.REPEAT)
                }
            }

            // camera per shot (row units: one row = 1)
            const scaleV = clamp(num(p.scale, 100), 10, 400) / 100
            const rowCss = (Math.max(4, a.rowHeight) / 1000) * cssH * scaleV
            const lensK = Math.max(0.3, a.lens / 100)
            let dist = (lensK * cssH) / rowCss
            const s1 = Math.max(0.1, a.shot1Ms / 1000)
            const s2 = Math.max(0.1, a.shot2Ms / 1000)
            // One steady slide unless the second shot is switched on; then the
            // original two-shot cycle, with its hard cut, comes back.
            const phase = reduced ? 0 : a.cut ? clock % (s1 + s2) : clock
            const psi = a.extrudeAngle * DEG
            let T: number
            let A: number
            let tx: number
            let ty: number
            let depthFrac: number
            if (!a.cut || phase < s1) {
                T = clamp(a.tilt, 0, 60) * DEG
                // Rows rise at exactly rowAngle on screen: undo the tilt's
                // foreshortening along psi to find their angle on the wall.
                const sg = -a.rowAngle * DEG
                const su = Math.cos(sg) * Math.cos(psi) + Math.sin(sg) * Math.sin(psi)
                const sw = -Math.cos(sg) * Math.sin(psi) + Math.sin(sg) * Math.cos(psi)
                const iu = su / Math.max(0.2, Math.cos(T))
                A = Math.atan2(iu * Math.sin(psi) + sw * Math.cos(psi), iu * Math.cos(psi) - sw * Math.sin(psi))
                // Slide in screen direction trackAngle, unfolded onto the wall.
                const sp = a.trackSpeed / (Math.max(4, a.rowHeight) * scaleV)
                const vx = Math.cos(a.trackAngle * DEG) * sp
                const vy = Math.sin(a.trackAngle * DEG) * sp
                const vu = (vx * Math.cos(psi) + vy * Math.sin(psi)) / Math.max(0.2, Math.cos(T))
                const vw = -vx * Math.sin(psi) + vy * Math.cos(psi)
                const sx = vu * Math.cos(psi) - vw * Math.sin(psi)
                const sy = vu * Math.sin(psi) + vw * Math.cos(psi)
                const c = Math.cos(-A)
                const s = Math.sin(-A)
                tx = -(sx * c - sy * s) * phase
                ty = -(sx * s + sy * c) * phase
                depthFrac = a.shot1Depth / 1000
            } else {
                const t = phase - s1
                T = clamp(a.shot2Tilt, 0, 60) * DEG
                A = 0
                const zoom = Math.max(0.1, 1 - (clamp(a.pullBack, 0, 90) / 100) * (t / s2))
                dist /= zoom
                tx = 23.7
                ty = -31.5 - ((a.drift / (Math.max(4, a.rowHeight) * scaleV)) * t) / zoom
                depthFrac = a.shot2Depth / 1000
            }
            // The slide never ends, so rebase the camera by whole tiles: rows by
            // TILE_ROWS and words by one word leave the geometry identical, and
            // the shader adds them back when it picks colours. Float32 then
            // never sees a large coordinate however long the page stays open.
            const wordW = tile ? tile.wordW : 1
            const oRow = Math.floor(ty / TILE_ROWS) * TILE_ROWS
            const oWord = Math.floor(tx / wordW)
            tx -= oWord * wordW
            ty -= oRow
            // Angle turns the whole composition; the pointer is unturned into
            // the camera's own frame so the orbit still leans toward it.
            const th = clamp(num(p.angle, 0), -180, 180) * DEG
            const pxr = ptr.x * Math.cos(th) + ptr.y * Math.sin(th)
            const pyr = -ptr.x * Math.sin(th) + ptr.y * Math.cos(th)
            // Pointer orbits the camera a few degrees: the side walls turn with it.
            const orbit = 7 * DEG * pOver
            const tvx = T * Math.cos(psi) + pxr * orbit
            const tvy = T * Math.sin(psi) + pyr * orbit
            const Tp = Math.hypot(tvx, tvy)
            const B = roll(basis(Tp, Tp > 1e-4 ? Math.atan2(tvy, tvx) : psi, A), th)
            // The light hangs off the resting camera, not the orbiting one, so
            // leaning with the pointer reads as parallax, not a moving lamp.
            const B0 = roll(basis(T, psi, A), th)
            const light = norm3([0, 1, 2].map((i) => B0.r[i] * LIGHT_CAM[0] + B0.d[i] * LIGHT_CAM[1] - B0.f[i] * LIGHT_CAM[2]))

            const depthMul = clamp(num(p.depth, 60), 0, 100) / 60
            const Hd = Math.max(0, ((depthFrac * cssH) / rowCss) * scaleV * depthMul)
            const cam = [tx - B.f[0] * dist, ty - B.f[1] * dist, Hd - B.f[2] * dist]
            const Fpx = lensK * H
            const fanK = clamp(a.fan, 0, 20) / 100

            // Cursor on the face plane, in the same distorted lens the shader uses.
            let sxp = (ptr.x * W) / 2
            let syp = (ptr.y * H) / 2
            const r2 = (sxp * sxp + syp * syp) / ((W * W + H * H) / 4)
            sxp *= 1 + fanK * r2
            syp *= 1 + fanK * r2
            const rd = [0, 1, 2].map((i) => B.f[i] * Fpx + B.r[i] * sxp + B.d[i] * syp)
            if (rd[2] < -1e-6) {
                const tt = (cam[2] - Hd) / -rd[2]
                ptr.wx = cam[0] + rd[0] * tt
                ptr.wy = cam[1] + rd[1] * tt
            }
            const liftAmt = Hd * hk * (0.42 * ptr.over - 1.1 * ptr.down * ptr.over)

            const bgRgb = parseColor(p.background ?? "#000000", [0, 0, 0])
            const cg = { ...DEFAULT_COLORS, ...(p.colors ?? {}) }
            const pal = [cg.blue, cg.violet, cg.deep, cg.white, cg.pink].map((c, i) =>
                linear(parseColor(c, parseColor(Object.values(DEFAULT_COLORS)[i], [128, 128, 128])))
            )
            const shares = [a.blueShare, a.violetShare, a.deepShare, a.whiteShare, a.pinkShare].map((x) => Math.max(0, x))
            const capH = clamp(a.capHeight, 20, 160) / 100

            if (moving || settling || dirty) {
                dirty = false
                // pass 1: march the wall
                gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo)
                gl!.viewport(0, 0, W, H)
                gl!.useProgram(march.p)
                const u = march.u
                gl!.activeTexture(gl!.TEXTURE0)
                gl!.bindTexture(gl!.TEXTURE_2D, tileTex)
                gl!.uniform1i(u("uTex"), 0)
                gl!.activeTexture(gl!.TEXTURE1)
                gl!.bindTexture(gl!.TEXTURE_2D, sdTex)
                gl!.uniform1i(u("uSd"), 1)
                gl!.activeTexture(gl!.TEXTURE0)
                const tl = tile
                const Heff = tl ? Hd : 0
                gl!.uniform2f(u("uTile"), tl ? tl.wordW : 1, TILE_ROWS)
                gl!.uniform2i(u("uTexSize"), tl ? tl.w : 1, tl ? tl.h : 1)
                gl!.uniform2f(u("uRes"), W, H)
                gl!.uniform1f(u("uF"), Fpx)
                gl!.uniform1f(u("uFan"), fanK)
                gl!.uniform3fv(u("uCam"), cam)
                gl!.uniform3fv(u("uRight"), B.r)
                gl!.uniform3fv(u("uDown"), B.d)
                gl!.uniform3fv(u("uFwd"), B.f)
                gl!.uniform1f(u("uH"), Heff)
                gl!.uniform1f(u("uBevel"), Math.max(1e-3, (capH * clamp(a.bevel, 0, 40)) / 100))
                gl!.uniform2f(u("uPtr"), ptr.wx, ptr.wy)
                gl!.uniform1f(u("uLift"), tl && Math.abs(liftAmt) > 1e-4 ? liftAmt : 0)
                gl!.uniform1f(u("uLiftR"), 1.5)
                if (tl) {
                    gl!.uniform1fv(u("uOff"), tl.offs)
                    const lc = new Float32Array(MAX_LETTERS)
                    lc.set(tl.letterC.slice(0, MAX_LETTERS))
                    gl!.uniform1fv(u("uLetterC"), lc)
                    gl!.uniform1f(u("uWordW"), tl.wordW)
                    gl!.uniform1f(u("uCenterY"), tl.centerY)
                }
                gl!.uniform3fv(u("uPal"), pal.flat())
                gl!.uniform1fv(u("uShares"), shares)
                gl!.uniform1f(u("uShareTot"), shares.reduce((s, x) => s + x, 0))
                gl!.uniform1i(u("uSeed"), Math.round(num(a.seed, 7)))
                gl!.uniform2i(u("uOrigin"), oRow, oWord)
                gl!.uniform3fv(u("uBg"), linear(bgRgb))
                gl!.uniform3fv(u("uTint"), linear(parseColor(a.shadowTint, [12, 14, 61])))
                gl!.uniform3fv(u("uLight"), light)
                gl!.uniform1f(u("uSide"), clamp(a.sideShade, 0, 100) / 100)
                gl!.uniform1f(u("uBack"), clamp(a.backShade, 0, 100) / 100)
                gl!.uniform1f(u("uHigh"), clamp(a.highlight, 0, 100) / 100)
                gl!.uniform1f(u("uGrain"), clamp(num(a.grain, 0), 0, 100) / 100)
                gl!.uniform1f(u("uFocusDepth"), dist)
                gl!.uniform1f(u("uCocK"), 1.6)
                gl!.drawArrays(gl!.TRIANGLES, 0, 3)

                // pass 2: focus falloff, grain, vignette
                gl!.bindFramebuffer(gl!.FRAMEBUFFER, null)
                gl!.viewport(0, 0, W, H)
                gl!.useProgram(comp.p)
                gl!.bindTexture(gl!.TEXTURE_2D, fboTex)
                gl!.uniform1i(comp.u("uImg"), 0)
                gl!.uniform2f(comp.u("uRes"), W, H)
                const px = (dpr * q * cssH) / 800
                gl!.uniform1f(comp.u("uSoft"), clamp(num(a.soften, 1), 0, 20) * 0.45)
                gl!.uniform1f(comp.u("uFocusPx"), (clamp(num(a.focus, 0), 0, 100) / 100) * 9 * px)
                gl!.uniform1f(comp.u("uGrain"), clamp(num(a.grain, 0), 0, 100) / 100)
                gl!.uniform1f(comp.u("uVig"), clamp(num(a.vignette, 0), 0, 100) / 100)
                gl!.drawArrays(gl!.TRIANGLES, 0, 3)
            }

            if (moving || settling) raf = requestAnimationFrame(frame)
            else last = null
        }
        wake()

        return () => {
            cancelAnimationFrame(raf)
            wakeRef.current = () => {}
            ro.disconnect()
            mq?.removeEventListener?.("change", onMq)
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerenter", onMove)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
            window.removeEventListener("scroll", onScroll, true)
            fonts?.removeEventListener?.("loadingdone", onFonts)
            gl.deleteTexture(tileTex)
            gl.deleteTexture(sdTex)
            gl.deleteTexture(fboTex)
            gl.deleteFramebuffer(fbo)
            gl.deleteBuffer(vbo)
            gl.deleteProgram(march.p)
            gl.deleteProgram(comp.p)
        }
    }, [])

    return (
        <div
            ref={rootRef}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
                touchAction: "none",
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
                    pointerEvents: "none",
                }}
            />
        </div>
    )
}

// ---------------------------------------------------------------- controls

const adv = (
    title: string,
    key: keyof Advanced,
    min: number,
    max: number,
    unit: string | undefined,
    description: string,
    step = 1
) => ({
    type: ControlType.Number,
    title,
    min,
    max,
    step,
    ...(unit ? { unit } : {}),
    defaultValue: DEFAULT_ADVANCED[key],
    description,
})

/** Inside an Object control Framer may hand `hidden` the group or the whole props. */
const noCut = (p: { cut?: boolean; advanced?: { cut?: boolean } }) => !(p.cut ?? p.advanced?.cut)

// Control order arranged in the builder.
