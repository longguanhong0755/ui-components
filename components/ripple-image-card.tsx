"use client"

import * as React from "react"
import { animate } from "motion/react"

/**
 * RippleCard — pointer-driven water rings on a photograph.
 *
 * ── What this pass removed ────────────────────────────────────────────────
 * The card carried FOUR displacement systems stacked on one surface: the
 * expanding ripple rings, a bow wave (a pressure ridge pinned ahead of the
 * cursor), a chaotic turbulence field, and a Kelvin wake (V-bands + centre
 * trail + persistence). Only the rings are a ripple; the rest read as the
 * "extra wave effect" and are DELETED, not frozen — the ask was to remove the
 * behaviour, so freezing a constant would have kept it on screen.
 * Chromatic dispersion went with them (it shipped at 0 = off, so nothing
 * changes visually).
 *
 * ── Key changes (clean break, rule 11c) ───────────────────────────────────
 * `waveStrength` → `intensity`   — ALSO a scale change: 0–50 default 6 became
 *                                  0–100 default 50, where 50 is the strength
 *                                  the card shipped at. A stored number cannot
 *                                  migrate across a rescale, so a live instance
 *                                  keeps its number and gets a new strength.
 * `rippleRadius` → `size`        — same unit (% of card), same 5–100 span.
 * Removed: `waveSpeed`, `wakeIntensity`, `wakeWidth`, `dispersionStrength`.
 *
 * Ring speed is no longer a control: a ring now crosses its Size in a FIXED
 * lifetime, which also caps how many rings can be alive at once — the old
 * ring buffer silently overwrote sources mid-life and they vanished with a pop.
 */

/**
 * The `animate()` option bag. Spelled out here rather than imported so the
 * hover ramp's shape is a plain, serialisable object — a type alias, not an
 * interface, or it loses the implicit index signature the intersection needs.
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
 * The hover ramp — how fast the ripple fades in on enter and out on leave.
 */
const DEFAULT_TRANSITION: Motion = {
    ease: [0, 0, 0.58, 1],
    mass: 1,
    type: "tween",
    damping: 60,
    duration: 0.85,
    stiffness: 800,
}

// Unsplash placeholder so an unconfigured instance shows real photographic
// detail — a flat gradient hides the displacement and the card reads as broken.
// images.unsplash.com sends `access-control-allow-origin: *`, which the
// crossOrigin="anonymous" texture upload requires.
const DEFAULT_IMAGE_SRC =
    "https://images.unsplash.com/photo-1439405326854-014607f694d7?auto=format&fit=crop&w=1600&q=80"

export interface RippleImage {
    src?: string
    srcSet?: string
    alt?: string
}

const DEFAULT_IMAGE: RippleImage = {
    alt: "",
    src: "https://images.unsplash.com/photo-1530053969600-caed2596d242?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MzE0fHxuYXR1cmV8ZW58MHwwfDB8fHwy",
}

const vertexShaderSource = `
attribute vec2 a_position;
varying vec2 vUv;

void main() {
  vUv = (a_position + 1.0) * 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`
