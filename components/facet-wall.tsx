"use client"

import { useEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"

/* ------------------------------------------------------------------ *
 *  FacetWall
 *  A picture seen through a wall of glass tiles. One
 *  full-frame WebGL quad; no geometry, no DOM per cell.
 *
 *  Built after the hex-glass WebGL demo supplied as the reference (a raw
 *  `webgl` canvas with a toolbar of Glass / Chromatic / Breath sliders and
 *  a hex / square / diamond / triangle / circle shape switch). Ported
 *  mechanism-for-mechanism; the name here is ours.
 *
 *  Everything happens per fragment, in five steps:
 *
 *    1. the pixel is snapped to the nearest cell centre of the chosen
 *       lattice — axial hex rounding through cube coordinates for the
 *       honeycomb, a rhombic lattice for triangles, a plain grid for the
 *       rest (`nearestCenter`)
 *    2. that cell's signed distance field says how far inside the tile the
 *       pixel is, which is both the tile's edge and its antialiasing
 *       (`shapeSDF`, `inside`)
 *    3. the offset from the centre, normalised, is the fake surface normal.
 *       The media lookup is pushed along it by `uAmp * (1 - rad^1.4) *
 *       0.07` — strongest at the centre of a tile, nothing at its rim, which
 *       is what reads as a lens rather than a blur
 *    4. red and blue are sampled a little further along and a little
 *       shorter than green. That split is the whole chromatic fringe
 *    5. a specular term, `pow(dot(L, n), 14)`, lights every tile from one
 *       direction, and a click drops a decaying ring that pushes the same
 *       lookup outward as it passes
 *
 *  Departures from the reference, all forced by living in a frame instead
 *  of a full-page demo — each one is commented where it happens:
 *
 *    - the media covers the frame on its own aspect and gets a Y Offset,
 *      instead of being stretched across screen uv
 *    - cell size, the breathing wave and the ripple are measured in CSS
 *      pixels rather than device pixels, so a retina screen does not halve
 *      the tiles; only the 1.5px edge softening stays in device pixels
 *    - the breathing wave runs on an accumulated phase, not `iTime * speed`
 *    - the pointer light is *mixed* by the eased pointer factor rather than
 *      switched by it
 *    - drag-to-pan, ctrl-wheel zoom, scroll-to-resize-cells and the
 *      double-click wireframe were demo chrome. Panning and zooming are
 *      gone (Cover plus Y Offset is how every picture is framed here); the
 *      wireframe became the Edges control
 * ------------------------------------------------------------------ */

/* ----------------------------------------------------------- constants */

/** Device pixels of softening on a tile edge. The reference's
 *  `smoothstep(0.0, 1.5, -d)`, kept in device pixels while everything else
 *  moved to CSS ones — an edge should be one hairline at any density. */
const EDGE_AA = 1.5

/** Cell sizes below this collapse into moiré; the reference clamps here too
 *  (`max(6.0, uCell)`). */
const MIN_CELL = 6

/** How far the media may slide inside its own crop. Not pixels: the ends are
 *  the media's own top and bottom edges. */
const OFFSET_RANGE = 250

/* Panel 0-10 scales, and what the reference's own sliders read at each. The
 * component out of the box is the reference. */
// reference toolbar: Glass 0.50 on a 0..1.5 slider. 3.3 * 0.15 = 0.495, which
// is where a panel that steps in tenths lands on it.
const GLASS_PER_UNIT = 0.15
// reference toolbar: Chromatic 0.60 on a 0..2 slider. Exact at 3.
const CHROMA_PER_UNIT = 0.2
// reference toolbar: Breath 1.00 on a 0..4 slider. Exact at 2.5.
const BREATH_PER_UNIT = 0.4
// the reference's `uEnableParallax`, which it wires up and then passes 0.
const PARALLAX_PER_UNIT = 0.2
// the reference's `uEnableRipple`, which it passes at 1. Exact at 5.
const RIPPLE_PER_UNIT = 0.2
// the reference's wireframe draws at `wf * 0.3` when toggled on: 5 here.
const EDGE_PER_UNIT = 0.06

/** Two device pixels per CSS pixel is where the cost stops buying detail. */
const DPR_CAP = 2

const SHAPES = ["hex", "square", "diamond", "triangle", "circle"] as const

/* ------------------------------------------------------------ defaults */

/** The Media row. One constant, so the signature and the panel's
 *  `defaultValue` can never drift apart. */
const DEFAULT_MEDIA = {
    image: {
        src: "https://images.unsplash.com/photo-1669647561467-891414e9b140?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDV8fHxlbnwwfHx8fHw%3D",
    } as ResponsiveImage,
    offsetY: 0,
}

/** How the wall answers the pointer. */
const DEFAULT_RESPONSE = {
    light: true,
    // Off, because the reference ships it off.
    parallax: 0,
    ripple: 5,
}

const DEFAULTS = {
    media: DEFAULT_MEDIA,
    // the reference page's own ground, which is what shows for the moment
    // before the media lands
    background: "#07070a",
    shape: "hex",
    cellSize: 11,
    glass: 10,
    chromatic: 6.8,
    edges: 0,
    response: DEFAULT_RESPONSE,
    breathe: true,
    breathSpeed: 10,
}

/* --------------------------------------------------------------- types */

type ShapeName = (typeof SHAPES)[number]

type ResponsiveImage = { src?: string; srcSet?: string; alt?: string } | string

export interface FacetWallMedia {
    /** The picture behind the glass. */
    image?: ResponsiveImage
    /** -250..250. Which band of the crop shows; the ends are the media's own
     *  top and bottom edges. */
    offsetY?: number
}

export interface FacetWallResponse {
    /** Whether the tiles' highlight follows the pointer. */
    light?: boolean
    /** 0-10 how far the media slides under the wall as the pointer moves. */
    parallax?: number
    /** 0-10 the ring a click sends across the wall. 0 removes it. */
    ripple?: number
}

export interface FacetWallProps {
    media?: FacetWallMedia
    /** Shows while the media loads, and if the browser has no WebGL. */
    background?: string
    /** Which lattice the wall is cut into. */
    shape?: ShapeName
    /** Tile size across, in CSS px. */
    cellSize?: number
    /** 0-10 how hard each tile bends what is behind it. */
    glass?: number
    /** 0-10 the red/blue split at the tile rims. */
    chromatic?: number
    /** 0-10 a white line along every tile edge. 0 leaves the wall seamless. */
    edges?: number
    response?: FacetWallResponse
    /** Whether the tiles swell and shrink in a travelling wave. */
    breathe?: boolean
    /** 0-10 how fast that wave crosses the wall. */
    breathSpeed?: number
    style?: CSSProperties
}

type Resolved = Omit<Required<FacetWallProps>, "media" | "response" | "style"> & {
    media: Required<FacetWallMedia>
    response: Required<FacetWallResponse>
}

/* ------------------------------------------------------------- helpers */

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Framer hands a ResponsiveImage as {src, srcSet, alt} or a bare string. */
function srcOf(image: ResponsiveImage | undefined): string {
    if (!image) return ""
    if (typeof image === "string") return image
    return image.src ?? ""
}

function altOf(image: ResponsiveImage | undefined): string {
    if (!image || typeof image === "string") return ""
    return image.alt ?? ""
}

function shapeIndex(name: ShapeName): number {
    const i = SHAPES.indexOf(name)
    return i < 0 ? 0 : i
}

/* -------------------------------------------------------------- shader */

const VERT = /* glsl */ `
attribute vec2 aPos;
varying vec2 vUV;

void main(){
    vUV = 0.5 * (aPos + 1.0);
    gl_Position = vec4(aPos, 0.0, 1.0);
}
`

const FRAG = /* glsl */ `
uniform vec2  iResolution;   // frame size in CSS px
uniform float uDPR;
uniform float iTime;         // seconds; drives the ripple only
uniform vec2  iMouse;        // CSS px, y up. Negative until a pointer arrives.
uniform sampler2D iChannel0;
uniform vec2  uMediaRes;     // the media's own pixel size
uniform float uOffsetY;      // -1..1 across the crop's own slack

uniform float uCell, uAmp, uChrom, uPhase, uAnimate;
uniform int   uShape;
uniform float uEdges, uRipple, uParallax, uLight;
uniform vec2  uRippleC;
uniform float uRippleT;

varying vec2 vUV;

/* --- the honeycomb. Pixel -> axial -> rounded through cube coordinates ->
       back to pixel, which is the standard pointy-top hex snap and is what
       the reference uses verbatim. */
vec2 hex_pixel_to_axial(vec2 p, float s){
    float q = (1.7320508/3.0*p.x - 0.3333333*p.y)/s;
    float r = (0.6666667*p.y)/s;
    return vec2(q,r);
}
vec3 cube_round(vec3 c){
    float rx=floor(c.x+0.5), ry=floor(c.y+0.5), rz=floor(c.z+0.5);
    float dx=abs(rx-c.x), dy=abs(ry-c.y), dz=abs(rz-c.z);
    if(dx>dy && dx>dz) rx=-ry-rz; else if(dy>dz) ry=-rx-rz; else rz=-rx-ry;
    return vec3(rx,ry,rz);
}
vec2 hex_axial_round(vec2 qr){
    vec3 cube=vec3(qr.x, -qr.x-qr.y, qr.y);
    vec3 rc=cube_round(cube);
    return vec2(rc.x, rc.z);
}
vec2 hex_axial_to_pixel(vec2 qr, float s){
    float x=s*(1.7320508*qr.x + 0.8660254*qr.y);
    float y=s*(1.5*qr.y);
    return vec2(x,y);
}

/* --- one tile's outline. The insets (0.95, 0.5, 0.55, 0.6) are the
       reference's, and they are what keeps each lattice's tiles meeting the
       way they do; they are the shape, not a gap control. */
float sdHex(vec2 p, float r){
    p=abs(p);
    return max(dot(p, normalize(vec2(1.0,1.7320508))) - r, p.x - r);
}
float sdBox(vec2 p, vec2 b){ vec2 d = abs(p)-b; return max(d.x,d.y); }
float sdCircle(vec2 p, float r){ return length(p)-r; }
float sdTriIso(vec2 p, float r){
    const float k = 1.7320508;
    p.x = abs(p.x) - r;
    p.y = p.y + r/k;
    if(p.x + k*p.y > 0.0){
        p = vec2(p.x - k*p.y, -k*p.x - p.y)/2.0;
    }
    p.x -= clamp(p.x, -2.0*r, 0.0);
    return -length(p)*sign(p.y);
}

void nearestCenter(int shape, vec2 p, float cell, out vec2 c, out vec2 lp){
    if(shape==0){
        vec2 qr  = hex_pixel_to_axial(p, cell);
        vec2 qrr = hex_axial_round(qr);
        c = hex_axial_to_pixel(qrr, cell);
        lp = p - c;
    } else if(shape==3){
        // triangles sit on a rhombic lattice, so the snap is a change of
        // basis and a round rather than a floor of p/cell
        vec2 e1 = vec2(cell, 0.0);
        vec2 e2 = vec2(cell*0.5, cell*0.8660254);
        float det = e1.x*e2.y - e1.y*e2.x;
        vec2 k;
        k.x = ( p.x*e2.y - p.y*e2.x) / det;
        k.y = (-p.x*e1.y + p.y*e1.x) / det;
        vec2 kR = floor(k + 0.5);
        c = e1*kR.x + e2*kR.y;
        lp = p - c;
    } else {
        vec2 g = floor(p/cell + 0.5);
        c = g * cell;
        lp = p - c;
    }
}

float shapeSDF(int shape, vec2 lp, float cell){
    // The reference insets the hexagon by 0.95, but the lattice puts
    // neighbouring centres sqrt(3)*cell apart, so every apothem has to be
    // half of that — 0.866. At 0.95 the hexagons overlap their neighbours by
    // a tenth, d never reaches 0 inside the cell a pixel belongs to, and the
    // reference's own wireframe toggle draws nothing at all on its default
    // shape. Squares and triangles tile exactly and show it, which is
    // presumably where it was checked. At Edges 0 the two insets are
    // indistinguishable: the refraction and the highlight both fall to
    // nothing at the rim, so the seam this opens has nothing to show.
    if(shape==0){ return sdHex(lp, cell*0.8660254); }
    if(shape==1){ return sdBox(lp, vec2(cell*0.5)); }
    if(shape==2){
        float a = 0.78539816339; // 45 degrees
        mat2 R = mat2(cos(a), -sin(a), sin(a), cos(a));
        return sdBox(R*lp, vec2(cell*0.5));
    }
    if(shape==3){ return sdTriIso(lp, cell*0.6); }
    return sdCircle(lp, cell*0.55);
}

/* --- Cover, on the media's own aspect.
       The reference reads the texture at raw screen uv, which squeezes a 3:2
       picture into whatever shape the window happens to be. Here the frame uv
       is mapped into a centred window over the media instead: the short axis
       fills, the long one overflows and is cropped, and Y Offset chooses
       which band of that overflow shows.

       The refraction offsets are still added in frame uv, exactly as the
       reference adds them, and are converted through this mapping — so a tile
       bends the media by a fixed distance on screen whatever the media's
       proportions are.

       Lookups pushed outside 0..1 land on CLAMP_TO_EDGE, which is what
       stretches the border pixels at the frame's rim the way the reference
       does rather than tiling the picture back in on itself. */
vec3 sampleImage(vec2 uv){
    float frameA = iResolution.x / max(iResolution.y, 1.0);
    float mediaA = uMediaRes.x / max(uMediaRes.y, 1.0);
    vec2 win = (mediaA > frameA)
        ? vec2(frameA / mediaA, 1.0)
        : vec2(1.0, mediaA / frameA);
    // How much of the media the crop leaves over is all the room the offset
    // has. Media with no vertical overflow has none, and the offset correctly
    // does nothing.
    vec2 slack = 1.0 - win;
    // "centred, then nudged": 0 is the crop the frame would have had anyway,
    // +1 puts the media's top edge flush and -1 its bottom.
    vec2 uvm = (uv - 0.5) * win + 0.5 + vec2(0.0, slack.y * 0.5 * uOffsetY);
    return texture2D(iChannel0, uvm).rgb;
}

void main(){
    vec2 res = iResolution;
    // CSS px, not device px. The reference works straight in gl_FragCoord and
    // so halves its own cell size on a retina screen; a Cell Size of 56 has to
    // mean 56 wherever it renders.
    vec2 frag = gl_FragCoord.xy / uDPR;
    vec2 p = frag - 0.5*res;
    vec2 uv = vUV;
    vec2 mouse = iMouse;
    bool hasMouse = (mouse.x >= 0.0 && mouse.y >= 0.0);
    vec2 mp = mouse - 0.5*res;

    vec2 par = vec2(0.0);
    if(uParallax > 0.001 && hasMouse){
        par = (mp/max(res.x,res.y))*0.05*uParallax;
    }
    vec2 uvw = uv + par;

    float cell = max(${MIN_CELL.toFixed(1)}, uCell);

    // The travelling swell. uPhase is accumulated on the CPU rather than read
    // as iTime*speed, so dragging Breath Speed changes the rate without
    // jumping the wave to a new position.
    float wave = (uAnimate > 0.5)
        ? (sin(p.x*0.01 + p.y*0.015 + uPhase)*0.25)
        : 0.0;
    float localCell = cell*(1.0+wave*0.2);

    vec2 c, lp; nearestCenter(uShape, p, localCell, c, lp);
    float d = shapeSDF(uShape, lp, localCell);
    // A device pixel and a half of softening, expressed in the CSS px that d
    // is measured in.
    float aa = ${EDGE_AA.toFixed(1)} / uDPR;
    float inside = smoothstep(0.0, aa, -d);

    // How far out of its tile this pixel sits, 0 at the centre and 1 at the
    // rim, and the direction it lies in. Together they are the lens.
    float rad = clamp(length(lp) / (localCell*0.95), 0.0, 1.0);
    vec2 n = normalize(lp + 1e-6);

    float ripple=0.0; vec2 rippleDir=vec2(0.0);
    if(uRipple > 0.001 && uRippleC.x >= 0.0){
        vec2 cp=uRippleC-0.5*res;
        float R=length(p-cp);
        float dt=max(0.0, iTime-uRippleT);
        // decays with distance and with age, so the ring dies out on its own
        float env=exp(-R*0.006)*exp(-dt*1.0);
        ripple=sin(R*0.06 - dt*6.0)*env;
        rippleDir=normalize(p-cp+1e-6);
    }

    vec3 base=sampleImage(uvw);
    // The lens: full push at the tile's centre, none at its rim. The 1.4
    // exponent is what makes the falloff read as a curved surface rather than
    // a cone.
    float strength=uAmp*(1.0-pow(rad,1.4))*0.07;
    vec2 refr=n*strength + rippleDir*(0.02*ripple*uRipple);

    // Red pushed further along the refraction than green, blue pulled back
    // short of it. Both distances scale with Chromatic, which is why the
    // fringe widens rather than only brightening.
    vec2 ca=refr*(0.25*uChrom); float ca2=0.6*uChrom;
    vec3 glass;
    glass.r=sampleImage(uvw+refr+ca).r;
    glass.g=sampleImage(uvw+refr).g;
    glass.b=sampleImage(uvw+refr-ca*ca2).b;

    // The reference feeds its eased pointer factor into a "greater than 0.01"
    // test, so all the easing buys is a delay before the light snaps between the
    // pointer and the fixed direction. Mixing the direction by that factor is
    // what the easing was for: the light now glides back to its resting angle
    // as the pointer leaves.
    vec2 fixedL = normalize(vec2(0.7,1.0));
    vec2 L = hasMouse
        ? normalize(mix(fixedL, normalize(mp + 1e-6), uLight) + 1e-6)
        : fixedL;
    float spec=pow(max(0.0,dot(L,n)),14.0)*(1.0-rad);
    glass+=vec3(1.0,0.96,0.9)*spec*0.45;

    vec3 col=mix(base,glass,inside);
    if(uEdges > 0.0){
        float wf=smoothstep(aa,0.0,abs(d));
        col=mix(col, vec3(1.0), wf*uEdges);
    }

    // A tenth of corner falloff, fixed: it is what sits the wall in the page
    // rather than a setting.
    float vign=smoothstep(1.2,0.2,length((frag-0.5*res)/res.y));
    col*=mix(0.9,1.0,vign);
    gl_FragColor=vec4(col,1.0);
}
`

function compile(
    gl: WebGLRenderingContext,
    type: number,
    src: string
): WebGLShader | null {
    const s = gl.createShader(type)
    if (!s) return null
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        gl.deleteShader(s)
        return null
    }
    return s
}

