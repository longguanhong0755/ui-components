"use client"

/**
 * NeonCoffer — a wall of black tiles lit from inside their edges. A spark
 * strikes a grid corner and the two tiles meeting there diagonally light up
 * along both edges: white-hot at the corner, saturated down the edge, bent
 * round a soft inner fillet, then sinking into a tinted, screen-textured wash.
 *
 * Refined from the user's `FullFrameDark` shader and matched to an edge-lit
 * tile wallpaper. Every control of the original is kept under its key; what
 * changed is how a lit tile is drawn:
 * - tiles are separate panes with a dark seam between them, and the light
 *   lives inside each pane, so a corner meets its neighbour square and sharp
 *   instead of merging into one rounded tube of light;
 * - the band is thick at the corner and thins along the edge (it used to keep
 *   one width), and the fillet fills bright instead of going dark at the vertex;
 * - a fine dot screen textures the glow and wash, and panes sink toward their
 *   middle (`Depth`), so the wash reads as a recessed lightbox, not a fill;
 * - hairlines, cores and texture are sized in CSS px (× device pixels), not in
 *   frame heights, so they stay crisp at any frame size;
 * - hover strikes the corners the pointer crosses; each strike plays the spark
 *   envelope and runs down its diagonal both ways, and a tap strikes harder.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
import { useEffect, useRef, type CSSProperties } from "react"

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
    return out.every(Number.isFinite) ? (out.map((c) => Math.min(1, Math.max(0, c))) as RGBA) : null
}

function num(v: unknown, d: number): number {
    return typeof v === "number" && Number.isFinite(v) ? v : d
}

function clampNum(v: unknown, lo: number, hi: number, d: number): number {
    return Math.max(lo, Math.min(hi, num(v, d)))
}

const DEFAULTS = {
    background: "#000000",
    // Measured off the reference's unclipped glow tails: magenta runs
    // (1, 0, 0.71) and orange (1, 0.40, 0.18) once the white heat is gone.
    baseColor: "#FF00B4",
    accentColor: "#FF662D",
    density: 100,
    glow: 100,
    speed: 50,
    scale: 195,
}

/** The constants behind the look. Out of the box Advanced changes nothing. */
const DEFAULT_ADVANCED = {
    cellHeight: 130,
    cellAspect: 92,
    gridX: 44,
    gridY: 40,
    stepMs: 1200,
    riseMs: 300,
    holdMs: 500,
    decayMs: 1600,
    sparkGap: 4,
    sparks: 69,
    seed: 7,
    hueSeconds: 20,
    hueStepX: 9,
    hueStepY: 16,
    mintColor: "#7DFFB8",
    violetColor: "#3B30FF",
    seam: 1,
    cornerRadius: 28,
    falloff: 10,
    reach: 160,
    glowGain: 150,
    coreWidth: 1,
    whiteHeat: 85,
    bloom: 40,
    bloomSize: 4,
    wash: 30,
    depth: 30,
    texture: 0,
    textureSize: 1.5,
    lineWidth: 1,
    lineGlow: 15,
    lineGlowWidth: 3,
    lineReach: 320,
    lineBrightness: 45,
    lineDim: 10,
    hover: 50,
    grain: 0,
    vignette: 0,
}

export type NeonCofferAdvanced = typeof DEFAULT_ADVANCED

export interface NeonCofferProps {
    background?: string
    baseColor?: string
    accentColor?: string
    /** How many tiles fill the frame: 50 is the reference grid, every 25 doubles (or halves) the tiles per side. */
    density?: number
    /** Band width and brightness of every lit edge. */
    glow?: number
    /** Ambient spark speed and hue drift; 0 freezes them (hover still plays). */
    speed?: number
    /** Size of the tiles in the frame; 100% is the reference framing. */
    scale?: number
    advanced?: Partial<NeonCofferAdvanced>
    style?: CSSProperties
}

/** Hover strikes kept alive at once; the oldest is reused. */
const STRIKES = 16
/** A pass strikes a corner only within this share of a cell of it. */
const STRIKE_REACH = 0.3
/** A hover strike runs this many cells each way down its diagonal… */
const TRAIL_CELLS = 2
/** …reaching the next one this many seconds later… */
const TRAIL_STEP_S = 0.16
/** …at this share of the previous cell's strength. */
const TRAIL_FADE = 0.5
/** A tap strikes harder than a pass. */
const TAP_STRENGTH = 1.6
/** Pointer ease (1/s): ~40 ms, so the light sits under the cursor. */
const FOLLOW = 25
/** Hover in/out fade (1/s). */
const HOVER_FADE = 8
/** Cap device pixels (screen density × canvas zoom); past this a full-frame shader only buys heat. */
const MAX_DPR = 3
const MAX_PIXELS = 8_300_000
/** How often (ms) to re-read the Framer canvas zoom. */
const ZOOM_CHECK_MS = 500