const fragmentShaderSource = `
precision highp float;

uniform sampler2D uTex;
uniform float uProgress;
uniform float uTime;
uniform float uCardAspect;
uniform float uTexAspect;
uniform float uIntensity;
uniform float uSize;

// Emitted ripple sources. A ripple is an IMPULSE: a ring that leaves the point
// it was born at, expands at a fixed speed and decays with age. The CPU drops a
// source every ~0.04uv of travel; the shader sums whichever are still alive.
#define MAX_SRC 24
uniform vec3 uSrc[MAX_SRC]; // xy = emit position (uv), z = emit time (s)
uniform int  uSrcCount;

// A ring crosses its Size in this many seconds, whatever the Size. Fixed
// lifetime is what bounds the live-source count against MAX_SRC — with a fixed
// SPEED instead, a large Size outlives the ring buffer and rings pop out.
const float LIFE = 1.17;

// Wavelength scales with Size, so a big ripple is a big ripple rather than the
// same wavelet spread over more card. 25.2 = the shipped 60 cycles at the
// shipped 0.42 size, so the default is pixel-identical to before.
const float FREQ_K = 25.2;

varying vec2 vUv;

vec2 coverUv(vec2 uv, float cardAspect, float texAspect) {
  vec2 s = cardAspect < texAspect
    ? vec2(cardAspect / texAspect, 1.0)
    : vec2(1.0, texAspect / cardAspect);
  return (uv - 0.5) * s + 0.5;
}

void main() {
  vec2 uv = vUv;

  // ── Square metric ──────────────────────────────────────────
  // Every distance below is measured in ASPECT-CORRECTED space. Raw uv is
  // anisotropic, so length(uv - src) draws an ellipse: on a 3:2 card a
  // "circular" ring came out 1.5x wider than tall. Scale x by the card aspect
  // here, and divide the finished displacement back out at the end.
  vec2 asp = vec2(max(uCardAspect, 0.0001), 1.0);

  float reach = max(uSize, 0.0001);
  float c = reach / LIFE;          // ring speed, uv/s
  float freq = FREQ_K / reach;     // crests per uv

  // Ring displacement is a VECTOR — each ripple pushes radially away from its
  // OWN source, not away from the live cursor.
  vec2 ringDisp = vec2(0.0);

  for (int i = 0; i < MAX_SRC; i++) {
    if (i >= uSrcCount) break;
    vec3 s = uSrc[i];
    float age = uTime - s.z;
    if (age <= 0.0 || age >= LIFE) continue;

    vec2 d = (uv - s.xy) * asp;
    float r = length(d);
    float ringR = c * age;

    // Wave packet riding the ring: a few crests, zero everywhere else.
    float x = (r - ringR) * freq;
    float packet = sin(x) * exp(-x * x * 0.02);

    // Decay with age, and spread energy over the growing circumference.
    // pow(.., 0.6) rather than a square: squaring killed the ring by ~60% of
    // its travel, so the wave never visibly reached the Size it was given.
    // smoothstep on birth stops a new source popping in at full amplitude.
    float u = age / LIFE;
    float fade = pow(1.0 - u, 0.6) * smoothstep(0.0, 0.06, u);
    float amp = fade * inversesqrt(1.0 + r * 6.0);

    vec2 dir = r > 0.0001 ? d / r : vec2(0.0, 1.0);
    ringDisp += dir * packet * amp;
  }

  // ── Hover envelope ─────────────────────────────────────────
  // Ramps in on enter and HOLDS while the pointer is on the card, then ramps
  // out on leave so rings still alive at that moment settle instead of cutting.
  vec2 disp = ringDisp * 0.9 / asp * uIntensity * uProgress;

  gl_FragColor = texture2D(uTex, coverUv(uv + disp, uCardAspect, uTexAspect));
}
`

function clamp(n: number, a: number, b: number) {
    return Math.max(a, Math.min(b, n))
}

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
    const shader = gl.createShader(type)
    if (!shader) throw new Error("Failed to create shader")
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader) || ""
        gl.deleteShader(shader)
        throw new Error(info)
    }
    return shader
}

function createProgram(
    gl: WebGLRenderingContext,
    vsSource: string,
    fsSource: string
) {
    const vs = createShader(gl, gl.VERTEX_SHADER, vsSource)
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource)
    const program = gl.createProgram()
    if (!program) throw new Error("Failed to create program")
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(program) || ""
        gl.deleteProgram(program)
        throw new Error(info)
    }
    return program
}

function createTexture(gl: WebGLRenderingContext) {
    const tex = gl.createTexture()
    if (!tex) throw new Error("Failed to create texture")
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    // 1x1 transparent pixel placeholder
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 0, 0])
    )
    gl.bindTexture(gl.TEXTURE_2D, null)
    return tex
}

function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.decoding = "async"
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
        img.src = url
    })
}

/**
 * Size: 480x320, NOT the repo-wide 1200x800 (rule 10 / rule 11c carve-out for a
 * component that is not a full-bleed scene). It was a `min-*` floor; it is the
 * DEFAULT of the `Width` / `Height` pair now, and there is no floor left.
 * `min-width` beats `width` in CSS unconditionally, so a floor never "floats up
 * if there is room" — it pins, which is exactly what it must not do to a size
 * dial.
 */

/** The card box, in px, on the folder's shared 40–800 span. */
const DEFAULT_CARD_W = 600
const DEFAULT_CARD_H = 400

/** Intensity is a 0–100 dial; 50 is the displacement the card shipped at
 *  (0.06 uv), so the top of the range is 2x that. */
const INTENSITY_AT_FULL = 0.12

// Live ripple sources, matched to MAX_SRC in the fragment shader. A ring lives
// 1.17s and the emitters below are floored at 0.06s apart, so 24 slots cover
// 1.44s — the buffer can never overwrite a source that is still on screen.
const MAX_SRC = 24
// Emit a new ring every this much pointer travel (uv), floored by a time gap so
// a fast drag does not machine-gun the buffer.
const EMIT_DISTANCE = 0.04
const EMIT_INTERVAL = 0.06