/**
 * Stand-in media, so an instance with nothing set still shows what the
 * component does. Drawn once and shared: a dark ground with three wide colour
 * washes, because a flat fill refracts into nothing and the chromatic split
 * needs edges to sit on.
 */
let placeholderCanvas: HTMLCanvasElement | null = null

function placeholderMedia(): HTMLCanvasElement | null {
    if (placeholderCanvas) return placeholderCanvas
    if (typeof document === "undefined") return null
    const cvs = document.createElement("canvas")
    cvs.width = 1024
    cvs.height = 640
    const ctx = cvs.getContext("2d")
    if (!ctx) return null

    const ground = ctx.createLinearGradient(0, 0, cvs.width, cvs.height)
    ground.addColorStop(0, "#1a0f12")
    ground.addColorStop(0.45, "#0c0b11")
    ground.addColorStop(1, "#07070a")
    ctx.fillStyle = ground
    ctx.fillRect(0, 0, cvs.width, cvs.height)

    const blobs: Array<[number, number, number, string]> = [
        [0.24, 0.22, 0.55, "rgba(255,154,156,0.85)"],
        [0.78, 0.34, 0.45, "rgba(120,110,255,0.7)"],
        [0.5, 0.86, 0.5, "rgba(60,220,200,0.55)"],
    ]
    ctx.globalCompositeOperation = "lighter"
    for (const [x, y, r, color] of blobs) {
        const cx = x * cvs.width
        const cy = y * cvs.height
        const radius = r * cvs.width * 0.5
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
        g.addColorStop(0, color)
        g.addColorStop(1, "rgba(0,0,0,0)")
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
        ctx.fill()
    }
    ctx.globalCompositeOperation = "source-over"

    placeholderCanvas = cvs
    return cvs
}

