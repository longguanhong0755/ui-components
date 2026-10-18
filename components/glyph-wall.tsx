"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const MAX_DPR = 2 // quality tier, not a design control (rule 10)
const TRAIL_POINTS = 16
const ATLAS_COLS = 8
const ATLAS_ROWS = 4
const ATLAS_CELL = 128
const ATLAS_PAD = 12 // atlas px of padding around the 104px design box
const STROKE = 6 // design units, of 100

// Design box is 100x100 units. Wide glyphs (24–31) live in the y 30–70 band.
const GLYPHS: string[] = [
    // 0 ankh
    "M50 40 C30 38 32 8 50 8 C68 8 70 38 50 40 Z M50 40 V92 M24 50 H76",
    // 1 eye
    "M14 40 Q50 14 86 40 Q50 58 14 40 Z M43 40 A7 7 0 1 0 57 40 A7 7 0 1 0 43 40 M40 54 L34 84 M52 56 Q70 70 60 84 Q52 90 46 82",
    // 2 sun disc
    "M20 50 A30 30 0 1 0 80 50 A30 30 0 1 0 20 50 M45 50 A5 5 0 1 0 55 50 A5 5 0 1 0 45 50",
    // 3 house
    "M20 90 V14 H80 V90 H50 V40",
    // 4 reed
    "M50 92 V20 Q50 8 58 12 Q66 30 56 48 M50 60 L40 52 M50 44 L40 36",
    // 5 hand
    "M20 70 H70 Q86 70 86 60 Q86 52 74 52 H40 Q30 52 28 40 M40 52 V70",
    // 6 horned viper
    "M10 76 Q24 60 38 76 T66 76 Q78 76 82 62 Q86 50 76 46 M76 46 L70 36 M76 46 L84 38",
    // 7 owl
    "M30 90 L40 70 Q20 60 26 36 Q30 20 46 22 Q60 22 64 36 Q70 60 88 84 M46 22 L40 14 M36 34 A3 3 0 1 0 42 34 A3 3 0 1 0 36 34 M40 70 L60 72 M50 71 L48 92 M58 72 L62 92",
    // 8 loaf
    "M18 70 Q18 34 50 34 Q82 34 82 70 Z",
    // 9 basket
    "M14 40 H86 Q86 72 50 72 Q14 72 14 40 Z",
    // 10 cartouche
    "M26 14 H74 Q84 14 84 26 V74 Q84 86 74 86 H26 Q16 86 16 74 V26 Q16 14 26 14 Z M16 94 H84",
    // 11 was sceptre
    "M44 92 L36 84 M44 92 L52 84 M44 88 V28 L56 18 Q62 14 66 22 L58 30",
    // 12 star
    "M50 12 V88 M18 32 L82 68 M82 32 L18 68",
    // 13 djed pillar
    "M40 92 V20 H60 V92 M34 30 H66 M34 40 H66 M34 50 H66 M30 92 H70",
    // 14 lotus
    "M50 92 V56 M50 56 Q30 50 26 20 Q42 30 50 56 Q58 30 74 20 Q70 50 50 56 M50 56 L50 18",
    // 15 twisted rope
    "M50 10 Q70 25 50 40 Q30 55 50 70 Q70 85 50 95 M50 10 Q30 25 50 40 Q70 55 50 70 Q30 85 50 95",
    // 16 foot
    "M30 20 V70 Q30 84 50 84 H84 Q88 84 86 78 L60 66 Q54 64 54 56 V20",
    // 17 arm with stick
    "M14 60 H60 L80 30 M60 60 Q70 76 86 76",
    // 18 quail chick
    "M36 36 A12 12 0 1 0 60 36 A12 12 0 1 0 36 36 M48 48 Q30 60 34 78 Q50 88 72 72 L86 60 M40 82 L36 94 M56 84 L60 94",
    // 19 mouth
    "M14 50 Q50 24 86 50 Q50 76 14 50 Z",
    // 20 ladder
    "M34 10 V90 M66 10 V90 M34 26 H66 M34 42 H66 M34 58 H66 M34 74 H66",
    // 21 pyramid
    "M20 80 L50 24 L80 80 Z M10 90 H90",
    // 22 lion
    "M12 70 Q14 44 36 44 H70 Q84 44 86 30 M86 30 Q92 40 88 54 L80 70 M20 70 V90 M70 56 V90 M36 44 Q34 30 46 28",
    // 23 shen ring
    "M26 44 A24 24 0 1 0 74 44 A24 24 0 1 0 26 44 M18 86 H82 M40 66 V86 M60 66 V86",
    // 24 water
    "M8 42 L16 34 L24 42 L32 34 L40 42 L48 34 L56 42 L64 34 L72 42 L80 34 L88 42 M8 62 L16 54 L24 62 L32 54 L40 62 L48 54 L56 62 L64 54 L72 62 L80 54 L88 62",
    // 25 bars
    "M10 38 H90 M10 50 H90 M10 62 H90",
    // 26 bolt of cloth
    "M12 36 H88 V64 H12 Z",
    // 27 ticked bar
    "M8 50 H92 M20 38 V62 M40 38 V62 M60 38 V62 M80 38 V62",
    // 28 pool
    "M10 38 H90 V62 H10 Z M22 50 H78",
    // 29 horizontal snake
    "M8 56 Q20 40 32 56 T56 56 T80 56 Q86 48 92 44",
    // 30 gate
    "M16 40 H84 M16 60 H84 M28 40 V60 M72 40 V60",
    // 31 arrow
    "M8 50 H86 M72 38 L90 50 L72 62 M8 38 V62",
]

