"use client"

/**
 * NocturneQuilt — a pixel-quilt night sky: dark sky bowls, a central curl and
 * pale diagonal bands on a 70 × 18 grid, with twinkling stars, a slow level
 * wave, a vortex that twists the quilt under the pointer and a ripple of light
 * on every tap.
 *
 * Built after the "PixelGridPicture" reference image. The cell map below is
 * transcribed from it cell by cell (13 px pitch, 1 px gap, six levels), and
 * the palette is each level's measured mean colour.
 */
import { useEffect, useRef, type CSSProperties } from "react"

// ── The picture ──────────────────────────────────────────────────────────────
// 0 navy … 5 white, transcribed from the reference. Stars are found below.
const MAP = [
    "0000000000000000000000000000000000000000000000050555555544212124552233",
    "0000500000000000000000000011111111111110000000005005551144421212454223",
    "0002000000000000000000001112222222222211111000500050501244421212454223",
    "0000000000000000000000112223323333223333221100000005001243421112554233",
    "0200500000000000000001122332333334332444432110020000001243421124542234",
    "0020000000000000000011233222333444442244432110005005011243421125422344",
    "1000000000000000001122322223344442244224443210000000012334421254223442",
    "1100000000000000011233212233441111125222443210002000012334211254233423",
    "2111005000005000112321122234421122125222443210000000012344212544234243",
    "4211100002000011223311244344411232124524432210000000012342125442342443",
    "5422110000000111233112443344212333234524432110050000123321254423424433",
    "2542211000001122321124543342112343335224432100000020123322544234444333",
    "2254222111111223211245433422122344445244321100000001123245422334443332",
    "3222422222222231122245434222122334442422111002005001234454223344433322",
    "3332222222223311122454333422112234424211110500000112234542233344353322",
    "4433222222331121224554353422411122222111100001111123345422333443533322",
    "4443333333311211225443345332444112221110001111112233454233334435333221",
    "5544444443112122555433344532244411111111111222222344522333344355332211",
]
const COLS = 70
const ROWS = 18

/** Level per cell, with 6 marking a star: a white cell standing alone in the dark. */
function buildMap(): Uint8Array {
    const at = (c: number, r: number) => (c < 0 || r < 0 || c >= COLS || r >= ROWS ? 0 : Number(MAP[r][c]))
    const out = new Uint8Array(COLS * ROWS)
    for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) {
            let v = at(c, r)
            if (v === 5) {
                const n = [at(c + 1, r), at(c - 1, r), at(c, r + 1), at(c, r - 1)]
                if (!n.includes(5) && n.filter((x) => x === 0).length >= 2) v = 6
            }
            out[r * COLS + c] = v * 36
        }
    return out
}

// ── Colour ───────────────────────────────────────────────────────────────────
type RGB = [number, number, number]

/** Hex, rgb()/rgba() and Framer's `var(--token, fallback)`; anything else → fallback. */
function parseColor(input: string | undefined, fallback: RGB): RGB {
    if (typeof input !== "string") return fallback
    let s = input.trim()
    const v = /^var\(\s*--[^,]+,\s*(.+)\)$/.exec(s)
    if (v) s = v[1].trim()
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4) h = h.replace(/./g, (x) => x + x)
        const n = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
        return n.every(Number.isFinite) ? (n as RGB) : fallback
    }
    const m = /^rgba?\(([^)]*)\)$/i.exec(s)
    if (!m) return fallback
    const n = m[1].split(/[\s,/]+/).filter(Boolean).slice(0, 3)
        .map((p) => (p.endsWith("%") ? parseFloat(p) / 100 : parseFloat(p) / 255))
    return n.length === 3 && n.every(Number.isFinite) ? (n as RGB) : fallback
}

// ── Props ────────────────────────────────────────────────────────────────────
/** The look. Every default is the value the shader would otherwise hardcode. */
const DEFAULT_ADVANCED = {
    // Palette — measured from the reference, deepest to palest.
    navy: "#111A66",
    royal: "#204CC2",
    cornflower: "#588BF5",
    periwinkle: "#90B1F5",
    ice: "#A0DCF9",
    star: "#E3F5FD",
    // Wave
    cycle: 8,
    wavelength: 31,
    slant: 60,
    curlX: 34,
    curlY: 10,
    curlRadius: 5,
    curlTurns: 1,
    skyDark: true,
    // Stars
    starPeriod: 2,
    starOn: 70,
    // Pointer
    swirlRadius: 6,
    rippleSpeed: 22,
    rippleLife: 1.6,
}
type Advanced = typeof DEFAULT_ADVANCED
const PALETTE = ["navy", "royal", "cornflower", "periwinkle", "ice", "star"] as const