/*
 * Edge-lit tile wall. Each grid vertex can be struck by a spark that walks
 * diagonally down-right one cell per step. A struck vertex lights the tile
 * up-left of it on its bottom-right corner and the tile down-right of it on
 * its top-left corner. Tiles are separate panes inset by half a seam; inside
 * a pane the light is a white core along the square edge, a saturated band
 * whose inner boundary is a rounded corner (the fillet), and a soft wash.
 * Grid hairlines in the seams carry the colour of struck vertices far along
 * their length; unlit lines stay near black.
 */
const FRAG = `#version 300 es
precision highp float;
#define STRIKES ${STRIKES}
uniform vec2 uRes;
uniform float uDpr;
uniform float uTime;
uniform float uReal;
uniform vec2 uMouse;
uniform float uHover;
uniform vec3 uBg;
uniform vec3 uBase;
uniform vec3 uAccent;
uniform vec3 uMint;
uniform vec3 uViolet;
uniform float uScale;
uniform vec4 uGrid;
uniform vec4 uTiming;
uniform vec4 uSpark;
uniform vec2 uHueStep;
uniform vec4 uGlowA;
uniform vec4 uGlowB;
uniform vec4 uLineA;
uniform vec4 uLineB;
uniform vec4 uFx;
uniform vec2 uTile;
uniform vec4 uStrike[STRIKES];
out vec4 outColor;

float h11(float n) { return fract(sin(n * 127.1 + uSpark.z * 311.7) * 43758.5453); }
float h12(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + uSpark.z * 74.7) * 43758.5453); }

float env(float tau) {
    float r = max(uTiming.y, 1e-3);
    float h = uTiming.z;
    float d = max(uTiming.w, 1e-3);
    if (tau < 0.0) return 0.0;
    if (tau < r) { float x = 1.0 - tau / r; return 1.0 - x * x * x; }
    tau -= r;
    if (tau < h) return 1.0;
    tau -= h;
    if (tau < d) { float x = 1.0 - tau / d; return x * x; }
    return 0.0;
}

vec3 pal(float q) {
    q = fract(q) * 4.0;
    float i = floor(q);
    float f = smoothstep(0.25, 0.75, q - i);
    vec3 a;
    vec3 b;
    if (i < 1.0) { a = uBase; b = uMint; }
    else if (i < 2.0) { a = uMint; b = uViolet; }
    else if (i < 3.0) { a = uViolet; b = uAccent; }
    else { a = uAccent; b = uBase; }
    return mix(a, b, f);
}

float act(vec2 v, vec2 cell, vec2 mouse, float pr) {
    float L = v.x - v.y;
    float P = max(uSpark.x, 1.0);
    float st = max(uTiming.x, 1e-3);
    float off = h11(L) * P;
    float u = uTime / st + off - v.y;
    float k = floor(u / P);
    float local = u - k * P;
    float gate = step(h12(vec2(L, k)), uSpark.y);
    float strength = 0.55 + 0.45 * h12(vec2(k, L + 3.7));
    float a = env(local * st) * gate * strength;
    // Hover strikes: a vertex the pointer crossed lights with the spark
    // envelope, then the strike runs both ways down its diagonal, fading.
    float s = 0.0;
    for (int i = 0; i < STRIKES; i++) {
        vec4 sk = uStrike[i];
        vec2 d = v - sk.xy;
        float n = abs(d.x);
        if (sk.w > 0.0 && abs(d.x - d.y) < 0.5 && n < ${TRAIL_CELLS}.5)
            s += env(uReal - sk.z - n * ${TRAIL_STEP_S.toFixed(3)}) * sk.w * pow(${TRAIL_FADE.toFixed(3)}, n);
    }
    vec2 dd = (v + uGrid.zw) * cell - mouse;
    float pk = uHover * exp(-dot(dd, dd) / max(pr * pr, 1e-4));
    return min(a + uLineB.w * (s + 0.75 * pk), 2.0);
}

vec3 vcol(vec2 v) {
    return pal(dot(v, uHueStep) - uTime / max(uSpark.w, 0.1));
}

// One pane lit from its corner at p = 0; p runs into the pane in device px.
vec3 corner(vec2 p, vec2 cell, float a, vec3 c, float tex) {
    if (a <= 0.001) return vec3(0.0);
    float ms = min(cell.x, cell.y);
    vec2 q = p - uTile.x * 0.5;
    float inPane = clamp(min(q.x, q.y) + 0.5, 0.0, 1.0);
    q = max(q, vec2(0.0));
    // Square distance: the core runs straight into the vertex, so the pane
    // corner stays sharp. The band's inner edge is the rounded one.
    float edge = min(q.x, q.y);
    float along = q.x < q.y ? q.y / cell.y : q.x / cell.x;
    float m = 1.0 - smoothstep(0.0, max(uGlowA.z, 1e-3), along);
    float R = uGlowA.x * ms;
    float d = edge;
    // Inside the fillet the band fills bright (the original went dark here,
    // which rounded the corner off).
    if (q.x < R && q.y < R) d = max(R - length(vec2(R) - q), 0.0);
    // Thick at the corner, thin at the far end — measured on the reference
    // (~0.37x the width three quarters of the way along).
    float fall = max(uGlowA.y * ms * (0.25 + 0.75 * m * m), 0.5);
    // Brightness holds most of the way along (still ~0.9 of full at the far
    // end on the reference) while the width tapers.
    float g = exp(-d / fall) * sqrt(m);
    float core = exp(-edge / max(uGlowB.x * uDpr, 0.3)) * m * m;
    // White only right in the corner (~3.5% of the tile), then the band's colour.
    float heat = exp(-length(q) / (0.035 * ms));
    float w = 1.0 - smoothstep(0.0, 1.6, length(q / cell));
    vec3 hot = mix(c, vec3(1.0, 0.97, 0.95), 0.8);
    vec3 o = c * (g * uGlowA.w + w * uLineB.z) * tex
        + hot * uGlowB.y * (core + 0.8 * heat);
    return o * a * inPane;
}

void main() {
    vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
    float k = uRes.y / 800.0;
    float ch = max(uGrid.x * k * uScale, 4.0);
    vec2 cell = vec2(ch * uGrid.y, ch);
    vec2 mouse = vec2(uMouse.x * uRes.x, (1.0 - uMouse.y) * uRes.y);
    float pr = 0.9 * ch;

    vec2 g = px / cell - uGrid.zw;
    vec2 c = floor(g);
    vec2 f = g - c;
    vec2 vTL = c;
    vec2 vTR = c + vec2(1.0, 0.0);
    vec2 vBL = c + vec2(0.0, 1.0);
    vec2 vBR = c + vec2(1.0, 1.0);
    float aTL = act(vTL, cell, mouse, pr);
    float aTR = act(vTR, cell, mouse, pr);
    float aBL = act(vBL, cell, mouse, pr);
    float aBR = act(vBR, cell, mouse, pr);
    vec3 cTL = vcol(vTL);
    vec3 cTR = vcol(vTR);
    vec3 cBL = vcol(vBL);
    vec3 cBR = vcol(vBR);

    // Fine dot screen, whole device pixels so it never beats against the screen.
    vec2 tc = fract(gl_FragCoord.xy / uFx.w) - 0.5;
    float tex = 1.0 - uFx.z * smoothstep(0.15, 0.4, length(tc));

    float dx = min(f.x, 1.0 - f.x) * cell.x;
    float dy = min(f.y, 1.0 - f.y) * cell.y;
    float inPane = clamp(min(dx, dy) - uTile.x * 0.5 + 0.5, 0.0, 1.0);
    // Panes sink toward their middle: light fades the further it is from an edge.
    float sunk = 1.0 - uTile.y * smoothstep(0.0, 0.5, min(dx, dy) / min(cell.x, cell.y));

    vec3 col = uBg;
    col += (corner(f * cell, cell, aTL, cTL, tex) + corner((1.0 - f) * cell, cell, aBR, cBR, tex)) * sunk;

    // Pointer: a soft light in the pane under it, mixed from its four corners.
    vec2 dm = px - mouse;
    float spot = uHover * uLineB.w * exp(-dot(dm, dm) / (0.5 * ch * ch));
    vec3 cm = mix(mix(cTL, cTR, f.x), mix(cBL, cBR, f.x), f.y);
    col += cm * spot * 0.12 * tex * sunk * inPane;

    // Hairlines: the nearest vertical and horizontal line both draw, so the
    // halo has no seam where one hands over to the other (the original
    // picked one, which cut a diagonal wedge out of every lit corner).
    float lr = max(uLineA.w * ch, 1.0);
    float ew = max(uLineA.x * uDpr * 0.5, 0.3);
    float sw = max(uLineA.z * uDpr, 0.5);
    vec2 e0 = exp(-f * cell / lr);
    vec2 e1 = exp(-(1.0 - f) * cell / lr);
    vec3 lv = f.x < 0.5 ? aTL * cTL * e0.y + aBL * cBL * e1.y : aTR * cTR * e0.y + aBR * cBR * e1.y;
    vec3 lh = f.y < 0.5 ? aTL * cTL * e0.x + aTR * cTR * e1.x : aBL * cBL * e0.x + aBR * cBR * e1.x;
    vec3 dim = vec3(0.10, 0.10, 0.165) * uLineB.y;
    col += (lv * uLineB.x + dim) * exp(-dx / ew) + lv * uLineA.y * exp(-dx / sw);
    col += (lh * uLineB.x + dim) * exp(-dy / ew) + lh * uLineA.y * exp(-dy / sw);

    // White bloom on struck vertices; it crosses the seam into all four panes.
    float bs = max(uGlowB.w * uDpr, 0.5);
    vec2 pa = f * cell;
    vec2 pb = (1.0 - f) * cell;
    vec3 bl = aTL * cTL * exp(-length(pa) / bs) + aBR * cBR * exp(-length(pb) / bs)
        + aTR * cTR * exp(-length(vec2(pb.x, pa.y)) / bs) + aBL * cBL * exp(-length(vec2(pa.x, pb.y)) / bs);
    col += (0.3 * bl + 0.7 * vec3(max(bl.r, max(bl.g, bl.b)))) * uGlowB.z;

    // Channels clip on their own, as the reference's do; only a little of the
    // overflow turns white, so a saturated band stays its colour.
    float mx = max(max(col.r, col.g), col.b);
    if (mx > 1.0) col += (mx - 1.0) * 0.12;
    col = clamp(col, 0.0, 1.0);

    vec2 uv = gl_FragCoord.xy / uRes;
    vec2 vv = (uv - 0.5) * 2.0;
    col *= 1.0 - uFx.y * smoothstep(0.4, 1.5, length(vv));
    col += (h12(gl_FragCoord.xy * 0.731 + floor(uTime * 24.0)) - 0.5) * uFx.x * 0.2;
    outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

/** The grid in device px, shared by the shader uniforms and the pointer's vertex lookup. */
interface Grid { cw: number; ch: number; ox: number; oy: number; fresh: number; life: number }

function setPropUniforms(
    gl: WebGL2RenderingContext,
    u: (name: string) => WebGLUniformLocation | null,
    p: NeonCofferProps,
    W: number,
    H: number,
    dpr: number
): Grid {
    const D = DEFAULT_ADVANCED
    const adv = { ...D, ...(p.advanced ?? {}) }
    const c = clampNum
    const bg = parseColor(p.background, [0, 0, 0, 1])
    const base = parseColor(p.baseColor, [1, 0, 0.71, 1])
    const acc = parseColor(p.accentColor, [1, 0.4, 0.18, 1])
    const mint = parseColor(adv.mintColor, [0.49, 1, 0.72, 1])
    const violet = parseColor(adv.violetColor, [0.23, 0.19, 1, 1])
    const glow = c(p.glow, 0, 100, DEFAULTS.glow) / 50
    const sparks = c(adv.sparks, 0, 100, D.sparks) / 100
    // Density sets the tile count: 50 keeps the reference grid, 0 is a quarter
    // as many tiles per side, 100 four times as many.
    const tiles = Math.pow(2, (c(p.density, 0, 100, DEFAULTS.density) - 50) / 25)
    const scale = c(p.scale, 10, 300, DEFAULTS.scale) / 100
    const cellHeight = c(adv.cellHeight, 20, 600, D.cellHeight) / tiles
    const aspect = c(adv.cellAspect, 30, 300, D.cellAspect) / 100
    const gx = c(adv.gridX, 0, 100, D.gridX) / 100
    const gy = c(adv.gridY, 0, 100, D.gridY) / 100
    const rise = c(adv.riseMs, 0, 5000, D.riseMs) / 1000
    const hold = c(adv.holdMs, 0, 5000, D.holdMs) / 1000
    const decay = c(adv.decayMs, 0, 5000, D.decayMs) / 1000
    // Fine detail is in CSS px; the dot screen snaps to whole device px and
    // never below 3, where a 2-px period stops being a pattern.
    const texPeriod = Math.max(3, Math.round(c(adv.textureSize, 0.5, 10, D.textureSize) * dpr))

    gl.uniform2f(u("uRes"), W, H)
    gl.uniform1f(u("uDpr"), dpr)
    gl.uniform3f(u("uBg"), bg[0], bg[1], bg[2])
    gl.uniform3f(u("uBase"), base[0], base[1], base[2])
    gl.uniform3f(u("uAccent"), acc[0], acc[1], acc[2])
    gl.uniform3f(u("uMint"), mint[0], mint[1], mint[2])
    gl.uniform3f(u("uViolet"), violet[0], violet[1], violet[2])
    gl.uniform1f(u("uScale"), scale)
    gl.uniform4f(u("uGrid"), cellHeight, aspect, gx, gy)
    gl.uniform4f(u("uTiming"), c(adv.stepMs, 50, 5000, D.stepMs) / 1000, rise, hold, decay)
    gl.uniform4f(u("uSpark"), c(adv.sparkGap, 2, 40, D.sparkGap), sparks, c(adv.seed, 0, 999, D.seed), c(adv.hueSeconds, 1, 300, D.hueSeconds))
    gl.uniform2f(u("uHueStep"), c(adv.hueStepX, -100, 100, D.hueStepX) / 100, c(adv.hueStepY, -100, 100, D.hueStepY) / 100)
    gl.uniform4f(
        u("uGlowA"),
        c(adv.cornerRadius, 0, 50, D.cornerRadius) / 100,
        (c(adv.falloff, 1, 50, D.falloff) / 100) * Math.max(0.15, glow),
        c(adv.reach, 5, 200, D.reach) / 100,
        (c(adv.glowGain, 0, 300, D.glowGain) / 100) * (0.4 + 0.6 * glow)
    )
    gl.uniform4f(
        u("uGlowB"),
        c(adv.coreWidth, 1, 20, D.coreWidth),
        c(adv.whiteHeat, 0, 200, D.whiteHeat) / 100,
        c(adv.bloom, 0, 200, D.bloom) / 100,
        c(adv.bloomSize, 1, 100, D.bloomSize)
    )
    gl.uniform4f(
        u("uLineA"),
        c(adv.lineWidth, 1, 20, D.lineWidth),
        c(adv.lineGlow, 0, 200, D.lineGlow) / 100,
        c(adv.lineGlowWidth, 1, 50, D.lineGlowWidth),
        c(adv.lineReach, 5, 400, D.lineReach) / 100
    )
    gl.uniform4f(
        u("uLineB"),
        c(adv.lineBrightness, 0, 200, D.lineBrightness) / 100,
        c(adv.lineDim, 0, 300, D.lineDim) / 100,
        c(adv.wash, 0, 100, D.wash) / 100,
        c(adv.hover, 0, 100, D.hover) / 50
    )
    gl.uniform4f(u("uFx"), c(adv.grain, 0, 100, D.grain) / 100, c(adv.vignette, 0, 100, D.vignette) / 100, c(adv.texture, 0, 100, D.texture) / 100, texPeriod)
    gl.uniform2f(u("uTile"), c(adv.seam, 0, 10, D.seam) * dpr, c(adv.depth, 0, 100, D.depth) / 100)

    const ch = Math.max(cellHeight * (H / 800) * scale, 4)
    return { cw: ch * aspect, ch, ox: gx, oy: gy, fresh: rise + hold, life: rise + hold + decay + TRAIL_CELLS * TRAIL_STEP_S }
}

export default function NeonCoffer(props: NeonCofferProps) {
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const {
        background = DEFAULTS.background,
        baseColor = DEFAULTS.baseColor,
        accentColor = DEFAULTS.accentColor,
        density = DEFAULTS.density,
        glow = DEFAULTS.glow,
        speed = DEFAULTS.speed,
        scale = DEFAULTS.scale,
        style,
    } = props
    void [baseColor, accentColor, density, glow, speed, scale]
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef(props)
    propsRef.current = props

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false, powerPreference: "low-power" })
        if (!gl) return
        const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

        const sh = (type: number, src: string) => {
            const s = gl.createShader(type)!
            gl.shaderSource(s, src)
            gl.compileShader(s)
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("NeonCoffer shader:", gl.getShaderInfoLog(s))
            return s
        }
        const prog = gl.createProgram()!
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("NeonCoffer link:", gl.getProgramInfoLog(prog))
            return
        }
        gl.useProgram(prog)
        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        const loc = gl.getAttribLocation(prog, "aPos")
        gl.enableVertexAttribArray(loc)
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
        const cache = new Map<string, WebGLUniformLocation | null>()
        const u = (name: string) => {
            if (!cache.has(name)) cache.set(name, gl.getUniformLocation(prog, name))
            return cache.get(name) ?? null
        }

        // Resolution: device px × canvas zoom, capped, and stepped down if frames
        // run long, but never below one device px per CSS px, where the pane
        // edges and hairlines turn into visible steps.
        let res = 1
        let dpr = 1
        let zoom = 1
        let sized = false
        const resize = () => {
            const w = root.offsetWidth
            const h = root.offsetHeight
            const want = Math.min((window.devicePixelRatio || 1) * zoom, MAX_DPR)
            const budget = Math.sqrt(MAX_PIXELS / Math.max(1, w * h * want * want))
            dpr = Math.max(Math.min(want, 1), want * Math.min(1, budget) * res)
            canvas.width = Math.max(1, Math.round(w * dpr))
            canvas.height = Math.max(1, Math.round(h * dpr))
            sized = false
        }
        const ro = new ResizeObserver(resize)
        ro.observe(root)
        resize()

        // Pointer state is a 0–1 share of the frame as displayed (see CLAUDE.md, Pointer).
        let cx = 0
        let cy = 0
        let moved = false
        let mx = 0.5
        let my = 0.5
        let tx = 0.5
        let ty = 0.5
        let over = 0
        let hov = 0
        let tap = false
        const onMove = (e: PointerEvent) => {
            cx = e.clientX
            cy = e.clientY
            moved = true
            over = 1
        }
        const onDown = (e: PointerEvent) => {
            onMove(e)
            tap = true
        }
        const onUp = (e: PointerEvent) => {
            if (e.pointerType !== "mouse") over = 0
        }
        const onLeave = () => {
            over = 0
        }
        const onScroll = () => {
            if (over) moved = true
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerdown", onDown)
        root.addEventListener("pointerup", onUp)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointercancel", onLeave)
        window.addEventListener("scroll", onScroll, { passive: true, capture: true })

        // Hover strikes: vertex xy, real time struck, strength.
        const strikes = new Float32Array(STRIKES * 4)
        let next = 0
        let lastVx = NaN
        let lastVy = NaN
        let pgx = NaN
        let pgy = NaN
        let lastStrike = -1e9
        // A tap always strikes; a pass skips a corner that is still lit from
        // its last strike, so wiggling on a cell boundary does not stack light.
        const strike = (vx: number, vy: number, t: number, s: number, fresh: number) => {
            for (let i = 0; i < STRIKES; i++) {
                const o = i * 4
                if (strikes[o + 3] > 0 && strikes[o] === vx && strikes[o + 1] === vy && t - strikes[o + 2] < fresh) return
            }
            const o = next * 4
            strikes[o] = vx
            strikes[o + 1] = vy
            strikes[o + 2] = t
            strikes[o + 3] = s
            next = (next + 1) % STRIKES
            lastStrike = t
            gl.uniform4fv(u("uStrike[0]"), strikes)
        }

        let grid: Grid = { cw: 1, ch: 1, ox: 0, oy: 0, fresh: 0, life: 0 }
        let lastProps: NeonCofferProps | null = null
        let clock = 0
        let real = 0
        let raf = 0
        let last = -1
        let lastDraw = -1
        let lastZoomCheck = -1e9
        let slow = 0
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            // A zoomed-in Framer canvas scales the element up without resizing it,
            // so the canvas would be stretched; render at the zoomed size instead.
            // Zoom only ever raises resolution: a scaled-down stage (the builder
            // preview, a zoomed-out canvas) renders exactly as it did before, so
            // the tiles and lines keep their proportions and nothing jumps.
            if (now - lastZoomCheck > ZOOM_CHECK_MS) {
                lastZoomCheck = now
                const ow = root.offsetWidth
                if (ow > 0) {
                    const z = Math.max(1, Math.min(4, root.getBoundingClientRect().width / ow))
                    if (Math.abs(z - zoom) > zoom * 0.05) {
                        zoom = z
                        resize()
                    }
                }
            }
            const p = propsRef.current
            const dirty = p !== lastProps || !sized
            // Pace to ~60 fps on high-refresh screens.
            if (!dirty && lastDraw >= 0 && now - lastDraw < 1000 / 62) return
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now

            if (moved) {
                moved = false
                const r = root.getBoundingClientRect()
                if (r.width > 0 && r.height > 0) {
                    tx = (cx - r.left) / r.width
                    ty = 1 - (cy - r.top) / r.height
                }
            }
            if (dirty) {
                gl.viewport(0, 0, canvas.width, canvas.height)
                grid = setPropUniforms(gl, u, p, canvas.width, canvas.height, dpr)
                lastProps = p
                sized = true
            }

            const speed = clampNum(p.speed, 0, 100, DEFAULTS.speed) / 50
            real += dt
            clock = (clock + dt * speed * (reduced ? 0.25 : 1)) % 3600
            const kf = 1 - Math.exp(-dt * FOLLOW)
            mx += (tx - mx) * kf
            my += (ty - my) * kf
            hov += (over - hov) * (1 - Math.exp(-dt * HOVER_FADE))

            // Strike every corner the pointer passes close to: walk the path
            // since last frame in third-of-a-cell steps, so a fast swipe
            // lights each corner it crossed rather than one per frame.
            if (over) {
                const gx = (tx * canvas.width) / grid.cw - grid.ox
                const gy = ((1 - ty) * canvas.height) / grid.ch - grid.oy
                if (Number.isNaN(pgx)) {
                    pgx = gx
                    pgy = gy
                }
                const n = Math.max(1, Math.min(24, Math.ceil(Math.hypot(gx - pgx, gy - pgy) * 3)))
                for (let i = 1; i <= n; i++) {
                    const sx = pgx + ((gx - pgx) * i) / n
                    const sy = pgy + ((gy - pgy) * i) / n
                    const vx = Math.round(sx)
                    const vy = Math.round(sy)
                    if (Math.hypot(sx - vx, sy - vy) > STRIKE_REACH) continue
                    if (vx !== lastVx || vy !== lastVy) strike(vx, vy, real, 1, grid.fresh)
                    lastVx = vx
                    lastVy = vy
                }
                if (tap) strike(Math.round(gx), Math.round(gy), real, TAP_STRENGTH, 0)
                pgx = gx
                pgy = gy
            } else {
                lastVx = lastVy = pgx = pgy = NaN
            }
            tap = false

            // Settle: nothing moves at speed 0 once hover and strikes have faded.
            const settled =
                speed === 0 &&
                Math.abs(over - hov) < 0.002 &&
                Math.abs(tx - mx) < 1e-4 &&
                Math.abs(ty - my) < 1e-4 &&
                real - lastStrike > grid.life
            if (settled && !dirty && lastDraw >= 0) return

            gl.uniform1f(u("uTime"), clock)
            gl.uniform1f(u("uReal"), real)
            gl.uniform2f(u("uMouse"), mx, my)
            // Raw 0..1: the FRAG scales it by the Advanced `hover` row.
            gl.uniform1f(u("uHover"), hov)
            gl.drawArrays(gl.TRIANGLES, 0, 3)

            // Step resolution down if frames keep running long (a weak GPU).
            if (lastDraw >= 0 && now - lastDraw > 28 && res > 0.6) {
                if (++slow > 45) {
                    slow = 0
                    res = Math.max(0.6, res * 0.85)
                    resize()
                }
            } else slow = Math.max(0, slow - 1)
            lastDraw = now
        }
        raf = requestAnimationFrame(frame)
        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerdown", onDown)
            root.removeEventListener("pointerup", onUp)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointercancel", onLeave)
            window.removeEventListener("scroll", onScroll, { capture: true })
            gl.deleteBuffer(buf)
            gl.deleteProgram(prog)
        }
    }, [])

    return (
        <div
            ref={rootRef}
            style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background, touchAction: "pan-y", ...style }}
        >
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
        </div>
    )
}

const A = DEFAULT_ADVANCED
