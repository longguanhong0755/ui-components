/**
 * GrainyCarousel
 *
 * An endless strip of pictures that dissolves into grain as it reaches the
 * edges of the frame. Drag it, flick it, click either side to step, or let it
 * run. The strip is drawn on a 2D canvas and pushed through one WebGL pass
 * that warps and darkens the two edge bands with animated fbm noise.
 *
 * Port notes (CLAUDE.md rule 10):
 * - The GL context, program, buffers and texture are built ONCE in
 *   `useEffect([])`; every live input is read from a ref inside the loop
 *   (rule 6). The source listed sixteen props in the effect's deps, so moving
 *   any dial recompiled both shaders and rebuilt the context.
 * - `livePreview` is gone. It was a debug knob (rule 10) that decided whether
 *   the component animated on the canvas; a raw rAF loop ticks there, so it
 *   just runs.
 * - `getBoundingClientRect()` in the click handler carried the canvas zoom
 *   (rule G) and made click-to-step land on the wrong picture on a zoomed
 *   canvas. It reads `offsetX`, which is in the element's own untransformed
 *   coordinates.
 * - Pointer capture on the host replaced by `window` listeners, so a pointer
 *   that leaves mid-drag still releases (rule K).
 * - The canvas backing store is DPR-scaled (capped at 2). The source sized it
 *   1:1 with CSS pixels, so every picture was soft on a retina display.
 * - Floats became whole numbers (rule 3), and the two auto-advance rates
 *   (`smoothSpeed` px/frame and `snapInterval` seconds) became one `Speed`:
 *   a period is not a rate (rule P), and one dial cannot mean two things.
 *
 * 1:1 with the reference (rule 8 — the reference defines the interaction):
 * - Same two modes, same drag gain, same click-to-step, same snap zoom curve,
 *   same fbm/simplex warp with the same `pow(xMask, 3) * 3` band and
 *   `smoothstep(1, 0.1, mask / 6)` decay, same 2D fallback when WebGL is
 *   unavailable.
 */
"use client"

import { animate } from "motion/react"

/**
 * framer-motion's `animate()` option bag. `AnimationOptions` is not exported by
 * the copy of framer-motion that ships inside Framer, and its `Transition` type
 * is not assignable to what `animate(value, …)` accepts, so the shape is
 * spelled out here — a type alias, not an interface, or it loses the implicit
 * index signature the intersection needs.
 */
type Motion = {
    type?: "spring" | "tween" | "keyframes" | "inertia"
    duration?: number
    ease?: [number, number, number, number]
    delay?: number
    stiffness?: number
    damping?: number
    mass?: number
    bounce?: number
    restSpeed?: number
    restDelta?: number
}

/**
 * The snap step, ~0.5s to land — the timing the source's 0.08 per-frame lerp
 * produced, which is Damping 16 on this scale.
 *
 * Transition and Damping are NOT the same dial and neither replaces the other
 * (rule M). Snap is a state change from one card to the next, which a spring
 * can overshoot and settle; Smooth is a filter chasing a target that drifts
 * every frame, which a Transition cannot describe. Each control is therefore
 * hidden in the mode it does not drive, rather than one lying in both.
 */
const DEFAULT_TRANSITION: Motion = {
    type: "tween",
    duration: 0.5,
    // easeOut, as the cubic-bezier the tuple type needs.
    ease: [0, 0, 0.58, 1],
}

import * as React from "react"
import { useEffect, useRef } from "react"