export interface NocturneQuiltProps {
    /** Grid lines and, in Contain, the bands around the picture. */
    background?: string
    /** Cover fills the frame, growing new quilt past the picture's edges; Contain shows the picture alone on the background. Cells stay square either way. */
    fit?: "cover" | "contain"
    /** Cells per reference cell: 1 is the reference grid, 2 draws the same picture with twice as many dots each way. */
    density?: number
    /** Star dots, 0–10. 5 is the reference's stars; below thins them, above scatters more across the sky. */
    stars?: number
    /** Grid line width as a share of a cell, so the lines scale with the picture. */
    gap?: number
    /** How hard the quilt twists around the pointer, 0–10. */
    swirl?: number
    /** Strength of the light ring a tap sends out, 0–10. */
    ripple?: number
    /** Overall animation speed, 0–10. */
    speed?: number
    /** Picture size against the frame, %. Below 100 Cover grows new quilt around it; above it crops in. */
    scale?: number
    /** Size of the travelling level wave, 0–10. */
    wave?: number
    /** How much the stars blink, 0–10. */
    twinkle?: number
    advanced?: Partial<Advanced>
    style?: CSSProperties
}

const DEFAULTS = {
    background: "#000333",
    fit: "cover",
    density: 0.5,
    stars: 10,
    gap: 8, // 1 px of the reference's 13 px pitch
    swirl: 5,
    ripple: 5,
    speed: 10,
    scale: 17,
    wave: 10,
    twinkle: 10,
}

const MAX_RIPPLES = 4

// ── Shaders ──────────────────────────────────────────────────────────────────
const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

/* Every pixel finds its cell on an integer-pixel grid, so cells are square and
   the lines uniform at any frame size. The pointer twists which map cell a
   screen cell reads (the vortex); waves and ripples shift its level. Levels
   snap — nothing blends, as in the reference. */
