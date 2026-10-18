"use client"

/**
 * OrchidFlurry — a stippled density gradient: one dot per jittered cell, each
 * with a fixed blue-noise rank, drawn once the vertical density field passes
 * that rank. The field's front rolls across the frame as a travelling swell
 * with a lit crest, and the pointer drags the dots with it like a hand through
 * powder: a bulge-and-twist where it rests, a smear that drifts on and fades
 * behind it where it moves.
 *
 * Built after `StippledDensityGradient` (moments/). The stipple solver, rank
 * hierarchy, density curve, shimmer and every Advanced constant are carried
 * over unchanged; the travelling wave, crest and pointer warp are new here.
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
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

const DEFAULT_PROPS = {
    background: "#0B0A08",
    baseColor: "#0081FF",
    accentColor: "#5FCDFF",
    density: 40,
    scale: 186,
    dotTop: 35,
    reach: 4,
    distortion: 6,
    speed: 100,
    tide: 20,
}

/** Tuning constants behind the look. Out of the box these change nothing. */
const DEFAULT_ADVANCED = {
    seed: 7,
    cellPx: 2,
    jitter: 70,
    dotBottom: 112,
    sizeJitter: 15,
    topDensity: 25,
    peakDensity: 115,
    curveStart: 25,
    curveEnd: 100,
    curveExp: 160,
    growWidth: 12,
    edgeSoft: 60,
    colorVar: 8,
    rimDarken: 15,
    glint: 20,
    shimmerTop: 8,
    shimmerBottom: 3,
    grain: 0,
    vignette: 0,
    tidePeriod: 8000,
    waveLength: 140,
    waveMix: 70,
    crest: 35,
    pointerBoost: 25,
    carve: 75,
    push: 45,
    swirl: 30,
    flowGain: 60,
    flowLife: 900,
    flowDrift: 25,
    flowTint: 40,
}

export interface OrchidFlurryProps {
    background?: string
    baseColor?: string
    accentColor?: string
    /** 0–100, 50 = the curve as drawn; shifts the whole gradient up or down. */
    density?: number
    /** % — scales the cell grid, so every dot with it. */
    scale?: number
    /** % of a cell — dot diameter at the top of the frame. */
    dotTop?: number
    /** 0–10 — how far around the pointer the dots react. */
    reach?: number
    /** 0–10 — how hard the pointer bends and drags the dots. */
    distortion?: number
    /** 0–100 — playback rate of the tide, crest and shimmer. */
    speed?: number
    /** % of height — how far the rolling front swings. */
    tide?: number
    advanced?: Partial<typeof DEFAULT_ADVANCED>
    style?: CSSProperties
}

function clampN(v: unknown, lo: number, hi: number, d: number): number {
    const n = typeof v === "number" && Number.isFinite(v) ? v : d
    return Math.max(lo, Math.min(hi, n))
}

// Pointer trail length. Each point carries the pointer's velocity where it was
// dropped and drifts on along it while it fades, which is what reads as the
// dots flowing away rather than snapping back.
const TRAIL = 16

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uHover;
uniform vec3 uBg;
uniform vec3 uBase;
uniform vec3 uAccent;
uniform float uScale;
uniform float uCellK;
uniform float uJit;
uniform float uDotTop;
uniform float uDotBot;
uniform float uSizeJit;
uniform float uFloor;
uniform float uPeak;
uniform float uLo;
uniform float uHi;
uniform float uExp;
uniform float uGrow;
uniform float uSoft;
uniform float uPeriod;
uniform float uWaveLen;
uniform float uWaveMix;
uniform float uCrest;
uniform float uShTop;
uniform float uShBot;
uniform float uGlint;
uniform float uColVar;
uniform float uRim;
uniform float uPRad;
uniform float uPBoost;
uniform float uPush;
uniform float uSwirl;
uniform float uFlowK;
uniform float uFlowTint;
uniform float uCarve;
uniform vec4 uTrail[${TRAIL}];
uniform float uLife[${TRAIL}];
uniform float uSeed;
uniform float uGrain;
uniform float uVignette;
uniform float uDensOff;
uniform float uTide;
out vec4 outColor;