/* Panel follows rule 11 — 15 leaf dials, whole numbers (rule 3). Clean break on
 * keys, no fallbacks (rule 11c), old -> new:
 *   aspectRatioKey      \
 *   advanced.imageScale  >- cardWidth + cardHeight (titled Width / Height,
 *                                                   40–800 px)
 *   cornerRadius          -> rounded              (percent of the max radius)
 *   scroll.type           -> scroll.mode
 *   scroll.auto           -> cut; Speed 0 stops it (rule 11a)
 *   scroll.smoothSpeed  \
 *   scroll.snapInterval  >- speed                 (one rate, top level)
 *   scroll.smoothVelocity \
 *   scroll.snapSpeed       >- scroll.damping      (one settle, higher = faster)
 *   scroll.zoom + scroll.zoomAmount -> scroll.zoom (percent; 0 is off, never a
 *                                                   separate boolean)
 *   advanced.edgeWidth    -> cut, frozen at one picture wide
 *   advanced.noiseSpeed   -> grain.speed
 *   advanced.grainAmount  -> grain.amount
 *   advanced.grainScale   -> grain.scale
 * Added: `background` (the root was hard-coded transparent) and `scroll.drag`
 * (the source's 0.5 gain was a constant; it is now the FLOOR of a 0–100 dial
 * that reaches 2.5 px of strip per px of pointer, with 1:1 at dial 25).
 *
 * DEFAULT CHANGES — a stored value is not affected, but an instance that never
 * touched the control picks these up, so they are stated rather than slipped in:
 * `scroll.damping` ships at 60 (the source's 0.3 smooth lerp) rather than 16
 * (its 0.08 snap lerp). Damping filters every drag in BOTH modes, and at 16 the
 * strip reached the pointer at 8% per frame, which reads as lag however high the
 * gain goes. Gain sets how far the strip is asked to go, damping how fast it
 * gets there — both are what "drag harder" means here.
 *
 * SCALE CHANGE — `scroll.drag` was briefly a 0–500 percent of the source gain.
 * A stored number cannot be migrated across a rescale, so an instance holding
 * the old 200 now reads as 100 and drags at the ceiling instead of 1:1. Retype
 * it as 25.
 * Cut and frozen at the source's value: `livePreview`, the 5px click/drag
 * discrimination, and the shader's `uActive` uniform — it was wired to the
 * constant 1.
 *
 * SCALE CHANGES — cannot be migrated by a fallback: `rounded` is a percent of
 * the max radius rather than 16px; the picture box is two px dials rather than
 * an Aspect ratio times a percent of the host, so it no longer tracks a resized
 * frame; `zoom` and
 * `grain.amount` are percents rather than fractions; `speed` and `grain.speed`
 * are 0–100 dials where 50 is the rate the carousel shipped at; `damping` is a
 * single percent replacing two per-frame lerp factors.
 */

interface ScrollGroup {
    mode?: "smooth" | "snap"
    /** 0–100 dial across DRAG_GAIN_MIN…DRAG_GAIN_MAX. 0 is the gain the source
     *  shipped at (not off — the dial has no dead end), 25 is 1:1 with the
     *  pointer, 100 is 2.5:1. */
    drag?: number
    /** percent, 1–100. Higher settles faster. Drives every drag in BOTH modes,
     *  and smooth mode's auto travel. */
    damping?: number
    /** percent, 0–30. 0 is off. */
    zoom?: number
}

interface GrainGroup {
    /** percent of one picture's width, 0–500 */
    /** 0–100 dial; 50 is the rate it shipped at */
    speed?: number
    /** percent, 0–100 */
    amount?: number
    scale?: number
}

interface Props {
    images?: string[]
    background?: string
    /** px */
    cardWidth?: number
    /** px */
    cardHeight?: number
    gap?: number
    /** percent of the max radius */
    rounded?: number
    /** 0–500 dial; 50 is the rate it shipped at */
    speed?: number
    scroll?: ScrollGroup
    grain?: GrainGroup
    transition?: Motion
    style?: React.CSSProperties
}

/** Px of strip travel per px of pointer travel at Drag 0 — the source's
 *  constant, and the FLOOR of the dial rather than a dead zone. */
const DRAG_GAIN_MIN = 0.5
/** …and at Drag 100. Deliberately past 1:1 (which lands at dial 25): one card
 *  at the default box is 731px of strip, so at 1:1 a full-width swipe barely
 *  advances one picture. 2.5 puts one card under a comfortable ~290px drag. */