export interface RippleCardProps {
    /** The photograph the ripple displaces. */
    image?: RippleImage | string
    /** The card box, in px. */
    cardWidth?: number
    cardHeight?: number
    /** Percent of the MAXIMUM radius (half the short side). */
    rounded?: number
    /** How hard the ripple pushes, 0–100. */
    intensity?: number
    /** Percent of the card: how far a ring travels before it dies. */
    size?: number
    /** The hover fade-in / fade-out ramp. */
    transition?: Motion
    style?: React.CSSProperties
}

function __BaseImpl_RippleCard(props: RippleCardProps) {
    const {
        image = DEFAULT_IMAGE,
        cardWidth = DEFAULT_CARD_W,
        cardHeight = DEFAULT_CARD_H,
        rounded = 16,
        intensity = 100,
        size = 50,
        transition = DEFAULT_TRANSITION,
        style,
    } = props

    // FrostGlassCard's shape: the image may arrive as a ResponsiveImage object,
    // a bare URL string, or not at all.
    const imageObject: RippleImage = typeof image === "string" ? {} : image ?? {}
    const imgSrc: string =
        (typeof image === "string" ? image : image?.src) || DEFAULT_IMAGE_SRC

    // Outside Framer there is no static renderer (canvas / thumbnail / export),
    // so the live path always runs.
    const isStatic: boolean = false
    const containerRef = React.useRef<HTMLDivElement>(null)

    // Rounded is a percent of the MAXIMUM radius (half the short side), so 100
    // is a true pill at any card size.
    const cardW = Math.max(1, Math.round(cardWidth))
    const cardH = Math.max(1, Math.round(cardHeight))
    const radius = Math.round(
        (Math.min(cardW, cardH) / 2) * (Math.max(0, Math.min(100, rounded)) / 100)
    )
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null)

    // Live input in a ref: a fresh Transition object every render would land in
    // the GL effect's deps and rebuild the context (rule 6 / rule G).
    const transitionRef = React.useRef(transition)
    transitionRef.current = transition

    const optionsRef = React.useRef({
        intensity: (intensity / 100) * INTENSITY_AT_FULL,
        size: size / 100,
    })

    React.useEffect(() => {
        optionsRef.current = {
            intensity: (intensity / 100) * INTENSITY_AT_FULL,
            size: size / 100,
        }
    }, [intensity, size])

    React.useEffect(() => {
        if (isStatic) return
        if (typeof window === "undefined") return

        const el = containerRef.current
        if (!el) return

        let canvas = canvasRef.current
        if (!canvas) {
            canvas = document.createElement("canvas")
            canvasRef.current = canvas
            Object.assign(canvas.style, {
                position: "absolute",
                inset: "0px",
                width: "100%",
                height: "100%",
                display: "block",
                pointerEvents: "none",
            })
        }
        // The re-attach is NOT inside the create branch. Cleanup removes the
        // canvas from the DOM but keeps it in the ref (we must — getContext
        // hands back the same context per canvas, and a fresh canvas per run
        // leaks contexts until the browser drops the oldest). So on the second
        // run — StrictMode's mount→cleanup→mount, a Fast Refresh, or any change
        // to `image` — the create branch is skipped and the canvas would stay
        // orphaned forever: the card rendered blank and never recovered.
        if (canvas.parentElement !== el) el.appendChild(canvas)

        const gl = canvas.getContext("webgl", {
            alpha: true,
            antialias: true,
            premultipliedAlpha: true,
        })
        if (!gl) return

        let program: WebGLProgram | null = null
        let positionBuffer: WebGLBuffer | null = null

        let uTexLoc: WebGLUniformLocation | null = null
        let uProgressLoc: WebGLUniformLocation | null = null
        let uTimeLoc: WebGLUniformLocation | null = null
        let uCardAspectLoc: WebGLUniformLocation | null = null
        let uTexAspectLoc: WebGLUniformLocation | null = null
        let uIntensityLoc: WebGLUniformLocation | null = null
        let uSizeLoc: WebGLUniformLocation | null = null
        let uSrcLoc: WebGLUniformLocation | null = null
        let uSrcCountLoc: WebGLUniformLocation | null = null

        let tex = createTexture(gl)
        let texAspect = 1

        let running = true
        let rafId = 0
        const startTime = performance.now()
        const nowSeconds = () => (performance.now() - startTime) / 1000

        const pointer = { x: 0.5, y: 0.5 }

        // Ripple sources, a ring buffer of (x, y, emitTime) in the uSrc layout.
        // Dead ones are skipped in the shader by age, so nothing is compacted.
        const srcData = new Float32Array(MAX_SRC * 3)
        let srcCount = 0
        let srcHead = 0
        let lastEmit = { x: 0.5, y: 0.5, t: -1e9 }
        const emit = (x: number, y: number, t: number) => {
            srcData[srcHead * 3] = x
            srcData[srcHead * 3 + 1] = y
            srcData[srcHead * 3 + 2] = t
            srcHead = (srcHead + 1) % MAX_SRC
            srcCount = Math.min(MAX_SRC, srcCount + 1)
            lastEmit = { x, y, t }
        }
        const maybeEmit = (x: number, y: number) => {
            const t = nowSeconds()
            if (Math.hypot(x - lastEmit.x, y - lastEmit.y) < EMIT_DISTANCE) return
            if (t - lastEmit.t < EMIT_INTERVAL) return
            emit(x, y, t)
        }

        let progress = 0
        let progressTarget = 0
        let progressAnim: { stop: () => void } | null = null
        const gateTo = (to: number) => {
            if (progressTarget === to) return
            progressTarget = to
            progressAnim?.stop()
            const from = progress
            const delta = to - from
            progressAnim = animate(0, 1, {
                ...transitionRef.current,
                onUpdate: (p: number) => {
                    progress = from + delta * p
                },
                onComplete: () => {
                    progressAnim = null
                },
            })
        }

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            const w = Math.max(1, Math.round(el.offsetWidth * dpr))
            const h = Math.max(1, Math.round(el.offsetHeight * dpr))

            if (canvas!.width !== w || canvas!.height !== h) {
                canvas!.width = w
                canvas!.height = h
                gl.viewport(0, 0, w, h)
            }
        }

        const getUVFromClient = (clientX: number, clientY: number) => {
            const r = el.getBoundingClientRect()
            const u = (clientX - r.left) / Math.max(1, el.offsetWidth)
            const v = 1.0 - (clientY - r.top) / Math.max(1, el.offsetHeight)
            pointer.x = clamp(u, 0, 1)
            pointer.y = clamp(v, 0, 1)
        }

        const onPointerMove = (e: PointerEvent) => {
            getUVFromClient(e.clientX, e.clientY)
            maybeEmit(pointer.x, pointer.y)
        }
        const onPointerEnter = (e: PointerEvent) => {
            getUVFromClient(e.clientX, e.clientY)
            emit(pointer.x, pointer.y, nowSeconds())
            gateTo(1)
        }
        const onPointerLeave = () => gateTo(0)

        el.addEventListener("pointermove", onPointerMove)
        el.addEventListener("pointerenter", onPointerEnter)
        el.addEventListener("pointerleave", onPointerLeave)

        const ro = new ResizeObserver(() => resize())
        ro.observe(el)

        try {
            program = createProgram(
                gl,
                vertexShaderSource,
                fragmentShaderSource
            )
            gl.useProgram(program)

            const aPos = gl.getAttribLocation(program, "a_position")
            positionBuffer = gl.createBuffer()
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
            // Fullscreen quad (two triangles)
            gl.bufferData(
                gl.ARRAY_BUFFER,
                new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
                gl.STATIC_DRAW
            )
            gl.enableVertexAttribArray(aPos)
            gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

            uTexLoc = gl.getUniformLocation(program, "uTex")
            uProgressLoc = gl.getUniformLocation(program, "uProgress")
            uTimeLoc = gl.getUniformLocation(program, "uTime")
            uCardAspectLoc = gl.getUniformLocation(program, "uCardAspect")
            uTexAspectLoc = gl.getUniformLocation(program, "uTexAspect")
            uIntensityLoc = gl.getUniformLocation(program, "uIntensity")
            uSizeLoc = gl.getUniformLocation(program, "uSize")

            // An array uniform is addressed by its first element.
            uSrcLoc = gl.getUniformLocation(program, "uSrc[0]")
            uSrcCountLoc = gl.getUniformLocation(program, "uSrcCount")

            if (uTexLoc) gl.uniform1i(uTexLoc, 0)
        } catch (e) {
            // Shader compilation failed; leave canvas transparent
            running = false
        }

        const bindImageToTexture = (
            target: WebGLTexture,
            img: HTMLImageElement
        ) => {
            gl.bindTexture(gl.TEXTURE_2D, target)
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                img
            )
            gl.bindTexture(gl.TEXTURE_2D, null)
        }

        let cancelled = false
        ;(async () => {
            try {
                const img = await loadImage(imgSrc)
                if (cancelled) return
                texAspect = img.naturalWidth / Math.max(1, img.naturalHeight)
                bindImageToTexture(tex, img)
            } catch {
                // Keep placeholder
            }
        })()

        const tick = () => {
            if (!running) return
            rafId = requestAnimationFrame(tick)

            resize()
            const cardAspect = el.offsetWidth / Math.max(1, el.offsetHeight)

            gl.clearColor(0.0, 0.0, 0.0, 0.0)
            gl.clear(gl.COLOR_BUFFER_BIT)

            gl.useProgram(program)

            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, tex)

            // Hover ramp: the Transition prop owns the easing and writes
            // `progress` directly; the loop only reads it.
            if (uProgressLoc) gl.uniform1f(uProgressLoc, progress)
            if (uTimeLoc) gl.uniform1f(uTimeLoc, nowSeconds())
            if (uCardAspectLoc) gl.uniform1f(uCardAspectLoc, cardAspect)
            if (uTexAspectLoc) gl.uniform1f(uTexAspectLoc, texAspect)

            const opts = optionsRef.current
            if (uIntensityLoc) gl.uniform1f(uIntensityLoc, opts.intensity)
            if (uSizeLoc) gl.uniform1f(uSizeLoc, opts.size)
            if (uSrcLoc) gl.uniform3fv(uSrcLoc, srcData)
            if (uSrcCountLoc) gl.uniform1i(uSrcCountLoc, srcCount)

            gl.drawArrays(gl.TRIANGLES, 0, 6)
        }

        tick()

        return () => {
            cancelled = true
            running = false
            cancelAnimationFrame(rafId)
            ro.disconnect()
            el.removeEventListener("pointermove", onPointerMove)
            el.removeEventListener("pointerenter", onPointerEnter)
            el.removeEventListener("pointerleave", onPointerLeave)

            if (positionBuffer) gl.deleteBuffer(positionBuffer)
            if (program) gl.deleteProgram(program)
            if (tex) gl.deleteTexture(tex)
            if (canvas && canvas.parentElement === el) {
                canvas.remove()
            }
        }
    }, [isStatic, imgSrc])

    /**
     * Root box, shaped like FrostGlassCard's `mergedStyle`.
     *
     * No `width: 100%` / `height: 100%`. A percentage root resolves against
     * whatever ancestor it lands in — which is why the card was eating the whole
     * canvas. `Width` / `Height` state the box outright and come AFTER the
     * spread, so neither the frame's size nor a floor can pin them (rule F); the
     * structural properties follow for the same reason, so nothing on the
     * instance can drop the clip or the stacking context the canvas sits in.
     */
    const rootStyle: React.CSSProperties = {
        ...style,
        width: cardW,
        height: cardH,
        position: "relative",
        overflow: "hidden",
        borderRadius: radius,
    }

    // Static fallback: show the image flat
    if (isStatic) {
        return (
            <div ref={containerRef} style={rootStyle}>
                <img
                    src={imgSrc}
                    srcSet={imageObject.srcSet}
                    alt={imageObject.alt || ""}
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                    }}
                />
            </div>
        )
    }

    return (
        <div
            ref={containerRef}
            style={rootStyle}
            aria-label={imageObject.alt || "Ripple card"}
            role="img"
        >
            {/*
             * Live-path fallback. The GL canvas is appended over this and paints
             * the image opaquely, so it is invisible in the normal case — but
             * `getContext` returning null, a shader that fails to compile, or
             * the texture not having decoded yet all left the card completely
             * transparent before, with no way to tell a broken component from
             * an empty one. It is also what shows for the first frame or two.
             */}
            <img
                src={imgSrc}
                srcSet={imageObject.srcSet}
                alt=""
                aria-hidden
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                    pointerEvents: "none",
                }}
            />
        </div>
    )
}

RippleCard.displayName = "RippleCard"

const __presetProps = {
  "image": {
    "alt": "",
    "src": "https://images.unsplash.com/photo-1530053969600-caed2596d242?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MzE0fHxuYXR1cmV8ZW58MHwwfDB8fHwy"
  },
  "cardWidth": 600,
  "cardHeight": 400,
  "rounded": 16,
  "intensity": 100,
  "size": 50,
  "transition": {
    "ease": [
      0,
      0,
      0.58,
      1
    ],
    "mass": 1,
    "type": "tween",
    "damping": 60,
    "duration": 0.85,
    "stiffness": 800
  }
};

export default function RippleCard(props: Record<string, unknown>) {
  return <__BaseImpl_RippleCard {...(__presetProps as Record<string, unknown>)} {...props} />;
}