float h12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}
vec2 h22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}
vec4 h42(vec2 p) {
    vec4 p4 = fract(vec4(p.xyxy) * vec4(0.1031, 0.1030, 0.0973, 0.1099));
    p4 += dot(p4, p4.wzxy + 33.33);
    return fract((p4.xxyz + p4.yzzw) * p4.zywx);
}

// Randomised Bayer rank: the finest 2x2 digit is most significant, so sparse
// selections stay evenly spaced (blue-noise-like); each block gets a random
// rotation/flip so no grid pattern repeats.
float rankAt(vec2 c) {
    ivec2 ic = ivec2(c) + ivec2(4096);
    float r = 0.0;
    float w = 0.25;
    for (int k = 0; k < 6; k++) {
        int bx = (ic.x >> k) & 1;
        int by = (ic.y >> k) & 1;
        ivec2 blk = ic >> (k + 1);
        int sym = int(h12(vec2(blk) + vec2(float(k) * 17.31, uSeed * 3.7)) * 8.0);
        if ((sym & 1) == 1) bx = 1 - bx;
        if ((sym & 2) == 2) by = 1 - by;
        if ((sym & 4) == 4) { int t = bx; bx = by; by = t; }
        int idx = (bx == by) ? bx : (bx == 1 ? 2 : 3);
        r += float(idx) * w;
        w *= 0.25;
    }
    return r + h12(c * 1.37 + uSeed) * w * 4.0;
}

float densityAt(float y) {
    float t = smoothstep(uLo, max(uHi, uLo + 1e-3), y);
    return uFloor + (uPeak - uFloor) * pow(t, max(uExp, 0.1));
}