const VERT_SRC = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`

const FRAG_SRC = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;
uniform float uDpr;
uniform float uTime;
uniform float uSize;
uniform float uReach;
uniform float uHover;
uniform vec3  uBg;
uniform vec3  uGlyph;
uniform vec3  uAccent;
uniform vec3  uPts[${TRAIL_POINTS + 1}];
uniform sampler2D uAtlas;

float h11(float n) { return fract(sin(n * 127.1) * 43758.5453); }
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = h21(i);
    float b = h21(i + vec2(1.0, 0.0));
    float c = h21(i + vec2(0.0, 1.0));
    float d = h21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float s = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
        s += a * vnoise(p);
        p = p * 2.03 + 17.1;
        a *= 0.5;
    }
    return s;
}

float fall(float x) {
    x = clamp(x, 0.0, 1.0);
    float k = 1.0 - x * x;
    return k * k;
}

// Strongest light over the head and the trail records. MAX, not sum.
float lightAt(vec2 q, float r) {
    float m = 0.0;
    for (int i = 0; i < ${TRAIL_POINTS + 1}; i++) {
        vec3 P = uPts[i];
        if (P.z <= 0.0) continue;
        m = max(m, P.z * fall(length(q - P.xy) / r));
    }
    return m;
}

float atlas(vec2 uv, float bias) { return texture2D(uAtlas, uv, bias).r; }

void main() {
    vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;
    float W = uSize;

    // ---- column / cell layout ------------------------------------------
    float cx = floor(p.x / W);
    float xin = p.x - cx * W;
    float oy = h11(cx + 3.7) * W;          // rows never align across columns
    float yy = p.y + oy;
    float cy = floor(yy / W);
    vec2 local = vec2(xin / W, yy / W - cy);

    float split = step(0.62, h21(vec2(cx + 11.3, cy - 7.1)));
    float gid;
    float hc;
    vec2 auv;
    vec2 centre;
    float edgeY;
    if (split > 0.5) {
        float sub = floor(local.y * 2.0);
        float ly = fract(local.y * 2.0);
        hc = h21(vec2(cx * 1.7 + sub * 5.3, cy + sub * 3.1));
        gid = 24.0 + floor(hc * 8.0);
        auv = vec2(local.x, (${ATLAS_PAD}.0 + (30.0 + ly * 40.0) * 1.04) / ${ATLAS_CELL}.0);
        centre = vec2((cx + 0.5) * W, (cy + (sub + 0.5) * 0.5) * W - oy);
        edgeY = ly;
    } else {
        hc = h21(vec2(cx, cy));
        gid = floor(hc * 24.0);
        auv = local;
        centre = vec2((cx + 0.5) * W, (cy + 0.5) * W - oy);
        edgeY = local.y;
    }
    float flip = step(0.5, h11(cx + 9.1));  // whole columns face one way
    if (flip > 0.5) auv.x = 1.0 - auv.x;
    float sgn = flip > 0.5 ? -1.0 : 1.0;

    float empty = step(h21(vec2(cx - 5.3, cy + 2.9)), 0.06);
    float mask = step(0.03, local.x) * step(local.x, 0.97)
               * step(0.03, edgeY) * step(edgeY, 0.97) * (1.0 - empty);

    vec2 cell = vec2(mod(gid, ${ATLAS_COLS}.0), floor(gid / ${ATLAS_COLS}.0));
    vec2 uv = (cell + auv) / vec2(${ATLAS_COLS}.0, ${ATLAS_ROWS}.0);

    float c = atlas(uv, 0.0) * mask;
    float soft = atlas(uv, 1.5) * mask;
    float glow = atlas(uv, 3.0) * mask;
    vec2 ex = vec2(3.0 / ${ATLAS_COLS * ATLAS_CELL}.0, 0.0);
    vec2 ey = vec2(0.0, 3.0 / ${ATLAS_ROWS * ATLAS_CELL}.0);
    float gx = (atlas(uv + ex, 1.0) - atlas(uv - ex, 1.0)) * sgn * mask;
    float gy = (atlas(uv + ey, 1.0) - atlas(uv - ey, 1.0)) * mask;

    // ---- stone ---------------------------------------------------------
    float n = fbm(p / 38.0);
    float colTone = 0.86 + 0.26 * h11(cx + 1.3);
    vec3 stone = uBg * colTone * (0.72 + 0.56 * n);
    stone *= 0.93 + 0.07 * vnoise(vec2(xin / 5.0 + cx * 7.0, p.y / 160.0));
    stone *= 0.95 + 0.05 * h21(floor(p));
    float gd = min(xin, W - xin);
    stone *= mix(0.3, 1.0, smoothstep(0.6, 2.6, gd));              // groove
    stone *= 1.0 + 0.35 * smoothstep(2.4, 3.2, xin) * (1.0 - smoothstep(3.2, 5.5, xin)); // lip

    // ---- light ---------------------------------------------------------
    float spot = lightAt(p, uReach * 1.25) * uHover;
    float cellL = lightAt(centre, uReach) * uHover;
    float jitter = (h21(centre * 0.013 + 4.1) - 0.5) * 0.35;
    float lit = smoothstep(0.3, 0.7, cellL + jitter);

    float th = h21(centre * 0.021 + 9.7);
    float tw = step(0.95, th) * pow(max(0.0, sin(uTime * (0.35 + 0.7 * fract(th * 13.0)) + th * 40.0)), 6.0);
    lit = max(lit, tw * 0.8);

    vec2 dl = (uPts[0].z > 0.0 ? uPts[0].xy : p + vec2(-240.0, -320.0)) - p;
    vec2 ld = dl / max(length(dl), 1.0);
    float edge = clamp((gx * ld.x + gy * ld.y) * 2.0, -1.0, 1.0);

    vec3 col = stone * (1.0 + 1.1 * spot) + uAccent * stone * spot * 0.6;
    col *= 1.0 - 0.55 * c;                                           // carved floor
    col -= col * 0.45 * max(-edge, 0.0);                             // wall in shadow
    col += uGlyph * (0.08 * c + 0.22 * max(edge, 0.0) * (0.3 + spot));

    // Accent carries the stroke; only a thin white core on top, or the
    // glyph clips to white and the Accent dial stops reading.
    vec3 gold = uAccent * (1.05 * c + 0.55 * glow + 0.25 * soft) + vec3(1.0, 0.95, 0.85) * 0.12 * c * c;
    col += gold * lit;

    gl_FragColor = vec4(col, 1.0);
}
`