const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uReal;
uniform float uCell;
uniform float uDensity;
uniform float uStars;
uniform vec2 uOrigin;
uniform float uExtend;
uniform float uGap;
uniform vec3 uBg;
uniform vec3 uPal[6];
uniform sampler2D uMap;
uniform vec2 uMouse;
uniform float uTwist;
uniform float uSwirlR;
uniform vec4 uRip[${MAX_RIPPLES}];
uniform float uRipK;
uniform float uRipSpeed;
uniform float uRipLife;
uniform float uWave;
uniform float uCycle;
uniform float uLambda;
uniform float uSlant;
uniform vec3 uCurl;
uniform float uTurns;
uniform float uSkyDark;
uniform float uStarPeriod;
uniform float uStarDuty;
out vec4 outColor;
const vec2 PER = vec2(${COLS}.0, ${ROWS}.0);
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
// Level of one reference cell; stars read as sky so they never smear into neighbours.
float level(vec2 i) {
    i = clamp(i, vec2(0.0), PER - 1.0);
    float v = floor(texelFetch(uMap, ivec2(i), 0).r * 255.0 / 36.0 + 0.5);
    return v > 5.5 ? 0.0 : v;
}
float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + 1.0), f.x), f.y);
}
float fbm(vec2 p) { return 0.5 * vnoise(p) + 0.3 * vnoise(p * 2.03 + 1.7) + 0.2 * vnoise(p * 4.01 + 3.1); }
// New quilt for past the picture's edges, in its idiom rather than a copy of
// it: curls (one per 30 × 20 patch, each turning its own way), diagonal bands
// on the picture's slant (cell + 1.08 × row), and pockets of dark sky. t drifts
// it, so the new ground keeps re-forming instead of sitting still.
float grown(vec2 q, float t) {
    vec2 w = q;
    vec2 sz = vec2(30.0, 20.0);
    vec2 id = floor(q / sz);
    for (int j = -1; j <= 1; j++)
        for (int i = -1; i <= 1; i++) {
            vec2 k = id + vec2(float(i), float(j));
            vec2 c = (k + 0.25 + 0.5 * vec2(h21(k + 0.31), h21(k + 0.77))) * sz;
            vec2 d = w - c;
            float turn = (h21(k + 2.9) < 0.5 ? -2.4 : 2.4) * exp(-dot(d, d) / 36.0);
            w = c + mat2(cos(turn), sin(turn), -sin(turn), cos(turn)) * d;
        }
    w += 8.0 * (vec2(fbm(q * 0.05 + vec2(t, 0.0)), fbm(q * 0.05 + vec2(5.2, -t))) - 0.5);
    // 13 diagonal cells per band cycle, as the picture's own bands run.
    float band = abs(fract((w.x + 1.08 * w.y) / 13.0) - 0.5) * 2.0;
    float sky = fbm(q * 0.05 + vec2(11.0 + 0.5 * t, 3.0));
    return mix(1.0 + 4.0 * band, 0.0, smoothstep(0.58, 0.64, sky));
}
void main() {
    vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
    vec2 g = (px - uOrigin) / uCell;
    vec2 ci = floor(g);
    vec2 f = px - uOrigin - ci * uCell;
    // Everything below is in reference cells; density only decides where the dots fall.
    vec2 p = (ci + 0.5) / uDensity;
    bool outside = p.x < 0.0 || p.y < 0.0 || p.x >= PER.x || p.y >= PER.y;
    if ((outside && uExtend < 0.5) || f.x < uGap || f.y < uGap) {
        outColor = vec4(uBg, 1.0);
        return;
    }

    // Vortex: read the map rotated about the pointer, falling off with distance.
    vec2 d = p - uMouse;
    float a = uTwist * exp(-dot(d, d) / max(uSwirlR * uSwirlR, 1e-3));
    vec2 q = uMouse + mat2(cos(a), sin(a), -sin(a), cos(a)) * d;

    // Blend the four nearest reference cells, then snap: exact at density 1,
    // smoother contours as the dots get finer.
    vec2 s = q - 0.5;
    vec2 i0 = floor(s);
    vec2 w = s - i0;
    float lvl0 = mix(mix(level(i0), level(i0 + vec2(1.0, 0.0)), w.x),
                     mix(level(i0 + vec2(0.0, 1.0)), level(i0 + 1.0), w.x), w.y);
    // Past the edges the picture fades into grown quilt over six cells, never
    // a copy of itself: a repeat reads as wallpaper, not as one sky.
    float edge = max(max(-q.x, q.x - PER.x), max(-q.y, q.y - PER.y));
    float grow = uExtend * smoothstep(0.0, 6.0, edge);
    if (grow > 0.0) lvl0 = mix(lvl0, grown(q, uTime * 0.02), grow);
    float base = floor(lvl0 + 0.5);

    // Stars: each reference star lands on the one dot holding its centre;
    // grown sky gets the reference's share (about 4% of its dots), and Stars
    // above 5 scatter extra ones over all of it.
    vec2 m = clamp(floor(q), vec2(0.0), PER - 1.0);
    vec2 fr = fract(q) - 0.5;
    float half_ = 0.5 / uDensity;
    bool own = texelFetch(uMap, ivec2(m), 0).r * 255.0 > 6.0 * 36.0 - 18.0
        && fr.x >= -half_ && fr.x < half_ && fr.y >= -half_ && fr.y < half_
        && edge < 0.0 && h21(m + 1.3) < min(1.0, uStars / 5.0);
    vec2 dot_ = floor(q * uDensity);
    float share = max(0.0, uStars - 5.0) / 5.0 * 0.08 + step(0.5, grow) * 0.04 * min(1.0, uStars / 5.0);
    bool extra = base < 0.5 && h21(dot_ + 7.7) < share;
    bool star = (own || extra) && !(uExtend < 0.5 && outside);

    // Ripples: a ring of light leaving each tap.
    float lift = 0.0;
    float flare = 0.0;
    for (int i = 0; i < ${MAX_RIPPLES}; i++) {
        vec4 r = uRip[i];
        float age = uReal - r.z;
        if (r.w < 0.5 || age < 0.0 || age > uRipLife) continue;
        float fade = 1.0 - age / uRipLife;
        float ring = exp(-pow((length(p - r.xy) - age * uRipSpeed) / 1.2, 2.0));
        lift = max(lift, ring * fade);
        flare = max(flare, ring);
    }
    lift = floor(lift * uRipK + 0.5);

    vec3 col;
    if (star) {
        vec2 id = own ? m : dot_ + 51.0;
        float h = h21(id + 3.7);
        float sp = uStarPeriod * (h < 0.33 ? 0.8 : (h < 0.66 ? 1.0 : 1.3));
        float on = step(fract(uTime / max(sp, 0.1) + h21(id + 9.1) * max(uStarDuty - 0.02, 0.0)), uStarDuty);
        col = mix(uPal[0], uPal[5], max(on, step(0.5, flare)));
    } else {
        float t = uTime / max(uCycle, 0.1);
        float env = sin(3.14159265 * t);
        env *= env;
        vec2 c = q;
        float lam = max(uLambda, 1.0);
        float ph = 6.2831853 * (t - c.x / lam - uSlant * c.y / lam);
        vec2 sd = c - uCurl.xy;
        if (length(sd) < uCurl.z) ph += uTurns * atan(sd.y, sd.x);
        float lvl = base + floor(uWave * env * sin(ph) + 0.5);
        if (base < 1.5 && uSkyDark > 0.5) lvl = min(lvl, 1.0);
        lvl = clamp(lvl + lift, 0.0, 5.0);
        col = uPal[int(lvl)];
    }
    outColor = vec4(col, 1.0);
}`

// ── Component ────────────────────────────────────────────────────────────────
/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1400
 * @framerIntrinsicHeight 360
 */
export default function NocturneQuilt(props: NocturneQuiltProps) {
    const {
        background = DEFAULTS.background,
        fit = DEFAULTS.fit,
        density = DEFAULTS.density,
        stars = DEFAULTS.stars,
        gap = 0,
        swirl = DEFAULTS.swirl,
        ripple = DEFAULTS.ripple,
        speed = DEFAULTS.speed,
        scale = DEFAULTS.scale,
        wave = DEFAULTS.wave,
        twinkle = DEFAULTS.twinkle,
        advanced = {"ice":"#A0DCF9","navy":"#111A66","star":"#E3F5FD","curlX":34,"curlY":10,"cycle":8,"royal":"#204CC2","slant":60,"starOn":70,"skyDark":true,"curlTurns":1,"cornflower":"#588BF5","curlRadius":5,"periwinkle":"#90B1F5","rippleLife":1.6,"starPeriod":2,"wavelength":31,"rippleSpeed":22,"swirlRadius":6},
        style,
    } = props
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    // Read every frame so panel edits land live without rebuilding GL.
    const live = useRef({ background, fit, density, stars, gap, swirl, ripple, speed, scale, wave, twinkle, adv: DEFAULT_ADVANCED })
    live.current = { background, fit, density, stars, gap, swirl, ripple, speed, scale, wave, twinkle, adv: { ...DEFAULT_ADVANCED, ...advanced } }

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false })
        if (!gl) return
        const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false

        const shader = (type: number, src: string) => {
            const s = gl.createShader(type)!
            gl.shaderSource(s, src)
            gl.compileShader(s)
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("NocturneQuilt shader:", gl.getShaderInfoLog(s))
            return s
        }
        const prog = gl.createProgram()!
        gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("NocturneQuilt link:", gl.getProgramInfoLog(prog))
            return
        }
        gl.useProgram(prog)
        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        const aPos = gl.getAttribLocation(prog, "aPos")
        gl.enableVertexAttribArray(aPos)
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

        const tex = gl.createTexture()
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, COLS, ROWS, 0, gl.RED, gl.UNSIGNED_BYTE, buildMap())
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)

        const locs = new Map<string, WebGLUniformLocation | null>()
        const u = (name: string) => {
            if (!locs.has(name)) locs.set(name, gl.getUniformLocation(prog, name))
            return locs.get(name) ?? null
        }
        gl.uniform1i(u("uMap"), 0)

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            canvas.width = Math.max(1, Math.round(root.clientWidth * dpr))
            canvas.height = Math.max(1, Math.round(root.clientHeight * dpr))
        }
        const ro = new ResizeObserver(resize)
        ro.observe(root)
        resize()

        // Pointer in canvas px; converted to reference cells each frame, since the grid moves with fit/scale.
        let px = -1e4
        let py = -1e4
        let over = 0
        let twist = 0
        const ripples: { x: number; y: number; t: number }[] = []
        let pcell = 1
        let ox = 0
        let oy = 0
        let real = 0
        const local = (e: PointerEvent) => {
            // Through the on-screen rect, not devicePixelRatio: Framer's preview
            // (and any CSS transform) draws the canvas smaller than its own size.
            const r = canvas.getBoundingClientRect()
            return [((e.clientX - r.left) / Math.max(1, r.width)) * canvas.width, ((e.clientY - r.top) / Math.max(1, r.height)) * canvas.height]
        }
        const onMove = (e: PointerEvent) => {
            ;[px, py] = local(e)
            over = 1
        }
        const onLeave = () => {
            over = 0
        }
        const onDown = (e: PointerEvent) => {
            ;[px, py] = local(e)
            ripples.push({ x: (px - ox) / pcell, y: (py - oy) / pcell, t: real })
            if (ripples.length > MAX_RIPPLES) ripples.shift()
        }
        canvas.addEventListener("pointermove", onMove)
        canvas.addEventListener("pointerleave", onLeave)
        canvas.addEventListener("pointerdown", onDown)

        const rip = new Float32Array(MAX_RIPPLES * 4)
        const pal = new Float32Array(18)
        let clock = 0
        let last = -1
        let raf = 0
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            real += dt
            const p = live.current
            const a = p.adv
            const motion = reduced ? 0.25 : 1
            clock = (clock + dt * (Math.max(0, p.speed) / 5) * motion) % 3600

            // Square cells on whole device pixels, so every line is the same width.
            const W = canvas.width
            const H = canvas.height
            const k = Math.min(3, Math.max(0.1, p.scale / 100))
            const contain = p.fit === "contain"
            // Half steps keep a whole number of dots across the picture (70 × 18 → 35 × 9 at 0.5).
            const density = Math.min(4, Math.max(0.5, Math.round(p.density * 2) / 2))
            const raw = ((contain ? Math.min(W / COLS, H / ROWS) : Math.max(W / COLS, H / ROWS)) * k) / density
            // Contain rounds down so the picture never overflows; Cover grows past it, so either way is seamless.
            const cell = Math.max(2, contain ? Math.floor(raw) : Math.round(raw))
            pcell = cell * density
            ox = Math.floor((W - COLS * pcell) / 2)
            oy = Math.floor((H - ROWS * pcell) / 2)
            const gapPx = p.gap > 0 ? Math.max(1, Math.round((cell * p.gap) / 100)) : 0

            // Breathing twist: eases in on hover, out on leave.
            const target = over * (p.swirl / 10) * 2.2 * (1 + 0.25 * Math.sin(real * 1.7))
            twist += (target - twist) * (1 - Math.exp(-dt * 5))

            rip.fill(0)
            ripples.forEach((r, i) => rip.set([r.x, r.y, r.t, 1], i * 4))

            PALETTE.forEach((key, i) => pal.set(parseColor(a[key], parseColor(DEFAULT_ADVANCED[key], [0, 0, 0])), i * 3))
            const bg = parseColor(p.background, [0, 0.012, 0.2])

            gl.viewport(0, 0, W, H)
            gl.uniform2f(u("uRes"), W, H)
            gl.uniform1f(u("uTime"), clock)
            gl.uniform1f(u("uReal"), real)
            gl.uniform1f(u("uCell"), cell)
            gl.uniform1f(u("uDensity"), density)
            gl.uniform1f(u("uStars"), Math.min(10, Math.max(0, p.stars)))
            gl.uniform2f(u("uOrigin"), ox, oy)
            gl.uniform1f(u("uExtend"), contain ? 0 : 1)
            gl.uniform1f(u("uGap"), gapPx)
            gl.uniform3f(u("uBg"), bg[0], bg[1], bg[2])
            gl.uniform3fv(u("uPal"), pal)
            gl.uniform2f(u("uMouse"), (px - ox) / pcell, (py - oy) / pcell)
            gl.uniform1f(u("uTwist"), twist)
            gl.uniform1f(u("uSwirlR"), Math.max(1, a.swirlRadius))
            gl.uniform4fv(u("uRip"), rip)
            gl.uniform1f(u("uRipK"), (Math.max(0, p.ripple) / 5) * 2)
            gl.uniform1f(u("uRipSpeed"), Math.max(1, a.rippleSpeed))
            gl.uniform1f(u("uRipLife"), Math.max(0.2, a.rippleLife))
            gl.uniform1f(u("uWave"), Math.max(0, p.wave) / 5)
            gl.uniform1f(u("uCycle"), Math.max(0.5, a.cycle))
            gl.uniform1f(u("uLambda"), Math.max(2, a.wavelength))
            gl.uniform1f(u("uSlant"), a.slant / 100)
            gl.uniform3f(u("uCurl"), a.curlX + 0.5, a.curlY + 0.5, Math.max(0, a.curlRadius))
            gl.uniform1f(u("uTurns"), Math.round(a.curlTurns))
            gl.uniform1f(u("uSkyDark"), a.skyDark ? 1 : 0)
            gl.uniform1f(u("uStarPeriod"), Math.max(0.2, a.starPeriod))
            gl.uniform1f(u("uStarDuty"), 1 - (Math.min(10, Math.max(0, p.twinkle)) / 10) * (1 - Math.min(1, Math.max(0.05, a.starOn / 100))))
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }
        raf = requestAnimationFrame(frame)
        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            canvas.removeEventListener("pointermove", onMove)
            canvas.removeEventListener("pointerleave", onLeave)
            canvas.removeEventListener("pointerdown", onDown)
            gl.deleteTexture(tex)
            gl.deleteBuffer(buf)
            gl.deleteProgram(prog)
        }
    }, [])

    return (
        <div ref={rootRef} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background, ...style }}>
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", cursor: "pointer" }}
            />
        </div>
    )
}