void main() {
    vec2 px = gl_FragCoord.xy;
    float aspect = uRes.y / max(uRes.x, 1.0);

    // Pointer warp, as an inverse map: each pixel samples the stipple field at
    // q = px - D, so the dots themselves appear moved by D and stretch where D
    // changes. Done on the lookup, not per dot, because D spans dozens of
    // cells and the 3x3 neighbour search below could never reach that far.
    float R = max(uPRad * uRes.x, 1.0);
    vec2 dm = px - uMouse * uRes;
    float gm = exp(-dot(dm, dm) / (R * R)) * uHover;
    vec2 D = (dm * uPush + vec2(-dm.y, dm.x) * uSwirl) * gm;
    // F: how disturbed this spot is, 0..1 — the resting pointer plus every
    // wake point, the wake weighted by how fast the pointer was going there.
    float F = gm;
    for (int k = 0; k < ${TRAIL}; k++) {
        float life = uLife[k];
        if (life <= 0.0) continue;
        vec2 e = px - uTrail[k].xy;
        float g = exp(-dot(e, e) / (R * R)) * life * life;
        vec2 dk = uTrail[k].zw * uFlowK;
        D += dk * g;
        F += g * clamp(length(dk) / (0.25 * R), 0.0, 1.0);
    }
    // The cap keeps the warp's slope well under 1. Near 1 the map squeezes
    // several rows of 2 px dots into one pixel row and they alias into moiré
    // bands. So the warp only nudges; the parting below carries the effect.
    float cap = 0.35 * R;
    D /= sqrt(1.0 + dot(D, D) / (cap * cap));
    vec2 q = px - D;
    F = clamp(F, 0.0, 1.0);
    float core = F * F;
    float ring = 4.0 * F * (1.0 - F);
    // Edge feather measured in warped space, so a squeezed dot blurs instead of aliasing.
    float soft = uSoft * max(max(length(dFdx(q)), length(dFdy(q))), 1.0);

    float cell = max(uCellK * uRes.y * max(uScale, 0.05), 1.5);
    vec2 gi = floor(q / cell);
    float per = max(uPeriod, 0.1);
    float T = uTime / per;
    float kx = 6.2831853 / max(uWaveLen * uRes.y, 1.0);
    float maxR = 0.5 * cell * max(uDotTop, uDotBot) * (1.0 + uSizeJit) + soft + 0.5;

    vec3 col = uBg;
    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            vec2 c = gi + vec2(float(i), float(j));
            vec2 h = h22(c + uSeed * 13.1);
            vec2 ctr = (c + 0.5 + (h - 0.5) * uJit) * cell;
            float dist = length(q - ctr);
            if (dist > maxR) continue;

            // The original tide was one flat sine lifting the whole front at
            // once. Here that breath is mixed with two swells crossing in
            // opposite directions, so the front rolls and interferes instead.
            // Their rates are whole multiples of the tide period: still seamless.
            float xw = ctr.x * kx;
            float swell = sin(6.2831853 * T);
            float roll = 0.65 * sin(xw - 6.2831853 * T) + 0.35 * sin(xw * 1.73 + 12.5663706 * T + 1.3);
            float wave = mix(swell, roll, uWaveMix);

            float yT = clamp(1.0 - ctr.y / max(uRes.y, 1.0), 0.0, 1.0);
            float d = densityAt(yT + uDensOff + uTide * wave);
            // Parting: lowering the density drops the highest-ranked dots
            // first, so the disturbed patch thins out evenly (blue noise)
            // rather than every dot shrinking. Those dots pile up on the rim.
            // The original boosted density at the pointer's centre instead.
            d = d * (1.0 - uCarve * core) + uPBoost * ring;

            float r = rankAt(c);
            float w = uGrow * r + 0.004;
            float s = smoothstep(r - w, r + w, d);
            if (s < 0.02) continue;

            vec4 h2 = h42(c + uSeed * 1.7);
            float rad = 0.5 * cell * mix(uDotTop, uDotBot, yT) * (1.0 + uSizeJit * (h2.x * 2.0 - 1.0)) * s;
            float a = 1.0 - smoothstep(rad - soft, rad + soft, dist);
            if (a <= 0.0) continue;

            // Shimmer periods 1/4, 1/3, 1/2 of the tide period: the loop stays seamless.
            float pick = floor(h2.y * 3.0);
            float sp = per * (pick < 1.0 ? 0.25 : (pick < 2.0 ? 0.33333333 : 0.5));
            float sv = sin(6.2831853 * (uTime / max(sp, 0.05) + h2.z));
            float amp = mix(uShTop, uShBot, smoothstep(0.4, 0.9, yT));
            float qd = clamp(dist / max(rad, 1e-3), 0.0, 1.0);
            vec3 dc = uBase * (1.0 + uColVar * (h2.w * 2.0 - 1.0)) * (1.0 - uRim * qd * qd) * (1.0 + amp * sv);
            dc = mix(dc, uAccent, uGlint * pow(max(sv, 0.0), 6.0));

            // Crest: where a swell peaks over the half-filled band, the dots
            // catch the light, so the eye can follow the wave across.
            float band = smoothstep(0.05, 0.4, d) * (1.0 - smoothstep(0.65, 1.1, d));
            float lit = uCrest * smoothstep(0.3, 1.0, wave) * band;
            dc = mix(dc, uAccent * 1.3, lit) * (1.0 + 0.4 * lit);
            // The piled-up rim catches the light.
            dc = mix(dc, uAccent * 1.3, uFlowTint * ring) * (1.0 + 0.5 * uFlowTint * ring);
            col = mix(col, dc, a);
        }
    }

    vec2 v = px / max(uRes, vec2(1.0)) - 0.5;
    v.x /= max(aspect, 1e-4);
    col *= 1.0 - uVignette * smoothstep(0.25, 0.95, length(v) * 1.1);
    float gn = h12(px + floor(uTime * 24.0) * vec2(17.0, 31.0)) - 0.5;
    col += gn * uGrain * 0.3;
    outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