/* ------------------------------------------------------------ component */

export default function FacetWall({
    media,
    background = DEFAULTS.background,
    shape = DEFAULTS.shape,
    cellSize = DEFAULTS.cellSize,
    glass = DEFAULTS.glass,
    chromatic = DEFAULTS.chromatic,
    edges = DEFAULTS.edges,
    response,
    breathe = DEFAULTS.breathe,
    breathSpeed = DEFAULTS.breathSpeed,
    style,
}: FacetWallProps) {
    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [failed, setFailed] = useState(false)

    // Partial group objects are normal in Framer — an instance may have set
    // only the picture — so every group merges over its DEFAULT_* constant
    // rather than being trusted whole.
    const resolved: Resolved = {
        media: { ...DEFAULT_MEDIA, ...media },
        background,
        shape,
        cellSize,
        glass,
        chromatic,
        edges,
        response: { ...DEFAULT_RESPONSE, ...response },
        breathe,
        breathSpeed,
    }

    // Live prop mirror. The render loop reads from here, so tweaking a control
    // never tears down the GL context or reloads the media.
    const propsRef = useRef<Resolved>(resolved)
    propsRef.current = resolved

    // Set by the mount effect, called by the media effect below.
    const loadMediaRef = useRef<(() => void) | null>(null)

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return

        let disposed = false
        let raf = 0
        let gl: WebGLRenderingContext | null = null
        let program: WebGLProgram | null = null
        let buffer: WebGLBuffer | null = null
        let texture: WebGLTexture | null = null
        let uni: Record<string, WebGLUniformLocation | null> = {}

        let onScreen = true
        let pageVisible = true

        // clocks. `phase` accumulates so a speed change never snaps the wave
        let elapsed = 0
        let phase = 0
        let lastNow = 0

        // pointer, in CSS px with y up, and negative until one arrives — the
        // shader reads that as "no pointer" and lights from the fixed angle
        let mouseX = -1
        let mouseY = -1
        let targetX = -1
        let targetY = -1
        let lightF = 0
        let lightTarget = 0

        let rippleX = -1
        let rippleY = -1
        let rippleT = 0

        // media
        let imageEl: HTMLImageElement | null = null
        let mediaW = 0
        let mediaH = 0
        // null, not "", so the first call cannot mistake "nothing loaded yet"
        // for "the empty media row is already up" and skip the placeholder.
        let loadedImage: string | null = null
        let usingPlaceholder = true
        let loadToken = 0

        /* ------------------------------------------------------ setup */

        function init(): boolean {
            const ctx =
                (canvas.getContext("webgl", {
                    alpha: false,
                    antialias: false,
                    premultipliedAlpha: false,
                    powerPreference: "high-performance",
                }) as WebGLRenderingContext | null) ||
                (canvas.getContext(
                    "experimental-webgl"
                ) as WebGLRenderingContext | null)
            if (!ctx) return false
            gl = ctx

            const hp = gl.getShaderPrecisionFormat(
                gl.FRAGMENT_SHADER,
                gl.HIGH_FLOAT
            )
            const precision = hp && hp.precision > 0 ? "highp" : "mediump"
            const prelude = "precision " + precision + " float;\n"

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
            gl.bufferData(
                gl.ARRAY_BUFFER,
                new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
                gl.STATIC_DRAW
            )
            gl.enableVertexAttribArray(0)
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

            const names = [
                "iResolution",
                "uDPR",
                "iTime",
                "iMouse",
                "iChannel0",
                "uMediaRes",
                "uOffsetY",
                "uCell",
                "uAmp",
                "uChrom",
                "uPhase",
                "uAnimate",
                "uShape",
                "uEdges",
                "uRipple",
                "uParallax",
                "uLight",
                "uRippleC",
                "uRippleT",
            ]
            uni = {}
            for (const n of names) uni[n] = gl.getUniformLocation(prog, n)

            texture = gl.createTexture()
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, texture)
            // Photographs are almost never power-of-two, so
            // clamped + linear with no mipmaps is the only legal filtering —
            // and clamping is also what the refraction wants at the rim.
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                1,
                1,
                0,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                new Uint8Array([0, 0, 0, 255])
            )
            gl.uniform1i(uni["iChannel0"], 0)

            return true
        }

        /* ------------------------------------------------------ media */

        function upload(source: TexImageSource): boolean {
            if (!gl || !texture) return false
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, texture)
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
            try {
                gl.texImage2D(
                    gl.TEXTURE_2D,
                    0,
                    gl.RGBA,
                    gl.RGBA,
                    gl.UNSIGNED_BYTE,
                    source
                )
            } catch {
                // A cross-origin source served without the header taints the
                // upload. Fall back rather than leave a dead black frame.
                return false
            }
            return true
        }

        function showPlaceholder() {
            const cvs = placeholderMedia()
            usingPlaceholder = true
            mediaW = 0
            mediaH = 0
            if (cvs) upload(cvs)
        }

        /** Resolve the Media row to one texture source. */
        function loadMedia() {
            const m = propsRef.current.media
            const imageSrc = srcOf(m.image)
            if (imageSrc === loadedImage) return
            loadedImage = imageSrc
            const token = ++loadToken

            imageEl = null

            if (imageSrc) {
                const img = new window.Image()
                img.crossOrigin = "anonymous"
                img.decoding = "async"
                img.onload = () => {
                    if (disposed || token !== loadToken) return
                    const w = img.naturalWidth || img.width || 0
                    const h = img.naturalHeight || img.height || 0
                    if (!w || !h || !upload(img)) {
                        showPlaceholder()
                        return
                    }
                    // Cover is solved against the picture's own proportions, so
                    // the measurement and the upload land together.
                    mediaW = w
                    mediaH = h
                    usingPlaceholder = false
                    imageEl = img
                }
                img.onerror = () => {
                    if (disposed || token !== loadToken) return
                    showPlaceholder()
                }
                img.src = imageSrc
                return
            }

            showPlaceholder()
        }

        loadMediaRef.current = loadMedia

        /* ----------------------------------------------------- resize */

        function resize() {
            if (!gl) return
            const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
            const w = Math.max(1, Math.round(host.clientWidth * dpr))
            const h = Math.max(1, Math.round(host.clientHeight * dpr))
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w
                canvas.height = h
                gl.viewport(0, 0, w, h)
            }
        }

        /* ------------------------------------------------------ frame */

        function draw(dt: number) {
            if (!gl || !program) return
            const p = propsRef.current
            const r = p.response

            if (p.breathe) {
                phase +=
                    dt *
                    clamp(p.breathSpeed, 0, 10, DEFAULTS.breathSpeed) *
                    BREATH_PER_UNIT
            }
            elapsed += dt

            // Pointer easing. The reference eases by a fixed fraction of the
            // gap each frame, which settles twice as fast on a 120Hz display;
            // this is the same constant expressed per second.
            const k = 1 - Math.exp(-dt * 15)
            if (targetX >= 0) {
                if (mouseX < 0) {
                    mouseX = targetX
                    mouseY = targetY
                } else {
                    mouseX += (targetX - mouseX) * k
                    mouseY += (targetY - mouseY) * k
                }
            }
            lightF += (lightTarget - lightF) * k

            const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
            const cssW = canvas.width / dpr
            const cssH = canvas.height / dpr

            gl.useProgram(program)
            gl.uniform2f(uni["iResolution"], cssW, cssH)
            gl.uniform1f(uni["uDPR"], dpr)
            gl.uniform1f(uni["iTime"], elapsed)
            gl.uniform2f(uni["iMouse"], mouseX, mouseY)
            // The placeholder is a first paint, and a first paint wants to
            // fill: handing it the frame's own size makes Cover an identity and
            // leaves nothing cropped away.
            gl.uniform2f(
                uni["uMediaRes"],
                usingPlaceholder || !mediaW ? cssW : mediaW,
                usingPlaceholder || !mediaH ? cssH : mediaH
            )
            gl.uniform1f(
                uni["uOffsetY"],
                clamp(p.media.offsetY, -OFFSET_RANGE, OFFSET_RANGE, 0) /
                    OFFSET_RANGE
            )
            gl.uniform1f(
                uni["uCell"],
                clamp(p.cellSize, MIN_CELL, 400, DEFAULTS.cellSize)
            )
            gl.uniform1f(
                uni["uAmp"],
                clamp(p.glass, 0, 10, DEFAULTS.glass) * GLASS_PER_UNIT
            )
            gl.uniform1f(
                uni["uChrom"],
                clamp(p.chromatic, 0, 10, DEFAULTS.chromatic) * CHROMA_PER_UNIT
            )
            gl.uniform1f(uni["uPhase"], phase)
            gl.uniform1f(uni["uAnimate"], p.breathe ? 1 : 0)
            gl.uniform1i(uni["uShape"], shapeIndex(p.shape))
            gl.uniform1f(
                uni["uEdges"],
                clamp(p.edges, 0, 10, DEFAULTS.edges) * EDGE_PER_UNIT
            )
            gl.uniform1f(
                uni["uRipple"],
                clamp(r.ripple, 0, 10, DEFAULT_RESPONSE.ripple) * RIPPLE_PER_UNIT
            )
            gl.uniform1f(
                uni["uParallax"],
                clamp(r.parallax, 0, 10, DEFAULT_RESPONSE.parallax) *
                    PARALLAX_PER_UNIT
            )
            gl.uniform1f(uni["uLight"], r.light ? lightF : 0)
            gl.uniform2f(uni["uRippleC"], rippleX, rippleY)
            gl.uniform1f(uni["uRippleT"], rippleT)

            gl.drawArrays(gl.TRIANGLES, 0, 6)
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

        /* --------------------------------------------------- listeners */

        if (!init()) {
            setFailed(true)
            return
        }
        loadMedia()

        const ro =
            typeof ResizeObserver !== "undefined"
                ? new ResizeObserver(() => resize())
                : null
        if (ro) ro.observe(host)

        const io =
            typeof IntersectionObserver !== "undefined"
                ? new IntersectionObserver(
                      (entries) => {
                          onScreen = entries.some((e) => e.isIntersecting)
                      },
                      { rootMargin: "128px" }
                  )
                : null
        if (io) io.observe(host)

        const onVisibility = () => {
            pageVisible = document.visibilityState !== "hidden"
        }
        document.addEventListener("visibilitychange", onVisibility)

        /** CSS px from the frame's own top-left, flipped onto the y-up axis
         *  the shader works in. */
        function localPoint(e: PointerEvent): [number, number] | null {
            const rect = host.getBoundingClientRect()
            if (!rect.width || !rect.height) return null
            return [e.clientX - rect.left, rect.height - (e.clientY - rect.top)]
        }

        const onPointerMove = (e: PointerEvent) => {
            const pt = localPoint(e)
            if (!pt) return
            targetX = pt[0]
            targetY = pt[1]
            lightTarget = 1
        }
        const onPointerLeave = () => {
            // The position is left where it was: the light glides back to its
            // resting angle rather than swinging to a corner on the way out.
            lightTarget = 0
        }
        const onPointerDown = (e: PointerEvent) => {
            const pt = localPoint(e)
            if (!pt) return
            rippleX = pt[0]
            rippleY = pt[1]
            rippleT = elapsed
        }
        host.addEventListener("pointermove", onPointerMove)
        host.addEventListener("pointerleave", onPointerLeave)
        host.addEventListener("pointerdown", onPointerDown)

        const onLost = (e: Event) => {
            e.preventDefault()
            cancelAnimationFrame(raf)
        }
        const onRestored = () => {
            if (disposed) return
            lastNow = 0
            if (init()) {
                // Every texture died with the context, so the media has to be
                // fetched again rather than compared against what was loaded.
                loadedImage = null
                loadMedia()
                raf = requestAnimationFrame(loop)
            } else {
                setFailed(true)
            }
        }
        canvas.addEventListener("webglcontextlost", onLost)
        canvas.addEventListener("webglcontextrestored", onRestored)

        resize()
        raf = requestAnimationFrame(loop)

        return () => {
            disposed = true
            loadMediaRef.current = null
            cancelAnimationFrame(raf)
            if (ro) ro.disconnect()
            if (io) io.disconnect()
            document.removeEventListener("visibilitychange", onVisibility)
            host.removeEventListener("pointermove", onPointerMove)
            host.removeEventListener("pointerleave", onPointerLeave)
            host.removeEventListener("pointerdown", onPointerDown)
            canvas.removeEventListener("webglcontextlost", onLost)
            canvas.removeEventListener("webglcontextrestored", onRestored)
            if (imageEl) {
                imageEl.onload = null
                imageEl.onerror = null
                imageEl = null
            }
            if (gl) {
                if (buffer) gl.deleteBuffer(buffer)
                if (texture) gl.deleteTexture(texture)
                if (program) gl.deleteProgram(program)
                const lose = gl.getExtension("WEBGL_lose_context")
                if (lose) lose.loseContext()
            }
        }
    }, [])

    // Only the sources reload anything; every other control is a uniform the
    // loop already reads out of propsRef.
    useEffect(() => {
        loadMediaRef.current?.()
    }, [srcOf(resolved.media.image)])

    return (
        <div
            ref={hostRef}
            role="img"
            aria-label={
                altOf(resolved.media.image) ||
                "A picture seen through a wall of glass tiles"
            }
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 80,
                minHeight: 80,
                overflow: "hidden",
                background,
                // The wall answers taps and the pointer, so it keeps the
                // gesture rather than handing it to a scroll.
                touchAction: "none",
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
                    // Nothing to draw without WebGL; the ground shows through.
                    opacity: failed ? 0 : 1,
                }}
            />
        </div>
    )
}

FacetWall.displayName = "Facet Wall"
FacetWall.defaultProps = { ...DEFAULTS }