const DRAG_GAIN_MAX = 2.5

/* Cut controls (rule 10), each frozen at the value the source shipped with. */
/** Px of pointer travel that turns a click into a drag. */
const CLICK_SLOP = 5
/** Strip travel at dial 50, px/sec — the source's 1.5 per frame at 60fps. */
const SMOOTH_AT_50 = 90
/** Seconds between steps at dial 50 — the source's 5. */
const SNAP_INTERVAL_AT_50 = 5
/** Noise rate at grain dial 50 — the source's 0.15. */
const NOISE_AT_50 = 0.15
/** Per-frame lerp at damping 100. Damping 16 reproduces the source's 0.08. */
const DAMP_AT_100 = 0.5

/** The picture box, in px, on the folder's shared 40–800 span. Replaces the
 *  `Aspect` enum + `Size` percent-of-host pair: those two could only reach the
 *  seven listed ratios, and the box moved whenever the host was resized. The
 *  defaults are what that pair drew at the intrinsic 800-tall host — 50% of 800
 *  at 16:9 — so an untouched instance at the default frame is unchanged. */
const DEFAULT_CARD_W = 711
const DEFAULT_CARD_H = 400
const SIZE_MIN = 40
const SIZE_MAX = 800

/* Dummy pictures, so a fresh instance is never blank and every card is
 * DISTINCT. Inline SVG data URIs, never photo URLs: a default pointing at a CDN
 * 404s the day that ID dies and shows nothing offline, behind a proxy, or on a
 * Framer canvas with no network. One set across the folder. */
const DUMMY_PAIRS: ReadonlyArray<[string, string]> = [
    ["FF7A45", "FFB199"],
    ["4D7CFE", "9BC1FF"],
    ["16C79A", "9BE7C4"],
    ["FFC53D", "FFE9A8"],
    ["B15CFF", "E0B8FF"],
    ["FF4D7E", "FFB3C7"],
]
const dummyImage = (i: number, w = 1200, h = 800) => {
    const [a, b] = DUMMY_PAIRS[i % DUMMY_PAIRS.length]
    const n = String(i + 1).padStart(2, "0")
    return (
        `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'%3E` +
        `%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E` +
        `%3Cstop offset='0' stop-color='%23${a}'/%3E%3Cstop offset='1' stop-color='%23${b}'/%3E` +
        `%3C/linearGradient%3E%3C/defs%3E%3Crect width='${w}' height='${h}' fill='url(%23g)'/%3E` +
        `%3Ctext x='50%25' y='50%25' dy='.35em' text-anchor='middle' ` +
        `font-family='Inter, Helvetica, Arial, sans-serif' font-size='${Math.round(Math.min(w, h) * 0.34)}' ` +
        `font-weight='700' fill='rgba(255,255,255,0.9)'%3E${n}%3C/text%3E%3C/svg%3E`
    )
        /* Spaces, quotes and parens are all invalid inside an unquoted CSS
         * `url(...)`, and a card painting this through
         * `backgroundImage: url(${src})` drops the whole declaration and
         * renders empty — measured, not guessed. Encoding them keeps ONE
         * string usable as an <img> src, a CSS url() and a GL texture alike. */
        .replace(/ /g, "%20")
        .replace(/'/g, "%27")
        .replace(/\(/g, "%28")
        .replace(/\)/g, "%29")
}

const DEFAULT_IMAGES: string[] = DUMMY_PAIRS.map((_, i) =>
    dummyImage(i, 1200, 1200)
)

const DEFAULT_SCROLL: Required<ScrollGroup> = {
    mode: "snap",
    drag: 25,
    damping: 60,
    zoom: 5,
}

/** Frozen: the grain band is exactly one picture wide, the source's "1 = 1 Image". */
const GRAIN_WIDTH = 1

const DEFAULT_GRAIN: Required<GrainGroup> = {
    speed: 50,
    amount: 10,
    scale: 250,
}

const VERT = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
}`

/* precision highp: the fbm below sums four octaves of simplex noise and the
 * warp divides nothing, but the domain (uv * grainScale, up to 300) walks far
 * enough that mediump's 10-bit mantissa quantizes the pattern into bands. */
const FRAG = `
precision highp float;