function num(v: unknown, fb: number): number {
    return typeof v === "number" && isFinite(v) ? v : fb
}

// Colors are hex, rgb(), hsl() or var(--token, <literal>).
function parseColor(input: string | undefined, fb: [number, number, number]): [number, number, number] {
    if (!input) return fb
    let str = String(input).trim()
    const v = str.match(/^var\([^,]+,\s*(.+)\)$/)
    if (v) str = v[1].trim()
    if (str.charAt(0) === "#") {
        let hex = str.slice(1)
        if (hex.length === 3 || hex.length === 4) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
        }
        if (hex.length >= 6) {
            const r = parseInt(hex.slice(0, 2), 16)
            const g = parseInt(hex.slice(2, 4), 16)
            const b = parseInt(hex.slice(4, 6), 16)
            if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) return [r / 255, g / 255, b / 255]
        }
        return fb
    }
    const hsl = str.match(/^hsla?\(\s*([\d.]+)[\s,]+([\d.]+)%[\s,]+([\d.]+)%/)
    if (hsl) {
        const h = parseFloat(hsl[1]) / 360
        const s = parseFloat(hsl[2]) / 100
        const l = parseFloat(hsl[3]) / 100
        const k = (n: number) => {
            const a = s * Math.min(l, 1 - l)
            const t = (n + h * 12) % 12
            return l - a * Math.max(-1, Math.min(t - 3, 9 - t, 1))
        }
        return [k(0), k(8), k(4)]
    }
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

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("GlyphWall shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

function buildAtlas(): HTMLCanvasElement {
    const cv = document.createElement("canvas")
    cv.width = ATLAS_COLS * ATLAS_CELL
    cv.height = ATLAS_ROWS * ATLAS_CELL
    const ctx = cv.getContext("2d")
    if (!ctx) return cv
    ctx.fillStyle = "#000"
    ctx.fillRect(0, 0, cv.width, cv.height)
    ctx.strokeStyle = "#fff"
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    const scale = (ATLAS_CELL - ATLAS_PAD * 2) / 100
    GLYPHS.forEach((d, i) => {
        const x = (i % ATLAS_COLS) * ATLAS_CELL + ATLAS_PAD
        const y = Math.floor(i / ATLAS_COLS) * ATLAS_CELL + ATLAS_PAD
        ctx.setTransform(scale, 0, 0, scale, x, y)
        ctx.lineWidth = STROKE
        ctx.stroke(new Path2D(d))
    })
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    return cv
}

interface GlyphWallProps {
    style?: React.CSSProperties
    background?: string
    glyphColor?: string
    accent?: string
    size?: number
    speed?: number
    hover?: number
    reach?: number
    trail?: number
    width?: number
    height?: number
}

export default function GlyphWall(props: GlyphWallProps) {
    const {
        style,
        background = "#18212D",
        glyphColor = "#A9B8C9",
        accent = "#F2C27A",
        size = 50,
        speed = 50,
        hover = 107,
        reach = 180,
        trail = 900,
        width,
        height,
    } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    const vRef = useRef({
        bg: [0.094, 0.129, 0.176] as [number, number, number],
        glyph: [0.663, 0.722, 0.788] as [number, number, number],
        accent: [0.949, 0.761, 0.478] as [number, number, number],
        size: 64,
        speed: 1,
        hover: 1,
        reach: 180,
        trail: 900,
    })
    vRef.current = {
        bg: parseColor(background, [0.094, 0.129, 0.176]),
        glyph: parseColor(glyphColor, [0.663, 0.722, 0.788]),
        accent: parseColor(accent, [0.949, 0.761, 0.478]),
        size: Math.max(20, num(size, 64)),
        speed: Math.max(0, num(speed, 50)) / 50,
        hover: Math.max(0, num(hover, 100)) / 100,
        reach: Math.max(10, num(reach, 180)),
        trail: Math.max(0, num(trail, 900)),
    }

    useEffect(() => {
        const canvas = canvasRef.current
        const root = rootRef.current
        if (!canvas || !root) return
        const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false })
        if (!gl) {
            console.error("GlyphWall: WebGL unavailable")
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
            console.error("GlyphWall link:", gl.getProgramInfoLog(prog))
            return
        }
        gl.useProgram(prog)

        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        const posLoc = gl.getAttribLocation(prog, "a_pos")
        gl.enableVertexAttribArray(posLoc)
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

        const tex = gl.createTexture()
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, buildAtlas())
        gl.generateMipmap(gl.TEXTURE_2D)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

        const u = {
            res: gl.getUniformLocation(prog, "uRes"),
            dpr: gl.getUniformLocation(prog, "uDpr"),
            time: gl.getUniformLocation(prog, "uTime"),
            size: gl.getUniformLocation(prog, "uSize"),
            reach: gl.getUniformLocation(prog, "uReach"),
            hover: gl.getUniformLocation(prog, "uHover"),
            bg: gl.getUniformLocation(prog, "uBg"),
            glyph: gl.getUniformLocation(prog, "uGlyph"),
            accent: gl.getUniformLocation(prog, "uAccent"),
            pts: gl.getUniformLocation(prog, "uPts"),
            atlas: gl.getUniformLocation(prog, "uAtlas"),
        }
        gl.uniform1i(u.atlas, 0)

        // Pointer lives in client space; it is mapped to local px every frame
        // so a scroll under a stationary pointer still moves the light.
        const pointer = { x: 0, y: 0, has: false, gone: true }
        const onMove = (e: PointerEvent) => {
            pointer.x = e.clientX
            pointer.y = e.clientY
            pointer.has = true
            pointer.gone = false
        }
        const onLeave = () => {
            pointer.gone = true
        }
        window.addEventListener("pointermove", onMove, { passive: true })
        document.documentElement.addEventListener("pointerleave", onLeave)
        window.addEventListener("blur", onLeave)

        const isCanvas = false
        const trailPts: { x: number; y: number; t: number }[] = []
        const head = { x: 0, y: 0, t: -1e9, inside: false }
        const ptsBuf = new Float32Array((TRAIL_POINTS + 1) * 3)

        let raf = 0
        let last = performance.now()
        let clock = 0

        const render = (now: number) => {
            const dt = Math.max(0, Math.min(0.05, (now - last) / 1000))
            last = now
            const v = vRef.current
            clock = (clock + dt * v.speed) % 3600

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

            // ---- pointer → local px (zoom-cancelled) ----
            let inside = false
            let lx = 0
            let ly = 0
            if (isCanvas) {
                lx = cw * (0.5 + 0.34 * Math.sin(clock * 0.37))
                ly = ch * (0.5 + 0.3 * Math.sin(clock * 0.53 + 1))
                inside = true
            } else if (pointer.has && !pointer.gone) {
                const rect = root.getBoundingClientRect()
                if (rect.width > 0 && rect.height > 0) {
                    lx = ((pointer.x - rect.left) * root.offsetWidth) / rect.width
                    ly = ((pointer.y - rect.top) * root.offsetHeight) / rect.height
                    inside = lx >= 0 && ly >= 0 && lx <= cw && ly <= ch
                }
            }
            if (inside) {
                head.x = lx
                head.y = ly
                head.t = now
                const tail = trailPts[trailPts.length - 1]
                const step = Math.max(8, v.reach * 0.25)
                if (!tail || Math.hypot(tail.x - lx, tail.y - ly) > step) {
                    trailPts.push({ x: lx, y: ly, t: now })
                    if (trailPts.length > TRAIL_POINTS) trailPts.shift()
                }
            }
            head.inside = inside

            const fade = (t: number) => {
                if (v.trail <= 0) return 0
                const w = Math.max(0, Math.min(1, 1 - (now - t) / v.trail))
                return w * w * (3 - 2 * w)
            }
            ptsBuf[0] = head.x
            ptsBuf[1] = head.y
            ptsBuf[2] = head.inside ? 1 : fade(head.t)
            for (let i = 0; i < TRAIL_POINTS; i++) {
                const p = trailPts[i]
                const o = (i + 1) * 3
                ptsBuf[o] = p ? p.x : 0
                ptsBuf[o + 1] = p ? p.y : 0
                ptsBuf[o + 2] = p ? fade(p.t) : 0
            }

            gl.uniform2f(u.res, bw, bh)
            gl.uniform1f(u.dpr, bw / cw)
            gl.uniform1f(u.time, clock)
            gl.uniform1f(u.size, v.size)
            gl.uniform1f(u.reach, v.reach)
            gl.uniform1f(u.hover, v.hover)
            gl.uniform3f(u.bg, v.bg[0], v.bg[1], v.bg[2])
            gl.uniform3f(u.glyph, v.glyph[0], v.glyph[1], v.glyph[2])
            gl.uniform3f(u.accent, v.accent[0], v.accent[1], v.accent[2])
            gl.uniform3fv(u.pts, ptsBuf)

            gl.drawArrays(gl.TRIANGLES, 0, 3)
            raf = requestAnimationFrame(render)
        }

        raf = requestAnimationFrame(render)
        return () => {
            cancelAnimationFrame(raf)
            window.removeEventListener("pointermove", onMove)
            document.documentElement.removeEventListener("pointerleave", onLeave)
            window.removeEventListener("blur", onLeave)
        }
    }, [])

    return (
        <div
            ref={rootRef}
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