export default function OrchidFlurry({
    background = DEFAULT_PROPS.background,
    baseColor = DEFAULT_PROPS.baseColor,
    accentColor = DEFAULT_PROPS.accentColor,
    density = DEFAULT_PROPS.density,
    scale = DEFAULT_PROPS.scale,
    dotTop = DEFAULT_PROPS.dotTop,
    reach = DEFAULT_PROPS.reach,
    distortion = DEFAULT_PROPS.distortion,
    speed = DEFAULT_PROPS.speed,
    tide = DEFAULT_PROPS.tide,
    advanced = {"seed":7,"glint":20,"grain":0,"hover":50,"cellPx":2,"jitter":70,"colorVar":8,"curveEnd":100,"curveExp":160,"edgeSoft":60,"vignette":0,"dotBottom":112,"growWidth":12,"rimDarken":15,"curveStart":25,"shimmerTop":8,"sizeJitter":15,"tidePeriod":8000,"topDensity":25,"peakDensity":115,"pointerBoost":25,"pointerRadius":12,"shimmerBottom":3},
    style,
}: OrchidFlurryProps) {
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    // Read live by the rAF loop, so dragging a control updates the canvas.
    const live = { baseColor, accentColor, density, scale, dotTop, reach, distortion, speed, tide, background }
    const propsRef = useRef(live)
    propsRef.current = live
    const advRef = useRef(advanced)
    advRef.current = advanced

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false })
        if (!gl) return
        const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

        const sh = (type: number, src: string) => {
            const s = gl.createShader(type)!
            gl.shaderSource(s, src)
            gl.compileShader(s)
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("OrchidFlurry shader:", gl.getShaderInfoLog(s))
            return s
        }
        const prog = gl.createProgram()!
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("OrchidFlurry link:", gl.getProgramInfoLog(prog))
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

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            canvas.width = Math.max(1, Math.round(root.offsetWidth * dpr))
            canvas.height = Math.max(1, Math.round(root.offsetHeight * dpr))
        }
        const ro = new ResizeObserver(resize)
        ro.observe(root)
        resize()

        // Pointer, in 0..1 with y up. Listened for on the window rather than
        // the canvas (the original's choice): as a hero background this sits
        // under headings and buttons, which would otherwise swallow the hover.
        let mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5
        let over = 0, hov = 0
        const onMove = (e: PointerEvent) => {
            const rect = root.getBoundingClientRect()
            if (rect.width <= 0 || rect.height <= 0) return
            const lx = (e.clientX - rect.left) / rect.width
            const ly = (e.clientY - rect.top) / rect.height
            over = lx >= 0 && lx <= 1 && ly >= 0 && ly <= 1 ? 1 : 0
            if (!over) return
            tx = lx
            ty = 1 - ly
        }
        const onLeave = () => { over = 0 }
        window.addEventListener("pointermove", onMove, { passive: true })
        document.documentElement.addEventListener("pointerleave", onLeave)
        window.addEventListener("blur", onLeave)

        // Trail ring: xy position and zw velocity in device px (y up), plus life 1→0.
        const trail = new Float32Array(TRAIL * 4)
        const life = new Float32Array(TRAIL)
        let head = 0
        let ex = NaN, ey = NaN, eT = 0

        let clock = 0
        let raf = 0
        let last = -1
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            const nowS = now / 1000
            const p = propsRef.current
            const adv = { ...DEFAULT_ADVANCED, ...(advRef.current ?? {}) }
            const D = DEFAULT_ADVANCED
            clock = (clock + dt * (clampN(p.speed, 0, 100, 50) / 50) * (reduced ? 0.25 : 1)) % 3600
            const k = 1 - Math.exp(-dt * 6)
            mx += (tx - mx) * k
            my += (ty - my) * k
            hov += (over - hov) * k

            const cw = canvas.width, ch = canvas.height
            const pRad = clampN(p.reach, 0, 10, DEFAULT_PROPS.reach) * 0.024 + 0.01
            const R = pRad * cw
            const amount = clampN(p.distortion, 0, 10, DEFAULT_PROPS.distortion) / 10

            // Emit by distance travelled, not per frame, so the trail is the
            // same length at 60 Hz and 144 Hz. A pause re-anchors the emitter
            // so the next move doesn't read as one huge, slow velocity.
            if (over) {
                const ppx = tx * cw, ppy = ty * ch
                if (Number.isNaN(ex)) { ex = ppx; ey = ppy; eT = nowS }
                const dx = ppx - ex, dy = ppy - ey
                if (Math.hypot(dx, dy) >= R * 0.3) {
                    const el = Math.max(nowS - eT, 1 / 120)
                    let vx = dx / el, vy = dy / el
                    const sp = Math.hypot(vx, vy), maxV = cw * 1.5
                    if (sp > maxV) { vx *= maxV / sp; vy *= maxV / sp }
                    trail.set([ppx, ppy, vx, vy], head * 4)
                    life[head] = 1
                    head = (head + 1) % TRAIL
                    ex = ppx; ey = ppy; eT = nowS
                } else if (nowS - eT > 0.1) {
                    ex = ppx; ey = ppy; eT = nowS
                }
            } else ex = NaN
            const lifeS = clampN(adv.flowLife, 100, 4000, D.flowLife) / 1000
            const drift = clampN(adv.flowDrift, 0, 100, D.flowDrift) / 100
            const damp = Math.exp(-dt * 1.5)
            for (let i = 0; i < TRAIL; i++) {
                if (life[i] <= 0) continue
                life[i] = Math.max(0, life[i] - dt / lifeS)
                trail[i * 4] += trail[i * 4 + 2] * dt * drift
                trail[i * 4 + 1] += trail[i * 4 + 3] * dt * drift
                trail[i * 4 + 2] *= damp
                trail[i * 4 + 3] *= damp
            }

            const bg = parseColor(p.background, [0.03, 0.03, 0.04, 1])
            const base = parseColor(p.baseColor, [0.78, 0.14, 0.8, 1])
            const acc = parseColor(p.accentColor, [0.72, 0.35, 0.78, 1])
            gl.viewport(0, 0, cw, ch)
            gl.uniform2f(u("uRes"), cw, ch)
            gl.uniform1f(u("uTime"), clock)
            gl.uniform2f(u("uMouse"), mx, my)
            gl.uniform1f(u("uHover"), hov)
            gl.uniform3f(u("uBg"), bg[0], bg[1], bg[2])
            gl.uniform3f(u("uBase"), base[0], base[1], base[2])
            gl.uniform3f(u("uAccent"), acc[0], acc[1], acc[2])
            gl.uniform1f(u("uScale"), clampN(p.scale, 10, 300, 100) / 100)
            // Cell size as a fraction of the stage height (2 px at 800 px tall).
            gl.uniform1f(u("uCellK"), clampN(adv.cellPx, 2, 40, D.cellPx) / 800)
            gl.uniform1f(u("uJit"), clampN(adv.jitter, 0, 100, D.jitter) / 100)
            gl.uniform1f(u("uDotTop"), clampN(p.dotTop, 10, 200, DEFAULT_PROPS.dotTop) / 100)
            gl.uniform1f(u("uDotBot"), clampN(adv.dotBottom, 10, 200, D.dotBottom) / 100)
            gl.uniform1f(u("uSizeJit"), clampN(adv.sizeJitter, 0, 50, D.sizeJitter) / 100)
            gl.uniform1f(u("uFloor"), clampN(adv.topDensity, 0, 300, D.topDensity) / 1000)
            gl.uniform1f(u("uPeak"), clampN(adv.peakDensity, 50, 150, D.peakDensity) / 100)
            gl.uniform1f(u("uLo"), clampN(adv.curveStart, -50, 100, D.curveStart) / 100)
            gl.uniform1f(u("uHi"), clampN(adv.curveEnd, 0, 150, D.curveEnd) / 100)
            gl.uniform1f(u("uExp"), clampN(adv.curveExp, 20, 400, D.curveExp) / 100)
            gl.uniform1f(u("uGrow"), clampN(adv.growWidth, 0, 50, D.growWidth) / 100)
            gl.uniform1f(u("uSoft"), clampN(adv.edgeSoft, 10, 300, D.edgeSoft) / 100)
            gl.uniform1f(u("uPeriod"), clampN(adv.tidePeriod, 1000, 30000, D.tidePeriod) / 1000)
            gl.uniform1f(u("uWaveLen"), clampN(adv.waveLength, 20, 400, D.waveLength) / 100)
            gl.uniform1f(u("uWaveMix"), clampN(adv.waveMix, 0, 100, D.waveMix) / 100)
            gl.uniform1f(u("uCrest"), clampN(adv.crest, 0, 100, D.crest) / 100)
            gl.uniform1f(u("uShTop"), clampN(adv.shimmerTop, 0, 50, D.shimmerTop) / 100)
            gl.uniform1f(u("uShBot"), clampN(adv.shimmerBottom, 0, 50, D.shimmerBottom) / 100)
            gl.uniform1f(u("uGlint"), clampN(adv.glint, 0, 100, D.glint) / 100)
            gl.uniform1f(u("uColVar"), clampN(adv.colorVar, 0, 50, D.colorVar) / 100)
            gl.uniform1f(u("uRim"), clampN(adv.rimDarken, 0, 80, D.rimDarken) / 100)
            gl.uniform1f(u("uPRad"), pRad)
            gl.uniform1f(u("uPBoost"), clampN(adv.pointerBoost, 0, 100, D.pointerBoost) / 100)
            // Push past ~0.9 folds the bulge inside out, so it is clamped at 0.6.
            gl.uniform1f(u("uPush"), (clampN(adv.push, 0, 60, D.push) / 100) * amount)
            gl.uniform1f(u("uSwirl"), (clampN(adv.swirl, 0, 100, D.swirl) / 100) * amount)
            gl.uniform1f(u("uFlowK"), (clampN(adv.flowGain, 0, 200, D.flowGain) / 1000) * amount * 2 * (reduced ? 0.3 : 1))
            gl.uniform1f(u("uFlowTint"), clampN(adv.flowTint, 0, 100, D.flowTint) / 100)
            gl.uniform1f(u("uCarve"), (clampN(adv.carve, 0, 100, D.carve) / 100) * Math.min(1, amount * 2))
            gl.uniform4fv(u("uTrail"), trail)
            gl.uniform1fv(u("uLife"), life)
            gl.uniform1f(u("uSeed"), clampN(adv.seed, 0, 999, D.seed))
            gl.uniform1f(u("uGrain"), clampN(adv.grain, 0, 100, D.grain) / 100)
            gl.uniform1f(u("uVignette"), clampN(adv.vignette, 0, 100, D.vignette) / 100)
            gl.uniform1f(u("uDensOff"), ((clampN(p.density, 0, 100, DEFAULT_PROPS.density) - 50) / 100) * 0.5)
            gl.uniform1f(u("uTide"), clampN(p.tide, 0, 20, DEFAULT_PROPS.tide) / 100)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }
        raf = requestAnimationFrame(frame)
        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            window.removeEventListener("pointermove", onMove)
            document.documentElement.removeEventListener("pointerleave", onLeave)
            window.removeEventListener("blur", onLeave)
        }
    }, [])

    return (
        <div
            ref={rootRef}
            style={{ position: "relative", width: "100%", height: "100%", minHeight: 400, overflow: "hidden", background, ...style }}
        >
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
        </div>
    )
}