uniform sampler2D tDiffuse;
uniform float uTime;
uniform vec2  uResolution;
uniform float uEdgeWidth;
uniform float uNoiseSpeed;
uniform float uGrainScale;
uniform float uGrainAmount;

varying vec2 vUv;

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m  = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m * m * m * m;
  vec3 x  = 2.0 * fract(p * C.www) - 1.0;
  vec3 h  = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * snoise(p);
    p  = p * 2.1 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

void main() {
  float leftBand  = 1.0 - smoothstep(0.0, uEdgeWidth, vUv.x);
  float rightBand = smoothstep(1.0 - uEdgeWidth, 1.0, vUv.x);
  float xMask     = max(leftBand, rightBand);

  if (xMask <= 0.001) {
      gl_FragColor = texture2D(tDiffuse, vUv);
      return;
  }

  float mask = pow(xMask, 3.0) * 3.0;
  float ar = uResolution.x / max(uResolution.y, 1.0);

  float t = uTime * uNoiseSpeed * (uGrainScale * 0.015);

  vec2 noiseUV = vec2(vUv.x * ar, vUv.y) * uGrainScale;

  float dx = fbm(noiseUV + vec2(t, t * 0.5)) * uGrainAmount;
  float dy = fbm(noiseUV + vec2(-t * 0.3, t * 0.8)) * uGrainAmount;

  vec2 warpedUV = vUv + vec2(dx, dy) * mask;

  vec4 col = vec4(0.0);
  if (warpedUV.x >= 0.0 && warpedUV.x <= 1.0 && warpedUV.y >= 0.0 && warpedUV.y <= 1.0) {
      col = texture2D(tDiffuse, warpedUV);
  }

  float colorDecay = max(smoothstep(1.0, 0.1, mask / 6.0), 0.1);

  gl_FragColor = vec4(col.rgb * colorDecay, col.a);
}`

/**
 * Cover-crop `img` into the rounded box at (x, y, w, h).
 *
 * `pct` is a percent of the maximum radius — half the short side — and 100 is a
 * true CIRCLE at any aspect, not a pill: the clipped box narrows toward a square
 * as the radius grows, so the two meet at a circle of diameter min(w, h) and the
 * long axis is clipped away. The image still covers the box it is given, so the
 * carousel's spacing and draw positions are untouched.
 */
function drawCover(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    boxX: number,
    boxY: number,
    boxW: number,
    boxH: number,
    pct: number
) {
    const t = Math.max(0, Math.min(100, pct)) / 100
    const short = Math.min(boxW, boxH)
    const x = boxX + (t * (boxW - short)) / 2
    const y = boxY + (t * (boxH - short)) / 2
    const w = boxW - t * (boxW - short)
    const h = boxH - t * (boxH - short)
    const r = (t * short) / 2
    if (!img.complete || !img.naturalWidth) return
    const imgRatio = img.naturalWidth / img.naturalHeight
    const boxRatio = w / h
    let sx: number
    let sy: number
    let sw: number
    let sh: number
    if (imgRatio > boxRatio) {
        sh = img.naturalHeight
        sw = sh * boxRatio
        sx = (img.naturalWidth - sw) / 2
        sy = 0
    } else {
        sw = img.naturalWidth
        sh = sw / boxRatio
        sx = 0
        sy = (img.naturalHeight - sh) / 2
    }
    const rr = Math.max(0, Math.min(r, w / 2, h / 2))
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x + rr, y)
    ctx.lineTo(x + w - rr, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr)
    ctx.lineTo(x + w, y + h - rr)
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h)
    ctx.lineTo(x + rr, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr)
    ctx.lineTo(x, y + rr)
    ctx.quadraticCurveTo(x, y, x + rr, y)
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
    ctx.restore()
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        console.warn("GrainyCarousel shader:", gl.getShaderInfoLog(s))
    return s
}

/** Everything the frame loop reads, flattened and already in the loop's units. */
interface Resolved {
    images: string[]
    mediaKey: string
    /** px */
    cardWidth: number
    /** px */
    cardHeight: number
    gap: number
    /** percent of the max radius */
    rounded: number
    mode: "smooth" | "snap"
    /** px of strip travel per px of pointer travel; 0 = drag off */
    dragGain: number
    /** px/sec in smooth mode */
    smoothRate: number
    /** seconds between steps in snap mode; Infinity when the dial is at 0 */
    snapInterval: number
    /** per-frame lerp at 60fps */
    damping: number
    /** fraction, 0 = off */
    zoom: number
    edgeWidth: number
    noiseSpeed: number
    grainAmount: number
    grainScale: number
}

function resolve(p: Props): Resolved {
    // Spread-merge over the typed defaults — an unopened group arrives
    // undefined, and a `??` chain is where one missed key pins a control.
    const scroll = { ...DEFAULT_SCROLL, ...p.scroll }
    const grain = { ...DEFAULT_GRAIN, ...p.grain }
    const images = p.images && p.images.length ? p.images : DEFAULT_IMAGES
    const speed = p.speed ?? 155
    return {
        images,
        mediaKey: images.join("|"),
        cardWidth: Math.max(1, Math.round(p.cardWidth ?? DEFAULT_CARD_W)),
        cardHeight: Math.max(1, Math.round(p.cardHeight ?? DEFAULT_CARD_H)),
        gap: p.gap ?? 20,
        rounded: p.rounded ?? 8,
        mode: scroll.mode,
        dragGain:
            DRAG_GAIN_MIN +
            (Math.max(0, Math.min(100, scroll.drag)) / 100) *
                (DRAG_GAIN_MAX - DRAG_GAIN_MIN),
        smoothRate: (speed / 50) * SMOOTH_AT_50,
        snapInterval:
            speed <= 0 ? Infinity : SNAP_INTERVAL_AT_50 * (50 / speed),
        damping: (Math.max(1, Math.min(100, scroll.damping)) / 100) * DAMP_AT_100,
        zoom: Math.max(0, Math.min(100, scroll.zoom)) / 100,
        edgeWidth: GRAIN_WIDTH,
        noiseSpeed: (grain.speed / 50) * NOISE_AT_50,
        grainAmount: Math.max(0, Math.min(100, grain.amount)) / 100,
        grainScale: grain.scale,
    }
}

export default function GrainyCarousel(props: Props) {
    const {
        images: _images,
        background: _background,
        cardWidth: _cardWidth,
        cardHeight: _cardHeight,
        gap: _gap,
        rounded: _rounded,
        speed: _speed,
        scroll: _scroll,
        grain: _grain,
        style,
        ...rest
    } = props

    const p = resolve(props)
    const background = props.background ?? "rgba(0, 0, 0, 0)"

    const hostRef = useRef<HTMLDivElement>(null)
    const glCanvasRef = useRef<HTMLCanvasElement>(null)
    const fallbackRef = useRef<HTMLCanvasElement>(null)

    // Every live input read from this ref inside the loop (rule 6).
    // Live input in a ref: a fresh Transition object every render would land in
    // the setup effect's deps and rebuild the canvas (rule 6 / rule G).
    const transitionRef = useRef(props.transition ?? DEFAULT_TRANSITION)
    transitionRef.current = props.transition ?? DEFAULT_TRANSITION

    const propsRef = useRef(p)
    propsRef.current = p

    useEffect(() => {
        const host = hostRef.current
        const canvas = glCanvasRef.current
        const fallback = fallbackRef.current
        if (!host || !canvas || !fallback) return

        // The strip is composed here and uploaded as one texture.
        const strip = document.createElement("canvas")
        const stripCtx = strip.getContext("2d")

        const gl = canvas.getContext("webgl", {
            alpha: true,
            premultipliedAlpha: false,
        })

        let prog: WebGLProgram | null = null
        let tex: WebGLTexture | null = null
        let uTime: WebGLUniformLocation | null = null
        let uResolution: WebGLUniformLocation | null = null
        let uEdgeWidth: WebGLUniformLocation | null = null
        let uNoiseSpeed: WebGLUniformLocation | null = null
        let uGrainScale: WebGLUniformLocation | null = null
        let uGrainAmount: WebGLUniformLocation | null = null
        let posBuf: WebGLBuffer | null = null
        let uvBuf: WebGLBuffer | null = null
        let hasGL = false

        if (gl) {
            prog = gl.createProgram()!
            gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT))
            gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG))
            gl.linkProgram(prog)
            if (gl.getProgramParameter(prog, gl.LINK_STATUS)) {
                hasGL = true
                gl.useProgram(prog)
                // prettier-ignore
                const verts = new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1])
                // prettier-ignore
                const uvs = new Float32Array([0,0, 1,0, 0,1, 0,1, 1,0, 1,1])
                posBuf = gl.createBuffer()
                gl.bindBuffer(gl.ARRAY_BUFFER, posBuf)
                gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW)
                const aPos = gl.getAttribLocation(prog, "position")
                gl.enableVertexAttribArray(aPos)
                gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
                uvBuf = gl.createBuffer()
                gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf)
                gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW)
                const aUv = gl.getAttribLocation(prog, "uv")
                gl.enableVertexAttribArray(aUv)
                gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0)
                uTime = gl.getUniformLocation(prog, "uTime")
                uResolution = gl.getUniformLocation(prog, "uResolution")
                uEdgeWidth = gl.getUniformLocation(prog, "uEdgeWidth")
                uNoiseSpeed = gl.getUniformLocation(prog, "uNoiseSpeed")
                uGrainScale = gl.getUniformLocation(prog, "uGrainScale")
                uGrainAmount = gl.getUniformLocation(prog, "uGrainAmount")
                tex = gl.createTexture()
                gl.bindTexture(gl.TEXTURE_2D, tex)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
            }
        }
        canvas.style.opacity = hasGL ? "1" : "0"
        fallback.style.opacity = hasGL ? "0" : "1"

        // -- media ---------------------------------------------------------
        // Images live in a ref, never in state: a setState per load re-renders
        // the tree, and the loop needs the list without a dependency on it.
        let loaded: HTMLImageElement[] = []
        let mediaKey = ""
        const buildMedia = () => {
            mediaKey = propsRef.current.mediaKey
            loaded = propsRef.current.images.map((src) => {
                const img = new Image()
                img.crossOrigin = "anonymous"
                img.src = src
                return img
            })
        }
        buildMedia()

        // -- sizing (clientWidth, never getBoundingClientRect) --------------
        let vw = 1
        let vh = 1
        let dpr = 1
        const resize = () => {
            dpr = Math.min(window.devicePixelRatio || 1, 2)
            vw = Math.max(1, host.clientWidth)
            vh = Math.max(1, host.clientHeight)
            const bw = Math.round(vw * dpr)
            const bh = Math.round(vh * dpr)
            for (const c of [canvas, fallback, strip]) {
                c.width = bw
                c.height = bh
            }
            if (gl && hasGL) gl.viewport(0, 0, bw, bh)
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(host)

        // -- interaction ----------------------------------------------------
        let scrollX = 0
        let snapAnim: { stop: () => void } | null = null
        const stopSnap = () => {
            snapAnim?.stop()
            snapAnim = null
        }
        let targetX = 0
        let snapTimer = 0
        let itemWidth = 1
        let centerOffset = 0
        const drag = { active: false, id: -1, last: 0, x0: 0, y0: 0, click: true }

        const onDown = (e: PointerEvent) => {
            drag.active = true
            stopSnap()
            drag.id = e.pointerId
            drag.last = e.clientX
            drag.x0 = e.clientX
            drag.y0 = e.clientY
            drag.click = true
        }
        const onMove = (e: PointerEvent) => {
            if (!drag.active || e.pointerId !== drag.id) return
            targetX -= (e.clientX - drag.last) * propsRef.current.dragGain
            drag.last = e.clientX
            snapTimer = 0
            if (
                Math.abs(e.clientX - drag.x0) > CLICK_SLOP ||
                Math.abs(e.clientY - drag.y0) > CLICK_SLOP
            )
                drag.click = false
        }
        const onUp = (e: PointerEvent) => {
            if (!drag.active || e.pointerId !== drag.id) return
            drag.active = false
            if (!loaded.length || itemWidth <= 0) return
            const current = Math.round((targetX + centerOffset) / itemWidth)
            if (drag.click) {
                // Which picture was clicked, in the host's own untransformed
                // coordinates — a rect would carry the canvas zoom (rule G).
                const clickX = e.offsetX
                const steps = Math.round((clickX - vw / 2) / itemWidth)
                targetX = (current + steps) * itemWidth - centerOffset
                snapTimer = 0
            } else if (propsRef.current.mode === "snap") {
                targetX = current * itemWidth - centerOffset
            }
        }
        const onWheel = (e: WheelEvent) => {
            if (propsRef.current.mode === "smooth")
                targetX += e.deltaX || e.deltaY
        }
        host.addEventListener("pointerdown", onDown)
        // Released on window: a pointer that leaves mid-drag still resolves.
        window.addEventListener("pointermove", onMove)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)
        host.addEventListener("wheel", onWheel, { passive: true })

        // -- loop -----------------------------------------------------------
        let raf = 0
        let last = performance.now()
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = Math.min((now - last) / 1000, 0.1)
            last = now
            const c = propsRef.current

            if (c.mediaKey !== mediaKey) buildMedia()

            const drawW = c.cardWidth
            const drawH = c.cardHeight
            itemWidth = drawW + c.gap
            const total = Math.max(1, loaded.length * itemWidth)
            centerOffset = (vw - drawW) / 2
            // Percent of the maximum radius — half the picture's short side
            // (rule 7/11a), so one number is the same shape at every size.
            // Passed as the PERCENT: drawCover narrows the box itself so 100
            // lands on a circle, which a pre-multiplied px radius cannot say.
            const roundedPct = c.rounded
            // Band width as a share of the frame: `width: 100%` is exactly one
            // picture, which is what the source's "1 = 1 Image" meant.
            const edge = (drawW / vw) * c.edgeWidth

            if (!drag.active && loaded.length && Number.isFinite(c.snapInterval)) {
                if (c.mode === "smooth") {
                    targetX += c.smoothRate * dt
                } else if (Number.isFinite(c.snapInterval)) {
                    snapTimer += dt
                    if (snapTimer >= c.snapInterval) {
                        const current = Math.round(
                            (targetX + centerOffset) / itemWidth
                        )
                        targetX = (current + 1) * itemWidth - centerOffset
                        snapTimer = 0
                        // One step = one state change, so the Transition owns
                        // the whole travel. A spring can overshoot the next card
                        // and settle back, which the old in-loop lerp could not.
                        const from = scrollX
                        const delta = targetX - from
                        stopSnap()
                        snapAnim = animate(0, 1, {
                            ...transitionRef.current,
                            onUpdate: (p: number) => {
                                scrollX = from + delta * p
                            },
                            onComplete: () => {
                                snapAnim = null
                            },
                        })
                    }
                }
            }

            // Smooth mode and every drag still chase their target with the
            // Damping filter: the target moves every frame there, so there is
            // no state change for a Transition to describe.
            if (!snapAnim) {
                const lf = 1 - Math.pow(1 - c.damping, dt * 60)
                scrollX += (targetX - scrollX) * lf
            }

            let visualScale = 1
            if (c.mode === "snap" && c.zoom > 0) {
                const nearest =
                    Math.round((scrollX + centerOffset) / itemWidth) *
                        itemWidth -
                    centerOffset
                let ratio = Math.min(
                    Math.abs(scrollX - nearest) / (itemWidth / 2),
                    1
                )
                ratio = ratio * ratio * (3 - 2 * ratio)
                visualScale = 1 - ratio * c.zoom
            }

            // --- compose the strip ---------------------------------------
            if (stripCtx) {
                stripCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
                stripCtx.clearRect(0, 0, vw, vh)
                if (loaded.length) {
                    stripCtx.save()
                    if (visualScale !== 1) {
                        stripCtx.translate(vw / 2, vh / 2)
                        stripCtx.scale(visualScale, visualScale)
                        stripCtx.translate(-vw / 2, -vh / 2)
                    }
                    const y = (vh - drawH) / 2
                    let wrapped = scrollX % total
                    if (wrapped < 0) wrapped += total
                    let x = -wrapped
                    const leftBound = -vw * 1.5
                    const rightBound = vw * 2.5
                    while (x < rightBound) {
                        for (let i = 0; i < loaded.length; i++) {
                            const px = x + i * itemWidth
                            if (px + drawW > leftBound && px < rightBound)
                                drawCover(
                                    stripCtx,
                                    loaded[i],
                                    px,
                                    y,
                                    drawW,
                                    drawH,
                                    roundedPct
                                )
                        }
                        x += total
                    }
                    stripCtx.restore()
                }
            }

            // --- edge pass ------------------------------------------------
            if (gl && hasGL) {
                gl.bindTexture(gl.TEXTURE_2D, tex)
                gl.texImage2D(
                    gl.TEXTURE_2D,
                    0,
                    gl.RGBA,
                    gl.RGBA,
                    gl.UNSIGNED_BYTE,
                    strip
                )
                gl.clearColor(0, 0, 0, 0)
                gl.clear(gl.COLOR_BUFFER_BIT)
                gl.uniform1f(uTime, now * 0.001)
                gl.uniform2f(uResolution, canvas.width, canvas.height)
                gl.uniform1f(uEdgeWidth, edge)
                gl.uniform1f(uNoiseSpeed, c.noiseSpeed)
                gl.uniform1f(uGrainScale, c.grainScale)
                gl.uniform1f(uGrainAmount, c.grainAmount)
                gl.drawArrays(gl.TRIANGLES, 0, 6)
            } else {
                const fb = fallback.getContext("2d")
                if (fb) {
                    fb.setTransform(1, 0, 0, 1, 0, 0)
                    fb.clearRect(0, 0, fallback.width, fallback.height)
                    fb.drawImage(strip, 0, 0)
                }
            }
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            stopSnap()
            ro.disconnect()
            host.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointermove", onMove)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
            host.removeEventListener("wheel", onWheel)
            if (gl && hasGL) {
                if (tex) gl.deleteTexture(tex)
                if (posBuf) gl.deleteBuffer(posBuf)
                if (uvBuf) gl.deleteBuffer(uvBuf)
                if (prog) gl.deleteProgram(prog)
            }
            // Never loseContext(): getContext returns the same context per
            // canvas, so a StrictMode remount would reuse a force-lost one.
        }
    }, [])

    return (
        <div
            {...rest}
            ref={hostRef}
            style={{
                width: "100%",
                height: "100%",
                minWidth: 1200,
                minHeight: 800,
                position: "relative",
                overflow: "hidden",
                isolation: "isolate",
                cursor: "pointer",
                touchAction: "none",
                background,
                ...style,
            }}
        >
            <canvas
                ref={glCanvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                }}
            />
            {/* Plain 2D copy of the strip, shown only where WebGL is missing. */}
            <canvas
                ref={fallbackRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    opacity: 0,
                    pointerEvents: "none",
                }}
            />
        </div>
    )
}

GrainyCarousel.displayName = "Grainy Carousel"
